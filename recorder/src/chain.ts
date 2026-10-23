import { createAccount, createClient } from "genlayer-js";
import { studionet, testnetBradbury, testnetAsimov, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Plan, ProcessEvent } from "./normalize/events.ts";
import { validatePlan } from "./normalize/events.ts";

const chains = { studionet, testnetBradbury, testnetAsimov, localnet } as const;
type NetworkName = keyof typeof chains;

export type SubmitOptions = {
  privateKey?: string;
  contractAddress: string;
  network?: string;
  dryRun?: boolean;
  onProgress?: (message: string) => void;
};

function chainFor(name: string) {
  const chain = chains[name as NetworkName];
  if (!chain) throw new Error(`Unknown network ${name}. Use: ${Object.keys(chains).join(", ")}`);
  return chain;
}

function normalize(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), normalize(item)]));
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object" && (value as object).constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function receiptError(receipt: Record<string, any>) {
  const leaders = receipt?.consensus_data?.leader_receipt || [];
  for (const leader of Array.isArray(leaders) ? leaders : [leaders]) {
    if (leader?.error) return String(leader.error);
  }
  if (receipt?.txExecutionResultName === "FINISHED_WITH_ERROR") {
    return "Transaction execution failed.";
  }
  return "";
}

export async function submitPlan(plan: Plan, options: SubmitOptions) {
  const problems = validatePlan(plan);
  if (problems.length) throw new Error(`Plan is invalid:\n- ${problems.join("\n- ")}`);
  if (options.dryRun) {
    options.onProgress?.(`Dry run: ${plan.events.length} events would be submitted. Nothing was sent.`);
    return { submitted: [], dryRun: true };
  }
  if (!options.privateKey) throw new Error("RECORDER_PRIVATE_KEY is required for submit.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(options.contractAddress)) {
    throw new Error("CONTRACT_ADDRESS (or --contract) must be a 20-byte hex address.");
  }
  const client = createClient({
    chain: chainFor(options.network || "studionet"),
    account: createAccount(options.privateKey as `0x${string}`),
  });
  const submitted: Array<{ event_id: string; hash: string }> = [];
  for (const event of plan.events) {
    options.onProgress?.(`Submitting ${event.event_id} (${event.event_type}) at ${event.timestamp_ref}…`);
    const hash = (await client.writeContract({
      address: options.contractAddress as `0x${string}`,
      functionName: "record_process_event",
      args: [
        plan.proposal.proposal_id,
        event.event_id,
        event.event_type,
        event.actor,
        event.timestamp_ref,
        event.evidence_ref,
      ],
      value: 0n,
    })) as `0x${string}`;
    const receipt = await client.waitForTransactionReceipt({
      hash: hash as any,
      status: TransactionStatus.FINALIZED,
      retries: 120,
      interval: 5000,
    });
    const error = receiptError(receipt as Record<string, any>);
    if (error) {
      throw new Error(
        `Event ${event.event_id} failed after ${submitted.length} confirmed events: ${error}`
      );
    }
    submitted.push({ event_id: event.event_id, hash });
    options.onProgress?.(`Finalized ${event.event_id}: ${hash}`);
  }
  return { submitted, dryRun: false };
}

export async function verifyPlan(plan: Plan, options: { contractAddress: string; network?: string }) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(options.contractAddress)) {
    throw new Error("CONTRACT_ADDRESS (or --contract) must be a 20-byte hex address.");
  }
  const client = createClient({ chain: chainFor(options.network || "studionet") });
  const actual: ProcessEvent[] = [];
  for (let offset = 0; offset < 128; offset += 50) {
    const raw = await client.readContract({
      address: options.contractAddress as `0x${string}`,
      functionName: "get_events",
      args: [plan.proposal.proposal_id, offset, 50],
    });
    const page = normalize(raw) as ProcessEvent[];
    actual.push(...page);
    if (page.length < 50) break;
  }
  const byId = new Map(actual.map((event) => [event.event_id, event]));
  const missing: string[] = [];
  const mismatched: string[] = [];
  for (const expected of plan.events) {
    const found = byId.get(expected.event_id);
    if (!found) {
      missing.push(expected.event_id);
      continue;
    }
    for (const field of ["event_type", "actor", "timestamp_ref", "evidence_ref"] as const) {
      if (String(found[field]) !== String(expected[field])) {
        mismatched.push(`${expected.event_id}.${field}: expected ${expected[field]}, found ${found[field]}`);
      }
    }
  }
  return { ok: missing.length === 0 && mismatched.length === 0, missing, mismatched, actual };
}
