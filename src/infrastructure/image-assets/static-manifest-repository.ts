import type { ImageAssetListItem, ImageAssetSearchQuery, Page } from "@/application/contracts";
import type { ProductImageManifestRepository } from "@/application/ports";
import { productImageManifest } from "@/generated/product-image-manifest";
import { normalizeSearchText } from "@/domain/services/normalization";
import type { ImageAsset } from "@/domain/contracts";

const imageAssets: readonly ImageAsset[] = productImageManifest.assets;

export class StaticManifestRepository implements ProductImageManifestRepository {
  async searchActive(query: ImageAssetSearchQuery): Promise<Page<ImageAssetListItem>> {
    const keyword = query.keyword === null ? null : normalizeSearchText(query.keyword);
    const filtered = imageAssets.filter(
      (asset) =>
        asset.isActive &&
        (keyword === null ||
          normalizeSearchText(
            `${asset.assetId} ${asset.defaultAltText} ${asset.tags.join(" ")}`,
          ).includes(keyword)) &&
        (query.tags.length === 0 || query.tags.every((tag) => asset.tags.includes(tag))),
    );
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
    };
  }

  async getById(assetId: string): Promise<ImageAssetListItem | null> {
    return imageAssets.find((asset) => asset.assetId === assetId) ?? null;
  }

  async listByIds(assetIds: string[]): Promise<ImageAssetListItem[]> {
    return imageAssets.filter((asset) => assetIds.includes(asset.assetId));
  }
}
