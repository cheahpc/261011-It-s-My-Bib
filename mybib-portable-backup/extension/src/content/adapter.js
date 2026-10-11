/* Read-only storage adapter: detects MyBib + reads appState from IndexedDB. */
(function () {
  'use strict';
  var S = (typeof MYBIB_BACKUP !== 'undefined') ? MYBIB_BACKUP : null;

  function activeProjectIdFromHash() {
    try {
      var m = String(location.hash || '').match(/#\/projects\/([^/]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(S ? S.DB_NAME : 'mybib');
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error('indexedDB open failed')); };
      } catch (e) { reject(e); }
    });
  }

  function readAppState() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(S.STORE, 'readonly');
          var os = tx.objectStore(S.STORE);
          var rq = os.get(S.KEY);
          rq.onsuccess = function () { db.close(); resolve(rq.result || null); };
          rq.onerror = function () { try { db.close(); } catch (e) {} reject(rq.error || new Error('read failed')); };
        } catch (e) { try { db.close(); } catch (x) {} reject(e); }
      });
    });
  }

  function findNode(children, id) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (!c || typeof c !== 'object') continue;
      if (c.id === id) return { node: c, parent: children };
      if (c.type === 'folder' && Array.isArray(c.children)) {
        var r = findNode(c.children, id);
        if (r) return r;
      }
    }
    return null;
  }

  function listProjects(appState) {
    var out = [];
    (function walk(children, path) {
      (children || []).forEach(function (c) {
        if (!c || typeof c !== 'object') return;
        if (c.type === 'project') {
          out.push({ id: c.id, title: c.title || '(untitled)', refs: Array.isArray(c.references) ? c.references.length : 0, path: path });
        } else if (c.type === 'folder' && Array.isArray(c.children)) {
          walk(c.children, (path ? path + ' / ' : '') + (c.name || 'folder'));
        }
      });
    })(appState && appState.items && appState.items.children, '');
    return out;
  }

  function detect() {
    return readAppState().then(function (appState) {
      if (!appState) return { onMyBib: true, hasData: false, appState: null };
      var pid = activeProjectIdFromHash() || appState.lastSelectedProjectId || null;
      var projects = [];
      try { projects = listProjects(appState); } catch (e) {}
      var active = null;
      if (pid) {
        try {
          var found = findNode(appState.items.children || [], pid);
          if (found && found.node && found.node.type === 'project') {
            active = { id: found.node.id, title: found.node.title || '(untitled)', refs: Array.isArray(found.node.references) ? found.node.references.length : 0 };
          }
        } catch (e) {}
      }
      return { onMyBib: true, hasData: true, appState: appState, activeProjectId: pid, activeProject: active, projects: projects, lastModifiedAt: appState.lastModifiedAt || null };
    });
  }

  function exportFull() {
    return detect().then(function (d) {
      if (!d.hasData) throw new Error('No MyBib data found in this browser profile.');
      var err = S.validateAppState(d.appState);
      if (err) throw new Error('Local data failed validation: ' + err);
      var clone = JSON.parse(JSON.stringify(d.appState));
      return { envelope: S.buildEnvelope('full', clone, d.activeProjectId, null), projects: d.projects, activeProject: d.activeProject };
    });
  }

  // Expose for popup messaging + debugging. No writes here.
  window.__MYBIB_BACKUP__ = window.__MYBIB_BACKUP__ || {};
  window.__MYBIB_BACKUP__.adapter = { detect: detect, exportFull: exportFull, readAppState: readAppState, activeProjectIdFromHash: activeProjectIdFromHash, listProjects: listProjects };

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || msg.target !== 'mybib-content') return false;
    if (msg.type === 'detect') { detect().then(function (d) { sendResponse({ ok: true, data: { activeProjectId: d.activeProjectId, activeProject: d.activeProject, projects: d.projects, hasData: d.hasData, lastModifiedAt: d.lastModifiedAt } }); }).catch(function (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); }); return true; }
    if (msg.type === 'export-full') { exportFull().then(function (r) { sendResponse({ ok: true, data: r }); }).catch(function (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); }); return true; }
    return false;
  });
})();
