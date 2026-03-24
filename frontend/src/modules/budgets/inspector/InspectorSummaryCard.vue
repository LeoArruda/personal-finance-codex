<script setup lang="ts">
import type { BudgetInspectorMetric } from "../types/budget.types";

defineProps<{
  title: string;
  metrics: BudgetInspectorMetric[];
}>();
</script>

<template>
  <section class="budget-card overflow-hidden">
    <div class="border-b border-[var(--pfm-border-subtle)] px-[22px] py-5">
      <div class="text-[1.55rem] font-bold text-[var(--pfm-text-strong)]">{{ title }}</div>
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
