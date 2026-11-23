import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTimeline, createTimelineState, DEFAULT_BOUNDS } from '../lib/index.js';

const event = (type, seq, data) => ({ type, seq, time: seq * 1000, data });
const foldAll = events => events.reduce((state, ev) => applyTimeline(state, ev, DEFAULT_BOUNDS), createTimelineState());

const bashCall = (seq, args) => event('tool/call', seq, {
  turn: 1, step: 1, callId: 'call-1', name: 'bash', arguments: JSON.stringify(args),
});

const registered = (seq, extra = {}) => event('job/registered', seq, {
  jobId: 'bash-1', kind: 'bash', label: 'echo hi', startedAt: 2000,
  toolCall: { callId: 'call-1', rootCallId: 'root-1' }, ...extra,
});

const settled = (seq, extra = {}) => event('job/settled', seq, {
  jobId: 'bash-1', finishedAt: 3500, status: 'completed', detail: 'exit code: 0', cause: 'producer',
  toolCall: { callId: 'call-1', rootCallId: 'root-1' }, ...extra,
});

function result(seq, text) {
  return event('tool/result', seq, {
    message: {
      role: 'tool', toolCallId: 'call-1', id: 'msg-1', isError: false,
      source: { kind: 'tool', callId: 'call-1' },
      content: [{ type: 'text', text }],
    },
    sourceEventSeqs: [1],
  });
}

test('a job registers as running and settles with its detail', () => {
  const state = foldAll([bashCall(1, { command: 'echo hi' }), registered(2), settled(3)]);
  assert.equal(state.jobs.length, 1);
  const job = state.jobs[0];
  assert.equal(job.id, 'bash-1');
  assert.equal(job.status, 'completed');
  assert.equal(job.start, 2000);
  assert.equal(job.end, 3500);
  assert.equal(job.detail, 'exit code: 0');
  assert.equal(job.label, 'echo hi');
  assert.equal(job.call, 'call-1');
});

test('run_in_background marks the job as a background job', () => {
  const state = foldAll([
    bashCall(1, { command: 'npm run dev', run_in_background: true }),
    registered(2, { label: 'npm run dev' }),
    settled(3),
  ]);
  assert.equal(state.jobs[0].background, true);
});

test('a result that comes back while the job still runs marks it detached', () => {
  const state = foldAll([
    bashCall(1, { command: 'sleep 60' }),
    registered(2, { label: 'sleep 60' }),
    result(3, 'started background job bash-1'),
  ]);
  const job = state.jobs[0];
  assert.equal(job.status, 'running');
  assert.equal(job.returned, true);
  assert.equal(job.background, true);
});

test('a foreground job that settles before its result stays plain', () => {
  const state = foldAll([
    bashCall(1, { command: 'echo hi' }),
    registered(2),
    settled(3),
    result(4, 'hi'),
  ]);
  const job = state.jobs[0];
  assert.equal(job.background, undefined);
  assert.equal(job.returned, undefined);
});

test('a settle without a registration does not invent a job', () => {
  const state = foldAll([bashCall(1, { command: 'echo hi' }), settled(3)]);
  assert.equal(state.jobs.length, 0);
});

test('a zsh command is tracked like bash and carries its background flag', () => {
  const state = foldAll([
    event('tool/call', 1, { turn: 1, step: 1, callId: 'call-z', name: 'zsh', arguments: JSON.stringify({ command: 'npm run dev', run_in_background: true }) }),
    event('job/registered', 2, { jobId: 'bash-z', kind: 'bash', label: 'npm run dev', startedAt: 2000, toolCall: { callId: 'call-z' } }),
    event('job/settled', 3, { jobId: 'bash-z', finishedAt: 4000, status: 'completed', detail: 'exit code: 0', toolCall: { callId: 'call-z' } }),
  ]);
  assert.equal(state.commands.length, 1);
  assert.equal(state.commands[0].tool, 'zsh');
  assert.equal(state.jobs[0].background, true);
});

test('a background job registered while its command is still buffered keeps the flag', () => {
  const state = foldAll([
    event('tool/call', 1, { turn: 1, step: 1, callId: 'root-1', name: 'run_code', arguments: JSON.stringify({ code: 'await tools.zsh({ run_in_background: true })' }) }),
    event('tool/ptc-dispatch-start', 2, {
      rootCallId: 'root-1', parentCallId: 'root-1', subCallId: 'root-1:ptc:1', name: 'zsh',
      arguments: { command: 'sleep 60', run_in_background: true },
    }),
    event('job/registered', 3, { jobId: 'bash-buffered', kind: 'bash', label: 'sleep 60', startedAt: 2000, toolCall: { callId: 'root-1:ptc:1' } }),
  ]);
  assert.equal(state.jobs.length, 1);
  assert.equal(state.jobs[0].background, true);
  assert.equal(state.jobs[0].status, 'running');
});

test('the same job registered twice keeps a single row', () => {
  const state = foldAll([bashCall(1, { command: 'echo hi' }), registered(2), registered(3)]);
  assert.equal(state.jobs.length, 1);
  assert.equal(state.jobs[0].seq, 2);
});
