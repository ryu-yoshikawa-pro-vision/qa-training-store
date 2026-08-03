import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import {
  initializeNativeRuntime,
  resetNativeRuntimeInitialization,
} from "@/bootstrap/native-runtime";

interface NativeRuntimeValue {
  ready: boolean;
  error: Error | null;
  services: NativeApplicationServices | null;
  retry: () => void;
}

const NativeRuntimeContext = createContext<NativeRuntimeValue | null>(null);

export function NativeAppRuntimeProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<NativeApplicationServices | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const initializing = useRef(false);
  const mounted = useRef(false);

  const initialize = useCallback(() => {
    if (initializing.current) return;
    initializing.current = true;
    setError(null);
    setReady(false);
    setServices(null);
    void initializeNativeRuntime()
      .then((next) => {
        if (mounted.current) {
          setServices(next);
          setReady(true);
        }
      })
      .catch((caught: unknown) => {
        if (mounted.current) {
          setError(
            caught instanceof Error ? caught : new Error("Native runtime initialization failed"),
          );
          setReady(false);
          setServices(null);
        }
      })
      .finally(() => {
        initializing.current = false;
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    initialize();
    return () => {
      mounted.current = false;
    };
  }, [initialize]);

  const retry = useCallback(() => {
    if (initializing.current) return;
    resetNativeRuntimeInitialization();
    initialize();
  }, [initialize]);

  const value = useMemo(() => ({ ready, error, services, retry }), [error, ready, retry, services]);
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
