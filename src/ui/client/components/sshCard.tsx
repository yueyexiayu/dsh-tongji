/**
 * The SSH card: the aliases configured on this machine plus the hosts this
 * conversation reached, both from tongji's own route (/api/tongji/ssh).
 *
 * The route reads `~/.ssh/config` per request and folds the whole session
 * event stream, so this card never inherits the panel's command-list trim.
 * Nothing here connects anywhere; the two buttons only copy text.
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { Translate } from '../i18n'
import { SSH_ROUTE } from '../apiRoutes'
import { IconApi, IconCopy } from '../primitives'
import {
  sshCheckCommand,
  sshConnectDetails,
  sshEndpoint,
  type SshConnection,
  type SshHostConfig,
} from '../../shared/sshTargets'

interface SshPayload {
  client: string
  hosts: SshHostConfig[]
  connections: SshConnection[]
}

interface SshRow {
  host: string
  config: SshHostConfig | undefined
  used: SshConnection | undefined
}

const REFRESH_MS = 5000

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

function configOf(value: unknown): SshHostConfig | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const alias = textOf(row.alias)
  if (alias === '') return undefined
  return { alias, hostName: textOf(row.hostName), user: textOf(row.user), port: textOf(row.port) }
}

function connectionOf(value: unknown): SshConnection | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const host = textOf(row.host)
  if (host === '') return undefined
  return {
    host,
    ok: row.ok !== false,
    count: typeof row.count === 'number' && Number.isFinite(row.count) ? row.count : 1,
    turn: typeof row.turn === 'number' && Number.isFinite(row.turn) ? row.turn : 0,
    seq: typeof row.seq === 'number' && Number.isFinite(row.seq) ? row.seq : 0,
  }
}

function decode(value: unknown): SshPayload | null {
  if (value === null || typeof value !== 'object') return null
  const root = value as Record<string, unknown>
  const hosts = Array.isArray(root.hosts) ? root.hosts.map(configOf).filter((row): row is SshHostConfig => row !== undefined) : []
  const used = Array.isArray(root.connections)
    ? root.connections.map(connectionOf).filter((row): row is SshConnection => row !== undefined)
    : []
  return { client: textOf(root.client), hosts, connections: used }
}

/** Reached hosts first, then configured aliases this conversation never used. */
function rowsOf(payload: SshPayload): SshRow[] {
  const named = new Set(payload.connections.map(row => row.host))
  return [
    ...payload.connections.map(used => ({
      host: used.host,
      used,
      config: payload.hosts.find(item => item.alias === used.host),
    })),
    ...payload.hosts.filter(item => !named.has(item.alias)).map(config => ({
      host: config.alias,
      used: undefined,
      config,
    })),
  ]
}

export function makeSshCard(t: Translate) {
  return function SshCard(props: { sessionId?: string }): ReactElement | null {
    const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
    const [payload, setPayload] = useState<SshPayload | null>(null)
    const [failed, setFailed] = useState(false)
    const [note, setNote] = useState('')

    useEffect(() => {
      const controller = new AbortController()
      let alive = true
      const load = async (): Promise<void> => {
        try {
          const query = sessionId === '' ? '' : '?sessionId=' + encodeURIComponent(sessionId)
          const response = await fetch(SSH_ROUTE + query, { signal: controller.signal })
          const decoded = decode(await response.json().catch(() => null))
          if (!alive) return
          if (!response.ok || decoded === null) throw new Error(String(response.status))
          setPayload(decoded)
          setFailed(false)
        } catch {
          if (alive && !controller.signal.aborted) setFailed(true)
        }
      }
      void load()
      const timer = window.setInterval(() => { void load() }, REFRESH_MS)
      return () => {
        alive = false
        controller.abort()
        window.clearInterval(timer)
      }
    }, [sessionId])

    useEffect(() => { setNote('') }, [sessionId])

    if (payload === null && !failed) {
      return (
        <div className="lc-card" data-lc-ssh>
          <div className="lc-card-title">
            <span className="lc-card-title-text"><IconApi size={14} />{t('ssh.title')}</span>
            <span className="lc-card-sub">{t('ssh.loading')}</span>
          </div>
        </div>
      )
    }

    const rows = payload === null ? [] : rowsOf(payload)
    const used = payload?.connections.length ?? 0
    const stale = failed && payload !== null

    const copy = async (value: string): Promise<void> => {
      try {
        const clipboard = (globalThis.navigator as { clipboard?: { writeText?: unknown } } | undefined)?.clipboard
        if (typeof clipboard?.writeText !== 'function') throw new Error('clipboard unavailable')
        await (clipboard.writeText as (text: string) => Promise<void>).call(clipboard, value)
        setNote(t('ssh.copied'))
      } catch {
        setNote(t('ssh.copyFailed'))
      }
    }

    const headline = payload === null
      ? t('ssh.unavailable')
      : payload.client === ''
        ? t('ssh.noClient')
        : rows.length === 0
          ? t('ssh.empty')
          : `${t('ssh.configured')} ${payload.hosts.length} · ${t('ssh.usedShort')} ${used}`

    return (
      <div className="lc-card" data-lc-ssh>
        <div className="lc-card-title">
          <span className="lc-card-title-text"><IconApi size={14} />{t('ssh.title')}</span>
          <span className="lc-card-sub" data-tone={stale ? 'warn' : undefined}>{stale ? t('ssh.stale') : headline}</span>
        </div>
        <ul className="lc-ssh-list">
          {rows.slice(0, 8).map(row => (
            <li className="lc-ssh-row" key={row.host} data-state={row.used === undefined ? 'idle' : row.used.ok ? 'ok' : 'failed'}>
              <span className="lc-ssh-host" title={row.config === undefined ? row.host : sshEndpoint(row.config)}>{row.host}</span>
              <span className="lc-ssh-meta">
                {row.used === undefined
                  ? sshEndpoint(row.config) === '' ? t('ssh.configuredOnly') : sshEndpoint(row.config)
                  : row.used.ok
                    ? `${t('ssh.turnPrefix')}${row.used.turn}${t('ssh.turnSuffix')} · ${row.used.count}${t('ssh.times')}`
                    : `${t('ssh.turnPrefix')}${row.used.turn}${t('ssh.turnSuffix')}${t('ssh.failedTurn')}`}
              </span>
              <span className="lc-ssh-actions">
                <button type="button" className="lc-ssh-copy" title={t('ssh.copyCheckHint')}
                  onClick={() => { void copy(sshCheckCommand(row.host)) }}>
                  {t('ssh.copyCheck')}
                </button>
                <button type="button" className="lc-ssh-copy" title={t('ssh.copyDetails')} onClick={() => { void copy(sshConnectDetails(row.host, row.config, t('ssh.userNeeded'))) }}>
                  <IconCopy size={12} />
                </button>
              </span>
            </li>
          ))}
        </ul>
        {note === '' ? null : <div className="lc-ssh-note" role="status">{note}</div>}
      </div>
    )
  }
}
