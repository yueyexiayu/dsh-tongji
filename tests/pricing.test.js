import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  billedTokensOf,
  calculateSessionCost,
  createCostSource,
  estimateSessionCost,
  mergeCostUsage,
  priceLookupsOf,
  priceOf,
  pricesBookOf,
  toCurrency,
} from '../lib/index.js';

/**
 * Fixed price book in the models.dev shape `pricesBookOf` consumes: cache_read /
 * cache_write fall back to `input` when the provider does not quote them, which
 * is exactly what the DeepSeek `r1` entry below exercises.
 */
const SHAPE = {
  deepseek: {
    models: {
      'deepseek-v3': { cost: { input: 0.28, output: 1.1, cache_read: 0.07, cache_write: 0.28 } },
      'deepseek-r1': { cost: { input: 0.5, output: 2 } },
    },
  },
  moonshot: {
    models: {
      'kimi-k2': { cost: { input: 0.6, output: 2.5 } },
    },
  },
};

const book = () => pricesBookOf(SHAPE);

const bucket = (uncached = 0, cacheRead = 0, cacheWrite = 0, output = 0) => ({
  uncached, cacheRead, cacheWrite, output,
});

const usageOf = (provider, model, periods) => ({ [provider]: { [model]: periods } });

const close = (actual, expected, message, eps = 1e-9) => {
  assert.ok(typeof actual === 'number' && Math.abs(actual - expected) <= eps, `${message}: ${actual} != ${expected}`);
};

const FACTORY = { ensure() {}, book: () => null, pricesVersion: () => 0, currentVersion: () => undefined, dispose() {} };

test('pricesBookOf keeps quoted rates and falls back to input for missing cache rates', () => {
  const prices = book();
  assert.deepEqual(priceOf(prices, 'deepseek', 'deepseek-v3'), { hit: 0.07, miss: 0.28, write: 0.28, out: 1.1 });
  assert.deepEqual(priceOf(prices, 'deepseek', 'deepseek-r1'), { hit: 0.5, miss: 0.5, write: 0.5, out: 2 });
});

test('model lookup ignores case and gateway prefixes but never invents a missing entry', () => {
  const prices = book();
  assert.deepEqual(priceOf(prices, 'deepseek', 'DeepSeek-V3'), priceOf(prices, 'deepseek', 'deepseek-v3'));
  assert.equal(priceOf(prices, 'deepseek', 'deepseek-v3-free'), null);
  assert.equal(priceOf(prices, 'unknown-provider', 'deepseek-v3'), priceOf(prices, 'deepseek', 'deepseek-v3'));
});

test('a whole priced step multiplies each bucket by its own rate per million tokens', () => {
  const usage = usageOf('deepseek', 'deepseek-v3', { off: bucket(1_000_000, 1_000_000, 1_000_000, 1_000_000) });
  close(calculateSessionCost(usage, book()), 0.28 + 0.07 + 0.28 + 1.1, 'four buckets');
});

test('DeepSeek bills the peak window at twice the rate and others stay flat', () => {
  const peak = usageOf('deepseek', 'deepseek-v3', { peak: bucket(1_000_000) });
  const off = usageOf('deepseek', 'deepseek-v3', { off: bucket(1_000_000) });
  close(calculateSessionCost(peak, book()), 0.56, 'peak doubles 0.28');
  close(calculateSessionCost(off, book()), 0.28, 'off keeps 0.28');
  const other = usageOf('moonshot', 'kimi-k2', { peak: bucket(500_000, 0, 0, 200_000) });
  close(calculateSessionCost(other, book()), 0.3 + 0.5, 'moonshot has no peak factor');
});

test('an unknown model contributes nothing while known models still count', () => {
  const usage = mergeCostUsage(
    usageOf('deepseek', 'deepseek-v3', { off: bucket(1_000_000) }),
    usageOf('deepseek', 'deepseek-v9-unreleased', { off: bucket(9_000_000) }),
  );
  close(calculateSessionCost(usage, book()), 0.28, 'only the known model bills');
});

test('missing usage, missing book and empty usage are unknown, not zero', () => {
  assert.equal(calculateSessionCost(null, book()), null);
  assert.equal(calculateSessionCost(usageOf('deepseek', 'deepseek-v3', { off: bucket(1) }), null), null);
  assert.equal(calculateSessionCost({}, book()), null);
  assert.equal(estimateSessionCost(null, book(), 'usd'), null);
});

test('currency conversion divides USD by the fixed CNY rate', () => {
  const usage = usageOf('moonshot', 'kimi-k2', { off: bucket(500_000, 0, 0, 200_000) });
  const usd = calculateSessionCost(usage, book());
  close(usd, 0.8, 'usd subtotal');
  close(toCurrency(usd, 'usd'), 0.8, 'usd passthrough');
  close(toCurrency(usd, 'cny'), 0.8 / 0.15, 'cny conversion');
  close(estimateSessionCost(usage, book(), 'cny'), 0.8 / 0.15, 'estimate honours currency');
});

test('mergeCostUsage adds every bucket and billedTokensOf counts all four', () => {
  const merged = mergeCostUsage(
    usageOf('deepseek', 'deepseek-v3', { off: bucket(10, 1, 2, 3) }),
    usageOf('deepseek', 'deepseek-v3', { off: bucket(5, 4, 6, 7) }),
  );
  assert.deepEqual(merged.deepseek['deepseek-v3'].off, bucket(15, 5, 8, 10));
  assert.equal(billedTokensOf(merged), 38);
  assert.equal(billedTokensOf(null), 0);
  assert.equal(mergeCostUsage(null, undefined), null);
});

test('price lookups report which models resolved and why the rest did not', () => {
  const usage = mergeCostUsage(
    usageOf('deepseek', 'deepseek-v3', { off: bucket(1) }),
    usageOf('deepseek', 'deepseek-v9-unreleased', { off: bucket(1) }),
  );
  const lookups = priceLookupsOf(usage, book());
  assert.equal(lookups.length, 2);
  const priced = lookups.find(lookup => lookup.model === 'deepseek-v3');
  assert.equal(priced.face.via, 'direct');
  assert.equal(priced.face.confidence, 'high');
  const missing = lookups.find(lookup => lookup.model === 'deepseek-v9-unreleased');
  assert.equal(missing.face, null);
  assert.equal(missing.miss.reason, 'model-unknown');
  assert.deepEqual(priceLookupsOf(usage, null), []);
});

test('the cost source reports readiness, faces and incompleteness without inventing a total', () => {
  const usage = mergeCostUsage(
    usageOf('deepseek', 'deepseek-v3', { off: bucket(1_000_000) }),
    usageOf('deepseek', 'deepseek-v9-unreleased', { off: bucket(1) }),
  );
  const ready = createCostSource({ ...FACTORY, book: () => book(), pricesVersion: () => 7 });
  const read = ready.read(usage);
  close(read.usd, 0.28, 'usd from the priced model');
  assert.equal(read.ready, true);
  assert.equal(read.faces.length, 1);
  assert.equal(read.misses.length, 1);
  assert.equal(ready.complete(usage), false);
  assert.equal(ready.complete(usageOf('deepseek', 'deepseek-v3', { off: bucket(1_000_000) })), true);
  assert.equal(ready.version(), 7);

  const cold = createCostSource(FACTORY);
  assert.deepEqual(cold.read(usage), { usd: null, ready: false });
  assert.equal(cold.usd(usage), null);
  assert.equal(cold.ready(), false);
});
