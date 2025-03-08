import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firestoreConfig';
import type { UserProfile, UserRole } from '@/types/user';
import { DEFAULT_USER_ROLE } from '@/types/user';

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string | null,
  role: UserRole = DEFAULT_USER_ROLE
): Promise<UserProfile> {
  try {
    console.log(`Creating user profile for ${uid} with role ${role}`);
    const userRef = doc(db, 'users', uid);
    const now = new Date();

    const userData: UserProfile = {
      uid,
      email,
      displayName,
      role,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, userData);
    console.log('User profile created successfully');
    return userData;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Get a user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    console.log(`Fetching user profile for ${uid}`);
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log(`No user profile found for ${uid}`);
      return null;
    }

    console.log(`User profile found for ${uid}`);
    return userDoc.data() as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null; // Return null instead of throwing to avoid breaking flows
  }
}

/**
 * Update a user's role in Firestore
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  try {
    console.log(`Updating user ${uid} role to ${role}`);
    
    const userRef = doc(db, 'users', uid);
    // Get current user data
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const userData = userDoc.data() as UserProfile;
    
    // Create new document with all existing fields plus updated role
    await setDoc(userRef, {
      ...userData,
      role,
      updatedAt: serverTimestamp(),
    });
    
    console.log('Role update successful');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Update a user's profile data in Firestore
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'role' | 'createdAt'>>
): Promise<void> {
  try {
    console.log(`Updating user profile for ${uid}`);
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    console.log('User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get all users with admin role
 */
export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    console.log('Fetching admin users');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    const admins: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      admins.push(doc.data() as UserProfile);
    });
    
    console.log(`Found ${admins.length} admin users`);
    return admins;
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}