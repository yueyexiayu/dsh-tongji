import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');

function makeLocale(initial = 'zh') {
  const dictionaries = new Map();
  let active = initial;
  return {
    register(ns, values) { dictionaries.set(ns, values); },
    bind(ns) {
      return (key, params) => {
        const template = dictionaries.get(ns)?.[active]?.[key] ?? dictionaries.get(ns)?.en?.[key] ?? key;
        return params ? template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match) : template;
      };
    },
    getSnapshot() { return { active, revision: 0 }; },
    subscribe() { return () => {}; },
  };
}

function harness(fetcher, running = false, options = {}) {
  let plugin, pane, cursor = 0, tree, dirty = true;
  const state = [], effects = [], timers = [];
  const locale = makeLocale(options.locale);
  let olderCalls = 0;
  const React = {
    createElement(type, props, ...children) { return { type, props: { ...props, children: children.flat() } }; },
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; dirty = true; }]; },
    useRef(initial) { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useEffect(fn, deps) { const i = cursor++; const old = state[i]; if (!old || deps.some((x, j) => x !== old.deps[j])) effects.push(() => { old?.cleanup?.(); state[i] = { deps, cleanup: fn() }; }); },
  };
  const document = { getElementById: () => ({}), head: { appendChild() {} }, createElement: () => ({}) };
  vm.runInNewContext(code, { window: { __ModuleLoader__: { load(spec) { plugin = spec.factory(() => React); } } }, document, AbortController, URLSearchParams,
    fetch: fetcher, setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; }, clearTimeout(timer) { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); } });
  plugin.apply({ effect(fn) { fn(); }, locale, sidebarRightTabs: { register() {} }, slots: { inject(_name, fn) { fn(); }, register(spec, component) { if (spec.key === 'tongji' && spec.name === 'sidebar.right.pane.tab') pane = component; } } });
  const props = {
    sessionId: 'root', t: locale.bind('tongji'), useLocale: selector => selector(locale.getSnapshot()),
    useStats: () => ({ turns: [{ turn: 1, running, steps: [] }] }),
    useSession: () => options.sessionSnapshot || { hasMore: false },
    useProjection: () => ({ turns: 1, steps: 1, decodeMs: 1000, decodeTokens: 5 }),
    loadOlder: () => { olderCalls++; return options.loadOlder ? options.loadOlder() : Promise.resolve(); },
  };
  function render() { dirty = false; cursor = 0; tree = pane(props); while (effects.length) effects.shift()(); }
  function nodes(node = tree) { return node && typeof node === 'object' ? [node, ...(node.props?.children || []).flatMap(nodes)] : []; }
  function text(node = tree) { return node && typeof node === 'object' ? (node.props?.children || []).map(text).join('') : String(node ?? ''); }
  async function settle() { for (let i = 0; i < 6; i++) { if (dirty) render(); await new Promise(resolve => setImmediate(resolve)); } if (dirty) render(); }
  return { settle, text, timers, nodes, button(name) { return nodes().find(x => x.type === 'button' && text(x) === name); }, card() { return nodes().find(x => typeof x.type === 'function' && x.type.name === 'TotalCard'); }, olderCalls: () => olderCalls };
}

test('read failure is visible, retry recovers token buckets, and a later failure preserves stale values', async () => {
  let calls = 0;
  const app = harness(async () => { calls++; if (calls !== 2) return { ok: false, json: async () => ({ error: { code: 'usage-unavailable' } }) }; return { ok: true, json: async () => ({ total: { input: 100, output: 3, read: 20, write: 0, samples: 1, unknown: 0, cacheInput: 120, cacheSamples: 1, cacheMissing: 0 }, turns: {} }) }; });
  await app.settle(); assert.match(app.text(), /统计读取失败/); assert.equal(app.timers[0].ms, 30000);
  assert.match(app.nodes().find(x => x.props?.className?.includes('sr-header-meta'))?.props.className, /sr-header-meta-failed/);
  app.button('重试').props.onClick(); await app.settle(); assert.match(app.text(), /已更新/); assert.equal(app.card().props.usage.input, 100);
  const card = app.card();
  const cardTree = card.type(card.props);
  const metrics = app.nodes(cardTree).filter(x => typeof x.type === 'function' && x.type.name === 'Metric');
  assert.equal(metrics.find(x => x.props.label === '未命中输入')?.props.value, '100');
  assert.equal(metrics.find(x => x.props.label === '缓存命中输入')?.props.value, '20');
  assert.equal(metrics.find(x => x.props.label === '累计输入')?.props.value, '120');
  assert.equal(metrics.find(x => x.props.label === '累计输出')?.props.value, '3');
  assert.equal(metrics.find(x => x.props.label === '累计总 Token')?.props.value, '123');
  assert.equal(app.nodes(cardTree).find(x => x.props?.title === '120')?.props.title, '120');
  assert.equal(app.nodes(cardTree).find(x => x.props?.title?.startsWith('缓存读取 20 / 输入总计 120'))?.props.title, '缓存读取 20 / 输入总计 120 · 命中率 16.67%');
  const timer = app.timers.shift(); timer.fn(); await app.settle();
  assert.match(app.text(), /当前显示上次成功的数据/); assert.equal(app.card().props.usage.input, 100);
});

test('active turns refresh every five seconds and idle turns every thirty seconds', async () => {
  const app = harness(async () => ({ ok: false }), true);
  await app.settle(); assert.equal(app.timers[0].ms, 5000);
});

test('token buckets distinguish missing cache and total output', () => {
  const start = code.indexOf('    function isNumber('), end = code.indexOf('    function Metric(', start);
  const context = vm.createContext({}); vm.runInContext(code.slice(start, end), context);
  assert.equal(context.usageHit({ read: 0, cacheInput: 0, cacheSamples: 0, cacheMissing: 1 }, key => key === 'partial' ? '（部分）' : key), '—');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'uncachedInput'), '100');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'input'), '100+');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'output'), '2');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 0, write: 0, samples: 1, unknown: 0, cacheMissing: 1 }, 'total'), '102+');
  assert.equal(context.usageTokens({ input: 100, output: 2, read: 20, write: 3, samples: 1, unknown: 0, cacheMissing: 0 }, 'total'), '125');
  assert.equal(context.usageHit({ read: 90, cacheInput: 200, cacheSamples: 2, cacheMissing: 1, unknown: 0 }, key => key === 'partial' ? '（部分）' : key), '45.00%（部分）');
  assert.equal(context.usageHit({ read: 0, cacheInput: 100, cacheSamples: 1, cacheMissing: 0, unknown: 0 }, key => key), '0.00%');
});

test('opening the pane does not eagerly load all older turns', async () => {
  const app = harness(async () => ({ ok: false, json: async () => ({}) }), false, { sessionSnapshot: { hasMore: true, loadingOlder: false } });
  await app.settle();
  assert.equal(app.olderCalls(), 0);
  app.button('加载更早轮次').props.onClick();
  await app.settle();
  assert.equal(app.olderCalls(), 1);
});

test('English locale localizes the panel', async () => {
  const app = harness(async () => ({ ok: false, json: async () => ({}) }), false, { locale: 'en' });
  await app.settle();
  assert.match(app.text(), /Session statistics/);
  assert.match(app.text(), /Statistics could not be loaded/);
});

function autoOpenHarness(sessionId) {
  let plugin, component, inject, effect, opened = 0;
  const locale = makeLocale();
  const listeners = new Set(), mountListeners = new Set();
  let inventory = [], mounted = sessionId;
  const React = { createElement() {}, useEffect(fn) { effect = fn; } };
  const document = { getElementById: () => ({}), head: { appendChild() {} }, createElement: () => ({}) };
  vm.runInNewContext(code, { window: { __ModuleLoader__: { load(spec) { plugin = spec.factory(() => React); } } }, document });
  plugin.apply({ effect(fn) { fn(); }, locale, sidebarRightTabs: { register() {} }, sidebarRight: {
    openTabs: { getSnapshot: () => inventory, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } },
    mounted: { getSnapshot: () => mounted, subscribe(fn) { mountListeners.add(fn); return () => mountListeners.delete(fn); } },
    openTab() { opened++; },
  }, slots: { inject(_name, fn) { fn(); }, register(spec, view) {
    if (spec.id === 'tongji-open') { component = view; inject = spec.inject; }
  } } });
  component(inject(sessionId)); const dispose = effect();
  return { dispose, setTabs(tabs) { inventory = tabs; for (const fn of [...listeners]) fn(); },
    setMounted(value) { mounted = value; for (const fn of [...mountListeners]) fn(); }, opened: () => opened };
}

test('auto-open waits for layout adoption and preserves an existing browser tab', () => {
  const app = autoOpenHarness('browser-session');
  assert.equal(app.opened(), 0);
  app.setTabs([{ sessionId: 'browser-session', kind: 'browser' }]);
  assert.equal(app.opened(), 0);
  app.setTabs([{ sessionId: 'browser-session', kind: 'guide' }]);
  assert.equal(app.opened(), 0);
});

test('auto-open activates stats only for an adopted guide on the mounted session', () => {
  const app = autoOpenHarness('empty-session');
  app.setMounted('other-session');
  app.setTabs([{ sessionId: 'empty-session', kind: 'guide' }, { sessionId: 'other-session', kind: 'browser' }]);
  assert.equal(app.opened(), 0);
  app.setMounted('empty-session');
  assert.equal(app.opened(), 1);
  app.setTabs([{ sessionId: 'empty-session', kind: 'guide' }]);
  assert.equal(app.opened(), 1);
});

test('auto-open cancellation does not open a later adopted session', () => {
  const app = autoOpenHarness('cancelled-session');
  app.dispose();
  app.setTabs([{ sessionId: 'cancelled-session', kind: 'guide' }]);
  assert.equal(app.opened(), 0);
});
