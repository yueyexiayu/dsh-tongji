import { createElement as h } from 'react'
import type { Translate } from '../i18n'
import { modalStoreOf } from '../modalStore'

/**
 * 输入框上方工具条里的「统计」按钮：点开插件已有的全屏统计面板（宽、多列）。
 * conversation.input.left 是官方输入框声明的列表子槽位；
 * conversation.composer.bar 承载整个输入框，不能由增量插件替换。
 */
export function makeStatsBarButton(t: Translate) {
  return (props: { sessionId?: string; session?: { sessionId?: string } }) => {
    const sessionId = props.sessionId ?? props.session?.sessionId ?? ''
    return h(
      'button',
      {
        className: 'lc-bar-btn',
        type: 'button',
        title: t('dock.expand'),
        onClick: () => {
          if (sessionId === '') return
          modalStoreOf(sessionId).set(true)
        },
      },
      t('dock.title'),
    )
  }
}
