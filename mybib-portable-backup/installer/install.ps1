#Requires -Version 5.1
<#
.SYNOPSIS
  MyBib Portable Backup -- setup assistant (user-local, no admin required).
.DESCRIPTION
  1. Detects Edge / Chrome / Brave / Opera. 2. Lets you pick target browser(s).
  3. Verifies package files. 4. Read-only browser-policy pre-check.
  5. Copies the extension to %LOCALAPPDATA%\MyBibPortableBackup (no elevation).
  6. Opens the browser extensions page + prints the 3 manual Load-unpacked steps.
  Nothing is elevated, no registry/policy/AV changes are ever made.
#>
[CmdletBinding()]
param(
    [string]$Browsers = '',
    [switch]$AcceptPolicyRisk,
    [switch]$Unattended
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\detect-browsers.ps1"

$PackageRoot = Split-Path $PSScriptRoot -Parent
$ExtSource   = Join-Path $PackageRoot 'extension'
$TargetName  = 'MyBib Portable Backup'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'MyBibPortableBackup'
$InstallDest = Join-Path $InstallRoot 'extension'
$TargetSite  = 'https://www.mybib.com'

function Write-Head($t) { Write-Host ''; Write-Host $t -ForegroundColor Cyan }
function Write-Ok($t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function Write-Warn($t) { Write-Host "  [!!] $t" -ForegroundColor Yellow }
function Write-Err($t)  { Write-Host "  [XX] $t" -ForegroundColor Red }

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  MyBib Portable Backup -- Setup' -ForegroundColor Cyan
Write-Host '  Local / user installation. Administrator rights NOT required.' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

Write-Head 'Detected browsers:'
$detected = @(Get-MybibBrowsers | Where-Object { $_ })
if ($detected.Count -eq 0) {
    Write-Err 'No supported browser found. Install Microsoft Edge or Google Chrome first.'
    if (-not $Unattended) { Read-Host 'Press Enter to exit' }; exit 1
}
for ($i = 0; $i -lt $detected.Count; $i++) {
    Write-Host ("  [{0}] {1}  (v{2})" -f ($i + 1), $detected[$i].Name, $detected[$i].Version)
}
Write-Host ("  [A] All ({0})" -f ($detected.Name -join ' + '))
Write-Host '  [Q] Cancel'
if ($Browsers -ne '') { $choice = $Browsers.Trim().ToUpper() } else { $choice = (Read-Host 'Select browser(s)').Trim().ToUpper() }
if ($choice -eq 'Q' -or $choice -eq '') { Write-Host 'Cancelled.'; exit 0 }
if ($choice -eq 'A') { $selected = $detected } else {
    $idx = @()
    foreach ($part in ($choice -split '[,\s]+')) {
        $n = 0
        if ([int]::TryParse($part, [ref]$n) -and $n -ge 1 -and $n -le $detected.Count) { $idx += ($n - 1) }
    }
    $idx = $idx | Sort-Object -Unique
    if ($idx.Count -eq 0) { Write-Err 'Invalid selection.'; exit 1 }
    $selected = @($idx | ForEach-Object { $detected[$_] })
}

Write-Head 'Verifying package files:'
$required = @('manifest.json', 'src\common\schema.js', 'src\content\adapter.js', 'src\content\restore.js',
              'src\popup\popup.html', 'src\popup\popup.js',
              'src\importer\importer.html', 'src\importer\importer.js',
              'src\options\options.html', 'src\options\options.js')
$bad = $false
foreach ($rel in $required) {
    $p = Join-Path $ExtSource $rel
    if (Test-Path $p) { Write-Ok $rel } else { Write-Err "missing: $rel"; $bad = $true }
}
try {
    $manifest = Get-Content (Join-Path $ExtSource 'manifest.json') -Raw | ConvertFrom-Json
    Write-Ok ("manifest valid: {0} v{1}" -f $manifest.name, $manifest.version)
} catch { Write-Err 'manifest.json is not valid JSON.'; $bad = $true }
if ($bad) {
    Write-Err 'Package verification failed. Re-extract the ZIP and retry.'
    if (-not $Unattended) { Read-Host 'Press Enter to exit' }; exit 1
}

Write-Head 'Browser policy pre-check (no changes made):'
$blocked = @()
foreach ($b in $selected) {
    $notes = @(Get-MybibExtensionPolicyStatus -BrowserId $b.Id)
    if ($notes.Count -eq 0) { Write-Ok ("{0}: no blocking policy detected" -f $b.Name) }
    else { foreach ($n in $notes) { Write-Warn ("{0}: {1}" -f $b.Name, $n) }; $blocked += $b }
}
if ($blocked.Count -gt 0) {
    Write-Host ''
    Write-Warn 'Browser policy may prevent local extension installation.'
    Write-Host '  The setup assistant will NOT bypass this. To proceed you need IT to allow'
    Write-Host '  this extension (see TROUBLESHOOTING.md, section "Blocked by IT policy").'
    Write-Host ''
    if ($AcceptPolicyRisk) { $go = 'Y' } else { $go = (Read-Host 'Continue anyway? Files will still be copied, but the browser may refuse to load them. [y/N]').Trim().ToUpper() }
    if ($go -ne 'Y') { Write-Host 'Cancelled.'; exit 0 }
}

Write-Head 'Installing files (user-local, no admin):'
try {
    if (Test-Path $InstallDest) { Remove-Item -Recurse -Force $InstallDest }
    New-Item -ItemType Directory -Force -Path $InstallDest | Out-Null
    Copy-Item -Recurse -Force (Join-Path $ExtSource '*') $InstallDest
    $receipt = [ordered]@{
        product    = $TargetName
        extVersion = $manifest.version
        installedAt = (Get-Date).ToString('s')
        installedBy = $env:USERNAME
        source     = $ExtSource
        dest       = $InstallDest
    }
    $receipt | ConvertTo-Json | Set-Content (Join-Path $InstallRoot 'install-info.json') -Encoding UTF8
    Write-Ok "copied to $InstallDest"
} catch {
    Write-Err ("copy failed: {0}" -f $_.Exception.Message); exit 1
}

Set-Clipboard -Value $InstallDest
Write-Head 'Next: one-time browser action (per selected browser):'
foreach ($b in $selected) {
    Write-Host ("  {0}: Opening {1} ..." -f $b.Name, $b.ExtPage)
    try { Start-Process $b.Exe $b.ExtPage } catch { Write-Warn ("could not launch {0}: {1}" -f $b.Name, $_.Exception.Message) }
}
Write-Host ''
Write-Host '  1. Turn ON Developer mode (top corner).'
Write-Host '  2. Click Load unpacked.'
Write-Host ("  3. Paste (Ctrl+V): $InstallDest  -> Select Folder.")
Write-Host ('  4. Open {0}, open a project, click the extension icon.' -f $TargetSite)
Write-Host ''
Write-Host 'The folder path is already in your clipboard.'
Write-Ok 'Setup assistant done.'
if (-not $Unattended) { Read-Host 'Press Enter to exit' }
