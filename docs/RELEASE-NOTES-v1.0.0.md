# PLIUM（叠间）v1.0.0 — 发行说明

> 发行状态：**已发布**。下载与校验信息见 [Releases](https://github.com/ardss/PLIUM/releases/tag/v1.0.0)。

## 我们自己的第一个版本

PLIUM 是基于 Edge-Drop（Apache-2.0）独立维护的 Windows 10/11 x64 开源剪贴板边缘工具。版本号、产品名称、安装身份和后续发行流程独立于上游。

- 顶部一行 / 三行剪贴板栏及左右边缘模式，鼠标触边展开与收起。
- 文本、链接、图片、文件的剪贴板记录，置顶、搜索、标签、备注及安全清理确认。
- Alt+C 快捷键、托盘左键呼出与双击、Windows 11 托盘右键菜单及退出。
- 拖动粘贴与文件导出路径，按接收软件支持能力工作。
- 长文本加密持久化、意外退出恢复、双屏工作区识别、隐藏启动渲染恢复。
- 统一 PLIUM 图标与独立 AppID `com.ardss.plium`。
- 面板为**非激活窗口**（`WS_EX_NOACTIVATE`），呼出时不抢走当前应用焦点。

相比内部 beta.3 的最终候选修复：修正 Windows UTF-8 BOM 设置文件误回退默认值（影响隐私模式及开机自启选择）；修正 Windows 11 隐藏系统托盘右键菜单弹出问题；增加回归测试及可追溯的发版审计。

## Windows 下载与安装

**注意：这是一份未签名的 Windows 安装包。** Windows 可能显示 **“未知发行商”** 或 Microsoft Defender SmartScreen 警告。本项目没有申请微软认证。请仅从 [官方 PLIUM Releases](https://github.com/ardss/PLIUM/releases) 获取安装包，核对公布的 SHA-256 并独立判断是否安装。**不要关闭 Defender 等安全保护。**

- 首次安装：以普通用户运行官方 NSIS 安装程序，按提示安装到用户目录，无需管理员权限。
- 从早期 PLIUM 升级：先完全退出正在运行的 PLIUM，备份 `%APPDATA%\plium` 整个目录；然后安装新版本。**不要同时运行两套剪贴板监听器。**
- 回退：先保留当前完整数据备份，再恢复先前版本对应的**完整**用户资料，特别是 `items.json`、`Local State`、`payloads`、`images`，不能只换 exe。部分旧版本无法读取新的加密数据格式。
- 自动更新：目前关闭。请自行通过官方 GitHub 发布页检查版本并手动安装。

## 已知范围和限制

- 首版只支持 Windows 10/11 x64。某些应用不接受文件或文本的原生拖放数据格式；需要在目标应用真实检验。
- 有 31 套界面语言词条，但不宣称 31 种语言 / RTL 排版均完成逐项视觉验收。
- 不包含未来计划中的 OCR、智能分组、跨设备同步等功能。
- 未签名的安装包可能受到 Windows SmartScreen、组织 IT 策略或第三方安全软件限制。
- 剪贴板可能含敏感信息。未经主动操作，不要将完整个人剪贴板上传到公开 Issue。

## 发行可验证信息

- 源码 Git SHA（构建来源）：`eed31d1a43b54f689d84ab5f99b96fda107e68ca`
- `main` 合并提交：`402c265`（树 `c6fb39b1`，与构建来源树完全相同，运行时代码零差异）
- GitHub Windows CI：run `44438535764`（`eed31d1`）通过
- 安装包文件名：`PLIUM-Setup-1.0.0.exe`（135,865,270 字节）
- 安装包 SHA-256：`8BDFE46F6A21E0BB8BE5C4B5ECCFD72DCC6C9D627239C531C0D825424A34CC93`
- 解包主程序 `PLIUM.exe` SHA-256：`90CBBBF6274BC47D1C26CF781BFDF31A7102C923A8BAE5FA9057BF92D069ABF0`
- 签名状态：`NotSigned`（用户已接受该发行条件）
- Windows A 同包实装验收：通过（安装、数据零丢失、单实例、双屏呼出、Alt+C、托盘左/右/双击、非激活面板）。细节与未复核项见 [发行验收状态](RELEASE-STATUS.md)。

原作者和许可证见 [Attribution](../README.md#attribution) 和 [LICENSE](../LICENSE)。问题反馈请附程序版本、Windows 版本、步骤和不含私密数据的日志。
