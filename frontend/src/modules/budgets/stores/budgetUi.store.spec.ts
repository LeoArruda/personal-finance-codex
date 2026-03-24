import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useBudgetUiStore } from "./budgetUi.store";

describe("useBudgetUiStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("tracks selection independently from budget data", () => {
    const store = useBudgetUiStore();

    store.selectItem("category", "rent");

    expect(store.selectedType).toBe("category");
    expect(store.selectedId).toBe("rent");
  });

  it("toggles expanded group ids", () => {
    const store = useBudgetUiStore();

    store.toggleGroupExpanded("bills");
    expect(store.expandedGroupIds).toEqual(["bills"]);

    store.toggleGroupExpanded("bills");
    expect(store.expandedGroupIds).toEqual([]);
  });

  it("stores editing and assign-popover UI state", () => {
    const store = useBudgetUiStore();

    store.setEditingState("rent", "assigned");
    store.setAssignPopoverOpen(true);
    store.setAssignPopoverTab("manual");
    store.setActiveFilter("underfunded");

    expect(store.editingCategoryId).toBe("rent");
    expect(store.editingField).toBe("assigned");
    expect(store.assignPopoverOpen).toBe(true);
    expect(store.assignPopoverTab).toBe("manual");
    expect(store.activeFilter).toBe("underfunded");
  });
});
