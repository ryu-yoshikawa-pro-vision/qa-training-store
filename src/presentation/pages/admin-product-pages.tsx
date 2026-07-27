import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouter } from "expo-router";
import type {
  CreateProductRequest,
  ImageAssetListItem,
  ProductEditDto,
  ProductImageSelectionRequest,
  ProductPreviewDto,
  ProductVariantCreateRequest,
} from "@/application/contracts";
import type { MembershipRank, ProductStatus } from "@/domain/contracts";
import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { ProductImage } from "@/presentation/components/product-image";
import { StatePanel } from "@/presentation/components/states";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import {
  Breadcrumbs,
  FilterBar,
  PageHeader,
  Pagination,
  ResourceTable,
} from "@/presentation/patterns/admin-patterns";
import { formatYen } from "@/presentation/components/product-card";

function StaffPage({ children }: { children: ReactNode }) {
  return <RouteGuard access="staff">{children}</RouteGuard>;
}

export function AdminProductsPage() {
  return (
    <StaffPage>
      <AdminProductsContent />
    </StaffPage>
  );
}

function AdminProductsContent() {
  const { adminProducts } = useApplicationServices();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [rank, setRank] = useState<MembershipRank | "none" | "all">("all");
  const [stock, setStock] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [sort, setSort] = useState<
    "updated_desc" | "name_asc" | "product_code_asc" | "minimum_price_asc" | "minimum_price_desc"
  >("updated_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mutation, setMutation] = useState(0);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const state = useAsyncValue(
    () =>
      adminProducts.search({
        keyword: keyword || null,
        statuses: status === "all" ? [] : [status],
        requiredRanks: rank === "all" ? [] : [rank],
        stockState: stock,
        minimumPrice: minimumPrice === "" ? null : Number(minimumPrice),
        maximumPrice: maximumPrice === "" ? null : Number(maximumPrice),
        sort,
        page,
        pageSize: 20,
      }),
    [adminProducts, keyword, status, rank, stock, minimumPrice, maximumPrice, sort, page, mutation],
  );
  const bulk = async (targetStatus: "published" | "unpublished") => {
    if (!state.value) return;
    const rows = state.value.items.filter((item) => selected.has(item.productId));
    const result = await adminProducts.bulkChangeStatus({
      targetIds: rows.map((item) => item.productId),
      expectedVersions: Object.fromEntries(rows.map((item) => [item.productId, item.version])),
      targetStatus,
    });
    setBulkMessage(
      `成功 ${result.succeededIds.length}件／失敗 ${result.failures.length}件` +
        (result.failures.length > 0
          ? `（${result.failures.map((failure) => `${failure.productId}: ${failure.reason}`).join("、")}）`
          : ""),
    );
    setSelected(new Set());
    setMutation((value) => value + 1);
  };
  return (
    <div className="admin-page">
      <Breadcrumbs items={[{ label: "管理概要", href: "/admin" }, { label: "商品管理" }]} />
      <PageHeader
        title="商品管理"
        description="商品Aggregateと公開状態を管理します。"
        action={
          <Link href="/admin/products/new" className="button button--primary">
            商品を登録
          </Link>
        }
      />
      {bulkMessage && (
        <p role="status" className="operation-message">
          {bulkMessage}
        </p>
      )}
      <FilterBar>
        <label>
          検索
          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          状態
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">すべて</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="unpublished">unpublished</option>
            <option value="discontinued">discontinued</option>
          </select>
        </label>
        <label>
          Rank
          <select value={rank} onChange={(event) => setRank(event.target.value as typeof rank)}>
            <option value="all">すべて</option>
            <option value="none">制限なし</option>
            <option value="regular">regular</option>
            <option value="gold">gold</option>
            <option value="platinum">platinum</option>
          </select>
        </label>
        <label>
          在庫
          <select value={stock} onChange={(event) => setStock(event.target.value as typeof stock)}>
            <option value="all">すべて</option>
            <option value="in_stock">在庫あり</option>
            <option value="low_stock">低在庫</option>
            <option value="out_of_stock">在庫切れ</option>
          </select>
        </label>
        <label>
          最低価格
          <input
            type="number"
            min="0"
            value={minimumPrice}
            onChange={(event) => setMinimumPrice(event.target.value)}
          />
        </label>
        <label>
          最高価格
          <input
            type="number"
            min="0"
            value={maximumPrice}
            onChange={(event) => setMaximumPrice(event.target.value)}
          />
        </label>
        <label>
          並び順
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="updated_desc">更新日</option>
            <option value="name_asc">名称</option>
            <option value="product_code_asc">商品Code</option>
            <option value="minimum_price_asc">価格が低い順</option>
            <option value="minimum_price_desc">価格が高い順</option>
          </select>
        </label>
      </FilterBar>
      <div className="bulk-bar" aria-label="一括操作">
        <strong>{selected.size}件選択</strong>
        <button
          className="button button--secondary"
          disabled={selected.size === 0}
          onClick={() => void bulk("published")}
        >
          選択を公開
        </button>
        <button
          className="button button--secondary"
          disabled={selected.size === 0}
          onClick={() => void bulk("unpublished")}
        >
          選択を非公開
        </button>
      </div>
      {!state.loaded ? (
        <StatePanel kind="loading" />
      ) : state.error || !state.value ? (
        <StatePanel kind="error" />
      ) : (
        <>
          <ResourceTable
            caption="商品一覧"
            columns={["選択", "商品", "状態", "Category / Brand", "価格", "active SKU / 在庫"]}
            rows={state.value.items.map((item) => ({
              id: item.productId,
              cells: [
                <input
                  key="select"
                  type="checkbox"
                  aria-label={`${item.name}を選択`}
                  checked={selected.has(item.productId)}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(item.productId)) next.delete(item.productId);
                      else next.add(item.productId);
                      return next;
                    })
                  }
                />,
                <Link href={`/admin/products/${item.productId}`} key="product">
                  {item.productCode} — {item.name}
                </Link>,
                item.status,
                `${item.categoryName} / ${item.brandName}`,
                item.minimumCurrentEffectivePrice === item.maximumCurrentEffectivePrice
                  ? formatYen(item.minimumCurrentEffectivePrice)
                  : `${formatYen(item.minimumCurrentEffectivePrice)}〜${formatYen(item.maximumCurrentEffectivePrice)}`,
                `${item.activeSkuCount} / ${item.activeTotalStock}`,
              ],
            }))}
          />
          <Pagination
            page={state.value.page}
            totalPages={Math.ceil(state.value.total / state.value.pageSize)}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

type ProductFormValue = CreateProductRequest & {
  existingVariantIds: Record<string, { version: number; isActive: boolean; stockQuantity: number }>;
};

const emptyForm: ProductFormValue = {
  product: {
    productCode: "",
    name: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    brandId: "",
    requiredRank: null,
    variationName: null,
  },
  variants: [
    {
      clientKey: "variant-1",
      sku: "",
      optionValue: null,
      regularPrice: 0,
      salePrice: null,
      saleStartAt: null,
      saleEndAt: null,
      purchaseLimit: 5,
      initialStockQuantity: 0,
    },
  ],
  images: [],
  existingVariantIds: {},
};

export function AdminProductNewPage() {
  return (
    <StaffPage>
      <AdminProductNewContent />
    </StaffPage>
  );
}

function AdminProductNewContent() {
  const services = useApplicationServices();
  const router = useRouter();
  const options = useAsyncValue(async () => {
    const [categories, brands, assets] = await Promise.all([
      services.adminMaster.searchCategories({ active: true, pageSize: 50 }),
      services.adminMaster.searchBrands({ active: true, pageSize: 50 }),
      services.adminProducts.searchImageAssets({ pageSize: 50 }),
    ]);
    return { categories: categories.items, brands: brands.items, assets: assets.items };
  }, [services]);
  const duplicate = useMemo(() => {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem("product-duplicate-draft");
    if (raw === null) return null;
    sessionStorage.removeItem("product-duplicate-draft");
    return JSON.parse(raw) as {
      product: ProductFormValue["product"];
      variants: ProductFormValue["variants"];
      images: Array<Omit<ProductImageSelectionRequest, "relationshipId">>;
    };
  }, []);
  if (!options.loaded) return <StatePanel kind="loading" />;
  if (options.error || !options.value) return <StatePanel kind="error" />;
  const initial: ProductFormValue =
    duplicate === null
      ? {
          ...emptyForm,
          product: {
            ...emptyForm.product,
            categoryId: options.value.categories[0]?.categoryId ?? "",
            brandId: options.value.brands[0]?.brandId ?? "",
          },
        }
      : {
          ...emptyForm,
          product: duplicate.product,
          variants: duplicate.variants.map((variant, index) => ({
            ...variant,
            clientKey: `duplicate-${index}`,
          })),
          images: duplicate.images.map((image) => ({ ...image, relationshipId: null })),
        };
  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[{ label: "商品管理", href: "/admin/products" }, { label: "商品登録" }]}
      />
      <PageHeader title="商品登録" description="保存時は必ずdraftとして作成されます。" />
      <ProductEditor
        initial={initial}
        categories={options.value.categories.map((item) => ({
          id: item.categoryId,
          name: item.name,
        }))}
        brands={options.value.brands.map((item) => ({ id: item.brandId, name: item.name }))}
        assets={options.value.assets}
        submitLabel="draftを保存"
        onPreview={(value) =>
          services.adminProducts.preview({ aggregate: value, previewMembershipRank: null })
        }
        onSubmit={async (value) => {
          const created = await services.adminProducts.create(value);
          router.replace(`/admin/products/${created.product.id}`);
        }}
      />
    </div>
  );
}

export function AdminProductEditPage({ productId }: { productId: string }) {
  return (
    <StaffPage>
      <AdminProductEditContent productId={productId} />
    </StaffPage>
  );
}

function AdminProductEditContent({ productId }: { productId: string }) {
  const services = useApplicationServices();
  const router = useRouter();
  const [mutation, setMutation] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const state = useAsyncValue(async () => {
    const [edit, assets] = await Promise.all([
      services.adminProducts.getEdit(productId),
      services.adminProducts.searchImageAssets({ pageSize: 50 }),
    ]);
    return { edit, assets: assets.items };
  }, [services, productId, mutation]);
  if (!state.loaded) return <StatePanel kind="loading" />;
  if (state.error || !state.value) return <StatePanel kind="not-found" />;
  const edit = state.value.edit;
  const initial = editToForm(edit);
  const changeStatus = async (targetStatus: "published" | "unpublished" | "discontinued") => {
    await services.adminProducts.changeStatus({
      productId,
      targetStatus,
      expectedVersion: edit.product.version,
    });
    setMutation((value) => value + 1);
  };
  return (
    <div className="admin-page">
      <Breadcrumbs
        items={[{ label: "商品管理", href: "/admin/products" }, { label: edit.product.name }]}
      />
      <PageHeader
        title={edit.product.name}
        description={`${edit.product.productCode}・${edit.product.status}`}
        action={
          <div className="inline-actions">
            <button
              className="button button--secondary"
              onClick={() => {
                void services.adminProducts.duplicate(productId).then((draft) => {
                  sessionStorage.setItem("product-duplicate-draft", JSON.stringify(draft));
                  router.push("/admin/products/new?duplicate=1");
                });
              }}
            >
              複製して新規登録
            </button>
            {(edit.product.status === "draft" || edit.product.status === "unpublished") && (
              <button
                className="button button--primary"
                onClick={() => void changeStatus("published")}
              >
                公開
              </button>
            )}
            {edit.product.status === "published" && (
              <button
                className="button button--secondary"
                onClick={() => void changeStatus("unpublished")}
              >
                非公開
              </button>
            )}
            {(edit.product.status === "published" || edit.product.status === "unpublished") && (
              <ConfirmDialog
                triggerLabel="販売終了"
                title="販売終了にしますか"
                confirmLabel="販売終了"
                danger
                onConfirm={() => void changeStatus("discontinued")}
              >
                販売終了は元に戻せません。
              </ConfirmDialog>
            )}
          </div>
        }
      />
      {deleteMessage !== null && (
        <p role="alert" className="operation-error">
          {deleteMessage}
        </p>
      )}
      {saveMessage !== null && (
        <p role="status" className="operation-message">
          {saveMessage}
        </p>
      )}
      {edit.product.status === "discontinued" && (
        <p className="operation-message">discontinuedは終端状態です。状態変更はできません。</p>
      )}
      <ProductEditor
        key={`${productId}-${mutation}`}
        initial={initial}
        categories={edit.categoryOptions}
        brands={edit.brandOptions}
        assets={mergeSelectedAssets(state.value.assets, edit)}
        submitLabel="変更を保存"
        onPreview={(value) =>
          services.adminProducts.preview({
            aggregate: value,
            previewMembershipRank: edit.product.requiredRank,
          })
        }
        onSubmit={async (value, removedVariantIds) => {
          setSaveMessage(null);
          const existingIds = new Set(edit.variants.map((variant) => variant.id));
          await services.adminProducts.update({
            productId,
            productExpectedVersion: edit.product.version,
            product: value.product,
            createVariants: value.variants.filter((variant) => !existingIds.has(variant.clientKey)),
            updateVariants: value.variants
              .filter((variant) => existingIds.has(variant.clientKey))
              .map((variant) => ({
                variantId: variant.clientKey,
                sku: variant.sku,
                optionValue: variant.optionValue,
                regularPrice: variant.regularPrice,
                salePrice: variant.salePrice,
                saleStartAt: variant.saleStartAt,
                saleEndAt: variant.saleEndAt,
                purchaseLimit: variant.purchaseLimit,
                isActive: value.existingVariantIds[variant.clientKey]?.isActive ?? true,
                expectedVersion: value.existingVariantIds[variant.clientKey]!.version,
              })),
            removeVariantIds: removedVariantIds,
            images: value.images,
          });
          setSaveMessage("保存しました。");
          setMutation((current) => current + 1);
        }}
      />
      {edit.product.status === "draft" && (
        <ConfirmDialog
          triggerLabel="draftを削除"
          title="draft Aggregateを削除しますか"
          confirmLabel="削除"
          danger
          onConfirm={() =>
            void services.adminProducts
              .deleteDraft(productId, edit.product.version)
              .then(() => router.replace("/admin/products"))
              .catch(() =>
                setDeleteMessage(
                  "参照があるdraftは削除できません。Cart・Order・Review・在庫履歴を確認してください。",
                ),
              )
          }
        >
          Cart・Order・Reviewなどの参照がある場合は削除できません。Asset Binaryは削除されません。
        </ConfirmDialog>
      )}
    </div>
  );
}

function ProductEditor({
  initial,
  categories,
  brands,
  assets,
  submitLabel,
  onSubmit,
  onPreview,
}: {
  initial: ProductFormValue;
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  assets: ImageAssetListItem[];
  submitLabel: string;
  onSubmit: (value: ProductFormValue, removedVariantIds: string[]) => Promise<void>;
  onPreview: (value: CreateProductRequest) => Promise<ProductPreviewDto>;
}) {
  const [value, setValue] = useState(initial);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<ProductPreviewDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setProduct = (field: keyof ProductFormValue["product"], fieldValue: unknown) =>
    setValue((current) => ({ ...current, product: { ...current.product, [field]: fieldValue } }));
  const updateVariant = (index: number, patch: Partial<ProductVariantCreateRequest>) =>
    setValue((current) => ({
      ...current,
      variants: current.variants.map((variant, candidate) =>
        candidate === index ? { ...variant, ...patch } : variant,
      ),
    }));
  const removeVariant = (index: number) => {
    const variant = value.variants[index]!;
    if (variant.clientKey in value.existingVariantIds) {
      setRemovedVariantIds((current) => [...current, variant.clientKey]);
    }
    setValue((current) => ({
      ...current,
      variants: current.variants.filter((_, candidate) => candidate !== index),
    }));
  };
  const toggleImage = (asset: ImageAssetListItem) =>
    setValue((current) => {
      const exists = current.images.find((image) => image.assetId === asset.assetId);
      if (exists) {
        const remaining = current.images.filter((image) => image.assetId !== asset.assetId);
        return {
          ...current,
          images: remaining.map((image, index) => ({
            ...image,
            sortOrder: (index + 1) * 10,
            isPrimary: index === 0 ? true : image.isPrimary,
          })),
        };
      }
      if (current.images.length >= 3) return current;
      return {
        ...current,
        images: [
          ...current.images,
          {
            relationshipId: null,
            assetId: asset.assetId,
            altText: asset.defaultAltText,
            sortOrder: (current.images.length + 1) * 10,
            isPrimary: current.images.length === 0,
          },
        ],
      };
    });
  const submit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSubmit(value, removedVariantIds);
      setMessage("保存しました。");
    } catch {
      setMessage("保存できませんでした。入力、競合、参照制約を確認してください。");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="product-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <fieldset>
        <legend>商品情報</legend>
        <div className="form-grid">
          <label>
            商品Code
            <input
              required
              value={value.product.productCode}
              onChange={(event) => setProduct("productCode", event.target.value)}
            />
          </label>
          <label>
            商品名
            <input
              required
              value={value.product.name}
              onChange={(event) => setProduct("name", event.target.value)}
            />
          </label>
          <label>
            短い説明
            <input
              value={value.product.shortDescription}
              onChange={(event) => setProduct("shortDescription", event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={value.product.categoryId}
              onChange={(event) => setProduct("categoryId", event.target.value)}
            >
              {categories.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select
              value={value.product.brandId}
              onChange={(event) => setProduct("brandId", event.target.value)}
            >
              {brands.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            必須Rank
            <select
              value={value.product.requiredRank ?? "none"}
              onChange={(event) =>
                setProduct(
                  "requiredRank",
                  event.target.value === "none" ? null : event.target.value,
                )
              }
            >
              <option value="none">制限なし</option>
              <option value="regular">regular</option>
              <option value="gold">gold</option>
              <option value="platinum">platinum</option>
            </select>
          </label>
          <label>
            Variation名
            <input
              value={value.product.variationName ?? ""}
              onChange={(event) => setProduct("variationName", event.target.value || null)}
              placeholder="Variationなしは空欄"
            />
          </label>
          <label className="form-grid__wide">
            説明
            <textarea
              value={value.product.description}
              onChange={(event) => setProduct("description", event.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>SKU・価格・在庫</legend>
        <p>既存在庫は商品編集では変更できません。新規SKUだけ初期在庫を設定します。</p>
        <div className="variant-editor-list">
          {value.variants.map((variant, index) => {
            const existing = value.existingVariantIds[variant.clientKey];
            return (
              <div className="variant-editor" key={variant.clientKey}>
                <label>
                  SKU
                  <input
                    required
                    value={variant.sku}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                  />
                </label>
                <label>
                  Option
                  <input
                    value={variant.optionValue ?? ""}
                    onChange={(event) =>
                      updateVariant(index, { optionValue: event.target.value || null })
                    }
                  />
                </label>
                <label>
                  通常価格
                  <input
                    type="number"
                    min="0"
                    value={variant.regularPrice}
                    onChange={(event) =>
                      updateVariant(index, { regularPrice: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  購入上限
                  <input
                    type="number"
                    min="1"
                    value={variant.purchaseLimit}
                    onChange={(event) =>
                      updateVariant(index, { purchaseLimit: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  {existing ? "現在庫（変更不可）" : "初期在庫"}
                  <input
                    type="number"
                    min="0"
                    disabled={existing !== undefined}
                    value={existing?.stockQuantity ?? variant.initialStockQuantity}
                    onChange={(event) =>
                      updateVariant(index, { initialStockQuantity: Number(event.target.value) })
                    }
                  />
                </label>
                {existing && (
                  <label>
                    <input
                      type="checkbox"
                      checked={existing.isActive}
                      onChange={(event) =>
                        setValue((current) => ({
                          ...current,
                          existingVariantIds: {
                            ...current.existingVariantIds,
                            [variant.clientKey]: { ...existing, isActive: event.target.checked },
                          },
                        }))
                      }
                    />{" "}
                    active
                  </label>
                )}
                <button
                  type="button"
                  className="button button--tertiary"
                  disabled={value.variants.length <= 1}
                  onClick={() => removeVariant(index)}
                >
                  SKUを削除
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            setValue((current) => ({
              ...current,
              variants: [
                ...current.variants,
                {
                  ...emptyForm.variants[0]!,
                  clientKey: `new-${crypto.randomUUID()}`,
                },
              ],
            }))
          }
        >
          SKUを追加
        </button>
      </fieldset>
      <fieldset>
        <legend>画像（最大3件）</legend>
        <div className="asset-picker">
          {assets.map((asset) => {
            const selected = value.images.find((image) => image.assetId === asset.assetId);
            return (
              <article
                key={asset.assetId}
                className={selected ? "asset-card is-selected" : "asset-card"}
              >
                <ProductImage src={asset.path} alt={asset.defaultAltText} />
                <label>
                  <input
                    type="checkbox"
                    checked={selected !== undefined}
                    disabled={!asset.isActive && selected === undefined}
                    onChange={() => toggleImage(asset)}
                  />
                  {asset.assetId}
                  {!asset.isActive ? "（inactive・既存維持のみ）" : ""}
                </label>
                {selected && (
                  <>
                    <label>
                      Alt Text
                      <input
                        value={selected.altText}
                        onChange={(event) =>
                          setValue((current) => ({
                            ...current,
                            images: current.images.map((image) =>
                              image.assetId === asset.assetId
                                ? { ...image, altText: event.target.value }
                                : image,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="primary-image"
                        checked={selected.isPrimary}
                        onChange={() =>
                          setValue((current) => ({
                            ...current,
                            images: current.images.map((image) => ({
                              ...image,
                              isPrimary: image.assetId === asset.assetId,
                            })),
                          }))
                        }
                      />
                      Primary
                    </label>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </fieldset>
      <div className="inline-actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={() =>
            void onPreview(value)
              .then(setPreview)
              .catch(() => setMessage("Previewに必要な入力が不足しています。"))
          }
        >
          未保存内容をPreview
        </button>
        <button className="button button--primary" disabled={saving}>
          {saving ? "保存中…" : submitLabel}
        </button>
      </div>
      {preview && (
        <section className="product-preview" aria-label="商品Preview">
          <h2>未保存Preview</h2>
          <p>
            <strong>
              {preview.productCode} — {preview.name}
            </strong>
          </p>
          <p>
            {formatYen(preview.minimumViewerUnitPrice)}〜{formatYen(preview.maximumViewerUnitPrice)}
          </p>
          <p>DBには保存されていません。</p>
        </section>
      )}
    </form>
  );
}

function editToForm(edit: ProductEditDto): ProductFormValue {
  return {
    product: {
      productCode: edit.product.productCode,
      name: edit.product.name,
      shortDescription: edit.product.shortDescription,
      description: edit.product.description,
      categoryId: edit.product.categoryId,
      brandId: edit.product.brandId,
      requiredRank: edit.product.requiredRank,
      variationName: edit.product.variationName,
    },
    variants: edit.variants.map((variant) => ({
      clientKey: variant.id,
      sku: variant.sku,
      optionValue: variant.optionValue,
      regularPrice: variant.regularPrice,
      salePrice: variant.salePrice,
      saleStartAt: variant.saleStartAt,
      saleEndAt: variant.saleEndAt,
      purchaseLimit: variant.purchaseLimit,
      initialStockQuantity: variant.stockQuantity,
    })),
    images: edit.images.map((image) => ({
      relationshipId: image.id,
      assetId: image.assetId,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    })),
    existingVariantIds: Object.fromEntries(
      edit.variants.map((variant) => [
        variant.id,
        {
          version: variant.version,
          isActive: variant.isActive,
          stockQuantity: variant.stockQuantity,
        },
      ]),
    ),
  };
}

function mergeSelectedAssets(
  assets: ImageAssetListItem[],
  edit: ProductEditDto,
): ImageAssetListItem[] {
  const byId = new Map(assets.map((asset) => [asset.assetId, asset]));
  for (const selected of edit.selectedImages) {
    if (!byId.has(selected.assetId)) {
      byId.set(selected.assetId, {
        assetId: selected.assetId,
        path: selected.path,
        defaultAltText: selected.defaultAltText,
        tags: [],
        isActive: selected.assetActive,
        mimeType: "image/webp",
        width: 1,
        height: 1,
        bytes: 0,
      });
    }
  }
  return [...byId.values()];
}
