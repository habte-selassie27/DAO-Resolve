<template>
  <div class="stack">
    <div class="between">
      <div>
        <h1>Proposals</h1>
        <p class="muted" style="margin: 0">
          Proposals are the anchor for process events. A dispute points at one proposal and one
          pinned rule version.
        </p>
      </div>
      <button class="button" type="button" @click="showForm = true">Register a proposal</button>
    </div>

    <div class="notice system">
      <p class="small" style="margin: 0">
        The contract has no <code>list_proposals</code> view, so this screen reads the proposal ids
        configured for the demo deployment (<code>VITE_PROPOSAL_IDS</code>) and opens each one.
        Nothing is invented: ids that do not exist are skipped.
      </p>
    </div>

    <ErrorNotice v-if="error" :error="error" title="Could not load proposals" />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 50%" /><div class="skeleton" style="width: 75%" /></div>
    <div v-else-if="proposals.length" class="grid two">
      <article v-for="proposal in proposals" :key="proposal.proposal_id" class="panel">
        <div class="between" style="margin-bottom: 6px">
          <span class="mono">{{ proposal.proposal_id }}</span>
          <span class="chip">{{ proposal.event_count }} events</span>
        </div>
        <p class="serif" style="margin-bottom: 6px">{{ proposal.status_note || "No status note." }}</p>
        <p class="small muted wrap" style="margin-bottom: 10px">
          <a v-if="safeUrl(proposal.content_ref)" :href="proposal.content_ref" target="_blank" rel="noopener noreferrer">{{ proposal.content_ref }}</a>
          <span v-else>{{ proposal.content_ref || "No content reference." }}</span>
        </p>
        <div class="between">
          <span class="tiny muted">registered {{ formatTime(proposal.created_at) }}</span>
          <RouterLink class="button secondary small" :to="`/proposals/${proposal.proposal_id}`">Open process</RouterLink>
        </div>
      </article>
    </div>
    <EmptyState v-else :message="emptyCopy.proposals" />

    <SheetDialog :open="showForm" title="Register a proposal" @close="showForm = false">
      <RoleGate role="recorder" title="Registering proposals needs the recorder role">
        <form @submit.prevent="submit">
          <div class="field">
            <label for="proposal-id">Proposal id</label>
            <input id="proposal-id" v-model.trim="form.proposalId" required placeholder="P-001" />
            <span class="hint">Letters, digits, dash, underscore, dot, colon.</span>
          </div>
          <div class="field">
            <label for="proposal-ref">Content reference</label>
            <input id="proposal-ref" v-model.trim="form.contentRef" required placeholder="https://forum.example.org/t/proposal" />
            <span class="hint">The authoritative public page for this proposal.</span>
          </div>
          <div class="field">
            <label for="proposal-note">Status note</label>
            <input id="proposal-note" v-model.trim="form.statusNote" placeholder="Discussion opened; vote not started." />
          </div>
          <p v-if="formError" class="notice violation small">{{ formError }}</p>
          <div class="row">
            <button class="button" type="submit" :disabled="submitting">{{ submitting ? "Submitting…" : "Register proposal" }}</button>
            <button class="button secondary" type="button" @click="showForm = false">Cancel</button>
          </div>
        </form>
      </RoleGate>
    </SheetDialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import RoleGate from "../components/RoleGate.vue";
import SheetDialog from "../components/SheetDialog.vue";
import { emptyCopy } from "../domain/copy.js";
import { formatTime } from "../lib/format.js";
import { listProposals } from "../lib/chain/reads.js";
import { registerProposal } from "../lib/chain/writes.js";
import { runTransaction } from "../lib/chain/tx.js";

const proposals = ref([]);
const loading = ref(true);
const error = ref("");
const showForm = ref(false);
const submitting = ref(false);
const formError = ref("");
const form = reactive({ proposalId: "", contentRef: "", statusNote: "" });

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

async function load() {
  loading.value = true;
  try {
    proposals.value = (await listProposals(0, 50)) || [];
    error.value = "";
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
}

async function submit() {
  formError.value = "";
  if (!/^[A-Za-z0-9._:-]+$/.test(form.proposalId)) {
    formError.value = "Proposal id contains unsupported characters.";
    return;
  }
  submitting.value = true;
  try {
    await runTransaction({
      label: `Register proposal ${form.proposalId}`,
      send: () =>
        registerProposal({
          proposalId: form.proposalId,
          contentRef: form.contentRef,
          statusNote: form.statusNote,
        }),
      onFinalized: load,
    });
    showForm.value = false;
    Object.assign(form, { proposalId: "", contentRef: "", statusNote: "" });
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>
