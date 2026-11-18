/**
 * The client half is a browser bundle: it registers slots through
 * `window.__ModuleLoader__` and drives the panel through React hooks. These
 * tests exercise the built artifact — the same file the Desktop loads — instead
 * of the TypeScript sources, so the assertions cover what actually ships.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

/** The bundle is minified, so slice a function out by balancing its braces. */
function sliceFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `bundle no longer contains ${signature}`);
  let depth = 0;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced body for ${signature}`);
}

/** A hook harness: one state slot list, replayed in call order on every render. */
function createHarness() {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let dirty = false;
  let scheduled = false;
  const mark = () => {
    dirty = true;
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
    });
  };
  const set = index => value => {
    const previous = slots[index]();
    slots[index] = () => (typeof value === 'function' ? value(previous) : value);
    mark();
  };
  const React = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = () => (typeof initial === 'function' ? initial() : initial);
      return [slots[index](), set(index)];
    },
    useEffect(run, deps) {
      const index = cursor++;
      const previous = slots[index];
      const changed = previous === undefined || deps === undefined || deps.some((value, i) => value !== previous.deps[i]);
      if (!changed) return;
      effects.push(() => {
        previous?.cleanup?.();
        const cleanup = run();
        slots[index] = Object.assign(() => undefined, { deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined });
      });
    },
    useLayoutEffect(run, deps) {
      return React.useEffect(run, deps);
    },
    useMemo(compute) { return compute(); },
    useCallback(fn) { return fn; },
    useRef(value) { return { current: value }; },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
  };
  return {
    React,
    render(component, props) {
      cursor = 0;
      const tree = component(props);
      for (const effect of effects.splice(0)) effect();
      return tree;
    },
    get dirty() { return dirty; },
    async settle(component, props) {
      let tree = this.render(component, props);
      for (let round = 0; round < 8; round++) {
        await new Promise(resolve => setImmediate(resolve));
        if (!dirty) return tree;
        dirty = false;
        tree = this.render(component, props);
      }
      return tree;
    },
  };
}

/** The bundle passes a single child as often as an array, so normalise both. */
const childrenOf = node => {
  const children = node?.props?.children;
  if (children === undefined || children === null) return [];
  return Array.isArray(children) ? children : [children];
};

function collect(node, out = []) {
  if (node === null || typeof node !== 'object') return out;
  out.push(node);
  for (const child of childrenOf(node)) collect(child, out);
  return out;
}

const textOf = node => (node === null || typeof node !== 'object'
  ? String(node ?? '')
  : childrenOf(node).map(textOf).join(''));

/** The bundle resolves its runtime through the loader, so answer by module id. */
function runtimeModules(React) {
  const jsx = (type, props) => ({ type, props: { ...props, children: props?.children ?? [] } });
  const modules = {
    react: React,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-dom': { createPortal: value => value },
    '@deepseek-ai/dsh-client-ui-primitives': new Proxy({}, { get: () => () => null }),
  };
  return id => modules[id] ?? {};
}

/** Load the bundle and record everything it registers. */
function loadPlugin() {
  let plugin;
  const injected = [];
  const registered = [];
  const tabs = [];
  const cleanups = [];
  const view = {};

  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    createContext: () => ({}),
    Fragment: 'Fragment',
    Component: class { constructor(props) { this.props = props; } setState() {} render() { return null; } },
    memo: component => component,
    forwardRef: render => render,
    useId: () => ':r0:',
    useDebugValue() {},
    useContext: context => context?.value,
    useMemo: compute => compute(),
    useCallback: fn => fn,
    useReducer: reduce => [reduce(undefined, { type: '@@init' }), () => {}],
    useState: initial => [initial, () => {}],
    useRef: value => ({ current: value }),
    useEffect() {},
    useLayoutEffect() {},
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  const noop = () => {};
  const document = {
    getElementById: () => ({}),
    querySelector: () => null,
    head: { appendChild: noop },
    createElement: () => ({ dataset: {}, style: {}, setAttribute: noop }),
  };
  const sandbox = {
    window: { __ModuleLoader__: { load(spec) { plugin = spec.factory(runtimeModules(React)); } } },
    document,
    AbortController,
    URLSearchParams,
    fetch: async () => ({ ok: false, json: async () => null }),
    setInterval: () => 1,
    clearInterval: noop,
    setTimeout: () => 1,
    clearTimeout: noop,
    localStorage: { getItem: () => null, setItem: noop },
  };
  runInContext(code, createContext(sandbox));

  const ctx = {
    effect(run) { try { run(); } catch { /* optional services are absent in this fake */ } return noop; },
    inject(_names, run) { try { return run({ ...ctx, configForms: undefined, sessions: undefined }); } catch { return undefined; } },
    get() { return undefined; },
    whileServed: noop,
    locale: {
      bind: () => key => `t:${key}`,
      register() {},
      getSnapshot: () => ({ active: 'zh' }),
      subscribe: () => noop,
    },
    sidebarRightTabs: {
      register(spec) {
        tabs.push(spec);
        cleanups.push(noop);
        return noop;
      },
    },
    slots: {
      inject(_name, run) { injected.push(_name); try { run(); } catch { /* slot deps missing */ } },
      register(spec, component) {
        registered.push(spec);
        view[`${spec.name}:${spec.id ?? spec.key ?? ''}`] = component;
        return noop;
      },
    },
  };
  plugin.apply(ctx);
  return { plugin, injected, registered, tabs, view };
}

test('module declares its host contract and registers every slot once', () => {
  const { plugin, injected, registered, tabs } = loadPlugin();
  assert.equal(plugin.name, 'tongji');
  assert.deepEqual([...plugin.inject].sort(), ['locale', 'slots']);

  const names = registered.map(spec => spec.name);
  for (const expected of [
    'conversation.view',
    'conversation.chat.assistant-actions',
    'conversation.input.overlay',
    'sidebar.right.pane.tab',
    'sidebar.right.pane.tab.title',
    'main',
    'sidebar.panellist',
  ]) {
    assert.ok(names.includes(expected), `missing slot registration: ${expected}`);
  }
  assert.equal(new Set(registered.map(spec => `${spec.name}:${spec.id ?? spec.key ?? ''}`)).size, registered.length);
  assert.deepEqual([...new Set(injected)].sort(), [
    'conversation.chat.assistant-actions',
    'conversation.input.overlay',
    'conversation.view',
    'main',
    'sidebar.panellist',
    'sidebar.right.pane.tab',
    'sidebar.right.pane.tab.title',
  ]);
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0].id, 'tongji');
  assert.equal(tabs[0].kind, 'tongji');
  assert.equal(typeof tabs[0].title, 'function');
  assert.equal(tabs[0].guide.length, 1);
  assert.equal(tabs[0].guide[0].order, 20);
});

test('conversation view and fleet tab are separate registrations', () => {
  const { view, registered } = loadPlugin();
  const context = registered.find(spec => spec.name === 'conversation.view' && spec.id === 'context');
  const fleet = registered.find(spec => spec.name === 'conversation.view' && spec.id === 'fleet');
  assert.ok(context, 'the context view must carry its own id');
  assert.ok(fleet, 'the fleet view must carry its own id');
  assert.notEqual(context.order, fleet.order);
  assert.notEqual(view['conversation.view:context'], view['conversation.view:fleet']);
});

test('tab title renders the localized stats label', () => {
  const { view } = loadPlugin();
  const title = view['sidebar.right.pane.tab.title:tongji'];
  assert.equal(typeof title, 'function');
  const tree = title({ t: key => `t:${key}` });
  assert.match(textOf(tree), /t:tab\.stats/);
});

test('usage card fetches the session total and polls every five seconds', async () => {
  const helpers = code.slice(code.indexOf('function Pm('), code.indexOf('function Um('));
  const card = sliceFunction(code, 'function Um(');
  const polls = [];
  const cleared = [];
  const calls = [];
  const sandbox = createContext({
    u: null,
    d: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    wa: () => null,
    window: {
      setInterval(run, ms) { polls.push({ run, ms }); return polls.length; },
      clearInterval(id) { cleared.push(id); },
    },
    fetch: async url => {
      calls.push(url);
      if (calls.length === 1) {
        return {
          ok: true,
          json: async () => ({
            total: { input: 100, output: 3, read: 20, write: 0, samples: 1, unknown: 0, cacheInput: 120, cacheSamples: 1, cacheMissing: 0 },
            turns: {},
          }),
        };
      }
      return { ok: false, json: async () => ({ error: { code: 'usage-unavailable' } }) };
    },
    AbortController,
    Error,
    String,
    Number,
    encodeURIComponent,
  });
  const harness = createHarness();
  sandbox.u = harness.React;
  runInContext(`${helpers}\n${card}\nthis.UsageCard = Um(key => key);`, sandbox);

  const tree = await harness.settle(sandbox.UsageCard, { sessionId: 'root' });

  assert.deepEqual(calls, ['api/tongji/usage?sessionId=root']);
  assert.equal(polls.length, 1, 'the card must schedule exactly one refresh timer');
  assert.equal(polls[0].ms, 5000);

  const nodes = collect(tree);
  const stats = nodes.filter(node => typeof node.props?.className === 'string' && node.props.className.startsWith('lc-stat lc-tu-'));
  assert.equal(
    stats.map(node => node.props.className.replace('lc-stat lc-tu-', '')).sort().join(','),
    'counts,grand,hit,input,output,uncached',
  );
  const value = key => {
    const stat = stats.find(node => node.props.className === `lc-stat lc-tu-${key}`);
    assert.ok(stat, `missing stat row: ${key}`);
    return textOf(collect(stat).find(node => node.props?.className === 'lc-stat-value'));
  };
  assert.equal(value('uncached'), '100');
  assert.equal(value('hit'), '16.67%');
  assert.equal(value('input'), '120');
  assert.equal(value('output'), '3');
  assert.equal(value('grand'), '123');
  assert.equal(value('counts'), '0 / 0');

  // A failed refresh keeps the last numbers on screen and says they are stale.
  polls[0].run();
  const stale = await harness.settle(sandbox.UsageCard, { sessionId: 'root' });
  assert.equal(calls.length, 2);
  const staleNodes = collect(stale);
  assert.match(textOf(staleNodes.find(node => node.props?.className === 'lc-card-sub') ?? {}), /turnusage\.stale/);
  const staleInput = staleNodes.find(node => node.props?.className === 'lc-stat lc-tu-input');
  assert.equal(
    textOf(collect(staleInput).find(node => node.props?.className === 'lc-stat-value')),
    '120',
    'a failed poll must not blank the last known totals',
  );
  // Switching sessions must dispose the previous poller instead of stacking timers.
  await harness.settle(sandbox.UsageCard, { sessionId: 'other' });
  assert.equal(cleared.length, 1, 'the previous session poll timer must be cleared');
  assert.equal(polls.length, 2, 'switching sessions starts exactly one new timer');
  assert.equal(calls.at(-1), 'api/tongji/usage?sessionId=other');
});

test('usage card reports an empty session instead of inventing numbers', async () => {
  const helpers = code.slice(code.indexOf('function Pm('), code.indexOf('function Um('));
  const card = sliceFunction(code, 'function Um(');
  const sandbox = createContext({
    u: null,
    d: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    wa: () => null,
    window: { setInterval: () => 1, clearInterval: () => {} },
    fetch: async () => ({ ok: true, json: async () => ({ total: { input: 0, output: 0, read: 0, write: 0, samples: 0, unknown: 0, cacheInput: 0, cacheSamples: 0, cacheMissing: 0 }, turns: {} }) }),
    AbortController,
    Error,
    String,
    Number,
    encodeURIComponent,
  });
  const harness = createHarness();
  sandbox.u = harness.React;
  runInContext(`${helpers}\n${card}\nthis.UsageCard = Um(key => key);`, sandbox);

  const tree = await harness.settle(sandbox.UsageCard, { sessionId: 'root' });
  const nodes = collect(tree);
  const value = key => {
    const stat = nodes.find(node => node.props?.className === `lc-stat lc-tu-${key}`);
    assert.ok(stat, `missing stat row: ${key}`);
    return textOf(collect(stat).find(node => node.props?.className === 'lc-stat-value'));
  };
  assert.equal(value('uncached'), '0');
  assert.equal(value('hit'), '—', 'zero cache input must render a dash, not a division by zero');
  assert.equal(value('counts'), '0 / 0');
});

test('malformed usage payloads are rejected rather than coerced into zeros', () => {
  const helpers = code.slice(code.indexOf('function Pm('), code.indexOf('function Um('));
  const sandbox = createContext({});
  runInContext(`${helpers}\nthis.read = Lm; this.num = Pm; this.kilo = Rm; this.input = Bm; this.total = Vm; this.hit = Hm;`, sandbox);

  assert.equal(sandbox.read(null), null);
  assert.equal(sandbox.read({}), null);
  assert.equal(sandbox.read({ total: { input: 5 } }).total.output, 0);
  assert.equal(sandbox.read({ total: {}, turns: [] }).turns.length, 0);

  assert.equal(sandbox.num('12'), 12);
  assert.equal(sandbox.num('nope'), 0);
  assert.equal(sandbox.kilo(999), '999');
  assert.equal(sandbox.kilo(1000), '1.0k');
  assert.equal(sandbox.kilo(1_000_000), '1.00M');

  const bucket = { input: 100, output: 2, read: 20, write: 3 };
  assert.equal(sandbox.input(bucket), 123);
  assert.equal(sandbox.total(bucket), 125);
  assert.equal(sandbox.hit({ read: 20, cacheInput: 120 }), '16.67%');
  assert.equal(sandbox.hit({ read: 20, input: 80 }), '20.00%');
  assert.equal(sandbox.hit({ read: 0, cacheInput: 0, input: 0 }), '—');
});

test('turn and step tables keep numeric order with unassigned last', () => {
  const helpers = code.slice(code.indexOf('function Pm('), code.indexOf('function Um('));
  const sandbox = createContext({});
  runInContext(`${helpers}\nthis.read = Lm;`, sandbox);

  const zero = { input: 0, output: 0, read: 0, write: 0, samples: 0, unknown: 0, cacheInput: 0, cacheSamples: 0, cacheMissing: 0 };
  const parsed = sandbox.read({
    total: zero,
    turns: { unassigned: { ...zero, input: 9 }, 2: { ...zero, input: 2 }, 1: { ...zero, input: 1, steps: { none: zero, 2: zero, 1: zero } } },
  });

  assert.equal(parsed.turns.map(turn => turn.key).join(','), '1,2,unassigned');
  assert.equal(parsed.turns.find(turn => turn.key === 'unassigned').turn, null);
  assert.equal(parsed.turns[0].steps.map(step => step.key).join(','), '1,2,none');
  assert.equal(parsed.turns[0].steps.find(step => step.key === 'none').step, null);
});
