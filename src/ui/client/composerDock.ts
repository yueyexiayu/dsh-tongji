import type { ContextViewProps } from './services'
import type { Translate } from './i18n'
import type { ContextSettings } from './settings'
import type { ClientCtx } from './services'
import { makeStatsDock } from './components/statsDock'
import { watchGate } from './toggleGate'

export const COMPOSER_DOCK_ID = 'tongji'

/** 在输入框上方的 dock 区挂一张统计卡片：整列宽度、可折叠、不占会话面板、不挤压 composer。 */
export function watchComposerDock(
  ctx: ClientCtx,
  settings: ContextSettings,
  view: (props: ContextViewProps) => unknown,
  t: Translate,
  ns: string,
): () => void {
  return watchGate(
    settings.store,
    () => settings.statsDock() === 'show',
    () => [ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
      { name: 'conversation.composer.dock', id: COMPOSER_DOCK_ID, order: 40, locale: ns },
      makeStatsDock(view, t),
    ))],
  )
}