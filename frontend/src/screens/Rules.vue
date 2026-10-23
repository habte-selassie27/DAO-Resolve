<template>
  <div class="stack">
    <div class="between">
      <div>
        <h1>Rules</h1>
        <p class="muted" style="margin: 0">
          A dispute pins the rule version that existed when it opened. New versions supersede old
          ones; old versions stay readable for the record.
        </p>
      </div>
      <button class="button" type="button" @click="showForm = true">Register a rule</button>
    </div>

    <div class="panel flat toolbar">
      <label class="sr-only" for="rule-search">Search rules</label>
      <input id="rule-search" v-model="query" type="search" placeholder="Search rule id or title" />
      <span class="chip">{{ filteredRules.length }} active</span>
      <span class="spacer" />
      <RouterLink class="small" to="/proposals">Proposals →</RouterLink>
    </div>

    <ErrorNotice v-if="error" :error="error" title="Could not load rules" />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 45%" /><div class="skeleton" style="width: 70%" /></div>
    <div v-else-if="filteredRules.length" class="stack" style="gap: 12px">
      <article v-for="rule in filteredRules" :key="`${rule.rule_id}-${rule.version}`" class="panel">
        <div class="between">
          <div>
            <div class="row" style="margin-bottom: 4px">
              <span class="mono">{{ rule.rule_id }}</span>
              <span class="chip">v{{ rule.version }}</span>
              <span class="chip">{{ rule.category }}</span>
              <span class="chip" :class="rule.interpretation === 'DETERMINISTIC_ONLY' ? 'compliant' : 'signal'">
                {{ rule.interpretation === "DETERMINISTIC_ONLY" ? "code-checkable" : "needs interpretation" }}
              </span>
            </div>
            <h3 style="margin-bottom: 4px">{{ rule.title }}</h3>
            <p class="small muted" style="margin: 0">
              {{
                rule.interpretation === "DETERMINISTIC_ONLY"
                  ? "Code decides this rule. No model call is needed."
                  : "Code checks run first; validator consensus reads the residual ambiguity."
              }}
            </p>
          </div>
          <RouterLink class="button secondary small" :to="`/rules/${rule.rule_id}`">Open rule</RouterLink>
        </div>
      </article>
    </div>
    <EmptyState v-else :message="query ? 'No active rule matches that search.' : emptyCopy.rules" />

    <SheetDialog :open="showForm" title="Register a rule" @close="showForm = false">
      <RoleGate role="registrar" title="Registering rules needs the registrar role">
        <form @submit.prevent="submit">
          <div class="form-grid">
            <div class="field">
              <label for="rule-id">Rule id</label>
              <input id="rule-id" v-model.trim="form.ruleId" required placeholder="R-REVIEW" />
              <span class="hint">Letters, digits, dash, underscore, dot, colon.</span>
            </div>
            <div class="field">
              <label for="rule-title">Title</label>
              <input id="rule-title" v-model.trim="form.title" required placeholder="Minimum review period" />
            </div>
            <div class="field">
              <label for="rule-category">Category</label>
              <select id="rule-category" v-model="form.category">
                <option>PROCESS</option><option>QUORUM</option><option>TIMING</option>
                <option>ELIGIBILITY</option><option>DISCLOSURE</option><option>OTHER</option>
              </select>
            </div>
            <div class="field">
              <label for="rule-interpretation">Interpretation</label>
              <select id="rule-interpretation" v-model="form.interpretation">
                <option value="DETERMINISTIC_ONLY">DETERMINISTIC_ONLY</option>
                <option value="NEEDS_INTERPRETATION">NEEDS_INTERPRETATION</option>
              </select>
              <span class="hint">DETERMINISTIC_ONLY requires at least one check.</span>
            </div>
            <div class="field full">
              <label for="rule-clause">Clause text</label>
              <textarea id="rule-clause" v-model.trim="form.clauseText" required placeholder="Proposals require at least 48 hours of review before voting…" />
              <span class="hint">{{ form.clauseText.length }} / 2000 characters.</span>
            </div>
          </div>

          <hr class="divider" />
          <h3>Structured checks</h3>
          <p class="small muted">
            These run in code before any model. A failed check forces a violation. For an
            interpretive rule, a failed check is still decisive.
          </p>
          <CheckEditor v-model="form.checks" />
          <hr class="divider" />
          <p v-if="formError" class="notice violation small">{{ formError }}</p>
          <div class="row">
            <button class="button" type="submit" :disabled="submitting">
              {{ submitting ? "Submitting…" : "Register rule" }}
            </button>
            <button class="button secondary" type="button" @click="showForm = false">Cancel</button>
          </div>
        </form>
      </RoleGate>
    </SheetDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import CheckEditor from "../components/CheckEditor.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import RoleGate from "../components/RoleGate.vue";
import SheetDialog from "../components/SheetDialog.vue";
import { emptyCopy } from "../domain/copy.js";
import { listActiveRules } from "../lib/chain/reads.js";
import { registerRule } from "../lib/chain/writes.js";
import { runTransaction } from "../lib/chain/tx.js";

const rules = ref([]);
const loading = ref(true);
const error = ref("");
const query = ref("");
const showForm = ref(false);
const submitting = ref(false);
const formError = ref("");

const form = reactive({
  ruleId: "",
  title: "",
  category: "TIMING",
  interpretation: "DETERMINISTIC_ONLY",
  clauseText: "",
  checks: [],
});

const filteredRules = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return rules.value;
  return rules.value.filter(
    (rule) => rule.rule_id.toLowerCase().includes(term) || rule.title.toLowerCase().includes(term)
  );
});

async function load() {
  loading.value = true;
  try {
    rules.value = (await listActiveRules(0, 50)) || [];
    error.value = "";
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
}

function validate() {
  if (!/^[A-Za-z0-9._:-]+$/.test(form.ruleId)) return "Rule id contains unsupported characters.";
  if (form.clauseText.length > 2000) return "Clause text is over the 2000 character limit.";
  if (form.interpretation === "DETERMINISTIC_ONLY" && form.checks.length === 0) {
    return "A DETERMINISTIC_ONLY rule needs at least one check.";
  }
  const ids = form.checks.map((check) => check.check_id);
  if (ids.some((id) => !id)) return "Every check needs an id.";
  if (new Set(ids).size !== ids.length) return "Check ids must be unique.";
  for (const check of form.checks) {
    if (["MIN_ELAPSED", "REQUIRED_EVENT", "MIN_COUNT", "REQUIRED_ROLE"].includes(check.kind)) {
      if (!Number.isFinite(Number(check.threshold)) || Number(check.threshold) < 0) {
        return "Thresholds must be non-negative numbers.";
      }
    }
    if (check.kind === "MIN_ELAPSED" && (!check.from_event_type || !check.to_event_type)) {
      return "MIN_ELAPSED needs both event types.";
    }
    if (check.kind !== "MIN_ELAPSED" && !check.event_type) {
      return `${check.kind} needs an event type.`;
    }
  }
  return "";
}

async function submit() {
  formError.value = validate();
  if (formError.value) return;
  submitting.value = true;
  try {
    await runTransaction({
      label: `Register rule ${form.ruleId}`,
      send: () =>
        registerRule({
          ruleId: form.ruleId,
          title: form.title,
          clauseText: form.clauseText,
          category: form.category,
          interpretation: form.interpretation,
          checks: form.checks.map((check) => ({
            check_id: check.check_id,
            kind: check.kind,
            event_type: check.event_type || "",
            from_event_type: check.from_event_type || "",
            to_event_type: check.to_event_type || "",
            threshold: Number(check.threshold) || 0,
            role: check.role || "",
            role_address: "0x0000000000000000000000000000000000000000",
          })),
        }),
      onFinalized: load,
    });
    showForm.value = false;
    Object.assign(form, {
      ruleId: "",
      title: "",
      category: "TIMING",
      interpretation: "DETERMINISTIC_ONLY",
      clauseText: "",
      checks: [],
    });
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>
