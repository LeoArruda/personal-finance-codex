<script setup lang="ts">
import MonthNavigator from "./MonthNavigator.vue";
import ReadyToAssignCard from "./ReadyToAssignCard.vue";

defineProps<{
  monthLabel: string;
  noteText: string;
  readyToAssignLabel: string;
  readyToAssignAmount: string;
  memberButtonLabel: string;
}>();
</script>

<template>
  <header class="grid grid-cols-[1fr_auto_1fr] items-start gap-6 px-7 pt-[30px] pb-[18px]">
    <div class="justify-self-start">
      <MonthNavigator :month-label="monthLabel" :note-text="noteText" />
    </div>

    <div class="justify-self-center">
      <ReadyToAssignCard
        :label="readyToAssignLabel"
        :amount="readyToAssignAmount"
      />
    </div>

    <div class="justify-self-end">
      <button
        type="button"
        class="rounded-[16px] border border-[rgba(74,85,234,0.08)] bg-[rgba(255,255,255,0.9)] px-5 py-3 text-[1.05rem] font-medium text-[var(--pfm-text-accent)] shadow-[0_8px_16px_rgba(31,28,23,0.04)]"
      >
        {{ memberButtonLabel }}
      </button>
    </div>
  </header>
</template>
