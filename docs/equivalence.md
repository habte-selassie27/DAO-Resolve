# Equivalence Design

## Overview

DAOResolve has one non-deterministic consensus block, used both for initial
evaluation and for re-evaluation. Web evidence fetching happens inside that
block. The block returns a constrained result:

```json
{
  "verdict": "COMPLIANT | VIOLATION | INCONCLUSIVE",
  "confidence_band": "LOW | MEDIUM | HIGH",
  "cited_clause_ids": ["R1"],
  "cited_evidence_ids": ["D1#e1"],
  "reasoning_digest": "<=280 chars"
}
```

The implementation uses `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`:

- `leader_fn` calls `_interpret_once(ctx)`.
- `validator_fn` independently calls `_interpret_once(ctx)` and compares its own
  normalized result with the leader's result under `_validate_interpretation`.

`strict_eq` is not used. Two honest runs can differ in wording, confidence, and
citation subsets. The equivalence rule compares the decision and enforces
invariants rather than requiring identical text.

## Consensus block

| Field | Design |
|---|---|
| Call name | `interpret_clause` (internal `_interpret_once`) |
| Purpose | Decide whether evidence satisfies an ambiguous clause |
| Inputs | Pinned clause, proposal metadata, claim, bounded events, deterministic results, bounded evidence, prior assessment and challenge for re-evaluation |
| Non-deterministic sources | Web fetch (up to 3 URLs) and LLM interpretation |
| Leader produces | Normalized constrained JSON object |
| Validator checks | Independently derives the same object and applies the equivalence rule |

### Evidence handling

- `URL` evidence is fetched with `gl.nondet.web.get`.
- Unreachable, non-200, empty, or over-limit pages are marked `UNAVAILABLE`.
- Only the first 3 URLs are fetched; additional URLs are marked unavailable.
- Pages are capped at 3,000 characters.
- `TEXT_STATEMENT` and `EVENT_REF` are passed as bounded text.
- All interpolated text is escaped before insertion into prompt delimiters.
- Evidence is labeled by side and presented symmetrically. The disputant's
  claim is explicitly marked as an unverified assertion, not proof.
- Each item carries an `available="true|false"` attribute. Content that could
  not be read is shown as `UNAVAILABLE` and cannot support a decisive verdict.

### Snapshot fingerprint (drift visibility)

Each run that gathers evidence computes a bounded fingerprint of what it
actually saw: `evidence_id=character_count:prefix` per item, or
`evidence_id=UNAVAILABLE` when a source could not be read. The leader's
fingerprint travels with the agreed result and is stored on the assessment as
`web_digest` (512 characters max).

- The fingerprint is **not** part of consensus. It is an audit artifact: it
  shows which page content the leader's assessment was based on, and makes
  source drift visible after the fact.
- It is a change detector, not a cryptographic hash and not proof of
  authenticity. A tampered page yields a different fingerprint, but an
  authentic-looking page is not thereby authentic.
- Leader and validator fetch independently, so their fingerprints may differ.
  That is expected: consensus compares decisions, not page bytes. A verdict
  that survives that difference is evidence of robustness; a verdict that
  flips when the page changes is a signal for the challenge path.
- Drift has one hard edge: if a source the leader cited becomes unreadable for
  the validator, the validator cannot confirm readable support, so consensus
  fails and nothing is stored rather than agreeing on an unreadable citation.
- Deterministic assessments record an empty fingerprint: no page was fetched.

## Equivalence rule

A validator accepts the leader result only when all of these hold:

1. **Verdict matches exactly** — `COMPLIANT`, `VIOLATION`, or `INCONCLUSIVE`.
2. **Confidence bands are adjacent or equal** — `LOW <-> MEDIUM <-> HIGH`.
   Two steps apart is not equivalent.
3. **Citations are valid** — every cited clause and evidence id is a subset of
   the ids that were provided.
4. **Decisive verdicts are cited** — a `COMPLIANT` or `VIOLATION` verdict must
   cite the pinned rule. When evidence ids were provided, it must cite at least
   one evidence id. When no evidence was submitted at all, the rule citation
   alone is sufficient: recorded events can decide an interpretive clause.
   This is a deliberate policy (recorded events are evidence the DAO itself
   supplied), and it is covered by a direct test.
5. **Evidence overlap and readability** — when evidence ids were provided and
   the leader's verdict is not `INCONCLUSIVE`, there must be at least one
   evidence id that the leader cited, the validator also cited, and **both
   runs could actually read**. This rejects "different evidence, same answer"
   and agreement that rests only on a source that returned 503 or was never
   fetched. Each run enforces the same floor locally: a decisive verdict that
   cites no readable evidence fails with
   `LLM_ERROR: decisive verdict cites no readable evidence` before consensus is
   even compared. `INCONCLUSIVE` is exempt: a finding of insufficiency may
   legitimately rest on unreadable sources.
6. **Deterministic consistency** — if any deterministic check failed, neither
   the leader nor the validator may return `COMPLIANT`.
7. **Reasoning is ignored** — `reasoning_digest` is stored for humans but is not
   compared.

A validator that agrees with malformed or inconsistent output is a bug.

## Normalization

Before comparison:

- Markdown fences and surrounding commentary are stripped from JSON.
- Trailing commas are tolerated.
- The top-level value must be an object.
- Enums are trimmed and uppercased, then checked against the allowed set.
- Documented aliases are accepted (`decision`/`outcome` for `verdict`,
  `confidence`/`band` for `confidence_band`, and similar citation aliases).
- Cited ids are deduplicated and sorted.
- `reasoning_digest` is trimmed and truncated to 280 characters.
- Invalid output raises a stable `LLM_ERROR:`.

## Failure behavior

| Failure | Result |
|---|---|
| Invalid JSON / missing key / unknown enum | `LLM_ERROR:`; no assessment appended |
| Hallucinated citation | `LLM_ERROR: cited id not provided` |
| Decisive verdict without rule or evidence citation | `LLM_ERROR:`; no assessment appended |
| Decisive verdict citing only unreadable evidence | `LLM_ERROR:`; no assessment appended |
| Deterministic failure overridden by `COMPLIANT` | `LLM_ERROR:`; no assessment appended |
| Web source unavailable | Marked `UNAVAILABLE`; verdict may be `INCONCLUSIVE` |
| Leader and validator saw different page content | Not an error: consensus compares decisions, not page bytes. The leader's fingerprint is stored so the drift is auditable |
| The shared cited source became unreadable for one run | Consensus fails: readable support cannot be confirmed; nothing is stored, retry or escalate |
| Transient upstream failure | `TRANSIENT:`; validators may agree on retry |
| Leader error and validator error | `EXPECTED` / `EXTERNAL` must match exactly; `TRANSIENT` matches; `LLM_ERROR` always forces retry |

After consensus, the agreed result is normalized again before storage. State is
mutated only after the consensus block returns.

A failed consensus is **not** an `INCONCLUSIVE` assessment. Nothing is
appended, the dispute keeps its prior status and history, and the participant
may call `evaluate_dispute` or `re_evaluate` again. If repeated attempts do
not converge, the escalation role can hand the dispute to the DAO's own
procedure.

## Re-evaluation

The same block is used with additional context:

- Prior verdict, confidence band, round, and reasoning digest.
- Challenge reason and new-evidence count.

The same equivalence rule applies. The prompt labels the prior assessment as a
prior opinion rather than ground truth and tells the model to re-derive the
verdict from the clause, events, and evidence, so a persuasive challenge can
correct an earlier assessment. The prior assessment is never overwritten; the
new assessment is appended with `produced_by = RE_EVALUATION`.

## Why not `strict_eq`

`strict_eq` is appropriate only for exactly reproducible normalized output. LLM
interpretation and changing web pages are not reproducible. Comparing reasoning
text would reject honest consensus and reward wording coincidence.

## Tests

- `tests/direct/test_evaluation_parsing.py` covers JSON parsing, aliases,
  normalization, citation bounds, deterministic consistency, and citation
  requirements.
- `tests/direct/test_equivalence_helpers.py` covers band adjacency, citation
  overlap, hallucination rejection, error equivalence, deterministic override
  rejection, and readable-support rejection (unreadable evidence cited, or
  readable in only one run; `INCONCLUSIVE` exempt).
- `tests/direct/test_web_evidence.py` covers fetch limits, unavailable sources,
  prompt escaping, stable error prefixes, the snapshot fingerprint, page drift
  between the leader's fetch and the validator's re-fetch, and rejection of a
  decisive verdict that cites only an unreadable source.
- `tests/direct/test_challenges.py` covers challenge effects: no reason and no
  evidence, irrelevant evidence, contradictory evidence, and a persuasive
  correction that flips the verdict.
- `tests/integration/test_consensus.py` exercises real leader/validator
  agreement and a challenge round trip on StudioNet.

Run `pytest tests/direct/ -v` for the direct suite and
`gltest tests/integration/ -v -s --network studionet` for real consensus.

## Related documents

- [design.md](design.md)
- [threat-model.md](threat-model.md)
- [examples.md](examples.md)
- [AGENTS.md](../AGENTS.md)
