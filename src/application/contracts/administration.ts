import type {
  AccountStatus,
  IsoDateTime,
  MembershipRank,
  ProductStatus,
  UserRole,
} from "@/domain/contracts";
import type { PageNumber } from "./common";

export interface CategoryAdminSearchQuery {
  keyword: string | null;
  active: boolean | null;
  sort: "sort_order" | "name_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface BrandAdminSearchQuery {
  keyword: string | null;
  active: boolean | null;
  sort: "name_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface UserSearchQuery {
  keyword: string | null;
  roles: UserRole[];
  membershipRanks: MembershipRank[];
  accountStatuses: AccountStatus[];
  sort: "created_desc" | "email_asc" | "updated_desc";
  page: PageNumber;
  pageSize: 20 | 50;
}

export interface UserAdminListItem {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  membershipRank: MembershipRank | null;
  accountStatus: AccountStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

export type UserAdminDto = UserAdminListItem;

export interface ChangeMembershipRankRequest {
  userId: string;
  rank: MembershipRank;
  expectedVersion: number;
}

export interface ChangeOperatorAdminRoleRequest {
  userId: string;
  role: "operator" | "admin";
  expectedVersion: number;
}

export interface ChangeAccountSuspensionRequest {
  userId: string;
  accountStatus: "active" | "suspended";
  expectedVersion: number;
}

export interface CategoryAdminListItem {
  categoryId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  publishedProductCount: number;
  updatedAt: IsoDateTime;
  version: number;
}

export interface BrandAdminListItem {
  brandId: string;
  name: string;
  isActive: boolean;
  publishedProductCount: number;
  updatedAt: IsoDateTime;
  version: number;
}

export interface ChangeProductStatusRequest {
  productId: string;
  targetStatus: Extract<ProductStatus, "published" | "unpublished" | "discontinued">;
  expectedVersion: number;
}

export interface ChangeProductStatusCommand extends ChangeProductStatusRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface BulkChangeProductStatusRequest {
  targetIds: string[];
  expectedVersions: Record<string, number>;
  targetStatus: "published" | "unpublished";
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateCategoryCommand extends CreateCategoryRequest {
  categoryId: string;
  actorUserId: string;
  now: IsoDateTime;
}

export interface UpdateCategoryRequest {
  categoryId: string;
  name: string;
  expectedVersion: number;
}

export interface UpdateCategoryCommand extends UpdateCategoryRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface ChangeCategoryActiveStateRequest {
  categoryId: string;
  targetIsActive: boolean;
  expectedVersion: number;
}

export interface ChangeCategoryActiveStateCommand extends ChangeCategoryActiveStateRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface CreateBrandRequest {
  name: string;
}

export interface CreateBrandCommand extends CreateBrandRequest {
  brandId: string;
  actorUserId: string;
  now: IsoDateTime;
}

export interface UpdateBrandRequest {
  brandId: string;
  name: string;
  expectedVersion: number;
}

export interface UpdateBrandCommand extends UpdateBrandRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface ChangeBrandActiveStateRequest {
  brandId: string;
  targetIsActive: boolean;
  expectedVersion: number;
}

export interface ChangeBrandActiveStateCommand extends ChangeBrandActiveStateRequest {
  actorUserId: string;
  now: IsoDateTime;
}

export interface ReorderCategoriesRequest {
  orderedIds: string[];
  expectedVersions: Record<string, number>;
}

export interface ReorderCategoriesCommand extends ReorderCategoriesRequest {
  actorUserId: string;
  now: IsoDateTime;
}
