<template>
  <span class="badge" :class="tone" :aria-label="`Verdict: ${label}`">
    <span aria-hidden="true">{{ icon }}</span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  verdict: { type: String, default: "" },
});

const label = computed(() => {
  const value = String(props.verdict || "").toUpperCase();
  if (value === "COMPLIANT") return "Compliant";
  if (value === "VIOLATION") return "Violation";
  if (value === "INCONCLUSIVE") return "Inconclusive";
  return "Unknown verdict";
});

const tone = computed(() => {
  const value = String(props.verdict || "").toUpperCase();
  if (value === "COMPLIANT") return "compliant";
  if (value === "VIOLATION") return "violation";
  if (value === "INCONCLUSIVE") return "inconclusive";
  return "system";
});

const icon = computed(() => {
  const value = String(props.verdict || "").toUpperCase();
  if (value === "COMPLIANT") return "✓";
  if (value === "VIOLATION") return "!";
  if (value === "INCONCLUSIVE") return "?";
  return "·";
});
</script>