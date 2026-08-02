import { Slot } from "expo-router";
import {
  NativeAppRuntimeProvider,
  useNativeRuntime,
} from "@/presentation/native/native-runtime-provider";
import { NativeShell } from "@/presentation/native/native-shell";
import { NativeTestControlBridge } from "@/presentation/native/native-test-control-bridge";

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
  return <NativeTestControlBridge services={services} />;
}
