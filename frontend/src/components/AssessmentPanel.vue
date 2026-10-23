<template>
  <section class="panel" aria-labelledby="assessment-heading">
    <div class="between" style="margin-bottom: 10px">
      <div>
        <h3 id="assessment-heading" style="margin-bottom: 4px">Assessment</h3>
        <p v-if="assessment.assessment_id" class="small muted" style="margin: 0">
          <span class="mono">{{ assessment.assessment_id }}</span> ·
          produced by {{ assessment.produced_by || "EVALUATION" }} ·
          {{ formatTime(assessment.created_at) }}
        </p>
      </div>
      <div class="row">
        <VerdictBadge v-if="assessment.verdict" :verdict="assessment.verdict" />
        <DecidedByBadge v-if="assessment.decided_by" :decided-by="assessment.decided_by" />
        <span v-if="assessment.confidence_band" class="chip">confidence {{ assessment.confidence_band }}</span>
      </div>
    </div>

    <template v-if="assessment.verdict">
      <p class="lede" style="font-size: var(--step-3); margin-bottom: 12px">
        {{ verdictCopy[assessment.verdict] || "Verdict is not recognized." }}
      </p>

      <div class="notice" :class="assessment.decided_by === 'DETERMINISTIC_CHECKS' ? 'violation' : 'system'">
        <p class="small" style="margin: 0">
          <strong>{{ decidedByCopy[assessment.decided_by] || "Decision source is not recognized." }}</strong>
          A failed rule check forces a violation in code; the model is never called to override it.
        </p>
      </div>

      <div v-if="assessment.reasoning_digest" class="panel flat" style="margin-top: 12px">
        <p class="tiny muted" style="margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em">
          Reasoning digest · not compared across validators
        </p>
        <p class="serif wrap" style="margin: 0">{{ assessment.reasoning_digest }}</p>
      </div>

      <div class="grid two" style="margin-top: 12px">
        <dl class="kv">
          <dt>Passed checks</dt><dd>{{ assessment.deterministic_pass_count ?? 0 }}</dd>
          <dt>Failed checks</dt><dd>{{ assessment.deterministic_fail_count ?? 0 }}</dd>
          <dt>Clauses cited</dt>
          <dd>
            <template v-if="assessment.cited_clause_ids?.length">
              <span v-for="id in assessment.cited_clause_ids" :key="id" class="chip" style="margin: 0 4px 4px 0">{{ id }}</span>
            </template>
            <span v-else class="muted">none</span>
          </dd>
          <dt>Evidence cited</dt>
          <dd>
            <template v-if="assessment.cited_evidence_ids?.length">
              <span v-for="id in assessment.cited_evidence_ids" :key="id" class="chip" style="margin: 0 4px 4px 0">{{ id }}</span>
            </template>
            <span v-else class="muted">none</span>
          </dd>
          <dt>Web digest</dt>
          <dd class="tiny mono wrap">{{ assessment.web_digest || "—" }}</dd>
        </dl>
        <div class="notice system" style="align-self: start">
          <p class="tiny" style="margin: 0">
            <strong>Read the digest carefully.</strong> The reasoning digest is the leader's prose.
            The web digest is leader-asserted and informational: validators do not compare it, so it is not proof.
            Decisive verdicts need at least one readable, commonly cited evidence id.
          </p>
        </div>
      </div>

      <details v-if="assessment.deterministic_results?.length" class="process-table" open>
        <summary class="small muted">Rule check results</summary>
        <table>
          <thead>
            <tr><th>Check</th><th>Kind</th><th>Result</th><th>Detail</th></tr>
          </thead>
          <tbody>
            <tr v-for="result in assessment.deterministic_results" :key="result.check_id">
              <td class="mono">{{ result.check_id }}</td>
              <td>{{ result.kind }}</td>
              <td>
                <span class="chip" :class="result.result === 'PASS' ? 'compliant' : result.result === 'FAIL' ? 'violation' : 'system'">
                  {{ result.result }}
                </span>
              </td>
              <td class="tiny mono wrap">{{ result.detail }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </template>

    <EmptyState v-else :message="emptyCopy.assessment">
      <slot name="empty-action" />
    </EmptyState>
  </section>
</template>

<script setup>
import DecidedByBadge from "./DecidedByBadge.vue";
import EmptyState from "./EmptyState.vue";
import VerdictBadge from "./VerdictBadge.vue";
import { decidedByCopy, emptyCopy, verdictCopy } from "../domain/copy.js";
import { formatTime } from "../lib/format.js";

defineProps({
  assessment: { type: Object, default: () => ({}) },
});
</script>
