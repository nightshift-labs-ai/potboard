# NOTES (build session log)

## Done
- Session 1: starter + `.makefun/owner.json`; app/ is 3 files: index.html (CSS inline), app.js (first load),
  views.js (one `import('./views.js')` site); main.ts edits (a) exactly-3-screenshots gate, (b) one-line summary;
  shots via `shoot.mjs` (Playwright as a library); README with routes, how it works, how to run, honesty text.
- Session 2 (2026-11-15, 13:55-14:06 UTC): README badges; first load trimmed to 4,921 B; section 10 locally.
- Session 3 (2026-11-15, 15:46-16:00 UTC), the work list in the session prompt:
  - Cover = master-detail: from 1,100 px wide a bounty page shows the CACHED board in `<aside>` (body class `sp`,
    row `aria-current=page`, title kept). The slug's cached board item is replaced by the detail object first,
    so the highlighted row equals the facts band. The pane never fetches: `#/` -> bounty = exactly 1 request;
    a deep link at 1280 shows the bounty page alone.
  - Board rows: 'incl. $X fees' under the pot; 'Free' for no fee; the strip no longer repeats the time.
    Font stack -apple-system, 'Segoe UI', 'Ubuntu Sans', Ubuntu, sans-serif.
  - Bounty page: rewards with bare Base / '+$x' fee share, 'each' once, proportional bars; 'Dates' as 3 cells
    (Opened | Deadline | Results by) + one line per phase; short UTC dates; tab 'Leaderboard', button
    'Full leaderboard'. Whole page (rewards, dates, button) fits beside the board at 1280x800.
  - Leaderboard: # | Entrant (handle + title) | rank column title in full with the 90% interval (RULES: rate
    +/- 1.6449 SE) | Prize from the cached board item's rewardsNow[prize_rank - 1] (blank without a cached
    board). Pager: 'Development: provisional · Rows 1-50 of N ranked · Page 1 of M · Prev · Next'.
  - Profile: avatar + name + '@handle · joined 8 Nov'; 'Prizes' tile tinted; solutions best place first,
    Place | Bounty / solution | Score (thousands separators, '-' for null/n/a) | Prize.
  - Outline: `api` says '1 JSON endpoint a view'; `leaderboard(d, page = 1, item) { // 50 rows a page`;
    views.js exports via `export { bounty, leaderboard, profile };`.
  - The 429 wait moved to views.js (`later`, via the same loader); tested with a mocked 429.
  - New shots: 1-board-bounty.jpg (#/ -> bounty, 1280x800 @1), 2-leaderboard.jpg (#/ -> threejs-fps-02
    leaderboard, 800x500 @1.6), 3-profile.jpg (#/u/icantcodefyi, 800x500 @1.6). shoot.mjs supports `via`.
  - Checks: two main.ts runs identical; vendor sha 4c8da1c8; main.ts unchanged; import scan unchanged;
    node --check ok; grep row clean (only old false positives: content=, submissions=, r-eval-idation, the
    md link regex string); 390x844 no horizontal scroll on all 4 views; kit `check` 4 passed, 0 failed.
- Session 4 (2026-11-15, ~16:10-16:20 UTC), commit e142cdb (code + shots together):
  - Facts band: 'incl. $70 from 140 fees' (entryFeePayers; 140 x $0.50 = $70). Board rows show only the pot
    (incl() removed from app.js).
  - Leaderboard tab: 'Leaderboard (4,205 ranked of 5,946 entries)' from the cached board item's submissionCount
    (0 requests); it matches the three.js FPS row's ENTRIES on the cover taken in the same run.
  - Profile heading: '34 solutions in 28 bounties, best place first' (distinct solution competition slugs).
  - Bounty page: 'Enter on make.fun ↗' link button beside 'Full leaderboard' (same line at 1280x800).
  - left() counts from the minute floor, so 'updated 16:17' + 44h 13m = 17 Nov 12:30 exactly.
  - Outline comments: ROUTES '1 endpoint a view'; api 'Map cache + ETag revalidation + in-flight dedupe'
    (the inflight Map); board 'keyed rows patched in place: pot, fee, time left, entries'.

## Totals (latest)
Totals: first load 2 files, 5108 bytes gzip-9 (13173 raw); later by import() 1 file, 5875 bytes gzip-9;
whole app 3 files, 29971 bytes. Outline decls=14, 1,216 of 1,248 B; names visible: ROUTES (1 endpoint a view;
board, bounty, leaderboard, profile), api (Map cache + ETag revalidation + in-flight dedupe), board (keyed rows
patched in place: pot, fee, time left, entries), views.js bounty, leaderboard (50 rows a page), profile, pager,
rewards, dates.

## Next
- Re-take the 3 shots right before submitting (live figures move; the cover's highlighted row must equal its
  facts band; shoot.mjs compares the pot and entries of both and fails if they differ).
- Sheet preview: built at /tmp/fe01tools/sheet.jpg but not viewed (reading /tmp images was not permitted);
  view it and fix only what is unreadable.
- First load 5,148 B is ~650 B over the 4.5 KB target (ceiling 6 KB); whole app 29.5 KB raw is over the
  brief's 26 KB raw guide (views.js is lazy).
- Operator: push, make the repo public, GitHub About (homepage https://make.fun/bounty/makefun-frontend-01,
  topic makefun).

## Open issues
- Shot 3 (16:18Z): the ENTERED tile (record.competitions_entered) reads 29, but the solutions list spans 28
  distinct bounties (it was 28 = 28 at 16:1xZ). Both numbers are the API's own; the cause is unknown. Retake
  before submitting; if they still differ, decide on wording (do not adjust either number).
- The ROUTES line no longer lists the hash patterns (it says '1 endpoint a view'); the 4 member lines still
  name the views and endpoints.
- Keep the pane and the Prize column cache-only: the `api` comment ('1 JSON endpoint a view') is true only
  while they never fetch.
- The pane is decided at route time; resizing across 1,100 px applies on the next route or minute refresh.
- threejs-fps-02 rows from about rank 3,760 show '-' (the API gives no value for them); 'N ranked' counts all
  listed rows.
- Local port 8080 is held by another process: serve with `node serve.ts --port 8091` and `BASE=...` for shots.
  Chromium here needs `LD_LIBRARY_PATH=/home/agent/tools/libroot/usr/lib/x86_64-linux-gnu`.
- The profile endpoint can take 4-34 s; make.fun answered 503 once in session 2 (transient).
