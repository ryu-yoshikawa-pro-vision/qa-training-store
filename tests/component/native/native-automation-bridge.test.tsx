import { render } from "@testing-library/react-native";
import type { NativeApplicationServices } from "@/bootstrap/native-runtime";
import { NativeAutomationBridge } from "@/presentation/native/native-automation-bridge.enabled";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0, left: 0, right: 0, top: 24 })),
}));

jest.mock("@/presentation/native/native-test-control-bridge", () => ({
  NativeTestControlBridge: () => null,
}));

describe("NativeAutomationBridge status", () => {
  it("keeps one accessible status element inside the safe-area offset", async () => {
    const { getByTestId, getByText } = await render(
      <NativeAutomationBridge services={{} as NativeApplicationServices} />,
    );

    const status = getByTestId("native-test-runtime-status");

    expect(status.props.accessible).toBe(true);
    expect(status.props.accessibilityRole).toBe("text");
    expect(status.props.accessibilityLabel).toBe("Native test runtime booting");
    expect(status.props.style).toEqual({ color: "#111827", fontSize: 10 });
    expect(getByText("Native test runtime booting")).toBe(status);
  });
});
