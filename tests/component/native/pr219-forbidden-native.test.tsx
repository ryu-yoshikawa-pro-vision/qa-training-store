import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import NativeForbiddenRoute from "../../../app/forbidden.native";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

// Keep the real NativeUnsupportedScreen but avoid importing the native
// password hasher through NativeRuntimeProvider during a component-only test.
jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

describe("PR #219: native forbidden route contract", () => {
  it("KNOWN DEFECT REPRO: Native forbidden route shows an unsupported-screen message", async () => {
    const view = await render(<NativeForbiddenRoute />);

    // Current #199 behavior, not acceptance PASS for SCREEN-BOUNDARY-FORBIDDEN.
    expect(view.getByText("この操作はNative前半の対象外です")).toBeTruthy();
    expect(view.queryByText("このページを表示する権限がありません")).toBeNull();
    expect(
      view.getByText(
        "この画面はNative Customerの対象外です。Web版または権限のあるCustomer画面を利用してください。",
      ),
    ).toBeTruthy();

    fireEvent.press(view.getByRole("button", { name: "ホームへ戻る" }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});
