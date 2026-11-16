# PLIUM · 首个自主版本收敛清单（2026-11-16）

**结论：尚未达到首个独立公开 Beta 的发版门槛。** 不得将 GitHub 主分支绿色、B 机解压包可运行，或 Windows A 旧预览版正常运行，等同于首个自主版本已经交付。

## 已完成且有证据

| 项目 | 证据 | 状态 |
| --- | --- | --- |
| 独立产品身份 | `ardss/PLIUM`、`PLIUM.exe`、`com.ardss.plium`、`%APPDATA%\plium` | 已落地 |
| 旧预览版安装 | Windows A `0.4.0-plium.10`，2026-11-09 升级验收时检查过安装/历史 SHA/自启动/回滚（CV-Delivery/PLIUM-RC10-UNDICI-CRASH-FIX-20261109.md） | 旧版有证据，不能套到新候选 |
| undici 文件流异常 | PR #22、Electron 隔离重现、v10 A 机安装验收 | 已在旧版处理 |
| 顶部 Dock 一行/三行切换 | `dockSemanticToggle.test.ts`；B 机最新构建 120 条合成历史、80 次原生 DOM 点击，成功 80/80，p95 28.8ms，最长 longtask 93ms，主进程存活 | B PASS，A 待验证 |
| 折叠卡顿优化 | PR #24，commit `e38b015` 合并 `1963688`，GitHub Windows CI PASS；2026-11-16 B 压力测试记录 `CV-Delivery/plium-dock-flip-stress-20261116.json` | 代码合并，未安装 A |
| 以往安全与质量 | v9 审计记录完整 npm audit 0 vulnerabilities、加密历史索引、批量清除保护、PR 强制 Windows CI/no-publish | 需对新候选重跑 |

## P0：首个独立候选前必须处理

1. **长文本完整性：发现确定性截断** — `electron/store/ItemStore.ts` 的 `add()` 在进入 payload 写入前执行 `text.slice(0,500000)`。即使磁盘有 `payloads/ID.txt`，超过上限的原始文字已经不可恢复。需求是保留原始文本；必须做隔离用例（例如 600,001 字符）验证捕获、保存、退出、重启和回贴一致。
2. **长文本侧文件隐私与写入失败** — `writeTextPayload` 当前明文 `writeFileSync` 且吞掉异常，后续仍可能把 `hasFullPayload` 设为 true。必须实现不会丢原文的回退语义，安全加密/兼容旧数据/异常处理；不可直接改写 Windows A 的 `payloads`。
3. **Windows A 真机折叠卡顿回归** — 上次 2026-11-16 10:40 Windows WER `AppHangTransient` 事件 1001；B 压测未再见 2 秒长任务，但根因未最后确认。需备份、安装新的候选后做一行/三行循环并核查事件/日志。
4. **原生终验** — A 机真实顶部/侧面、双屏/DPI、呼出/收起、托盘右键/双击、跨应用文本/图片/文件拖出、焦点恢复；重启后的自启动及唯一常驻实例。这些在 B 机部分有历史合成 QA，不可代替 A 的最终验证。
5. **同版本完整链路** — 独立版本号顺序、B 构建 SHA、可重现安装包、A 真正安装/功能和数据 SHA 一致、上一个版本可回退；暂不发布签名公开包。

## 公开发行独立门禁（不一定阻塞内部 Alpha/QA）

- 签名证书及 Authenticode/SmartScreen，不能从本地自动生成一个可靠发行商身份。
- 全量 Git 对象敏感信息扫描：本机是 `blob:none` 部分克隆，`git rev-list --objects --all --missing=print` 仍出现缺失对象，不能声称全历史扫描成功。GitHub secret scanning/push protection 不等于本机完整审计。
- 31 种语言与 RTL 的人工视觉/语义质量；自动化翻译 key 完整性测试不能代替。
- PLIUM 自主发布源、更新签名验证、异常回退机制；目前更新故意禁用，是安全做法。

## 确认过但不能冒称已交付的未来功能

- 本地 OCR 及图片文本索引和搜索；
- 更自然的拖拽重排、靠近合并为标签/分组，并保持可拆解、低摩擦粘贴；
- 面向指定电脑的跨设备转移/拖出（不同于本机跨应用拖入输入框）；
- 旧 CV 的应用来源排除、敏感内容过滤、图片配额及数据迁移能力，必须按原先验收范围逐项比对，不可只凭文件名认定已迁移。

这些是已讨论的价值方向，不能偷偷删掉，也不能一口气塞进稳定性冻结的首版。由产品里程碑单独排期与验收，优先解除 P0 数据安全和用户可用问题。

## 下一动作与明确 NO-GO

- 最新代码先做长文本数据完整性/侧文件安全修复和测试；必须**合并但不立即新发 A 安装包**。
- 整合后出一次明确 RC，隔离 B 测试过关，再用完整备份+回退方案做 A 实际安装。
- 公共正式发布和自动更新保持关闭；只在实测完成、可核验后变更本清单状态。
- 追踪：[Release gates #18](https://github.com/ardss/PLIUM/issues/18)。流程与过去教训见 [RELEASE-POLICY.md](RELEASE-POLICY.md)。
