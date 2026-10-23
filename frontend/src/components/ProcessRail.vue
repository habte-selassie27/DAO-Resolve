<template>
  <div>
    <div v-if="events.length" class="process-rail">
      <div class="rail-line" aria-hidden="true" />
      <div v-for="event in events" :key="event.event_id" class="rail-event" :class="{ unsourced: !event.evidence_ref }">
        <span class="rail-dot" aria-hidden="true" />
        <strong>{{ event.event_type }}</strong>
        <span v-if="!event.evidence_ref" class="chip system" style="margin-left: 6px">unsourced</span>
        <div class="rail-meta">
          <span class="mono">{{ event.event_id }}</span> ·
          <AddressChip :address="event.actor" /> ·
          {{ formatTime(event.timestamp_ref) }} ·
          recorded by <AddressChip :address="event.recorded_by" />
        </div>
        <div v-if="event.evidence_ref" class="rail-meta wrap">
          source:
          <a v-if="isUrl(event.evidence_ref)" :href="event.evidence_ref" target="_blank" rel="noopener noreferrer">{{ event.evidence_ref }}</a>
          <span v-else>{{ event.evidence_ref }}</span>
        </div>
        <div v-for="overlay in overlaysFor(event.event_id)" :key="overlay.key" class="rail-overlay" :class="overlay.tone">
          <div class="overlay-head">
            <strong>{{ overlay.title }}</strong>
            <span class="chip" :class="overlay.tone === 'fail' ? 'violation' : overlay.tone === 'pass' ? 'compliant' : 'system'">
              {{ overlay.status }}
            </span>
            <span v-if="preview" class="chip">rule preview</span>
          </div>
          <div class="small muted">{{ overlay.detail }}</div>
        </div>
      </div>
      <div v-for="overlay in missingOverlays" :key="overlay.key" class="rail-ghost">
        missing: {{ overlay.missing }} — {{ overlay.title }} ({{ overlay.status }})
      </div>
    </div>
    <EmptyState v-else :message="emptyCopy.events" />

    <details v-if="events.length || checks.length" class="process-table">
      <summary class="small muted">Text alternative: events and checks</summary>
      <table>
        <caption>Recorded events and structured checks. This table is the accessible representation of the rail.</caption>
        <thead>
          <tr><th>Item</th><th>Type</th><th>Time / result</th><th>Source or detail</th></tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="`t-${event.event_id}`">
            <td class="mono">{{ event.event_id }}</td>
            <td>{{ event.event_type }}</td>
            <td>{{ formatTime(event.timestamp_ref) }}</td>
            <td>{{ event.evidence_ref || "unsourced" }}</td>
          </tr>
          <tr v-for="check in checkRows" :key="`c-${check.check_id}`">
            <td class="mono">{{ check.check_id }}</td>
            <td>{{ check.kind }}</td>
            <td>{{ check.result }} {{ check.detail }}</td>
            <td>{{ check.description }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </div>
</template>

<script setup>
import { computed } from "vue";
import AddressChip from "./AddressChip.vue";
import EmptyState from "./EmptyState.vue";
import { emptyCopy } from "../domain/copy.js";
import { formatDuration, formatTime } from "../lib/format.js";

const props = defineProps({
  events: { type: Array, default: () => [] },
  checks: { type: Array, default: () => [] },
  results: { type: Array, default: () => [] },
  preview: { type: Boolean, default: false },
});

const resultById = computed(() => {
  const map = {};
  for (const result of props.results || []) map[result.check_id] = result;
  return map;
});

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function describe(check) {
  if (check.kind === "MIN_ELAPSED") {
    return `${check.from_event_type} to ${check.to_event_type} must be at least ${formatDuration(check.threshold)}.`;
  }
  if (check.kind === "REQUIRED_EVENT") return `Event ${check.event_type} must exist.`;
  if (check.kind === "MIN_COUNT") return `At least ${check.threshold} ${check.event_type} events are required.`;
  if (check.kind === "REQUIRED_ROLE") return `A ${check.role} must have acted on ${check.event_type}.`;
  return check.kind;
}

function computePreview(check) {
  const events = props.events || [];
  if (check.kind === "MIN_ELAPSED") {
    let latestFrom = null;
    let minElapsed = null;
    let pairs = 0;
    for (const event of events) {
      if (event.event_type === check.from_event_type) latestFrom = event;
      else if (event.event_type === check.to_event_type) {
        if (!latestFrom) return { result: "FAIL", detail: `to_event_before_from=${check.to_event_type}`, missing: check.from_event_type };
        const elapsed = Number(event.timestamp_ref) - Number(latestFrom.timestamp_ref);
        if (elapsed < 0) return { result: "FAIL", detail: "non_monotonic_events", missing: "" };
        minElapsed = minElapsed === null ? elapsed : Math.min(minElapsed, elapsed);
        pairs += 1;
      }
    }
    if (!pairs) return { result: "UNKNOWN", detail: `missing ${check.from_event_type} or ${check.to_event_type}`, missing: latestFrom ? check.to_event_type : check.from_event_type };
    const pass = minElapsed >= Number(check.threshold);
    return {
      result: pass ? "PASS" : "FAIL",
      detail: `elapsed=${formatDuration(minElapsed)} threshold=${formatDuration(check.threshold)}`,
      missing: "",
    };
  }
  const count = events.filter((event) => event.event_type === check.event_type).length;
  if (check.kind === "REQUIRED_EVENT") {
    return { result: count > 0 ? "PASS" : "FAIL", detail: `count=${count}`, missing: count > 0 ? "" : check.event_type };
  }
  if (check.kind === "MIN_COUNT") {
    return { result: count >= Number(check.threshold) ? "PASS" : "FAIL", detail: `count=${count} threshold=${check.threshold}`, missing: "" };
  }
  if (check.kind === "REQUIRED_ROLE") {
    if (!check.role_address || /^0x0+$/i.test(check.role_address)) {
      return { result: "FAIL", detail: `role_unset role=${check.role}`, missing: "" };
    }
    const roleCount = events.filter(
      (event) => event.event_type === check.event_type && String(event.actor).toLowerCase() === String(check.role_address).toLowerCase()
    ).length;
    return { result: roleCount > 0 ? "PASS" : "FAIL", detail: `count=${roleCount} role=${check.role}`, missing: "" };
  }
  return { result: "UNKNOWN", detail: `unknown_check_kind=${check.kind}`, missing: "" };
}

const overlayData = computed(() =>
  (props.checks || []).map((check, index) => {
    const recorded = resultById.value[check.check_id];
    const computed = recorded
      ? { result: recorded.result, detail: recorded.detail, missing: "" }
      : computePreview(check);
    return {
      key: `${check.check_id}-${index}`,
      check,
      result: computed.result,
      detail: computed.detail,
      missing: computed.missing,
      anchor: anchorFor(check),
    };
  })
);

function anchorFor(check) {
  if (check.kind === "MIN_ELAPSED") {
    const to = [...(props.events || [])].reverse().find((event) => event.event_type === check.to_event_type);
    if (to) return to.event_id;
    return "";
  }
  const found = [...(props.events || [])].reverse().find((event) => event.event_type === check.event_type);
  return found ? found.event_id : "";
}

function overlaysFor(eventId) {
  return overlayData.value
    .filter((overlay) => overlay.anchor === eventId)
    .map((overlay) => ({
      ...overlay,
      title: `${overlay.check.check_id}: ${overlay.check.kind}`,
      status: overlay.result,
      tone: overlay.result === "PASS" ? "pass" : overlay.result === "FAIL" ? "fail" : "neutral",
    }));
}

const missingOverlays = computed(() =>
  overlayData.value
    .filter((overlay) => !overlay.anchor && overlay.missing)
    .map((overlay) => ({
      ...overlay,
      title: `${overlay.check.check_id}: ${overlay.check.kind}`,
      status: overlay.result,
    }))
);

const checkRows = computed(() =>
  overlayData.value.map((overlay) => ({
    check_id: overlay.check.check_id,
    kind: overlay.check.kind,
    result: overlay.result,
    detail: overlay.detail,
    description: describe(overlay.check),
  }))
);
</script>