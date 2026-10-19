import json
import time

from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded


VERDICTS = {"COMPLIANT", "VIOLATION", "INCONCLUSIVE"}
BANDS = {"LOW", "MEDIUM", "HIGH"}


def _summary(receipt):
    return {
        "hash": receipt.get("hash"),
        "status": receipt.get("status_name"),
        "result": receipt.get("result"),
        "result_name": receipt.get("result_name"),
    }


def test_real_consensus_interpretation_and_challenge_round_trip():
    factory = get_contract_factory(contract_file_path="dao_resolve.py")
    contract = factory.deploy()
    account = get_default_account()
    now = int(time.time())
    print("DAOResolve address:", contract.address)

    receipt = contract.register_rule(
        args=[
            "R2",
            "Adequate community discussion",
            "Proposals must receive adequate community discussion before a vote.",
            "PROCESS",
            "NEEDS_INTERPRETATION",
            "[]",
        ]
    ).transact()
    print("register_rule:", _summary(receipt))
    assert tx_execution_succeeded(receipt)

    receipt = contract.register_proposal(
        args=[
            "P2",
            "https://forum.example/proposals/2",
            "Eight-day discussion period before voting.",
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    receipt = contract.record_process_event(
        args=[
            "P2",
            "e1",
            "SUBMITTED",
            account.address,
            now - 10 * 86400,
            "https://forum.example/proposals/2",
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)
    receipt = contract.record_process_event(
        args=[
            "P2",
            "e2",
            "VOTING_STARTED",
            account.address,
            now - 2 * 86400,
            "",
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    receipt = contract.open_dispute(
        args=[
            "D2",
            "R2",
            "P2",
            "The proposal did not receive adequate community discussion.",
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    receipt = contract.submit_evidence(
        args=[
            "D2",
            "RESPONDENT",
            "TEXT_STATEMENT",
            (
                "The DAO forum thread contains 14 substantive comments from 6 "
                "community members over 7 days, including two critical reviews. "
                "The proposal author answered both critical reviews before voting."
            ),
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    receipt = contract.evaluate_dispute(args=["D2"]).transact()
    print("evaluate_dispute:", _summary(receipt))
    assert tx_execution_succeeded(receipt)

    dispute = contract.get_dispute(args=["D2"]).call()
    assessment = dispute["latest_assessment"]
    print("first assessment:", assessment)
    assert dispute["status"] == "EVALUATED"
    assert dispute["assessment_count"] == 1
    assert assessment["verdict"] in VERDICTS
    assert assessment["confidence_band"] in BANDS
    assert assessment["produced_by"] == "EVALUATION"
    assert assessment["deterministic_results"] == []
    assert set(assessment["cited_clause_ids"]).issubset({"R2"})
    assert set(assessment["cited_evidence_ids"]).issubset({"D2#e1"})

    receipt = contract.challenge_assessment(
        args=[
            "D2",
            "The initial assessment did not explain how the two critical reviews were weighed.",
            json.dumps(
                [
                    {
                        "side": "DISPUTANT",
                        "kind": "TEXT_STATEMENT",
                        "ref": "The author replied to both critical reviews in the same thread.",
                    }
                ]
            ),
        ]
    ).transact()
    print("challenge_assessment:", _summary(receipt))
    assert tx_execution_succeeded(receipt)
    assert contract.get_dispute_status(args=["D2"]).call() == "CHALLENGED"

    receipt = contract.re_evaluate(args=["D2"]).transact()
    print("re_evaluate:", _summary(receipt))
    assert tx_execution_succeeded(receipt)

    dispute = contract.get_dispute(args=["D2"]).call()
    history = contract.get_assessment_history(args=["D2", 0, 10]).call()
    print("second assessment:", dispute["latest_assessment"])
    print("assessment history:", history)
    assert dispute["status"] == "RE_EVALUATED"
    assert dispute["assessment_count"] == 2
    assert len(history) == 2
    assert history[0]["produced_by"] == "EVALUATION"
    assert history[1]["produced_by"] == "RE_EVALUATION"
    assert history[1]["round"] == 1
    assert history[0]["assessment_id"] == "D2#a1"
    assert history[1]["assessment_id"] == "D2#a2"
    assert history[0]["verdict"] in VERDICTS
    assert history[1]["verdict"] in VERDICTS
    assert set(history[1]["cited_evidence_ids"]).issubset({"D2#e1", "D2#e2"})
