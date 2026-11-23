/**
 * tongji's per-turn usage fold, rendered as the bottom-most card of the
 * context view.
 *
 * The context panel measures what sits *in* the window; this measures what passed
 * *through* the model, and it keeps the two levels tongji always had: a turn
 * expands into the steps that spent it.
 *
 * Styling reuses the panel's own vocabulary (.lc-card / .lc-stat / .lc-sl and
 * the semantic colours from stats.css) so this block reads as part of the panel
 * and inherits its container queries.
 *
 * Data comes only from tongji's own route (/api/tongji/usage). The old panel
 * also read the harness `sessionStats` projection for decode speed; that is not
 * reproduced here because this route does not carry decode timing.
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { Translate } from '../i18n'
import { IconGauge } from '../primitives'

interface Bucket {
  input: number
  output: number
  read: number
  write: number
  samples: number
  unknown: number
  cacheInput: number
  cacheSamples: number
  cacheMissing: number
}

interface StepEntry {
  key: string
  step: number | null
  value: Bucket
}

interface TurnEntry {
  key: string
  turn: number | null
  value: Bucket
  steps: StepEntry[]
}

interface UsagePayload {
  total: Bucket
  turns: TurnEntry[]
}

const ROUTE = 'api/tongji/usage'

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function bucket(value: unknown): Bucket {
  const row = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  return {
    input: num(row.input),
    output: num(row.output),
    read: num(row.read),
    write: num(row.write),
    samples: num(row.samples),
    unknown: num(row.unknown),
    cacheInput: num(row.cacheInput),
    cacheSamples: num(row.cacheSamples),
    cacheMissing: num(row.cacheMissing),
  }
}

function stepsOf(value: unknown): StepEntry[] {
  const raw = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const steps = Object.entries(raw).map(([key, entry]) => ({
    key,
    step: key === 'none' ? null : num(key),
    value: bucket(entry),
  }))
  steps.sort((left, right) => {
    if (left.step === null) return 1
    if (right.step === null) return -1
    return left.step - right.step
  })
  return steps
}

function decode(value: unknown): UsagePayload | null {
  if (typeof value !== 'object' || value === null) return null
  const root = value as Record<string, unknown>
  if (typeof root.total !== 'object' || root.total === null) return null
  // The host folds turns with Object.fromEntries, so the key is a string; the
  // 'unassigned' bucket holds events that carry no turn number.
  const raw = typeof root.turns === 'object' && root.turns !== null && !Array.isArray(root.turns)
    ? root.turns as Record<string, unknown>
    : {}
  const turns = Object.entries(raw).map(([key, entry]) => {
    const record = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
    return {
      key,
      turn: key === 'unassigned' ? null : num(key),
      value: bucket(record),
      steps: stepsOf(record.steps),
    }
  })
  turns.sort((left, right) => {
    if (left.turn === null) return 1
    if (right.turn === null) return -1
    return left.turn - right.turn
  })
  return { total: bucket(root.total), turns }
}

function tokens(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
  return String(value)
}

function exact(value: number): string {
  return value.toLocaleString()
}

/** Input that missed the cache plus input served from it; tongji's own framing. */
function inputTotal(row: Bucket): number {
  return row.input + row.read + row.write
}

function grandTotal(row: Bucket): number {
  return inputTotal(row) + row.output
}

function hitPercent(row: Bucket): string {
  const denom = row.cacheInput > 0 ? row.cacheInput : row.input + row.read
  if (denom <= 0) return '—'
  return ((row.read / denom) * 100).toFixed(2) + '%'
}

export function makeTurnUsageCard(t: Translate) {
  return function TurnUsageCard(props: { sessionId?: string }): ReactElement | null {
    const sessionId = props.sessionId
    const [payload, setPayload] = useState<UsagePayload | null>(null)
    const [failed, setFailed] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      if (typeof sessionId !== 'string' || sessionId === '') return undefined
      const controller = new AbortController()
      let alive = true
      const load = async (): Promise<void> => {
        try {
          const response = await fetch(`${ROUTE}?sessionId=${encodeURIComponent(sessionId)}`, {
            signal: controller.signal,
          })
          const decoded = decode(await response.json().catch(() => null))
          if (!alive) return
          if (!response.ok || decoded === null) throw new Error(String(response.status))
          setPayload(decoded)
          setFailed(false)
        } catch {
          if (alive && !controller.signal.aborted) setFailed(true)
        } finally {
          if (alive) setLoading(false)
        }
      }
      void load()
      const timer = window.setInterval(() => { void load() }, 5000)
      return () => {
        alive = false
        controller.abort()
        window.clearInterval(timer)
      }
    }, [sessionId])

    if (typeof sessionId !== 'string' || sessionId === '') return null

    const total = payload?.total
    const turns = payload?.turns ?? []
    const assigned = turns.filter(entry => entry.turn !== null)
    const unassigned = turns.find(entry => entry.turn === null)
    const stepCount = assigned.reduce((sum, entry) => sum + entry.steps.filter(step => step.step !== null).length, 0)

    // Semantic colours mirror stats.css: blue for steps, teal for turns,
    // green for answers, purple for samples.
    const metrics: { key: string; label: string; value: string; title?: string }[] = total === undefined
      ? []
      : [
          { key: 'uncached', label: t('turnusage.uncached'), value: tokens(total.input), title: exact(total.input) },
          { key: 'hit', label: t('turnusage.cacheHit'), value: hitPercent(total), title: `${exact(total.read)} / ${exact(total.input + total.read)}` },
          { key: 'input', label: t('turnusage.inputTotal'), value: tokens(inputTotal(total)), title: exact(inputTotal(total)) },
          { key: 'output', label: t('turnusage.output'), value: tokens(total.output), title: exact(total.output) },
          { key: 'grand', label: t('turnusage.grand'), value: tokens(grandTotal(total)), title: exact(grandTotal(total)) },
          { key: 'counts', label: t('turnusage.counts'), value: `${assigned.length} / ${stepCount}`, title: `${assigned.length} ${t('turnusage.turns')} · ${stepCount} ${t('turnusage.steps')}` },
        ]

    return (
      <div className="lc-card" data-lc-turn-usage>
        <div className="lc-card-title">
          <span className="lc-card-title-text">
            <IconGauge size={14} />
            {t('turnusage.title')}
          </span>
          <span className="lc-card-sub">
            {loading && payload === null
              ? t('turnusage.loading')
              : failed
                ? t('turnusage.stale')
                : `${t('turnusage.turns')} ${assigned.length} · ${t('turnusage.steps')} ${stepCount}`}
          </span>
        </div>

        {metrics.length > 0
          ? (
              <div className="lc-sl">
                {metrics.map(metric => (
                  <div className={`lc-stat lc-tu-${metric.key}`} key={metric.key} title={metric.title}>
                    <span className="lc-stat-label">{metric.label}</span>
                    <span className="lc-stat-value">{metric.value}</span>
                  </div>
                ))}
              </div>
            )
          : <div className="lc-empty">{loading ? t('turnusage.loading') : t('turnusage.empty')}</div>}

        {assigned.length > 0
          ? (
              <div className="lc-turn-usage-list">
                {assigned.map((entry) => (
                  <details className="lc-turn-usage-one" key={entry.key}>
                    <summary>
                      <span className="lc-turn-usage-turn">
                        {t('turnusage.turn')}{entry.turn}
                      </span>
                      <span className="lc-turn-usage-steps">
                        {entry.steps.filter(step => step.step !== null).length} {t('turnusage.steps')}
                      </span>
                      <span className="lc-turn-usage-gist">
                        {t('turnusage.cacheHit')} {hitPercent(entry.value)}
                      </span>
                      <span className="lc-turn-usage-sum">{tokens(grandTotal(entry.value))}</span>
                    </summary>
                    <div className="lc-turn-usage-detail">
                      {entry.steps.length > 0
                        ? entry.steps.map(step => (
                            <div className="lc-turn-usage-step" key={step.key}>
                              <span className="lc-turn-usage-step-no">
                                {step.step === null ? t('turnusage.unassigned') : `${t('turnusage.step')}${step.step}`}
                              </span>
                              <span className="lc-turn-usage-step-num">
                                {t('turnusage.input')} {tokens(inputTotal(step.value))}
                              </span>
                              <span className="lc-turn-usage-step-num">
                                {t('turnusage.output')} {tokens(step.value.output)}
                              </span>
                              <span className="lc-turn-usage-step-num">
                                {hitPercent(step.value)}
                              </span>
                            </div>
                          ))
                        : <div className="lc-turn-usage-note">{t('turnusage.noSteps')}</div>}
                    </div>
                  </details>
                ))}
              </div>
            )
          : null}

        {unassigned !== undefined
          ? (
              <div className="lc-turn-usage-note">
                {t('turnusage.unassignedTurn')} {tokens(grandTotal(unassigned.value))}
              </div>
            )
          : null}
      </div>
    )
  }
}
