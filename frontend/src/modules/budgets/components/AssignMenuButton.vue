<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useBudgetUiStore } from "../stores/budgetUi.store";

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
  <button type="button" class="budget-ready-box__action" @click="toggleAssignPopover">
    Assign {{ assignPopoverOpen ? "▲" : "▼" }}
  </button>
</template>
