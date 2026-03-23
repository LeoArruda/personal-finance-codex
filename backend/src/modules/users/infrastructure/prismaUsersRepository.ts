import { runInUserDbContext } from "../../../shared/db/userContext";
import {
  type CurrentUserProfile,
  type UpdateCurrentUserInput,
  type UsersRepository
} from "../application/getCurrentUser";

export class PrismaUsersRepository implements UsersRepository {
  async getById(userId: string): Promise<CurrentUserProfile | null> {
    const row = await runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        full_name: string;
        preferred_currency: string;
        locale: string;
        timezone: string;
      }>>`
        select
          id,
          email,
          full_name,
          preferred_currency,
          locale,
          timezone
        from app.users
        where id = ${userId}
        limit 1
      `;

      return rows[0] ?? null;
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      preferredCurrency: row.preferred_currency,
      locale: row.locale,
      timezone: row.timezone
    };
  }

  async updateCurrent(
    userId: string,
    input: UpdateCurrentUserInput
  ): Promise<CurrentUserProfile | null> {
    const row = await runInUserDbContext(userId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        full_name: string;
        preferred_currency: string;
        locale: string;
        timezone: string;
      }>>`
        update app.users
        set
          full_name = coalesce(${input.fullName ?? null}, full_name),
          locale = coalesce(${input.locale ?? null}, locale),
          timezone = coalesce(${input.timezone ?? null}, timezone),
          updated_at = now()
        where id = ${userId}
        returning
          id,
          email,
          full_name,
          preferred_currency,
          locale,
          timezone
      `;

      return rows[0] ?? null;
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      preferredCurrency: row.preferred_currency,
      locale: row.locale,
      timezone: row.timezone
    };
  }
}

