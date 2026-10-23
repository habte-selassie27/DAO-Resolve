<template>
  <div class="stack">
    <div class="between">
      <div>
        <h1>Disputes</h1>
        <p class="muted" style="margin: 0">
          Every dispute is a public, append-only record. A verdict is an assessment against the
          pinned rule version, not a penalty and not a legal ruling.
        </p>
      </div>
      <RouterLink class="button" to="/proposals">Open a dispute from a proposal</RouterLink>
    </div>

    <div class="panel flat toolbar">
      <label class="sr-only" for="dispute-filter">Filter by status</label>
      <select id="dispute-filter" v-model="statusFilter">
        <option value="">All statuses</option>
        <option>OPEN</option><option>EVALUATED</option><option>RE_EVALUATED</option>
        <option>CHALLENGED</option><option>FINALIZED</option><option>ESCALATED</option><option>WITHDRAWN</option>
      </select>
      <label class="sr-only" for="dispute-search">Search</label>
      <input id="dispute-search" v-model="query" type="search" placeholder="Search dispute, proposal, rule" />
      <span class="chip">{{ filtered.length }} shown</span>
    </div>

    <ErrorNotice v-if="error" :error="error" title="Could not load disputes" />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 55%" /><div class="skeleton" style="width: 80%" /></div>
    <div v-else-if="filtered.length" class="panel" style="overflow-x: auto">
      <table>
        <thead>
          <tr><th>Dispute</th><th>Proposal</th><th>Rule</th><th>Status</th><th>Latest verdict</th><th>Challenges</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.dispute_id">
            <td class="mono nowrap">{{ item.dispute_id }}</td>
            <td class="mono">{{ item.proposal_id }}</td>
            <td class="mono nowrap">{{ item.rule_id }} · v{{ item.rule_version }}</td>
            <td><StatusChip :status="item.status" /></td>
            <td>
              <VerdictBadge v-if="item.latest_assessment?.verdict" :verdict="item.latest_assessment.verdict" />
              <span v-else class="muted small">not assessed</span>
            </td>
            <td>{{ item.challenge_count }}</td>
            <td class="right"><RouterLink :to="`/disputes/${item.dispute_id}`">Open</RouterLink></td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else :message="emptyCopy.disputes" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import StatusChip from "../components/StatusChip.vue";
import VerdictBadge from "../components/VerdictBadge.vue";
import { emptyCopy } from "../domain/copy.js";
import { getDispute, listDisputes } from "../lib/chain/reads.js";

const disputes = ref([]);
const loading = ref(true);
const error = ref("");
const query = ref("");
const statusFilter = ref("");

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  return disputes.value.filter((item) => {
    if (statusFilter.value && item.status !== statusFilter.value) return false;
    if (!term) return true;
    return [item.dispute_id, item.proposal_id, item.rule_id, item.status]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
});

onMounted(async () => {
  try {
    const page = (await listDisputes(0, 50)) || [];
    const details = await Promise.all(
      page.map(async (item) => {
        try {
          return await getDispute(item.dispute_id);
        } catch {
          return item;
        }
      })
    );
    disputes.value = details;
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
});
</script>
