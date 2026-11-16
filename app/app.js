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
  const path = ROUTES[kind](encodeURIComponent(dec(parts[1] || '')));
  const seq = ++gen;
  const cached = cache.get(path)?.data;
  const turn = !quiet && kind === 'leaderboard' && main.dataset.v === path;
  current = path;
  if (!quiet) scrollTo(0, 0);
  const ask = cached && turn ? null : api(path);
  ask?.catch(dec);
  await (await views()).show(kind, parts, path, ask, cached, quiet, seq);
  if (seq === gen) window.__shotReady = true;
}

function tick() {
  V?.tock();
  if (!document.hidden && current) route(true);
  clearTimeout(timer);
  timer = setTimeout(tick, 62000 - (Date.now() % 60000));
}

function views() {
  return import('./views.js').then((m) => (V = m));
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

export { ROUTES, cache, patch, main, gen, dec, BASE };

function dec(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

async function load(path, old, m) {
  let r = await fetch(BASE + path, { cache: 'no-cache' });
  if (!r.ok) r = await (await views()).bad(r, BASE + path);
  const etag = r.headers.get('etag');
  if (old && etag && old.etag === etag) { old.minute = m; return old.data; }
  const text = await r.text();
  if (old && old.text === text) { old.etag = etag; old.minute = m; return old.data; }
  let data = JSON.parse(text);
  if (data && data.next_cursor) data = await (await views()).more(data, path);
  cache.set(path, { etag, text, data, minute: m });
  return data;
}

addEventListener('hashchange', () => route());
document.addEventListener('visibilitychange', () => document.hidden || tick());
document.addEventListener('click', (e) => V?.click(e));
document.addEventListener('submit', (e) => V?.find(e));
route();
timer = setTimeout(tick, 62000 - (Date.now() % 60000));
