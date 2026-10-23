<template>
  <span class="chip mono" :title="address">
    <span>{{ shortAddress(address) }}</span>
    <button v-if="address" class="copy" type="button" :aria-label="`Copy ${address}`" @click="copy">
      {{ copied ? "copied" : "copy" }}
    </button>
  </span>
</template>

<script setup>
import { ref } from "vue";
import { shortAddress } from "../lib/format.js";

const props = defineProps({
  address: { type: String, default: "" },
});
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.address);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {
    copied.value = false;
  }
}
</script>