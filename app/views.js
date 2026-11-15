import { esc, money, left, chip, fee, link, say } from './app.js';

export function bounty(c) {
  const n = c.submissionCount || 0;
  const fees = Number(c.entryFeesUsd) > 0 ? '<small>incl. ' + money(c.entryFeesUsd) + ' fees</small>' : '';
  document.title = c.title + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › ${esc(c.title)}</p>
<h1>${esc(c.title)} ${chip(c)}</h1><p class="meta one" title="${esc(c.summary || '')}">${esc(c.summary || '')}</p>
${tabs(c.slug, n, false)}</div>
<div class=facts data-k=f><div><span class=lab>Live pot</span><b>${money(c.potUsd)}</b>${fees}</div>
<div><span class=lab>Entry fee</span><b>${fee(c.entryFeeUsd)}</b></div>
<div><span class=lab>Time left</span><b data-t=${esc(c.deadline)}>${left(c.deadline)}</b><small>${when(c.deadline)}</small></div>
<div><span class=lab>Entries</span><b>${n.toLocaleString('en-US')}</b></div></div>
<div class=two data-k=two><section>${rewards(c)}</section><section>${dates(c)}
<p><a class=btn href="${link(c.slug)}/leaderboard">Leaderboard (${say(n, 'entry').replace('entrys', 'entries')})</a></p></section></div>
<div data-k=md>${c.description ? '<h2>Description</h2><div class=md>' + md(c.description) + '</div>' : ''}
${c.rules ? '<h2>Rules</h2><div class=md>' + md(c.rules) + '</div>' : '<p class=note>Loading rules...</p>'}</div>`;
}

export function leaderboard(d, page = 1) {
  const all = rowsOf(d);
  const pages = Math.max(1, Math.ceil(all.length / 50));
  const p = Math.min(Math.max(1, page), pages);
  const comp = d.competition || {};
  const slug = typeof comp === 'string' ? comp : comp.slug || '';
  const title = comp.title || d.title || slug;
  const col = (d.columns || []).find(isRank(d.rank_key)) || { key: d.rank_key, title: 'Score' };
  document.title = 'Leaderboard: ' + title + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › <a href="${link(slug)}">${esc(title)}</a></p>
<h1>${esc(title)}</h1>${tabs(slug, all.length, true)}</div>
${pager(p, pages, all.length, slug)}
<table class=lb data-k=p${p}><thead><tr><th class=num>Rank</th><th>Entrant</th><th>Title</th>
<th class=num>${esc(col.title)}</th><th>Received</th></tr></thead>
<tbody>${all.slice((p - 1) * 50, p * 50).map(lbRow(col)).join('')}</tbody></table>
${pager(p, pages, all.length, slug).replace('data-k=pg', 'data-k=pg2')}`;
}

export function profile(u) {
  const r = u.record || {};
  const sol = u.solutions || [];
  document.title = (u.handle || 'Profile') + ' - Potboard (unofficial)';
  return `<div data-k=h><p class=crumb><a href="#/">Bounties</a> › Profile</p>
<h1><img class=av alt="" crossorigin=anonymous src="${esc(avatar(u))}">${esc(u.display_name || u.handle)}</h1>
<p class=meta>@${esc(u.handle)}</p></div>
<div class=tiles data-k=t>${tile('Entered', r.competitions_entered)}${tile('Placed', r.competitions_placed)}
${tile('Won', r.competitions_won)}${tile('Best place', r.best_placement)}${tile('Prize USD', money(r.prize_usd))}</div>
<div data-k=s><h2>Solutions (${sol.length})</h2><table><thead><tr><th>Bounty</th><th>Title</th><th class=num>Score</th>
<th>Entered</th></tr></thead><tbody>${sol.slice(0, 20).map(solRow).join('')}</tbody></table>
${sol.length > 20 ? '<p class=meta>Showing the first 20 of ' + sol.length + '.</p>' : ''}</div>`;
}

export function pager(p, n, t, s) {
  const base = link(s) + '/leaderboard/';
  const a = t ? (p - 1) * 50 + 1 : 0;
  const b = Math.min(t, p * 50);
  const prev = p > 1 ? '<a href="' + base + (p - 1) + '">Prev</a>' : 'Prev';
  const next = p < n ? '<a href="' + base + (p + 1) + '">Next</a>' : 'Next';
  return '<p class=pager data-k=pg>Rows ' + a + '-' + b + ' of ' + t.toLocaleString('en-US') + ' · Page '
    + p + ' of ' + n + ' · ' + prev + ' · ' + next + '</p>';
}

export function rewards(c) {
  const list = c.rewardsNow || [];
  let rows = '';
  for (let i = 0; i < list.length; i++) {
    let j = i;
    while (j + 1 < list.length && list[j + 1].amountUsd === list[i].amountUsd) j++;
    const x = list[i];
    const each = j > i ? ' each' : '';
    rows += '<tr><td data-l=Place>' + place(x.place) + (j > i ? '-' + place(list[j].place) : '') + '</td><td class=num data-l=Base>'
      + money(x.baseUsd) + each + '</td><td class=num data-l="Fee share">' + money(x.feeShareUsd) + each
      + '</td><td class=num data-l=Amount><b>' + money(x.amountUsd) + each + '</b></td></tr>';
    i = j;
  }
  return '<h2>Rewards</h2><table><thead><tr><th>Place</th><th class=num>Base</th><th class=num>Fee share</th>'
    + '<th class=num>Amount</th></tr></thead><tbody>' + rows + '<tr><td colspan=3><b>Total live pot</b></td>'
    + '<td class=num><b>' + money(c.potUsd) + '</b></td></tr></tbody></table>';
}

export function dates(c) {
  let li = '<li>Opens: ' + when(c.opensAt || c.publishedAt) + '</li><li>Deadline: ' + when(c.deadline) + '</li>';
  for (const ph of c.phases || []) {
    li += '<li><b>' + esc(ph.title) + '</b>: ' + when(ph.startsAt) + ' to ' + when(ph.endsAt) + '</li>';
  }
  return '<h2>Dates and phases</h2><ul>' + li + '</ul>';
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
  if (source && String(source).endsWith('_micro') && value != null) return (Number(value) / 10000).toFixed(2) + '%';
  return esc(display ?? value ?? '-');
}

function lbRow(col) {
  return (e) => {
    const full = e.values && typeof e.values === 'object';
    const v = full ? e.values[col.key] : e.value;
    const d = e.display && typeof e.display === 'object' ? e.display[col.key] : e.display;
    const house = e.house ? ' <span class="chip cx">house</span>' : '';
    return '<tr><td class="num r" data-l=Rank>' + esc(e.rank ?? '-') + '</td><td data-l=Entrant>' + who(e.handle) + house
      + '</td><td data-l=Title>' + esc(e.title || '') + '</td><td class="num s" data-l=Score>' + score(col.source, v, d)
      + '</td><td data-l=Received>' + when(e.received_at) + '</td></tr>';
  };
}

function solRow(s) {
  const c = s.competition || {};
  const sc = s.score || {};
  return '<tr><td data-l=Bounty><a href="' + link(c.slug || '') + '">' + esc(c.title || c.slug) + '</a></td><td data-l=Title>'
    + esc(s.title || '') + '</td><td class=num data-l=Score>' + score(sc.column && sc.column.source, sc.value, sc.display)
    + '</td><td data-l=Entered>' + when(s.entered_at || s.received_at) + '</td></tr>';
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
  return n + s;
}

function tabs(slug, n, lb) {
  const cur = ' aria-current=page';
  return '<nav class=tabs><a href="' + link(slug) + '"' + (lb ? '' : cur) + '>Overview</a><a href="' + link(slug)
    + '/leaderboard"' + (lb ? cur : '') + '>Leaderboard (' + Number(n).toLocaleString('en-US') + ')</a></nav>';
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

function when(iso) {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (!(t > 0)) return esc(iso);
  return '<time datetime=' + esc(iso) + '>' + new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC</time>';
}

function who(h) {
  return '<a href="#/u/' + encodeURIComponent(h) + '">' + esc(h) + '</a>';
}

const CSS = '.crumb{font-size:15px;margin:0 0 4px}'
  + '.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}'
  + '.facts div,.tiles div{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:8px 12px}'
  + '.facts div:first-child{background:#eef8f1}.facts div{padding:6px 10px}'
  + '.facts b{display:block;font-size:36px;line-height:1.15;white-space:nowrap}.facts small{display:block;font-size:14px}'
  + '.one{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0}'
  + '@media(min-width:641px){.lb{table-layout:fixed}.lb td,.lb th{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.lb th:nth-child(1){width:72px}.lb th:nth-child(2){width:24%}.lb th:nth-child(4){width:150px}'
  + '.lb th:nth-child(5){width:205px}.lb td:nth-child(5){font-size:15px}}'
  + '.lab{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#4b5563;font-weight:700}'
  + '.two{display:grid;gap:16px}@media(min-width:760px){.two{grid-template-columns:1fr 1fr}}'
  + 'table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d9dce3}'
  + 'th,td{padding:5px 10px;text-align:left}th{font-size:13px;text-transform:uppercase;color:#4b5563}'
  + 'tbody tr:nth-child(even){background:#f4f5f7}.num{text-align:right}'
  + '.tabs{display:flex;gap:16px;border-bottom:1px solid #d9dce3;margin:8px 0;font-size:17px}'
  + '.tabs a{padding:6px 2px;text-decoration:none}'
  + '.tabs [aria-current]{border-bottom:3px solid #3b2bd1;font-weight:700;color:#14171c}'
  + '.lb td,.lb th{font-size:18px;height:32px;padding:2px 10px}.lb th{font-size:15px}'
  + '.lb .r,.lb .s{font-size:20px;font-weight:700}.pager{font-size:20px;margin:8px 0}'
  + '.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.tiles b{display:block;font-size:26px}'
  + '.av{width:64px;height:64px;border-radius:50%;vertical-align:middle;margin-right:10px;background:#eceef2}'
  + '.md{background:#fff;border:1px solid #d9dce3;border-radius:8px;padding:6px 16px;overflow-wrap:anywhere}'
  + 'code{background:#f4f5f7;padding:0 4px;border-radius:4px}'
  + '@media(max-width:640px){.facts,.tiles{grid-template-columns:1fr 1fr}.facts b{font-size:26px}'
  + 'table,tbody,tr,td{display:block}thead{display:none}tr{border-bottom:1px solid #d9dce3;padding:4px 0}'
  + 'td::before{content:attr(data-l) ": ";color:#4b5563;font-size:13px;text-transform:uppercase}'
  + '.tabs a{display:grid;min-height:44px}}';

document.head.insertAdjacentHTML('beforeend', '<style>' + CSS + '</style>');
