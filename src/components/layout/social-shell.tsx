import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

type SocialShellProps = {
  children: ReactNode;
};

export function SocialShell({ children }: SocialShellProps) {
  return <AppShell>{children}</AppShell>;
}
