import type {
  AccountStatus,
  MembershipRank,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ReviewStatus,
  ShipmentStatus,
  UserRole,
} from "@/domain/contracts";

export const content = {
  brand: {
    storeName: "Scenario Shop",
    adminName: "Scenario Shop Admin",
  },
  environment: {
    testMode: "テスト環境",
  },
  notice: {
    training: "このサイトはテスト自動化学習用です。実際の注文・決済・配送は行われません。",
    personalData: "実在する氏名・住所・電話番号・カード情報を入力しないでください。",
  },
  navigation: {
    home: "ホーム",
    products: "商品",
    search: "検索",
    cart: "カート",
    orders: "注文履歴",
    account: "アカウント",
    admin: "管理画面",
    overview: "概要",
    categories: "カテゴリ",
    brands: "ブランド",
    inventory: "在庫",
    reviews: "レビュー",
    users: "ユーザー",
    testControl: "テスト制御",
  },
  action: {
    retry: "再試行",
    backHome: "ホームへ戻る",
    clearFilters: "条件をすべて解除",
    save: "保存",
    discard: "変更を破棄",
    close: "閉じる",
  },
  state: {
    loadingTitle: "読み込んでいます",
    loadingBody: "表示に必要な情報を準備しています。",
    emptyTitle: "まだデータがありません",
    filterEmptyTitle: "条件に一致するデータがありません",
    filterEmptyBody: "検索語を変えるか、絞り込み条件を解除してください。",
    errorTitle: "情報を読み込めませんでした",
    conflictTitle: "ほかの操作によって情報が更新されました",
    notFoundTitle: "ページが見つかりません",
    forbiddenTitle: "このページを表示する権限がありません",
  },
} as const;

const roleLabels: Record<UserRole, string> = {
  customer: "顧客",
  operator: "運用担当者",
  admin: "管理者",
};

const rankLabels: Record<MembershipRank, string> = {
  regular: "一般会員",
  gold: "ゴールド会員",
  platinum: "プラチナ会員",
};

const accountLabels: Record<AccountStatus, string> = {
  active: "利用中",
  suspended: "利用停止中",
  withdrawn: "退会済み",
};

const productLabels: Record<ProductStatus, string> = {
  draft: "下書き",
  published: "公開中",
  unpublished: "非公開",
  discontinued: "販売終了",
};

const orderLabels: Record<OrderStatus, string> = {
  pending_payment: "支払い待ち",
  payment_failed: "支払い失敗",
  paid: "支払い済み",
  preparing: "発送準備中",
  shipped: "発送済み",
  delivered: "配送完了",
};

const paymentLabels: Record<PaymentStatus, string> = {
  processing: "処理中",
  succeeded: "支払い完了",
  failed: "支払い失敗",
};

const shipmentLabels: Record<ShipmentStatus, string> = {
  pending: "発送準備前",
  shipped: "発送済み",
  delivered: "配送完了",
};

const reviewLabels: Record<ReviewStatus, string> = {
  published: "公開中",
  hidden: "非公開",
  deleted: "削除済み",
};

export const labels = {
  role: (value: UserRole) => roleLabels[value],
  rank: (value: MembershipRank) => rankLabels[value],
  account: (value: AccountStatus) => accountLabels[value],
  product: (value: ProductStatus) => productLabels[value],
  order: (value: OrderStatus) => orderLabels[value],
  payment: (value: PaymentStatus) => paymentLabels[value],
  shipment: (value: ShipmentStatus) => shipmentLabels[value],
  review: (value: ReviewStatus) => reviewLabels[value],
};
