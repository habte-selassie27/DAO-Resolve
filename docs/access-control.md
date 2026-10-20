# Roles and Access Control

## Roles

| Role | Capability |
|---|---|
| Owner | Set policy, assign roles, transfer ownership, act as any role |
| Rule registrar | Register, version, and deprecate rules |
| Recorder | Register proposals and append process events |
| Escalation role | Escalate a dispute to the DAO's own procedure |

The owner is set at deployment and initialized into all three functional roles.
The owner can also transfer ownership. The zero address revokes a functional
role.

## Permission matrix

| Method | Owner | Rule registrar | Recorder | Any caller | Escalation |
|---|---|---|---|---|---|
| `set_role` | yes | — | — | — | — |
| `transfer_ownership` | yes | — | — | — | — |
| `set_config` | yes | — | — | — | — |
| `set_category_vote_required` | yes | — | — | — | — |
| `register_rule` | yes | yes | — | — | — |
| `deprecate_rule` | yes | yes | — | — | — |
| `register_proposal` | yes | — | yes | — | — |
| `record_process_event` | yes | — | yes | — | — |
| `open_dispute` | yes | — | — | yes* | — |
| `submit_evidence` | yes | — | — | yes* | — |
| `evaluate_dispute` | yes | — | — | yes* | — |
| `challenge_assessment` | yes | — | — | yes* | — |
| `re_evaluate` | yes | — | — | yes* | — |
| `finalize_dispute` | yes | — | — | yes* | — |
| `withdraw_dispute` | disputant only | — | — | disputant only | — |
| `escalate_dispute` | yes | — | — | — | yes |

`*` Strict separation may block the caller when the DAO enables it.

## Strict separation

When `strict_separation` is enabled, an address that recorded any process event
for the disputed proposal cannot open, evaluate, re-evaluate, challenge, or
finalize a dispute about that proposal. The check uses the recorded event log.
Disabling strict separation allows overlapping operators, which may be
appropriate for small DAOs.

## Constants

Role names are `RULE_REGISTRAR`, `RECORDER`, and `ESCALATOR`. They are case-
insensitive on input and normalized to uppercase.

## Role addresses are pinned per rule version

A `REQUIRED_ROLE` check stores the role address in the rule version at
registration time (`StructuredCheck.role_address`). Rotating a role later does
not change how events recorded under an existing rule version are judged: to
adopt a new address, publish a new rule version.

A rule registered while the role was still unset stores the zero address and
fails every `REQUIRED_ROLE` check with `role_unset role=<role>` until a new
version is published. This keeps historical assessments reproducible.

## Trust assumptions

- **Recorders are trusted** to record process events honestly. The contract
  checks authorization, shape, ordering, and bounds; it does not verify that an
  event happened in the real world.
- **Rule registrars are trusted** to publish the rules the DAO intends to use.
  The contract enforces versions and deprecation but cannot verify that a clause
  matches an off-chain governance document.
- **Participants are untrusted.** Evidence is treated as adversarial input.
- **The escalation role is trusted** to decide when the DAO's own procedure must
  take over.

## Tests

`tests/direct/test_access_control.py` covers owner-only methods, role checks,
strict separation, ownership transfer, zero-address revocation, and configuration
bounds.

## Related documents

- [design.md](design.md)
- [threat-model.md](threat-model.md)
- [state-machine.md](state-machine.md)
