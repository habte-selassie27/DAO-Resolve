<template>
  <div class="stack" style="gap: 10px">
    <div v-for="(check, index) in checks" :key="index" class="panel flat">
      <div class="between" style="margin-bottom: 8px">
        <strong class="small">Check {{ index + 1 }}</strong>
        <button class="button ghost small" type="button" @click="remove(index)">Remove</button>
      </div>
      <div class="form-grid">
        <div class="field">
          <label :for="`check-id-${index}`">Check id</label>
          <input :id="`check-id-${index}`" v-model.trim="check.check_id" placeholder="review" />
        </div>
        <div class="field">
          <label :for="`check-kind-${index}`">Kind</label>
          <select :id="`check-kind-${index}`" v-model="check.kind" @change="normalize(check)">
            <option value="MIN_ELAPSED">MIN_ELAPSED</option>
            <option value="REQUIRED_EVENT">REQUIRED_EVENT</option>
            <option value="MIN_COUNT">MIN_COUNT</option>
            <option value="REQUIRED_ROLE">REQUIRED_ROLE</option>
          </select>
        </div>
        <template v-if="check.kind === 'MIN_ELAPSED'">
          <div class="field">
            <label :for="`check-from-${index}`">From event</label>
            <input :id="`check-from-${index}`" v-model.trim="check.from_event_type" placeholder="SUBMITTED" />
          </div>
          <div class="field">
            <label :for="`check-to-${index}`">To event</label>
            <input :id="`check-to-${index}`" v-model.trim="check.to_event_type" placeholder="VOTING_STARTED" />
          </div>
          <div class="field">
            <label :for="`check-threshold-${index}`">Minimum seconds</label>
            <input :id="`check-threshold-${index}`" v-model.number="check.threshold" type="number" min="0" step="1" />
          </div>
        </template>
        <template v-else-if="check.kind === 'REQUIRED_EVENT'">
          <div class="field">
            <label :for="`check-event-${index}`">Event type</label>
            <input :id="`check-event-${index}`" v-model.trim="check.event_type" placeholder="DISCUSSION_OPENED" />
          </div>
        </template>
        <template v-else-if="check.kind === 'MIN_COUNT'">
          <div class="field">
            <label :for="`check-event-${index}`">Event type</label>
            <input :id="`check-event-${index}`" v-model.trim="check.event_type" placeholder="COMMENT" />
          </div>
          <div class="field">
            <label :for="`check-threshold-${index}`">Minimum count</label>
            <input :id="`check-threshold-${index}`" v-model.number="check.threshold" type="number" min="0" step="1" />
          </div>
        </template>
        <template v-else-if="check.kind === 'REQUIRED_ROLE'">
          <div class="field">
            <label :for="`check-event-${index}`">Event type</label>
            <input :id="`check-event-${index}`" v-model.trim="check.event_type" placeholder="REVIEW_COMPLETED" />
          </div>
          <div class="field">
            <label :for="`check-role-${index}`">Required role</label>
            <select :id="`check-role-${index}`" v-model="check.role">
              <option value="owner">owner</option>
              <option value="registrar">registrar</option>
              <option value="recorder">recorder</option>
              <option value="escalator">escalator</option>
            </select>
          </div>
        </template>
      </div>
      <p class="tiny muted" style="margin: 0">
        Role addresses are pinned by the contract at registration; you choose the role, not a raw address.
      </p>
    </div>
    <button class="button secondary small" type="button" @click="add">Add check</button>
    <p v-if="!checks.length" class="small muted" style="margin: 0">
      A DETERMINISTIC_ONLY rule needs at least one check. An interpretive rule may have none.
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue"]);

const checks = props.modelValue;

function blankCheck() {
  return {
    check_id: "",
    kind: "MIN_ELAPSED",
    event_type: "",
    from_event_type: "SUBMITTED",
    to_event_type: "VOTING_STARTED",
    threshold: 0,
    role: "recorder",
    role_address: "0x0000000000000000000000000000000000000000",
  };
}

function add() {
  emit("update:modelValue", [...checks, blankCheck()]);
}

function remove(index) {
  emit("update:modelValue", checks.filter((_, itemIndex) => itemIndex !== index));
}

function normalize(check) {
  if (check.kind === "REQUIRED_EVENT" || check.kind === "REQUIRED_ROLE") check.threshold = 0;
  if (check.kind === "REQUIRED_EVENT" || check.kind === "MIN_COUNT") check.role = "";
  emit("update:modelValue", [...checks]);
}
</script>
