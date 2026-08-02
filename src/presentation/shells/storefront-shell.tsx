import { useCallback, type ReactNode } from "react";
import { Link, usePathname } from "expo-router";
import type { CurrentUserDto } from "@/application/contracts";
import { content } from "@/presentation/content/dictionary";
import { Icon, type IconName } from "@/presentation/components/icon";
import { SearchCombobox, type SearchSuggestion } from "@/presentation/components/search-combobox";
import { LogoutButton } from "@/presentation/components/logout-button";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";
import { isTestApiBuild } from "@/test-controls/test-api.web";

interface StorefrontShellProps {
  currentUser: CurrentUserDto | null;
  notice?: ReactNode;
  children: ReactNode;
}

function isWithin(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isNavigationCurrent(pathname: string, href: string) {
  switch (href) {
    case "/":
      return pathname === "/";
    case "/products":
    case "/search":
      return ["/products", "/search", "/categories"].some((prefix) => isWithin(pathname, prefix));
    case "/cart":
      return isWithin(pathname, "/cart") || isWithin(pathname, "/checkout");
    case "/orders":
      return isWithin(pathname, "/orders") || isWithin(pathname, "/reviews");
    case "/account/profile":
      return isWithin(pathname, "/account");
    case "/admin":
      return isWithin(pathname, "/admin");
    default:
      return pathname === href;
  }
}

export function StorefrontShell({ currentUser, notice = null, children }: StorefrontShellProps) {
  const pathname = usePathname();
  const { catalog } = useApplicationServices();
  const loadSuggestions = useCallback(
    async (keyword: string): Promise<SearchSuggestion[]> =>
      (await catalog.suggest({ keyword, limit: 8 })).map((suggestion) => ({
        id: `${suggestion.type}:${suggestion.id}`,
        label: suggestion.label,
        description:
          suggestion.type === "product"
            ? (suggestion.supportingText ?? "商品")
            : suggestion.type === "category"
              ? "カテゴリ"
              : "ブランド",
        href:
          suggestion.type === "product"
            ? `/products/${suggestion.id}`
            : suggestion.type === "category"
              ? `/categories/${suggestion.id}`
              : `/search?brand=${suggestion.id}`,
      })),
    [catalog],
  );

  const isStaff = currentUser?.role === "operator" || currentUser?.role === "admin";
  return (
    <div className="storefront-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <header className="storefront-header">
        <div className="storefront-header__inner">
          <Link href="/" className="wordmark" aria-label="Scenario Shop ホーム">
            <span aria-hidden="true" className="wordmark__symbol">
              <Icon name="bag" size={18} />
            </span>
            {content.brand.storeName}
          </Link>
          <SearchCombobox loadSuggestions={loadSuggestions} />
          <nav aria-label="主要ナビゲーション" className="desktop-navigation">
            <Link
              href="/products"
              aria-current={isNavigationCurrent(pathname, "/products") ? "page" : undefined}
            >
              <Icon name="products" size={17} />
              {content.navigation.products}
            </Link>
            {isStaff ? (
              <Link
                href="/admin"
                aria-current={isNavigationCurrent(pathname, "/admin") ? "page" : undefined}
              >
                <Icon name="settings" size={17} />
                {content.navigation.admin}
              </Link>
            ) : (
              <>
                <Link
                  href="/orders"
                  aria-current={isNavigationCurrent(pathname, "/orders") ? "page" : undefined}
                >
                  <Icon name="orders" size={17} />
                  {content.navigation.orders}
                </Link>
                <Link
                  href="/account/profile"
                  aria-current={
                    isNavigationCurrent(pathname, "/account/profile") ? "page" : undefined
                  }
                >
                  <Icon name="account" size={17} />
                  {content.navigation.account}
                </Link>
                <Link
                  href="/cart"
                  aria-current={isNavigationCurrent(pathname, "/cart") ? "page" : undefined}
                >
                  <Icon name="cart" size={17} />
                  {content.navigation.cart}
                </Link>
              </>
            )}
            {currentUser !== null && <LogoutButton />}
          </nav>
          {isTestApiBuild() && (
            <span className="test-mode-badge">
              <span className="test-mode-badge__dot" aria-hidden="true" />
              {content.environment.testMode}
            </span>
          )}
        </div>
        <p className="learning-notice">{content.notice.training}</p>
      </header>
      <main id="main-content" tabIndex={-1}>
        {notice}
        {children}
      </main>
      <footer className="storefront-footer">
        <div className="storefront-footer__inner">
          <section className="storefront-footer__brand" aria-labelledby="footer-brand-heading">
            <Link href="/" className="footer-wordmark" id="footer-brand-heading">
              <span aria-hidden="true" className="wordmark__symbol">
                <Icon name="bag" size={18} />
              </span>
              {content.brand.storeName}
            </Link>
            <p>商品選びから運用まで、ECの主要シナリオを安心して学べる模擬ストアです。</p>
            <span className="footer-trust-mark">
              <Icon name="shield" size={18} />
              学習専用・実取引なし
            </span>
          </section>
          <nav aria-label="フッターナビゲーション" className="storefront-footer__navigation">
            <section>
              <h2>ショップ</h2>
              <Link href="/products">商品一覧</Link>
              <Link href="/search">商品を検索</Link>
            </section>
            <section>
              <h2>サポート</h2>
              <Link href="/guide">学習Guide</Link>
              <Link href="/legal/commerce">模擬取引について</Link>
              <Link href="/legal/privacy">データの取扱い</Link>
            </section>
            <section>
              <h2>アカウント</h2>
              {isStaff ? (
                <Link href="/admin">管理コンソール</Link>
              ) : (
                <>
                  <Link href="/orders">注文履歴</Link>
                  <Link href="/account/profile">プロフィール</Link>
                  <Link href="/cart">カート</Link>
                </>
              )}
            </section>
            <section>
              <h2>法的情報</h2>
              <Link href="/legal/terms">利用規約</Link>
              <Link href="/legal/privacy">プライバシーポリシー</Link>
              <Link href="/legal/commerce">模擬取引表示</Link>
            </section>
          </nav>
        </div>
        <div className="storefront-footer__bottom">
          <small>© 2026 Scenario Shop. 学習専用の模擬ストアです。</small>
          <small>実際の注文・決済・配送は行われません。</small>
        </div>
      </footer>
      {isStaff && currentUser !== null && (
        <div className="staff-mobile-actions">
          <Link href="/admin" className="button button--secondary">
            管理画面
          </Link>
          <LogoutButton />
        </div>
      )}
      {!isStaff && (
        <nav aria-label="モバイルナビゲーション" className="mobile-navigation">
          {(
            [
              ["/", content.navigation.home, "home"],
              ["/search", content.navigation.search, "search"],
              ["/cart", content.navigation.cart, "cart"],
              ["/orders", "注文", "orders"],
              ["/account/profile", content.navigation.account, "account"],
            ] as const
          ).map(([href, label, icon]) => (
            <Link
              href={href}
              key={href}
              aria-current={isNavigationCurrent(pathname, href) ? "page" : undefined}
            >
              <Icon name={icon as IconName} size={20} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
