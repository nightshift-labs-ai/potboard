const ROUTES = { // 1 endpoint a view
  board: () => '/competitions?status=open&activity=times',
  bounty: (s) => '/competitions/' + s + '?submissions=summary',
  leaderboard: (s) => '/competitions/' + s + '/leaderboard?rows=first',
  profile: (h) => '/profiles/' + h,
};

async function api(path) { // Map cache + ETag revalidation + in-flight dedupe
  const old = cache.get(path);
  const m = Math.floor(Date.now() / 60000);
  if (old && old.minute === m) return old.data;
  if (inflight.has(path)) return inflight.get(path);
  const p = load(path, old, m);
  inflight.set(path, p);
  try { return await p; } finally { inflight.delete(path); }
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
  const cached = cache.get(path)?.data;
  const vp = views();
  const ask = cached && turn ? null : api(path);
  if (ask) ask.catch(none);
  if (!V && !cached && !quiet) main.innerHTML = '<p class=note>Loading...</p>';
  let early = cached;
  try {
    await vp;
    if (seq !== gen) return;
    if (kind !== 'bounty') V.side();
    early = cached || (kind === 'bounty' && V.fromBoard(dec(parts[1] || '')));
    if (early) paint(kind, early, parts, view);
    else if (!quiet) main.innerHTML = '<p class=note>Loading...</p>';
    let data = early;
    if (ask) {
      data = await ask;
      if (seq !== gen) return;
      if (data !== early) paint(kind, data, parts, view);
    }
    V.side(kind === 'bounty' && data);
  } catch (e) {
    if (seq !== gen) return;
    fail(e, Boolean(early && V));
    if (V) V.side();
  }
  window.__shotReady = true;
}

function tick() {
  stamp();
  if (V) for (const el of document.querySelectorAll('[data-t]')) el.textContent = V.left(el.dataset.t);
  if (!document.hidden && current) route(true);
  clearTimeout(timer);
  timer = setTimeout(tick, 62000 - (Date.now() % 60000));
}

function views() {
  return import('./views.js').then(keep);
}

const cache = new Map();
const inflight = new Map();
const BASE = 'https://make.fun/api';
const T = document.createElement('template');
const main = document.querySelector('main');
let V = null;
let gen = 0;
let current = '';
let timer = 0;

export { ROUTES, cache, patch };

function keep(m) {
  V = m;
  return m;
}

function none() {
  return 0;
}

function dec(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function stamp() {
  document.querySelector('.stamp').textContent = 'updated ' + new Date().toISOString().slice(11, 16) + ' UTC';
}

async function load(path, old, m) {
  const get = () => fetch(BASE + path, { cache: 'no-cache' });
  let r = await get();
  if (r.status === 429) r = await (await views()).later(r, get);
  if (!r.ok) throw new Error(r.status === 404 ? 'not found' : 'HTTP ' + r.status);
  const etag = r.headers.get('etag');
  if (old && etag && old.etag === etag) { old.minute = m; return old.data; }
  const text = await r.text();
  if (old && old.text === text) { old.etag = etag; old.minute = m; return old.data; }
  let data = JSON.parse(text);
  if (data && data.next_cursor && path === ROUTES.board()) data = await (await views()).more(data, BASE + path);
  cache.set(path, { etag, text, data, minute: m });
  return data;
}

function paint(kind, data, parts, view) {
  patch(main, V[kind](data, Number(parts[3]) || 1, V.fromBoard(dec(parts[1] || ''))), view);
  stamp();
}

function fail(e, keep) {
  const why = String(e && e.message).replace(/[<>&"']/g, '');
  const msg = why === 'not found' ? 'Not found on make.fun.' : 'Could not load from make.fun (' + why + ').';
  const note = '<p class=note data-k=err>' + msg + ' <a href="" data-retry>Retry</a></p>';
  if (keep) main.insertAdjacentHTML('afterbegin', note);
  else { main.innerHTML = note; main.dataset.v = ''; document.title = 'Error - Potboard (unofficial)'; }
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
route();
timer = setTimeout(tick, 62000 - (Date.now() % 60000));
