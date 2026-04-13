"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/providers/auth-provider";
import { ModalProvider } from "@/providers/modal-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToasterProvider } from "@/providers/toaster-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;

    const isNoisyMediaPipeLine = (args: unknown[]) => {
      const first = args[0];
      if (typeof first !== "string") return false;
      return (
        first.includes("Created TensorFlow Lite XNNPACK delegate for CPU") ||
        first.includes("inference_feedback_manager.cc:121")
      );
    };

    console.info = (...args: unknown[]) => {
      if (isNoisyMediaPipeLine(args)) return;
      originalInfo(...args);
    };
    console.warn = (...args: unknown[]) => {
      if (isNoisyMediaPipeLine(args)) return;
      originalWarn(...args);
    };
    console.error = (...args: unknown[]) => {
      if (isNoisyMediaPipeLine(args)) return;
      originalError(...args);
    };
    console.log = (...args: unknown[]) => {
      if (isNoisyMediaPipeLine(args)) return;
      originalLog(...args);
    };

    return () => {
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <ModalProvider>
            <ToasterProvider>{children}</ToasterProvider>
          </ModalProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
