import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  User,
  AuthError
} from "firebase/auth";
import { auth } from "@/firebase/config";

const provider = new GoogleAuthProvider();

interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  cancelled?: boolean;
  error?: AuthError;
}

// Sign in with Google
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as AuthError).code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Sign-in cancelled', cancelled: true };
    }
    console.error("Google Sign-In Error:", error);
    return { 
      success: false, 
      message: 'Failed to sign in with Google', 
      error: error instanceof Error && 'code' in error ? error as AuthError : undefined 
    };
  }
};

// Sign in with Email and Password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Email Sign-In Error:", error);
    return { success: false, message: "Invalid email or password." };
  }
};

// Logout
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw new Error("Failed to log out.");
  }
};

export const getFirebaseToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  
  return await currentUser.getIdToken(true);
};

export const setSessionCookie = async () => {
  const token = await getFirebaseToken();
  if (!token) return;

  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  return response.ok;
};
