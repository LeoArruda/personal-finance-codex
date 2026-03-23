import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type AssignMoneyInput,
  type AssignMoneyRepositoryResult,
  type BudgetAssignmentsRepository
} from "../../../../src/modules/budgeting/application/assignMoney";
import {
  type MoveMoneyInput,
  type MoveMoneyRepositoryResult,
  type MoveMoneyResult
} from "../../../../src/modules/budgeting/application/moveMoney";
import { type CategoryMonthSummary } from "../../../../src/modules/budgeting/application/budgetMonths";

const monthKey = "2026-07";
const budgetId = "budget-1";
const userId = "user-1";

type MonthState = {
  readyToAssignMinor: bigint;
  totalAssignedMinor: bigint;
  categories: Map<string, CategoryMonthSummary>;
};

const months = new Map<string, MonthState>();

function composite() {
  return `${budgetId}|${monthKey}`;
}

function sumAvailable(state: MonthState): bigint {
  return [...state.categories.values()].reduce((acc, c) => acc + BigInt(c.availableMinor), 0n);
}

function seedTwoCategories(
  rta: bigint,
  a: CategoryMonthSummary,
  b: CategoryMonthSummary
) {
  months.set(composite(), {
    readyToAssignMinor: rta,
    totalAssignedMinor: BigInt(a.assignedMinor) + BigInt(b.assignedMinor),
    categories: new Map([
      [a.categoryId, { ...a }],
      [b.categoryId, { ...b }]
    ])
  });
}

const fakeAssignmentsRepository: BudgetAssignmentsRepository = {
  async assignMoneyFromReadyToAssign(
    _uid: string,
    _bid: string,
    _mk: string,
    _input: AssignMoneyInput
  ): Promise<AssignMoneyRepositoryResult> {
    return { status: "not_found" };
  },
  async moveMoneyBetweenCategories(
    uid: string,
    bid: string,
    mk: string,
    input: MoveMoneyInput
  ): Promise<MoveMoneyRepositoryResult> {
    if (uid !== userId || bid !== budgetId || mk !== monthKey) {
      return { status: "not_found" };
    }
    if (input.fromCategoryId === input.toCategoryId) {
      return { status: "same_category" };
    }

    const state = months.get(`${bid}|${mk}`);
    if (!state) return { status: "not_found" };

    const amount = BigInt(input.amountMinor);
    if (amount <= 0n) return { status: "not_found" };

    const src = state.categories.get(input.fromCategoryId);
    const dest = state.categories.get(input.toCategoryId);
    if (!src || !dest) return { status: "not_found" };

    if (amount > BigInt(src.availableMinor)) {
      return { status: "insufficient_source_available" };
    }

    const srcNext: CategoryMonthSummary = {
      ...src,
      assignedMinor: (BigInt(src.assignedMinor) - amount).toString(),
      availableMinor: (BigInt(src.availableMinor) - amount).toString()
    };
    const destNext: CategoryMonthSummary = {
      ...dest,
      assignedMinor: (BigInt(dest.assignedMinor) + amount).toString(),
      availableMinor: (BigInt(dest.availableMinor) + amount).toString()
    };
    state.categories.set(input.fromCategoryId, srcNext);
    state.categories.set(input.toCategoryId, destNext);

    const data: MoveMoneyResult = {
      eventId: `move-${input.fromCategoryId}-${input.toCategoryId}-${amount}`,
      readyToAssignMinor: state.readyToAssignMinor.toString(),
      totalAssignedMinor: state.totalAssignedMinor.toString(),
      totalAvailableMinor: sumAvailable(state).toString(),
      sourceCategoryMonth: srcNext,
      destinationCategoryMonth: destNext
    };
    return { status: "ok", data };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetAssignmentsRepository: fakeAssignmentsRepository }
);

describe("POST /api/v1/budgets/:budgetId/months/:monthKey/move", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .send({ fromCategoryId: "a", toCategoryId: "b", amountMinor: "10" })
      .expect(401);
  });

  it("returns 400 for invalid amountMinor", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .set("authorization", `Bearer ${token}`)
      .send({ fromCategoryId: "cat-a", toCategoryId: "cat-b", amountMinor: "0" })
      .expect(400);
  });

  it("returns 400 when source and destination are the same", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .set("authorization", `Bearer ${token}`)
      .send({ fromCategoryId: "cat-a", toCategoryId: "cat-a", amountMinor: "10" })
      .expect(400);
  });

  it("returns 404 when month or categories are missing", async () => {
    months.clear();
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .set("authorization", `Bearer ${token}`)
      .send({ fromCategoryId: "cat-a", toCategoryId: "cat-b", amountMinor: "10" })
      .expect(404);
  });

  it("returns 400 when source available is insufficient", async () => {
    months.clear();
    seedTwoCategories(
      5000n,
      {
        categoryId: "cat-a",
        assignedMinor: "50",
        activityMinor: "0",
        availableMinor: "50",
        carryoverFromPreviousMinor: "0"
      },
      {
        categoryId: "cat-b",
        assignedMinor: "0",
        activityMinor: "0",
        availableMinor: "0",
        carryoverFromPreviousMinor: "0"
      }
    );
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .set("authorization", `Bearer ${token}`)
      .send({ fromCategoryId: "cat-a", toCategoryId: "cat-b", amountMinor: "100" })
      .expect(400);
  });

  it("moves money without changing RTA or total assigned / total available", async () => {
    months.clear();
    seedTwoCategories(
      1000n,
      {
        categoryId: "cat-a",
        assignedMinor: "400",
        activityMinor: "0",
        availableMinor: "400",
        carryoverFromPreviousMinor: "0"
      },
      {
        categoryId: "cat-b",
        assignedMinor: "200",
        activityMinor: "0",
        availableMinor: "200",
        carryoverFromPreviousMinor: "0"
      }
    );
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/move`)
      .set("authorization", `Bearer ${token}`)
      .send({ fromCategoryId: "cat-a", toCategoryId: "cat-b", amountMinor: "150" })
      .expect(200);

    expect(response.body.readyToAssignMinor).toBe("1000");
    expect(response.body.totalAssignedMinor).toBe("600");
    expect(response.body.totalAvailableMinor).toBe("600");

    expect(response.body.sourceCategoryMonth).toMatchObject({
      categoryId: "cat-a",
      assignedMinor: "250",
      availableMinor: "250"
    });
    expect(response.body.destinationCategoryMonth).toMatchObject({
      categoryId: "cat-b",
      assignedMinor: "350",
      availableMinor: "350"
    });
    expect(response.body.eventId).toBe("move-cat-a-cat-b-150");
  });
});
