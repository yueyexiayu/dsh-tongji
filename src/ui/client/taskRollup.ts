/**
 * Roll a set of tasks up to the one status a card badge can carry.
 *
 * The agent graph labels each owner with a single state, so the rule has to pick
 * a winner: work in flight is what a reader is waiting on, queued work is next,
 * and "done" only wins when nothing at all is left. This module imports nothing,
 * so it can be loaded directly by a test without a bundler.
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface TaskStatusRollup {
  total: number
  counts: Record<TaskStatus, number>
  /** The status worth labelling the owner with, or null when there is no work at all. */
  headline: TaskStatus | null
}

export function rollupTaskStatuses(tasks: readonly { status: TaskStatus }[]): TaskStatusRollup {
  const counts: Record<TaskStatus, number> = { pending: 0, in_progress: 0, completed: 0 }
  for (const task of tasks) counts[task.status]++
  const headline = counts.in_progress > 0
    ? 'in_progress'
    : counts.pending > 0 ? 'pending' : counts.completed > 0 ? 'completed' : null
  return { total: tasks.length, counts, headline }
}
