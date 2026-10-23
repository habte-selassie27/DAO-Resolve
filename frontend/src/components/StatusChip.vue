<template>
  <span class="chip" :class="tone" :title="description">{{ label }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, default: "OPEN" },
});

const copy = {
  OPEN: { label: "Open", tone: "", description: "No assessment yet." },
  EVALUATED: { label: "Assessed", tone: "signal", description: "Challengeable until the window closes." },
  RE_EVALUATED: { label: "Re-assessed", tone: "signal", description: "Challengeable until the window closes." },
  CHALLENGED: { label: "Challenged", tone: "violation", description: "Waiting for a re-evaluation." },
  FINALIZED: { label: "Finalized", tone: "compliant", description: "Final advisory record." },
  ESCALATED: { label: "Escalated", tone: "system", description: "Handed to the DAO's own procedure." },
  WITHDRAWN: { label: "Withdrawn", tone: "system", description: "Withdrawn by the disputant." },
};

const label = computed(() => copy[props.status]?.label || props.status);
const tone = computed(() => copy[props.status]?.tone || "system");
const description = computed(() => copy[props.status]?.description || "Unrecognized status.");
</script>
