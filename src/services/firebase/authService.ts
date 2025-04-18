import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User,
  AuthError,
  updateProfile as firebaseUpdateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { auth } from "./firestoreConfig";
import { ApiResponse, createSuccessResponse, createErrorResponse, ErrorCode } from "../types/apiResponses";

const provider = new GoogleAuthProvider();

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<ApiResponse<User>> {
  try {
    const result = await signInWithPopup(auth, provider);
    return createSuccessResponse(result.user);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as AuthError).code === 'auth/popup-closed-by-user') {
      return createErrorResponse(ErrorCode.VALIDATION_ERROR, 'Sign-in cancelled', { cancelled: true });
    }
    console.error("Google Sign-In Error:", error);
    return createErrorResponse(
      ErrorCode.UNAUTHORIZED, 
      'Failed to sign in with Google', 
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Handle redirect result from OAuth providers
 */
export async function handleRedirectResult(): Promise<ApiResponse<User>> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return createSuccessResponse(result.user);
    }
    return createErrorResponse(ErrorCode.NOT_FOUND, 'No redirect result');
  } catch (error) {
    console.error("Redirect Result Error:", error);
    return createErrorResponse(
      ErrorCode.UNAUTHORIZED, 
      'Failed to complete sign-in',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<ApiResponse<User>> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return createSuccessResponse(result.user);
  } catch (error) {
    console.error("Email Sign-In Error:", error);
    return createErrorResponse(ErrorCode.UNAUTHORIZED, "Invalid email or password.");
  }
}

/**
 * Sign up with Email and Password
 */
export async function signUpWithEmail(email: string, password: string): Promise<ApiResponse<User>> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return createSuccessResponse(result.user);
  } catch (error) {
    const errorCode = (error as AuthError).code;
    let message = "Failed to create account.";
    
    if (errorCode === 'auth/email-already-in-use') {
      message = "Email is already in use.";
    } else if (errorCode === 'auth/weak-password') {
      message = "Password is too weak.";
    }
    
    return createErrorResponse(ErrorCode.VALIDATION_ERROR, message);
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<ApiResponse<void>> {
  try {
    await sendPasswordResetEmail(auth, email);
    return createSuccessResponse(undefined);
  } catch {
    return createErrorResponse(ErrorCode.VALIDATION_ERROR, "Failed to send reset email.");
  }
}

/**
 * Update user profile
 */
export async function updateProfile(user: User, profileData: { displayName?: string; photoURL?: string }): Promise<ApiResponse<void>> {
  try {
    await firebaseUpdateProfile(user, profileData);
    return createSuccessResponse(undefined);
  } catch {
    return createErrorResponse(ErrorCode.VALIDATION_ERROR, "Failed to update profile.");
  }
}

/**
 * Update user email
 */
export async function updateEmail(user: User, newEmail: string): Promise<ApiResponse<void>> {
  try {
    await firebaseUpdateEmail(user, newEmail);
    return createSuccessResponse(undefined);
  } catch {
    return createErrorResponse(ErrorCode.VALIDATION_ERROR, "Failed to update email.");
  }
}

/**
 * Update user password
 */
export async function updatePassword(user: User, newPassword: string): Promise<ApiResponse<void>> {
  try {
    await firebaseUpdatePassword(user, newPassword);
    return createSuccessResponse(undefined);
  } catch {
    return createErrorResponse(ErrorCode.VALIDATION_ERROR, "Failed to update password.");
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<ApiResponse<void>> {
  try {
    await signOut(auth);
    return createSuccessResponse(undefined);
  } catch {
    return createErrorResponse(ErrorCode.UNKNOWN, "Failed to log out.");
  }
}

/**
 * Get Firebase auth token for the current user
 */
export async function getFirebaseToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  
  return await currentUser.getIdToken(true);
}

/**
 * Set session cookie for server-side auth
 */
export async function setSessionCookie(): Promise<boolean> {
  const token = await getFirebaseToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to set session cookie:", error);
    return false;
  }
} 