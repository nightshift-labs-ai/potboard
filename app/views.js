import { ROUTES, cache, patch, main, gen, dec, BASE, N } from './app.js';

function board(data) { // keyed rows patched in place: pot, fee, time left, entries
  const now = Date.now();
  const open = [];
  const soon = [];
  const shut = [];
  const cats = [...new Set(data.items.map((b) => b.category).filter(Boolean))].sort();
  let pool = 0;
  for (const b of data.items) {
    if (cat && b.category !== cat) continue;
    pool++;
    if (!hit(b)) continue;
    if (Date.parse(b.publishedAt) > now) soon.push(b);
    else if (Date.parse(b.deadline) > now) open.push(b);
    else shut.push(b);
  }
  open.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  soon.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  if (sort !== 'end') for (const g of [open, soon, shut]) g.sort(order);
  let pot = 0;
  let n = 0;
  for (const b of open) { pot += Number(b.potUsd) || 0; n += b.submissionCount || 0; }
  document.title = 'Bounties - Potboard (unofficial make.fun frontend)';
  return `<p class=strip data-k=strip><b>${open.length}</b> taking entries · <b>${money(pot)}</b>
 in live pots · <b>${n.toLocaleString('en-US')}</b> entries${soonest(open)}</p>
<div class=ctl data-k=ctl>${SORTS.map(pickSort).join('')}<span></span>${['', ...cats].map(pickCat).join('')}${seek(open.length + soon.length + shut.length, pool)}</div>
<h2 data-k=h1>Taking entries (${open.length})</h2>${head('h1')}${open.map(row).join('')}
${open.length + soon.length + shut.length ? '' : '<p class=note data-k=empty>No bounties match these filters.</p>'}
<h2 data-k=h2>Opening soon (${soon.length})</h2>${head('h2')}${soon.map(row).join('')}
<details data-k=x><summary>Closed, awaiting results (${shut.length})</summary>
${head('h3')}${shut.map(row).join('')}</details>`;
}

function bounty(c) {
  const n = c.submissionCount || 0;
  const fees = Number(c.entryFeesUsd) > 0 ? '<small>incl. ' + money(c.entryFeesUsd) + ' in entry fees</small>' : '';
  const paid = c.entryFeePayers ? '<small>' + Number(c.entryFeePayers).toLocaleString('en-US') + ' paid</small>' : '';
  document.title = c.title + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › ${esc(c.title)}</p>
<h1>${esc(c.title)} ${state(c)}</h1><p class="meta one" title="${esc(c.summary || '')}">${esc(c.summary || '')}</p>
${tabs(c.slug, n, false)}</div>
<div class=facts data-k=f><div><span class=lab>Live pot</span><b>${money(c.potUsd)}</b>${fees}</div>
<div><span class=lab>Entry fee</span><b>${fee(c.entryFeeUsd)}</b>${paid}</div>
<div><span class=lab>Time left</span><b data-t=${esc(c.deadline)}>${left(c.deadline)}</b><small>${when(c.deadline, MINZ)}</small></div>
<div><span class=lab>Entries</span><b>${n.toLocaleString('en-US')}</b></div></div>
<div class=two data-k=two><section>${rewards(c)}</section><section>${dates(c)}
<p><a class=btn href="${link(c.slug)}/leaderboard">Full leaderboard</a>
<a class=btn href="https://make.fun/bounty/${encodeURIComponent(c.slug)}" target=_blank rel=noopener>Enter on make.fun ↗</a></p></section></div>
<div data-k=md>${c.description ? '<h2>Description</h2><div class=md>' + md(c.description) + '</div>' : ''}
${c.rules ? '<h2>Rules</h2><div class=md>' + md(c.rules) + '</div>' : '<p class=note>Loading rules...</p>'}</div>`;
}

function leaderboard(d, page = 1, item) { // 50 rows a page
  const all = rowsOf(d);
  const pages = Math.max(1, Math.ceil(all.length / 50));
  const p = Math.min(Math.max(1, page), pages);
  const comp = d.competition || {};
  const slug = typeof comp === 'string' ? comp : comp.slug || '';
  const title = comp.title || d.title || slug;
  const col = (d.columns || []).find(isRank(d.rank_key)) || { key: d.rank_key, title: 'Score' };
  const ph = d.phase ? esc(d.phase.title) + (d.phase.finalized_at ? ': final' : ': provisional') : '';
  const pg = pager(p, pages, all.length, slug, ph);
  document.title = 'Leaderboard: ' + title + ' - Potboard (unofficial)';
  return `<div class=lbh data-k=h><p class=crumb><a href="#/">Bounties</a> › <a href="${link(slug)}">${esc(title)}</a></p>
<h1>${esc(title)}</h1>${tabs(slug, all.length, true, item && item.submissionCount)}</div>
${band(all, col, item)}${pg}${all.length ? '' : '<p class=note data-k=empty>No ranked entries yet.</p>'}
<table class=lb data-k=p${p}><thead><tr><th class=num>#</th><th>Entrant</th>
<th class=num>${esc(col.title)}${micro(col.source) ? '<small>90% interval</small>' : ''}</th><th class=num>Prize</th></tr></thead>
<tbody>${all.slice((p - 1) * 50, p * 50).map(lbRow(col, item)).join('')}</tbody></table>
${pg.replace('data-k=pg', 'data-k=pg2')}`;
}

function profile(u, page = 1) { // bounded, addressable pages; no extra request
  const r = u.record || {};
  const sol = (u.solutions || []).slice().sort(byPlace);
  const pages = Math.max(1, Math.ceil(sol.length / 10));
  const p = Math.min(Math.max(1, page), pages);
  const pg = profilePager(u.handle, p, pages, sol.length);
  document.title = (u.handle || 'Profile') + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › Profile</p>
<div class=who><img class=av alt="" crossorigin=anonymous src="${esc(avatar(u))}"><div>
<h1>${esc(u.display_name || u.handle)}</h1><p class=meta>@${esc(u.handle)}${joined(u.joined_at)}</p></div></div>
${u.bio ? '<p class=bio>' + esc(u.bio) + '</p>' : ''}${publicLinks(u)}</div>
<div class=tiles data-k=t>${tile('Bounties entered', r.competitions_entered)}${tile('Placed', r.competitions_placed)}
${tile('Won', r.competitions_won)}${tile('Best place', r.best_placement ? place(r.best_placement) : null)}${tile('Prizes', money(r.prize_usd))}</div>
${recentPayouts(u.payouts || [])}
<div data-k=s class=pf><h2 id=solutions tabindex=-1>${solHead(sol)}, best place first</h2>${pg}
${sol.length ? '<table class=sol><thead><tr><th>Place</th><th>Bounty / solution</th><th class=num>Score</th><th class=num>Prize</th></tr></thead><tbody>'
  + sol.slice((p - 1) * 10, p * 10).map(solRow).join('') + '</tbody></table>' : '<p class=note>No public solutions yet.</p>'}${pg}</div>`;
}

function profilePager(handle, p, pages, total) {
  if (pages === 1) return '';
  const base = '#/u/' + encodeURIComponent(handle) + '/';
  return '<nav class=pager aria-label="Solution pages">Solutions ' + ((p - 1) * 10 + 1) + '-' + Math.min(p * 10, total)
    + ' of ' + total + ' · Page ' + p + ' of ' + pages + ' · '
    + (p > 1 ? '<a href="' + base + (p - 1) + '">Prev</a>' : 'Prev') + ' · '
    + (p < pages ? '<a href="' + base + (p + 1) + '">Next</a>' : 'Next') + '</nav>';
}

function external(url, label) {
  try {
    const u = new URL(url);
    if (!['https:', 'http:'].includes(u.protocol)) return '';
    return '<a href="' + esc(u.href) + '" target=_blank rel="noopener noreferrer">' + esc(label) + ' ↗</a>';
  } catch { return ''; }
}

function publicLinks(u) {
  const links = [];
  if (u.github_login) links.push(external('https://github.com/' + encodeURIComponent(u.github_login), 'GitHub'));
  if (u.x) links.push(external('https://x.com/' + encodeURIComponent(String(u.x).replace(/^@/, '')), 'X'));
  if (u.wallet?.explorer_url) links.push(external(u.wallet.explorer_url, 'Public wallet'));
  if (u.discord) links.push('Discord: ' + esc(u.discord));
  return links.length ? '<p class=links>' + links.filter(Boolean).join(' · ') + '</p>' : '';
}

function recentPayouts(payouts) {
  if (!payouts.length) return '';
  return '<section data-k=payouts><h2>Recent payouts</h2><ul class=payouts>' + payouts.slice().sort((a, b) => Date.parse(b.paid_at) - Date.parse(a.paid_at))
    .slice(0, 3).map((p) => '<li><b>' + money(p.amount_usd) + '</b> · <a href="' + link(p.competition?.slug || '') + '">'
      + esc(p.competition?.title || p.competition?.slug) + '</a> · ' + when(p.paid_at, DAY) + ' '
      + external(p.explorer_url, 'Receipt') + '</li>').join('') + '</ul></section>';
}

function pager(p, n, t, s, f) {
  const base = link(s) + '/leaderboard/';
  const a = t ? (p - 1) * 50 + 1 : 0;
  const b = Math.min(t, p * 50);
  const prev = p > 1 ? '<a href="' + base + (p - 1) + '">Prev</a>' : 'Prev';
  const next = p < n ? '<a href="' + base + (p + 1) + '">Next</a>' : 'Next';
  return '<p class=pager data-k=pg>' + (f ? f + ' · ' : '') + 'Rows ' + a + '-' + b + ' of ' + t.toLocaleString('en-US') + ' ranked · Page '
    + p + ' of ' + n + ' · ' + prev + ' · ' + next + '</p>';
}

function rewards(c) {
  const list = c.rewardsNow || [];
  const top = Number(list[0] && list[0].amountUsd) || 1;
  let rows = '';
  for (let i = 0; i < list.length; i++) {
    let j = i;
    while (j + 1 < list.length && list[j + 1].amountUsd === list[i].amountUsd) j++;
    const x = list[i];
    const w = Math.round((100 * Number(x.amountUsd)) / top);
    rows += '<tr><td data-l=Place>' + place(x.place) + (j > i ? '-' + place(list[j].place) : '') + '</td><td class=num data-l=Base>'
      + money(x.baseUsd) + '</td><td class=num data-l="Fee share">+' + money(x.feeShareUsd)
      + '</td><td class="num bar" data-l=Amount style="--w:' + w + '%"><b>' + money(x.amountUsd) + '</b>'
      + (j > i ? ' each' : '') + '</td></tr>';
    i = j;
  }
  return '<h2>Rewards</h2><table class=rw><thead><tr><th>Place</th><th class=num>Base</th><th class=num>Fee share</th>'
    + '<th class=num>Amount</th></tr></thead><tbody>' + rows + '<tr><td colspan=3><b>Total live pot</b></td>'
    + '<td class=num><b>' + money(c.potUsd) + '</b></td></tr></tbody></table>';
}

function dates(c) {
  const ph = c.phases || [];
  const final = ph.find((x) => x.key === 'final');
  const at = c.opensAt || c.publishedAt;
  let li = '';
  for (const x of ph) li += '<li><b>' + esc(x.title) + '</b> ' + when(x.startsAt, MIN) + ' - ' + when(x.endsAt, MINZ) + '</li>';
  return '<h2>Dates</h2><div class=dl>' + cell(Date.parse(at) > Date.now() ? 'Opens' : 'Opened', at)
    + cell('Deadline', c.deadline) + (final?.endsAt ? cell('Final phase ends', final.endsAt) : '') + '</div><ul class=ph>' + li + '</ul>';
}

const merged = new WeakMap();
const SORTS = [['end', 'Closing soon'], ['pot', 'Biggest pot'], ['n', 'Most entries']];
let sort = 'end';
let last = null;
let cat = '';
const TICK = new RegExp('\x60([^\x60]+)\x60', 'g');
const LINK = new RegExp('\\[([^\\]]+)\\]\\((https://[^)\\s]+)\\)', 'g');

function rowsOf(d) {
  let r = merged.get(d);
  if (!r) {
    r = (d.entries || []).concat(d.rest || []);
    merged.set(d, r);
  }
  return r;
}

function isRank(key) {
  return (col) => col.key === key;
}

function score(source, value, display) {
  if (micro(source) && value != null) return pct(value);
  const v = display ?? value;
  if (v == null || v === 'n/a') return '-';
  const n = Number(v);
  return Number.isInteger(n) && Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : esc(v);
}

function lbRow(col, item) {
  const prizes = (item && item.rewardsNow) || [];
  return (e) => {
    const full = e.values && typeof e.values === 'object';
    const v = full ? e.values[col.key] : e.value;
    const d = e.display && typeof e.display === 'object' ? e.display[col.key] : e.display;
    const house = e.house ? ' <span class="chip cx">house</span>' : '';
    const iv = e.interval && e.interval.low != null && micro(col.source)
      ? '<small>' + pct(e.interval.low) + '-' + pct(e.interval.high) + '</small>' : '';
    const x = e.prize_rank ? prizes[e.prize_rank - 1] : null;
    return '<tr><td class="num r" data-l=Rank>' + esc(e.rank ?? '-') + '</td><td data-l=Entrant><b>' + who(e.handle) + '</b>' + house
      + '<small>' + esc(e.title || '') + '</small></td><td class="num s" data-l=Score>' + score(col.source, v, d) + iv
      + '</td><td class=num data-l=Prize>' + (x && Number(x.amountUsd) > 0 ? money(x.amountUsd) : '') + '</td></tr>';
  };
}

function solRow(s) {
  const c = s.competition || {};
  const sc = s.score || {};
  return '<tr><td data-l=Place>' + (s.placement ? place(s.placement) : '-') + '</td><td data-l=Bounty><a href="' + link(c.slug || '')
    + '"><b>' + esc(c.title || c.slug) + '</b></a><small>' + esc(s.title || '') + '</small></td><td class=num data-l=Score>'
    + score(sc.column && sc.column.source, sc.value, sc.display) + '</td><td class=num data-l=Prize>'
    + (Number(s.prize_usd) > 0 ? money(s.prize_usd) : '') + '</td></tr>';
}

// Leaderboard band: cached pot and deadline (no extra request), ranked count and current leader.
function band(all, col, item) {
  const top = all[0];
  const n = item && item.submissionCount;
  let h = item ? '<div class=pot><span class=lab>Live pot</span><b>' + money(item.potUsd) + '</b></div>'
    + '<div><span class=lab>Time left</span><b data-t=' + esc(item.deadline) + '>' + left(item.deadline) + '</b></div>' : '';
  h += '<div><span class=lab>Ranked</span><b>' + all.length.toLocaleString('en-US') + '</b>'
    + (n ? '<small>of ' + Number(n).toLocaleString('en-US') + ' entries</small>' : '') + '</div>';
  if (top) {
    const v = top.values && typeof top.values === 'object' ? top.values[col.key] : top.value;
    const d = top.display && typeof top.display === 'object' ? top.display[col.key] : top.display;
    h += '<div><span class=lab>Leader</span><b>' + esc(top.handle || '-') + '</b><small>' + score(col.source, v, d) + '</small></div>';
  }
  return '<div class=band data-k=band>' + h + '</div>';
}

function tile(label, v) {
  return '<div><span class=lab>' + label + '</span><b>' + esc(v ?? '-') + '</b></div>';
}

function avatar(u) {
  if (typeof u.image === 'string' && u.image) return u.image.startsWith('/') ? 'https://make.fun' + u.image : u.image;
  if (u.avatar && u.avatar.url_small) return u.avatar.url_small;
  return 'https://make.fun/api/profiles/' + encodeURIComponent(u.handle) + '/picture.png';
}

function place(n) {
  const s = n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return Number(n) + s;
}

function tabs(slug, n, lb, e) {
  const cur = ' aria-current=page';
  const tail = e ? ' of ' + Number(e).toLocaleString('en-US') + ' entries' : '';
  return '<nav class=tabs><a href="' + link(slug) + '"' + (lb ? '' : cur) + '>Overview</a><a href="' + link(slug)
    + '/leaderboard"' + (lb ? cur + '>Leaderboard (' + Number(n).toLocaleString('en-US') + ' ranked' + tail + ')' : '>Leaderboard')
    + '</a></nav>';
}

function solHead(sol) {
  return sol.length + (sol.length === 1 ? ' solution' : ' solutions');
}

function inline(s) {
  return s.replace(TICK, '<code>$1</code>').replace(LINK, '<a href="$2" target=_blank rel=noopener>$1</a>');
}

function md(src) {
  let out = '';
  let list = '';
  let para = '';
  let open = 0;
  const flush = () => {
    if (para) out += '<p>' + inline(para.trim()) + '</p>';
    if (list) out += '</' + list + '>';
    para = '';
    list = '';
  };
  for (const line of esc(src).split('\n')) {
    const t = line.trim();
    const ol = t.match(new RegExp('^\\d+\\. (.*)'));
    if (t.startsWith('## ')) {
      flush();
      out += (open ? '</details>' : '') + '<details' + (open ? '' : ' open') + '><summary>' + inline(t.slice(3)) + '</summary>';
      open++;
    } else if (t.startsWith('### ')) {
      flush();
      out += '<h4>' + inline(t.slice(4)) + '</h4>';
    } else if (t.startsWith('- ') || ol) {
      if (para) { out += '<p>' + inline(para.trim()) + '</p>'; para = ''; }
      const kind = ol ? 'ol' : 'ul';
      if (list !== kind) { if (list) out += '</' + list + '>'; out += '<' + kind + '>'; list = kind; }
      out += '<li>' + inline(ol ? ol[1] : t.slice(2)) + '</li>';
    } else if (!t) {
      flush();
    } else {
      if (list) { out += '</' + list + '>'; list = ''; }
      para += ' ' + t;
    }
  }
  flush();
  return out + (open ? '</details>' : '');
}

function when(iso, o) {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (!(t > 0)) return esc(iso);
  const s = o ? new Date(t).toLocaleString('en-GB', o) : new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  return '<time datetime=' + esc(iso) + '>' + s + '</time>';
}

function who(h) {
  return '<a href="#/u/' + encodeURIComponent(h) + '">' + esc(h) + '</a>';
}

function cell(label, iso) {
  return '<div><span class=lab>' + label + '</span><br>' + when(iso, MINZ) + '</div>';
}

function micro(source) {
  return Boolean(source) && String(source).endsWith('_micro');
}

function pct(v) {
  return (Number(v) / 10000).toFixed(2) + '%';
}

function byPlace(a, b) {
  return (a.placement || Infinity) - (b.placement || Infinity) || 0;
}

function joined(iso) {
  return iso ? ' · joined ' + when(iso, DAY) : '';
}

function side(d) {
  const b = d && innerWidth >= 1100 && cache.get(ROUTES.board())?.data;
  const aside = document.querySelector('aside');
  document.body.classList.toggle('sp', Boolean(b));
  last = d || null;
  if (!b) return aside.replaceChildren();
  const i = b.items.findIndex((x) => x.slug === d.slug);
  if (i >= 0) b.items[i] = d;
  const t = document.title;
  patch(aside, board(b), 'board');
  document.title = t;
  for (const a of aside.querySelectorAll('.row')) if (a.dataset.k === d.slug) a.setAttribute('aria-current', 'page');
}

function fromBoard(slug) {
  const b = cache.get(ROUTES.board())?.data;
  return b ? b.items.find((x) => x.slug === slug) || null : null;
}

// Board controls: sort and category, applied by board() and patch() with no request.
function pickSort(o) {
  return '<button type=button data-s=' + o[0] + ' aria-pressed=' + (sort === o[0]) + '>' + o[1] + '</button>';
}

function pickCat(c) {
  return '<button type=button data-c="' + esc(c) + '" aria-pressed=' + (cat === c) + '>' + (esc(c) || 'All') + '</button>';
}

function order(a, b) {
  return sort === 'pot' ? (Number(b.potUsd) || 0) - (Number(a.potUsd) || 0)
    : (b.submissionCount || 0) - (a.submissionCount || 0);
}

function choose(el) {
  const focus = document.activeElement === el;
  if (el.dataset.s) sort = el.dataset.s;
  else if ('q' in el.dataset) q = el.value;
  else cat = el.dataset.c;
  const d = cache.get(ROUTES.board())?.data;
  if (d && main.dataset.v === ROUTES.board()) patch(main, board(d), main.dataset.v);
  else if (last) side(last);
  if (focus && !el.isConnected && !('q' in el.dataset)) {
    [...document.querySelectorAll('[data-s],[data-c]')].find((b) => b.dataset.s === el.dataset.s && b.dataset.c === el.dataset.c)?.focus({ preventScroll: true });
  }
}

function head(k) {
  return '<div class=hd data-k=head-' + k + '><span></span><span>Live pot</span><span>Fee</span>'
    + '<span>Time left</span><span>Entries</span></div>';
}

function row(b) {
  const places = b.rewardsNow ? b.rewardsNow.length : 0;
  return `<a class=row data-k=${esc(b.slug)} href="${link(b.slug)}"><div><span class=t>${esc(b.title)}</span>
<br><small>${esc(b.category)} · ${esc(b.sponsor && b.sponsor.name)} · ${say(places, 'place')}</small></div>
<b data-l="Live pot">${money(b.potUsd)}</b><b data-l="Entry fee">${fee(b.entryFeeUsd)}</b>
<b data-l="Time left">${due(b)}</b><b data-l=Entries>${(b.submissionCount || 0).toLocaleString('en-US')}</b></a>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ent);
}

function money(v) {
  const n = Number(v) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function left(iso) {
  const ms = Date.parse(iso) - Math.floor(Date.now() / 60000) * 60000;
  if (!(ms > 0)) return 'Closed';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  return h >= 48 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h ? h + 'h ' + m + 'm' : m + 'm';
}

function chip(c, long) {
  const now = Date.now();
  const end = Date.parse(c.deadline);
  const at = c.opensAt || c.publishedAt;
  const opens = Date.parse(at);
  if (opens > now || (c.acceptingSubmissions === false && end > now)) {
    const txt = long || !(opens > now) ? 'Opens ' + utc(opens) : 'Opens in ' + left(at);
    return '<span class="chip cs" title="' + esc(at) + ' (UTC)">' + txt + '</span>';
  }
  const ms = end - now;
  const cls = !(ms > 0) ? 'cx' : ms < 3600000 ? 'c1' : ms < 86400000 ? 'c24' : '';
  return '<span class="chip ' + cls + '" title="' + esc(c.deadline) + ' (UTC)" data-t=' + esc(c.deadline) + '>' + left(c.deadline) + '</span>';
}

// Time left on a board row: bold text (amber under 24 h, red under 1 h) over a bar showing how much
// of the span from opening to the deadline has passed. A bounty not open yet keeps its Opens chip.
function due(b) {
  const now = Date.now();
  const end = Date.parse(b.deadline);
  const at = Date.parse(b.opensAt || b.publishedAt);
  if (at > now) return chip(b);
  const ms = end - now;
  const cls = !(ms > 0) ? 'cx' : ms < 3600000 ? 'r1' : ms < 86400000 ? 'r24' : '';
  const done = Math.round(Math.min(1, Math.max(0, (now - at) / (end - at))) * 100) || 0;
  return '<span class="due ' + cls + '" title="' + esc(b.deadline) + ' (UTC)" data-t=' + esc(b.deadline) + '>'
    + left(b.deadline) + '</span><i class="bar ' + cls + '"><i style="width:' + done + '%"></i></i>';
}

// The bounty page status: from opensAt/publishedAt, acceptingSubmissions and the deadline.
function state(c) {
  const now = Date.now();
  const end = Date.parse(c.deadline);
  const at = Date.parse(c.opensAt || c.publishedAt);
  if (at > now || (c.acceptingSubmissions === false && end > now)) return chip(c, true);
  if (!(end > now)) return '<span class="chip cx">Closed, awaiting results</span>';
  return '<span class=chip>Taking entries · closes ' + when(c.deadline, MIN) + ' UTC</span>';
}

function soonest(open) {
  const t = Math.min(...open.map((b) => Date.parse(b.deadline)).filter((x) => x > 0));
  if (!(t < Infinity)) return '';
  const iso = new Date(t).toISOString();
  return ' · next deadline <b data-t=' + iso + '>' + left(iso) + '</b>';
}

function fee(v) {
  return v == null || Number(v) === 0 ? 'Free' : money(v);
}

function link(slug) {
  return '#/bounty/' + encodeURIComponent(slug);
}

function say(n, w) {
  return n.toLocaleString('en-US') + ' ' + w + (n === 1 ? '' : 's');
}

function ent(c) {
  return '&#' + c.charCodeAt(0) + ';';
}

function utc(t) {
  return t > 0 ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'soon';
}

export { board, bounty, leaderboard, profile, side, fromBoard, left };

const DAY = { timeZone: 'UTC', day: 'numeric', month: 'short' };
const MIN = { ...DAY, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
const MINZ = { ...MIN, timeZoneName: 'short' };

const CSS = '*{box-sizing:border-box}a{color:#3b2bd1}:focus-visible{outline:3px solid #3b2bd1;outline-offset:2px}'
  + 'h1[tabindex]:focus,#solutions:focus,main[tabindex]:focus{outline:none}'
  + 'header{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 20px;background:#fff;'
  + 'border-bottom:1px solid #d9dce3;font-size:15px}'
  + 'header .wm{font-weight:800;font-size:20px;color:#14171c;text-decoration:none}'
  + '.tag{font-size:12px;text-transform:uppercase;letter-spacing:.04em;background:#eceef2;color:#3f4753;padding:2px 6px;'
  + 'border-radius:4px;margin-left:6px;font-weight:600}'
  + 'header nav{display:flex;gap:12px;align-items:center;flex:1}header form{display:flex;gap:6px;align-items:center}'
  + 'header input{font:inherit;padding:5px 8px;border:1px solid #d9dce3;border-radius:6px;width:9em}'
  + 'header button,.btn{font:inherit;padding:5px 12px;border:0;border-radius:6px;background:#3b2bd1;color:#fff;'
  + 'cursor:pointer;text-decoration:none;display:inline-block}'
  + '.stamp,.meta,small{color:#4b5563;font-size:15px}'
  + 'main{min-width:0;max-width:1100px;margin:0 auto;padding:14px 20px 30px}'
  + 'footer{max-width:1100px;margin:0 auto;padding:16px 20px 40px;color:#4b5563;font-size:14px;border-top:1px solid #d9dce3}'
  + 'h1{font-size:28px;margin:4px 0}h2{font-size:22px;margin:18px 0 8px}'
  + '.strip{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:8px 14px;font-size:17px}'
  + '.hd,.row{display:grid;grid-template-columns:1fr 130px 110px 140px 90px;gap:10px;align-items:center;padding:6px 14px}'
  + '.hd{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#4b5563;font-weight:700}'
  + '.hd span,.row>b{text-align:right}'
  + '.row{background:#fff;border:1px solid #d9dce3;border-top:0;color:inherit;text-decoration:none;min-height:56px}'
  + '.row:nth-of-type(even){background:#f4f5f7}.row:hover .t{text-decoration:underline}'
  + '.row .t{font-size:18px;font-weight:650;color:#3b2bd1}.row>b{font-size:24px;font-weight:700}'
  + '.row>b:first-of-type{background:#eef8f1;border-radius:6px;padding:0 6px}'
  + '.row>b small{display:block;font-size:13px;font-weight:400}'
  + '.chip{display:inline-block;font-size:14px;font-weight:700;padding:2px 8px;border-radius:999px;background:#ddf3e4;'
  + 'color:#0e5a2e;white-space:nowrap}'
  + '.due{font-weight:700}.due.r24{color:#7a4a00}.due.r1{color:#a01b1b}.due.cx{color:#3f4753}'
  + '.bar{display:block;height:4px;margin:3px 0 0 auto;max-width:96px;background:#eceef2;border-radius:2px}'
  + '.bar i{display:block;height:100%;background:#8b93a1;border-radius:2px}.bar.r24 i{background:#e8a317}.bar.r1 i{background:#d92d20}'
  + '.c24{background:#fde7b0;color:#5c3d00}.c1{background:#fddcdc;color:#8f1d1d}.cx{background:#eceef2;color:#3f4753}'
  + '.cs{background:#dbeafe;color:#1e3a8a}'
  + '.note{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:12px 14px}'
  + 'details{margin:6px 0}summary{cursor:pointer;font-weight:650;min-height:32px}'
  + '@media(max-width:640px){main,header{padding-left:12px;padding-right:12px}'
  + 'header nav{flex-wrap:wrap}header form{flex:1 1 100%}header input{flex:1;min-width:0}.hd{display:none}'
  + '.row{grid-template-columns:1fr 1fr;border:1px solid #d9dce3;border-radius:8px;margin-bottom:8px}'
  + '.row>div{grid-column:1/-1}.row>b{text-align:left;font-size:20px}'
  + '.row>b::before{content:attr(data-l);display:block;font-size:13px;text-transform:uppercase;color:#4b5563}'
  + 'a,button{min-height:44px}header nav a,header form{display:flex;align-items:center}}'
  + '.crumb{font-size:15px;margin:0 0 4px}'
  + '.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:6px 0}'
  + '.band{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}'
  + '.band div{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:1px 6px;min-width:0}'
  + '.band .pot{background:#eef8f1}.band b{font-size:17px;margin:0 4px;overflow-wrap:anywhere}.band small{white-space:nowrap;font-size:14px}'
  + '.band .lab{font-size:11px}.lbh .crumb{display:none}.lbh h1{margin:0}'
  + '.facts div,.tiles div{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:8px 12px}'
  + '.facts div:first-child{background:#eef8f1}.facts div{padding:3px 10px}'
  + '.facts b{display:block;font-size:36px;line-height:1.15;white-space:nowrap}.facts small{display:block;font-size:14px}'
  + '.one{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0}'
  + '@media(min-width:641px){.lb{table-layout:fixed}.lb td,.lb th{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.lb th:nth-child(1){width:64px}.lb th:nth-child(3){width:200px}.lb th:nth-child(4){width:96px}'
  + '.sol{table-layout:fixed}.sol td{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sol td>a{display:block;'
  + 'overflow:hidden;text-overflow:ellipsis}.sol th:nth-child(1){width:72px}.sol th:nth-child(3){width:120px}'
  + '.sol th:nth-child(4){width:90px}}.lb td,.sol td{vertical-align:top;line-height:1.3}.lb th{line-height:1.3}'
  + '.lb small,.sol small{display:block;font-size:14px;font-weight:400;color:#4b5563;overflow:hidden;text-overflow:ellipsis}'
  + '.who{display:flex;align-items:center;gap:4px}.who h1,.who p{margin:0}.tiles div:last-child{background:#eef8f1}'
  + '.pf h2{font-size:20px;margin:10px 0 4px}'
  + '.bio{max-width:70ch;margin:8px 0;white-space:pre-wrap}.links{margin:6px 0}.payouts{margin:4px 0;padding-left:22px}'
  + '.bio,.links,.payouts,.who{overflow-wrap:anywhere}.who>div{min-width:0}.av{flex-shrink:0}'
  + '.lab{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#4b5563;font-weight:700}'
  + '.two{display:grid;gap:16px}@media(min-width:760px){.two{grid-template-columns:1fr 1fr}}'
  + 'table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d9dce3}'
  + 'th,td{padding:2px 10px;text-align:left}th{font-size:13px;text-transform:uppercase;color:#4b5563}'
  + 'tbody tr:nth-child(even){background:#f4f5f7}.num{text-align:right}'
  + '.tabs{display:flex;gap:16px;border-bottom:1px solid #d9dce3;margin:2px 0;font-size:17px}'
  + '.tabs a{padding:6px 2px;text-decoration:none}'
  + '.tabs [aria-current]{border-bottom:3px solid #3b2bd1;font-weight:700;color:#14171c}'
  + '.lb td,.lb th{font-size:18px;padding:2px 10px}.lb th{font-size:15px}'
  + '.lb .r,.lb .s{font-size:20px;font-weight:700}.pager{font-size:18px;margin:4px 0}'
  + '.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.tiles b{display:block;font-size:26px}'
  + '.av{width:64px;height:64px;border-radius:50%;vertical-align:middle;margin-right:10px;background:#eceef2}'
  + '.md{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:6px 16px;overflow-wrap:anywhere}'
  + 'code{background:#f4f5f7;padding:0 4px;border-radius:4px}'
  + '.two h2,.sp aside h2{font-size:20px;margin:10px 0 4px}'
  + '@media(min-width:641px){.rw th,.rw td{white-space:nowrap}}'
  + '.bar{background:linear-gradient(90deg,#dcd7ff var(--w),transparent 0)}'
  + '.dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dl div{background:#fff;border:1px solid #d9dce3;'
  + 'border-radius:8px;padding:3px 10px}.ph{margin:6px 0;padding-left:20px}'
  + '.sp{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:0 20px}'
  + '.sp header,.sp footer{grid-column:1/-1}.sp main{margin:0;max-width:none;padding-left:0}'
  + '.sp aside{padding:14px 0 20px 20px}.sp .two{grid-template-columns:1fr}'
  + '.sp aside .hd,.sp aside .row{grid-template-columns:1fr 110px 56px 84px 58px;gap:8px;padding:4px 8px}'
  + '.sp aside .row{min-height:44px}.sp aside .t{font-size:16px}.sp aside .row>b{font-size:19px}'
  + '.sp aside .hd{font-size:11.5px}.sp aside .chip{font-size:13px;white-space:normal}.sp aside b small{font-size:12px;white-space:nowrap}.sp aside .row>div{min-width:0}'
  + '.sp aside .t,.sp aside div>small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.sp aside br{display:none}.sp aside .row[aria-current]{background:#fff3c4;box-shadow:inset 5px 0 #3b2bd1}'
  + '.sp .facts b{font-size:30px}.sp h1{font-size:26px}'
  + '@media(max-width:640px){.facts,.tiles{grid-template-columns:1fr 1fr}.facts b{font-size:26px}'
  + 'table,tbody,tr,td{display:block}thead{display:none}tr{border-bottom:1px solid #d9dce3;padding:4px 0}'
  + 'td::before{content:attr(data-l) ": ";color:#4b5563;font-size:13px;text-transform:uppercase}'
  + '.tabs a{display:grid;min-height:44px}}'
  + '.ctl{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.ctl span{width:12px}aside .ctl{margin:6px 0 0;gap:4px}aside .ctl button{font-size:13px;min-height:26px;padding:0 9px}'
  + '.ctl button{font:inherit;font-size:15px;min-height:34px;padding:0 12px;border:1px solid #d9dce3;'
  + 'border-radius:17px;background:#fff;color:#14171c}.ctl [aria-pressed=true]{background:#3b2bd1;color:#fff}'
  + '@media(max-width:640px){.ctl button{min-height:44px}}.how{margin:0 0 6px;font-weight:600;color:#14171c}'
  + '.ctl input{font:inherit;font-size:15px;width:8em;min-height:34px;padding:0 10px;border:1px solid #d9dce3;'
  + 'border-radius:17px;margin-left:6px}aside .ctl input{font-size:13px;min-height:26px;width:6.5em}'
  + '.ctl output{align-self:center;font-size:13px;font-weight:700;color:#4a5060}';

document.head.insertAdjacentHTML('beforeend', '<style>' + CSS + '</style>');

// Paints a view: first from memory (cached data or the cached board item), then the fresh data if it changed.
export async function show(kind, parts, view, ask, cached, quiet, seq) {
  if (seq !== gen) return;
  for (const a of document.querySelectorAll('[data-nav]')) a.toggleAttribute('aria-current', kind === 'board');
  let early = cached;
  try {
    if (!['bounty', 'leaderboard'].includes(kind)) side();
    early = cached || (kind === 'bounty' && fromBoard(dec(parts[1] || '')));
    if (kind !== 'board' && fromBoard(dec(parts[1] || ''))) N.mem++;
    if (early) paint(kind, early, parts, view);
    else if (!quiet) main.innerHTML = '<p class=note>Loading...</p>';
    let data = early;
    if (ask) {
      data = await ask;
      if (seq !== gen) return;
      if (data !== early) paint(kind, data, parts, view);
    }
    side(kind === 'bounty' ? data : kind === 'leaderboard' && fromBoard(dec(parts[1] || '')));
  } catch (e) {
    if (seq !== gen) return;
    fail(e, Boolean(early));
    side(kind === 'bounty' ? early : kind === 'leaderboard' && fromBoard(dec(parts[1] || '')));
  }
  stamp();
  if (!quiet && seq === gen) {
    const paging = renderedView === view;
    renderedView = view;
    renderedHash = location.hash;
    const key = history.state?.potboardKey;
    const saved = scrollPositions.get(key);
    if (saved == null) history.replaceState({ ...history.state, potboardKey: ++historyKey }, '');
    const focus = main.querySelector(paging && kind === 'profile' ? '#solutions' : 'h1') || main;
    focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
    scrollTo(0, saved ?? (paging && kind === 'profile' ? focus.getBoundingClientRect().top + scrollY - 12 : 0));
  }
}

// Delegated listeners: the retry link re-runs the route; the header form opens a profile.
export function click(e) {
  const pick = e.target.closest('[data-s],[data-c]');
  if (pick) return choose(pick);
  if (!e.target.closest('[data-retry]')) return;
  e.preventDefault();
  dispatchEvent(new HashChangeEvent('hashchange'));
}

export function find(e) {
  e.preventDefault();
  const h = e.target.elements.h.value.trim().replace(/^@/, '');
  if (h) location.hash = '#/u/' + encodeURIComponent(h);
}

// The minute tick: the stamp and every time-left text node, nothing else.
export function tock() {
  stamp();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = left(el.dataset.t);
}

function paint(kind, data, parts, view) {
  const views = { board, bounty, leaderboard, profile };
  patch(main, views[kind](data, Math.floor(Number(parts[kind === 'profile' ? 2 : 3])) || 1, fromBoard(dec(parts[1] || ''))), view);
  stamp();
}

let renderedView = '';
let renderedHash = '';
let historyKey = 0;
const scrollPositions = new Map();
history.scrollRestoration = 'manual';
addEventListener('scroll', () => {
  if (location.hash === renderedHash) scrollPositions.set(history.state?.potboardKey, scrollY);
}, { passive: true });
addEventListener('resize', () => { if (last) side(last); });

function stamp() {
  document.querySelector('.stamp').textContent = 'updated ' + new Date().toISOString().slice(11, 16) + ' UTC'
    + ' · this view: ' + say(N.req, 'API request') + ' · ' + N.same + ' unchanged (ETag) · ' + N.mem + ' from memory';
}

function fail(e, keep) {
  const why = esc(e && e.message);
  const msg = why === 'not found' ? 'Not found on make.fun.' : 'Could not load from make.fun (' + why + ').';
  const note = '<p class=note data-k=err>' + msg + ' <a href="" data-retry>Retry</a></p>';
  if (keep) main.insertAdjacentHTML('afterbegin', note);
  else { main.innerHTML = note; main.dataset.v = ''; document.title = 'Error - Potboard (unofficial)'; }
}

// A response that is not ok: on HTTP 429 wait for Retry-After (5 s if absent, 60 s at most) and ask
// once more; anything still not ok becomes an error.
export async function bad(r, url) {
  if (r.status === 429) {
    const s = Math.min(60, Number(r.headers.get('retry-after')) || 5);
    await new Promise((ok) => setTimeout(ok, s * 1000));
    N.req++;
    r = await fetch(url, { cache: 'no-cache' });
  }
  if (!r.ok) throw new Error(r.status === 404 ? 'not found' : 'HTTP ' + r.status);
  return r;
}

// The board's later pages, fetched only when its first page names a next_cursor (at most 5 more).
export async function more(data, path) {
  if (path !== ROUTES.board()) return data;
  const items = data.items.slice();
  let cursor = data.next_cursor;
  for (let i = 0; cursor && i < 5; i++) {
    N.req++;
    const r = await fetch(BASE + path + '&cursor=' + encodeURIComponent(cursor), { cache: 'no-cache' });
    if (!r.ok) break;
    const page = await r.json();
    items.push(...page.items);
    cursor = page.next_cursor;
  }
  return { items, next_cursor: null };
}

// Board filter: the text field at the end of the chip row narrows rows by title, slug or category,
// case-insensitively, through board() and patch() with no request. '/' focuses it, Escape clears it.
let q = '';

function hit(b) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [b.title, b.slug, b.category].some((v) => String(v ?? '').toLowerCase().includes(needle));
}

function seek(n, m) {
  const label = 'Filter bounties by title, slug or category (press /)';
  const shown = q.trim() ? '<output>' + n + ' of ' + m + '</output>' : '';
  return '<input type=search data-q placeholder=Filter aria-label="' + label + '" value="' + esc(q) + '">' + shown;
}

// Applies the field's text; a repaint may replace the field, so focus and caret move to the new one.
function sift(el) {
  const had = document.activeElement === el;
  const a = el.selectionStart;
  const z = el.selectionEnd;
  choose(el);
  const f = document.querySelector('[data-q]');
  if (had && f && f !== el) { f.focus(); f.setSelectionRange(a, z); }
}

function keys(e) {
  const f = document.querySelector('[data-q]');
  if (!f || e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
  if (e.key === '/' && !typing) { e.preventDefault(); f.focus(); }
  else if (e.key === 'Escape' && (e.target === f || (!typing && q))) { e.preventDefault(); f.value = ''; sift(f); }
}

document.addEventListener('input', (e) => e.target.matches('[data-q]') && sift(e.target));
document.addEventListener('keydown', keys);
