/* Popup: detect MyBib, one-click full export via Save dialog, open importer tab. Local only. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const statusEl = $('status'), logEl = $('log'), btnExport = $('btnExport'), btnImport = $('btnImport');
  let tabId = null;

  function log(s) { logEl.textContent = (s + '\n' + logEl.textContent).slice(0, 2000); }
  function setStatus(html, cls) { statusEl.className = 'card status ' + (cls || ''); statusEl.querySelector('span:last-child').innerHTML = html; }
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
        if (!resp) return reject(new Error('No response from MyBib tab — reload the MyBib page and retry.'));
        if (!resp.ok) return reject(new Error(resp.error || 'Unknown error.'));
        resolve(resp.data);
      });
    });
  }

  async function refresh() {
    try {
      const tab = await currentMyBibTab();
      if (!tab) { tabId = null; setStatus('No MyBib tab open. Open <b>mybib.com → MyBib</b> first.', 'bad'); btnExport.disabled = true; return; }
      tabId = tab.id;
      const d = await sendToContent('detect');
      if (!d.hasData) { setStatus('MyBib detected, but this profile has no local data yet.', 'bad'); btnExport.disabled = true; return; }
      btnExport.disabled = false;
      setStatus(`MyBib detected · <b>${d.projects.length}</b> project(s) · updated ${escapeHtml(d.lastModifiedAt || '—')}`, 'good');
    } catch (e) { setStatus('Detection failed: ' + escapeHtml(e.message) + ' — reload the MyBib page and retry.', 'bad'); btnExport.disabled = true; }
  }

  function downloadWithSaveDialog(text, filename) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename, saveAs: true }, (dlId) => {
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (dlId === undefined) return reject(new Error('Download was blocked or cancelled.'));
        resolve(dlId);
      });
    });
  }

  async function doExport() {
    btnExport.disabled = true;
    try {
      log('Reading MyBib data…');
      const r = await sendToContent('export-full');
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      const filename = `mybib-backup-full-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
      log('Opening Save dialog — pick a folder (e.g. OneDrive)…');
      await downloadWithSaveDialog(JSON.stringify(r.envelope, null, 2), filename);
      await recordHistory({ when: new Date().toISOString(), scope: 'full', filename, activeProjectId: r.envelope.activeProjectId });
      log('Saved: ' + filename);
    } catch (e) { log('Export failed: ' + e.message); }
    btnExport.disabled = false;
  }

  async function recordHistory(entry) {
    try {
      const cur = await chrome.storage.local.get({ history: [] });
      const h = Array.isArray(cur.history) ? cur.history : [];
      h.unshift(entry);
      await chrome.storage.local.set({ history: h.slice(0, 30) });
    } catch (e) {}
  }

  btnExport.addEventListener('click', doExport);
  btnImport.addEventListener('click', () => { chrome.tabs.create({ url: chrome.runtime.getURL('src/importer/importer.html') }); });
  refresh();
})();
