<template>
  <div class="stack">
    <div class="between">
      <div>
        <p class="small muted" style="margin-bottom: 4px">
          <RouterLink to="/disputes">Disputes</RouterLink> / <span class="mono">{{ disputeId }}</span>
        </p>
        <h1 style="margin-bottom: 6px">Dispute {{ dispute?.dispute_id || disputeId }}</h1>
        <div v-if="dispute" class="row">
          <StatusChip :status="dispute.status" />
          <VerdictBadge v-if="latestAssessment?.verdict" :verdict="latestAssessment.verdict" />
          <DecidedByBadge v-if="latestAssessment?.decided_by" :decided-by="latestAssessment.decided_by" />
          <span class="chip">rule {{ dispute.rule_id }} v{{ dispute.rule_version }}</span>
          <span class="chip">proposal {{ dispute.proposal_id }}</span>
        </div>
      </div>
      <div class="row">
        <RouterLink v-if="proposal" class="button secondary small" :to="`/proposals/${proposal.proposal_id}`">Proposal process</RouterLink>
        <RouterLink v-if="rule" class="button secondary small" :to="`/rules/${rule.rule_id}`">Rule</RouterLink>
      </div>
    </div>

    <ErrorNotice
      v-if="error"
      :error="error"
      title="Could not load this dispute"
      retry-label="Try again"
      @retry="load"
    />
    <div v-if="loading" class="stack"><div class="skeleton" style="width: 65%" /><div class="skeleton" style="width: 88%" /><div class="skeleton" style="width: 75%" /></div>
    <template v-else-if="dispute">
      <FinalityBanner
        :status="dispute.status"
        :deadline="Number(dispute.challenge_deadline)"
        :escalated="Boolean(dispute.escalated_by && !/^0x0+$/i.test(dispute.escalated_by))"
      />

      <section class="grid two">
        <div class="panel">
          <h2>Claim</h2>
          <p class="serif" style="font-size: var(--step-3); white-space: pre-wrap">{{ dispute.claim_text }}</p>
          <dl class="kv">
            <dt>Disputant</dt><dd><AddressChip :address="dispute.disputant" /></dd>
            <dt>Opened</dt><dd>{{ formatTime(dispute.opened_at) }}</dd>
            <dt>Pinned rule</dt><dd class="mono">{{ dispute.rule_id }} v{{ dispute.rule_version }}</dd>
            <dt>Challenge window</dt>
            <dd>
              {{ formatDuration(dispute.challenge_window) }} ·
              <span v-if="windowOpen">closes {{ timeUntil(dispute.challenge_deadline) }}</span>
              <span v-else-if="dispute.challenge_deadline">closed {{ timeAgo(dispute.challenge_deadline) }}</span>
              <span v-else>starts after the first assessment</span>
            </dd>
            <dt>Rounds</dt><dd>{{ dispute.challenge_count }} / {{ dispute.max_rounds }}</dd>
            <dt>Assessments</dt><dd>{{ assessmentHistory.length }}</dd>
          </dl>
        </div>

        <div class="panel">
          <h2>What this is</h2>
          <p class="small muted">
            The contract assesses this claim against the exact rule version pinned above. It is
            advisory: it does not execute, cancel, or reverse a governance action, and it does not
            penalize anyone.
          </p>
          <div class="notice system">
            <p class="small" style="margin: 0">
              <strong>Decision source matters.</strong> A failed code check forces a violation and
              the model is never called. Only the residual ambiguity goes to validator consensus,
              which compares meaning, not exact wording.
            </p>
          </div>
        </div>
      </section>

      <section v-if="rule" class="panel">
        <div class="between" style="margin-bottom: 8px">
          <div>
            <h2 style="margin: 0">{{ rule.title }}</h2>
            <p class="small muted" style="margin: 2px 0 0">
              {{ rule.rule_id }} v{{ rule.version }} · {{ rule.category }} · {{ rule.interpretation }}
            </p>
          </div>
          <span v-if="voteRequired" class="chip violation">finalize blocked: category requires DAO escalation</span>
        </div>
        <p class="serif" style="white-space: pre-wrap">{{ rule.clause_text }}</p>
        <div v-if="ruleChecks.length" class="stack" style="gap: 8px">
          <div v-for="check in ruleChecks" :key="check.check_id" class="panel flat">
            <div class="row" style="margin-bottom: 2px">
              <strong class="mono small">{{ check.check_id }}</strong>
              <span class="chip">{{ check.kind }}</span>
            </div>
            <p class="small" style="margin: 0">{{ describeCheck(check) }}</p>
          </div>
        </div>
        <p v-else class="small muted" style="margin: 0">No structured checks. This rule is decided by validator consensus.</p>
      </section>

      <section class="panel">
        <div class="between" style="margin-bottom: 8px">
          <div>
            <h2 style="margin: 0">Process rail</h2>
            <p class="small muted" style="margin: 2px 0 0">
              Recorded events and the checks that were actually applied. Check overlays are the
              contract's stored results once an assessment exists.
            </p>
          </div>
          <span class="chip">{{ events.length }} events</span>
        </div>
        <ProcessRail :events="events" :checks="ruleChecks" :results="processResults" :preview="!latestAssessment?.verdict" />
      </section>

      <AssessmentPanel :assessment="latestAssessment">
        <template #empty-action>
          <div class="row" style="justify-content: center">
            <button v-if="canEvaluate" class="button" type="button" :disabled="Boolean(pendingAction)" @click="evaluate">
              {{ pendingAction === "evaluate" ? "Requesting…" : "Request assessment" }}
            </button>
            <button v-else-if="canReEvaluate" class="button" type="button" :disabled="Boolean(pendingAction)" @click="reEvaluate">
              {{ pendingAction === "reevaluate" ? "Requesting…" : "Request re-evaluation" }}
            </button>
          </div>
        </template>
      </AssessmentPanel>

      <EvaluationFailureNotice
        v-if="evaluationFailure"
        :error="evaluationFailure"
        :retrying="pendingAction === 'evaluate' || pendingAction === 'reevaluate'"
        :retry-label="dispute.status === 'CHALLENGED' ? 'Retry re-evaluation' : 'Retry assessment'"
        @retry="dispute.status === 'CHALLENGED' ? reEvaluate() : evaluate()"
      />

      <section v-if="dispute.status === 'CHALLENGED'" class="notice violation">
        <p style="margin: 0">
          <strong>This assessment has been challenged.</strong> The dispute stays in CHALLENGED
          until someone requests a re-evaluation. That action is permissionless; it is not limited
          to the challenger or the disputant.
        </p>
      </section>

      <section class="panel" aria-labelledby="actions-heading">
        <div class="between" style="margin-bottom: 10px">
          <h2 id="actions-heading" style="margin: 0">Actions</h2>
          <span class="chip" :class="terminal ? 'system' : 'signal'">{{ terminal ? "terminal state" : "non-terminal" }}</span>
        </div>

        <div v-if="terminal" class="notice system">
          <p style="margin: 0">
            This dispute is {{ dispute.status.toLowerCase() }}. Terminal states accept no further
            evidence, challenges, or assessments. The public record stays readable.
          </p>
        </div>

        <template v-else>
          <div class="notice" style="margin-bottom: 12px">
            <p class="small" style="margin: 0">
              <strong v-if="dispute.status === 'OPEN'">Next: request an assessment.</strong>
              <strong v-else-if="dispute.status === 'CHALLENGED'">Next: request a re-evaluation.</strong>
              <strong v-else-if="windowOpen">Next: challenge inside the window, or wait for it to close.</strong>
              <strong v-else-if="voteRequired">Next: escalate to the DAO's own procedure.</strong>
              <strong v-else>Next: finalize the advisory record.</strong>
              <span v-if="windowOpen"> The window closes {{ timeUntil(dispute.challenge_deadline) }}.</span>
              <span v-else-if="dispute.challenge_deadline && !terminal">
                The challenge window has closed; finality is available unless the category requires escalation.
              </span>
            </p>
          </div>

          <div class="row" style="margin-bottom: 12px">
            <button v-if="canEvaluate" class="button" type="button" :disabled="Boolean(pendingAction)" @click="evaluate">
              {{ pendingAction === "evaluate" ? "Requesting…" : "Request assessment" }}
            </button>
            <button v-if="canReEvaluate" class="button" type="button" :disabled="Boolean(pendingAction)" @click="reEvaluate">
              {{ pendingAction === "reevaluate" ? "Requesting…" : "Request re-evaluation" }}
            </button>
            <button v-if="canFinalize" class="button" type="button" :disabled="Boolean(pendingAction)" @click="finalize">
              {{ pendingAction === "finalize" ? "Finalizing…" : "Finalize dispute" }}
            </button>
            <button v-if="canWithdraw" class="button danger" type="button" :disabled="Boolean(pendingAction)" @click="withdraw">
              {{ pendingAction === "withdraw" ? "Withdrawing…" : "Withdraw dispute" }}
            </button>
          </div>

          <p v-if="actionError" class="notice violation small" style="margin-bottom: 12px">{{ actionError }}</p>

          <div v-if="canChallenge && !windowOpen" class="notice system small">
            The challenge window has closed. A challenge would be rejected by the contract.
          </div>
          <div v-if="canChallenge && challengeCount >= maxRounds" class="notice system small">
            The contract's challenge round limit has been reached.
          </div>

          <form v-if="canChallenge" class="panel flat" @submit.prevent="submitChallenge">
            <h3>Challenge the latest assessment</h3>
            <p class="small muted">
              A challenge appends a reason and optionally new evidence. It does not overwrite the
              previous assessment. If you add evidence after an assessment, it is not considered
              until the re-evaluation.
            </p>
            <div class="field">
              <label for="challenge-reason">Reason</label>
              <textarea id="challenge-reason" v-model.trim="challengeReason" required maxlength="1000" placeholder="The first assessment missed the forum thread; new evidence is attached." />
              <span class="hint">{{ challengeReason.length }} / 1000 characters.</span>
            </div>
            <h4>New evidence (optional)</h4>
            <div v-for="(item, index) in challengeEvidence" :key="index" class="panel flat" style="margin-bottom: 8px">
              <div class="form-grid">
                <div class="field">
                  <label :for="`ce-side-${index}`">Side (self-declared)</label>
                  <select :id="`ce-side-${index}`" v-model="item.side">
                    <option>DISPUTANT</option><option>RESPONDENT</option><option>NEUTRAL</option>
                  </select>
                </div>
                <div class="field">
                  <label :for="`ce-kind-${index}`">Kind</label>
                  <select :id="`ce-kind-${index}`" v-model="item.kind">
                    <option>URL</option><option>TEXT_STATEMENT</option><option>EVENT_REF</option>
                  </select>
                </div>
                <div class="field full">
                  <label :for="`ce-ref-${index}`">Reference</label>
                  <textarea :id="`ce-ref-${index}`" v-model.trim="item.ref" :placeholder="item.kind === 'URL' ? 'https://…' : 'Statement or event reference'" />
                </div>
              </div>
              <button class="button ghost small" type="button" @click="challengeEvidence.splice(index, 1)">Remove</button>
            </div>
            <div class="row">
              <button class="button secondary small" type="button" @click="addChallengeEvidence">Add evidence</button>
              <span class="spacer" />
              <button class="button" type="submit" :disabled="Boolean(pendingAction)">
                {{ pendingAction === "challenge" ? "Challenging…" : "Submit challenge" }}
              </button>
            </div>
          </form>

          <form v-if="canSubmitEvidence" class="panel flat" style="margin-top: 12px" @submit.prevent="submitEvidence">
            <h3>Add evidence</h3>
            <p class="small muted">
              Anyone can add evidence while the dispute accepts it (OPEN, EVALUATED, or
              RE_EVALUATED). Sides are self-declared; the contract records the label but does not
              verify it.
            </p>
            <div class="form-grid">
              <div class="field">
                <label for="evidence-side">Side (self-declared)</label>
                <select id="evidence-side" v-model="evidenceForm.side">
                  <option>DISPUTANT</option><option>RESPONDENT</option><option>NEUTRAL</option>
                </select>
              </div>
              <div class="field">
                <label for="evidence-kind">Kind</label>
                <select id="evidence-kind" v-model="evidenceForm.kind">
                  <option>URL</option><option>TEXT_STATEMENT</option><option>EVENT_REF</option>
                </select>
              </div>
              <div class="field full">
                <label for="evidence-ref">Reference</label>
                <textarea id="evidence-ref" v-model.trim="evidenceForm.ref" required :placeholder="evidenceForm.kind === 'URL' ? 'https://…' : 'Statement or event reference'" />
                <span class="hint">{{ evidenceForm.ref.length }} / 512 characters.</span>
              </div>
            </div>
            <button class="button" type="submit" :disabled="Boolean(pendingAction)">
              {{ pendingAction === "evidence" ? "Submitting…" : "Submit evidence" }}
            </button>
          </form>
          <p v-else class="small muted" style="margin: 12px 0 0">
            Evidence can be added only in OPEN, EVALUATED, or RE_EVALUATED. This dispute is
            {{ dispute.status }}.
          </p>
        </template>
      </section>

      <EvidenceList :evidence="evidence" :cap="32" />

      <section class="panel">
        <div class="between" style="margin-bottom: 8px">
          <h2 style="margin: 0">Assessment history</h2>
          <span class="chip">{{ assessmentHistory.length }} appended</span>
        </div>
        <p class="small muted">
          Re-evaluations append a new record. They never modify an earlier assessment. The latest
          assessment is the one actions refer to.
        </p>
        <div v-if="assessmentHistory.length" class="stack" style="gap: 8px">
          <details v-for="(item, index) in assessmentHistory" :key="item.assessment_id" class="panel flat" :open="index === assessmentHistory.length - 1">
            <summary>
              <span class="row">
                <strong class="mono">{{ item.assessment_id }}</strong>
                <VerdictBadge :verdict="item.verdict" />
                <DecidedByBadge :decided-by="item.decided_by" />
                <span class="chip">{{ item.produced_by }}</span>
                <span class="muted small">{{ formatTime(item.created_at) }}</span>
              </span>
            </summary>
            <div style="margin-top: 8px">
              <p v-if="item.reasoning_digest" class="serif small" style="margin-bottom: 6px">{{ item.reasoning_digest }}</p>
              <p class="small muted" style="margin: 0">
                checks: {{ item.deterministic_pass_count || 0 }} pass / {{ item.deterministic_fail_count || 0 }} fail ·
                cited clauses: {{ (item.cited_clause_ids || []).join(", ") || "none" }} ·
                cited evidence: {{ (item.cited_evidence_ids || []).join(", ") || "none" }}
              </p>
              <p v-if="item.is_final" class="small" style="margin: 4px 0 0"><span class="chip compliant">final</span></p>
            </div>
          </details>
        </div>
        <EmptyState v-else :message="emptyCopy.assessment" />
      </section>

      <ChallengeHistory :challenges="challenges" />

      <section v-if="canEscalate" class="panel" aria-labelledby="escalate-title">
        <h2 id="escalate-title" style="margin-top: 0">Escalate to the DAO process</h2>
        <RoleGate role="escalator" title="Escalation needs the escalator role">
          <form @submit.prevent="submitEscalation">
            <p class="small muted">
              Escalation records a handoff only. It does not decide the dispute or execute anything.
              The DAO's own procedure takes over from here.
            </p>
            <div class="field">
              <label for="escalation-reason">Reason</label>
              <textarea id="escalation-reason" v-model.trim="escalationReason" required maxlength="1000" placeholder="Category requires the DAO's own vote." />
              <span class="hint">{{ escalationReason.length }} / 1000 characters.</span>
            </div>
            <div class="row">
              <button class="button" type="submit" :disabled="Boolean(pendingAction)">
                {{ pendingAction === "escalate" ? "Escalating…" : "Escalate" }}
              </button>
            </div>
          </form>
        </RoleGate>
      </section>

      <TrustStatement />

      <p class="small muted" style="margin: 0">
        Contract errors are mapped to plain language. A failed evaluation appends no assessment and
        leaves the status unchanged; retry when validators can reach agreement.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AddressChip from "../components/AddressChip.vue";
import AssessmentPanel from "../components/AssessmentPanel.vue";
import ChallengeHistory from "../components/ChallengeHistory.vue";
import DecidedByBadge from "../components/DecidedByBadge.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorNotice from "../components/ErrorNotice.vue";
import EvaluationFailureNotice from "../components/EvaluationFailureNotice.vue";
import EvidenceList from "../components/EvidenceList.vue";
import FinalityBanner from "../components/FinalityBanner.vue";
import ProcessRail from "../components/ProcessRail.vue";
import RoleGate from "../components/RoleGate.vue";
import StatusChip from "../components/StatusChip.vue";
import TrustStatement from "../components/TrustStatement.vue";
import VerdictBadge from "../components/VerdictBadge.vue";
import { emptyCopy } from "../domain/copy.js";
import { formatDuration, formatTime, timeAgo, timeUntil } from "../lib/format.js";
import {
  getAssessmentHistory,
  getChallenges,
  getDispute,
  getAllEvents,
  getEvidence,
  getProposal,
  getRuleVersion,
} from "../lib/chain/reads.js";
import {
  challengeAssessment,
  escalateDispute,
  evaluateDispute,
  finalizeDispute,
  reEvaluate as reEvaluateDispute,
  submitEvidence as submitEvidenceWrite,
  withdrawDispute,
} from "../lib/chain/writes.js";
import { runTransaction } from "../lib/chain/tx.js";
import { bindFormDraft, bindRefDraft } from "../lib/formPersistence.js";
import { loadConfig, state } from "../lib/store.js";

const route = useRoute();
const disputeId = computed(() => String(route.params.disputeId));
const dispute = ref(null);
const evidence = ref([]);
const assessmentHistory = ref([]);
const challenges = ref([]);
const rule = ref(null);
const proposal = ref(null);
const events = ref([]);
const loading = ref(true);
const error = ref("");
const now = ref(Math.floor(Date.now() / 1000));
const pendingAction = ref("");
const actionError = ref("");
const evaluationFailure = ref("");
const challengeReason = ref("");
const challengeEvidence = ref([]);
const escalationReason = ref("");
const evidenceForm = reactive({ side: "RESPONDENT", kind: "URL", ref: "" });
// Drafts are keyed per dispute so evidence, challenge text, and escalation
// reasons survive reloads and rejected signatures while never leaking into
// another dispute's screens.
const evidenceFormDraft = bindFormDraft(`dispute:${route.params.disputeId}:evidence`, evidenceForm, {
  side: "RESPONDENT",
  kind: "URL",
  ref: "",
});
const challengeDraft = bindRefDraft(
  `dispute:${route.params.disputeId}:challenge`,
  { reason: challengeReason, evidence: challengeEvidence },
  { reason: "", evidence: [] }
);
const escalationDraft = bindRefDraft(
  `dispute:${route.params.disputeId}:escalate`,
  { reason: escalationReason },
  { reason: "" }
);
let ticker;

const latestAssessment = computed(() => dispute.value?.latest_assessment || {});
const ruleChecks = computed(() => {
  const raw = rule.value?.structured_checks;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
});
const processResults = computed(() =>
  Array.isArray(latestAssessment.value?.deterministic_results)
    ? latestAssessment.value.deterministic_results
    : []
);
const terminal = computed(() => ["FINALIZED", "ESCALATED", "WITHDRAWN"].includes(dispute.value?.status));
const windowOpen = computed(
  () => Boolean(dispute.value?.challenge_deadline) && now.value < Number(dispute.value.challenge_deadline)
);
const challengeCount = computed(() => Number(dispute.value?.challenge_count || 0));
const maxRounds = computed(() => Number(dispute.value?.max_rounds || 0));
const canEvaluate = computed(() => dispute.value?.status === "OPEN");
const canReEvaluate = computed(() => dispute.value?.status === "CHALLENGED");
const canChallenge = computed(
  () =>
    ["EVALUATED", "RE_EVALUATED"].includes(dispute.value?.status) &&
    windowOpen.value &&
    challengeCount.value < maxRounds.value
);
const voteRequired = computed(() => {
  const categories = state.config?.vote_required_categories || [];
  return Boolean(rule.value && categories.includes(rule.value.category));
});
const canFinalize = computed(
  () =>
    ["EVALUATED", "RE_EVALUATED"].includes(dispute.value?.status) &&
    !windowOpen.value &&
    Boolean(dispute.value?.challenge_deadline) &&
    !voteRequired.value
);
const canEscalate = computed(() => !terminal.value);
const canWithdraw = computed(
  () =>
    Boolean(state.address) &&
    String(dispute.value?.disputant || "").toLowerCase() === String(state.address).toLowerCase() &&
    ["OPEN", "EVALUATED"].includes(dispute.value?.status)
);
const canSubmitEvidence = computed(() =>
  ["OPEN", "EVALUATED", "RE_EVALUATED"].includes(dispute.value?.status)
);

function describeCheck(check) {
  if (check.kind === "MIN_ELAPSED") {
    return `${check.from_event_type} to ${check.to_event_type} must be at least ${formatDuration(check.threshold)}.`;
  }
  if (check.kind === "REQUIRED_EVENT") return `Event ${check.event_type} must exist.`;
  if (check.kind === "MIN_COUNT") return `At least ${check.threshold} ${check.event_type} events are required.`;
  if (check.kind === "REQUIRED_ROLE") return `A ${check.role} must have acted on ${check.event_type}.`;
  return check.kind;
}

function addChallengeEvidence() {
  challengeEvidence.value.push({ side: "RESPONDENT", kind: "URL", ref: "" });
}

function validateEvidenceList(items) {
  for (const item of items) {
    if (!item.ref) return "Every evidence row needs a reference.";
    if (item.ref.length > 512) return "Evidence references are limited to 512 characters.";
    if (item.kind === "URL") {
      try {
        const url = new URL(item.ref);
        if (!["http:", "https:"].includes(url.protocol)) return "Evidence URLs must use http or https.";
      } catch {
        return "That evidence URL is not valid.";
      }
    }
  }
  return "";
}

async function load() {
  loading.value = true;
  try {
    const [loadedDispute, loadedEvidence, loadedAssessments, loadedChallenges] = await Promise.all([
      getDispute(disputeId.value),
      getEvidence(disputeId.value, 0, 50),
      getAssessmentHistory(disputeId.value, 0, 50),
      getChallenges(disputeId.value, 0, 50),
    ]);
    dispute.value = loadedDispute;
    evidence.value = loadedEvidence || [];
    assessmentHistory.value = loadedAssessments || [];
    challenges.value = loadedChallenges || [];

    const [loadedRule, loadedProposal, loadedEvents] = await Promise.all([
      getRuleVersion(loadedDispute.rule_id, loadedDispute.rule_version).catch(() => null),
      getProposal(loadedDispute.proposal_id).catch(() => null),
      getAllEvents(loadedDispute.proposal_id, 128).catch(() => []),
    ]);
    rule.value = loadedRule;
    proposal.value = loadedProposal;
    events.value = loadedEvents || [];
    if (!loadedRule) {
      // The current rule may be a later version; leave the clause panel honest.
      rule.value = null;
    }
    error.value = "";
    if (!state.config) await loadConfig();
  } catch (loadError) {
    error.value = loadError?.message || String(loadError);
  } finally {
    loading.value = false;
  }
}

async function act({ key, label, send, after }) {
  actionError.value = "";
  if (key === "evaluate" || key === "reevaluate") evaluationFailure.value = "";
  pendingAction.value = key;
  try {
    const result = await runTransaction({
      label,
      send,
      onFinalized: async () => {
        await load();
        if (after) after();
      },
    });
    if (!result.ok && result.error) {
      if (key === "evaluate" || key === "reevaluate") {
        evaluationFailure.value = result.error;
      } else {
        actionError.value = result.error;
      }
    }
    if (result.ok && (key === "evaluate" || key === "reevaluate")) evaluationFailure.value = "";
  } finally {
    pendingAction.value = "";
  }
}

function evaluate() {
  return act({ key: "evaluate", label: `Evaluate ${disputeId.value}`, send: () => evaluateDispute(disputeId.value) });
}

function reEvaluate() {
  return act({ key: "reevaluate", label: `Re-evaluate ${disputeId.value}`, send: () => reEvaluateDispute(disputeId.value) });
}

function finalize() {
  return act({ key: "finalize", label: `Finalize ${disputeId.value}`, send: () => finalizeDispute(disputeId.value) });
}

function withdraw() {
  if (!window.confirm("Withdraw this dispute? The record stays public and the state becomes terminal.")) return;
  return act({ key: "withdraw", label: `Withdraw ${disputeId.value}`, send: () => withdrawDispute(disputeId.value) });
}

function submitChallenge() {
  if (!challengeReason.value) {
    actionError.value = "Write a reason for the challenge.";
    return;
  }
  const items = challengeEvidence.value.filter((item) => item.ref);
  const invalid = validateEvidenceList(items);
  if (invalid) {
    actionError.value = invalid;
    return;
  }
  return act({
    key: "challenge",
    label: `Challenge ${disputeId.value}`,
    send: () =>
      challengeAssessment({
        disputeId: disputeId.value,
        reason: challengeReason.value,
        newEvidence: items.map((item) => ({ side: item.side, kind: item.kind, ref: item.ref })),
      }),
    after: () => {
      challengeDraft.reset();
    },
  });
}

function submitEvidence() {
  const invalid = validateEvidenceList([evidenceForm]);
  if (invalid) {
    actionError.value = invalid;
    return;
  }
  return act({
    key: "evidence",
    label: `Add evidence to ${disputeId.value}`,
    send: () =>
      submitEvidenceWrite({
        disputeId: disputeId.value,
        side: evidenceForm.side,
        kind: evidenceForm.kind,
        ref: evidenceForm.ref,
      }),
    after: () => evidenceFormDraft.reset(),
  });
}

function submitEscalation() {
  if (!escalationReason.value) {
    actionError.value = "Write a reason for the escalation.";
    return;
  }
  return act({
    key: "escalate",
    label: `Escalate ${disputeId.value}`,
    send: () => escalateDispute({ disputeId: disputeId.value, reason: escalationReason.value }),
    after: () => {
      escalationDraft.reset();
    },
  });
}

onMounted(() => {
  load();
  ticker = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000);
  }, 10000);
});

onUnmounted(() => {
  if (ticker) clearInterval(ticker);
});

watch(disputeId, load);
</script>
