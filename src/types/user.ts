export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  role?: UserRole;
  isAdmin?: boolean;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export const DEFAULT_USER_ROLE: UserRole = 'user';