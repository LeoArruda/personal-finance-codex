import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type AssignMoneyInput,
  type AssignMoneyRepositoryResult,
  type AssignMoneyResult,
  type BudgetAssignmentsRepository
} from "../../../../src/modules/budgeting/application/assignMoney";
import { type MoveMoneyInput } from "../../../../src/modules/budgeting/application/moveMoney";
import { type CategoryMonthSummary } from "../../../../src/modules/budgeting/application/budgetMonths";

const monthKey = "2026-06";
const budgetId = "budget-1";
const userId = "user-1";

type MonthState = {
  budgetMonthId: string;
  readyToAssignMinor: bigint;
  totalAssignedMinor: bigint;
  totalAvailableMinor: bigint;
  categories: Map<string, CategoryMonthSummary>;
};

const months = new Map<string, MonthState>();

function monthKeyComposite() {
  return `${budgetId}|${monthKey}`;
}

function seedMonth(rta: bigint, cat: CategoryMonthSummary) {
  months.set(monthKeyComposite(), {
    budgetMonthId: "bm-1",
    readyToAssignMinor: rta,
    totalAssignedMinor: 0n,
    totalAvailableMinor: BigInt(cat.availableMinor),
    categories: new Map([[cat.categoryId, { ...cat }]])
  });
}

const fakeAssignmentsRepository: BudgetAssignmentsRepository = {
  async assignMoneyFromReadyToAssign(
    uid: string,
    bid: string,
    mk: string,
    input: AssignMoneyInput
  ): Promise<AssignMoneyRepositoryResult> {
    if (uid !== userId || bid !== budgetId || mk !== monthKey) {
      return { status: "not_found" };
    }
    const state = months.get(`${bid}|${mk}`);
    if (!state) return { status: "not_found" };

    const amount = BigInt(input.amountMinor);
    if (amount <= 0n) {
      return { status: "not_found" };
    }
    if (amount > state.readyToAssignMinor) {
      return { status: "insufficient_ready_to_assign" };
    }

    const cm = state.categories.get(input.categoryId);
    if (!cm) return { status: "not_found" };

    const newAssigned = BigInt(cm.assignedMinor) + amount;
    const newAvailable = BigInt(cm.availableMinor) + amount;
    const updated: CategoryMonthSummary = {
      ...cm,
      assignedMinor: newAssigned.toString(),
      availableMinor: newAvailable.toString()
    };
    state.categories.set(input.categoryId, updated);

    state.readyToAssignMinor -= amount;
    state.totalAssignedMinor += amount;
    state.totalAvailableMinor = [...state.categories.values()].reduce(
      (acc, c) => acc + BigInt(c.availableMinor),
      0n
    );

    const data: AssignMoneyResult = {
      eventId: `evt-${input.categoryId}-${amount}`,
      readyToAssignMinor: state.readyToAssignMinor.toString(),
      totalAssignedMinor: state.totalAssignedMinor.toString(),
      totalAvailableMinor: state.totalAvailableMinor.toString(),
      categoryMonth: updated
    };
    return { status: "ok", data };
  },
  async moveMoneyBetweenCategories(
    _uid: string,
    _bid: string,
    _mk: string,
    _input: MoveMoneyInput
  ) {
    return { status: "not_found" as const };
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { budgetAssignmentsRepository: fakeAssignmentsRepository }
);

describe("POST /api/v1/budgets/:budgetId/months/:monthKey/assign", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/assign`)
      .send({ categoryId: "cat-1", amountMinor: "100" })
      .expect(401);
  });

  it("returns 400 for invalid amountMinor", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/assign`)
      .set("authorization", `Bearer ${token}`)
      .send({ categoryId: "cat-1", amountMinor: "0" })
      .expect(400);
  });

  it("returns 404 when budget month or category is missing", async () => {
    months.clear();
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/assign`)
      .set("authorization", `Bearer ${token}`)
      .send({ categoryId: "cat-1", amountMinor: "100" })
      .expect(404);
  });

  it("returns 400 when ready to assign is insufficient", async () => {
    months.clear();
    seedMonth(50n, {
      categoryId: "cat-1",
      assignedMinor: "0",
      activityMinor: "0",
      availableMinor: "0",
      carryoverFromPreviousMinor: "0"
    });
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/assign`)
      .set("authorization", `Bearer ${token}`)
      .send({ categoryId: "cat-1", amountMinor: "100" })
      .expect(400);
  });

  it("assigns money, persists event id shape, and decreases RTA", async () => {
    months.clear();
    seedMonth(1000n, {
      categoryId: "cat-1",
      assignedMinor: "0",
      activityMinor: "0",
      availableMinor: "200",
      carryoverFromPreviousMinor: "200"
    });
    const token = app.jwt.sign({ sub: userId });
    const response = await request(app.server)
      .post(`/api/v1/budgets/${budgetId}/months/${monthKey}/assign`)
      .set("authorization", `Bearer ${token}`)
      .send({ categoryId: "cat-1", amountMinor: "300" })
      .expect(200);

    expect(response.body).toMatchObject({
      eventId: "evt-cat-1-300",
      readyToAssignMinor: "700",
      totalAssignedMinor: "300",
      categoryMonth: {
        categoryId: "cat-1",
        assignedMinor: "300",
        availableMinor: "500"
      }
    });
    expect(BigInt(response.body.totalAvailableMinor)).toBe(500n);
  });
});
