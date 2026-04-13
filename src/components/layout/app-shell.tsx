import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  return <div className={cn("min-h-screen", className)}>{children}</div>;
}
