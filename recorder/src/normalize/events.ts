export const EVENT_TYPES = [
  "SUBMITTED",
  "REVIEW_STARTED",
  "DISCUSSION_OPENED",
  "REVIEW_COMPLETED",
  "VOTING_STARTED",
  "VOTING_ENDED",
  "EXECUTED",
  "CANCELLED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type ProcessEvent = {
  event_id: string;
  event_type: EventType;
  actor: string;
  timestamp_ref: number;
  evidence_ref: string;
};

export type Plan = {
  plan_version: 1;
  source: "snapshot";
  source_url: string;
  fetched_at: string;
  proposal: {
    proposal_id: string;
    title: string;
    space: string;
  };
  actor_basis: "snapshot_author" | "override";
  warnings: string[];
  events: ProcessEvent[];
  raw_fields_used: Record<string, string | number>;
};

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS.test(value);
}

export function validatePlan(plan: Plan, now = Math.floor(Date.now() / 1000)) {
  const problems: string[] = [];
  if (!plan.events.length) problems.push("plan has no events");
  if (plan.events.length > 128) problems.push("plan exceeds the 128-event proposal cap");

  let previous = -1;
  const ids = new Set<string>();
  for (const event of plan.events) {
    if (!event.event_id) problems.push("event is missing an id");
    if (ids.has(event.event_id)) problems.push(`duplicate event id: ${event.event_id}`);
    ids.add(event.event_id);
    if (!EVENT_TYPES.includes(event.event_type)) {
      problems.push(`event ${event.event_id} has unknown type ${event.event_type}`);
    }
    if (!Number.isInteger(event.timestamp_ref) || event.timestamp_ref <= 0) {
      problems.push(`event ${event.event_id} has a non-integer or zero timestamp`);
    }
    if (event.timestamp_ref > now + 86400) {
      problems.push(`event ${event.event_id} is more than one day in the future`);
    }
    if (event.timestamp_ref < previous) {
      problems.push(`events are not chronological at ${event.event_id}`);
    }
    previous = event.timestamp_ref;
    if (!isAddress(event.actor)) {
      problems.push(`event ${event.event_id} actor is not a 20-byte hex address`);
    }
    if (!event.evidence_ref) {
      problems.push(`event ${event.event_id} has no evidence_ref; unsourced events are rejected`);
    }
    if (event.evidence_ref.length > 512) {
      problems.push(`event ${event.event_id} evidence_ref exceeds 512 characters`);
    }
  }
  return problems;
}

export function normalizePlan(events: ProcessEvent[]): ProcessEvent[] {
  return [...events]
    .map((event) => ({
      ...event,
      event_type: String(event.event_type).toUpperCase() as EventType,
      actor: String(event.actor),
      evidence_ref: String(event.evidence_ref || "").trim(),
      timestamp_ref: Math.trunc(Number(event.timestamp_ref)),
    }))
    .sort((a, b) => a.timestamp_ref - b.timestamp_ref || a.event_id.localeCompare(b.event_id));
}
