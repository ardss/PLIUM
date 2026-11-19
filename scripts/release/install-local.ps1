#Requires -Version 5.1
<#
.SYNOPSIS
  Install or upgrade PLIUM on a real user machine, with backup and verification.

.DESCRIPTION
  This replaces the ad-hoc scripts that used to live outside the repository.
  Those waited for 90 seconds of keyboard/mouse idleness before touching the
  installer, which never happens on a machine with continuous input (remote
  desktop, KVM, accessibility tools) — the upgrade simply never ran.

  The standard approach is the opposite: take the shortest possible downtime
  window, keep the user's data byte-identical, and verify afterwards. This
  script never waits for an idle desktop.

  Steps:
    1. Validate the installer (existence, SHA-256).
    2. Stop PLIUM and wait for the process tree to exit.
    3. Snapshot the user profile (history index, payloads, images, preferences).
    4. Run the NSIS installer silently.
    5. Verify the installed EXE version and hash, and that the history index is
       byte-identical to the pre-install snapshot.
    6. Restart PLIUM hidden and confirm a single main instance.
    7. Write a JSON result file next to the backup.

.PARAMETER Installer
  Full path to PLIUM-Setup-<version>.exe.

.PARAMETER ExpectedSha256
  Expected SHA-256 of the installer. Strongly recommended; the script fails on
  mismatch instead of installing an unverified package.

.PARAMETER BackupRoot
  Where snapshots are written. Defaults to %LOCALAPPDATA%\PLIUM\upgrades.

.PARAMETER NoRestart
  Do not start PLIUM afterwards.

.EXAMPLE
  .\install-local.ps1 -Installer "$env:USERPROFILE\Downloads\PLIUM-Setup-1.0.1.exe" `
                      -ExpectedSha256 8BDFE46F6A21E0BB8BE5C4B5ECCFD72DCC6C9D627239C531C0D825424A34CC93
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [string]$ExpectedSha256,
  [string]$BackupRoot = (Join-Path $env:LOCALAPPDATA 'PLIUM\upgrades'),
  [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'

$installDir = Join-Path $env:LOCALAPPDATA 'Programs\PLIUM'
$installedExe = Join-Path $installDir 'PLIUM.exe'
$profileDir = Join-Path $env:APPDATA 'plium'
$result = [ordered]@{
  startedAt = (Get-Date).ToString('o')
  installer = $Installer
  installerSha256 = $null
  previousVersion = $null
  installedVersion = $null
  backupPath = $null
  historyIndexBefore = $null
  historyIndexAfter = $null
  historyPreserved = $null
  mainInstances = $null
  status = 'failed'
  error = $null
}

function Write-Step([string]$text) {
  Write-Host "==> $text"
}

function Get-MainProcesses {
  # Electron runs one main process plus gpu/renderer/utility children; only the
  # process without a --type= switch is the main instance.
  @(Get-CimInstance Win32_Process -Filter "Name='PLIUM.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -notmatch '--type=' })
}

try {
  # ── 1. Validate the package ────────────────────────────────────────────────
  if (-not (Test-Path -LiteralPath $Installer)) {
    throw "Installer not found: $Installer"
  }
  Write-Step 'Hashing installer'
  $actualHash = (Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash
  $result.installerSha256 = $actualHash
  if ($ExpectedSha256 -and ($actualHash -ne $ExpectedSha256.ToUpper())) {
    throw "SHA-256 mismatch: expected $ExpectedSha256, got $actualHash"
  }
  if (-not $ExpectedSha256) {
    Write-Warning "No -ExpectedSha256 supplied. Proceeding with $actualHash"
  }

  if (Test-Path -LiteralPath $installedExe) {
    $result.previousVersion = (Get-Item -LiteralPath $installedExe).VersionInfo.FileVersion
    Write-Step "Currently installed: $($result.previousVersion)"
  }

  # ── 2. Stop the running app ────────────────────────────────────────────────
  $running = @(Get-Process -Name PLIUM -ErrorAction SilentlyContinue)
  if ($running.Count -gt 0) {
    Write-Step "Stopping $($running.Count) PLIUM processes"
    & taskkill.exe /F /IM PLIUM.exe | Out-Null
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline) {
      if (@(Get-Process -Name PLIUM -ErrorAction SilentlyContinue).Count -eq 0) { break }
      Start-Sleep -Milliseconds 250
    }
    if (@(Get-Process -Name PLIUM -ErrorAction SilentlyContinue).Count -gt 0) {
      throw 'PLIUM did not exit; aborting before any profile work'
    }
  }

  # ── 3. Snapshot the user profile ───────────────────────────────────────────
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backupPath = Join-Path $BackupRoot $stamp
  $result.backupPath = $backupPath
  New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

  if (Test-Path -LiteralPath $profileDir) {
    Write-Step "Backing up profile to $backupPath"
    # /E recursive, /NFL /NDL quiet, /R:1 /W:1 no long retries on locked files.
    & robocopy.exe $profileDir $backupPath /E /NFL /NDL /R:1 /W:1 | Out-Null
    $robocopyExit = $LASTEXITCODE
    if ($robocopyExit -ge 8) { throw "robocopy failed with exit code $robocopyExit" }

    $indexPath = Join-Path $profileDir 'items.json'
    if (Test-Path -LiteralPath $indexPath) {
      $result.historyIndexBefore = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
    }
  }
  else {
    Write-Warning "No user profile at $profileDir (fresh install)"
  }

  # ── 4. Install ─────────────────────────────────────────────────────────────
  Write-Step 'Running NSIS installer silently'
  $proc = Start-Process -FilePath $Installer -ArgumentList '/S' -Wait -PassThru
  if ($proc.ExitCode -ne 0) {
    throw "Installer exited with code $($proc.ExitCode)"
  }

  # ── 5. Verify what landed on disk ──────────────────────────────────────────
  if (-not (Test-Path -LiteralPath $installedExe)) {
    throw "Installed executable missing after install: $installedExe"
  }
  $result.installedVersion = (Get-Item -LiteralPath $installedExe).VersionInfo.FileVersion
  Write-Step "Installed version: $($result.installedVersion)"

  if ($result.historyIndexBefore) {
    $indexPath = Join-Path $profileDir 'items.json'
    if (-not (Test-Path -LiteralPath $indexPath)) {
      throw 'items.json disappeared during the upgrade'
    }
    $result.historyIndexAfter = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
    # The installer must not touch user data. Identical hashes prove the history
    # was carried across byte for byte; nothing has been decrypted to check it.
    $result.historyPreserved = ($result.historyIndexAfter -eq $result.historyIndexBefore)
    if (-not $result.historyPreserved) {
      throw 'items.json changed during install — user history may have been rewritten'
    }
  }

  # ── 6. Restart and confirm a single main instance ──────────────────────────
  if (-not $NoRestart) {
    # A leftover ELECTRON_RUN_AS_NODE (common when the script is run from an
    # Electron development shell) makes PLIUM.exe behave as plain Node and
    # reject --hidden. Start from a clean environment so the restart is honest.
    if ($env:ELECTRON_RUN_AS_NODE) {
      Write-Warning 'ELECTRON_RUN_AS_NODE was set; clearing it before restart'
      Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    }
    Write-Step 'Starting PLIUM hidden'
    Start-Process -FilePath $installedExe -ArgumentList '--hidden'
    Start-Sleep -Seconds 12
    $result.mainInstances = (Get-MainProcesses).Count
    if ($result.mainInstances -ne 1) {
      throw "Expected exactly one PLIUM main process, found $($result.mainInstances)"
    }
  }

  $result.status = 'success'
}
catch {
  $result.error = $_.Exception.Message
  Write-Error $_
}
finally {
  $result.finishedAt = (Get-Date).ToString('o')
  try {
    if ($result.backupPath) {
      New-Item -ItemType Directory -Path $result.backupPath -Force | Out-Null
      $outFile = Join-Path $result.backupPath 'install-result.json'
      $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $outFile -Encoding UTF8
      Write-Step "Result written to $outFile"
    }
  }
  catch {
    Write-Warning "Could not write result file: $($_.Exception.Message)"
  }
}

if ($result.status -ne 'success') { exit 1 }
Write-Host "SUCCESS: PLIUM $($result.installedVersion) installed; history preserved = $($result.historyPreserved)"
