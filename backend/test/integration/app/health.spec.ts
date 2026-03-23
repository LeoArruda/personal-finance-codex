import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../helpers/createTestApp";

const app = await createTestApp();

describe("GET /health", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with ok status", async () => {
    const response = await request(app.server).get("/health").expect(200);

    expect(response.body).toEqual({ ok: true });
  });
});

