"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { auth } from "@/services/firebase/firestoreConfig";
import { getUserProfile, createUserProfile } from "@/services/api/userApi";
import type { UserProfile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
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
        // Get or create user profile
        const profileResponse = await getUserProfile(user.uid);
        
        if (profileResponse.success && profileResponse.data) {
          setUserProfile(profileResponse.data);
        } else {
          // Create new profile if it doesn't exist
          const createResponse = await createUserProfile(
            user.uid,
            user.email || '',
            user.displayName
          );
          
          if (createResponse.success && createResponse.data) {
            setUserProfile(createResponse.data);
          }
        }
      } else {
        setUserProfile(null);
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

export function useAuth() {
  return useContext(AuthContext);
}
