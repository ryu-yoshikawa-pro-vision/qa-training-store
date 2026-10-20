# プロダクトスコープ

## 現行製品

Scenario Shopは、固定シードとローカルモックを活用し、ECストアフロントおよびSaaS型管理画面のQAを学習・検証するためのアプリケーションです。実際の商品の販売、決済、配送、および外部APIとの通信は行いません。

## プラットフォーム

### Web

デスクトップWebおよびモバイルWebを正式な対象とします。ストアフロント、カスタマー購入導線、オペレーター／管理者用管理画面を提供します。管理操作はデスクトップ環境（画面幅1024px以上）を前提としており、ビューポートが狭い場合は専用の警告メッセージを表示します。

### ネイティブ

ネイティブアプリは、カスタマー向けのゲストストアフロント、カート、ログイン、アカウント、住所、チェックアウト、決済、注文、レビューを対象とします。ネイティブ環境での管理画面およびゲストチェックアウトは対象外です。Androidはビルドおよびランタイム／Maestroによる自動テストを保証範囲とし、iOSは自動化・本番シミュレータビルド、ビルド時メタデータ、本番ガード、成果物検証を対象とするビルド限定契約とします。

## 対象とする動作

- 商品の探索・検索、ファセット絞り込み、価格、セール、在庫、バリエーション、レビュー要約
- ゲスト／カスタマーカート、ログイン時のカート統合、チェックアウト、ローカルモック決済
- 注文スナップショット、決済結果、配送状況、カスタマーレビュー
- オペレーター／管理者による商品、カテゴリー、ブランド、在庫、注文、レビュー、ユーザーの管理
- シードリセット、固定クロック、決定論的な決済遅延、限定的なインスペクション
- レスポンシブ表示、キーボード操作、スクリーンリーダー対応、エラー、Empty、Loading、Conflict、Not Foundの各種状態表示

## 対象外とする動作

キャンセル・返品・返金、決済状態不明・照合、ゲストチェックアウト、ネイティブ管理画面、インポート・エクスポート、マイグレーション復旧、クーポン、ポイント、お気に入り、レコメンド、外部の決済・配送APIとの通信は、現行仕様の期待される動作に含めません。

## 正本ソースの境界

本ドキュメントでは、システムの仕様上の意味と対象範囲を定義します。具体的なルーティングは `app/`、ロールやステータスの型定義は `src/domain/contracts/`、シードやシナリオは `src/seeds/metadata.ts` および `src/seeds/scenarios.ts`、デザイントークンは `src/presentation/design/tokens.ts`、ビルドおよびネイティブ設定は `app.config.ts` と `.github/workflows/` をそれぞれ参照してください。

## 画面契約

### SCREEN-SUPPORTING-GUIDE — ガイド

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- ゲスト、カスタマー、オペレーター、管理者が、Scenario Shopの利用方法、固定アカウント、ロール、会員ランク特典を確認できる。
- 仕様の読み方と、安全に初期状態へ戻すリセット機能への導線を表示する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `guest, customer, operator, admin` | `default` | ガイド本文とロール別の導線を表示する。 | `required` | `web-desktop, android` | `-` | [プロダクトスコープ](./product-scope.md#現行製品), [ロールと権限](./roles-and-permissions.md#ロールと権限) |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-SUPPORTING-GUIDE default web-desktop](assets/screens/SCREEN-SUPPORTING-GUIDE/default/web-desktop.webp)](assets/screens/SCREEN-SUPPORTING-GUIDE/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-SUPPORTING-GUIDE default android](assets/screens/SCREEN-SUPPORTING-GUIDE/default/android.webp)](assets/screens/SCREEN-SUPPORTING-GUIDE/default/android.webp)

### SCREEN-SUPPORTING-TERMS — 利用規約

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- 利用規約を閲覧できる。
- ストアフロントへ戻るナビゲーションを提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `default` | 利用規約本文の入口とナビゲーションを表示する。 | `required` | `web-desktop, android` | `-` | [プロダクトスコープ](./product-scope.md#現行製品), [UI/UX契約](./ui-ux-contract.md#境界領域のユーザー体験) |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-SUPPORTING-TERMS default web-desktop](assets/screens/SCREEN-SUPPORTING-TERMS/default/web-desktop.webp)](assets/screens/SCREEN-SUPPORTING-TERMS/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-SUPPORTING-TERMS default android](assets/screens/SCREEN-SUPPORTING-TERMS/default/android.webp)](assets/screens/SCREEN-SUPPORTING-TERMS/default/android.webp)

### SCREEN-SUPPORTING-PRIVACY — プライバシーポリシー

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- プライバシーポリシーを閲覧できる。
- ストアフロントへ戻るナビゲーションを提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `default` | プライバシーポリシー本文の入口とナビゲーションを表示する。 | `required` | `web-desktop, android` | `-` | [プロダクトスコープ](./product-scope.md#現行製品), [UI/UX契約](./ui-ux-contract.md#境界領域のユーザー体験) |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-SUPPORTING-PRIVACY default web-desktop](assets/screens/SCREEN-SUPPORTING-PRIVACY/default/web-desktop.webp)](assets/screens/SCREEN-SUPPORTING-PRIVACY/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-SUPPORTING-PRIVACY default android](assets/screens/SCREEN-SUPPORTING-PRIVACY/default/android.webp)](assets/screens/SCREEN-SUPPORTING-PRIVACY/default/android.webp)

### SCREEN-SUPPORTING-COMMERCE — コマース

画面カタログ: [画面カタログ](./screen-catalog.md)

#### 機能一覧

- 模擬取引の表示と、外部決済・配送を行わない対象範囲を閲覧できる。
- ストアフロントへ戻るナビゲーションを提供する。

#### 主要なUI状態

| 状態スラグ | 種別 | 対象者・ロール | 条件・シナリオ | 期待されるUI | 視覚要件 | 必須プラットフォーム | 視覚詳細 | 関連オラクル |
|---|---|---|---|---|---|---|---|---|
| `default` | baseline | `all` | `default` | 模擬取引の説明とナビゲーションを表示する。 | `required` | `web-desktop, android` | `-` | [プロダクトスコープ](./product-scope.md#現行製品), [UI/UX契約](./ui-ux-contract.md#境界領域のユーザー体験) |

#### 画面リファレンス

##### `default`

###### Webデスクトップ

[![SCREEN-SUPPORTING-COMMERCE default web-desktop](assets/screens/SCREEN-SUPPORTING-COMMERCE/default/web-desktop.webp)](assets/screens/SCREEN-SUPPORTING-COMMERCE/default/web-desktop.webp)

###### Android — 正本画面リファレンス

[![SCREEN-SUPPORTING-COMMERCE default android](assets/screens/SCREEN-SUPPORTING-COMMERCE/default/android.webp)](assets/screens/SCREEN-SUPPORTING-COMMERCE/default/android.webp)
