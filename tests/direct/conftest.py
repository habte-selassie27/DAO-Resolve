"""Shared fixtures and helpers for DAOResolve direct tests.

Direct mode runs the contract in-process with mocked web and LLM. Tests are
fast and deterministic; real consensus behavior is covered under tests/integration.

One harness detail: gltest's direct VM refreshes gl.message on warp but not
gl.message_raw["datetime"]. The contract must read the deterministic GenVM
message timestamp, so the helper below mirrors the warped value into the SDK
dict. This is test-only plumbing and does not change contract behavior.
"""

import json
import sys

import pytest

DEFAULT_TIME = "2026-01-01T00:00:00Z"


def addr(raw):
    """Wrap a direct-test address (bytes) as a GenLayer Address."""
    import genlayer

    if isinstance(raw, genlayer.Address):
        return raw
    return genlayer.Address(raw)


def warp(direct_vm, timestamp):
    """Warp the VM and keep the SDK message timestamp in sync."""
    direct_vm.warp(timestamp)
    if "genlayer.gl" in sys.modules:
        sys.modules["genlayer.gl"].message_raw["datetime"] = timestamp


def set_time(direct_vm, timestamp):
    warp(direct_vm, timestamp)


@pytest.fixture
def dao(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    warp(direct_vm, DEFAULT_TIME)
    contract = direct_deploy("contracts/dao_resolve.py")
    warp(direct_vm, DEFAULT_TIME)
    return contract


@pytest.fixture
def alice(dao, direct_alice):
    return addr(direct_alice)


@pytest.fixture
def bob(dao, direct_bob):
    return addr(direct_bob)


@pytest.fixture
def charlie(dao, direct_charlie):
    return addr(direct_charlie)


@pytest.fixture
def module(dao):
    """The loaded contract module, for testing pure helpers directly."""
    return sys.modules["_contract_dao_resolve"]


def min_elapsed_checks(threshold=100, check_id="review"):
    return [
        {
            "check_id": check_id,
            "kind": "MIN_ELAPSED",
            "from_event_type": "SUBMITTED",
            "to_event_type": "VOTING_STARTED",
            "threshold": threshold,
        }
    ]


def add_rule(
    contract,
    rule_id="R1",
    title="Review period",
    clause="Proposals require a review period of at least 100 seconds before voting.",
    category="TIMING",
    interpretation="DETERMINISTIC_ONLY",
    checks=None,
):
    if checks is None:
        checks = min_elapsed_checks()
    contract.register_rule(
        rule_id,
        title,
        clause,
        category,
        interpretation,
        json.dumps(checks),
    )


def add_interpretive_rule(contract, rule_id="R2", checks=None):
    contract.register_rule(
        rule_id,
        "Adequate discussion",
        "Proposals must receive adequate community discussion before a vote.",
        "PROCESS",
        "NEEDS_INTERPRETATION",
        json.dumps(checks or []),
    )


def add_proposal(contract, proposal_id="P1", content_ref="ipfs://proposal-1"):
    contract.register_proposal(proposal_id, content_ref, "recorded for test")


def add_review_events(
    contract,
    actor,
    proposal_id="P1",
    submitted_at=1000,
    voting_at=1100,
):
    contract.record_process_event(
        proposal_id, "e1", "SUBMITTED", actor, submitted_at, "doc://proposal"
    )
    contract.record_process_event(
        proposal_id, "e2", "VOTING_STARTED", actor, voting_at, ""
    )


def add_open_dispute(
    contract,
    rule_id="R1",
    proposal_id="P1",
    dispute_id="D1",
    claim="The process did not follow the registered rule.",
):
    contract.open_dispute(dispute_id, rule_id, proposal_id, claim)


LLM_COMPLIANT = {
    "verdict": "COMPLIANT",
    "confidence_band": "MEDIUM",
    "cited_clause_ids": ["R2"],
    "cited_evidence_ids": ["D2#e1"],
    "reasoning_digest": "Substantial multi-day forum discussion is adequate.",
}


def mock_llm(direct_vm, payload):
    if isinstance(payload, dict):
        payload = json.dumps(payload)
    direct_vm.mock_llm(r"(?s).*DAOResolve.*", payload)


def assessment_ctx(**overrides):
    """A minimal normalized context for equivalence-helper tests."""
    base = {
        "rule_id": "R1",
        "rule_version": 1,
        "category": "PROCESS",
        "clause_text": "Proposals must receive adequate discussion.",
        "claim_text": "The process did not comply with the registered rule.",
        "proposal_id": "P1",
        "content_ref": "ipfs://p1",
        "status_note": "",
        "events": [],
        "events_total": 0,
        "events_truncated": False,
        "event_summary": "",
        "deterministic_results": [],
        "det_fail": False,
        "evidence": [],
        "allowed_clause_ids": ["R1"],
        "allowed_evidence_ids": ["e1"],
        "is_re": False,
        "prior_verdict": "",
        "prior_band": "",
        "prior_round": 0,
        "prior_reasoning": "",
        "challenge_reason": "",
        "challenge_evidence_count": 0,
    }
    base.update(overrides)
    return base
