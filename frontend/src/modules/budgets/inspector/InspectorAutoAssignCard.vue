<script setup lang="ts">
defineProps<{
  title: string;
  items: Array<{ label: string; value: string }>;
}>();
</script>

<template>
  <section class="budget-card overflow-hidden">
    <div class="border-b border-[var(--pfm-border-subtle)] px-[22px] py-5">
      <div class="text-[1.55rem] font-bold text-[var(--pfm-text-strong)]">{{ title }}</div>
    </div>

    <div class="grid gap-2.5 px-[18px] py-[18px]">
      <div
        v-for="item in items"
        :key="item.label"
        class="budget-card budget-card--soft flex items-center justify-between gap-3 px-4 py-[14px]"
      >
        <span class="text-[1.02rem] text-[var(--pfm-text-accent)]">{{ item.label }}</span>
        <strong class="text-[var(--pfm-text-accent)]">{{ item.value }}</strong>
      </div>
    </div>
  </section>
</template>
