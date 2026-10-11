#Requires -Version 5.1
<#
.SYNOPSIS
  Maintainer build: validate + package the ZIP.
.DESCRIPTION
  Run from the mybib-portable-backup folder. Produces release\MyBib-Portable-Backup-v<VERSION>.zip
  with top-level folder MyBib-Portable-Backup\. No admin required.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
$ReleaseDir = Join-Path $Root 'release'
$ZipName = "MyBib-Portable-Backup-v$Version.zip"
function Step($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host "XX $t" -ForegroundColor Red; exit 1 }

Step 'Validate package'
$required = @('extension\manifest.json', 'extension\src\common\schema.js',
  'extension\src\content\adapter.js', 'extension\src\content\restore.js',
  'extension\src\popup\popup.html', 'extension\src\popup\popup.js',
  'extension\src\importer\importer.html', 'extension\src\importer\importer.js',
  'extension\src\options\options.html', 'extension\src\options\options.js',
  'extension\icons\icon16.png', 'extension\icons\icon48.png', 'extension\icons\icon128.png',
  'installer\install.ps1', 'installer\uninstall.ps1', 'installer\detect-browsers.ps1',
  'installer\batch\install.cmd', 'installer\batch\uninstall.cmd',
  'README.md', 'INSTALL.md', 'CHANGELOG.md', 'TROUBLESHOOTING.md', 'DEPLOYMENT.md', 'VERSION')
foreach ($rel in $required) { if (-not (Test-Path (Join-Path $Root $rel))) { Fail "missing: $rel" } }
Write-Host '   all required files present'
try {
    Get-Content (Join-Path $Root 'extension\manifest.json') -Raw | ConvertFrom-Json | Out-Null
    Write-Host '   manifest JSON valid'
} catch { Fail ("manifest JSON invalid: {0}" -f $_.Exception.Message) }
foreach ($jsf in @('extension\src\common\schema.js', 'extension\src\content\adapter.js', 'extension\src\content\restore.js',
                   'extension\src\popup\popup.js', 'extension\src\importer\importer.js', 'extension\src\options\options.js')) {
    node --check (Join-Path $Root $jsf)
    if ($LASTEXITCODE -ne 0) { Fail "syntax error: $jsf" }
}
Write-Host '   JS syntax OK'

Step "Create $ZipName"
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
$stage = Join-Path $env:TEMP 'mybib-pkg-stage'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'MyBib-Portable-Backup') | Out-Null
Copy-Item -Recurse -Force (Join-Path $Root 'extension') (Join-Path $stage 'MyBib-Portable-Backup')
Copy-Item -Recurse -Force (Join-Path $Root 'installer') (Join-Path $stage 'MyBib-Portable-Backup')
Copy-Item -Recurse -Force (Join-Path $Root 'docs') (Join-Path $stage 'MyBib-Portable-Backup')
foreach ($f in @('README.md','INSTALL.md','CHANGELOG.md','TROUBLESHOOTING.md','DEPLOYMENT.md','VERSION')) {
    Copy-Item -Force (Join-Path $Root $f) (Join-Path $stage 'MyBib-Portable-Backup')
}
$zipPath = Join-Path $ReleaseDir $ZipName
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Remove-Item (Join-Path $stage 'MyBib-Portable-Backup\build.ps1') -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage 'MyBib-Portable-Backup') -DestinationPath $zipPath
Remove-Item -Recurse -Force $stage
$size = (Get-Item $zipPath).Length
Write-Host ("   wrote {0} ({1:N0} bytes)" -f $zipPath, $size)
Write-Host ''
Write-Host 'Build OK.' -ForegroundColor Green
