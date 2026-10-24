# StudioNet Deployment Record

All data below was produced on 2026-10-20 against GenLayer StudioNet
(chain id `61999`, RPC `https://studio.genlayer.com/api`). Nothing here is
invented: every hash and address comes from real command output, and every
explorer link points at a transaction that was confirmed on chain.

## Official deployment (current source)

**Status: current.** The stored contract code at this address is byte-identical
to `contracts/dao_resolve.py` in this repository. This was checked, not assumed:
the code was downloaded through the JSON-RPC method `gen_getContractCode`,
base64-decoded, and hashed against the working file.

| Item | Value |
|---|---|
| Contract file | `contracts/dao_resolve.py` (1,463 lines) |
| Source SHA-256 | `8b5948bccdfcd6786bf89262e8e0fd6f31374df035a6ea725117c07e09eb1417` |
| Runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (v0.3.0-rc7) |
| Contract address | `0x151af6e00e1250Af44B8be1a14eb743C9613A41A` |
| Deploy transaction | `0xb138073ad159cd0e78070490d3d3d9e74ecab2e0ebcf62b5e92680661f29743d` |
| Deploy transaction status | `FINALIZED`, execution mode `NORMAL`, 5 validators, 0 rotations |
| Deploy timestamp | `2026-10-24` |
| Deployer / current owner | `0x5B3661C576c7001e6d6279C67F3779705d334c89` |
| Schema dump | `deployments/studionet.schema.txt` (242 lines: 12 read, 16 write methods) |
| Studio import link | https://studio.genlayer.com/?import-contract=0x151af6e00e1250Af44B8be1a14eb743C9613A41A |
| Explorer — contract | https://explorer-studio.genlayer.com/address/0x151af6e00e1250Af44B8be1a14eb743C9613A41A |
| Explorer — deploy tx | https://explorer-studio.genlayer.com/tx/0xb138073ad159cd0e78070490d3d3d9e74ecab2e0ebcf62b5e92680661f29743d |
| Stored code hash | identical to the row above (`8b5948bc…`) |

### Provenance check

```bash
ADDR=0x151af6e00e1250Af44B8be1a14eb743C9613A41A
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"gen_getContractCode\",\"params\":[\"$ADDR\"]}" \
  > /tmp/code.json

python3 - <<'PY'
import base64, hashlib, json, pathlib
src = base64.b64decode(json.load(open('/tmp/code.json'))['result']).decode()
local = pathlib.Path('contracts/dao_resolve.py').read_text()
print('identical:', src == local)
print('deployed sha256:', hashlib.sha256(src.encode()).hexdigest())
print('local    sha256:', hashlib.sha256(local.encode()).hexdigest())
PY
```

Result:

```text
identical: True
deployed sha256: 8b5948bccdfcd6786bf89262e8e0fd6f31374df035a6ea725117c07e09eb1417
local    sha256: 8b5948bccdfcd6786bf89262e8e0fd6f31374df035a6ea725117c07e09eb1417
```

Note on the Studio code panel: passing the address as a plain string to
`gen_getContractCode` succeeds, but Studio's own UI sends it wrapped in an
object (`[{"contractAddress": …}]`) and the node then fails with
`(psycopg2.ProgrammingError) can't adapt type 'dict'`. That error comes from the
Studio frontend/node parameter shape, not from this contract; the CLI and the
string-parameter RPC path both return the code normally. `Contract 0x… not
found` entries in the Studio log are simulation-mode deployments, which never
reach chain.

### Live method exercise (every public method)

On 2026-10-20 the owner account `0x5B3661C5…4c89` ran every read and write
method of `dao_resolve.py` against this deployment through the `genlayer` CLI.
All 16 write methods executed; two of them returned the intended `EXPECTED:`
rejections instead of mutating state, which is itself the behaviour under test.
Every hash below is from a real transaction on chain.

Rules and policy were exercised with a 60-second challenge window so that
finality could be observed inside the session. The window was restored to the
24-hour default afterwards.

| # | Method | Args | Result | Transaction |
|---|---|---|---|---|
| 1 | `set_config` | `60 3 false` | ACCEPTED | `0x2c5b8d094d2447f576015cb403a4c595614e40d4c256f360ce75507eb622d341` |
| 2 | `set_role` | `ESCALATOR <owner>` | ACCEPTED | `0x9be6f6318147aee53a1815da5b7b0f9475b8bfec59e43180d219f2210346c351` |
| 3 | `set_role` | `RECORDER <owner>` | ACCEPTED | `0x09e0b102e17a942c00c3a1039b37399510448cd20c5f46df0a13cf9dea1fd4ac` |
| 4 | `set_role` | `RULE_REGISTRAR <owner>` | ACCEPTED | `0xaf2aa22cfe20ec8b9eaccd765350c72c166b6fa514ba705fe0f2295b6447c5f2` |
| 5 | `set_category_vote_required` | `DISCLOSURE true` | ACCEPTED | `0x946af0b0557aa5b2cc429e54fd16769868c1f6dfe452c9230d3a4f07d0827edf` |
| 6 | `set_category_vote_required` | `DISCLOSURE false` | ACCEPTED | `0xd11783cb6d3805cca4ac00e9b58b3a3ad919cdbc1dc759b9fd51bb317fcccf7f` |
| 7 | `transfer_ownership` | `<owner>` (self) | ACCEPTED, owner unchanged | `0x59f4603119c1440ebb092d7100a8f2b638aa0acd115c5cdf7f9c93f8aa9345ca` |
| 8 | `register_rule` | `R1` TIMING, `MIN_ELAPSED` 100 | ACCEPTED | `0x2fbc83e486cf9b4d82855e9e35372f2c065e6eb1c11507ef3129c4eb21cb7538` |
| 9 | `register_rule` | `R2` PROCESS, `NEEDS_INTERPRETATION` | ACCEPTED | `0x7578b870c92948225f1a536d92c38682eaf83c1cc4cf8196975761706469aeb2` |
| 10 | `register_proposal` | `P1` | ACCEPTED | `0xddbcdaa585a4e41eb90d2ebd50f01d7085e1686afd820a5d640b20cc1a57a9e9` |
| 11 | `record_process_event` | `P1 e1 SUBMITTED 1000` | ACCEPTED | `0x2fd9d1c4c8e04d422f83a6c793262de1eb684404e7156410edb6a3e1588be246` |
| 12 | `record_process_event` | `P1 e2 VOTING_STARTED 1100` | ACCEPTED | `0x1150ffec1da21e565be690f13d698aa231d201552f3d622d6d1b9ed7b8452782` |
| 13 | `open_dispute` | `D1` on `R1` | ACCEPTED | `0x542cac8c5f3914dc2e8e1db14b5f3ebf52c61adc7316ba44aa65ea1255dc10e9` |
| 14 | `submit_evidence` | `D1` NEUTRAL statement | ACCEPTED | `0xcc4739a680520e838822cef9294cb346b9f8b004cc91155beee600d8aa510741` |
| 15 | `evaluate_dispute` | `D1` (deterministic) | ACCEPTED, `COMPLIANT` | `0xc7d52e1975f5c18a7385cce474186c57137ef9a664b9805adb77362b6b8a1834` |
| 16 | `challenge_assessment` | `D1`, no new evidence | ACCEPTED | `0xd3dbdc862582071ca02cd718790d7bd8b7c60b008514f1bc40c1c855bebcb88b` |
| 17 | `re_evaluate` | `D1` | ACCEPTED, appends `D1#a2` | `0x67ef2cfe50036f054d105e9aaf9afa30fa905afd8b7be56878b17350dbb55ba5` |
| 18 | `register_proposal` | `P2` | ACCEPTED | `0x120343c49aeab3183f7cc08703e3d63d82142b81975375d4e8c7bdf19aba6046` |
| 19 | `open_dispute` | `D2` on `R2` | ACCEPTED | `0xba14e251d7d2ce7bcbd75cb4c41bf38e401b7a60b3387961d0ba99c11fe61fa9` |
| 20 | `withdraw_dispute` | `D2` | ACCEPTED → `WITHDRAWN` | `0x3de9f275236aacd340ee90c8572085fcbaaf6558187d43799dcc0e3fabab97bc` |
| 21 | `register_proposal` | `P3` | ACCEPTED | `0x5bd3a982acc8f02e58166a915b567211a2ffabfa8a6bcf9bf0018299a958b330` |
| 22 | `open_dispute` | `D3` on `R2` | ACCEPTED | `0x2f288b6924781866667c0a9a1726137bc8f27e8da67c60e659ed8c045a7f9c06` |
| 23 | `escalate_dispute` | `D3` | ACCEPTED → `ESCALATED` | `0xd521f1b36b6b1eac8bf708a7273593e7ca68058f58c967c4fffeca50b51f9fdf` |
| 24 | `register_proposal` | `P4` | ACCEPTED | `0xb85c4773c4d794c58f52750a2cb3a41d281925b72af39ba59e8ccd3054ba11f1` |
| 25 | `open_dispute` | `D4` on `R2` | ACCEPTED | `0xd79f6731cc6c72ac531640b84e7882eed69eb2e44b2042f5a58d7a8d9b5654f0` |
| 26 | `submit_evidence` | `D4` DISPUTANT statement | ACCEPTED | `0xfe205e691d490882231af68a141a62b1db49c48e61c80661b83d48772b6c0e8e` |
| 27 | `submit_evidence` | `D4` RESPONDENT statement | ACCEPTED | `0xf049ddfe33bd40a204a5960761cf3831afa225dab5be8030cc536fe13cfd5388` |
| 28 | `evaluate_dispute` | `D4` (real consensus) | ACCEPTED, `INCONCLUSIVE` | `0x86235bceef53b366757de9d51bd4cec7adde8d36bd200a66ae799d3ccee88630` |
| 29 | `challenge_assessment` | `D4` + 1 new evidence item | ACCEPTED | `0x7c9bd79bde94561d37765b29d3bd9fcbc7562d5c841887fd8285a54ad4cb8243` |
| 30 | `re_evaluate` | `D4` (real consensus) | ACCEPTED, appends `D4#a2` | `0x11af57624fae1f870e2b1ae7d4b1c6a637d69b5d3f61b1217d88ef3e8e5d9ea9` |
| 31 | `set_category_vote_required` | `TIMING true` | ACCEPTED | `0xe779fd062674d14cf8355be2870f69b1b431109aa95b03b3fef04d795ac3fee6` |
| 32 | `register_proposal` | `P5` | ACCEPTED | `0xa92dfba4c19f3bacb35edd3941476ff3f2c58c132f7d86e5bb3481125a21de2d` |
| 33 | `open_dispute` | `D5` on `R1` (TIMING) | ACCEPTED | `0xc7beeadfdedf415520316e29ac1a8b235f6394c885490fdd75aafc9e62ddec11` |
| 34 | `evaluate_dispute` | `D5` (deterministic) | ACCEPTED, `VIOLATION` (`missing from_event=SUBMITTED`) | `0xdb3bb257d70c87c59377232f172bef7b6b81b1623b288047fa90fd50893675dd` |
| 35 | `finalize_dispute` | `D5` in a vote-required category | **blocked** — `EXPECTED: category requires escalation to the DAO procedure` | `0x9deb9ad4ecf46f27444c416de9c78998bae3efc236f7f57665e0c83ed98af9ec` |
| 36 | `escalate_dispute` | `D5` | ACCEPTED → `ESCALATED` | `0xf6c2a1574997537860cf515f7821fa2f7f50001ef8b4097345bad10ac59815f5` |
| 37 | `finalize_dispute` | `D4` after the window | ACCEPTED → `FINALIZED` | `0xcd0a14526d5733278b82a9fb7bebaf8a9fec8bda030372eeb17978c6b9f7e0fc` |
| 38 | `deprecate_rule` | `R1` | ACCEPTED → `DEPRECATED` | `0x45d3a27b5667d3fc809014d91d6b017c83bba710322f993dcef41986ea488966` |
| 39 | `open_dispute` | `D6` on deprecated `R1` | **blocked** — `EXPECTED: rule is deprecated` | `0x0ecb0d43efffafd00b23d64f5a78983a6d60b21b08fb51adc8c4fa7cfa122207` |
| 40 | `set_config` | `86400 3 false` (restore) | ACCEPTED | `0xd899a656996129a4dff62f6b87327cb2cbd0c0797a8b6664b2d61e8d4ecc5ac9` |
| 41 | `set_category_vote_required` | `TIMING false` (restore) | ACCEPTED | `0xca1d0eef154d8586ac2fd808dc8934c664d41dd1f87855f64c36b733e59b8f1a` |

A reverted write still produces an accepted transaction: `EXPECTED:` failures
are consensus-valid outcomes, and the state is unchanged. Rows 35 and 39 are
the two guards that were verified this way — the receipts carry
`result: { status: 'rollback', payload: 'EXPECTED: …' }`.

State machine as observed after the run:

| Dispute | Path | Final status |
|---|---|---|
| `D1` | open → evaluate → challenge → re-evaluate | `RE_EVALUATED` |
| `D2` | open → withdraw | `WITHDRAWN` |
| `D3` | open → escalate | `ESCALATED` |
| `D4` | open → evaluate → challenge → re-evaluate → finalize | `FINALIZED` |
| `D5` | open → evaluate → finalize (blocked) → escalate | `ESCALATED` |
| `D6` | open on a deprecated rule (blocked) | did not exist |

Resulting verdicts, read back from chain — note that both decision paths were
used, and the deterministic one never called the model:

```text
D1#a1  verdict=COMPLIANT     decided_by=DETERMINISTIC_CHECKS  produced_by=EVALUATION
D1#a2  verdict=COMPLIANT     decided_by=DETERMINISTIC_CHECKS  produced_by=RE_EVALUATION
D4#a1  verdict=INCONCLUSIVE  decided_by=INTERPRETATION        produced_by=EVALUATION
D4#a2  verdict=INCONCLUSIVE  decided_by=INTERPRETATION        produced_by=RE_EVALUATION
D5#a1  verdict=VIOLATION     decided_by=DETERMINISTIC_CHECKS  produced_by=EVALUATION
        detail: MIN_ELAPSED FAIL, missing from_event=SUBMITTED
```

`D4#a1` cited only the clause (`cited_evidence_ids: []`) and recorded
`web_digest: 'D4#e1=41:No forum thr;D4#e2=65:A forum thre'`; the re-evaluation
`D4#a2` cited `D4#e1`, `D4#e2` **and** the evidence added by the challenge
(`D4#e3`). The verdict stayed `INCONCLUSIVE` because two contradictory text
statements cannot establish that a discussion happened — the contract records
insufficiency rather than inventing support. Consensus was reached with no
retries in 29.2s (evaluate) and 23.6s (re-evaluate).

Read methods returning live data (all succeeded):

- `get_config` — policy and limits, restored to `challenge_window: 86400`,
  `max_challenge_rounds: 3`, `vote_required_categories: []`.
- `get_rule R1` / `get_rule_version R1 1` — `status: 'DEPRECATED'` after row 38,
  with the pinned `MIN_ELAPSED` check intact.
- `list_active_rules` — only `R2` remains active, because `R1` was deprecated.
- `get_proposal P1` — `event_count: 2`.
- `get_events P1` — both events with `recorded_by` and `timestamp_ref`.
- `get_dispute D4` — `status: 'FINALIZED'`, `final_assessment_id: 'D4#a2'`,
  `is_final: true`.
- `get_dispute_status` — returned every status in the table above.
- `get_evidence D4` — three items across two sides.
- `get_assessment_history D1 0 5` — two append-only assessments, `round: 0`
  then `round: 1`.
- `get_challenges D4 0 5` — one challenge, `new_evidence_count: 1`.
- `list_disputes 0 10` — all five disputes with their statuses.

### On-chain state

`genlayer call 0x151af6e00e1250Af44B8be1a14eb743C9613A41A get_config` after the
exercise: the policy is back at the 24-hour default, ownership is unchanged, and
`R1` is deprecated by design (deprecation is permanent — that is the point of
`deprecate_rule`). `R2` stays active for new disputes.

```text
{
  challenge_window: 86400,
  escalator: '0x5B3661C576c7001e6d6279C67F3779705d334c89',
  limits: {
    max_challenge_rounds: 10,
    max_checks_per_rule: 12,
    max_claim_len: 2000,
    max_clause_len: 2000,
    max_digest_len: 280,
    max_events_per_proposal: 128,
    max_evidence_per_dispute: 32,
    max_reason_len: 1000
  },
  max_challenge_rounds: 3,
  owner: '0x5B3661C576c7001e6d6279C67F3779705d334c89',
  recorder: '0x5B3661C576c7001e6d6279C67F3779705d334c89',
  rule_registrar: '0x5B3661C576c7001e6d6279C67F3779705d334c89',
  strict_separation: false,
  vote_required_categories: []
}
```

```text
genlayer call 0xb4d8bf96... list_active_rules --args 0 10  ->  [ R2 (PROCESS) ]
genlayer call 0xb4d8bf96... list_disputes     --args 0 10  ->  D1..D5
```

Not exercised on this address: a non-owner caller being rejected. The run used
one key (the owner), so every authorization failure would have needed a second
account; those paths are covered by `tests/direct/test_access_control.py`
instead. `transfer_ownership` was executed with the current owner as the new
owner, which exercises the write path and leaves control where it belongs; a
handoff to a *different* address was deliberately not performed, because it
would move control of this deployment irreversibly and only one key is held.

### Verify the deployment yourself

```bash
genlayer network set studionet
genlayer schema 0x151af6e00e1250Af44B8be1a14eb743C9613A41A
genlayer call   0x151af6e00e1250Af44B8be1a14eb743C9613A41A get_config
genlayer call   0x151af6e00e1250Af44B8be1a14eb743C9613A41A list_active_rules --args 0 10
gltest tests/integration/ -v -s --network studionet   # exercises the same source
```

## Integration evidence (current source, real consensus)

`gltest tests/integration/ -v -s --network studionet` -> **3 passed in
209.37s** on 2026-10-20, after the readable-citation support floor and the
`decided_by` field. A second full run on 2026-10-23, after the frontend and
hosting work and with the contract source unchanged, passed **3 tests in
261.76s**. These are throwaway test deployments, not the official address
above.

2026-10-23 rerun:

| Test | Contract address |
|---|---|
| Consensus + challenge round trip | `0x36a8364e5908aB59Fd3b228e47debca67B35B67F` |
| Deterministic end-to-end | `0x257cb6E8c4c4B76F1654f48216922fCE5C946833` |
| Invalid transition | `0xCc6a57397718A11916C9E36Cd30AC34E82C5482D` |

2026-10-20 run:

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
deterministic dispute `D1#a1` returned `decided_by: 'DETERMINISTIC_CHECKS'`
with `detail: 'elapsed=100 threshold=100'`. Consensus agreement under the
readability floor was reached without retries.

## Earlier instance `0xDD29Ae63…` (superseded)

This instance runs the source **before** the readable-citation floor and the
derived `decided_by` field. Its stored code does not match the current working
tree; the official deployment above does. It is kept here because its full write
flow is the receipt trail for the evaluation pipeline.

| Item | Value |
|---|---|
| Contract file at deploy time | `contracts/dao_resolve.py` (1,397 lines) |
| Contract address | `0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA` |
| Deploy transaction | `0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66` |
| Deploy receipt | `status: 7` (`FINALIZED`), `result_name: MAJORITY_AGREE` |
| Explorer — deploy tx | https://explorer-studio.genlayer.com/tx/0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66 |

### Write transactions

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

### Read calls

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
honestly instead of inventing support. This assessment predates `decided_by`,
which is why the field is absent here.

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

### Consensus evidence on that instance

`gltest tests/integration/ -v -s --network studionet` -> **3 passed in
209.37s** for the revision deployed there. Contracts deployed by the suite
during that run:

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

## 2026-10-23 update: fresh deploy, recorder role, live ENS ingestion

This section is newer than the records above and does not rewrite them. The demo address
`0xb4d8bf96…` is still the contract the frontend uses. Its `recorder` role was reassigned
so the recorder CLI could be exercised with a separate key. The historical config snippet
above shows the old recorder address; the current value is below.

### Fresh deployment of the pinned runner (smoke test)

The pinned runner in `contracts/dao_resolve.py` was redeployed from the current working
tree to prove the target network accepts it. This is a clean instance with no demo data.

| Item | Value |
|---|---|
| Contract address | `0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e` |
| Deploy transaction | `0xc500a18432b27137ff002628b939d01d5287fe8ac3785ea88dbdb1dd846dd2c9` |
| Receipt | `status_name: FINALIZED`, `result_name: MAJORITY_AGREE` |
| Lint | clean, 3 checks passed; 28 methods (12 read, 16 write) |
| Role setup | all four roles set to `0x5B3661C576c7001e6d6279C67F3779705d334c89` |
| View check | `npm run verify` -> config, empty active rules, empty disputes, all configured views passed |

Explorer: <https://explorer-studio.genlayer.com/address/0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e>

### Recorder role and live ENS ingestion

The demo contract's recorder was changed to a separate address so the recorder CLI could
submit with `RECORDER_PRIVATE_KEY` without using the owner key. No key is recorded here.

```text
Current config (2026-10-23):
  challenge_window: 86400
  max_challenge_rounds: 3
  strict_separation: false
  owner: 0x5B3661C576c7001e6d6279C67F3779705d334c89
  rule_registrar: 0x5B3661C576c7001e6d6279C67F3779705d334c89
  escalator: 0x5B3661C576c7001e6d6279C67F3779705d334c89
  recorder: 0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C
```

Public source: ENS Snapshot proposal
`0x943e585d1a4996525c5c7d229401d604ea56fe08c2c9c615c44f048ba42487b7`
(<https://snapshot.box/#/s:ens.eth/proposal/0x943e585d1a4996525c5c7d229401d604ea56fe08c2c9c615c44f048ba42487b7>).

The recorder mapped the public timestamps to contract proposal `ENS-7.1` (Snapshot ids are
66 characters; contract ids are capped at 64). The plan is
`recorder/logs/ENS-7.1.json`. It records the raw fields used and warns that voting events
use the Snapshot author as the actor.

| Event | Timestamp | Transaction |
|---|---|---|
| `submitted` (`SUBMITTED`) | `1783988115` | `0x9e3173c0114ebef2196d0bf29ffd796c1b361d21f12a31bc13e395698b72c511` |
| `voting-started` (`VOTING_STARTED`) | `1783988115` | `0x87dcb6daa4921d384b8a84633b09cfcd2d61629177608ecd98361a04f6f31294` |
| `voting-ended` (`VOTING_ENDED`) | `1784420115` | `0x67d42deff8f03b38cf15add158346ec65e409f7b37c967ee07356377a86320ec` |

Read-back: `get_proposal ENS-7.1` returns `event_count: 3`; `get_events ENS-7.1 0 50`
returns the three events. `npm run recorder -- verify recorder/logs/ENS-7.1.json` printed:
`Verified 3 events for proposal ENS-7.1.`

### Frontend real-mode read check

A production build was served by `frontend/server.js`, which proxies `/api` to StudioNet.
A headless Chromium run against the real contract rendered:

- overview metrics `2 / 3 / 4` (2 active rules, 3 in-progress disputes, 4 final/handoff);
- 7 recent dispute rows;
- `/disputes/D1` with status `RE_EVALUATED`, verdict `COMPLIANT`, `decided_by = Rule check`;
- `/disputes/D4` with the validator-consensus verdict and `Finalized record`;
- no page errors.

Captured pages (real reads, no wallet, no mock):
[docs/screenshots/overview-real.png](../docs/screenshots/overview-real.png),
[docs/screenshots/dispute-D1-real.png](../docs/screenshots/dispute-D1-real.png),
[docs/screenshots/dispute-D4-real.png](../docs/screenshots/dispute-D4-real.png),
[docs/screenshots/proposal-ENS-7.1-real.png](../docs/screenshots/proposal-ENS-7.1-real.png).

### Browser-wallet write smoke

A real write was exercised in Chromium against the fresh deployment
`0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e`. The page injected a temporary EIP-1193
provider that signed locally with the unlocked owner account; no key was placed in the
frontend, the repository, or the screenshot. This exercises the same
`genlayer-js` `account: address` + `provider` path the UI uses, but it is not a MetaMask
extension test.

| Item | Value |
|---|---|
| Method | `register_proposal` |
| Arguments | `E2E-BROWSER-2`, `https://forum.example.org/t/e2e-browser-write-2`, `Browser-wallet smoke write, second run` |
| Caller | `0x5B3661C576c7001e6d6279C67F3779705d334c89` |
| Transaction | `0x23cc5d6ea3d358bdbb5389353c9efd98bccbab987dc7520d77452ee361e6e2e4` |
| Status | `FINALIZED`; receipt status `7`; all five validator votes `agree` |
| Read-back | `get_proposal E2E-BROWSER-2` returned the same content and `created_by` |

The UI showed `Waiting for wallet → Submitted → Consensus → Accepted → Finalized` and the
contract read the proposal after the write. The run also exposed and fixed a UI defect: the
transaction tray kept the previous consensus status next to `Finalized`. The regression is
covered by the mock e2e assertion that the tray does not contain `PENDING` or `COMMITTING`
after finalization.

Screenshot: [docs/screenshots/browser-write-real.png](../docs/screenshots/browser-write-real.png).

### Hosted frontend

The frontend is live at <https://daoresolve.vercel.app>. It is a Vercel static production
build of `frontend/dist`; `frontend/vercel.json` serves the SPA and proxies `/api` to
StudioNet. The proxy is truly same-origin: the exact `/api` rewrite returns `200`, not
Studio's trailing-slash redirect. `/api` responses are marked `no-store` to avoid cached
JSON-RPC results.

| Item | Value |
|---|---|
| Live URL | <https://daoresolve.vercel.app> |
| Vercel project | `daoresolve` under `habteselassies-projects` |
| Production deployment | `dpl_8qjY9JbMahmDvZtKW5NBxZhPGhkT` (final build after contract behavior change) |
| Build | `npm run build` (Vite) |
| Proxy check | `POST /api` with `eth_chainId` -> `200`, `{"jsonrpc":"2.0","result":"0xf22f","id":1}` |
| Contract read | Hosted `/api` returned `owner`, `challenge_window`, and `recorder` from the demo contract |
| Browser check | Overview metrics `2 / 1 / 4`, 5 rows, no alerts; `D1` (`RE_EVALUATED`, compliant notice, zero violation notices), `D5` (`VIOLATION`, one violation notice, `missing from_event=SUBMITTED`), `D4` (`Finalized record`), and `ENS-7.1` (recorder events) all read successfully |
| Console | No page or console errors during the paced hosted read run |

Screenshots: [docs/screenshots/vercel-overview-real.png](../docs/screenshots/vercel-overview-real.png),
[docs/screenshots/vercel-dispute-D1-real.png](../docs/screenshots/vercel-dispute-D1-real.png), and
[docs/screenshots/vercel-dispute-D5-real.png](../docs/screenshots/vercel-dispute-D5-real.png).

The browser-write screenshot was taken from the Vite dev server pointed at the fresh
deployment. Preview Vercel deployments are protected by Vercel Authentication; the
production alias above is public. `frontend/server.js` remains the self-hosted equivalent
for a Node host.

### Schema

The deployed schema was saved in two places:

- `frontend/src/config/schema/dao_resolve.json` (28 methods)
- `deployments/studionet.schema.json` (same object)

The older `deployments/studionet.schema.txt` is retained for the historical record.
