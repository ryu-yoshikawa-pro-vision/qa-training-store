export function normalizeComparisonText(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSearchText(value: string): string {
  return normalizeComparisonText(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase();
}

export function normalizeCode(value: string): string {
  const normalized = value.trim().normalize("NFKC").toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    throw new TypeError("Code must contain only A-Z, 0-9, underscore, or hyphen");
  }
  return normalized;
}

export function projectOptionScopeKey(input: {
  id: string;
  isActive: boolean;
  optionValue: string | null;
}): string {
  if (!input.isActive) {
    return `__INACTIVE__:${input.id}`;
  }
  if (input.optionValue === null) {
    return "__SINGLE_ACTIVE__";
  }
  const normalized = normalizeComparisonText(input.optionValue);
  if (normalized.length === 0) {
    throw new TypeError("Active variation option must not be empty");
  }
  return normalized;
}
