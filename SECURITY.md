# Security policy

**PLIUM 1.0.0 is a public, unsigned Windows release.** It is not code-signed, by decision of the maintainer, so Windows may show an unknown publisher or a Microsoft Defender SmartScreen prompt. Obtain installers only from [PLIUM Releases](https://github.com/ardss/PLIUM/releases) and compare the published SHA-256 before running one.

## Supported versions

| Version | Security fixes |
|---|---|
| 1.0.x | Yes |
| 0.4.0-plium.* and earlier previews | No — upgrade to 1.0.x |
| Original Edge-Drop releases | Maintained by the upstream project, not PLIUM |

## Reporting a vulnerability

Use the repository's **[private vulnerability reporting](https://github.com/ardss/PLIUM/security/advisories/new)** when it is enabled. Otherwise open a public [Issue](https://github.com/ardss/PLIUM/issues) asking for a private contact method **without publishing exploit details, credentials, tokens, local clipboard history or private screenshots**.

A useful report includes the Windows version, the PLIUM version (Settings → About, or the file version of `PLIUM.exe`), reproducibility, and impact. Do not attach real clipboard data — reproduce with synthetic content instead.

Reports are triaged before any public commitment is made. Please allow reasonable time for a fix before disclosure.

## Scope and threat model

PLIUM's threat model centres on local data safety:

- Clipboard history and long-text payloads are encrypted with Windows DPAPI, bound to the Windows user account. A copied profile cannot be decrypted under a different account.
- The application does not run a local network listener and does not synchronise history to any server.
- Updates come only from `github.com/ardss/PLIUM`. A packaged build whose update feed points to another repository disables updating instead of trusting it.
- The installer is currently unsigned, so Authenticode verification cannot be relied on; verify the published SHA-256 instead.

Out of scope: issues that require an attacker to already have code execution as the same Windows user, and bugs inherited unchanged from third-party dependencies (report those upstream, though we still want to know if PLIUM exposes them).
