# 架构与公共接入

管理插件负责工程目标与具体文件归属；消费者负责自己的业务证据、比较和操作条件。使用方式见 [README](../README.md)、[中文手册](USER_GUIDE.md) / [English guide](USER_GUIDE.en.md)，发布流程见 [RELEASING](RELEASING.md)。

## 唯一所有权

| 能力 | 所有者 | 实现入口 |
| --- | --- | --- |
| v2 工程配置、原子保存、文件修订 | 管理插件 | `repository-project-file.ts` |
| Profile 工程根目录索引 | 管理插件 | `repository-settings.ts`、`repository-config.ts` |
| 目标类型、状态、身份 | 管理插件 | `managed-target.ts`、`repository-types.ts` |
| 发现容器与候选 | 管理插件 | `target-discovery.ts` |
| 文件真实路径、嵌套边界与归属 | 管理插件 | `target-ownership.ts` |
| 当前 Agent 范围、临时目标释放 | 管理插件 | `multi-git-repo-manager.ts` |
| 管理 Tab、目录选择、文案 | 管理插件 | `client/RepositorySettings.tsx`、`client/use-repository-settings.ts` |
| Git 比较、Diff、评论、确认、撤销与编辑器定位 | 审查消费者 | 消费者自身模块 |

管理包不依赖审查插件，不执行 Git 命令、修改源码或生成审查基线。审查插件不解析或保存管理配置，不维护第二份项目索引，不重复注册管理页面。

## 公共读取契约

正式类型从 `dsh-multi-git-repo-manager/types` 导入：

- `ManagedProject`：工程身份、启用状态、Git 仓库、普通目录及发现容器。
- `ManagedWorkspace`：工程、目标、Git 投影、边界、诊断与范围修订。
- `ManagedTarget`、`NamedManagedTarget`、`TargetPathResolution`：目标事实及具体路径判断。
- `ManagedWorkspaceReader`：消费者使用的最小只读接口。

```ts
import type { ManagedWorkspaceReader } from 'dsh-multi-git-repo-manager/types'

// reader 由 Host 注入的 multiGitRepoManagerByWqz 服务提供。
function createConsumer(reader: ManagedWorkspaceReader) {
  return {
    scope: reader.workspace.bind(reader),
    ownership: reader.resolveTargetPaths.bind(reader),
  }
}
```

接口的 `workspace(agent)` 和 `resolveTargetPaths(agent, paths)` 都是必需方法。消费者及测试替身必须同时提供它们，不能在归属方法缺失时按 `roots` 放行。

`targets`、`boundaries`、`workspaceRevision` 是完整工作区的必需字段；schema 与 Remote 编解码遵守同一契约。缺失字段明确失败。`repositories` 是 Git 目标投影，`roots` 只表示粗范围；两者都不能代替具体文件归属。`workspaceRevision` 是管理范围修订，不是 Git 内容版本。

保持 `multiGitRepoManagerByWqz` / `remote.multiGitRepoManagerByWqz` 服务标识，消费者以精确 peer `0.1.4` 共用宿主的一个服务实例。浏览器只使用纯 `/paths`、`/events`、`/service-names`；`/workspace`、`/project-file`、`/settings` 和主入口中的 Node 工具供管理实现与 Host 测试使用，普通业务消费者不直接写配置。

## 配置与会话

`dsh-multi-git-repo.json` 是唯一持久目标声明，统一采用 v2。文件位置确定工程根，机器根路径不写入 JSON。`repositories` 和 `directories` 为显式名称/路径列表；`discovery.containers` 可省略，读取后正规化为空列表。格式不匹配、未知字段、超过限制或持久外部目标均拒绝，不进行格式升级、清单导入或历史配置兼容。

Profile 仅保存 `projects: [{ root }]` 及 native settings 修订，作为定位索引。读取最近的工程文件并检查启用状态；索引本身不能授权范围。最近文件无效时明确失败，不能跳到父工程扩大范围；最近文件禁用时回到当前会话基础范围。无配置工程也使用当前会话目录的基础目标。

`project(agent)` 返回 `ManagedProjectPage`，其中含表单声明、文件修订和完整 `temporaryTargets`，不保留另一份 Git 专用临时集合。`saveProject` 固定当前会话工程身份，核对 SHA-256 文件修订，拒绝陈旧覆盖并原子保存；Profile 索引写入失败时已保存项目文件仍可读取。这不是跨存储事务，文件修订检查也是乐观并发保护。

工程内真实路径保存为相对路径。草稿中工程外行被排除出文件；必须显式通过 `setTemporaryTargets` 使用绝对路径纳入会话。临时集合按 Agent 和工程身份绑定，替换、Agent 释放、工程切换、插件卸载或重启均按对应生命周期处理；关闭 Tab 不等于释放 Agent。失败的临时集合替换恢复先前集合。

配置限制为 1 MiB、512 个目标和 32 个发现容器；文件归属接口每次最多 4096 个路径，内部每批 16 个。

## 目标与文件归属

`kind` 为 Git 或普通目录，独立于可用状态。Git 声明失去自身元数据为 `notGit`；普通目录出现自身 Git 元数据为 `kindMismatch`，需要显式转换。缺失、损坏、权限问题保留状态与原因。

工程根根据自身元数据分类；显式声明优先，不能用自动根分类掩盖显式类型不匹配。`capabilities.git` 表示自身可用 Git 元数据，不代表已安装 Git CLI、存在 HEAD 或能比较分支。Git 比较条件属于消费者。

最深目标优先，包含不可用目标；不可用子目标、未纳管的容器子目录和未知嵌套 Git 仓库不能继承父范围。发现只检查容器直接子目录，不读源码或运行工程脚本；候选须添加并保存后才纳管。容器本身不是自动目标。

`resolveTargetPaths` 返回 managed / unmanaged / unavailable / outside / metadata / error，逐项保留输入、路径、目标与原因。真实路径、目录联接、符号链接、Git 元数据和待创建文件都经过检查。修改配置后，消费者写文件前通过当前 Agent 的服务重新核对；管理事实不替代可信 before/after、内容冲突、宿主权限和维护锁。

目标 ID 由工程及真实目录身份生成，改名、类型转换不改目录身份。消费者历史记录、评论和确认使用自身业务身份，不能由目标改名改写。移除目标不删除磁盘目录。

## Remote 与管理界面

七个 Agent scoped 调用：`workspace`、`project`、`saveProject`、`directoryStart`、`discoverTargets`、`resolveTargetPaths`、`setTemporaryTargets`。所有调用通过官方 Agent lookup 解析接收会话，客户端不能提交可信 cwd 或根目录。Host 内部 `preview` 用于验证同一工程草稿。

管理 Tab 的 kind 为 `multi-git-repo-manager`，实现 id 为 `dsh-multi-git-repo-manager:repositories`，正文与标题由原生插槽注册。开始页提供入口，`keepMounted` 保留隐藏页面的草稿，正文注入所属会话。注册失败回滚，卸载清理注册和订阅；不再注册会话区管理页签。

表单重载和会话切换使旧异步回复失效。保存的后续临时集合写入使用原调用会话，失效后停止后续步骤；临时集合自动同步的迟到错误和通知也不得更新新表单。目录选择和发现遵守同样的请求版本检查。

## 通知与缓存边界

`/events` 通过 `Symbol.for` 共享同一浏览器全局的 EventTarget，使独立 bundle 共用通知。保存、临时目标修改后，消费者重新请求工作区；每个订阅返回释放函数。

这不是 Host 事件、磁盘 watcher 或多窗口同步。手改 JSON 使用显式重载，文件操作授权不依赖通知到达。本轮没有新增 Host 事件或监听框架。

管理临时状态以 Agent + 工程身份为键；Git 比较缓存、评论、确认和历史记录由消费者按自己的版本及记录身份维护，不放进管理服务。

## 构建与验证

先构建管理插件，再构建精确依赖它的审查插件。消费者本地链接指向管理的 `lib/types`，管理清理构建目录时不能并行构建消费者。

`pnpm typecheck`、`pnpm build`、`pnpm test` 验证契约、v2 保存、范围、真实 Cordis 服务、目录选择、事件及注册生命周期。`pnpm test:pack` 检查 tgz exports、内部模块、浏览器依赖与 SHA256，并保证临时方案文件不进入发布包。

本地配套版本为管理 0.1.4 / 审查 0.3.5。完整验证记录见 [版本记录](releases/version.md#v014)。本轮只整理两个维护工程，ref 插件没有接入或代码变更。
