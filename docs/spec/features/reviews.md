# レビュー

## 目的・対象範囲

配達完了となった注文に対するカスタマーレビューの投稿資格、投稿・編集・削除、公開／非公開状態、および商品サマリーの仕様を定義します。

## ビジネスルール

### BR-REVIEW-001 — 配達完了注文の本人明細のみがレビュー対象となる

カスタマー本人の配達完了となった注文明細に対して1件のみ作成でき、削除後も同一の注文明細へ再投稿することはできません。

### BR-REVIEW-002 — レビュー状態と商品サマリーを一貫して更新する

公開中（published）のレビューのみを商品表示の集計対象とし、非公開（hidden）は再公開操作が行われるまで非表示、削除済み（deleted）は終端状態とします。レビューの編集によって状態が自動変更されることはありません。

## UI・振る舞い契約

カスタマーは、自身が投稿したレビューの評価、タイトル、本文、ステータス、バージョンを編集できます。管理者は公開／非公開を管理できます。なお、削除済みのレビューを編集または再投稿できるUIは表示しません。

### SCREEN-REVIEWS-EDITOR — レビューエディター

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- 配達完了かつ本人の注文明細に対してレビューを作成・編集する。
- published、hidden、deletedの状態を表示し、deletedのレビューを再投稿可能に見せない。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `customer` | `reviewable-orders` | 評価、タイトル、本文、保存アクションを表示する。 | `required` | `web-desktop, android` | `-` | `BR-REVIEW-001`, `AC-REVIEW-001` |
| `published` | domain | `customer` | `reviewable-orders` | 既存レビューの編集状態を表示する。 | `required` | `web-desktop` | `-` | `BR-REVIEW-002`, `AC-REVIEW-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-REVIEWS-EDITOR default web-desktop](../assets/screens/SCREEN-REVIEWS-EDITOR/default/web-desktop.webp)](../assets/screens/SCREEN-REVIEWS-EDITOR/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-REVIEWS-EDITOR default android](../assets/screens/SCREEN-REVIEWS-EDITOR/default/android.webp)](../assets/screens/SCREEN-REVIEWS-EDITOR/default/android.webp)

##### `published`

###### Webデスクトップ

[![SCREEN-REVIEWS-EDITOR published web-desktop](../assets/screens/SCREEN-REVIEWS-EDITOR/published/web-desktop.webp)](../assets/screens/SCREEN-REVIEWS-EDITOR/published/web-desktop.webp)

### SCREEN-ADMIN-REVIEWS — 管理者レビュー

画面カタログ: [画面カタログ](../screen-catalog.md)

#### 機能一覧

- オペレーターおよび管理者がレビューの公開状態と一括操作結果を確認する。
- カスタマーレビューのスナップショットを保持したまま公開／非公開を操作する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `operator, admin` | `default` | レビュー一覧と状態操作UIを表示する。 | `required` | `web-desktop, web-tablet` | `-` | `BR-REVIEW-002`, `AC-REVIEW-002` |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-ADMIN-REVIEWS default web-desktop](../assets/screens/SCREEN-ADMIN-REVIEWS/default/web-desktop.webp)](../assets/screens/SCREEN-ADMIN-REVIEWS/default/web-desktop.webp)

###### Webタブレット

[![SCREEN-ADMIN-REVIEWS default web-tablet](../assets/screens/SCREEN-ADMIN-REVIEWS/default/web-tablet.webp)](../assets/screens/SCREEN-ADMIN-REVIEWS/default/web-tablet.webp)

## 受入基準

### 基準一覧

#### AC-REVIEW-001 — レビュー投稿資格を制限する

関連ビジネスルール: `BR-REVIEW-001`

未配達の注文、他人の注文、既存レビューが存在する明細、および削除済みの明細は投稿対象外となり、配達完了となった本人明細のみが一度だけ投稿できます。

#### AC-REVIEW-002 — 公開集計と状態遷移を分ける

関連ビジネスルール: `BR-REVIEW-002`

published／hidden／deletedの表示、編集、管理者操作と、商品サマリーにおける件数・平均評価・評価分布の集計結果が一致します。

## 実行可能な正本ソース

- `src/application/use-cases/review-user-use-cases.ts`
- `src/application/use-cases/customer-review-state.ts`
- `src/domain/policies/state-transitions.ts`
- `app/reviews/`, `app/admin/reviews.tsx`
