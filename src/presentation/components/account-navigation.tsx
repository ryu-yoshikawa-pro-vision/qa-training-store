import { Link } from "expo-router";
import { Icon, type IconName } from "@/presentation/components/icon";

type AccountSection = "profile" | "addresses" | "orders";

const items: {
  id: AccountSection;
  href: "/account/profile" | "/account/addresses" | "/orders";
  label: string;
  icon: IconName;
}[] = [
  { id: "profile", href: "/account/profile", label: "プロフィール", icon: "account" },
  { id: "addresses", href: "/account/addresses", label: "配送先", icon: "truck" },
  { id: "orders", href: "/orders", label: "注文履歴", icon: "orders" },
];

export function AccountNavigation({ current }: { current: AccountSection }) {
  return (
    <nav className="account-navigation" aria-label="アカウントメニュー">
      {items.map((item) => (
        <Link
          href={item.href}
          key={item.href}
          aria-current={current === item.id ? "page" : undefined}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
