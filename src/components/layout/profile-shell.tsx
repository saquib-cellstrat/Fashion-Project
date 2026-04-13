import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

type ProfileShellProps = {
  children: ReactNode;
};

export function ProfileShell({ children }: ProfileShellProps) {
  return <AppShell className="bg-background">{children}</AppShell>;
}
