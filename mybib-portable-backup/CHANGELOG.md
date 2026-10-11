# CHANGELOG

## 1.0.0 (2026-10-11)
- Initial release: detect MyBib, export all projects + data as one plain-JSON file via Save dialog, full-tab importer with preview + manual safety-copy Save dialog + restore, user-local installer + batch fallback, docs.
- Fixed Brave export failure: removed the service-worker blob-URL download hop and the popup File System Access picker; downloads now go straight from the popup/importer tab via `chrome.downloads` with `saveAs:true`. Popup simplified to 2 buttons (Export / Import); single-project export removed; icons are bundled Google Material Symbols (inline SVG, no CDN).
- Importer Step 2 split into Backup and Restore-only buttons, each with a status pill (Idle / Processing / Done / Cancelled / Error).
