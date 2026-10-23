import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";

const networks = {
  studionet: {
    id: "studionet",
    label: "StudioNet",
    chain: studionet,
    explorer: "https://explorer-studio.genlayer.com",
    required: false,
  },
  testnetBradbury: {
    id: "testnetBradbury",
    label: "Bradbury Testnet",
    chain: testnetBradbury,
    explorer: "https://explorer-bradbury.genlayer.com",
    required: true,
  },
  localnet: {
    id: "localnet",
    label: "Localnet",
    chain: localnet,
    explorer: "",
    required: false,
  },
};

const requested = import.meta.env.VITE_NETWORK || "studionet";

export const activeNetwork = networks[requested] || networks.studionet;
export const allNetworks = networks;

export function explorerAddressUrl(address) {
  if (!activeNetwork.explorer || !address) return "";
  return `${activeNetwork.explorer}/address/${address}`;
}

export function explorerTxUrl(hash) {
  if (!activeNetwork.explorer || !hash) return "";
  return `${activeNetwork.explorer}/tx/${hash}`;
}