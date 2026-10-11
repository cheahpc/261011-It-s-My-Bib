/* Full-tab importer: open dialog -> preview -> manual safety save -> restore. Local only. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const msgEl = $('msg'), summaryEl = $('summary'), restoreCard = $('restoreCard');
  const btnChoose = $('btnChoose'), btnBackup = $('btnBackup'), btnRestore = $('btnRestore'), fileInput = $('file');
  const backupStatus = $('backupStatus'), backupDetail = $('backupDetail');
  const restoreStatus = $('restoreStatus'), restoreDetail = $('restoreDetail');
  let envelope = null, fileName = '', tabId = null, backupDone = false;

  function msg(text, cls) { msgEl.className = 'msg ' + (cls || ''); msgEl.textContent = text; }
  function setJob(pill, detail, state, label, note) {
    pill.className = 'pill ' + state;
    pill.textContent = label;
    if (note !== undefined) detail.textContent = note;
  }

  function msg(text, cls) { msgEl.className = 'msg ' + (cls || ''); msgEl.textContent = text; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  async function currentMyBibTab() {
    const tabs = await chrome.tabs.query({ url: 'https://www.mybib.com/*' });
    if (tabs.length === 0) return null;
    const active = await chrome.tabs.query({ active: true, currentWindow: true });
    if (active[0] && /^https:\/\/www\.mybib\.com\//.test(active[0].url || '')) return active[0];
    return tabs[0];
  }

  function sendToContent(type, extra) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, Object.assign({ target: 'mybib-content', type }, extra || {}), (resp) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!resp) return reject(new Error('No response from MyBib tab — open MyBib in a tab and reload it, then retry.'));
        if (!resp.ok) return reject(new Error(resp.error || 'Unknown error.'));
        resolve(resp.data);
      });
    });
  }

  function downloadWithSaveDialog(text, filename) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename, saveAs: true }, (dlId) => {
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (dlId === undefined) return reject(new Error('Save was cancelled — nothing was changed.'));
        resolve(dlId);
      });
    });
  }

  function countProjects(appState) {
    const out = [];
    (function walk(children, path) {
      (children || []).forEach((c) => {
        if (!c || typeof c !== 'object') return;
        if (c.type === 'project') out.push({ title: c.title || '(untitled)', refs: Array.isArray(c.references) ? c.references.length : 0, path });
        else if (c.type === 'folder' && Array.isArray(c.children)) walk(c.children, (path ? path + ' / ' : '') + (c.name || 'folder'));
      });
    })((appState && appState.items && appState.items.children) || [], '');
    return out;
  }

  btnChoose.addEventListener('click', async () => {
    try {
      const tab = await currentMyBibTab();
      if (!tab) { msg('Open MyBib first: https://www.mybib.com/?app — then come back here.', 'bad'); return; }
      tabId = tab.id;
      try { await sendToContent('detect'); } catch (e) { msg('MyBib tab found but not responding — reload the MyBib page, then choose the file again.', 'bad'); return; }
      fileInput.click();
    } catch (e) { msg('Failed: ' + e.message, 'bad'); }
  });

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    fileName = f.name;
    try {
      const text = await f.text();
      let env;
      try { env = JSON.parse(text); } catch (e) { msg('"' + f.name + '" is not valid JSON.', 'bad'); return; }
      if (!env || env.format !== 'mybib-portable-backup') { msg('"' + f.name + '" is not a MyBib Portable Backup file (Word/BibTeX exports cannot be restored).', 'bad'); return; }
      if (env.formatVersion !== 1 || (env.scope !== 'full' && env.scope !== 'single-project') || !env.appState) { msg('Unsupported or corrupt backup file.', 'bad'); return; }
      envelope = env;
      const projects = countProjects(env.appState);
      let html = `<p><b>${escapeHtml(f.name)}</b> — scope: ${escapeHtml(env.scope)} · exported ${escapeHtml(env.exportedAt || '—')}</p>`;
      html += '<table><thead><tr><th>Project</th><th>Refs</th><th>Folder</th></tr></thead><tbody>';
      projects.forEach((p) => { html += `<tr><td>${escapeHtml(p.title)}</td><td>${p.refs}</td><td>${escapeHtml(p.path || '—')}</td></tr>`; });
      summaryEl.innerHTML = html + '</tbody></table>';
      restoreCard.style.display = '';
      backupDone = false;
      setJob(backupStatus, backupDetail, '', 'Idle', 'Saves this PC’s current data via a Save dialog.');
      setJob(restoreStatus, restoreDetail, '', 'Idle', 'No safety copy saved yet — proceeding overwrites this PC’s data.');
      msg('Backup loaded. Review it above, then back up and/or restore in Step 2.', 'good');
    } catch (e) { msg('Could not read file: ' + e.message, 'bad'); }
  });

  btnBackup.addEventListener('click', async () => {
    if (!envelope) return;
    btnBackup.disabled = true;
    setJob(backupStatus, backupDetail, 'processing', 'Backing up…', 'Reading this PC’s data, then a Save dialog opens…');
    try {
      const cur = await sendToContent('export-full');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const filename = `mybib-pre-restore-${stamp}.json`;
      await downloadWithSaveDialog(JSON.stringify(cur.envelope, null, 2), filename);
      backupDone = true;
      setJob(backupStatus, backupDetail, 'done', 'Done', 'Saved: ' + filename);
      if (restoreStatus.textContent !== 'Done') setJob(restoreStatus, restoreDetail, '', 'Idle', 'Safety copy saved — restore is safe to run.');
      msg('Safety copy saved.', 'good');
    } catch (e) {
      if (/cancelled/i.test(e.message)) {
        setJob(backupStatus, backupDetail, 'cancelled', 'Cancelled', 'Save cancelled — nothing was changed.');
      } else if (/No MyBib data|no data/i.test(e.message)) {
        setJob(backupStatus, backupDetail, 'done', 'Done', 'Nothing to back up — this profile has no local data.');
      } else {
        setJob(backupStatus, backupDetail, 'error', 'Error', e.message);
      }
    }
    btnBackup.disabled = false;
  });

  btnRestore.addEventListener('click', async () => {
    if (!envelope) return;
    btnRestore.disabled = true;
    setJob(restoreStatus, restoreDetail, 'processing', 'Restoring…', 'Writing the backup into MyBib…');
    try {
      await sendToContent('restore', { envelope });
      try {
        const cur = await chrome.storage.local.get({ history: [] });
        const h = Array.isArray(cur.history) ? cur.history : [];
        h.unshift({ when: new Date().toISOString(), scope: 'restore:' + (envelope.scope || '?'), filename: fileName, activeProjectId: envelope.activeProjectId || null });
        await chrome.storage.local.set({ history: h.slice(0, 30) });
      } catch (e) {}
      setJob(restoreStatus, restoreDetail, 'done', 'Done', backupDone ? 'Restored (safety copy saved). Reloading MyBib…' : 'Restored without a safety copy. Reloading MyBib…');
      msg('Restore complete. Reloading MyBib…', 'good');
      setTimeout(() => chrome.tabs.reload(tabId), 1000);
    } catch (e) {
      setJob(restoreStatus, restoreDetail, 'error', 'Error', e.message);
      msg('Restore failed: ' + e.message, 'bad');
    }
    btnRestore.disabled = false;
  });
})();
