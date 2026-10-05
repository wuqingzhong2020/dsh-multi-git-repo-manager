import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import * as React from 'react'
import * as jsx from 'react/jsx-runtime'
import { Context } from '@deepseek-ai/cordis'
import * as manager from '../lib/index.js'
import { REPOSITORY_INVOCATIONS } from '../src/typert-descriptors.ts'
import { attachLocale, en, zh, t } from '../src/client/locales.ts'
import { localizeReviewMessage } from '../src/client/message-locales.ts'

const project = (root, name) => ({ root, name, includeProjectRoot: true, configFiles: [], repositories: [] })

test('the standalone plugin reads volatile config and registers a shared session service', async () => {
  const ctx = new Context()
  const directory = await mkdtemp(join(tmpdir(), 'dsh-manager-boundary-'))
  try {
    const root = await realpath(directory)
    await ctx.plugin(manager, { projects: [project(root, 'Manager')] }).await()
    const service = ctx.get('multiGitRepoManager')
    assert.ok(service)
    service.adoptLegacyProjects([project(root, 'Legacy')])
    const page = await service.project({ id: 'session', session: { header: { cwd: root } } })
    assert.equal(page.project.root, root)
    assert.ok(Array.isArray(page.workspace.roots))
    assert.equal(service.projectSettings.get().projects[0].name, 'Manager')
  } finally { await ctx.fiber.dispose(); await rm(directory, { recursive: true, force: true }) }
})

test('legacy Profile indexes merge into the manager namespace with manager values taking precedence', async () => {
  const fiber = {}
  let current = { projects: [project('/manager', 'Manager')], revision: 4 }
  const writes = []
  const native = {
    configure: () => () => {},
    describe: () => [{ ns: 'manager-settings', ...structuredClone(current), value: { projects: current.projects } }],
    update: async (ns, value, revision) => {
      assert.equal(ns, 'manager-settings')
      assert.equal(revision, current.revision)
      writes.push(value)
      current = { ...value, revision: revision + 1 }
    },
  }
  const ctx = {
    fiber,
    inject: (_deps, callback) => callback({ settings: native }),
    effect: callback => callback(),
    get: () => ({ entries: () => [{ fiber, options: { id: 'manager-settings', name: 'dsh-multi-git-repo-manager' } }] }),
  }
  const settings = new manager.RepositorySettings(ctx)
  settings.adoptLegacyProjects([project('/manager', 'Old'), project('/legacy', 'Imported')])
  assert.deepEqual(settings.get().projects.map(p => p.name), ['Manager', 'Imported'])
  await settings.save(settings.get())
  assert.equal(writes.length, 1)
  assert.equal(settings.get().revision, 5)
  await settings.save({ projects: [], revision: 5 })
  assert.deepEqual(settings.get().projects, [])
})

test('the manager protocol owns repository and target operations with strict session lookup', () => {
  assert.deepEqual(REPOSITORY_INVOCATIONS.map(d => d.method), ['setTemporaryTargets', 'resolveTargetPaths', 'discoverTargets', 'directoryStart', 'workspace', 'project', 'saveProject', 'setTemporaryRepositories'])
  for (const descriptor of REPOSITORY_INVOCATIONS) {
    assert.equal(descriptor.service, 'multiGitRepoManager')
    assert.equal(descriptor.namespace, 'multiGitRepoManager')
    assert.deepEqual(descriptor.scope, { context: 'agent', wire: 'agentId' })
    assert.equal(descriptor.parameters[0].lookup, 'agent')
  }
})

test('independently bundled consumers receive repository changes and unsubscribe cleanly', async () => {
  const first = await import('../lib/client/repository-events.js?manager')
  const second = await import('../lib/client/repository-events.js?consumer')
  let calls = 0
  const stop = second.subscribeRepositories(() => calls++)
  first.repositoriesChanged()
  assert.equal(calls, 1)
  stop(); stop()
  first.repositoriesChanged()
  assert.equal(calls, 1)
})

async function clientHarness({ delayed = false, failTitle = false } = {}) {
  let plugin
  const diagnostics = []
  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load({ id, factory }) {
      assert.equal(id, 'dsh-multi-git-repo-manager')
      plugin = factory(name => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') return jsx
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return {}
        assert.fail(`Unexpected browser dependency: ${name}`)
      })
    } } }, console: { ...console, error: (...args) => diagnostics.push(args) },
  })
  const effects = [], mounts = [], types = new Map(), seats = new Map(), pending = []
  const ctx = {
    locale: { active: 'zh', getSnapshot() { return { active: this.active } }, subscribe: () => () => {}, register: () => () => {} },
    effect: acquire => effects.push(acquire()),
    remote: { $mount: async contribution => { mounts.push(contribution); return async () => mounts.pop() } },
    sidebarRight: {},
    sidebarRightTabs: { register: definition => {
      assert.ok(!types.has(definition.kind))
      types.set(definition.kind, definition); return () => types.delete(definition.kind)
    } },
    slots: {
      inject: (_name, factory) => {
        let release
        const start = () => { release = factory() }
        if (delayed) pending.push(start); else start()
        return () => { const at = pending.indexOf(start); if (at >= 0) pending.splice(at, 1); release?.() }
      },
      register: (options, component) => {
        if (failTitle && options.name === 'sidebar.right.pane.tab.title') throw new Error('title unavailable')
        const key = `${options.name}:${options.key ?? options.id}`
        seats.set(key, { options, component }); return () => seats.delete(key)
      },
    },
  }
  plugin.apply(ctx)
  await Promise.resolve()
  return { plugin, ctx, types, seats, mounts, pending, diagnostics,
    release: () => { for (const dispose of effects.reverse()) dispose?.() },
  }
}

test('the standalone browser bundle mounts the manager namespace and owns one native management tab', async () => {
  const h = await clientHarness()
  const { plugin, types, seats, mounts } = h
  assert.ok(plugin.inject.includes('sidebarRightTabs'))
  assert.ok(!plugin.inject.includes('betterSidebar'))
  assert.equal(types.size, 1)
  const definition = types.get('multi-git-repo-manager')
  assert.equal(definition.title(), '多代码仓管理')
  assert.equal(definition.keepMounted, true)
  assert.equal(definition.multiple, undefined)
  assert.equal(definition.guide.length, 1)
  assert.equal(definition.guide[0].order, 40)
  assert.match(definition.guide[0].description(), /Git/)
  assert.ok(![...seats.keys()].some(key => key.startsWith('conversation.view:')))
  assert.equal(seats.size, 2)
  const body = seats.get(`sidebar.right.pane.tab:${definition.id}`)
  assert.equal(body.options.inject('A').sessionId, 'A')
  assert.equal(body.options.inject('B').sessionId, 'B')
  assert.equal(body.options.inject('A').ctx, h.ctx)
  assert.ok(seats.get(`sidebar.right.pane.tab.title:${definition.id}`))
  h.ctx.locale.active = 'en'
  assert.equal(definition.title(), 'Multi-repository management')
  assert.equal(definition.guide[0].title(), 'Multi-repository management')
  assert.equal(mounts[0].package, 'dsh-multi-git-repo-manager')
  assert.ok(mounts[0].descriptors.every(d => d.namespace === 'multiGitRepoManager'))
  h.release()
  await Promise.resolve()
  assert.equal(types.size, 0)
  assert.equal(seats.size, 0)
  assert.equal(mounts.length, 0)
})

test('delayed native slots and plugin unload leave no registrations behind', async () => {
  const h = await clientHarness({ delayed: true })
  assert.equal(h.seats.size, 0)
  for (const start of [...h.pending]) start()
  assert.equal(h.seats.size, 2)
  h.release()
  assert.equal(h.seats.size, 0)
  assert.equal(h.types.size, 0)
  const next = await clientHarness()
  assert.equal(next.types.size, 1)
  next.release()
})

test('a late native title failure rolls back the type and body', async () => {
  const h = await clientHarness({ delayed: true, failTitle: true })
  for (const start of [...h.pending]) start()
  assert.equal(h.types.size, 0)
  assert.equal(h.seats.size, 0)
  assert.match(String(h.diagnostics[0]?.[0]), /native slot registration failed/)
  h.release()
})

test('manager dictionaries have matching keys and follow the host language', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const [language, expected] of [['zh-CN', '多代码仓管理'], ['en', 'Multi-repository management']]) {
    const stop = attachLocale({ getSnapshot: () => ({ active: language }) })
    assert.equal(t('projectTab'), expected)
    if (language === 'zh-CN') {
      assert.equal(localizeReviewMessage('Project configuration file changed; reload before saving'), '工程配置文件已发生变化，请重新加载后再保存')
    }
    stop()
  }
})
