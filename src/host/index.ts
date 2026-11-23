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

// Pricing and cost are pure functions; the Host entry re-exports them so
// tests/pricing.test.js can pin fixed inputs to fixed amounts.
export {
  billedTokensOf,
  calculateSessionCost,
  estimateSessionCost,
  mergeCostUsage,
  priceFaceOf,
  priceLookupsOf,
  priceOf,
  pricesBookOf,
  toCurrency,
} from '../ui/shared/pricing'
export { createCostSource } from '../ui/host/cost'
export { detectHarnessVersion, detectedHarnessVersion } from '../ui/host/version'
export { startFoldWorkerChannel } from '../ui/host/foldWorker'

export function apply(ctx: Context, config: UpstreamConfig): void {
  // Register tongji's own route first: it survives a version baseline
  // short-circuit, and a later upstream throw must not strand the panel's
  // per-turn section without its data source.
  registerUsageRoute(ctx)
  applyUpstream(ctx, config)
}
