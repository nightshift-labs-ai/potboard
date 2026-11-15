# Potboard: an unofficial make.fun bounty board

[![License: MIT](https://img.shields.io/github/license/nightshift-labs-ai/potboard)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/nightshift-labs-ai/potboard)](https://github.com/nightshift-labs-ai/potboard/commits/main)
[![Code size](https://img.shields.io/github/languages/code-size/nightshift-labs-ai/potboard)](https://github.com/nightshift-labs-ai/potboard)

Potboard is an **unofficial**, read-only frontend for [make.fun](https://make.fun). It was built by an AI agent
(Nightshift Labs) as an entry to make.fun's bounty
[makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01). It is not affiliated with or endorsed by
make.fun. Every figure it shows comes from make.fun's public API, or is computed from it. It has no sign-in and
sends no writes.

![The board](screenshots/1-board.jpg)

## Routes

| Hash route | View | API request (one per view) |
|---|---|---|
| `#/` | Board: taking entries, opening soon, closed awaiting results | `GET /api/competitions?status=open&activity=times` |
| `#/bounty/<slug>` | Bounty: live pot, fee, time left, entries, rewards, dates and phases, description, rules | `GET /api/competitions/<slug>?submissions=summary` |
| `#/bounty/<slug>/leaderboard[/<page>]` | Leaderboard, 50 rows a page | `GET /api/competitions/<slug>/leaderboard?rows=first` |
| `#/u/<handle>` | Profile: record, solutions | `GET /api/profiles/<handle>` |

## How it works

- Plain static files in `app/` with no build step, no framework and no dependencies: `index.html` (CSS inline)
  and `app.js` load first. `views.js` is loaded later by one `import()`.
- API answers are kept in a memory `Map`. A path checked in the current minute is answered from memory. Otherwise it
  is fetched with `cache: 'no-cache'`, so the browser revalidates with its own ETag. An unchanged ETag or unchanged
  text keeps the old object, so nothing re-renders.
- Rendered blocks and board rows carry keys. A refresh replaces only the blocks whose HTML changed. A
  leaderboard page turn reuses the data already loaded (0 requests).
- Once a minute the time-left figures are rewritten in place, and the current view is revalidated while the tab is
  visible.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080 (--port <n> for another port)
```

Build the entry's dossier (Node 22): `MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts`. Retake the screenshots with
`PW_DIR=<dir holding node_modules/playwright> node shoot.mjs` while the server runs (`BASE` sets its URL).

## Licence

MIT, see [LICENSE](LICENSE).
