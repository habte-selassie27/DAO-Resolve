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
      <select
        v-if="wallets.length > 1"
        v-model="selectedWallet"
        class="input small"
        style="max-width: 180px"
        aria-label="Choose a browser wallet"
      >
        <option v-for="wallet in wallets" :key="wallet.uuid" :value="wallet.uuid">
          {{ wallet.name }}
        </option>
      </select>
      <button
        class="button small"
        type="button"
        :disabled="state.connecting || wallets.length === 0"
        @click="connectSelected"
      >
        {{ state.connecting ? "Connecting…" : wallets.length ? `Connect ${selectedName}` : "No wallet detected" }}
      </button>
    </template>
  </div>
  <p v-if="state.walletError" class="tiny" style="color: var(--violation); margin: 4px 0 0; max-width: 320px">
    {{ state.walletError }}
  </p>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import AddressChip from "./AddressChip.vue";
import { state, connect, disconnect, roleOf } from "../lib/store.js";
import { activeNetwork } from "../config/networks.js";
import { mockMode } from "../config/contracts.js";
import { getWallets, onWalletsChange, startWalletDiscovery } from "../lib/wallets.js";

const roles = computed(() => roleOf(state.address));
const wallets = ref([]);
const selectedWallet = ref("");

const selectedName = computed(() => {
  const wallet = wallets.value.find((item) => item.uuid === selectedWallet.value);
  return wallet?.name || "wallet";
});

function syncWallets() {
  wallets.value = getWallets();
  if (!selectedWallet.value && wallets.value.length) {
    selectedWallet.value = wallets.value[0].uuid;
  }
}

onMounted(() => {
  startWalletDiscovery();
  syncWallets();
  const stop = onWalletsChange(syncWallets);
  const timer = setTimeout(syncWallets, 100);
  onUnmounted(() => {
    stop();
    clearTimeout(timer);
  });
});

async function connectSelected() {
  const wallet = wallets.value.find((item) => item.uuid === selectedWallet.value);
  await connect(wallet?.provider);
}
</script>