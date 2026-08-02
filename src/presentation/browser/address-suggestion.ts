import type { AddressSuggestion } from "@/application/contracts";

export interface AddressSuggestionFields {
  prefecture: string;
  city: string;
  addressLine1: string;
}

export function mergeAddressSuggestion(
  current: AddressSuggestionFields,
  suggestion: AddressSuggestion,
): AddressSuggestionFields & { addressLine1Retained: boolean } {
  const addressLine1Retained = current.addressLine1.trim().length > 0;
  return {
    prefecture: suggestion.prefecture,
    city: suggestion.city,
    addressLine1: addressLine1Retained ? current.addressLine1 : suggestion.addressLine1,
    addressLine1Retained,
  };
}
