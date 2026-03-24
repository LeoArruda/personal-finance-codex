<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import BasePopover from "../../../shared/components/base/BasePopover.vue";
import { useBudgetUiStore } from "../stores/budgetUi.store";
import AssignPopover from "./AssignPopover.vue";
import type { BudgetMonthKey } from "../types/budget.types";

const props = defineProps<{
  budgetId: string;
  monthKey: BudgetMonthKey;
}>();

const budgetUiStore = useBudgetUiStore();
const { assignPopoverOpen, assignPopoverTab } = storeToRefs(budgetUiStore);

function toggleAssignPopover() {
  budgetUiStore.setAssignPopoverOpen(!assignPopoverOpen.value);
  if (!assignPopoverOpen.value && assignPopoverTab.value !== "auto") {
    budgetUiStore.setAssignPopoverTab("auto");
  }
}
</script>

<template>
  <BasePopover
    :open="assignPopoverOpen"
    placement="bottom-end"
    @close="budgetUiStore.setAssignPopoverOpen(false)"
  >
    <template #trigger>
      <button type="button" class="budget-ready-box__action" @click="toggleAssignPopover">
        Assign {{ assignPopoverOpen ? "▲" : "▼" }}
      </button>
    </template>

    <AssignPopover
      :budget-id="props.budgetId"
      :month-key="props.monthKey"
    />
  </BasePopover>
</template>
