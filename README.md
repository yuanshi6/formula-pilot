# Formula Pilot

Formula Pilot 是一个桌面端 Obsidian 插件，用候选菜单、公式预览和引导表单加速 LaTeX 输入。插件只在有效数学语法节点中工作，支持 Source mode 与 Live Preview；Reading View 不注册输入交互。

当前版本为 `0.1.0`，最低支持 Obsidian `1.12.7`。

## 使用方法

在行内或块级数学环境中输入反斜杠与命令前缀，例如 `\li`：

1. 使用 `1`–`7`、数字小键盘、方向键、PageUp/PageDown 或滚轮选择候选。
2. 普通符号和命令会直接插入；结构化公式会进入“自动填充 / 直接插入”模式选择。
3. 自动填充模式中按 Enter 前往下一字段，在最后字段按 Enter，或使用 Cmd/Ctrl+Enter 插入。
4. 直接插入后使用 Tab / Shift+Tab 在占位符之间移动，Esc 结束占位符会话。
5. Esc 会逐级返回；一次 Undo 会恢复插入前的原始查询与选择。

中文和无声调全拼使用同一候选流程。例如 `\分数` 或 `\fenshu` 会把“分数模板”排在第一，`\乘积` 或 `\chengji` 会优先“乘积模板”。也可以只输入拼音前缀，例如 `\fen`；完整名称 `\分数命令` 或 `\fenshumingling` 则精确选择裸命令。拼音不支持首字母缩写、声调符号或数字声调。

也可以从命令面板运行 `Formula Pilot: Open formula menu`。空查询时会显示优先级最高的结构化候选。该命令默认不绑定快捷键。

## 功能范围

- 60 个基础候选与 12 个结构化候选。
- NFKC、英文/中文/全拼前缀、冻结别名、子序列和有限 Levenshtein 匹配。
- 极限、求和、乘积、定/不定积分、分数、根式、普通/偏导数和二项式系数模板。
- 每页 7 项的键盘候选菜单、Obsidian 数学渲染预览和 64 项 LRU 缓存。
- 不写入正文的引导 replacement Widget，以及可随编辑映射的占位符范围。
- 本地使用历史、上次模板模式、预览、数字键和字号设置。
- 多窗格和弹出窗口所需的 `ownerDocument` 挂载与定位。

不在当前范围内：移动端、复杂多行环境、矩阵编辑器、模板编辑器、AI、网络服务或上下文重排。

## 隐私

Formula Pilot 不使用网络、遥测或 AI，也不包含第二套数学渲染引擎。设置和可选的使用历史只保存在当前 Obsidian 仓库的插件数据中。使用次数上限为 `1,000,000`，可在设置页随时清除。

## 本地开发

```bash
npm install
npm run vault:prepare
npm run dev
```

`npm run dev` 会监听源码，并将 `main.js`、`manifest.json` 和 `styles.css` 同步到被 Git 忽略的 `.test-vault/.obsidian/plugins/formula-pilot`。使用 Obsidian 打开 `.test-vault` 后启用 Formula Pilot 即可调试。

质量命令：

```bash
npm run check       # TypeScript、ESLint、Vitest
npm run build       # 生产构建并同步测试库
npm run package     # 生成 dist/formula-pilot-<version>.zip 发布包
npm run perf        # 匹配和候选 DOM 更新 P95
```

发布包同时包含可单独上传到 GitHub Release 的 `main.js`、`manifest.json` 和 `styles.css`。推送与 `package.json` 版本一致的 `v<version>` 标签后，GitHub Actions 会自动校验、打包并创建 Release。

人工验收记录见 [docs/MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md)，当前性能基线见 [docs/PERFORMANCE_BASELINE.md](docs/PERFORMANCE_BASELINE.md)。生成的 `main.js` 和 `.test-vault` 不提交 Git。

## 发布状态

macOS / Obsidian 1.12.7 本地 MVP 已验证。Windows、Linux、社区主题矩阵、插件 ID 社区唯一性和最终图标仍是公开发布前门槛；在这些项目完成前，本仓库不宣称已达到最终社区发布状态。

## 版权

Copyright © 2026 yuanshi. All rights reserved.

本项目为私有、未授权软件，`package.json` 标记为 `private: true` 和 `UNLICENSED`。除非版权所有者事先书面授权，不授予复制、修改、分发、再许可或使用本软件及其源代码的权限。完整条款见 [LICENSE](LICENSE)。
