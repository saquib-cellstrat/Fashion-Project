import { useSessionUser } from "@/features/auth/queries/use-session-user";

export function useAuthState() {
  const sessionQuery = useSessionUser();

  return {
    user: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: Boolean(sessionQuery.data),
  };
}
