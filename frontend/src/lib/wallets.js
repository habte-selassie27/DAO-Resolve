// EIP-6963 wallet discovery. A page can have several injected providers
// (MetaMask, Rabby, Brave, ...); `window.ethereum` alone only exposes the last
// one. This module collects every announced provider and lets the UI choose.

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

export function startWalletDiscovery() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = event?.detail || {};
    addWallet(detail.info, detail.provider);
  });

  // Legacy single-provider fallback for wallets that have not adopted EIP-6963.
  const legacy = window.ethereum;
  if (legacy) {
    const legacyProviders = Array.isArray(legacy.providers) ? legacy.providers : [legacy];
    legacyProviders.forEach((provider, index) => {
      addWallet(
        {
          uuid: `legacy-${index}`,
          name: provider?.isMetaMask
            ? "MetaMask"
            : provider?.isRabby
              ? "Rabby"
              : provider?.isBraveWallet
                ? "Brave Wallet"
                : "Injected wallet",
          icon: "",
        },
        provider
      );
    });
  }

  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Announcements can arrive on the next microtask.
  setTimeout(notify, 50);
}

export function getWallets() {
  return [...wallets.values()];
}

export function onWalletsChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}