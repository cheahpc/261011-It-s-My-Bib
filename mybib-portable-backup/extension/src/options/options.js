(function () {
  'use strict';
  async function load() {
    const cur = await chrome.storage.local.get({ history: [] });
    const rows = document.getElementById('rows');
    const h = Array.isArray(cur.history) ? cur.history : [];
    rows.innerHTML = h.length ? '' : '<tr><td colspan="4">No backups yet.</td></tr>';
    h.forEach((e) => {
      const tr = document.createElement('tr');
      [e.when || '', e.scope || '', e.filename || '', e.activeProjectId || ''].forEach((v) => {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      rows.appendChild(tr);
    });
  }
  document.getElementById('clear').addEventListener('click', async () => {
    await chrome.storage.local.set({ history: [] });
    load();
  });
  load();
})();
