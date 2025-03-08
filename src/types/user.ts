export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export const DEFAULT_USER_ROLE: UserRole = 'user';