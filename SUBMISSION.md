# DAOResolve

## What it does

DAOResolve is an advisory dispute-adjudication layer for DAOs. A DAO registers a
versioned, natural-language governance rule with structured checks, records proposal
process events with public source links, and opens a dispute when someone claims the
process did not comply. The contract runs deterministic checks first; only residual
ambiguity goes to GenLayer AI-validator consensus. Assessments are append-only,
challengeable, and can be escalated to the DAO's own procedure. The frontend calls the
deployed contract and shows the full transaction lifecycle.

## The problem it solves

DAO rules are prose. Questions such as "was the review period respected?" or "did the
community actually discuss this?" are usually settled by informal authority — the loudest
voice, the admin key, or whoever argues longest. A single LLM answer is not a fix: it can
be steered, is hard to audit, and is not reproducible.

DAOResolve makes the reasoning inspectable: the exact rule version, the recorded events,
the source links, the code checks, the validator decision, and the challenge history. It
does not execute, cancel, or reverse governance actions, and it does not penalize anyone.

## How to use it

For a DAO:

1. Assign the owner, rule registrar, recorder, and escalator roles. Use different accounts
   if role separation matters to you. The UI shows when they all point at one address.
2. Register a rule with a clause, category, interpretation mode, and optional structured
   checks. `DETERMINISTIC_ONLY` rules never call a model; `NEEDS_INTERPRETATION` rules use
   code checks first and consensus only for the remaining meaning.
3. Register proposals and record process events. Use the recorder CLI for public sources:
   `npm run recorder -- ingest snapshot <url> --proposal-id <id>`, inspect the plan, then
   `submit` and `verify`. The recorder never invents a timestamp and writes a reproducible
   log.
4. Open a dispute against a proposal and a pinned rule version. Add evidence with sources.
5. Request an assessment. A failed check forces `VIOLATION` in code. Otherwise validators
   fetch evidence live and compare verdict, confidence band, and readable citations.
6. Challenge inside the window with a reason and optional new evidence. A re-evaluation
   appends a new assessment; it does not overwrite history.
7. Finalize after the window, or escalate if the category is reserved for the DAO's own
   vote. Escalation records a handoff; it does not decide anything.

The frontend is at `frontend/`. `npm run dev` proxies the Studio API; `npm run build &&
npm start` serves the production build with the same proxy. Mock mode (`VITE_MOCK=1`) is
clearly labelled and never touches the network.

## What is real and what is trusted

**Real:**

- The contract is deployed on StudioNet and has 28 methods (12 read, 16 write).
- The recorder ingested a real ENS Snapshot proposal and submitted three events on chain.
  The plan, source URL, raw fields, and transaction hashes are in the repository.
- The frontend reads the deployed contract through a same-origin proxy. The opt-in
  real-mode Playwright suite passes 4/4 against StudioNet (overview totals, the D1
  deterministic path, the D4 consensus path, and the ENS-7.1 recorder events).
- The browser write path was exercised in Chromium with an injected EIP-1193 test
  provider. The owner address signed `register_proposal`; the UI showed submitted,
  consensus, and finalized states, and the contract returned the new proposal. The
  MetaMask extension UX itself is still untested.
- Contract lint is clean, 171 direct tests pass, 3 integration tests passed under real
  consensus, recorder typecheck and 8 recorder tests pass, frontend lint and 25 unit tests
  pass, and 10 mock-mode e2e tests pass.

**Trusted:**

- Process events are recorded by an authorized recorder and link to a public source. The
  contract does not independently prove the event happened.
- Evidence sides are self-declared. A label is not identity verification.
- Validators fetch evidence live, but the contract cannot prove that readable content is
  true. A wrong verdict shared by every validator remains possible.
- `web_digest` is leader-asserted and informational; validators do not compare it.
- Assessments are advisory, not legal rulings or enforcement.

## Links

- Repository: <https://github.com/habte-selassie27/DAO-Resolve>
- Live demo frontend: <https://daoresolve.vercel.app>
- Hosting: Vercel static build with a same-origin `/api` rewrite to StudioNet
  (`frontend/vercel.json`). `frontend/server.js` remains the self-hosted equivalent.
- Demo contract: [`0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb`](https://explorer-studio.genlayer.com/address/0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb)
- Deploy transaction: [`0xa99453271c7139fcdda8480e6050ae8bd623b55f9dc5020a755c610227cf146f`](https://explorer-studio.genlayer.com/tx/0xa99453271c7139fcdda8480e6050ae8bd623b55f9dc5020a755c610227cf146f)
- Fresh smoke deployment (current source, pinned runner): [`0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e`](https://explorer-studio.genlayer.com/address/0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e)
- Browser-wallet smoke write on the fresh deployment:
  [`register_proposal`](https://explorer-studio.genlayer.com/tx/0x23cc5d6ea3d358bdbb5389353c9efd98bccbab987dc7520d77452ee361e6e2e4)
- Recorder event transactions:
  [`submitted`](https://explorer-studio.genlayer.com/tx/0x9e3173c0114ebef2196d0bf29ffd796c1b361d21f12a31bc13e395698b72c511),
  [`voting-started`](https://explorer-studio.genlayer.com/tx/0x87dcb6daa4921d384b8a84633b09cfcd2d61629177608ecd98361a04f6f31294),
  [`voting-ended`](https://explorer-studio.genlayer.com/tx/0x67d42deff8f03b38cf15add158346ec65e409f7b37c967ee07356377a86320ec)
- Video: **none yet.**
- Public posts: **none yet.**

## Quality evidence

```text
genvm-lint check contracts/dao_resolve.py --json
{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"DAOResolve","methods":28,"view_methods":12,"write_methods":16}}

python3.12 -m pytest tests/direct/ -q
171 passed

gltest tests/integration/ -v -s --network studionet
3 passed in 261.76s

npm run typecheck
clean

npm run recorder:test
8 passed

cd frontend && npm run lint
clean

cd frontend && npm test
25 passed

cd frontend && npx playwright test
10 passed, 4 real-mode tests skipped

cd frontend && npm run test:e2e:real
4 passed

# hosted app, real reads
Playwright https://daoresolve.vercel.app (paced)
overview 2 / 3 / 4, 7 rows; D1 compliant, D5 violation, D4, ENS-7.1; no console errors

CONTRACT_ADDRESS=0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb npm run verify
18/18 configured views passed
```

Deployment records, receipts, and the schema are in `deployments/` and
`frontend/src/config/schema/`. Real-mode screenshots are in `docs/screenshots/`
(overview, D1, D5, D4, ENS-7.1, the browser-write smoke, and the hosted app).

## Limitations and roadmap

Limitations, stated rather than hidden:

- Evidence spam and self-declared sides are not fixed in the contract (F2). The UI labels
  sides as self-declared; the contract fix needs a failing test first.
- URL evidence uses the first 3000 characters of the raw body, so markup-heavy pages can
  hide readable text (F4). Deferred.
- A challenged dispute stays `CHALLENGED` until someone calls `re_evaluate` (F5). The UI
  exposes the permissionless action.
- The contract has no `list_proposals` view; the frontend reads configured ids and says so.
- The demo uses one account for owner, registrar, and escalator; the recorder is separate.
  The UI shows when roles point at the same address.
- Studio RPC requires a same-origin proxy for browser reads; the repo ships a Vercel
  rewrite, a Node server, and a Vite dev proxy. StudioNet allows 30 requests per minute,
  so rapid clicking can hit a retry notice; the hosted proxy shares Vercel egress.
- The genlayer-js wallet path was exercised with an injected EIP-1193 provider; the
  MetaMask extension UX was not. Bradbury deployment was not exercised: the one funded
  attempt (`0x04e0…db1b`, 9.93 GEN) was rejected with `gas limit too high`, and no later
  funded attempt was made. StudioNet is the demo network.

Roadmap:

1. Pilot with one real DAO, with permission, and write a case study.
2. Add rule templates and more public-source adapters.
3. Optional on-chain event verification: fetch the source, extract a fixed fact set, record
   an append-only verification, never mutate the event.
4. Read-only views for other DAO tooling.
5. Replace single-address roles with a DAO-controlled address.

## Pre-submission status

This is a complete working project, not a submission-ready marketing claim. The live
demo is hosted and verified; a MetaMask extension run, a demo video, and public posts are
still missing.
No submission slot should be spent until the checklist in `AGENTS.md` is fully true and the
user has confirmed every public link.
