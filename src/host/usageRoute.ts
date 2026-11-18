/**
 * tongji's own route: fold per-turn/per-step token usage for one session.
 *
 * This is the capability dsh-context does not provide — dsh-context measures
 * what is *in* the context window, while this measures what went *through* the
 * model. The client renders it as a section inside the merged panel.
 */
import type { Context } from '@deepseek-ai/cordis'
import { createUsageCollector } from './usage'

const NO_STORE = { 'cache-control': 'no-store' }

function failure(code: string, message: string, status: number): Response {
  return Response.json(
    { error: { code, message, retryable: code !== 'invalid-session-id' } },
    { status, headers: NO_STORE },
  )
}

function mappedFailure(error: { code?: string; message?: string } | undefined): Response {
  if (error?.code === 'SESSION_QUERY_SESSION_NOT_FOUND') return failure('session-not-found', '会话不存在', 404)
  if (error?.code === 'SESSION_QUERY_CORRUPT_SESSION') return failure('session-corrupt', '会话日志无法读取', 422)
  if (error?.code === 'SESSION_QUERY_PERSISTENCE_FAILED') return failure('persistence-failed', '会话存储暂不可用', 503)
  if (error?.code === 'invalid-observation') return failure('invalid-observation', '会话统计结构无效', 500)
  return failure('usage-unavailable', '统计数据暂不可用', 503)
}

interface UsageHost {
  connection?: { fetch?: { register(row: unknown): void } }
  sessionQuery?: {
    observeSession(
      id: string,
      options: { signal?: AbortSignal; projectionMode?: string },
    ): Promise<{ events: unknown[]; inheritedEventCount: number; [k: symbol]: () => void }>
  }
  logger?: { warn(message: string, data?: unknown): void }
}

export function registerUsageRoute(ctx: Context): void {
  const host = ctx as unknown as UsageHost
  const connection = host.connection
  const sessionQuery = host.sessionQuery
  // The route is optional: a host without these services still gets the dsh-context panel.
  if (connection?.fetch?.register === undefined || sessionQuery === undefined) return

  const usage = createUsageCollector(async (sessionId: string, signal?: AbortSignal) => {
    const observation = await sessionQuery.observeSession(sessionId, { signal, projectionMode: 'none' })
    try {
      return { events: observation.events, inheritedEventCount: observation.inheritedEventCount }
    } finally {
      observation[Symbol.dispose]()
    }
  })

  connection.fetch.register({
    path: '/api/tongji/usage',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request: Request) => {
      const id = new URL(request.url).searchParams.get('sessionId')
      if (id === null || id === '') return failure('invalid-session-id', '缺少 sessionId', 400)
      try {
        const result = await usage.collect(id, request.signal)
        return Response.json(result, { headers: NO_STORE })
      } catch (error) {
        if (request.signal.aborted) return failure('request-aborted', '请求已取消', 499)
        host.logger?.warn('tongji: usage collection failed', { sessionId: id, error })
        return mappedFailure(error as { code?: string; message?: string })
      }
    },
  })
}
