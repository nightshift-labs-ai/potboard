// Real browser checks against make.fun GET responses. No fixtures, intercepted responses or account writes.
// Start serve.ts, then BASE=http://localhost:8187 PW_DIR=/home/agent/tools/pw node live-check.mjs.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(join(process.env.PW_DIR || '.', 'package.json'));
const { chromium } = require('playwright');
const base = process.env.BASE || 'http://localhost:8187';
const browser = await chromium.launch();
const errors = [];
const requests = [];
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
async function ready(page) {
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 90000 });
  ok(!await page.locator('[data-retry]').count(), 'view loaded without an API error');
}
async function go(page, hash) {
  await page.evaluate((h) => { window.__shotReady = false; location.hash = h; }, hash);
  await ready(page);
}
async function follow(page, locator) {
  await page.evaluate(() => { window.__shotReady = false; });
  await locator.click();
  await ready(page);
}
function watch(page) {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => {
    if (r.url().startsWith('https://make.fun/api/')) {
      ok(r.method() === 'GET', 'public API uses GET only');
      requests.push(r.url());
    }
  });
}
const bounty = '#/bounty/makefun-frontend-01';
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  watch(page);
  await page.goto(base + '/#/');
  await ready(page);
  ok(await page.locator('main .row').count() > 0, 'live board has bounties');
  const before = requests.length;
  const retained = await page.locator('main .row').first().getAttribute('data-k');
  await page.evaluate(() => { window.checkRow = document.querySelector('main .row'); });
  await page.locator('[data-q]').fill(retained);
  ok(await page.locator('main .row').count() === 1, 'text filter narrows the board');
  ok(await page.evaluate(() => document.querySelector('main .row') === window.checkRow), 'filter retains the matching row node');
  await page.locator('[data-q]').press('Escape');
  await page.locator('[data-s=pot]').click();
  ok(await page.locator('[data-s=pot]').getAttribute('aria-pressed') === 'true', 'sort applies');
  ok(await page.evaluate(() => document.activeElement?.dataset.s === 'pot'), 'sort button retains focus');
  await page.locator('[data-c=Code]').click();
  ok((await page.locator('main .row').allTextContents()).every((t) => t.includes('Code')), 'category filter applies');
  await page.locator('[data-c=""]').click();
  await page.locator('[data-s=end]').click();
  ok(requests.length === before, 'board controls make no requests');
  await go(page, bounty);
  ok(await page.locator('main .facts b').count() === 4, 'bounty facts render');
  ok(await page.locator('main .rw tbody tr').count() > 1, 'live rewards render');
  ok(await page.locator('aside .row[aria-current]').count() === 1, 'contextual board highlights the bounty');
  await follow(page, page.locator('main .tabs a').nth(1));
  ok(await page.locator('main .lb tbody tr').count() > 0, 'leaderboard renders live ranked entries');
  ok(await page.locator('aside .row[aria-current]').count() === 1, 'leaderboard retains cached board');
  await page.setViewportSize({ width: 960, height: 900 });
  ok(!await page.locator('body').evaluate((el) => el.classList.contains('sp')), 'resize hides board below breakpoint');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => document.body.classList.contains('sp'));
  ok(await page.locator('aside .row[aria-current]').count() === 1, 'resize restores board without navigation');
  const lbRequests = requests.length;
  const next = page.locator('main .pager a').filter({ hasText: 'Next' }).first();
  if (await next.count()) {
    await follow(page, next);
    ok(page.url().endsWith('/leaderboard/2'), 'leaderboard page is addressable');
    ok(requests.length === lbRequests, 'leaderboard pagination reuses cache');
  }
  await follow(page, page.locator('main .lb tbody a').first());
  ok(page.url().includes('#/u/'), 'leaderboard entrant opens a public profile');
  await page.locator('header input[name=h]').fill('@nightshift-labs');
  await page.evaluate(() => { window.__shotReady = false; });
  await page.locator('header form button').click();
  await ready(page);
  ok(page.url().endsWith('#/u/nightshift-labs'), 'profile search opens the requested account');
  ok(await page.locator('.bio').count() === 1, 'profile bio is visible');
  ok(await page.locator('.payouts li').count() > 0, 'real recent payouts are visible');
  ok(await page.locator('.sol tbody tr').count() === 10, 'profile bounds the solution page');
  const profileRequests = requests.length;
  await follow(page, page.locator('.pf .pager a').filter({ hasText: 'Next' }).first());
  ok(page.url().endsWith('/nightshift-labs/2'), 'profile second page is addressable');
  ok(await page.evaluate(() => document.activeElement.id === 'solutions'), 'profile page change focuses solutions');
  await follow(page, page.locator('.pf .pager a').filter({ hasText: 'Next' }).first());
  ok(page.url().endsWith('/nightshift-labs/3'), 'solutions after the twentieth are reachable');
  ok(await page.locator('.sol tbody tr').count() > 0, 'third page contains real solutions');
  ok(requests.length === profileRequests, 'profile pagination makes no requests');
  await page.goBack();
  await page.waitForFunction(() => location.hash.endsWith('/2') && document.querySelector('.pf .pager')?.textContent.includes('Page 2'));
  ok(await page.locator('.sol tbody tr').count() === 10, 'back restores previous profile page');
  await page.goForward();
  await page.waitForFunction(() => location.hash.endsWith('/3') && document.querySelector('.pf .pager')?.textContent.includes('Page 3'));
  ok(requests.length === profileRequests, 'back and forward reuse profile cache');
  await go(page, '#/');
  await page.evaluate(() => scrollTo(0, 400));
  await page.waitForTimeout(100);
  const top = await page.evaluate(() => scrollY);
  await go(page, bounty);
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/' && document.querySelector('main').dataset.v.startsWith('/competitions?'));
  await page.waitForTimeout(150);
  ok(Math.abs(await page.evaluate(() => scrollY) - top) < 3, 'history restores board scroll');
  // Expire only the cache timestamp; response data always comes from the real API.
  const revalidate = requests.length;
  await page.evaluate(async () => {
    const { cache, ROUTES } = await import('/app.js');
    cache.get(ROUTES.board()).minute--;
    window.__shotReady = false;
    dispatchEvent(new HashChangeEvent('hashchange'));
    dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await ready(page);
  ok(requests.length === revalidate + 1, 'expired data revalidates and concurrent routes share the request');
  // A fresh document for each deep link verifies that no earlier board visit is required.
  for (const hash of ['#/', bounty, bounty + '/leaderboard', '#/u/nightshift-labs/3']) {
    await page.goto(base + '/' + hash);
    await ready(page);
    ok(await page.locator('main .row,main .facts,main .lb tbody tr,main .sol tbody tr').count() > 0, 'direct route renders ' + hash);
  }
  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const phone = await mobile.newPage();
  watch(phone);
  await phone.goto(base + '/#/');
  await ready(phone);
  for (const hash of ['#/', bounty, bounty + '/leaderboard', '#/u/nightshift-labs']) {
    if (!phone.url().endsWith(hash)) await go(phone, hash);
    ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at 390px: ' + hash);
  }
  await mobile.close();
  ok(errors.length === 0, 'no page or console errors: ' + errors.join(' | '));
  console.log('live-check.mjs: ' + checks + ' passed; ' + requests.length + ' live GET requests; no browser errors');
} finally {
  await browser.close();
}
