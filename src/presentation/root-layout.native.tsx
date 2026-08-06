import { Slot } from "expo-router";
import {
  NativeAppRuntimeProvider,
  useNativeRuntime,
} from "@/presentation/native/native-runtime-provider";
import { NativeShell } from "@/presentation/native/native-shell";
import { NativeAutomationBridge } from "@/presentation/native/native-automation-bridge";

export default function NativeRootLayout() {
  return (
    <NativeAppRuntimeProvider>
      <NativeTestControlRuntimeBridge />
      <NativeShell>
        <Slot />
      </NativeShell>
    </NativeAppRuntimeProvider>
  );
}

function NativeTestControlRuntimeBridge() {
  const { services } = useNativeRuntime();
  return <NativeAutomationBridge services={services} />;
}
