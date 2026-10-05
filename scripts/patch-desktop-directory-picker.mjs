import { createHash } from 'node:crypto'
import { copyFile, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const oldHandler = 'ipcMain.handle(DESKTOP_IPC.directoryPick, async (event) => {'
const newHandler = 'ipcMain.handle(DESKTOP_IPC.directoryPick, async (event, defaultPath) => {'
const oldDialog = 'dialog.showOpenDialog(window, { properties: ["openDirectory", "createDirectory"] })'
const newDialog = 'dialog.showOpenDialog(window, { properties: ["openDirectory", "createDirectory"], ...(typeof defaultPath === "string" && defaultPath.length <= 4096 && !defaultPath.includes("\\0") ? { defaultPath } : {}) })'
const oldBridge = 'electron.contextBridge.exposeInMainWorld("__DSH_DIRECTORY_PICKER__", { pick: () => electron.ipcRenderer.invoke(DESKTOP_IPC.directoryPick) });'
const newBridge = 'electron.contextBridge.exposeInMainWorld("__DSH_DIRECTORY_PICKER__", { supportsDefaultPath: true, pick: (defaultPath) => electron.ipcRenderer.invoke(DESKTOP_IPC.directoryPick, defaultPath) });'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('Unsupported Desktop code; expected exactly one directory-picker entry. No files changed.')
  return source.replace(before, after)
}

/** Append the two changed files, preserving every other packed byte and entry. */
export function patchArchive(archive) {
  if (archive.length < 16 || archive.readUInt32LE(0) !== 4) throw new Error('Invalid ASAR header')
  const headerSize = archive.readUInt32LE(4)
  const dataStart = 8 + headerSize
  const jsonSize = archive.readUInt32LE(12)
  if (headerSize < 8 || dataStart > archive.length || jsonSize > headerSize - 8) throw new Error('Invalid ASAR size')
  const header = JSON.parse(archive.subarray(16, 16 + jsonSize).toString())
  const entries = ['main.js', 'preload-app.cjs'].map(name => {
    const entry = header.files?.lib?.files?.[name]
    if (entry === undefined || entry.unpacked || entry.link) throw new Error(`Unsupported Desktop file: lib/${name}`)
    const offset = Number(entry.offset)
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(entry.size) || entry.size < 0 || dataStart + offset + entry.size > archive.length) throw new Error('Invalid ASAR file offset')
    const bytes = archive.subarray(dataStart + offset, dataStart + offset + entry.size)
    if (entry.integrity?.hash !== undefined && entry.integrity.hash !== hash(bytes)) throw new Error(`Desktop integrity mismatch: lib/${name}`)
    return { entry, source: bytes.toString() }
  })
  const [main, preload] = entries
  if (main.source.includes(newHandler) && main.source.includes(newDialog) && preload.source.includes(newBridge)) return null
  const buffers = [
    Buffer.from(replaceOnce(replaceOnce(main.source, oldHandler, newHandler), oldDialog, newDialog)),
    Buffer.from(replaceOnce(preload.source, oldBridge, newBridge)),
  ]
  let offset = archive.length - dataStart
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].entry
    const bytes = buffers[i]
    const blockSize = entry.integrity?.blockSize ?? 4194304
    if (!Number.isSafeInteger(blockSize) || blockSize < 1) throw new Error('Invalid ASAR integrity block size')
    const blocks = []
    for (let at = 0; at < bytes.length; at += blockSize) blocks.push(hash(bytes.subarray(at, at + blockSize)))
    Object.assign(entry, { size: bytes.length, offset: String(offset), integrity: { algorithm: 'SHA256', hash: hash(bytes), blockSize, blocks } })
    offset += bytes.length
  }
  const json = Buffer.from(JSON.stringify(header))
  const pickle = Buffer.alloc(8 + json.length + (4 - json.length % 4) % 4)
  pickle.writeUInt32LE(pickle.length - 4, 0)
  pickle.writeUInt32LE(json.length, 4)
  json.copy(pickle, 8)
  const size = Buffer.alloc(8)
  size.writeUInt32LE(4, 0)
  size.writeUInt32LE(pickle.length, 4)
  return Buffer.concat([size, pickle, archive.subarray(dataStart), ...buffers])
}

async function applyPatch(filename, checkOnly) {
  const archive = await readFile(filename)
  const patched = patchArchive(archive)
  if (patched === null) { console.log('Desktop directory picker already supports a starting directory.'); return }
  if (checkOnly) { console.log('Desktop directory-picker starting-directory adapter is required.'); return }
  // Refuse an integrity-enforced installation; never modify executable fuses.
  const exe = await readFile(join(dirname(dirname(filename)), 'DeepSeek Harness.exe'))
  const marker = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX')
  const fuse = exe.indexOf(marker) + marker.length
  if (fuse < marker.length || exe[fuse] !== 1 || exe[fuse + 1] < 5 || exe[fuse + 6] !== 48) throw new Error('Desktop integrity policy does not permit this compatibility adapter. No files changed.')
  if (patchArchive(patched) !== null) throw new Error('Patched archive verification failed')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${filename}.dsh-directory-picker-${stamp}.bak`
  await copyFile(filename, backup)
  const temporary = `${filename}.dsh-directory-picker-${stamp}.tmp`
  await writeFile(temporary, patched, { flag: 'wx' })
  await rename(temporary, filename)
  console.log(`Desktop directory picker adapted. Original archive: ${backup}`)
}

export async function runDirectoryPickerAdapter(args = process.argv.slice(2)) {
  const filename = args[0]
  if (filename === undefined) throw new Error('Close Desktop, then run: node scripts/patch-desktop-directory-picker.mjs <resources/app.asar> [--check]')
  await applyPatch(resolve(filename), args.includes('--check'))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runDirectoryPickerAdapter()
}
