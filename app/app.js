const ROUTES = { // 1 endpoint a view
  board: () => '/competitions?status=open&activity=times',
  bounty: (s) => '/competitions/' + s + '?submissions=summary',
  leaderboard: (s) => '/competitions/' + s + '/leaderboard?rows=first',
  profile: (h) => '/profiles/' + h,
};

async function api(path) { // Map cache + ETag revalidation + in-flight dedupe
  const old = cache.get(path);
  const m = Math.floor(Date.now() / 60000);
  if (old && old.minute === m) { N.mem++; return old.data; }
  if (inflight.has(path)) { N.mem++; return inflight.get(path); }
  const p = load(path, old, m);
  inflight.set(path, p);
  try { return await p; } finally { inflight.delete(path); }
}

function patch(root, html, view) {
  T.innerHTML = html;
  const next = [...T.content.children];
  const prev = [...root.children];
  if (root.dataset.v !== view) {
    root.replaceChildren(...next);
    root.dataset.v = view;
    return;
  }
  const keyed = new Map(prev.map((el) => [el.dataset.k, el]));
  for (let i = 0; i < next.length; i++) {
    const old = keyed.get(next[i].dataset.k);
    const el = old?.isEqualNode(next[i]) ? old : next[i];
    if (root.children[i] !== el) root.insertBefore(el, root.children[i] || null);
  }
  while (root.children.length > next.length) root.lastElementChild.remove();
}

async function route(quiet) {
  window.__shotReady = false;
  const parts = location.hash.slice(2).split('/');
  const kind = parts[0] === 'u' ? 'profile' : parts[0] !== 'bounty' ? 'board'
    : parts[2] === 'leaderboard' ? 'leaderboard' : 'bounty';
  const path = ROUTES[kind](encodeURIComponent(dec(parts[1] || '')));
  const seq = ++gen;
  const cached = cache.get(path)?.data;
  const turn = !quiet && ['leaderboard', 'profile'].includes(kind) && main.dataset.v === path;
  current = path;
  if (!quiet) N.req = N.same = N.mem = 0;
  const ask = cached && turn ? null : api(path);
  if (!ask) N.mem++;
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
const N = { req: 0, same: 0, mem: 0 };
const BASE = 'https://make.fun/api';
const T = document.createElement('template');
const main = document.querySelector('main');
let V = null;
let gen = 0;
let current = '';
let timer = 0;

export { ROUTES, cache, patch, main, gen, dec, BASE, N };

function dec(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

async function load(path, old, m) {
  N.req++;
  let r = await fetch(BASE + path, { cache: 'no-cache' });
  if (!r.ok) r = await (await views()).bad(r, BASE + path);
  const etag = r.headers.get('etag');
  if (old && etag && old.etag === etag) { N.same++; old.minute = m; return old.data; }
  const text = await r.text();
  if (old && old.text === text) { N.same++; old.etag = etag; old.minute = m; return old.data; }
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
