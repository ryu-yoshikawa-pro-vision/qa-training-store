import type {
  BrandAdminListItem,
  BrandAdminSearchQuery,
  CategoryAdminListItem,
  CategoryAdminSearchQuery,
  ChangeBrandActiveStateCommand,
  ChangeCategoryActiveStateCommand,
  CreateAddressCommand,
  CreateBrandCommand,
  CreateCategoryCommand,
  DeleteAddressCommand,
  Page,
  ReorderCategoriesCommand,
  UpdateAddressCommand,
  UpdateBrandCommand,
  UpdateCategoryCommand,
  UserAdminListItem,
  UserSearchQuery,
} from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type {
  AddressRepository,
  BrandRepository,
  CategoryRepository,
  SessionRepository,
  UserRepository,
} from "@/domain/repositories";
import type { Brand, Category, Session, User, UserAddress } from "@/domain/contracts";
import { normalizeComparisonText } from "@/domain/services/normalization";
import type { ScenarioShopDatabase } from "./database";
import {
  fromAddressRecord,
  fromBrandRecord,
  fromCategoryRecord,
  toAddressRecord,
  toBrandRecord,
  toCategoryRecord,
} from "./mappers";
import { assertExpectedVersion, pageItems, requireEntity } from "./repository-helpers";

export class DexieUserRepository implements UserRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<User | null> {
    return (await this.db.users.get(id)) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await this.db.users.where("email").equals(email).first()) ?? null;
  }

  async create(user: User): Promise<User> {
    await this.db.users.add(user);
    return user;
  }

  async update(entity: User, expectedVersion: number): Promise<User> {
    const current = requireEntity(await this.db.users.get(entity.id), "errors.user.notFound");
    assertExpectedVersion(current.version, expectedVersion);
    const updated = { ...entity, version: current.version + 1 };
    await this.db.users.put(updated);
    return updated;
  }

  async search(query: UserSearchQuery): Promise<Page<UserAdminListItem>> {
    const keyword = query.keyword === null ? null : normalizeComparisonText(query.keyword);
    let users = await this.db.users.toArray();
    users = users.filter((user) => {
      const matchesKeyword =
        keyword === null ||
        normalizeComparisonText(`${user.email} ${user.displayName}`).includes(keyword);
      const matchesRole = query.roles.length === 0 || query.roles.includes(user.role);
      const matchesRank =
        query.membershipRanks.length === 0 ||
        (user.membershipRank !== null && query.membershipRanks.includes(user.membershipRank));
      const matchesStatus =
        query.accountStatuses.length === 0 || query.accountStatuses.includes(user.accountStatus);
      return matchesKeyword && matchesRole && matchesRank && matchesStatus;
    });
    users.sort((left, right) => {
      let primary = 0;
      if (query.sort === "email_asc") {
        primary = left.email.localeCompare(right.email);
      } else if (query.sort === "created_desc") {
        primary = right.createdAt.localeCompare(left.createdAt);
      } else {
        primary = right.updatedAt.localeCompare(left.updatedAt);
      }
      return primary || left.id.localeCompare(right.id);
    });
    return pageItems(
      users.map((user) => ({
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        membershipRank: user.membershipRank,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        version: user.version,
      })),
      query.page,
      query.pageSize,
    );
  }

  async countActiveAdmins(): Promise<number> {
    return this.db.users
      .filter((user) => user.role === "admin" && user.accountStatus === "active")
      .count();
  }
}

export class DexieSessionRepository implements SessionRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async create(session: Session): Promise<void> {
    await this.db.sessions.add(session);
  }

  async get(id: string): Promise<Session | null> {
    return (await this.db.sessions.get(id)) ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.sessions.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.sessions.where("userId").equals(userId).delete();
  }
}

export class DexieAddressRepository implements AddressRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<UserAddress | null> {
    const record = await this.db.user_addresses.get(id);
    return record === undefined ? null : fromAddressRecord(record);
  }

  async listByUser(userId: string): Promise<UserAddress[]> {
    const records = await this.db.user_addresses.where("userId").equals(userId).sortBy("createdAt");
    return records
      .map(fromAddressRecord)
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
  }

  async createAndReassignDefault(input: CreateAddressCommand): Promise<UserAddress> {
    return this.db.transaction("rw", this.db.user_addresses, async () => {
      const existing = await this.listByUser(input.userId);
      if (existing.length >= 5) {
        throw new ApplicationError({
          code: "VALIDATION",
          messageKey: "addresses.limit",
          retryable: false,
        });
      }
      const makeDefault = existing.length === 0 || input.makeDefault;
      if (makeDefault) {
        await Promise.all(
          existing
            .filter((address) => address.isDefault)
            .map((address) =>
              this.db.user_addresses.put(
                toAddressRecord({
                  ...address,
                  isDefault: false,
                  updatedAt: input.now,
                  version: address.version + 1,
                }),
              ),
            ),
        );
      }
      const created: UserAddress = {
        id: input.addressId,
        userId: input.userId,
        label: input.label,
        recipientName: input.recipientName,
        postalCode: input.postalCode,
        prefecture: input.prefecture,
        city: input.city,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        phone: input.phone,
        isDefault: makeDefault,
        createdAt: input.now,
        updatedAt: input.now,
        version: 1,
      };
      await this.db.user_addresses.add(toAddressRecord(created));
      return created;
    });
  }

  async updateAndReassignDefault(input: UpdateAddressCommand): Promise<UserAddress> {
    return this.db.transaction("rw", this.db.user_addresses, async () => {
      const current = requireEntity(
        await this.db.user_addresses.get(input.addressId),
        "errors.address.notFound",
      );
      if (current.userId !== input.userId) {
        throw new ApplicationError({
          code: "PERMISSION_DENIED",
          messageKey: "errors.forbidden",
          retryable: false,
        });
      }
      assertExpectedVersion(current.version, input.expectedVersion);
      if (input.makeDefault) {
        const existing = await this.listByUser(input.userId);
        await Promise.all(
          existing
            .filter((address) => address.id !== current.id && address.isDefault)
            .map((address) =>
              this.db.user_addresses.put(
                toAddressRecord({
                  ...address,
                  isDefault: false,
                  updatedAt: input.now,
                  version: address.version + 1,
                }),
              ),
            ),
        );
      }
      const updated: UserAddress = {
        ...fromAddressRecord(current),
        label: input.label,
        recipientName: input.recipientName,
        postalCode: input.postalCode,
        prefecture: input.prefecture,
        city: input.city,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        phone: input.phone,
        isDefault: current.isDefault || input.makeDefault,
        updatedAt: input.now,
        version: current.version + 1,
      };
      await this.db.user_addresses.put(toAddressRecord(updated));
      return updated;
    });
  }

  async deleteOwnedAndReassignDefault(
    input: DeleteAddressCommand,
  ): Promise<{ deletedId: string; newDefaultAddressId: string | null }> {
    return this.db.transaction("rw", this.db.user_addresses, async () => {
      const current = requireEntity(
        await this.db.user_addresses.get(input.addressId),
        "errors.address.notFound",
      );
      if (current.userId !== input.userId) {
        throw new ApplicationError({
          code: "PERMISSION_DENIED",
          messageKey: "errors.forbidden",
          retryable: false,
        });
      }
      assertExpectedVersion(current.version, input.expectedVersion);
      await this.db.user_addresses.delete(current.id);
      let newDefaultAddressId: string | null = null;
      if (current.isDefault) {
        const remaining = await this.listByUser(input.userId);
        const replacement = remaining[0];
        if (replacement !== undefined) {
          newDefaultAddressId = replacement.id;
          await this.db.user_addresses.put(
            toAddressRecord({
              ...replacement,
              isDefault: true,
              updatedAt: input.now,
              version: replacement.version + 1,
            }),
          );
        }
      }
      return { deletedId: current.id, newDefaultAddressId };
    });
  }

  async update(entity: UserAddress, expectedVersion: number): Promise<UserAddress> {
    return this.updateAndReassignDefault({
      addressId: entity.id,
      expectedVersion,
      userId: entity.userId,
      label: entity.label,
      recipientName: entity.recipientName,
      postalCode: entity.postalCode,
      prefecture: entity.prefecture,
      city: entity.city,
      addressLine1: entity.addressLine1,
      addressLine2: entity.addressLine2,
      phone: entity.phone,
      makeDefault: entity.isDefault,
      now: entity.updatedAt,
    });
  }
}

function categoryListItem(
  category: Category,
  publishedProductCount: number,
): CategoryAdminListItem {
  return {
    categoryId: category.id,
    name: category.name,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    publishedProductCount,
    updatedAt: category.updatedAt,
    version: category.version,
  };
}

export class DexieCategoryRepository implements CategoryRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Category | null> {
    const record = await this.db.categories.get(id);
    return record === undefined ? null : fromCategoryRecord(record);
  }

  async searchForAdmin(query: CategoryAdminSearchQuery): Promise<Page<CategoryAdminListItem>> {
    const keyword = query.keyword === null ? null : normalizeComparisonText(query.keyword);
    let categories = (await this.db.categories.toArray()).map(fromCategoryRecord);
    categories = categories.filter(
      (category) =>
        (keyword === null || category.nameNormalized.includes(keyword)) &&
        (query.active === null || category.isActive === query.active),
    );
    categories.sort((left, right) => {
      let primary = 0;
      if (query.sort === "name_asc") {
        primary = left.nameNormalized.localeCompare(right.nameNormalized);
      } else if (query.sort === "updated_desc") {
        primary = right.updatedAt.localeCompare(left.updatedAt);
      } else {
        primary = left.sortOrder - right.sortOrder;
      }
      return primary || left.id.localeCompare(right.id);
    });
    const products = await this.db.products.toArray();
    return pageItems(
      categories.map((category) =>
        categoryListItem(
          category,
          products.filter(
            (product) => product.categoryId === category.id && product.status === "published",
          ).length,
        ),
      ),
      query.page,
      query.pageSize,
    );
  }

  async createAtEnd(command: CreateCategoryCommand): Promise<Category> {
    return this.db.transaction("rw", this.db.categories, async () => {
      const all = (await this.db.categories.toArray()).map(fromCategoryRecord);
      const category: Category = {
        id: command.categoryId,
        name: command.name,
        nameNormalized: normalizeComparisonText(command.name),
        sortOrder: Math.max(0, ...all.map((item) => item.sortOrder)) + 10,
        isActive: true,
        createdAt: command.now,
        updatedAt: command.now,
        version: 1,
      };
      await this.db.categories.add(toCategoryRecord(category));
      return category;
    });
  }

  async updateDetails(command: UpdateCategoryCommand): Promise<Category> {
    const current = requireEntity(
      await this.getById(command.categoryId),
      "errors.category.notFound",
    );
    assertExpectedVersion(current.version, command.expectedVersion);
    const updated = {
      ...current,
      name: command.name,
      nameNormalized: normalizeComparisonText(command.name),
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.categories.put(toCategoryRecord(updated));
    return updated;
  }

  async changeActiveState(command: ChangeCategoryActiveStateCommand): Promise<Category> {
    const current = requireEntity(
      await this.getById(command.categoryId),
      "errors.category.notFound",
    );
    assertExpectedVersion(current.version, command.expectedVersion);
    const updated = {
      ...current,
      isActive: command.targetIsActive,
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.categories.put(toCategoryRecord(updated));
    return updated;
  }

  async reorder(command: ReorderCategoriesCommand): Promise<Category[]> {
    return this.db.transaction("rw", this.db.categories, async () => {
      const all = (await this.db.categories.toArray()).map(fromCategoryRecord);
      if (
        command.orderedIds.length !== all.length ||
        new Set(command.orderedIds).size !== all.length ||
        all.some((category) => !command.orderedIds.includes(category.id))
      ) {
        throw new ApplicationError({
          code: "VALIDATION",
          messageKey: "categories.reorder.allRequired",
          retryable: false,
        });
      }
      const byId = new Map(all.map((category) => [category.id, category]));
      const updated = command.orderedIds.map((id, index) => {
        const current = requireEntity(byId.get(id), "errors.category.notFound");
        assertExpectedVersion(current.version, command.expectedVersions[id] ?? -1);
        return {
          ...current,
          sortOrder: (index + 1) * 10,
          updatedAt: command.now,
          version: current.version + 1,
        };
      });
      await this.db.categories.bulkPut(updated.map(toCategoryRecord));
      return updated;
    });
  }

  async listAllForReorder(): Promise<CategoryAdminListItem[]> {
    const result = await this.searchForAdmin({
      keyword: null,
      active: null,
      sort: "sort_order",
      page: 1,
      pageSize: 50,
    });
    return result.items;
  }
}

function brandListItem(brand: Brand, publishedProductCount: number): BrandAdminListItem {
  return {
    brandId: brand.id,
    name: brand.name,
    isActive: brand.isActive,
    publishedProductCount,
    updatedAt: brand.updatedAt,
    version: brand.version,
  };
}

export class DexieBrandRepository implements BrandRepository {
  constructor(private readonly db: ScenarioShopDatabase) {}

  async getById(id: string): Promise<Brand | null> {
    const record = await this.db.brands.get(id);
    return record === undefined ? null : fromBrandRecord(record);
  }

  async searchForAdmin(query: BrandAdminSearchQuery): Promise<Page<BrandAdminListItem>> {
    const keyword = query.keyword === null ? null : normalizeComparisonText(query.keyword);
    let brands = (await this.db.brands.toArray()).map(fromBrandRecord);
    brands = brands.filter(
      (brand) =>
        (keyword === null || brand.nameNormalized.includes(keyword)) &&
        (query.active === null || brand.isActive === query.active),
    );
    brands.sort((left, right) => {
      const primary =
        query.sort === "updated_desc"
          ? right.updatedAt.localeCompare(left.updatedAt)
          : left.nameNormalized.localeCompare(right.nameNormalized);
      return primary || left.id.localeCompare(right.id);
    });
    const products = await this.db.products.toArray();
    return pageItems(
      brands.map((brand) =>
        brandListItem(
          brand,
          products.filter(
            (product) => product.brandId === brand.id && product.status === "published",
          ).length,
        ),
      ),
      query.page,
      query.pageSize,
    );
  }

  async create(command: CreateBrandCommand): Promise<Brand> {
    const brand: Brand = {
      id: command.brandId,
      name: command.name,
      nameNormalized: normalizeComparisonText(command.name),
      isActive: true,
      createdAt: command.now,
      updatedAt: command.now,
      version: 1,
    };
    await this.db.brands.add(toBrandRecord(brand));
    return brand;
  }

  async updateDetails(command: UpdateBrandCommand): Promise<Brand> {
    const current = requireEntity(await this.getById(command.brandId), "errors.brand.notFound");
    assertExpectedVersion(current.version, command.expectedVersion);
    const updated = {
      ...current,
      name: command.name,
      nameNormalized: normalizeComparisonText(command.name),
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.brands.put(toBrandRecord(updated));
    return updated;
  }

  async changeActiveState(command: ChangeBrandActiveStateCommand): Promise<Brand> {
    const current = requireEntity(await this.getById(command.brandId), "errors.brand.notFound");
    assertExpectedVersion(current.version, command.expectedVersion);
    const updated = {
      ...current,
      isActive: command.targetIsActive,
      updatedAt: command.now,
      version: current.version + 1,
    };
    await this.db.brands.put(toBrandRecord(updated));
    return updated;
  }
}
