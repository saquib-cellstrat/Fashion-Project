"use client";

import type { ReactNode } from "react";

type ModalProviderProps = {
  children: ReactNode;
};

export function ModalProvider({ children }: ModalProviderProps) {
  return <>{children}</>;
}
