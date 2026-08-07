import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { CartDto, CartLineDto } from "@/application/contracts";
import { NativeCartScreen } from "@/presentation/native/native-screens";
import { useNativeRuntime } from "@/presentation/native/native-runtime-provider";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ productId: "product-basic-shirt" }),
}));

jest.mock("@/presentation/native/native-runtime-provider", () => ({
  useNativeRuntime: jest.fn(),
}));

const useNativeRuntimeMock = jest.mocked(useNativeRuntime);

function line(itemId: string, quantity: number, maximumQuantity = 5): CartLineDto {
  return {
    itemId,
    itemVersion: 1,
    productId: "product-basic-shirt",
    productName: `商品${itemId}`,
    variantId: `variant-${itemId}`,
    sku: `SKU-${itemId}`,
    optionValue: "M",
    image: { assetId: "asset-shirt-front", path: "/images/shirt.svg", altText: "商品画像" },
    quantity,
    maximumQuantity,
    unitEffectivePriceAtAdd: 2000,
    currentUnitEffectivePrice: 2000,
    currentViewerUnitPrice: 2000,
    lineSubtotalAmount: quantity * 2000,
    lineDiscountAmount: 0,
    lineTotalAmount: quantity * 2000,
    issues: [],
  };
}

function cartTestKey(itemId: string): string {
  return `product-basic-shirt-variant-${itemId}`;
}

function cart(items: CartLineDto[]): CartDto {
  return {
    cartId: "cart-native-test",
    cartVersion: 1,
    membershipRank: null,
    items,
    subtotalAmount: items.reduce((total, item) => total + item.lineSubtotalAmount, 0),
    discountAmount: 0,
    shippingAmount: 0,
    totalAmount: items.reduce((total, item) => total + item.lineTotalAmount, 0),
    freeShippingRemainingAmount: 0,
    blockingIssues: [],
  };
}

function setRuntime(cartService: Record<string, jest.Mock>): void {
  useNativeRuntimeMock.mockReturnValue({
    ready: true,
    error: null,
    retry: jest.fn(),
    services: { catalog: {}, cart: cartService } as never,
  });
}

describe("NativeCartScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("recovers from an initial load error after retry", async () => {
    const empty = cart([]);
    const getCart = jest
      .fn<Promise<CartDto>, []>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(empty);
    setRuntime({
      getCart,
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      addItem: jest.fn(),
    });

    const screen = await render(<NativeCartScreen />);
    await waitFor(() => expect(screen.getByText("カートを読み込めません")).toBeTruthy());

    fireEvent.press(screen.getByText("再試行"));

    await waitFor(() => expect(screen.getByText("カートは空です")).toBeTruthy());
    expect(screen.queryByText("カートを読み込めません")).toBeNull();
    expect(getCart).toHaveBeenCalledTimes(2);
  });

  it("disables every cart mutation button while one mutation is pending", async () => {
    let resolveMutation: ((value: CartDto) => void) | undefined;
    const initial = cart([line("a", 1), line("b", 1)]);
    const updated = cart([line("a", 2), line("b", 1)]);
    const updateQuantity = jest.fn(
      () =>
        new Promise<CartDto>((resolve) => {
          resolveMutation = resolve;
        }),
    );
    setRuntime({
      getCart: jest.fn().mockResolvedValue(initial),
      updateQuantity,
      removeItem: jest.fn(),
      addItem: jest.fn(),
    });

    const screen = await render(<NativeCartScreen />);
    await waitFor(() =>
      expect(screen.getByTestId(`native-cart-increase-${cartTestKey("a")}`)).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId(`native-cart-increase-${cartTestKey("a")}`));

    await waitFor(() => {
      for (const itemId of ["a", "b"]) {
        const key = cartTestKey(itemId);
        expect(
          screen.getByTestId(`native-cart-decrease-${key}`).props.accessibilityState.disabled,
        ).toBe(true);
        expect(
          screen.getByTestId(`native-cart-increase-${key}`).props.accessibilityState.disabled,
        ).toBe(true);
        expect(
          screen.getByTestId(`native-cart-remove-${key}`).props.accessibilityState.disabled,
        ).toBe(true);
      }
    });

    resolveMutation?.(updated);

    await waitFor(() => {
      expect(
        screen.getByTestId(`native-cart-increase-${cartTestKey("a")}`).props.accessibilityState
          .disabled,
      ).toBe(false);
      expect(
        screen.getByTestId(`native-cart-remove-${cartTestKey("b")}`).props.accessibilityState
          .disabled,
      ).toBe(false);
    });
  });

  it("disables quantity increase and preserves the quantity at the maximum", async () => {
    const atLimit = cart([line("limit", 3, 3)]);
    const updateQuantity = jest.fn();
    setRuntime({
      getCart: jest.fn().mockResolvedValue(atLimit),
      updateQuantity,
      removeItem: jest.fn(),
      addItem: jest.fn(),
    });

    const screen = await render(<NativeCartScreen />);
    const limitKey = cartTestKey("limit");
    await waitFor(() =>
      expect(screen.getByTestId(`native-cart-increase-${limitKey}`)).toBeTruthy(),
    );

    expect(
      screen.getByTestId(`native-cart-increase-${limitKey}`).props.accessibilityState.disabled,
    ).toBe(true);
    expect(screen.getByTestId(`native-cart-limit-${limitKey}`)).toBeTruthy();

    fireEvent.press(screen.getByTestId(`native-cart-increase-${limitKey}`));

    expect(screen.getByTestId(`native-cart-quantity-${limitKey}`).props.children).toBe(3);
    expect(updateQuantity).not.toHaveBeenCalled();
  });

  it("exposes a hydration boundary, badge count, and stable product variant IDs", async () => {
    const persisted = cart([line("persisted", 2)]);
    setRuntime({
      getCart: jest.fn().mockResolvedValue(persisted),
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      addItem: jest.fn(),
    });

    const screen = await render(<NativeCartScreen />);
    const key = cartTestKey("persisted");

    await waitFor(() => expect(screen.getByTestId("native-persisted-state-ready")).toBeTruthy());
    expect(screen.getByTestId("native-cart-badge-count").props.children).toBe(2);
    expect(screen.getByTestId(`native-cart-item-${key}`)).toBeTruthy();
    expect(screen.getByTestId(`native-cart-quantity-${key}`).props.children).toBe(2);
  });
});
