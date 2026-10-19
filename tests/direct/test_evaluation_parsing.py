import json

import pytest

from conftest import assessment_ctx


def valid_payload():
    return {
        "verdict": "COMPLIANT",
        "confidence_band": "MEDIUM",
        "cited_clause_ids": ["R1"],
        "cited_evidence_ids": ["e1"],
        "reasoning_digest": "The evidence is sufficient.",
    }


def normalize(module, raw, ctx=None):
    return module._normalize_llm_result(raw if ctx is None else raw, ctx or assessment_ctx())


def test_valid_json_object_accepted(module):
    result = normalize(module, valid_payload())
    assert result["verdict"] == "COMPLIANT"
    assert result["confidence_band"] == "MEDIUM"
    assert result["cited_clause_ids"] == ["R1"]
    assert result["cited_evidence_ids"] == ["e1"]


def test_valid_json_string_accepted(module):
    result = normalize(module, json.dumps(valid_payload()))
    assert result["verdict"] == "COMPLIANT"


def test_markdown_fences_accepted(module):
    raw = "```json\n" + json.dumps(valid_payload()) + "\n```"
    result = normalize(module, raw)
    assert result["verdict"] == "COMPLIANT"


def test_surrounding_commentary_accepted(module):
    raw = "Here is my answer:\n" + json.dumps(valid_payload()) + "\nThanks."
    result = normalize(module, raw)
    assert result["reasoning_digest"] == "The evidence is sufficient."


def test_trailing_comma_tolerated(module):
    raw = (
        '{"verdict":"VIOLATION","confidence_band":"HIGH",'
        '"cited_clause_ids":["R1",],"cited_evidence_ids":["e1",],'
        '"reasoning_digest":"bad",}'
    )
    result = normalize(module, raw)
    assert result["verdict"] == "VIOLATION"


def test_malformed_json_rejected(module):
    with pytest.raises(Exception, match="LLM_ERROR: invalid JSON"):
        normalize(module, "{not json")


def test_empty_reply_rejected(module):
    with pytest.raises(Exception, match="LLM_ERROR: invalid JSON"):
        normalize(module, "")


def test_top_level_array_rejected(module):
    with pytest.raises(Exception, match="LLM_ERROR: JSON is not an object"):
        normalize(module, "[{}]")


def test_missing_verdict_rejected(module):
    payload = valid_payload()
    del payload["verdict"]
    with pytest.raises(Exception, match="LLM_ERROR: missing field verdict"):
        normalize(module, payload)


def test_missing_band_rejected(module):
    payload = valid_payload()
    del payload["confidence_band"]
    with pytest.raises(Exception, match="LLM_ERROR: missing field confidence_band"):
        normalize(module, payload)


def test_missing_citations_rejected(module):
    payload = valid_payload()
    del payload["cited_clause_ids"]
    with pytest.raises(Exception, match="LLM_ERROR: missing field cited_clause_ids"):
        normalize(module, payload)


def test_missing_reasoning_rejected(module):
    payload = valid_payload()
    del payload["reasoning_digest"]
    with pytest.raises(Exception, match="LLM_ERROR: missing field reasoning_digest"):
        normalize(module, payload)


def test_unknown_verdict_rejected(module):
    payload = valid_payload()
    payload["verdict"] = "MAYBE"
    with pytest.raises(Exception, match="LLM_ERROR: unknown verdict value"):
        normalize(module, payload)


def test_unknown_band_rejected(module):
    payload = valid_payload()
    payload["confidence_band"] = "CERTAIN"
    with pytest.raises(Exception, match="LLM_ERROR: unknown confidence band"):
        normalize(module, payload)


def test_enum_casing_and_whitespace_normalized(module):
    payload = valid_payload()
    payload["verdict"] = "  compliant "
    payload["confidence_band"] = " medium "
    result = normalize(module, payload)
    assert result["verdict"] == "COMPLIANT"
    assert result["confidence_band"] == "MEDIUM"


def test_aliases_accepted(module):
    raw = {
        "decision": "violation",
        "confidence": "high",
        "cited_clauses": ["R1"],
        "cited_evidence": ["e1"],
        "reasoning": "The check failed.",
    }
    result = normalize(module, raw)
    assert result["verdict"] == "VIOLATION"
    assert result["confidence_band"] == "HIGH"


def test_hallucinated_clause_id_rejected(module):
    payload = valid_payload()
    payload["cited_clause_ids"] = ["R999"]
    with pytest.raises(Exception, match="LLM_ERROR: cited id not provided"):
        normalize(module, payload)


def test_hallucinated_evidence_id_rejected(module):
    payload = valid_payload()
    payload["cited_evidence_ids"] = ["e999"]
    with pytest.raises(Exception, match="LLM_ERROR: cited id not provided"):
        normalize(module, payload)


def test_citations_must_be_a_list(module):
    payload = valid_payload()
    payload["cited_clause_ids"] = "R1"
    with pytest.raises(Exception, match="LLM_ERROR: cited_clause_ids is not a list"):
        normalize(module, payload)


def test_citations_must_be_strings(module):
    payload = valid_payload()
    payload["cited_evidence_ids"] = [1]
    with pytest.raises(Exception, match="LLM_ERROR: non-string cited_evidence_ids"):
        normalize(module, payload)


def test_too_many_citations_rejected(module):
    payload = valid_payload()
    payload["cited_clause_ids"] = ["R1"] * 17
    with pytest.raises(Exception, match="LLM_ERROR: too many cited_clause_ids"):
        normalize(module, payload)


def test_duplicate_citations_deduped_and_sorted(module):
    payload = valid_payload()
    ctx = assessment_ctx(allowed_clause_ids=["R1", "R2"], allowed_evidence_ids=["e1", "e2"])
    payload["cited_clause_ids"] = ["R2", "R1", "R2"]
    payload["cited_evidence_ids"] = ["e2", "e1", "e1"]
    result = module._normalize_llm_result(payload, ctx)
    assert result["cited_clause_ids"] == ["R1", "R2"]
    assert result["cited_evidence_ids"] == ["e1", "e2"]


def test_over_long_reasoning_is_truncated(module):
    payload = valid_payload()
    payload["reasoning_digest"] = "x" * 400
    result = normalize(module, payload)
    assert len(result["reasoning_digest"]) == 280


def test_non_string_reasoning_rejected(module):
    payload = valid_payload()
    payload["reasoning_digest"] = {"text": "no"}
    with pytest.raises(Exception, match="LLM_ERROR: reasoning is not text"):
        normalize(module, payload)


def test_deterministic_failure_cannot_become_compliant(module):
    payload = valid_payload()
    with pytest.raises(
        Exception,
        match="LLM_ERROR: model tried to override a failed deterministic check",
    ):
        normalize(module, payload, assessment_ctx(det_fail=True))


def test_non_dict_raw_rejected(module):
    with pytest.raises(Exception, match="LLM_ERROR: response is not an object"):
        normalize(module, 42)


def test_structured_checks_json_rejects_bad_threshold_type(module):
    checks = [
        {
            "check_id": "c1",
            "kind": "MIN_COUNT",
            "event_type": "APPROVAL",
            "threshold": True,
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: threshold must be an integer"):
        module._parse_checks_json(json.dumps(checks))


def test_structured_checks_json_rejects_unknown_key(module):
    checks = [
        {
            "check_id": "c1",
            "kind": "REQUIRED_EVENT",
            "event_type": "APPROVAL",
            "threshold": 0,
            "unexpected": 1,
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: unknown structured check key"):
        module._parse_checks_json(json.dumps(checks))


def test_structured_checks_json_rejects_missing_min_elapsed_events(module):
    checks = [
        {
            "check_id": "c1",
            "kind": "MIN_ELAPSED",
            "from_event_type": "A",
            "threshold": 10,
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: invalid to_event_type"):
        module._parse_checks_json(json.dumps(checks))


def test_structured_checks_json_rejects_zero_min_count(module):
    checks = [
        {
            "check_id": "c1",
            "kind": "MIN_COUNT",
            "event_type": "APPROVAL",
            "threshold": 0,
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: MIN_COUNT threshold must be positive"):
        module._parse_checks_json(json.dumps(checks))


def test_structured_checks_json_rejects_unknown_role(module):
    checks = [
        {
            "check_id": "c1",
            "kind": "REQUIRED_ROLE",
            "event_type": "APPROVAL",
            "role": "KING",
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: unknown role"):
        module._parse_checks_json(json.dumps(checks))


def test_clean_text_rejects_non_string_values(module):
    with pytest.raises(Exception, match="EXPECTED: invalid evidence_ref"):
        module._clean_text(42, 10, "evidence_ref", True)
    with pytest.raises(Exception, match="EXPECTED: invalid rule_id"):
        module._clean_id(42, "rule_id")


def test_parsers_accept_native_arrays(module):
    checks = module._parse_checks_json(
        [{"check_id": "c1", "kind": "REQUIRED_EVENT", "event_type": "REVIEW_DONE"}]
    )
    assert checks[0].check_id == "c1"
    evidence = module._parse_new_evidence_json(
        [{"side": "DISPUTANT", "kind": "TEXT_STATEMENT", "ref": "a statement"}]
    )
    assert evidence[0]["kind"] == "TEXT_STATEMENT"


def test_decisive_verdict_requires_rule_citation(module):
    for verdict in ("COMPLIANT", "VIOLATION"):
        bad = valid_payload()
        bad["verdict"] = verdict
        bad["cited_clause_ids"] = []
        with pytest.raises(
            Exception, match="LLM_ERROR: decisive verdict must cite the rule"
        ):
            normalize(module, bad)


def test_inconclusive_verdict_may_cite_nothing(module):
    payload = valid_payload()
    payload["verdict"] = "INCONCLUSIVE"
    payload["cited_clause_ids"] = []
    result = normalize(module, payload)
    assert result["verdict"] == "INCONCLUSIVE"
    assert result["cited_clause_ids"] == []


def test_decisive_verdict_requires_evidence_when_evidence_exists(module):
    for verdict in ("COMPLIANT", "VIOLATION"):
        bad = valid_payload()
        bad["verdict"] = verdict
        bad["cited_evidence_ids"] = []
        with pytest.raises(
            Exception, match="LLM_ERROR: decisive verdict must cite evidence"
        ):
            normalize(module, bad)


def test_decisive_verdict_may_skip_evidence_when_none_provided(module):
    payload = valid_payload()
    payload["cited_evidence_ids"] = []
    result = module._normalize_llm_result(
        payload, assessment_ctx(allowed_evidence_ids=[])
    )
    assert result["verdict"] == "COMPLIANT"
    assert result["cited_evidence_ids"] == []
