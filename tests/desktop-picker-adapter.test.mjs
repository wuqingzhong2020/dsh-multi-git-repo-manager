import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { patchArchive } from '../scripts/patch-desktop-directory-picker.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function fixture() {
  const main = Buffer.from('ipcMain.handle(DESKTOP_IPC.directoryPick, async (event) => { assertDesktopSender(event, ["app"]); return dialog.showOpenDialog(window, { properties: ["openDirectory", "createDirectory"] }); });')
  const preload = Buffer.from('electron.contextBridge.exposeInMainWorld("__DSH_DIRECTORY_PICKER__", { pick: () => electron.ipcRenderer.invoke(DESKTOP_IPC.directoryPick) });')
  const untouched = Buffer.from('keep existing plugin loader and native code')
  const entry = (bytes, offset) => ({ size: bytes.length, offset: String(offset), integrity: { algorithm: 'SHA256', hash: hash(bytes), blockSize: 4194304, blocks: [hash(bytes)] } })
  const header = { files: { lib: { files: {
    'main.js': entry(main, 0), 'preload-app.cjs': entry(preload, main.length),
    'unchanged.js': entry(untouched, main.length + preload.length),
    'native.node': { size: 10, unpacked: true }, 'alias': { link: 'lib/unchanged.js' },
  } } } }
  const json = Buffer.from(JSON.stringify(header))
  const pickle = Buffer.alloc(8 + json.length + (4 - json.length % 4) % 4)
  pickle.writeUInt32LE(pickle.length - 4, 0); pickle.writeUInt32LE(json.length, 4); json.copy(pickle, 8)
  const size = Buffer.alloc(8); size.writeUInt32LE(4, 0); size.writeUInt32LE(pickle.length, 4)
  return Buffer.concat([size, pickle, main, preload, untouched])
}
function unpack(bytes) {
  const header = JSON.parse(bytes.subarray(16, 16 + bytes.readUInt32LE(12)).toString())
  const entries = header.files.lib.files
  const file = name => { const e = entries[name]; const start = 8 + bytes.readUInt32LE(4) + Number(e.offset); return bytes.subarray(start, start + e.size) }
  return { entries, file }
}

test('Desktop adapter forwards the start path, preserving sender guards and all other entries', () => {
  const original = fixture()
  const old = unpack(original)
  const patched = patchArchive(original)
  const next = unpack(patched)
  assert.match(next.file('main.js').toString(), /async \(event, defaultPath\)/)
  assert.match(next.file('main.js').toString(), /assertDesktopSender\(event, \["app"\]\)/)
  assert.match(next.file('main.js').toString(), /\{ defaultPath \}/)
  assert.match(next.file('preload-app.cjs').toString(), /directoryPick, defaultPath/)
  for (const name of ['unchanged.js', 'native.node', 'alias']) assert.deepEqual(next.entries[name], old.entries[name])
  assert.deepEqual(next.file('unchanged.js'), old.file('unchanged.js'))
  for (const name of ['main.js', 'preload-app.cjs']) assert.equal(next.entries[name].integrity.hash, hash(next.file(name)))
  assert.equal(patchArchive(patched), null)
})

test('Unknown or damaged Desktop archives fail before any changes', () => {
  assert.throws(() => patchArchive(Buffer.from('invalid')), /Invalid ASAR/)
  const damaged = fixture(); damaged[damaged.length - 50] ^= 1
  assert.throws(() => patchArchive(damaged), /integrity mismatch/)
})
