import { nextTick } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { useBudgetMonthQuery } from "./useBudgetMonthQuery";
import { createTestQueryClient } from "../../../../test/helpers/createTestQueryClient";
import { renderComposable } from "../../../../test/helpers/renderComposable";

describe("useBudgetMonthQuery", () => {
  it("loads the requested month payload through TanStack Query", async () => {
    const queryClient = createTestQueryClient();
    const { result, wrapper } = renderComposable(
      () => useBudgetMonthQuery("budget-1", "2026-03"),
      (app) => {
        app.use(VueQueryPlugin, { queryClient });
      }
    );

    await flushPromises();
    await nextTick();

    expect(result.isSuccess.value).toBe(true);
    expect(result.data.value?.summary.budgetId).toBe("budget-1");
    expect(result.data.value?.categoryGroups[0]?.id).toBe("bills");
    expect(queryClient.getQueryData(["budgets", "month", "budget-1", "2026-03"])).toBeTruthy();

    await wrapper.unmount();
  });
});
