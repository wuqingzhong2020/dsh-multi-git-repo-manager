import { en, getLocaleSnapshot, t, zh, type CopyKey } from './locales.ts'

/** Host diagnostics stay language-neutral on the wire and translate at render. */
const diagnostics: Readonly<Record<string, string>> = {
  'session has no workspace directory': '当前会话没有工作区目录',
  'Project root does not belong to this session': '工程根目录不属于当前会话',
  'Enable this project before adding temporary targets': '请先启用该工程，再添加临时目标',
  'Temporary targets must use absolute paths outside the project': '临时目标必须使用工程目录外的绝对路径',
  'dsh-multi-git-repo.json requires configuration version 2': 'dsh-multi-git-repo.json 必须使用 v2 配置格式',
  'Persisted targets must be inside the project': '持久目标必须位于工程目录内',
  'Discovery containers must be inside the project': '发现容器必须位于工程目录内',
  'A target cannot be declared as both Git and directory': '同一目标不能同时声明为 Git 仓库和普通目录',
  'Project exceeds 512 managed targets': '工程包含超过 512 个管理目标',
  'Path batch exceeds 4096 files': '单批路径超过 4096 个文件',
  'Native project settings are unavailable': '宿主工程设置服务不可用',
  'Project configuration file changed; reload before saving': '工程配置文件已发生变化，请重新加载后再保存',
  'Project root must be an absolute path': '工程根目录必须为绝对路径',
  'Project root is not a directory': '工程根路径不是目录',
  'Configuration file exceeds 1 MiB': '配置文件超过 1 MiB',
  'Repository path is not a directory': '仓库路径不是目录',
  'Session is unavailable': '会话不可用',
}
const copyKeys = new Map<string, CopyKey>()
for (const key of Object.keys(en) as CopyKey[]) {
  copyKeys.set(en[key], key)
  copyKeys.set(zh[key], key)
}
const englishDiagnostics = new Map(Object.entries(diagnostics).map(([english, chinese]) => [chinese, english]))

/** Preserve paths, Git output and unrecognized technical details verbatim. */
export function localizeReviewMessage(message: string): string {
  const key = copyKeys.get(message)
  if (key) return t(key)
  if (getLocaleSnapshot() === 'en') return englishDiagnostics.get(message) ?? message
  if (diagnostics[message]) return diagnostics[message]
  const repository = /^repository (\d+) has no path$/.exec(message)
  if (repository) return `第 ${repository[1]} 个仓库没有路径`
  const file = /^(.+)( must be a regular file| exceeds 1 MiB)$/.exec(message)
  if (file) return file[1] + (file[2] === ' must be a regular file' ? ' 必须为普通文件' : ' 超过 1 MiB')
  const separator = message.lastIndexOf(': ')
  if (separator >= 0) {
    const suffix = message.slice(separator + 2)
    const localized = localizeReviewMessage(suffix)
    if (localized !== suffix) return message.slice(0, separator + 2) + localized
  }
  return message
}
