import type { z } from 'zod'
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types'

export interface WiredProjection<K extends keyof SessionProjectionMap, S> {
  key: K
  stateSchema: z.ZodType<S>
  /** DSH passes the session header and its fork-inherited prefix length. */
  init(header?: SessionHeader, inheritedEventCount?: number): S
  apply(state: S, event: SessionEvent): S
  wire: {
    viewSchema: z.ZodType<SessionProjectionMap[K]>
    view(state: S): SessionProjectionMap[K]
    summary?: boolean
  }
  stateVersion: number
}
