import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyActivity,
  applyTimeline,
  createActivityState,
  createTimelineState,
  DEFAULT_BOUNDS,
} from '../lib/index.js';

const BASE = Date.UTC(2026, 10, 23, 4, 0, 0);

const message = (seq, turn, step, input, output) => ({
  type: 'assistant/message',
  seq,
  time: BASE + seq * 1000,
  data: {
    turn,
    step,
    message: { role: 'assistant', content: [{ type: 'text', text: 'reply ' + seq }] },
    usage: { inputTokens: input, outputTokens: output },
  },
});

/**
 * A fork's first `inheritedEventCount` events are its parent's log. The model
 * really saw them, so they stay on the surface, but the fork must not be
 * billed for the parent's turns, steps or requests.
 */
test('the inherited prefix is surfaced but never billed', () => {
  const cut = 2;
  let state = createTimelineState(cut);
  state = applyTimeline(state, message(1, 1, 1, 10, 5), DEFAULT_BOUNDS);
  state = applyTimeline(state, message(2, 1, 2, 10, 5), DEFAULT_BOUNDS);
  assert.equal(state.seedCut, cut);
  assert.equal(state.requests.length, 0);
  assert.equal(state.totals.steps, 0);
  assert.equal(state.totals.turns, 0);
  assert.equal(state.timing, undefined);
  assert.ok(state.surface.length > 0, 'inherited messages stay on the surface');

  state = applyTimeline(state, message(3, 2, 1, 20, 7), DEFAULT_BOUNDS);
  assert.equal(state.requests.length, 1, 'own requests are billed');
  assert.equal(state.totals.steps, 1);
  assert.equal(state.totals.turns, 1);
  assert.ok(state.timing !== undefined);
});

test('a zero cut bills every event', () => {
  let state = createTimelineState(0);
  state = applyTimeline(state, message(1, 1, 1, 10, 5), DEFAULT_BOUNDS);
  assert.equal(state.seedCut, undefined);
  assert.equal(state.requests.length, 1);
  assert.equal(state.totals.steps, 1);
});

test('the inherited prefix adds no day buckets', () => {
  let state = createActivityState(2);
  state = applyActivity(state, message(1, 1, 1, 10, 5));
  state = applyActivity(state, message(2, 1, 2, 10, 5));
  assert.deepEqual(state.days, {}, 'the parent already booked these tokens');

  state = applyActivity(state, message(3, 2, 1, 20, 7));
  const days = Object.keys(state.days);
  assert.equal(days.length, 1);
  assert.equal(state.days[days[0]].requests, 1);
});