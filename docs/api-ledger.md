# API Ledger

All entries are tied to a real command, a saved schema, or a test run. Dates are UTC.
If an item is not marked verified, shipped code does not guess it.

Environment on 2026-10-23:

- Node `v26.7.0`, npm `11.19.0`
- `genlayer` CLI `0.39.2`
- `genlayer-js` `1.1.8` (root scripts and frontend)
- Contract runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

## Contract surface

| Item | Status | Evidence |
|---|---|---|
| Deployed schema has 28 methods: 12 read, 16 write, 0 constructor params | VERIFIED | `genlayer schema 0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb`, saved to `frontend/src/config/schema/dao_resolve.json` and `deployments/studionet.schema.json` |
| `get_events(proposal_id, offset, limit)` rejects `limit > 50` with `EXPECTED: invalid page size` | VERIFIED | `genlayer call … get_events --args ENS-7.1 0 128` returned the error; fixed to page size 50 in frontend and recorder |
| `challenge_assessment(dispute_id, reason, new_evidence_json)` takes a JSON **string**, not an array | VERIFIED | Deployed schema; wrapper in `frontend/src/lib/chain/writes.js` stringifies |
| Write methods have no payable value | VERIFIED | Schema `payable: false`; genlayer-js writes pass `value: 0n` |
| Rules pin a role address at registration; callers pass a role name | VERIFIED | Contract source and direct tests |
| `list_proposals` does not exist | VERIFIED | Full schema has no such method; frontend reads configured ids and says so |
| Pinned runner is accepted by StudioNet | VERIFIED | Fresh deploy `0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e`, tx `0xc500a18432b27137ff002628b939d01d5287fe8ac3785ea88dbdb1dd846dd2c9`, `FINALIZED`, `MAJORITY_AGREE` |
| A newer runner exists | VERIFIED (lint notice) | `genvm-lint` I200 suggests `1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh`; not migrated because the pinned runner works |

## genlayer-js

| Item | Status | Evidence |
|---|---|---|
| `createClient({ chain, endpoint })` for reads | VERIFIED | `frontend/src/lib/chain/clients.js`; real reads in the opt-in e2e suite |
| `createClient({ chain, endpoint, account: address, provider })` for wallet writes | PARTIAL | Types and provider path inspected; no browser wallet in this environment. The recorder exercises real signed writes with a private-key account instead. |
| Chains exported: `localnet`, `studionet`, `testnetAsimov`, `testnetBradbury` | VERIFIED | `import('genlayer-js/chains')` printed those keys |
| `createAccount(privateKey)` | VERIFIED | Recorder `submit` signed three real StudioNet transactions |
| `client.readContract({ address, functionName, args })` | VERIFIED | Frontend real-mode reads; recorder `verify` |
| `client.writeContract({ address, functionName, args, value: 0n })` returns a hash | VERIFIED | Recorder submit hashes below |
| `client.waitForTransactionReceipt({ hash, status, retries, interval })` | VERIFIED | Recorder waits for `TransactionStatus.FINALIZED`; frontend polls accepted → finalized |
| `TransactionStatus` has `ACCEPTED` and `FINALIZED` | VERIFIED | `frontend/src/lib/chain/tx.js`; recorder `chain.ts`; real receipts |
| Receipt errors appear under `consensus_data.leader_receipt[].error` | VERIFIED | Frontend error extraction and recorder `receiptError`; transaction states observed on failed writes |
| Map return values need normalization | VERIFIED | `normalize()` in reads; real reads of nested config/dispute objects render correctly |
| Browser direct access to `https://studio.genlayer.com/api` is blocked by CORS | VERIFIED | Playwright console: `No 'Access-Control-Allow-Origin' header`; fixed with `/api` same-origin proxy |
| StudioNet rate limit is 30 requests per minute | VERIFIED | Rapid real-mode navigation returned `Rate limit exceeded: 30 requests per minute`; reads are cached and retried, UI maps the error |
| StudioNet endpoint is `https://studio.genlayer.com/api`, chain id `61999` | VERIFIED | Existing deployment record and `genlayer network` config |
| Browser wallet signing with MetaMask | NOT VERIFIED in this environment | No browser wallet available; code follows the provider pattern and fails with a plain message when absent. This is the main unverified integration surface. |
| Bradbury write path | NOT VERIFIED | Account has `0 GEN`; faucet is browser-based. StudioNet is the demo network. |
| `getTransaction({ hash })` | PARTIAL | Imported and used by `frontend/src/lib/chain/tx.js`; the mock lifecycle and type surface are exercised, but no real browser-wallet write ran here. Treat real write polling as unverified until a wallet run. |

## Recorder

| Item | Status | Evidence |
|---|---|---|
| Snapshot GraphQL `https://hub.snapshot.org/graphql` returns proposal fields `created`, `start`, `end`, `state`, `author`, `link`, `space` | VERIFIED | Live query for ENS proposal `0x943e…487b7`; fixture saved |
| Snapshot plan maps only events whose timestamp has passed | VERIFIED | Recorder tests and live ingest |
| Contract proposal ids are 1–64 chars; Snapshot ids are 66 chars | VERIFIED | Contract `_clean_id`; `--proposal-id ENS-7.1` mapping documented |
| Live ingest → submit → verify on StudioNet | VERIFIED | Plan `recorder/logs/ENS-7.1.json`; 3 events finalized and verified |
| No secret is written to the plan or log | VERIFIED | Recorder test checks the plan text; key is read only from `RECORDER_PRIVATE_KEY` |

Live recorder transactions:

| Event | Transaction |
|---|---|
| `submitted` | `0x9e3173c0114ebef2196d0bf29ffd796c1b361d21f12a31bc13e395698b72c511` |
| `voting-started` | `0x87dcb6daa4921d384b8a84633b09cfcd2d61629177608ecd98361a04f6f31294` |
| `voting-ended` | `0x67d42deff8f03b38cf15add158346ec65e409f7b37c967ee07356377a86320ec` |

## Frontend

| Item | Status | Evidence |
|---|---|---|
| Vue 3 + Vite + vue-router build | VERIFIED | `npm run build`; `dist/` |
| Mock mode uses fixtures and simulated lifecycle, never the network | VERIFIED | 10 Playwright tests with `VITE_MOCK=1` |
| Real mode reads the deployed contract through a same-origin proxy | VERIFIED | `npm run test:e2e:real` -> 4 passed (overview, D1, D4, ENS-7.1); earlier manual run rendered metrics `2 / 3 / 4`, 7 rows, no page errors |
| Full write lifecycle with a real wallet | NOT VERIFIED | No browser wallet in this environment. The UI code waits for accepted → finalized and never treats accepted as final. |
| Hosted frontend URL | NOT AVAILABLE | Not deployed in this session. `frontend/server.js` is the deployable server. |

## Sources

- GenLayer docs and SDK reference: <https://docs.genlayer.com/full-documentation.txt>,
  <https://sdk.genlayer.com/main/_static/ai/api.txt>
- genlayer-js README and installed package types: `frontend/node_modules/genlayer-js`
- Deployed schema: `frontend/src/config/schema/dao_resolve.json`
- Deployment and receipt evidence: `deployments/studionet.md`
