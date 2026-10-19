import datetime
import json

import pytest

from conftest import (
    LLM_COMPLIANT,
    add_interpretive_rule,
    add_open_dispute,
    add_proposal,
    add_review_events,
    add_rule,
    mock_llm,
    warp,
)


def iso(epoch_seconds):
    return datetime.datetime.fromtimestamp(
        epoch_seconds, tz=datetime.timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")


def seed_evaluated(dao, alice, bob, direct_vm, window=86400, max_rounds=3):
    direct_vm.sender = alice
    dao.set_config(window, max_rounds, False)
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, submitted_at=1000, voting_at=1200)
    add_open_dispute(dao)
    direct_vm.sender = bob
    dao.evaluate_dispute("D1")


def challenge(dao, direct_vm, reason="New evidence changes the assessment.", evidence=None):
    dao.challenge_assessment(
        "D1", reason, json.dumps(evidence if evidence is not None else [])
    )


def test_challenge_appends_and_re_evaluates(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    assert dao.get_dispute_status("D1") == "EVALUATED"

    direct_vm.sender = bob
    challenge(
        dao,
        direct_vm,
        evidence=[
            {
                "side": "DISPUTANT",
                "kind": "TEXT_STATEMENT",
                "ref": "The review happened after voting started.",
            }
        ],
    )
    assert dao.get_dispute_status("D1") == "CHALLENGED"
    assert dao.get_dispute("D1")["assessment_count"] == 1
    assert dao.get_dispute("D1")["challenge_count"] == 1
    records = dao.get_challenges("D1", 0, 10)
    assert len(records) == 1
    assert records[0]["new_evidence_count"] == 1

    direct_vm.sender = bob
    dao.re_evaluate("D1")
    assert dao.get_dispute_status("D1") == "RE_EVALUATED"
    history = dao.get_assessment_history("D1", 0, 10)
    assert len(history) == 2
    assert history[0]["produced_by"] == "EVALUATION"
    assert history[1]["produced_by"] == "RE_EVALUATION"
    assert history[1]["round"] == 1
    assert history[0]["assessment_id"] == "D1#a1"
    assert history[1]["assessment_id"] == "D1#a2"

    # The window was reset at the new assessment.
    with pytest.raises(Exception, match="EXPECTED: challenge window still open"):
        dao.finalize_dispute("D1")
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, iso(deadline))
    dao.finalize_dispute("D1")
    assert dao.get_dispute_status("D1") == "FINALIZED"

    # The latest assessment became the final one; history is not rewritten.
    dispute = dao.get_dispute("D1")
    assert dispute["final_assessment_id"] == "D1#a2"
    history = dao.get_assessment_history("D1", 0, 10)
    assert history[0]["is_final"] is False
    assert history[1]["is_final"] is True


def test_finalize_while_challenged_rejected(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    challenge(dao, direct_vm)
    assert dao.get_dispute_status("D1") == "CHALLENGED"
    with pytest.raises(Exception, match="EXPECTED: invalid state transition"):
        dao.finalize_dispute("D1")


def test_challenge_after_window_rejected(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=100)
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, iso(deadline + 1))
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: challenge window closed"):
        challenge(dao, direct_vm)


def test_challenge_at_exact_deadline_rejected(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=100)
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, iso(deadline))
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: challenge window closed"):
        challenge(dao, direct_vm)


def test_finalize_at_exact_deadline_allowed(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=100)
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, iso(deadline))
    direct_vm.sender = bob
    dao.finalize_dispute("D1")
    assert dao.get_dispute_status("D1") == "FINALIZED"


def test_finality_is_explicit_on_the_dispute(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=100)

    # Before finality, every assessment is provisional.
    dispute = dao.get_dispute("D1")
    assert dispute["final_assessment_id"] == ""
    assert dispute["is_final"] is False
    assert dispute["latest_assessment"]["is_final"] is False

    deadline = dispute["challenge_deadline"]
    warp(direct_vm, iso(deadline))
    direct_vm.sender = bob
    dao.finalize_dispute("D1")

    dispute = dao.get_dispute("D1")
    assert dispute["status"] == "FINALIZED"
    assert dispute["final_assessment_id"] == "D1#a1"
    assert dispute["is_final"] is True
    assert dispute["latest_assessment"]["is_final"] is True
    history = dao.get_assessment_history("D1", 0, 10)
    assert history[0]["assessment_id"] == "D1#a1"
    assert history[0]["is_final"] is True


def test_finalize_before_window_rejected(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=100)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: challenge window still open"):
        dao.finalize_dispute("D1")


def test_max_challenge_rounds(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=1000, max_rounds=1)
    direct_vm.sender = bob
    challenge(dao, direct_vm)
    dao.re_evaluate("D1")

    with pytest.raises(Exception, match="EXPECTED: maximum challenge rounds reached"):
        challenge(dao, direct_vm)


def test_zero_max_rounds_disables_challenges(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=1000, max_rounds=0)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: maximum challenge rounds reached"):
        challenge(dao, direct_vm)


def test_challenge_requires_evaluated_state(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: invalid state transition"):
        challenge(dao, direct_vm)


def test_re_evaluate_requires_challenged_state(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: invalid state transition"):
        dao.re_evaluate("D1")


def test_challenge_without_new_evidence_allowed_with_reason(
    dao, alice, bob, direct_vm
):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    challenge(dao, direct_vm, reason="The assessment ignored the recorded timeline.", evidence=[])
    assert dao.get_challenges("D1", 0, 10)[0]["new_evidence_count"] == 0
    dao.re_evaluate("D1")
    assert dao.get_dispute_status("D1") == "RE_EVALUATED"


def test_re_evaluation_prompt_includes_challenge_context(
    dao, alice, bob, direct_vm
):
    add_interpretive_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice)
    add_open_dispute(dao, rule_id="R2", dispute_id="D2")
    dao.submit_evidence("D2", "RESPONDENT", "TEXT_STATEMENT", "Adequate discussion.")
    mock_llm(direct_vm, LLM_COMPLIANT)
    direct_vm.sender = bob
    dao.evaluate_dispute("D2")

    reason = "Unique challenge: the review thread is not the one cited."
    dao.challenge_assessment("D2", reason, json.dumps([]))
    direct_vm.clear_mocks()
    direct_vm.mock_llm(
        r"(?s).*<prior_assessment>.*Unique challenge: the review thread is not the one cited\..*",
        json.dumps(LLM_COMPLIANT),
    )
    dao.re_evaluate("D2")

    history = dao.get_assessment_history("D2", 0, 10)
    assert len(history) == 2
    assert history[1]["produced_by"] == "RE_EVALUATION"
    assert history[1]["round"] == 1


def test_challenge_evidence_cap_reverts_whole_challenge(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    for index in range(31):
        dao.submit_evidence(
            "D1", "NEUTRAL", "TEXT_STATEMENT", "evidence " + str(index)
        )
    # Dispute is now EVALUATED, and submit_evidence is still allowed.
    with pytest.raises(Exception, match="EXPECTED: evidence cap reached"):
        challenge(
            dao,
            direct_vm,
            evidence=[
                {"side": "DISPUTANT", "kind": "TEXT_STATEMENT", "ref": "one"},
                {"side": "DISPUTANT", "kind": "TEXT_STATEMENT", "ref": "two"},
            ],
        )
    assert dao.get_dispute_status("D1") == "EVALUATED"
    assert dao.get_dispute("D1")["challenge_count"] == 0


def test_escalation_records_handoff_and_stops_evaluation(
    dao, alice, bob, charlie, direct_vm
):
    direct_vm.sender = alice
    dao.set_role("ESCALATOR", charlie)
    seed_evaluated(dao, alice, bob, direct_vm)

    direct_vm.sender = charlie
    dao.escalate_dispute("D1", "The DAO charter requires a token vote.")
    dispute = dao.get_dispute("D1")
    assert dispute["status"] == "ESCALATED"
    assert dispute["escalated_by"] == charlie.as_hex
    assert dispute["escalation_reason"] == "The DAO charter requires a token vote."
    assert dispute["assessment_count"] == 1
    assert dispute["final_assessment_id"] == "D1#a1"
    assert dispute["is_final"] is True

    for action in (
        lambda: dao.evaluate_dispute("D1"),
        lambda: dao.re_evaluate("D1"),
        lambda: dao.finalize_dispute("D1"),
        lambda: dao.withdraw_dispute("D1"),
    ):
        with pytest.raises(Exception):
            action()
    assert dao.get_dispute_status("D1") == "ESCALATED"


def test_escalation_requires_role(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.escalate_dispute("D1", "I want the DAO to decide.")


def test_escalate_open_dispute(dao, alice, bob, direct_vm):
    direct_vm.sender = alice
    dao.set_role("ESCALATOR", bob)
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    direct_vm.sender = bob
    dao.escalate_dispute("D1", "This must go to the DAO vote.")
    assert dao.get_dispute_status("D1") == "ESCALATED"
    # Escalated before any assessment: the handoff carries no final assessment.
    dispute = dao.get_dispute("D1")
    assert dispute["final_assessment_id"] == ""
    assert dispute["is_final"] is False


def test_category_requiring_vote_cannot_finalize(dao, alice, bob, direct_vm):
    direct_vm.sender = alice
    dao.set_category_vote_required("TIMING", True)
    seed_evaluated(dao, alice, bob, direct_vm, window=100)
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, iso(deadline))
    direct_vm.sender = bob
    with pytest.raises(
        Exception, match="EXPECTED: category requires escalation to the DAO procedure"
    ):
        dao.finalize_dispute("D1")
    # Escalation remains available.
    direct_vm.sender = alice
    dao.set_role("ESCALATOR", bob)
    direct_vm.sender = bob
    dao.escalate_dispute("D1", "Category policy requires a vote.")
    assert dao.get_dispute_status("D1") == "ESCALATED"


def test_withdraw_challenged_dispute_rejected(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    challenge(dao, direct_vm)
    direct_vm.sender = alice
    with pytest.raises(Exception, match="EXPECTED: invalid state transition"):
        dao.withdraw_dispute("D1")


def test_get_challenges_pagination(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm, window=1000, max_rounds=3)
    direct_vm.sender = bob
    challenge(dao, direct_vm, reason="first reason")
    dao.re_evaluate("D1")
    challenge(dao, direct_vm, reason="second reason")
    records = dao.get_challenges("D1", 0, 10)
    assert [record["round"] for record in records] == [1, 2]
    assert dao.get_challenges("D1", 1, 1)[0]["round"] == 2


def test_challenge_accepts_native_evidence_array(dao, alice, bob, direct_vm):
    seed_evaluated(dao, alice, bob, direct_vm)
    direct_vm.sender = bob
    dao.challenge_assessment(
        "D1",
        "Native array evidence.",
        [
            {
                "side": "RESPONDENT",
                "kind": "TEXT_STATEMENT",
                "ref": "A later record shows the review did occur.",
            }
        ],
    )
    record = dao.get_challenges("D1", 0, 10)[0]
    assert record["new_evidence_count"] == 1
    evidence = dao.get_evidence("D1", 0, 10)
    assert len(evidence) == 1
    assert evidence[0]["side"] == "RESPONDENT"
