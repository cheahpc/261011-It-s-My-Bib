#Requires -Version 5.1
<#
.SYNOPSIS
  MyBib Portable Backup -- removal (user-local only).
#>
$ErrorActionPreference = 'Stop'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'MyBibPortableBackup'
if (Test-Path $InstallRoot) {
    Remove-Item -Recurse -Force $InstallRoot
    Write-Host "Removed $InstallRoot" -ForegroundColor Green
} else {
    Write-Host 'Nothing to remove.' -ForegroundColor Yellow
}
Write-Host 'Then, on each browser extensions page, click Remove on the MyBib Portable Backup card.'
