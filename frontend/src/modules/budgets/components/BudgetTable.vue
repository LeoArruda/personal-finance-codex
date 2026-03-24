<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import BudgetCategoryRow from "./BudgetCategoryRow.vue";
import BudgetGroupRow from "./BudgetGroupRow.vue";
import BudgetTableHeader from "./BudgetTableHeader.vue";
import { useBudgetMonthQuery } from "../composables/useBudgetMonthQuery";
import { useBudgetMutations } from "../composables/useBudgetMutations";
import { useBudgetUiStore } from "../stores/budgetUi.store";
import type { BudgetCategoryFilter, BudgetMonthKey } from "../types/budget.types";

const props = defineProps<{
  budgetId: string;
  monthKey: BudgetMonthKey;
}>();

const budgetUiStore = useBudgetUiStore();
const { selectedId, selectedType, expandedGroupIds, activeFilter, editingCategoryId, editingField } =
  storeToRefs(budgetUiStore);

const budgetMonthQuery = useBudgetMonthQuery(
  computed(() => props.budgetId),
  computed(() => props.monthKey)
);
const { updateAssignedAmountMutation } = useBudgetMutations(
  computed(() => props.budgetId),
  computed(() => props.monthKey)
);

const groups = computed(() => budgetMonthQuery.data.value?.categoryGroups ?? []);

watchEffect(() => {
  if (groups.value.length > 0 && expandedGroupIds.value.length === 0) {
    expandedGroupIds.value = groups.value.map((group) => group.id);
  }
});

function isExpanded(groupId: string): boolean {
  return expandedGroupIds.value.includes(groupId);
}

function isSelectedCategory(categoryId: string): boolean {
  return selectedType.value === "category" && selectedId.value === categoryId;
}

function isSelectedGroup(groupId: string): boolean {
  return selectedType.value === "group" && selectedId.value === groupId;
}

function isAssignedEditing(categoryId: string): boolean {
  return editingCategoryId.value === categoryId && editingField.value === "assigned";
}

function selectCategory(categoryId: string) {
  budgetUiStore.selectItem("category", categoryId);
  if (editingCategoryId.value && editingCategoryId.value !== categoryId) {
    budgetUiStore.setEditingState(null, null);
  }
}

function toggleGroup(groupId: string) {
  budgetUiStore.toggleGroupExpanded(groupId);
}

function selectGroup(groupId: string) {
  budgetUiStore.selectItem("group", groupId);
  budgetUiStore.setEditingState(null, null);
}

function startAssignedEdit(categoryId: string) {
  budgetUiStore.selectItem("category", categoryId);
  budgetUiStore.setEditingState(categoryId, "assigned");
}

async function commitAssignedEdit(payload: { categoryId: string; assignedMinor: string }) {
  await updateAssignedAmountMutation.mutateAsync(payload);
  budgetUiStore.setEditingState(null, null);
}

function cancelAssignedEdit() {
  budgetUiStore.setEditingState(null, null);
}

function matchesFilter(filter: BudgetCategoryFilter, category: { availableMinor: string; assignedMinor: string }): boolean {
  if (filter === "all") {
    return true;
  }

  const assigned = BigInt(category.assignedMinor);
  const available = BigInt(category.availableMinor);

  if (filter === "money_available") {
    return available > 0n;
  }

  if (filter === "underfunded") {
    return assigned > 0n && available === 0n;
  }

  if (filter === "overfunded") {
    return available > assigned && assigned > 0n;
  }

  if (filter === "snoozed") {
    return false;
  }

  return true;
}

const filteredGroups = computed(() =>
  groups.value
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => matchesFilter(activeFilter.value, category))
    }))
    .filter((group) => group.categories.length > 0 || activeFilter.value === "all")
);
</script>

<template>
  <section class="px-[18px] pb-6">
    <div class="budget-card overflow-hidden rounded-[22px]">
      <div
        class="flex items-center justify-between gap-3 bg-[rgba(255,255,255,0.86)] px-6 py-[18px]"
      >
        <div class="flex items-center gap-[22px] text-[var(--pfm-text-accent)]">
          <span class="text-[1.55rem]">⊕ Category Group</span>
          <span class="opacity-45">↺ Undo</span>
          <span class="opacity-45">↻ Redo</span>
          <span>◔ Recent Moves</span>
        </div>
        <div class="flex gap-2">
          <span class="budget-pill px-3">▤</span>
          <span class="budget-pill px-3 opacity-50">☰</span>
        </div>
      </div>

      <BudgetTableHeader />

      <div v-if="budgetMonthQuery.isLoading.value" class="px-6 py-8 text-[var(--pfm-text-muted)]">
        Loading budget month...
      </div>

      <div v-else-if="budgetMonthQuery.isError.value" class="px-6 py-8 text-[var(--pfm-text-muted)]">
        Unable to load this budget month.
      </div>

      <template v-else>
        <template v-for="group in filteredGroups" :key="group.id">
          <BudgetGroupRow
            :group="group"
            :expanded="isExpanded(group.id)"
            :selected="isSelectedGroup(group.id)"
            @toggle="toggleGroup"
            @select="selectGroup"
          />

          <template v-if="isExpanded(group.id)">
            <BudgetCategoryRow
              v-for="category in group.categories"
              :key="category.id"
              :category="category"
              :selected="isSelectedCategory(category.id)"
              :editing-assigned="isAssignedEditing(category.id)"
              @select="selectCategory"
              @edit-assigned="startAssignedEdit"
              @commit-assigned="commitAssignedEdit"
              @cancel-assigned="cancelAssignedEdit"
            />
          </template>
        </template>
      </template>
    </div>
  </section>
</template>
