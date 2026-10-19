import pytest

from conftest import (
    add_open_dispute,
    add_proposal,
    add_review_events,
    add_rule,
)


def test_recorder_can_register_proposal_and_append_events(dao, alice):
    add_proposal(dao)
    add_review_events(dao, alice, submitted_at=1000, voting_at=1050)

    proposal = dao.get_proposal("P1")
    assert proposal["proposal_id"] == "P1"
    assert proposal["event_count"] == 2
    events = dao.get_events("P1", 0, 10)
    assert [event["event_id"] for event in events] == ["e1", "e2"]
    assert events[0]["event_type"] == "SUBMITTED"
    assert events[0]["timestamp_ref"] == 1000
    assert events[0]["recorded_by"] == dao.get_config()["owner"]


def test_non_recorder_cannot_register_proposal_or_record_event(
    dao, alice, bob, direct_vm
):
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        add_proposal(dao)

    direct_vm.sender = alice
    add_proposal(dao)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.record_process_event("P1", "e1", "SUBMITTED", alice, 1000, "")


def test_assigned_recorder_can_record(dao, alice, bob, direct_vm):
    direct_vm.sender = alice
    dao.set_role("RECORDER", bob)
    direct_vm.sender = bob
    add_proposal(dao)
    add_review_events(dao, alice)
    assert dao.get_proposal("P1")["event_count"] == 2


def test_event_cap(dao, alice):
    add_proposal(dao)
    for index in range(128):
        dao.record_process_event(
            "P1", "e" + str(index), "STEP", alice, 1000 + index, ""
        )
    with pytest.raises(Exception, match="EXPECTED: process event cap reached"):
        dao.record_process_event("P1", "overflow", "STEP", alice, 2000, "")


def test_duplicate_event_id_rejected(dao, alice):
    add_proposal(dao)
    dao.record_process_event("P1", "e1", "SUBMITTED", alice, 1000, "")
    with pytest.raises(Exception, match="EXPECTED: duplicate event_id"):
        dao.record_process_event("P1", "e1", "SUBMITTED", alice, 1001, "")


def test_non_monotonic_timestamp_rejected(dao, alice):
    add_proposal(dao)
    dao.record_process_event("P1", "e1", "SUBMITTED", alice, 1000, "")
    with pytest.raises(Exception, match="EXPECTED: event timestamp is not monotonic"):
        dao.record_process_event("P1", "e2", "VOTING_STARTED", alice, 900, "")


def test_future_event_timestamp_rejected(dao, alice):
    add_proposal(dao)
    with pytest.raises(Exception, match="EXPECTED: event timestamp is in the future"):
        dao.record_process_event("P1", "e1", "SUBMITTED", alice, 9999999999, "")


def test_event_pagination(dao, alice):
    add_proposal(dao)
    for index in range(5):
        dao.record_process_event(
            "P1", "e" + str(index), "STEP", alice, 1000 + index, ""
        )
    page = dao.get_events("P1", 1, 2)
    assert [event["event_id"] for event in page] == ["e1", "e2"]
    assert dao.get_events("P1", 4, 10)[0]["event_id"] == "e4"


def test_open_dispute_requires_active_rule_and_known_proposal(dao, alice):
    add_rule(dao)
    with pytest.raises(Exception, match="EXPECTED: unknown proposal"):
        dao.open_dispute("D1", "R1", "NOPE", "claim")

    add_proposal(dao)
    with pytest.raises(Exception, match="EXPECTED: unknown rule"):
        dao.open_dispute("D1", "NOPE", "P1", "claim")

    dao.open_dispute("D1", "R1", "P1", "claim")
    assert dao.get_dispute_status("D1") == "OPEN"


def test_duplicate_dispute_rejected(dao):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    with pytest.raises(Exception, match="EXPECTED: dispute already exists"):
        add_open_dispute(dao)


def test_claim_bounds(dao):
    add_rule(dao)
    add_proposal(dao)
    with pytest.raises(Exception, match="EXPECTED: claim_text too long"):
        dao.open_dispute("D1", "R1", "P1", "x" * 2001)
    with pytest.raises(Exception, match="EXPECTED: empty claim_text"):
        dao.open_dispute("D1", "R1", "P1", "   ")


def test_submit_evidence_and_cap(dao, alice):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)

    for index in range(32):
        dao.submit_evidence(
            "D1", "NEUTRAL", "TEXT_STATEMENT", "evidence item " + str(index)
        )

    evidence = dao.get_evidence("D1", 0, 50)
    assert len(evidence) == 32
    assert evidence[0]["evidence_id"] == "D1#e1"
    assert evidence[31]["evidence_id"] == "D1#e32"
    assert evidence[0]["submitted_by"] == dao.get_config()["owner"]

    with pytest.raises(Exception, match="EXPECTED: evidence cap reached"):
        dao.submit_evidence("D1", "NEUTRAL", "TEXT_STATEMENT", "overflow")


def test_evidence_side_and_kind_labels(dao, alice):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    dao.submit_evidence("D1", "disputant", "text_statement", "a statement")
    dao.submit_evidence("D1", "RESPONDENT", "event_ref", "e1")
    evidence = dao.get_evidence("D1", 0, 10)
    assert evidence[0]["side"] == "DISPUTANT"
    assert evidence[0]["kind"] == "TEXT_STATEMENT"
    assert evidence[1]["side"] == "RESPONDENT"
    assert evidence[1]["kind"] == "EVENT_REF"


def test_evidence_ref_validation(dao):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)

    with pytest.raises(Exception, match="EXPECTED: evidence URL must be http or https"):
        dao.submit_evidence("D1", "NEUTRAL", "URL", "file:///etc/passwd")
    with pytest.raises(Exception, match="EXPECTED: evidence text too long"):
        dao.submit_evidence("D1", "NEUTRAL", "TEXT_STATEMENT", "x" * 2001)
    with pytest.raises(Exception, match="EXPECTED: invalid evidence side"):
        dao.submit_evidence("D1", "KING", "TEXT_STATEMENT", "x")
    with pytest.raises(Exception, match="EXPECTED: invalid evidence kind"):
        dao.submit_evidence("D1", "NEUTRAL", "MAGIC", "x")


def test_withdraw_requires_disputant_and_allowed_state(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)

    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.withdraw_dispute("D1")

    direct_vm.sender = alice
    dao.withdraw_dispute("D1")
    assert dao.get_dispute_status("D1") == "WITHDRAWN"

    with pytest.raises(Exception, match="EXPECTED: invalid state transition"):
        dao.submit_evidence("D1", "NEUTRAL", "TEXT_STATEMENT", "late")


def test_withdraw_evaluated_dispute(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, voting_at=1300)
    add_open_dispute(dao)
    direct_vm.sender = bob
    dao.evaluate_dispute("D1")
    assert dao.get_dispute_status("D1") == "EVALUATED"

    direct_vm.sender = alice
    dao.withdraw_dispute("D1")
    assert dao.get_dispute_status("D1") == "WITHDRAWN"


def test_unknown_dispute_views(dao):
    with pytest.raises(Exception, match="EXPECTED: unknown dispute"):
        dao.get_dispute("NOPE")
    with pytest.raises(Exception, match="EXPECTED: unknown dispute"):
        dao.get_evidence("NOPE", 0, 10)
    with pytest.raises(Exception, match="EXPECTED: unknown dispute"):
        dao.get_assessment_history("NOPE", 0, 10)
