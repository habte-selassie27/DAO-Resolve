import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("../../src/lib/chain/reads.js", () => ({
  listProposals: async () => [],
}));

import Proposals from "../../src/screens/Proposals.vue";
import { state } from "../../src/lib/store.js";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/proposals", component: { render: () => null } },
      { path: "/proposals/:id", component: { render: () => null } },
    ],
  });
}

describe("proposals screen", () => {
  it("renders the empty state and the inline register form", async () => {
    state.address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
    const router = makeRouter();
    await router.push("/proposals");
    await router.isReady();

    const wrapper = mount(Proposals, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain("No proposals yet. Register a proposal to record its process.");
    expect(wrapper.text()).toContain("Register a proposal");
    const submit = wrapper.findAll("button").find((button) => button.text() === "Register proposal");
    expect(submit.exists()).toBe(true);
  });

  it("explains a missing proposal id instead of failing silently", async () => {
    state.address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
    const router = makeRouter();
    await router.push("/proposals");
    await router.isReady();

    const wrapper = mount(Proposals, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Add a proposal id");
  });
});
