<template>
  <div class="row" style="gap: 8px">
    <span class="chip" :title="activeNetwork.chain.name">{{ activeNetwork.label }}</span>
    <span v-if="mockMode" class="chip signal" title="No network calls are made">mock data</span>
    <template v-if="state.address">
      <span v-for="role in roles" :key="role" class="chip strong">{{ role }}</span>
      <AddressChip :address="state.address" />
      <button class="button secondary small" type="button" @click="disconnect">Disconnect</button>
    </template>
    <template v-else>
      <span class="chip" title="Reads work without a wallet">read-only</span>
      <button class="button small" type="button" :disabled="state.connecting" @click="connect">
        {{ state.connecting ? "Connecting…" : "Connect wallet" }}
      </button>
    </template>
  </div>
  <p v-if="state.walletError" class="tiny" style="color: var(--violation); margin: 4px 0 0; max-width: 320px">
    {{ state.walletError }}
  </p>
</template>

<script setup>
import { computed } from "vue";
import AddressChip from "./AddressChip.vue";
import { state, connect, disconnect, roleOf } from "../lib/store.js";
import { activeNetwork } from "../config/networks.js";
import { mockMode } from "../config/contracts.js";

const roles = computed(() => roleOf(state.address));
</script>
