import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

interface DirectoryPickerRemote { pick(): Promise<RemoteResult<string | null>> }
interface DesktopDirectoryPicker { supportsDefaultPath?: boolean; pick(defaultPath: string): Promise<string | null> }
interface PickerContext { get(name: string): unknown }

/** Resolve only the picker we use: optional Cordis services require get(). */
export async function pickRepositoryDirectory(
  ctx: PickerContext,
  unavailableMessage: string,
  defaultPath: string,
  desktop = (globalThis as unknown as { __DSH_DIRECTORY_PICKER__?: DesktopDirectoryPicker }).__DSH_DIRECTORY_PICKER__,
): Promise<string | null> {
  if (desktop?.pick !== undefined) {
    if (desktop.supportsDefaultPath !== true) throw new Error(unavailableMessage)
    return await desktop.pick(defaultPath)
  }
  const picker = ctx.get('remote.directoryPicker') as DirectoryPickerRemote | undefined
  if (picker?.pick === undefined) throw new Error(unavailableMessage)
  const result = await picker.pick()
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}
