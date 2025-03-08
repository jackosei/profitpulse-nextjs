import { updateUserRole, getUserProfile } from "@/services/users";
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/services/config';
import type { UserRole } from "@/types/user";

/**
 * Check if any admin users already exist
 */
async function checkExistingAdmins(): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'admin'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking for existing admins:', error);
    throw error;
  }
}

/**
 * Utility function to set up the first admin user
 * This should be called from a secure context (e.g., a protected API route)
 * 
 * @param uid - The user ID to promote to admin
 * @param secretKey - A secret key to authorize the operation
 */
export async function setupFirstAdmin(uid: string, secretKey: string): Promise<void> {
  try {
    // Check if environment variable is set
    if (!process.env.ADMIN_SETUP_KEY) {
      console.error('ADMIN_SETUP_KEY environment variable is not set');
      throw new Error('Server configuration error: ADMIN_SETUP_KEY not set');
    }

    // Verify secret key matches environment variable
    if (secretKey !== process.env.ADMIN_SETUP_KEY) {
      console.error('Invalid secret key provided');
      throw new Error('Unauthorized: Invalid secret key');
    }

    // Check if admin already exists
    const hasAdmin = await checkExistingAdmins();
    if (hasAdmin) {
      console.error('Admin user already exists');
      throw new Error('An admin user already exists');
    }

    // Check if user exists
    const userProfile = await getUserProfile(uid);
    if (!userProfile) {
      console.error('User profile not found for uid:', uid);
      throw new Error('User profile not found');
    }

    console.log('Current user profile:', userProfile);
    console.log('Attempting to update user role to admin...');

    // Attempt to update user role
    await updateUserRole(uid, 'admin' as UserRole);
    console.log('User role successfully updated to admin');

  } catch (error) {
    console.error('Detailed error in setupFirstAdmin:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      uid,
      secretKeyProvided: !!secretKey,
      envKeySet: !!process.env.ADMIN_SETUP_KEY
    });
    throw error;
  }
}
