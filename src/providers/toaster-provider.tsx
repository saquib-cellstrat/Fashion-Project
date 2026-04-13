"use client";

import type { ReactNode } from "react";

type ToasterProviderProps = {
  children: ReactNode;
};

export function ToasterProvider({ children }: ToasterProviderProps) {
  return <>{children}</>;
}
