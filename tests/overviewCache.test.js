import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverviewCache } from '../lib/index.js';

const PATH = '/fake/overview-cache.v1.json';

/** A cache filesystem that keeps the whole file in memory, so the test can inspect it. */
function memoryFs() {
  const files = new Map();
  return {
    files,
    stat: async path => {
      const body = files.get(path);
      if (body === undefined) throw new Error('ENOENT');
      return { size: Buffer.byteLength(body), mtimeMs: 1 };
    },
    readFile: async path => {
      const body = files.get(path);
      if (body === undefined) throw new Error('ENOENT');
      return body;
    },
    writeFile: async (path, body) => { files.set(path, body); },
    rename: async (from, to) => { files.set(to, files.get(from)); files.delete(from); },
    mkdir: async () => {},
    rm: async path => { files.delete(path); },
  };
}

const record = (id, updatedAt = 1, title = 'session ' + id) => ({
  session: { id, title, updatedAt, blank: false, signature: 'sig-' + id, timeline: null, activity: null },
  identity: null,
});

const savedIds = fs => JSON.parse(fs.files.get(PATH)).sessions.map(entry => entry.session.id).sort();

test('a single-record save keeps the records already on disk', async () => {
  const fs = memoryFs();
  const first = createOverviewCache({ path: PATH, fs, now: () => 1, debounceMs: 0 });
  first.save([record('a'), record('b'), record('c')]);
  await first.flush();
  assert.deepEqual(savedIds(fs), ['a', 'b', 'c']);
  first.dispose();

  // A restarted host runs the backfill worker first, and it reports one session.
  const restarted = createOverviewCache({ path: PATH, fs, now: () => 2, debounceMs: 0 });
  restarted.save([record('b', 9)]);
  await restarted.flush();
  assert.deepEqual(savedIds(fs), ['a', 'b', 'c'], 'one folded session must not shrink the cache');
  const saved = JSON.parse(fs.files.get(PATH)).sessions.find(entry => entry.session.id === 'b');
  assert.equal(saved.session.updatedAt, 9, 'the newer record wins');
  restarted.dispose();
});

test('a replace save may shrink the cache to the caller set', async () => {
  const fs = memoryFs();
  const cache = createOverviewCache({ path: PATH, fs, now: () => 1, debounceMs: 0 });
  cache.save([record('a'), record('b')]);
  await cache.flush();
  cache.save([record('b')], 'replace');
  await cache.flush();
  assert.deepEqual(savedIds(fs), ['b']);
  cache.dispose();
});

test('the entry bound keeps the most recently updated sessions', async () => {
  const fs = memoryFs();
  const cache = createOverviewCache({ path: PATH, fs, now: () => 1, debounceMs: 0, maxEntries: 3 });
  cache.save([record('a', 1), record('b', 2), record('c', 3), record('d', 4)]);
  await cache.flush();
  assert.deepEqual(savedIds(fs), ['b', 'c', 'd']);
  cache.dispose();
});

test('the byte bound trims the file even under the entry bound', async () => {
  const fs = memoryFs();
  const cache = createOverviewCache({ path: PATH, fs, now: () => 1, debounceMs: 0, maxEntries: 100, maxBytes: 4096 });
  const big = id => record(id, 1, 'x'.repeat(2000));
  cache.save([big('a'), big('b'), big('c'), big('d')]);
  await cache.flush();
  const body = fs.files.get(PATH);
  assert.ok(Buffer.byteLength(body) <= 4096, 'the file stays within its byte bound');
  assert.ok(savedIds(fs).length >= 1);
  cache.dispose();
});