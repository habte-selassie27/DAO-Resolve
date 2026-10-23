import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildSnapshotPlan, parseSnapshotRef } from "../src/sources/snapshot.ts";
import { validatePlan } from "../src/normalize/events.ts";
import { submitPlan } from "../src/chain.ts";
import { readPlan, writePlan } from "../src/plan.ts";

const fixturePath = fileURLToPath(new URL("./fixtures/snapshot-proposal.json", import.meta.url));
const proposal = JSON.parse(fs.readFileSync(fixturePath, "utf8")).data.proposal;
const afterEnd = Number(proposal.end) + 10;

function planFor(source = proposal, options = {}) {
  return buildSnapshotPlan(source, { proposalIdOverride: "ENS-7.1", ...options });
}

test("parses Snapshot URLs and bare ids", () => {
  assert.equal(parseSnapshotRef(proposal.link).id, proposal.id);
  assert.equal(parseSnapshotRef(proposal.link).space, "ens.eth");
  assert.equal(parseSnapshotRef(proposal.id).id, proposal.id);
  assert.throws(() => parseSnapshotRef("not-a-proposal"), /64-hex/);
});

test("maps a closed Snapshot proposal to chronological process events", () => {
  const plan = planFor(proposal, {
    now: afterEnd,
    fetchedAt: "2026-10-23T00:00:00.000Z",
  });
  assert.equal(plan.events.length, 3);
  assert.deepEqual(
    plan.events.map((event) => event.event_type),
    ["SUBMITTED", "VOTING_STARTED", "VOTING_ENDED"]
  );
  assert.deepEqual(
    plan.events.map((event) => event.timestamp_ref),
    [proposal.created, proposal.start, proposal.end]
  );
  assert.equal(plan.events[0].actor, proposal.author);
  assert.equal(plan.events[0].evidence_ref, proposal.link);
  assert.equal(plan.actor_basis, "snapshot_author");
  assert.ok(plan.warnings.some((warning) => warning.includes("--actor")));
  assert.deepEqual(validatePlan(plan, afterEnd), []);
});

test("omits events that have not happened yet", () => {
  const future = {
    ...proposal,
    created: 1000,
    start: 1100,
    end: 1200,
  };
  const plan = planFor(future, { now: 1050 });
  assert.deepEqual(plan.events.map((event) => event.event_type), ["SUBMITTED"]);
  assert.ok(plan.warnings.some((warning) => warning.includes("VOTING_STARTED omitted")));
});

test("accepts an explicit governance actor", () => {
  const actor = "0x0000000000000000000000000000000000000001";
  const plan = planFor(proposal, { actorOverride: actor, now: afterEnd });
  assert.equal(plan.actor_basis, "override");
  assert.equal(plan.events[1].actor, actor);
  assert.equal(plan.events[2].actor, actor);
  assert.equal(plan.warnings.some((warning) => warning.includes("--actor")), false);
});

test("maps a long source id to a contract-safe proposal id", () => {
  const plan = buildSnapshotPlan(proposal, {
    now: afterEnd,
    proposalIdOverride: "ENS-7.1",
  });
  assert.equal(plan.proposal.proposal_id, "ENS-7.1");
  assert.ok(plan.warnings.some((warning) => warning.includes(proposal.id)));
  assert.throws(
    () => buildSnapshotPlan(proposal, { now: afterEnd }),
    /contract proposal id must be 1-64/
  );
});

test("rejects unsourced, non-chronological, and invalid events", () => {
  const plan = planFor(proposal, { now: afterEnd });
  const bad = structuredClone(plan);
  bad.events[0].evidence_ref = "";
  bad.events[1].timestamp_ref = 1;
  bad.events[2].actor = "not-an-address";
  const problems = validatePlan(bad, afterEnd);
  assert.ok(problems.some((problem) => problem.includes("no evidence_ref")));
  assert.ok(problems.some((problem) => problem.includes("not chronological")));
  assert.ok(problems.some((problem) => problem.includes("actor is not")));
});

test("dry run sends nothing and needs no key", async () => {
  const plan = planFor(proposal, { now: afterEnd });
  const result = await submitPlan(plan, {
    contractAddress: "0x0000000000000000000000000000000000000001",
    dryRun: true,
  });
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.submitted, []);
});

test("plan files round-trip and contain no private key", () => {
  const plan = planFor(proposal, { now: afterEnd });
  const target = "/tmp/opencode/daoresolve-recorder-plan.json";
  const file = writePlan(plan, target);
  const loaded = readPlan(file);
  assert.deepEqual(loaded.events, plan.events);
  const text = fs.readFileSync(file, "utf8");
  assert.equal(text.includes("RECORDER_PRIVATE_KEY"), false);
  assert.equal(/private.?key/i.test(text), false);
});
