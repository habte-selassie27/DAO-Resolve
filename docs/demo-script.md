# Demo Script

A short walkthrough for a live demo, a screen recording, or a reviewer following the
README. It uses the deployed StudioNet contract and real data. Numbers can change if new
disputes are opened; read the screen, do not memorize counts.

## Setup

The hosted app is <https://daoresolve.vercel.app>; it reads the same StudioNet contract.
For a local run:

```bash
cd frontend
npm install
cp .env.example .env
npm run build
npm start
```

Open <http://127.0.0.1:4173>. The server proxies `/api` to StudioNet. No wallet is needed
for the read-only walkthrough. The app labels itself **read-only** until you connect.

Optional: a second terminal with `VITE_MOCK=1 npm run dev -- --port 4174` shows the full
transaction lifecycle without a wallet. The mock banner is visible, so the audience knows
which mode they are seeing.

## Shot 1 — The problem (20 seconds)

On `/`:

- Read the headline: **"Did the process hold?"**
- Point at the three cards: process record, code checks, interpretation.
- Read the footer line: advisory, never executes or reverses governance actions.
- Open **How it works** and show the honest trust statement. Do not skip the limits.

Expected copy: "Code first, consensus second."

## Shot 2 — A code-decided case (45 seconds)

Open `/disputes/D1`.

- Status: `RE_EVALUATED`; verdict: `COMPLIANT`; decision source: **Rule check**.
- The claim and the pinned rule `R1 v1`.
- The process rail shows `SUBMITTED` and `VOTING_STARTED` with their source links.
- The assessment shows the `MIN_ELAPSED` check result and `elapsed=100 threshold=100`.
- Assessment history has two entries: the challenge appended a round; the first record is
  still there.
- Note that no model was called: `decided_by = DETERMINISTIC_CHECKS`.
- The challenge window has closed. The **Finalize dispute** button is available. Do not
  click it during the demo unless you intend to make this record final.

Talking point: code decided this. A model could not override the threshold.

## Shot 3 — An interpretive case (60 seconds)

Open `/disputes/D4`.

- Status: `FINALIZED`; verdict: `INCONCLUSIVE`; decision source: **Validator consensus**.
- The finality banner says **Finalized record** and explains that it is the contract's
  advisory record, not a penalty.
- Evidence shows three items across two sides, each labelled **self-declared**.
- Assessment history shows two rounds. The re-evaluation cited the evidence added by the
  challenge.
- The reasoning digest is present but labelled **not compared across validators**.
- The web digest is labelled leader-asserted and informational.

Talking point: `INCONCLUSIVE` is a real verdict about insufficient evidence, not a system
failure. The contract records insufficiency instead of inventing support.

## Shot 4 — Escalation and the blocked finalize (30 seconds)

Open `/disputes/D3`.

- Status: `ESCALATED`. The banner says the DAO's own procedure takes over.
- The record shows who escalated and why.

Open `/disputes/D5`.

- It is `ESCALATED`. The record shows the deterministic assessment (`D5#a1`): `VIOLATION`,
  because `MIN_ELAPSED` failed with `missing from_event=SUBMITTED` (`P5` has no events).
  The escalation reason is: "TIMING category requires the DAO's own vote."
- The UI explains that terminal states accept no further actions. This is the result of the
  contract refusing to finalize a category the DAO reserved for its own vote.
- The current demo config no longer marks `TIMING` as vote-required (it was restored after
  the setup run), so this is a historical record. To reproduce the blocked-finalize path
  live, the owner would mark a category vote-required, open a new dispute in it, evaluate,
  and show that `Finalize dispute` is absent while escalation is available. Do not change
  config during a recorded demo unless that is the point of the segment.

Talking point: the contract refuses to pretend it can finalize a category the DAO reserves
for its own vote.

## Shot 5 — The recorder and a live public source (45 seconds)

Open `/proposals/ENS-7.1`.

- The proposal links to a real ENS Snapshot proposal.
- Three events: `SUBMITTED`, `VOTING_STARTED`, `VOTING_ENDED`, each with a source link and
  the recorder address that wrote it.
- Select a rule in **Preview a rule's checks** to show how the rail previews a check. The
  authoritative result appears in a dispute, not in the preview.

In a terminal:

```bash
npm run recorder -- ingest snapshot \
  'https://snapshot.box/#/s:ens.eth/proposal/0x943e585d1a4996525c5c7d229401d604ea56fe08c2c9c615c44f048ba42487b7' \
  --proposal-id ENS-7.1-demo
```

- It fetches the live Snapshot API, maps only events that have already happened, validates
  chronological order and addresses, and writes a plan under `recorder/logs/`.
- It sends nothing. This is a dry run.
- Open the plan and show `raw_fields_used`, `warnings`, and `fetched_at`.

Talking point: timestamps come from the public source, not from a human typing them. If
the source lacks a field, the event is skipped and the reason is recorded.

## Shot 6 — The transaction lifecycle (45 seconds, mock mode)

In `/disputes/D5` (or any `OPEN` dispute) in **mock mode**:

1. Click **Request assessment**.
2. The transaction tray shows `Preparing → Waiting for wallet → Submitted → Consensus in
   progress → Accepted → Finalized`.
3. The UI never shows the new state before finalization.
4. If the mock is configured to fail, the tray shows a distinct failure with the contract's
   error mapped to plain language, and the evaluation failure notice offers **Retry**.
   A failed evaluation is not shown in the verdict slot.

If a real wallet is available, do the same against StudioNet with a real write. Do not
claim accepted is final; wait for the badge.

## Shot 7 — Close (20 seconds)

- `/how-it-works`: the equivalence rule, the trust statement, the limits.
- Contract address and explorer link in the footer.
- State the next step: a pilot with one real DAO, with permission, and a written case study.

## Exact inputs used for the deployed demo

The existing demo data was created with the owner account and a 60-second challenge window
for `D1`–`D5`; the policy was restored to the 24-hour default afterward. `D4` was evaluated
and re-evaluated under real consensus. Full transaction hashes are in
[deployments/studionet.md](../deployments/studionet.md).

The recorder demo used:

```text
Source: https://snapshot.box/#/s:ens.eth/proposal/0x943e585d1a4996525c5c7d229401d604ea56fe08c2c9c615c44f048ba42487b7
Contract proposal id: ENS-7.1
Events: SUBMITTED 1783988115, VOTING_STARTED 1783988115, VOTING_ENDED 1784420115
Actor: 0x1D5460F896521aD685Ea4c3F2c679Ec0b6806359 (Snapshot proposal author)
```

The actor warning is intentional and visible: the author is the address the public source
gives us. Pass `--actor` to name a different governance actor.

## Recording checklist

- [ ] Use a clean browser profile; no wallet popups unless planned.
- [ ] Start on the Overview, not in the middle of a page.
- [ ] Do not finalize or challenge a record unless the demo intends to change it.
- [ ] Show a failure state, not only the happy path.
- [ ] Read the advisory and trust statements on camera.
- [ ] Cut any wait longer than ten seconds; keep the lifecycle labels visible.
- [ ] Never show a private key, seed phrase, or `.env` file.
