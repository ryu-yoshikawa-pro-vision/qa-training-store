import type { AddressSuggestion } from "@/application/contracts";
import type { StaticAddressLookup } from "@/application/ports";

const ADDRESS_DICTIONARY: Readonly<Record<string, AddressSuggestion>> = {
  "1000001": {
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区千代田",
    addressLine1: "",
  },
  "1500001": {
    postalCode: "1500001",
    prefecture: "東京都",
    city: "渋谷区神宮前",
    addressLine1: "",
  },
  "5300001": {
    postalCode: "5300001",
    prefecture: "大阪府",
    city: "大阪市北区梅田",
    addressLine1: "",
  },
};

export class BundledStaticAddressLookup implements StaticAddressLookup {
  async suggest(postalCode: string): Promise<AddressSuggestion | null> {
    const digits = postalCode.replace(/\D/g, "");
    return ADDRESS_DICTIONARY[digits] ?? null;
  }
}
