# Tests

## Current results

| Suite | Result |
|---|---|
| Direct | **157 passed in 5.77s** |
| Integration | **3 passed in 243.40s on StudioNet** (recorded in `deployments/studionet.md`) |

## Layout

```text
tests/
  direct/
    conftest.py
    test_rules.py
    test_disputes.py
    test_evaluation.py
    test_evaluation_parsing.py
    test_challenges.py
    test_access_control.py
    test_equivalence_helpers.py
    test_web_evidence.py
  integration/
    test_end_to_end.py
    test_consensus.py
```

## Direct tests

Fast in-memory tests with mocked web and LLM responses:

```bash
pytest tests/direct/ -v
```

## Integration tests

Real consensus tests on StudioNet:

```bash
gltest tests/integration/ -v -s --network studionet
```

The full coverage plan is in [../docs/testing.md](../docs/testing.md).

## Rules

- Gate 1 (`genvm-lint`) runs after every contract change.
- Direct tests must pass before integration tests.
- Integration tests are required because consensus behavior is the point of this
  contract.
- Never fabricate test output.
