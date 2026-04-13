"use client";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

export function AuthStatus() {
  const { user, isLoading } = useAuthState();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Checking session...</p>;
  }

  return <p className="text-sm text-muted-foreground">{user ? user.email : "Signed out"}</p>;
}
