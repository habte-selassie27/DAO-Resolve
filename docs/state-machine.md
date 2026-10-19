# State Machine

The contract enforces a strict lifecycle. Any transition not listed here fails
with an `EXPECTED:` error. `FINALIZED`, `ESCALATED`, and `WITHDRAWN` are
terminal.

## Transition table

| From | Action | To | Who |
|---|---|---|---|
| (none) | `open_dispute` | `OPEN` | Any caller, subject to strict separation |
| `OPEN` | `evaluate_dispute` | `EVALUATED` | Any caller, subject to strict separation |
| `EVALUATED` | `challenge_assessment` | `CHALLENGED` | Any caller, inside window, rounds remaining |
| `CHALLENGED` | `re_evaluate` | `RE_EVALUATED` | Any caller, subject to strict separation |
| `RE_EVALUATED` | `challenge_assessment` | `CHALLENGED` | Any caller, inside window, rounds remaining |
| `EVALUATED` / `RE_EVALUATED` | `finalize_dispute` | `FINALIZED` | Any caller after window, no pending challenge |
| Any non-terminal | `escalate_dispute` | `ESCALATED` | Escalation role |
| `OPEN` / `EVALUATED` | `withdraw_dispute` | `WITHDRAWN` | Disputant |

`submit_evidence` is allowed in `OPEN`, `EVALUATED`, and `RE_EVALUATED`; it does
not change the status.

## Diagram

```text
OPEN ──evaluate──> EVALUATED ──challenge──> CHALLENGED
  │                    │                        │
  │                    │                     re_evaluate
  │                    │                        │
  │                    │                        v
  │                    │                  RE_EVALUATED
  │                    │                        │
  │                    │                  challenge (rounds remaining)
  │                    │                        │
  │                    │                        +──> CHALLENGED
  │                    │
  │                    └──finalize──> FINALIZED
  │
  └──withdraw──> WITHDRAWN

Any non-terminal ──escalate──> ESCALATED
```

## Guards

### open_dispute

- Rule exists and is `ACTIVE`.
- The latest rule version is pinned into the dispute.
- Proposal exists.
- Claim text and references are within bounds.
- Strict separation, if enabled, permits the caller.

### evaluate_dispute

- Status is exactly `OPEN`.
- No assessment exists yet.
- Strict separation, if enabled, permits the caller.
- Deterministic checks run first and are recorded.
- If the rule is `DETERMINISTIC_ONLY` or any structured check fails, no LLM call
  is made.
- A failed required check cannot produce `COMPLIANT`.
- Exactly one assessment is appended.

### challenge_assessment

- Status is `EVALUATED` or `RE_EVALUATED`.
- Challenge count is below the pinned maximum rounds.
- `now < challenge_deadline`. A challenge exactly at the deadline is rejected.
- A bounded reason is required.
- New evidence is optional; pass `[]` to challenge without it.
- The challenge appends a challenge record; it never deletes an earlier
  assessment.
- A challenge sets the status to `CHALLENGED` and clears the deadline.

### re_evaluate

- Status is `CHALLENGED`.
- Strict separation, if enabled, permits the caller.
- A new assessment is appended with `produced_by = RE_EVALUATION`.
- The prior assessment remains in history.
- A new challenge deadline is set from the pinned window.

### finalize_dispute

- Status is `EVALUATED` or `RE_EVALUATED`.
- `now >= challenge_deadline`. Finalization exactly at the deadline is allowed.
- At least one assessment exists.
- The rule category is not marked vote-required.
- The latest assessment id is recorded as `final_assessment_id`.

### escalate_dispute

- Status is non-terminal.
- Caller holds the escalation role or is the owner.
- A bounded reason is recorded.
- The last assessment, if any, is preserved as `final_assessment_id`.
- The contract records the handoff only; it does not execute governance actions.

### withdraw_dispute

- Caller is the disputant.
- Status is `OPEN` or `EVALUATED`.

## Terminal-state behavior

Every write method that requires a non-terminal state rejects calls against
`FINALIZED`, `ESCALATED`, and `WITHDRAWN` with `EXPECTED: invalid state
transition`.

## Time and policy pinning

The challenge window and maximum rounds are copied into the dispute when it is
opened. `set_config` affects only new disputes. The contract uses the GenLayer
timestamp source wrapped by `_now_ts()`.

## Related documents

- [design.md](design.md)
- [access-control.md](access-control.md)
- [limits.md](limits.md)
- [testing.md](testing.md)
