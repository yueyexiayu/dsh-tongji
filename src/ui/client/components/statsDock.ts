import { createElement as h, useCallback, useState } from 'react'
import type { Translate } from '../i18n'
import type { ContextViewProps } from '../services'

const OPEN_KEY = 'tongji.dock.open'

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 统计卡片：挂在 composer dock（输入框上方那一列卡片的区域），整列宽度随对话列，
 * 不参与会话面板的让位计算，因此不会挤压正文或 composer。
 * 折叠状态按浏览器记忆，默认收起，只留一行标题。
 */
export function makeStatsDock(view: (props: ContextViewProps) => unknown, t: Translate) {
  return (props: ContextViewProps) => {
    const [open, setOpen] = useState(readOpen)

    const toggle = useCallback(() => {
      setOpen((prev) => {
        const next = !prev
        try {
          localStorage.setItem(OPEN_KEY, next ? '1' : '0')
        } catch {}
        return next
      })
    }, [])

    return h(
      'section',
      { className: 'lc-dock', 'data-open': open ? 'true' : 'false' },
      h(
        'button',
        { className: 'lc-dock-head', type: 'button', onClick: toggle, 'aria-expanded': open },
        h('span', { className: 'lc-dock-title' }, t('dock.title')),
        h('span', { className: 'lc-dock-action' }, open ? t('dock.collapse') : t('dock.expand')),
      ),
      open
        ? h('div', { className: 'lc-dock-body' }, view({ ...props, host: 'dock' }) as never)
        : null,
    )
  }
}