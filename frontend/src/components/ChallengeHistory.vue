<template>
  <section class="panel" aria-labelledby="challenges-heading">
    <div class="between" style="margin-bottom: 8px">
      <h3 id="challenges-heading" style="margin: 0">Challenges</h3>
      <span class="chip">{{ challenges.length }} round{{ challenges.length === 1 ? "" : "s" }}</span>
    </div>
    <p class="small muted">
      A challenge adds a reason and, optionally, new evidence. It does not change the previous
      assessment record; a re-evaluation appends a new one.
    </p>
    <ol v-if="challenges.length" class="stack" style="gap: 10px; padding-left: 20px">
      <li v-for="item in challenges" :key="item.challenge_id">
        <div class="row" style="margin-bottom: 2px">
          <strong class="mono small">{{ item.challenge_id }}</strong>
          <span class="chip">round {{ item.round }}</span>
          <span class="chip">{{ item.new_evidence_count }} new evidence</span>
          <span class="tiny muted">{{ formatTime(item.created_at) }}</span>
        </div>
        <p class="serif" style="margin: 0 0 4px">{{ item.reason }}</p>
        <p class="tiny muted" style="margin: 0">challenger <AddressChip :address="item.challenger" /></p>
      </li>
    </ol>
    <p v-else class="small muted" style="margin: 0">No challenges yet.</p>
  </section>
</template>

<script setup>
import AddressChip from "./AddressChip.vue";
import { formatTime } from "../lib/format.js";

defineProps({
  challenges: { type: Array, default: () => [] },
});
</script>
