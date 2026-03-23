export type CurrentUserProfile = {
  id: string;
  email: string;
  fullName: string;
  preferredCurrency: string;
  locale: string;
  timezone: string;
};

export interface UsersRepository {
  getById(userId: string): Promise<CurrentUserProfile | null>;
  updateCurrent(
    userId: string,
    input: UpdateCurrentUserInput
  ): Promise<CurrentUserProfile | null>;
}

export async function getCurrentUser(
  repository: UsersRepository,
  userId: string
): Promise<CurrentUserProfile | null> {
  return repository.getById(userId);
}

export type UpdateCurrentUserInput = {
  fullName?: string;
  locale?: string;
  timezone?: string;
};

export async function updateCurrentUser(
  repository: UsersRepository,
  userId: string,
  input: UpdateCurrentUserInput
): Promise<CurrentUserProfile | null> {
  return repository.updateCurrent(userId, input);
}

