import { createUsageCollector } from './usage.js';

export const name = 'tongji';
export const inject = ['connection', 'sessionQuery'];

const NO_STORE = { 'cache-control': 'no-store' };

function failure(code, message, status) {
  return Response.json({ error: { code, message, retryable: code !== 'invalid-session-id' } }, { status, headers: NO_STORE });
}

function mappedFailure(error) {
  if (error?.code === 'SESSION_QUERY_SESSION_NOT_FOUND') return failure('session-not-found', '会话不存在', 404);
  if (error?.code === 'SESSION_QUERY_CORRUPT_SESSION') return failure('session-corrupt', '会话日志无法读取', 422);
  if (error?.code === 'SESSION_QUERY_PERSISTENCE_FAILED') return failure('persistence-failed', '会话存储暂不可用', 503);
  if (error?.code === 'invalid-observation') return failure('invalid-observation', '会话统计结构无效', 500);
  return failure('usage-unavailable', '统计数据暂不可用', 503);
}

export function apply(ctx) {
  const usage = createUsageCollector(async (sessionId, signal) => {
    const observation = await ctx.sessionQuery.observeSession(sessionId, { signal, projectionMode: 'none' });
    try { return { events: observation.events, inheritedEventCount: observation.inheritedEventCount }; }
    finally { observation[Symbol.dispose](); }
  });
  ctx.connection.fetch.register({
    path: '/api/tongji/usage', methods: ['GET'], requestBody: 'buffered',
    fetch: async request => {
      const id = new URL(request.url).searchParams.get('sessionId');
      if (!id) return failure('invalid-session-id', '缺少 sessionId', 400);
      try {
        const result = await usage.collect(id, request.signal);
        return Response.json(result, { headers: NO_STORE });
      } catch (error) {
        if (request.signal.aborted) return failure('request-aborted', '请求已取消', 499);
        ctx.logger?.warn('tongji: usage collection failed', { sessionId: id, code: error?.code, error });
        return mappedFailure(error);
      }
    },
  });
}
