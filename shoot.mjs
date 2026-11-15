// Takes the entry's 3 screenshots of the running app on live data (see shots.json).
// Usage: node serve.ts &   then   PW_DIR=<dir holding node_modules/playwright> node shoot.mjs
// BASE overrides the app URL (default http://localhost:8080). Shots go straight to JPEG; never edited afterwards.
import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const base = process.env.BASE || 'http://localhost:8080';
const require = createRequire(join(process.env.PW_DIR || '.', 'package.json'));
const { chromium } = require('playwright');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const LIMIT = 262144;

const browser = await chromium.launch();
try {
  for (const s of shots) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.dpr });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + '/' + s.path);
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 45000 });
    // Wait only for images inside the viewport: complete (loaded) or broken.
    await page.waitForFunction(() => [...document.images]
      .filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })
      .every((i) => i.complete), null, { timeout: 20000 });
    if (errors.length) throw new Error(s.file + ': page errors: ' + errors.join(' | '));
    const file = join(here, 'screenshots', s.file);
    for (const quality of [85, 80]) {
      await page.screenshot({ path: file, type: 'jpeg', quality });
      if (statSync(file).size <= LIMIT) break;
    }
    const size = statSync(file).size;
    if (size > LIMIT) throw new Error(s.file + ' is ' + size + ' B, over 256 KiB');
    console.log(s.file, s.path, s.viewport.width + 'x' + s.viewport.height + '@' + s.dpr, size + ' B');
    await context.close();
  }
} finally {
  await browser.close();
}
