<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
}>();
</script>

<template>
  <section class="budget-card overflow-hidden">
    <div class="border-b border-[var(--pfm-border-subtle)] px-[22px] py-5">
      <div class="text-[1.55rem] font-bold text-[var(--pfm-text-strong)]">{{ title }}</div>
    </div>

    <div class="px-[22px] py-5 text-[1.03rem] leading-[1.6] text-[var(--pfm-text-default)]">
      {{ body }}
    </div>
  </section>
</template>
