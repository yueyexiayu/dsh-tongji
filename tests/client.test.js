import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');

function harness(fetcher, running = false) {
  let plugin, pane, cursor = 0, tree, dirty = true;
  const state = [], effects = [], timers = [];
  const React = {
    createElement(type, props, ...children) { return { type, props: { ...props, children: children.flat() } }; },
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; dirty = true; }]; },
    useRef(initial) { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useEffect(fn, deps) { const i = cursor++; const old = state[i]; if (!old || deps.some((x, j) => x !== old.deps[j])) effects.push(() => { old?.cleanup?.(); state[i] = { deps, cleanup: fn() }; }); },
  };
  const document = { getElementById: () => ({}), head: { appendChild() {} }, createElement: () => ({}) };
  vm.runInNewContext(code, { window: { __ModuleLoader__: { load(spec) { plugin = spec.factory(() => React); } } }, document, AbortController, URLSearchParams,
    fetch: fetcher, setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; }, clearTimeout(timer) { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); } });
  plugin.apply({ effect(fn) { fn(); }, sidebarRightTabs: { register() {} }, slots: { inject(_name, fn) { fn(); }, register(spec, component) { if (spec.key === 'tongji' && spec.name === 'sidebar.right.pane.tab') pane = component; } } });
  const props = { sessionId: 'root', useStats: () => ({ turns: [{ turn: 1, running, steps: [] }] }), useSession: () => ({ hasMore: false }), useProjection: () => ({ turns: 1, steps: 1, decodeMs: 1000, decodeTokens: 5 }) };
  function render() { dirty = false; cursor = 0; tree = pane(props); while (effects.length) effects.shift()(); }
  function nodes(node = tree) { return node && typeof node === 'object' ? [node, ...(node.props?.children || []).flatMap(nodes)] : []; }
  function text(node = tree) { return node && typeof node === 'object' ? (node.props?.children || []).map(text).join('') : String(node ?? ''); }
  async function settle() { for (let i = 0; i < 6; i++) { if (dirty) render(); await new Promise(resolve => setImmediate(resolve)); } if (dirty) render(); }
  return { settle, text, timers, button(name) { return nodes().find(x => x.type === 'button' && text(x) === name); }, card() { return nodes().find(x => typeof x.type === 'function' && x.type.name === 'TotalCard'); } };
}

test('read failure is visible, retry recovers, and a later failure preserves stale values', async () => {
  let calls = 0;
  const app = harness(async () => { calls++; if (calls !== 2) return { ok: false }; return { ok: true, json: async () => ({ total: { input: 100, output: 3, read: 20, write: 0, samples: 1, unknown: 0, cacheInput: 120, cacheSamples: 1, cacheMissing: 0 }, turns: {} }) }; });
  await app.settle(); assert.match(app.text(), /统计读取失败/); assert.equal(app.timers[0].ms, 30000);
  app.button('重试').props.onClick(); await app.settle(); assert.match(app.text(), /已更新/); assert.equal(app.card().props.usage.input, 100);
  const timer = app.timers.shift(); timer.fn(); await app.settle();
  assert.match(app.text(), /当前显示上次成功的数据/); assert.equal(app.card().props.usage.input, 100);
});

test('active turns refresh every five seconds and idle turns every thirty seconds', async () => {
  const app = harness(async () => ({ ok: false }), true);
  await app.settle(); assert.equal(app.timers[0].ms, 5000);
});

test('cache percentage distinguishes missing and partial samples', () => {
  const start = code.indexOf('    function isNumber('), end = code.indexOf('    function Metric(', start);
  const context = vm.createContext({}); vm.runInContext(code.slice(start, end), context);
  assert.equal(context.usageHit({ read: 0, cacheInput: 0, cacheSamples: 0, cacheMissing: 1 }), '—');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'context'), '0.10K+');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'output'), '0.00K');
  assert.equal(context.usageHit({ read: 90, cacheInput: 200, cacheSamples: 2, cacheMissing: 1, unknown: 0 }), '45.00%（部分）');
  assert.equal(context.usageHit({ read: 0, cacheInput: 100, cacheSamples: 1, cacheMissing: 0, unknown: 0 }), '0.00%');
});
