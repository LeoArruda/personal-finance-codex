import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
  AssignPopoverTab,
  BudgetCategoryFilter,
  BudgetEditingField,
  BudgetSelectionType
} from "../types/budget.types";

export const useBudgetUiStore = defineStore("budgetUi", () => {
  const selectedType = ref<BudgetSelectionType>(null);
  const selectedId = ref<string | null>(null);
  const expandedGroupIds = ref<string[]>([]);
  const activeFilter = ref<BudgetCategoryFilter>("all");
  const editingCategoryId = ref<string | null>(null);
  const editingField = ref<BudgetEditingField>(null);
  const assignPopoverOpen = ref(false);
  const assignPopoverTab = ref<AssignPopoverTab>("auto");

  const expandedGroupIdSet = computed(() => new Set(expandedGroupIds.value));

  function selectItem(type: BudgetSelectionType, id: string | null) {
    selectedType.value = type;
    selectedId.value = id;
  }

  function setActiveFilter(filter: BudgetCategoryFilter) {
    activeFilter.value = filter;
  }

  function toggleGroupExpanded(groupId: string) {
    if (expandedGroupIdSet.value.has(groupId)) {
      expandedGroupIds.value = expandedGroupIds.value.filter((id) => id !== groupId);
      return;
    }

    expandedGroupIds.value = [...expandedGroupIds.value, groupId];
  }

  function setEditingState(categoryId: string | null, field: BudgetEditingField) {
    editingCategoryId.value = categoryId;
    editingField.value = field;
  }

  function setAssignPopoverOpen(isOpen: boolean) {
    assignPopoverOpen.value = isOpen;
  }

  function setAssignPopoverTab(tab: AssignPopoverTab) {
    assignPopoverTab.value = tab;
  }

  return {
    selectedType,
    selectedId,
    expandedGroupIds,
    activeFilter,
    editingCategoryId,
    editingField,
    assignPopoverOpen,
    assignPopoverTab,
    selectItem,
    setActiveFilter,
    toggleGroupExpanded,
    setEditingState,
    setAssignPopoverOpen,
    setAssignPopoverTab
  };
});
