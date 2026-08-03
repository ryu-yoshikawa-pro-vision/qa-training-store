import type { NativeApplicationServices } from "@/bootstrap/native-runtime";

/** Production entry: deliberately does not import Test Control or Harness. */
export function NativeAutomationBridge({
  services: _services,
}: {
  services: NativeApplicationServices | null;
}) {
  return null;
}
