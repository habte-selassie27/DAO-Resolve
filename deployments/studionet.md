# StudioNet Deployment Record

All data below was produced on 2026-10-20 against GenLayer StudioNet
(chain id `61999`, RPC `https://studio.genlayer.com/api`). Nothing here is
invented: every hash and address comes from real command output, and every
explorer link points at a transaction that was confirmed on chain.

This record covers the review-response revision that adds a bounded evidence
fingerprint (`web_digest`) to every assessment, together with the earlier
changes (disputant claim in the prompt, evidence citations for decisive
verdicts, pinned role addresses per rule version, hardened `MIN_ELAPSED`,
shared evidence support in consensus, and event-type counts in the prompt).

**Status:** superseded. The working tree now also enforces a readable-citation
support floor for decisive verdicts and exposes `decided_by` on every
assessment. The address below is still the latest confirmed StudioNet
deployment, but it runs the earlier source. Redeploy to make the on-chain code
match `contracts/dao_resolve.py` (1,463 lines), then update this record.

## Contract

| Item | Value |
|---|---|
| Contract file | `contracts/dao_resolve.py` (1,397 lines) |
| Runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (v0.3.0-rc7) |
| Contract address | `0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA` |
| Deploy transaction | `0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66` |
| Deploy receipt | `status: 7` (`FINALIZED`), `result_name: MAJORITY_AGREE` |
| Schema dump | `deployments/studionet.schema.txt` (242 lines, from `genlayer schema`) |
| Explorer — contract | https://explorer-studio.genlayer.com/address/0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA |
| Explorer — deploy tx | https://explorer-studio.genlayer.com/tx/0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66 |

## Write transactions

The flow uses a 60-second challenge window. Every listed transaction was
accepted with `result_name: MAJORITY_AGREE` and finalized on chain. The
`evidence_ref` argument is always non-empty: the `genlayer` CLI coerces an
empty string to integer `0`, which the contract rejects (see CLI note).

| Step | Method | Transaction |
|---|---|---|
| 1 | `set_config` (window 60, rounds 3) | `0xe4846fa485760e43cbc8f132bf8064898bada20d6f901bc8e789e8b3b63559ed` |
| 2 | `register_rule` R1 (TIMING, `MIN_ELAPSED` threshold 100) | `0x3c75bbe84e34e4d9b044018ffb71fef7ce4d64832c5287608b2e7ed0ed184c6c` |
| 3 | `register_proposal` P1 | `0xa159d48908a2b69597b0843f010fe856b8331bc8adda821458a9958262a95153` |
| 4 | `record_process_event` P1 e1 SUBMITTED | `0x1a85f79f44f46374fc49c29b24dda568ba42bc02caffc3c1af2bca68a3a178f6` |
| 5 | `record_process_event` P1 e2 VOTING_STARTED | `0x14f3a9455511ee8d50052c6e853cf6cfec9dd3c474dde1817d2d7d78a4eaa9a7` |
| 6 | `open_dispute` D1 (rule R1) | `0x562b1717d0f9a9cacec8584a8fd59392c142aa6283732355a73d48b94f7f340e` |
| 7 | `evaluate_dispute` D1 | `0x95817a39bb142ab1647c20ef002d7f4967a6315eca49628eb9e164cdf2110511` |
| 8 | `register_rule` R2 (PROCESS, `NEEDS_INTERPRETATION`) | `0xcedd689a847bf1c0daca9965237eb5b4411589f22faa219f12339615f018f1c8` |
| 9 | `register_proposal` P2 | `0xe969f9ce750b85cc1c3a1ab806f096ef9237e2500acfc4357eb4f0c969d44ea3` |
| 10 | `open_dispute` D2 (rule R2) | `0xe976a90e11b79b5083d9d6dc46601da58b7fc5542a0a46c850b60d7d03d464e6` |
| 11 | `submit_evidence` D2 (RESPONDENT, URL) | `0x3f3390489567ebf82048f19344ee44eaac853c3288eba7cde4bc2eacc17800b6` |
| 12 | `evaluate_dispute` D2 (real consensus) | `0x6fda8edc67b205ed000386764683133ead1eaf1539607859981af4e3c0e3a1a3` |
| 13 | `finalize_dispute` D1 (after the 60s window) | `0xd9554a01ff2ca96b369b48f84b65185329f1c7762a37815c26d8317fca4b6589` |

Each transaction is viewable at
`https://explorer-studio.genlayer.com/tx/<hash>`.

## Read calls

`genlayer call 0xDD29Ae63... get_dispute --args D1` after evaluation (trimmed):

```text
{
  dispute_id: 'D1',
  rule_id: 'R1',
  rule_version: 1,
  proposal_id: 'P1',
  status: 'EVALUATED',
  assessment_count: 1,
  challenge_count: 0,
  final_assessment_id: '',
  is_final: false,
  latest_assessment: {
    assessment_id: 'D1#a1',
    verdict: 'COMPLIANT',
    confidence_band: 'HIGH',
    web_digest: '',
    deterministic_results: [
      { check_id: 'review', detail: 'elapsed=100 threshold=100',
        kind: 'MIN_ELAPSED', result: 'PASS' }
    ]
  }
}
```

The deterministic path records an empty `web_digest`: no page was fetched.

`genlayer call 0xDD29Ae63... get_dispute --args D1` after finalization (trimmed):

```text
{
  dispute_id: 'D1',
  status: 'FINALIZED',
  final_assessment_id: 'D1#a1',
  is_final: true,
  latest_assessment: { assessment_id: 'D1#a1', verdict: 'COMPLIANT', is_final: true }
}
```

`genlayer call 0xDD29Ae63... get_assessment_history --args D2 0 5` (trimmed):

```text
[
  {
    assessment_id: 'D2#a1',
    verdict: 'INCONCLUSIVE',
    confidence_band: 'MEDIUM',
    cited_clause_ids: [ 'R2' ],
    cited_evidence_ids: [ 'D2#e1' ],
    web_digest: 'D2#e1=3012:&lt;!DOCTYPE ht',
    produced_by: 'EVALUATION'
  }
]
```

This is the evidence fingerprint working on a public network: the leader fetched
the URL, the page was 3,012 characters, and the stored fingerprint shows the
first 12 characters of what it read (HTML-escaped, so it can never break out of
a delimiter). The verdict is `INCONCLUSIVE` because a reference article is not
evidence of "adequate community discussion" — the contract records that
honestly instead of inventing support.

`genlayer call 0xDD29Ae63... get_config` (trimmed):

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
270.07s**. Contracts deployed by the suite during this run:

| Test | Contract address |
|---|---|
| Consensus + challenge round trip | `0xF6D4De16Feb59D33Aa43427E6d3d9B99F24A5897` |
| Deterministic end-to-end | `0x37400f3461323c2DC61EeFf8dbA4e5da1176E316` |
| Invalid transition | `0x181FAFAf647406f587B5b3aa7E5bdd92d106E628` |

Consensus transactions for the first contract (all `MAJORITY_AGREE`):

| Step | Transaction |
|---|---|
| `register_rule` R2 | `0x89a9686ef22e4499eb99d3fe5135ba960d769695c37addd47538f75272140488` |
| `evaluate_dispute` D2 | `0x868705cfc422398abc5728a578b20f3f3b23364ec6c8d04b2599769dccb1ac56` |
| `challenge_assessment` D2 | `0x984f8ab2123cd3d66376c95fb3d1b17a8ca4227a0c046d86460e207b9a25d5c8` |
| `re_evaluate` D2 | `0x5ba27af589ecb1933191b3102414669a165a540f00417d8646471fec705a1757` |

The real model produced `COMPLIANT` twice under real consensus. The first
assessment `D2#a1` cited `R2` and `D2#e1` with
`web_digest: 'D2#e1=189:The DAO foru'`; the re-evaluation `D2#a2` cited `R2`,
`D2#e1` and `D2#e2` with
`web_digest: 'D2#e1=189:The DAO foru;D2#e2=63:The author r'`. Both were
accepted with `MAJORITY_AGREE`, demonstrating the citation requirement and the
evidence fingerprint under real consensus.

### Re-run against the readable-citation revision (current working tree)

`gltest tests/integration/ -v -s --network studionet` -> **3 passed in
209.44s** on 2026-10-20, after the readable-citation support floor and the
`decided_by` field. These are test deployments of the current source, not the
canonical address above.

| Test | Contract address |
|---|---|
| Consensus + challenge round trip | `0xF5D7C589DbAA69C39D5638D83A136026B8421ad4` |
| Deterministic end-to-end | `0x32F69E7fd35e79cE994B5529fCC6635aC4255Fa2` |
| Invalid transition | `0x387bACbA091B92D8d1B14F4f9962014123B93086` |

| Step | Transaction |
|---|---|
| `register_rule` R2 | `0x16fa7e311e01062c3b84acd66edbb2786b196db7ec81eacc9c8bd6f614474d75` |
| `evaluate_dispute` D2 | `0xc86d0236f77e36d1be5ae372eb1e742642f6fbabd78f4c9b5368841ccf274080` |
| `challenge_assessment` D2 | `0x1e77f1a9a3589eb4c17eb173a3d8ec016411c04fdf7e7659ab4c196686571938` |
| `re_evaluate` D2 | `0xe558071b6e347ff08cf3ccc2ce2870cfb560339fbcdcc7c57a6c078e642c7635` |

All four were accepted with `MAJORITY_AGREE`. Read-back shows the new field on
chain: `D2#a1` and `D2#a2` returned `decided_by: 'INTERPRETATION'`, while the
deterministic dispute `D1#a1` returned
`decided_by: 'DETERMINISTIC_CHECKS'` with
`detail: 'elapsed=100 threshold=100'`. Consensus agreement under the readability
floor was reached without retries.

## Reproduction

```bash
GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json
pytest tests/direct/ -q
gltest tests/integration/ -v -s --network studionet
genlayer deploy --contract contracts/dao_resolve.py
genlayer schema 0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA
genlayer call 0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA get_config
genlayer call 0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA get_dispute --args D1
genlayer call 0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA get_assessment_history --args D2 0 5
```

## CLI note

The `genlayer` CLI converts an empty string argument to integer `0`. The
contract type hint is `str`, and a correctly encoded empty string is valid for
the optional `evidence_ref`; the CLI-specific coercion is not. Use a non-empty
reference such as `onchain:vote-start` when recording events through the CLI.
A failed attempt appends nothing.

## Previous revisions

Superseded StudioNet deployments of the same contract, kept here for
traceability. Their full write flows were recorded in earlier CHANGELOG
entries:

| Contract address | Deploy transaction |
|---|---|
| `0xbc0B3C5286e36162e7535480BAB9E0733D1aFFBd` | `0xcdd69d54388ca823fb4744111e9f84efee2c5314991bf08c5549b6227c1d97ab` |
| `0x48179D48495B7199a3FCb939c3f0F73a23c50b70` | `0x4889cd93bf8ce27b2107c11e474bfea3e06e44fa2f0d6d4ff8fd241a592c84ab` |
| `0xe036F8...` | superseded |
| `0x2dA2f6...` | superseded |
| `0x367369...` | superseded |
| `0x51Fec4...` | superseded |
