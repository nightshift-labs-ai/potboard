import { ROUTES, cache, patch } from './app.js';

function board(data) { // keyed rows patched in place: pot, fee, time left, entries
  const now = Date.now();
  const open = [];
  const soon = [];
  const shut = [];
  for (const b of data.items) {
    if (Date.parse(b.publishedAt) > now) soon.push(b);
    else if (Date.parse(b.deadline) > now) open.push(b);
    else shut.push(b);
  }
  open.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  soon.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  let pot = 0;
  let n = 0;
  for (const b of open) { pot += Number(b.potUsd) || 0; n += b.submissionCount || 0; }
  document.title = 'Bounties - Potboard (unofficial make.fun frontend)';
  return `<p class=strip data-k=strip><b>${open.length}</b> taking entries · <b>${money(pot)}</b>
 in live pots · <b>${n.toLocaleString('en-US')}</b> entries</p>
<h2 data-k=h1>Taking entries (${open.length})</h2>${head('h1')}${open.map(row).join('')}
<h2 data-k=h2>Opening soon (${soon.length})</h2>${head('h2')}${soon.map(row).join('')}
<details data-k=x><summary>Closed, awaiting results (${shut.length})</summary>
${head('h3')}${shut.map(row).join('')}</details>`;
}

function bounty(c) {
  const n = c.submissionCount || 0;
  const fees = Number(c.entryFeesUsd) > 0 ? '<small>incl. ' + money(c.entryFeesUsd)
    + (c.entryFeePayers ? ' from ' + Number(c.entryFeePayers).toLocaleString('en-US') + ' paid sign-ups' : ' in sign-up fees') + '</small>' : '';
  document.title = c.title + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › ${esc(c.title)}</p>
<h1>${esc(c.title)} ${chip(c, true)}</h1><p class="meta one" title="${esc(c.summary || '')}">${esc(c.summary || '')}</p>
${tabs(c.slug, n, false)}</div>
<div class=facts data-k=f><div><span class=lab>Live pot</span><b>${money(c.potUsd)}</b>${fees}</div>
<div><span class=lab>Entry fee</span><b>${fee(c.entryFeeUsd)}</b></div>
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
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › <a href="${link(slug)}">${esc(title)}</a></p>
<h1>${esc(title)}</h1>${tabs(slug, all.length, true, item && item.submissionCount)}</div>
${pg}
<table class=lb data-k=p${p}><thead><tr><th class=num>#</th><th>Entrant</th>
<th class=num>${esc(col.title)}${micro(col.source) ? '<small>90% interval</small>' : ''}</th><th class=num>Prize</th></tr></thead>
<tbody>${all.slice((p - 1) * 50, p * 50).map(lbRow(col, item)).join('')}</tbody></table>
${pg.replace('data-k=pg', 'data-k=pg2')}`;
}

function profile(u) {
  const r = u.record || {};
  const sol = (u.solutions || []).slice().sort(byPlace);
  document.title = (u.handle || 'Profile') + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › Profile</p>
<div class=who><img class=av alt="" crossorigin=anonymous src="${esc(avatar(u))}"><div>
<h1>${esc(u.display_name || u.handle)}</h1><p class=meta>@${esc(u.handle)}${joined(u.joined_at)}</p></div></div></div>
<div class=tiles data-k=t>${tile('Entered', r.competitions_entered)}${tile('Placed', r.competitions_placed)}
${tile('Won', r.competitions_won)}${tile('Best place', r.best_placement)}${tile('Prizes', money(r.prize_usd))}</div>
<div data-k=s class=pf><h2>${solHead(sol)}, best place first</h2><table class=sol><thead><tr><th>Place</th>
<th>Bounty / solution</th><th class=num>Score</th><th class=num>Prize</th></tr></thead><tbody>${sol.slice(0, 20).map(solRow).join('')}</tbody></table>
${sol.length > 20 ? '<p class=meta>Showing the first 20 of ' + sol.length + '.</p>' : ''}</div>`;
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
  const at = c.opensAt || c.publishedAt;
  let li = '';
  for (const x of ph) li += '<li><b>' + esc(x.title) + '</b> ' + when(x.startsAt, MIN) + ' - ' + when(x.endsAt, MINZ) + '</li>';
  return '<h2>Dates</h2><div class=dl>' + cell(Date.parse(at) > Date.now() ? 'Opens' : 'Opened', at)
    + cell('Deadline', c.deadline) + cell('Results by', ph.length ? ph[ph.length - 1].endsAt : '') + '</div><ul class=ph>' + li + '</ul>';
}

const merged = new WeakMap();
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
  + 'header{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 20px;background:#fff;'
  + 'border-bottom:1px solid #d9dce3;font-size:15px}'
  + 'header .wm{font-weight:800;font-size:20px;color:#14171c;text-decoration:none}'
  + '.tag{font-size:12px;text-transform:uppercase;letter-spacing:.04em;background:#eceef2;color:#3f4753;padding:2px 6px;'
  + 'border-radius:4px;margin-left:6px;font-weight:600}'
  + 'header nav{display:flex;gap:12px;align-items:center;flex:1}header form{display:flex;gap:6px;align-items:center}'
  + 'header input{font:inherit;padding:5px 8px;border:1px solid #d9dce3;border-radius:6px;width:9em}'
  + 'header button,.btn{font:inherit;padding:5px 12px;border:0;border-radius:6px;background:#3b2bd1;color:#fff;'
  + 'cursor:pointer;text-decoration:none;display:inline-block}'
  + '.stamp,.meta,small{color:#4b5563;font-size:15px}.stamp{white-space:nowrap}'
  + 'main{max-width:1100px;margin:0 auto;padding:14px 20px 30px}'
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
  + '.tabs a{display:grid;min-height:44px}}';

document.head.insertAdjacentHTML('beforeend', '<style>' + CSS + '</style>');

// On HTTP 429: wait for Retry-After (5 s if absent, 60 s at most), then ask once more.
export async function later(r, get) {
  const s = Math.min(60, Number(r.headers.get('retry-after')) || 5);
  await new Promise((ok) => setTimeout(ok, s * 1000));
  return get();
}

// The board's later pages, fetched only when the first page names a next_cursor (at most 5 more).
export async function more(data, url) {
  const items = data.items.slice();
  let cursor = data.next_cursor;
  for (let i = 0; cursor && i < 5; i++) {
    const r = await fetch(url + '&cursor=' + encodeURIComponent(cursor), { cache: 'no-cache' });
    if (!r.ok) break;
    const page = await r.json();
    items.push(...page.items);
    cursor = page.next_cursor;
  }
  return { items, next_cursor: null };
}
