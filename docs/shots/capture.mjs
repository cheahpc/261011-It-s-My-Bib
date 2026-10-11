#!/usr/bin/env node
/* Maintainer screenshots: sanitized demo data only, throwaway profile. Never touches real data.
 * Run from repo root:  node docs/shots/capture.mjs   (needs docs/shots/node_modules)
 * Part A screenshots the real MyBib app with seeded DEMO data (no extension needed).
 * Part B serves the extension over localhost and stubs the chrome.* APIs, so the
 * real popup/importer/options UI renders deterministically without installing anything.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXT = path.join(ROOT, 'extension');
const IMG = path.join(ROOT, 'docs', 'img');
const CHROME = 'C:/Users/MrChe/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const DEMO = {
  id: 'demo01',
  lastModifiedAt: new Date().toISOString(),
  isDarkModeActive: false,
  lastSelectedProjectId: 'demoEssay',
  defaults: { styleId: 'default-apa', fontFace: 'Times New Roman', fontSize: 12 },
  settings: { isCitationSearchBoxLocked: false, citeprocLocaleOverride: null },
  items: {
    type: 'folder', id: 'items', name: null, color: null, isOpen: true,
    children: [
      {
        type: 'project', id: 'demoEssay', title: 'Demo essay', styleId: 'default-apa',
        sortReferencesBy: 'style', fontFace: 'Times New Roman', fontSize: 12, icon: '📄', color: null,
        references: [
          { id: 'r1', type: 'book', title: 'Thinking, Fast and Slow', author: 'Kahneman, D.', year: 2011 },
          { id: 'r2', type: 'journal', title: 'The magical number seven', author: 'Miller, G.A.', year: 1956 },
          { id: 'r3', type: 'website', title: 'Example source', url: 'https://example.com' }
        ]
      },
      {
        type: 'project', id: 'demoLab', title: 'Demo lab report', styleId: 'default-mla',
        sortReferencesBy: 'style', fontFace: 'Times New Roman', fontSize: 12, icon: '📄', color: null,
        references: [{ id: 'r4', type: 'book', title: 'Research Design', author: 'Creswell, J.W.', year: 2018 }]
      }
    ]
  }
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
function serveExtension() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.normalize(path.join(EXT, urlPath));
      if (!file.startsWith(EXT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Stubs emulate a healthy MyBib tab with DEMO data so the real UI code renders.
const STUB = `
(() => {
  const DEMO_SUMMARY = {
    activeProjectId: 'demoEssay',
    activeProject: { id: 'demoEssay', title: 'Demo essay', refs: 3 },
    projects: [
      { id: 'demoEssay', title: 'Demo essay', refs: 3, path: '' },
      { id: 'demoLab', title: 'Demo lab report', refs: 1, path: '' }
    ],
    hasData: true,
    lastModifiedAt: ${JSON.stringify(DEMO.lastModifiedAt)}
  };
  const store = { history: [{ when: ${JSON.stringify(DEMO.lastModifiedAt)}, scope: 'full', filename: 'its-my-bib-backup-full-demo.json', activeProjectId: 'demoEssay' }] };
  window.chrome = {
    tabs: {
      query: async (q) => [{ id: 7, url: 'https://www.mybib.com/?app#/projects/demoEssay/citations' }],
      sendMessage: (tabId, m, cb) => {
        if (m.target !== 'mybib-content') { cb(null); return; }
        if (m.type === 'detect') cb({ ok: true, data: DEMO_SUMMARY });
        else if (m.type === 'export-full') cb({ ok: true, data: { envelope: { scope: 'full', activeProjectId: 'demoEssay' }, projects: DEMO_SUMMARY.projects } });
        else if (m.type === 'restore') cb({ ok: true, data: { scope: 'full' } });
        else cb({ ok: false, error: 'shot-stub: unknown msg' });
      },
      create: async () => ({}),
      reload: () => {}
    },
    storage: { local: {
      get: async (d) => ({ history: store.history }),
      set: async (o) => { Object.assign(store, o); }
    } },
    downloads: { download: (o, cb) => { setTimeout(() => cb(1), 50); } },
    runtime: { getURL: (p) => p, lastError: undefined }
  };
})();`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'itsmybib-demo-'));
const ctx = await chromium.launchPersistentContext(profile, { executablePath: CHROME, headless: true });
try {
  fs.mkdirSync(IMG, { recursive: true });

  // ---- Part A: real MyBib app with seeded demo data ----
  const app = await ctx.newPage();
  await app.goto('https://www.mybib.com/?app', { waitUntil: 'networkidle', timeout: 90000 });
  await app.waitForFunction(() => location.hash.includes('#/projects/'), null, { timeout: 60000 });
  await app.waitForTimeout(3000);
  for (let i = 0; i < 30; i++) {
    const ready = await app.evaluate(() => new Promise((res) => {
      try {
        const req = indexedDB.open('mybib');
        req.onsuccess = () => { const ok = req.result.objectStoreNames.contains('general'); req.result.close(); res(ok); };
        req.onerror = () => res(false);
      } catch (e) { res(false); }
    }));
    if (ready) break;
    await app.waitForTimeout(1000);
  }
  await app.evaluate((demo) => new Promise((res, rej) => {
    const req = indexedDB.open('mybib');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('general', 'readwrite');
      tx.objectStore('general').put(JSON.parse(JSON.stringify(demo)), 'appState');
      tx.oncomplete = () => { db.close(); res(true); };
      tx.onerror = () => { db.close(); rej(tx.error); };
    };
    req.onerror = () => rej(req.error);
  }), DEMO);
  // Reload so the app boots from the seeded data (its in-memory state would
  // otherwise persist the old state back over our seed).
  await app.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await app.waitForFunction(() => location.hash.includes('demoEssay'), null, { timeout: 60000 });
  await app.waitForTimeout(2500);
  await app.screenshot({ path: path.join(IMG, '01-mybib-app.png') });
  await app.close();

  // ---- Part B: extension UI over localhost with stubbed chrome.* ----
  const srv = await serveExtension();
  const base = `http://127.0.0.1:${srv.address().port}`;

  const pop = await ctx.newPage();
  await pop.setViewportSize({ width: 400, height: 640 });
  await pop.addInitScript(STUB);
  await pop.goto(`${base}/src/popup/popup.html`, { waitUntil: 'networkidle' });
  await pop.waitForTimeout(1200);
  await pop.screenshot({ path: path.join(IMG, '02-popup.png') });
  await pop.close();

  const sample = {
    format: 'mybib-portable-backup', formatVersion: 1, exportedAt: new Date().toISOString(),
    source: { origin: 'https://www.mybib.com', appVersion: null },
    scope: 'full', activeProjectId: 'demoEssay', appState: DEMO
  };
  const sampleFile = path.join(profile, 'demo-backup.json');
  fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2));
  const imp = await ctx.newPage();
  await imp.setViewportSize({ width: 680, height: 980 });
  await imp.addInitScript(STUB);
  await imp.goto(`${base}/src/importer/importer.html`, { waitUntil: 'networkidle' });
  await imp.waitForTimeout(800);
  await imp.click('#btnChoose');
  await imp.setInputFiles('#file', sampleFile);
  await imp.waitForTimeout(1200);
  await imp.screenshot({ path: path.join(IMG, '03-importer.png') });
  await imp.locator('#restoreCard').screenshot({ path: path.join(IMG, '04-step2-status.png') });
  await imp.close();

  const opt = await ctx.newPage();
  await opt.setViewportSize({ width: 680, height: 600 });
  await opt.addInitScript(STUB);
  await opt.goto(`${base}/src/options/options.html`, { waitUntil: 'networkidle' });
  await opt.waitForTimeout(800);
  await opt.screenshot({ path: path.join(IMG, '05-options.png') });
  await opt.close();

  srv.close();
  console.log('screenshots written to', IMG);
} finally {
  await ctx.close();
}
