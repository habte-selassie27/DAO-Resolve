# Contracts

## Layout

```text
contracts/
  dao_resolve.py    # main standalone Intelligent Contract
  README.md         # this file
```

## Current implementation

`dao_resolve.py` is a single readable contract (1,395 lines) with:

- A pinned `Depends` header for the GenLayer runner.
- GenLayer storage types: `TreeMap`, `DynArray`, `@allow_storage` dataclasses,
  `u8`, `u32`, `u64`, and `Address`.
- Role-based administration.
- Versioned rules with optional structured checks.
- Append-only proposals, events, evidence, assessments, and challenges.
- Deterministic checks before any model call.
- One custom leader/validator consensus block for residual interpretation.
- Bounded inputs, bounded pagination, and stable error prefixes.

An earlier revision is deployed on StudioNet at
`0x48179D48495B7199a3FCb939c3f0F73a23c50b70`. See
[../deployments/studionet.md](../deployments/studionet.md). The current working
tree contains later changes and has not been redeployed; compare `genlayer code`
before assuming byte-identical source.

## Implementation rules

- Verify every GenLayer import, decorator, storage type, and CLI flag against the
  official SDK reference before changing code.
- Keep the main contract readable end to end.
- Use GenLayer storage types only; no raw Python dicts or lists in persistent
  storage.
- Keep deterministic checks in plain code and outside the non-deterministic
  block.
- Append assessments; never overwrite history.
- Keep the `Depends` header pinned.
- Run `genvm-lint` after every contract change.

The design is specified in [../docs/design.md](../docs/design.md) and
[../AGENTS.md](../AGENTS.md).
