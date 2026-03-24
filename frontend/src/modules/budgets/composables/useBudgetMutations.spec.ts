import { nextTick } from "vue";
import { VueQueryPlugin, useQueryClient } from "@tanstack/vue-query";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { useBudgetMonthQuery } from "./useBudgetMonthQuery";
import { useBudgetMutations } from "./useBudgetMutations";
import { createTestQueryClient } from "../../../../test/helpers/createTestQueryClient";
import { renderComposable } from "../../../../test/helpers/renderComposable";

describe("useBudgetMutations", () => {
  it("updates cached month data after assigned-amount mutation succeeds", async () => {
    const queryClient = createTestQueryClient();
    const { result, wrapper } = renderComposable(
      () => {
        const monthQuery = useBudgetMonthQuery("budget-1", "2026-03");
        const mutations = useBudgetMutations("budget-1", "2026-03");
        const localQueryClient = useQueryClient();

        return {
          monthQuery,
          ...mutations,
          localQueryClient
        };
      },
      (app) => {
        app.use(VueQueryPlugin, { queryClient });
      }
    );

    await flushPromises();
    await nextTick();

    await result.updateAssignedAmountMutation.mutateAsync({
      categoryId: "rent",
      assignedMinor: "245000"
    });

    await flushPromises();
    await nextTick();

    const cachedMonth = result.localQueryClient.getQueryData([
      "budgets",
      "month",
      "budget-1",
      "2026-03"
    ]) as { summary: { totalAssignedMinor: string }; categoryGroups: Array<{ categories: Array<{ id: string; assignedMinor: string }> }> } | undefined;

    const rentCategory = cachedMonth?.categoryGroups
      .flatMap((group) => group.categories)
      .find((category) => category.id === "rent");

    expect(rentCategory?.assignedMinor).toBe("245000");
    expect(cachedMonth?.summary.totalAssignedMinor).toBe("293000");

    await wrapper.unmount();
  });

  it("stores auto-assign results back into the month cache", async () => {
    const queryClient = createTestQueryClient();
    const { result, wrapper } = renderComposable(
      () => {
        const monthQuery = useBudgetMonthQuery("budget-1", "2026-03");
        const mutations = useBudgetMutations("budget-1", "2026-03");
        const localQueryClient = useQueryClient();

        return {
          monthQuery,
          ...mutations,
          localQueryClient
        };
      },
      (app) => {
        app.use(VueQueryPlugin, { queryClient });
      }
    );

    await flushPromises();
    await nextTick();

    const mutationResult = await result.applyAutoAssignMutation.mutateAsync({
      categoryId: "rent",
      strategy: "spent_last_month"
    });

    await flushPromises();
    await nextTick();

    const cachedMonth = result.localQueryClient.getQueryData([
      "budgets",
      "month",
      "budget-1",
      "2026-03"
    ]) as { categoryGroups: Array<{ categories: Array<{ id: string; assignedMinor: string }> }> } | undefined;

    const rentCategory = cachedMonth?.categoryGroups
      .flatMap((group) => group.categories)
      .find((category) => category.id === "rent");

    expect(mutationResult.appliedOptions[0]?.strategy).toBe("spent_last_month");
    expect(rentCategory?.assignedMinor).toBe("219500");

    await wrapper.unmount();
  });
});
