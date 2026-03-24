<script setup lang="ts">
import BudgetAmountCell from "./BudgetAmountCell.vue";
import type { BudgetCategoryGroupSummary } from "../types/budget.types";

defineProps<{
  group: BudgetCategoryGroupSummary;
  expanded: boolean;
  selected?: boolean;
}>();

const emit = defineEmits<{
  toggle: [groupId: string];
  select: [groupId: string];
}>();
</script>

<template>
  <button
    type="button"
    class="budget-table-row budget-table-row--group w-full border-0 text-left"
    :class="{ 'budget-table-row--selected': selected }"
    @click="emit('toggle', group.id)"
    @dblclick.stop="emit('select', group.id)"
  >
    <div class="flex items-center gap-3.5">
      <span class="text-[1.05rem]">{{ expanded ? "⌄" : "›" }}</span>
      <span class="text-[1.7rem] leading-none text-[rgba(74,85,234,0.9)]">□</span>
      <span class="text-[1.22rem]">{{ group.name }}</span>
    </div>

    <BudgetAmountCell :value="group.displayAssigned" />
    <BudgetAmountCell :value="group.displayActivity" />
    <BudgetAmountCell :value="group.displayAvailable" />
  </button>
</template>
