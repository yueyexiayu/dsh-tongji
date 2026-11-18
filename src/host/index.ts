/**
 * Host half for the tongji plugin.
 *
 * Two capability sets live here after the dsh-context merge:
 *   - the vendored dsh-context host (context timeline, detail, overview, fleet, skills);
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

export function apply(ctx: Context, config: UpstreamConfig): void {
  // Register tongji's own route first: it survives a dsh-context baseline
  // short-circuit, and a later upstream throw must not strand the panel's
  // per-turn section without its data source.
  registerUsageRoute(ctx)
  applyUpstream(ctx, config)
}
