# Guide for DAOs

This guide is for a DAO that wants to pilot DAOResolve on a real governance process.
It covers role setup, writing rules, recording events, opening disputes, and the
operational limits you should tell your community about.

DAOResolve is advisory. It does not vote, execute, cancel, or reverse anything. A pilot
should run beside your existing process, not replace it.

## 1. Decide what question you are answering

A good DAOResolve rule answers one process question, for example:

- "Was there at least 48 hours between proposal submission and the start of voting?"
- "Was a `DISCUSSION_OPENED` event recorded before the vote?"
- "Did the required reviewer role complete a review before voting started?"
- "Did the proposal receive adequate community discussion?" (interpretive)

Avoid rules that require private information, identity verification, or facts nobody can
link to a public source. Avoid bundling five questions into one clause; split them into
separate rules so the assessment can say exactly what failed.

## 2. Set up roles

The constructor assigns every role to the deployer. Reassign them before a pilot:

| Role | Should be | Can do |
|---|---|---|
| Owner | A multisig or DAO-controlled address | Everything, including roles and policy |
| Rule registrar | Governance facilitator or rules committee | Register and deprecate rules |
| Recorder (optional) | A designated signer for the recorder CLI | Register proposals and record process events; any wallet may do this directly |
| Escalator | A governance officer or multisig | Hand a dispute to the DAO's own procedure |

The contract stores one address per role. If all four point at the same account, the UI
shows that explicitly. Role separation is real only when the accounts are different.

```bash
genlayer write <contract> set_role --args RULE_REGISTRAR 0x…
genlayer write <contract> set_role --args RECORDER 0x…
genlayer write <contract> set_role --args ESCALATOR 0x…
```

The zero address revokes a role. `transfer_ownership` is a single-step transfer; use a
multisig if ownership matters.

Policy applies to **new** disputes. Existing disputes keep the challenge window and round
limit they pinned when they opened.

## 3. Event vocabulary

Rules reference event type strings. Use a small, stable vocabulary and document it for
your community. The recorder and demo use:

| Event type | Meaning | Typical source |
|---|---|---|
| `SUBMITTED` | The proposal was formally submitted | Forum thread, Snapshot proposal creation |
| `REVIEW_STARTED` | A review period began | Forum post, review workspace |
| `DISCUSSION_OPENED` | A community discussion opened | Forum thread |
| `REVIEW_COMPLETED` | The required review finished | Review report, forum post |
| `VOTING_STARTED` | Voting opened | Snapshot / governor proposal start |
| `VOTING_ENDED` | Voting closed | Snapshot / governor proposal end |
| `EXECUTED` | An approved action executed | Governor transaction |
| `CANCELLED` | The proposal was cancelled | Forum or governor event |

You may add event types, but keep them uppercase and stable. A rule that expects
`DISCUSSION_OPENED` will not match `DISCUSSION-STARTED`.

Every event needs:

- an id unique within the proposal;
- an integer UNIX timestamp in seconds;
- an actor address;
- an `evidence_ref` (URL, event reference, or a short statement).

Events must be chronological. The contract rejects a timestamp earlier than the previous
event and rejects timestamps more than one day in the future. The per-proposal cap is 128.

## 4. Choose deterministic or interpretive

### DETERMINISTIC_ONLY

Use when the rule can be decided from the event log alone. It must have at least one
check. No model is called — ever.

Available checks:

| Check | Fields | Passes when |
|---|---|---|
| `MIN_ELAPSED` | `from_event_type`, `to_event_type`, `threshold` (seconds) | Every matching pair is measured; the smallest elapsed time must meet the threshold |
| `REQUIRED_EVENT` | `event_type` | At least one event of that type exists |
| `MIN_COUNT` | `event_type`, `threshold` | At least N events of that type exist |
| `REQUIRED_ROLE` | `event_type`, `role` | The event's actor is the role address pinned at registration |

A failed check forces `VIOLATION`. The model cannot override it.

### NEEDS_INTERPRETATION

Use when code can check part of the rule but the final question needs reading evidence:
"adequate discussion", "sufficient disclosure", "the linked report supports the claim".

Structured checks still run first. If any fails, the result is `VIOLATION` and the model is
not called. If they pass, validators fetch evidence and decide the residual meaning.

Do not use `NEEDS_INTERPRETATION` for a question code can answer. It adds cost, latency,
and consensus risk for no benefit.

## 5. Rule templates

### Minimum review period

```json
{
  "rule_id": "R-REVIEW",
  "title": "Minimum review period",
  "category": "TIMING",
  "interpretation": "DETERMINISTIC_ONLY",
  "clause_text": "Proposals require at least 48 hours of review between submission and the start of voting.",
  "checks": [
    {
      "check_id": "review",
      "kind": "MIN_ELAPSED",
      "from_event_type": "SUBMITTED",
      "to_event_type": "VOTING_STARTED",
      "threshold": 172800
    }
  ]
}
```

### Discussion must exist

```json
{
  "rule_id": "R-DISCUSSION",
  "title": "Community discussion",
  "category": "PROCESS",
  "interpretation": "NEEDS_INTERPRETATION",
  "clause_text": "Proposals must receive adequate community discussion before a vote. At minimum, a DISCUSSION_OPENED event must exist; validators may read linked evidence for context.",
  "checks": [
    {
      "check_id": "discussion",
      "kind": "REQUIRED_EVENT",
      "event_type": "DISCUSSION_OPENED"
    }
  ]
}
```

### Required reviewer

```json
{
  "check_id": "reviewer",
  "kind": "REQUIRED_ROLE",
  "event_type": "REVIEW_COMPLETED",
  "role": "registrar"
}
```

The role address is pinned when the rule is registered. If the role changes later, the
old rule still points at the old address; register a new rule version if that is not what
you want.

### Quorum disclosure (interpretive)

Write a clause that names exactly what must be disclosed and where. Link the disclosure
in evidence. Do not ask the model to guess private financial facts.

## 6. Register rules and proposals

```bash
# Rule
genlayer write <contract> register_rule --args \
  R-REVIEW "Minimum review period" \
  "Proposals require at least 48 hours of review between submission and the start of voting." \
  TIMING DETERMINISTIC_ONLY '<checks-json>'

# Proposal
genlayer write <contract> register_proposal --args \
  P-001 "https://forum.example.org/t/p-001" "Review opened."
```

The frontend has the same actions behind role gates. Registering a new version of a rule
supersedes the old version for new disputes. Old versions remain readable for the record.
Deprecated rules cannot be used for new disputes.

## 7. Record events with the recorder

The recorder turns a public source into a reproducible plan:

```bash
npm run recorder -- ingest snapshot \
  'https://snapshot.box/#/s:ens.eth/proposal/0x…' \
  --proposal-id ENS-7.1
```

Read `recorder/logs/ENS-7.1.json`. It contains:

- the source URL and fetch time;
- the raw fields used (`created`, `start`, `end`, `state`, `author`);
- the planned events with timestamps and actors;
- warnings, for example when voting events use the proposal author because no
  `--actor` was supplied.

Then submit and verify:

```bash
CONTRACT_ADDRESS=<contract> RECORDER_PRIVATE_KEY=0x… \
  npm run recorder -- submit recorder/logs/ENS-7.1.json

CONTRACT_ADDRESS=<contract> \
  npm run recorder -- verify recorder/logs/ENS-7.1.json
```

If a source lacks a timestamp or an address, the recorder skips the event and reports why.
It never invents one. Partial submissions stop at the first failure and tell you the last
confirmed event.

## 8. Open and handle disputes

```bash
genlayer write <contract> open_dispute --args \
  D-001 R-REVIEW P-001 "Voting started after about 90 minutes; the rule requires 48 hours."
```

Then:

1. Add evidence if needed. Sides are self-declared; tell your community that a label is
   not proof.
2. Request an assessment. The contract runs code checks first.
3. If the result is challenged, anyone can request re-evaluation. The action is
   permissionless by design.
4. After the challenge window, finalize. If the category is vote-required, finalize is
   blocked and the dispute must be escalated instead.
5. Escalation records a handoff with a reason. The DAO's own procedure takes over.

A failed evaluation is not a verdict. Nothing is appended; retry when validators can reach
agreement or the source is reachable.

## 9. What to tell your community

- This is an **advisory assessment against a pinned rule version**, not a ruling.
- Code decides what code can decide. A failed check cannot be overridden by a model.
- Validators fetch evidence live. An unreadable source cannot support a decisive verdict.
- `web_digest` is informational; it is not proof of authenticity.
- Evidence sides are self-declared.
- Recorded events are asserted by the recorder and link to a source; the contract does not
  independently prove the event unless on-chain verification is enabled.
- A challenge appends a round; it does not erase the earlier assessment.
- The DAO's own vote, appeal, or escalation procedure still controls.

## 10. Pilot checklist

- [ ] Roles are held by different accounts, or the community knows they are not.
- [ ] The pilot rule is linked to a public source type the recorder can read.
- [ ] Event vocabulary is written down and used consistently.
- [ ] Deterministic checks are tested against a known-good and known-bad proposal.
- [ ] An interpretive rule has a real public evidence URL and enough readable content.
- [ ] The challenge window is long enough for your community to respond.
- [ ] The escalator role is staffed.
- [ ] Participants know the output is advisory.
