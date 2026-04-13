import { apiClient } from "@/lib/api/client";
import type { SessionUser } from "@/features/auth/types/auth.types";

export async function getSessionUser() {
  return apiClient<SessionUser>("/api/auth/session");
}
