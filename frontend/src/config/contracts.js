import { activeNetwork } from "./networks.js";
import schema from "./schema/dao_resolve.json";

const addresses = {
  studionet: import.meta.env.VITE_CONTRACT_ADDRESS || "0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb",
  testnetBradbury: import.meta.env.VITE_CONTRACT_ADDRESS || "",
  localnet: import.meta.env.VITE_CONTRACT_ADDRESS || "",
};

export const contractAddress = addresses[activeNetwork.id] || "";
export const contractExplorerUrl =
  activeNetwork.explorer && contractAddress
    ? `${activeNetwork.explorer}/address/${contractAddress}`
    : "";
export const mockMode = import.meta.env.VITE_MOCK === "1";
export const contractSchema = schema;
export const demoDisputeIds = (import.meta.env.VITE_DEMO_DISPUTES || "D1,D4,D3")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);