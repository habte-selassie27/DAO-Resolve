# Screenshots

The read-only captures come from the production build (`npm run build && npm start`) reading
the deployed StudioNet contract through the `/api` proxy. Mock mode was off and no wallet was
connected. The browser-write capture used the Vite dev server pointed at the fresh deployment,
with a temporary injected EIP-1193 provider signing the transaction. All were taken on
2026-10-23.

| File | Page | What it shows |
|---|---|---|
| `overview-real.png` | `/` | Live counts, curated disputes, trust statement |
| `dispute-D1-real.png` | `/disputes/D1` | Deterministic assessment, `decided_by = Rule check`, closed challenge window |
| `dispute-D4-real.png` | `/disputes/D4` | Finalized consensus assessment, `Validator consensus` |
| `proposal-ENS-7.1-real.png` | `/proposals/ENS-7.1` | Recorder-ingested Snapshot events and process rail |
| `browser-write-real.png` | `/proposals/E2E-BROWSER-2` | A real browser-signed write, finalized, with the transaction tray and the new proposal |
| `vercel-overview-real.png` | `https://daoresolve.vercel.app/` | The hosted app reading the live demo contract through Vercel's same-origin `/api` proxy |
| `vercel-dispute-D1-real.png` | `https://daoresolve.vercel.app/disputes/D1` | Hosted deterministic `COMPLIANT` assessment and closed challenge window |
| `vercel-dispute-D5-real.png` | `https://daoresolve.vercel.app/disputes/D5` | Hosted deterministic `VIOLATION`: failed `MIN_ELAPSED`, missing `SUBMITTED` event, then escalation |

The automated read equivalent is `cd frontend && npm run test:e2e:real`, which asserts the
same live pages. It is opt-in because the public Studio RPC is rate limited. The browser
write screenshot used a temporary injected EIP-1193 provider; the owner key was never in
the frontend, repo, or screenshot.
