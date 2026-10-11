# DEPLOYMENT — It's My Bib v1.0.0

Deployment method mirrors `C:\dev\260929 TMS Server Translation Workaround\` (MV3 unpacked + user-local installer).

## 1. Handoff / GitHub Release
Attach `ItsMyBib-v1.0.0.zip` (from `build.ps1`, in ignored `release/`) to the GitHub Release. Nothing else needed. No store, no account.

## 2. No admin?
Yes. Files copy to `%LOCALAPPDATA%\ItsMyBib`; Developer Mode is per-user; Load unpacked needs no privileges.

## 3. Developer Mode?
Yes, one-time per browser (official mechanism, not a hack).

## 4. Install from ZIP?
No — Chromium cannot install from ZIP/CRX by double-click. Flow: extract → `install.ps1` → Load unpacked → paste folder.

## 5. CRX / EXE?
No. Non-store CRX is blocked; EXE cannot click Load unpacked and adds AV friction. PowerShell only.

## 6. IT block?
`install.ps1` + `detect-browsers.ps1` do a read-only policy check and stop with a contact-IT message; never bypass.

## Verification (this release)
Manifest JSON valid (author + homepage), JS syntax via `node --check`, package file list, ZIP extract + reinstall drill, Playwright screenshot run (`docs/capture.mjs`, sanitized demo data). Live MyBib storage findings (IndexedDB `mybib.general.appState`, hash-route project ID, Plus-gated share) documented in the project history.
