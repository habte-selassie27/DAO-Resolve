import { reactive } from "vue";
import { connectWallet, walletAvailable } from "./chain/clients.js";
import { getConfig } from "./chain/reads.js";

export const state = reactive({
  address: "",
  walletError: "",
  connecting: false,
  config: null,
  configError: "",
});

export async function loadConfig() {
  try {
    state.config = await getConfig();
    state.configError = "";
  } catch (error) {
    state.config = null;
    state.configError = error?.message || String(error);
  }
}

export async function connect(provider) {
  state.connecting = true;
  state.walletError = "";
  try {
    state.address = await connectWallet(provider);
    await loadConfig();
  } catch (error) {
    state.walletError = error?.message || String(error);
  } finally {
    state.connecting = false;
  }
}

export function disconnect() {
  state.address = "";
}

export function roleOf(address) {
  if (!address || !state.config) return [];
  const lower = address.toLowerCase();
  const roles = [];
  if (state.config.owner?.toLowerCase() === lower) roles.push("owner");
  if (state.config.rule_registrar?.toLowerCase() === lower) roles.push("registrar");
  if (state.config.recorder?.toLowerCase() === lower) roles.push("recorder");
  if (state.config.escalator?.toLowerCase() === lower) roles.push("escalator");
  return roles;
}

export function hasRole(role) {
  return roleOf(state.address).includes(role);
}

export function walletReady() {
  return Boolean(state.address);
}

export { walletAvailable };