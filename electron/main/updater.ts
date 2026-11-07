// PLIUM preview: updates disabled until our own verified release feed exists.
// Upstream update implementation remains accessible in Git history.
export interface CachedUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  downloaded: boolean
  downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
}
export function getCachedUpdateState(): CachedUpdateInfo | null { return null }
export function clearCachedUpdateState(): void {}
export function quitAndInstallUpdate(): void {}
export function syncAutoUpdaterState(): void {}
export function triggerBackgroundCheck(delayMs = 3000): void { void delayMs }
export async function checkForUpdatesManual(): Promise<{ status: string; version?: string; error?: string }> {
  return { status: 'error', error: 'PLIUM preview updates are disabled until a verified release channel exists.' }
}
export async function startUpdateDownload(): Promise<void> {}
export function initAutoUpdater(): void {}
