import type {
  CheckoutSession,
  IsoDateTime,
  MembershipRank,
  PaymentMethodCode,
  ShippingAddressSnapshot,
  Yen,
} from "@/domain/contracts";
import type { ImageSnapshotDto, PageNumber } from "./common";

export interface AdjustInventoryRequest {
  variantId: string;
  changeQuantity: number;
  reasonCode: "MANUAL_INCREASE" | "MANUAL_DECREASE" | "CORRECTION" | "ORDER_PURCHASE";
  reasonText: string;
  expectedVersion: number;
}

export interface InventoryAdjustmentCommand extends AdjustInventoryRequest {
  historyId: string;
  actorUserId: string;
  orderId?: string | null;
  now: IsoDateTime;
}

export type InventorySort = "updated_desc" | "stock_asc" | "stock_desc" | "product_code_asc";

export interface InventorySearchQuery {
  keyword: string | null;
  stockState: "all" | "low" | "out" | "available";
  activeState: "all" | "active" | "inactive";
  sort: InventorySort;
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface InventoryItem {
  variantId: string;
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  optionValue: string | null;
  stockQuantity: number;
  isActive: boolean;
  updatedAt: IsoDateTime;
  version: number;
}

export interface MergeGuestCartCommand {
  guestId: string;
  userId: string;
  now: IsoDateTime;
}

export interface CartMergeItemResult {
  variantId: string;
  productName: string | null;
  optionValue: string | null;
  guestQuantity: number;
  previousUserQuantity: number;
  addedQuantity: number;
  overflowQuantity: number;
  finalQuantity: number;
  excludedReason:
    | "NOT_FOUND"
    | "UNPUBLISHED"
    | "RANK_REQUIRED"
    | "INACTIVE"
    | "OUT_OF_STOCK"
    | null;
}

export interface CartMergeResult {
  userCartId: string;
  items: CartMergeItemResult[];
  addedItemCount: number;
  adjustedItemCount: number;
  fullyExcludedItemCount: number;
  addedQuantity: number;
  overflowQuantity: number;
  /** @deprecated Use adjustedItemCount and fullyExcludedItemCount for presentation. */
  excludedItemCount: number;
}

export interface StartOrResumeCheckoutCommand {
  checkoutSessionId: string;
  userId: string;
  cartId: string;
  cartVersion: number;
  now: IsoDateTime;
}

export type CartMutationOwner =
  | { ownerType: "user"; userId: string }
  | { ownerType: "guest"; guestId: string };

export interface AddCartItemRequest {
  variantId: string;
  addQuantity: number;
}

export interface AddCartItemCommand extends AddCartItemRequest {
  owner: CartMutationOwner;
  newCartId: string;
  newItemId: string;
  now: IsoDateTime;
}

export interface UpdateCartItemQuantityRequest {
  itemId: string;
  quantity: number;
  cartExpectedVersion: number;
  itemExpectedVersion: number;
}

export interface UpdateCartItemQuantityCommand extends UpdateCartItemQuantityRequest {
  cartId: string;
  now: IsoDateTime;
}

export interface RemoveCartItemRequest {
  itemId: string;
  cartExpectedVersion: number;
  itemExpectedVersion: number;
}

export interface RemoveCartItemCommand extends RemoveCartItemRequest {
  cartId: string;
  now: IsoDateTime;
}

export interface AcceptPriceChangesRequest {
  itemExpectedVersions: Record<string, number>;
  cartExpectedVersion: number;
}

export interface AcceptPriceChangesCommand extends AcceptPriceChangesRequest {
  cartId: string;
  now: IsoDateTime;
}

export interface CheckoutStartResult {
  session: CheckoutSession;
  result: "created" | "resumed" | "replaced";
}

export interface StartCheckoutRequest {
  cartVersion: number;
}

export interface SetCheckoutAddressRequest {
  checkoutSessionId: string;
  checkoutExpectedVersion: number;
  address: ShippingAddressSnapshot;
}

export interface SetCheckoutAddressCommand extends SetCheckoutAddressRequest {
  userId: string;
  now: IsoDateTime;
}

export interface SetCheckoutPaymentRequest {
  checkoutSessionId: string;
  checkoutExpectedVersion: number;
  paymentMethodCode: PaymentMethodCode;
}

export interface SetCheckoutPaymentCommand extends SetCheckoutPaymentRequest {
  userId: string;
  now: IsoDateTime;
}

export interface CheckoutConfirmationDto {
  checkoutSessionId: string;
  checkoutActionVersion: number;
  cartVersion: number;
  items: Array<{
    variantId: string;
    productName: string;
    sku: string;
    optionValue: string | null;
    quantity: number;
    unitEffectivePrice: Yen;
    unitDiscountAmount: Yen;
    viewerUnitPrice: Yen;
    lineSubtotalAmount: Yen;
    lineDiscountAmount: Yen;
    lineTotalAmount: Yen;
    image: ImageSnapshotDto;
  }>;
  address: ShippingAddressSnapshot;
  paymentMethodCode: PaymentMethodCode;
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  membershipRank: MembershipRank;
}

export type CartLineIssueCode =
  | "UNPUBLISHED"
  | "RANK_REQUIRED"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "PRICE_CHANGED";

export interface CartLineDto {
  itemId: string;
  itemVersion: number;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  optionValue: string | null;
  image: ImageSnapshotDto;
  quantity: number;
  maximumQuantity: number;
  unitEffectivePriceAtAdd: Yen;
  currentUnitEffectivePrice: Yen;
  currentViewerUnitPrice: Yen;
  lineSubtotalAmount: Yen;
  lineDiscountAmount: Yen;
  lineTotalAmount: Yen;
  issues: CartLineIssueCode[];
}

export interface CartDto {
  cartId: string;
  cartVersion: number;
  membershipRank: MembershipRank | null;
  items: CartLineDto[];
  subtotalAmount: Yen;
  discountAmount: Yen;
  shippingAmount: Yen;
  totalAmount: Yen;
  freeShippingRemainingAmount: Yen;
  blockingIssues: CartLineIssueCode[];
}
