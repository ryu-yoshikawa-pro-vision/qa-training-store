import { useCallback, type ReactNode } from "react";
import { Link, usePathname } from "expo-router";
import type { CurrentUserDto } from "@/application/contracts";
import { content } from "@/presentation/content/dictionary";
import { SearchCombobox, type SearchSuggestion } from "@/presentation/components/search-combobox";
import { useApplicationServices } from "@/presentation/hooks/use-application-services";

interface StorefrontShellProps {
  currentUser: CurrentUserDto | null;
  children: ReactNode;
}

export function StorefrontShell({ currentUser, children }: StorefrontShellProps) {
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
              □
            </span>
            {content.brand.storeName}
          </Link>
          <SearchCombobox loadSuggestions={loadSuggestions} />
          <nav aria-label="主要ナビゲーション" className="desktop-navigation">
            <Link href="/products">{content.navigation.products}</Link>
            {isStaff ? (
              <Link href="/admin">{content.navigation.admin}</Link>
            ) : (
              <>
                <Link href="/orders">{content.navigation.orders}</Link>
                <Link href="/account/profile">{content.navigation.account}</Link>
                <Link href="/cart">{content.navigation.cart}</Link>
              </>
            )}
          </nav>
          <span className="test-mode-badge">{content.environment.testMode}</span>
        </div>
        <p className="learning-notice">{content.notice.training}</p>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="storefront-footer">
        <nav aria-label="法的情報">
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/legal/commerce">模擬取引表示</Link>
        </nav>
        <small>© 2026 Scenario Shop — 学習専用の模擬ストア</small>
      </footer>
      {!isStaff && (
        <nav aria-label="モバイルナビゲーション" className="mobile-navigation">
          {(
            [
              ["/", content.navigation.home],
              ["/search", content.navigation.search],
              ["/cart", content.navigation.cart],
              ["/orders", "注文"],
              ["/account/profile", content.navigation.account],
            ] as const
          ).map(([href, label]) => (
            <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}>
              <span aria-hidden="true">○</span>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
