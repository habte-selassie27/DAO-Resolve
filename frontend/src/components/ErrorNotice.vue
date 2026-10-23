<template>
  <div class="notice system" role="alert">
    <p style="margin-bottom: 4px"><strong>{{ title }}</strong></p>
    <p class="small muted" style="margin-bottom: 4px">{{ explanation.message }}</p>
    <p v-if="explanation.action" class="small muted" style="margin-bottom: 0">
      {{ explanation.action }}
    </p>
    <div v-if="retryLabel" class="row" style="margin-top: 8px">
      <button class="button secondary small" type="button" @click="$emit('retry')">
        {{ retryLabel }}
      </button>
    </div>
    <details v-if="raw" class="small" style="margin-top: 8px">
      <summary>Technical detail</summary>
      <pre class="wrap mono tiny" style="margin: 6px 0 0">{{ raw }}</pre>
    </details>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { explainError } from "../lib/errors.js";

const props = defineProps({
  error: { type: [String, Object], default: "" },
  title: { type: String, default: "Something went wrong" },
  retryLabel: { type: String, default: "" },
});
defineEmits(["retry"]);
const raw = computed(() => (typeof props.error === "string" ? props.error : props.error?.message || ""));
const explanation = computed(() => explainError(raw.value));
</script>
