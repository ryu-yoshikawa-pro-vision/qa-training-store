import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import {
  NativeButton,
  NativeStatePanel,
  nativeAssetIds,
  styles,
  webAssetIds,
} from "@/presentation/native/native-components";
import { tokens } from "@/presentation/design/tokens";

describe("Native component foundation", () => {
  it("exposes a stable button test id and handles press", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <NativeButton label="追加" onPress={onPress} testID="native-add" />,
    );

    fireEvent.press(screen.getByTestId("native-add"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "追加" })).toBeTruthy();
  });

  it("renders loading/error state content without DOM APIs", async () => {
    const screen = await render(<NativeStatePanel title="読み込み中" body="再試行できます" />);

    expect(screen.getByTestId("native-state-panel")).toBeTruthy();
    expect(screen.getByText("読み込み中")).toBeTruthy();
    expect(screen.getByText("再試行できます")).toBeTruthy();
  });

  it("keeps the native asset id set aligned with the web manifest", () => {
    expect([...nativeAssetIds].sort()).toEqual([...webAssetIds].sort());
  });

  it("inherits the shared visual contract for image proportions and touch targets", () => {
    expect(StyleSheet.flatten(styles.button).minHeight).toBe(tokens.layout.minimumTouchTarget);
    expect(StyleSheet.flatten(styles.button).minWidth).toBe(tokens.layout.minimumTouchTarget);
    expect(StyleSheet.flatten(styles.chip).minHeight).toBe(tokens.layout.minimumTouchTarget);
    expect(StyleSheet.flatten(styles.productImage).aspectRatio).toBe(
      tokens.layout.productCardImageAspectRatio,
    );
    expect(StyleSheet.flatten(styles.productImage).width).toBeUndefined();
    expect(StyleSheet.flatten(styles.productImage).maxWidth).toBe("100%");
    expect(StyleSheet.flatten(styles.productImageDetail).aspectRatio).toBe(
      tokens.layout.productDetailImageAspectRatio,
    );
  });
});
