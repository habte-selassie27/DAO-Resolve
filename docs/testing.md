# Testing Strategy

## Current results

| Gate | Result |
|---|---|
| `genvm-lint` | Clean; 3 checks passed. One informational notice about a newer runner |
| Direct tests | **157 passed in 5.77s** |
| Integration tests | **3 passed in 243.40s on StudioNet** for the deployed revision, per `deployments/studionet.md` |

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
| `test_web_evidence.py` | URL fetching, unavailable evidence, prompt escaping, error prefixes |

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

The recorded run deployed three contracts and produced `MAJORITY_AGREE`
receipts. It covers the revision recorded in the deployment log, not the later
working-tree changes. See [../deployments/studionet.md](../deployments/studionet.md)
for addresses and transaction hashes.

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
