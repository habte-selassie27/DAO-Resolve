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

The official StudioNet deployment is
`0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb`. Its stored code is byte-identical
to `dao_resolve.py` here (SHA-256 `f0a4abc1…`), verified by downloading the code
through `gen_getContractCode` and hashing it. See
[../deployments/studionet.md](../deployments/studionet.md).

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
