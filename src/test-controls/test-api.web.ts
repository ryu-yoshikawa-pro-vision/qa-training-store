import type {
  OrderInspection,
  ReviewSummaryInspection,
  TestMetadata,
  VariantInspection,
} from "@/application/contracts";
import type { TestControlService } from "./test-control-service";

export interface TestApi {
  reset(input: { scenario: string }): Promise<TestMetadata>;
  setClock(iso: string | null): Promise<TestMetadata>;
  setPaymentDelay(milliseconds: number): Promise<TestMetadata>;
  getMetadata(): Promise<TestMetadata>;
  inspectOrder(orderId: string): Promise<OrderInspection>;
  inspectVariant(variantId: string): Promise<VariantInspection>;
  inspectReviewSummary(productId: string): Promise<ReviewSummaryInspection>;
}

export function isTestApiBuild(
  buildKind: string = process.env.EXPO_PUBLIC_BUILD_KIND ?? "local",
): boolean {
  return buildKind === "automation" || buildKind === "local";
}

export function installTestApi(
  service: TestControlService,
  buildKind = process.env.EXPO_PUBLIC_BUILD_KIND ?? "local",
): TestApi | null {
  if (typeof window === "undefined" || !isTestApiBuild(buildKind)) {
    return null;
  }
  const api: TestApi = {
    reset: (input) => service.reset(input),
    setClock: (iso) => service.setClock(iso),
    setPaymentDelay: (milliseconds) => service.setPaymentDelay(milliseconds),
    getMetadata: () => service.getMetadata(),
    inspectOrder: (orderId) => service.inspectOrder(orderId),
    inspectVariant: (variantId) => service.inspectVariant(variantId),
    inspectReviewSummary: (productId) => service.inspectReviewSummary(productId),
  };
  window.__TEST_API__ = api;
  return api;
}
