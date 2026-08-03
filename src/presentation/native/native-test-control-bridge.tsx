import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect } from "react";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeTestControlService } from "@/test-controls/native-test-control.native";
import {
  isNativeTestControlBuild,
  parseNativeTestControlLink,
} from "@/test-controls/native-test-control-protocol";

export function NativeTestControlBridge({
  services,
  buildKind = resolveNativeBuildKind(),
}: {
  services: NativeApplicationServices | null;
  buildKind?: string;
}) {
  useEffect(() => {
    if (services === null || !isNativeTestControlBuild(buildKind)) return undefined;
    const service = new NativeTestControlService(services);
    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      const request = parseNativeTestControlLink(parsed);
      if (request === null) return;
      void service
        .reset(request)
        .then((result) => router.replace(result.defaultRoute))
        .catch(() => {
          // The service emits the detailed test-runtime-error signal. Keep the
          // Linking event handler from producing an unhandled rejection.
        });
    };
    void Linking.getInitialURL().then((url) => {
      if (url !== null) handleUrl(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [buildKind, services]);

  return null;
}

function resolveNativeBuildKind(): string {
  const configured = Constants.expoConfig?.extra?.buildKind;
  if (typeof configured === "string" && configured.length > 0) return configured;
  if (typeof process.env.EXPO_PUBLIC_BUILD_KIND === "string") {
    return process.env.EXPO_PUBLIC_BUILD_KIND;
  }
  return typeof __DEV__ !== "undefined" && __DEV__ ? "local" : "production";
}
