# Git 仓库与非 Git 目录

v0.1.2 将公共目录能力分成四个模块：`managed-target.ts` 判定自身类型和元数据，`target-discovery.ts` 预览容器直接子目录，`target-ownership.ts` 批量校验具体文件，`repository-project-file.ts` 负责配置版本、冲突和原子写入。服务负责会话身份与临时条目，消费者负责业务能力。

## 配置与迁移

文件名仍是 `dsh-file-review-repositories.json`。Git 条目保持原字段；旧 v1 可直接读写，未使用新增字段的工程继续写 v1。首次保存普通目录或发现容器时写 v2，并保留原文件的 `.v1.bak`；已有备份不覆盖。已升级工程继续使用 v2。未知字段或未来版本拒绝覆盖，文件哈希防止陈旧表单保存。

```json
{
  "version": 2,
  "enabled": true,
  "includeProjectRoot": false,
  "repositories": [{ "name": "Core", "path": "project/Core" }],
  "directories": [{ "name": "LocalPlugin", "path": "project/plugins/LocalPlugin" }],
  "discovery": { "containers": ["project", "project/plugins"] }
}
```

工程内部真实路径保存为相对路径。外部目录、其他盘符和逃出工程的 junction 只能通过显式会话临时条目使用；不会写入 JSON。配置最多 1 MiB、512 个目标、32 个发现容器。移除条目只改变配置，不删除磁盘文件。

## 类型与边界

`ManagedTarget.kind` 为 `git` 或 `directory`，与 `state` 分开。普通目录是 `ready`；Git 声明失去 `.git` 为 `notGit`；普通目录出现自身 Git 元数据为 `kindMismatch`，用户须调整类型并保存。损坏的 `.git`、不存在和读取失败保留错误。Git 元数据检查不需要安装 Git 命令；Git 比较由消费者执行。

工程根目录启用时按自身元数据自动分类。更深目标优先，包含不可用目标；不可用子条目不能退回父仓。未加入的容器子目录和沿具体文件路径发现的嵌套 Git 仓库为未纳管边界。容器不是自动目标，容器中的散落文件需显式纳管容器。父仓忽略规则不改变子目录的自身类型。

## 接入约定

- `workspace(agent)` 返回 `targets`、`boundaries`、`workspaceRevision`。`repositories` 仅保留 Git 投影；`roots` 是粗范围，不能单独授权读取、定位或写入。
- `resolveTargetPaths(agent, paths)` 返回每个输入的真实路径、具体目标及 managed / unmanaged / unavailable / outside / metadata / error 状态。调用方只能在 managed 时执行文件操作；最多 4096 个输入，内部每批 16 个。
- `discoverTargets(agent, project)` 固定当前会话工程身份，只查看所配置容器的直接子目录，不读源码、不执行项目命令。结果只供勾选或逐项添加，保存后才纳管。
- `setTemporaryTargets(agent, entries)` 接受带 kind 的工程外绝对路径，仅当前会话有效；`agent/disposed` 和插件卸载清理缓存。旧 `setTemporaryRepositories` 保留 Git 兼容投影。
- 目标 ID 由工程与真实目录路径生成，改名和切换类型不改变目录身份。消费者的历史记录、评论和引用不得因类型转换改写。

管理页在右侧原生 Tab 中提供类型选择、目录选择、发现预览与分别统计。消费者不重复实现发现、配置或归属，也不重复注册管理页签。
