const USAGE_FIELDS = ['input', 'output', 'read', 'write', 'samples', 'unknown', 'cacheInput', 'cacheSamples', 'cacheMissing'];
const DEFAULT_CACHE_SIZE = 128;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_SIGNAL_CHECK_INTERVAL = 4096;

const empty = () => ({ input: 0, output: 0, read: 0, write: 0, samples: 0, unknown: 0, cacheInput: 0, cacheSamples: 0, cacheMissing: 0 });

function add(target, value, sign = 1) {
  for (const key of USAGE_FIELDS) target[key] += sign * value[key];
}

function isTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function sample(event) {
  let usage = event.type === 'assistant/message' ? event.data.usage : undefined;
  if (!usage && Array.isArray(event.data.stream)) {
    for (let i = event.data.stream.length - 1; i >= 0; i--) {
      const record = event.data.stream[i];
      if (record?.type === 'chunk' && record.chunk?.type === 'usage') { usage = record.chunk.usage; break; }
    }
  }
  if (!usage || !isTokenCount(usage.inputTokens) || !isTokenCount(usage.outputTokens)) return null;
  const hasRead = usage.cacheReadTokens !== undefined;
  const hasWrite = usage.cacheWriteTokens !== undefined;
  if ((hasRead && !isTokenCount(usage.cacheReadTokens)) || (hasWrite && !isTokenCount(usage.cacheWriteTokens))) return null;
  const read = hasRead ? usage.cacheReadTokens : 0;
  const write = hasWrite ? usage.cacheWriteTokens : 0;
  return { input: usage.inputTokens, output: usage.outputTokens, read, write, samples: 1, unknown: 0,
    cacheInput: hasRead ? usage.inputTokens + read + write : 0, cacheSamples: hasRead ? 1 : 0, cacheMissing: hasRead ? 0 : 1 };
}

function createFold(assign, start, childStart) {
  return { rows: new Map(), last: null, activeTurn: null, children: [], next: start, childStart, assign };
}

function cloneFold(state) {
  const rows = new Map();
  for (const [turn, value] of state.rows) {
    const copy = empty();
    add(copy, value);
    rows.set(turn, copy);
  }
  return { rows, last: state.last, activeTurn: state.activeTurn, children: [...state.children], next: state.next, childStart: state.childStart, assign: state.assign };
}

function row(state, turn) {
  if (!state.rows.has(turn)) state.rows.set(turn, empty());
  return state.rows.get(turn);
}

// Match tokenUsage's replacement scope: a retry closes the previous attempt.
function foldEvents(state, events, signal, signalCheckInterval) {
  let checkedAt = state.next;
  for (let i = state.next; i < events.length; i++) {
    if (i - checkedAt >= signalCheckInterval) {
      if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('usage collection aborted');
      checkedAt = i;
    }
    const event = events[i];
    const data = event.data || {};
    if (event.type === 'turn/start') state.activeTurn = data.turn;
    if (event.type === 'turn/end' && state.activeTurn === data.turn) state.activeTurn = null;
    if (event.type === 'subagent/catalog' && i >= state.childStart) {
      const assigned = state.assign === undefined ? state.activeTurn : state.assign;
      if (typeof data.childId !== 'string' || data.childId.length === 0
        || (data.mode !== 'one-shot' && data.mode !== 'continuable' && data.mode !== 'external' && data.mode !== 'unknown')) {
        row(state, assigned).unknown++;
      } else if (data.mode === 'external' || data.mode === 'unknown') row(state, assigned).unknown++;
      else state.children.push({ id: data.childId, assigned: assigned ?? null });
    }
    if (event.type === 'llm/retry-started' && state.last?.turn === data.turn && state.last.step === data.step) state.last = null;
    if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') continue;
    const turn = state.assign === undefined ? data.turn : state.assign;
    const next = sample(event);
    if (!next) { row(state, turn).unknown++; continue; }
    if (state.last?.turn === data.turn && state.last.step === data.step) add(row(state, state.last.assigned), state.last.value, -1);
    add(row(state, turn), next);
    state.last = { turn: data.turn, step: data.step, assigned: turn, value: next };
  }
  state.next = events.length;
}

function foldObservation(state, events, signal, signalCheckInterval) {
  if (state.next === events.length) return;
  const next = cloneFold(state);
  foldEvents(next, events, signal, signalCheckInterval);
  state.rows = next.rows;
  state.last = next.last;
  state.activeTurn = next.activeTurn;
  state.children = next.children;
  state.next = next.next;
}

function validObservation(observation) {
  return observation && Array.isArray(observation.events)
    && Number.isSafeInteger(observation.inheritedEventCount)
    && observation.inheritedEventCount >= 0
    && observation.inheritedEventCount <= observation.events.length;
}

function sessionKey(id, assign) {
  return id + '\u0000' + (assign === undefined ? 'root' : assign === null ? 'unassigned' : String(assign));
}

/** Reusable fold cache for one Host owner. */
export function createUsageCollector(observe, options = {}) {
  const cacheSize = Number.isSafeInteger(options.cacheSize) && options.cacheSize > 0 ? options.cacheSize : DEFAULT_CACHE_SIZE;
  const concurrency = Number.isSafeInteger(options.concurrency) && options.concurrency > 0 ? options.concurrency : DEFAULT_CONCURRENCY;
  const signalCheckInterval = Number.isSafeInteger(options.signalCheckInterval) && options.signalCheckInterval > 0
    ? options.signalCheckInterval
    : DEFAULT_SIGNAL_CHECK_INTERVAL;
  const cache = new Map();

  function touch(key, value) {
    cache.delete(key);
    cache.set(key, value);
    while (cache.size > cacheSize) cache.delete(cache.keys().next().value);
  }

  function cachedState(item, observation) {
    const key = sessionKey(item.id, item.assigned);
    let state = cache.get(key);
    const start = item.root ? 0 : observation.inheritedEventCount;
    if (state && (state.inherited !== observation.inheritedEventCount || observation.events.length < state.next)) state = undefined;
    if (!state) state = { ...createFold(item.assigned, start, observation.inheritedEventCount), inherited: observation.inheritedEventCount };
    touch(key, state);
    return state;
  }

  async function collect(rootId, signal) {
    const rows = new Map();
    function target(turn) {
      const key = turn == null ? 'unassigned' : String(turn);
      if (!rows.has(key)) rows.set(key, empty());
      return rows.get(key);
    }

    const seen = new Set();
    let frontier = [{ id: rootId, assigned: undefined, root: true }];

    async function read(item) {
      let observation;
      try { observation = await observe(item.id, signal); }
      catch (error) {
        if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('usage collection aborted');
        if (item.root) throw error;
        target(item.assigned).unknown++;
        return [];
      }
      if (!validObservation(observation)) {
        if (item.root) throw new UsageError('invalid session observation', 'invalid-observation');
        target(item.assigned).unknown++;
        return [];
      }
      const state = cachedState(item, observation);
      foldObservation(state, observation.events, signal, signalCheckInterval);
      for (const [turn, value] of state.rows) add(target(turn), value);
      return state.children;
    }

    while (frontier.length > 0) {
      const batch = frontier.splice(0, concurrency);
      const accepted = [];
      for (const item of batch) {
        if (seen.has(item.id)) { target(item.assigned).unknown++; continue; }
        seen.add(item.id);
        accepted.push(item);
      }
      const children = await Promise.all(accepted.map(read));
      for (const list of children) {
        for (const item of list) frontier.push(item);
      }
    }

    const total = empty();
    for (const value of rows.values()) add(total, value);
    return { turns: Object.fromEntries(rows), total };
  }

  return { collect };
}

export class UsageError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'UsageError';
    this.code = code;
  }
}

/** Read a complete tree once. Host integrations should reuse createUsageCollector instead. */
export async function collectUsage(rootId, observe, signal) {
  return createUsageCollector(observe, { cacheSize: 1 }).collect(rootId, signal);
}
