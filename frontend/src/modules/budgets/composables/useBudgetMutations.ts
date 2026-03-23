import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  applyAutoAssign,
  updateAssignedAmount
} from "../services/budgets.api";
import type {
  ApplyAutoAssignInput,
  BudgetMonthKey,
  UpdateAssignedAmountInput
} from "../types/budget.types";

function buildBudgetMonthQueryKey(budgetId: string, monthKey: BudgetMonthKey) {
  return ["budgets", "month", budgetId, monthKey] as const;
}

export function useBudgetMutations(
  budgetId: MaybeRefOrGetter<string>,
  monthKey: MaybeRefOrGetter<BudgetMonthKey>
) {
  const queryClient = useQueryClient();
  const resolvedBudgetId = computed(() => toValue(budgetId));
  const resolvedMonthKey = computed(() => toValue(monthKey));

  const invalidateBudgetMonth = async () => {
    await queryClient.invalidateQueries({
      queryKey: buildBudgetMonthQueryKey(resolvedBudgetId.value, resolvedMonthKey.value)
    });
  };

  const updateAssignedAmountMutation = useMutation({
    mutationFn: (input: Omit<UpdateAssignedAmountInput, "budgetId" | "monthKey">) =>
      updateAssignedAmount({
        budgetId: resolvedBudgetId.value,
        monthKey: resolvedMonthKey.value,
        ...input
      }),
    onSuccess: async (month) => {
      queryClient.setQueryData(
        buildBudgetMonthQueryKey(resolvedBudgetId.value, resolvedMonthKey.value),
        month
      );
      await invalidateBudgetMonth();
    }
  });

  const applyAutoAssignMutation = useMutation({
    mutationFn: (input: Omit<ApplyAutoAssignInput, "budgetId" | "monthKey">) =>
      applyAutoAssign({
        budgetId: resolvedBudgetId.value,
        monthKey: resolvedMonthKey.value,
        ...input
      }),
    onSuccess: async (result) => {
      queryClient.setQueryData(
        buildBudgetMonthQueryKey(resolvedBudgetId.value, resolvedMonthKey.value),
        result.month
      );
      await invalidateBudgetMonth();
    }
  });

  return {
    updateAssignedAmountMutation,
    applyAutoAssignMutation
  };
}
