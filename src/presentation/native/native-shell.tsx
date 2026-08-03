import { Link, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useNativeRuntime } from "./native-runtime-provider";
import {
  NativeButton,
  NativeStatePanel,
  nativeColors,
  nativeFontWeight,
  nativeSpacing,
  nativeTypography,
} from "./native-components";

export function NativeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, error, retry } = useNativeRuntime();
  return (
    <SafeAreaView style={shellStyles.safeArea}>
      <View style={shellStyles.header}>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            style={shellStyles.headerLink}
            testID="native-brand-home"
          >
            <Text style={shellStyles.brand}>Scenario Shop</Text>
          </Pressable>
        </Link>
        <Link href="/cart" asChild>
          <Pressable
            accessibilityRole="link"
            style={shellStyles.headerLink}
            testID="native-header-cart"
          >
            <Text style={shellStyles.cartLink}>カート</Text>
          </Pressable>
        </Link>
      </View>
      <View style={shellStyles.content}>
        {error !== null ? (
          <NativeStatePanel
            title="Native初期化に失敗しました"
            body={error.message}
            action={<NativeButton label="再試行" onPress={retry} testID="native-runtime-retry" />}
          />
        ) : (
          children
        )}
      </View>
      {ready && (
        <View style={shellStyles.bottomNav}>
          <NativeNavLink
            href="/"
            label="ホーム"
            active={pathname === "/"}
            testID="native-nav-home"
          />
          <NativeNavLink
            href="/products"
            label="商品一覧"
            active={pathname.startsWith("/products") || pathname.startsWith("/categories")}
            testID="native-nav-products"
          />
          <NativeNavLink
            href="/search"
            label="検索"
            active={pathname.startsWith("/search")}
            testID="native-nav-search"
          />
          <NativeNavLink
            href="/cart"
            label="カート"
            active={pathname.startsWith("/cart")}
            testID="native-nav-cart"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function NativeNavLink({
  href,
  label,
  active,
  testID,
}: {
  href: "/" | "/products" | "/search" | "/cart";
  label: string;
  active: boolean;
  testID: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" testID={testID} style={shellStyles.navItem}>
        <Text style={[shellStyles.navText, active && shellStyles.navTextActive]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const shellStyles = StyleSheet.create({
  safeArea: { backgroundColor: nativeColors.surface, flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: nativeColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: nativeSpacing.md,
    paddingVertical: nativeSpacing.sm,
  },
  headerLink: { justifyContent: "center", minHeight: nativeSpacing.xxxl },
  brand: {
    color: nativeColors.ink,
    fontSize: nativeTypography.heading3.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.heading3.lineHeight,
  },
  cartLink: {
    color: nativeColors.primary,
    fontSize: nativeTypography.label.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.label.lineHeight,
  },
  content: { backgroundColor: nativeColors.background, flex: 1 },
  bottomNav: {
    backgroundColor: nativeColors.surface,
    borderTopColor: nativeColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: nativeSpacing.xxs,
    paddingVertical: nativeSpacing.xs,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: nativeSpacing.xxxl,
  },
  navText: {
    color: nativeColors.muted,
    fontSize: nativeTypography.caption.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.caption.lineHeight,
  },
  navTextActive: { color: nativeColors.primary },
});
