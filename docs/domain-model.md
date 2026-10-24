# Domain Model

Fields below match the storage dataclasses in `contracts/dao_resolve.py`.
Persistent values use GenLayer storage types: `TreeMap`, `DynArray`, dataclasses
with `@allow_storage`, and sized integers.

## Rule

A governance rule published by the DAO.

| Field | Type | Notes |
|---|---|---|
| `rule_id` | `str` | Stable logical rule identifier |
| `title` | `str` | Short human-readable title |
| `clause_text` | `str` | Natural-language clause; bounded |
| `category` | `str` | `PROCESS`, `QUORUM`, `TIMING`, `ELIGIBILITY`, `DISCLOSURE`, `OTHER` |
| `interpretation` | `str` | `DETERMINISTIC_ONLY`, `NEEDS_INTERPRETATION` |
| `status` | `str` | `ACTIVE`, `DEPRECATED` |
| `registered_by` | `Address` | Rule registrar |
| `version` | `u32` | Increments when the rule is edited |
| `registered_at` | `u64` | Registration timestamp |
| `supersedes_version` | `u32` | Previous version, or 0 |

Rule edits create a new version and deprecate the previous one. Existing
disputes stay pinned to the version they were opened under.

## StructuredCheck

A deterministic check attached to a rule version.

| Field | Type | Notes |
|---|---|---|
| `check_id` | `str` | Unique within the rule version |
| `kind` | `str` | `MIN_ELAPSED`, `REQUIRED_EVENT`, `MIN_COUNT`, `REQUIRED_ROLE` |
| `event_type` | `str` | Event type inspected by `REQUIRED_EVENT` / `MIN_COUNT` |
| `from_event_type` | `str` | Start event for `MIN_ELAPSED` |
| `to_event_type` | `str` | End event for `MIN_ELAPSED` |
| `threshold` | `u64` | Minimum elapsed value or count |
| `role` | `str` | Role name for `REQUIRED_ROLE` |
| `role_address` | `Address` | Address pinned at rule registration |

`REQUIRED_ROLE` pins the role address when the rule version is registered, so a
later role rotation does not rewrite how historical events are judged.

## ProposalRecord

A proposal referenced by disputes.

| Field | Type | Notes |
|---|---|---|
| `proposal_id` | `str` | Unique proposal identifier |
| `content_ref` | `str` | URL or hash of proposal text; bounded |
| `status_note` | `str` | Short bounded note |
| `created_at` | `u64` | Registration timestamp |
| `created_by` | `Address` | Recorder that registered it |

Events are stored per proposal in a separate `TreeMap[str, DynArray[ProcessEvent]]`.

## ProcessEvent

An event submitted by any wallet; the contract stores the signer as `recorded_by`.

| Field | Type | Notes |
|---|---|---|
| `event_id` | `str` | Unique within the proposal |
| `event_type` | `str` | For example `SUBMITTED`, `REVIEW_COMPLETED`, `VOTING_STARTED` |
| `actor` | `Address` | Address associated with the event |
| `timestamp_ref` | `u64` | Recorded time reference; monotonic per proposal |
| `evidence_ref` | `str` | Optional reference; bounded |
| `recorded_by` | `Address` | Recorder that appended it |

Events are append-only. Duplicate ids and non-monotonic timestamps are rejected.

## Dispute

A dispute against a pinned rule version and a proposal.

| Field | Type | Notes |
|---|---|---|
| `dispute_id` | `str` | Unique dispute identifier |
| `rule_id` | `str` | Rule being assessed |
| `rule_version` | `u32` | Pinned version |
| `proposal_id` | `str` | Proposal under dispute |
| `disputant` | `Address` | Address that opened the dispute |
| `claim_text` | `str` | Bounded claim |
| `status` | `str` | See `state-machine.md` |
| `challenge_count` | `u32` | Challenges used |
| `challenge_window` | `u64` | Policy pinned at opening |
| `max_rounds` | `u32` | Policy pinned at opening |
| `opened_at` | `u64` | Opening timestamp |
| `last_assessment_at` | `u64` | Latest assessment timestamp |
| `last_challenge_at` | `u64` | Latest challenge timestamp |
| `challenge_deadline` | `u64` | 0 when no challenge is pending |
| `escalated_by` | `Address` | Zero address if not escalated |
| `escalation_reason` | `str` | Bounded reason |
| `closed_at` | `u64` | Finalization/escalation/withdrawal time |
| `final_assessment_id` | `str` | Set on finalization or escalation with an assessment |

Evidence, assessments, and challenges are stored per dispute in separate
append-only maps.

## EvidenceItem

| Field | Type | Notes |
|---|---|---|
| `evidence_id` | `str` | Generated as `<dispute_id>#e<N>` |
| `submitted_by` | `Address` | Submitter |
| `side` | `str` | `DISPUTANT`, `RESPONDENT`, `NEUTRAL` |
| `kind` | `str` | `URL`, `EVENT_REF`, `TEXT_STATEMENT` |
| `ref` | `str` | URL, event id, or bounded statement |
| `submitted_at` | `u64` | Submission timestamp |

Fetched page content is never stored raw.

## Assessment

| Field | Type | Notes |
|---|---|---|
| `assessment_id` | `str` | Generated as `<dispute_id>#a<N>` |
| `dispute_id` | `str` | Parent dispute |
| `round` | `u32` | Equals the challenge count at production |
| `verdict` | `str` | `COMPLIANT`, `VIOLATION`, `INCONCLUSIVE` |
| `confidence_band` | `str` | `LOW`, `MEDIUM`, `HIGH` |
| `reasoning_digest` | `str` | Max 280 chars; excluded from consensus |
| `produced_by` | `str` | `EVALUATION`, `RE_EVALUATION` |
| `created_at` | `u64` | Production timestamp |
| `deterministic_pass_count` | `u32` | Number of passing checks |
| `deterministic_fail_count` | `u32` | Number of failing checks |
| `web_digest` | `str` | Max 512 chars; fingerprint of the evidence the leader read (`id=length:prefix`, or `id=UNAVAILABLE`). Empty for deterministic assessments. Not compared in consensus |
| `decided_by` | `str` | **Derived at read time, not stored.** `DETERMINISTIC_CHECKS` when a check failed or the pinned rule is `DETERMINISTIC_ONLY`, otherwise `INTERPRETATION`. Exposes why the verdict was reached |

Full check results, cited clause ids, and cited evidence ids are stored in
separate append-only maps keyed by assessment id.

`decided_by` is computed from the pinned rule interpretation and
`deterministic_fail_count`, so it can never disagree with the stored checks.

## ChallengeRecord

| Field | Type | Notes |
|---|---|---|
| `challenge_id` | `str` | Generated as `<dispute_id>#c<N>` |
| `dispute_id` | `str` | Parent dispute |
| `challenger` | `Address` | Caller |
| `reason` | `str` | Bounded reason |
| `round` | `u32` | Challenge round number |
| `new_evidence_count` | `u32` | Evidence added with the challenge |
| `created_at` | `u64` | Timestamp |

## Relationship sketch

```text
Rule 1 --- * StructuredCheck
  |
  | pinned by
  v
Dispute * --- 1 ProposalRecord 1 --- * ProcessEvent
  |
  +--- * EvidenceItem
  |
  +--- * Assessment
  |
  +--- * ChallengeRecord
```

## Related documents

- [design.md](design.md)
- [state-machine.md](state-machine.md)
- [limits.md](limits.md)
- [equivalence.md](equivalence.md)
