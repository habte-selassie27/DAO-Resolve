import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AssessmentPanel from "../../src/components/AssessmentPanel.vue";
import CheckEditor from "../../src/components/CheckEditor.vue";
import ErrorNotice from "../../src/components/ErrorNotice.vue";
import EvaluationFailureNotice from "../../src/components/EvaluationFailureNotice.vue";
import FinalityBanner from "../../src/components/FinalityBanner.vue";
import RoleGate from "../../src/components/RoleGate.vue";
import StatusChip from "../../src/components/StatusChip.vue";
import { state } from "../../src/lib/store.js";

describe("evaluation failure notice", () => {
  it("is not styled as a verdict and offers a retry", async () => {
    const wrapper = mount(EvaluationFailureNotice, {
      props: {
        error: "TRANSIENT: validators could not agree",
        retryLabel: "Retry assessment",
      },
    });
    expect(wrapper.text()).toContain("did not produce a verdict");
    expect(wrapper.text()).toContain("not COMPLIANT, VIOLATION, or INCONCLUSIVE");
    expect(wrapper.find(".badge.compliant").exists()).toBe(false);
    expect(wrapper.find(".badge.violation").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("maps a rate-limit error to a plain explanation", () => {
    const wrapper = mount(EvaluationFailureNotice, {
      props: { error: "Rate limit exceeded: 30 requests per minute" },
    });
    expect(wrapper.text()).toContain("rate-limited");
  });
});

describe("assessment panel", () => {
  const base = {
    assessment_id: "D1#a1",
    verdict: "COMPLIANT",
    decided_by: "DETERMINISTIC_CHECKS",
    deterministic_pass_count: 1,
    deterministic_fail_count: 0,
    deterministic_results: [
      { check_id: "review", kind: "MIN_ELAPSED", result: "PASS", detail: "elapsed=100 threshold=100" },
    ],
  };

  it("does not style a compliant deterministic result as a violation", () => {
    const wrapper = mount(AssessmentPanel, { props: { assessment: base } });
    expect(wrapper.find(".notice.compliant").exists()).toBe(true);
    expect(wrapper.find(".notice.violation").exists()).toBe(false);
    expect(wrapper.text()).toContain("All configured rule checks passed in code");
  });

  it("uses the violation notice only for a failed deterministic result", () => {
    const wrapper = mount(AssessmentPanel, {
      props: {
        assessment: {
          ...base,
          verdict: "VIOLATION",
          deterministic_pass_count: 0,
          deterministic_fail_count: 1,
          deterministic_results: [
            { check_id: "review", kind: "MIN_ELAPSED", result: "FAIL", detail: "missing from_event=SUBMITTED" },
          ],
        },
      },
    });
    expect(wrapper.find(".notice.violation").exists()).toBe(true);
    expect(wrapper.text()).toContain("forced this verdict in code");
  });
});

describe("finality banner", () => {
  it("does not say 'closes closed' after the window", () => {
    const wrapper = mount(FinalityBanner, {
      props: {
        status: "RE_EVALUATED",
        deadline: Math.floor(Date.now() / 1000) - 3600,
      },
    });
    expect(wrapper.text()).toContain("challenge window closed");
    expect(wrapper.get("strong").text()).toBe("Assessed; challenge window closed");
    expect(wrapper.text()).not.toContain("closes closed");
    expect(wrapper.text()).toContain("finalized");
  });

  it("labels an escalated dispute as a handoff, not a violation", () => {
    const wrapper = mount(FinalityBanner, {
      props: { status: "ESCALATED" },
    });
    expect(wrapper.text()).toContain("DAO");
    expect(wrapper.find(".notice.violation").exists()).toBe(false);
  });
});

describe("status chip", () => {
  it("explains a challenged state", () => {
    const wrapper = mount(StatusChip, { props: { status: "CHALLENGED" } });
    expect(wrapper.text()).toBe("Challenged");
    expect(wrapper.attributes("title")).toContain("re-evaluation");
  });
});

describe("error notice", () => {
  it("maps a network failure and offers a retry", async () => {
    const wrapper = mount(ErrorNotice, {
      props: { error: "TypeError: Failed to fetch", title: "Could not load rules", retryLabel: "Try again" },
    });
    expect(wrapper.text()).toContain("network request failed");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("shows no retry button without a label", () => {
    const wrapper = mount(ErrorNotice, { props: { error: "weird failure" } });
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).toContain("unexpected");
  });
});

describe("role gate honesty", () => {
  afterEach(() => {
    state.address = "";
    state.config = null;
  });

  it("never claims a missing role when roles could not be verified", () => {
    state.address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
    state.config = null;
    const wrapper = mount(RoleGate, { props: { role: "registrar" } });
    expect(wrapper.text()).toContain("couldn't be verified");
    expect(wrapper.text()).toContain("Nothing is wrong with your account");
    expect(wrapper.text()).not.toContain("doesn't hold");
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("explains a verified missing role", () => {
    state.address = "0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C";
    state.config = {
      owner: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
      rule_registrar: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
      recorder: "0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C",
      escalator: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
    };
    const wrapper = mount(RoleGate, { props: { role: "registrar" } });
    expect(wrapper.text()).toContain("doesn't hold the registrar or owner role");
    expect(wrapper.text()).not.toContain("couldn't be verified");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("renders the form for the account that holds the role", () => {
    state.address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
    state.config = {
      owner: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
      rule_registrar: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
      recorder: "0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C",
      escalator: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
    };
    const wrapper = mount(RoleGate, {
      props: { role: "registrar" },
      slots: { default: "<form>register</form>" },
    });
    expect(wrapper.find("form").exists()).toBe(true);
  });
});

describe("structured check editor", () => {
  const baseCheck = (overrides = {}) => ({
    check_id: "review-window",
    kind: "MIN_ELAPSED",
    event_type: "",
    from_event_type: "SUBMITTED",
    to_event_type: "VOTING_STARTED",
    threshold: 172800,
    role: "recorder",
    role_address: "0x0000000000000000000000000000000000000000",
    ...overrides,
  });

  it("adds a check and renders it after the parent applies v-model (regression: Add check did nothing)", async () => {
    const wrapper = mount(CheckEditor, { props: { modelValue: [] } });
    await wrapper.get("button").trigger("click"); // Add check is the only button with no rows
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0]).toHaveLength(1);
    expect(emitted[0][0][0].kind).toBe("MIN_ELAPSED");

    // Simulate the parent applying v-model, which is what makes the row appear.
    await wrapper.setProps({ modelValue: emitted[0][0] });
    expect(wrapper.text()).toContain("Check 1");
    expect(wrapper.findAll("input").length).toBeGreaterThan(0);
  });

  it("removes a check at the clicked row", async () => {
    const wrapper = mount(CheckEditor, { props: { modelValue: [baseCheck()] } });
    expect(wrapper.text()).toContain("Check 1");
    const remove = wrapper.findAll("button").find((button) => button.text() === "Remove");
    await remove.trigger("click");
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted?.at(-1)[0]).toEqual([]);
  });

  it("normalizes kind-specific fields when the kind changes", async () => {
    const wrapper = mount(CheckEditor, { props: { modelValue: [baseCheck()] } });
    const kindSelect = wrapper.findAll("select").find((select) => select.element.value === "MIN_ELAPSED");
    await kindSelect.setValue("REQUIRED_EVENT");
    const updated = wrapper.emitted("update:modelValue").at(-1)[0][0];
    expect(updated.kind).toBe("REQUIRED_EVENT");
    expect(updated.threshold).toBe(0);
    expect(updated.role).toBe("");
  });

  it("keeps edits to a check row flowing to the parent model", async () => {
    const row = baseCheck();
    const wrapper = mount(CheckEditor, { props: { modelValue: [row] } });
    const idInput = wrapper.findAll("input").find((input) => input.element.value === "review-window");
    await idInput.setValue("review-48h");
    // v-model edits the row object in place, which is the parent's reactive object.
    expect(wrapper.props("modelValue")[0].check_id).toBe("review-48h");
  });
});
