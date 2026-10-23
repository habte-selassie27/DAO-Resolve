<template>
  <span class="badge" :class="decidedBy === 'INTERPRETATION' ? 'pending' : 'system'">
    <span aria-hidden="true">{{ decidedBy === "INTERPRETATION" ? "◎" : "▣" }}</span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  decidedBy: { type: String, default: "" },
});

const label = computed(() =>
  props.decidedBy === "INTERPRETATION" ? "Validator consensus" : "Rule check"
);
</script>