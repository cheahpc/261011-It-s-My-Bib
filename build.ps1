#Requires -Version 5.1
<#
.SYNOPSIS
  Maintainer build: validate + package the ZIP.
.DESCRIPTION
  Run from the its-my-bib folder. Produces release\ItsMyBib-v<VERSION>.zip
  with top-level folder ItsMyBib\. No admin required.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
$ReleaseDir = Join-Path $Root 'release'
$ZipName = "ItsMyBib-v$Version.zip"
function Step($t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host "XX $t" -ForegroundColor Red; exit 1 }

Step 'Validate package'
$required = @('extension\manifest.json', 'extension\src\common\schema.js',
  'extension\src\content\adapter.js', 'extension\src\content\restore.js',
  'extension\src\popup\popup.html', 'extension\src\popup\popup.js',
  'extension\src\importer\importer.html', 'extension\src\importer\importer.js',
  'extension\src\options\options.html', 'extension\src\options\options.js',
  'extension\icons\logo.svg', 'extension\icons\icon16.png', 'extension\icons\icon48.png', 'extension\icons\icon128.png',
  'installer\install.ps1', 'installer\uninstall.ps1', 'installer\detect-browsers.ps1',
  'installer\batch\install.cmd', 'installer\batch\uninstall.cmd',
  'README.md', 'LICENSE', 'DISCLAIMER.md', 'INSTALL.md', 'CHANGELOG.md', 'TROUBLESHOOTING.md', 'DEPLOYMENT.md', 'VERSION')
foreach ($rel in $required) { if (-not (Test-Path (Join-Path $Root $rel))) { Fail "missing: $rel" } }
Write-Host '   all required files present'
try {
    $manifest = Get-Content (Join-Path $Root 'extension\manifest.json') -Raw | ConvertFrom-Json
    if ($manifest.name -ne "It's My Bib") { Fail 'manifest name mismatch' }
    if (-not $manifest.author -or -not $manifest.homepage_url) { Fail 'manifest author/homepage missing' }
    Write-Host '   manifest JSON valid'
} catch { Fail ("manifest invalid: {0}" -f $_.Exception.Message) }
foreach ($jsf in @('extension\src\common\schema.js', 'extension\src\content\adapter.js', 'extension\src\content\restore.js',
                   'extension\src\popup\popup.js', 'extension\src\importer\importer.js', 'extension\src\options\options.js',
                   'docs\shots\capture.mjs')) {
    node --check (Join-Path $Root $jsf)
    if ($LASTEXITCODE -ne 0) { Fail "syntax error: $jsf" }
}
Write-Host '   JS syntax OK'

Step "Create $ZipName"
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
$stage = Join-Path $env:TEMP 'itsmybib-pkg-stage'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'ItsMyBib') | Out-Null
Copy-Item -Recurse -Force (Join-Path $Root 'extension') (Join-Path $stage 'ItsMyBib')
Copy-Item -Recurse -Force (Join-Path $Root 'installer') (Join-Path $stage 'ItsMyBib')
Copy-Item -Recurse -Force (Join-Path $Root 'docs\img') (Join-Path $stage 'ItsMyBib\docs\img')
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'ItsMyBib\docs\shots') | Out-Null
Copy-Item -Force (Join-Path $Root 'docs\shots\capture.mjs') (Join-Path $stage 'ItsMyBib\docs\shots\capture.mjs')
Copy-Item -Force (Join-Path $Root 'docs\shots\package.json') (Join-Path $stage 'ItsMyBib\docs\shots\package.json')
foreach ($f in @('README.md','LICENSE','DISCLAIMER.md','INSTALL.md','CHANGELOG.md','TROUBLESHOOTING.md','DEPLOYMENT.md','VERSION')) {
    Copy-Item -Force (Join-Path $Root $f) (Join-Path $stage 'ItsMyBib')
}
$zipPath = Join-Path $ReleaseDir $ZipName
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $stage 'ItsMyBib') -DestinationPath $zipPath
Remove-Item -Recurse -Force $stage
$size = (Get-Item $zipPath).Length
Write-Host ("   wrote {0} ({1:N0} bytes)" -f $zipPath, $size)
Write-Host ''
Write-Host 'Build OK.' -ForegroundColor Green
