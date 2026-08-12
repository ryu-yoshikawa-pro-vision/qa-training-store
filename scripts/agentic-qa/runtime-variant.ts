import { runtimeVariantSchema, type Challenge, type RuntimeVariant } from "./contracts";

export const RUNTIME_VARIANT_REGISTRY = {
  "web-chromium-desktop-v1": {
    schema_version: 1,
    runtime_variant_id: "web-chromium-desktop-v1",
    platform: "web",
    browser_engine: "chromium",
    viewport_or_device: "desktop",
    viewport: { width: 1280, height: 720, device_scale_factor: 1, is_mobile: false },
  },
  "web-chromium-tablet-v1": {
    schema_version: 1,
    runtime_variant_id: "web-chromium-tablet-v1",
    platform: "web",
    browser_engine: "chromium",
    viewport_or_device: "tablet",
    viewport: { width: 1024, height: 768, device_scale_factor: 1, is_mobile: false },
  },
  "web-chromium-mobile-v1": {
    schema_version: 1,
    runtime_variant_id: "web-chromium-mobile-v1",
    platform: "web",
    browser_engine: "chromium",
    viewport_or_device: "mobile",
    viewport: { width: 390, height: 844, device_scale_factor: 1, is_mobile: true },
  },
} as const satisfies Record<string, RuntimeVariant>;

const viewportKind = (value: string): RuntimeVariant["viewport_or_device"] => {
  if (value === "desktop" || value === "tablet" || value === "mobile") return value;
  throw new Error(`Unsupported Official Web viewport: ${value}`);
};

export function getRuntimeVariant(runtimeVariantId: string): RuntimeVariant {
  const value = RUNTIME_VARIANT_REGISTRY[runtimeVariantId as keyof typeof RUNTIME_VARIANT_REGISTRY];
  if (value === undefined) throw new Error(`Unknown runtime variant: ${runtimeVariantId}`);
  return runtimeVariantSchema.parse(value);
}

export function runtimeVariantIdForChallenge(challenge: Challenge): string {
  const coverageKinds = challenge.required_coverage.map((coverage) =>
    viewportKind(coverage.viewport_or_device),
  );
  const first = coverageKinds[0];
  if (first === undefined || coverageKinds.some((kind) => kind !== first))
    throw new Error("Official v1 requires one consistent viewport for all required coverage");
  return `web-chromium-${first}-v1`;
}

export function assertRuntimeVariantMatchesChallenge(
  challenge: Challenge,
  runtimeVariant: RuntimeVariant,
): void {
  if (runtimeVariant.platform !== challenge.target_platform)
    throw new Error("Runtime Variant platform does not match the Challenge platform");
  for (const coverage of challenge.required_coverage) {
    if (coverage.platform !== runtimeVariant.platform)
      throw new Error(`Coverage ${coverage.coverage_id} platform differs from Runtime Variant`);
    if (viewportKind(coverage.viewport_or_device) !== runtimeVariant.viewport_or_device)
      throw new Error(`Coverage ${coverage.coverage_id} viewport differs from Runtime Variant`);
  }
}

export function assertActualViewportMatchesVariant(
  actual: Pick<RuntimeVariant, "platform" | "browser_engine" | "viewport_or_device" | "viewport">,
  expected: RuntimeVariant,
): void {
  if (
    actual.platform !== expected.platform ||
    actual.browser_engine !== expected.browser_engine ||
    actual.viewport_or_device !== expected.viewport_or_device ||
    actual.viewport.width !== expected.viewport.width ||
    actual.viewport.height !== expected.viewport.height ||
    actual.viewport.device_scale_factor !== expected.viewport.device_scale_factor ||
    actual.viewport.is_mobile !== expected.viewport.is_mobile
  )
    throw new Error("Host-reported browser configuration does not match Runtime Variant");
}
