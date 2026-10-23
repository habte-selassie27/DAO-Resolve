# Recorder

The recorder turns an authoritative public source into a reproducible DAOResolve event
plan, then submits and verifies it through the recorder account.

Implemented source: **Snapshot** (`https://hub.snapshot.org/graphql`). A Snapshot proposal
is public and gives four fields the contract needs: creation time (`created`), voting start
(`start`), voting end (`end`), and author address (`author`).

## Commands

```bash
npm install

# 1. Dry run: fetch the source, validate, write a plan. Sends nothing.
npm run recorder -- ingest snapshot \
  'https://snapshot.box/#/s:ens.eth/proposal/0x943e…' \
  --proposal-id ENS-7.1

# 2. Submit each planned event from the recorder key in the environment.
CONTRACT_ADDRESS=0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb \
RECORDER_PRIVATE_KEY=0x… \
npm run recorder -- submit recorder/logs/ENS-7.1.json

# 3. Read the contract back and compare every field.
CONTRACT_ADDRESS=0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb \
npm run recorder -- verify recorder/logs/ENS-7.1.json
```

Optional flags:

- `--actor 0x…` names the governance actor for `VOTING_STARTED` / `VOTING_ENDED`. Without
  it, the recorder uses the Snapshot proposal author and writes a visible warning.
- `--proposal-id ID` maps a long source id to a contract-safe id (1–64 chars, letters,
  digits, `-`, `_`, `.`, `:`). A raw Snapshot id is 66 chars, so this is required for
  Snapshot.
- `--network` / `GENLAYER_NETWORK`: `studionet` (default), `testnetBradbury`,
  `testnetAsimov`, `localnet`.
- `submit --dry-run` validates and prints without sending.
- `--json` prints the plan to stdout.
- `--out <file>` writes the plan somewhere other than `recorder/logs/`.

## What is in a plan

`recorder/logs/<proposal>.json` contains:

- `source`, `source_url`, `fetched_at`;
- `proposal.proposal_id`, title, space;
- `events[]` with `event_id`, `event_type`, `actor`, `timestamp_ref`, `evidence_ref`;
- `raw_fields_used` (the exact source fields used for the timestamps);
- `warnings[]` (future events omitted, actor defaulted, id mapping);
- `actor_basis` (`snapshot_author` or `override`).

It contains **no private key**.

## Validation

Before submit, the plan is checked against the contract's limits:

- event type is in the documented vocabulary;
- timestamp is an integer UNIX second, not in the future by more than one day;
- events are chronological;
- event ids are unique and non-empty;
- actor is a 20-byte hex address;
- `evidence_ref` is present and at most 512 characters;
- at most 128 events.

Source events are emitted only when their timestamp has already passed. A pending Snapshot
proposal therefore produces `SUBMITTED` only; it does not record a vote that has not
started. If a source lacks a field, the event is skipped and a warning is written.

## Submission behavior

Events are sent one at a time with `record_process_event` and the recorder waits for each
to finalize. On the first failure it stops, reports the contract error, and names the last
confirmed event. It never logs the private key. The recorder account must hold the
`RECORDER` role (or be the owner).

## Tests

```bash
npm run recorder:test
```

Covers:

- parsing Snapshot URLs and bare ids;
- mapping a closed proposal to chronological events;
- omitting events that have not happened yet;
- explicit actor override;
- mapping a long Snapshot id to a contract-safe proposal id;
- rejecting unsourced, non-chronological, invalid-actor events;
- dry run sends nothing and needs no key;
- plan round-trip with no private-key material.

## Live evidence

`recorder/logs/ENS-7.1.json` is a real live plan. Its three events were submitted and
verified on StudioNet; transaction hashes are in `deployments/studionet.md`.

## Adding a source

Add `src/sources/<name>.ts` that returns the same `Plan` shape and call it from
`src/cli.ts`. Keep the rule: a timestamp comes from the source or the event is skipped. Do
not infer a timestamp from a human-readable date unless the source gives one unambiguously.
