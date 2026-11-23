import type { Category, CommandRecord, CommandStats, ContextEventRecord, FileOpRecord, JobRecord, SessionCostUsage, SurfaceNode, SurfaceNodeWindow, SystemPromptNode, TimingSpan, TimingTotals } from '../shared/types'
import type { SlimRequestRecord } from '../shared/types'
import type { FoldBounds } from './config'

const SURFACE_CATS: readonly Category[] = ['user', 'inject', 'skill', 'assistant', 'tool']

function finiteOf(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function slimSurfaceNode(node: SurfaceNode): SurfaceNode {
  const slim: SurfaceNode = { seq: node.seq, cat: node.cat, tokens: node.tokens }
  if (node.reasoning !== undefined) slim.reasoning = node.reasoning
  if (node.answerTokens !== undefined) slim.answerTokens = node.answerTokens
  if (node.callTokens !== undefined) slim.callTokens = node.callTokens
  if (node.imgs !== undefined) slim.imgs = node.imgs
  if (node.tool !== undefined) slim.tool = node.tool
  return slim
}


export interface CommandStateRecord extends CommandRecord {
  call?: string
}

export type JobStateRecord = JobRecord

/** Kept jobs: every running one, plus the newest settled ones. */
export const JOBS_MAX = 80

export const RUNNING_JOBS_MAX = 20

export const JOB_LABEL_MAX = 280

export const JOB_DETAIL_MAX = 160

function slimCommandRecord(rec: CommandStateRecord): CommandStateRecord {
  const { cmd: _cmd, cmdTruncated: _cmdTruncated, description: _description, cwd: _cwd, ...rest } = rec
  return rest
}

function slimCommands(records: unknown): CommandStateRecord[] {
  const commands: CommandStateRecord[] = []
  if (!Array.isArray(records)) return commands
  for (const rec of records) {
    if (rec === null || typeof rec !== 'object') continue
    commands.push(slimCommandRecord(rec as CommandStateRecord))
  }
  return commands
}


export interface TimelineEvent {
  type: string
  seq: number
  time: number
  data?: Record<string, unknown>
  surfaceOp?: unknown
}

export interface AgentAlias {
  catalogName?: string
  memberName?: string
  catalogLabel?: string
}

export interface TimelineState {
  surface: SurfaceNode[]
  sums: Record<Category, number>
  assistantReasoning: number
  assistantAnswerTokens: number
  assistantCallTokens: number
  systemTokens: number
  systems?: SystemPromptNode[]
  toolsTokens: number
  model?: string
  provider?: string
  reasoningEffort?: string
  lastModel?: string
  contextWindow?: number
  maxOutputTokens?: number
  requests: SlimRequestRecord[]
  turnRuns?: number
  totals?: CumulativeTotals
  events: ContextEventRecord[]
  archived: SurfaceNode[]
  cost?: SessionCostUsage
  generatedReasoning?: number
  generatedAnswerTokens?: number
  generatedCallTokens?: number
  humanInputs?: number
  answers?: number
  lastUser?: string
  archiveFloor?: number
  detailRev?: number
  timing?: TimingTotals
  /** Leading fork-inherited events: surfaced in the panel, never billed to this session. */
  seedCut?: number
  stepStart?: {
    time: number
    firstToken?: number
  }
  stepWaits?: { start: number; end: number }[]
  stepApprovals?: Record<string, number>
  stepRequestSeq?: number
  stepBeats?: number[]
  stepBeatsFull?: boolean
  spans: TimingSpan[]
  stepSpans?: TimingSpan[]
  callNames: Record<string, { name: string; start: number; argsRaw?: string; transport?: true }>
  pendingShadowedSeqs?: number[]
  pendingShadowEventSeq?: number
  fileOps: FileOpRecord[]
  fileOpsFloor?: number
  commands: CommandStateRecord[]
  commandsFloor?: number
  commandStats?: CommandStats
  jobs?: JobStateRecord[]
  toolTally?: Record<string, number>
  programTally?: Record<string, number>
  commandCalls?: string[]
  commandCallsOverflow?: boolean
  agents?: Record<string, AgentAlias>
  /** Subagent sessions whose settle notice reported an error. */
  failedAgents?: Record<string, boolean>
  pendingCodeCmds?: Record<string, CommandStateRecord[]>
  pendingCodeOps?: Record<string, FileOpRecord[]>
  pendingCodeStarts?: Record<string, number>
}

export function archiveWindowOf(
  state: TimelineState,
  tail: number,
): { archive: SurfaceNode[]; archiveFloor?: number } {
  let drop = 0
  const oldestReq = state.requests.length > 0 ? state.requests[0].seq : undefined
  if (oldestReq !== undefined) {
    while (drop < state.archived.length
      && (state.archived[drop].gone ?? Infinity) <= oldestReq) drop++
  }
  if (state.archived.length - drop > tail) drop = state.archived.length - tail
  if (drop === 0) {
    return {
      archive: state.archived,
      ...(state.archiveFloor !== undefined ? { archiveFloor: state.archiveFloor } : {}),
    }
  }
  const stateFloor = state.archiveFloor
  const dropFloor = state.archived[drop - 1].gone
  if (stateFloor === undefined && dropFloor === undefined) {
    return { archive: state.archived.slice(drop) }
  }
  return {
    archive: state.archived.slice(drop),
    archiveFloor: Math.max(stateFloor ?? 0, dropFloor ?? 0),
  }
}

export function surfaceWindowOf(state: TimelineState, tail: number, archiveTail: number): SurfaceNodeWindow {
  const overflowCount = Math.max(0, state.surface.length - tail)
  const overflow = state.surface.slice(0, overflowCount)
  const kept = state.surface.slice(overflowCount)
  const pinned = overflow.filter(node => node.cat === 'inject' || node.cat === 'skill')
  const nodes = pinned.length > 0 ? [...pinned, ...kept] : kept
  const droppedNodes = overflowCount - pinned.length
  const archive = archiveWindowOf(state, archiveTail)
  const window: SurfaceNodeWindow = {
    nodes,
    droppedNodes,
    archive: archive.archive,
  }
  if (droppedNodes > 0) {
    let floor = 0
    for (const node of overflow) {
      if (node.cat !== 'inject' && node.cat !== 'skill') floor = Math.max(floor, node.seq)
    }
    window.surfaceFloor = floor
  }
  if (archive.archiveFloor !== undefined) window.archiveFloor = archive.archiveFloor
  return window
}

export function trimToLastTurns(requests: SlimRequestRecord[], maxTurns: number): SlimRequestRecord[] {
  let runs = 0
  let start = requests.length
  let prevTurn: number | undefined
  for (let i = requests.length - 1; i >= 0; i--) {
    const turn = requests[i].turn
    if (turn !== prevTurn) {
      if (runs >= maxTurns) break
      runs++
      prevTurn = turn
    }
    start = i
  }
  return requests.slice(start)
}

export function countTurnRuns(requests: readonly SlimRequestRecord[]): number {
  let runs = 0
  let prevTurn: number | undefined
  for (const r of requests) {
    if (r.turn !== prevTurn) {
      runs++
      prevTurn = r.turn
    }
  }
  return runs
}

function trimJobs(st: TimelineState): void {
  const jobs = st.jobs
  if (jobs === undefined || jobs.length === 0) return
  const kept: JobStateRecord[] = []
  let running = 0
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i]
    if (job.status === 'running') {
      if (running >= RUNNING_JOBS_MAX) continue
      running++
    }
    kept.push(job)
  }
  kept.reverse()
  if (kept.length > JOBS_MAX) st.jobs = kept.slice(kept.length - JOBS_MAX)
  else if (kept.length !== jobs.length) st.jobs = kept
}

export function trimState(st: TimelineState, bounds: FoldBounds): void {
  st.turnRuns = st.turnRuns ?? countTurnRuns(st.requests)
  if (st.turnRuns > bounds.maxKeptTurns) {
    st.requests = trimToLastTurns(st.requests, bounds.maxKeptTurns)
    st.turnRuns = countTurnRuns(st.requests)
  }
  if (st.requests.length > bounds.maxRequestSteps) {
    st.requests = st.requests.slice(-bounds.maxRequestSteps)
    st.turnRuns = countTurnRuns(st.requests)
  }
  if (st.events.length > bounds.maxEvents) st.events = st.events.slice(-bounds.maxEvents)
  if (st.spans.length > TIMING_SPANS_MAX) st.spans = st.spans.slice(-TIMING_SPANS_MAX)
  if (st.fileOps.length > bounds.maxFileOps) {
    const drop = st.fileOps.length - bounds.maxFileOps
    st.fileOpsFloor = Math.max(st.fileOpsFloor ?? 0, st.fileOps[drop - 1].seq)
    st.fileOps = st.fileOps.slice(drop)
  }
  if (st.commands.length > bounds.maxCommands) {
    let excess = st.commands.length - bounds.maxCommands
    let floor = 0
    const kept: CommandStateRecord[] = []
    for (const rec of st.commands) {
      if (excess > 0 && rec.status !== 'running') {
        excess--
        floor = Math.max(floor, rec.seq)
        continue
      }
      kept.push(rec)
    }
    if (kept.length > bounds.maxCommands) {
      const extra = kept.length - bounds.maxCommands
      for (const rec of kept.slice(0, extra)) floor = Math.max(floor, rec.seq)
      kept.splice(0, extra)
    }
    st.commandsFloor = Math.max(st.commandsFloor ?? 0, floor)
    st.commands = kept
  }
  trimJobs(st)
  if (bounds.headOnly === true) {
    trimHeadState(st)
    return
  }
  if (st.archived.length > 0) {
    let drop = 0
    const oldestReq = st.requests.length > 0 ? st.requests[0].seq : undefined
    if (oldestReq !== undefined) {
      while (drop < st.archived.length
        && (st.archived[drop].gone ?? Infinity) <= oldestReq) drop++
    }
    if (drop > 0) {
      const floor = st.archived[drop - 1].gone
      /* v8 ignore next 1 */
      if (floor !== undefined) st.archiveFloor = Math.max(st.archiveFloor ?? 0, floor)
      st.archived = st.archived.slice(drop)
    }
  }
}

const COMMAND_CALLS_MAX = 1024

export function noteCommandCall(st: TimelineState, callId: string): void {
  if (callId === '') return
  const calls = st.commandCalls
  if (calls === undefined) {
    st.commandCalls = [callId]
    return
  }
  if (calls.includes(callId)) return
  calls.push(callId)
  if (calls.length > COMMAND_CALLS_MAX) {
    calls.splice(0, calls.length - COMMAND_CALLS_MAX)
    st.commandCallsOverflow = true
  }
}

export function trimHeadState(st: TimelineState): void {
  if (st.requests.length > 2) st.requests = st.requests.slice(-2)
  if (st.events.length > 0) st.events = []
  if (st.agents !== undefined) delete st.agents
  if (st.commands.length > 0) st.commands = st.commands.filter(rec => rec.status === 'running').slice(-16)
  if (st.jobs !== undefined && st.jobs.length > 0) {
    st.jobs = st.jobs.filter(job => job.status === 'running').slice(-RUNNING_JOBS_MAX)
  }
  if (st.fileOps.length > 0) st.fileOps = []
  if (st.spans.length > 0) st.spans = []
  if (st.archived.length > 0) st.archived = []
}

export const TIMING_SPANS_MAX = 2_000

export const SKILL_NAMES_MAX = 500

export const TALLY_NAMES_MAX = 128

export const TALLY_NAME_CHARS_MAX = 120

export interface CumulativeTotals {
  turns: number
  steps: number
  injects: number
  compactions: number
  prunes: number
  skills: Record<string, true>
  lastTurn?: number
}

function emptyTotals(): CumulativeTotals {
  return { turns: 0, steps: 0, injects: 0, compactions: 0, prunes: 0, skills: {} }
}

function ownedTotals(st: TimelineState): CumulativeTotals {
  return st.totals === undefined ? emptyTotals() : { ...st.totals }
}

export function countStep(st: TimelineState): void {
  const totals = ownedTotals(st)
  totals.steps += 1
  st.totals = totals
}

export function countInject(st: TimelineState): void {
  const totals = ownedTotals(st)
  totals.injects += 1
  st.totals = totals
}

export function countCompaction(st: TimelineState, kind: 'compaction' | 'prune'): void {
  const totals = ownedTotals(st)
  if (kind === 'compaction') totals.compactions += 1
  else totals.prunes += 1
  st.totals = totals
}

export function noteTurn(st: TimelineState, turn: number | undefined): void {
  const label = turn !== undefined && Number.isFinite(turn) ? turn : 0
  if (st.totals?.lastTurn === label) return
  const totals = ownedTotals(st)
  totals.turns += 1
  totals.lastTurn = label
  st.totals = totals
}

export function noteSkillName(st: TimelineState, name: string): void {
  if (name === '' || name === '__proto__') return
  const current = st.totals
  if (current !== undefined && Object.hasOwn(current.skills, name)) return
  if (current !== undefined && Object.keys(current.skills).length >= SKILL_NAMES_MAX) return
  const totals = ownedTotals(st)
  totals.skills = { ...totals.skills, [name]: true }
  st.totals = totals
}

export function createTimelineState(seedCut?: number): TimelineState {
  return {
    surface: [],
    sums: { user: 0, inject: 0, skill: 0, assistant: 0, tool: 0 },
    assistantReasoning: 0,
    assistantAnswerTokens: 0,
    assistantCallTokens: 0,
    systemTokens: 0,
    toolsTokens: 0,
    requests: [],
    turnRuns: 0,
    totals: emptyTotals(),
    events: [],
    archived: [],
    callNames: {},
    fileOps: [],
    commands: [],
    spans: [],
    ...(seedCut !== undefined && seedCut > 0 ? { seedCut } : {}),
  }
}
