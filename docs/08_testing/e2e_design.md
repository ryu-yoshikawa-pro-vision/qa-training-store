# E2E設計

## 1. Playwright Project

| Project | Gate | 用途 |
|---|---:|---|
| `chromium` | `e2e-chromium` の `required` leg | `pnpm run test:e2e:chromium`の対象 |
| `mobile-chromium` | `mobile-boundary` leg／PR外のExtended E2E | 360px StorefrontとMobile Boundary |
| `cross-role-chromium` | `e2e-chromium` の `cross-role` leg | Cross-role Lifecycle |
| `deployed-smoke` | Production Smoke | Cloudflare配信確認 |
| `firefox-smoke` / `webkit-smoke` | Cross-browser Smoke（週次／`workflow_dispatch`） | 互換性確認 |

`pnpm run test:e2e:chromium` は、`e2e-chromium` マトリックスにおける `required` ジョブ（leg）の実行コマンドであり、`chromium` プロジェクト上で `e2e/web/phase1-required.spec.ts` および `e2e/web/ui-ux-improvements.spec.ts` を実行します。プルリクエスト（PR）におけるWeb E2Eのカバレッジ全体は、`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline` で構成される `e2e-chromium` マトリックス全体を指しており、このコマンド単体のみを唯一の必須ゲート（Gate）とは扱いません。なお、`ui-review-*` プロジェクトはUIレビュー用の別責務として扱います。

## 2. Phase 1 Web業務フローの対応（WE-CORE 12件）

以下の12件は要件と業務フローの対応付けを定義したものであり、現時点で実行可能なテスト定義が12個存在することを示すものではありません。

1. ゲストの商品検索・フィルター・商品詳細閲覧・カート追加
2. ゲストカートの数量変更・削除・上限超過時の拒否
3. ログインとゲストカートの統合結果の確認
4. customerのチェックアウト・TEST-SUCCESS購入
5. 明確な決済失敗・注文詳細からの再試行
6. 価格変更・在庫変更・会員ランク変更に伴うチェックアウト再確認
7. 注文一覧・詳細・処理中ルートの再読み込み
8. 配達完了（delivered）商品のレビュー投稿・編集
9. 管理者による商品集約（Aggregate）の登録・プレビュー・公開
10. 管理者による商品編集・SKU/画像関連の変更・非公開・下書き（draft）削除制約
11. 在庫調整・注文準備開始・発送・配送完了
12. ユーザー停止・ログイン拒否・最後のadmin保護

各フローには複数の外観確認を過剰に詰め込まず、業務上の処理結果と主要な画面パターン（Page Pattern）のみを検証します。フィルターの全組み合わせ、文字数の境界値、詳細な状態遷移、ファセット（Facet）計算、一括処理（Bulk）における各失敗理由などは、ユニット／アプリケーション／コンポーネント／リポジトリコントラクト（Unit / Application / Component / Repository Contract）の各テストレベルへと責務を下げて検証します。

## 3. Cross-roleライフサイクル

管理者（admin）による商品登録・公開 → 顧客（customer）による購入 → 管理者による発送・配送完了 → 顧客によるレビュー投稿という一連の長いライフサイクルテストは、WE-CORE 12件の対応付けとは切り離して管理します。

- PR: `e2e-chromium` マトリックスの `cross-role` ジョブにて、`cross-role-chromium` プロジェクトで `pnpm run test:e2e:cross-role` を実行する。
- `e2e-chromium` マトリックスの全ジョブが成功したことを、Web CIの `verify` で確認する。
- ライフサイクルテスト失敗時には、各ロール区間のトレース（Trace）を保存する。

## 4. Locator・Component Object

要素の特定には、Role、Accessible Name、Labelを優先して使用します。`testID` は、同一のRoleやNameでは一意に特定できない業務要素に限定して使用します。Search Combobox、Filter Bar、Product Gallery、Cart Item、Price Summary、Checkout Step、Admin Shell、Resource Index、Save Bar、Order Timeline などを業務単位のコンポーネントオブジェクトとして共通化し、アサーション（Assertion）をオブジェクト内部へ過剰に隠蔽しない設計とします。

## 5. 待機・再試行

固定時間スリープ（sleep）は原則禁止とします。URL、ボタンの状態、ローディング表示の消失、コンボボックスの選択肢（Combobox option）、注文ステータスなどの明示的な状態変化を待機します。決済処理中（Payment processing）の画面再読み込みでは、同一の試行（Attempt）が再開されること、また既に処理が完了している場合は既存の結果画面へ遷移することを確認します。Playwrightの自動再試行（Retry）によって同一の業務操作が重複して送信されないよう、テスト実行単位でのシードリセット（Seed Reset）を前提とします。

## 6. Inspection Assertion

ホーム画面の新着一覧への在庫切れ商品の表示有無、管理者向け商品一覧における有効なSKU（active SKU）合計在庫の絞り込み、レビュー平均値の保存精度などは、アプリケーション統合テスト（Application Integration Test）やリポジトリコントラクトテスト（Repository Contract Test）で検証し、必須E2Eテストを無暗に増やさないようにします。

内部整合性の信頼できる唯一の情報源（正本）は、Application Integration / Dexie Contract Test です。E2Eテストからは固定の読み取り専用インスペクションAPI（Read-only Inspection API）のみを利用し、検証対象は決済成功時の在庫減算回数、カートやチェックアウトの状態、注文・決済・配送（Order / Payment / Shipment）間の整合性、レビュー集計（Review Summary）に限定します。任意のデータベースクエリ実行機能は提供しません。

## 7. Artifact

テスト失敗時には、トレース（Trace）、スクリーンショット（Screenshot）、必要な場合の動画（Video）、コンソールログ（Console）、実行シナリオ（Scenario）、仮想クロック（Clock）、決済遅延（Payment Delay）、アプリケーション／スキーマ／シード／ビルドの各バージョン情報をアーティファクトとして保存します。

## 8. デプロイ後のSmoke

デプロイ後は、Cloudflare Automation URLを対象に、ビルドメタデータ（Build Metadata）、代表画像の正常表示および個別画像の読み込み失敗時のプレースホルダー表示、初期シード（Reset / default Seed）、ホーム、検索、ログイン、TEST-SUCCESS購入、注文詳細、管理者ダッシュボード（Admin Overview）を確認します。マニフェスト全体の不整合はビルドゲート（Build Gate）で事前に検出するため、実行時の自動復旧（Runtime Recovery）を検証するE2Eテストは作成しません。

## 9. Native CIとの境界

Web Phase 1におけるPlaywrightのゲートと、Native CI / Maestroは、現行の規約（contract）上、独立した別個のものとして扱います。

- ネイティブコード変更時のAndroidは、ビルド（Build）およびランタイム実行／Maestroテストの合格を必須とします。
- ネイティブコード変更時のiOSは、ビルドのみ（Build-only：自動化ビルドと本番検証用ビルド）を必須とします。
- iOSのシミュレーター環境におけるランタイム実行およびMaestroの合格（PASS）は、現行の規約では保証対象外とします。
- iOS用のスタンドアロン `workflow_dispatch` は、手動実行用のビルド専用トリガーとして維持されます。ネイティブコードの変更時には、最上位の `native-ci` がiOSの再利用可能ワークフロー（reusable workflow）を呼び出し、`native-ci / verify` ジョブがiOSのビルド成功を要求します。

追加のNative / MaestroフローをWeb Phase 1のPlaywrightゲートに統合する設計については、後続フェーズでの検討事項とします。
