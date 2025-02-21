"use client";

import { signInWithGoogle, logout } from "@/firebase/auth";
import { useState } from "react";
import { User } from "firebase/auth";

export default function Login() {
  const [user, setUser] = useState<User | null>(null);

  const handleSignIn = async () => {
    const userData = await signInWithGoogle();
    setUser(userData as User);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {user ? (
        <>
          <p>Welcome, {user.displayName}</p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={logout}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleSignIn}
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}
