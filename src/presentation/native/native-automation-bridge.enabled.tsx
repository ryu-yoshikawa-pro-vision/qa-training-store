import { Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NATIVE_CONTRACT_HARNESS_MARKER } from "@/test-controls/native-contract-harness.native";
import { RUNTIME_STATUS_LABELS, type NativeTestRuntimeStatus } from "./native-test-runtime-status";
import { NativeTestControlBridge } from "./native-test-control-bridge";

export const NATIVE_AUTOMATION_TEST_CONTROL_MARKER = "__SCENARIO_SHOP_NATIVE_AUTOMATION__";

export function NativeAutomationBridge({
  services,
}: {
  services: NativeApplicationServices | null;
}) {
  const [runtimeStatus, setRuntimeStatus] = useState<NativeTestRuntimeStatus>("booting");
  const insets = useSafeAreaInsets();

  return (
    <>
      <NativeTestControlBridge services={services} onStatusChange={setRuntimeStatus} />
      <View
        accessible={false}
        testID={`${NATIVE_AUTOMATION_TEST_CONTROL_MARKER}:${NATIVE_CONTRACT_HARNESS_MARKER}`}
        style={{ display: "none" }}
      />
      <View
        accessible={false}
        pointerEvents="none"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderWidth: 1,
          left: 4,
          paddingHorizontal: 4,
          position: "absolute",
          top: insets.top + 4,
          zIndex: 100,
        }}
      >
        <Text
          accessible
          accessibilityRole="text"
          accessibilityLabel={RUNTIME_STATUS_LABELS[runtimeStatus]}
          style={{ color: "#111827", fontSize: 10 }}
          testID="native-test-runtime-status"
        >
          {RUNTIME_STATUS_LABELS[runtimeStatus]}
        </Text>
      </View>
    </>
  );
}
