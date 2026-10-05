# 版本记录 / Version history

按本地开发版本从新到旧排列。版本章节与实际验证链接描述本仓库已记录的交付，不表示对应远程 Release 已发布。后续发版在顶部追加，安装命令与包版本保持一致。

These notes describe recorded local development and validation. They do not confirm public Release publication.

## 目录 / Contents

- [v0.1.3](#v013)
- [v0.1.2](#v012) · [非 Git 目录验证](../NON_GIT_VERIFICATION.md)
- [v0.1.1](#v011) · [原生 Tab 验证](../DESKTOP_VERIFICATION.md)
- [v0.1.0](#v010) · [初始拆分验证](../DESKTOP_VERIFICATION.md)

## v0.1.3

- 将 Host 服务、Typert 描述、Remote 类型和客户端调用统一迁移至 `multiGitRepoManagerByWqz`。
- 新增无运行时依赖的 `/service-names` 导出，供消费者复用服务标识；配套审查插件 `0.3.3` 使用 `multiGitFileReviewByWqz`。
- 工程 JSON、Profile 索引和管理页面入口沿用现有格式；两个包需同步升级。

Rename the shared service and Remote namespace to `multiGitRepoManagerByWqz`. Export dependency-free identities through `/service-names` and pair with File Review `0.3.3`; persisted project files and Profile indexes remain compatible.

## v0.1.2

- 将普通目录作为正式目标，与 Git 仓库共用配置、目录选择、会话临时目标和归属规则。
- 增加 `ManagedTarget`、类型状态、v2 配置、首次 v1 升级原文件备份及可配置容器的直接子目录发现。
- 提供 `resolveTargetPaths`、`discoverTargets`、`setTemporaryTargets`；旧 Git 调用和类型名称保留兼容。
- 更深且不可用的目标、未纳管组件、未知子仓、Git 元数据和越界链接阻断父目录兜底，Agent 释放和卸载清理临时缓存。
- 配套审查消费者 0.3.2 精确依赖管理 0.1.2。补充中英文使用手册、接口说明、发布指南和市场模板。

Ordinary directories become typed managed targets, with v2 configuration, exact v1 backup, direct-child discovery and session-only external targets. Authoritative file admission and three new Remote methods serve consumers; legacy Git calls remain compatible. File Review 0.3.2 requires manager 0.1.2.

已记录管理 49 项 Node 测试、消费者 172 项 Node 测试、8 项浏览器测试及隔离联装。指定 Windows Desktop 0.2.0-rc.2 验证目录发现、保存备份、范围切换和正常重启。混合工具轮次等仅自动测试覆盖，详见 [证据与限制](../NON_GIT_VERIFICATION.md)。文档补充不会据此增加新的实测项目。

资产：`dsh-multi-git-repo-manager-0.1.2.tgz` 和同名 `.sha256`。

## v0.1.1

- 管理界面从会话区迁到右侧原生 Tab，注册标题、正文、开始页入口及清理流程。
- 隐藏或切换 Tab 保留未保存表单，窄容器调整布局，文案跟随宿主语言。
- 配套消费者为 0.3.1，管理接口不再由消费者重复注册。

Move management from the conversation header to a native right-sidebar tab, preserving drafts across hidden tabs and adapting to narrow containers. File Review 0.3.1 uses the shared manager.

实际记录见 [Desktop 验证](../DESKTOP_VERIFICATION.md)。

## v0.1.0

- 从多 Git 仓审查工程提取公共管理服务、项目文件、Profile 索引、路径策略、目录选择和临时 Git 仓库。
- 提供 Cordis 服务、Typert Remote、公共子路径、独立插件 manifest、构建与包检查。
- 配套消费者 0.3.0 通过公共服务获取工作区，管理插件不反向依赖审查插件。

Extract project configuration, discovery and path utilities into a standalone manager with a Cordis service, Typert Remote, public exports and independent package. File Review 0.3.0 consumes the shared workspace.

初始联装与实际宿主记录见 [Desktop 验证](../DESKTOP_VERIFICATION.md)。
