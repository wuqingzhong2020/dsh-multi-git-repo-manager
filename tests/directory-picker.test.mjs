import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickRepositoryDirectory } from '../src/client/directory-picker.ts'

const unavailable = '目录选择服务不可用'

test('Desktop picker opens without reading any optional Cordis service', async () => {
  let opened = 0
  const ctx = new Proxy({}, { get() { throw new Error('cannot get property without inject') } })
  const desktop = { supportsDefaultPath: true, async pick(start) { assert.equal(start, 'D:/project/repos'); opened++; return 'D:\\project\\repos\\core' } }
  assert.equal(await pickRepositoryDirectory(ctx, unavailable, 'D:/project/repos', desktop), 'D:\\project\\repos\\core')
  assert.equal(opened, 1)
})

test('Web picker uses Cordis get for the mounted Remote namespace', async () => {
  const ctx = new Proxy({
    get(name) {
      assert.equal(name, 'remote.directoryPicker')
      return { async pick() { return { ok: true, value: '/project/core' } } }
    },
  }, { get(target, name) { if (name === 'get') return target.get; throw new Error('undeclared service') } })
  assert.equal(await pickRepositoryDirectory(ctx, unavailable, '/project'), '/project/core')
})

test('Cancellation returns null; missing picker and picker failures are reported', async () => {
  assert.equal(await pickRepositoryDirectory({}, unavailable, '/project', { supportsDefaultPath: true, async pick() { return null } }), null)
  await assert.rejects(pickRepositoryDirectory({ get() { return undefined } }, unavailable, '/project'), { message: unavailable })
  await assert.rejects(pickRepositoryDirectory({}, unavailable, '/project', { supportsDefaultPath: true, async pick() { throw new Error('native failure') } }), /native failure/)
  await assert.rejects(pickRepositoryDirectory({ get() { return { async pick() { return { ok: false, error: { message: 'Remote failure' } } } } } }, unavailable, '/project'), /Remote failure/)
})

test('An unadapted Desktop bridge is refused instead of silently ignoring the start path', async () => {
  let opened = false
  await assert.rejects(pickRepositoryDirectory({}, unavailable, '/project', { async pick() { opened = true; return null } }), { message: unavailable })
  assert.equal(opened, false)
})
