import { en, getLocaleSnapshot, t, zh, type CopyKey } from './locales.ts'

/** Host diagnostics stay language-neutral on the wire and translate at render. */
const diagnostics: Readonly<Record<string, string>> = {
  'legacy mutation exceeds the 256 KiB capture budget': '旧版修改记录超过 256 KiB 捕获限制',
  'symbolic links are not supported': '不支持符号链接',
  'path is not a regular file': '路径不是普通文件',
  'resolved path is outside the configured project repositories': '解析后的路径不在已配置的工程仓库范围内',
  'change has no complete reversible diff': '此更改没有完整的可还原差异',
  'session has no workspace directory': '当前会话没有工作区目录',
  'Project root does not belong to this session': '工程根目录不属于当前会话',
  'Enable this project before adding temporary repositories': '请先启用该工程，再添加临时仓库',
  'Temporary repositories must use absolute paths outside the project': '临时仓库必须使用工程目录外的绝对路径',
  'Invalid repository file path': '无效的仓库文件路径',
  'File resolves outside the repository': '文件解析后的路径位于仓库外',
  'Repository is outside this session': '仓库不在当前会话的范围内',
  'Native project settings are unavailable': '宿主工程设置服务不可用',
  'Project configuration file changed; reload before saving': '工程配置文件已发生变化，请重新加载后再保存',
  'JSON must contain an array or a repositories array': 'JSON 必须包含数组或 repositories 数组',
  'Supported formats: .ini, .gitmodules, .json': '支持的格式：.ini、.gitmodules、.json',
  'No section with a path field was found': '未找到包含 path 字段的节',
  'Project root must be an absolute path': '工程根目录必须为绝对路径',
  'Project root is not a directory': '工程根路径不是目录',
  'Configuration file exceeds 1 MiB': '配置文件超过 1 MiB',
  'Configuration file exceeds 512 repositories': '配置文件包含超过 512 个仓库',
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
