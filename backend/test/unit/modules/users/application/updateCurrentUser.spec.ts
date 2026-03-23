import { describe, expect, it, vi } from "vitest";
import {
  type UsersRepository,
  updateCurrentUser
} from "../../../../../src/modules/users/application/getCurrentUser";

describe("updateCurrentUser", () => {
  it("delegates update to repository with caller user id", async () => {
    const repository: UsersRepository = {
      getById: vi.fn(),
      updateCurrent: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user1@test.local",
        fullName: "User One Updated",
        preferredCurrency: "CAD",
        locale: "en-CA",
        timezone: "America/Toronto"
      })
    };

    const result = await updateCurrentUser(repository, "user-1", {
      fullName: "User One Updated"
    });

    expect(repository.updateCurrent).toHaveBeenCalledWith("user-1", {
      fullName: "User One Updated"
    });
    expect(result?.fullName).toBe("User One Updated");
  });
});

