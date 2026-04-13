import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type PageContainerProps = ComponentProps<"div">;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 md:px-6", className)} {...props} />;
}
