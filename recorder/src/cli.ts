#!/usr/bin/env node
import { fetchSnapshotProposal, buildSnapshotPlan } from "./sources/snapshot.ts";
import { readPlan, writePlan } from "./plan.ts";
import { submitPlan, verifyPlan } from "./chain.ts";
import { validatePlan } from "./normalize/events.ts";

const argv = process.argv.slice(2);
const command = argv[0];

function flag(name: string) {
  const index = argv.indexOf(name);
  if (index < 0) return "";
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return "";
  return value;
}

function has(name: string) {
  return argv.includes(name);
}

function usage() {
  console.log(`DAOResolve recorder

Usage:
  recorder ingest snapshot <proposal-url-or-id> [--actor 0x…] [--proposal-id ID] [--out file] [--json]
  recorder submit <plan.json> [--dry-run] [--contract 0x…] [--network studionet]
  recorder verify <plan.json> [--contract 0x…] [--network studionet]

Environment for submit/verify:
  RECORDER_PRIVATE_KEY   recorder key (submit only; never printed)
  CONTRACT_ADDRESS       deployed DAOResolve contract
  GENLAYER_NETWORK       studionet | testnetBradbury | testnetAsimov | localnet

The ingest command is a dry run: it fetches the public source, writes a reproducible
plan under recorder/logs/, and sends nothing. Submit sends the plan's events one by
one and stops at the first failure, reporting the last confirmed event. Verify reads
the contract back and compares every field.`);
}

function requirePlan() {
  const file = argv[1];
  if (!file || file.startsWith("--")) throw new Error("A plan file is required.");
  return readPlan(file);
}

async function ingest() {
  const source = argv[1];
  const ref = argv[2];
  if (source !== "snapshot") throw new Error("Only the snapshot source is implemented.");
  if (!ref) throw new Error("A Snapshot proposal URL or id is required.");
  const actor = flag("--actor");
  const proposal = await fetchSnapshotProposal(ref);
  const plan = buildSnapshotPlan(proposal, {
    actorOverride: actor || undefined,
    proposalIdOverride: flag("--proposal-id") || undefined,
  });
  const problems = validatePlan(plan);
  if (problems.length) throw new Error(`Plan is invalid:\n- ${problems.join("\n- ")}`);
  const file = writePlan(plan, flag("--out") || undefined);
  if (has("--json")) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(`Snapshot proposal: ${plan.proposal.title}`);
    console.log(`Space: ${plan.proposal.space || "(unknown)"}`);
    console.log(`Source: ${plan.source_url}`);
    console.log(`Events planned: ${plan.events.length}`);
    for (const event of plan.events) {
      console.log(
        `  ${event.event_id.padEnd(16)} ${event.event_type.padEnd(16)} ${event.timestamp_ref} actor=${event.actor}`
      );
    }
    for (const warning of plan.warnings) console.log(`  warning: ${warning}`);
    console.log(`Plan written to ${file}`);
    console.log("Dry run only. Nothing was sent. Use `recorder submit <plan>` to send.");
  }
}

async function submit() {
  const plan = requirePlan();
  const contractAddress = flag("--contract") || process.env.CONTRACT_ADDRESS || "";
  if (!contractAddress) throw new Error("Set CONTRACT_ADDRESS or pass --contract.");
  const dryRun = has("--dry-run");
  if (!dryRun && !process.env.RECORDER_PRIVATE_KEY) {
    throw new Error("RECORDER_PRIVATE_KEY is required for submit. It is read from the environment only.");
  }
  const result = await submitPlan(plan, {
    privateKey: process.env.RECORDER_PRIVATE_KEY,
    contractAddress,
    network: flag("--network") || process.env.GENLAYER_NETWORK || "studionet",
    dryRun,
    onProgress: (message) => console.log(message),
  });
  if (result.dryRun) return;
  console.log(`Submitted ${result.submitted.length} events:`);
  for (const item of result.submitted) console.log(`  ${item.event_id}: ${item.hash}`);
}

async function verify() {
  const plan = requirePlan();
  const contractAddress = flag("--contract") || process.env.CONTRACT_ADDRESS || "";
  if (!contractAddress) throw new Error("Set CONTRACT_ADDRESS or pass --contract.");
  const result = await verifyPlan(plan, {
    contractAddress,
    network: flag("--network") || process.env.GENLAYER_NETWORK || "studionet",
  });
  if (result.ok) {
    console.log(`Verified ${plan.events.length} events for proposal ${plan.proposal.proposal_id}.`);
    return;
  }
  if (result.missing.length) console.log(`Missing: ${result.missing.join(", ")}`);
  for (const mismatch of result.mismatched) console.log(`Mismatch: ${mismatch}`);
  process.exitCode = 1;
}

async function main() {
  if (!command || command === "help" || has("--help")) return usage();
  if (command === "ingest") return ingest();
  if (command === "submit") return submit();
  if (command === "verify") return verify();
  throw new Error(`Unknown command ${command}. Use: ingest, submit, verify.`);
}

main().catch((error) => {
  console.error(`Error: ${error?.message || error}`);
  process.exitCode = 1;
});
