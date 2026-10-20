# Testing Strategy

## Current results

| Gate | Result |
|---|---|
| `genvm-lint` | Clean; 3 checks passed. One informational notice about a newer runner |
| Direct tests | **171 passed** |
| Integration tests | **3 passed in 209.44s on StudioNet** for the current source, and 3 passed in 270.07s for the earlier deployed revision; see `deployments/studionet.md` |

Commands used:

```bash
GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json
python3.12 -m pytest tests/direct/ -q
gltest tests/integration/ -v -s --network studionet
```

The integration result is recorded from the deployment session. Re-run it before
claiming a fresh consensus result.

## Direct tests

Fast in-memory tests with mocked web and LLM calls:

```bash
pytest tests/direct/ -v
```

### Files and coverage

| File | Coverage |
|---|---|
| `test_rules.py` | Rule registration, versions, deprecation, bounds, checks |
| `test_disputes.py` | Proposals, events, disputes, evidence, withdrawal |
| `test_access_control.py` | Roles, strict separation, ownership, config bounds |
| `test_evaluation.py` | Deterministic checks, LLM usage, hostile evidence, history |
| `test_evaluation_parsing.py` | JSON parsing, aliases, citations, deterministic override |
| `test_challenges.py` | Challenge windows, rounds, re-evaluation, escalation, finality |
| `test_equivalence_helpers.py` | Verdict/band equivalence, citation overlap, error agreement |
| `test_web_evidence.py` | URL fetching, unavailable evidence, prompt escaping, error prefixes, evidence fingerprint, page drift |

### Highlights

- `MIN_ELAPSED` passes and fails at the exact boundary.
- `REQUIRED_EVENT`, `MIN_COUNT`, and `REQUIRED_ROLE` are covered.
- A `DETERMINISTIC_ONLY` rule never invokes the LLM (mock not called).
- A failed check skips the LLM even for an interpretive rule.
- Valid and invalid state transitions are covered.
- Challenges at the exact deadline are rejected; finalization at the exact
  deadline is allowed.
- Hostile evidence ("ignore previous instructions") cannot change a
  deterministic `FAIL`.
- LLM errors leave the dispute unchanged.
- A failed consensus stores nothing, leaves the dispute open, and a retry
  succeeds.
- A decisive verdict with no submitted evidence may cite only the rule; with
  evidence present, leader and validator must share a cited evidence id that
  both runs could read.
- A decisive verdict citing only an unreadable source fails with
  `LLM_ERROR: decisive verdict cites no readable evidence` and stores nothing;
  `INCONCLUSIVE` is exempt.
- `decided_by` reports `DETERMINISTIC_CHECKS` or `INTERPRETATION`, so a failed
  configured check is distinguishable from a model finding.
- Challenge effects: no reason and no evidence is rejected; irrelevant evidence
  does not move a deterministic verdict; contradictory evidence can end
  `INCONCLUSIVE`; a persuasive correction can flip the verdict.
- Page drift between the leader's fetch and the validator's re-fetch: the same
  verdict still reaches consensus, a changed verdict is rejected.
- Errors use stable prefixes and contain no raw model text.

## Integration tests

Real consensus tests on StudioNet:

```bash
gltest tests/integration/ -v -s --network studionet
```

Coverage:

- Deploy succeeds.
- Full deterministic path: register rule, record events, open dispute, evaluate.
- Real consensus interpretation and a challenge/re-evaluation round trip.
- Invalid transition fails with the documented `EXPECTED:` prefix.
- Reads return state written by transactions.

The latest recorded run deployed three contracts from the current source and
produced `MAJORITY_AGREE` receipts, including on-chain `decided_by` values for
both a deterministic and an interpretive assessment. Those test contracts, and
the official deployment `0xb4d8bf96…` whose stored code is byte-identical to
`contracts/dao_resolve.py`, are the on-chain evidence for this revision. See
[../deployments/studionet.md](../deployments/studionet.md)
for addresses and transaction hashes.

### Live method exercise

The official deployment was also driven end to end from the owner account: all
16 write methods and all 12 read methods were called, five disputes were carried
through `EVALUATED`, `CHALLENGED` → `RE_EVALUATED`, `WITHDRAWN`, `ESCALATED`, and
`FINALIZED`, and the two guard rails were confirmed by their rollback payloads
(`EXPECTED: category requires escalation to the DAO procedure`,
`EXPECTED: rule is deprecated`). Real consensus produced `INCONCLUSIVE` on
contradictory text evidence and cited the challenge-added evidence on
re-evaluation, so the model path and the citation floor both ran on chain rather
than only in mocks. Transaction-level detail is in the deployment record.

## Quality gates

Run in this order:

```bash
GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json
pytest tests/direct/ -v
gltest tests/integration/ -v -s --network studionet
genlayer deploy / schema / call / write / receipt
```

Gate 1 runs after every contract change. Gate 2 must pass before gate 3. Gate 3 is
required because consensus behavior is the point of the contract.

## Evidence policy

Paste real, trimmed output into reports. Never invent test output, addresses,
hashes, or explorer links.

## Related documents

- [examples.md](examples.md)
- [equivalence.md](equivalence.md)
- [deployment.md](deployment.md)
