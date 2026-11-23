import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { detectHarnessVersion, detectedHarnessVersion } from '../lib/index.js'

function fakeTree(version) {
  const root = mkdtempSync(join(tmpdir(), 'tongji-version-'))
  const dir = join(root, 'node_modules', '@deepseek-ai', 'dsh-session')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-session', version }))
  return { dir, entry: join(dir, 'index.js') }
}

test('reads the version of the running tree, not the plugin own dependency', () => {
  const tree = fakeTree('9.9.9')
  const ctx = { get: () => undefined, logger: { warn() {} } }
  const version = detectHarnessVersion(ctx, () => pathToFileURL(tree.entry).href, '/nonexistent-plugin-root')
  assert.equal(version, '9.9.9')
  assert.equal(detectedHarnessVersion(), '9.9.9')
})

test('a tree inside the plugin root is not mistaken for the running DSH', () => {
  const tree = fakeTree('1.2.3')
  const ctx = { get: () => undefined, logger: { warn() {} } }
  const version = detectHarnessVersion(ctx, () => pathToFileURL(tree.entry).href, tree.dir)
  assert.equal(version, undefined)
})

test('an undetectable version warns once and stays visible as unknown', () => {
  const warnings = []
  const ctx = { get: () => undefined, logger: { warn: message => { warnings.push(message) } } }
  const version = detectHarnessVersion(ctx, () => { throw new Error('no such module') }, '/nonexistent-plugin-root')
  assert.equal(version, undefined)
  assert.equal(detectedHarnessVersion(), undefined)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /版本/)
})
