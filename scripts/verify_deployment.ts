import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

const contract = process.env.CONTRACT_ADDRESS || "";
if (!/^0x[a-fA-F0-9]{40}$/.test(contract)) {
  console.error("Set CONTRACT_ADDRESS to the deployed DAOResolve contract.");
  process.exit(1);
}
const networkName = process.env.GENLAYER_NETWORK || "studionet";
const chains = { localnet, studionet, testnetAsimov, testnetBradbury };
const chain = chains[networkName];
if (!chain) {
  console.error(`Unknown network ${networkName}. Use: ${Object.keys(chains).join(", ")}`);
  process.exit(1);
}

const client = createClient({ chain });
let failures = 0;

function normalize(value) {
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), normalize(item)]));
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

async function check(label, method, args = []) {
  try {
    const result = normalize(
      await client.readContract({
        address: contract as `0x${string}`,
        functionName: method,
        args,
      })
    );
    const summary = Array.isArray(result) ? `${result.length} item(s)` : typeof result === "object" ? "object" : String(result);
    console.log(`PASS ${label.padEnd(34)} ${method.padEnd(28)} ${summary}`);
    return result;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label.padEnd(34)} ${method.padEnd(28)} ${error?.message || error}`);
    return null;
  }
}

console.log(`Verifying ${contract} on ${networkName}\n`);

const config = await check("config", "get_config");
const rules = (await check("active rules", "list_active_rules", [0, 50])) || [];
for (const rule of rules.slice(0, 2)) {
  await check(`rule ${rule.rule_id}`, "get_rule", [rule.rule_id]);
  await check(`rule ${rule.rule_id} v${rule.version}`, "get_rule_version", [rule.rule_id, rule.version]);
}

const disputes = (await check("disputes", "list_disputes", [0, 50])) || [];
for (const dispute of disputes.slice(0, 3)) {
  await check(`dispute ${dispute.dispute_id}`, "get_dispute", [dispute.dispute_id]);
}
if (disputes[0]) {
  await check("dispute status", "get_dispute_status", [disputes[0].dispute_id]);
  await check("evidence", "get_evidence", [disputes[0].dispute_id, 0, 50]);
  await check("assessment history", "get_assessment_history", [disputes[0].dispute_id, 0, 50]);
  await check("challenges", "get_challenges", [disputes[0].dispute_id, 0, 50]);
}

const proposalIds = new Set(disputes.map((dispute) => dispute.proposal_id));
for (const proposalId of [...proposalIds].slice(0, 2)) {
  await check(`proposal ${proposalId}`, "get_proposal", [proposalId]);
  await check(`events ${proposalId}`, "get_events", [proposalId, 0, 50]);
}

if (config) {
  console.log(`\nRoles: owner=${config.owner} recorder=${config.recorder} registrar=${config.rule_registrar} escalator=${config.escalator}`);
  console.log(`Limits: ${JSON.stringify(config.limits)}`);
}

if (failures) {
  console.log(`\n${failures} view(s) failed.`);
  process.exit(1);
}
console.log("\nAll configured views returned successfully.");
