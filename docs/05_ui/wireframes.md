# 主要Wireframe

低精度Wireframeです。正確なSpacing、Typography、状態は`design_system.md`と`page_patterns.md`を参照します。

## 1. Home Desktop

```text
┌ Scenario Shop ───────────────── Search ───── 商品  注文履歴  アカウント  カート(2) ┐
│ [テスト環境]                                                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 毎日の暮らしに、選びやすい商品を。                         [商品を見る]          │
│ [Hero image]                                                                    │
│                                                                                  │
│ 人気のカテゴリ                                                                   │
│ [Category] [Category] [Category] [Category] [Category] [Category]                │
│                                                                                  │
│ 新着商品                                                   [すべて見る]          │
│ [Product] [Product] [Product] [Product]                                          │
│                                                                                  │
│ セール商品                                                 [すべて見る]          │
│ [Product] [Product] [Product] [Product]                                          │
│                                                                                  │
│ 会員ランク: 一般 / Gold 5%OFF / Platinum 10%OFF・送料無料                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 2. 商品一覧 Desktop

```text
商品 > すべての商品                                               123件

┌ Filters ───────┐  [Brand: A ×] [在庫あり ×] [すべて解除]     [新着順 v]
│ Category       │
│ Brand          │  [Product] [Product] [Product] [Product]
│ Price          │  [Product] [Product] [Product] [Product]
│ In stock       │
│ Sale           │  [Prev] 1 2 3 [Next]
│ Rating         │
└────────────────┘
```

## 3. 商品一覧 Mobile

```text
[Scenario Shop] [Search] [Cart 2]
商品
[Filter 3] [新着順]
[Scenario Active ×] [在庫あり ×]  →
123件
[Product] [Product]
[Product] [Product]
[Prev] 1 2 [Next]
[Home] [Search] [Cart] [Orders] [Account]
```

## 4. Search Suggestion

```text
[商品名、カテゴリ、ブランドで検索________]
┌ 商品 ──────────────────────────────┐
│ ランニングシューズ          スポーツ │
│ コンパクトタオル         ホーム・キッチン │
├ カテゴリ ──────────────────────────┤
│ スポーツ                             │
├ ブランド ──────────────────────────┤
│ Scenario Active                   │
└────────────────────────────────────┘
```

## 5. 商品詳細 Desktop

```text
商品 > スポーツ > ランニングシューズ

┌ Gallery ─────────────────┐  Scenario Active
│ [Main image]             │  ランニングシューズ
│ [t] [t] [t]              │  ★ 4.4 (28件)
└──────────────────────────┘
                              ¥8,800 → ¥7,920 税込
                              Gold会員価格 ¥7,524
                              送料無料

                              Color
                              [Black] [White] [Blue - 在庫切れ]
                              在庫あり
                              Quantity [-] 1 [+]
                              [カートに追加]

商品説明
...

レビュー 4.4 / 5
5★ █████ 18
4★ ███    7                                  [新着順 v]
[Review]
```

## 6. Checkout Desktop

```text
配送先 > 支払方法 > 注文確認

┌ Form ───────────────────────────┐   ┌ 注文内容 ─────────────┐
│ 郵便番号 [_______]              │   │ 商品小計       ¥11,840 │
│ [住所候補を入力]                │   │ 会員割引         -¥592 │
│ 都道府県 [____]                 │   │ 送料                 ¥0 │
│ 市区町村 [____________]         │   │ 合計           ¥11,248 │
│ 住所 [____________________]     │   │                     │
│ [建物名・部屋番号を入力]        │   │ [次へ進む]          │
│ 電話番号 [___________]          │   └─────────────────────┘
│ 配送に関する連絡に使用します    │
└─────────────────────────────────┘
```

## 7. 注文完了

```text
注文が完了しました
注文番号 ORD-20260726-0001
合計 ¥11,248
配送先 東京都…

次に行われること: 発送準備を開始します
[注文詳細を見る] [商品一覧へ]
```

## 8. Admin Overview

```text
┌ Scenario Shop Admin ┐  概要
│ Overview            │
│ Catalog             │  要対応
│  - Products         │  [発送準備待ち 4] [低在庫 6] [非公開Review 2]
│  - Categories       │
│  - Brands           │  最近の注文
│  - Inventory        │  [Order Table]
│ Orders              │
│ Reviews             │  Quick Actions
│ Users               │  [商品を登録] [在庫を調整] [注文を確認]
└─────────────────────┘
```

## 9. Admin Resource Index

```text
商品                                                         [商品を登録]
[Search________] [Status v] [Category v] [Brand v] [Sort v]
[公開中 ×] [Category A ×]

[ ] Product code | Product | Status | Price | Stock | Updated
[ ] ...

選択 3件: [公開] [非公開]
[Prev] 1 2 3 [Next]
```

## 10. Admin Product Edit

```text
商品 > ランニングシューズ                                   [Preview]

┌ Main 2/3 ──────────────────────┐  ┌ Aside 1/3 ───────────┐
│ 基本情報                        │  │ 公開状態 [公開中 v]   │
│ 商品名 [____________________]   │  │ Category [スポーツ v]   │
│ 説明                            │  │ Brand [Basics v]      │
│ [___________________________]   │  │ 会員制限 [なし v]    │
│                                 │  │ 更新日時 ...          │
│ Variation / Price              │  └──────────────────────┘
│ SKU M  ¥8,000  在庫5 [在庫を調整]│
│ [+ SKUを追加]                    │
│ GitHub画像Asset                  │
│ [画像を選択] [Primary] [↑] [↓] [関連解除] │
└─────────────────────────────────┘

┌ 保存していない変更があります ─────── [Preview] [変更を破棄] [保存] ┐

Danger Zone: [下書き商品を削除]
```

## 11. Mobile Product Sticky CTA

```text
[Product content]

┌─────────────────────────────────────┐
│ ¥7,920  在庫あり       [カートに追加] │
└─────────────────────────────────────┘
[Home] [Search] [Cart] [Orders] [Account]
```

## 12. Test Control

```text
TEST CONTROL
Seed [default v]
Clock [2026-07-01T10:00:00+09:00] [固定] [解除]
支払い処理Delay [500 ms]
App / Schema / Seed / Build
[Reset and load seed]
```
