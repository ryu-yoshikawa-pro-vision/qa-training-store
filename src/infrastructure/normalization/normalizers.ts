import type { EmailNormalizer, SearchTextNormalizer } from "@/application/ports";
import { normalizeEmail, normalizeSearchText } from "@/domain/services/normalization";

export class DefaultEmailNormalizer implements EmailNormalizer {
  normalize(email: string): string {
    return normalizeEmail(email);
  }
}

export class DefaultSearchTextNormalizer implements SearchTextNormalizer {
  normalize(value: string): string {
    return normalizeSearchText(value);
  }
}
