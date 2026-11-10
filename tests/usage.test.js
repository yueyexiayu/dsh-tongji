import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUsage, createUsageCollector } from '../lib/usage.js';
import { apply } from '../lib/index.js';

const start = turn => ({ type: 'turn/start', data: { turn } });
const end = turn => ({ type: 'turn/end', data: { turn } });
const child = (childId, mode = 'continuable') => ({ type: 'subagent/catalog', data: { childId, mode } });
const message = (turn, step, input, output, read = 0) => ({
  type: 'assistant/message', data: { turn, step, usage: { inputTokens: input, outputTokens: output, cacheReadTokens: read } },
});
const attempt = (turn, step, input, output) => ({
  type: 'assistant/attempt', data: { turn, step, stream: [{ type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: input, outputTokens: output } } }] },
});
const retry = (turn, step) => ({ type: 'llm/retry-started', data: { turn, step } });

test('counts retries and descendants once, excludes inherited history and assigns descendants to creation turn', async () => {
  const logs = {
    root: { inheritedEventCount: 0, events: [start(1), attempt(1, 1, 10, 2), retry(1, 1), message(1, 1, 20, 3, 5), child('a'), end(1), start(2), message(2, 1, 8, 1), end(2)] },
    a: { inheritedEventCount: 1, events: [message(1, 1, 999, 999), start(1), message(1, 1, 7, 4), child('b'), end(1), start(2), message(2, 1, 9, 2), end(2)] },
    b: { inheritedEventCount: 0, events: [start(1), message(1, 1, 3, 1), end(1)] },
  };
  const result = await collectUsage('root', async id => logs[id]);
  assert.deepEqual(result.turns['1'], { input: 49, output: 12, read: 5, write: 0, samples: 5, unknown: 0, cacheInput: 44, cacheSamples: 4, cacheMissing: 1 });
  assert.deepEqual(result.turns['2'], { input: 8, output: 1, read: 0, write: 0, samples: 1, unknown: 0, cacheInput: 8, cacheSamples: 1, cacheMissing: 0 });
  assert.deepEqual(result.total, { input: 57, output: 13, read: 5, write: 0, samples: 6, unknown: 0, cacheInput: 52, cacheSamples: 5, cacheMissing: 1 });
});

test('replaces duplicate settlement and reports unavailable or unattributable usage', async () => {
  const root = { inheritedEventCount: 0, events: [start(1), attempt(1, 1, 4, 1), message(1, 1, 5, 2), child('external', 'external'), child('missing'), end(1), child('late')] };
  const late = { inheritedEventCount: 0, events: [message(1, 1, 6, 3)] };
  const result = await collectUsage('root', async id => { if (id === 'root') return root; if (id === 'late') return late; throw new Error('unavailable'); });
  assert.deepEqual(result.turns['1'], { input: 5, output: 2, read: 0, write: 0, samples: 1, unknown: 2, cacheInput: 5, cacheSamples: 1, cacheMissing: 0 });
  assert.deepEqual(result.turns.unassigned, { input: 6, output: 3, read: 0, write: 0, samples: 1, unknown: 0, cacheInput: 6, cacheSamples: 1, cacheMissing: 0 });
  assert.equal(result.total.unknown, 2);
  assert.equal(result.total.input, 11);
});

test('does not discover fork-inherited children or treat missing usage as zero', async () => {
  const events = [start(1), child('inherited'), message(1, 1, 4, 2), end(1), start(2),
    { type: 'assistant/message', data: { turn: 2, step: 1 } }, end(2)];
  const seen = [];
  const result = await collectUsage('root', async id => { seen.push(id); return { inheritedEventCount: 4, events }; });
  assert.deepEqual(seen, ['root']);
  assert.equal(result.turns['1'].input, 4);
  assert.equal(result.turns['2'].unknown, 1);
  assert.equal(result.turns['2'].samples, 0);
});

test('Host endpoint returns aggregate and disposes its session observation', async () => {
  let route;
  let disposed = false;
  apply({ connection: { fetch: { register(value) { route = value; } } }, sessionQuery: {
    async observeSession(id, options) {
      assert.equal(id, 'root');
      assert.equal(options.projectionMode, 'none');
      return { inheritedEventCount: 0, events: [start(1), message(1, 1, 12, 3), end(1)], [Symbol.dispose]() { disposed = true; } };
    },
  } });
  const response = await route.fetch(new Request('http://localhost/api/tongji/usage?sessionId=root'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).total.output, 3);
  assert.equal(disposed, true);
});

test('Host endpoint returns stable error codes and logs failures', async () => {
  let route, warnings = 0;
  const missing = Object.assign(new Error('missing session'), { code: 'SESSION_QUERY_SESSION_NOT_FOUND' });
  apply({ connection: { fetch: { register(value) { route = value; } } }, logger: { warn() { warnings++; } }, sessionQuery: {
    async observeSession() { throw missing; },
  } });
  const response = await route.fetch(new Request('http://localhost/api/tongji/usage?sessionId=missing'));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: { code: 'session-not-found', message: '会话不存在', retryable: true } });
  assert.equal(warnings, 1);

  const missingId = await route.fetch(new Request('http://localhost/api/tongji/usage'));
  assert.equal(missingId.status, 400);
  assert.deepEqual(await missingId.json(), { error: { code: 'invalid-session-id', message: '缺少 sessionId', retryable: false } });
});

test('cache hit uses only samples that reported cache-read usage, including descendants', async () => {
  const records = {
    root: { inheritedEventCount: 0, events: [start(1), message(1, 1, 80, 2, 20), { type: 'assistant/message', data: { turn: 1, step: 2, usage: { inputTokens: 900, outputTokens: 3 } } }, child('a'), end(1)] },
    a: { inheritedEventCount: 0, events: [message(1, 1, 30, 4, 70)] },
  };
  const result = await collectUsage('root', async id => records[id]);
  assert.equal(result.total.input + result.total.read + result.total.write, 1100);
  assert.equal(result.total.cacheInput, 200);
  assert.equal(result.total.cacheSamples, 2);
  assert.equal(result.total.cacheMissing, 1);
  assert.equal(result.total.read, 90);
  assert.equal(result.turns['1'].cacheInput, 200);
});

test('incremental cache appends only unseen events and refreshes descendant work', async () => {
  const root = { inheritedEventCount: 0, events: [start(1), message(1, 1, 10, 2), child('a'), end(1)] };
  const descendant = { inheritedEventCount: 0, events: [start(1), message(1, 1, 5, 1), end(1)] };
  const reads = [];
  let folds = 0;
  const collector = createUsageCollector(async id => {
    reads.push(id);
    return id === 'root' ? root : descendant;
  });
  const first = await collector.collect('root');
  folds = reads.length;
  root.events = [...root.events, start(2), message(2, 1, 20, 3), end(2)];
  descendant.events = [...descendant.events, start(2), message(2, 1, 7, 2), end(2)];
  const second = await collector.collect('root');
  assert.equal(reads.length, folds + 2);
  assert.equal(first.turns['1'].input, 15);
  assert.equal(second.turns['1'].input, 22);
  assert.equal(second.turns['2'].input, 20);
  assert.equal(second.total.input, 42);
  assert.equal(second.turns['2'].unknown, 0);
});

test('bounded child reads start concurrently without exceeding the configured limit', async () => {
  let active = 0;
  let peak = 0;
  const events = [start(1), ...Array.from({ length: 11 }, (_, index) => child('c' + index)), end(1)];
  const logs = { root: { inheritedEventCount: 0, events } };
  for (let i = 0; i < 11; i++) logs['c' + i] = { inheritedEventCount: 0, events: [message(1, 1, 1, 1)] };
  const collector = createUsageCollector(async id => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    return logs[id];
  }, { concurrency: 3 });
  const result = await collector.collect('root');
  assert.equal(peak, 3);
  assert.equal(result.total.input, 11);
});

test('invalid usage values become unknown instead of poisoning totals', async () => {
  const logs = { root: { inheritedEventCount: 0, events: [
    start(1),
    { type: 'assistant/message', data: { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: -5, cacheWriteTokens: '3' } } },
    { type: 'assistant/message', data: { turn: 1, step: 2, usage: { inputTokens: 4.5, outputTokens: 1 } } },
    message(1, 3, 6, 2, 1),
    end(1),
  ] } };
  const result = await collectUsage('root', async id => logs[id]);
  assert.deepEqual(result.total, { input: 6, output: 2, read: 1, write: 0, samples: 1, unknown: 2, cacheInput: 7, cacheSamples: 1, cacheMissing: 0 });
});

test('cancellation interrupts collection before cached totals are committed', async () => {
  const controller = new AbortController();
  const events = [start(1), message(1, 1, 5, 1), end(1)];
  let first = true;
  const collector = createUsageCollector(async () => {
    if (first) { first = false; controller.abort(new Error('stop')); }
    return { inheritedEventCount: 0, events };
  }, { signalCheckInterval: 1 });
  await assert.rejects(collector.collect('root', controller.signal), /stop/);
  const result = await collector.collect('root');
  assert.equal(result.total.input, 5);
});
