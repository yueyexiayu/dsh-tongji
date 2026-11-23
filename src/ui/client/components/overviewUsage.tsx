import type { ReactElement } from 'react'
import { type DayTotals } from '../overview'
import { shiftDayKey } from '../../shared/days'
import type { ViewKit } from '../viewkit'
import { IconData } from '../primitives'
import { SkeletonPlot } from './skeleton'

export interface OverviewUsageProps {
  days: Record<string, DayTotals>
  today: string
  pending?: boolean
}

export function usageWindowOf(today: string): string[] {
  const columns: string[] = []
  for (let d = -6; d <= 0; d++) {
    const key = shiftDayKey(today, d)
    if (key === null) return []
    columns.push(key)
  }
  return columns
}

const TICKS: readonly number[] = [0, 25, 50, 75, 100]

export function makeOverviewUsage(kit: ViewKit): (props: OverviewUsageProps) => ReactElement {
  const { t, fmt } = kit
  return function OverviewUsage(props: OverviewUsageProps): ReactElement {
    const window = usageWindowOf(props.today)
    const byKey: Record<string, DayTotals | undefined> = props.days
    const columns = window.map(key => ({ key, entry: byKey[key] }))
    const empty = columns.every(c => c.entry === undefined || c.entry.tokens <= 0)
    let maxTokens = 0
    for (const c of columns) {
      if (c.entry === undefined) continue
      if (c.entry.tokens > maxTokens) maxTokens = c.entry.tokens
    }
    const heightOf = (value: number, max: number): string => (max <= 0 || value <= 0 ? '0%' : `${Math.max(4, Math.round((value / max) * 100))}%`)
    const tickOf = (percent: number): string => fmt(Math.round((maxTokens * percent) / 100))
    return (
      <div className="lc-card lc-ov-usage">
        <div className="lc-card-title">
          <span className="lc-card-title-text">
            <IconData size={14} />
            {t('ov.usage.title')}
          </span>
        </div>
        {empty || window.length === 0
          ? (props.pending === true
            ? (
              <div className="lc-ov-usage-plot lc-ov-usage-plot-skel" aria-hidden="true">
                <div className="lc-ov-usage-grid"><SkeletonPlot /></div>
              </div>
            )
            : <div className="lc-empty">{t('ov.usage.empty')}</div>)
          : (
            <>
              <div className="lc-ov-usage-plot" role="group" aria-label={t('ov.usage.title')}>
                <div className="lc-ov-usage-rail lc-ov-usage-rail-l" aria-hidden="true">
                  {TICKS.map(p => <span key={p} className="lc-ov-usage-tick" style={{ top: `${100 - p}%` }}>{tickOf(p)}</span>)}
                </div>
                <div className="lc-ov-usage-grid">
                  <div className="lc-ov-usage-cols">
                    {TICKS.map(p => (
                      <span
                        key={p}
                        className={'lc-ov-usage-line' + (p === 0 ? ' lc-ov-usage-line-0' : '')}
                        style={{ bottom: `${p}%` }}
                        aria-hidden="true"
                      />
                    ))}
                    {columns.map((c) => {
                      const tokens = c.entry?.tokens ?? 0
                      const label = `${c.key}\n${t('ov.usage.tokens')} ${fmt(tokens)}`
                      return (
                        <div key={c.key} className="lc-ov-usage-col" data-lc-tip={label}>
                          <div className="lc-ov-usage-bars">
                            <span
                              className="lc-ov-usage-bar lc-ov-usage-tokens"
                              style={{ height: heightOf(tokens, maxTokens) }}
                            >
                              {tokens > 0 && <span className="lc-ov-usage-value">{fmt(tokens)}</span>}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="lc-ov-usage-days" aria-hidden="true">
                  {columns.map(c => <span key={c.key} className="lc-ov-usage-day">{c.key.slice(5)}</span>)}
                </div>
              </div>
            </>
          )}
        <div className="lc-ov-usage-key" aria-hidden="true">
          <span className="lc-ov-usage-swatch lc-ov-usage-tokens" />
          <span className="lc-ov-usage-key-label">{t('ov.usage.tokens')}</span>
        </div>
      </div>
    )
  }
}
