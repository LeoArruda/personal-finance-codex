import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getBudgetMonth } from "../services/budgets.api";
import type { BudgetMonthKey } from "../types/budget.types";

export function useBudgetMonthQuery(
  budgetId: MaybeRefOrGetter<string>,
  monthKey: MaybeRefOrGetter<BudgetMonthKey>
) {
  const resolvedBudgetId = computed(() => toValue(budgetId));
  const resolvedMonthKey = computed(() => toValue(monthKey));

  return useQuery({
    queryKey: computed(() => [
      "budgets",
      "month",
      resolvedBudgetId.value,
      resolvedMonthKey.value
    ]),
    queryFn: () => getBudgetMonth(resolvedBudgetId.value, resolvedMonthKey.value),
    enabled: computed(
      () => resolvedBudgetId.value.length > 0 && resolvedMonthKey.value.length > 0
    )
  });
}
