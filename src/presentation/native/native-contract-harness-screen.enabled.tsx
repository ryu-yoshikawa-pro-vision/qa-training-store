import { DeviceEventEmitter, ScrollView, Text } from "react-native";
import { useEffect, useState } from "react";
import { useNativeRuntime } from "./native-runtime-provider";
import { NativeButton, NativeStatePanel, styles } from "./native-components";
import { runNativeContractHarness } from "@/test-controls/native-contract-harness-runner.native";
import {
  NATIVE_CONTRACT_FAILED,
  NATIVE_CONTRACT_PASSED,
  NATIVE_CONTRACT_RUNNING,
} from "@/test-controls/native-signals";

type NativeContractHarnessStatus = "idle" | "running" | "passed" | "failed";

const STATUS_LABELS: Record<NativeContractHarnessStatus, string> = {
  idle: "Native contract idle",
  running: "Native contract running",
  passed: "Native contract passed",
  failed: "Native contract failed",
};

export function NativeContractHarnessScreen() {
  const { ready, services, error } = useNativeRuntime();
  const [status, setStatus] = useState<NativeContractHarnessStatus>("idle");

  useEffect(() => {
    const subscriptions = [
      DeviceEventEmitter.addListener(NATIVE_CONTRACT_RUNNING, () => setStatus("running")),
      DeviceEventEmitter.addListener(NATIVE_CONTRACT_PASSED, () => setStatus("passed")),
      DeviceEventEmitter.addListener(NATIVE_CONTRACT_FAILED, () => setStatus("failed")),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  if (error !== null) {
    return (
      <NativeStatePanel title="Native contract failed" body="Native Runtimeを初期化できません。" />
    );
  }

  const run = () => {
    if (services === null || status === "running") return;
    setStatus("running");
    void runNativeContractHarness(services).catch(() => {
      // The harness emits the public failed signal. Do not expose SQL or
      // arbitrary exception details through the automation screen.
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-contract-harness-screen">
      <Text style={styles.heading}>Native Contract Harness</Text>
      <Text style={styles.body}>
        Automation／Development Build専用です。専用SQLite／KV namespaceでCustomer
        Contract、FK、Cart操作とApplication DB不変確認を実行します。
      </Text>
      <Text
        accessibilityRole="text"
        accessibilityLabel={STATUS_LABELS[status]}
        style={styles.subheading}
        testID="native-contract-harness-status"
      >
        {STATUS_LABELS[status]}
      </Text>
      <NativeButton
        label="Run native contract"
        disabled={!ready || services === null || status === "running"}
        onPress={run}
        testID="native-contract-harness-run"
      />
    </ScrollView>
  );
}
