import type { SessionUser } from "@/features/auth/types/auth.types";

export function mapSessionUserEmail(user: SessionUser) {
  return user.email.toLowerCase();
}
