/**
 * A card in the agent graph has room for one status badge, so the rollup rule
 * decides which status a reader sees. These cases pin that priority: running work
 * outranks queued work, queued work outranks finished work, and an owner with no
 * tasks gets no badge at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollupTaskStatuses } from '../src/ui/client/taskRollup.ts';

const task = status => ({ status });

test('an owner with no tasks gets no headline', () => {
  const rollup = rollupTaskStatuses([]);
  assert.equal(rollup.headline, null);
  assert.equal(rollup.total, 0);
  assert.deepEqual(rollup.counts, { pending: 0, in_progress: 0, completed: 0 });
});

test('finished work reads as done only when nothing is left', () => {
  assert.equal(rollupTaskStatuses([task('completed'), task('completed')]).headline, 'completed');
});

test('one queued task pulls the owner back to pending', () => {
  const rollup = rollupTaskStatuses([task('completed'), task('completed'), task('pending')]);
  assert.equal(rollup.headline, 'pending');
  assert.equal(rollup.total, 3);
});

test('running work outranks both the queue and the finished count', () => {
  const rollup = rollupTaskStatuses([task('completed'), task('pending'), task('in_progress')]);
  assert.equal(rollup.headline, 'in_progress');
  assert.deepEqual(rollup.counts, { pending: 1, in_progress: 1, completed: 1 });
});

test('counts stay additive for the tooltip breakdown', () => {
  const rollup = rollupTaskStatuses([
    task('in_progress'), task('in_progress'), task('pending'), task('completed'), task('completed'),
  ]);
  assert.equal(rollup.total, 5);
  assert.deepEqual(rollup.counts, { pending: 1, in_progress: 2, completed: 2 });
});
