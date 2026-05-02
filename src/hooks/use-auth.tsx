// src/hooks/use-auth.tsx
"use client";

import { useContext } from "react";
import { AuthContext, AuthContextType } from "@/components/auth-provider";

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
