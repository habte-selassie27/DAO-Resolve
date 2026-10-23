<template>
  <div class="shell">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink class="brand" to="/">DAOResolve</RouterLink>
        <nav class="nav" aria-label="Primary">
          <RouterLink to="/" active-class="" exact-active-class="router-link-active">Overview</RouterLink>
          <RouterLink to="/rules">Rules</RouterLink>
          <RouterLink to="/proposals">Proposals</RouterLink>
          <RouterLink to="/disputes">Disputes</RouterLink>
          <RouterLink to="/how-it-works">How it works</RouterLink>
          <RouterLink to="/admin">Admin</RouterLink>
        </nav>
        <WalletBar />
      </div>
    </header>

    <main id="main" class="main">
      <div v-if="mockMode" class="notice system" style="margin-bottom: 18px">
        <p class="small" style="margin: 0">
          <strong>Mock mode.</strong> This build uses recorded fixtures and simulated transactions.
          No wallet or network is touched. Set <code>VITE_MOCK=0</code> to use the deployed contract.
        </p>
      </div>
      <RouterView />
    </main>

    <footer style="border-top: 1px solid var(--line); padding: 20px 24px 28px">
      <div class="between" style="max-width: 1200px; margin: 0 auto">
        <p class="small muted" style="margin: 0; max-width: 62ch">
          DAOResolve is advisory. It assesses a claim against a pinned rule version; it does not
          execute, cancel, or reverse governance actions, and it does not penalize anyone.
        </p>
        <div class="row small">
          <RouterLink to="/how-it-works">Trust assumptions</RouterLink>
          <a v-if="contractExplorerUrl" :href="contractExplorerUrl" target="_blank" rel="noopener noreferrer">Contract on explorer</a>
        </div>
      </div>
    </footer>

    <TxLifecycle />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import TxLifecycle from "./components/TxLifecycle.vue";
import WalletBar from "./components/WalletBar.vue";
import { mockMode, contractExplorerUrl } from "./config/contracts.js";
import { loadConfig } from "./lib/store.js";

onMounted(loadConfig);
</script>
