/**
 * tongji's own SSH route: the aliases configured on this machine, and the hosts
 * this conversation actually reached.
 *
 * Two deliberate choices separate it from a panel-local fold:
 *   - `~/.ssh/config` is read on every request, so adding an alias shows up
 *     without reloading the plugin (a volatile config default would not);
 *   - the conversation is folded straight from the session events with
 *     `Number.MAX_SAFE_INTEGER` as the command character budget, so a host
 *     reached early in a long conversation is still counted even after the
 *     command list has been trimmed by `maxCommands` / `maxCommandChars`.
 *
 * Nothing here starts a process or contacts a host: only command text, tool
 * outcomes and the local OpenSSH configuration are read.
 */
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { deriveEventMessage } from '@deepseek-ai/dsh-session'
import { commandArgsOf, commandTool } from '../shared/commands'
import {
  parseSshConfig,
  sshClientCandidates,
  sshDestinations,
  SSH_MAX_CONNECTIONS,
  type SshConnection,
  type SshHostConfig,
} from '../shared/sshTargets'

export const SSH_ROUTE = '/api/tongji/ssh'

const NO_STORE = { 'cache-control': 'no-store' }

const MAX_SESSION_CACHES = 8

export interface SshPayload {
  client: string
  hosts: SshHostConfig[]
  connections: SshConnection[]
  events: number
}

interface MessageLike {
  isError?: unknown
  source?: { callId?: unknown } | undefined
}

interface PendingCall {
  hosts: string[]
  turn: number
}

interface SessionScan {
  events: number
  revision: string | undefined
  turn: number
  pending: Map<string, PendingCall>
  connections: Map<string, SshConnection>
}

function readSshConfig(): SshHostConfig[] {
  try {
    return parseSshConfig(readFileSync(join(homedir(), '.ssh', 'config'), 'utf8'))
  } catch {
    return []
  }
}

function readSshClient(): string {
  return sshClientCandidates(process.platform, process.env).find(path => existsSync(path)) ?? ''
}

function blankScan(revision: string | undefined): SessionScan {
  return { events: 0, revision, turn: 0, pending: new Map(), connections: new Map() }
}

function settle(scan: SessionScan, id: string, ok: boolean, seq: number): void {
  const call = scan.pending.get(id)
  if (call === undefined) return
  scan.pending.delete(id)
  for (const host of call.hosts) {
    const previous = scan.connections.get(host)
    scan.connections.set(host, { host, ok, count: (previous?.count ?? 0) + 1, turn: call.turn, seq })
  }
}

function trackCall(scan: SessionScan, id: string, name: unknown, rawArgs: unknown, turn: unknown): void {
  if (typeof name !== 'string') return
  const tool = commandTool(name)
  // run_code carries source rather than a shell command; only the shell tools
  // name a destination in a way that can be read without running anything.
  if (tool === null || tool === 'run_code') return
  const parsed = commandArgsOf(tool, rawArgs, Number.MAX_SAFE_INTEGER)
  if (parsed === null) return
  const hosts = sshDestinations(parsed.cmd)
  if (hosts.length === 0) return
  scan.pending.set(id, { hosts, turn: typeof turn === 'number' && Number.isFinite(turn) ? turn : scan.turn })
}

function foldEvent(scan: SessionScan, event: unknown): void {
  if (event === null || typeof event !== 'object') return
  const record = event as { type?: unknown; seq?: unknown; data?: Record<string, unknown> | null }
  const data = record.data ?? null
  const seq = typeof record.seq === 'number' ? record.seq : -1
  switch (record.type) {
    case 'turn/start': {
      const turn = data?.turn
      if (typeof turn === 'number' && Number.isFinite(turn)) scan.turn = turn
      return
    }
    case 'tool/call': {
      const id = data?.callId
      if (typeof id !== 'string' || id === '' || id === '__proto__') return
      trackCall(scan, id, data?.name, data?.arguments, data?.turn)
      return
    }
    case 'tool/ptc-dispatch-start': {
      const sub = data?.subCallId
      if (typeof sub !== 'string' || sub === '') return
      trackCall(scan, 'ptc:' + sub, data?.name, data?.arguments, data?.turn)
      return
    }
    case 'tool/result': {
      const message = deriveEventMessage(event as never) as MessageLike | null
      const id = message?.source?.callId ?? data?.callId
      if (typeof id !== 'string' || id === '') return
      settle(scan, id, message?.isError !== true && data?.isError !== true, seq)
      return
    }
    case 'tool/ptc-dispatch': {
      const sub = data?.subCallId
      if (typeof sub !== 'string' || sub === '') return
      settle(scan, 'ptc:' + sub, data?.isError !== true, seq)
      return
    }
    default:
  }
}

function connectionsOf(scan: SessionScan): SshConnection[] {
  return [...scan.connections.values()]
    .sort((left, right) => right.seq - left.seq)
    .slice(0, SSH_MAX_CONNECTIONS)
}

const scans = new Map<string, SessionScan>()

const queues = new Map<string, Promise<void>>()

/** One session's scans run in order, so an incremental pass cannot double count. */
async function serial<T>(id: string, job: () => T): Promise<T> {
  const previous = queues.get(id) ?? Promise.resolve()
  const run = previous.then(job, job)
  const tail = run.then(() => undefined, () => undefined)
  queues.set(id, tail)
  try {
    return await run
  } finally {
    if (queues.get(id) === tail) queues.delete(id)
  }
}

function prune(keep: string): void {
  if (scans.size <= MAX_SESSION_CACHES) return
  for (const key of scans.keys()) {
    if (scans.size <= MAX_SESSION_CACHES) break
    if (key !== keep) scans.delete(key)
  }
}

function foldSession(id: string, events: readonly unknown[], revision: string | undefined): SshPayload['connections'] {
  let scan = scans.get(id)
  if (scan === undefined || scan.events > events.length || (revision !== undefined && scan.revision !== revision)) {
    scan = blankScan(revision)
    scans.set(id, scan)
  }
  scan.revision = revision
  for (let index = scan.events; index < events.length; index++) foldEvent(scan, events[index])
  scan.events = events.length
  prune(id)
  return connectionsOf(scan)
}

interface SshHost {
  connection?: { fetch?: { register(row: unknown): void } }
  sessionQuery?: { observeSession?(id: string, options: unknown): Promise<unknown> }
  logger?: { warn(message: string, data?: unknown): void }
}

function failure(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message, retryable: true } }, { status, headers: NO_STORE })
}

export interface SshRouteOptions {
  /** Overridden by the tests to prove each request re-reads the configuration. */
  readConfig?: () => SshHostConfig[]
  readClient?: () => string
}

export function registerSshRoute(ctx: Context, options: SshRouteOptions = {}): void {
  const host = ctx as unknown as SshHost
  const connection = host.connection
  const sessionQuery = host.sessionQuery
  // Without the session query the aliases still work; the route stays optional.
  if (connection?.fetch?.register === undefined) return
  const observe: ((id: string, options: unknown) => Promise<unknown>) | undefined =
    typeof sessionQuery?.observeSession === 'function'
      ? (id, options) => (sessionQuery.observeSession as (i: string, o: unknown) => Promise<unknown>).call(sessionQuery, id, options)
      : undefined
  connection.fetch.register({
    path: SSH_ROUTE,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request: Request): Promise<Response> => {
      const id = new URL(request.url).searchParams.get('sessionId') ?? ''
      try {
        const hosts = (options.readConfig ?? readSshConfig)()
        const client = (options.readClient ?? readSshClient)()
        if (id === '' || observe === undefined) {
          return Response.json({ client, hosts, connections: [], events: 0 } satisfies SshPayload, { headers: NO_STORE })
        }
        const observation = await observe(id, { signal: request.signal, projectionMode: 'none' })
        const record = observation !== null && typeof observation === 'object'
          ? observation as { events?: unknown; revision?: unknown; [Symbol.dispose]?: unknown }
          : null
        const release = typeof record?.[Symbol.dispose] === 'function'
          ? () => { (record[Symbol.dispose] as () => void).call(record) }
          : () => {}
        try {
          const events = Array.isArray(record?.events) ? record.events as unknown[] : []
          const revision = typeof record?.revision === 'string' && record.revision !== '' ? record.revision : undefined
          const connections = await serial(id, () => foldSession(id, events, revision))
          return Response.json({ client, hosts, connections, events: events.length } satisfies SshPayload, { headers: NO_STORE })
        } finally {
          release()
        }
      } catch (error) {
        if (request.signal.aborted) return failure('tongji/request-aborted', '请求已取消', 499)
        host.logger?.warn('tongji: ssh route failed', { sessionId: id, error })
        return failure('tongji/ssh-unavailable', 'SSH 信息暂不可用', 503)
      }
    },
  })
}
