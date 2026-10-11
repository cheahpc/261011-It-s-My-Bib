/* Shared backup envelope + validation. Loaded in content script, popup, options. */
var MYBIB_BACKUP = (function () {
  'use strict';
  var FORMAT = 'mybib-portable-backup';
  var FORMAT_VERSION = 1;
  var ORIGIN = 'https://www.mybib.com';
  var DB_NAME = 'mybib';
  var STORE = 'general';
  var KEY = 'appState';

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function validateAppState(appState) {
    if (!isObject(appState)) return 'appState must be an object';
    if (!isObject(appState.items)) return 'appState.items missing';
    if (appState.items.type !== 'folder') return 'appState.items must be a folder';
    if (!Array.isArray(appState.items.children)) return 'appState.items.children must be an array';
    var err = validateChildren(appState.items.children, 0);
    if (err) return err;
    return null;
  }

  function validateChildren(children, depth) {
    if (depth > 10) return 'folder nesting too deep';
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (!isObject(c)) return 'child #' + i + ' must be an object';
      if (c.type === 'folder') {
        if (typeof c.id !== 'string' || !c.id) return 'folder id missing at index ' + i;
        if (!Array.isArray(c.children)) return 'folder children must be an array: ' + c.id;
        var e = validateChildren(c.children, depth + 1);
        if (e) return e;
      } else if (c.type === 'project' || c.type === 'sharedProject') {
        if (typeof c.id !== 'string' || !c.id) return 'project id missing at index ' + i;
        if (c.type === 'sharedProject') return 'backup contains a sharedProject (' + c.id + '); shared/server data is not restorable offline';
        if (c.references !== undefined && !Array.isArray(c.references)) return 'project references must be an array: ' + c.id;
      } else {
        return 'unknown child type at index ' + i + ': ' + c.type;
      }
    }
    return null;
  }

  function validateEnvelope(env) {
    if (!isObject(env)) return 'file is not a JSON object';
    if (env.format !== FORMAT) return 'not a MyBib Portable Backup file (format mismatch)';
    if (env.formatVersion !== FORMAT_VERSION) return 'unsupported backup version: ' + env.formatVersion;
    if (env.scope !== 'single-project' && env.scope !== 'full') return 'scope must be single-project or full';
    if (!isObject(env.appState)) return 'backup has no appState';
    return validateAppState(env.appState);
  }

  function buildEnvelope(scope, appState, activeProjectId, appVersion) {
    return {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      source: { origin: ORIGIN, appVersion: appVersion || null },
      scope: scope,
      activeProjectId: activeProjectId || null,
      appState: appState
    };
  }

  function fileNameFor(scope, projectTitle) {
    function slug(s) {
      return String(s || 'mybib').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mybib';
    }
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    var stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    if (scope === 'single-project') return 'mybib-backup-' + slug(projectTitle) + '-' + stamp + '.json';
    return 'mybib-backup-full-' + stamp + '.json';
  }

  return {
    FORMAT: FORMAT, FORMAT_VERSION: FORMAT_VERSION, ORIGIN: ORIGIN,
    DB_NAME: DB_NAME, STORE: STORE, KEY: KEY,
    validateAppState: validateAppState, validateEnvelope: validateEnvelope,
    buildEnvelope: buildEnvelope, fileNameFor: fileNameFor
  };
})();
