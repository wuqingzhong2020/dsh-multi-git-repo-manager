# dsh-multi-git-repo-manager

已支持 Git 仓库与非 Git 目录统一管理、类型转换提示、容器直接子目录发现和按文件路径的权威归属。v1/v2 配置、迁移备份与扩展 API 见 [统一目录管理](docs/MANAGED_TARGETS.md)。

本轮类型检查、构建、自动测试、双包联装及指定 Desktop 的实际验证见 [实施验证记录](docs/NON_GIT_VERIFICATION.md)。

[简体中文](README.md) | [English](README.en.md)

当前版本：**v0.1.2**。DeepSeek Harness 的公共多 Git 仓库管理插件。

本插件从 `dsh-file-review-tab-Multi-git-repository` 提取多仓库管理能力，独立提供右侧原生「多代码仓管理」Tab、工程配置、仓库解析及会话内临时仓库。其他插件通过同一个 `multiGitRepoManager` 服务取得工作区和可信根目录。

进入工程会话，打开右侧栏，在「开始」页点击「多代码仓管理」。也可通过右侧新标签页的开始页面打开。管理页与「文件审查」使用同一套原生 Tab 机制，支持切换、分栏与全屏；切换 Tab 时保留未保存的表单。会话顶部原管理页签已移除。

## 功能

- 增加、编辑、删除仓库条目，重新加载和保存当前工程配置；删除条目不会删除磁盘目录。
- 工程内仓库保存相对路径；工程外仓库只在当前会话临时使用，不保存机器绝对路径。
- 识别普通 Git 根目录和 worktree 的 `.git` 文件，预览不存在、非 Git、错误和可用状态。
- 查找当前目录及其父目录的工程配置，匹配 Profile 中的工程索引，导入 JSON、INI 和 `.gitmodules` 清单。
- 支持启停多仓库范围、是否包含工程根目录、仓库去重、嵌套路径归属、目录选择及中英文切换。
- 宿主验证真实路径、项目身份和文件修订，使用原子写入保存配置；临时仓库按会话隔离。

## 安装和兼容

构建后得到 `dist/dsh-multi-git-repo-manager-0.1.2.tgz`。在 Desktop 的插件页安装并启用这个包；使用文件审查时，同时安装并启用 `dsh-file-review-tab-multi-git-repository`。

**DSH 的 npm 依赖安装与插件启用是两件事。** 当前 DSH 0.2 的 Profile 只加载 `dsh.profile.bundles` 中选中的插件。只安装审查插件的 npm 依赖不会自动选中管理插件；需要同时选中两个插件，`multiGitRepoManager` 服务才能启动。管理插件不需要文件审查插件即可独立运行。

面向独立 Web Profile 的本地包安装示例：

```powershell
dsh plugin --profile web add .\dist\dsh-multi-git-repo-manager-0.1.2.tgz
```

本版本为兼容旧工程，继续使用 **`dsh-file-review-repositories.json`**（读取格式版本 1 / 2）。现有配置无需改名或重建；未来插件应读取本服务，而不是自行实现另一份配置。旧审查插件的 Profile 工程索引由消费者导入，保存时写入管理插件自己的设置空间。

Desktop 起始目录选择的兼容适配脚本已归本插件所有。旧版 Desktop 缺少 `supportsDefaultPath` 时，需按旧适配流程关闭 Desktop 后运行 `scripts/patch-desktop-directory-picker.mjs <resources/app.asar>`；本插件安装和测试不会自动修改 Desktop。Web 使用宿主可用的目录选择服务。

`D:\projectZJGG\ref\dsh-file-review` 暂未接入本插件。

## 供其他插件复用

在消费者的 `package.json` 中声明必需的共享插件依赖，固定版本并由宿主安装同一个实例：

```json
{ "peerDependencies": { "dsh-multi-git-repo-manager": "0.1.2" } }
```

宿主通过 Cordis 注入服务：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from 'dsh-multi-git-repo-manager'

export const inject = ['multiGitRepoManager']
export function apply(ctx: Context) {
  const workspaceFor = (agent: Agent) => ctx.multiGitRepoManager.workspace(agent)
  // 把 workspaceFor 传给当前插件需要仓库范围的功能。
}
```

浏览器从当前会话获取 `scope.get('remote.multiGitRepoManager')`，调用 `workspace()`、`project()`、`saveProject(request)`、`setTemporaryTargets(entries)`、`resolveTargetPaths(paths)`、`discoverTargets(project)` 或 `directoryStart(path)`；旧 `setTemporaryRepositories(entries)` 保留为 Git 专用兼容接口。先检查返回值的 `ok`，再读取 `value` 或 `error.message`。Remote 的挂载及管理页签由本插件负责，消费者不应重复注册。

| 导出 | 用途 |
| --- | --- |
| 主入口 | `MultiGitRepoManager`、`RepositorySettings`、插件 `apply/Config/inject`、宿主路径及配置工具 |
| `/types` | `RepositoryProject`、`NamedRepository`、`RepositoryWorkspace` 等类型；保留旧 `Review*` 类型别名兼容消费者 |
| `/workspace`、`/project-file`、`/schemas` | 工作区解析、配置读写、协议校验 |
| `/paths` | 浏览器路径转换、仓库归属与相对路径显示 |
| `/events` | `subscribeRepositories`、`repositoriesChanged`，跨独立插件 bundle 的变更通知 |
| `/settings-model`、`/directory-picker`、`/directory` | 草稿转换、浏览器目录选择和宿主起始目录验证 |
| `/remote`、`/typert` | DSH Typert 声明和严格会话协议 |

消费者浏览器 bundle 可打包 `/paths` 和 `/events` 等纯工具，并订阅配置变化后重新获取工作区。事件总线通过浏览器共享事件目标连接独立 bundle；它不是磁盘文件监听器。手动修改 JSON 后，仍需点击重新加载。

## 开发与验证

使用 Node.js 24 和 pnpm；先构建管理插件，再构建消费者：

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:pack
```

消费者的 `pnpm-workspace.yaml` 仅在本地开发时把 `0.1.2` 指向相邻管理插件目录；发布包仍声明精确版本 `0.1.2`，不包含本地链接。发布时先交付管理插件，再交付消费者。发布步骤与边界见 [架构与发布说明](docs/ARCHITECTURE.md)。
