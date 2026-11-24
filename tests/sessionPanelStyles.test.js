import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/ui/client/styles/sessionPanel.css', import.meta.url), 'utf8')

function declarationsOf(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rules = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))]
  assert.notEqual(rules.length, 0, `missing rule for ${selector}`)
  return Object.fromEntries(
    rules
      .flatMap(rule => rule[1]
      .split(';')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const colon = entry.indexOf(':')
        return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()]
      })),
  )
}

test('the stats panel geometry is derived once and shared with its dock probe', () => {
  const body = declarationsOf('[data-conversation-content]')
  const probe = declarationsOf('[data-session-panel-probe]')
  const panel = declarationsOf('[data-session-panel]')

  assert.equal(
    body['--tongji-panel-width'],
    'min(720px, calc(var(--dsh-conversation-viewport-width, 100vw) * 0.375))',
  )
  assert.equal(body['--panel-min-width'], 'var(--tongji-panel-width) !important')
  assert.equal(probe['--panel-min-width'], 'var(--tongji-panel-width) !important')
  assert.equal(panel.width, 'var(--tongji-panel-width) !important')
  assert.equal(panel['max-width'], 'var(--tongji-panel-width) !important')
})
