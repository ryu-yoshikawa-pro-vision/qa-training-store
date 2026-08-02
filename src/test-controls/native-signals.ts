export const NATIVE_TEST_RUNTIME_READY = "test-runtime-ready" as const;
export const NATIVE_TEST_RUNTIME_ERROR = "test-runtime-error" as const;
export const NATIVE_CONTRACT_RUNNING = "native-contract-running" as const;
export const NATIVE_CONTRACT_PASSED = "native-contract-passed" as const;
export const NATIVE_CONTRACT_FAILED = "native-contract-failed" as const;

export type NativeTestRuntimeSignal =
  | typeof NATIVE_TEST_RUNTIME_READY
  | typeof NATIVE_TEST_RUNTIME_ERROR
  | typeof NATIVE_CONTRACT_RUNNING
  | typeof NATIVE_CONTRACT_PASSED
  | typeof NATIVE_CONTRACT_FAILED;

export function emitNativeTestSignal(signal: NativeTestRuntimeSignal, payload: object = {}): void {
  void signal;
  void payload;
}
