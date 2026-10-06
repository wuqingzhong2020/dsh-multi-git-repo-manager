# dsh-multi-git-repo-manager

[简体中文](README.md) | [English](README.en.md)

当前版本：**v0.1.4**。

Host 服务与 Remote 命名空间为 `multiGitRepoManagerByWqz`，配套审查服务为 `multiGitFileReviewByWqz`。消费者可从 `dsh-multi-git-repo-manager/service-names` 导入稳定标识；升级时同步更新审查插件，服务标识及审查偏好保持；工程配置统一采用 v2，Profile 仅记录工程根目录索引。

**DeepSeek Harness 的公共 Git 仓库与非 Git 目录管理插件。** 从 [dsh-file-review-tab-Multi-git-repository](https://github.com/wuqingzhong2020/dsh-file-review-tab-Multi-git-repository) 提取公共管理能力，独立提供右侧原生「多代码仓管理」Tab。未来需要管理多个代码目录的插件可以共用工程配置、目标发现和文件归属，不必各自维护一套管理逻辑。

管理插件可独立运行。文件审查消费者 **v0.3.5** 精确依赖本插件 **0.1.4**；使用文件审查时需要同时安装并启用两个插件。差异计算、评论、确认和撤销／重做由消费者负责。本次拆分没有修改 `D:\projectZJGG\ref\dsh-file-review`。

## 使用文档

首次使用请阅读 [中文使用手册](docs/USER_GUIDE.md) 或 [English user guide](docs/USER_GUIDE.en.md)，其中说明原生 Tab 入口、类型选择、目录发现、保存、重载、临时目标和常见问题，并配有实际 Desktop 截图。

![实际 Desktop 中的多代码仓管理 Tab](docs/image/manager-after-restart.png)

进入工程会话，打开右侧栏，从「开始」页点击 **多代码仓管理**。右侧「+」打开的新标签页同样提供此入口；管理页支持切换、分栏和全屏，切换 Tab 时保留未保存表单。原会话顶部的管理页签已移除。当前管理页未提供单独的「操作指南」按钮，手册从本 README 打开。

## 开发文档

开发或排查问题前，请阅读 [架构与接入说明](docs/ARCHITECTURE.md)，其中说明 v2 配置、目标状态、发现边界和按文件路径的权威归属。

发布维护者另请阅读 [公开发布与插件市场收录](docs/RELEASING.md)。历史变化见 [版本记录](docs/releases/version.md)，验证边界见本文的 [开发与验证](#开发与验证)。

## 功能

- **Git 与普通目录统一管理**：添加、命名、编辑和移除两类目标，分别显示 Git、非 Git 目录和不可用数量。移除条目只改变配置，不删除磁盘目录。
- **右侧原生 Tab**：使用宿主 `sidebarRightTabs` 及正文／标题插槽，无需第三方侧栏插件；隐藏和切换 Tab 保留当前表单，窄侧栏按容器宽度调整布局。
- **工程级配置**：启停多目标范围、选择是否包含工程根目录，将内部目标保存到 `dsh-multi-git-repo.json`。可从工程子目录自动找到最近的配置文件。
- **统一 v2 配置**：Git 与普通目录使用显式列表，格式不匹配时拒绝；不提供清单导入或格式升级。
- **直接子目录发现**：使用可配置容器，例如 `project`、`project/plugins`；预览只产生候选，逐项添加并保存后才纳管，容器本身不会自动加入。
- **自身类型与状态检查**：识别 Git 根目录和 worktree 的 `.git` 文件；普通目录无自身 Git 时可用，类型不匹配、路径缺失或损坏元数据保留诊断。
- **会话临时目标**：工程外 Git 仓与普通目录使用绝对路径，仅当前会话有效，不写入项目 JSON；Agent 释放、插件卸载或进程重启会清理临时条目。
- **公共文件归属**：最深目标优先，不可用子目标、未知子仓和未纳管组件会阻断父目录兜底；通过真实路径复核链接、元数据路径和待创建文件。
- **保存与联动**：校验当前工程身份和项目文件哈希，原子写入并拒绝陈旧保存；配置变更通知连接独立构建的插件 bundle，消费者重新获取工作区。
- **宿主语言与目录选择**：跟随宿主中文／English 实时切换，保留用户输入；「打开」使用宿主目录选择服务，并将工程内目录转换为相对路径。

## 安装

目标接口为 **DSH 正式版 >=0.2.0**，同时保留 **0.2.0-rc.2** 测试通道。实际验证使用 Windows 的 `D:\app\DeepSeekHarnessDesktop\DeepSeek Harness.exe`，宿主为 0.2.0-rc.2。正式版／较新稳定版、完整 Web 宿主和其他平台尚未完成实际验证；声明的接口范围不等于全部平台均已验收。

本地安装包统一输出到多仓主工程根目录 `dist/`：`<包名>-<版本>.tgz` 按版本归档，同版本重新构建时覆盖，版本升级保留旧版本，内容完全一致的最新副本为 `dist/latest/dsh-multi-git-repo-manager.tgz`，配套 `.sha256` 和 `.json` 版本索引。从本插件目录访问为 `../../dist/`。独立检出时默认输出到仓库上一级的 `dist/`；打包脚本支持 `MRM_DIST_DIR` 指定目录。主工程 `python envBuild.py desktop install` 根据 latest 索引校验并安装对应历史包。公开安装则在 [GitHub Release](https://github.com/wuqingzhong2020/dsh-multi-git-repo-manager/releases) 上传约定资产后提供下载；本仓库的验证记录是本地交付记录，不代表已发布 Release。

### DeepSeek Harness Desktop

完全退出 Desktop，包括托盘进程，再在 PowerShell 中安装。将示例路径替换为实际下载或构建位置：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "D:\Downloads\dsh-multi-git-repo-manager-0.1.4.tgz"
```

使用配套文件审查时，可同时安装两个本地包：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "D:\Downloads\dsh-multi-git-repo-manager-0.1.4.tgz" "D:\Downloads\dsh-file-review-tab-multi-git-repository-0.3.5.tgz"
```

重新启动后，在「插件」页确认所需插件已启用，并从右侧开始页打开管理 Tab。**安装与启用是两件事**：DSH 0.2 只加载 `dsh.profile.bundles` 中选中的插件，安装 npm 依赖本身不会自动加载管理服务。管理插件可单独启用；使用审查消费者时两者均须启用。

同版本重新构建时，主工程 Desktop 安装命令会强制刷新本地包缓存；手动安装也需刷新缓存。安装后核对 Profile 中 Host／Client 文件与构建的哈希。仅看到版本号 0.1.4，不能证明使用了最新构建。

### 独立 Web Profile

在管理仓库根目录，用已有本地包安装：

```sh
$build = Get-Content ../../dist/latest/dsh-multi-git-repo-manager.json -Raw | ConvertFrom-Json
dsh plugin --profile web add ("../../dist/" + $build.history)
```

公开 Release 和同名资产准备完成后，可使用固定版本 URL：

```sh
dsh plugin --profile web add https://github.com/wuqingzhong2020/dsh-multi-git-repo-manager/releases/download/v0.1.4/dsh-multi-git-repo-manager-0.1.4.tgz
```

使用审查功能仍需安装并启用对应消费者；没有热重载时重启 `dsh web`。当前默认交付预构建 tgz。源码仓库安装对 `lib/` 的要求见 [发布指南](docs/RELEASING.md)，完整 Web 运行尚未实测。

### Desktop 目录选择起始路径适配

Desktop 0.2.0-rc.2 的原生目录选择接口缺少起始路径能力。若希望「打开」从填写的路径定位，可在完全退出 Desktop 后运行本包的兼容脚本；安装目录不同时修改第二个参数：

```powershell
node "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-multi-git-repo-manager\scripts\patch-desktop-directory-picker.mjs" "D:\app\DeepSeekHarnessDesktop\resources\app.asar"
```

脚本保留来源与窗口校验，在原文件旁生成 `app.asar.dsh-directory-picker-*.bak`；不匹配的宿主构建会停止，重复运行可识别已有适配。安装 tgz 不会自动修改 Desktop；宿主更新后需重新检查适配。此脚本现归管理插件维护，消费者只保留兼容转发入口。

## 配置工程

1. 在目标工程的会话中，从右侧「开始」页打开「多代码仓管理」。工程目录和项目名称由会话确定，只读显示。
2. 点击 **添加仓库或目录**，选择 **Git** 或 **非 Git 目录**，填写名称与路径，或用 **打开** 选择目录。
3. 选择是否启用多目标管理、是否包含工程根目录。没有项目文件时，点击 **生成新配置文件**；已有文件时点击 **保存配置**。
4. 检查下方两类目标的数量、来源和状态。直接编辑磁盘 JSON 后，点击 **重新加载已保存配置**；重载会用保存内容替换当前表单。

启用工程根目录时，根目录按自身元数据自动分类。工程根不是 Git 时，它会成为普通目录；其下独立 Git 子仓仍作为更深目标分别管理。只管理指定子目标时取消根目录选项。

### 配置示例

工程配置文件为 **`dsh-multi-git-repo.json`**。包含普通目录与发现容器的 v2 示例：

```json
{
  "version": 2,
  "enabled": true,
  "includeProjectRoot": false,
  "repositories": [{ "name": "Core", "path": "core" }],
  "directories": [
    { "name": "LocalComponent", "path": "project/LocalComponent" },
    { "name": "LocalPlugin", "path": "project/plugins/LocalPlugin" }
  ],
  "discovery": { "containers": ["project", "project/plugins"] }
}
```

Git 条目放在 `repositories`，普通目录放在 `directories`。工程根从配置文件位置推导。配置仅支持 v2，不导入历史清单或进行格式升级；未知字段、不合法路径或陈旧修订拒绝覆盖。

### 发现与临时目标

在发现容器中每行填写一个工程内路径，点击 **预览发现结果**。只检查直接子目录，逐项点击 **添加到列表** 后还需保存；容器本身不自动纳管，嵌套容器避免重复列为候选。

工程内目标保存相对路径；工程外目标，包括父目录、兄弟目录、跨盘目录和逃出工程的目录联接，须显式作为当前会话临时目标使用，路径为绝对路径，不写入 JSON。先生成工程配置，才能添加临时目标。移除条目只移除配置或会话引用，插件不会 clone、pull、初始化 Git 或删除源码。

配置限制为 **1 MiB、512 个目标、32 个发现容器**。具体状态、路径规则和排查步骤见 [使用手册](docs/USER_GUIDE.md)。

## 供其他插件复用

在消费者的 `package.json` 中声明必需的共享插件依赖，固定版本并由宿主安装同一个实例：

```json
{ "peerDependencies": { "dsh-multi-git-repo-manager": "0.1.4" } }
```

宿主通过 Cordis 注入服务：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from 'dsh-multi-git-repo-manager'

export const inject = ['multiGitRepoManagerByWqz']
export function apply(ctx: Context) {
  const workspaceFor = (agent: Agent) => ctx.multiGitRepoManagerByWqz.workspace(agent)
  const managedFile = async (agent: Agent, path: string) => {
    const [result] = await ctx.multiGitRepoManagerByWqz.resolveTargetPaths(agent, [path])
    if (result?.state !== 'managed') throw new Error(result?.reason ?? 'File has no managed owner')
    return result
  }
  // 将两者接入消费者已有服务；实际文件操作前重新调用 managedFile。
}
```

`workspace.targets` 是 Git 与普通目录的统一结果，`repositories` 是旧接口的 Git 投影。`roots` 仅用于粗范围展示，不能单独授权文件操作。消费者应通过 `resolveTargetPaths` 确认具体文件处于 `managed` 状态，读取、定位或写入前按当前会话重新复核；Git 功能只使用可用且 `capabilities.git` 为真的目标。

浏览器从 `sessions.scope(sessionId)?.get('remote.multiGitRepoManagerByWqz')` 获取当前会话的 Remote，先检查返回值 `ok`，再读取 `value` 或 `error.message`。会话作用域已经绑定 Agent，以下调用不再传入客户端自选的工程根或 Agent：

| 调用 | 返回及用途 |
| --- | --- |
| `workspace()` | 当前有效工作区、目标、边界及修订 |
| `project()` | 表单配置、配置状态、文件修订与会话临时目标 |
| `saveProject(request)` | 带 `project`、`revision`、`fileRevision` 的保存，返回更新后的表单 |
| `discoverTargets(project)` | 当前工程草稿的发现候选与警告，不自动启用候选 |
| `resolveTargetPaths(paths)` | 具体文件归属；最多 4096 个输入 |
| `setTemporaryTargets(entries)` | 替换当前会话的工程外目标集合；条目含 `name`、`path`、`kind` |
| `directoryStart(path)` | 根据当前工程与行路径取得目录选择起点 |

| 导出 | 用途 |
| --- | --- |
| 主入口 | `MultiGitRepoManager`、`RepositorySettings`、插件 `apply/Config/inject`、宿主路径及配置工具 |
| `/types` | `ManagedProject`、`ManagedWorkspace`、`ManagedWorkspaceReader`、`ManagedTarget`、`TargetPathResolution` 等中性类型 |
| `/workspace`、`/project-file`、`/schemas`、`/settings` | 工作区解析、配置读写、协议校验和 Profile 索引 |
| `/paths` | 浏览器路径转换、展示匹配与相对路径显示；不代替 Host 权威归属 |
| `/events` | `subscribeRepositories`、`repositoriesChanged`，跨独立插件 bundle 的变更通知 |
| `/service-names` | Host 服务名与会话 Remote 命名空间常量，不依赖宿主运行时 |
| `/settings-model`、`/directory-picker`、`/directory` | 草稿转换、浏览器目录选择和宿主起始目录验证 |
| `/remote`、`/typert` | DSH Typert 声明和严格会话协议 |

消费者可打包 `/paths`、`/events` 等纯浏览器工具，订阅通知后重新获取工作区；它们不依赖 Node 文件系统。事件总线连接独立 bundle，不是磁盘监听器。服务、Remote namespace 和管理 Tab 由本插件注册，消费者只注册自己的业务界面。完整边界见 [目标与文件归属](docs/ARCHITECTURE.md#目标与文件归属)。

## 常见问题

| 现象 | 检查方式 |
| --- | --- |
| 已安装但没有管理入口 | 确认当前 Profile 启用本插件、会话有工程目录，并在右侧开始页寻找入口；完整重启核对 Host／Client 加载 |
| 表单可以预览，却没有多目标审查 | 尚未生成并启用项目文件；旧 Profile 索引和发现候选只是预览 |
| 目录在父 Git 仓内却显示非 Git | 类型按该目录自身元数据判定；无独立 Git 的组件应选择普通目录 |
| 状态为类型不匹配 | 核对目录是否出现自身 Git 元数据，显式调整类型并保存 |
| 保存时提示配置已变化 | 先保留需要的草稿，再重新加载并合并修改；不要覆盖他人的文件修订 |
| 外部路径没有写入 JSON | 外部目标是会话临时数据；改为工程内路径才能随项目持久化 |
| 手工修改文件后消费者未刷新 | 管理通知不是文件系统监听，需重新加载配置 |

审查插件中的 **全部非 Git 目录** 是汇总筛选，`名称（非 Git 目录）` 是单个目标；两者不是两个重复的配置条目。普通目录支持哪些业务由消费者决定，管理插件本身不提供 Git 差异或手工编辑基线。

## 开发与验证

使用 Node.js 24 和 pnpm；先构建管理插件，再构建消费者：

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm test:pack
```

部分测试直接读取源码，另一些加载 `lib/`，功能修改后先构建再测试。Git 集成测试需要 PATH 中的 `git`，链接测试需要临时目录支持目录链接。测试使用临时工程，不依赖维护者真实工程路径。`test:pack` 生成 tgz 和 SHA256，并检查 exports、内部模块及归档内容。

消费者的 `pnpm-workspace.yaml` 仅在本地开发时把 `0.1.4` 指向相邻管理仓库，发布包仍声明精确版本。先构建并交付管理插件，再构建消费者。管理插件不反向依赖审查插件。

本轮回归覆盖 v2 配置、完整契约、临时目标隔离、文件归属、双包联装与浏览器交互；当前实机结果见 [版本记录](docs/releases/version.md#v014)。完整 Web、正式版和其他平台未完成实际验收。

## 公开发布与插件市场收录

当前采用 GitHub 源码仓库与预构建 Release tgz 交付，npm 发布为可选步骤。市场收录使用独立条目，和源码推送、Release 上传分别进行；先准备可安装产物，再按社区当前的 [贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) 提交收录。

本仓库提供 [发布指南](docs/RELEASING.md)、[v0.1.4 版本说明](docs/releases/version.md#v014) 与 [市场 YAML 模板](docs/market/wuqingzhong2020__dsh-multi-git-repo-manager.yml)。这些文件是维护资料，不表示已经推送、发布或收录。

## 致谢

公共管理能力来自本作者维护的 [dsh-file-review-tab-Multi-git-repository](https://github.com/wuqingzhong2020/dsh-file-review-tab-Multi-git-repository) 拆分。本插件使用 DSH 的 Cordis、Typert 和原生侧栏接口，审查业务继续由相应消费者维护。

## 许可证

[MIT](LICENSE)
