import { DeviceEventEmitter, Text, View } from "react-native";
import { useEffect, useState } from "react";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NATIVE_CONTRACT_HARNESS_MARKER } from "@/test-controls/native-contract-harness.native";
import {
  NATIVE_TEST_RUNTIME_ERROR,
  NATIVE_TEST_RUNTIME_READY,
} from "@/test-controls/native-signals";
import { NativeTestControlBridge } from "./native-test-control-bridge";

export const NATIVE_AUTOMATION_TEST_CONTROL_MARKER = "__SCENARIO_SHOP_NATIVE_AUTOMATION__";

export function NativeAutomationBridge({
  services,
}: {
  services: NativeApplicationServices | null;
}) {
  const [runtimeStatus, setRuntimeStatus] = useState("Native test runtime idle");
  useEffect(() => {
    const readySubscription = DeviceEventEmitter.addListener(NATIVE_TEST_RUNTIME_READY, () => {
      setRuntimeStatus("Native test runtime ready");
    });
    const errorSubscription = DeviceEventEmitter.addListener(NATIVE_TEST_RUNTIME_ERROR, () => {
      setRuntimeStatus("Native test runtime error");
    });
    return () => {
      readySubscription.remove();
      errorSubscription.remove();
    };
  }, []);

  return (
    <>
      <NativeTestControlBridge services={services} />
      <View
        accessible={false}
        testID={`${NATIVE_AUTOMATION_TEST_CONTROL_MARKER}:${NATIVE_CONTRACT_HARNESS_MARKER}`}
        style={{ display: "none" }}
      />
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={runtimeStatus}
        pointerEvents="none"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderWidth: 1,
          left: 4,
          paddingHorizontal: 4,
          position: "absolute",
          top: 4,
          zIndex: 100,
        }}
        testID="native-test-runtime-status"
      >
        <Text style={{ color: "#111827", fontSize: 10 }}>{runtimeStatus}</Text>
      </View>
    </>
  );
}
