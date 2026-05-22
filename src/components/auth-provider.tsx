
"use client";

import { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client-app";
import { useRouter } from "next/navigation";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Set when NEXT_PUBLIC_FIREBASE_* is missing or invalid (common on App Hosting without build env). */
  firebaseInitError: string | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitError, setFirebaseInitError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Firebase could not initialize. Check NEXT_PUBLIC_FIREBASE_* on your host.';
      console.error('[AuthProvider]', message);
      setFirebaseInitError(message);
      setUser(null);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  const logout = useCallback(async () => {
    if (firebaseInitError) {
      router.push('/login');
      return;
    }
    await getFirebaseAuth().signOut();
    router.push('/login');
  }, [router, firebaseInitError]);

  return (
    <AuthContext.Provider value={{ user, loading, firebaseInitError, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
