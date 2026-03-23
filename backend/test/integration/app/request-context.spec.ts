import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../helpers/createTestApp";

const app = await createTestApp({ JWT_SECRET: "test-secret" });

describe("request DB context", () => {
  afterAll(async () => {
    await app.close();
  });

  it("executes DB operations in app.current_user_id context", async () => {
    const token = app.jwt.sign({ sub: "user-test-ctx" });

    const response = await request(app.server)
      .get("/api/v1/auth/context")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      userId: "user-test-ctx",
      dbUserId: "user-test-ctx"
    });
  });
});

