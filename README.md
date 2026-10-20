# DAOResolve

A reusable GenLayer Intelligent Contract for DAO dispute adjudication.

DAOResolve lets a DAO register its own governance rules, record proposal process
events, and evaluate whether a proposal or governance action complied with those
rules. Deterministic checks run first in plain code; GenLayer AI-validator
consensus is used only for genuinely ambiguous clauses. Assessments are advisory,
append-only, and open to challenge and escalation.

## Why GenLayer is required

Governance rules are written in natural language. Questions such as "did this
proposal receive adequate community discussion?" or "was this disclosure
sufficient?" cannot be answered by byte-exact smart-contract logic alone.
DAOResolve needs validators to agree on the *meaning* of a verdict while
tolerating different wording and confidence. That is the non-deterministic
consensus problem GenLayer is designed to solve.

## What DAOResolve is

- A standalone Intelligent Contract and reusable primitive.
- A rule registry with versioning and deprecation.
- An append-only proposal event log supplied by authorized recorders.
- A dispute workflow with evidence, assessments, challenges, and escalation.
- A deterministic-first evaluator with a narrow LLM interpretation step.
- An auditable record of assessments against a pinned rule version.

## What it is not

- Not a frontend or full application.
- Not a voting or tallying system.
- Not a replacement for a DAO's own governance or appeal procedure.
- Not a legal ruling or binding enforcement mechanism.
- Not a thin LLM wrapper: code decides everything it can, and the model only
  resolves the residual interpretive question.
- Not a boilerplate fork or a generic "AI decides X" demo.

## How consensus is used

1. **Deterministic stage.** Structured checks (`MIN_ELAPSED`, `REQUIRED_EVENT`,
   `MIN_COUNT`, `REQUIRED_ROLE`) run in plain Python against the recorded
   events. If any fails, the verdict is `VIOLATION` and the model is never
   called.
2. **Interpretive stage.** For `NEEDS_INTERPRETATION` rules whose checks all
   pass, the leader fetches bounded evidence (live URLs, text statements,
   event references) and asks the model for a constrained JSON verdict: verdict
   enum, confidence band, cited clause ids, cited evidence ids, and a reasoning
   digest. The disputant's `claim_text` is included as delimited, explicitly
   unverified context.
3. **Validator consensus.** Each validator independently re-fetches the URLs,
   rebuilds the prompt, and runs the model. Agreement requires an identical
   verdict, confidence bands within one adjacent step, and shared citation
   support: for a decisive verdict, leader and validator must cite at least one
   common evidence id **that both runs could actually read**. A verdict citing
   only a source that returned 503 is rejected with `LLM_ERROR: decisive
   verdict cites no readable evidence`. `COMPLIANT` can never contradict a
   deterministic `FAIL`, and reasoning text is excluded from the comparison.
4. **Drift visibility.** The leader's result carries a bounded fingerprint of
   the content it actually read (`web_digest`, e.g.
   `D2#e1=189:The DAO foru;D2#e2=63:The author r`). It is stored on the
   assessment for audit, not compared by validators: leader and validator fetch
   independently, so consensus compares decisions rather than page bytes.
5. **Safety.** Assessments are appended only after consensus. A failed
   consensus is not an `INCONCLUSIVE` verdict: nothing is stored, the dispute
   keeps its status and history, and the participant may retry or escalate.
   Every assessment also reports `decided_by` (`DETERMINISTIC_CHECKS` or
   `INTERPRETATION`), so a failed configured check is never mistaken for a
   finding about the whole governance process.

Full design: [docs/equivalence.md](docs/equivalence.md).

## Verified status

| Item | Result |
|---|---|
| Contract | `contracts/dao_resolve.py` (1,463 lines) |
| Lint | `genvm-lint` clean, 3 checks passed (one informational newer-runner notice) |
| Direct tests | 171 passed (`python3.12 -m pytest tests/direct/ -q`) |
| Integration tests | 3 passed in 209.44s on StudioNet for this source (test deployments; see `deployments/studionet.md`) |
| StudioNet deployment | `0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb` |
| StudioNet deploy transaction | `0xa99453271c7139fcdda8480e6050ae8bd623b55f9dc5020a755c610227cf146f` |
| Deployed source check | Stored code hashes to `f0a4abc1…`: byte-identical to `contracts/dao_resolve.py` |
| Bradbury deployment | Blocked by a node-side "gas limit too high" rejection; no funds spent |

The official StudioNet deployment runs exactly the source in this repository:
the stored contract code was downloaded, decoded, and hashed against
`contracts/dao_resolve.py` (`f0a4abc1812e8d37…`, 1,463 lines). It is a fresh
instance — configuration and limits are readable on chain, no rules or
disputes have been registered there yet.

An earlier instance at `0xDD29Ae63…` runs the pre-`decided_by` revision. It is
kept in the deployment record because its write flow is the receipt trail for
the evaluation pipeline; it does not match the working tree.

StudioNet links:

- Contract: https://explorer-studio.genlayer.com/address/0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb
- Deploy transaction: https://explorer-studio.genlayer.com/tx/0xa99453271c7139fcdda8480e6050ae8bd623b55f9dc5020a755c610227cf146f
- Open in Studio: https://studio.genlayer.com/?import-contract=0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb

The full deployment record, write transaction hashes, read outputs, and schema
are in [deployments/studionet.md](deployments/studionet.md) and
[deployments/studionet.schema.txt](deployments/studionet.schema.txt).

## Lifecycle

```text
                 +-------------------+
                 |       OPEN        |
                 +---------+---------+
                           |
                    evaluate_dispute
                           |
                 +---------v---------+
          +------>      EVALUATED    +------+
          |      +---------+---------+      |
          |                |                |
   re_evaluate        challenge        withdraw / escalate
          |                |                |
          |      +---------v---------+      |
          |      |     CHALLENGED    |      |
          |      +---------+---------+      |
          |                |                |
          |          re_evaluate            |
          |                |                |
          |      +---------v---------+      |
          +------+   RE_EVALUATED    |      |
                 +---------+---------+      |
                           |                |
                       finalize       FINALIZED / ESCALATED / WITHDRAWN
```

A dispute may only finalize after the challenge window closes with no pending
challenge. Escalation records a handoff to the DAO's own procedure; it never
executes, cancels, or reverses a governance action.

## Public interface

Write methods:

| Method | Purpose |
|---|---|
| `set_role` | Owner assigns a role; zero address revokes |
| `transfer_ownership` | Owner transfers owner powers |
| `set_config` | Owner sets window, max rounds, and strict separation |
| `set_category_vote_required` | Owner marks a category as requiring escalation |
| `register_rule` | Register a rule or publish a new version |
| `deprecate_rule` | Deprecate the latest rule version |
| `register_proposal` | Register a proposal for event recording |
| `record_process_event` | Append a proposal process event |
| `open_dispute` | Open a dispute against the active rule version |
| `submit_evidence` | Add bounded evidence to a dispute |
| `evaluate_dispute` | Run deterministic checks and consensus interpretation |
| `challenge_assessment` | Challenge the latest assessment |
| `re_evaluate` | Produce a new assessment after a challenge |
| `finalize_dispute` | Close after the window with no pending challenge |
| `escalate_dispute` | Hand the dispute to the DAO's own procedure |
| `withdraw_dispute` | Disputant withdraws the dispute |

Read methods:

| Method | Returns |
|---|---|
| `get_config` | Window, limits, roles, strict mode, vote-required categories |
| `get_rule` / `get_rule_version` | Latest or pinned rule version |
| `list_active_rules` | Bounded list of active rules |
| `get_proposal` | Proposal metadata and event count |
| `get_events` | Bounded process events for a proposal |
| `get_dispute` | Dispute metadata, counts, latest assessment |
| `get_dispute_status` | Current status |
| `list_disputes` | Bounded dispute list |
| `get_evidence` | Bounded evidence references |
| `get_assessment_history` | Append-only assessments with check results |
| `get_challenges` | Bounded challenge records |

Exact signatures live in the contract source and are summarized in
[docs/design.md](docs/design.md); read methods return the full assessment
record, including check results, citations, and the evidence fingerprint.

## Quick start

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json
python3.12 -m pytest tests/direct/ -q
gltest tests/integration/ -v -s --network studionet
```

Deployment uses the GenLayer CLI with a built-in network selected through
`genlayer network set`; RPC endpoints are not overridden manually. See
[deployments/studionet.md](deployments/studionet.md).

## Documentation

- [AGENTS.md](AGENTS.md) — operating rules and full project specification
- [docs/design.md](docs/design.md) — design overview and state machine
- [docs/domain-model.md](docs/domain-model.md) — entities and fields
- [docs/state-machine.md](docs/state-machine.md) — transitions and guards
- [docs/access-control.md](docs/access-control.md) — roles and trust assumptions
- [docs/limits.md](docs/limits.md) — bounded inputs and lifecycle limits
- [docs/api.md](docs/api.md) — public interface
- [docs/equivalence.md](docs/equivalence.md) — consensus and equivalence design
- [docs/threat-model.md](docs/threat-model.md) — threats, safeguards, and trust assumptions
- [docs/examples.md](docs/examples.md) — worked scenarios and two sample DAOs
- [docs/testing.md](docs/testing.md) — test strategy and quality gates
- [docs/deployment.md](docs/deployment.md) — deployment procedure
- [docs/glossary.md](docs/glossary.md) — terms used by the project
- [deployments/studionet.md](deployments/studionet.md) — deployment record

## Reuse

The contract is rule-agnostic: any DAO can register its own rules, categories,
and deterministic checks without changing the contract.
[docs/examples.md](docs/examples.md) walks through two complete samples — a
grants council (quorum + community-discussion rules, with an escalation path)
and a treasury payments DAO (timing + disclosure rules) — with the expected
assessment and challenge outcome for each dispute.

## Limitations

- Recorders are trusted to record process events honestly.
- Rule registrars are trusted to publish the rules the DAO intends to use.
- Assessments are advisory unless a DAO explicitly wires them into its process.
- External evidence can change, disappear, or be manipulated; leader and
  validator fetch independently, so the stored fingerprint is drift visibility,
  not proof of authenticity.
- Evidence citations are a support floor, not proof of relevance or
  sufficiency.
- A failed deterministic check produces `VIOLATION` against the registered rule
  version only; it is a failed configured requirement, not a legal finding.
- The contract does not verify identity, hold funds, or execute governance actions.
- Bradbury deployment is currently blocked by a node-side gas-limit rejection.

## Credits

Design informed by the GenLayer documentation, skills, SDK reference, and
equivalence principle. Starters were studied for structure only; this project's
design is original.
