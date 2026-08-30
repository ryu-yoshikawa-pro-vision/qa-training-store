import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, router, useLocalSearchParams, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { INPUT_LIMITS } from "@/application/contracts";
import type {
  CustomerOrderDetailDto,
  OrderDetailDto,
  OrderListItem,
  ReviewEligibilityDto,
} from "@/application/contracts";
import { ApplicationError } from "@/application/errors";
import type { CheckoutSession, Review, ShippingAddressSnapshot } from "@/domain/contracts";
import {
  PAYMENT_METHODS,
  resolveCheckoutResultKind,
} from "@/application/use-cases/checkout-order-use-cases";
import { resolveCustomerLoginDestination } from "@/presentation/return-to";
import { useNativeRuntime } from "./native-runtime-provider";
import {
  NativeButton,
  NativeProductImage,
  NativeStatePanel,
  formatNativeYen,
  nativeColors,
  nativeSpacing,
  styles,
} from "./native-components";

const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const;
const CHECKOUT_RETURN_PATHS: Record<
  CheckoutSession["unlockedStep"],
  "/checkout/address" | "/checkout/payment" | "/checkout/confirm"
> = {
  address: "/checkout/address",
  payment: "/checkout/payment",
  confirm: "/checkout/confirm",
};

function usePurchaseServices() {
  const { ready, error, retry, services } = useNativeRuntime();
  return { ready, error, retry, services: ready ? services : null };
}

function RuntimePanel({
  title,
  error,
  retry,
}: {
  title: string;
  error: Error | null;
  retry: () => void;
}) {
  if (error !== null) {
    return (
      <NativeStatePanel
        title={title}
        body={error.message}
        action={<NativeButton label="再試行" onPress={retry} />}
      />
    );
  }
  return <NativeStatePanel title="読み込み中…" />;
}

function PurchaseTextInput({
  value,
  onChangeText,
  placeholder,
  testID,
  secureTextEntry = false,
  maxLength,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID: string;
  secureTextEntry?: boolean;
  maxLength?: number;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      maxLength={maxLength}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={nativeColors.muted}
      secureTextEntry={secureTextEntry}
      style={styles.input}
      testID={testID}
      value={value}
    />
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <Text
      style={[styles.body, { color: nativeColors.danger, marginTop: nativeSpacing.sm }]}
      testID="native-purchase-error"
    >
      {message}
    </Text>
  );
}

function PurchaseKeyboardScrollView({ children, testID }: { children: ReactNode; testID: string }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.page}
      testID={`${testID}-keyboard`}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        testID={testID}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function useNativeUnsavedChangesGuard(dirty: boolean, busy: boolean): void {
  const navigation = useNavigation<{ dispatch: (action: unknown) => void }>();
  usePreventRemove(dirty && !busy, ({ data }) => {
    Alert.alert("未保存の変更があります", "この画面を離れると入力中の変更が失われます。", [
      { text: "編集に戻る", style: "cancel" },
      {
        text: "変更を破棄して移動",
        style: "destructive",
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
}

export function NativeLoginScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [email, setEmail] = useState("regular@example.com");
  const [password, setPassword] = useState("testpass1");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!ready || services === null)
    return <RuntimePanel title="Loginを初期化できません" error={error} retry={retry} />;
  const submit = () => {
    setBusy(true);
    setMessage(null);
    void services.auth
      .login({ email, password })
      .then(async ({ user }) => {
        if (user.role !== "customer") {
          return router.replace("/");
        }
        const destination = await resolveCustomerLoginDestination(params.returnTo, async (step) => {
          try {
            await services.checkout.getActive(step);
            return true;
          } catch (caught) {
            if (
              caught instanceof ApplicationError &&
              (caught.code === "CHECKOUT_STEP_INCOMPLETE" ||
                caught.code === "CHECKOUT_EXPIRED" ||
                caught.code === "CART_VERSION_CHANGED")
            ) {
              return false;
            }
            throw caught;
          }
        });
        return router.replace(destination);
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <PurchaseKeyboardScrollView testID="native-login-screen">
      <Text style={styles.heading}>ログイン</Text>
      <Text style={styles.body}>会員としてCart、Checkout、注文、レビューを利用します。</Text>
      <View style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}>
        <PurchaseTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          maxLength={INPUT_LIMITS.email}
          testID="native-login-email"
        />
        <PurchaseTextInput
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          maxLength={INPUT_LIMITS.passwordMax}
          testID="native-login-password"
          secureTextEntry
        />
        <NativeButton
          label={busy ? "ログイン中…" : "ログイン"}
          onPress={submit}
          disabled={busy}
          testID="native-login-submit"
        />
      </View>
      <ErrorMessage message={message} />
      <View style={[styles.actionRow, { marginTop: nativeSpacing.lg }]}>
        <NativeButton
          label="新規登録"
          variant="secondary"
          onPress={() => router.push("/signup")}
          testID="native-go-signup"
        />
        <NativeButton
          label="Guestで続ける"
          variant="ghost"
          onPress={() => router.replace("/")}
          testID="native-login-guest"
        />
      </View>
    </PurchaseKeyboardScrollView>
  );
}

export function NativeSignupScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("testpass1");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!ready || services === null)
    return <RuntimePanel title="登録を初期化できません" error={error} retry={retry} />;
  const submit = () => {
    setBusy(true);
    setMessage(null);
    void services.auth
      .register({ email, password, displayName })
      .then(() => router.replace("/account/profile"))
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <PurchaseKeyboardScrollView testID="native-signup-screen">
      <Text style={styles.heading}>会員登録</Text>
      <View style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}>
        <PurchaseTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          maxLength={INPUT_LIMITS.email}
          testID="native-signup-email"
        />
        <PurchaseTextInput
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          maxLength={INPUT_LIMITS.passwordMax}
          testID="native-signup-password"
          secureTextEntry
        />
        <PurchaseTextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="表示名"
          maxLength={INPUT_LIMITS.displayName}
          testID="native-signup-display-name"
        />
        <NativeButton
          label={busy ? "登録中…" : "登録する"}
          onPress={submit}
          disabled={busy}
          testID="native-signup-submit"
        />
      </View>
      <ErrorMessage message={message} />
    </PurchaseKeyboardScrollView>
  );
}

export function NativeProfileScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const [profile, setProfile] = useState<Awaited<
    ReturnType<NonNullable<typeof services>["account"]["getProfile"]>
  > | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const load = useCallback(() => {
    if (services === null) return;
    setLoadError(null);
    void services.account
      .getProfile()
      .then((next) => {
        setProfile(next);
        setDisplayName(next.displayName);
        setPhone(next.phone ?? "");
      })
      .catch((caught: unknown) => setLoadError(asPurchaseError(caught)));
  }, [services]);
  useEffect(load, [load]);
  const dirty =
    profile !== null &&
    (displayName !== profile.displayName || (phone || null) !== (profile.phone ?? null));
  useNativeUnsavedChangesGuard(dirty, busy || logoutBusy);
  if (!ready || services === null)
    return <RuntimePanel title="Profileを初期化できません" error={error} retry={retry} />;
  if (loadError !== null)
    return (
      <NativeStatePanel
        title="Profileを読み込めませんでした"
        body={loadError.message}
        action={<NativeButton label="再読み込み" onPress={load} testID="native-profile-retry" />}
      />
    );
  const save = () => {
    if (profile === null) return;
    setBusy(true);
    setMessage(null);
    void services.account
      .updateProfile({ displayName, phone: phone || null, actionVersion: profile.actionVersion })
      .then((next) => {
        setProfile(next);
        setMessage("プロフィールを保存しました");
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  const logout = () => {
    setLogoutBusy(true);
    setMessage(null);
    void services.auth
      .logout()
      .then(() => router.replace("/"))
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setLogoutBusy(false));
  };
  if (profile === null) return <NativeStatePanel title="Profileを読み込み中…" />;
  return (
    <PurchaseKeyboardScrollView testID="native-profile-screen">
      <Text style={styles.heading}>アカウント</Text>
      <Text style={styles.body}>{profile.email}</Text>
      <View style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}>
        <PurchaseTextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="表示名"
          maxLength={INPUT_LIMITS.displayName}
          testID="native-profile-display-name"
        />
        <PurchaseTextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="電話番号"
          testID="native-profile-phone"
        />
        <NativeButton
          label={busy ? "保存中…" : "保存する"}
          onPress={save}
          disabled={busy || logoutBusy}
          testID="native-profile-save"
        />
      </View>
      <ErrorMessage message={message} />
      <View style={[styles.actionRow, { marginTop: nativeSpacing.lg }]}>
        <NativeButton
          label="住所を管理"
          variant="secondary"
          onPress={() => router.push("/account/addresses")}
          testID="native-profile-addresses"
        />
        <NativeButton
          label={logoutBusy ? "ログアウト中…" : "ログアウト"}
          variant="ghost"
          onPress={logout}
          disabled={busy || logoutBusy}
          testID="native-profile-logout"
        />
      </View>
    </PurchaseKeyboardScrollView>
  );
}

const emptyAddress: ShippingAddressSnapshot = {
  recipientName: "一般テスト会員",
  postalCode: "1000001",
  prefecture: "東京都",
  city: "千代田区千代田",
  addressLine1: "1-1",
  addressLine2: null,
  phone: "09000000000",
};

export function NativeAddressesScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const [addresses, setAddresses] = useState<
    Awaited<ReturnType<NonNullable<typeof services>["account"]["listAddresses"]>>
  >([]);
  const [label, setLabel] = useState("自宅");
  const [address, setAddress] = useState<ShippingAddressSnapshot>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [formBaseline, setFormBaseline] = useState({
    label: "自宅",
    address: emptyAddress,
    makeDefault: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (services !== null)
      void services.account
        .listAddresses()
        .then(setAddresses)
        .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [services]);
  useEffect(load, [load]);
  const dirty = JSON.stringify({ label, address, makeDefault }) !== JSON.stringify(formBaseline);
  useNativeUnsavedChangesGuard(dirty, busy);
  if (!ready || services === null)
    return <RuntimePanel title="住所を初期化できません" error={error} retry={retry} />;
  const resetForm = () => {
    const next = { label: "自宅", address: emptyAddress, makeDefault: false };
    setEditingId(null);
    setLabel(next.label);
    setAddress(next.address);
    setMakeDefault(next.makeDefault);
    setFormBaseline(next);
  };
  const beginEdit = (item: (typeof addresses)[number]) => {
    const nextAddress: ShippingAddressSnapshot = {
      recipientName: item.recipientName,
      postalCode: item.postalCode,
      prefecture: item.prefecture,
      city: item.city,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2,
      phone: item.phone,
    };
    const next = { label: item.label, address: nextAddress, makeDefault: item.isDefault };
    setEditingId(item.id);
    setLabel(next.label);
    setAddress(next.address);
    setMakeDefault(next.makeDefault);
    setFormBaseline(next);
    setMessage(null);
  };
  const saveAddress = () => {
    const existingAddress =
      editingId === null ? null : addresses.find((item) => item.id === editingId);
    if (existingAddress === undefined) {
      setMessage("編集対象の住所が見つかりません。再読み込みしてください。");
      return;
    }
    const existing = existingAddress;
    setBusy(true);
    setMessage(null);
    const request =
      existing === null
        ? services.account.createAddress({
            ...address,
            label,
            makeDefault: makeDefault || addresses.length === 0,
          })
        : services.account.updateAddress({
            ...address,
            label,
            addressId: existing.id,
            expectedVersion: existing.version,
            makeDefault,
          });
    void request
      .then(() => {
        setMessage(existing === null ? "住所を追加しました" : "住所を更新しました");
        resetForm();
        load();
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  const setDefault = (item: (typeof addresses)[number]) => {
    setBusy(true);
    setMessage(null);
    void services.account
      .updateAddress({
        label: item.label,
        addressId: item.id,
        expectedVersion: item.version,
        makeDefault: true,
        recipientName: item.recipientName,
        postalCode: item.postalCode,
        prefecture: item.prefecture,
        city: item.city,
        addressLine1: item.addressLine1,
        addressLine2: item.addressLine2,
        phone: item.phone,
      })
      .then(() => {
        setMessage("既定の住所を変更しました");
        load();
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <PurchaseKeyboardScrollView testID="native-addresses-screen">
      <Text style={styles.heading}>配送先住所</Text>
      {addresses.length === 0 ? (
        <Text style={styles.body} testID="native-address-empty">
          登録済みの住所はありません。
        </Text>
      ) : (
        addresses.map((item) => (
          <View key={item.id} style={styles.card} testID={`native-address-${item.id}`}>
            <View style={styles.cardBody}>
              <Text style={styles.productName}>
                {item.label}
                {item.isDefault ? "（既定）" : ""}
              </Text>
              <Text style={styles.body}>
                {item.recipientName}　〒{item.postalCode}
              </Text>
              <Text style={styles.body}>
                {item.prefecture}
                {item.city}
                {item.addressLine1}
              </Text>
              <Text style={styles.body}>{item.phone}</Text>
              <View style={styles.actionRow}>
                <NativeButton
                  label="編集"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => beginEdit(item)}
                  testID={`native-address-edit-${item.id}`}
                />
                {!item.isDefault && (
                  <NativeButton
                    label="既定にする"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => setDefault(item)}
                    testID={`native-address-default-${item.id}`}
                  />
                )}
                <NativeButton
                  label="削除"
                  variant="danger"
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void services.account
                      .deleteAddress({ addressId: item.id, expectedVersion: item.version })
                      .then(() => {
                        setMessage("住所を削除しました");
                        if (editingId === item.id) resetForm();
                        load();
                      })
                      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
                      .finally(() => setBusy(false));
                  }}
                  testID={`native-address-delete-${item.id}`}
                />
              </View>
            </View>
          </View>
        ))
      )}
      <Text style={[styles.subheading, { marginTop: nativeSpacing.lg }]}>
        {editingId === null ? "新しい住所" : "住所を編集"}
      </Text>
      <View style={{ gap: nativeSpacing.sm }}>
        <PurchaseTextInput
          value={label}
          onChangeText={setLabel}
          placeholder="住所ラベル"
          maxLength={INPUT_LIMITS.addressLabel}
          testID="native-address-label"
        />
        <PurchaseTextInput
          value={address.recipientName}
          onChangeText={(value) => setAddress({ ...address, recipientName: value })}
          placeholder="宛名"
          maxLength={INPUT_LIMITS.recipientName}
          testID="native-address-recipient"
        />
        <PurchaseTextInput
          value={address.postalCode}
          onChangeText={(value) => setAddress({ ...address, postalCode: value })}
          placeholder="郵便番号"
          testID="native-address-postal-code"
        />
        <PurchaseTextInput
          value={address.prefecture}
          onChangeText={(value) => setAddress({ ...address, prefecture: value })}
          placeholder="都道府県"
          maxLength={INPUT_LIMITS.prefecture}
          testID="native-address-prefecture"
        />
        <PurchaseTextInput
          value={address.city}
          onChangeText={(value) => setAddress({ ...address, city: value })}
          placeholder="市区町村"
          maxLength={INPUT_LIMITS.city}
          testID="native-address-city"
        />
        <PurchaseTextInput
          value={address.addressLine1}
          onChangeText={(value) => setAddress({ ...address, addressLine1: value })}
          placeholder="番地"
          maxLength={INPUT_LIMITS.addressLine1}
          testID="native-address-line1"
        />
        <PurchaseTextInput
          value={address.phone}
          onChangeText={(value) => setAddress({ ...address, phone: value })}
          placeholder="電話番号"
          testID="native-address-phone"
        />
        <NativeButton
          label={makeDefault ? "既定の住所に設定" : "既定の住所にする"}
          variant={makeDefault ? "secondary" : "ghost"}
          onPress={() => setMakeDefault((current) => !current)}
          disabled={busy}
          testID="native-address-make-default"
        />
        <NativeButton
          label={busy ? "保存中…" : editingId === null ? "住所を追加" : "住所を更新"}
          onPress={saveAddress}
          disabled={busy}
          testID={editingId === null ? "native-address-create" : "native-address-update"}
        />
        {editingId !== null && (
          <NativeButton
            label="編集を取り消す"
            variant="ghost"
            onPress={resetForm}
            disabled={busy}
            testID="native-address-cancel"
          />
        )}
      </View>
      <ErrorMessage message={message} />
    </PurchaseKeyboardScrollView>
  );
}

function useCheckoutSession(requiredStep: CheckoutSession["unlockedStep"]) {
  const { ready, error, retry, services } = usePurchaseServices();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [sessionOrigin, setSessionOrigin] = useState<"started" | "resumed" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(() => {
    if (services === null) return;
    setMessage(null);
    void services.checkout
      .getActive(requiredStep)
      .then((active) => {
        setSession(active);
        setSessionOrigin("resumed");
      })
      .catch(async (caught: unknown) => {
        if (caught instanceof ApplicationError && caught.code === "AUTHENTICATION_REQUIRED") {
          router.replace({
            pathname: "/login",
            params: { returnTo: CHECKOUT_RETURN_PATHS[requiredStep] },
          });
          return;
        }
        if (requiredStep !== "address") {
          setMessage(asPurchaseError(caught).message);
          return;
        }
        try {
          const cart = await services.cart.getCart();
          const started = await services.checkout.start({ cartVersion: cart.cartVersion });
          setSession(started.session);
          setSessionOrigin(started.result === "resumed" ? "resumed" : "started");
        } catch (startError) {
          setMessage(asPurchaseError(startError).message);
        }
      });
  }, [requiredStep, services]);
  useEffect(load, [load]);
  return {
    ready,
    error,
    retry,
    services,
    session,
    sessionOrigin,
    setSession,
    message,
    setMessage,
    reload: load,
  };
}

export function NativeCheckoutAddressScreen() {
  const state = useCheckoutSession("address");
  const [address, setAddress] = useState<ShippingAddressSnapshot>(emptyAddress);
  const [savedAddresses, setSavedAddresses] = useState<
    Awaited<ReturnType<NonNullable<typeof state.services>["account"]["listAddresses"]>>
  >([]);
  const [busy, setBusy] = useState(false);
  const services = state.services;
  const setMessage = state.setMessage;
  useEffect(() => {
    if (state.session?.addressSnapshot !== null && state.session?.addressSnapshot !== undefined)
      setAddress(state.session.addressSnapshot);
  }, [state.session]);
  useEffect(() => {
    if (services === null) return;
    void services.account
      .listAddresses()
      .then(setSavedAddresses)
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [services, setMessage]);
  if (!state.ready || services === null)
    return (
      <RuntimePanel title="Checkoutを初期化できません" error={state.error} retry={state.retry} />
    );
  const submit = () => {
    if (state.session === null) return;
    setBusy(true);
    setMessage(null);
    void services.checkout
      .setAddress({
        checkoutSessionId: state.session.id,
        checkoutExpectedVersion: state.session.version,
        address,
      })
      .then((next) => {
        state.setSession(next);
        router.push("/checkout/payment");
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <PurchaseKeyboardScrollView testID="native-checkout-address-screen">
      <Text style={styles.heading}>Checkout：配送先</Text>
      <Text style={styles.body}>Step 1 / 3</Text>
      {state.sessionOrigin === "started" && (
        <Text style={styles.productMeta} testID="native-checkout-session-started">
          Checkoutを開始しました
        </Text>
      )}
      {state.sessionOrigin === "resumed" && (
        <Text style={styles.productMeta} testID="native-checkout-session-resumed">
          Checkoutを再開しました
        </Text>
      )}
      {savedAddresses.length > 0 && (
        <View
          style={[styles.card, { marginTop: nativeSpacing.lg }]}
          testID="native-checkout-saved-addresses"
        >
          <View style={styles.cardBody}>
            <Text style={styles.subheading}>保存済みの配送先</Text>
            {savedAddresses.map((item) => (
              <NativeButton
                key={item.id}
                label={`${item.label}${item.isDefault ? "（既定）" : ""}：${item.prefecture}${item.city}${item.addressLine1}`}
                variant="secondary"
                onPress={() =>
                  setAddress({
                    recipientName: item.recipientName,
                    postalCode: item.postalCode,
                    prefecture: item.prefecture,
                    city: item.city,
                    addressLine1: item.addressLine1,
                    addressLine2: item.addressLine2,
                    phone: item.phone,
                  })
                }
                testID={`native-checkout-saved-address-${item.id}`}
              />
            ))}
          </View>
        </View>
      )}
      <View
        style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}
        testID={state.session === null ? undefined : "native-checkout-address-session-ready"}
      >
        <PurchaseTextInput
          value={address.recipientName}
          onChangeText={(value) => setAddress({ ...address, recipientName: value })}
          placeholder="宛名"
          maxLength={INPUT_LIMITS.recipientName}
          testID="native-checkout-recipient"
        />
        <PurchaseTextInput
          value={address.postalCode}
          onChangeText={(value) => setAddress({ ...address, postalCode: value })}
          placeholder="郵便番号"
          testID="native-checkout-postal-code"
        />
        <PurchaseTextInput
          value={address.prefecture}
          onChangeText={(value) => setAddress({ ...address, prefecture: value })}
          placeholder="都道府県"
          maxLength={INPUT_LIMITS.prefecture}
          testID="native-checkout-prefecture"
        />
        <PurchaseTextInput
          value={address.city}
          onChangeText={(value) => setAddress({ ...address, city: value })}
          placeholder="市区町村"
          maxLength={INPUT_LIMITS.city}
          testID="native-checkout-city"
        />
        <PurchaseTextInput
          value={address.addressLine1}
          onChangeText={(value) => setAddress({ ...address, addressLine1: value })}
          placeholder="番地"
          maxLength={INPUT_LIMITS.addressLine1}
          testID="native-checkout-line1"
        />
        <PurchaseTextInput
          value={address.phone}
          onChangeText={(value) => setAddress({ ...address, phone: value })}
          placeholder="電話番号"
          testID="native-checkout-phone"
        />
        <NativeButton
          label={busy ? "保存中…" : "次へ：支払い"}
          onPress={submit}
          disabled={busy || state.session === null}
          testID="native-checkout-address-next"
        />
      </View>
      <ErrorMessage message={state.message} />
    </PurchaseKeyboardScrollView>
  );
}

export function NativeCheckoutPaymentScreen() {
  const state = useCheckoutSession("payment");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("TEST-SUCCESS");
  const [busy, setBusy] = useState(false);
  if (!state.ready || state.services === null)
    return (
      <RuntimePanel title="支払いを初期化できません" error={state.error} retry={state.retry} />
    );
  const services = state.services;
  const submit = () => {
    if (state.session === null) return;
    setBusy(true);
    state.setMessage(null);
    void services.checkout
      .setPayment({
        checkoutSessionId: state.session.id,
        checkoutExpectedVersion: state.session.version,
        paymentMethodCode: method,
      })
      .then((next) => {
        state.setSession(next);
        router.push("/checkout/confirm");
      })
      .catch((caught: unknown) => state.setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-payment-screen">
      <Text style={styles.heading}>Checkout：支払い</Text>
      <Text style={styles.body}>Step 2 / 3　テスト決済を選択してください。</Text>
      <View
        style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}
        testID={state.session === null ? undefined : "native-checkout-payment-session-ready"}
      >
        {PAYMENT_METHODS.map((candidate) => (
          <NativeButton
            key={candidate}
            label={candidate === "TEST-SUCCESS" ? "成功" : candidate.replace("TEST-", "失敗：")}
            variant={method === candidate ? "primary" : "secondary"}
            onPress={() => setMethod(candidate)}
            testID={`native-payment-method-${candidate}`}
          />
        ))}
        <NativeButton
          label={busy ? "保存中…" : "次へ：確認"}
          onPress={submit}
          disabled={busy || state.session === null}
          testID="native-checkout-payment-next"
        />
      </View>
      <ErrorMessage message={state.message} />
    </ScrollView>
  );
}

export function NativeCheckoutConfirmScreen() {
  const state = useCheckoutSession("confirm");
  const [confirmation, setConfirmation] = useState<Awaited<
    ReturnType<NonNullable<typeof state.services>["checkout"]["getConfirmation"]>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const services = state.services;
  const setMessage = state.setMessage;
  useEffect(() => {
    if (services !== null)
      void services.checkout
        .getConfirmation()
        .then(setConfirmation)
        .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [services, setMessage]);
  if (!state.ready || services === null)
    return <RuntimePanel title="確認を初期化できません" error={state.error} retry={state.retry} />;
  const submit = () => {
    if (confirmation === null) return;
    setBusy(true);
    state.setMessage(null);
    void services.checkout
      .beginOrder({
        checkoutSessionId: confirmation.checkoutSessionId,
        checkoutActionVersion: confirmation.checkoutActionVersion,
      })
      .then((result) =>
        router.replace({ pathname: "/checkout/processing", params: { orderId: result.orderId } }),
      )
      .catch((caught: unknown) => state.setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  if (confirmation === null) return <NativeStatePanel title="注文内容を読み込み中…" />;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-confirm-screen">
      <Text style={styles.heading}>Checkout：確認</Text>
      <Text style={styles.body}>Step 3 / 3</Text>
      <View style={[styles.card, { marginTop: nativeSpacing.lg }]}>
        <View style={styles.cardBody}>
          {confirmation.items.map((item) => (
            <View key={item.variantId} style={{ marginBottom: nativeSpacing.sm }}>
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={styles.body}>
                {item.quantity}点　{formatNativeYen(item.lineTotalAmount)}
              </Text>
            </View>
          ))}
          <Text style={styles.body}>
            配送先：{confirmation.address.prefecture}
            {confirmation.address.city}
            {confirmation.address.addressLine1}
          </Text>
          <Text style={[styles.price, { marginTop: nativeSpacing.sm }]}>
            合計 {formatNativeYen(confirmation.totalAmount)}
          </Text>
        </View>
      </View>
      <NativeButton
        label={busy ? "注文処理中…" : "注文を確定する"}
        onPress={submit}
        disabled={busy}
        testID="native-checkout-confirm-submit"
      />
      <ErrorMessage message={state.message} />
    </ScrollView>
  );
}

export function NativeCheckoutProcessingScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [message, setMessage] = useState("決済を処理しています…");
  const [busy, setBusy] = useState(false);
  const resume = useCallback(() => {
    if (services === null || orderId === undefined) return;
    setBusy(true);
    setMessage("決済を処理しています…");
    void services.checkout
      .resumePayment(orderId)
      .then((result) => {
        if (result.orderStatus === "paid")
          router.replace({ pathname: "/checkout/complete", params: { orderId: result.orderId } });
        else if (result.orderStatus === "payment_failed")
          router.replace({ pathname: "/checkout/failed", params: { orderId: result.orderId } });
        else setMessage(`注文状態：${result.orderStatus}`);
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  }, [orderId, services]);
  useEffect(() => {
    if (ready) resume();
  }, [ready, resume]);
  if (!ready || services === null)
    return <RuntimePanel title="決済を初期化できません" error={error} retry={retry} />;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-processing-screen">
      <Text style={styles.heading}>支払い処理中</Text>
      <Text style={styles.body} testID="native-payment-processing-message">
        {message}
      </Text>
      <NativeButton
        label={busy ? "処理中…" : "再開する"}
        onPress={resume}
        disabled={busy}
        testID="native-payment-resume"
      />
    </ScrollView>
  );
}

export function NativeCheckoutCompleteScreen() {
  return <NativeCheckoutResultScreen />;
}

export function NativeCheckoutFailedScreen() {
  return <NativeCheckoutResultScreen />;
}

function NativeCheckoutResultScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<OrderDetailDto | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const validOrderId = typeof orderId === "string" && orderId.length > 0;
  useEffect(() => {
    if (services === null || !validOrderId) return;
    let active = true;
    setOrder(null);
    setLoadMessage(null);
    void services.checkout
      .getMyOrder(orderId)
      .then((next: OrderDetailDto) => {
        if (active) setOrder(next);
      })
      .catch((caught: unknown) => {
        if (active) setLoadMessage(asPurchaseError(caught).message);
      });
    return () => {
      active = false;
    };
  }, [orderId, services, validOrderId]);
  if (!ready || services === null)
    return <RuntimePanel title="支払い結果画面を初期化できません" error={error} retry={retry} />;
  if (!validOrderId || loadMessage !== null) {
    return <NativeCheckoutResultBoundary message={loadMessage ?? "注文IDを確認できません。"} />;
  }
  if (order === null) return <NativeStatePanel title="注文結果を読み込み中…" />;
  const kind = resolveCheckoutResultKind(order);
  if (kind === null) {
    return <NativeCheckoutResultBoundary message="注文結果を確認できません。" />;
  }
  if (kind === "complete") {
    return (
      <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-complete-screen">
        <Text style={styles.heading}>注文完了</Text>
        <Text style={styles.body}>ご注文を受け付けました。</Text>
        <Text style={styles.body} testID="native-complete-order-id">
          注文ID：{order.orderId}
        </Text>
        <NativeButton
          label="注文一覧を見る"
          onPress={() => router.replace("/orders")}
          testID="native-complete-orders"
        />
      </ScrollView>
    );
  }
  const retryPayment = () => {
    if (services === null) return;
    setRetryMessage(null);
    setBusy(true);
    void services.checkout
      .retryPayment({
        orderId: order.orderId,
        orderActionVersion: order.orderActionVersion,
        methodCode: "TEST-SUCCESS",
      })
      .then((result) =>
        router.replace({ pathname: "/checkout/processing", params: { orderId: result.orderId } }),
      )
      .catch((caught: unknown) => setRetryMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-failed-screen">
      <Text style={styles.heading}>支払いに失敗しました</Text>
      <Text style={styles.body}>支払い方法を確認して再試行できます。</Text>
      <NativeButton
        label={busy ? "再試行中…" : "成功テストで再試行"}
        onPress={retryPayment}
        disabled={busy}
        testID="native-payment-retry"
      />
      <ErrorMessage message={retryMessage} />
    </ScrollView>
  );
}

function NativeCheckoutResultBoundary({ message }: { message: string }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-checkout-result-boundary">
      <NativeStatePanel
        title="支払い結果を確認できません"
        body={message}
        action={
          <NativeButton
            label="注文一覧を見る"
            onPress={() => router.replace("/orders")}
            testID="native-result-orders"
          />
        }
      />
    </ScrollView>
  );
}

export function NativeOrdersScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(() => {
    if (services !== null)
      void services.checkout
        .listMyOrders()
        .then((result) => setOrders(result.items))
        .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [services]);
  useEffect(load, [load]);
  if (!ready || services === null)
    return <RuntimePanel title="注文一覧を初期化できません" error={error} retry={retry} />;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-orders-screen">
      <Text style={styles.heading}>注文一覧</Text>
      {orders === null ? (
        <NativeStatePanel title="注文を読み込み中…" />
      ) : orders.length === 0 ? (
        <NativeStatePanel title="注文はありません" body="購入した注文がここに表示されます。" />
      ) : (
        orders.map((order) => (
          <Link key={order.orderId} href={`/orders/${order.orderId}`} asChild>
            <Pressable style={styles.card} testID={`native-order-${order.orderId}`}>
              <View style={styles.cardBody}>
                <Text style={styles.productName}>{order.orderNumber}</Text>
                <Text style={styles.body}>
                  {order.status}　{formatNativeYen(order.totalAmount)}
                </Text>
                <Text style={styles.productMeta}>
                  {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))
      )}
      <ErrorMessage message={message} />
    </ScrollView>
  );
}

export function NativeOrderDetailScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<CustomerOrderDetailDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(() => {
    if (services !== null && orderId !== undefined)
      void services.checkout
        .getMyCustomerOrder(orderId)
        .then(setOrder)
        .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [orderId, services]);
  useEffect(load, [load]);
  if (!ready || services === null)
    return <RuntimePanel title="注文詳細を初期化できません" error={error} retry={retry} />;
  if (order === null)
    return (
      <ScrollView contentContainerStyle={styles.scroll} testID="native-order-detail-screen">
        <NativeStatePanel title="注文詳細を読み込み中…" />
        <ErrorMessage message={message} />
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="native-order-detail-screen">
      <Text style={styles.heading}>{order.orderNumber}</Text>
      <Text style={styles.body} testID="native-order-status">
        注文状態：{order.orderStatus}
      </Text>
      <Text style={[styles.price, { marginTop: nativeSpacing.sm }]}>
        合計 {formatNativeYen(order.totalAmount)}
      </Text>
      <View style={[styles.card, { marginTop: nativeSpacing.lg }]} testID="native-order-amounts">
        <View style={styles.cardBody}>
          <Text style={styles.subheading}>価格Snapshot</Text>
          <Text style={styles.body} testID="native-order-subtotal">
            商品小計：{formatNativeYen(order.subtotalAmount)}
          </Text>
          <Text style={styles.body}>割引：{formatNativeYen(order.discountAmount)}</Text>
          <Text style={styles.body}>送料：{formatNativeYen(order.shippingAmount)}</Text>
          <Text style={styles.productMeta}>会員ランク：{order.membershipRankSnapshot}</Text>
        </View>
      </View>
      <View
        style={[styles.card, { marginTop: nativeSpacing.md }]}
        testID="native-order-shipping-address"
      >
        <View style={styles.cardBody}>
          <Text style={styles.subheading}>配送先Snapshot</Text>
          <Text style={styles.body}>{order.shippingAddress.recipientName}</Text>
          <Text style={styles.body}>〒{order.shippingAddress.postalCode}</Text>
          <Text style={styles.body}>
            {order.shippingAddress.prefecture}
            {order.shippingAddress.city}
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ?? ""}
          </Text>
          <Text style={styles.body}>{order.shippingAddress.phone}</Text>
        </View>
      </View>
      <View style={[styles.card, { marginTop: nativeSpacing.md }]} testID="native-order-payment">
        <View style={styles.cardBody}>
          <Text style={styles.subheading}>Payment Status</Text>
          {order.paymentAttempts.length === 0 ? (
            <Text style={styles.body}>決済試行はありません。</Text>
          ) : (
            order.paymentAttempts.map((attempt) => (
              <Text
                key={attempt.attemptNumber}
                style={styles.body}
                testID={`native-order-payment-status-${attempt.attemptNumber}`}
              >
                試行{attempt.attemptNumber}：{attempt.status}
                {attempt.errorDisplayKey === null ? "" : `（${attempt.errorDisplayKey}）`}
              </Text>
            ))
          )}
        </View>
      </View>
      <View style={[styles.card, { marginTop: nativeSpacing.md }]} testID="native-order-shipment">
        <View style={styles.cardBody}>
          <Text style={styles.subheading}>Shipment Status</Text>
          {order.shipment === null ? (
            <Text style={styles.body}>配送情報はありません。</Text>
          ) : (
            <>
              <Text style={styles.body} testID="native-order-shipment-status">
                配送状態：{order.shipment.status}
              </Text>
              {order.shipment.carrierName !== null && (
                <Text style={styles.body}>配送会社：{order.shipment.carrierName}</Text>
              )}
              {order.shipment.trackingNumber !== null && (
                <Text style={styles.body}>追跡番号：{order.shipment.trackingNumber}</Text>
              )}
            </>
          )}
        </View>
      </View>
      <View style={{ marginTop: nativeSpacing.lg }}>
        {order.items.map((item) => (
          <View
            key={item.orderItemId}
            style={styles.card}
            testID={`native-order-item-${item.orderItemId}`}
          >
            <View style={styles.cardBody}>
              <NativeProductImage
                assetId={item.image.assetId}
                altText={item.image.altText}
                variant="thumbnail"
              />
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={styles.productMeta}>
                商品コード：{item.productCode}　SKU：{item.sku}
              </Text>
              {(item.variationName !== null || item.optionValue !== null) && (
                <Text style={styles.productMeta}>
                  {item.variationName ?? "Variation"}：{item.optionValue ?? item.sku}
                </Text>
              )}
              <Text style={styles.body}>
                {item.quantity}点　単価 {formatNativeYen(item.unitFinalPrice)}　 商品小計{" "}
                {formatNativeYen(item.lineSubtotalAmount)}
              </Text>
              <Text style={styles.body}>
                割引 {formatNativeYen(item.lineDiscountAmount)}　合計{" "}
                {formatNativeYen(item.lineTotalAmount)}
              </Text>
              {item.reviewState === "NOT_POSTED" && (
                <NativeButton
                  label="レビューを書く"
                  variant="secondary"
                  onPress={() => router.push(`/reviews/${item.orderItemId}`)}
                  testID={`native-order-review-${item.orderItemId}`}
                />
              )}
              {item.reviewState !== "NOT_POSTED" && (
                <Text style={styles.productMeta}>レビュー状態：{item.reviewState}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <NativeButton
        label="注文一覧へ"
        variant="ghost"
        onPress={() => router.replace("/orders")}
        testID="native-order-back"
      />
    </ScrollView>
  );
}

export function NativeReviewScreen() {
  const { ready, error, retry, services } = usePurchaseServices();
  const { orderItemId } = useLocalSearchParams<{ orderItemId: string }>();
  const [eligibility, setEligibility] = useState<ReviewEligibilityDto | null>(null);
  const [rating, setRating] = useState<Review["rating"]>(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (services !== null && orderItemId !== undefined)
      void services.reviews
        .getEligibility(orderItemId)
        .then((next) => {
          setEligibility(next);
          if (next.existingReview !== null) {
            setRating(next.existingReview.rating);
            setTitle(next.existingReview.title ?? "");
            setBody(next.existingReview.body);
          }
        })
        .catch((caught: unknown) => setMessage(asPurchaseError(caught).message));
  }, [orderItemId, services]);
  useEffect(load, [load]);
  if (!ready || services === null)
    return <RuntimePanel title="レビューを初期化できません" error={error} retry={retry} />;
  if (eligibility === null)
    return (
      <ScrollView contentContainerStyle={styles.scroll} testID="native-review-screen">
        <NativeStatePanel title="レビュー状態を読み込み中…" />
        <ErrorMessage message={message} />
      </ScrollView>
    );
  const existing = eligibility.existingReview;
  const save = () => {
    if (!eligibility.eligible || orderItemId === undefined) return;
    setBusy(true);
    setMessage(null);
    const request =
      existing === null
        ? services.reviews.create({
            orderItemId,
            rating,
            title: title || null,
            body,
          })
        : services.reviews.update({
            reviewId: existing.reviewId,
            expectedVersion: existing.version,
            rating,
            title: title || null,
            body,
          });
    void request
      .then(() => {
        setMessage("レビューを保存しました");
        load();
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (existing === null) return;
    setBusy(true);
    void services.reviews
      .delete({ reviewId: existing.reviewId, expectedVersion: existing.version })
      .then(() => {
        setMessage("レビューを削除しました");
        load();
      })
      .catch((caught: unknown) => setMessage(asPurchaseError(caught).message))
      .finally(() => setBusy(false));
  };
  return (
    <PurchaseKeyboardScrollView testID="native-review-screen">
      <Text style={styles.heading}>レビュー</Text>
      <Text style={styles.body}>{eligibility.productName ?? "注文商品"}</Text>
      {!eligibility.eligible && (
        <NativeStatePanel
          title="レビューを投稿できません"
          body={eligibility.reason ?? "対象外です"}
        />
      )}
      {eligibility.eligible && (
        <View style={{ gap: nativeSpacing.sm, marginTop: nativeSpacing.lg }}>
          {existing !== null && (
            <Text style={styles.productMeta}>既存レビューを編集できます。</Text>
          )}
          <Text style={styles.subheading}>評価：{rating}</Text>
          <View style={styles.actionRow}>
            {REVIEW_RATINGS.map((value) => (
              <NativeButton
                key={value}
                label={`★${value}`}
                variant={rating === value ? "primary" : "secondary"}
                onPress={() => setRating(value)}
                testID={`native-review-rating-${value}`}
              />
            ))}
          </View>
          <PurchaseTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タイトル（任意）"
            maxLength={INPUT_LIMITS.reviewTitle}
            testID="native-review-title"
          />
          <PurchaseTextInput
            value={body}
            onChangeText={setBody}
            placeholder="レビュー本文"
            maxLength={INPUT_LIMITS.reviewBody}
            testID="native-review-body"
          />
          <NativeButton
            label={busy ? "保存中…" : existing === null ? "投稿する" : "更新する"}
            onPress={save}
            disabled={busy}
            testID="native-review-save"
          />
          {existing !== null && (
            <NativeButton
              label="削除する"
              variant="danger"
              onPress={remove}
              disabled={busy}
              testID="native-review-delete"
            />
          )}
        </View>
      )}
      <ErrorMessage message={message} />
    </PurchaseKeyboardScrollView>
  );
}

function asPurchaseError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error(String(caught));
}
