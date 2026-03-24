<script setup lang="ts">
import BudgetFilterChips, { type BudgetFilterChip } from "./BudgetFilterChips.vue";

export interface BudgetToolbarAction {
  id: string;
  label: string;
  subdued?: boolean;
}

defineProps<{
  chips: BudgetFilterChip[];
  actions: BudgetToolbarAction[];
}>();
</script>

<template>
  <div class="px-7 pb-4">
    <div class="flex items-center justify-between gap-4">
      <BudgetFilterChips :chips="chips" />

      <div class="flex items-center gap-5 text-[1rem] text-[var(--pfm-text-accent)]">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="border-0 bg-transparent p-0"
          :class="action.subdued ? 'opacity-45' : 'opacity-100'"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>
