import type { ReactNode } from "react";
import { Link } from "expo-router";
import { RouteGuard } from "@/presentation/guards/route-guard";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <RouteGuard access="public">
      <article className="legal-page">
        <p>
          <Link href="/">ホーム</Link> / {title}
        </p>
        <h1>{title}</h1>
        <p className="legal-page__updated">最終更新日：2026年7月1日</p>
        {children}
      </article>
    </RouteGuard>
  );
}
