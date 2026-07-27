import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`button button--${variant} ${props.className ?? ""}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? "処理中" : children}
    </button>
  );
}
