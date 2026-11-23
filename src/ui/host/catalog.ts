import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { asRecord } from './record'

export const CATALOG_TTL_MS = 60 * 60 * 1000

// The panel is not published to a package registry, so its newest version is
// whatever the repository's latest release says.
const VERSION_URLS = [
  'https://api.github.com/repos/yueyexiayu/dsh-tongji/releases/latest',
]

const FETCH_TIMEOUT_MS = 8_000

export type CatalogFetcher = (url: string, init: RequestInit) => Promise<Response>

export interface CatalogOptions {
  fetch?: CatalogFetcher
  now?: () => number
  currentVersion?: string
  ttlMs?: number
}

export interface CatalogEntry<T> {
  value: T | null
  ready: boolean
  failed: boolean
  checkedAt: number
}

interface Slot<T> {
  value: T | null
  at: number
  failed: boolean
  inflight: Promise<void> | null
}

export interface CatalogService {
  version(): Promise<CatalogEntry<string>>
  currentVersion(): string | undefined
  dispose(): void
}

function slotOf<T>(): Slot<T> {
  return { value: null, at: 0, failed: false, inflight: null }
}

function readVersion(body: unknown): string | null {
  const record = asRecord(body)
  // Registries answer with version; the GitHub releases API answers with tag_name.
  const version = record?.version ?? record?.tag_name
  return typeof version === 'string' && version !== '' ? version : null
}

export function createCatalogService(options: CatalogOptions = {}): CatalogService {
  const fetcher: CatalogFetcher = options.fetch ?? ((url, init) => fetch(url, init))
  const now = options.now ?? (() => Date.now())
  const ttlMs = options.ttlMs ?? CATALOG_TTL_MS
  const current = options.currentVersion ?? currentVersionOf()
  const version = slotOf<string>()
  let disposed = false

  const fresh = (at: number): boolean => at !== 0 && now() - at < ttlMs

  const readJson = async (url: string): Promise<unknown> => {
    const response = await fetcher(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`catalog fetch ${response.status}`)
    return response.json()
  }

  const ensureVersion = (): void => {
    if (disposed || version.inflight !== null || fresh(version.at)) return
    version.inflight = (async () => {
      try {
        for (const url of VERSION_URLS) {
          try {
            const latest = readVersion(await readJson(url))
            if (latest === null) continue
            version.value = latest
            version.at = now()
            version.failed = false
            return
          } catch {
          }
        }
        version.failed = true
        version.at = now()
      } finally {
        version.inflight = null
      }
    })()
  }

  return {
    async version(): Promise<CatalogEntry<string>> {
      ensureVersion()
      if (version.inflight !== null) await version.inflight
      return { value: version.value, ready: version.value !== null, failed: version.failed, checkedAt: version.at }
    },
    currentVersion(): string | undefined {
      return current
    },
    dispose(): void {
      disposed = true
    },
  }
}

// lib/index.js sits one level under the package root, so the manifest is read
// relative to this module instead of by package name.
const OWN_MANIFEST = new URL('../package.json', import.meta.url)

function currentVersionOf(): string | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(fileURLToPath(OWN_MANIFEST), 'utf8'))
    const version = asRecord(parsed)?.version
    /* v8 ignore next 1 */
    return typeof version === 'string' && version !== '' ? version : undefined
  } catch {
    /* v8 ignore next 1 */
    return undefined
  }
}
