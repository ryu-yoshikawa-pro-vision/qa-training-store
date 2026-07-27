import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrentUserDto } from "@/application/contracts";
import type { ApplicationServices } from "@/application/create-application-services";
import { applicationServices, initializeBrowserRuntime } from "@/bootstrap/browser-runtime.web";

interface AppRuntimeValue {
  ready: boolean;
  error: Error | null;
  currentUser: CurrentUserDto | null;
  services: ApplicationServices;
  refreshIdentity(): Promise<void>;
}

const AppRuntimeContext = createContext<AppRuntimeValue | null>(null);

export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);

  const refreshIdentity = useCallback(async () => {
    setCurrentUser(await applicationServices.auth.getCurrentUser());
  }, []);

  useEffect(() => {
    let active = true;
    void initializeBrowserRuntime()
      .then(refreshIdentity)
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught : new Error("Runtime initialization failed"));
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [refreshIdentity]);

  const value = useMemo<AppRuntimeValue>(
    () => ({
      ready,
      error,
      currentUser,
      services: applicationServices,
      refreshIdentity,
    }),
    [currentUser, error, ready, refreshIdentity],
  );

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): AppRuntimeValue {
  const value = useContext(AppRuntimeContext);
  if (value === null) {
    throw new Error("useAppRuntime must be used within AppRuntimeProvider");
  }
  return value;
}
