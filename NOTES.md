# NOTES (build session log)

## Done
- Starter copied in, `.makefun/owner.json` added (wallet given in the prompt), first commit.
- Probe (headless Chromium on localhost, board fetched twice with `cache: 'no-cache'`):
  ETag readable from page JS (weak, `W/"…"`, same value both times: content-bound),
  `cache-control: no-cache`, **no OPTIONS request**. Whether the 2nd request carried
  If-None-Match is not visible through Playwright's page-level request headers: unconfirmed.
- robots.txt allows `/api/competitions` and `/api/profiles/` (all four endpoints).
- Local port 8080 is taken by another process: serve with `node serve.ts --port 8091`.
- Chromium needs `LD_LIBRARY_PATH=/home/agent/tools/libroot/usr/lib/x86_64-linux-gnu`.

## Next
- Brief section 9, steps 2-7.

## Totals
- (none yet)

## Open issues
- (none yet)
