<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import BaseTabs from "../../../shared/components/base/BaseTabs.vue";
import { useBudgetMutations } from "../composables/useBudgetMutations";
import { useBudgetUiStore } from "../stores/budgetUi.store";
import type { AssignPopoverTab, AutoAssignStrategy, BudgetMonthKey } from "../types/budget.types";

const props = defineProps<{
  budgetId: string;
  monthKey: BudgetMonthKey;
}>();

const budgetUiStore = useBudgetUiStore();
const { assignPopoverTab, selectedId, selectedType, assignPopoverOpen } = storeToRefs(budgetUiStore);
const { applyAutoAssignMutation } = useBudgetMutations(
  computed(() => props.budgetId),
  computed(() => props.monthKey)
);

const tabs: Array<{ id: AssignPopoverTab; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "manual", label: "Manual" }
];

const autoActions: Array<{ strategy: AutoAssignStrategy; label: string }> = [
  { strategy: "assigned_last_month", label: "Assigned Last Month" },
  { strategy: "spent_last_month", label: "Spent Last Month" },
  { strategy: "average_assigned", label: "Average Assigned" },
  { strategy: "average_spent", label: "Average Spent" },
  { strategy: "reset_available", label: "Reset Available Amount" },
  { strategy: "reset_assigned", label: "Reset Assigned Amount" }
];

const selectedCategoryId = computed(() =>
  selectedType.value === "category" ? selectedId.value : undefined
);

async function applyStrategy(strategy: AutoAssignStrategy) {
  await applyAutoAssignMutation.mutateAsync({
    categoryId: selectedCategoryId.value,
    strategy
  });

  budgetUiStore.setAssignPopoverOpen(false);
}

function closePopover() {
  budgetUiStore.setAssignPopoverOpen(false);
}
</script>

<template>
  <div class="w-[420px]">
    <div class="flex items-center justify-between px-5 pt-4 pb-1">
      <div class="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[var(--pfm-text-muted)]">
        Assign Money
      </div>
      <button
        type="button"
        class="border-0 bg-transparent p-1 text-[1rem] text-[var(--pfm-text-muted)]"
        aria-label="Close assign popover"
        @click="closePopover"
      >
        ✕
      </button>
    </div>

    <BaseTabs
      v-model="assignPopoverTab"
      :tabs="tabs"
    />

    <div v-if="assignPopoverTab === 'auto'" class="grid gap-2 p-5">
      <button
        v-for="action in autoActions"
        :key="action.strategy"
        type="button"
        class="budget-card budget-card--soft flex items-center justify-between gap-4 border-0 px-4 py-[14px] text-left transition-colors hover:bg-[rgba(74,85,234,0.08)]"
        @click="applyStrategy(action.strategy)"
      >
        <span class="text-[1.02rem] text-[var(--pfm-text-accent)]">{{ action.label }}</span>
        <strong class="text-[var(--pfm-text-accent)]">
          {{ selectedCategoryId ? "Apply" : "Preview" }}
        </strong>
      </button>
    </div>

    <div v-else class="p-5">
      <div class="rounded-[16px] border border-[var(--pfm-border-subtle)] bg-[var(--pfm-bg-panel-muted)] p-4">
        <div class="text-[1.05rem] font-semibold text-[var(--pfm-text-strong)]">Manual Assign</div>
        <p class="mt-2 text-[0.98rem] leading-[1.5] text-[var(--pfm-text-default)]">
          Select a category row, then edit the Assigned cell inline to manually budget money.
          Only one assigned value can be edited at a time.
        </p>
      </div>
    </div>
  </div>
</template>
