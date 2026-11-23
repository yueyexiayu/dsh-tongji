import type { JobRecord } from '../shared/types'

const PREVIEW_MAX = 140

/** Shown in the card: anything still running, or a command that ran detached. */
export function jobVisible(job: JobRecord): boolean {
  return job.status === 'running' || job.background === true
}

export function visibleJobs(jobs: readonly JobRecord[]): JobRecord[] {
  const out = jobs.filter(jobVisible)
  out.sort((a, b) => {
    const ar = a.status === 'running' ? 0 : 1
    const br = b.status === 'running' ? 0 : 1
    if (ar !== br) return ar - br
    return ar === 0 ? b.start - a.start : (b.end ?? b.start) - (a.end ?? a.start)
  })
  return out
}

export function jobRunningOf(jobs: readonly JobRecord[]): number {
  let n = 0
  for (const job of jobs) if (job.status === 'running') n++
  return n
}

export function jobDurationOf(job: JobRecord, now: number): number {
  const end = job.end ?? now
  return Math.max(0, end - job.start)
}

export function jobPreviewOf(job: JobRecord): string {
  const first = job.label?.split('\n')[0]?.trim()
  if (first !== undefined && first !== '') {
    return first.length > PREVIEW_MAX ? first.slice(0, PREVIEW_MAX) + '…' : first
  }
  return job.kind
}