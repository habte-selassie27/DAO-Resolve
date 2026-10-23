<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click.self="$emit('close')">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="$emit('close')">
        <header class="sheet-head">
          <h2>{{ title }}</h2>
          <button class="button secondary small" type="button" @click="$emit('close')">Close</button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
});
defineEmits(["close"]);
</script>