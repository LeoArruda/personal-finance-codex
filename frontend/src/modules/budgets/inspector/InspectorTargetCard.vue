<script setup lang="ts">
defineProps<{
  title: string;
  heading: string;
  description: string;
  actionLabel: string;
}>();
</script>

<template>
  <section class="budget-card overflow-hidden">
    <div class="border-b border-[var(--pfm-border-subtle)] px-[22px] py-5">
      <div class="text-[1.55rem] font-bold text-[var(--pfm-text-strong)]">{{ title }}</div>
    </div>

    <div class="px-[22px] py-5">
      <div class="text-[1.28rem] font-bold text-[var(--pfm-text-strong)]">{{ heading }}</div>
      <p class="my-[14px] text-[1.06rem] leading-[1.5] text-[var(--pfm-text-default)]">
        {{ description }}
      </p>
      <button
        type="button"
        class="rounded-[14px] border-0 bg-[rgba(74,85,234,0.13)] px-[18px] py-3 font-bold text-[var(--pfm-text-accent)]"
      >
        {{ actionLabel }}
      </button>
    </div>
  </section>
</template>
