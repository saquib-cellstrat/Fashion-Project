import { useQuery } from "@tanstack/react-query";
import { getSessionUser } from "@/features/auth/api/auth.api";
import { queryKeys } from "@/lib/query/keys";

export function useSessionUser() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: getSessionUser,
  });
}
