import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTimeline, createTimelineState, DEFAULT_BOUNDS, createContextTimelineDefinition } from '../lib/index.js';

const BASE = Date.UTC(2026, 10, 23, 9, 0, 0);

const settled = (seq, id, stopReason) => ({
  type: 'user/message',
  seq,
  time: BASE + seq * 1000,
  data: {
    role: 'user',
    content: [{ type: 'text', text: 'Background subagent ' + id + ' stopped.' }],
    source: {
      kind: 'subagent-settled',
      form: 'notice',
      summary: 'Background subagent ' + id + ' stopped.',
      stopReason,
      senderSessionId: id,
    },
  },
});

test('a subagent that settled with an error is reported as failed', () => {
  let state = createTimelineState();
  state = applyTimeline(state, settled(1, 'agent-failed', 'error'), DEFAULT_BOUNDS);
  assert.deepEqual(state.failedAgents, { 'agent-failed': true });
  assert.ok(state.surface.length > 0, 'the notice still lands on the surface');
});

test('a subagent that completed normally is not reported as failed', () => {
  let state = createTimelineState();
  state = applyTimeline(state, settled(1, 'agent-done', 'completed'), DEFAULT_BOUNDS);
  assert.equal(state.failedAgents, undefined);
});

test('only the errored subagent is flagged', () => {
  let state = createTimelineState();
  state = applyTimeline(state, settled(1, 'agent-a', 'completed'), DEFAULT_BOUNDS);
  state = applyTimeline(state, settled(2, 'agent-b', 'error'), DEFAULT_BOUNDS);
  assert.deepEqual(state.failedAgents, { 'agent-b': true });
});

test('history wire views accept failure markers without relaxing the strict schema', () => {
  for (const slim of [true, false]) {
    const definition = createContextTimelineDefinition({}, () => slim);
    const initial = definition.init({}, 0);
    const normal = definition.apply(initial, settled(1, 'agent-done', 'completed'));
    const failed = definition.apply(normal, settled(2, 'agent-failed', 'error'));
    const { view, viewSchema } = definition.wire;
    assert.equal(viewSchema.parse(view(normal)).failedAgents, undefined);
    const packet = view(failed);
    assert.deepEqual(viewSchema.parse(packet).failedAgents, { 'agent-failed': true });
    assert.equal(viewSchema.safeParse({ ...packet, failedAgents: ['agent-failed'] }).success, false);
    assert.equal(viewSchema.safeParse({ ...packet, unexpected: true }).success, false);
  }
});