#Requires -Version 5.1
<#
.SYNOPSIS
  It's My Bib -- removal (user-local only).
#>
$ErrorActionPreference = 'Stop'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'ItsMyBib'
if (Test-Path $InstallRoot) {
    Remove-Item -Recurse -Force $InstallRoot
    Write-Host "Removed $InstallRoot" -ForegroundColor Green
} else {
    Write-Host 'Nothing to remove.' -ForegroundColor Yellow
}
Write-Host "Then, on each browser extensions page, click Remove on the It's My Bib card."
