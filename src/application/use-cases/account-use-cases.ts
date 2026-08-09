import type {
  AddressSuggestion,
  CreateAddressRequest,
  DeleteAddressRequest,
  UpdateAddressRequest,
  UpdateProfileRequest,
} from "@/application/contracts";
import { validationError } from "@/application/errors";
import type {
  Clock,
  CurrentSessionStore,
  IdGenerator,
  StaticAddressLookup,
} from "@/application/ports";
import {
  SessionIdentityResolver,
  toCurrentUserDto,
} from "@/application/identity/session-identity-resolver";
import type { UserAddress } from "@/domain/contracts";
import type { AddressRepository, SessionRepository, UserRepository } from "@/domain/repositories";

interface AccountUseCaseDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  addresses: AddressRepository;
  currentSessionStore: CurrentSessionStore;
  clock: Clock;
  idGenerator: IdGenerator;
  addressLookup: StaticAddressLookup;
}

export class AccountUseCases {
  private readonly identity: SessionIdentityResolver;
  private readonly users: UserRepository;
  private readonly addresses: AddressRepository;

  constructor(private readonly dependencies: AccountUseCaseDependencies) {
    this.identity = new SessionIdentityResolver(
      dependencies.users,
      dependencies.sessions,
      dependencies.currentSessionStore,
    );
    this.users = dependencies.users;
    this.addresses = dependencies.addresses;
  }

  async getProfile() {
    return toCurrentUserDto(await this.requireCustomer());
  }

  async updateProfile(request: UpdateProfileRequest) {
    const user = await this.requireCustomer();
    const displayName = request.displayName.trim();
    const phone = request.phone?.replace(/\D/g, "") || null;
    const fieldErrors: Record<string, string> = {};
    if (displayName.length === 0 || displayName.length > 100) {
      fieldErrors.displayName = "validation.displayName";
    }
    if (phone !== null && !/^\d{10,11}$/.test(phone)) {
      fieldErrors.phone = "validation.phone";
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw validationError("validation.form", fieldErrors);
    }
    const now = this.dependencies.clock.now();
    const updated = await this.users.update(
      {
        ...user,
        displayName,
        phone,
        updatedAt: now,
      },
      request.actionVersion,
    );
    return toCurrentUserDto(updated);
  }

  async listAddresses(): Promise<UserAddress[]> {
    const user = await this.requireCustomer();
    return this.addresses.listByUser(user.id);
  }

  async createAddress(request: CreateAddressRequest): Promise<UserAddress> {
    const user = await this.requireCustomer();
    this.validateAddress(request);
    return this.addresses.createAndReassignDefault({
      ...this.normalizedAddress(request),
      userId: user.id,
      addressId: this.dependencies.idGenerator.generate(),
      now: this.dependencies.clock.now(),
    });
  }

  async updateAddress(request: UpdateAddressRequest): Promise<UserAddress> {
    const user = await this.requireCustomer();
    this.validateAddress(request);
    return this.addresses.updateAndReassignDefault({
      ...this.normalizedAddress(request),
      userId: user.id,
      addressId: request.addressId,
      expectedVersion: request.expectedVersion,
      now: this.dependencies.clock.now(),
    });
  }

  async deleteAddress(request: DeleteAddressRequest) {
    const user = await this.requireCustomer();
    return this.addresses.deleteOwnedAndReassignDefault({
      ...request,
      userId: user.id,
      now: this.dependencies.clock.now(),
    });
  }

  async suggestAddress(postalCode: string): Promise<AddressSuggestion | null> {
    return this.dependencies.addressLookup.suggest(postalCode);
  }

  private async requireCustomer() {
    const user = await this.identity.requireCurrentEntity();
    if (user.role !== "customer") {
      throw validationError("account.customerOnly");
    }
    return user;
  }

  private validateAddress(request: CreateAddressRequest): void {
    const fieldErrors: Record<string, string> = {};
    if (request.label.trim().length === 0 || request.label.trim().length > 50) {
      fieldErrors.label = "validation.address.label";
    }
    if (request.recipientName.trim().length === 0) {
      fieldErrors.recipientName = "validation.required";
    }
    if (!/^\d{7}$/.test(request.postalCode.replace(/\D/g, ""))) {
      fieldErrors.postalCode = "validation.postalCode";
    }
    if (request.prefecture.trim().length === 0) {
      fieldErrors.prefecture = "validation.required";
    }
    if (request.city.trim().length === 0) {
      fieldErrors.city = "validation.required";
    }
    if (request.addressLine1.trim().length === 0) {
      fieldErrors.addressLine1 = "validation.required";
    }
    if (!/^\d{10,11}$/.test(request.phone.replace(/\D/g, ""))) {
      fieldErrors.phone = "validation.phone";
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw validationError("validation.form", fieldErrors);
    }
  }

  private normalizedAddress(request: CreateAddressRequest) {
    return {
      label: request.label.trim(),
      recipientName: request.recipientName.trim(),
      postalCode: request.postalCode.replace(/\D/g, ""),
      prefecture: request.prefecture.trim(),
      city: request.city.trim(),
      addressLine1: request.addressLine1.trim(),
      addressLine2: request.addressLine2?.trim() || null,
      phone: request.phone.replace(/\D/g, ""),
      makeDefault: request.makeDefault,
    };
  }
}
