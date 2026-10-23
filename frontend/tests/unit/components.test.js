import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import EvaluationFailureNotice from "../../src/components/EvaluationFailureNotice.vue";
import FinalityBanner from "../../src/components/FinalityBanner.vue";
import StatusChip from "../../src/components/StatusChip.vue";

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
