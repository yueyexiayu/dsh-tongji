import { collectUsage } from './usage.js';

export const name = 'tongji';
export const inject = ['connection', 'sessionQuery'];

export function apply(ctx) {
  ctx.connection.fetch.register({
    path: '/api/tongji/usage', methods: ['GET'], requestBody: 'buffered',
    fetch: async request => {
      const id = new URL(request.url).searchParams.get('sessionId');
      if (!id) return Response.json({ error: 'missing sessionId' }, { status: 400 });
      try {
        const result = await collectUsage(id, async childId => {
          const observation = await ctx.sessionQuery.observeSession(childId, { signal: request.signal, projectionMode: 'none' });
          try { return { events: observation.events, inheritedEventCount: observation.inheritedEventCount }; }
          finally { observation[Symbol.dispose](); }
        });
        return Response.json(result, { headers: { 'cache-control': 'no-store' } });
      } catch {
        return Response.json({ error: '统计数据暂不可用' }, { status: 503, headers: { 'cache-control': 'no-store' } });
      }
    },
  });
}
