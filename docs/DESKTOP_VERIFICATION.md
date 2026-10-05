# Desktop 验证记录

日期：2026-10-05。实际软件：`D:\app\DeepSeekHarnessDesktop\DeepSeek Harness.exe`，包版本 `@deepseek-ai/dsh-desktop` 0.2.0-rc.2。

测试前备份 `desktop` Profile 的 package、lockfile 和 Cordis 配置，通过 pnpm 安装本地管理插件 0.1.0 与审查消费者 0.3.0，并把管理插件加入 bundles。原有目录选择器起始目录适配已存在，本轮没有修改 Desktop 的 app.asar。

| 检查 | 实际结果 |
| --- | --- |
| 双插件启动 | 重启后管理页签和文件审查均正常加载；管理页签只出现一次 |
| 旧工程兼容 | ProjectManager 原项目文件识别 17 / 17 个 Git 仓库 |
| 配置编辑与保存 | 独立临时样例工程中的两个测试仓库保存为相对路径；Profile 索引写入管理插件自己的 namespace |
| 审查共享范围 | 未提交审查显示两个测试仓库的 sample.txt 差异 |
| 增仓与事件通知 | 保存第三个仓库后，已经打开的审查面板自动变为 3 个仓库、6 个文件，无需手动刷新 |
| 原生目录选择 | 选择框从当前会话工程根目录打开；选择内部仓库返回相对路径 |
| 外部临时仓库 | 表单标记“临时”，当前会话可审查；保存 JSON 不含外部绝对路径 |
| 恢复与重新加载 | 恢复测试前样例工程 JSON，再通过管理页重新加载 |

截图和 Profile 备份保存于工作区根目录 `.desktop-migration-test/`，不进入发布包。测试使用 Git 样例修改，无需向模型发送新消息。保留双插件安装便于用户继续验证；未发布远程版本，`D:\projectZJGG\ref\dsh-file-review` 保持不变。

## 0.1.1 原生管理 Tab 验证

同日使用上述实际 Desktop，将管理插件升级到 **0.1.1**、审查插件升级到 **0.3.1**，并核对已安装 Host 和客户端文件的 SHA256 与本次构建一致。

- 原会话区仅保留「对话／轨迹」；右侧「开始」页新增「多代码仓管理」入口，与「文件审查」并列。
- 从入口打开原生管理 Tab，旧 ProjectManager 配置仍识别 17 / 17 个 Git 仓库。
- 修改仓库名但不保存，切换到开始页、文件审查再返回，草稿仍保留；重新加载可恢复已保存配置。
- 切换到独立样例会话后，管理 Tab 使用该会话工程根目录并识别 core、cli 两个仓库。
- 在管理 Tab 保存样例仓库名称，未提交审查展示更新后的名称；恢复名称并保存后，已打开的审查 Tab 自动刷新为原名称。
- 将原生右侧栏缩至约 400px，仓库输入、打开／删除按钮和预览表均可在栏内使用，没有页面横向溢出。
- 样例工程 JSON 恢复后与测试前备份逐字节一致；未向模型发送新消息，也未修改 Desktop 的 app.asar。

证据：`.desktop-migration-test/screenshots/native-manager-narrow-0.1.1.png` 与 `native-tabs-review-0.3.1.png`；本轮 Profile 备份位于 `native-tab-profile-backup/`。自动回归：管理 41 项、审查 167 项、浏览器 6 项通过，两个 tgz 的独立 pnpm 安装与共享 Host 服务检查通过。

## 0.1.2 Git 与非 Git 目录

本轮实际目录发现、v2 迁移保存、审查范围及退出重启结果见 [0.1.2 验证记录](NON_GIT_VERIFICATION.md)。此处保留先前拆分和原生 Tab 验收历史。
