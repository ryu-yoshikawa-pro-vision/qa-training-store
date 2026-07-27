import type { ReactNode } from "react";
import { Link, usePathname } from "expo-router";
import type { CurrentUserDto } from "@/application/contracts";
import { content } from "@/presentation/content/dictionary";
import { isTestApiBuild } from "@/test-controls/test-api.web";

interface AdminShellProps {
  currentUser: CurrentUserDto | null;
  children: ReactNode;
}

const baseNavigation = [
  ["/admin", "概要"],
  ["/admin/products", "商品"],
  ["/admin/categories", "カテゴリ"],
  ["/admin/brands", "ブランド"],
  ["/admin/inventories", "在庫"],
  ["/admin/orders", "注文"],
  ["/admin/reviews", "レビュー"],
] as const;

export function AdminShell({ currentUser, children }: AdminShellProps) {
  const pathname = usePathname();
  const navigation = [
    ...baseNavigation,
    ...(currentUser?.role === "admin" ? ([["/admin/users", "ユーザー"]] as const) : []),
    ...(currentUser?.role === "admin" && isTestApiBuild()
      ? ([["/admin/test-control", "テスト制御"]] as const)
      : []),
  ];
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        本文へ移動
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-wordmark">
          {content.brand.adminName}
        </Link>
        <span className="test-mode-badge">{content.environment.testMode}</span>
        <nav aria-label="管理ナビゲーション">
          {navigation.map(([href, label]) => (
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
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/">ストアへ戻る</Link>
      </aside>
      <div className="admin-viewport-warning" role="status">
        <h1>管理画面はデスクトップで利用してください</h1>
        <p>編集操作には1,024px以上の画面幅が必要です。</p>
        <Link href="/">ストアへ戻る</Link>
      </div>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
