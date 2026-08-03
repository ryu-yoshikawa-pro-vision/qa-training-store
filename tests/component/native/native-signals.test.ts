import { DeviceEventEmitter } from "react-native";
import {
  emitNativeTestSignal,
  NATIVE_TEST_RUNTIME_READY,
} from "@/test-controls/native-signals.native";

describe("Native test signal runtime module", () => {
  it("loads the native signal implementation without a recursive module getter", () => {
    const emit = jest.spyOn(DeviceEventEmitter, "emit");

    emitNativeTestSignal(NATIVE_TEST_RUNTIME_READY, { source: "native-test" });

    expect(emit).toHaveBeenCalledWith(NATIVE_TEST_RUNTIME_READY, { source: "native-test" });
  });
});
