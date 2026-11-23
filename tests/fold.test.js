import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTimeline, createTimelineState, DEFAULT_BOUNDS } from '../lib/index.js';

const event = (type, seq, data) => ({ type, seq, time: seq * 1000, data });

/**
 * A fork replays its parent's log before `session/end-seed`. The cost, the
 * counts, the timing and the request list all describe the parent's work, so
 * the panel must not bill the fork for them; the overview aggregate already
 * dropped the day buckets at this event.
 */
test('a seeded replay drops the inherited counts, timing and requests', () => {
  const seeded = {
    ...createTimelineState(),
    totals: { turns: 57, steps: 888, lastTurn: 57, skills: {} },
    timing: { wallMs: 900_000, ttftMs: 400, genMs: 800_000, calls: 57, toolsMs: 0, toolBusyMs: 0, toolCalls: 0, tools: {} },
    requests: [{ step: 1 }],
    turnRuns: 57,
    spans: [{ kind: 'turn', start: 0, end: 900_000 }],
    cost: { deepseek: { chat: { peak: { uncached: 1, cacheRead: 0, cacheWrite: 0, output: 1 } } } },
  };
  const after = applyTimeline(seeded, event('session/end-seed', 1, { inherited: true }), DEFAULT_BOUNDS);
  assert.equal(after.totals, undefined);
  assert.equal(after.timing, undefined);
  assert.deepEqual(after.requests, []);
  assert.equal(after.turnRuns, 0);
  assert.deepEqual(after.spans, []);
  assert.deepEqual(after.cost, {});
});

test('an ordinary session-end seed keeps its own counts', () => {
  const own = { ...createTimelineState(), totals: { turns: 2, steps: 3, lastTurn: 2, skills: {} } };
  const after = applyTimeline(own, event('session/end-seed', 1, { inherited: false }), DEFAULT_BOUNDS);
  assert.equal(after.totals.turns, 2);
});