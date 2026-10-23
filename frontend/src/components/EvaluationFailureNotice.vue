<template>
  <section class="panel" style="border-style: dashed" role="alert" aria-labelledby="eval-failure-heading">
    <div class="between" style="margin-bottom: 6px">
      <div class="row">
        <span class="badge system">No assessment</span>
        <h3 id="eval-failure-heading" style="margin: 0">The evaluation did not produce a verdict</h3>
      </div>
      <span class="chip">not a finding</span>
    </div>
    <p class="small" style="margin-bottom: 4px">
      This is a system or evidence-access failure, not COMPLIANT, VIOLATION, or INCONCLUSIVE.
      No assessment was appended and the dispute's status was not changed.
    </p>
    <p class="small muted" style="margin-bottom: 10px">{{ explanation.message }}</p>
    <p v-if="explanation.action" class="small muted" style="margin-bottom: 10px">{{ explanation.action }}</p>
    <div class="row">
      <button v-if="retryLabel" class="button" type="button" :disabled="retrying" @click="$emit('retry')">
        {{ retrying ? "Retrying…" : retryLabel }}
      </button>
      <details v-if="raw">
        <summary class="small">Technical detail</summary>
        <pre class="wrap mono tiny" style="margin: 6px 0 0">{{ raw }}</pre>
      </details>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { explainError } from "../lib/errors.js";

const props = defineProps({
  error: { type: String, default: "" },
  retryLabel: { type: String, default: "Retry evaluation" },
  retrying: { type: Boolean, default: false },
});
defineEmits(["retry"]);

const explanation = computed(() => explainError(props.error));
const raw = computed(() => String(props.error || ""));
</script>
