import type { ImageAsset } from "@/domain/contracts";

export interface ProductImageAssetManifest {
  version: number;
  generatedAt: string;
  assets: ImageAsset[];
}

export const productImageManifest = {
  "version": 1,
  "generatedAt": "2026-07-27T05:20:00.000Z",
  "assets": [
    {
      "assetId": "asset-shirt-front",
      "path": "/images/products/basic-shirt-front.a1b2c3.webp",
      "defaultAltText": "ネイビーのベーシックTシャツ正面",
      "tags": [
        "ファッション",
        "Tシャツ",
        "ネイビー"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 9382,
      "sha256": "779ef98e34d928f5493ac5123edc834368a464388770a7258eaca9fb894bcd48"
    },
    {
      "assetId": "asset-shirt-back",
      "path": "/images/products/basic-shirt-back.d4e5f6.webp",
      "defaultAltText": "ネイビーのベーシックTシャツ背面",
      "tags": [
        "ファッション",
        "Tシャツ",
        "ネイビー"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 9036,
      "sha256": "506d7b20bfeb50cdce4c46837574b3e36c5e5083aa08f19311f4b998fecb5b85"
    },
    {
      "assetId": "asset-mug",
      "path": "/images/products/mug.11aa22.webp",
      "defaultAltText": "白いセラミックマグ",
      "tags": [
        "ホーム",
        "キッチン",
        "マグ"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 5652,
      "sha256": "8975b6765e99199e9542f8c8c445a2d3aac00e284a1a314e9962a4e090a4ebf2"
    },
    {
      "assetId": "asset-running-shoes",
      "path": "/images/products/running-shoes.33bb44.webp",
      "defaultAltText": "ネイビーとコーラルのランニングシューズ",
      "tags": [
        "スポーツ",
        "シューズ",
        "ランニング"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 47994,
      "sha256": "b3e6a4bf698cbabc6007e7b3a31d3e46164be35f153aedcf3ead47afcfbae4a6"
    },
    {
      "assetId": "asset-premium-bag",
      "path": "/images/products/premium-bag.webp",
      "defaultAltText": "トープ色のプレミアムバッグ",
      "tags": [
        "ファッション",
        "バッグ",
        "トープ"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 41466,
      "sha256": "268ec82d357920e495dc1de1ba8c691561c60850fb71f8ae33a20c782f3aa7b7"
    },
    {
      "assetId": "asset-compact-towel",
      "path": "/images/products/compact-towel.webp",
      "defaultAltText": "シーグリーンのコンパクトタオル",
      "tags": [
        "ホーム",
        "タオル",
        "シーグリーン"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 32048,
      "sha256": "9ae06daa68417247c94c1e00a8f5c676877e3c2b2626737f90c6b55e4a084d08"
    },
    {
      "assetId": "asset-color-pouch",
      "path": "/images/products/color-pouch.webp",
      "defaultAltText": "12色展開のカラーポーチ",
      "tags": [
        "ファッション",
        "ポーチ",
        "カラー"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 35606,
      "sha256": "39183dcc877de4dcd23983f8522bced1824cda496498a2aa85d1487d16d5ae25"
    },
    {
      "assetId": "asset-training-wear",
      "path": "/images/products/training-wear.webp",
      "defaultAltText": "ネイビーのトレーニングウェア",
      "tags": [
        "スポーツ",
        "ウェア",
        "ネイビー"
      ],
      "isActive": true,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 20738,
      "sha256": "6c11401033595b4905155d16aa84249e8f15eecda9de6a1bf6868f20fd5b00b6"
    },
    {
      "assetId": "asset-placeholder-retired",
      "path": "/images/products/retired.55cc66.webp",
      "defaultAltText": "グレーのスポーツボトル",
      "tags": [
        "スポーツ",
        "ボトル",
        "廃止"
      ],
      "isActive": false,
      "mimeType": "image/webp",
      "width": 720,
      "height": 720,
      "bytes": 4870,
      "sha256": "d9e0d0aa1b6aa4992268f5cd7edbc3214bba9d07426240acc9e9047eccae32c9"
    }
  ]
} as const satisfies ProductImageAssetManifest;
