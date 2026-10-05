# 公开发布与插件市场收录

本指南参考配套审查仓库的发布文档，按管理插件实际结构编写。当前本地版本为 **0.1.3**，审查消费者 **0.3.4** 精确依赖它。用户安装见 [README](../README.md#安装)，历史变化见 [版本记录](releases/version.md)。

文档中的源码推送、Release 上传、npm 发布和市场 PR 是维护者后续操作。本次补充文档没有执行这些操作，也不以本地验证记录证明公开版本已存在。

## 1. 版本与资产

| 项目 | 当前值 |
| --- | --- |
| 包名 | `dsh-multi-git-repo-manager` |
| 包版本 | `0.1.3` |
| Release 标签 | `v0.1.3` |
| 安装包 | `dsh-multi-git-repo-manager-0.1.3.tgz` |
| 校验文件 | `dsh-multi-git-repo-manager-0.1.3.tgz.sha256` |
| 独立运行 | 管理插件可单独启用 |
| 配套消费者 | `dsh-file-review-tab-multi-git-repository@0.3.4` |
| 真实宿主验证 | Windows Desktop 0.2.0-rc.2；其余平台和完整 Web 未验收 |

公开安装默认使用预构建 tgz。`dist/`、`*.tgz` 产物通过 Release Assets 分发，不需要放入源码历史。GitHub 自动生成的源码 zip/tar.gz 不等于 npm 格式安装包。

## 2. 构建并核对包

在管理仓库根目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm test:pack
```

最后一步生成版本对应的 tgz 和 SHA256，检查 exports、内部模块、浏览器依赖及归档内容。包包含 `lib/`、类型声明、`cordis.patch.yml`、目录选择适配脚本、README、docs 和 LICENSE；不包含源码测试目录、工作区本地链接或 `node_modules/`。

仅文档变更且运行产物已同步时，可以直接运行 `pnpm test:pack`。功能变更需先构建再测试。包内容检查不能代替功能验证。

```powershell
tar -tzf .\dist\dsh-multi-git-repo-manager-0.1.3.tgz
Get-Content -LiteralPath .\dist\dsh-multi-git-repo-manager-0.1.3.tgz.sha256
```

## 3. 公开源码的产物策略

当前 `.gitignore` 忽略 `lib/`，并且 `package.json` 没有 `prepare` 或 `prepack` 自动构建脚本。发布源码时应保留 `src/`、`tests/`、构建配置、锁文件、插件 manifest、兼容脚本和文档，供开发者安装依赖后构建。

因此不能仅因公开仓库存在，就承诺从 GitHub 直接安装后可以加载运行文件。若未来支持免构建的源码仓库安装，需要调整产物管理策略，提交与源码同步的 `lib/` 并实际验证；若选择安装时构建，应另行实现并验证相应流程。当前推荐 Release tgz，并在市场模板提供固定版本 `tarball`。

推送前核对 `git status --short`、`git diff` 和 `git diff --check`，选择本次发布文件，提交并推送到实际发布分支。不要把本机 Profile、测试工程或包缓存一同发布。当前未提交的实现和文档应由维护者按实际范围选择，本文不代替提交审核。

## 4. 创建 Release

在 [管理插件 Release 页面](https://github.com/wuqingzhong2020/dsh-multi-git-repo-manager/releases) 创建 Release：

1. 标签使用 `v0.1.3`，目标为已推送并包含对应代码的提交。
2. 标题使用版本号，正文参考 [对应版本说明](releases/version.md#v012)，保留真实测试环境和未验证项目。
3. 上传 tgz 和 `.sha256`，核对包版本、标签、文件名和校验值一致。
4. 发布后确认固定版本下载地址可访问，再提供 URL 安装说明或提交市场模板。

后续公开功能版本应递增，并同步消费者精确依赖、锁文件、安装说明与市场 URL。不要用相同公开标签反复覆盖不同功能产物。同版本的本地调试可采用含构建摘要的不同文件名，不能用版本显示代替实际文件校验。

## 5. 管理插件与消费者的交付顺序

先构建、验证和交付管理包，再构建依赖它的消费者。管理包不反向依赖审查插件；消费者的相邻源码链接只用于开发，发布时仍声明精确版本。

如果尚未将管理包发布到消费者可访问的 npm registry，应提供两个 tgz 并说明联装方法。Desktop 的 `desktop` Profile 安装后，需要同时选中两个 bundles；独立使用管理插件只需选中管理包。先让管理服务加载，再检查消费者是否正常取得同一个服务实例。

公开发布前，还应按当时的包和宿主重新验证联装、原生 Tab、保存刷新及临时目标隔离。历史通过记录描述的是已测试构建，不自动覆盖未来版本。

## 6. 插件市场条目

按社区当前 [贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，在 `data/plugins/` 提交与本仓库对应的 YAML 条目。公开仓库需要真实插件代码、`dsh.bundle` manifest 及对应 patch，并设置 `dsh-plugin` topic；最终字段与收录要求以该指南为准。

本仓库的 [YAML 模板](market/wuqingzhong2020__dsh-multi-git-repo-manager.yml) 使用 `git` 分类和固定 `v0.1.3` 的 tgz URL。先发布同名资产，再复制到社区目录申请 PR。带版本名的资产使用固定标签，避免把版本文件名放在会变化的 `latest/download` 下。社区会从条目生成目录 README，不需要直接编辑其 README。[字段与安装包规则](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)

npm 发布是可选步骤。市场收录、Release 发布和 npm 发布分别执行；本地存在模板不表示已经提交或收录。[社区 npm 说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)
