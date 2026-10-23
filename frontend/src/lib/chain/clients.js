import { createClient } from "genlayer-js";
import { activeNetwork } from "../../config/networks.js";

function endpoint() {
  const configured = import.meta.env.VITE_STUDIO_URL || "/api";
  try {
    return new URL(configured, window.location.origin).href;
  } catch {
    return configured;
  }
}

export const readClient = createClient({
  chain: activeNetwork.chain,
  endpoint: endpoint(),
});

export function walletAvailable() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet() {
  if (!walletAvailable()) {
    throw new Error(
      "No browser wallet detected. Install MetaMask to sign transactions. Reads still work without a wallet."
    );
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts?.[0];
  if (!address) throw new Error("The wallet did not return an account.");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${Number(activeNetwork.chain.id).toString(16)}` }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${Number(activeNetwork.chain.id).toString(16)}`,
              chainName: activeNetwork.chain.name,
              nativeCurrency: activeNetwork.chain.nativeCurrency,
              rpcUrls: activeNetwork.chain.rpcUrls.default.http,
              blockExplorerUrls: activeNetwork.explorer ? [activeNetwork.explorer] : [],
            },
          ],
        });
      } catch {
        // The write client will surface a clear wrong-network error if the switch fails.
      }
    }
  }
  return address;
}

export function createWriteClient(address) {
  return createClient({
    chain: activeNetwork.chain,
    endpoint: endpoint(),
    account: address,
    provider: window.ethereum,
  });
}
