import { Buffer } from 'node:buffer'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { HostSession, HostTimeline } from './overviewCorpus'
import { asRecord } from './record'
import { activityOf, currentOf, numOf, optionalNumOf, timingOf } from './overviewDecode'

// 2: the fold now excludes a fork's inherited prefix from turns, steps and
// timing, so every `format: 1` row carries the old counts and is dropped.
export const OVERVIEW_CACHE_FORMAT = 2

/** Storage slot; the口径 version lives in `format`, not in the file name. */
export const OVERVIEW_CACHE_FILE = 'overview-cache.v1.json'

const DEFAULT_DEBOUNCE_MS = 2_000

const DEFAULT_STAT_CONCURRENCY = 16

const DEFAULT_CAPTURE_CONCURRENCY = 4

/** Hard bounds on the whole-file cache: newest sessions win when it overflows. */
const DEFAULT_MAX_ENTRIES = 4000

const DEFAULT_MAX_BYTES = 24 * 1024 * 1024

interface CacheFileInfo {
  size: number
  mtimeMs: number
}

export interface CacheFs {
  stat(path: string): Promise<CacheFileInfo>
  readFile(path: string): Promise<string>
  writeFile(path: string, data: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  mkdir(path: string): Promise<void>
  rm?(path: string): Promise<void>
}

const NODE_FS: CacheFs = {
  stat: async (path) => {
    const info = await stat(path)
    return { size: info.size, mtimeMs: info.mtimeMs }
  },
  readFile: path => readFile(path, 'utf8'),
  writeFile: (path, data) => writeFile(path, data, 'utf8'),
  rename: (from, to) => rename(from, to),
  mkdir: async (path) => { await mkdir(path, { recursive: true }) },
  rm: async (path) => { await rm(path, { force: true }) },
}

export interface DurableIdentity {
  path: string
  sizeBytes: number
  mtimeMs: number
}

export interface CachedSession {
  session: HostSession
  identity: DurableIdentity | null
}

export interface OverviewCacheLoad {
  sessions: Map<string, HostSession>
  identities: Map<string, DurableIdentity | null>
  rebuild: Set<string>
}

export interface OverviewCacheRefresh {
  identities: Map<string, DurableIdentity | null>
  changed: Set<string>
}

export interface StatHost {
  stat?(id: string): Promise<unknown>
}

export interface OverviewCacheOptions {
  path?: string
  fs?: CacheFs
  now?: () => number
  debounceMs?: number
  statConcurrency?: number
  captureConcurrency?: number
  maxEntries?: number
  maxBytes?: number
}

/** `replace` rewrites the cache as the caller's complete set; `merge` overlays. */
export type CacheSaveMode = 'merge' | 'replace'

export interface OverviewCache {
  load(currentIds: ReadonlySet<string>, known?: ReadonlyMap<string, DurableIdentity | null>): Promise<OverviewCacheLoad>
  refresh(currentIds: ReadonlySet<string>, known: ReadonlyMap<string, DurableIdentity | null>): Promise<OverviewCacheRefresh>
  capture(ids: readonly string[], host: StatHost): Promise<Map<string, DurableIdentity | null>>
  save(records: readonly CachedSession[], mode?: CacheSaveMode): void
  flush(): Promise<void>
  dispose(): void
}

export function overviewCachePath(
  env: Record<string, string | undefined> = process.env,
  home: string = homedir(),
): string {
  const root = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== ''
    ? env.DSH_HOME
    : join(home, '.dsh')
  return join(root, 'storages', 'tongji', OVERVIEW_CACHE_FILE)
}

export function identityKey(identity: DurableIdentity | null | undefined): string {
  if (identity === null || identity === undefined) return '?'
  return `${identity.path}\u0000${String(identity.sizeBytes)}\u0000${String(identity.mtimeMs)}`
}

function sameIdentity(left: DurableIdentity | null, right: DurableIdentity | null): boolean {
  if (left === null || right === null) return left === right
  return left.path === right.path && left.sizeBytes === right.sizeBytes && left.mtimeMs === right.mtimeMs
}

function timelineOf(value: unknown): HostTimeline | null {
  if (value === null) return null
  const data = asRecord(value)
  if (data === null) return null
  const current = currentOf(data.current)
  const timeline: HostTimeline = { current, total: numOf(data.total), turns: numOf(data.turns) }
  const steps = optionalNumOf(data.steps)
  if (steps !== undefined) timeline.steps = steps
  const contextWindow = optionalNumOf(data.contextWindow)
  if (contextWindow !== undefined) timeline.contextWindow = contextWindow
  const maxOutputTokens = optionalNumOf(data.maxOutputTokens)
  if (maxOutputTokens !== undefined) timeline.maxOutputTokens = maxOutputTokens
  if (typeof data.model === 'string' && data.model !== '') timeline.model = data.model
  if (typeof data.lastUser === 'string' && data.lastUser !== '') timeline.lastUser = data.lastUser
  const timing = timingOf(data.timing)
  if (timing !== undefined) timeline.timing = timing
  for (const field of ['generatedReasoning', 'generatedAnswerTokens', 'generatedCallTokens'] as const) {
    const figure = optionalNumOf(data[field])
    if (figure !== undefined) timeline[field] = figure
  }
  return timeline
}

function parseSession(value: unknown): HostSession | null {
  const data = asRecord(value)
  if (data === null) return null
  const id = data.id
  const title = data.title
  const updatedAt = data.updatedAt
  const blank = data.blank
  const signature = data.signature
  if (typeof id !== 'string' || id === '') return null
  if (typeof title !== 'string') return null
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null
  if (typeof blank !== 'boolean') return null
  if (typeof signature !== 'string') return null
  const session: HostSession = {
    id,
    title,
    updatedAt,
    blank,
    signature,
    timeline: timelineOf(data.timeline),
    activity: activityOf(data.activity),
  }
  if (typeof data.cwd === 'string' && data.cwd !== '') session.cwd = data.cwd
  if (typeof data.parentSession === 'string' && data.parentSession !== '') session.parentSession = data.parentSession
  if (data.origin === 'subagent') session.origin = 'subagent'
  return session
}

function identityOf(value: unknown): DurableIdentity | null {
  const data = asRecord(value)
  if (data === null) return null
  if (typeof data.path !== 'string' || data.path === '') return null
  const sizeBytes = optionalNumOf(data.sizeBytes)
  const mtimeMs = optionalNumOf(data.mtimeMs)
  if (sizeBytes === undefined || mtimeMs === undefined) return null
  return { path: data.path, sizeBytes, mtimeMs }
}

function recordOf(value: unknown): CachedSession | null {
  const data = asRecord(value)
  if (data === null) return null
  const session = parseSession(data.session)
  if (session === null) return null
  const rawIdentity = data.identity
  const identity = rawIdentity === null || rawIdentity === undefined ? null : identityOf(rawIdentity)
  if (rawIdentity !== null && rawIdentity !== undefined && identity === null) return null
  return { session, identity }
}

function parsedRecords(value: unknown): CachedSession[] {
  const data = asRecord(value)
  if (data === null || data.format !== OVERVIEW_CACHE_FORMAT || !Array.isArray(data.sessions)) return []
  const records: CachedSession[] = []
  for (const entry of data.sessions) {
    const record = recordOf(entry)
    if (record !== null) records.push(record)
  }
  return records
}

async function inBatches<T>(items: readonly T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(run))
    if (index + size < items.length) await new Promise(resolve => setImmediate(resolve))
  }
}

export function createOverviewCache(options: OverviewCacheOptions = {}): OverviewCache {
  const path = options.path ?? overviewCachePath()
  const fs = options.fs ?? NODE_FS
  const now = options.now ?? (() => Date.now())
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const statConcurrency = options.statConcurrency ?? DEFAULT_STAT_CONCURRENCY
  const captureConcurrency = options.captureConcurrency ?? DEFAULT_CAPTURE_CONCURRENCY
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { records: Map<string, CachedSession>; replace: boolean } | null = null
  let disposed = false

  // Callers hand over only the sessions they just refreshed, so every write
  // starts from the file already on disk and overlays the new records.
  // Replacing the whole file with one caller's slice is what let a single
  // worker fold shrink a multi-megabyte cache to a single entry.
  const readExisting = async (): Promise<CachedSession[]> => {
    try {
      return parsedRecords(JSON.parse(await fs.readFile(path)))
    } catch {
      return []
    }
  }

  const boundRecords = (records: CachedSession[]): CachedSession[] => {
    const ordered = [...records].sort((left, right) => right.session.updatedAt - left.session.updatedAt)
    let kept = ordered.slice(0, maxEntries)
    for (let pass = 0; pass < 8 && kept.length > 1; pass += 1) {
      const serialized = JSON.stringify({ format: OVERVIEW_CACHE_FORMAT, savedAt: 0, sessions: kept })
      const bytes = Buffer.byteLength(serialized)
      if (bytes <= maxBytes) return kept
      kept = kept.slice(0, Math.max(1, Math.floor(kept.length * maxBytes / bytes)))
    }
    return kept
  }

  const write = async (records: readonly CachedSession[], replace: boolean): Promise<void> => {
    const merged = new Map<string, CachedSession>()
    if (!replace) {
      for (const record of await readExisting()) merged.set(record.session.id, record)
    }
    for (const record of records) merged.set(record.session.id, record)
    const body = JSON.stringify({ format: OVERVIEW_CACHE_FORMAT, savedAt: now(), sessions: boundRecords([...merged.values()]) })
    const temp = `${path}.tmp`
    try {
      await fs.mkdir(dirname(path))
      await fs.writeFile(temp, body)
      await fs.rename(temp, path)
    } catch {
      try {
        await fs.rm?.(temp)
      } catch {}
    }
  }

  const flush = async (): Promise<void> => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    const staged = pending
    pending = null
    if (staged === null) return
    await write([...staged.records.values()], staged.replace)
  }

  const load = async (
    currentIds: ReadonlySet<string>,
    known?: ReadonlyMap<string, DurableIdentity | null>,
  ): Promise<OverviewCacheLoad> => {
    const sessions = new Map<string, HostSession>()
    const identities = new Map<string, DurableIdentity | null>()
    const rebuild = new Set<string>()
    let records: CachedSession[] = []
    try {
      records = parsedRecords(JSON.parse(await fs.readFile(path))).filter(record => currentIds.has(record.session.id))
    } catch {
      records = []
    }
    if (pending !== null) {
      const staged = new Map(records.map(record => [record.session.id, record]))
      for (const record of pending.records.values()) {
        if (currentIds.has(record.session.id)) staged.set(record.session.id, record)
      }
      records = [...staged.values()]
    }
    await inBatches(records, statConcurrency, async (record) => {
      const id = record.session.id
      const complete = record.session.timeline !== null && record.session.activity !== null
      if (known !== undefined) {
        const expected = known.get(id) ?? null
        identities.set(id, expected)
        if (complete && record.identity !== null && sameIdentity(record.identity, expected)) sessions.set(id, record.session)
        else rebuild.add(id)
        return
      }
      if (record.identity === null) {
        identities.set(id, null)
        rebuild.add(id)
        return
      }
      try {
        const info = await fs.stat(record.identity.path)
        if (info.size === record.identity.sizeBytes && info.mtimeMs === record.identity.mtimeMs) {
          identities.set(id, record.identity)
          if (complete) sessions.set(id, record.session)
          else rebuild.add(id)
          return
        }
        identities.set(id, { path: record.identity.path, sizeBytes: info.size, mtimeMs: info.mtimeMs })
        rebuild.add(id)
      } catch {
        identities.set(id, null)
        rebuild.add(id)
      }
    })
    return { sessions, identities, rebuild }
  }

  const refresh = async (
    currentIds: ReadonlySet<string>,
    known: ReadonlyMap<string, DurableIdentity | null>,
  ): Promise<OverviewCacheRefresh> => {
    const identities = new Map<string, DurableIdentity | null>()
    const changed = new Set<string>()
    const targets: { id: string; identity: DurableIdentity }[] = []
    for (const id of currentIds) {
      const identity = known.get(id)
      if (identity === null || identity === undefined) continue
      targets.push({ id, identity })
    }
    await inBatches(targets, statConcurrency, async ({ id, identity }) => {
      try {
        const info = await fs.stat(identity.path)
        if (info.size === identity.sizeBytes && info.mtimeMs === identity.mtimeMs) {
          identities.set(id, identity)
          return
        }
        identities.set(id, { path: identity.path, sizeBytes: info.size, mtimeMs: info.mtimeMs })
        changed.add(id)
      } catch {
        identities.set(id, null)
        changed.add(id)
      }
    })
    return { identities, changed }
  }

  const capture = async (ids: readonly string[], host: StatHost): Promise<Map<string, DurableIdentity | null>> => {
    const identities = new Map<string, DurableIdentity | null>()
    const statOf = typeof host.stat === 'function' ? host.stat.bind(host) : undefined
    await inBatches(ids, captureConcurrency, async (id) => {
      identities.set(id, await captureOne(id, statOf, fs))
    })
    return identities
  }

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const staged = pending
      pending = null
      /* v8 ignore next 1 */
      if (staged !== null) void write([...staged.records.values()], staged.replace)
    }, debounceMs)
    ;(timer as { unref?: () => void }).unref?.()
  }

  const save = (records: readonly CachedSession[], mode: CacheSaveMode = 'merge'): void => {
    if (disposed) return
    const staged = mode === 'replace'
      ? { records: new Map<string, CachedSession>(), replace: true }
      : pending ?? { records: new Map<string, CachedSession>(), replace: false }
    for (const record of records) staged.records.set(record.session.id, record)
    pending = staged
    schedule()
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    const staged = pending
    pending = null
    if (staged !== null) void write([...staged.records.values()], staged.replace)
  }

  return { load, refresh, capture, save, flush, dispose }
}

async function captureOne(
  id: string,
  statOf: ((id: string) => Promise<unknown>) | undefined,
  fs: CacheFs,
): Promise<DurableIdentity | null> {
  if (statOf === undefined) return null
  let snapshot: unknown
  try {
    snapshot = await statOf(id)
  } catch {
    return null
  }
  const data = asRecord(snapshot)
  const location = asRecord(data?.location)
  const path = typeof location?.path === 'string' && location.path !== '' ? location.path : undefined
  const sizeBytes = optionalNumOf(data?.sizeBytes)
  if (path === undefined || sizeBytes === undefined) return null
  try {
    const info = await fs.stat(path)
    return { path, sizeBytes, mtimeMs: info.mtimeMs }
  } catch {
    return null
  }
}
