import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import { type UsersRepository } from "../../../../src/modules/users/application/getCurrentUser";

const fakeUsersRepository: UsersRepository = {
  async getById(userId: string) {
    if (userId === "user-1") {
      return {
        id: "user-1",
        email: "user1@test.local",
        fullName: "User One",
        preferredCurrency: "CAD",
        locale: "en-CA",
        timezone: "America/Toronto"
      };
    }

    if (userId === "user-2") {
      return {
        id: "user-2",
        email: "user2@test.local",
        fullName: "User Two",
        preferredCurrency: "USD",
        locale: "en-US",
        timezone: "America/New_York"
      };
    }

    return null;
  },
  async updateCurrent() {
    throw new Error("not implemented in get-current-user test");
  }
};

const app = await createTestApp(
  { JWT_SECRET: "test-secret" },
  { usersRepository: fakeUsersRepository }
);

describe("GET /api/v1/users/me", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when missing token", async () => {
    await request(app.server).get("/api/v1/users/me").expect(401);
  });

  it("returns only the caller profile for user-1 token", async () => {
    const token = app.jwt.sign({ sub: "user-1" });
    const response = await request(app.server)
      .get("/api/v1/users/me")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: "user-1",
      email: "user1@test.local",
      fullName: "User One",
      preferredCurrency: "CAD",
      locale: "en-CA",
      timezone: "America/Toronto"
    });
  });

  it("returns only the caller profile for user-2 token", async () => {
    const token = app.jwt.sign({ sub: "user-2" });
    const response = await request(app.server)
      .get("/api/v1/users/me")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: "user-2",
      email: "user2@test.local",
      fullName: "User Two",
      preferredCurrency: "USD",
      locale: "en-US",
      timezone: "America/New_York"
    });
  });
});

