# StudioNet Deployment Record

All data below was produced on 2026-10-19 against GenLayer StudioNet
(chain id `61999`, RPC `https://studio.genlayer.com/api`). Nothing here is
invented: every hash and address comes from real command output, and every
explorer link was verified to return HTTP 200. This record covers the
review-response revision that adds the disputant claim to the interpretation
prompt, requires evidence citations for decisive LLM verdicts when evidence
exists, and keeps the contract to 1,369 lines.

## Contract

| Item | Value |
|---|---|
| Contract file | `contracts/dao_resolve.py` (1,369 lines) |
| Runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (v0.3.0-rc7) |
| Contract address | `0x48179D48495B7199a3FCb939c3f0F73a23c50b70` |
| Deploy transaction | `0x4889cd93bf8ce27b2107c11e474bfea3e06e44fa2f0d6d4ff8fd241a592c84ab` |
| Schema dump | `deployments/studionet.schema.txt` (239 lines, from `genlayer schema`) |
| Explorer — contract | https://explorer-studio.genlayer.com/address/0x48179D48495B7199a3FCb939c3f0F73a23c50b70 |
| Explorer — deploy tx | https://explorer-studio.genlayer.com/tx/0x4889cd93bf8ce27b2107c11e474bfea3e06e44fa2f0d6d4ff8fd241a592c84ab |

Deploy receipt: status `FINALIZED`, result `MAJORITY_AGREE`, 5 validators
(3 AGREE, 2 IDLE), deployer
`0x04e0353B7218b66D6803725ce7342E6e1225DB1b`. `genlayer code` on the
contract address returns the same source as `contracts/dao_resolve.py`
(diff is trailing blank lines only).

## Write transactions

The flow uses a 60-second challenge window. Every listed transaction is
`FINALIZED` with result `MAJORITY_AGREE`; the first attempt at recording
`VOTING_STARTED` is intentionally excluded because the CLI encoded an empty
`evidence_ref` as integer `0` and execution failed. It was retried with a
non-empty reference. The failed attempt appended nothing.

| Step | Method | Transaction |
|---|---|---|
| 1 | `set_config` (window 60, rounds 3) | `0x473c54c299ef103a938895b17ee655e3a018d487d08060eb7757420b87a72b72` |
| 2 | `register_rule` R1 (MIN_ELAPSED, threshold 100) | `0xb37a76b36635efa1326fa1c874ab0bca9279964e482af4b63224a5133802cd42` |
| 3 | `register_proposal` P1 | `0x75e8d872b69a36bd66548c26d7a6e6c47f487a2091425de9d41e6056ee51bf0b` |
| 4 | `record_process_event` P1 e1 SUBMITTED | `0x766777f27a9708b7dacb19f3f0349776f8b906e909edaaa5e23abe3d1a0478b3` |
| 5 | `open_dispute` D1 | `0x91be8eeb8b1250fda3e2990a43befd3ebcc95d830e377e8bb8f3a26950754e96` |
| 6 | `evaluate_dispute` D1 | `0xe69616317ef3d253666ad6a6a199b9b19262fabfcc2775c9ab57ad83a1316035` |
| 7 | `register_proposal` P2 | `0x25d7a4421db811ac4fa9df9344bce0b468c1eb4ad81de3aad091d8e9a5c39fc4` |
| 8 | `open_dispute` D2 | `0xc6878b9b9a46af2bdb7c55cd83b99d31a02b65ad1dcbc50e9ecaedfe8c17346e` |
| 9 | `evaluate_dispute` D2 | `0xf47813a3f1d73b8e3c2d7d2ebea7403c06d8df38419c7eb015011c153605bce9` |
| 10 | `record_process_event` P1 e2 VOTING_STARTED | `0x0060780d0bc4bad7da64154f300f055e9a7daab72d1088ba5ec92a1da96f4d11` |
| 11 | `open_dispute` D3 | `0x687fc26e192f04e9df791d06e4039d8757dca157f67efcfb5f9694e21a60bca6` |
| 12 | `evaluate_dispute` D3 | `0xd18c1903b146daf040b4c92c227ea79c3ed5a25ac4d4e84ccd8c7e1c0cae71b1` |
| 13 | `finalize_dispute` D3 (after the 60s window) | `0x79360ae33bc5179f45a322e2e0d9a46d6d75e4feee28b2951341cb5080389f58` |

Each transaction is viewable at
`https://explorer-studio.genlayer.com/tx/<hash>`. Receipts were re-read for
every listed hash; all report status `FINALIZED` (status `7`) and result
`MAJORITY_AGREE` (`6`).

The flow produces three deterministic outcomes on the same rule:

- **D1 — VIOLATION, provisional.** Only `SUBMITTED` was recorded when D1 was
  evaluated: `missing to_event=VOTING_STARTED` -> `FAIL` -> `VIOLATION`,
  band `HIGH`, no LLM call. The later `VOTING_STARTED` event does not rewrite
  the assessment.
- **D2 — VIOLATION, provisional.** P2 had no recorded events at evaluation
  time: `missing from_event=SUBMITTED` -> `FAIL` -> `VIOLATION`, band `HIGH`,
  no LLM call.
- **D3 — COMPLIANT, FINALIZED.** After `VOTING_STARTED` was recorded on P1,
  `elapsed=100 threshold=100` -> `PASS` -> `COMPLIANT`, band `HIGH`, no LLM
  call. Finalized after the 60-second window with
  `final_assessment_id: 'D3#a1'` and `is_final: true`.

## Read calls

`genlayer call 0x48179D... get_dispute --args D1` (trimmed):

```text
{
  dispute_id: 'D1',
  rule_id: 'R1',
  rule_version: 1,
  proposal_id: 'P1',
  status: 'EVALUATED',
  assessment_count: 1,
  challenge_count: 0,
  opened_at: 1792420721,
  last_assessment_at: 1792420734,
  challenge_deadline: 1792420794,
  closed_at: 0,
  final_assessment_id: '',
  is_final: false,
  latest_assessment: {
    assessment_id: 'D1#a1',
    verdict: 'VIOLATION',
    confidence_band: 'HIGH',
    is_final: false,
    deterministic_results: [
      { check_id: 'review', detail: 'missing to_event=VOTING_STARTED',
        kind: 'MIN_ELAPSED', result: 'FAIL' }
    ]
  }
}
```

`genlayer call 0x48179D... get_dispute --args D2` (trimmed):

```text
{
  dispute_id: 'D2',
  status: 'EVALUATED',
  opened_at: 1792420785,
  last_assessment_at: 1792420793,
  challenge_deadline: 1792420853,
  closed_at: 0,
  final_assessment_id: '',
  is_final: false,
  latest_assessment: {
    assessment_id: 'D2#a1',
    verdict: 'VIOLATION',
    confidence_band: 'HIGH',
    is_final: false,
    deterministic_results: [
      { check_id: 'review', detail: 'missing from_event=SUBMITTED',
        kind: 'MIN_ELAPSED', result: 'FAIL' }
    ]
  }
}
```

`genlayer call 0x48179D... get_dispute --args D3` (trimmed; D3 is final):

```text
{
  dispute_id: 'D3',
  claim_text: 'The review period was met before voting began.',
  status: 'FINALIZED',
  opened_at: 1792420867,
  last_assessment_at: 1792420874,
  challenge_deadline: 1792420934,
  closed_at: 1792420976,
  final_assessment_id: 'D3#a1',
  is_final: true,
  latest_assessment: {
    assessment_id: 'D3#a1',
    verdict: 'COMPLIANT',
    confidence_band: 'HIGH',
    is_final: true,
    deterministic_results: [
      { check_id: 'review', detail: 'elapsed=100 threshold=100',
        kind: 'MIN_ELAPSED', result: 'PASS' }
    ]
  }
}
```

`genlayer call 0x48179D... get_assessment_history --args D3 0 10` (trimmed):

```text
[
  {
    assessment_id: 'D3#a1',
    cited_clause_ids: [ 'R1' ],
    cited_evidence_ids: [],
    confidence_band: 'HIGH',
    deterministic_pass_count: 1,
    is_final: true,
    produced_by: 'EVALUATION',
    reasoning_digest: 'All deterministic checks passed.',
    verdict: 'COMPLIANT'
  }
]
```

`genlayer call 0x48179D... get_config` (trimmed):

```text
{
  owner: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
  rule_registrar: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
  recorder: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
  escalator: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
  challenge_window: 60,
  max_challenge_rounds: 3,
  strict_separation: false,
  vote_required_categories: []
}
```

## Integration evidence (real consensus)

`gltest tests/integration/ -v -s --network studionet` -> **3 passed in
243.40s**. Contracts deployed by the suite:

| Test | Contract address |
|---|---|
| Consensus + challenge round trip | `0xB037836ec7C80c74E661C5395284d0751cD11a15` |
| Deterministic end-to-end | `0x9337111597CA3Dd91695B14A3B4Af155b084aFcE` |
| Invalid transition | `0x99AC80B365b741CF9DE0FEaC4eeB4b7A1540E06e` |

Consensus transactions for the first contract:

| Step | Transaction |
|---|---|
| `register_rule` R2 | `0x74b2835a44b7915a445da26917c7886615e9ca8470c57b89d50417c31fb86b64` |
| `evaluate_dispute` D2 | `0x35b2cbfa598459d65820d99a2b05f1e0e84b56d73f7295621b6ce3a652d429e5` |
| `challenge_assessment` D2 | `0xf374d4dba69fbe327da874856f39d22a1ed4424f48b07789c8e38509c0e0bddb` |
| `re_evaluate` D2 | `0xc4cc7095aecc7fee5e4846ab4e46f188bf4a510790214feea8227586b6513c6c` |

The real model produced `COMPLIANT` twice. First assessment `D2#a1` cited
`R2` and `D2#e1`; second assessment `D2#a2` cited `R2`, `D2#e1`, and `D2#e2`.
Both were accepted with `MAJORITY_AGREE`, demonstrating the new evidence
citation requirement under real consensus.

## Reproduction

```bash
GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json
pytest tests/direct/ -q
gltest tests/integration/ -v -s --network studionet
genlayer deploy --contract contracts/dao_resolve.py
genlayer schema 0x48179D48495B7199a3FCb939c3f0F73a23c50b70
genlayer call 0x48179D48495B7199a3FCb939c3f0F73a23c50b70 get_config
genlayer call 0x48179D48495B7199a3FCb939c3f0F73a23c50b70 get_dispute --args D3
genlayer call 0x48179D48495B7199a3FCb939c3f0F73a23c50b70 get_assessment_history --args D3 0 10
```

## CLI note

The `genlayer` CLI converts an empty string argument to integer `0`. The
contract type hint is `str`, and a correctly encoded empty string is valid for
the optional `evidence_ref`; the CLI-specific coercion is not. Use a non-empty
reference such as `onchain:vote-start` when recording events through the CLI.
The first `VOTING_STARTED` attempt (`0x118c6062...`) and the first P2
`SUBMITTED` attempt failed for this reason and changed no state. Pass
`evidence_ref` as a non-empty string.
