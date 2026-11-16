// Zero-dependency checks, run with `node check.mjs` (Node 22). app/views.js imports app/app.js, which touches the
// DOM when it loads, so instead of importing app code this spawns main.ts against throwaway copies of the entry in
// the OS temp dir: once intact, then with one broken reference at a time. Prints `check.mjs: N passed`; exits 1 on
// any failure. Nothing is written inside the repository.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = fileURLToPath(new URL('.', import.meta.url));
const temps = [];
let passed = 0;
let failed = 0;

function expect(cond, message) {
  if (cond) passed++;
  else { failed++; console.error('FAIL ' + message); }
}

// A fresh copy of what main.ts needs (main.ts, vendor/, app/, screenshots/), changed by `edit` before the run.
function entry(edit) {
  const dir = mkdtempSync(join(tmpdir(), 'potboard-check-'));
  temps.push(dir);
  for (const part of ['main.ts', 'vendor', 'app', 'screenshots']) cpSync(join(here, part), join(dir, part), { recursive: true });
  if (edit) edit(dir);
  return dir;
}

function build(dir) {
  const out = join(dir, 'out');
  const r = spawnSync(process.execPath, [join(dir, 'main.ts')], {
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, encoding: 'utf8', timeout: 240000,
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', dossier: existsSync(join(out, 'dossier.json')) };
}

function swap(dir, file, from, to) {
  const path = join(dir, 'app', file);
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error('check.mjs: ' + file + ' no longer contains ' + from);
  writeFileSync(path, text.replace(from, to));
}

try {
  // 1. The entry as it is: builds, and the summary line matches a gzip-9 count made here.
  const ok = build(entry());
  expect(ok.code === 0, 'intact entry should build, got exit ' + ok.code + ': ' + ok.stderr.trim());
  expect(ok.dossier, 'intact entry should write dossier.json');
  const files = ['index.html', 'app.js'].map((f) => readFileSync(join(here, 'app', f)));
  const gz = files.reduce((n, b) => n + gzipSync(b, { level: 9 }).length, 0);
  const raw = files.reduce((n, b) => n + b.length, 0);
  const line = ok.stdout.split('\n').find((l) => l.startsWith('main.ts: first load index.html+app.js = ')) || '';
  expect(line !== '', 'summary should print the first-load line');
  const digits = line.replace(/\([^)]*\)/g, '').match(/[\d,]+(?= B)/g) || [];
  const nums = digits.map((d) => Number(d.replaceAll(',', '')));
  expect(nums[0] === raw, 'raw first-load bytes should be ' + raw + ', line says ' + nums[0]);
  expect(nums[1] === gz, 'gzip-9 first-load bytes should be ' + gz + ', line says ' + nums[1]);
  expect(gz < 2300, 'first load should stay under 2,300 B gzip-9, is ' + gz);

  // 2. views.js gone: app.js's import('./views.js') has no file, so the build stops before writing anything.
  const noViews = build(entry((d) => rmSync(join(d, 'app', 'views.js'))));
  expect(noViews.code === 1, 'missing views.js should exit 1, got ' + noViews.code);
  expect(noViews.stderr.includes('app.js -> ./views.js'), 'stderr should name ./views.js: ' + noViews.stderr.trim());
  expect(!noViews.dossier, 'a refused build should write no dossier.json');

  // 3. index.html's script src pointing at a file that is not there.
  const badSrc = build(entry((d) => swap(d, 'index.html', 'src=app.js', 'src=gone.js')));
  expect(badSrc.code === 1 && badSrc.stderr.includes('index.html -> gone.js'), 'missing script src should be named');

  // 4. A link href to a missing local file is caught; one to another origin is not a file and passes.
  const badLink = build(entry((d) => swap(d, 'index.html', '</head>', '<link rel=stylesheet href="x.css">\n</head>')));
  expect(badLink.code === 1 && badLink.stderr.includes('index.html -> x.css'), 'missing link href should be named');
  const farLink = build(entry((d) => swap(d, 'index.html', '</head>', "<link rel=preconnect href='https://make.fun'>\n</head>")));
  expect(farLink.code === 0 && !farLink.stderr.includes('make.fun'), 'an https: link href should not be reported');

  // 5. A static import leaving app/ counts as missing, even when the file exists beside app/.
  const outside = build(entry((d) => {
    writeFileSync(join(d, 'outside.js'), 'export const x = 1;\n');
    swap(d, 'app.js', 'const ROUTES', "import { x } from '../outside.js';\nconst ROUTES");
  }));
  expect(outside.code === 1 && outside.stderr.includes('app.js -> ../outside.js'), 'a ../ import should be refused');
} finally {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
}

console.log('check.mjs: ' + passed + ' passed' + (failed ? ', ' + failed + ' failed' : ''));
process.exit(failed ? 1 : 0);
