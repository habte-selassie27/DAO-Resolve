<template>
  <div class="empty">
    <p style="margin-bottom: 10px">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({ message: { type: String, required: true } });
</script>