import type { ReactNode } from "react";
import type { StatusTone } from "@/presentation/design/tokens";

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

export function statusTone(value: string): StatusTone {
  if (["active", "published", "succeeded", "delivered"].includes(value)) return "success";
  if (["draft", "pending_payment", "paid", "preparing", "processing"].includes(value)) {
    return "warning";
  }
  if (
    ["inactive", "suspended", "withdrawn", "payment_failed", "failed", "discontinued"].includes(
      value,
    )
  ) {
    return "danger";
  }
  if (["shipped", "gold", "platinum"].includes(value)) return "info";
  return "neutral";
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
