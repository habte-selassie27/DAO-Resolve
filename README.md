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

## Verified status

| Item | Result |
|---|---|
| Contract | `contracts/dao_resolve.py` (1,395 lines) |
| Lint | `genvm-lint` clean, 3 checks passed (one informational newer-runner notice) |
| Direct tests | 157 passed in 5.77s (`pytest tests/direct/ -q`) |
| Integration tests | 3 passed in 243.40s on StudioNet, as recorded in `deployments/studionet.md` |
| StudioNet deployment (recorded revision) | `0x48179D48495B7199a3FCb939c3f0F73a23c50b70` |
| Bradbury deployment | Blocked by a node-side "gas limit too high" rejection; no funds spent |

> **Deployed revision note:** the StudioNet record documents the revision that
> was deployed and exercised. The current working tree contains later contract
> changes (pinned `REQUIRED_ROLE` addresses, improved multi-pair `MIN_ELAPSED`
> handling, evidence-overlap checking, and prompt refinements). Those changes are
> covered by the 157 direct tests but have not been redeployed. Do not assume the
> on-chain code is byte-identical to `contracts/dao_resolve.py`.

StudioNet explorer:

- Contract: https://explorer-studio.genlayer.com/address/0x48179D48495B7199a3FCb939c3f0F73a23c50b70
- Deploy transaction: https://explorer-studio.genlayer.com/tx/0x4889cd93bf8ce27b2107c11e474bfea3e06e44fa2f0d6d4ff8fd241a592c84ab

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

Exact signatures are documented in [docs/api.md](docs/api.md).

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
[docs/deployment.md](docs/deployment.md).

## Documentation

- [AGENTS.md](AGENTS.md) — operating rules and full project specification
- [docs/design.md](docs/design.md) — design overview
- [docs/domain-model.md](docs/domain-model.md) — entities and fields
- [docs/state-machine.md](docs/state-machine.md) — transitions and guards
- [docs/access-control.md](docs/access-control.md) — roles and trust assumptions
- [docs/limits.md](docs/limits.md) — bounded inputs and lifecycle limits
- [docs/api.md](docs/api.md) — public interface
- [docs/equivalence.md](docs/equivalence.md) — consensus and equivalence design
- [docs/threat-model.md](docs/threat-model.md) — threats and safeguards
- [docs/examples.md](docs/examples.md) — worked scenarios
- [docs/testing.md](docs/testing.md) — test strategy and quality gates
- [docs/deployment.md](docs/deployment.md) — deployment procedure
- [docs/glossary.md](docs/glossary.md) — terms used by the project

## Limitations

- Recorders are trusted to record process events honestly.
- Rule registrars are trusted to publish the rules the DAO intends to use.
- Assessments are advisory unless a DAO explicitly wires them into its process.
- External evidence can change, disappear, or be manipulated.
- The contract does not verify identity, hold funds, or execute governance actions.
- Bradbury deployment is currently blocked by a node-side gas-limit rejection.

## Credits

Design informed by the GenLayer documentation, skills, SDK reference, and
equivalence principle. Starters were studied for structure only; this project's
design is original.
