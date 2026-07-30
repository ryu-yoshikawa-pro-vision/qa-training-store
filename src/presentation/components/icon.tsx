import type { ReactNode } from "react";

export type IconName =
  | "account"
  | "alert"
  | "arrow"
  | "bag"
  | "box"
  | "cart"
  | "category"
  | "external"
  | "home"
  | "inventory"
  | "orders"
  | "products"
  | "refresh"
  | "reviews"
  | "search"
  | "settings"
  | "shield"
  | "support"
  | "truck"
  | "users";

const drawings: Record<IconName, ReactNode> = {
  account: (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 20c.45-4 2.55-6 6.25-6s5.8 2 6.25 6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v4.5M12 17h.01" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  bag: (
    <>
      <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />
      <path d="M9 9V6.75a3 3 0 0 1 6 0V9" />
    </>
  ),
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2 10.5h9.5l2-7H6" />
      <circle cx="9" cy="19" r="1.25" />
      <circle cx="17" cy="19" r="1.25" />
    </>
  ),
  category: (
    <>
      <path d="M4 5.5V11l8.5 8.5 7-7L11 4H5.5A1.5 1.5 0 0 0 4 5.5Z" />
      <circle cx="8" cy="8" r="1" />
    </>
  ),
  external: (
    <>
      <path d="M13 5h6v6M19 5l-9 9" />
      <path d="M17 14v5H5V7h5" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-7 9 7" />
      <path d="M5.5 10v10h13V10M9.5 20v-6h5v6" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 7h16v13H4V7Z" />
      <path d="M3 4h18v3H3V4ZM9 11h6" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  products: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.25 11A7 7 0 0 0 6.2 6.2L4 8M5.75 13A7 7 0 0 0 17.8 17.8L20 16" />
    </>
  ),
  reviews: (
    <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z" />
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.65 2.65 8.25 7 10 4.35-1.75 7-5.35 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  support: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h3v6H5.5A1.5 1.5 0 0 1 4 17.5V13ZM20 13h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5V13ZM17 19c-.5 1.25-1.75 2-3.5 2" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3V6ZM14 10h4l3 3v4h-7v-7Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.4-3.7 2.4-5.5 6-5.5s5.6 1.8 6 5.5" />
      <path d="M15 5.5a3 3 0 0 1 0 5.5M16 14c3 0 4.6 1.7 5 5" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className === undefined ? "icon" : `icon ${className}`}
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    >
      {drawings[name]}
    </svg>
  );
}
