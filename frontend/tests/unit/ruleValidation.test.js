import { describe, expect, it } from "vitest";
import { toContractChecks, validateRuleForm } from "../../src/lib/ruleValidation.js";

const baseForm = (overrides = {}) => ({
  ruleId: "R-REVIEW",
  title: "Minimum review period before voting",
  category: "TIMING",
  interpretation: "DETERMINISTIC_ONLY",
  clauseText: "A proposal must receive at least 48 hours of review before voting starts.",
  checks: [
    {
      check_id: "review-window",
      kind: "MIN_ELAPSED",
      event_type: "",
      from_event_type: "SUBMITTED",
      to_event_type: "VOTING_STARTED",
      threshold: 172800,
      role: "RECORDER",
    },
  ],
  ...overrides,
});

describe("validateRuleForm", () => {
  it("accepts a complete deterministic rule", () => {
    expect(validateRuleForm(baseForm())).toBe("");
  });

  it("accepts an interpretive rule without checks", () => {
    expect(validateRuleForm(baseForm({ interpretation: "NEEDS_INTERPRETATION", checks: [] }))).toBe("");
  });

  it("requires clause text (the empty placeholder is not a value)", () => {
    expect(validateRuleForm(baseForm({ clauseText: "" }))).toContain("Write the clause text");
  });

  it("requires at least one check for a deterministic rule", () => {
    expect(validateRuleForm(baseForm({ checks: [] }))).toContain("needs at least one structured check");
  });

  it("rejects rule ids with spaces", () => {
    expect(validateRuleForm(baseForm({ ruleId: "Rule 1" }))).toContain("may only use letters");
  });

  it("rejects a MIN_ELAPSED check with a zero threshold", () => {
    expect(validateRuleForm(baseForm({ checks: [{ ...baseForm().checks[0], threshold: 0 }] }))).toContain(
      "greater than zero"
    );
  });

  it("rejects duplicate check ids within one rule", () => {
    const check = baseForm().checks[0];
    expect(validateRuleForm(baseForm({ checks: [check, { ...check }] }))).toContain("unique");
  });

  it("accepts an uppercase contract role for REQUIRED_ROLE", () => {
    const form = baseForm({
      checks: [
        {
          check_id: "coi-recorded",
          kind: "REQUIRED_ROLE",
          event_type: "CONFLICT_DISCLOSED",
          from_event_type: "",
          to_event_type: "",
          threshold: 0,
          role: "RECORDER",
        },
      ],
    });
    expect(validateRuleForm(form)).toBe("");
  });

  it("rejects the non-assignable owner role", () => {
    const form = baseForm({
      checks: [
        {
          check_id: "coi-recorded",
          kind: "REQUIRED_ROLE",
          event_type: "CONFLICT_DISCLOSED",
          threshold: 0,
          role: "owner",
        },
      ],
    });
    expect(validateRuleForm(form)).toContain("choose a required role");
  });
});

describe("toContractChecks", () => {
  it("sends exactly the keys the contract allows and never role_address", () => {
    const payload = toContractChecks([
      {
        check_id: " 1 ",
        kind: "MIN_ELAPSED",
        event_type: "",
        from_event_type: " SUBMITTED ",
        to_event_type: "VOTING_STARTED",
        threshold: 172800,
        role: "RECORDER",
        role_address: "0x0000000000000000000000000000000000000000",
      },
    ]);
    expect(payload).toEqual([
      {
        check_id: "1",
        kind: "MIN_ELAPSED",
        event_type: "",
        from_event_type: "SUBMITTED",
        to_event_type: "VOTING_STARTED",
        threshold: 172800,
        role: "RECORDER",
      },
    ]);
    expect(Object.keys(payload[0]).sort()).toEqual(
      ["check_id", "event_type", "from_event_type", "kind", "role", "threshold", "to_event_type"].sort()
    );
  });

  it("keeps threshold numeric and tolerates empty rows", () => {
    const payload = toContractChecks([{ threshold: "0" }, null]);
    expect(payload[0].threshold).toBe(0);
    expect(payload[1].check_id).toBe("");
  });
});
