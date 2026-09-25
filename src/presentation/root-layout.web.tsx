import { Slot } from "expo-router";
import "@/presentation/styles/fonts.css";
import "@/presentation/styles/global.css";
import "@/presentation/styles/shared.css";
import "@/presentation/styles/storefront.css";
import "@/presentation/styles/admin.css";
import { AppFrame } from "@/presentation/shells/app-frame";
import { AppRuntimeProvider } from "@/presentation/providers/app-runtime-provider";

export default function WebRootLayout() {
  return (
    <AppRuntimeProvider>
      <AppFrame>
        <Slot />
      </AppFrame>
    </AppRuntimeProvider>
  );
}
