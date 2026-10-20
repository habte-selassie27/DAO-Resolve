from conftest import assessment_ctx


def payload(**overrides):
    base = {
        "verdict": "COMPLIANT",
        "confidence_band": "MEDIUM",
        "cited_clause_ids": ["R1"],
        "cited_evidence_ids": ["e1"],
        "reasoning_digest": "The evidence is sufficient.",
        # Internal run metadata: evidence this run could actually read. Not
        # model output, so it is copied into the payloads the validator sees.
        "available_evidence_ids": ["e1", "e2"],
    }
    base.update(overrides)
    return base


def run_validator(module, leader_payload, validator_payload, ctx=None, monkeypatch=None):
    if monkeypatch is not None:
        monkeypatch.setattr(module, "_interpret_once", lambda _ctx: validator_payload)
    leader = module.gl.vm.Return(calldata=leader_payload)
    return module._validate_interpretation(leader, ctx or assessment_ctx())


def test_identical_verdict_and_band_equivalent(module, monkeypatch):
    assert run_validator(
        module, payload(), payload(), monkeypatch=monkeypatch
    ) is True


def test_bands_one_step_apart_equivalent(module, monkeypatch):
    assert run_validator(
        module,
        payload(confidence_band="LOW"),
        payload(confidence_band="MEDIUM"),
        monkeypatch=monkeypatch,
    ) is True
    assert run_validator(
        module,
        payload(confidence_band="HIGH"),
        payload(confidence_band="MEDIUM"),
        monkeypatch=monkeypatch,
    ) is True


def test_bands_two_steps_apart_not_equivalent(module, monkeypatch):
    assert run_validator(
        module,
        payload(confidence_band="LOW"),
        payload(confidence_band="HIGH"),
        monkeypatch=monkeypatch,
    ) is False


def test_different_verdict_not_equivalent(module, monkeypatch):
    assert run_validator(
        module,
        payload(verdict="COMPLIANT"),
        payload(verdict="VIOLATION"),
        monkeypatch=monkeypatch,
    ) is False


def test_reasoning_text_is_ignored(module, monkeypatch):
    assert run_validator(
        module,
        payload(reasoning_digest="leader says one thing"),
        payload(reasoning_digest="validator says a different thing"),
        monkeypatch=monkeypatch,
    ) is True


def test_disjoint_evidence_citations_not_equivalent(module, monkeypatch):
    ctx = assessment_ctx(allowed_evidence_ids=["e1", "e2"])
    assert run_validator(
        module,
        payload(cited_evidence_ids=["e1"]),
        payload(cited_evidence_ids=["e2"]),
        ctx=ctx,
        monkeypatch=monkeypatch,
    ) is False


def test_overlapping_evidence_citations_equivalent(module, monkeypatch):
    ctx = assessment_ctx(allowed_evidence_ids=["e1", "e2"])
    assert run_validator(
        module,
        payload(cited_evidence_ids=["e1"]),
        payload(cited_evidence_ids=["e2", "e1"]),
        ctx=ctx,
        monkeypatch=monkeypatch,
    ) is True


def test_leader_hallucinated_citation_rejected(module, monkeypatch):
    assert run_validator(
        module,
        payload(cited_evidence_ids=["e999"]),
        payload(),
        monkeypatch=monkeypatch,
    ) is False


def test_validator_hallucinated_citation_rejected(module, monkeypatch):
    assert run_validator(
        module,
        payload(),
        payload(cited_evidence_ids=["e999"]),
        monkeypatch=monkeypatch,
    ) is False


def test_leader_compliant_against_deterministic_fail_rejected(module, monkeypatch):
    ctx = assessment_ctx(det_fail=True)
    assert run_validator(
        module,
        payload(verdict="COMPLIANT"),
        payload(verdict="COMPLIANT"),
        ctx=ctx,
        monkeypatch=monkeypatch,
    ) is False


def test_validator_compliant_against_deterministic_fail_rejected(module, monkeypatch):
    ctx = assessment_ctx(det_fail=True)
    # The leader is already normalized, so use a fake normalized leader and
    # only make the validator raw result illegal.
    assert run_validator(
        module,
        payload(verdict="VIOLATION"),
        payload(verdict="COMPLIANT"),
        ctx=ctx,
        monkeypatch=monkeypatch,
    ) is False


def test_leader_error_and_validator_error_lexical_match(module, monkeypatch):
    error = module.gl.vm.UserError("EXTERNAL: evidence source unreachable")

    def fail(_ctx):
        raise module.gl.vm.UserError("EXTERNAL: evidence source unreachable")

    monkeypatch.setattr(module, "_interpret_once", fail)
    assert module._validate_interpretation(error, assessment_ctx()) is True


def test_transient_errors_are_equivalent(module, monkeypatch):
    error = module.gl.vm.UserError("TRANSIENT: upstream timeout")

    def fail(_ctx):
        raise module.gl.vm.UserError("TRANSIENT: upstream timeout")

    monkeypatch.setattr(module, "_interpret_once", fail)
    assert module._validate_interpretation(error, assessment_ctx()) is True


def test_llm_errors_always_force_retry(module, monkeypatch):
    error = module.gl.vm.UserError("LLM_ERROR: unknown verdict value")

    def fail(_ctx):
        raise module.gl.vm.UserError("LLM_ERROR: unknown verdict value")

    monkeypatch.setattr(module, "_interpret_once", fail)
    assert module._validate_interpretation(error, assessment_ctx()) is False


def test_expected_errors_must_match_exactly(module, monkeypatch):
    error = module.gl.vm.UserError("EXPECTED: caller is not authorized")

    def fail(_ctx):
        raise module.gl.vm.UserError("EXPECTED: invalid state transition")

    monkeypatch.setattr(module, "_interpret_once", fail)
    assert module._validate_interpretation(error, assessment_ctx()) is False


def test_leader_error_but_validator_succeeds_is_rejected(module, monkeypatch):
    error = module.gl.vm.UserError("LLM_ERROR: invalid JSON")
    monkeypatch.setattr(module, "_interpret_once", lambda _ctx: payload())
    assert module._validate_interpretation(error, assessment_ctx()) is False


def test_validator_decisive_verdict_without_citation_rejected(module, monkeypatch):
    uncited = payload(cited_clause_ids=[])
    assert run_validator(
        module, payload(), uncited, monkeypatch=monkeypatch
    ) is False


def test_leader_decisive_verdict_without_citation_rejected(module, monkeypatch):
    uncited = payload(cited_clause_ids=[])
    assert run_validator(
        module, uncited, payload(), monkeypatch=monkeypatch
    ) is False


def test_decisive_verdict_with_only_unreadable_evidence_rejected(module, monkeypatch):
    """Citing an id whose fetch failed is not support, even if both sides agree."""
    ctx = assessment_ctx(allowed_evidence_ids=["e1", "e2"])
    unreadable = dict(payload(), available_evidence_ids=[])
    assert run_validator(
        module, unreadable, unreadable, ctx=ctx, monkeypatch=monkeypatch
    ) is False


def test_evidence_readable_in_only_one_run_rejected(module, monkeypatch):
    """The shared citation must have been readable in the validator's run too."""
    ctx = assessment_ctx(allowed_evidence_ids=["e1"])
    assert run_validator(
        module,
        payload(available_evidence_ids=["e1"]),
        payload(available_evidence_ids=[]),
        ctx=ctx,
        monkeypatch=monkeypatch,
    ) is False


def test_unreadable_evidence_does_not_block_inconclusive_verdict(module, monkeypatch):
    """An INCONCLUSIVE finding may rest on evidence that could not be read."""
    ctx = assessment_ctx(allowed_evidence_ids=["e1"])
    inconclusive = payload(verdict="INCONCLUSIVE", available_evidence_ids=[])
    assert run_validator(
        module, inconclusive, inconclusive, ctx=ctx, monkeypatch=monkeypatch
    ) is True
