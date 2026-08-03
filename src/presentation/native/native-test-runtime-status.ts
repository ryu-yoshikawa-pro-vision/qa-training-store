export type NativeTestRuntimeStatus = "booting" | "listening" | "resetting" | "ready" | "error";

export const RUNTIME_STATUS_LABELS: Record<NativeTestRuntimeStatus, string> = {
  booting: "Native test runtime booting",
  listening: "Native test runtime listening",
  resetting: "Native test runtime resetting",
  ready: "Native test runtime ready",
  error: "Native test runtime error",
};
