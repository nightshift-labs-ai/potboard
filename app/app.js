const ROUTES = { // #/ #/bounty/:s #/bounty/:s/leaderboard/:p #/u/:h
  board: () => '/competitions?status=open&activity=times',
  bounty: (s) => '/competitions/' + s + '?submissions=summary',
  leaderboard: (s) => '/competitions/' + s + '/leaderboard?rows=first',
  profile: (h) => '/profiles/' + h,
};

export async function api(path) { // Map cache + ETag revalidation
  const old = cache.get(path);
  const m = minute();
  if (old && old.minute === m) return old.data;
  if (inflight.has(path)) return inflight.get(path);
  const p = load(path, old, m);
  inflight.set(path, p);
  try { return await p; } finally { inflight.delete(path); }
}

function board(data) { // keyed rows, patched in place
  const now = Date.now();
  const open = [];
  const soon = [];
  const shut = [];
  for (const b of data.items) {
    if (Date.parse(b.publishedAt) > now) soon.push(b);
    else if (Date.parse(b.deadline) > now) open.push(b);
    else shut.push(b);
  }
  open.sort(byDeadline);
  soon.sort(byOpening);
  let pot = 0;
  let n = 0;
  for (const b of open) { pot += Number(b.potUsd) || 0; n += b.submissionCount || 0; }
  document.title = 'Bounties - Potboard (unofficial make.fun frontend)';
  return `<p class=strip data-k=strip><b>${open.length}</b> taking entries · <b>${money(pot)}</b>
 in live pots · <b>${n.toLocaleString('en-US')}</b> entries · updated <span class=up>${hm()}</span></p>
<h2 data-k=h1>Taking entries (${open.length})</h2>${head('h1')}${open.map(row).join('')}
<h2 data-k=h2>Opening soon (${soon.length})</h2>${head('h2')}${soon.map(row).join('')}
<details data-k=x><summary>Closed, awaiting results (${shut.length})</summary>
${head('h3')}${shut.map(row).join('')}</details>`;
}

function patch(root, html, view) {
  T.innerHTML = html;
  const next = [...T.content.children];
  const prev = [...root.children];
  if (root.dataset.v !== view || next.length !== prev.length) {
    root.replaceChildren(...next);
    root.dataset.v = view;
    return;
  }
  for (let i = 0; i < next.length; i++) {
    if (prev[i].dataset.k !== next[i].dataset.k || !prev[i].isEqualNode(next[i])) prev[i].replaceWith(next[i]);
  }
}

async function route(quiet) {
  window.__shotReady = false;
  const parts = location.hash.slice(2).split('/');
  const kind = parts[0] === 'u' ? 'profile' : parts[0] !== 'bounty' ? 'board'
    : parts[2] === 'leaderboard' ? 'leaderboard' : 'bounty';
  const arg = encodeURIComponent(dec(parts[1] || ''));
  const path = ROUTES[kind](arg);
  const view = kind + ':' + arg;
  const seq = ++gen;
  const turn = !quiet && kind === 'leaderboard' && main.dataset.v === view;
  current = path;
  for (const a of document.querySelectorAll('[data-nav]')) a.toggleAttribute('aria-current', kind === 'board');
  if (!quiet) scrollTo(0, 0);
  const early = peek(path) || (kind === 'bounty' && fromBoard(dec(parts[1] || '')));
  if (early) await paint(kind, early, parts, view);
  else if (!quiet) main.innerHTML = '<p class=note>Loading...</p>';
  if (early && turn) {
    window.__shotReady = true;
    return;
  }
  try {
    const data = await api(path);
    if (seq !== gen) return;
    if (data !== early) await paint(kind, data, parts, view);
    window.__shotReady = true;
  } catch (e) {
    if (seq !== gen) return;
    fail(e, Boolean(early));
    window.__shotReady = true;
  }
}

function tick() {
  stamp();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = left(el.dataset.t);
  if (!document.hidden && current) route(true);
  clearTimeout(timer);
  timer = setTimeout(tick, 62000 - (Date.now() % 60000));
}

function peek(path) {
  const hit = cache.get(path);
  return hit ? hit.data : null;
}

function views() {
  return import('./views.js');
}

const cache = new Map();
const inflight = new Map();
const BASE = 'https://make.fun/api';
const T = document.createElement('template');
const main = document.querySelector('main');
let gen = 0;
let current = '';
let timer = 0;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ent);
}

export function money(v) {
  const n = Number(v) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function left(iso) {
  const ms = Date.parse(iso) - Date.now();
  if (!(ms > 0)) return 'Closed';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  return h >= 48 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h ? h + 'h ' + m + 'm' : m + 'm';
}

export function chip(c) {
  const now = Date.now();
  const end = Date.parse(c.deadline);
  const opens = Date.parse(c.opensAt || c.publishedAt);
  if (opens > now || (c.acceptingSubmissions === false && end > now)) {
    return '<span class="chip cs" title="' + esc(c.opensAt || c.publishedAt) + '">Opens in ' + left(c.opensAt || c.publishedAt) + '</span>';
  }
  const ms = end - now;
  const cls = !(ms > 0) ? 'cx' : ms < 3600000 ? 'c1' : ms < 86400000 ? 'c24' : '';
  return '<span class="chip ' + cls + '" title="' + esc(c.deadline) + ' (UTC)" data-t=' + esc(c.deadline) + '>' + left(c.deadline) + '</span>';
}

export function fee(v) {
  return v == null || Number(v) === 0 ? 'No fee' : money(v);
}

export function link(slug) {
  return '#/bounty/' + encodeURIComponent(slug);
}

export const say = (n, w) => n.toLocaleString('en-US') + ' ' + w + (n === 1 ? '' : 's');

function ent(c) {
  return '&#' + c.charCodeAt(0) + ';';
}

function dec(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function minute() {
  return Math.floor(Date.now() / 60000);
}

function hm() {
  return new Date().toISOString().slice(11, 16) + ' UTC';
}

function stamp() {
  document.querySelector('.stamp').textContent = 'updated ' + hm();
  for (const el of document.querySelectorAll('.up')) el.textContent = hm();
}

function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

async function load(path, old, m) {
  let r = await fetch(BASE + path, { cache: 'no-cache' });
  if (r.status === 429) {
    await sleep(1000 * Math.min(60, Number(r.headers.get('retry-after')) || 5));
    r = await fetch(BASE + path, { cache: 'no-cache' });
  }
  if (!r.ok) throw new Error(r.status === 404 ? 'not found' : 'HTTP ' + r.status);
  const etag = r.headers.get('etag');
  if (old && etag && old.etag === etag) { old.minute = m; return old.data; }
  const text = await r.text();
  if (old && old.text === text) { old.etag = etag; old.minute = m; return old.data; }
  let data = JSON.parse(text);
  if (data && data.next_cursor && path === ROUTES.board()) data = await more(data, path);
  cache.set(path, { etag, text, data, minute: m });
  return data;
}

async function more(data, path) {
  const items = data.items.slice();
  let cursor = data.next_cursor;
  for (let i = 0; cursor && i < 5; i++) {
    const r = await fetch(BASE + path + '&cursor=' + encodeURIComponent(cursor), { cache: 'no-cache' });
    if (!r.ok) break;
    const page = await r.json();
    items.push(...page.items);
    cursor = page.next_cursor;
  }
  return { items, next_cursor: null };
}

function fromBoard(slug) {
  const b = peek(ROUTES.board());
  return b ? b.items.find((x) => x.slug === slug) || null : null;
}

function byDeadline(a, b) {
  return Date.parse(a.deadline) - Date.parse(b.deadline);
}

function byOpening(a, b) {
  return Date.parse(a.publishedAt) - Date.parse(b.publishedAt);
}

function head(k) {
  return '<div class=hd data-k=' + k + '><span></span><span>Live pot</span><span>Entry fee</span>'
    + '<span>Time left</span><span>Entries</span></div>';
}

function row(b) {
  const places = b.rewardsNow ? b.rewardsNow.length : 0;
  return `<a class=row data-k=${esc(b.slug)} href="${link(b.slug)}"><div><span class=t>${esc(b.title)}</span>
<br><small>${esc(b.category)} · ${esc(b.sponsor && b.sponsor.name)} · ${say(places, 'place')}</small></div>
<b data-l="Live pot">${money(b.potUsd)}</b><b data-l="Entry fee">${fee(b.entryFeeUsd)}</b>
<b data-l="Time left">${chip(b)}</b><b data-l=Entries>${(b.submissionCount || 0).toLocaleString('en-US')}</b></a>`;
}

async function paint(kind, data, parts, view) {
  if (kind === 'board') {
    patch(main, board(data), view);
  } else {
    const V = await views();
    patch(main, V[kind](data, Number(parts[3]) || 1), view);
  }
  stamp();
}

function fail(e, keep) {
  const msg = e && e.message === 'not found' ? 'Not found on make.fun.' : 'Could not load from make.fun (' + esc(e && e.message) + ').';
  const note = '<p class=note data-k=err>' + msg + ' <a href="" data-retry>Retry</a></p>';
  if (keep) main.insertAdjacentHTML('afterbegin', note);
  else { main.innerHTML = note; main.dataset.v = ''; }
}

addEventListener('hashchange', () => route());
document.addEventListener('visibilitychange', () => document.hidden || tick());
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-retry]')) return;
  e.preventDefault();
  route();
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const h = e.target.elements.h.value.trim().replace(/^@/, '');
  if (h) location.hash = '#/u/' + encodeURIComponent(h);
});
route().then(() => (window.requestIdleCallback || setTimeout)(views));
timer = setTimeout(tick, 62000 - (Date.now() % 60000));
