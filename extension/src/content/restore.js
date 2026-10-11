/* Safe-overwrite restore: validates envelope, auto-saves pre-restore backup, writes appState. */
(function () {
  'use strict';
  var S = (typeof MYBIB_BACKUP !== 'undefined') ? MYBIB_BACKUP : null;

  function writeAppState(appState) {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(S.DB_NAME);
        req.onsuccess = function () {
          var db = req.result;
          try {
            var tx = db.transaction(S.STORE, 'readwrite');
            var os = tx.objectStore(S.STORE);
            var toWrite = JSON.parse(JSON.stringify(appState));
            toWrite.lastModifiedAt = new Date().toISOString();
            var put = os.put(toWrite, S.KEY);
            put.onsuccess = function () {};
            put.onerror = function () { try { db.close(); } catch (e) {} reject(put.error || new Error('write failed')); };
            tx.oncomplete = function () { try { db.close(); } catch (e) {} resolve(true); };
            tx.onerror = function () { try { db.close(); } catch (e) {} reject(tx.error || new Error('transaction failed')); };
          } catch (e) { try { db.close(); } catch (x) {} reject(e); }
        };
        req.onerror = function () { reject(req.error || new Error('indexedDB open failed')); };
      } catch (e) { reject(e); }
    });
  }

  // Merge a single-project envelope into current data: replace same-id project, else append at root.
  function mergeSingleProject(current, incomingSingle) {
    var next = JSON.parse(JSON.stringify(current));
    var incChildren = (incomingSingle.items && incomingSingle.items.children) || [];
    if (incChildren.length !== 1) throw new Error('single-project backup must contain exactly one project');
    var inc = JSON.parse(JSON.stringify(incChildren[0]));
    var replaced = false;
    (function walk(children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c && c.id === inc.id && (c.type === 'project' || c.type === 'project')) { children[i] = inc; replaced = true; return; }
        if (c && c.type === 'folder' && Array.isArray(c.children)) walk(c.children);
      }
    })(next.items.children);
    if (!replaced) next.items.children.push(inc);
    next.lastSelectedProjectId = inc.id;
    return next;
  }

  function restoreEnvelope(envelope) {
    var adapter = window.__MYBIB_BACKUP__ && window.__MYBIB_BACKUP__.adapter;
    if (!adapter) return Promise.reject(new Error('adapter not loaded'));
    var err = S.validateEnvelope(envelope);
    if (err) return Promise.reject(new Error('Invalid backup: ' + err));
    // Step 1: read current data for pre-restore safety backup.
    return adapter.readAppState().then(function (current) {
      var preRestore = current ? JSON.parse(JSON.stringify(current)) : null;
      var next;
      if (envelope.scope === 'full') {
        next = JSON.parse(JSON.stringify(envelope.appState));
      } else {
        if (!current) {
          next = JSON.parse(JSON.stringify(envelope.appState));
        } else {
          next = mergeSingleProject(current, envelope.appState);
        }
      }
      var verr = S.validateAppState(next);
      if (verr) throw new Error('Restored data failed validation: ' + verr);
      return writeAppState(next).then(function () { return { preRestore: preRestore, scope: envelope.scope }; });
    });
  }

  window.__MYBIB_BACKUP__ = window.__MYBIB_BACKUP__ || {};
  window.__MYBIB_BACKUP__.restore = { restoreEnvelope: restoreEnvelope, writeAppState: writeAppState };

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || msg.target !== 'mybib-content') return false;
    if (msg.type === 'restore') {
      restoreEnvelope(msg.envelope).then(function (r) { sendResponse({ ok: true, data: { scope: r.scope, hadPrevious: !!r.preRestore, preRestore: r.preRestore } }); })
        .catch(function (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); });
      return true;
    }
    return false;
  });
})();
