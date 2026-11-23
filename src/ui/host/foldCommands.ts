import { exitOfJobDetail, markersOfText, signalOfJobDetail } from '../shared/commands'
import type { CommandArgs } from '../shared/commands'
import { JOB_DETAIL_MAX, JOB_LABEL_MAX } from './foldState'
import type { CommandStateRecord, JobStateRecord, TimelineState } from './foldState'

export function findCommandIndex(commands: readonly CommandStateRecord[], callId: string): number {
  for (let i = commands.length - 1; i >= 0; i--) if (commands[i].call === callId) return i
  return -1
}

export function findJobIndex(jobs: readonly JobStateRecord[], id: string): number {
  for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].id === id) return i
  return -1
}

export function jobKindOf(data: Record<string, unknown> | undefined): string {
  const kind = data?.kind
  return typeof kind === 'string' && kind !== '' ? kind.slice(0, 40) : 'job'
}

export function jobLabelOf(data: Record<string, unknown> | undefined): string | undefined {
  const label = data?.label
  if (typeof label !== 'string' || label.trim() === '') return undefined
  const text = label.trim()
  return text.length > JOB_LABEL_MAX ? text.slice(0, JOB_LABEL_MAX) : text
}

function jobDetailOf(detail: unknown): string | undefined {
  if (typeof detail !== 'string' || detail.trim() === '') return undefined
  const text = detail.trim()
  return text.length > JOB_DETAIL_MAX ? text.slice(0, JOB_DETAIL_MAX) : text
}

function jobCauseOf(cause: unknown): string | undefined {
  return typeof cause === 'string' && cause !== '' ? cause.slice(0, 40) : undefined
}

function sameJob(a: JobStateRecord, b: JobStateRecord): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export interface JobRegisterInput {
  id: string
  seq: number
  start: number
  kind: string
  label?: string
  call?: string
  background?: true
  turn?: number
  step?: number
}

export function registerJob(jobs: JobStateRecord[], input: JobRegisterInput): boolean {
  const index = findJobIndex(jobs, input.id)
  const fields: Partial<JobStateRecord> = {
    start: input.start,
    kind: input.kind,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.call !== undefined ? { call: input.call } : {}),
    ...(input.background === true ? { background: true as const } : {}),
    ...(input.turn !== undefined ? { turn: input.turn } : {}),
    ...(input.step !== undefined ? { step: input.step } : {}),
  }
  if (index >= 0) {
    const next: JobStateRecord = { ...jobs[index], ...fields }
    if (sameJob(jobs[index], next)) return false
    jobs[index] = next
    return true
  }
  jobs.push({ id: input.id, seq: input.seq, status: 'running', ...fields } as JobStateRecord)
  return true
}

export function settleJob(
  jobs: JobStateRecord[],
  id: string,
  status: 'completed' | 'killed' | 'failed',
  end: number,
  detail: unknown,
  cause: unknown,
): boolean {
  const index = findJobIndex(jobs, id)
  if (index < 0) return false
  const prev = jobs[index]
  const detailText = jobDetailOf(detail)
  const causeText = jobCauseOf(cause)
  const next: JobStateRecord = {
    ...prev,
    status,
    end,
    ...(detailText !== undefined ? { detail: detailText } : {}),
    ...(causeText !== undefined ? { cause: causeText } : {}),
  }
  if (sameJob(prev, next)) return false
  jobs[index] = next
  return true
}

/** A tool result came back: a job still running afterwards detached into the background. */
export function markJobFromCommand(jobs: JobStateRecord[], callId: string, rec: CommandStateRecord): boolean {
  let changed = false
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    if (job.call !== callId || job.status !== 'running') continue
    if (job.returned === true && (rec.background !== true || job.background === true)) continue
    jobs[i] = { ...job, returned: true, ...(rec.background === true ? { background: true as const } : {}) }
    changed = true
  }
  return changed
}

export function markJobBackground(jobs: JobStateRecord[], callId: string): boolean {
  let changed = false
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    if (job.call !== callId || job.background === true) continue
    jobs[i] = { ...job, background: true }
    changed = true
  }
  return changed
}

export function bufferedCommandOf(
  pending: Record<string, CommandStateRecord[]>,
  callId: string,
): CommandStateRecord | undefined {
  for (const root in pending) {
    for (const rec of pending[root]) if (rec.call === callId) return rec
  }
  return undefined
}

export function resultTextsOf(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return []
  const texts: string[] = []
  for (const block of blocks) {
    if (block === null || typeof block !== 'object') continue
    const text = (block as { text?: unknown }).text
    if (typeof text === 'string') texts.push(text)
  }
  return texts
}

export function tallyRun(st: TimelineState, rec: CommandStateRecord): void {
  const stats = { ...(st.commandStats ?? { runs: 0, failed: 0, ms: 0, bg: 0 }) }
  stats.runs += 1
  if (rec.status === 'failed' || rec.status === 'killed') stats.failed += 1
  /* v8 ignore next 1 */
  if (rec.end !== undefined) stats.ms += Math.max(0, rec.end - rec.start)
  st.commandStats = stats
}

export function bumpBg(st: TimelineState): void {
  st.commandStats = { ...(st.commandStats ?? { runs: 0, failed: 0, ms: 0, bg: 0 }), bg: (st.commandStats?.bg ?? 0) + 1 }
}

export function setCommand(st: TimelineState, index: number, next: CommandStateRecord): void {
  if (st.commands[index].status === 'running' && next.status !== 'running') tallyRun(st, next)
  st.commands[index] = next
}

export function resultPatchOf(texts: string[], markers: ReturnType<typeof markersOfText>): Partial<CommandStateRecord> {
  return {
    ...(texts.length > 0 ? { outChars: texts.reduce((n, t) => n + t.length, 0) } : {}),
    ...(markers.truncated === true ? { outTruncated: true as const } : {}),
    ...(markers.stderr === true ? { stderr: true as const } : {}),
    ...(markers.timedOut === true ? { timedOut: true as const } : {}),
    ...(markers.stopped === true ? { stopped: true as const } : {}),
    ...(markers.denied === true ? { denied: true as const } : {}),
    ...(markers.signal !== undefined ? { signal: markers.signal } : {}),
    ...(markers.exit !== undefined ? { exit: markers.exit } : {}),
  }
}

export function commandRecordOf(input: {
  seq: number
  time: number
  tool: CommandStateRecord['tool']
  parsed: CommandArgs & { truncated?: true }
  turn?: unknown
  step?: unknown
  codeMode?: true
  call: string
}, headOnly = false): CommandStateRecord {
  const { parsed } = input
  const record: CommandStateRecord = {
    seq: input.seq,
    time: input.time,
    tool: input.tool,
    ...(headOnly ? {} : { cmd: parsed.cmd }),
    ...(headOnly || parsed.truncated !== true ? {} : { cmdTruncated: true as const }),
    ...(headOnly ? {} : parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(headOnly ? {} : parsed.cwd !== undefined ? { cwd: parsed.cwd } : {}),
    ...(parsed.timeoutMs !== undefined ? { timeoutMs: parsed.timeoutMs } : {}),
    ...(parsed.background === true ? { background: true as const } : {}),
    ...(parsed.sandbox !== undefined ? { sandbox: parsed.sandbox } : {}),
    ...(typeof input.turn === 'number' ? { turn: input.turn } : {}),
    ...(typeof input.step === 'number' ? { step: input.step } : {}),
    ...(input.codeMode === true ? { codeMode: true as const } : {}),
    start: input.time,
    status: 'running',
    err: false,
    call: input.call,
  }
  return record
}

export function jobCallIdOf(data: Record<string, unknown> | undefined): string | undefined {
  const toolCall = data?.toolCall
  if (toolCall === null || typeof toolCall !== 'object') return undefined
  const callId = (toolCall as { callId?: unknown }).callId
  return typeof callId === 'string' ? callId : undefined
}

export function jobOutcomePatch(
  prev: CommandStateRecord,
  status: 'completed' | 'killed' | 'failed',
  finishedAt: number,
  detail: unknown,
): CommandStateRecord {
  const exit = exitOfJobDetail(detail)
  const signal = signalOfJobDetail(detail)
  const next: CommandStateRecord = {
    ...prev,
    end: finishedAt,
    status: status === 'completed' ? (exit !== undefined && exit !== 0 ? 'failed' : 'completed') : status,
    ...(exit !== undefined ? { exit } : {}),
    ...(signal !== undefined ? { signal } : {}),
  }
  delete next.derived
  delete next.exitInferred
  return next
}

export function patchBufferedCommand(
  st: TimelineState,
  pending: Record<string, CommandStateRecord[]>,
  callId: string,
  patch: (rec: CommandStateRecord) => CommandStateRecord,
): boolean {
  for (const root in pending) {
    const idx = pending[root].findIndex(r => r.call === callId)
    if (idx < 0) continue
    const list = [...pending[root]]
    list[idx] = patch(list[idx])
    st.pendingCodeCmds = { ...pending, [root]: list }
    return true
  }
  return false
}
