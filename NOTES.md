# Potboard implementation notes

Verified on 2026-11-17 against live public make.fun GET responses. Earlier implementation notes remain in Git
history. This revision preserves main.ts, the MIT license and the kit's vendor file.

## Current behavior

- Four hash routes: board, bounty overview, leaderboard, public profile. Profile URLs additionally accept a page
  number, e.g. `#/u/nightshift-labs/3`. Solutions are ordered by best placement and rendered 10 per page; all 29
  solutions returned for this account were reachable during verification. Leaderboards remain at 50 rows/page.
- Profiles show optional public bio and links, record totals, and up to three recent payouts with receipt links.
  Text is escaped, links accept only HTTP(S), and avatars use anonymous CORS.
- Cached board context stays beside bounty overviews and leaderboards from 1,100px wide. It also responds to
  resizing without navigation. Direct leaderboard URLs work without a board cache; their pot/prize context is
  omitted until that context is available, avoiding an extra request.
- Map caching, minute-aware browser ETag revalidation, in-flight deduplication, generation guards, retry/error
  handling and the existing bounded board cursor fetch remain. Pagination uses the already returned data.
- Keyed patching now reuses matching unchanged rows across insertions, removals and sorting. Board header keys
  are distinct from section heading keys. Controls retain focus after patching. Empty filters have a message.
- Navigation focuses the view heading (the solutions heading for profile page changes). Each history entry saves
  its scroll offset; back/forward restores it. Quiet minute refreshes do not reset focus or scroll.
- The footer keeps the public read-only/unofficial notice; implementation instructions were removed from the UI.

## Browser captures

All three files were captured directly by Playwright from the local static app reading live make.fun data.
No image editing, scaling, compositing or postprocessing was used. DPR is 1 throughout. Lower JPEG settings were
compared visually against quality 65/70 captures; the retained images remain readable and meet the size target.
The smaller cover still includes rewards and dates beside the live board. Profiles and leaderboards scroll;
their screenshots show the header, real data and pagination controls rather than the entirety of every list.

| File | Viewport | JPEG quality | Bytes |
|---|---:|---:|---:|
| screenshots/1-board-bounty.jpg | 1100 × 800 | 60 | 107378 |
| screenshots/2-leaderboard.jpg | 800 × 540 | 55 | 52907 |
| screenshots/3-profile.jpg | 800 × 800 | 60 | 65805 |

`shots.json` records the actual route, prior route where needed, DPR, quality, UTC capture time and file bytes.
`shoot.mjs` checks for browser errors, nonempty live views, loaded avatars and agreement between the selected
board row and bounty facts before capturing. It writes the manifest after a successful run.

## Validation and measured output

- `node --check app/app.js` and `node --check app/views.js`: passed.
- `node check.mjs`: 13 passed, including intact build, missing references and first-load byte accounting.
- `BASE=http://localhost:8187 PW_DIR=/home/agent/tools/pw node live-check.mjs`: 71 passed, 13 live API GET requests,
  no page or console errors. Exercises all four direct URLs, board search/category/sort, node retention, keyboard
  focus, both pagers, profile solutions after row 20, cached leaderboard context, back/forward, scroll restoration,
  expired-cache revalidation, in-flight deduplication, resize, profile search/entrant links, and no horizontal
  overflow at 390px on all four surfaces.
- Two independent `main.ts` builds in `/tmp/potboard-final-20261117-a` and `/tmp/potboard-final-20261117-b` compared
  equal with `cmp`. Dossier: **346651 bytes**, 47.5% below the prior accepted artifact's 660778 bytes.
- Dossier SHA-256: `f4d112a469800213082c9f16c427056c905d091a00743a113b42fb4be61ff222`.
- Load totals: first load 2 files, **2144 bytes gzip-9 / 4619 raw**; later import 1 file, **12175 bytes gzip-9**;
  whole app **3 files / 42737 bytes**. Total output directory file bytes: **615478**.
- Vendor SHA-256: `4c8da1c8e76490b3a847670f49137d3ec23953e3c988fe6a6cb320fce5739240`, identical to the current kit's
  `starter/vendor/makefun-frontend.ts`. main.ts is unchanged and still uses that vendor's buildDossier.

## Running locally and limits

Use Node 22. `node serve.ts --port 8187` serves only app/. Chromium in this environment needs
`LD_LIBRARY_PATH=/home/agent/tools/libroot/usr/lib/x86_64-linux-gnu`; Playwright is under
`PW_DIR=/home/agent/tools/pw`. `BASE=http://localhost:8187` selects the server for capture/check scripts.

Live values naturally change between captures. API availability and rate limits are external dependencies;
profiles can sometimes be slow. Profile solutions and leaderboard entries are returned by their single public
endpoint, then paginated in the browser; pagination bounds DOM rows rather than the endpoint's response size.
The board's existing cursor collector is capped at six pages. This revision was checked with 13 board items and
no next cursor. No server grading or rank improvement is claimed. No account, payment, submission, publishing
or remote Git action was performed in this session.
