export const LOCALE_NS = 'multiGitRepoManagerByWqz'
export const zh = {
  remoteUnavailable: '多代码仓管理服务不可用',
  stateError: '错误',
  projectTab: '多代码仓管理',
  sidebarGuideDescription: '管理当前工程的 Git 仓库、非 Git 目录和会话临时目录',
  projectCurrentRoot: '当前工程目录',
  projectIntro: '为当前工程增删改 Git 仓库与非 Git 目录，保存到工程目录中的配置文件。仓库路径以当前工程目录为基准。',
  projectSave: '保存配置',
  projectGenerate: '生成新配置文件',
  projectReload: '重新加载已保存配置',
  projectSaved: '项目配置已保存',
  projectWorking: '处理中…',
  projectName: '项目名称',
  projectConfigFile: '工程配置文件（相对工程目录）',
  projectInactive: '当前工程没有配置文件（dsh-file-review-repositories.json）。点击上方「生成新配置文件」保存当前列表。',
  projectEnable: '启用多代码仓管理',
  projectDisabledHint: '已停用多代码仓管理，工作区将使用当前会话目录范围；保存配置后生效。',
  projectIncludeRoot: '同时包含项目根目录内的文件',
  projectRepos: '仓库与目录',
  projectReposHint: '工程内的仓库使用相对路径；工程外的仓库使用绝对路径，仅临时使用，不写入配置文件。',
  projectImportHint: '已导入原有仓库清单；保存后将写入本工程配置文件，不再依赖原清单。',
  projectAddRepo: '添加仓库或目录',
  projectOpenRepo: '打开',
  projectRemoveRepo: '删除',
  projectTemporary: '临时使用，不保存',
  projectTemporaryShort: '临时',
  projectTemporaryHint: '该仓库位于当前工程目录外，只在本会话临时使用，不写入配置文件。',
  projectPickerUnavailable: '目录选择服务不可用，或尚未安装 Desktop 起始目录适配；请更新适配后重启应用',
  projectPickerInvalid: '目录选择器没有返回绝对路径',
  projectDeleteTitle: '确认删除仓库？',
  projectDeleteDescription: '确定从列表移除“{name}”吗？不会删除磁盘目录；保存配置后列表改动才会写入文件。',
  projectCancel: '取消',
  projectResolved: '已识别 {count} / {total} 个 Git 仓库',
  projectPath: '路径（工程内相对，工程外绝对）',
  projectState: '状态',
  projectRootSource: '项目根目录',
  projectManual: '手动配置',
  repository: '仓库',
  repoReady: '可用',
  repoMissing: '路径不存在',
  repoNotGit: '不是 Git 根目录',
  targetKind: '类型', directoryKind: '非 Git 目录', kindMismatch: '类型已变化，请确认转换',
  targetsResolved: '可用 Git：{git} · 非 Git 目录：{directories} · 不可用：{unavailable}',
  discoveryTitle: '发现子目录', discoveryContainers: '发现容器（每行一个工程内路径）',
  discoveryHint: '只检查容器的直接子目录；逐项添加并保存后才纳管。容器本身不会自动加入。',
  discover: '预览发现结果', addCandidate: '添加到列表',
} as const
export type CopyKey = keyof typeof zh
export const en: Record<CopyKey, string> = {
  remoteUnavailable: 'Multi-repository management service is unavailable',
  stateError: 'error',
  projectTab: 'Multi-repository management',
  sidebarGuideDescription: 'Manage Git repositories, non-Git directories and session-only targets',
  projectCurrentRoot: 'Current project directory',
  projectIntro: 'Add, edit, and remove Git repositories and non-Git directories for this project. Save them to a configuration file in the project directory. Paths are relative to the project directory.',
  projectSave: 'Save configuration',
  projectGenerate: 'Generate new configuration file',
  projectReload: 'Reload saved configuration',
  projectSaved: 'Project configuration saved',
  projectWorking: 'Working…',
  projectName: 'Project name',
  projectConfigFile: 'Project configuration file (relative to project)',
  projectInactive: 'This project has no configuration file (dsh-file-review-repositories.json). Click "Generate new configuration file" above to save the list.',
  projectEnable: 'Enable multi-repository management',
  projectDisabledHint: 'Multi-repository management is disabled. The workspace will use the current session directory; save configuration to apply.',
  projectIncludeRoot: 'Also include files within the project root',
  projectRepos: 'Repositories',
  projectReposHint: 'Repositories inside the project use relative paths. Outside repositories use absolute paths for this session only and are excluded from the configuration file.',
  projectImportHint: 'Existing manifest entries have been imported. Saving writes the project configuration file and removes the manifest dependency.',
  projectAddRepo: 'Add repository',
  projectOpenRepo: 'Open',
  projectRemoveRepo: 'Remove',
  projectTemporary: 'Temporary, not saved',
  projectTemporaryShort: 'Temp',
  projectTemporaryHint: 'This repository is outside the project. It is temporary for this session and will not be written to the configuration file.',
  projectPickerUnavailable: 'Directory picker unavailable, or the Desktop starting-directory adapter is missing; update the adapter and restart',
  projectPickerInvalid: 'The directory picker did not return an absolute path',
  projectDeleteTitle: 'Remove this repository?',
  projectDeleteDescription: 'Remove “{name}” from the list? The directory on disk stays intact; the list change is written when you save.',
  projectCancel: 'Cancel',
  projectResolved: '{count} / {total} Git repositories available',
  projectPath: 'Path (relative inside project, absolute outside)',
  projectState: 'Status',
  projectRootSource: 'Project root',
  projectManual: 'Manual',
  repository: 'Repository',
  repoReady: 'Ready',
  repoMissing: 'Missing path',
  repoNotGit: 'Not a Git root',
  targetKind: 'Type', directoryKind: 'Non-Git directory', kindMismatch: 'Type changed; confirm conversion',
  targetsResolved: 'Ready Git: {git} · directories: {directories} · unavailable: {unavailable}',
  discoveryTitle: 'Discover child directories', discoveryContainers: 'Discovery containers (one project path per line)',
  discoveryHint: 'Inspect immediate children only. Add selected candidates and save to manage them. Containers are not added automatically.',
  discover: 'Preview discovery', addCandidate: 'Add to list',
}

export interface ReviewLocaleSource {
  getSnapshot(): { active: string }
  subscribe?(listener: () => void): () => void
}
export type ReviewLocale = 'zh' | 'en'
const localeListeners = new Set<() => void>()
let localeAttachment: { service: ReviewLocaleSource | undefined; unsubscribe?: (() => void) | undefined } | undefined
const notifyLocale = () => { for (const listener of localeListeners) listener() }

/** Follow the host's General settings language; dispose on plugin disable/HMR. */
export function attachLocale(service: ReviewLocaleSource | undefined): () => void {
  localeAttachment?.unsubscribe?.()
  const attachment = { service, unsubscribe: service?.subscribe?.(notifyLocale) }
  localeAttachment = attachment
  notifyLocale()
  return () => {
    if (localeAttachment !== attachment) return
    attachment.unsubscribe?.()
    localeAttachment = undefined
    notifyLocale()
  }
}

export function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener)
  return () => { localeListeners.delete(listener) }
}

/** The active locale id ('zh' | 'en'): the DSH locale service's snapshot when attached. */
export function getLocaleSnapshot(): ReviewLocale {
  const active = localeAttachment?.service?.getSnapshot().active
    ?? (typeof navigator !== 'undefined' ? navigator.language : '')
    ?? 'en'
  return active.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** Translate a copy key; `{name}` placeholders interpolate from `params`. */
export function t(key: CopyKey, params?: Record<string, string | number>): string {
  const dict = getLocaleSnapshot() === 'zh' ? zh : en
  let text: string = dict[key]
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
