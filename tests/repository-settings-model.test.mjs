import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectTemporaryTargets, createRepositoryDraft, draftTargets, prepareProjectForSave } from '../src/client/repository-settings-model.ts'
import { relativeProjectDirectory } from '../src/client/repository-paths.ts'
const project = extra => ({ name: 'App', root: 'D:/Projects/App', enabled: true, includeProjectRoot: true,
  repositories: [], directories: [], discovery: { containers: [] }, ...extra })

test('saving normalizes complete Git and directory rows without changing the draft', () => {
  const draft = project({ name: ' App ', repositories: [
    { name: ' Core ', path: ' d:/projects/app/libs/core ' }, { name: ' Outside ', path: '../Shared' },
    { name: '', path: 'unnamed' }, { name: 'Missing', path: ' ' },
  ], directories: [{ name: ' Local ', path: ' ./local ' }] })
  const original = structuredClone(draft)
  const saved = prepareProjectForSave(draft)
  assert.deepEqual(saved.repositories, [{ name: 'Core', path: 'libs/core' }, { name: 'Outside', path: 'D:/Projects/Shared' }])
  assert.deepEqual(saved.directories, [{ name: 'Local', path: 'local' }])
  assert.equal(saved.name, 'App')
  assert.deepEqual(draft, original)
})

test('empty lists preserve explicit disabled and root toggles', () => {
  const saved = prepareProjectForSave(project({ enabled: false, includeProjectRoot: false }))
  assert.equal(saved.enabled, false); assert.equal(saved.includeProjectRoot, false)
  assert.deepEqual(collectTemporaryTargets(saved), [])
})

test('the editor retains unavailable declarations and merges both temporary kinds', () => {
  const original = project({ repositories: [{ name: 'Missing', path: 'missing' }], directories: [{ name: 'Local', path: 'local' }] })
  const temporary = [{ name: 'Git', path: 'E:/Git', kind: 'git' }, { name: 'Directory', path: 'F:/Local', kind: 'directory' }]
  const draft = createRepositoryDraft(original, temporary)
  assert.deepEqual(draftTargets(draft), [
    { name: 'Missing', path: 'missing', kind: 'git' }, temporary[0],
    { name: 'Local', path: 'local', kind: 'directory' }, temporary[1],
  ])
  assert.deepEqual(original.repositories, [{ name: 'Missing', path: 'missing' }])
})

test('external rows use absolute session paths while interior rows stay relative', () => {
  const draft = project({ repositories: [
    { name: 'Root', path: '.' }, { name: 'Inside', path: 'd:/projects/APP/lib' },
    { name: ' Parent ', path: '../Shared' }, { name: 'Other drive', path: 'E:/Tools/./' },
  ], directories: [{ name: 'Directory', path: 'F:/Local' }] })
  assert.deepEqual(collectTemporaryTargets(draft), [
    { name: 'Parent', path: 'D:/Projects/Shared', kind: 'git' },
    { name: 'Other drive', path: 'E:/Tools', kind: 'git' },
    { name: 'Directory', path: 'F:/Local', kind: 'directory' },
  ])
})

test('POSIX spelling and sibling prefixes do not change containment', () => {
  const draft = project({ root: '/work/App', directories: [
    { name: 'Inside', path: '/work/App/lib' }, { name: 'Case', path: '/work/app/lib' },
    { name: 'Sibling', path: '/work/App-other/lib' },
  ] })
  assert.deepEqual(collectTemporaryTargets(draft).map(row => row.path), ['/work/app/lib', '/work/App-other/lib'])
  assert.equal(relativeProjectDirectory('/work/App', '/work/App'), '.')
  assert.equal(relativeProjectDirectory('/work/App', '/work'), null)
})
