<template>
  <div v-if="allowed">
    <slot />
  </div>
  <div v-else class="notice system">
    <p style="margin-bottom: 4px"><strong>{{ title }}</strong></p>
    <p class="small muted" style="margin: 0">{{ reason }}</p>
    <p v-if="!unverified && !state.address" class="small" style="margin: 6px 0 0">
      Reads work in read-only mode. Connect a wallet to sign.
    </p>
    <button
      v-if="unverified"
      class="button secondary small"
      type="button"
      style="margin-top: 8px"
      @click="retry"
    >
      Try again
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { state, hasRole, loadConfig } from "../lib/store.js";
import { mockMode } from "../config/contracts.js";

const props = defineProps({
  role: { type: String, required: true },
  title: { type: String, default: "This action needs a role" },
});

// Three honest states, never "no role" when roles could not be verified:
// 1. config unreadable -> unverified: the network read failed, not the account
// 2. no wallet connected -> connect prompt
// 3. wallet connected, roles known -> the account truly lacks the role
const unverified = computed(() => !mockMode && !state.config);
const allowed = computed(
  () => mockMode || (Boolean(state.config) && (hasRole("owner") || hasRole(props.role)))
);

const reason = computed(() => {
  if (unverified.value) {
    return "Roles couldn't be verified because the network read failed. Nothing is wrong with your account.";
  }
  if (!state.address) {
    return `Connect an account with the ${props.role} role (or the owner role) to use this form.`;
  }
  return `The connected account doesn't hold the ${props.role} or owner role. This form is disabled rather than sending a transaction that the contract will reject.`;
});

function retry() {
  loadConfig();
}
</script>
