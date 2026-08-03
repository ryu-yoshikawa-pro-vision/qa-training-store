import type { NativeTestRuntimeSignal } from "./native-signal-names";

export {
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
  NATIVE_TEST_RUNTIME_ERROR,
  NATIVE_TEST_RUNTIME_READY,
} from "./native-signal-names";
export type { NativeTestRuntimeSignal } from "./native-signal-names";

export function emitNativeTestSignal(signal: NativeTestRuntimeSignal, payload: object = {}): void {
  void signal;
  void payload;
}
