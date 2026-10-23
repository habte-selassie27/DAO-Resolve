# Screenshots

These are real-mode captures from the production build (`npm run build && npm start`) reading
the deployed StudioNet contract through the `/api` proxy. No wallet was connected and mock
mode was off. They were taken on 2026-10-23.

| File | Page | What it shows |
|---|---|---|
| `overview-real.png` | `/` | Live counts, curated disputes, trust statement |
| `dispute-D1-real.png` | `/disputes/D1` | Deterministic assessment, `decided_by = Rule check`, closed challenge window |
| `dispute-D4-real.png` | `/disputes/D4` | Finalized consensus assessment, `Validator consensus` |
| `proposal-ENS-7.1-real.png` | `/proposals/ENS-7.1` | Recorder-ingested Snapshot events and process rail |

The automated equivalent is `cd frontend && npm run test:e2e:real`, which asserts the same
live pages. It is opt-in because the public Studio RPC is rate limited.
