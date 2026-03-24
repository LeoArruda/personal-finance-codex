<script setup lang="ts">
import BudgetAmountCell from "./BudgetAmountCell.vue";
import BudgetAvailablePill from "./BudgetAvailablePill.vue";
import CategoryIconLabel from "./CategoryIconLabel.vue";
import type { BudgetCategory } from "../types/budget.types";

defineProps<{
  category: BudgetCategory;
  selected: boolean;
  editingAssigned: boolean;
}>();

const emit = defineEmits<{
  select: [categoryId: string];
  editAssigned: [categoryId: string];
  commitAssigned: [payload: { categoryId: string; assignedMinor: string }];
  cancelAssigned: [];
}>();

function getProgress(category: BudgetCategory): number {
  const assigned = Number(category.assignedMinor);
  const available = Number(category.availableMinor);

  if (assigned <= 0 || available <= 0) {
    return 12;
  }

  return Math.max(18, Math.min(100, Math.round((available / assigned) * 100)));
}
</script>

<template>
  <div
    class="budget-table-row cursor-pointer"
    :class="{ 'budget-table-row--selected': selected }"
    @click="emit('select', category.id)"
  >
    <div class="flex min-w-0 items-center gap-4">
      <span class="text-[1.45rem] leading-none text-[rgba(38,33,28,0.45)]">□</span>
      <CategoryIconLabel
        :icon="category.icon"
        :name="category.name"
        :progress="getProgress(category)"
        :muted="category.availableMinor === '0'"
      />
    </div>

    <button
      type="button"
      class="border-0 bg-transparent p-0 text-right"
      @click.stop="emit('editAssigned', category.id)"
    >
      <BudgetAmountCell
        :value="category.displayAssigned"
        :amount-minor="category.assignedMinor"
        :editing="editingAssigned"
        @commit="emit('commitAssigned', { categoryId: category.id, assignedMinor: $event })"
        @cancel="emit('cancelAssigned')"
      />
    </button>

    <BudgetAmountCell :value="category.displayActivity" />

    <div class="flex justify-end">
      <BudgetAvailablePill
        :value="category.displayAvailable"
        :tone="category.availableMinor === '0' ? 'neutral' : 'positive'"
      />
    </div>
  </div>
</template>
