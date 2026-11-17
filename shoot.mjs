// Takes the entry's 3 screenshots of the running app on live data (see shots.json).
// Usage: node serve.ts &   then   PW_DIR=<dir holding node_modules/playwright> node shoot.mjs
// BASE overrides the app URL (default http://localhost:8080). Shots go straight to JPEG; never edited afterwards.
import { createRequire } from 'node:module';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const base = process.env.BASE || 'http://localhost:8080';
const require = createRequire(join(process.env.PW_DIR || '.', 'package.json'));
const { chromium } = require('playwright');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const LIMIT = 262144;

// ONLY=<shot file name> retakes just that shot; an unknown name stops before the browser starts.
const only = process.env.ONLY || '';
const todo = only ? shots.filter((s) => s.file === only) : shots;
if (only && !todo.length) {
  console.error('shoot.mjs: ONLY=' + only + ' matches no file in shots.json (' + shots.map((s) => s.file).join(', ') + ')');
  process.exit(1);
}

const done = [];
const browser = await chromium.launch();
try {
  for (const s of todo) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.dpr });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    // With "via", open that route first, then move to the shot's route in the app, as a click would.
    await page.goto(base + '/' + (s.via || s.path));
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 90000 });
    if (s.via) {
      await page.evaluate((p) => { window.__shotReady = false; location.hash = p; }, s.path);
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 90000 });
    }
    // Wait only for images inside the viewport: complete (loaded) or broken.
    await page.waitForFunction(() => [...document.images]
      .filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })
      .every((i) => i.complete), null, { timeout: 20000 });
    if (await page.locator('img').evaluateAll((images) => images.some((i) => !i.naturalWidth))) {
      throw new Error(s.file + ': a profile image did not load');
    }
    if (errors.length) throw new Error(s.file + ': page errors: ' + errors.join(' | '));
    // On the cover, the highlighted board row and the facts band must show the same pot and entries.
    const agree = await page.evaluate(() => {
      const r = document.querySelector('aside .row[aria-current]');
      if (!r) return true;
      if (!document.querySelector('.facts')) return true;
      const facts = [...document.querySelectorAll('.facts b')].map((b) => b.firstChild.textContent);
      const row = [...r.querySelectorAll(':scope > b')].map((b) => b.firstChild.textContent);
      return row[0] === facts[0] && row[3] === facts[3];
    });
    if (!agree) throw new Error(s.file + ': the highlighted row and the facts band differ; retake');
    const file = join(here, 'screenshots', s.file);
    const quality = s.quality || 70;
    const nonempty = await page.locator('main .facts,main .lb tbody tr,main .sol tbody tr').count();
    if (!nonempty) throw new Error(s.file + ': no live view data rendered');
    await page.screenshot({ path: file, type: 'jpeg', quality, fullPage: false });
    const size = statSync(file).size;
    if (size > LIMIT) throw new Error(s.file + ' is ' + size + ' B, over 256 KiB');
    s.captured_at = new Date().toISOString();
    s.bytes = size;
    console.log(s.file, (s.via ? s.via + ' -> ' : '') + s.path, s.viewport.width + 'x' + s.viewport.height + '@' + s.dpr, size + ' B');
    await context.close();
    done.push(s.file + ' | ' + (s.what || '(no what)') + ' | ' + s.viewport.width + 'x' + s.viewport.height
      + ' @ ' + s.dpr + ' | ' + size.toString().replace(/\B(?=(\d{3})+$)/g, ',') + ' B');
  }
} finally {
  await browser.close();
}
writeFileSync(join(here, 'shots.json'), JSON.stringify(shots, null, 2) + '\n');
// One line a shot taken in this run: file | what it proves | CSS viewport @ DPR | bytes.
for (const line of done) console.log(line);
