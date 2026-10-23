import fs from "node:fs";
import path from "node:path";
import type { Plan } from "./normalize/events.ts";
import { validatePlan } from "./normalize/events.ts";

export const defaultLogDir = path.resolve(process.cwd(), "recorder/logs");

export function planPath(plan: Plan, explicitPath?: string) {
  if (explicitPath) return path.resolve(explicitPath);
  const safe = plan.proposal.proposal_id.replace(/[^A-Za-z0-9._:-]/g, "_");
  return path.join(defaultLogDir, `${safe}.json`);
}

export function writePlan(plan: Plan, explicitPath?: string) {
  const target = planPath(plan, explicitPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return target;
}

export function readPlan(file: string): Plan {
  const target = path.resolve(file);
  if (!fs.existsSync(target)) throw new Error(`Plan not found: ${target}`);
  const plan = JSON.parse(fs.readFileSync(target, "utf8")) as Plan;
  if (!plan || plan.plan_version !== 1 || plan.source !== "snapshot") {
    throw new Error("Not a DAOResolve snapshot plan (plan_version 1).");
  }
  if (!plan.proposal?.proposal_id) throw new Error("Plan has no proposal_id.");
  if (!Array.isArray(plan.events)) throw new Error("Plan has no events array.");
  const problems = validatePlan(plan);
  if (problems.length) throw new Error(`Plan is invalid:\n- ${problems.join("\n- ")}`);
  return plan;
}
