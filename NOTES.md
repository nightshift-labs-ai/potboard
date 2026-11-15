# NOTES (build session log)

## Done (brief section 9, steps 1-7 in part)
- Starter copied in, `.makefun/owner.json` (wallet from the prompt), first commit.
- Probe (headless Chromium on localhost, board fetched twice with `cache: 'no-cache'`): ETag readable from
  page JS (weak `W/"…"`, same both times: content-bound), `cache-control: no-cache`, **no OPTIONS request**.
  Whether the 2nd request carried If-None-Match is not visible through Playwright's page-level headers: unconfirmed.
- app/ is 3 files: index.html (CSS inline), app.js (first load), views.js (one `import('./views.js')` site).
- main.ts edits: (a) exit 1 unless screenshots/ holds exactly 3 images; (b) one-line summary. Separate messages.
- Shots: `shoot.mjs` (Playwright as a library via PW_DIR), board 960x600@4/3, bounty and leaderboard 800x500@1.6.
- README with routes, how it works, how to run, honesty text.
- Section 10, run locally: two main.ts runs byte-identical; vendor sha 4c8da1c8; caps unchanged; no
  "Cut at 163840"; import scan clean (app.js dyn ['./views.js'] x1 call site, views.js static ['./app.js']);
  `node --check` ok; kit `check`: 4 passed, 0 failed (5 are checked at submission: push, public repo).
- Runtime (headless Chromium): 1 request per view; leaderboard page turn and cached board = 0 requests;
  threejs-fps-01 shows "Opening soon" (board) and "Opens 2026-11-16 17:00 UTC" (page); past-deadline
  bounties under "Closed"; unknown slug -> not-found + retry; 390x844 has no horizontal scroll on all 4 views.

## Totals (latest)
Totals: first load 2 files, 4993 bytes gzip-9 (12951 raw); later by import() 1 file, 4416 bytes gzip-9;
whole app 3 files, 25181 bytes. Outline 1,221 of 1,248 B; every required name visible.

## Next
- Trim the first load under the 4.5 KB target (now 4,993 B; ceiling 6 KB).
- Sheet preview (section 8) in /tmp; a 60 s idle check that only text changes (tick).
- Profile payouts (shape not seen yet: the sampled profiles had `payouts: []`).
- Operator: push, GitHub About (homepage https://make.fun/bounty/makefun-frontend-01, topic makefun).

## Open issues
- The "50 rows a page" outline comment was cut (brief cut order step 2) so `board` stays visible.
- README badges: brief section 12 was not in this session's brief; used license / last-commit / code-size
  shields for nightshift-labs-ai/potboard. Operator: check against section 12.
- A read-only review workflow was prepared but not run (it needed approval).
- Local port 8080 is held by another process: serve with `node serve.ts --port 8091` and `BASE=...` for shots.
  Chromium here needs `LD_LIBRARY_PATH=/home/agent/tools/libroot/usr/lib/x86_64-linux-gnu`.
- The profile endpoint can take ~14 s (seen for one handle).
