# TROUBLESHOOTING — It's My Bib

## No MyBib tab / detection failed
Open `https://www.mybib.com/?app`, open a project, then reload the page and click the extension again. The content script only runs on `mybib.com`.

## Export failed: no data
You are in a fresh profile with no projects yet. Create a project in MyBib first.

## Export opens no dialog / nothing happens
Reload the MyBib tab once after installing or updating the extension (stale content scripts stop responding). The Export button always opens a Save dialog; if it doesn't, the MyBib tab needs a reload.

## Import failed: invalid backup
Only backup files are accepted (JSON containing `format: mybib-portable-backup`). Word/BibTeX exports from MyBib are formatted output, not restorable backups — use this tool's export instead. Older `mybib-backup-*.json` files restore fine.

## Restore contains sharedProject
Shared/server projects need MyBib Plus sync and are rejected. Export a local project instead.

## Save dialog cancelled
Cancelling leaves everything unchanged — a cancelled backup or restore changes nothing. Each job's status pill shows Cancelled / Error explicitly.

## Blocked by IT policy
The installer never bypasses policy. Ask IT to allow this extension ID or allow Developer Mode / unpacked installs for your user. Host access is limited to `https://www.mybib.com/*`; permissions are `storage` and `downloads`.

## Firefox
Deferred; needs free Mozilla AMO signing for persistence.
