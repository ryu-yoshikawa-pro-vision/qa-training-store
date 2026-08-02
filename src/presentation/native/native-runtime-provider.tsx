import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { initializeNativeRuntime } from "@/bootstrap/native-runtime";

interface NativeRuntimeValue {
  ready: boolean;
  error: Error | null;
  services: NativeApplicationServices | null;
}

const NativeRuntimeContext = createContext<NativeRuntimeValue | null>(null);

export function NativeAppRuntimeProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<NativeApplicationServices | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initializeNativeRuntime()
      .then((next) => {
        if (active) {
          setServices(next);
          setReady(true);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error ? caught : new Error("Native runtime initialization failed"),
          );
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ ready, error, services }), [error, ready, services]);
  return <NativeRuntimeContext.Provider value={value}>{children}</NativeRuntimeContext.Provider>;
}

export function useNativeRuntime(): NativeRuntimeValue {
  const value = useContext(NativeRuntimeContext);
  if (value === null)
    throw new Error("useNativeRuntime must be used within NativeAppRuntimeProvider");
  return value;
}

export function useNativeApplicationServices(): NativeApplicationServices {
  const { services } = useNativeRuntime();
  if (services === null) throw new Error("Native application services are not ready");
  return services;
}
