<template>
  <div class="stack">
    <div class="between">
      <div>
        <p class="small muted" style="margin-bottom: 4px"><RouterLink to="/proposals">Proposals</RouterLink> / <span class="mono">{{ proposalId }}</span></p>
        <h1 style="margin-bottom: 4px">{{ proposal?.proposal_id || proposalId }}</h1>
        <p class="muted" style="margin: 0">{{ proposal?.status_note || "No status note." }}</p>
      </div>
    </div>

    <ErrorNotice
      v-if="error"
      :error="error"
      title="Could not load this proposal"
      retry-label="Try again"
      @retry="load"
    />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 60%" /><div class="skeleton" style="width: 85%" /></div>
    <template v-else-if="proposal">
      <section class="grid two">
        <div class="panel">
          <h2>Proposal record</h2>
          <dl class="kv">
            <dt>Proposal id</dt><dd class="mono">{{ proposal.proposal_id }}</dd>
            <dt>Proposal content or source link</dt>
            <dd class="wrap">
              <a v-if="safeUrl(proposal.content_ref)" :href="proposal.content_ref" target="_blank" rel="noopener noreferrer">{{ proposal.content_ref }}</a>
              <span v-else>{{ proposal.content_ref || "—" }}</span>
            </dd>
            <dt>Registered by</dt><dd><AddressChip :address="proposal.created_by" /></dd>
            <dt>Registered at</dt><dd>{{ formatTime(proposal.created_at) }}</dd>
            <dt>Events</dt><dd>{{ events.length }} / 128</dd>
          </dl>
        </div>
        <div class="panel">
          <h2>Disputes for this proposal</h2>
          <div v-if="proposalDisputes.length" class="stack" style="gap: 6px">
            <RouterLink
              v-for="dispute in proposalDisputes"
              :key="dispute.dispute_id"
              :to="`/disputes/${dispute.dispute_id}`"
              class="panel flat"
              style="text-decoration: none; color: inherit; display: block"
            >
              <div class="between">
                <span><span class="mono">{{ dispute.dispute_id }}</span> <span class="muted small">· {{ dispute.rule_id }} v{{ dispute.rule_version }}</span></span>
                <StatusChip :status="dispute.status" />
              </div>
            </RouterLink>
          </div>
          <p v-else class="small muted" style="margin: 0">No disputes yet.</p>
          <hr class="divider" />
          <p class="small muted" style="margin: 0">
            A dispute pins the rule version and the proposal state at the moment it opens. Events
            recorded later are visible to a re-evaluation, but not to an existing assessment.
          </p>
        </div>
      </section>

      <section class="panel">
        <div class="between" style="margin-bottom: 8px">
          <div>
            <h2 style="margin: 0">Process rail</h2>
            <p class="small muted" style="margin: 2px 0 0">
              The recorded sequence of events, with each event's source and signer. Any wallet can
              append an event; the contract attributes it to the signer. Checks are previewed
              against the selected rule; the authoritative result appears in the dispute assessment.
            </p>
          </div>
          <div class="field" style="margin: 0; min-width: 260px">
            <label for="preview-rule">Preview a rule's checks</label>
            <select id="preview-rule" v-model="previewKey">
              <option value="">No preview</option>
              <option v-for="rule in activeRules" :key="`${rule.rule_id}-${rule.version}`" :value="`${rule.rule_id}#${rule.version}`">
                {{ rule.rule_id }} v{{ rule.version }} — {{ rule.title }}
              </option>
            </select>
          </div>
        </div>
        <ProcessRail :events="events" :checks="previewChecks" preview />
      </section>

      <TrustStatement />

      <section class="panel" aria-labelledby="record-event-title">
        <h2 id="record-event-title" style="margin-top: 0">Record a process event</h2>
        <p v-if="!state.address" class="notice system small" style="margin-bottom: 12px">
          Connect a wallet to sign this transaction. Reads work without one.
        </p>
        <form @submit.prevent="submitEvent">
          <div class="notice system">
            <p class="tiny" style="margin: 0">
              Recorded events are asserted by the recorder, not independently proven by the
              contract. The source link is what a reviewer can check. Timestamps must be integer
              UNIX seconds, chronological, and not more than one day in the future.
            </p>
          </div>
          <div class="form-grid" style="margin-top: 12px">
            <div class="field">
              <label for="event-id">Event id</label>
              <input id="event-id" v-model.trim="eventForm.eventId" required placeholder="e3" />
            </div>
            <div class="field">
              <label for="event-type">Event type</label>
              <input id="event-type" v-model.trim="eventForm.eventType" required list="event-types" placeholder="VOTING_STARTED" />
              <datalist id="event-types">
                <option v-for="type in eventTypes" :key="type" :value="type" />
              </datalist>
            </div>
            <div class="field">
              <label for="event-actor">Actor address</label>
              <input id="event-actor" v-model.trim="eventForm.actor" required placeholder="0x…" />
            </div>
            <div class="field">
              <label for="event-time">Timestamp</label>
              <input id="event-time" v-model="eventForm.timestampLocal" type="datetime-local" required />
              <span class="hint">{{ eventTimestamp ? `UNIX ${eventTimestamp}` : "Choose a time." }}</span>
            </div>
            <div class="field full">
              <label for="event-source">Evidence ref / public source</label>
              <input id="event-source" v-model.trim="eventForm.evidenceRef" placeholder="https://forum.example.org/t/…" />
              <span class="hint">Leave blank only if no source exists; the UI marks it unsourced.</span>
            </div>
          </div>
          <p v-if="eventError" class="notice violation small">{{ eventError }}</p>
          <div class="row">
            <button class="button" type="submit" :disabled="submittingEvent || !state.address">{{ submittingEvent ? "Submitting…" : "Record event" }}</button>
          </div>
        </form>
      </section>

      <section class="panel" aria-labelledby="open-dispute-title">
        <h2 id="open-dispute-title" style="margin-top: 0">Open a dispute</h2>
        <form @submit.prevent="submitDispute">
          <div class="notice">
            <p class="tiny" style="margin: 0">
              Anyone can open a dispute. The contract records it as an advisory assessment against
              the pinned rule version. It does not penalize anyone or reverse a governance action.
            </p>
          </div>
          <div class="form-grid" style="margin-top: 12px">
            <div class="field">
              <label for="dispute-id">Dispute id</label>
              <input id="dispute-id" v-model.trim="disputeForm.disputeId" required />
            </div>
            <div class="field">
              <label for="dispute-rule">Rule (latest active version)</label>
              <select id="dispute-rule" v-model="disputeForm.ruleKey" required>
                <option disabled value="">Choose an active rule</option>
                <option v-for="rule in activeRules" :key="`${rule.rule_id}-${rule.version}`" :value="`${rule.rule_id}#${rule.version}`">
                  {{ rule.rule_id }} v{{ rule.version }} — {{ rule.title }}
                </option>
              </select>
              <span class="hint">The contract pins the latest active version when the dispute opens.</span>
            </div>
            <div class="field full">
              <label for="dispute-claim">Claim</label>
              <textarea id="dispute-claim" v-model.trim="disputeForm.claimText" required placeholder="The proposal required at least 48 hours of review; voting started after 3 hours." />
              <span class="hint">{{ disputeForm.claimText.length }} / 2000 characters.</span>
            </div>
          </div>
          <p v-if="disputeError" class="notice violation small">{{ disputeError }}</p>
          <div class="row">
            <button class="button" type="submit" :disabled="submittingDispute">{{ submittingDispute ? "Submitting…" : "Open dispute" }}</button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AddressChip from "../components/AddressChip.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import ProcessRail from "../components/ProcessRail.vue";
import StatusChip from "../components/StatusChip.vue";
import TrustStatement from "../components/TrustStatement.vue";
import { formatTime } from "../lib/format.js";
import { getAllEvents, getProposal, getRule, listActiveRules, listDisputes } from "../lib/chain/reads.js";
import { openDispute, recordProcessEvent } from "../lib/chain/writes.js";
import { runTransaction } from "../lib/chain/tx.js";
import { state } from "../lib/store.js";
import { bindFormDraft } from "../lib/formPersistence.js";

const route = useRoute();
const router = useRouter();
const proposalId = computed(() => String(route.params.proposalId));
const proposal = ref(null);
const events = ref([]);
const disputes = ref([]);
const activeRules = ref([]);
const previewKey = ref("");
const previewChecks = ref([]);
const loading = ref(true);
const error = ref("");
const submittingEvent = ref(false);
const submittingDispute = ref(false);
const eventError = ref("");
const disputeError = ref("");

const eventTypes = ["SUBMITTED", "REVIEW_STARTED", "DISCUSSION_OPENED", "REVIEW_COMPLETED", "VOTING_STARTED", "VOTING_ENDED", "EXECUTED", "CANCELLED"];

function eventFormDefaults() {
  return {
    eventId: "",
    eventType: "VOTING_STARTED",
    actor: "",
    timestampLocal: toLocalInput(new Date()),
    evidenceRef: "",
  };
}

function disputeFormDefaults() {
  return { disputeId: "", ruleKey: "", claimText: "" };
}

const eventForm = reactive(eventFormDefaults());
const disputeForm = reactive(disputeFormDefaults());
// Drafts are keyed per proposal so fresh records never inherit another
// proposal's entry; they survive reloads and rejected signatures.
const eventFormDraft = bindFormDraft(`proposal:${route.params.proposalId}:event`, eventForm, eventFormDefaults);
const disputeFormDraft = bindFormDraft(`proposal:${route.params.proposalId}:dispute`, disputeForm, disputeFormDefaults);

function toLocalInput(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const eventTimestamp = computed(() => {
  if (!eventForm.timestampLocal) return 0;
  const parsed = new Date(eventForm.timestampLocal).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
});

const proposalDisputes = computed(() =>
  disputes.value.filter((dispute) => dispute.proposal_id === proposalId.value)
);

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

async function loadPreview() {
  previewChecks.value = [];
  if (!previewKey.value) return;
  const [ruleId] = previewKey.value.split("#");
  try {
    const rule = await getRule(ruleId);
    const raw = rule?.structured_checks;
    previewChecks.value = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : [];
  } catch {
    previewChecks.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const [loadedProposal, loadedEvents, loadedRules, loadedDisputes] = await Promise.all([
      getProposal(proposalId.value),
      getAllEvents(proposalId.value, 128),
      listActiveRules(0, 50),
      listDisputes(0, 50),
    ]);
    proposal.value = loadedProposal;
    events.value = loadedEvents || [];
    activeRules.value = loadedRules || [];
    disputes.value = loadedDisputes || [];
    if (!disputeForm.ruleKey && activeRules.value.length) {
      disputeForm.ruleKey = `${activeRules.value[0].rule_id}#${activeRules.value[0].version}`;
    }
    if (!eventForm.actor && state.address) eventForm.actor = state.address;
    if (!disputeForm.disputeId) {
      disputeForm.disputeId = `D-${proposalId.value}-${Date.now().toString(36)}`;
    }
    if (!eventForm.eventId) eventForm.eventId = `e${events.value.length + 1}`;
    error.value = "";
    await loadPreview();
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
}

async function submitEvent() {
  eventError.value = "";
  if (!eventTimestamp.value) {
    eventError.value = "Choose a valid timestamp.";
    return;
  }
  if (eventTimestamp.value > Math.floor(Date.now() / 1000) + 86400) {
    eventError.value = "The contract rejects timestamps more than one day in the future.";
    return;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(eventForm.actor)) {
    eventError.value = "Actor must be a 20-byte hex address.";
    return;
  }
  submittingEvent.value = true;
  try {
    const result = await runTransaction({
      label: `Record ${eventForm.eventType} on ${proposalId.value}`,
      send: () =>
        recordProcessEvent({
          proposalId: proposalId.value,
          eventId: eventForm.eventId,
          eventType: eventForm.eventType,
          actor: eventForm.actor,
          timestampRef: eventTimestamp.value,
          evidenceRef: eventForm.evidenceRef,
        }),
      onFinalized: load,
    });
    if (!result.ok) {
      eventError.value = "The transaction did not finalize. Review the transaction tray and try again.";
      return;
    }
    eventFormDraft.reset();
  } catch (txError) {
    eventError.value = txError?.message || "The transaction could not be submitted.";
  } finally {
    submittingEvent.value = false;
  }
}

async function submitDispute() {
  disputeError.value = "";
  if (!/^[A-Za-z0-9._:-]+$/.test(disputeForm.disputeId)) {
    disputeError.value = "Dispute id contains unsupported characters.";
    return;
  }
  if (!disputeForm.ruleKey) {
    disputeError.value = "Choose a rule version.";
    return;
  }
  if (!disputeForm.claimText) {
    disputeError.value = "Write the claim that should be assessed.";
    return;
  }
  const [ruleId] = disputeForm.ruleKey.split("#");
  const disputeId = disputeForm.disputeId;
  submittingDispute.value = true;
  try {
    const result = await runTransaction({
      label: `Open dispute ${disputeId}`,
      send: () =>
        openDispute({
          disputeId,
          ruleId,
          proposalId: proposalId.value,
          claimText: disputeForm.claimText,
        }),
      onFinalized: () => router.push(`/disputes/${disputeId}`),
    });
    if (!result.ok) {
      disputeError.value = "The transaction did not finalize. Review the transaction tray and try again.";
      return;
    }
    // The dispute now exists on chain; clear its draft so returning here
    // starts a fresh claim instead of resubmitting the same id.
    disputeFormDraft.reset();
  } catch (txError) {
    disputeError.value = txError?.message || "The transaction could not be submitted.";
  } finally {
    submittingDispute.value = false;
  }
}

onMounted(load);
watch(proposalId, load);
watch(previewKey, loadPreview);
</script>
