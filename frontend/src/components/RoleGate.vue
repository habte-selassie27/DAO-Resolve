<template>
  <div v-if="allowed">
    <slot />
  </div>
  <div v-else class="notice system">
    <p style="margin-bottom: 4px"><strong>{{ title }}</strong></p>
    <p class="small muted" style="margin: 0">{{ reason }}</p>
    <p v-if="!state.address" class="small" style="margin: 6px 0 0">
      Reads work in read-only mode. Connect a wallet to sign.
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { state, hasRole } from "../lib/store.js";
import { mockMode } from "../config/contracts.js";

const props = defineProps({
  role: { type: String, required: true },
  title: { type: String, default: "This action needs a role" },
});

const allowed = computed(() => mockMode || hasRole("owner") || hasRole(props.role));

const reason = computed(() => {
  if (!state.address) {
    return `Connect an account with the ${props.role} role (or the owner role) to use this form.`;
  }
  return `The connected account doesn't hold the ${props.role} or owner role. This form is disabled rather than sending a transaction that the contract will reject.`;
});
</script>
