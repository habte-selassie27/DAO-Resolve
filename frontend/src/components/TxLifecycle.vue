<template>
  <div v-if="txState.items.length" class="tx-tray" aria-live="polite">
    <article v-for="item in txState.items" :key="item.id" class="tx-item">
      <div class="tx-head">
        <strong class="small">{{ item.label }}</strong>
        <button class="copy" type="button" aria-label="Dismiss transaction" @click="dismissTx(item.id)">×</button>
      </div>
      <div class="tx-steps" aria-hidden="true">
        <span
          v-for="(step, index) in steps"
          :key="step"
          class="tx-step"
          :class="stepClass(item, index)"
        />
      </div>
      <p class="small" style="margin: 0">
        <span class="chip" :class="chipTone(item.stage)">{{ stageLabels[item.stage] || item.stage }}</span>
        <span v-if="item.detail" class="muted"> {{ item.detail }}</span>
      </p>
      <p v-if="item.error" class="small" style="color: var(--violation); margin: 6px 0 0">{{ item.error }}</p>
      <details v-if="item.errorDetail" class="small">
        <summary>Technical detail</summary>
        <pre class="wrap mono tiny" style="margin: 4px 0 0">{{ item.errorDetail }}</pre>
      </details>
      <p v-if="item.hash" class="tiny mono wrap" style="margin: 6px 0 0">
        <a :href="explorerTxUrl(item.hash)" target="_blank" rel="noopener noreferrer">{{ item.hash }}</a>
      </p>
      <p v-if="item.stage === 'accepted'" class="tiny muted" style="margin: 4px 0 0">
        Accepted. This can still be appealed; finality is confirmed separately.
      </p>
    </article>
  </div>
</template>

<script setup>
import { txState, dismissTx, stageLabels } from "../lib/chain/tx.js";
import { explorerTxUrl } from "../config/networks.js";

const steps = ["submitted", "consensus", "accepted", "finalized"];

function stepClass(item, index) {
  const order = steps.indexOf(item.stage);
  if (item.stage === "failed" || item.stage === "reverted" || item.stage === "rejected") {
    return index <= 1 ? "fail" : "";
  }
  if (order < 0) return index === 0 ? "active" : "";
  if (index < order) return "done";
  if (index === order) return "active";
  return "";
}

function chipTone(stage) {
  if (stage === "finalized") return "compliant";
  if (stage === "failed" || stage === "reverted" || stage === "rejected") return "violation";
  if (stage === "accepted") return "signal";
  return "system";
}
</script>