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
import type { NativeTestRuntimeStatus } from "./native-test-runtime-status";

export interface NativeTestControlBridgeProps {
  services: NativeApplicationServices | null;
  buildKind?: string;
  onStatusChange?: (status: NativeTestRuntimeStatus) => void;
}

export function NativeTestControlBridge({
  services,
  buildKind = resolveNativeBuildKind(),
  onStatusChange,
}: NativeTestControlBridgeProps) {
  useEffect(() => {
    if (services === null || !isNativeTestControlBuild(buildKind)) {
      onStatusChange?.("booting");
      return undefined;
    }

    const service = new NativeTestControlService(services);
    let active = true;
    const inFlightUrls = new Set<string>();

    const handleUrl = async (url: string): Promise<void> => {
      if (!active || inFlightUrls.has(url)) return;

      let request: ReturnType<typeof parseNativeTestControlLink>;
      try {
        const parsed = Linking.parse(url);
        request = parseNativeTestControlLink(parsed);
      } catch {
        if (active) onStatusChange?.("error");
        return;
      }
      if (request === null) return;

      inFlightUrls.add(url);
      onStatusChange?.("resetting");
      try {
        const result = await service.reset(request);
        if (!active) return;
        router.replace(result.defaultRoute);
        onStatusChange?.("ready");
      } catch {
        if (active) onStatusChange?.("error");
      } finally {
        inFlightUrls.delete(url);
      }
    };

    let subscription: ReturnType<typeof Linking.addEventListener>;
    try {
      subscription = Linking.addEventListener("url", ({ url }) => {
        void handleUrl(url);
      });
    } catch {
      active = false;
      onStatusChange?.("error");
      return undefined;
    }

    onStatusChange?.("listening");

    void Linking.getInitialURL()
      .then((url) => {
        if (active && url !== null) void handleUrl(url);
      })
      .catch(() => {
        if (active) onStatusChange?.("error");
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [buildKind, onStatusChange, services]);

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
