import { createElement as h } from 'react'
import type { Translate } from '../i18n'
import { modalStoreOf } from '../modalStore'

/**
 * 输入框上方工具条里的「统计」按钮：点开插件已有的全屏统计面板（宽、多列）。
 * 槽位选 conversation.composer.bar，是因为它在本机实测里确实渲染（
 * conversation.composer.dock 在当前会话里拿不到挂载点）。
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