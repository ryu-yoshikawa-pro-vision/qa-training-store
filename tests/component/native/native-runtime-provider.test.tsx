import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  initializeNativeRuntime,
  resetNativeRuntimeInitialization,
  type NativeApplicationServices,
} from "@/bootstrap/native-runtime";
import {
  NativeAppRuntimeProvider,
  useNativeRuntime,
} from "@/presentation/native/native-runtime-provider";
import { NativeButton } from "@/presentation/native/native-components";
import { Text } from "react-native";

jest.mock("@/bootstrap/native-runtime", () => ({
  initializeNativeRuntime: jest.fn(),
  resetNativeRuntimeInitialization: jest.fn(),
}));

const initializeNativeRuntimeMock = jest.mocked(initializeNativeRuntime);
const resetNativeRuntimeInitializationMock = jest.mocked(resetNativeRuntimeInitialization);

function RuntimeStatus() {
  const { error, ready, retry, services } = useNativeRuntime();
  if (error !== null) {
    return <NativeButton label="再試行" onPress={retry} testID="native-runtime-retry" />;
  }
  return (
    <Text testID="native-runtime-status">{ready && services !== null ? "ready" : "loading"}</Text>
  );
}

describe("NativeAppRuntimeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears the failed initialization and succeeds after retry", async () => {
    const services = {} as NativeApplicationServices;
    initializeNativeRuntimeMock
      .mockRejectedValueOnce(new Error("temporary sqlite failure"))
      .mockResolvedValueOnce(services);

    const screen = await render(
      <NativeAppRuntimeProvider>
        <RuntimeStatus />
      </NativeAppRuntimeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("native-runtime-retry")).toBeTruthy());

    fireEvent.press(screen.getByTestId("native-runtime-retry"));

    await waitFor(() =>
      expect(screen.getByTestId("native-runtime-status").props.children).toBe("ready"),
    );
    expect(resetNativeRuntimeInitializationMock).toHaveBeenCalledTimes(1);
    expect(initializeNativeRuntimeMock).toHaveBeenCalledTimes(2);
  });
});
