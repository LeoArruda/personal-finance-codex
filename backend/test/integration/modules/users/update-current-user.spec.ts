import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type UsersRepository } from "../../../../src/modules/users/application/getCurrentUser";

const inMemoryUsers = new Map<
  string,
  {
    id: string;
    email: string;
    fullName: string;
    preferredCurrency: string;
    locale: string;
    timezone: string;
  }
>([
  [
    "user-1",
    {
      id: "user-1",
      email: "user1@test.local",
      fullName: "User One",
      preferredCurrency: "CAD",
      locale: "en-CA",
      timezone: "America/Toronto"
    }
  ]
]);

const fakeUsersRepository: UsersRepository = {
  async getById(userId: string) {
    return inMemoryUsers.get(userId) ?? null;
  },
  async updateCurrent(userId, input) {
    const current = inMemoryUsers.get(userId);
    if (!current) return null;

    const updated = {
      ...current,
      fullName: input.fullName ?? current.fullName,
      locale: input.locale ?? current.locale,
      timezone: input.timezone ?? current.timezone
    };
    inMemoryUsers.set(userId, updated);
    return updated;
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { usersRepository: fakeUsersRepository }
);

describe("PATCH /api/v1/users/me", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server)
      .patch("/api/v1/users/me")
      .send({ fullName: "New Name" })
      .expect(401);
  });

  it("returns 400 for invalid payload", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    await request(app.server)
      .patch("/api/v1/users/me")
      .set("authorization", `Bearer ${token}`)
      .send({ fullName: "" })
      .expect(400);
  });

  it("updates only allowed fields for the caller", async () => {
    const token = app.jwt.sign({ sub: "user-1" });

    const response = await request(app.server)
      .patch("/api/v1/users/me")
      .set("authorization", `Bearer ${token}`)
      .send({
        fullName: "User One Updated",
        locale: "en-US",
        timezone: "America/New_York"
      })
      .expect(200);

    expect(response.body).toEqual({
      id: "user-1",
      email: "user1@test.local",
      fullName: "User One Updated",
      preferredCurrency: "CAD",
      locale: "en-US",
      timezone: "America/New_York"
    });
  });
});

