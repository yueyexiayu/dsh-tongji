import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/ui/client/components/useConversationSurface.ts', import.meta.url), 'utf8')

function loadHook() {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const cleanups = []
  const module = { exports: {} }
  const sandbox = createContext({
    exports: module.exports,
    module,
    require(id) {
      assert.equal(id, 'react')
      return {
        useLayoutEffect(run) {
          const cleanup = run()
          if (typeof cleanup === 'function') cleanups.push(cleanup)
        },
      }
    },
  })
  runInContext(output, sandbox)
  return { hook: module.exports.useConversationSurface, cleanups }
}

function fakeConversation() {
  const attributes = new Set()
  const scroller = {
    setAttribute(name) { attributes.add(name) },
    removeAttribute(name) { attributes.delete(name) },
  }
  const root = { closest: selector => selector === '[data-conversation-scroll]' ? scroller : null }
  return { ref: { current: root }, attributes }
}

test('a disabled surface leaves the conversation composer seat unmarked', () => {
  const { hook } = loadHook()
  const { ref, attributes } = fakeConversation()
  hook(ref, 'pane', false)
  assert.equal(attributes.size, 0)
})

test('an enabled surface marks and then restores the conversation scroll', () => {
  const { hook, cleanups } = loadHook()
  const { ref, attributes } = fakeConversation()
  hook(ref, 'pane', true)
  assert.deepEqual([...attributes], ['data-lc-surface'])
  cleanups[0]()
  assert.equal(attributes.size, 0)
})
