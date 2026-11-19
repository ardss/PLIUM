# Code signing policy — PLIUM / 叠间

Status: **unsigned; signing is optional for the initial v1.0.0 public release by maintainer decision (2026-11-18)**. Download and SmartScreen warnings are mandatory.
Last reviewed: 2026-11-18.

PLIUM is an independently maintained open-source Windows clipboard shelf, derived from Edge-Drop (Apache-2.0). The source of truth is https://github.com/ardss/PLIUM, and the application identity is `com.ardss.plium`.

## Responsibilities

- **Repository owner / signing policy approver:** [ardss](https://github.com/ardss).
- **Contributors:** changes must be submitted through GitHub commits or pull requests and pass the Windows quality workflow; the repository owner decides who may merge changes.
- **Code signing approver:** the repository owner, or a specifically delegated maintainer documented in GitHub before signing is enabled. Approval cannot be automated by an unauthenticated person.
- All maintainers with publish or signing authority must enable multi-factor authentication. The project will not request a certificate or claim compliance until that requirement is independently confirmed.

## Release integrity

1. Release source must be a reviewed, immutable Git commit in the independent PLIUM repository, not upstream binaries.
2. CI tests and audits must pass for that **exact** source SHA; all unresolved security findings are disclosed, not hidden.
3. Windows A and clean-machine interactive acceptance tests must pass on the same release-candidate binary and maintain user clipboard data safety.
4. The verified build pipeline must produce hash-recorded artifacts directly from an immutable source SHA. For the initial unsigned release, prominently disclose the absent publisher signature. **If an artifact is ever described as signed/trusted**, the trusted signing service must verify and sign that exact SHA; signed artifacts may not be changed afterward.
5. The repository maintainer must review the source SHA, release notes, privacy information, known risks and installer SHA-256 **for every release**. When signing is enabled, verify signer certificate identity as an additional requirement. A self-signed certificate is never called a publicly trusted signature.
6. Publish the artifact with its commit, version, hash, installation and uninstall guidance, known limitations, and its honest signing status. Never include real clipboard data or users' backups in CI artifacts.

## Privacy and user control

PLIUM handles potentially sensitive clipboard text, URLs, images, and file metadata locally. The core functionality does not upload clipboard history to an owned cloud service. Users should not copy sensitive information into bug reports or distribute their clipboard profile. Refer to [Privacy policy](PRIVACY.md) for storage, local staging, external URL behavior, and data deletion. PLIUM updates follow the user's own setting: automatic (downloaded in the background, installed when PLIUM exits), notify-only, or off. An update never restarts the application on its own, and the update channel is restricted to the PLIUM repository — a packaged build whose feed points elsewhere disables updating. Installation and removal are controlled by Windows' Apps/Installed Apps interface using the PLIUM installer/uninstaller. The application must notify users about relevant system settings, including login auto-start.

## Free open-source signing evaluation

The project is evaluating [SignPath Foundation](https://signpath.org/) and its [current conditions](https://signpath.org/terms). **No SignPath approval or signing certificate is claimed.** If PLIUM is accepted and signatures are actually delivered, the release page and policy will add the acknowledgement required by the Foundation:

> Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org/).

If the Foundation is not available or not approved, a legitimate trusted CA/cloud signing service may be used later, with the same artifact/source verification obligations. **Unsigned `v1.0.0` is permitted** with an explicit warning in the GitHub Release and README; signing itself is not a blocker. Core functionality, data safety and release provenance remain mandatory gates.
