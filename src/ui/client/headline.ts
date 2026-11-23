import type { ContextBreakdown, ContextPressure, ContextTimeline } from '../shared/types'
import { anchoredParts, officialParts, type PartsPart } from './categories'
import { reserveGeometry, type ContextReserve } from './reserve'

export interface Headline {
  tokens: number
  window?: number
  pct: number | null
  parts: PartsPart[]
  reserve?: ContextReserve
  /** False only when both the occupancy and the breakdown came from the provider. */
  approximate: boolean
}

export function occupancyPercent(tokens: number, window: number): number {
  return Math.min(100, Math.round(tokens / window * 1000) / 10)
}

export function headlineOf(
  data: ContextTimeline,
  pressure: ContextPressure | null = null,
  breakdown: ContextBreakdown | null = null,
): Headline {
  const current = data.current
  const projected = pressure !== null && typeof pressure.projectedTokens === 'number'
    ? pressure.projectedTokens
    : undefined
  const sampled = pressure !== null && typeof pressure.pressureTokens === 'number'
    ? pressure.pressureTokens
    : undefined
  const last = data.last
  const requests = data.requests
  const lastReq = requests.length > 0 ? requests[requests.length - 1] : null
  const anchor = last !== undefined ? last : lastReq
  const derived = anchor !== null && typeof anchor.prompt === 'number'
    ? anchor.prompt + (current.total - anchor.total)
    : undefined
  const occupancyTokens = projected ?? sampled ?? derived ?? null
  // pressureTokens is the only occupancy the provider itself reported; projected
  // padding, the prompt-anchored derivation and current.total are all estimates,
  // and officialParts needs a real breakdown to be anything else.
  // Only the sample the provider itself reported is exact; projected padding
  // and every fallback below it is an estimate, even when a breakdown exists.
  const precise = sampled !== undefined && breakdown !== null && occupancyTokens === sampled
  const window = pressure !== null && typeof pressure.contextWindow === 'number'
    ? pressure.contextWindow
    : data.contextWindow
  const tokens = occupancyTokens ?? current.total
  const pct = window !== undefined && window > 0 ? occupancyPercent(tokens, window) : null
  const parts = anchoredParts(
    officialParts(current, breakdown),
    occupancyTokens !== null && tokens > 0 ? tokens : null,
  )
  const reserve = reserveGeometry(window, data.maxOutputTokens)
  return { tokens, window, pct, parts, approximate: !precise, ...(reserve !== undefined ? { reserve } : {}) }
}
