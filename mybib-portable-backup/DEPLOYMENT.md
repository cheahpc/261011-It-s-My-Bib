# DEPLOYMENT — MyBib Portable Backup v1.0.0

Deployment method mirrors `C:\dev\260929 TMS Server Translation Workaround\` (MV3 unpacked + user-local installer).

## 1. Handoff
Hand the ZIP `release/MyBib-Portable-Backup-v1.0.0.zip`. Nothing else needed. No store, no account.

## 2. No admin?
Yes. Files copy to `%LOCALAPPDATA%\MyBibPortableBackup`; Developer Mode is per-user; Load unpacked needs no privileges.

## 3. Developer Mode?
Yes, one-time per browser (official mechanism, not a hack).

## 4. Install from ZIP?
No — Chromium cannot install from ZIP/CRX by double-click. Flow: extract → `install.ps1` → Load unpacked → paste folder.

## 5. CRX / EXE?
No. Non-store CRX is blocked; EXE cannot click Load unpacked and adds AV friction. PowerShell only.

## 6. IT block?
`install.ps1` + `detect-browsers.ps1` do a read-only policy check and stop with a contact-IT message; never bypass.

## Verification (this release)
Manifest JSON valid, JS syntax via `node --check`, package file list, ZIP extract + reinstall drill. Live MyBib storage findings (IndexedDB `mybib.general.appState`, hash-route project ID, Plus-gated share) documented in Phase 1 report.
