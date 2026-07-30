import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";

export function useApplicationServices() {
  return useAppRuntime().services;
}
