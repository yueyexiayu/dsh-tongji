import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

const LIBRARY_PROBE_PACKAGES = ['@deepseek-ai/dsh-session-projection', '@deepseek-ai/dsh-session'] as const

const RUNNING_PROBE_PACKAGES = ['@deepseek-ai/dsh-session', '@deepseek-ai/dsh-session-projection'] as const

const HOME_PROBE_PACKAGES = ['@deepseek-ai/dsh', ...LIBRARY_PROBE_PACKAGES] as const

/**
 * The package root: this build lands in lib/, so the root is one level up.
 * Resolving tongji/package.json by name only works from inside the desktop
 * profile, and the old spelling left the fallback pointing at lib/ itself.
 */
const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

type Resolve = (specifier: string) => string
type ResolveUrl = (specifier: string) => string

function versionOfManifest(manifestPath: string, expectedName?: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (parsed === null || typeof parsed !== 'object') return undefined
    const record = parsed as { name?: unknown; version?: unknown }
    if (expectedName !== undefined && record.name !== expectedName) return undefined
    return typeof record.version === 'string' && record.version !== '' ? record.version : undefined
  } catch {
    return undefined
  }
}

function versionViaManifest(resolve: Resolve, packageName: string): string | undefined {
  try {
    return versionOfManifest(resolve(packageName + '/package.json'))
  } catch {
    return undefined
  }
}

function versionViaEntry(resolve: Resolve, packageName: string): string | undefined {
  let dir: string
  try {
    dir = dirname(resolve(packageName))
  } catch {
    return undefined
  }
  for (;;) {
    const version = versionOfManifest(join(dir, 'package.json'), packageName)
    if (version !== undefined) return version
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

function probeAnchor(resolve: Resolve, packageNames: readonly string[]): string | undefined {
  for (const packageName of packageNames) {
    const version = versionViaManifest(resolve, packageName) ?? versionViaEntry(resolve, packageName)
    if (version !== undefined) return version
  }
  return undefined
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return !rel.startsWith('..') && !isAbsolute(rel)
}

function probeRunningTree(resolve: Resolve, pluginRoot: string): string | undefined {
  for (const packageName of RUNNING_PROBE_PACKAGES) {
    let witness: string
    try {
      witness = resolve(packageName)
    } catch {
      continue
    }
    if (isInside(pluginRoot, witness)) continue
    const version = versionViaManifest(resolve, packageName) ?? versionViaEntry(resolve, packageName)
    if (version !== undefined) return version
  }
  return undefined
}

function resolveRunningModule(specifier: string): string {
  return import.meta.resolve(specifier)
}

/**
 * Manifests of the running installation. The desktop build keeps the DSH tree
 * inside app.asar, which only the Electron host can read; a plain Node probe
 * never sees it, so this runs before the module-resolution probes.
 */
function installManifestPaths(): string[] {
  const paths: string[] = []
  const resources = (process as { resourcesPath?: unknown }).resourcesPath
  if (typeof resources === 'string' && resources !== '') {
    paths.push(join(resources, 'app.asar', 'dsh', 'package.json'))
    paths.push(join(resources, 'app', 'dsh', 'package.json'))
  }
  paths.push(join(dirname(process.execPath), '..', 'Resources', 'app.asar', 'dsh', 'package.json'))
  return paths
}

function versionViaInstall(): string | undefined {
  for (const manifest of installManifestPaths()) {
    const version = versionOfManifest(manifest)
    if (version !== undefined) return version
  }
  return undefined
}

/**
 * The macOS bundle manifest carries the product version even when app.asar is
 * unreadable, so a packaged app still reports the version it actually runs.
 */
function versionViaBundlePlist(): string | undefined {
  if (process.platform !== 'darwin') return undefined
  try {
    const plist = readFileSync(join(dirname(process.execPath), '..', 'Info.plist'), 'utf8')
    const version = /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1]?.trim()
    return version !== undefined && version !== '' ? version : undefined
  } catch {
    return undefined
  }
}

let lastDetected: string | undefined

/**
 * The version the last {@link detectHarnessVersion} call settled on, so routes
 * and diagnostics can report what the guard actually sees instead of guessing.
 */
export function detectedHarnessVersion(): string | undefined {
  return lastDetected
}

export function detectHarnessVersion(
  ctx: Context,
  resolveUrl: ResolveUrl = resolveRunningModule,
  pluginRoot: string = PLUGIN_ROOT,
): string | undefined {
  const installed = versionViaInstall() ?? versionViaBundlePlist()
  const running = installed ?? probeRunningTree((specifier) => {
    const url = resolveUrl(specifier)
    if (!url.startsWith('file:')) throw new Error(`tongji: non-file module URL for ${specifier}`)
    return fileURLToPath(url)
  }, pluginRoot)
  const detected = running ?? versionViaHome(ctx)
  lastDetected = detected
  if (detected === undefined) {
    ctx.logger?.warn?.(
      'tongji: 未能探测运行中的 DSH 版本，版本守卫按「未知」处理（不注册降级投影，也不声称兼容）',
    )
  }
  return detected
}

function versionViaHome(ctx: Context): string | undefined {
  try {
    const homePath = ctx.get('dshHomePath') as unknown
    if (typeof homePath === 'function') {
      const req = createRequire((homePath as (...segments: string[]) => string)('profiles', 'tongji-version-probe.cjs'))
      return probeAnchor(specifier => req.resolve(specifier), HOME_PROBE_PACKAGES)
    }
  } catch {}
  return undefined
}
