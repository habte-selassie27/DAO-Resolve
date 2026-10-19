import json

import pytest

from conftest import (
    add_open_dispute,
    add_proposal,
    add_review_events,
    add_rule,
    warp,
)


def test_owner_only_methods_reject_non_owner(dao, bob, direct_vm):
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.set_role("RULE_REGISTRAR", bob)
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.transfer_ownership(bob)
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.set_config(86400, 3, True)
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.set_category_vote_required("TIMING", True)


def test_rule_registrar_requires_role(dao, bob, charlie, direct_vm):
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        add_rule(dao)
    direct_vm.sender = charlie
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.deprecate_rule("R1")
    # Nothing was created.
    with pytest.raises(Exception, match="EXPECTED: unknown rule"):
        dao.get_rule("R1")


def test_recorder_requires_role(dao, bob, direct_vm):
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        add_proposal(dao)
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.record_process_event("P1", "e1", "SUBMITTED", bob, 1000, "")


def test_escalator_requires_role(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.escalate_dispute("D1", "The DAO should decide.")


def test_any_participant_can_evaluate_challenge_and_finalize(
    dao, alice, bob, charlie, direct_vm
):
    direct_vm.sender = alice
    dao.set_config(100, 3, False)
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, voting_at=1200)
    add_open_dispute(dao)

    direct_vm.sender = bob
    dao.evaluate_dispute("D1")
    dao.challenge_assessment("D1", "Please re-check the timeline.", "[]")
    direct_vm.sender = charlie
    dao.re_evaluate("D1")
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, fmt_deadline(deadline))
    direct_vm.sender = bob
    dao.finalize_dispute("D1")
    assert dao.get_dispute_status("D1") == "FINALIZED"


def fmt_deadline(epoch_seconds):
    import datetime

    return datetime.datetime.fromtimestamp(
        epoch_seconds, tz=datetime.timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")


def test_withdraw_only_disputant(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_open_dispute(dao)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.withdraw_dispute("D1")
    direct_vm.sender = alice
    dao.withdraw_dispute("D1")
    assert dao.get_dispute_status("D1") == "WITHDRAWN"


def test_strict_separation_blocks_recorder_everywhere(dao, alice, bob, direct_vm):
    direct_vm.sender = alice
    dao.set_config(100, 2, True)
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, voting_at=1200)

    # The recorder cannot open a dispute about their own recorded events.
    with pytest.raises(Exception, match="EXPECTED: caller recorded the disputed events"):
        dao.open_dispute("D1", "R1", "P1", "The process was flawed.")

    # A different participant can open it.
    direct_vm.sender = bob
    dao.open_dispute("D1", "R1", "P1", "The process was flawed.")

    # The recorder cannot evaluate, challenge, or finalize.
    direct_vm.sender = alice
    with pytest.raises(Exception, match="EXPECTED: caller recorded the disputed events"):
        dao.evaluate_dispute("D1")

    direct_vm.sender = bob
    dao.evaluate_dispute("D1")

    direct_vm.sender = alice
    with pytest.raises(Exception, match="EXPECTED: caller recorded the disputed events"):
        dao.challenge_assessment("D1", "Recorder challenge.", "[]")

    direct_vm.sender = bob
    dao.challenge_assessment("D1", "Participant challenge.", "[]")
    dao.re_evaluate("D1")
    deadline = dao.get_dispute("D1")["challenge_deadline"]
    warp(direct_vm, fmt_deadline(deadline))

    direct_vm.sender = alice
    with pytest.raises(Exception, match="EXPECTED: caller recorded the disputed events"):
        dao.finalize_dispute("D1")

    direct_vm.sender = bob
    dao.finalize_dispute("D1")
    assert dao.get_dispute_status("D1") == "FINALIZED"


def test_strict_separation_disabled_allows_recorder(dao, alice, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, voting_at=1200)
    add_open_dispute(dao)
    dao.evaluate_dispute("D1")
    assert dao.get_dispute_status("D1") == "EVALUATED"


def test_owner_can_act_as_every_role(dao, alice, bob, direct_vm):
    # Alice is owner and initial role holder. She can register, record, open,
    # evaluate, challenge, and escalate without delegating anything.
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, voting_at=1200)
    add_open_dispute(dao)
    dao.evaluate_dispute("D1")
    dao.challenge_assessment("D1", "Owner challenge.", "[]")
    dao.re_evaluate("D1")
    dao.escalate_dispute("D1", "Owner escalation.")
    assert dao.get_dispute_status("D1") == "ESCALATED"


def test_transfer_ownership(dao, alice, bob, direct_vm):
    direct_vm.sender = alice
    dao.transfer_ownership(bob)
    assert dao.get_config()["owner"] == bob.as_hex

    direct_vm.sender = alice
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.set_config(86400, 3, False)

    direct_vm.sender = bob
    dao.set_config(86400, 3, False)
    assert dao.get_config()["challenge_window"] == 86400


def test_transfer_to_zero_rejected(dao, module):
    with pytest.raises(Exception, match="EXPECTED: invalid new owner"):
        dao.transfer_ownership(module.ZERO_ADDRESS)


def test_config_bounds(dao):
    with pytest.raises(Exception, match="EXPECTED: challenge window out of bounds"):
        dao.set_config(59, 3, False)
    with pytest.raises(Exception, match="EXPECTED: challenge window out of bounds"):
        dao.set_config(2592001, 3, False)
    with pytest.raises(Exception, match="EXPECTED: challenge rounds out of bounds"):
        dao.set_config(86400, 11, False)
    dao.set_config(60, 0, True)
    config = dao.get_config()
    assert config["challenge_window"] == 60
    assert config["max_challenge_rounds"] == 0
    assert config["strict_separation"] is True


def test_category_vote_required_validation(dao):
    with pytest.raises(Exception, match="EXPECTED: unknown category"):
        dao.set_category_vote_required("KING", True)
    dao.set_category_vote_required("DISCLOSURE", True)
    assert dao.get_config()["vote_required_categories"] == ["DISCLOSURE"]
    dao.set_category_vote_required("DISCLOSURE", False)
    assert dao.get_config()["vote_required_categories"] == []


def test_zero_role_address_revokes(dao, alice, bob, direct_vm, module):
    direct_vm.sender = alice
    dao.set_role("RECORDER", bob)
    direct_vm.sender = bob
    add_proposal(dao)

    direct_vm.sender = alice
    dao.set_role("RECORDER", module.ZERO_ADDRESS)
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        add_proposal(dao, proposal_id="P2")


def test_get_config_reports_limits(dao):
    config = dao.get_config()
    assert config["limits"]["max_clause_len"] == 2000
    assert config["limits"]["max_claim_len"] == 2000
    assert config["limits"]["max_evidence_per_dispute"] == 32
    assert config["limits"]["max_events_per_proposal"] == 128
    assert config["limits"]["max_challenge_rounds"] == 10


def test_hex_string_addresses_are_normalized(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    dao.record_process_event("P1", "e1", "SUBMITTED", alice.as_hex, 1000, "")
    assert dao.get_events("P1", 0, 10)[0]["actor"] == alice.as_hex

    direct_vm.sender = alice
    dao.set_role("RECORDER", bob.as_hex)
    direct_vm.sender = bob
    add_proposal(dao, proposal_id="P2")
    assert dao.get_proposal("P2")["created_by"] == bob.as_hex

    direct_vm.sender = alice
    dao.transfer_ownership(bob.as_hex)
    assert dao.get_config()["owner"] == bob.as_hex
