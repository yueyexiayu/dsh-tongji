import type { ContextSettings } from './settings'
import type { ClientCtx } from './services'
import type { Translate } from './i18n'
import { makeStatsBarButton } from './components/statsBarButton'
import { watchGate } from './toggleGate'

const STATS_SLOT = 'conversation.input.left'

/** 在 composer 工具条上挂一个「统计」按钮，点开全屏统计面板。 */
export function watchStatsBar(
  ctx: ClientCtx,
  settings: ContextSettings,
  t: Translate,
  ns: string,
): () => void {
  return watchGate(
    settings.store,
    () => settings.statsDock() === 'show',
    () => [ctx.slots.inject(STATS_SLOT, () => ctx.slots.register(
      { name: STATS_SLOT, id: 'tongji', order: 40, locale: ns },
      makeStatsBarButton(t),
    ))],
  )
}
