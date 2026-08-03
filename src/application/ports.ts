import type {
  AddressSuggestion,
  ChargeInput,
  ChargeResult,
  CurrentUserDto,
  ImageAssetListItem,
  ImageAssetSearchQuery,
  Page,
  ProductViewer,
} from "./contracts";
import type { EntityId, IsoDateTime, User } from "@/domain/contracts";

export interface Clock {
  now(): IsoDateTime;
}

export interface IdGenerator {
  generate(): EntityId;
}

export interface CurrentSessionStore {
  getSessionId(): Promise<string | null>;
  setSessionId(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface GuestIdentityStore {
  getOrCreateGuestId(): Promise<string>;
  setGuestId(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface EmailNormalizer {
  normalize(email: string): string;
}

export interface SearchTextNormalizer {
  normalize(value: string): string;
}

export interface CurrentActorResolver {
  getCurrentEntity(): Promise<User | null>;
  requireCurrentUser(): Promise<CurrentUserDto>;
  getViewer(): Promise<ProductViewer>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encodedHash: string): Promise<boolean>;
}

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

export interface StaticAddressLookup {
  suggest(postalCode: string): Promise<AddressSuggestion | null>;
}

export interface ProductImageManifestRepository {
  searchActive(query: ImageAssetSearchQuery): Promise<Page<ImageAssetListItem>>;
  getById(assetId: string): Promise<ImageAssetListItem | null>;
  listByIds(assetIds: string[]): Promise<ImageAssetListItem[]>;
}
