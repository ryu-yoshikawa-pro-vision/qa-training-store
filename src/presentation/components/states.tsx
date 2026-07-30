import type { ReactNode } from "react";
import { Link } from "expo-router";
import { content } from "@/presentation/content/dictionary";
import { Icon, type IconName } from "@/presentation/components/icon";

export type StateKind =
  | "loading"
  | "empty"
  | "filter-empty"
  | "error"
  | "conflict"
  | "not-found"
  | "forbidden";

interface StatePanelProps {
  kind: StateKind;
  title?: string;
  body?: string;
  action?: ReactNode | null;
}

const defaultCopy: Record<StateKind, { title: string; body: string }> = {
  loading: {
    title: content.state.loadingTitle,
    body: content.state.loadingBody,
  },
  empty: {
    title: content.state.emptyTitle,
    body: "最初のデータを登録すると、ここに表示されます。",
  },
  "filter-empty": {
    title: content.state.filterEmptyTitle,
    body: content.state.filterEmptyBody,
  },
  error: {
    title: content.state.errorTitle,
    body: "時間をおいて、もう一度お試しください。",
  },
  conflict: {
    title: content.state.conflictTitle,
    body: "入力内容を確認して、最新情報を読み込んでください。",
  },
  "not-found": {
    title: content.state.notFoundTitle,
    body: "URLが正しいか確認するか、ホームへ戻ってください。",
  },
  forbidden: {
    title: content.state.forbiddenTitle,
    body: "ログイン中のアカウントでは、この操作を利用できません。",
  },
};

export function StatePanel({ kind, title, body, action }: StatePanelProps) {
  const copy = defaultCopy[kind];
  const icon: IconName =
    kind === "loading" ? "refresh" : kind === "empty" || kind === "filter-empty" ? "box" : "alert";
  const resolvedAction =
    action === undefined && kind !== "loading" ? (
      <Link href="/" className="button button--secondary">
        {content.action.backHome}
      </Link>
    ) : (
      action
    );
  return (
    <section
      className={`state-panel state-panel--${kind}`}
      role={kind === "loading" ? "status" : undefined}
      aria-live={kind === "loading" ? "polite" : undefined}
      aria-busy={kind === "loading" ? true : undefined}
    >
      <span className="state-panel__icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      <h1>{title ?? copy.title}</h1>
      <p>{body ?? copy.body}</p>
      {resolvedAction}
    </section>
  );
}
