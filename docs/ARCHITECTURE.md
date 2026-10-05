# 架构与发布说明

新增普通目录模型、发现与归属边界见 [统一目录管理](MANAGED_TARGETS.md)。

## 所有权

管理插件负责项目文件、Profile 索引、仓库清单解析、真实路径、Git 根目录检查、会话内临时仓库、目录选择、管理页签和多语言文案。文件审查、Git 差异计算、撤销/重做、生命周期记录、评论和轮次确认仍由消费者负责。

`src/multi-git-repo-manager.ts` 提供宿主服务；`src/repository-*.ts` 提供配置、路径和工作区工具；`src/client/RepositorySettings.tsx` 与 `use-repository-settings.ts` 提供管理界面和表单流程。管理插件不导入或依赖任何审查插件。

## 服务与配置

服务 key 与 Remote namespace 均为 `multiGitRepoManager`。八个 Remote 调用的第一个参数均由 DSH 的 `agent` lookup 从接收会话解析，客户端不能自行提交 cwd 或可信根目录。宿主内部还提供 `preview` 和旧索引导入方法。

`project()` 找到当前会话最近的配置文件或匹配的 Profile 索引，`workspace()` 只启用存在且已启用的项目文件；旧清单可供迁移预览，但不会隐式扩大文件操作范围。`saveProject()` 固定当前工程身份，过滤外部绝对路径，以文件哈希拒绝陈旧保存，并原子写入项目文件；Profile 索引保存失败时项目文件仍有效。

`.volatile()` 配置以只读引用传入宿主，`apply()` 使用 `.get()` 读取并验证其快照。旧审查插件的隐藏 `projects` 字段仅供迁移；管理插件按根目录合并旧索引，并优先保留自身已有配置。保存后写入管理插件的 native settings namespace。

项目文件名仍为 `dsh-file-review-repositories.json`，读取格式版本 1 / 2；使用非 Git 目录或发现容器时写入版本 2。配置根目录从文件所在目录推导，不保存机器根路径；外部条目仅保存在按 Agent id 区分的 Map 中。

## 前端联动

管理插件独立注册 `sidebarRightTabs` 原生类型，kind 为 `multi-git-repo-manager`，实现 id 为 `dsh-multi-git-repo-manager:repositories`。正文与标题分别注册在 `sidebar.right.pane.tab`、`sidebar.right.pane.tab.title`，开始页 guide 入口排在文件审查之后。`keepMounted: true` 保留隐藏 Tab 的未保存表单，正文通过插槽注入固定所属会话。旧 `conversation.view:repositories` 不再注册；消费者只注册自己的审查界面。

注册资源由 effect 管理，迟到的插槽声明也可挂载；任一注册失败会撤销已挂载的类型及插槽。标题和 guide 文案跟随宿主语言。表单使用容器查询适应窄侧栏，不依赖整个窗口宽度。

`/paths`、`/events` 等纯工具可以打包进消费者。`/events` 用 `Symbol.for` 在同一浏览器全局保存 EventTarget，因此两个独立构建的 bundle 仍共享变更通知；每个订阅返回清理函数，支持卸载和热重载。管理配置保存及临时仓库更新后发出通知，审查侧重新请求 `remote.multiGitRepoManager.workspace()`。

## 构建与发布

1. `pnpm install --frozen-lockfile`。
2. `pnpm build` 清理本包 `lib` 后生成宿主 ESM、浏览器 ModuleLoader CJS 和类型声明。
3. `pnpm test` 验证配置、清单、路径、临时仓库、会话隔离、跨 bundle 通知、真实 Cordis 加载与界面注册。
4. `pnpm test:pack` 检查实际 tgz 文件、全部 exports、内部相对导入、浏览器运行依赖及 SHA256。
5. 将 `dist/dsh-multi-git-repo-manager-0.1.2.tgz` 与 `.sha256` 交付或上传到 `v0.1.2` Release。npm 发布和远程 Release 发布需要维护者另外执行。

消费者声明精确依赖 `0.1.2`。本地开发链接只存在于消费者未打包的 `pnpm-workspace.yaml`；安装 tgz 时需提供管理包，或先将管理包发布到消费者可访问的 npm registry。DSH Profile 还需选中管理插件，普通 npm 依赖安装不会自动加载其 Cordis patch。

初始拆分阶段的验证包括本地构建、41 项管理插件测试、消费者 167 项测试、6 项浏览器 fixture 测试、安装包检查及 npm / pnpm 双包安装检查。按用户要求另在 `D:\app\DeepSeekHarnessDesktop` 的实际 Desktop 0.2.0-rc.2 中安装双插件并验证，过程见 [Desktop 验证记录](DESKTOP_VERIFICATION.md)。没有发布远程版本。
