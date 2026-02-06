import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firestoreConfig";
import { UserProfile } from "@/types/user";
import { ApiResponse, createSuccessResponse, createErrorResponse, ErrorCode } from "../types/apiResponses";

/**
 * Get a user profile from Firestore
 * @param userId The user ID
 * @returns ApiResponse with the user profile or error
 */
export async function getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      return createSuccessResponse(userDoc.data() as UserProfile);
    }
    
    return createErrorResponse(ErrorCode.NOT_FOUND, "User profile not found");
  } catch (error) {
    console.error("Error getting user profile:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to get user profile",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Create a new user profile in Firestore
 * @param userId The user ID
 * @param email The user's email
 * @param displayName The user's display name
 * @returns ApiResponse with the created user profile or error
 */
export async function createUserProfile(
  userId: string,
  email: string,
  displayName: string | null
): Promise<ApiResponse<UserProfile>> {
  try {
    const newProfile: UserProfile = {
      id: userId,
      email,
      displayName: displayName || email.split('@')[0],
      isAdmin: false,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", userId), newProfile);
    
    return createSuccessResponse(newProfile);
  } catch (error) {
    console.error("Error creating user profile:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to create user profile",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Update a user profile in Firestore
 * @param userId The user ID
 * @param data The update data
 * @returns ApiResponse indicating success/failure
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<ApiResponse<void>> {
  try {
    // Filter out any fields we don't want to update directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...updateData } = data as Partial<UserProfile> & { id?: string };
    
    await updateDoc(doc(db, "users", userId), updateData);
    
    return createSuccessResponse(undefined);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to update user profile",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Check if a user is an admin
 * @param userId The user ID
 * @returns ApiResponse with admin status
 */
export async function isUserAdmin(userId: string): Promise<ApiResponse<boolean>> {
  try {
    const profileResponse = await getUserProfile(userId);
    
    if (!profileResponse.success) {
      return createErrorResponse(ErrorCode.NOT_FOUND, "User profile not found");
    }
    
    return createSuccessResponse(profileResponse.data?.isAdmin || false);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR, 
      "Failed to check admin status",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
} 