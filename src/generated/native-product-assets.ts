import type { ImageSourcePropType } from "react-native";

export const nativeAssetMap: Record<string, ImageSourcePropType> = {
  "asset-shirt-front": require("../../public/images/products/basic-shirt-front.a1b2c3.webp"),
  "asset-shirt-back": require("../../public/images/products/basic-shirt-back.d4e5f6.webp"),
  "asset-mug": require("../../public/images/products/mug.11aa22.webp"),
  "asset-running-shoes": require("../../public/images/products/running-shoes.33bb44.webp"),
  "asset-premium-bag": require("../../public/images/products/premium-bag.webp"),
  "asset-compact-towel": require("../../public/images/products/compact-towel.webp"),
  "asset-color-pouch": require("../../public/images/products/color-pouch.webp"),
  "asset-training-wear": require("../../public/images/products/training-wear.webp"),
  "asset-placeholder-retired": require("../../public/images/products/retired.55cc66.webp"),
};

export const nativeAssetIds = Object.keys(nativeAssetMap);
