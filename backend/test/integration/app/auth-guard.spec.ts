import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../helpers/createTestApp";

const app = await createTestApp({ JWT_SECRET: "test-secret" });

describe("auth guard", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when token is missing", async () => {
    await request(app.server).get("/api/v1/auth/me").expect(401);
  });

  it("returns 401 when token is invalid", async () => {
    await request(app.server)
      .get("/api/v1/auth/me")
      .set("authorization", "Bearer definitely-invalid-token")
      .expect(401);
  });

  it("returns 200 and user context when token is valid", async () => {
    const token = app.jwt.sign({ sub: "user-test-1", email: "user@test.local" });

    const response = await request(app.server)
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      userId: "user-test-1",
      email: "user@test.local"
    });
  });
});

