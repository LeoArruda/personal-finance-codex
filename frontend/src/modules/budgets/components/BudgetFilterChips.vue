<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useBudgetUiStore } from "../stores/budgetUi.store";
import type { BudgetCategoryFilter } from "../types/budget.types";

export interface BudgetFilterChip {
  id: BudgetCategoryFilter;
  label: string;
}

defineProps<{
  chips: BudgetFilterChip[];
}>();

const budgetUiStore = useBudgetUiStore();
const { activeFilter } = storeToRefs(budgetUiStore);
</script>

<template>
  <div class="flex items-center gap-2.5">
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="budget-pill"
      :class="{ 'budget-pill--active': activeFilter === chip.id }"
      @click="budgetUiStore.setActiveFilter(chip.id)"
    >
      {{ chip.label }}
    </button>
  </div>
</template>
