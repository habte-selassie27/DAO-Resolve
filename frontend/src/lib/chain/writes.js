import { contractAddress, mockMode } from "../../config/contracts.js";
import { state } from "../store.js";
import { createWriteClient } from "./clients.js";
import * as mock from "../mock/client.js";

function client() {
  if (!state.address) throw new Error("Connect an account to continue.");
  return createWriteClient(state.address);
}

async function write(functionName, args) {
  if (mockMode) return mock.write(functionName, args);
  if (!contractAddress) {
    throw new Error("No contract address is configured for this network. Set VITE_CONTRACT_ADDRESS.");
  }
  const txHash = await client().writeContract({
    address: contractAddress,
    functionName,
    args,
    value: 0n,
  });
  return txHash;
}

export function registerRule({ ruleId, title, clauseText, category, interpretation, checks }) {
  const checksJson = JSON.stringify(checks || []);
  return write("register_rule", [ruleId, title, clauseText, category, interpretation, checksJson]);
}

export function deprecateRule(ruleId) {
  return write("deprecate_rule", [ruleId]);
}

export function registerProposal({ proposalId, contentRef, statusNote }) {
  return write("register_proposal", [proposalId, contentRef, statusNote]);
}

export function recordProcessEvent({
  proposalId,
  eventId,
  eventType,
  actor,
  timestampRef,
  evidenceRef,
}) {
  return write("record_process_event", [
    proposalId,
    eventId,
    eventType,
    actor,
    Number(timestampRef),
    evidenceRef,
  ]);
}

export function openDispute({ disputeId, ruleId, proposalId, claimText }) {
  return write("open_dispute", [disputeId, ruleId, proposalId, claimText]);
}

export function submitEvidence({ disputeId, side, kind, ref }) {
  return write("submit_evidence", [disputeId, side, kind, ref]);
}

export function evaluateDispute(disputeId) {
  return write("evaluate_dispute", [disputeId]);
}

export function reEvaluate(disputeId) {
  return write("re_evaluate", [disputeId]);
}

export function challengeAssessment({ disputeId, reason, newEvidence }) {
  const evidenceJson = JSON.stringify(newEvidence || []);
  return write("challenge_assessment", [disputeId, reason, evidenceJson]);
}

export function finalizeDispute(disputeId) {
  return write("finalize_dispute", [disputeId]);
}

export function escalateDispute({ disputeId, reason }) {
  return write("escalate_dispute", [disputeId, reason]);
}

export function withdrawDispute(disputeId) {
  return write("withdraw_dispute", [disputeId]);
}

export function setRole({ role, account }) {
  return write("set_role", [role, account]);
}

export function transferOwnership(account) {
  return write("transfer_ownership", [account]);
}

export function setConfig({ challengeWindow, maxChallengeRounds, strictSeparation }) {
  return write("set_config", [Number(challengeWindow), Number(maxChallengeRounds), Boolean(strictSeparation)]);
}

export function setCategoryVoteRequired({ category, required }) {
  return write("set_category_vote_required", [category, Boolean(required)]);
}