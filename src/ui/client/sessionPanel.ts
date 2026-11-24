import type { Translate } from './i18n'
import type { ContextSettings } from './settings'
import type { ClientCtx, ContextViewProps } from './services'
import { watchGate } from './toggleGate'

export const PANEL_SECTION_ID = 'tongji'

/** After the built-in Environment section (0) and before forge's change requests (100). */
const PANEL_SECTION_ORDER = 50

/**
 * The Session panel docks beside the Chat transcript, which is the only place
 * inside the conversation where a plugin may draw next to the dialogue. This
 * registers the statistics as one of its sections instead of a view tab.
 */
export function watchPanelSection(
  ctx: ClientCtx,
  settings: ContextSettings,
  view: (props: ContextViewProps) => unknown,
  t: Translate,
  ns: string,
): () => void {
  return watchGate(
    settings.store,
    () => settings.statsSection() === 'show' && settings.statsDock() !== 'show',
    () => [ctx.slots.inject('conversation.session.panel.section', () => ctx.slots.register(
      { name: 'conversation.session.panel.section', id: PANEL_SECTION_ID, order: PANEL_SECTION_ORDER, locale: ns, label: () => t('panel.section') },
      props => view({ ...props as ContextViewProps, host: 'panel' }),
    ))],
  )
}
