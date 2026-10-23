# DAOResolve frontend

Vue 3 + Vite frontend for the deployed DAOResolve contract. It reads through
`genlayer-js` and signs writes in the user's browser wallet. No key is ever stored in the
frontend.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server proxies `/api` to StudioNet because the public RPC does not send browser
CORS headers. For a production-style local run:

```bash
npm run lint
npm test
npm run build
npm start
```

`npm start` serves `dist/` and the same `/api` proxy on port `4173` (override with `PORT`).
A static-only host needs an equivalent reverse proxy; otherwise browser reads fail with a
CORS error. `vercel.json` provides that proxy for the hosted deployment.

## Hosted deployment

Live: <https://daoresolve.vercel.app>

```bash
cd frontend
vercel deploy --prod
```

`vercel.json` does three things:

- rewrites exact `/api` to `https://studio.genlayer.com/api` (the exact rule avoids a
  trailing-slash redirect);
- rewrites other non-asset paths to `/index.html` for the Vue router;
- sets `no-store` headers on `/api` so JSON-RPC responses are not cached.

No secret is needed to build or host the frontend. Never add a private key to Vercel
environment variables or any `VITE_*` value.

## Configuration

Public values only, from `.env` or the shell:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_NETWORK` | `studionet` | `studionet`, `testnetBradbury`, or `localnet` |
| `VITE_CONTRACT_ADDRESS` | the StudioNet demo address | Deployed DAOResolve address |
| `VITE_STUDIO_URL` | `/api` | RPC endpoint or same-origin proxy path |
| `VITE_MOCK` | `0` | `1` uses fixtures and simulated transactions |
| `VITE_PROPOSAL_IDS` | `P1,P2,P3,P4,P5,ENS-7.1` | Ids to show; the contract has no `list_proposals` view |
| `VITE_DEMO_DISPUTES` | `D1,D4,D3` | Curated cases on the overview |

Never put a private key or seed phrase in a `VITE_*` value. Vite exposes them to the
browser bundle.

## Mock mode

```bash
VITE_MOCK=1 npm run dev
```

Mock mode uses fixtures copied from real StudioNet reads and simulates the transaction
lifecycle (`submitted → accepted → finalized`, plus failure). A persistent banner says
**Mock mode**, so a screenshot cannot be mistaken for a live run. E2E tests use this mode.

## Structure

```text
src/config/          network, contract address, saved schema, fixtures
src/lib/chain/       genlayer-js clients, reads, writes, tx lifecycle
src/lib/mock/        deterministic mock client
src/components/      shared UI, process rail, assessment panel, failure notice
src/screens/         overview, rules, proposals, disputes, admin, how it works
tests/unit/          Vitest component and formatting tests
tests/e2e/           Playwright mock-mode flows
server.js            static server + /api proxy for production-style hosting
vercel.json          hosted same-origin /api rewrite + SPA fallback
```

Components never import `genlayer-js`; all chain access is in `src/lib/chain/`.

## Trust rules the UI follows

- No optimistic updates. New state appears only after the chain confirms it.
- An accepted transaction is shown as provisional, not final.
- A failed or undetermined evaluation is a distinct state with retry, never a verdict.
- Evidence side labels are displayed as self-declared.
- `web_digest` is labelled informational, not proof.
- External links are restricted to `http:`/`https:` and opened with
  `rel="noopener noreferrer"`.
- Role actions are gated by the connected address and the contract remains the authority.

## Tests

```bash
npm run lint
npm test
npx playwright test            # mock mode, no network
npm run test:e2e:real          # deployed StudioNet reads through /api
```

The real suite is opt-in because StudioNet is rate limited. It asserts live totals, the
`D1` deterministic path, the `D4` consensus path, and the `ENS-7.1` recorder events.

Playwright needs a Chromium build. If the cached browser does not match the package, set
`PLAYWRIGHT_CHROMIUM_PATH` to an installed headless shell. CI installs the matching
browser.
