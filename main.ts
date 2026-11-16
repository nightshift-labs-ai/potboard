// A working makefun-frontend-01 entry (Node 22, standard library only): the frontend is this directory's app/
// folder, plain static files a browser opens at app/index.html (ES modules, CSS, no build step), reading make.fun's
// public API at https://make.fun/api. The program hands it in: it copies app/ and screenshots/ from beside this file
// to /output and writes /output/dossier.json, the summary the judge reads (your screenshots, the first load's files
// and bytes, and your source), with the vendored make.fun library. Leave vendor/makefun-frontend.ts as it is: the
// scorer requires dossier.json to be byte for byte what its own copy writes.
//
// A starting point, not a winner: a plain board of open bounties and a page for each. Build your frontend in app/
// (a leaderboard, profiles, speed, ease of use), put 3 PNG or JPEG screenshots of it running on live data in
// screenshots/ (the first by name is the cover; shots.json says which views this starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to build unless screenshots/ holds exactly 3 images, counted as the gate counts them:
// regular files only, names starting with '.' skipped.
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir)
  ? readdirSync(shotDir, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith('.'))
  : [];
if (shots.length !== 3) {
  process.stderr.write(`main.ts: screenshots/ must hold exactly 3 images, found ${shots.length}\n`);
  process.exit(1);
}

// Pre-flight: every relative file the first load names must exist in app/, or the entry ships a broken page.
// index.html is scanned for <script src> and <link href>, app.js for import('./x') and from './x' specifiers.
// A reference leaving app/ (../x) counts as missing too, since only app/ is served.
const appDir = join(here, 'app');
const preflight = { 'index.html': tagRefs, 'app.js': moduleRefs };
const missing = [];
for (const [name, scan] of Object.entries(preflight)) {
  const file = join(appDir, name);
  if (!existsSync(file)) { missing.push(name + ' itself'); continue; }
  for (const ref of scan(readFileSync(file, 'utf8'))) {
    const path = localPath(ref);
    const full = resolve(appDir, path);
    const ok = full.startsWith(appDir + sep) && existsSync(full) && statSync(full).isFile();
    if (path && !ok) missing.push(name + ' -> ' + ref);
  }
}
if (missing.length) {
  process.stderr.write(`main.ts: app/ is missing referenced files: ${missing.join(', ')}\n`);
  process.exit(1);
}

// The src of each <script> tag and the href of each <link> tag in an HTML text, in order.
function tagRefs(html) {
  const refs = [];
  let at = html.indexOf('<');
  while (at !== -1) {
    const end = html.indexOf('>', at);
    if (end === -1) break;
    const tag = html.slice(at + 1, end);
    const kind = tag.split(/[\s/]/, 1)[0].toLowerCase();
    const want = kind === 'script' ? 'src' : kind === 'link' ? 'href' : '';
    const value = want ? attrValue(tag, want) : '';
    if (value) refs.push(value);
    at = html.indexOf('<', end);
  }
  return refs;
}

// One attribute's value inside a tag's text: "x", 'x' or unquoted x (up to whitespace); '' when absent.
function attrValue(tag, name) {
  const lower = tag.toLowerCase();
  for (let at = lower.indexOf(name); at !== -1; at = lower.indexOf(name, at + 1)) {
    if (!/\s/.test(lower[at - 1] || '')) continue;
    let i = at + name.length;
    while (/\s/.test(tag[i] || '')) i++;
    if (tag[i] !== '=') continue;
    i++;
    while (/\s/.test(tag[i] || '')) i++;
    const q = tag[i];
    if (q === '"' || q === "'") return tag.slice(i + 1, tag.indexOf(q, i + 1));
    let j = i;
    while (j < tag.length && !/\s/.test(tag[j])) j++;
    return tag.slice(i, j);
  }
  return '';
}

// Relative module specifiers in a JS text: import('./x') with a quoted literal, and from './x'.
function moduleRefs(js) {
  const refs = [];
  for (const lead of ['import(', 'from']) {
    for (let at = js.indexOf(lead); at !== -1; at = js.indexOf(lead, at + 1)) {
      if (/[\w$.]/.test(js[at - 1] || '')) continue;
      let i = at + lead.length;
      while (/\s/.test(js[i] || '')) i++;
      const q = js[i];
      if (q !== "'" && q !== '"') continue;
      const spec = js.slice(i + 1, js.indexOf(q, i + 1));
      if (spec.startsWith('./') || spec.startsWith('../')) refs.push(spec);
    }
  }
  return refs;
}

// The app/-relative path a reference names, or '' when it names no local file (#x, //host, https:, data:).
function localPath(ref) {
  const path = ref.split('#')[0].split('?')[0];
  if (!path || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)) return '';
  return path.startsWith('/') ? path.slice(1) : path;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 3 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);

// One-line summary of what was handed in (deterministic: no clock, no network).
const appFiles = readdirSync(join(out, 'app'), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length;
process.stdout.write(`main.ts: wrote ${join(out, 'dossier.json')} with ${appFiles} app files and ${shots.length} screenshots\n`);

// First-load weight: index.html + app.js as copied into the output, raw and gzip level 9 (each file compressed
// on its own, then summed). Same files, same bytes: no clock, no network.
const firstLoad = ['index.html', 'app.js'].map((name) => readFileSync(join(out, 'app', name)));
const rawSizes = firstLoad.map((b) => b.length);
const gzSizes = firstLoad.map((b) => gzipSync(b, { level: 9 }).length);
const sum = (list) => list.reduce((n, x) => n + x, 0);
process.stdout.write(`main.ts: first load index.html+app.js = ${thousands(sum(rawSizes))} B raw`
  + ` (${rawSizes.map(thousands).join(' + ')}), ${thousands(sum(gzSizes))} B gzip-9`
  + ` (${gzSizes.map(thousands).join(' + ')})\n`);

// A byte count with a comma every three digits (6012 -> 6,012), independent of the locale.
function thousands(n) {
  const digits = String(n);
  let text = '';
  for (let i = 0; i < digits.length; i++) text += (i && (digits.length - i) % 3 === 0 ? ',' : '') + digits[i];
  return text;
}
