import type { ReactNode } from "react";
import { usePathname } from "expo-router";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { AdminShell } from "./admin-shell";
import { StorefrontShell } from "./storefront-shell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useAppRuntime();
  if (pathname.startsWith("/admin")) {
    return <AdminShell currentUser={currentUser}>{children}</AdminShell>;
  }
  return <StorefrontShell currentUser={currentUser}>{children}</StorefrontShell>;
}
