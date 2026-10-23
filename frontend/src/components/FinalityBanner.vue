<template>
  <div class="notice" :class="tone">
    <p class="row" style="margin-bottom: 4px">
      <strong>{{ title }}</strong>
      <span class="chip">{{ status }}</span>
    </p>
    <p class="small muted" style="margin: 0">{{ detail }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { finalityCopy } from "../domain/copy.js";
import { timeAgo, timeUntil } from "../lib/format.js";

const props = defineProps({
  status: { type: String, default: "OPEN" },
  deadline: { type: Number, default: 0 },
  escalated: { type: Boolean, default: false },
});

const title = computed(() => {
  if (props.status === "FINALIZED") return "Finalized record";
  if (props.status === "ESCALATED") return "Handed to the DAO";
  if (props.status === "WITHDRAWN") return "Withdrawn";
  if (props.status === "CHALLENGED") return "Challenge pending";
  if (props.status === "OPEN") return "Open";
  if (
    props.deadline &&
    ["EVALUATED", "RE_EVALUATED"].includes(props.status) &&
    props.deadline <= Math.floor(Date.now() / 1000)
  ) {
    return "Assessed; challenge window closed";
  }
  return "Assessed, provisional";
});

const detail = computed(() => {
  const base = finalityCopy[props.status] || "Status is not recognized.";
  if (
    props.deadline &&
    ["EVALUATED", "RE_EVALUATED"].includes(props.status) &&
    !props.escalated
  ) {
    const expired = props.deadline <= Math.floor(Date.now() / 1000);
    if (expired) {
      return `The challenge window closed ${timeAgo(props.deadline)}. The dispute can be finalized unless its category requires escalation.`;
    }
    return `The challenge window closes ${timeUntil(props.deadline)}. A challenge inside the window appends a new round.`;
  }
  return base;
});

const tone = computed(() => {
  if (props.status === "FINALIZED") return "compliant";
  if (props.status === "ESCALATED") return "system";
  if (props.status === "WITHDRAWN") return "system";
  return "";
});
</script>