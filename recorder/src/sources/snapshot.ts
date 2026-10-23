import { isAddress, normalizePlan, type Plan, type ProcessEvent } from "../normalize/events.ts";

const GRAPHQL = "https://hub.snapshot.org/graphql";

export type SnapshotProposal = {
  id: string;
  title: string;
  created: number;
  start: number;
  end: number;
  state: string;
  author: string;
  link?: string;
  space?: { id: string };
};

export function parseSnapshotRef(ref: string) {
  const text = String(ref || "").trim();
  const idMatch = text.match(/0x[a-fA-F0-9]{64}/);
  if (!idMatch) {
    throw new Error("Snapshot reference must contain a 0x-prefixed 64-hex proposal id.");
  }
  const spaceMatch = text.match(/\/s:([^/]+)\//) || text.match(/snapshot\.org\/#\/([^/]+)\//);
  return { id: idMatch[0], space: spaceMatch ? spaceMatch[1] : "" };
}

export async function fetchSnapshotProposal(ref: string): Promise<SnapshotProposal> {
  const { id } = parseSnapshotRef(ref);
  const query = `query Proposal($id: String!) {
    proposal(id: $id) {
      id
      title
      created
      start
      end
      state
      author
      link
      space { id }
    }
  }`;
  const response = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { id } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Snapshot API returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as {
    data?: { proposal?: SnapshotProposal | null };
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length) {
    throw new Error(`Snapshot API error: ${payload.errors.map((item) => item.message).join("; ")}`);
  }
  const proposal = payload.data?.proposal;
  if (!proposal) throw new Error(`Snapshot proposal ${id} was not found.`);
  return proposal;
}

export function buildSnapshotPlan(
  proposal: SnapshotProposal,
  options: { actorOverride?: string; proposalIdOverride?: string; now?: number; fetchedAt?: string } = {}
): Plan {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const proposalId = options.proposalIdOverride || proposal.id;
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(proposalId)) {
    throw new Error(
      "The contract proposal id must be 1-64 characters (letters, digits, dash, underscore, dot, colon). " +
        "Pass --proposal-id to map this source proposal to a shorter contract id."
    );
  }
  const warnings: string[] = [];
  if (!isAddress(proposal.author)) {
    throw new Error("Snapshot proposal author is not a 20-byte hex address; no event actor can be derived.");
  }
  if (options.actorOverride && !isAddress(options.actorOverride)) {
    throw new Error("--actor must be a 20-byte hex address.");
  }
  const actor = options.actorOverride || proposal.author;
  if (options.proposalIdOverride && options.proposalIdOverride !== proposal.id) {
    warnings.push(
      `Contract proposal id ${options.proposalIdOverride} maps to Snapshot proposal ${proposal.id}.`
    );
  }
  if (!options.actorOverride) {
    warnings.push(
      "Voting events use the proposal author as the actor because no --actor was supplied. Pass --actor to name the governance actor."
    );
  }
  const space = proposal.space?.id || (() => {
    try {
      return proposal.link ? parseSnapshotRef(proposal.link).space : "";
    } catch {
      return "";
    }
  })();
  if (!space) warnings.push("Snapshot did not return a space id; the proposal id is still usable.");
  const evidenceRef =
    proposal.link ||
    (space ? `https://snapshot.box/#/s:${space}/proposal/${proposal.id}` : `snapshot:${proposal.id}`);

  const events: ProcessEvent[] = [];
  if (Number(proposal.created) <= now) {
    events.push({
      event_id: "submitted",
      event_type: "SUBMITTED",
      actor: proposal.author,
      timestamp_ref: Number(proposal.created),
      evidence_ref: evidenceRef,
    });
  } else {
    warnings.push("Proposal creation is in the future for this clock; SUBMITTED omitted.");
  }
  if (Number(proposal.start) <= now) {
    events.push({
      event_id: "voting-started",
      event_type: "VOTING_STARTED",
      actor,
      timestamp_ref: Number(proposal.start),
      evidence_ref: evidenceRef,
    });
  } else {
    warnings.push("Voting has not started at the fetch time; VOTING_STARTED omitted.");
  }
  if (Number(proposal.end) <= now) {
    events.push({
      event_id: "voting-ended",
      event_type: "VOTING_ENDED",
      actor,
      timestamp_ref: Number(proposal.end),
      evidence_ref: evidenceRef,
    });
  } else {
    warnings.push("Voting has not ended at the fetch time; VOTING_ENDED omitted.");
  }

  const normalized = normalizePlan(events);
  return {
    plan_version: 1,
    source: "snapshot",
    source_url: evidenceRef,
    fetched_at: fetchedAt,
    proposal: {
      proposal_id: proposalId,
      title: proposal.title,
      space,
    },
    actor_basis: options.actorOverride ? "override" : "snapshot_author",
    warnings,
    events: normalized,
    raw_fields_used: {
      id: proposal.id,
      created: Number(proposal.created),
      start: Number(proposal.start),
      end: Number(proposal.end),
      state: proposal.state,
      author: proposal.author,
    },
  };
}
