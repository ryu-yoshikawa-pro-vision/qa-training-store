import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { OneTimeNotice } from "@/presentation/components/one-time-notice";
import {
  consumeOneTimeNoticeForPath,
  type OneTimeNotice as OneTimeNoticeValue,
} from "@/presentation/browser/one-time-notice.web";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { AdminShell } from "./admin-shell";
import { StorefrontShell } from "./storefront-shell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useAppRuntime();
  const [notice, setNotice] = useState<OneTimeNoticeValue | null>(null);
  const [consumedPath, setConsumedPath] = useState<string | null>(null);

  useEffect(() => {
    if (consumedPath === pathname) return;
    const nextNotice = consumeOneTimeNoticeForPath(pathname);
    if (nextNotice !== null) {
      setNotice(nextNotice);
      setConsumedPath(pathname);
      return;
    }
    if (consumedPath !== null) {
      setNotice(null);
      setConsumedPath(null);
    }
  }, [consumedPath, pathname]);

  const renderedNotice = (
    <OneTimeNotice
      notice={notice}
      onClose={() => {
        setNotice(null);
        setConsumedPath(pathname);
      }}
    />
  );
  if (pathname.startsWith("/admin")) {
    return (
      <AdminShell currentUser={currentUser} notice={renderedNotice}>
        {children}
      </AdminShell>
    );
  }
  return (
    <StorefrontShell currentUser={currentUser} notice={renderedNotice}>
      {children}
    </StorefrontShell>
  );
}
