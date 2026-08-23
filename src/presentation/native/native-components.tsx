import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native";
import type { ReactNode } from "react";
import { productImageManifest } from "@/generated/product-image-manifest";
import { nativeAssetMap } from "@/generated/native-product-assets";
import { tokens } from "@/presentation/design/tokens";

export { nativeAssetIds } from "@/generated/native-product-assets";

export const NATIVE_PLACEHOLDER_ASSET_ID = "asset-placeholder-retired";

export const nativeColors = {
  ink: tokens.color.textPrimary,
  muted: tokens.color.textSecondary,
  disabled: tokens.color.textDisabled,
  border: tokens.color.border,
  borderStrong: tokens.color.borderStrong,
  surface: tokens.color.surface,
  surfaceSubtle: tokens.color.surfaceSubtle,
  surfaceMuted: tokens.color.surfaceMuted,
  background: tokens.color.surfaceSubtle,
  primary: tokens.color.actionPrimary,
  primaryPressed: tokens.color.actionPrimaryHover,
  primarySoft: tokens.color.surfaceSubtle,
  accent: tokens.color.accentDark,
  accentOnDark: tokens.color.accentOnDark,
  sale: tokens.color.sale,
  saleBackground: tokens.color.saleBackground,
  danger: tokens.color.danger,
  success: tokens.color.success,
  successBackground: tokens.color.successBackground,
  warning: tokens.color.warning,
  info: tokens.color.info,
  inverseText: tokens.color.surface,
} as const;

export const nativeSpacing = {
  zero: tokens.spacing[0],
  xxs: tokens.spacing[1],
  xs: tokens.spacing[2],
  sm: tokens.spacing[3],
  md: tokens.spacing[4],
  lg: tokens.spacing[5],
  xl: tokens.spacing[6],
  xxl: tokens.spacing[7],
  xxxl: tokens.spacing[8],
  huge: tokens.spacing[9],
} as const;

export const nativeRadius = tokens.radius;
export const nativeTypography = tokens.typography;

export function nativeFontWeight(value: number): NonNullable<TextStyle["fontWeight"]> {
  return String(value) as NonNullable<TextStyle["fontWeight"]>;
}

export function formatNativeYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function NativeStatePanel({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.statePanel} testID="native-state-panel">
      <Text style={styles.stateTitle}>{title}</Text>
      {body !== undefined && <Text style={styles.stateBody}>{body}</Text>}
      {action}
    </View>
  );
}

export function NativeButton({
  label,
  onPress,
  variant = "primary",
  testID,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent" | "inverse";
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        variant === "ghost" && styles.buttonGhost,
        variant === "accent" && styles.buttonAccent,
        variant === "inverse" && styles.buttonInverse,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.buttonSecondaryText,
          variant === "ghost" && styles.buttonGhostText,
          variant === "accent" && styles.buttonAccentText,
          variant === "inverse" && styles.buttonInverseText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function NativeTextField({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  testID,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmitEditing?: () => void;
  testID?: string;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={nativeColors.muted}
      returnKeyType="search"
      style={styles.input}
      testID={testID}
      value={value}
    />
  );
}

export function NativeProductImage({
  assetId,
  altText,
  variant = "card",
}: {
  assetId: string;
  altText: string;
  variant?: "card" | "detail" | "thumbnail";
}) {
  const source = nativeAssetMap[assetId] ?? nativeAssetMap[NATIVE_PLACEHOLDER_ASSET_ID];
  return (
    <Image
      accessibilityLabel={altText}
      resizeMode={variant === "detail" ? "contain" : "cover"}
      source={source}
      style={[
        styles.productImage,
        variant === "detail" && styles.productImageDetail,
        variant === "thumbnail" && styles.productImageThumbnail,
      ]}
    />
  );
}

export const webAssetIds = productImageManifest.assets.map((asset) => asset.assetId);

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: nativeColors.background },
  scroll: { padding: nativeSpacing.md, paddingBottom: nativeSpacing.huge + nativeSpacing.xxl },
  heading: {
    color: nativeColors.ink,
    fontSize: nativeTypography.heading1.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading1.fontWeight),
    lineHeight: nativeTypography.heading1.lineHeight,
    marginBottom: nativeSpacing.xs,
  },
  subheading: {
    color: nativeColors.ink,
    fontSize: nativeTypography.heading3.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.heading3.lineHeight,
    marginBottom: nativeSpacing.sm,
  },
  body: {
    color: nativeColors.muted,
    fontSize: nativeTypography.body.fontSize,
    lineHeight: nativeTypography.body.lineHeight,
  },
  card: {
    backgroundColor: nativeColors.surface,
    borderColor: nativeColors.border,
    borderRadius: nativeRadius.large,
    borderWidth: 1,
    marginBottom: nativeSpacing.sm,
    overflow: "hidden",
  },
  heroCard: {
    backgroundColor: nativeColors.primary,
    borderColor: nativeColors.primary,
    borderRadius: nativeRadius.large,
    borderWidth: 1,
    marginBottom: nativeSpacing.xxl,
    overflow: "hidden",
    padding: nativeSpacing.lg,
  },
  heroEyebrow: { color: nativeColors.accentOnDark },
  heroHeading: { color: nativeColors.inverseText },
  heroBody: { color: nativeColors.surfaceMuted },
  heroImage: { marginTop: nativeSpacing.lg },
  eyebrow: {
    color: nativeColors.accent,
    fontSize: nativeTypography.label.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.label.lineHeight,
    marginBottom: nativeSpacing.xs,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: nativeSpacing.sm },
  cardBody: { padding: nativeSpacing.md },
  productImage: {
    aspectRatio: tokens.layout.productCardImageAspectRatio,
    backgroundColor: nativeColors.surfaceSubtle,
    borderRadius: nativeRadius.medium,
    height: "auto",
    maxWidth: "100%",
    width: "100%",
  },
  productImageDetail: { aspectRatio: tokens.layout.productDetailImageAspectRatio },
  productImageThumbnail: {
    height: tokens.layout.productThumbnailSize,
    width: tokens.layout.productThumbnailSize,
  },
  productName: {
    color: nativeColors.ink,
    fontSize: nativeTypography.body.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.body.lineHeight,
    marginBottom: nativeSpacing.xxs,
  },
  productMeta: {
    color: nativeColors.muted,
    fontSize: nativeTypography.caption.fontSize,
    lineHeight: nativeTypography.caption.lineHeight,
    marginBottom: nativeSpacing.xs,
  },
  stockMeta: {
    color: nativeColors.success,
    fontSize: nativeTypography.bodySmall.fontSize,
    lineHeight: nativeTypography.bodySmall.lineHeight,
    marginTop: nativeSpacing.xxs,
  },
  saleBadge: {
    alignSelf: "flex-start",
    backgroundColor: nativeColors.saleBackground,
    borderRadius: nativeRadius.small,
    color: nativeColors.sale,
    fontSize: nativeTypography.caption.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.caption.lineHeight,
    marginTop: nativeSpacing.xxs,
    paddingHorizontal: nativeSpacing.xs,
    paddingVertical: nativeSpacing.xxs,
  },
  rating: {
    color: nativeColors.muted,
    fontSize: nativeTypography.caption.fontSize,
    lineHeight: nativeTypography.caption.lineHeight,
    marginTop: nativeSpacing.xxs,
  },
  price: {
    color: nativeColors.ink,
    fontSize: nativeTypography.body.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.body.lineHeight,
  },
  regularPrice: {
    color: nativeColors.muted,
    fontSize: nativeTypography.bodySmall.fontSize,
    lineHeight: nativeTypography.bodySmall.lineHeight,
    textDecorationLine: "line-through",
  },
  salePrice: {
    color: nativeColors.sale,
    fontSize: nativeTypography.bodySmall.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.bodySmall.lineHeight,
  },
  stockMessage: {
    color: nativeColors.success,
    fontSize: nativeTypography.bodySmall.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.bodySmall.lineHeight,
    marginTop: nativeSpacing.md,
  },
  stockMessageOut: { color: nativeColors.danger },
  reviewSummary: {
    borderColor: nativeColors.border,
    borderRadius: nativeRadius.medium,
    borderWidth: 1,
    marginTop: nativeSpacing.xl,
    padding: nativeSpacing.md,
  },
  row: { alignItems: "center", flexDirection: "row", gap: nativeSpacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: nativeSpacing.sm },
  button: {
    alignItems: "center",
    borderRadius: nativeRadius.medium,
    justifyContent: "center",
    minHeight: tokens.layout.minimumTouchTarget,
    minWidth: tokens.layout.minimumTouchTarget,
    paddingHorizontal: nativeSpacing.md,
  },
  buttonPrimary: { backgroundColor: nativeColors.primary },
  buttonAccent: { backgroundColor: nativeColors.accentOnDark },
  buttonInverse: {
    backgroundColor: "transparent",
    borderColor: nativeColors.surface,
    borderWidth: 1,
  },
  buttonSecondary: {
    backgroundColor: nativeColors.primarySoft,
    borderColor: nativeColors.borderStrong,
    borderWidth: 1,
  },
  buttonDanger: { backgroundColor: nativeColors.danger },
  buttonGhost: {
    backgroundColor: "transparent",
    borderColor: nativeColors.borderStrong,
    borderWidth: 1,
  },
  buttonText: {
    color: nativeColors.inverseText,
    fontSize: nativeTypography.label.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.label.lineHeight,
  },
  buttonSecondaryText: { color: nativeColors.ink },
  buttonGhostText: { color: nativeColors.ink },
  buttonAccentText: { color: nativeColors.primary },
  buttonInverseText: { color: nativeColors.surface },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  statePanel: {
    alignItems: "center",
    backgroundColor: nativeColors.surface,
    borderColor: nativeColors.border,
    borderRadius: nativeRadius.large,
    borderWidth: 1,
    margin: nativeSpacing.md,
    padding: nativeSpacing.lg,
  },
  stateTitle: {
    color: nativeColors.ink,
    fontSize: nativeTypography.heading3.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.heading3.fontWeight),
    lineHeight: nativeTypography.heading3.lineHeight,
    marginBottom: nativeSpacing.xs,
    textAlign: "center",
  },
  stateBody: {
    color: nativeColors.muted,
    fontSize: nativeTypography.bodySmall.fontSize,
    lineHeight: nativeTypography.bodySmall.lineHeight,
    marginBottom: nativeSpacing.md,
    textAlign: "center",
  },
  input: {
    backgroundColor: nativeColors.surface,
    borderColor: nativeColors.borderStrong,
    borderRadius: nativeRadius.medium,
    borderWidth: 1,
    color: nativeColors.ink,
    flex: 1,
    fontSize: nativeTypography.body.fontSize,
    minHeight: tokens.layout.controlHeight,
    paddingHorizontal: nativeSpacing.md,
  },
  chip: {
    backgroundColor: nativeColors.primarySoft,
    borderColor: nativeColors.border,
    borderRadius: nativeRadius.pill,
    borderWidth: 1,
    minHeight: tokens.layout.minimumTouchTarget,
    paddingHorizontal: nativeSpacing.sm,
    paddingVertical: nativeSpacing.xs,
  },
  chipSelected: { backgroundColor: nativeColors.primary },
  chipText: {
    color: nativeColors.primary,
    fontSize: nativeTypography.label.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.label.lineHeight,
  },
  chipTextSelected: { color: nativeColors.inverseText },
  disabledChip: { opacity: 0.45 },
  filterLabel: {
    color: nativeColors.ink,
    fontSize: nativeTypography.label.fontSize,
    fontWeight: nativeFontWeight(nativeTypography.label.fontWeight),
    lineHeight: nativeTypography.label.lineHeight,
    marginBottom: nativeSpacing.xs,
  },
  separator: { backgroundColor: nativeColors.border, height: 1, marginVertical: nativeSpacing.md },
});
