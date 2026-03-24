<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import InspectorAutoAssignCard from "./InspectorAutoAssignCard.vue";
import InspectorCategoryBalanceCard from "./InspectorCategoryBalanceCard.vue";
import InspectorNotesCard from "./InspectorNotesCard.vue";
import InspectorSummaryCard from "./InspectorSummaryCard.vue";
import InspectorTargetCard from "./InspectorTargetCard.vue";
import { useBudgetMonthQuery } from "../composables/useBudgetMonthQuery";
import { useBudgetUiStore } from "../stores/budgetUi.store";
import type { BudgetMonthKey } from "../types/budget.types";

const props = defineProps<{
  budgetId: string;
  monthKey: BudgetMonthKey;
}>();

const budgetUiStore = useBudgetUiStore();
const { selectedType, selectedId } = storeToRefs(budgetUiStore);
const budgetMonthQuery = useBudgetMonthQuery(
  computed(() => props.budgetId),
  computed(() => props.monthKey)
);

const summaryMetrics = computed(() => {
  const month = budgetMonthQuery.data.value;
  if (!month) {
    return [];
  }

  return [
    { label: "Ready to Assign", value: month.summary.displayReadyToAssign },
    { label: "Assigned", value: month.summary.displayTotalAssigned },
    { label: "Activity", value: month.summary.displayTotalActivity },
    { label: "Available", value: month.summary.displayTotalAvailable }
  ];
});

const selectedGroup = computed(() => {
  if (selectedType.value !== "group" || !selectedId.value) {
    return null;
  }

  return budgetMonthQuery.data.value?.categoryGroups.find((group) => group.id === selectedId.value) ?? null;
});

const selectedCategory = computed(() => {
  if (selectedType.value !== "category" || !selectedId.value) {
    return null;
  }

  return (
    budgetMonthQuery.data.value?.categoryGroups
      .flatMap((group) => group.categories)
      .find((category) => category.id === selectedId.value) ?? null
  );
});

const inspectorMode = computed<"summary" | "group" | "category">(() => {
  if (selectedCategory.value) {
    return "category";
  }

  if (selectedGroup.value) {
    return "group";
  }

  return "summary";
});

const categoryMetrics = computed(() => {
  const category = selectedCategory.value;
  if (!category) {
    return [];
  }

  return [
    { label: "Assigned This Month", value: category.displayAssigned },
    { label: "Activity", value: category.displayActivity },
    { label: "Available", value: category.displayAvailable }
  ];
});

const groupMetrics = computed(() => {
  const group = selectedGroup.value;
  if (!group) {
    return [];
  }

  return [
    { label: "Assigned", value: group.displayAssigned },
    { label: "Activity", value: group.displayActivity },
    { label: "Available", value: group.displayAvailable },
    { label: "Categories", value: String(group.categories.length) }
  ];
});

const autoAssignItems = computed(() => [
  { label: "Assigned Last Month", value: "$0.00" },
  { label: "Spent Last Month", value: "$0.00" },
  { label: "Average Assigned", value: "$0.00" },
  { label: "Average Spent", value: "$0.00" },
  { label: "Reset Available Amount", value: "$0.00" }
]);
</script>

<template>
  <div class="budget-inspector">
    <div v-if="budgetMonthQuery.isLoading.value" class="px-1 py-4 text-[var(--pfm-text-muted)]">
      Loading inspector...
    </div>

    <div v-else-if="budgetMonthQuery.isError.value" class="px-1 py-4 text-[var(--pfm-text-muted)]">
      Unable to load inspector details.
    </div>

    <template v-else-if="inspectorMode === 'summary'">
      <InspectorSummaryCard title="March Summary" :metrics="summaryMetrics" />
      <InspectorAutoAssignCard title="Auto-Assign" :items="autoAssignItems" />
      <InspectorNotesCard
        title="Notes"
        body="This overview helps you scan the month before drilling into a specific group or category."
      />
    </template>

    <template v-else-if="inspectorMode === 'group' && selectedGroup">
      <InspectorSummaryCard
        :title="`${selectedGroup.name} Summary`"
        :metrics="groupMetrics"
      />
      <InspectorAutoAssignCard title="Auto-Assign" :items="autoAssignItems" />
      <InspectorNotesCard
        title="Notes"
        :body="`Use ${selectedGroup.name} to review the categories that share the same planning intent.`"
      />
    </template>

    <template v-else-if="inspectorMode === 'category' && selectedCategory">
      <InspectorCategoryBalanceCard
        :title="selectedCategory.name"
        :icon="selectedCategory.icon"
        available-label="Available Balance"
        :available-value="selectedCategory.displayAvailable"
        :metrics="categoryMetrics"
      />
      <InspectorTargetCard
        title="Target"
        :heading="`How much do you need for ${selectedCategory.icon ?? ''} ${selectedCategory.name}?`"
        description="When you create a target, we’ll show how much to set aside to stay on track through the month."
        action-label="Create Target"
      />
      <InspectorAutoAssignCard title="Auto-Assign" :items="autoAssignItems" />
      <InspectorNotesCard
        title="Notes"
        body="Category notes and recent context will live here once budgeting interactions are wired to real backend data."
      />
    </template>
  </div>
</template>
