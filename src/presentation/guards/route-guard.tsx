import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { isTestApiBuild } from "@/test-controls/test-api.web";
import { StatePanel } from "@/presentation/components/states";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";

export type RouteAccess =
  | "public"
  | "guest-or-customer"
  | "customer"
  | "staff"
  | "admin"
  | "automation-admin";

export function RouteGuard({ access, children }: { access: RouteAccess; children: ReactNode }) {
  const { ready, error, currentUser } = useAppRuntime();
  if (!ready) {
    return <StatePanel kind="loading" />;
  }
  if (error !== null) {
    return <StatePanel kind="error" body={error.message} />;
  }
  if (access === "public") {
    return children;
  }
  if (
    access === "guest-or-customer" &&
    (currentUser === null ||
      (currentUser.role === "customer" && currentUser.accountStatus === "active"))
  ) {
    return children;
  }
  if (currentUser === null) {
    return <Redirect href="/login" />;
  }
  const active = currentUser.accountStatus === "active";
  const staff = active && (currentUser.role === "operator" || currentUser.role === "admin");
  const allowed =
    (access === "customer" && active && currentUser.role === "customer") ||
    (access === "staff" && staff) ||
    (access === "admin" && active && currentUser.role === "admin") ||
    (access === "automation-admin" && active && currentUser.role === "admin" && isTestApiBuild());
  return allowed ? children : <Redirect href="/forbidden" />;
}
