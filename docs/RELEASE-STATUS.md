# PLIUM（叠间）v1.0.0 发行验收状态

更新日期：2026-11-18。**本文件的 PASS 只代表对应证据与代码快照，不自动推断更新后也通过。** 所有用户历史资料、备份和剪贴板内容不得上传公共仓库。

## 决策与范围

- 首个自主版本为 `v1.0.0`，产品名 PLIUM / 叠间，AppID `com.ardss.plium`，用户目录 `%APPDATA%\plium`。继承上游 Apache-2.0 许可与署名，但不同步其版本或在线更新渠道。
- 用户于 2026-11-18 明确决定：**不等待公开代码签名**。允许未签名 Windows 安装包作为公开发行物；但必须在 README、GitHub Release 和安装说明中清楚提示：发行商可能显示“未知”、SmartScreen 可能拦截，用户应核对官方 GitHub 仓库和 SHA-256。**不宣称 Windows 或微软对该软件认证。**
- 只保持一个正式安装；不为每次修复重复发包；未经完整验收不得创建稳定 Tag 或发布 Release。在线自动更新仍关闭，用户自行控制安装与升级。

## 证据台账

| 门禁 | 结果 | 具体证据 |
|---|---|---|
| Windows B 自动化 | **PASS（当前未提交修复）** | 2026-11-18 本地 TypeScript、93 文件 / 967 个 Vitest 测试与 Electron-Vite 构建，全退出码 0。需在最终提交后重新跑 GitHub CI。 |
| Windows B 隔离 IPC | **PASS** | 10/10 合成数据测试：文字/图片/文件导入、一行⇄三行高度 210⇄522px、置顶保留、清理与删除；记录 `K:\AIControl\CV-Delivery-20261107\plium-isolated-native-qa\cdp-synthetic-e2e-result.json`。 |
| Windows B 真实触顶 | **PASS（会话连接时）** | 真鼠标触顶部居中区后 DOM `is-open=true`，鼠标移开复原 `is-open=false`。两份只读状态记录在 QA 目录。 |
| Windows B 真实 Alt+C | **PASS（会话连接时）** | Windows 键盘事件两次呼出/关闭；DOM 状态逐次验证。 |
| Windows B 托盘左键 | **PASS** | Win11 真实隐藏托盘图标物理左键呼出，renderer `is-open=true`。 |
| Windows B 托盘右键 | **PASS（修复后的当前本地代码）** | 真实右键 Windows 11 溢出托盘图标，截图可见 `Stick to` / `Display` / `Quit PLIUM` 菜单。证据 `tray-rightclick-after.png`，并非仅依赖 UIAutomation 菜单枚举。 |
| Windows B 托盘双击 | **未测** | 23:39 起 B 的 RDP 会话变为“断开”，真实鼠标移动无法到达目标图标；测试脚本保守跳过。单元测试覆盖幂等逻辑，不等于系统双击验收。 |
| Windows B 强制退出数据恢复 | **部分 PASS** | 独立合成 85,028 字符 DPAPI payload 已落盘，强制退出后 `items.json` SHA 未变；重新启动时因 B 远程会话断开，未能完成新 renderer 的内容读回校验，仍需补足。 |
| Windows A 实装 | **旧版 beta.3 PASS（有限）** | 原 beta.3 已安装，一主进程、独立数据备份、显示器坐标与页面加载验证；本次修复的候选安装包还未安装 A，因此不能把旧版结果当成新候选 PASS。 |
| Windows A 关键原生用例 | **待验证** | 双屏真实边缘呼出/收回、一行↔三行、托盘双击右键、真实文本/图片/文件拖出到其他应用、焦点、带用户资料升级与回滚、冷登录自启。只用合成数据写测试，尊重实时用户输入。 |
| 生产依赖安全 | **PASS（旧候选）** | 官方 npm production audit=0。唯一开发链 picomatch advisory 经明确例外治理：`scripts/audit-dependencies.mjs` 对生产与新增未知风险继续 fail closed；最终提交须重跑。 |
| Git 历史敏感信息 | **PASS（扫描覆盖）** | 补齐缺失 Git 对象后使用 Gitleaks v8.30.1 扫描 339 个历史提交，0 发现，退出码 0；不能等价宣称绝无安全风险。 |
| GitHub CI/PR | **待最终 SHA** | 上轮 `728bef9` CI PASS；新配置/托盘修复尚未提交推送，待最终 Commit 后独立核对。 |
| 公开签名 | **用户接受风险，非阻断** | Windows 程序与安装包未签名；须明确告知下载用户，不能表示受微软信任；不启用自动更新。 |
| 包体/版本 | **待最后候选** | 旧 beta.3 私有包保留归档，独立最终 v1.0.0 构建需要计算 SHA、单次安装与升级证据；旧 12 份安装包已有 manifest 与校验归档。 |

## 发行范围与剩余工作

P0：最终源码提交与 CI/依赖审计；冻结版号和安装包 SHA；Windows A 同一版本的真实操作/重启/升级备份验证；检查无调试开关或意外自启动。

P1：发布说明、未签名及 SmartScreen 警示、源代码 SHA 与安装包 SHA、回滚指南、隐私与许可证。所有失败必须保留可重现证据。

**GO 规则：** 相同源码与二进制的关键验收通过、发布文档一致后允许以“未签名公开版”发版；签名本身不阻断。未满足的核心交互或数据安全门禁仍不得直接标记稳定已验收。参见 [发布制度](RELEASE-POLICY.md) 与 [Issue #18](https://github.com/ardss/PLIUM/issues/18)。
