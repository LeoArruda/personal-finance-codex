import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createTestApp } from "../../../helpers/createTestApp";
import {
  type BankImportRepository,
  type ConnectionSyncSummary
} from "../../../../src/modules/imports/application/imports";

const userId = "user-1";

const fakeBankImportRepository: BankImportRepository = {
  async recordSyncAttempt(
    uid: string,
    connectionId: string,
    input
  ): Promise<ConnectionSyncSummary | null> {
    if (uid !== userId || connectionId !== "conn-1") return null;
    return {
      id: connectionId,
      userId: uid,
      lastAttemptAt: "2025-03-18T12:00:00.000Z",
      lastSuccessfulSyncAt: input.success === true ? "2025-03-18T12:00:00.000Z" : null,
      errorCode: input.success === true ? null : (input.errorCode ?? null),
      errorMessage: input.success === true ? null : (input.errorMessage ?? null)
    };
  },
  async ingestForConnection() {
    return null;
  }
};

const app = await createTestApp({ JWT_SECRET: "test-secret" }, { bankImportRepository: fakeBankImportRepository });

describe("POST /api/v1/imports/connections/:connectionId/sync", () => {
  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without auth", async () => {
    await request(app.server)
      .post("/api/v1/imports/connections/conn-1/sync")
      .send({ success: true })
      .expect(401);
  });

  it("returns 404 when connection is not found for user", async () => {
    const token = app.jwt.sign({ sub: userId });
    await request(app.server)
      .post("/api/v1/imports/connections/wrong/sync")
      .set("authorization", `Bearer ${token}`)
      .send({ success: true })
      .expect(404);
  });

  it("returns 200 with sync metadata", async () => {
    const token = app.jwt.sign({ sub: userId });
    const res = await request(app.server)
      .post("/api/v1/imports/connections/conn-1/sync")
      .set("authorization", `Bearer ${token}`)
      .send({ success: true })
      .expect(200);

    expect(res.body).toMatchObject({
      id: "conn-1",
      userId,
      lastSuccessfulSyncAt: expect.any(String)
    });
  });
});
