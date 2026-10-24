# Design

## 1. Purpose

DAOResolve is a reusable dispute-adjudication primitive for DAOs. A DAO publishes
its governance rules, any participant can register a proposal and append process events,
and participants can dispute whether a proposal or governance action complied with a
specific rule version.

The output is an **assessment against the registered rule**, not a legal ruling
and not an automatic enforcement action. The contract records the assessment and
its history so the DAO can use it in its own process.

## 2. Why the problem needs GenLayer

Many governance clauses are natural-language judgments:

- "Proposals must receive adequate community discussion."
- "The notice period was reasonable."
- "The disclosure was sufficient for the size of the treasury spend."

A deterministic contract can check whether an event exists or a minimum number of
seconds elapsed. It cannot decide whether a forum thread amounts to "adequate
discussion." A regular oracle would reintroduce a trusted decision-maker.
GenLayer lets validators independently interpret the evidence and agree on the
meaning of a constrained verdict.

## 2.1 Implementation status

The contract is implemented in `contracts/dao_resolve.py` (1,463 lines),
lint-clean, and covered by 171 passing direct tests. The official StudioNet
deployment is `0x151af6e00e1250Af44B8be1a14eb743C9613A41A`, whose stored code is
byte-identical to the working file (SHA-256 `f0a4abc1…`). Every read and write
method has been exercised on that instance, including a dispute that reached
`FINALIZED` and one that was escalated after a vote-required category blocked
finality.

The repository now also contains the recorder CLI (`recorder/`), the Vue
frontend (`frontend/`), deployment scripts, and a real ENS Snapshot ingest
(`ENS-7.1`). The frontend reads the deployed contract through a same-origin
Studio proxy and shows the full transaction lifecycle. A fresh deployment of
the pinned runner finalized on 2026-10-23 (`0x1bB0D68F…`). See
[deployment.md](deployment.md), [api-ledger.md](api-ledger.md), and
[testing.md](testing.md).

## 3. Core design principles

1. **Deterministic first.** Every check that code can decide is decided by code
   and recorded before any model call.
2. **Narrow interpretation.** The LLM is called only for the residual ambiguity
   after deterministic checks.
3. **Constrained output.** Consensus is over an enum, a coarse confidence band,
   and bounded cited ids. Never over free text.
4. **Append-only history.** Assessments are never overwritten or deleted.
   Challenges produce new assessments.
5. **Pinned rules.** A dispute stores the `rule_id` and `rule_version` it was
   opened under. Later rule edits cannot change an existing dispute.
6. **Advisory by default.** The contract does not execute, cancel, or reverse
   governance actions.
7. **Bounded everything.** Text, evidence counts, event counts, checks, rounds,
   and URLs have explicit upper bounds.

## 4. Components

```text
Rule registry
  - versioned rules
  - optional deterministic checks
  - active / deprecated status

Proposal event log
  - proposal record
  - append-only process events from any wallet; each event records its signer

Dispute lifecycle
  - rule pinning
  - evidence from disputant, respondent, and neutral sources
  - assessments with deterministic results
  - challenge and re-evaluation rounds
  - finalization or escalation

Consensus layer
  - deterministic check runner
  - clause interpretation leader/validator
  - evidence extraction leader/validator
  - challenge re-evaluation leader/validator
```

## 5. Evaluation flow

```text
evaluate_dispute(dispute_id)
  1. Load dispute, pinned rule version, proposal, and events.
  2. Check state and caller authorization.
  3. Run every deterministic check and record PASS/FAIL.
  4. If the rule is deterministic-only, or the checks fully decide the outcome,
     build the assessment from code and skip the model.
  5. Otherwise gather bounded evidence references and normalized facts.
  6. Run the consensus block:
       the leader fetches bounded evidence and proposes a constrained verdict;
       validators independently fetch/derive and compare under the equivalence
       rule. Web fetching and interpretation happen in one consensus block.
       The leader's result also carries a fingerprint of the content it read
       (`web_digest`), stored for audit; it is not compared by validators.
  7. Validate the agreed result: known enums, cited ids subset, deterministic
     consistency, and shared evidence support for decisive verdicts. The shared
     citation must have been readable in both runs; a decisive verdict that
     cites only an unreadable source fails rather than looking sourced.
  8. Append the assessment and update the dispute status.
```

Steps 1–4 and 7–8 are deterministic and live outside the non-deterministic
block. All state mutation happens after consensus.

## 6. Deterministic versus non-deterministic

| Question | Decider |
|---|---|
| Does a required event exist? | Code |
| Has the minimum period elapsed? | Code |
| Were at least K approvals recorded? | Code |
| Is the actor in a required role? | Code |
| Is the challenge inside the window? | Code |
| Is "adequate discussion" satisfied? | Validators via LLM |
| Does a linked document disclose the recipient? | Web fetch + LLM |
| Do conflicting evidence items change the verdict? | Validators via LLM |

A failed deterministic check that is required by the clause can never be
overturned into `COMPLIANT` by the model.

## 7. State and storage

- Keyed records: `TreeMap`.
- Append-only lists: `DynArray`.
- Records: dataclasses with `@allow_storage`.
- Counters and thresholds: sized integers (`u8`, `u32`, `u64`).
- Rule versions are immutable once registered; edits create a new version.
- Disputes pin the rule version and challenge policy at opening.
- Assessments, evidence, and challenges are append-only.
- Assessment check results and citations are stored in separate append-only maps.
- Evidence stores references and short digests, not fetched page bodies.
- Each assessment also stores `web_digest`: a bounded (512 char) fingerprint
  of the evidence the leader actually read (`id=length:prefix`, or
  `id=UNAVAILABLE`). It makes source drift auditable. It is not a consensus
  input and not proof of authenticity.
- `decided_by` is derived at read time from `deterministic_fail_count` and the
  pinned rule's interpretation mode, so no extra state can drift from the
  recorded checks. It distinguishes a failed configured check from a model
  interpretation.
- The contract stores no secrets and no raw web content.

Read methods use bounded pagination (1–50 items per page).

## 8. Boundaries

In scope:

- Rule registration and deprecation.
- Authorized process-event recording.
- Evidence-based dispute evaluation.
- Deterministic checks and narrow LLM interpretation.
- Challenges, re-evaluation, finalization, and escalation.
- Auditable assessment history.

Out of scope for the contract:

- Voting, tallying, treasuries, or fund execution.
- Automatic enforcement of verdicts.
- Identity verification.
- Legal rulings.
- Off-chain indexers or backends.

In the repository, the frontend and recorder are separate components around the
contract. They are not trusted by the contract and cannot change its rules.

## 9. Related documents

- [domain-model.md](domain-model.md)
- [state-machine.md](state-machine.md)
- [access-control.md](access-control.md)
- [limits.md](limits.md)
- [api.md](api.md)
- [equivalence.md](equivalence.md)
- [threat-model.md](threat-model.md)
- [examples.md](examples.md)
- [guide-for-daos.md](guide-for-daos.md)
- [demo-script.md](demo-script.md)
- [api-ledger.md](api-ledger.md)
- [testing.md](testing.md)
