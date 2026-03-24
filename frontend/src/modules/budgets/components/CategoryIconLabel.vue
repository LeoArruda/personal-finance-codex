<script setup lang="ts">
import BudgetProgressBar from "./BudgetProgressBar.vue";

defineProps<{
  icon: string | null;
  name: string;
  progress: number;
  muted?: boolean;
}>();
</script>

<template>
  <div class="flex min-w-0 flex-1 items-center gap-3">
    <span class="text-[1.85rem]">{{ icon ?? "•" }}</span>
    <div class="min-w-0 flex-1">
      <div
        class="truncate text-[1.18rem] font-semibold text-[var(--pfm-text-strong)]"
      >
        {{ name }}
      </div>
      <BudgetProgressBar :progress="progress" :muted="muted" />
    </div>
  </div>
</template>
