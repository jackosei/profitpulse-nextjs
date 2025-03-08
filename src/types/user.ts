import { Timestamp } from "firebase/firestore";

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

export const DEFAULT_USER_ROLE: UserRole = 'user';