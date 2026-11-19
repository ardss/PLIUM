# PLIUM（叠间）发行验收状态

更新日期：2026-11-19。**本文件的 PASS 只代表对应证据与代码快照，不自动推断更新后也通过。** 所有用户历史资料、备份和剪贴板内容不得上传公共仓库。

## 决策与范围

- 首个自主版本为 `v1.0.0`，当前版本 `v1.0.1`。产品名 PLIUM / 叠间，AppID `com.ardss.plium`，用户目录 `%APPDATA%\plium`。继承上游 Apache-2.0 许可与署名，但不同步其版本或在线更新渠道。
- 用户于 2026-11-18 明确决定：**不等待公开代码签名**。允许未签名 Windows 安装包作为公开发行物；但必须在 README、GitHub Release 和安装说明中清楚提示：发行商可能显示“未知”、SmartScreen 可能拦截，用户应核对官方 GitHub 仓库和 SHA-256。**不宣称 Windows 或微软对该软件认证。**
- 只保持一个正式安装；不为每次修复重复发包；未经完整验收不得创建稳定 Tag 或发布 Release。
- 从 `v1.0.1` 起**在线更新启用**，但仅限 PLIUM 自有通道（`github ardss/PLIUM`，启动时校验 `app-update.yml`），且安装在应用不运行时（退出或用户点“重启安装”）执行。不检测桌面空闲，不自动重启。用户可在设置中选择自动 / 仅通知 / 关闭。

## 2026-11-19 v1.0.1 更新机制与合规记录

| 项目 | 值 |
|---|---|
| 源码构建提交 | `030fdb8`（此后 `ca48d04` 仅改 `scripts/release/install-local.ps1`，不参与打包） |
| 安装包 | `PLIUM-Setup-1.0.1.exe`，136,190,922 字节 |
| 安装包 SHA-256 | `AAA2F11E5EE0714CB2815FD9E2DB3C6729657F012A46649F1B663C6ED1190E4B` |
| 解包主程序 SHA-256 | `2DEE5BA351FE1E884FC238871CA96CBE7B41CD2408A8BB231758DBCC43EE36BC` |
| 更新元数据 | `latest.yml` version `1.0.1`，sha512 与安装包一致 |
| 打包内更新通道 | `app-update.yml` = `github` `ardss` `PLIUM` |
| 自动化 | 94 文件 / 986 测试通过；生产依赖审计 0；运行时许可证审计 25 包通过（2 个 MPL-2.0 已披露） |

Windows A（`DESKTOP-CD2C03F`）`1.0.0` → `1.0.1` 实装，使用 `scripts/release/install-local.ps1`：

| 门禁 | 结果 | 证据 |
|---|---|---|
| 安装包 SHA-256 校验 | **PASS** | `AAA2F11E…` 命中期望值 |
| 静默安装 | **PASS** | NSIS `/S` 退出码 0，版本 `1.0.0` → `1.0.1` |
| 装前资料快照 | **PASS** | `C:\Users\13397\AppData\Local\PLIUM\upgrades\20261119-155601` |
| 历史逐字节保全 | **PASS** | `items.json` SHA `5E39A16C…` 装前与装后完全一致 |
| 关联文件保全 | **PASS** | `payloads` 56 / `images` 60 |
| 单主实例 | **PASS（手动复跑）** | 脚本内首启因执行环境注入 `ELECTRON_RUN_AS_NODE=1` 被当作纯 Node 而失败；清变量后由 explorer 启动：1 main + gpu + renderer，无重复。已修复脚本，见 `ca48d04` |
| 更新通道 | **PASS** | 安装目录内 `resources/app-update.yml` = `github ardss/PLIUM` |

**说明：** 脚本首次运行报 `bad option: --hidden`，根因是执行环境注入了 `ELECTRON_RUN_AS_NODE=1`，不是产品缺陷；安装、备份与数据校验三步均已通过。该变量不可能出现在普通用户环境中，但脚本已在启动前主动清除，避免在 Electron 开发终端里复现。

**尚未验证（不作为已通过）：** 真实的“下载新版本 → 退出安装”端到端升级（需要等到 `v1.0.2` 存在时才能自然发生）；1.0.0 用户不会收到更新提示。

## 2026-11-19 Windows A v1.0.0 实装与验收记录

构建产物（Windows B 构建，Windows A 实装，两端哈希一致）：

| 项目 | 值 |
|---|---|
| 源码提交（构建来源） | `eed31d1a43b54f689d84ab5f99b96fda107e68ca` |
| `main` 合并提交 `402c265` | 树 `c6fb39b1`，与 `eed31d1` 树**完全相同**，`electron/ src/ shared/ tests/ package*.json` 零差异 |
| GitHub CI | run `44438535764`（`eed31d1`）success；run `44466752298`（`402c265`）见下方 |
| 安装包 | `PLIUM-Setup-1.0.0.exe`，135,865,270 字节 |
| 安装包 SHA-256 | `8BDFE46F6A21E0BB8BE5C4B5ECCFD72DCC6C9D627239C531C0D825424A34CC93` |
| 解包主程序 SHA-256 | `90CBBBF6274BC47D1C26CF781BFDF31A7102C923A8BAE5FA9057BF92D069ABF0` |
| 签名 | `NotSigned`（用户已接受，见决策） |

Windows A 执行结果（`DESKTOP-CD2C03F`，Session 1，双显示器）：

| 门禁 | 结果 | 证据 |
|---|---|---|
| 安装包与旧 EXE 哈希预检 | **PASS** | 脚本首段 `hash.installer` / `hash.oldExe` 均命中预期值 |
| 静默安装 | **PASS** | NSIS `/S` 退出码 0 |
| 安装后版本与哈希 | **PASS** | 版本 `1.0.0`，EXE SHA = `90CBBBF6…` |
| 单主实例 | **PASS** | 1 个主进程 + gpu/renderer/utility 子进程，无重复主实例 |
| 用户数据零丢失 | **PASS** | 停机稳定态 `items.json` SHA `BEA0515F…`；安装后、启动后、持续运行 10 分钟均未变；`payloads` 55 / `images` 60 数量不变 |
| 装前备份 | **PASS** | 独立全量快照 `PLIUM-preinstall-snapshot-20261119-131606`（220 文件）；09:59 备份刷新为 221 文件 |
| 开机自启 | **PASS** | Run 项唯一：`"…\PLIUM.exe" --hidden` |
| 卸载项 | **PASS** | 仅 `PLIUM 1.0.0` 一条 |
| 双屏顶部呼出 | **PASS** | 触顶后展开于副屏 `(2560,-340)-(6400,1820)` 顶部居中，窗口 `(3484,-340)-(5479,28)` |
| 折叠 / 展开 / 移开收起 | **PASS** | 折叠态为细横条；展开态与折叠态像素差 19.764%；移开自动收起 |
| Alt+C 呼出与关闭 | **PASS** | 展开态与触顶展开**逐像素一致**（差值 0.000%） |
| 托盘左键 | **PASS** | 展开态与触顶展开逐像素一致 |
| 托盘右键菜单 | **PASS** | 真实右键溢出托盘图标，菜单为 `无痕（暂停捕获）` / `悬停触发（悬停时打开）` / `贴附到` / `显示器` / `退出 PLIUM` |
| 托盘双击 | **PASS** | B 环境从未测出，本次 A 补齐：双击后与展开态逐像素一致 |
| 不抢前台焦点 | **PASS** | 窗口 `exStyle = 0x08280028`，含 `WS_EX_NOACTIVATE`；展开前后前台窗口（Edge）未变 |
| 隐藏启动与冷启动 | **PASS（有保留）** | `--hidden` 正常进入托盘；首帧加载出现一次停滞，经有界重试后完成（约 29 秒） |

**尚未在 A 逐项复核（不作为已验收）：**

- 真实拖出到外部应用（文本 / 图片 / 文件）；B 环境 10/10 合成用例通过，A 未复跑。
- 清除未置顶内容的确认交互。
- 回滚实测：完整备份与 beta.3 安装包均已就位，但未执行真实回滚。
- 注销/重启后的冷登录自启（需一次真实登录周期）。

**测试环境限制（必须如实记录）：** 本次验收在受管执行环境下进行，该环境会拦截应用派生的部分子进程（`reg.exe` 被策略拒绝、Chromium 网络服务子进程被终止），导致 renderer 首帧加载不稳定、需重试后才渲染。改用 `explorer.exe` 拉起后应用渲染与交互均正常。**这既不能当作产品缺陷，也不能当作“任意环境冷启动都健康”的证明。**

## 证据台账

| 门禁 | 结果 | 具体证据 |
|---|---|---|
| Windows B 自动化 | **PASS（当前提交）** | 本地 TypeScript、93 文件 / 967 个 Vitest 测试与 Electron-Vite 构建，全退出码 0（`v1.0.0`）；`v1.0.1` 为 94 文件 / 986 测试。`eed31d1` 的 GitHub CI `44438535764` success。 |
| Windows B 隔离 IPC | **PASS** | 10/10 合成数据测试：文字/图片/文件导入、一行⇄三行高度 210⇄522px、置顶保留、清理与删除；记录 `K:\AIControl\CV-Delivery-20261107\plium-isolated-native-qa\cdp-synthetic-e2e-result.json`。 |
| Windows B 真实触顶 | **PASS（会话连接时）** | 真鼠标触顶部居中区后 DOM `is-open=true`，鼠标移开复原 `is-open=false`。 |
| Windows B 真实 Alt+C | **PASS（会话连接时）** | Windows 键盘事件两次呼出/关闭；DOM 状态逐次验证。 |
| Windows B 托盘左键 | **PASS** | Win11 真实隐藏托盘图标物理左键呼出，renderer `is-open=true`。 |
| Windows B 托盘右键 | **PASS** | 真实右键 Windows 11 溢出托盘图标，截图可见菜单项。证据 `tray-rightclick-after.png`。 |
| Windows B 托盘双击 | **未测（已在 A 补测）** | B 的 RDP 会话断开导致真实鼠标无法到达目标图标；该项在 Windows A 已按上表通过。 |
| 长文本强退恢复 | **PASS** | 85,028 字符合成文本，DPAPI 落盘后强杀主进程再启动，SHA-256 完全一致（`ED94FCBA…`）。证据 `forced-exit-verify.json`。 |
| 生产依赖安全 | **PASS** | 官方 npm production audit = 0；开发链 picomatch advisory 由 `scripts/audit-dependencies.mjs` 显式例外治理，生产与新增未知风险继续 fail closed。 |
| Git 历史敏感信息 | **PASS（扫描覆盖）** | Gitleaks v8.30.1 扫描 339 个历史提交，0 发现，退出码 0；不能等价宣称绝无安全风险。 |
| 公开签名 | **用户接受风险，非阻断** | 程序与安装包未签名；须明确告知下载用户，不能表示受微软信任；不启用自动更新。 |

## 发行范围与剩余工作

P0（已完成）：最终源码提交与 CI/依赖审计；冻结版号和安装包 SHA；Windows A 同一版本实装、数据保全、双屏呼出、Alt+C、托盘左/右/双击、隐藏启动。

P0（结转下一期，不阻断首版）：Windows A 真实拖出到外部应用、清除确认交互、真实回滚演练、真实注销重启后的自启。

P1：公开后的 OCR、智能搜索、分组拖拽、代码签名。~~自动更新通道~~ 已于 `v1.0.1` 交付（自有通道 + 退出时安装）。

**GO 规则：** 相同源码与二进制的关键验收通过、发布文档一致后允许以“未签名公开版”发版；签名本身不阻断。未满足的核心交互或数据安全门禁仍不得直接标记稳定已验收。参见 [发行制度](RELEASE-POLICY.md) 与 [Issue #18](https://github.com/ardss/PLIUM/issues/18)。
