import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("../../src/lib/chain/reads.js", () => ({
  listActiveRules: async () => [],
}));

import Rules from "../../src/screens/Rules.vue";
import { state } from "../../src/lib/store.js";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/rules", component: { render: () => null } },
      { path: "/proposals", component: { render: () => null } },
      { path: "/rules/:id", component: { render: () => null } },
    ],
  });
}

describe("rules screen", () => {
  it("renders the empty state and the inline register form with no rules on chain", async () => {
    state.address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
    const router = makeRouter();
    await router.push("/rules");
    await router.isReady();

    const wrapper = mount(Rules, { global: { plugins: [router] } });
    await flushPromises();

    // Regression: a missing emptyCopy import used to throw during render as soon
    // as the rules list was empty, which froze the form next to it.
    expect(wrapper.text()).toContain("No rules yet. Register the first rule to begin.");
    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.text()).toContain("Register a rule");

    const submit = wrapper.findAll("button").find((button) => button.text() === "Register rule");
    expect(submit.exists()).toBe(true);
    expect(submit.attributes("disabled")).toBeUndefined();
  });
});
