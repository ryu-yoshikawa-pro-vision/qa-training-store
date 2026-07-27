import type { ReactNode } from "react";
import { Link, usePathname } from "expo-router";
import type { CurrentUserDto } from "@/application/contracts";
import { content, labels } from "@/presentation/content/dictionary";
import { Icon, type IconName } from "@/presentation/components/icon";
import { LogoutButton } from "@/presentation/components/logout-button";
import { isTestApiBuild } from "@/test-controls/test-api.web";

interface AdminShellProps {
  currentUser: CurrentUserDto | null;
  children: ReactNode;
}

const baseNavigation = [
  ["/admin", "概要", "home"],
  ["/admin/products", "商品", "products"],
  ["/admin/categories", "カテゴリ", "category"],
  ["/admin/brands", "ブランド", "category"],
  ["/admin/inventories", "在庫", "inventory"],
  ["/admin/orders", "注文", "orders"],
  ["/admin/reviews", "レビュー", "reviews"],
] as const;

export function AdminShell({ currentUser, children }: AdminShellProps) {
  const pathname = usePathname();
  const navigation = [
    ...baseNavigation,
    ...(currentUser?.role === "admin" ? ([["/admin/users", "ユーザー", "users"]] as const) : []),
    ...(currentUser?.role === "admin" && isTestApiBuild()
      ? ([["/admin/test-control", "テスト制御", "settings"]] as const)
      : []),
  ];
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        本文へ移動
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-wordmark">
          <span aria-hidden="true" className="admin-wordmark__symbol">
            <Icon name="bag" size={18} />
          </span>
          <span>
            {content.brand.adminName}
            <small>Store operations</small>
          </span>
        </Link>
        {isTestApiBuild() && (
          <span className="test-mode-badge">
            <span className="test-mode-badge__dot" aria-hidden="true" />
            {content.environment.testMode}
          </span>
        )}
        <nav aria-label="管理ナビゲーション">
          {navigation.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                href === "/admin"
                  ? pathname === href
                    ? "page"
                    : undefined
                  : pathname.startsWith(href)
                    ? "page"
                    : undefined
              }
            >
              <Icon name={icon as IconName} size={19} />
              {label}
            </Link>
          ))}
        </nav>
        {currentUser !== null && (
          <div className="admin-user-card">
            <span className="admin-user-card__avatar" aria-hidden="true">
              {currentUser.displayName.slice(0, 1)}
            </span>
            <span>
              <strong>{currentUser.displayName}</strong>
              <small>{labels.role(currentUser.role)}</small>
            </span>
          </div>
        )}
        <Link href="/" className="admin-sidebar__footer-link">
          <Icon name="external" size={18} />
          ストアへ戻る
        </Link>
        <LogoutButton />
      </aside>
      <div className="admin-viewport-warning">
        <div role="status">
          <h1 aria-label="管理画面はデスクトップで利用してください">
            <span>管理画面はデスクトップで</span>
            <span>利用してください</span>
          </h1>
          <p>編集操作には1,024px以上の画面幅が必要です。</p>
        </div>
        <div className="admin-viewport-warning__actions">
          <Link href="/" className="button button--secondary">
            ストアへ戻る
          </Link>
          {currentUser !== null && <LogoutButton />}
        </div>
      </div>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
