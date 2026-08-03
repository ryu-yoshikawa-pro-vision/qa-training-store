import { NativeUnsupportedScreen } from "@/presentation/native-route";

/** Production route: the development harness is not part of the module graph. */
export function NativeContractHarnessScreen() {
  return <NativeUnsupportedScreen title="Contract HarnessはAutomation専用です" />;
}
