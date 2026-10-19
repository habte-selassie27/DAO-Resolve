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

## Equivalence rule

A validator accepts the leader result only when all of these hold:

1. **Verdict matches exactly** — `COMPLIANT`, `VIOLATION`, or `INCONCLUSIVE`.
2. **Confidence bands are adjacent or equal** — `LOW <-> MEDIUM <-> HIGH`.
   Two steps apart is not equivalent.
3. **Citations are valid** — every cited clause and evidence id is a subset of
   the ids that were provided.
4. **Decisive verdicts are cited** — a `COMPLIANT` or `VIOLATION` verdict must
   cite the pinned rule. When evidence ids were provided, it must cite at least
   one evidence id.
5. **Evidence overlap** — when evidence ids were provided and the leader's
   verdict is not `INCONCLUSIVE`, the validator must have relied on at least one
   evidence id that the leader also cited. This rejects "different evidence,
   same answer."
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
| Deterministic failure overridden by `COMPLIANT` | `LLM_ERROR:`; no assessment appended |
| Web source unavailable | Marked `UNAVAILABLE`; verdict may be `INCONCLUSIVE` |
| Transient upstream failure | `TRANSIENT:`; validators may agree on retry |
| Leader error and validator error | `EXPECTED` / `EXTERNAL` must match exactly; `TRANSIENT` matches; `LLM_ERROR` always forces retry |

After consensus, the agreed result is normalized again before storage. State is
mutated only after the consensus block returns.

## Re-evaluation

The same block is used with additional context:

- Prior verdict, confidence band, round, and reasoning digest.
- Challenge reason and new-evidence count.

The same equivalence rule applies. The prior assessment is never overwritten; the
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
  overlap, hallucination rejection, error equivalence, and deterministic
  override rejection.
- `tests/direct/test_web_evidence.py` covers fetch limits, unavailable sources,
  prompt escaping, and stable error prefixes.
- `tests/integration/test_consensus.py` exercises real leader/validator
  agreement and a challenge round trip on StudioNet.

See [testing.md](testing.md) for commands and current results.

## Related documents

- [design.md](design.md)
- [threat-model.md](threat-model.md)
- [examples.md](examples.md)
- [AGENTS.md](../AGENTS.md)
