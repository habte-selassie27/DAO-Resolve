# Glossary

**Assessment** — The contract's recorded evaluation of a dispute against a pinned
rule version. Advisory, not a legal ruling.

**Challenge** — A participant's objection to the latest assessment, with a
bounded reason and optional new evidence.

**Confidence band** — A coarse `LOW` / `MEDIUM` / `HIGH` label attached to an
assessment. It is not a numeric probability.

**Deterministic check** — A rule check that code can decide exactly, such as a
required event or a minimum elapsed period.

**Dispute** — A request to assess whether a proposal or governance action complied
with a rule version.

**Equivalence rule** — The written rule that defines when leader and validator
outputs count as agreement.

**Escalation** — A recorded handoff to the DAO's own voting or appeal procedure.
The contract does not execute the procedure.

**Evidence item** — A bounded reference submitted by a participant: a URL, an
event reference, or a text statement.

**Evidence fingerprint** (`web_digest`) — A bounded record of the evidence the
leader actually read for an assessment (`evidence_id=length:prefix`, or
`evidence_id=UNAVAILABLE`). It makes source drift and leader/validator
divergence auditable. It is not a cryptographic hash, not proof of
authenticity, and not part of the consensus comparison.

**Intelligent Contract** — A GenLayer contract that can use non-deterministic
operations under validator consensus.

**Leader** — The validator that proposes a result for a non-deterministic call.

**Pinned rule version** — The `rule_id` and `rule_version` stored in a dispute
when it is opened. Later rule edits do not change it.

**Process event** — An append-only record supplied by an authorized recorder,
such as a submission or a review completion.

**Rule** — A natural-language governance clause registered by the DAO, optionally
with deterministic structured checks.

**Structured check** — A machine-checkable condition attached to a rule, such as
`MIN_ELAPSED`, `REQUIRED_EVENT`, `MIN_COUNT`, or `REQUIRED_ROLE`.

**Validator** — A GenLayer validator that independently derives a result and
compares it under the equivalence rule.
