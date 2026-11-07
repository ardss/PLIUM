$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
Write-Output ('BUILD_MACHINE=' + $env:COMPUTERNAME)
& npm run build
if($LASTEXITCODE -ne 0){throw 'Vite compile failed'}
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
if($pkg.build.appId -ne 'com.ardss.plium' -or $pkg.build.productName -ne 'PLIUM') { throw 'Incorrect identity' }
if($pkg.build.PSObject.Properties['publish']){ throw 'A release publisher must not be set for this preview' }
& npx electron-builder --win nsis --x64 --publish never
if($LASTEXITCODE -ne 0){ throw ('Packaging failed with exit code '+$LASTEXITCODE) }
Write-Output 'PLIUM_PACKAGE_BUILD_PASS'
