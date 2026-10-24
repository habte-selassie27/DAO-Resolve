// EIP-6963 wallet discovery. A page can have several injected providers
// (MetaMask, Rabby, Brave, Coinbase, ...); `window.ethereum` alone only
// exposes one. This module collects every announced provider and also scans
// the legacy `window.ethereum` / `window.ethereum.providers` shape so wallets
// without EIP-6963 support still appear in the picker.

const wallets = new Map();
const providers = new Set();
const listeners = new Set();
let started = false;

function notify() {
  const list = [...wallets.values()];
  for (const listener of listeners) listener(list);
}

function addWallet(info, provider) {
  if (!info?.uuid || !provider || providers.has(provider)) return;
  providers.add(provider);
  wallets.set(info.uuid, {
    uuid: info.uuid,
    name: info.name || "Browser wallet",
    icon: info.icon || "",
    provider,
  });
  notify();
}

function legacyName(provider, count, index) {
  if (!provider) return "";
  // Order matters: some wallets set generic flags (e.g. isMetaMask) to look
  // compatible, so the more specific flags are checked first.
  if (provider.isRabby) return "Rabby";
  if (provider.isBraveWallet) return "Brave Wallet";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isTrust || provider.isTrustWallet) return "Trust Wallet";
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isMetaMask) return "MetaMask";
  return count > 1 ? `Injected wallet ${index + 1}` : "Injected wallet";
}

function scanLegacy() {
  if (typeof window === "undefined") return;
  const legacy = window.ethereum;
  if (!legacy) return;
  const list = Array.isArray(legacy.providers) ? legacy.providers : [legacy];
  list.forEach((provider, index) => {
    if (!provider) return;
    addWallet(
      {
        uuid: `legacy-${index}`,
        name: legacyName(provider, list.length, index),
        icon: "",
      },
      provider
    );
  });
}

export function startWalletDiscovery() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = event?.detail || {};
    addWallet(detail.info, detail.provider);
  });

  // Some wallets inject window.ethereum after the app mounts.
  window.addEventListener("ethereum#initialized", scanLegacy);

  scanLegacy();
  requestWalletAnnouncements();
}

/**
 * Ask EIP-6963 wallets to announce themselves again. Called when the picker
 * opens, so wallets that loaded late (or were just installed) are discovered
 * without a page reload.
 */
export function requestWalletAnnouncements() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  scanLegacy();
  setTimeout(notify, 50);
  setTimeout(notify, 250);
}

export function getWallets() {
  return [...wallets.values()];
}

export function onWalletsChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
