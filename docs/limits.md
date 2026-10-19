# Limits and Bounds

All limits are compile-time constants or validated configuration. Over-limit
input is rejected with a stable `EXPECTED:` error. The contract never loops
unboundedly over storage.

## Implemented constants

These values match `contracts/dao_resolve.py` and are reported by `get_config()`
where applicable.

| Item | Value | Notes |
|---|---|---|
| Identifier length | 64 chars | Rule, dispute, proposal, event, and check ids |
| Rule title length | 120 chars | Short label |
| `clause_text` length | 2,000 chars | Natural-language clause |
| `claim_text` length | 2,000 chars | Dispute claim |
| Challenge / escalation reason length | 1,000 chars | Required where applicable |
| `reasoning_digest` length | 280 chars | Excluded from consensus comparison |
| Generic reference length | 512 chars | Content refs and event evidence refs |
| Text statement length | 2,000 chars | `TEXT_STATEMENT` evidence |
| Proposal status note length | 280 chars | Short note |
| Structured checks per rule | 12 | Deterministic checks |
| Structured checks JSON length | 8,000 chars | Encoded input limit |
| Process events per proposal | 128 | Append-only log |
| Evidence items per dispute | 32 | Across all sides |
| Challenge rounds | 0–10 | Configurable; 0 disables challenges |
| Challenge window | 60–2,592,000 seconds | 1 minute to 30 days |
| Default challenge window | 86,400 seconds | 1 day |
| Default challenge rounds | 3 | Configurable |
| Cited ids per assessment | 16 | Must be a subset of provided ids |
| Evidence page characters | 3,000 | Fetched text cap |
| Fetched URLs per evaluation | 3 | Additional URLs are marked unavailable |
| Events in a prompt | 64 | First and last half when truncated |
| Read page size | 1–50 | Pagination limit |

## Defaults at deployment

| Setting | Default |
|---|---|
| `challenge_window` | 86,400 seconds |
| `max_challenge_rounds` | 3 |
| `strict_separation` | false |
| `vote_required_categories` | empty |

`set_config` applies to new disputes. Existing disputes keep the challenge
window, maximum rounds, and policy they were opened under.

## Rules

1. Validate lengths and counts before writing anything.
2. Reject over-limit input with `EXPECTED: <stable reason>`.
3. Model `reasoning_digest` may be truncated to 280 characters; other
   user-authored text is rejected rather than silently truncated.
4. Never iterate over an unbounded collection.
5. Document any limit change in this file and in the contract constants.

## Integer sizes

Counters and thresholds use sized integers (`u32`, `u64`, `u8`). Amounts and
floating-point values are not part of this contract's domain.

## Related documents

- [design.md](design.md)
- [state-machine.md](state-machine.md)
- [api.md](api.md)
