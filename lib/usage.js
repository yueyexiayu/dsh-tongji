const empty = () => ({ input: 0, output: 0, read: 0, write: 0, samples: 0, unknown: 0 });

function add(target, value, sign = 1) {
  for (const key of ['input', 'output', 'read', 'write', 'samples', 'unknown']) target[key] += sign * value[key];
}

function sample(event) {
  let usage = event.type === 'assistant/message' ? event.data.usage : undefined;
  if (!usage && Array.isArray(event.data.stream)) {
    for (let i = event.data.stream.length - 1; i >= 0; i--) {
      const record = event.data.stream[i];
      if (record?.type === 'chunk' && record.chunk?.type === 'usage') { usage = record.chunk.usage; break; }
    }
  }
  if (!usage || !Number.isFinite(usage.inputTokens) || !Number.isFinite(usage.outputTokens)) return null;
  return { input: usage.inputTokens, output: usage.outputTokens, read: usage.cacheReadTokens ?? 0, write: usage.cacheWriteTokens ?? 0, samples: 1, unknown: 0 };
}

// Match tokenUsage's replacement scope: a retry closes the previous attempt.
function fold(events, inherited, childStart, onChild, assign) {
  const rows = new Map();
  let last = null;
  let activeTurn = null;
  function row(turn) {
    if (!rows.has(turn)) rows.set(turn, empty());
    return rows.get(turn);
  }
  for (let i = inherited; i < events.length; i++) {
    const event = events[i];
    const data = event.data || {};
    if (event.type === 'turn/start') activeTurn = data.turn;
    if (event.type === 'turn/end' && activeTurn === data.turn) activeTurn = null;
    if (event.type === 'subagent/catalog' && i >= childStart) onChild(data, assign === undefined ? activeTurn : assign);
    if (event.type === 'llm/retry-started' && last?.turn === data.turn && last.step === data.step) last = null;
    if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') continue;
    const turn = assign === undefined ? data.turn : assign;
    const next = sample(event);
    if (!next) { row(turn).unknown++; continue; }
    if (last?.turn === data.turn && last.step === data.step) add(row(last.assigned), last.value, -1);
    add(row(turn), next);
    last = { turn: data.turn, step: data.step, assigned: turn, value: next };
  }
  return rows;
}

/** Read each child once, excluding inherited fork history. Child work is assigned to its root creation turn. */
export async function collectUsage(rootId, observe) {
  const seen = new Set();
  const rows = new Map();
  const pending = [{ id: rootId, assigned: undefined, root: true }];
  function target(turn) {
    const key = turn == null ? 'unassigned' : String(turn);
    if (!rows.has(key)) rows.set(key, empty());
    return rows.get(key);
  }
  while (pending.length) {
    const item = pending.shift();
    if (seen.has(item.id)) { target(item.assigned).unknown++; continue; }
    seen.add(item.id);
    let observation;
    try { observation = await observe(item.id); }
    catch (error) { if (item.root) throw error; target(item.assigned).unknown++; continue; }
    if (!Array.isArray(observation.events) || !Number.isSafeInteger(observation.inheritedEventCount)) {
      if (item.root) throw new Error('invalid session observation');
      target(item.assigned).unknown++; continue;
    }
    const start = item.root ? 0 : observation.inheritedEventCount;
    const localRows = fold(observation.events, start, observation.inheritedEventCount, (data, assigned) => {
      if (typeof data.childId !== 'string') { target(assigned).unknown++; return; }
      if (data.mode === 'external' || data.mode === 'unknown') { target(assigned).unknown++; return; }
      pending.push({ id: data.childId, assigned: assigned ?? null, root: false });
    }, item.assigned);
    for (const [turn, value] of localRows) add(target(turn), value);
  }
  const total = empty();
  for (const value of rows.values()) add(total, value);
  return { turns: Object.fromEntries(rows), total };
}
