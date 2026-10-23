<template>
  <div class="notice">
    <p class="row" style="margin-bottom: 4px"><strong>What is real and what is trusted</strong><span class="chip">advisory</span></p>
    <p class="small muted" style="margin: 0">{{ trustStatement }}</p>
  </div>
</template>

<script setup>
import { trustStatement } from "../domain/copy.js";
</script>