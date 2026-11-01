import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUsage } from '../lib/usage.js';
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
  assert.deepEqual(result.turns['1'], { input: 49, output: 12, read: 5, write: 0, samples: 5, unknown: 0 });
  assert.deepEqual(result.turns['2'], { input: 8, output: 1, read: 0, write: 0, samples: 1, unknown: 0 });
  assert.deepEqual(result.total, { input: 57, output: 13, read: 5, write: 0, samples: 6, unknown: 0 });
});

test('replaces duplicate settlement and reports unavailable or unattributable usage', async () => {
  const root = { inheritedEventCount: 0, events: [start(1), attempt(1, 1, 4, 1), message(1, 1, 5, 2), child('external', 'external'), child('missing'), end(1), child('late')] };
  const late = { inheritedEventCount: 0, events: [message(1, 1, 6, 3)] };
  const result = await collectUsage('root', async id => { if (id === 'root') return root; if (id === 'late') return late; throw new Error('unavailable'); });
  assert.deepEqual(result.turns['1'], { input: 5, output: 2, read: 0, write: 0, samples: 1, unknown: 2 });
  assert.deepEqual(result.turns.unassigned, { input: 6, output: 3, read: 0, write: 0, samples: 1, unknown: 0 });
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
