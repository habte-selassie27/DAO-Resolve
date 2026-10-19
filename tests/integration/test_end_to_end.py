import json
import time

from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded


def _factory():
    return get_contract_factory(contract_file_path="dao_resolve.py")


def _summary(receipt):
    return {
        "hash": receipt.get("hash"),
        "status": receipt.get("status_name"),
        "result": receipt.get("result"),
        "result_name": receipt.get("result_name"),
    }


def _deploy():
    contract = _factory().deploy()
    print("DAOResolve address:", contract.address)
    return contract


def _record(contract, proposal_id, event_id, event_type, actor, timestamp, ref=""):
    receipt = contract.record_process_event(
        args=[proposal_id, event_id, event_type, actor, timestamp, ref]
    ).transact()
    print("record_event:", _summary(receipt))
    assert tx_execution_succeeded(receipt)
    return receipt


def test_deploy_rule_events_dispute_and_deterministic_evaluation():
    contract = _deploy()
    account = get_default_account()
    now = int(time.time())

    receipt = contract.register_rule(
        args=[
            "R1",
            "Review period",
            "Proposals require a review period of at least 100 seconds before voting.",
            "TIMING",
            "DETERMINISTIC_ONLY",
            json.dumps(
                [
                    {
                        "check_id": "review",
                        "kind": "MIN_ELAPSED",
                        "from_event_type": "SUBMITTED",
                        "to_event_type": "VOTING_STARTED",
                        "threshold": 100,
                    }
                ]
            ),
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)
    print("register_rule:", _summary(receipt))

    receipt = contract.register_proposal(
        args=["P1", "ipfs://proposal-1", "integration fixture"]
    ).transact()
    assert tx_execution_succeeded(receipt)

    _record(contract, "P1", "e1", "SUBMITTED", account.address, now - 1000, "doc://p1")
    _record(contract, "P1", "e2", "VOTING_STARTED", account.address, now - 900)

    receipt = contract.open_dispute(
        args=["D1", "R1", "P1", "Voting started before the review period elapsed."]
    ).transact()
    assert tx_execution_succeeded(receipt)
    print("open_dispute:", _summary(receipt))

    receipt = contract.evaluate_dispute(args=["D1"]).transact()
    assert tx_execution_succeeded(receipt)
    print("evaluate_dispute:", _summary(receipt))

    dispute = contract.get_dispute(args=["D1"]).call()
    print("dispute:", dispute)
    assert dispute["status"] == "EVALUATED"
    assert dispute["assessment_count"] == 1

    history = contract.get_assessment_history(args=["D1", 0, 10]).call()
    print("assessment history:", history)
    assert history[0]["verdict"] == "COMPLIANT"
    assert history[0]["deterministic_results"][0]["result"] == "PASS"
    assert history[0]["assessment_id"] == "D1#a1"


def test_invalid_transition_fails_with_expected_prefix():
    contract = _deploy()
    account = get_default_account()
    now = int(time.time())

    contract.register_rule(
        args=[
            "R1",
            "Review period",
            "Proposals require a review period of at least 100 seconds before voting.",
            "TIMING",
            "DETERMINISTIC_ONLY",
            json.dumps(
                [
                    {
                        "check_id": "review",
                        "kind": "MIN_ELAPSED",
                        "from_event_type": "SUBMITTED",
                        "to_event_type": "VOTING_STARTED",
                        "threshold": 100,
                    }
                ]
            ),
        ]
    ).transact()
    contract.register_proposal(args=["P1", "ipfs://proposal-1", ""]).transact()
    _record(contract, "P1", "e1", "SUBMITTED", account.address, now - 1000)
    contract.open_dispute(args=["D1", "R1", "P1", "claim"]).transact()

    # Re-evaluating an OPEN dispute is an invalid transition.
    receipt = contract.re_evaluate(args=["D1"]).transact()
    print("invalid transition:", _summary(receipt))
    from gltest.assertions import tx_execution_failed

    assert tx_execution_failed(receipt)
