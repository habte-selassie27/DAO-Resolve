import json

import pytest

from conftest import (
    add_proposal,
    add_review_events,
    add_rule,
    min_elapsed_checks,
)


def test_register_rule_stores_version_one(dao):
    add_rule(dao)

    rule = dao.get_rule("R1")
    assert rule["rule_id"] == "R1"
    assert rule["version"] == 1
    assert rule["status"] == "ACTIVE"
    assert rule["category"] == "TIMING"
    assert rule["interpretation"] == "DETERMINISTIC_ONLY"
    assert rule["supersedes_version"] == 0
    assert rule["structured_checks"][0]["kind"] == "MIN_ELAPSED"
    assert rule["structured_checks"][0]["threshold"] == 100


def test_register_rule_rejects_over_long_clause(dao):
    with pytest.raises(Exception, match="EXPECTED: clause_text too long"):
        dao.register_rule(
            "R1",
            "Title",
            "x" * 2001,
            "TIMING",
            "DETERMINISTIC_ONLY",
            json.dumps(min_elapsed_checks()),
        )


def test_register_rule_rejects_too_many_checks(dao):
    checks = min_elapsed_checks()
    checks = checks * 13
    for index, check in enumerate(checks):
        check["check_id"] = "c" + str(index)
    with pytest.raises(Exception, match="EXPECTED: too many structured checks"):
        add_rule(dao, checks=checks)


def test_register_rule_rejects_deterministic_rule_without_checks(dao):
    with pytest.raises(Exception, match="deterministic rule needs at least one"):
        add_rule(dao, checks=[])


def test_register_rule_rejects_invalid_checks_json(dao):
    with pytest.raises(Exception, match="EXPECTED: checks JSON is invalid"):
        dao.register_rule(
            "R1", "Title", "Clause", "TIMING", "DETERMINISTIC_ONLY", "{not json"
        )


def test_register_rule_rejects_duplicate_check_ids(dao):
    checks = min_elapsed_checks() + min_elapsed_checks()
    with pytest.raises(Exception, match="EXPECTED: duplicate check_id"):
        add_rule(dao, checks=checks)


def test_register_rule_rejects_unknown_check_kind(dao):
    checks = [
        {
            "check_id": "bad",
            "kind": "MAGIC",
            "event_type": "SUBMITTED",
            "threshold": 1,
        }
    ]
    with pytest.raises(Exception, match="EXPECTED: unknown structured check kind"):
        add_rule(dao, checks=checks)


def test_new_rule_version_deprecates_previous_and_pins_old_disputes(
    dao, alice, bob, direct_vm
):
    add_rule(dao, checks=min_elapsed_checks(100))
    add_proposal(dao)
    add_review_events(dao, alice, submitted_at=1000, voting_at=1050)
    dao.open_dispute("D1", "R1", "P1", "Voting started too early.")

    add_rule(
        dao,
        clause="Proposals require a review period of at least 50 seconds.",
        checks=min_elapsed_checks(50),
    )

    latest = dao.get_rule("R1")
    old = dao.get_rule_version("R1", 1)
    assert latest["version"] == 2
    assert latest["status"] == "ACTIVE"
    assert latest["supersedes_version"] == 1
    assert old["status"] == "DEPRECATED"
    assert old["structured_checks"][0]["threshold"] == 100

    direct_vm.sender = bob
    dao.evaluate_dispute("D1")
    history = dao.get_assessment_history("D1", 0, 10)
    assert history[0]["verdict"] == "VIOLATION"
    assert history[0]["deterministic_results"][0]["detail"] == "elapsed=50 threshold=100"


def test_deprecated_rule_cannot_open_new_dispute(dao, alice, bob):
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice)
    dao.deprecate_rule("R1")
    assert dao.get_rule("R1")["status"] == "DEPRECATED"

    with pytest.raises(Exception, match="EXPECTED: rule is deprecated"):
        dao.open_dispute("D1", "R1", "P1", "Too early.")


def test_deprecated_rule_existing_dispute_still_evaluates(dao, alice, bob, direct_vm):
    add_rule(dao)
    add_proposal(dao)
    add_review_events(dao, alice, submitted_at=1000, voting_at=1050)
    dao.open_dispute("D1", "R1", "P1", "Too early.")
    dao.deprecate_rule("R1")

    direct_vm.sender = bob
    dao.evaluate_dispute("D1")
    assert dao.get_assessment_history("D1", 0, 10)[0]["verdict"] == "VIOLATION"


def test_deprecate_rule_twice_rejected(dao):
    add_rule(dao)
    dao.deprecate_rule("R1")
    with pytest.raises(Exception, match="EXPECTED: rule already deprecated"):
        dao.deprecate_rule("R1")


def test_deprecate_unknown_rule_rejected(dao):
    with pytest.raises(Exception, match="EXPECTED: unknown rule"):
        dao.deprecate_rule("NOPE")


def test_rule_registrar_role_is_required(dao, bob, charlie, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    dao.set_role("RULE_REGISTRAR", bob)

    # Non-owner, non-registrar cannot register.
    direct_vm.sender = charlie
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        add_rule(dao)

    # Assigned registrar can register.
    direct_vm.sender = bob
    add_rule(dao)
    assert dao.get_rule("R1")["version"] == 1

    # Owner retains authority even after delegating.
    direct_vm.sender = direct_alice
    dao.deprecate_rule("R1")
    assert dao.get_rule("R1")["status"] == "DEPRECATED"


def test_set_role_rejects_unknown_role(dao, bob):
    with pytest.raises(Exception, match="EXPECTED: unknown role"):
        dao.set_role("KING", bob)


def test_set_role_is_owner_only(dao, bob, charlie, direct_vm):
    direct_vm.sender = bob
    with pytest.raises(Exception, match="EXPECTED: caller is not authorized"):
        dao.set_role("RULE_REGISTRAR", charlie)


def test_list_active_rules_pagination_and_deprecation(dao):
    add_rule(dao, rule_id="R1")
    add_rule(dao, rule_id="R2")
    add_rule(dao, rule_id="R3")
    dao.deprecate_rule("R2")

    page = dao.list_active_rules(0, 2)
    assert [item["rule_id"] for item in page] == ["R1"]

    page = dao.list_active_rules(1, 2)
    assert [item["rule_id"] for item in page] == ["R3"]
    assert [item["rule_id"] for item in dao.list_active_rules(0, 50)] == ["R1", "R3"]


def test_rule_validation_bounds(dao):
    with pytest.raises(Exception, match="EXPECTED: title too long"):
        dao.register_rule(
            "R1", "t" * 121, "Clause", "TIMING", "DETERMINISTIC_ONLY", "[]"
        )
    with pytest.raises(Exception, match="EXPECTED: unknown category"):
        dao.register_rule(
            "R1", "Title", "Clause", "NOPE", "DETERMINISTIC_ONLY", "[]"
        )
    with pytest.raises(Exception, match="EXPECTED: unknown interpretation mode"):
        dao.register_rule("R1", "Title", "Clause", "TIMING", "MAGIC", "[]")
    with pytest.raises(Exception, match="EXPECTED: invalid rule_id"):
        dao.register_rule(
            "bad id", "Title", "Clause", "TIMING", "DETERMINISTIC_ONLY", "[]"
        )


def test_rule_checks_can_be_required_event(dao, alice, bob, direct_vm):
    checks = [
        {
            "check_id": "disclosure",
            "kind": "REQUIRED_EVENT",
            "event_type": "DISCLOSURE_POSTED",
        }
    ]
    add_rule(
        dao,
        rule_id="R3",
        clause="Treasury proposals must post a recipient disclosure.",
        category="DISCLOSURE",
        checks=checks,
    )
    add_proposal(dao)
    dao.record_process_event("P1", "e1", "SUBMITTED", alice, 1000, "")
    dao.open_dispute("D1", "R3", "P1", "No disclosure was posted.")
    direct_vm.sender = bob
    dao.evaluate_dispute("D1")
    assessment = dao.get_assessment_history("D1", 0, 10)[0]
    assert assessment["verdict"] == "VIOLATION"
    assert assessment["deterministic_results"][0]["result"] == "FAIL"


def test_register_rule_accepts_native_check_array(dao):
    dao.register_rule(
        "R9",
        "Native array checks",
        "Voting must start after a submission event.",
        "TIMING",
        "DETERMINISTIC_ONLY",
        min_elapsed_checks(),
    )
    rule = dao.get_rule("R9")
    assert rule["structured_checks"][0]["kind"] == "MIN_ELAPSED"
    assert rule["structured_checks"][0]["threshold"] == 100


def test_register_rule_rejects_non_list_check_value(dao):
    with pytest.raises(Exception, match="EXPECTED: checks JSON is invalid"):
        dao.register_rule(
            "R9", "Title", "Clause", "TIMING", "DETERMINISTIC_ONLY", "not json"
        )
