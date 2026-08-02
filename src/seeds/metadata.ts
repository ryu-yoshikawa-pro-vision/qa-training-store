export const APP_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;
export const SEED_VERSION = 11;
export const IMAGE_MANIFEST_VERSION = 1;
export const BASE_CLOCK = "2026-07-01T03:00:00.000Z";
export const DEFAULT_GUEST_ID = "guest-default-001";
export const DEFAULT_PAYMENT_DELAY_MS = 500;

export type ScenarioInitialSession =
  | { kind: "guest" }
  | { kind: "customer"; email: string }
  | { kind: "operator"; email: string }
  | { kind: "admin"; email: string };

export interface ScenarioMetadataDefinition {
  displayName: string;
  purpose: string;
  recommendedAccounts: readonly string[];
  routes: readonly string[];
  initialSession: ScenarioInitialSession;
  safeResetPath: "/" | "/admin";
  guide: string;
  e2eHasSession: boolean;
  summary: string;
}

const guest = {
  kind: "guest",
} as const;

const regular = {
  kind: "customer",
  email: "regular@example.com",
} as const;

const gold = {
  kind: "customer",
  email: "gold@example.com",
} as const;

const platinum = {
  kind: "customer",
  email: "platinum@example.com",
} as const;

const suspended = {
  kind: "customer",
  email: "suspended@example.com",
} as const;

const admin = {
  kind: "admin",
  email: "admin@example.com",
} as const;

const operator = {
  kind: "operator",
  email: "operator@example.com",
} as const;

const commonRoutes = ["/", "/products", "/cart", "/guide"] as const;

export const SCENARIO_METADATA = {
  default: {
    displayName: "標準",
    purpose: "Guestの商品探索から購入手続きまでの標準状態を確認します。",
    recommendedAccounts: ["regular@example.com", "admin@example.com"],
    routes: commonRoutes,
    initialSession: guest,
    safeResetPath: "/",
    guide: "基本の購入導線とRole別の画面を確認します。",
    e2eHasSession: false,
    summary: "公開商品、固定アカウント、標準の注文データを含む初期状態です。",
  },
  "empty-catalog": {
    displayName: "公開商品なし",
    purpose: "商品とカテゴリが空の状態を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/", "/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "Empty State が一つだけ表示されることを確認します。",
    e2eHasSession: false,
    summary: "公開商品、カテゴリ、注文関連データを空にした状態です。",
  },
  "many-products": {
    displayName: "大量商品",
    purpose: "一覧、ページネーション、絞り込みを確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/products", "/search", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "大量の商品を検索・並べ替えして確認します。",
    e2eHasSession: false,
    summary: "ページング確認用に商品数を増やした状態です。",
  },
  "out-of-stock": {
    displayName: "在庫切れ",
    purpose: "在庫切れ商品の表示と購入不可状態を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "商品詳細で在庫切れと数量選択を確認します。",
    e2eHasSession: false,
    summary: "特定 SKU の在庫を0にした状態です。",
  },
  "low-stock": {
    displayName: "少量在庫",
    purpose: "残り数量と購入上限を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "商品詳細で残りN点と購入上限を確認します。",
    e2eHasSession: false,
    summary: "特定 SKU の在庫を少量にした状態です。",
  },
  "sale-active": {
    displayName: "セール中",
    purpose: "セール価格と会員価格の表示を確認します。",
    recommendedAccounts: ["regular@example.com", "gold@example.com"],
    routes: ["/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "通常価格、セール価格、会員価格の違いを確認します。",
    e2eHasSession: false,
    summary: "有効なセール価格を含む標準状態です。",
  },
  "expired-sale": {
    displayName: "セール終了",
    purpose: "セール期間終了後の価格を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "固定時計によるセール終了後の価格を確認します。",
    e2eHasSession: false,
    summary: "固定時刻を進めてセールを終了させた状態です。",
  },
  "regular-member": {
    displayName: "一般会員",
    purpose: "一般会員のCart、Checkout、注文を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/", "/cart", "/checkout/address", "/orders", "/guide"],
    initialSession: regular,
    safeResetPath: "/",
    guide: "一般会員の購入可能範囲を確認します。",
    e2eHasSession: true,
    summary: "一般会員の初期SessionとCartを復元します。",
  },
  "gold-member": {
    displayName: "ゴールド会員",
    purpose: "ゴールド会員のRank Benefitと購入範囲を確認します。",
    recommendedAccounts: ["gold@example.com"],
    routes: ["/", "/cart", "/account/profile", "/guide"],
    initialSession: gold,
    safeResetPath: "/",
    guide: "ゴールド会員の割引とRank制限を確認します。",
    e2eHasSession: true,
    summary: "ゴールド会員の初期SessionとCartを復元します。",
  },
  "platinum-member": {
    displayName: "プラチナ会員",
    purpose: "プラチナ会員のRank Benefitと購入範囲を確認します。",
    recommendedAccounts: ["platinum@example.com"],
    routes: ["/", "/cart", "/account/profile", "/guide"],
    initialSession: platinum,
    safeResetPath: "/",
    guide: "プラチナ会員の送料無料条件と割引を確認します。",
    e2eHasSession: true,
    summary: "プラチナ会員の初期SessionとCartを復元します。",
  },
  "suspended-user": {
    displayName: "利用停止ユーザー",
    purpose: "利用停止状態とログイン制御を確認します。",
    recommendedAccounts: ["suspended@example.com"],
    routes: ["/login", "/guide"],
    initialSession: suspended,
    safeResetPath: "/",
    guide: "利用停止アカウントのエラー表示を確認します。",
    e2eHasSession: true,
    summary: "利用停止ユーザーの初期Sessionを復元します。",
  },
  "cart-with-invalid-items": {
    displayName: "購入不可Cart",
    purpose: "非公開、在庫、Rank、SKU状態のエラーを確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/cart", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "原因別のBlocking Issueを修正・削除して確認します。",
    e2eHasSession: false,
    summary: "複数種類の購入不可商品をCartへ含めた状態です。",
  },
  "payment-declined": {
    displayName: "支払い失敗",
    purpose: "支払い失敗と再試行を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/orders", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "テスト決済の失敗理由と再試行を確認します。",
    e2eHasSession: false,
    summary: "支払い失敗済みの注文を含む状態です。",
  },
  "payment-processing": {
    displayName: "支払い処理中",
    purpose: "支払い待ち注文とProcessing画面を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/orders", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "支払い処理中の注文詳細と完了遷移を確認します。",
    e2eHasSession: false,
    summary: "支払い処理中の注文を含む状態です。",
  },
  "orders-phase1-statuses": {
    displayName: "注文ステータス",
    purpose: "注文と配送の各ステータス表示を確認します。",
    recommendedAccounts: ["regular@example.com", "admin@example.com"],
    routes: ["/orders", "/admin/orders", "/guide"],
    initialSession: operator,
    safeResetPath: "/admin",
    guide: "注文、支払い、配送の状態を確認します。",
    e2eHasSession: true,
    summary: "注文ステータスを網羅した標準データです。",
  },
  "reviewable-orders": {
    displayName: "レビュー投稿対象",
    purpose: "配達済み注文からレビューを投稿します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/orders", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "注文時Snapshotを使ったレビュー投稿を確認します。",
    e2eHasSession: false,
    summary: "レビュー投稿対象の注文を含む状態です。",
  },
  "hidden-reviews": {
    displayName: "非公開レビュー",
    purpose: "レビューの公開・非公開状態を確認します。",
    recommendedAccounts: ["regular@example.com", "admin@example.com"],
    routes: ["/orders", "/admin/reviews", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "CustomerとAdminでレビュー状態を確認します。",
    e2eHasSession: false,
    summary: "非公開レビューを含む標準状態です。",
  },
  "guest-cart-merge-overflow": {
    displayName: "Cart統合上限超過",
    purpose: "Guest CartとUser Cartの数量統合結果を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/cart", "/login", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "商品別の追加、超過、最終数量と理由を確認します。",
    e2eHasSession: false,
    summary: "Guest数量と既存数量の合計が上限を超える状態です。",
  },
  "checkout-resume": {
    displayName: "Checkout再開",
    purpose: "既存の購入手続きを再開します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/checkout/address", "/checkout/payment", "/guide"],
    initialSession: regular,
    safeResetPath: "/",
    guide: "Checkout再開通知が一度だけ表示されることを確認します。",
    e2eHasSession: true,
    summary: "Address step の既存Checkout Sessionを復元します。",
  },
  "checkout-replaced": {
    displayName: "Checkout置換",
    purpose: "Cart更新によるCheckout置換を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/checkout/address", "/cart", "/guide"],
    initialSession: regular,
    safeResetPath: "/",
    guide: "最新Cartを元にCheckoutが置換されることを確認します。",
    e2eHasSession: true,
    summary: "Cart version が進んだCheckout Sessionを復元します。",
  },
  "cart-version-invalidates-checkout": {
    displayName: "Checkout無効化",
    purpose: "Cart version 変更によるCheckout無効化を確認します。",
    recommendedAccounts: ["regular@example.com"],
    routes: ["/checkout/address", "/cart", "/guide"],
    initialSession: regular,
    safeResetPath: "/",
    guide: "Cart変更後にCheckout Guardが働くことを確認します。",
    e2eHasSession: true,
    summary: "Cart version不一致でCheckoutを継続できない状態です。",
  },
  "inactive-image-existing-link": {
    displayName: "無効画像リンク",
    purpose: "既存商品の無効画像参照を確認します。",
    recommendedAccounts: ["admin@example.com"],
    routes: ["/admin/products", "/guide"],
    initialSession: admin,
    safeResetPath: "/admin",
    guide: "既存リンクを保ったまま画像を編集できることを確認します。",
    e2eHasSession: true,
    summary: "既存商品が無効化された画像を参照する状態です。",
  },
  "product-aggregate-edit": {
    displayName: "商品Aggregate編集",
    purpose: "商品、SKU、画像の編集とPreviewを確認します。",
    recommendedAccounts: ["admin@example.com"],
    routes: ["/admin/products", "/guide"],
    initialSession: admin,
    safeResetPath: "/admin",
    guide: "未保存Form、DB在庫、Previewを確認します。",
    e2eHasSession: true,
    summary: "商品編集とVariant更新を確認する状態です。",
  },
  "cross-role-product-lifecycle": {
    displayName: "Role横断商品Lifecycle",
    purpose: "Adminの在庫変更とCustomer表示を確認します。",
    recommendedAccounts: ["admin@example.com", "regular@example.com"],
    routes: ["/admin/inventories", "/products", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "Admin変更後にStorefrontへ反映されることを確認します。",
    e2eHasSession: false,
    summary: "Role横断の在庫・注文・レビュー確認用データです。",
  },
  "product-delete-blocked": {
    displayName: "商品削除制約",
    purpose: "参照がある下書き商品の削除制約を確認します。",
    recommendedAccounts: ["admin@example.com"],
    routes: ["/admin/products", "/guide"],
    initialSession: admin,
    safeResetPath: "/admin",
    guide: "Cart・注文・レビュー・在庫履歴の参照制約を確認します。",
    e2eHasSession: true,
    summary: "参照を持つ下書き商品の削除を防ぐ状態です。",
  },
  "admin-bulk-partial-failure": {
    displayName: "Admin一括部分失敗",
    purpose: "一括操作の成功・失敗混在を確認します。",
    recommendedAccounts: ["admin@example.com"],
    routes: ["/admin/products", "/admin/reviews", "/guide"],
    initialSession: admin,
    safeResetPath: "/admin",
    guide: "部分失敗の対象と結果を確認します。",
    e2eHasSession: true,
    summary: "一括操作のConflict対象を含む状態です。",
  },
  "storage-write-failure": {
    displayName: "Storage書込失敗",
    purpose: "Storage書込失敗時のError表示を確認します。",
    recommendedAccounts: ["regular@example.com", "admin@example.com"],
    routes: ["/login", "/admin", "/guide"],
    initialSession: guest,
    safeResetPath: "/",
    guide: "状態保存に失敗した場合の復旧表示を確認します。",
    e2eHasSession: false,
    summary: "次回の書込を失敗させるテスト設定を含む状態です。",
  },
} as const satisfies Record<string, ScenarioMetadataDefinition>;

export type PhaseOneScenario = keyof typeof SCENARIO_METADATA;

export const PHASE_ONE_SCENARIOS = Object.keys(SCENARIO_METADATA) as PhaseOneScenario[];

export function isPhaseOneScenario(value: string): value is PhaseOneScenario {
  return Object.prototype.hasOwnProperty.call(SCENARIO_METADATA, value);
}
