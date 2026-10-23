<template>
  <div class="small wrap">
    <a
      v-if="safeUrl"
      :href="safeUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="wrap"
    >{{ item.ref }}</a>
    <p v-else-if="item.kind === 'TEXT_STATEMENT'" class="serif" style="margin: 0">{{ item.ref }}</p>
    <span v-else class="mono">{{ item.ref }}</span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  item: { type: Object, required: true },
});

const safeUrl = computed(() => {
  const value = String(props.item?.ref || "");
  if (props.item?.kind !== "URL") return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
});
</script>
