import { UserProfile } from "@/types/user";
import {
  ApiResponse,
  createErrorResponse,
  ErrorCode,
} from "../types/apiResponses";
import * as userService from "../firebase/userService";

/**
 * Get a user profile by ID
 * @param userId The user ID
 * @returns API response with user profile data
 */
export async function getUserProfile(
  userId: string,
): Promise<ApiResponse<UserProfile>> {
  try {
    return await userService.getUserProfile(userId);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to get user profile",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Create a new user profile
 * @param userId The user ID
 * @param email The user's email
 * @param displayName The user's display name
 * @returns API response with created user profile
 */
export async function createUserProfile(
  userId: string,
  email: string,
  displayName: string | null,
): Promise<ApiResponse<UserProfile>> {
  try {
    return await userService.createUserProfile(userId, email, displayName);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to create user profile",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Update a user profile
 * @param userId The user ID
 * @param data The update data
 * @returns API response indicating success/failure
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>,
): Promise<ApiResponse<void>> {
  try {
    return await userService.updateUserProfile(userId, data);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to update user profile",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}

/**
 * Check if a user is an admin
 * @param userId The user ID
 * @returns API response with admin status
 */
export async function isUserAdmin(
  userId: string,
): Promise<ApiResponse<boolean>> {
  try {
    return await userService.isUserAdmin(userId);
  } catch (error) {
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to check admin status",
      { originalError: error instanceof Error ? error.message : String(error) },
    );
  }
}
