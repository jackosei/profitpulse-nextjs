import { User } from "firebase/auth";
import { ApiResponse } from "../types/apiResponses";
import * as authService from "../firebase/authService";

/**
 * Sign in with Google
 * @returns ApiResponse with Firebase User or error details
 */
export async function signInWithGoogle(): Promise<ApiResponse<User>> {
  return authService.signInWithGoogle();
}

/**
 * Sign in with email and password
 * @param email User's email address
 * @param password User's password
 * @returns ApiResponse with Firebase User or error details
 */
export async function signInWithEmail(email: string, password: string): Promise<ApiResponse<User>> {
  return authService.signInWithEmail(email, password);
}

/**
 * Sign up with email and password
 * @param email User's email address
 * @param password User's password
 * @returns ApiResponse with Firebase User or error details
 */
export async function signUpWithEmail(email: string, password: string): Promise<ApiResponse<User>> {
  return authService.signUpWithEmail(email, password);
}

/**
 * Send password reset email
 * @param email User's email address
 * @returns ApiResponse indicating success or failure
 */
export async function resetPassword(email: string): Promise<ApiResponse<void>> {
  return authService.resetPassword(email);
}

/**
 * Update user profile
 * @param user Firebase User object
 * @param profileData Object containing displayName and/or photoURL
 * @returns ApiResponse indicating success or failure
 */
export async function updateProfile(
  user: User, 
  profileData: { displayName?: string; photoURL?: string }
): Promise<ApiResponse<void>> {
  return authService.updateProfile(user, profileData);
}

/**
 * Update user email
 * @param user Firebase User object
 * @param newEmail New email address
 * @returns ApiResponse indicating success or failure
 */
export async function updateEmail(user: User, newEmail: string): Promise<ApiResponse<void>> {
  return authService.updateEmail(user, newEmail);
}

/**
 * Update user password
 * @param user Firebase User object
 * @param newPassword New password
 * @returns ApiResponse indicating success or failure
 */
export async function updatePassword(user: User, newPassword: string): Promise<ApiResponse<void>> {
  return authService.updatePassword(user, newPassword);
}

/**
 * Sign out the current user
 * @returns ApiResponse indicating success or failure
 */
export async function logout(): Promise<ApiResponse<void>> {
  return authService.logout();
}

/**
 * Get current user's Firebase ID token
 * @returns Firebase ID token or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  return authService.getFirebaseToken();
}

/**
 * Set session cookie for server-side authentication
 * @returns Boolean indicating success or failure
 */
export async function setSessionCookie(): Promise<boolean> {
  return authService.setSessionCookie();
} 