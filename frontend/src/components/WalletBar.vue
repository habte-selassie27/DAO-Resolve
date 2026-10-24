<template>
  <div ref="root" class="wallet-bar">
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
        <button
          class="button small"
          type="button"
          :disabled="state.connecting"
          :aria-expanded="pickerOpen ? 'true' : 'false'"
          aria-haspopup="menu"
          @click="togglePicker"
        >
          {{ state.connecting ? "Connecting…" : "Connect wallet" }}
        </button>

        <div
          v-if="pickerOpen"
          class="wallet-picker panel"
          role="menu"
          aria-label="Choose a browser wallet"
          @keydown.esc.stop="closePicker"
        >
          <p class="wallet-picker-title">Choose a browser wallet</p>
          <button
            v-for="wallet in wallets"
            :key="wallet.uuid"
            class="wallet-option"
            type="button"
            role="menuitem"
            :disabled="Boolean(connectingId)"
            @click="choose(wallet)"
          >
            <img v-if="wallet.icon" :src="wallet.icon" alt="" width="20" height="20" />
            <span v-else class="wallet-dot" aria-hidden="true" />
            <span class="wallet-name">{{ wallet.name }}</span>
            <span v-if="connectingId === wallet.uuid" class="tiny muted">Connecting…</span>
          </button>
          <p v-if="!wallets.length" class="tiny muted" style="margin: 0">
            No browser wallet detected. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet,
            then reload this page. Reads work without a wallet.
          </p>
          <button
            v-if="wallets.length"
            class="button ghost small"
            type="button"
            style="margin-top: 6px"
            @click="refresh"
          >
            Rescan for wallets
          </button>
        </div>
      </template>
    </div>
    <p v-if="state.walletError" class="tiny" style="color: var(--violation); margin: 4px 0 0; max-width: 320px">
      {{ state.walletError }}
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import AddressChip from "./AddressChip.vue";
import { state, connect, disconnect, roleOf } from "../lib/store.js";
import { activeNetwork } from "../config/networks.js";
import { mockMode } from "../config/contracts.js";
import {
  getWallets,
  onWalletsChange,
  requestWalletAnnouncements,
  startWalletDiscovery,
} from "../lib/wallets.js";

const roles = computed(() => roleOf(state.address));
const wallets = ref([]);
const pickerOpen = ref(false);
const connectingId = ref("");
const root = ref(null);

function syncWallets() {
  wallets.value = getWallets();
}

function refresh() {
  // Wallets that loaded late, or were just installed, answer a fresh request.
  requestWalletAnnouncements();
  syncWallets();
}

function togglePicker() {
  if (pickerOpen.value) {
    closePicker();
    return;
  }
  pickerOpen.value = true;
  refresh();
}

function closePicker() {
  pickerOpen.value = false;
}

async function choose(wallet) {
  if (connectingId.value) return;
  connectingId.value = wallet.uuid;
  try {
    await connect(wallet.provider);
    if (state.address) closePicker();
  } finally {
    connectingId.value = "";
  }
}

function onDocumentPointer(event) {
  if (!pickerOpen.value) return;
  if (root.value && !root.value.contains(event.target)) closePicker();
}

function onDocumentKey(event) {
  if (event.key === "Escape" && pickerOpen.value) closePicker();
}

onMounted(() => {
  startWalletDiscovery();
  syncWallets();
  const stop = onWalletsChange(syncWallets);
  document.addEventListener("pointerdown", onDocumentPointer);
  document.addEventListener("keydown", onDocumentKey);
  onUnmounted(() => {
    stop();
    document.removeEventListener("pointerdown", onDocumentPointer);
    document.removeEventListener("keydown", onDocumentKey);
  });
});
</script>
