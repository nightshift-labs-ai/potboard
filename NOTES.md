# NOTES (build session log)

## Done
- Session 1: starter + `.makefun/owner.json`; app/ is 3 files: index.html (CSS inline), app.js (first load),
  views.js (one `import('./views.js')` site); main.ts edits (a) exactly-3-screenshots gate, (b) one-line summary;
  shots via `shoot.mjs` (Playwright as a library); README with routes, how it works, how to run, honesty text.
- Session 2 (2026-11-15, 13:55-14:06 UTC):
  - README: the 3 live make.fun badges for nightshift-labs-ai/potboard (`/badge/makefun-frontend-01.svg`,
    `.../nightshift-labs-ai/potboard/rank.svg`, `.../reward.svg`), each linked to the bounty page; all 3 URLs
    answer 200 image/svg+xml. Badge format taken from the kit CLI's README check text.
  - First load 4,993 -> 4,921 B gzip-9: one-use helpers inlined (peek, sleep, minute, sort comparators),
    a single `:focus-visible` rule, one ready flag in `route()`. The error view now sets its own title.
  - Section 10, locally: two main.ts runs byte-identical; vendor sha 4c8da1c8; main.ts/vendor unchanged; no
    "Cut at 163840"; outline names unchanged; `node --check` ok; kit `check`: 4 passed, 0 failed (5 at submission).
  - Runtime (headless Chromium, 390x844, live data): 1 request per view; leaderboard page turn and cached board
    0 requests; unknown slug shows not-found + Retry; no horizontal scroll; footer honesty line on every view.

## Totals (latest)
Totals: first load 2 files, 4921 bytes gzip-9 (12602 raw); later by import() 1 file, 4416 bytes gzip-9;
whole app 3 files, 24832 bytes. Outline 1,221 of 1,248 B; names visible: ROUTES (board, bounty, leaderboard,
profile), api (Map cache + ETag revalidation), board (keyed rows, patched in place), views.js bounty,
leaderboard, profile, pager, rewards, dates.

## Next
- First load is still ~420 B over the 4.5 KB target (ceiling 6 KB). Micro-trims are used up (folding CSS lines
  saves only 11 B); the next step is structural, e.g. the rare 429-retry path or the mobile row CSS moving to
  views.js, and each must keep every feature.
- Sheet preview (section 8) in /tmp; a 60 s idle check that only text changes (tick).
- Profile payouts (shape not seen yet: the sampled profiles had `payouts: []`).
- Operator: push, make the repo public, GitHub About (homepage https://make.fun/bounty/makefun-frontend-01,
  topic makefun).

## Open issues
- Session 2 could not read the brief (reading the file was not permitted), so it worked from these notes, the
  kit and the session prompt. Operator: compare section 10 and section 1 against the brief.
- The "50 rows a page" outline comment was cut (brief cut order step 2) so `board` stays visible.
- make.fun's leaderboard endpoint answered 503 once (transient; it answered 200 seconds later). The app showed
  "Could not load from make.fun (HTTP 503). Retry".
- Local port 8080 is held by another process: serve with `node serve.ts --port 8091` and `BASE=...` for shots.
  Chromium here needs `LD_LIBRARY_PATH=/home/agent/tools/libroot/usr/lib/x86_64-linux-gnu`.
- The profile endpoint can take ~14 s (seen for one handle).
