import { Link, Redirect, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { buildLoginHref } from "@/presentation/return-to";

export function NativeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, error, retry, services } = useNativeRuntime();
  const [currentUser, setCurrentUser] = useState<Awaited<
    ReturnType<NonNullable<typeof services>["auth"]["getCurrentUser"]>
  > | null>(null);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [logoutError, setLogoutError] = useState<Error | null>(null);
  const refreshSerial = useRef(0);
  const mounted = useRef(true);
  const refreshCurrentUser = useCallback(() => {
    const requestId = ++refreshSerial.current;
    if (!services) {
      if (!mounted.current || requestId !== refreshSerial.current) return;
      setCurrentUser(null);
      setCurrentUserLoaded(false);
      return;
    }
    void services.auth
      .getCurrentUser()
      .then((next) => {
        if (!mounted.current || requestId !== refreshSerial.current) return;
        setCurrentUser(next);
        setCurrentUserLoaded(true);
      })
      .catch(() => {
        if (!mounted.current || requestId !== refreshSerial.current) return;
        setCurrentUser(null);
        setCurrentUserLoaded(true);
      });
  }, [services]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    refreshCurrentUser();
  }, [pathname, refreshCurrentUser]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshCurrentUser();
    });
    return () => subscription?.remove();
  }, [refreshCurrentUser]);
  const unsupportedRole =
    currentUserLoaded && currentUser !== null && currentUser.role !== "customer";
  const guestCustomerRoute =
    currentUserLoaded && currentUser === null && isNativeCustomerOnlyRoute(pathname);
  const logoutUnsupportedRole = () => {
    if (services === null) return;
    setLogoutError(null);
    refreshSerial.current += 1;
    void services.auth
      .logout()
      .then(() => {
        if (!mounted.current) return;
        setCurrentUser(null);
        setCurrentUserLoaded(true);
      })
      .catch((caught: unknown) => {
        if (!mounted.current) return;
        setLogoutError(caught instanceof Error ? caught : new Error("ログアウトに失敗しました"));
        refreshCurrentUser();
      });
  };
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
        <View style={shellStyles.headerActions}>
          {currentUserLoaded && !unsupportedRole && (
            <Link href="/cart" asChild>
              <Pressable
                accessibilityRole="link"
                style={shellStyles.headerLink}
                testID="native-header-cart"
              >
                <Text style={shellStyles.cartLink}>カート</Text>
              </Pressable>
            </Link>
          )}
          {!currentUserLoaded ? (
            <Text style={shellStyles.cartLink} testID="native-session-loading">
              確認中…
            </Text>
          ) : unsupportedRole ? (
            <NativeButton
              label="ログアウト"
              variant="ghost"
              onPress={logoutUnsupportedRole}
              testID="native-role-logout"
            />
          ) : (
            <Link href={currentUser === null ? "/login" : "/account/profile"} asChild>
              <Pressable
                accessibilityRole="link"
                style={shellStyles.headerLink}
                testID="native-header-account"
              >
                <Text style={shellStyles.cartLink}>
                  {currentUser === null ? "ログイン" : "アカウント"}
                </Text>
              </Pressable>
            </Link>
          )}
        </View>
      </View>
      <View style={shellStyles.content}>
        {error !== null ? (
          <NativeStatePanel
            title="Native初期化に失敗しました"
            body={error.message}
            action={<NativeButton label="再試行" onPress={retry} testID="native-runtime-retry" />}
          />
        ) : !currentUserLoaded ? (
          <NativeStatePanel title="Sessionを確認中…" />
        ) : unsupportedRole ? (
          <NativeStatePanel
            title="このRoleはNative Customerの対象外です"
            body={
              logoutError === null
                ? "Nativeでは購入者向け画面だけを利用できます。ログアウトしてください。"
                : `ログアウトに失敗しました。Sessionを再確認しています。${logoutError.message}`
            }
          />
        ) : guestCustomerRoute ? (
          <Redirect href={buildLoginHref(pathname)} />
        ) : (
          children
        )}
      </View>
      {ready && currentUserLoaded && !unsupportedRole && (
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
          {currentUser !== null && (
            <NativeNavLink
              href="/orders"
              label="注文"
              active={pathname.startsWith("/orders")}
              testID="native-nav-orders"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function isNativeCustomerOnlyRoute(pathname: string): boolean {
  return (
    pathname === "/account/profile" ||
    pathname === "/account/addresses" ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname.startsWith("/reviews/") ||
    pathname === "/checkout/address" ||
    pathname === "/checkout/payment" ||
    pathname === "/checkout/confirm" ||
    pathname === "/checkout/processing" ||
    pathname === "/checkout/complete" ||
    pathname === "/checkout/failed"
  );
}

function NativeNavLink({
  href,
  label,
  active,
  testID,
}: {
  href: "/" | "/products" | "/search" | "/cart" | "/orders";
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
  headerActions: { alignItems: "center", flexDirection: "row", gap: nativeSpacing.sm },
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
