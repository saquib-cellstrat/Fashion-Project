import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

type EditorShellProps = {
  children: ReactNode;
};

export function EditorShell({ children }: EditorShellProps) {
  return <AppShell className="bg-muted/20">{children}</AppShell>;
}
