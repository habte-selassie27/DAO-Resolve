// Client-side mirror of the contract's rule validation. It exists so a doomed
// transaction is never sent and the user always sees a clear reason in the page
// instead of a silent native validation bubble. The contract remains the
// authority; these messages use the same limits.

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const CHECK_KINDS = ["MIN_ELAPSED", "REQUIRED_EVENT", "MIN_COUNT", "REQUIRED_ROLE"];
const CHECK_ROLES = ["RULE_REGISTRAR", "RECORDER", "ESCALATOR"];
const INTERPRETATIONS = ["DETERMINISTIC_ONLY", "NEEDS_INTERPRETATION"];
const CATEGORIES = ["PROCESS", "QUORUM", "TIMING", "ELIGIBILITY", "DISCLOSURE", "OTHER"];

function validId(value) {
  return ID_PATTERN.test(String(value || ""));
}

// The contract rejects any key outside this whitelist ("unknown structured
// check key"), so the client maps form rows to exactly these fields. The role
// address is pinned by the contract at registration and must not be sent.
const CONTRACT_CHECK_KEYS = [
  "check_id",
  "kind",
  "event_type",
  "from_event_type",
  "to_event_type",
  "threshold",
  "role",
];

export function toContractChecks(checks) {
  return (Array.isArray(checks) ? checks : []).map((check) => {
    const mapped = {};
    for (const key of CONTRACT_CHECK_KEYS) {
      if (key === "threshold") {
        mapped.threshold = Number(check?.threshold) || 0;
      } else {
        mapped[key] = String(check?.[key] ?? "").trim();
      }
    }
    return mapped;
  });
}

export function validateRuleForm(form) {
  const ruleId = String(form.ruleId || "").trim();
  if (!ruleId) return "Add a rule id, for example R-REVIEW.";
  if (!validId(ruleId)) {
    return "Rule id may only use letters, digits, and - _ . : (1-64 characters, no spaces).";
  }

  const title = String(form.title || "").trim();
  if (!title) return "Add a title for the rule.";
  if (title.length > 120) return "Title is over the 120 character limit.";

  const clause = String(form.clauseText || "");
  if (!clause.trim()) return "Write the clause text: the rule wording that will be assessed.";
  if (clause.length > 2000) return "Clause text is over the 2000 character limit.";

  if (!CATEGORIES.includes(form.category)) return "Choose a rule category.";
  if (!INTERPRETATIONS.includes(form.interpretation)) return "Choose an interpretation mode.";

  const checks = Array.isArray(form.checks) ? form.checks : [];
  if (form.interpretation === "DETERMINISTIC_ONLY" && checks.length === 0) {
    return "A DETERMINISTIC_ONLY rule needs at least one structured check. Add one below.";
  }

  const seen = new Set();
  for (let index = 0; index < checks.length; index += 1) {
    const check = checks[index] || {};
    const label = `Check ${index + 1}`;
    const checkId = String(check.check_id || "").trim();
    if (!checkId) return `${label} needs a check id.`;
    if (!validId(checkId)) {
      return `${label}: check id may only use letters, digits, and - _ . : (1-64 characters, no spaces).`;
    }
    if (seen.has(checkId)) return `${label}: check ids must be unique within a rule.`;
    seen.add(checkId);

    if (!CHECK_KINDS.includes(check.kind)) return `${label}: choose a check kind.`;

    const threshold = Number(check.threshold);
    if (check.kind === "MIN_ELAPSED") {
      if (!String(check.from_event_type || "").trim()) return `${label}: choose the from event.`;
      if (!String(check.to_event_type || "").trim()) return `${label}: choose the to event.`;
      if (!Number.isInteger(threshold) || threshold <= 0) {
        return `${label}: minimum seconds must be a whole number greater than zero.`;
      }
    } else if (check.kind === "MIN_COUNT") {
      if (!String(check.event_type || "").trim()) return `${label}: add the event type to count.`;
      if (!Number.isInteger(threshold) || threshold <= 0) {
        return `${label}: minimum count must be a whole number greater than zero.`;
      }
    } else if (check.kind === "REQUIRED_EVENT") {
      if (!String(check.event_type || "").trim()) return `${label}: add the required event type.`;
    } else if (check.kind === "REQUIRED_ROLE") {
      if (!String(check.event_type || "").trim()) return `${label}: add the event type the role must sign.`;
      if (!CHECK_ROLES.includes(String(check.role || "").trim().toUpperCase())) {
        return `${label}: choose a required role (rule registrar, recorder, or escalator).`;
      }
    }
  }

  return "";
}
