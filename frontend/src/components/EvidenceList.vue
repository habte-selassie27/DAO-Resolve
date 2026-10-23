<template>
  <section class="panel" aria-labelledby="evidence-heading">
    <div class="between" style="margin-bottom: 8px">
      <h3 id="evidence-heading" style="margin: 0">Evidence</h3>
      <span class="chip">{{ evidence.length }} / {{ cap }}</span>
    </div>
    <p class="small muted">
      Sides are self-declared by the submitter. The contract records them; it does not verify that
      the submitter is who the label claims. A label is not proof.
    </p>

    <div v-if="evidence.length" class="stack" style="gap: 10px">
      <article v-for="item in evidence" :key="item.evidence_id" class="panel flat">
        <div class="between" style="margin-bottom: 4px">
          <div class="row">
            <strong class="mono small">{{ item.evidence_id }}</strong>
            <span class="chip" :class="item.side === 'DISPUTANT' ? 'signal' : 'system'">{{ item.side }} (self-declared)</span>
            <span class="chip">{{ item.kind }}</span>
          </div>
          <span class="tiny muted">{{ formatTime(item.submitted_at) }}</span>
        </div>
        <EvidenceRef :item="item" />
        <p class="tiny muted" style="margin: 6px 0 0">
          submitted by <AddressChip :address="item.submitted_by" />
        </p>
      </article>
    </div>
    <EmptyState v-else :message="emptyCopy.evidence" />
  </section>
</template>

<script setup>
import AddressChip from "./AddressChip.vue";
import EmptyState from "./EmptyState.vue";
import EvidenceRef from "./EvidenceRef.vue";
import { emptyCopy } from "../domain/copy.js";
import { formatTime } from "../lib/format.js";

defineProps({
  evidence: { type: Array, default: () => [] },
  cap: { type: Number, default: 32 },
});
</script>
