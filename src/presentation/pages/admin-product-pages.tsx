import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigation, useRouter, type Href } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { Button as AriaButton, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import type {
  CreateProductRequest,
  ImageAssetListItem,
  ProductEditDto,
  ProductImageSelectionRequest,
  ProductPreviewDto,
  ProductVariantCreateRequest,
  UpdateProductRequest,
} from "@/application/contracts";
import { INPUT_LIMITS } from "@/application/contracts";
import type { MembershipRank, ProductStatus } from "@/domain/contracts";
import { ConfirmDialog } from "@/presentation/components/confirm-dialog";
import { ProductImage } from "@/presentation/components/product-image";
import { StatePanel } from "@/presentation/components/states";
import { StatusBadge, statusTone } from "@/presentation/components/status-badge";
import { applicationErrorMessage, labels } from "@/presentation/content/dictionary";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { useAsyncValue } from "@/presentation/hooks/use-async-value";
import {
  Breadcrumbs,
  ContextualSaveBar,
  FilterBar,
  PageHeader,
  Pagination,
  ResourceTable,
} from "@/presentation/patterns/admin-patterns";
import { formatYen } from "@/presentation/components/product-card";

function StaffPage({ children }: { children: ReactNode }) {
  return <RouteGuard access="staff">{children}</RouteGuard>;
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <StatusBadge tone={statusTone(status)}>{labels.product(status)}</StatusBadge>;
}

function productBulkFailureLabel(reason: string) {
  return reason === "products.publishability.invalid"
    ? "公開条件を満たしていません"
    : "状態を変更できません";
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
          ? `（${result.failures
              .map((failure) => `${failure.productId}: ${productBulkFailureLabel(failure.reason)}`)
              .join("、")}）`
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
        description="商品情報と公開状態を管理します。"
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
            maxLength={INPUT_LIMITS.searchKeyword}
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
            <option value="draft">{labels.product("draft")}</option>
            <option value="published">{labels.product("published")}</option>
            <option value="unpublished">{labels.product("unpublished")}</option>
            <option value="discontinued">{labels.product("discontinued")}</option>
          </select>
        </label>
        <label>
          会員ランク
          <select
            aria-label="会員ランク"
            value={rank}
            onChange={(event) => setRank(event.target.value as typeof rank)}
          >
            <option value="all">すべて</option>
            <option value="none">制限なし</option>
            <option value="regular">{labels.rank("regular")}</option>
            <option value="gold">{labels.rank("gold")}</option>
            <option value="platinum">{labels.rank("platinum")}</option>
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
            <option value="product_code_asc">商品コード</option>
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
            rowHeaderColumnIndex={1}
            columns={[
              { label: "選択", align: "center" },
              { label: "商品", align: "start" },
              { label: "状態", align: "center" },
              { label: "カテゴリ / ブランド", align: "start" },
              { label: "価格", align: "end" },
              { label: "有効SKU / 在庫", align: "end" },
            ]}
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
                <ProductStatusBadge key="status" status={item.status} />,
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

function formToUpdateRequest(
  productId: string,
  productExpectedVersion: number,
  value: ProductFormValue,
  removedVariantIds: string[],
): UpdateProductRequest {
  const existingIds = new Set(Object.keys(value.existingVariantIds));
  return {
    productId,
    productExpectedVersion,
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
        isActive: value.existingVariantIds[variant.clientKey]!.isActive,
        expectedVersion: value.existingVariantIds[variant.clientKey]!.version,
      })),
    removeVariantIds: removedVariantIds,
    images: value.images,
  };
}

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
      <PageHeader title="商品登録" description="保存すると下書きとして作成されます。" />
      <ProductEditor
        initial={initial}
        categories={options.value.categories.map((item) => ({
          id: item.categoryId,
          name: item.name,
        }))}
        brands={options.value.brands.map((item) => ({ id: item.brandId, name: item.name }))}
        assets={options.value.assets}
        submitLabel="下書きで保存"
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
  const [dirty, setDirty] = useState(false);
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
        description={`${edit.product.productCode}・${labels.product(edit.product.status)}`}
        action={
          <div className="inline-actions">
            <button
              className="button button--secondary"
              disabled={dirty}
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
                disabled={dirty}
                onClick={() => void changeStatus("published")}
              >
                公開
              </button>
            )}
            {edit.product.status === "published" && (
              <button
                className="button button--secondary"
                disabled={dirty}
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
                disabled={dirty}
                onConfirm={() => changeStatus("discontinued")}
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
        <p className="operation-message">
          {labels.product("discontinued")}は終端状態です。状態変更はできません。
        </p>
      )}
      <ProductEditor
        key={`${productId}-${mutation}`}
        initial={initial}
        categories={edit.categoryOptions}
        brands={edit.brandOptions}
        assets={mergeSelectedAssets(state.value.assets, edit)}
        submitLabel="変更を保存"
        onPreview={(value, removedVariantIds) =>
          services.adminProducts.preview({
            aggregate: formToUpdateRequest(
              productId,
              edit.product.version,
              value,
              removedVariantIds,
            ),
            previewMembershipRank: edit.product.requiredRank,
          })
        }
        onSubmit={async (value, removedVariantIds) => {
          setSaveMessage(null);
          await services.adminProducts.update(
            formToUpdateRequest(productId, edit.product.version, value, removedVariantIds),
          );
          setSaveMessage("保存しました。");
          setMutation((current) => current + 1);
        }}
        onDirtyChange={setDirty}
      />
      {edit.product.status === "draft" && (
        <ConfirmDialog
          triggerLabel="下書きを削除"
          title="下書き商品を削除しますか"
          confirmLabel="削除"
          danger
          disabled={dirty}
          onConfirm={() =>
            services.adminProducts
              .deleteDraft(productId, edit.product.version)
              .then(() => router.replace("/admin/products"))
              .catch(() =>
                setDeleteMessage(
                  "参照がある下書き商品は削除できません。カート・注文・レビュー・在庫履歴を確認してください。",
                ),
              )
          }
        >
          カート・注文・レビューなどの参照がある場合は削除できません。アセットバイナリは削除されません。
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
  onDirtyChange,
}: {
  initial: ProductFormValue;
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  assets: ImageAssetListItem[];
  submitLabel: string;
  onSubmit: (value: ProductFormValue, removedVariantIds: string[]) => Promise<void>;
  onPreview: (value: ProductFormValue, removedVariantIds: string[]) => Promise<ProductPreviewDto>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(initial);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<ProductPreviewDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"back" | string | null>(null);
  const navigationTriggerRef = useRef<HTMLElement | null>(null);
  const protectedNavigationRef = useRef<{ url: string; state: unknown } | null>(null);
  const pendingNavigationActionRef = useRef<unknown>(null);
  const confirmedNavigationRef = useRef<
    { kind: "back"; action: unknown } | { kind: "link"; href: string } | null
  >(null);
  const navigationConfirmingRef = useRef(false);
  const [navigationConfirming, setNavigationConfirming] = useState(false);
  const router = useRouter();
  const navigation = useNavigation<{ dispatch: (action: unknown) => void }>();
  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(initial) || removedVariantIds.length > 0,
    [initial, removedVariantIds, value],
  );
  usePreventRemove(dirty && !saving, ({ data }) => {
    const protectedNavigation = protectedNavigationRef.current;
    if (protectedNavigation !== null && window.location.href !== protectedNavigation.url) {
      window.history.pushState(protectedNavigation.state, "", protectedNavigation.url);
    }
    navigationTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pendingNavigationActionRef.current = data.action;
    setPendingNavigation("back");
  });
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    protectedNavigationRef.current = {
      url: window.location.href,
      state: window.history.state,
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const clickGuard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (
        target.target === "_blank" ||
        target.download ||
        target.origin !== window.location.origin ||
        target.href === window.location.href
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      navigationTriggerRef.current = target;
      setPendingNavigation(target.href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", clickGuard, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", clickGuard, true);
      protectedNavigationRef.current = null;
    };
  }, [dirty]);
  useEffect(() => {
    if (pendingNavigation !== null || navigationTriggerRef.current === null) return;
    const trigger = navigationTriggerRef.current;
    navigationTriggerRef.current = null;
    navigationConfirmingRef.current = false;
    setNavigationConfirming(false);
    requestAnimationFrame(() => {
      if (trigger.isConnected) trigger.focus();
    });
  }, [pendingNavigation]);
  const discardChanges = () => {
    pendingNavigationActionRef.current = null;
    setValue(initial);
    setRemovedVariantIds([]);
    setPreview(null);
    setPendingNavigation(null);
  };
  const cancelNavigation = () => {
    pendingNavigationActionRef.current = null;
    setPendingNavigation(null);
  };
  const confirmNavigation = () => {
    if (navigationConfirmingRef.current) return;
    const destination = pendingNavigation;
    if (destination === null) return;
    navigationConfirmingRef.current = true;
    setNavigationConfirming(true);
    if (destination === "back") {
      confirmedNavigationRef.current = {
        kind: "back",
        action: pendingNavigationActionRef.current,
      };
      discardChanges();
      return;
    }
    confirmedNavigationRef.current = { kind: "link", href: destination };
    discardChanges();
  };
  useEffect(() => {
    if (dirty || confirmedNavigationRef.current === null) return;
    const confirmedNavigation = confirmedNavigationRef.current;
    confirmedNavigationRef.current = null;
    if (confirmedNavigation.kind === "back") {
      if (confirmedNavigation.action !== null) {
        navigation.dispatch(confirmedNavigation.action);
      } else {
        router.back();
      }
      return;
    }
    const url = new URL(confirmedNavigation.href, window.location.origin);
    router.push((url.pathname + url.search + url.hash) as Href);
  }, [dirty, navigation, router]);
  const previewIssues = preview?.publishabilityIssues ?? [];
  const previewVariants = preview?.variants ?? [];
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
      <ContextualSaveBar
        dirty={dirty}
        onDiscard={discardChanges}
        onSave={() => void submit()}
        saving={saving}
      />
      {message && (
        <p role="status" className="operation-message">
          {message}
        </p>
      )}
      <fieldset>
        <legend>商品情報</legend>
        <div className="form-grid">
          <label>
            商品コード
            <input
              required
              maxLength={INPUT_LIMITS.productCode}
              value={value.product.productCode}
              onChange={(event) => setProduct("productCode", event.target.value)}
            />
          </label>
          <label>
            商品名
            <input
              required
              maxLength={INPUT_LIMITS.productName}
              value={value.product.name}
              onChange={(event) => setProduct("name", event.target.value)}
            />
          </label>
          <label>
            短い説明
            <input
              maxLength={INPUT_LIMITS.shortDescription}
              value={value.product.shortDescription}
              onChange={(event) => setProduct("shortDescription", event.target.value)}
            />
          </label>
          <label>
            カテゴリ
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
            ブランド
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
            必須会員ランク
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
              <option value="regular">{labels.rank("regular")}</option>
              <option value="gold">{labels.rank("gold")}</option>
              <option value="platinum">{labels.rank("platinum")}</option>
            </select>
          </label>
          <label>
            バリエーション名
            <input
              maxLength={INPUT_LIMITS.variationName}
              value={value.product.variationName ?? ""}
              onChange={(event) => setProduct("variationName", event.target.value || null)}
              placeholder="バリエーションなしは空欄"
            />
          </label>
          <label className="form-grid__wide">
            説明
            <textarea
              maxLength={INPUT_LIMITS.description}
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
                    maxLength={INPUT_LIMITS.sku}
                    value={variant.sku}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                  />
                </label>
                <label>
                  選択肢
                  <input
                    maxLength={INPUT_LIMITS.optionValue}
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
                  <label className="variant-editor__active">
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
                    有効
                  </label>
                )}
                <button
                  type="button"
                  className="button button--tertiary variant-editor__remove"
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
                  {!asset.isActive ? "（無効・既存維持のみ）" : ""}
                </label>
                {selected && (
                  <>
                    <label>
                      代替テキスト
                      <input
                        maxLength={INPUT_LIMITS.imageAltText}
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
                      メイン画像
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
            void onPreview(value, removedVariantIds)
              .then(setPreview)
              .catch(() => setMessage("プレビューに必要な入力が不足しています。"))
          }
        >
          未保存内容をプレビュー
        </button>
        <button className="button button--primary" disabled={saving}>
          {saving ? "保存中…" : submitLabel}
        </button>
      </div>
      {preview && (
        <section className="product-preview" aria-label="商品プレビュー">
          <h2>未保存プレビュー</h2>
          <div className="product-preview__identity">
            {preview.primaryImage ? (
              <ProductImage src={preview.primaryImage.path} alt={preview.primaryImage.altText} />
            ) : (
              <div className="product-preview__image-empty">画像なし</div>
            )}
            <div>
              <p>
                <strong>
                  {preview.productCode} — {preview.name}
                </strong>
              </p>
              <p>{preview.shortDescription}</p>
            </div>
          </div>
          <p>{preview.description}</p>
          <p>
            {formatYen(preview.minimumViewerUnitPrice)}〜{formatYen(preview.maximumViewerUnitPrice)}
          </p>
          <dl className="definition-grid">
            <dt>保存後の状態</dt>
            <dd>
              <ProductStatusBadge status={preview.statusAfterSave ?? "draft"} />
            </dd>
            <dt>必須会員ランク</dt>
            <dd>{preview.requiredRank == null ? "制限なし" : labels.rank(preview.requiredRank)}</dd>
            <dt>公開可否</dt>
            <dd>{previewIssues.length === 0 ? "公開条件を満たします" : "要確認"}</dd>
          </dl>
          <h3>SKU・在庫</h3>
          <ul className="product-preview__variants">
            {previewVariants.map((variant) => (
              <li key={variant.variantId}>
                <strong>{variant.sku}</strong>
                {variant.optionValue ? `（${variant.optionValue}）` : ""}：
                {variant.isActive ? "有効" : "無効"}・在庫 {variant.stockQuantity}点 （
                {variant.stockSource === "CURRENT" ? "DB現在庫" : "初期在庫"}）
              </li>
            ))}
          </ul>
          {previewIssues.length > 0 && (
            <ul className="operation-error" role="alert">
              {previewIssues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{applicationErrorMessage(issue)}</li>
              ))}
            </ul>
          )}
          <p>データベースには保存されていません。</p>
        </section>
      )}
      <ModalOverlay
        className="dialog-overlay"
        isOpen={pendingNavigation !== null}
        isDismissable
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen && !navigationConfirmingRef.current) cancelNavigation();
        }}
      >
        <Modal className="dialog-modal">
          <Dialog
            className="dirty-navigation-dialog dialog"
            role="alertdialog"
            aria-describedby="dirty-navigation-description"
          >
            <Heading slot="title">未保存の変更があります</Heading>
            <p id="dirty-navigation-description">この画面を離れると、入力中の変更は失われます。</p>
            <div className="dialog__actions">
              <AriaButton
                className="button button--danger"
                onPress={confirmNavigation}
                isDisabled={navigationConfirming}
              >
                変更を破棄して移動
              </AriaButton>
              <AriaButton
                className="button button--secondary"
                onPress={cancelNavigation}
                isDisabled={navigationConfirming}
              >
                編集に戻る
              </AriaButton>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
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
