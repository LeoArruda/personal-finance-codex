<script setup lang="ts">
defineProps<{
  title: string;
  icon: string | null;
  availableLabel: string;
  availableValue: string;
  metrics: Array<{ label: string; value: string }>;
}>();
</script>

<template>
  <section class="budget-card overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b border-[var(--pfm-border-subtle)] px-[22px] py-5">
      <div class="flex items-center gap-3">
        <span class="text-[1.9rem]">{{ icon ?? "•" }}</span>
        <div class="text-[1.9rem] font-bold text-[var(--pfm-text-strong)]">{{ title }}</div>
      </div>
      <span class="text-[1.25rem] text-[var(--pfm-text-muted)]">✎</span>
    </div>

    <div class="flex items-center justify-between gap-3 border-b border-[var(--pfm-border-subtle)] px-[22px] py-[18px]">
      <div class="text-[1.18rem] font-bold text-[var(--pfm-text-strong)]">{{ availableLabel }}</div>
      <span class="budget-metric-positive">{{ availableValue }}</span>
    </div>

    <div class="grid gap-2.5 px-[22px] py-5">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="flex items-center justify-between gap-4 text-[1.08rem]"
      >
        <span>{{ metric.label }}</span>
        <strong class="text-[var(--pfm-text-default)]">{{ metric.value }}</strong>
      </div>
    </div>
  </section>
</template>
