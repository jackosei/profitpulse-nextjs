"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { auth } from "@/services/firebase/firestoreConfig";
import { getUserProfile, createUserProfile } from "@/services/api/userApi";
import * as authApi from "@/services/api/authApi";
import type { UserProfile } from "@/types/user";

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  userProfile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        // Establish the server-side session cookie for BOTH login and signup
        // (single source of truth — individual screens no longer do this).
        await authApi.setSessionCookie();

        // Get or create the user's profile via the token-verified server route.
        const profileResponse = await getUserProfile(user.uid);

        if (profileResponse.success && profileResponse.data) {
          setUserProfile(profileResponse.data);
        } else {
          const createResponse = await createUserProfile(
            user.uid,
            user.email || "",
            user.displayName,
          );
          if (createResponse.success && createResponse.data) {
            setUserProfile(createResponse.data);
          }
        }
      } else {
        setUserProfile(null);
        // Clear the server-side session cookie whenever Firebase reports no
        // authenticated user — this prevents a stale cookie from trapping
        // signed-out users in the journal-gate redirect loop.
        await authApi.clearSessionCookie();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Single auth hook for the whole app: exposes auth state (user, userProfile,
 * loading from the provider) AND the auth actions (delegating to authApi).
 * Action progress/errors are component-local via `actionLoading` / `error`.
 */
export function useAuth() {
  const state = useContext(AuthContext);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setActionLoading(true);
      setError(null);
      try {
        return await fn();
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(
    () =>
      run(async () => {
        const res = await authApi.signInWithGoogle();
        if (!res.success) setError(res.error?.message ?? "Failed to sign in");
        return res;
      }),
    [run],
  );

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      run(async () => {
        const res = await authApi.signInWithEmail(email, password);
        if (!res.success) setError(res.error?.message ?? "Failed to sign in");
        return res;
      }),
    [run],
  );

  const signUpWithEmail = useCallback(
    (email: string, password: string) =>
      run(async () => {
        const res = await authApi.signUpWithEmail(email, password);
        if (!res.success) setError(res.error?.message ?? "Failed to sign up");
        return res;
      }),
    [run],
  );

  const handleRedirectResult = useCallback(
    () => run(() => authApi.handleRedirectResult()),
    [run],
  );

  const resetPassword = useCallback(
    (email: string) =>
      run(async () => {
        const res = await authApi.resetPassword(email);
        if (!res.success)
          setError(res.error?.message ?? "Failed to send reset email");
        return res;
      }),
    [run],
  );

  const updateProfile = useCallback(
    (u: User, data: { displayName?: string; photoURL?: string }) =>
      run(() => authApi.updateProfile(u, data)),
    [run],
  );

  const logout = useCallback(
    () => run(() => authApi.logout()),
    [run],
  );

  return {
    ...state,
    actionLoading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    handleRedirectResult,
    resetPassword,
    updateProfile,
    logout,
  };
}
