# Formula Pilot 性能基线

记录时间：2026-07-14（Asia/Shanghai）

环境：Apple M3，Darwin 25.5.0，Node.js v26.4.0，darwin-arm64；目标应用 Obsidian 1.12.7，人工 UI 验收使用 Obsidian 默认深色主题。

| 指标 | 运行次数 | P95 | 目标 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 72 项候选匹配 | 1,000 | 0.267 ms | < 16 ms | 通过 |
| 7 行候选 DOM 更新 | 1,000 | 0.563 ms | < 32 ms | 通过 |

匹配基准同时分配了 1 MiB 固定文档，用于确认匹配器不依赖全文扫描；被测路径只接收当前查询和 72 项目录。DOM 指标在 Vitest + jsdom 中测量实际 `FormulaPilotSurface.renderCandidates()` 更新，不代表浏览器绘制和合成耗时。真实 Obsidian 测试另行确认了候选、预览、表单和占位符交互无控制台错误。

复现命令：

```bash
npm run perf
```
