/**
 * Host half for the tongji plugin.
 *
 * Two capability sets live here:
 *   - the panel host under ../ui/host (context timeline, detail, overview, fleet, skills);
 *   - tongji's own usage route, which folds per-turn/per-step token usage.
 *
 * Both share one `apply`, so the plugin stays a single Cordis row.
 */
import type { Context } from '@deepseek-ai/cordis'
import { apply as applyUpstream, inject as upstreamInject, Config as UpstreamConfig } from '../ui/host/index'
import { registerUsageRoute } from './usageRoute'

export const name = 'tongji'

export const inject = [...new Set([...upstreamInject, 'connection', 'sessionQuery'])]

export const Config = UpstreamConfig

export { detectHarnessVersion, detectedHarnessVersion } from '../ui/host/version'
export { startFoldWorkerChannel } from '../ui/host/foldWorker'
// Exported for the cache regression tests: they drive the real merge/bound logic.
export { createOverviewCache, type CacheSaveMode } from '../ui/host/overviewCache'
// Exported for the fold regression tests: they replay real events into a state.
export { applyTimeline, createTimelineState } from '../ui/host/fold'
export { applyActivity, createActivityState } from '../ui/host/activity'
export { DEFAULT_BOUNDS } from '../ui/host/config'

export function apply(ctx: Context, config: UpstreamConfig): void {
  // Register tongji's own route first: it survives a version baseline
  // short-circuit, and a later upstream throw must not strand the panel's
  // per-turn section without its data source.
  registerUsageRoute(ctx)
  applyUpstream(ctx, config)
}
