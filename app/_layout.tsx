import { Slot } from "expo-router";
import "@/presentation/styles/global.css";
import { AppFrame } from "@/presentation/shells/app-frame";
import { AppRuntimeProvider } from "@/presentation/providers/app-runtime-provider";

export default function RootLayout() {
  return (
    <AppRuntimeProvider>
      <AppFrame>
        <Slot />
      </AppFrame>
    </AppRuntimeProvider>
  );
}
