<template>
  <div class="stack">
    <section class="grid two" style="align-items: stretch">
      <div class="stack" style="justify-content: center">
        <span class="chip signal" style="align-self: flex-start">Advisory dispute adjudication for DAOs</span>
        <h1 style="margin-bottom: 0">Did the process hold?</h1>
        <p class="lede">
          DAOs write rules in prose, then decide disputes informally. DAOResolve records the process,
          checks what code can check, and uses AI-validator consensus only for the ambiguity that is left.
          Every step stays on the public record.
        </p>
        <div class="row">
          <RouterLink class="button" to="/disputes">Open a dispute record</RouterLink>
          <RouterLink class="button secondary" to="/how-it-works">How a verdict is made</RouterLink>
        </div>
        <p class="small muted" style="margin: 0">
          This contract is advisory. It never executes, cancels, or reverses a governance action.
        </p>
      </div>

      <div class="panel" aria-labelledby="case-heading">
        <div class="between" style="margin-bottom: 8px">
          <h2 id="case-heading" style="margin: 0; font-size: var(--step-4)">Start with a real case</h2>
          <span class="chip">live demo data</span>
        </div>
        <p class="small muted">
          These disputes are already on the deployed contract. Open one to see the evidence,
          the checks, the decision source, and whether it is final.
        </p>
        <div class="stack" style="gap: 8px">
          <RouterLink
            v-for="caseItem in cases"
            :key="caseItem.id"
            :to="`/disputes/${caseItem.id}`"
            class="panel flat"
            style="text-decoration: none; color: inherit; display: block"
          >
            <div class="between">
              <div>
                <strong class="mono">{{ caseItem.id }}</strong>
                <span class="muted small"> · {{ caseItem.ruleId }}</span>
                <p class="small" style="margin: 2px 0 0">{{ caseItem.claim }}</p>
              </div>
              <div class="row" style="justify-content: flex-end">
                <span class="chip" :class="caseItem.tone">{{ caseItem.label }}</span>
                <span class="chip">{{ caseItem.status }}</span>
              </div>
            </div>
          </RouterLink>
          <p v-if="casesError" class="small muted" style="margin: 0">
            Demo cases could not be read: {{ casesError }}
          </p>
        </div>
      </div>
    </section>

    <TrustStatement />

    <section class="grid three" aria-label="Activity at a glance">
      <div class="panel">
        <p class="metric">{{ metrics.rules }}</p>
        <p class="metric-label">active rule versions</p>
        <p class="small muted" style="margin: 6px 0 0">Versioned at registration. Disputes pin a version.</p>
      </div>
      <div class="panel">
        <p class="metric">{{ metrics.open }}</p>
        <p class="metric-label">disputes in progress</p>
        <p class="small muted" style="margin: 6px 0 0">Open, assessed, challenged, or awaiting re-evaluation.</p>
      </div>
      <div class="panel">
        <p class="metric">{{ metrics.final }}</p>
        <p class="metric-label">final or handed off</p>
        <p class="small muted" style="margin: 6px 0 0">Finalized, escalated, or withdrawn. The record stays public.</p>
      </div>
    </section>

    <section class="panel" aria-labelledby="how-heading">
      <div class="between" style="margin-bottom: 12px">
        <h2 id="how-heading" style="margin: 0">Code first, consensus second</h2>
        <RouterLink class="small" to="/how-it-works">The full method</RouterLink>
      </div>
      <div class="grid three">
        <div>
          <span class="chip">1 · process</span>
          <h3 style="margin-top: 8px">Record what happened</h3>
          <p class="small muted">
            An authorized recorder logs events such as SUBMITTED or VOTING_STARTED, each with a
            timestamp and a public source link. Unsourced events are marked, not hidden.
          </p>
        </div>
        <div>
          <span class="chip">2 · checks</span>
          <h3 style="margin-top: 8px">Let code decide first</h3>
          <p class="small muted">
            Timing, required events, counts, and required roles are enforced as structured checks.
            A failed check forces a violation; no model can override it.
          </p>
        </div>
        <div>
          <span class="chip">3 · interpretation</span>
          <h3 style="margin-top: 8px">Vote on meaning, not bytes</h3>
          <p class="small muted">
            Validators fetch the evidence live and compare verdict, confidence band, and readable
            citations. Unreadable evidence cannot support a decisive verdict.
          </p>
        </div>
      </div>
    </section>

    <section class="panel" aria-labelledby="recent-heading">
      <div class="between" style="margin-bottom: 10px">
        <h2 id="recent-heading" style="margin: 0">Recent disputes</h2>
        <RouterLink class="small" to="/disputes">All disputes</RouterLink>
      </div>
      <div v-if="loading" class="stack"><div class="skeleton" style="width: 60%" /><div class="skeleton" style="width: 80%" /></div>
      <ErrorNotice v-else-if="error" :error="error" title="Could not load disputes" />
      <div v-else-if="disputes.length" style="overflow-x: auto">
        <table>
          <thead><tr><th>Dispute</th><th>Proposal</th><th>Rule</th><th>Status</th><th>Challenges</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in disputes.slice(0, 8)" :key="item.dispute_id">
              <td class="mono">{{ item.dispute_id }}</td>
              <td class="mono">{{ item.proposal_id }}</td>
              <td class="mono">{{ item.rule_id }} · v{{ item.rule_version }}</td>
              <td><StatusChip :status="item.status" /></td>
              <td>{{ item.challenge_count }}</td>
              <td class="right"><RouterLink :to="`/disputes/${item.dispute_id}`">Open</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else :message="emptyCopy.disputes" />
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusChip from "../components/StatusChip.vue";
import TrustStatement from "../components/TrustStatement.vue";
import { emptyCopy } from "../domain/copy.js";
import { demoDisputeIds } from "../config/contracts.js";
import { getDispute, listActiveRules, listDisputes } from "../lib/chain/reads.js";

const rules = ref([]);
const disputes = ref([]);
const loading = ref(true);
const error = ref("");
const cases = ref([]);
const casesError = ref("");

const metrics = computed(() => {
  const openStatuses = ["OPEN", "EVALUATED", "RE_EVALUATED", "CHALLENGED"];
  return {
    rules: rules.value.length,
    open: disputes.value.filter((item) => openStatuses.includes(item.status)).length,
    final: disputes.value.filter((item) => ["FINALIZED", "ESCALATED", "WITHDRAWN"].includes(item.status)).length,
  };
});

onMounted(async () => {
  try {
    const [rulePage, disputePage] = await Promise.all([listActiveRules(0, 50), listDisputes(0, 50)]);
    rules.value = rulePage || [];
    disputes.value = disputePage || [];
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }

  try {
    const loaded = await Promise.all(
      demoDisputeIds.map(async (id) => {
        const dispute = await getDispute(id);
        return {
          id,
          ruleId: dispute.rule_id,
          claim: dispute.claim_text,
          status: dispute.status,
          label: dispute.latest_assessment?.verdict || "No assessment",
          tone:
            dispute.latest_assessment?.verdict === "COMPLIANT"
              ? "compliant"
              : dispute.latest_assessment?.verdict === "VIOLATION"
                ? "violation"
                : "inconclusive",
        };
      })
    );
    cases.value = loaded;
  } catch (loadError) {
    casesError.value = loadError?.message || String(loadError);
  }
});
</script>
