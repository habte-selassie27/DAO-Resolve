<template>
  <div class="stack">
    <div class="between">
      <div>
        <h1>Admin</h1>
        <p class="muted" style="margin: 0">
          Roles, policy, and limits. Changes apply to new disputes only; existing disputes keep the
          challenge window and round limit they pinned when they opened.
        </p>
      </div>
      <button class="button secondary" type="button" @click="refresh">Refresh config</button>
    </div>

    <ErrorNotice
      v-if="state.configError"
      :error="state.configError"
      title="Could not read config"
      retry-label="Try again"
      @retry="refresh"
    />
    <div v-if="!state.config" class="panel"><div class="skeleton" style="width: 60%" /></div>
    <template v-else>
      <section class="grid two">
        <div class="panel">
          <h2>Role addresses</h2>
          <p class="small muted">
            Each role is a single address. The owner can do everything. Role separation is real
            only if these are different accounts in your deployment.
          </p>
          <dl class="kv">
            <dt>Owner</dt><dd><AddressChip :address="state.config.owner" /></dd>
            <dt>Rule registrar</dt><dd><AddressChip :address="state.config.rule_registrar" /></dd>
            <dt>Recorder</dt><dd><AddressChip :address="state.config.recorder" /></dd>
            <dt>Escalator</dt><dd><AddressChip :address="state.config.escalator" /></dd>
          </dl>
          <p v-if="roleSummary" class="notice system small" style="margin-top: 12px">
            {{ roleSummary }}
          </p>
        </div>

        <div class="panel">
          <h2>Dispute policy</h2>
          <dl class="kv">
            <dt>Challenge window</dt><dd>{{ formatDuration(state.config.challenge_window) }} ({{ state.config.challenge_window }} seconds)</dd>
            <dt>Max challenge rounds</dt><dd>{{ state.config.max_challenge_rounds }}</dd>
            <dt>Strict separation</dt>
            <dd>
              <span class="chip" :class="state.config.strict_separation ? 'compliant' : 'system'">
                {{ state.config.strict_separation ? "on" : "off" }}
              </span>
              <span class="small muted"> blocks event recorders from taking part in their own disputes.</span>
            </dd>
            <dt>Vote-required categories</dt>
            <dd>
              <template v-if="state.config.vote_required_categories?.length">
                <span v-for="category in state.config.vote_required_categories" :key="category" class="chip" style="margin: 0 4px 4px 0">{{ category }}</span>
              </template>
              <span v-else class="muted">none</span>
            </dd>
          </dl>
          <div class="notice" style="margin-top: 12px">
            <p class="small" style="margin: 0">
              Policy updates are owner-only. A dispute keeps the window and rounds it pinned at
              open, so changing config cannot move an existing dispute's goalposts.
            </p>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>Documented limits</h2>
        <div class="grid three">
          <div v-for="(value, key) in limits" :key="key">
            <p class="metric" style="font-size: var(--step-4)">{{ value }}</p>
            <p class="metric-label mono">{{ key }}</p>
          </div>
        </div>
      </section>

      <section class="grid two">
        <div class="panel">
          <h2>Set a role</h2>
          <RoleGate role="owner" title="Changing roles needs the owner account">
            <form @submit.prevent="submitRole">
              <div class="field">
                <label for="role-name">Role</label>
                <select id="role-name" v-model="roleForm.role">
                  <option value="RULE_REGISTRAR">RULE_REGISTRAR</option>
                  <option value="RECORDER">RECORDER</option>
                  <option value="ESCALATOR">ESCALATOR</option>
                </select>
              </div>
              <div class="field">
                <label for="role-address">Account</label>
                <input id="role-address" v-model.trim="roleForm.account" required placeholder="0x…" />
                <span class="hint">The zero address revokes the role.</span>
              </div>
              <button class="button" type="submit" :disabled="Boolean(pending)">Set role</button>
            </form>
          </RoleGate>
        </div>

        <div class="panel">
          <h2>Update policy</h2>
          <RoleGate role="owner" title="Changing policy needs the owner account">
            <form @submit.prevent="submitConfig">
              <div class="form-grid">
                <div class="field">
                  <label for="config-window">Challenge window (seconds)</label>
                  <input id="config-window" v-model.number="configForm.challengeWindow" type="number" min="60" max="2592000" required />
                  <span class="hint">60 to 2,592,000 (30 days).</span>
                </div>
                <div class="field">
                  <label for="config-rounds">Max challenge rounds</label>
                  <input id="config-rounds" v-model.number="configForm.maxChallengeRounds" type="number" min="0" max="10" required />
                </div>
              </div>
              <label class="row small" style="margin-bottom: 12px">
                <input v-model="configForm.strictSeparation" type="checkbox" style="width: auto; min-height: 0" />
                Strict separation: recorders cannot participate in disputes about events they recorded
              </label>
              <button class="button" type="submit" :disabled="Boolean(pending)">Update policy</button>
            </form>
          </RoleGate>
        </div>
      </section>

      <section class="grid two">
        <div class="panel">
          <h2>Vote-required category</h2>
          <p class="small muted">
            A dispute in a vote-required category cannot be finalized. It must be escalated to the
            DAO's own procedure instead.
          </p>
          <RoleGate role="owner" title="Changing categories needs the owner account">
            <form @submit.prevent="submitCategory">
              <div class="form-grid">
                <div class="field">
                  <label for="category-name">Category</label>
                  <select id="category-name" v-model="categoryForm.category">
                    <option>PROCESS</option><option>QUORUM</option><option>TIMING</option>
                    <option>ELIGIBILITY</option><option>DISCLOSURE</option><option>OTHER</option>
                  </select>
                </div>
                <div class="field">
                  <label for="category-required">Requires escalation</label>
                  <select id="category-required" v-model="categoryForm.required">
                    <option :value="true">yes</option><option :value="false">no</option>
                  </select>
                </div>
              </div>
              <button class="button" type="submit" :disabled="Boolean(pending)">Update category</button>
            </form>
          </RoleGate>
        </div>

        <div class="panel">
          <h2>Transfer ownership</h2>
          <p class="small muted">
            This is a single-step transfer. The new owner does not need to accept. Check the address
            carefully; ownership controls roles and policy.
          </p>
          <RoleGate role="owner" title="Transferring ownership needs the owner account">
            <form @submit.prevent="submitTransfer">
              <div class="field">
                <label for="new-owner">New owner address</label>
                <input id="new-owner" v-model.trim="newOwner" required placeholder="0x…" />
              </div>
              <button class="button danger" type="submit" :disabled="Boolean(pending)">Transfer ownership</button>
            </form>
          </RoleGate>
        </div>
      </section>

      <p v-if="formError" class="notice violation small">{{ formError }}</p>
      <TrustStatement />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import AddressChip from "../components/AddressChip.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import RoleGate from "../components/RoleGate.vue";
import TrustStatement from "../components/TrustStatement.vue";
import { formatDuration } from "../lib/format.js";
import { loadConfig, state } from "../lib/store.js";
import { setCategoryVoteRequired, setConfig, setRole, transferOwnership } from "../lib/chain/writes.js";
import { runTransaction } from "../lib/chain/tx.js";

const pending = ref(false);
const formError = ref("");
const roleForm = reactive({ role: "RECORDER", account: "" });
const configForm = reactive({ challengeWindow: 86400, maxChallengeRounds: 3, strictSeparation: false });
const categoryForm = reactive({ category: "DISCLOSURE", required: true });
const newOwner = ref("");

const limits = computed(() => state.config?.limits || {});

const roleSummary = computed(() => {
  if (!state.config) return "";
  const values = [
    state.config.owner,
    state.config.rule_registrar,
    state.config.recorder,
    state.config.escalator,
  ].map((value) => String(value || "").toLowerCase());
  const unique = new Set(values.filter(Boolean));
  if (unique.size === 1) {
    return "All roles currently point at the same account. The role separation described in the docs is not enforced by this deployment.";
  }
  return `${unique.size} distinct role accounts are configured.`;
});

function validAddress(value, allowZero = true) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return false;
  if (!allowZero && /^0x0+$/i.test(value)) return false;
  return true;
}

async function run(label, send) {
  formError.value = "";
  pending.value = true;
  try {
    await runTransaction({ label, send, onFinalized: refresh });
  } finally {
    pending.value = false;
  }
}

function refresh() {
  return loadConfig();
}

async function submitRole() {
  if (!validAddress(roleForm.account)) {
    formError.value = "Enter a 20-byte hex account address.";
    return;
  }
  await run(`Set ${roleForm.role}`, () => setRole({ role: roleForm.role, account: roleForm.account }));
}

async function submitConfig() {
  if (configForm.challengeWindow < 60 || configForm.challengeWindow > 2592000) {
    formError.value = "Challenge window must be between 60 and 2,592,000 seconds.";
    return;
  }
  if (configForm.maxChallengeRounds < 0 || configForm.maxChallengeRounds > 10) {
    formError.value = "Max challenge rounds must be between 0 and 10.";
    return;
  }
  await run("Update dispute policy", () =>
    setConfig({
      challengeWindow: configForm.challengeWindow,
      maxChallengeRounds: configForm.maxChallengeRounds,
      strictSeparation: configForm.strictSeparation,
    })
  );
}

async function submitCategory() {
  await run(`Set ${categoryForm.category} vote-required=${categoryForm.required}`, () =>
    setCategoryVoteRequired({ category: categoryForm.category, required: categoryForm.required })
  );
}

async function submitTransfer() {
  if (!validAddress(newOwner.value, false)) {
    formError.value = "Enter a non-zero 20-byte hex address.";
    return;
  }
  if (!window.confirm(`Transfer ownership to ${newOwner.value}? This cannot be undone by the old owner.`)) return;
  await run("Transfer ownership", () => transferOwnership(newOwner.value));
}

onMounted(async () => {
  await loadConfig();
  if (state.config) {
    configForm.challengeWindow = Number(state.config.challenge_window || 86400);
    configForm.maxChallengeRounds = Number(state.config.max_challenge_rounds || 3);
    configForm.strictSeparation = Boolean(state.config.strict_separation);
  }
});
</script>
