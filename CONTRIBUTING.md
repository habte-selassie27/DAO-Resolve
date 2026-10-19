# Contributing

## Before writing GenLayer-specific code

Verify every import, decorator, storage type, and CLI flag against the official
sources listed in [AGENTS.md](AGENTS.md) section 5. Do not guess API names.

## Development order

1. Update or confirm the relevant design document.
2. Implement the smallest complete change.
3. Run `genvm-lint check contracts/dao_resolve.py --json`.
4. Run `pytest tests/direct/ -v`.
5. Run `gltest tests/integration/ -v -s` when consensus behavior is affected.
6. Update documentation and `CHANGELOG.md` in the same session.

## Rules

- Keep the contract readable end to end.
- Use GenLayer storage types only.
- Keep deterministic logic out of the non-deterministic block.
- Append assessments; never overwrite history.
- Pin rule versions per dispute.
- Use constrained verdicts, not free text.
- Never commit secrets or `.env`.
- Never fabricate test output, addresses, hashes, or explorer links.
- Add a test for every restricted method and every state transition.

## Commit style

Use short, imperative commit messages with a scope, for example:

```text
feat(contract): add rule registry
test(direct): cover challenge window boundaries
docs(equivalence): document confidence tolerance
```

## Reporting issues

Include the command, the observed output, and the expected behavior. If a
GenLayer API is involved, cite the documentation page or SDK reference used.
