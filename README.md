# It's My Bib 📦

![MIT](https://img.shields.io/badge/license-MIT-green) ![MV3](https://img.shields.io/badge/manifest-V3-blue) ![version](https://img.shields.io/badge/version-1.0.0-informational)

A lightweight, **local-first** browser extension that backs up and restores **your own** MyBib bibliography projects — without needing a MyBib Plus subscription for this independent local-backup functionality.

MyBib's Word/JSON exports give you a *formatted bibliography*. **It's My Bib** preserves your **editable working data** (projects, folders, citations, settings, order) as one portable JSON file you can carry between computers — e.g. inside a OneDrive-synced folder.

![Popup](docs/img/02-popup.png)

## Features

- 🔍 **Auto-detects MyBib** (`mybib.com`) and your local projects.
- 📥 **Export** — one button, all projects + data, one JSON file, via a Save dialog (pick any folder).
- 📤 **Import** — full-tab importer: choose file → review contents → **Backup** current data and/or **Restore only**, each with a live status pill (Idle / Processing / Done / Cancelled / Error).
- 🔒 **Safe-overwrite restore** — save a safety copy first, or restore directly. Cancelling changes nothing.
- 🚫 **Local only** — no accounts, no servers, no telemetry, no Plus bypass, no cookie/token access. See [DISCLAIMER.md](DISCLAIMER.md).

![Importer](docs/img/03-importer.png)

## Install (5 min, no admin)

1. Download `ItsMyBib-v1.0.0.zip` from [Releases](../../releases) and **Extract All…**.
2. Run `installer\install.ps1` (or `installer\batch\install.cmd`), pick your browser (Edge / Chrome / Brave / Opera).
3. On the extensions page: turn ON **Developer mode** → **Load unpacked** → paste the copied folder path.
4. Open <https://www.mybib.com/?app> (reload the tab once), click the **It's My Bib** icon.

Full guide with screenshots: [**INSTALL.md**](INSTALL.md) · Problems? [**TROUBLESHOOTING.md**](TROUBLESHOOTING.md)

## How it works

MyBib (free tier) stores your working data in your own browser profile (`IndexedDB mybib.general.appState`). It's My Bib reads that data, validates it, and writes it back on restore — everything stays on your machines.

![MyBib app](docs/img/01-mybib-app.png)

## Project layout

```text
.
  extension/    the MV3 extension (content scripts, popup, importer, options)
  installer/    user-local setup assistant (PowerShell + batch fallback)
  docs/         guides + screenshots (docs/img, capture.mjs regenerates them)
  LICENSE  DISCLAIMER.md  INSTALL.md  TROUBLESHOOTING.md  CHANGELOG.md  DEPLOYMENT.md
```

Maintainer: edit code/docs → run `build.ps1` → test → commit. Screenshots: `node docs/capture.mjs` (sanitized demo data only).

## Author

**Cheah Pin Chee** — <https://github.com/cheahpc>

## License

[MIT](LICENSE) © 2026 Cheah Pin Chee. Independent community tool — **not affiliated with or endorsed by MyBib**. Use of MyBib itself remains subject to [MyBib's Terms](https://www.mybib.com/terms). Details in [DISCLAIMER.md](DISCLAIMER.md).
