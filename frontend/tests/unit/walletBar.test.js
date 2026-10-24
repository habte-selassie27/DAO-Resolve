import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const mocks = vi.hoisted(() => {
  const address = "0x5B3661C576c7001e6d6279C67F3779705d334c89";
  const provider = {
    request: vi.fn(async ({ method }) => {
      if (method === "eth_requestAccounts") return [address];
      return null;
    }),
  };
  return { address, provider, wallets: [] };
});

vi.mock("../../src/lib/wallets.js", () => ({
  startWalletDiscovery: vi.fn(),
  requestWalletAnnouncements: vi.fn(),
  onWalletsChange: () => () => {},
  getWallets: () => mocks.wallets,
}));

vi.mock("../../src/lib/chain/reads.js", () => ({
  getConfig: async () => ({
    owner: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
    rule_registrar: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
    recorder: "0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C",
    escalator: "0x5B3661C576c7001e6d6279C67F3779705d334c89",
  }),
}));

import WalletBar from "../../src/components/WalletBar.vue";
import { state } from "../../src/lib/store.js";

beforeEach(() => {
  state.address = "";
  state.connecting = false;
  state.walletError = "";
  state.config = null;
  mocks.provider.request.mockClear();
  mocks.wallets = [
    { uuid: "mm", name: "MetaMask", icon: "", provider: mocks.provider },
    { uuid: "rabby", name: "Rabby", icon: "", provider: mocks.provider },
  ];
});

describe("wallet picker", () => {
  it("lists every detected wallet when Connect wallet is clicked", async () => {
    const wrapper = mount(WalletBar);
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Choose a browser wallet");
    expect(wrapper.text()).toContain("MetaMask");
    expect(wrapper.text()).toContain("Rabby");
  });

  it("connects to the wallet the user picks, not just the first one", async () => {
    const wrapper = mount(WalletBar);
    await wrapper.get("button").trigger("click");
    const rabby = wrapper.findAll("button.wallet-option").find((button) => button.text().includes("Rabby"));
    await rabby.trigger("click");
    await flushPromises();
    expect(state.address).toBe(mocks.address);
    expect(wrapper.text()).not.toContain("Choose a browser wallet");
  });

  it("explains how to install a wallet when none is detected", async () => {
    mocks.wallets = [];
    const wrapper = mount(WalletBar);
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("No browser wallet detected");
    expect(wrapper.text()).toContain("MetaMask");
  });

  it("closes the picker on Escape", async () => {
    const wrapper = mount(WalletBar);
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Choose a browser wallet");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(wrapper.text()).not.toContain("Choose a browser wallet");
  });
});
