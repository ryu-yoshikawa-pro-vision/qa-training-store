import { Link, type Href } from "expo-router";
import { formatYen } from "@/presentation/components/product-card";
import { content, labels } from "@/presentation/content/dictionary";
import { RouteGuard } from "@/presentation/guards/route-guard";
import { useAppRuntime } from "@/presentation/providers/app-runtime-provider";
import { isPresentationRouteLink } from "@/presentation/routing/guide-routes";
import { FREE_SHIPPING_THRESHOLD, membershipDiscountRate } from "@/domain/services/pricing";
import { isTestApiBuild } from "@/test-controls/test-api.web";
import {
  PHASE_ONE_SCENARIOS,
  SCENARIO_METADATA,
  type ScenarioInitialSession,
  type PhaseOneScenario,
} from "@/seeds/metadata";

const GUIDE_GROUPS: readonly {
  title: string;
  scenarios: readonly PhaseOneScenario[];
}[] = [
  {
    title: "商品・検索",
    scenarios: [
      "default",
      "empty-catalog",
      "many-products",
      "out-of-stock",
      "low-stock",
      "sale-active",
      "expired-sale",
    ],
  },
  {
    title: "Cart・Checkout",
    scenarios: [
      "regular-member",
      "gold-member",
      "platinum-member",
      "cart-with-invalid-items",
      "guest-cart-merge-overflow",
      "checkout-resume",
      "checkout-replaced",
      "cart-version-invalidates-checkout",
    ],
  },
  {
    title: "決済",
    scenarios: ["payment-declined", "payment-processing"],
  },
  {
    title: "注文・配送",
    scenarios: ["orders-phase1-statuses"],
  },
  {
    title: "Review",
    scenarios: ["reviewable-orders", "hidden-reviews"],
  },
  {
    title: "Admin操作",
    scenarios: [
      "inactive-image-existing-link",
      "product-aggregate-edit",
      "cross-role-product-lifecycle",
      "product-delete-blocked",
      "admin-bulk-partial-failure",
    ],
  },
  {
    title: "Error・制約",
    scenarios: ["suspended-user", "storage-write-failure"],
  },
];

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function describeAccount(email: string): string {
  const account = content.guide.accounts.find((item) => item.email === email);
  return account === undefined ? email : `${account.label} (${account.email})`;
}

function describeInitialSession(session: ScenarioInitialSession): string {
  if (session.kind === "guest") {
    return "ゲスト";
  }
  return `${labels.role(session.kind)} (${session.email})`;
}

function renderRoute(route: string) {
  return isPresentationRouteLink(route) ? (
    <Link href={route as Href}>{route}</Link>
  ) : (
    <span>{route}</span>
  );
}

export function GuidePage() {
  return (
    <RouteGuard access="public">
      <GuideContent />
    </RouteGuard>
  );
}

function GuideContent() {
  const { currentUser } = useAppRuntime();
  const showTestControl = isTestApiBuild() && currentUser?.role === "admin";

  return (
    <div className="home-page home-page--guide">
      <section className="home-hero">
        <div>
          <p className="eyebrow">学習Guide</p>
          <h1>安全な模擬環境で、Role差分と初期化手順を確認する</h1>
          <p>
            このページは学習用です。固定テストアカウント、会員ランク、シナリオ初期化の見方を
            まとめています。
          </p>
          <div className="home-hero__actions">
            {showTestControl ? (
              <Link href="/admin/test-control" className="button button--primary">
                Test Control を開く
              </Link>
            ) : (
              <Link href="/" className="button button--primary">
                ホームへ戻る
              </Link>
            )}
            <Link href="/products" className="button button--secondary">
              商品を見る
            </Link>
          </div>
        </div>
        <div className="home-hero__visual">
          <section className="membership-panel membership-panel--guide-accounts">
            <div>
              <p className="eyebrow">固定テストアカウント</p>
              <h2>共通パスワードは {content.guide.fixedPassword}</h2>
            </div>
            <ul>
              {content.guide.accounts.map((account) => (
                <li key={account.email}>
                  <strong>{account.label}</strong>
                  <span className="membership-panel__value">{account.email}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
      <section className="home-learning-panel">
        <h2>学習環境としての注意</h2>
        <p>{content.notice.training}</p>
        <p>{content.notice.personalData}</p>
      </section>
      <section className="membership-panel">
        <div>
          <p className="eyebrow">Role差分</p>
          <h2>Guest / Customer / Operator / Admin の見分け方</h2>
        </div>
        <ul>
          <li>
            <strong>Guest</strong> 公開商品を見て、ログイン導線と検索を確認します。
          </li>
          <li>
            <strong>{labels.role("customer")}</strong> 購入、注文履歴、会員特典を確認します。
          </li>
          <li>
            <strong>{labels.role("operator")}</strong> 管理系の参照・運用ページを確認します。
          </li>
          <li>
            <strong>{labels.role("admin")}</strong> 全管理機能と Test Control を扱います。
          </li>
        </ul>
      </section>
      <section className="membership-panel">
        <div>
          <p className="eyebrow">会員ランク / 割引</p>
          <h2>価格は既存の定数と計算ロジックに合わせています</h2>
        </div>
        <ul>
          <li>
            <strong>{labels.rank("regular")}</strong> {formatYen(FREE_SHIPPING_THRESHOLD)}以上で
            送料無料
          </li>
          <li>
            <strong>{labels.rank("gold")}</strong> 商品価格から
            {formatPercent(membershipDiscountRate("gold"))}割引
          </li>
          <li>
            <strong>{labels.rank("platinum")}</strong>{" "}
            {formatPercent(membershipDiscountRate("platinum"))}
            割引・いつでも送料無料
          </li>
        </ul>
      </section>
      <section className="home-learning-panel">
        <h2>安全な初期化の手順</h2>
        <ol>
          <li>Test API が使える環境かつ admin のときだけ、Test Control を開きます。</li>
          <li>
            シナリオを選んで初期化します。学習データと認証状態は既存の制御に従って安全に戻ります。
          </li>
          <li>
            初期化後は表示された安全な戻り先に戻ります。各シナリオの安全な戻り先を確認して
            ください。
          </li>
        </ol>
        {showTestControl ? (
          <Link href="/admin/test-control" className="button button--primary">
            Test Control を開く
          </Link>
        ) : (
          <p>Test Control のリンクは、Test API が有効な admin のみ表示されます。</p>
        )}
      </section>
      <section className="home-learning-panel">
        <h2>主要な確認Flow</h2>
        <ol>
          <li>Guestで商品を探し、カートへ追加してCustomerの購入導線へ進む。</li>
          <li>会員ランク、住所候補、Checkout、テスト決済、注文詳細を確認する。</li>
          <li>Adminで商品・在庫・注文・Review・ユーザーを操作し、Customer表示へ戻る。</li>
          <li>各ScenarioをResetし、Noticeと安全な戻り先を確認する。</li>
        </ol>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">シナリオ一覧</p>
            <h2>目的別に、表示名・開始時の状態・推奨アカウント・確認画面をまとめています</h2>
          </div>
          <small>全 {PHASE_ONE_SCENARIOS.length} 件</small>
        </div>
        {GUIDE_GROUPS.map((group) => (
          <section className="home-learning-panel" key={group.title}>
            <div className="section-heading">
              <h3>{group.title}</h3>
              <small>{group.scenarios.length}件</small>
            </div>
            <div className="form-stack">
              {group.scenarios.map((scenario) => {
                const definition = SCENARIO_METADATA[scenario];
                return (
                  <article className="admin-detail-card" key={scenario}>
                    <div className="split-heading">
                      <div>
                        <h4>{definition.displayName}</h4>
                        <small>シナリオID: {scenario}</small>
                      </div>
                    </div>
                    <dl className="definition-grid">
                      <dt>確認すること</dt>
                      <dd>{definition.purpose}</dd>
                      <dt>推奨アカウント</dt>
                      <dd>{definition.recommendedAccounts.map(describeAccount).join(" / ")}</dd>
                      <dt>確認画面</dt>
                      <dd>
                        <ul>
                          {definition.routes.map((route) => (
                            <li key={route}>{renderRoute(route)}</li>
                          ))}
                        </ul>
                      </dd>
                      <dt>開始時のログイン状態</dt>
                      <dd>{describeInitialSession(definition.initialSession)}</dd>
                      <dt>初期化後に表示する画面</dt>
                      <dd>
                        <code>{definition.safeResetPath}</code>
                      </dd>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
