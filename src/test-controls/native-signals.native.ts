import { DeviceEventEmitter } from "react-native";
import {
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
  NATIVE_TEST_RUNTIME_ERROR,
  NATIVE_TEST_RUNTIME_READY,
  type NativeTestRuntimeSignal,
} from "./native-signals";

export {
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
  NATIVE_TEST_RUNTIME_ERROR,
  NATIVE_TEST_RUNTIME_READY,
};
export type { NativeTestRuntimeSignal };

export function emitNativeTestSignal(signal: NativeTestRuntimeSignal, payload: object = {}): void {
  DeviceEventEmitter.emit(signal, payload);
}
