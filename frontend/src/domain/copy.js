export const trustStatement =
  "Events are recorded by an authorized recorder and link to their public source. Validators read evidence URLs live. The contract does not independently prove that a recorded event happened.";

export const verdictCopy = {
  COMPLIANT: "Compliant. The recorded process and evidence satisfy this rule version.",
  VIOLATION: "Violation. The recorded process or evidence does not satisfy this rule version.",
  INCONCLUSIVE:
    "Inconclusive. The evidence isn't enough to decide. This is a finding about the evidence, not a failure.",
};

export const decidedByCopy = {
  DETERMINISTIC_CHECKS:
    "Decided by code. A configured check failed or the rule is fully checkable by code.",
  INTERPRETATION:
    "Code checks found no failure, so validators read the evidence and agreed.",
};

export const finalityCopy = {
  OPEN: "Open. No assessment yet.",
  EVALUATED: "Assessed. This can still be challenged until the window closes.",
  RE_EVALUATED: "Re-assessed. This can still be challenged until the window closes.",
  CHALLENGED: "Challenged. Anyone can request re-evaluation.",
  FINALIZED: "Finalized. This is the contract's advisory record. It does not penalize anyone.",
  ESCALATED: "Escalated. The DAO's own procedure takes over from here.",
  WITHDRAWN: "Withdrawn by the disputant. The record stays public.",
};

export const emptyCopy = {
  rules: "No rules yet. Register the first rule to begin.",
  proposals: "No proposals yet. Register a proposal to record its process.",
  events: "No process events recorded yet.",
  evidence: "No evidence yet. Add a link, a statement, or an event reference.",
  assessment: "No assessment yet. Request one to have the rule checked.",
  disputes: "No disputes yet. Open one from a proposal.",
};

export const actionCopy = {
  registerRule: "Register rule",
  registerProposal: "Register proposal",
  recordEvent: "Record event",
  openDispute: "Open dispute",
  submitEvidence: "Submit evidence",
  evaluate: "Request assessment",
  challenge: "Challenge this assessment",
  reEvaluate: "Request re-evaluation",
  finalize: "Finalize dispute",
  escalate: "Escalate to the DAO process",
  withdraw: "Withdraw dispute",
};