import type {
  AccountStatus,
  EntityId,
  ImageAsset,
  IsoDateTime,
  MembershipRank,
  UserRole,
} from "@/domain/contracts";

export type PageNumber = number;
export type PageSize = 20 | 50;

export interface Page<T> {
  items: T[];
  page: PageNumber;
  pageSize: PageSize;
  total: number;
}

export interface VersionedInput {
  expectedVersion: number;
}

export type ApplicationErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "AUTHENTICATION_REQUIRED"
  | "AUTHENTICATION_FAILED"
  | "LOGIN_TRANSACTION_FAILED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_WITHDRAWN"
  | "PERMISSION_DENIED"
  | "EMAIL_ALREADY_EXISTS"
  | "CONFLICT"
  | "INVALID_STATE"
  | "INVALID_ROLE"
  | "NOT_ELIGIBLE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "QUANTITY_LIMIT_EXCEEDED"
  | "PRICE_CHANGED"
  | "CART_VERSION_CHANGED"
  | "CHECKOUT_EXPIRED"
  | "CHECKOUT_STEP_INCOMPLETE"
  | "PAYMENT_FAILED"
  | "IMAGE_ASSET_NOT_FOUND"
  | "IMAGE_ASSET_INACTIVE"
  | "PRODUCT_HAS_REFERENCE"
  | "VARIANT_HAS_REFERENCE"
  | "LAST_ADMIN_PROTECTED"
  | "SELF_CHANGE_FORBIDDEN"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "RESET_BLOCKED_BY_OPEN_PAGE"
  | "UNKNOWN_ERROR";

export interface ApplicationErrorShape {
  code: ApplicationErrorCode;
  messageKey: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
}

export const INPUT_LIMITS = {
  email: 254,
  passwordMin: 8,
  passwordMax: 72,
  displayName: 100,
  addressLabel: 50,
  recipientName: 100,
  prefecture: 20,
  city: 100,
  addressLine1: 200,
  addressLine2: 100,
  productName: 120,
  productCode: 50,
  shortDescription: 200,
  description: 5000,
  categoryName: 80,
  brandName: 80,
  variationName: 30,
  optionValue: 80,
  sku: 50,
  imageAltText: 120,
  reviewTitle: 120,
  reviewBody: 1000,
  inventoryReason: 200,
  carrierName: 100,
  trackingNumber: 100,
  searchKeyword: 100,
  postalCodeDigits: 7,
  phoneDigitsMin: 10,
  phoneDigitsMax: 11,
  maxAddressesPerUser: 5,
  maxProductImages: 3,
  maxCartQuantity: 99,
} as const;

export interface CurrentUserDto {
  id: EntityId;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
  actionVersion: number;
}

export type ProductViewer =
  | { kind: "guest" }
  | { kind: "customer"; userId: string; membershipRank: MembershipRank };

export type ImageAssetListItem = Pick<
  ImageAsset,
  | "assetId"
  | "path"
  | "mimeType"
  | "width"
  | "height"
  | "bytes"
  | "tags"
  | "defaultAltText"
  | "isActive"
>;

export interface ImageSnapshotDto {
  assetId: string;
  path: string;
  altText: string;
}

export interface AddressSuggestion {
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
}

export type TimestampedCommand = { now: IsoDateTime };
