# MyBib Portable Backup — v1.0.0

Local-first portable backup/restore for your own MyBib bibliography projects.

- Detects MyBib at `https://www.mybib.com/?app`, shows project count and last update.
- Export: one button, all projects + data as one file, via a Save dialog (pick any folder, e.g. OneDrive).
- Import: one button opens the importer tab — choose file, review contents, save a safety copy via Save dialog, then restore.
- Plain JSON backup file. Reads only `IndexedDB mybib.general.appState` already in your browser profile. No Plus bypass, no server calls, no telemetry, no cookie/token export.

## Contents

- `extension/` — MV3 extension (Edge, Chrome, Brave, Opera).
- `installer/` — `install.ps1` / `uninstall.ps1` / `detect-browsers.ps1` + `batch/` fallback.
- `docs/` — setup screenshots.
- `INSTALL.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md`, `DEPLOYMENT.md`.

## Quick start

See **INSTALL.md**: extract ZIP → run `installer\install.ps1` → Load unpacked → open MyBib → click extension icon.
