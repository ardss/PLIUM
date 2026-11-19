# PLIUM（叠间）v1.0.1 — 发行说明

> 发行状态：**已发布**。下载与校验信息见 [Releases](https://github.com/ardss/PLIUM/releases/tag/v1.0.1)。

## 这个版本解决什么

`v1.0.0` 是产品层面的第一个版本，但它的"自动更新"其实不存在：`electron/main/updater.ts` 是一个全部返回空值的占位实现，`electron-updater` 根本没有安装，界面上的更新控件被一个预览开关隐藏。同时，仓库里的合规文件还停留在预览阶段，升级脚本散落在仓库之外、带有一条不现实的"键鼠空闲 90 秒"门禁。

`v1.0.1` 把这三件事一起收敛。

### 1. 真正可用的更新通道

- **通道唯一且受校验**：安装包内的 `app-update.yml` 在启动时读取并与 `github ardss/PLIUM` 比对。指向任何其它仓库即**禁用更新**，而不是"照样装"。上游 Edge-Drop 的安装包因此不可能被当成 PLIUM 的更新装进来。
- **安装发生在 PLIUM 不运行时**：后台下载，退出时安装；或用户点"重启并安装"立即执行。不检测桌面空闲，不自动重启，不在会话中途替换文件——这是 Chrome、Edge 与 electron-updater v27+ 的共同做法。
- **三档设置真实生效**：`自动`（后台下载 + 退出安装）/ `仅通知`（只检查，用户点下载）/ `关闭`（零网络请求）。
- 中英文界面明确写出"退出 PLIUM 时自动安装"。

### 2. 合规

- 新增 `NOTICE`：PLIUM 自身版权、Edge-Drop 的 Apache-2.0 fork 关系、Twemoji 的 CC-BY 4.0 署名。此前 `LICENSE` 只带模板占位符 `[yyyy] [name of copyright owner]`，没有实际版权声明。
- 新增运行时依赖许可证门禁 `scripts/audit-licenses.mjs`：遍历 electron-builder 实际打包的依赖闭包（含 `optionalDependencies`），对 GPL / AGPL / SSPL / 未声明许可 fail closed，并标出需要披露源码的弱 copyleft。当前结果：25 个包，23 个宽松许可 + 2 个 MPL-2.0（`@resvg/resvg-js`，已在 `THIRD-PARTY-NOTICES.md` 披露源码地址）。
- `PRIVACY.md` 如实描述两种网络行为与三档设置；`SECURITY.md` 更新支持版本与威胁模型；`UPSTREAM-HISTORY.md`、`CODE-SIGNING-POLICY.md`、`PLIUM-PREVIEW.md` 去掉与 1.0.x 矛盾的旧表述。

### 3. 发版与安装标准化

- `scripts/release/verify-release.mjs`：校验安装包、版本号、`latest.yml`、`app-update.yml` 四者一致，并生成 `.sha256`。任一不符即退出非零。
- `scripts/release/install-local.ps1`：把散落在仓库外的一次性升级脚本收进仓库——哈希校验、停机、资料快照、静默安装、`items.json` 逐字节比对、单实例确认、JSON 结果。**不含空闲门禁**。
- CI 新增许可证审计与更新通道契约测试。

## Windows 下载与安装

**注意：这是一份未签名的 Windows 安装包。** Windows 可能显示 **"未知发行商"** 或 Microsoft Defender SmartScreen 警告。本项目没有申请微软认证。请仅从 [官方 PLIUM Releases](https://github.com/ardss/PLIUM/releases) 获取安装包，核对公布的 SHA-256 并独立判断是否安装。**不要关闭 Defender 等安全保护。**

- **从 v1.0.0 升级**：必须手动安装一次，因为 v1.0.0 不含更新组件。备份 `%APPDATA%\plium` 后运行 `PLIUM-Setup-1.0.1.exe`；或使用仓库内的 `scripts/release/install-local.ps1` 完成校验、备份与安装。
- **从 1.0.1 起**：后续版本会自动到达，安装发生在你退出 PLIUM 时，或点击"重启并安装"时。
- **回退**：保留完整数据备份，恢复先前版本对应的**完整**用户资料（`items.json`、`Local State`、`payloads`、`images`），不能只换 exe。

## 已知范围和限制

- 只支持 Windows 10/11 x64。某些应用不接受文件或文本的原生拖放数据格式。
- 31 套界面语言词条，但不宣称全部完成逐项视觉验收。
- 安装包未签名，可能受 SmartScreen、组织 IT 策略或第三方安全软件限制。
- `v1.0.0` 用户不会收到自动更新提示，需手动升级一次（见上）。
- 剪贴板可能含敏感信息。不要把完整个人剪贴板上传到公开 Issue。

## 发行可验证信息

- 源码构建提交：`030fdb8`
- 安装包文件名：`PLIUM-Setup-1.0.1.exe`（136,190,922 字节）
- 安装包 SHA-256：`AAA2F11E5EE0714CB2815FD9E2DB3C6729657F012A46649F1B663C6ED1190E4B`
- 解包主程序 `PLIUM.exe` SHA-256：`2DEE5BA351FE1E884FC238871CA96CBE7B41CD2408A8BB231758DBCC43EE36BC`
- 更新元数据：`latest.yml`（version `1.0.1`，sha512 与安装包一致）
- 签名状态：`NotSigned`（既有决策）
- 自动化：94 个测试文件 / 986 项测试通过；生产依赖审计 0 漏洞；运行时许可证审计通过
- Windows A 同包实装：`1.0.0` → `1.0.1` 静默安装成功，`items.json` 哈希 `5E39A16C…` 前后**逐字节一致**，`payloads` 56 / `images` 60 保全，单主实例，`app-update.yml` 指向 `ardss/PLIUM`

`030fdb8` 之后的提交 `ca48d04` 只修改 `scripts/release/install-local.ps1`（不参与打包），安装包内容与 `030fdb8` 完全一致。

原作者和许可证见 [Attribution](../README.md#attribution)、[LICENSE](../LICENSE) 与 [NOTICE](../NOTICE)。
