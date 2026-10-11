# Shared browser detection + read-only policy check for MyBib Portable Backup installer.
function Get-MybibBrowsers {
    $cands = @(
        @{ Id = 'edge';    Name = 'Microsoft Edge'; Exe = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"; ExtPage = 'edge://extensions' },
        @{ Id = 'chrome';  Name = 'Google Chrome';  Exe = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"; ExtPage = 'chrome://extensions' },
        @{ Id = 'brave';   Name = 'Brave';           Exe = "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe"; ExtPage = 'brave://extensions' },
        @{ Id = 'opera';   Name = 'Opera';           Exe = "$env:ProgramFiles\Opera\opera.exe"; ExtPage = 'opera://extensions' }
    )
    foreach ($c in $cands) {
        if (Test-Path $c.Exe) {
            try { $v = (Get-Item $c.Exe).VersionInfo.FileVersion } catch { $v = '?' }
            [pscustomobject]@{ Id = $c.Id; Name = $c.Name; Exe = $c.Exe; ExtPage = $c.ExtPage; Version = $v }
        }
    }
    # Per-user installs
    $local = @(
        @{ Id = 'chrome'; Name = 'Google Chrome'; Exe = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"; ExtPage = 'chrome://extensions' },
        @{ Id = 'brave';  Name = 'Brave';          Exe = "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"; ExtPage = 'brave://extensions' }
    )
    foreach ($c in $local) { if (Test-Path $c.Exe) { [pscustomobject]@{ Id = $c.Id; Name = $c.Name; Exe = $c.Exe; ExtPage = $c.ExtPage; Version = 'user' } } }
}

function Get-MybibExtensionPolicyStatus {
    param([string]$BrowserId)
    # Read-only check of well-known policy hives; never writes.
    $roots = @('HKLM:\SOFTWARE\Policies', 'HKCU:\SOFTWARE\Policies')
    $vendors = @{ edge = @('Microsoft\Edge'); chrome = @('Google\Chrome'); brave = @('BraveSoftware\Brave'); opera = @('Opera Software\Opera') }[$BrowserId]
    if (-not $vendors) { return @() }
    $notes = @()
    foreach ($r in $roots) {
        foreach ($v in $vendors) {
            $p = Join-Path $r $v
            if (-not (Test-Path $p)) { continue }
            foreach ($k in @('ExtensionDeveloperModeSettings', 'DeveloperToolsAvailability', 'BlockExternalExtensions', 'ExtensionInstallBlocklist')) {
                try {
                    $val = Get-ItemProperty -Path $p -Name $k -ErrorAction SilentlyContinue
                    if ($val -and $val.$k -ne $null) { $notes += "$k is set by policy ($r\$v)" }
                } catch {}
            }
        }
    }
    return $notes
}
