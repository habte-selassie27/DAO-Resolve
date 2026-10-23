<template>
  <div class="stack">
    <div class="between">
      <div>
        <p class="small muted" style="margin-bottom: 4px"><RouterLink to="/rules">Rules</RouterLink> / <span class="mono">{{ ruleId }}</span></p>
        <h1 style="margin-bottom: 4px">{{ rule?.title || ruleId }}</h1>
        <div v-if="rule" class="row">
          <span class="chip">v{{ rule.version }}</span>
          <span class="chip">{{ rule.category }}</span>
          <span class="chip" :class="rule.interpretation === 'DETERMINISTIC_ONLY' ? 'compliant' : 'signal'">
            {{ rule.interpretation }}
          </span>
          <span class="chip" :class="rule.status === 'ACTIVE' ? 'compliant' : 'system'">{{ rule.status }}</span>
        </div>
      </div>
      <RouterLink class="button secondary" to="/disputes">Disputes using rules</RouterLink>
    </div>

    <ErrorNotice v-if="error" :error="error" title="Could not load this rule" />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 70%" /><div class="skeleton" style="width: 90%" /></div>
    <template v-else-if="rule">
      <section class="panel">
        <h2>Registered clause</h2>
        <p class="serif" style="font-size: var(--step-3); white-space: pre-wrap">{{ rule.clause_text }}</p>
        <dl class="kv">
          <dt>Registered by</dt><dd><AddressChip :address="rule.registered_by" /></dd>
          <dt>Registered at</dt><dd>{{ formatTime(rule.registered_at) }}</dd>
          <dt>Supersedes</dt><dd>{{ rule.supersedes_version ? `version ${rule.supersedes_version}` : "—" }}</dd>
          <dt>Version id</dt><dd class="mono">{{ rule.rule_id }} v{{ rule.version }}</dd>
        </dl>
      </section>

      <section class="panel">
        <h2>Structured checks</h2>
        <p class="small muted">
          These are decided in code, before any model call. A failed check forces a violation.
          A DETERMINISTIC_ONLY rule never calls the model.
        </p>
        <div v-if="checks.length" class="stack" style="gap: 10px">
          <div v-for="check in checks" :key="check.check_id" class="panel flat">
            <div class="row" style="margin-bottom: 4px">
              <strong class="mono">{{ check.check_id }}</strong>
              <span class="chip">{{ check.kind }}</span>
            </div>
            <p class="small" style="margin: 0">{{ describe(check) }}</p>
          </div>
        </div>
        <EmptyState v-else message="No structured checks. This rule is decided by validator consensus only." />
      </section>

      <section class="panel">
        <h2>Version history</h2>
        <p class="small muted">
          A dispute pins the version that was current when it opened. Older versions are kept for
          the public record.
        </p>
        <table>
          <thead><tr><th>Version</th><th>Status</th><th>Registered</th><th>Clause</th></tr></thead>
          <tbody>
            <tr v-for="version in versions" :key="version.version">
              <td class="mono">v{{ version.version }}</td>
              <td><span class="chip" :class="version.status === 'ACTIVE' ? 'compliant' : 'system'">{{ version.status }}</span></td>
              <td>{{ formatTime(version.registered_at) }}</td>
              <td class="small">{{ version.clause_text }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <div class="between" style="margin-bottom: 8px">
          <h2 style="margin: 0">Disputes against this rule</h2>
          <span class="chip">{{ relatedDisputes.length }}</span>
        </div>
        <div v-if="relatedDisputes.length" style="overflow-x: auto">
          <table>
            <thead><tr><th>Dispute</th><th>Proposal</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="dispute in relatedDisputes" :key="dispute.dispute_id">
                <td><RouterLink :to="`/disputes/${dispute.dispute_id}`" class="mono">{{ dispute.dispute_id }}</RouterLink></td>
                <td class="mono">{{ dispute.proposal_id }}</td>
                <td>v{{ dispute.rule_version }}</td>
                <td><StatusChip :status="dispute.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="small muted" style="margin: 0">No disputes reference this rule yet.</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AddressChip from "../components/AddressChip.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import StatusChip from "../components/StatusChip.vue";
import { formatDuration, formatTime } from "../lib/format.js";
import { getRule, getRuleVersion, listDisputes } from "../lib/chain/reads.js";

const route = useRoute();
const ruleId = computed(() => String(route.params.ruleId));
const rule = ref(null);
const versions = ref([]);
const relatedDisputes = ref([]);
const loading = ref(true);
const error = ref("");

const checks = computed(() => {
  const raw = rule.value?.structured_checks;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
});

function describe(check) {
  if (check.kind === "MIN_ELAPSED") {
    return `${check.from_event_type} to ${check.to_event_type} must be at least ${formatDuration(check.threshold)}.`;
  }
  if (check.kind === "REQUIRED_EVENT") return `Event ${check.event_type} must exist.`;
  if (check.kind === "MIN_COUNT") return `At least ${check.threshold} ${check.event_type} events are required.`;
  if (check.kind === "REQUIRED_ROLE") return `A ${check.role} (pinned at registration) must have acted on ${check.event_type}.`;
  return check.kind;
}

async function load() {
  loading.value = true;
  try {
    rule.value = await getRule(ruleId.value);
    const found = [];
    const newest = Number(rule.value.version) || 1;
    for (let version = newest; version >= Math.max(1, newest - 9); version -= 1) {
      try {
        found.push(await getRuleVersion(ruleId.value, version));
      } catch {
        // Old versions may not be retrievable; stop at the first gap.
      }
    }
    versions.value = found;
    const disputes = (await listDisputes(0, 50)) || [];
    relatedDisputes.value = disputes.filter((dispute) => dispute.rule_id === ruleId.value);
    error.value = "";
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(ruleId, load);
</script>
