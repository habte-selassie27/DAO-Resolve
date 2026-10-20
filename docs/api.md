# Public Interface

Signatures below match `contracts/dao_resolve.py`. Read and write methods are
strictly separate.

## Administration

### `set_role(role: str, account: Address) -> None`

Owner only. Assigns one of `RULE_REGISTRAR`, `RECORDER`, or `ESCALATOR`. The
zero address revokes the role. The owner can exercise every role.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: unknown role`.

### `transfer_ownership(new_owner: Address) -> None`

Owner only. Transfers owner powers. The zero address is rejected.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: invalid new owner`.

### `set_config(challenge_window: u64, max_challenge_rounds: u32, strict_separation: bool) -> None`

Owner only. Sets policy for **new** disputes. Existing disputes keep the policy
pinned when they were opened.

Bounds: window 60–2,592,000 seconds; rounds 0–10.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: challenge window out of bounds`,
`EXPECTED: challenge rounds out of bounds`.

### `set_category_vote_required(category: str, required: bool) -> None`

Owner only. Marks a rule category as requiring escalation to the DAO's own vote.
Finalization is refused for those categories.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: unknown category`.

## Rules

### `register_rule(rule_id, title, clause_text, category, interpretation, structured_checks_json) -> None`

Rule registrar only. Registers a rule or publishes a new version. Registering an
existing `rule_id` creates version N+1, deprecates the previous version, and
leaves disputes pinned to old versions untouched. A `DETERMINISTIC_ONLY` rule
requires at least one structured check.

Categories: `PROCESS`, `QUORUM`, `TIMING`, `ELIGIBILITY`, `DISCLOSURE`, `OTHER`.

Interpretations: `DETERMINISTIC_ONLY`, `NEEDS_INTERPRETATION`.

Check kinds: `MIN_ELAPSED`, `REQUIRED_EVENT`, `MIN_COUNT`, `REQUIRED_ROLE`.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: clause_text too long`,
`EXPECTED: too many structured checks`, `EXPECTED: unknown category`,
`EXPECTED: deterministic rule needs at least one structured check`.

### `deprecate_rule(rule_id) -> None`

Rule registrar only. Deprecates the latest version. New disputes cannot use it.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: unknown rule`,
`EXPECTED: rule already deprecated`.

## Proposals and events

### `register_proposal(proposal_id, content_ref, status_note) -> None`

Recorder only. Registers a proposal so its process can be recorded and disputed.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: proposal already exists`,
`EXPECTED: content_ref too long`.

### `record_process_event(proposal_id, event_id, event_type, actor, timestamp_ref, evidence_ref) -> None`

Recorder only. Appends one event. Events are append-only and must be
non-decreasing by timestamp. Future timestamps beyond one day are rejected.
Duplicate event ids are rejected. The event cap is enforced.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: unknown proposal`,
`EXPECTED: duplicate event_id`, `EXPECTED: event timestamp is not monotonic`,
`EXPECTED: process event cap reached`.

## Disputes and evidence

### `open_dispute(dispute_id, rule_id, proposal_id, claim_text) -> None`

Any caller, subject to strict separation. Opens a dispute against the latest
active rule version and pins that version plus the current challenge policy.

Errors: `EXPECTED: dispute already exists`, `EXPECTED: unknown rule`,
`EXPECTED: rule is deprecated`, `EXPECTED: unknown proposal`,
`EXPECTED: claim_text too long`.

### `submit_evidence(dispute_id, side, kind, ref) -> None`

Any caller, subject to strict separation. Adds evidence while the dispute is
`OPEN`, `EVALUATED`, or `RE_EVALUATED`. Sides: `DISPUTANT`, `RESPONDENT`,
`NEUTRAL`. Kinds: `URL`, `EVENT_REF`, `TEXT_STATEMENT`. The evidence cap is
enforced.

Errors: `EXPECTED: invalid state transition`, `EXPECTED: invalid evidence side`,
`EXPECTED: invalid evidence kind`, `EXPECTED: evidence ref too long`,
`EXPECTED: evidence cap reached`.

## Evaluation

### `evaluate_dispute(dispute_id) -> None`

Evaluates an `OPEN` dispute. Runs deterministic checks first. If the rule is
`DETERMINISTIC_ONLY` or any structured check fails, no LLM call is made. Only
the residual interpretive question reaches consensus.

Errors: `EXPECTED: invalid state transition`, `EXPECTED: dispute already evaluated`,
`EXPECTED: caller recorded the disputed events` (strict mode),
`EXTERNAL: evidence source unreachable`, `TRANSIENT: upstream timeout`,
`LLM_ERROR: invalid model output`.

### `challenge_assessment(dispute_id, reason, new_evidence_json) -> None`

Any caller, subject to strict separation. Challenges the latest assessment while
the dispute is `EVALUATED` or `RE_EVALUATED`, inside the pinned window, and under
the maximum rounds. `new_evidence_json` is a bounded JSON/native array of
`{side, kind, ref}`; pass `[]` to challenge without new evidence.

Boundary behavior: a challenge exactly at the deadline is rejected; finalization
exactly at the deadline is allowed.

Errors: `EXPECTED: invalid state transition`, `EXPECTED: maximum challenge rounds reached`,
`EXPECTED: challenge window closed`, `EXPECTED: challenge reason required`.

### `re_evaluate(dispute_id) -> None`

Produces a new assessment after a challenge. The previous assessment remains in
history. Status must be `CHALLENGED`.

Errors: `EXPECTED: invalid state transition`, `LLM_ERROR: invalid model output`.

### `finalize_dispute(dispute_id) -> None`

Finalizes after the pinned challenge window closes, with an assessment and no
pending challenge. Refuses categories marked as vote-required.

Errors: `EXPECTED: invalid state transition`, `EXPECTED: challenge window still open`,
`EXPECTED: category requires escalation to the DAO procedure`.

### `escalate_dispute(dispute_id, reason) -> None`

Escalation role only. Records a handoff to the DAO's own procedure, including the
escalating address, reason, and last assessment. Does not execute a governance
action.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: invalid state transition`,
`EXPECTED: escalation reason required`.

### `withdraw_dispute(dispute_id) -> None`

Disputant only. Withdraws an `OPEN` or `EVALUATED` dispute.

Errors: `EXPECTED: caller is not authorized`, `EXPECTED: invalid state transition`.

## Read methods

| Method | Returns |
|---|---|
| `get_config()` | Policy, roles, limits, vote-required categories |
| `get_rule(rule_id)` | Latest rule version with structured checks |
| `get_rule_version(rule_id, version)` | Exact pinned rule version |
| `list_active_rules(offset, limit)` | Active rules from registration order |
| `get_proposal(proposal_id)` | Proposal metadata and event count |
| `get_events(proposal_id, offset, limit)` | Bounded process events |
| `get_dispute(dispute_id)` | Metadata, counts, and latest assessment |
| `get_dispute_status(dispute_id)` | Status only |
| `list_disputes(offset, limit)` | Disputes in opening order |
| `get_evidence(dispute_id, offset, limit)` | Bounded evidence references |
| `get_assessment_history(dispute_id, offset, limit)` | Append-only assessments, including check results, citations, the evidence fingerprint (`web_digest`), and `decided_by` (`DETERMINISTIC_CHECKS` or `INTERPRETATION`) |
| `get_challenges(dispute_id, offset, limit)` | Bounded challenge records |

Read methods do not mutate state. All list reads use a bounded page size of 1–50.

## Error format

Every error begins with one of:

- `EXPECTED:` — caller or logic error.
- `EXTERNAL:` — external source failed.
- `TRANSIENT:` — retryable upstream failure.
- `LLM_ERROR:` — unusable model output.

Messages contain no timestamps, random ids, raw model output, or raw web content.

## Related documents

- [state-machine.md](state-machine.md)
- [access-control.md](access-control.md)
- [limits.md](limits.md)
- [equivalence.md](equivalence.md)
