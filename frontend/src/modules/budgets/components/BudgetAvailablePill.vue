<script setup lang="ts">
defineProps<{
  value: string;
  tone?: "positive" | "neutral";
}>();
</script>

<template>
  <span
    v-if="tone === 'positive'"
    class="budget-metric-positive"
  >
    {{ value }}
  </span>
  <span
    v-else
    class="budget-pill"
  >
    {{ value }}
  </span>
</template>
