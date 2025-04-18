"use client";

import { useState } from "react";
import { User } from "firebase/auth";
import * as authApi from "@/services/api/authApi";

interface UseAuthProps {
  onSuccess?: (user: User) => void;
  onError?: (message: string) => void;
}

export function useAuth(props?: UseAuthProps) {
  const { onSuccess, onError } = props || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Sign In
  const signInWithGoogle = async (): Promise<User | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.signInWithGoogle();
      
      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error?.message || "Failed to sign in with Google";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign In
  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.signInWithEmail(email, password);
      
      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error?.message || "Invalid email or password";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign Up
  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.signUpWithEmail(email, password);
      
      if (response.success && response.data) {
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error?.message || "Failed to create account";
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Password Reset
  const resetPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.resetPassword(email);
      
      if (response.success) {
        return true;
      } else {
        const errorMessage = response.error?.message || "Failed to send reset email";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.logout();
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to log out";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update Profile
  const updateProfile = async (
    user: User, 
    data: { displayName?: string; photoURL?: string }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApi.updateProfile(user, data);
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    logout,
    updateProfile,
    loading,
    error,
  };
} 