import type { IsoDateTime, ShippingAddressSnapshot } from "@/domain/contracts";
import type { CartMergeResult } from "./commerce";
import type { CurrentUserDto } from "./common";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginCommand extends LoginRequest {
  guestId: string | null;
  sessionId: string;
  now: IsoDateTime;
}

export interface LoginResult {
  sessionId: string;
  user: CurrentUserDto;
  cartMerge: CartMergeResult | null;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterUserCommand extends RegisterUserRequest {
  userId: string;
  sessionId: string;
  guestId: string | null;
  now: IsoDateTime;
}

export interface UpdateProfileRequest {
  displayName: string;
  phone: string | null;
  actionVersion: number;
}

export interface CreateAddressRequest extends ShippingAddressSnapshot {
  label: string;
  makeDefault: boolean;
}

export interface CreateAddressCommand extends CreateAddressRequest {
  userId: string;
  addressId: string;
  now: IsoDateTime;
}

export interface UpdateAddressRequest extends CreateAddressRequest {
  addressId: string;
  expectedVersion: number;
}

export interface UpdateAddressCommand extends UpdateAddressRequest {
  userId: string;
  now: IsoDateTime;
}

export interface DeleteAddressRequest {
  addressId: string;
  expectedVersion: number;
}

export interface DeleteAddressCommand extends DeleteAddressRequest {
  userId: string;
  now: IsoDateTime;
}
