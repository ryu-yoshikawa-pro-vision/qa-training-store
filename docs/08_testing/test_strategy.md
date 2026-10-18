# テスト戦略

## 1. フェーズ1 最重要リスク

1. ロール・所有権（Ownership）違反
2. 検索・絞り込み条件と結果件数・ページの不一致
3. 商品価格・セール価格・会員価格・送料の誤表示
4. 在庫の過剰販売（Overselling）・二重減算
5. カートおよびチェックアウトのバージョン不整合
6. 決済の成功・失敗と注文ステータスの不一致
7. 注文状態と配送状態の不一致
8. レビュー投稿資格・サマリー・評価分布の不整合
9. 商品アグリゲート（Product Aggregate）、SKU、画像アセット関連の部分保存・誤削除
10. ゲストカート統合・チェックアウトセッション再開時の不整合
11. 管理者の一括操作（Bulk Action）・未保存変更の誤操作
12. キーボード操作、フォーカス制御、モバイルレイアウト崩れによる操作不能
13. IndexedDBデータとUI再読み込み時の不整合
14. boolean / null な IndexedDB インデックスキーの不正利用
15. パスワードハッシュ・シード認証契約の不一致
16. 管理者クエリのページネーション・フィルター・ソートの不一致

高度な分散決済、返金処理、データマイグレーションは、フェーズ1のリスク対象には含めません。

## 2. テストレベル / テストタイプ（Test Level / Test Type）

テストレベルおよびテストタイプは、システムのどの層で何を検証するかを定義したものです。テスト観点（Test Perspective）や、実行環境・プラットフォーム・CIゲート（Execution / Platform / CI Gate）とは別軸として管理します。

| レベル / 種別 | ツール | 主な責務 |
|---|---|---|
| Unit | Vitest | 価格計算、権限判定、閲覧条件、ファセット集計、状態遷移 |
| Application Integration | Vitest | 商品アグリゲート、検索処理、カート統合、チェックアウト、決済確定、注文処理、一括操作 |
| Repository Contract | Vitest | DexieのCRUD操作、トランザクション、コンフリクト制御、ソート／ページネーション／ファセット、商品アグリゲート |
| Static / Operational Contract | Vitest/Node | 画像マニフェスト、ファイル存在、ハッシュ検証、有効／無効アセット判定、実行境界 |
| Component | Testing Library | フォーム操作、コンボボックス、フィルターUI、エラー表示、アクセシビリティ |
| Web E2E | Playwright | 一般顧客および管理者の主要業務フローとページパターンの検証 |
| Native Component / Repository / Android Runtime E2E | Jest/Vitest/Maestro | ネイティブUI、SQLiteリポジトリ、Android実機・エミュレータ環境のランタイム検証 / Maestro |
| Deployed / Production Smoke | Playwright | Cloudflare配信確認および本番環境検証（Production-validation） |

## 3. テスト観点（Test Perspective）

テスト観点は、同一のテストレベルにおいてどのようなリスクに着目して検証するかという切り口です。現在のリスクやテストコードで説明可能な観点のみを定義し、観点そのものを独立したテストレベルとしてはカウントしません。

| 観点 | 主な適用範囲 |
|---|---|
| Accessibility | axeによる自動検証、キーボード操作、フォーカス制御、スクリーンリーダーのスポット確認 |
| Responsive / Mobile Web | 360px幅のストアフロント表示、ブレークポイント切り替え、モバイル用フィルター |
| Role / Ownership | 閲覧者（Viewer）、顧客（Customer）、運用者・管理者（Operator/Admin）の権限およびデータ所有権 |
| State / Lifecycle | チェックアウト、決済、注文、配送、レビュー、セッションの各ライフサイクル・状態遷移 |
| Boundary | 上限値、0件データ、ページネーション境界、フィルター、ソート順、バリエーション、エラー発生境界 |
| Failure / Recovery | 競合（Conflict）、ロールバック、決済失敗、セッション再開、リトライ処理 |
| Data / Persistence consistency | スナップショット、サマリー、バージョン管理、IndexedDB / SQLiteの永続化整合性 |
| Security / Authorization | パスワードハッシュ検証、認可制御、テスト用APIの境界防御 |
| UX / Visual acceptance | ストアフロントと管理画面の分離、主要CTA、空状態（Empty）・エラー表示、スクリーンショットレビュー |

## 4. 実行環境 / プラットフォーム / CIゲート（Execution / Platform / CI Gate）

実行環境・プラットフォーム・CIゲートは、どのトリガー（入口）、実行環境、ワークフロージョブでテストを動かし、何を必須条件とするかを定義したものです。単に同時に実行されるという理由だけで、同一のカバレッジ分類として扱うことはしません。

| 実行環境 / プラットフォーム | 現在のエントリポイント / CIゲート | カバレッジ境界 |
|---|---|---|
| Web PR / main / schedule / manual | Web CI（PR、push、schedule、`workflow_dispatch`） | Webのコードスタイル、静的解析、Vitest、ビルド、E2E、UIレビュー、スモークテストの成否を現在のワークフローで判定 |
| `e2e-chromium` matrix | `required`=`pnpm run test:e2e:chromium`、`accessibility`=`pnpm run test:a11y`、`mobile-boundary`、`cross-role`、`training-web-baseline` | `required` を含む5つの実行単位（leg）。`training-web-baseline` はトレーニング用であり、正式なリグレッションカバレッジには算入しない |
| UI Review | `ui-review` job / `ui-review-desktop`、`ui-review-tablet`、`ui-review-mobile`、`ui-review-small-mobile` project | スクリーンショットを用いたUIレビューという独立した責務。正式なリグレッションのテストレベルやカバレッジ数には合算しない |
| Production Smoke / Preview Deployed Smoke | `production-smoke`、Preview / Production deployed smoke | ビルド済み成果物（artifact）またはデプロイ先URLに対する配信確認・代表フローの検証 |
| non-PR Extended E2E | `extended-e2e`（non-PR） / `mobile-chromium` | PRで必須とされるE2Eとは別に実施する、モバイル向け拡張カバレッジ |
| weekly / manual Cross-browser Smoke | `Cross Browser Smoke` workflow / `firefox-smoke`、`webkit-smoke` | 週次実行または `workflow_dispatch` による互換性確認。PRにおける必須ゲートではない |
| Native PR conditional / Native manual | `native-ci`のNative change検出または`workflow_dispatch` | ネイティブコード変更時のみネイティブ向けゲートを要求し、Webフェーズ1のPlaywrightカバレッジとは混在させない |
| Android Build + Runtime / Maestro | `native-ci / verify`が`android-automation-build`、`android-production-build`、`android-runtime`等を要求 | Android環境ではビルド、SQLite / コントラクトテスト、エミュレータ上のランタイム検証 / Maestroを必須とする |
| iOS Build-only reusable gate | `native-ios` reusable workflowの`ios-automation-build`、`ios-production-build`、`ios-verify` | iOS環境はシミュレータ向けの自動テスト用／本番検証用ビルド確認のみ（Build-only）。iOSランタイムおよびMaestroの成功（PASS）は必須保証としない |
| Formal / Training boundary | `playwright.config.ts`のFormal E2E / Smoke、`playwright.training.config.ts`のTraining | `ui-review-*` はUIレビュー、`training-web-baseline` はトレーニング用として責務を明確に分離する |

### フェーズ1 リスクマッピング（Phase 1 Risk mapping）

リスクマッピングは、フェーズ1における重要な既存リスクを「1リスク＝1行」で整理した一覧です。「代表的な正式テスト／スイート」には安定して実行可能な代表単位を記載し、「CIゲート」にはそのスイートの実行に最も近い現在のワークフロージョブまたはマトリクスの実行単位（matrix leg）を対応付けています。

| リスク / リスク分類 | 代表的な要件 / 受入基準（AC） | 代表的なテスト技法 | 代表的なテスト観点 | 主要テストレベル | 代表的な正式テスト / スイート | CIゲート |
|---|---|---|---|---|---|---|
| ロール・所有権違反 | `FR-AU-*` / `FR-AD-*`、Acceptance §2 | デシジョンテーブル | Role / Ownership、Security / Authorization | Unit | `tests/unit/policies.test.ts` | `Vitest (unit)` |
| 検索・絞り込み条件と結果件数・ページの不一致 | `FR-PR-*`、Acceptance §3 | — | Boundary | Repository Contract | `tests/repository-contract/storefront-catalog.test.ts` | `Vitest (repository)` |
| 商品価格・セール・会員価格・送料の誤表示 | `FR-MO-*` / `FR-CA-*`、Acceptance §4 | 境界値分析 | Data / Persistence consistency | Unit | `tests/unit/pricing.test.ts` | `Vitest (unit)` |
| 在庫の過剰販売・二重減算 | `FR-ST-*` / `FR-PY-*`、Acceptance §4 | 状態遷移テスト | Failure / Recovery | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| カートおよびチェックアウトのバージョン不整合 | `FR-CA-*` / `FR-CH-*`、Acceptance §5 | 状態遷移テスト | State / Lifecycle | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| 決済成功・失敗と注文状態の不一致 | `FR-PY-*` / `FR-OR-*`、Acceptance §6 | 状態遷移テスト | State / Lifecycle、Failure / Recovery | Application Integration | `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| 注文状態と配送状態の不一致 | `FR-OR-*` / `FR-ST-*`、Acceptance §6 | 状態遷移テスト | State / Lifecycle | Application Integration | `tests/integration/admin-operations-use-cases.test.ts` | `Vitest (integration)` |
| レビュー投稿資格・サマリー・評価分布の不整合 | `FR-RV-*` / `FR-PR-017`、Acceptance §7 | 状態遷移テスト | State / Lifecycle、Data / Persistence consistency | Application Integration | `tests/integration/review-user-use-cases.test.ts` | `Vitest (integration)` |
| 商品アグリゲート、SKU、画像アセット関連の部分保存・誤削除 | `FR-PR-*` / `FR-AD-*`、Acceptance §3 | デシジョンテーブル | Data / Persistence consistency、Boundary | Application Integration | `tests/integration/admin-product-use-cases.test.ts` | `Vitest (integration)` |
| ゲストカート統合・チェックアウトセッション再開の不整合 | `FR-CA-*` / `FR-CH-*` / `FR-AU-*`、Acceptance §2・4・5 | シナリオ／ユースケーステスト | State / Lifecycle、Failure / Recovery | Application Integration | `tests/integration/auth-account.test.ts` + `tests/integration/checkout-order-use-cases.test.ts` | `Vitest (integration)` |
| 管理者の一括操作・未保存変更の誤操作 | FR-AD-*、Acceptance §8 | デシジョンテーブル | Boundary、UX / Visual acceptance | Component | `tests/component/admin-product-pages.test.tsx` | `Vitest (component)` |
| キーボード操作、フォーカス制御、モバイルレイアウト崩れによる操作不能 | `NFR-AX-*` / `NFR-CP-*`、Acceptance §10 | 主たる技法なし（Not primary） | Accessibility、Responsive / Mobile Web | Web E2E | `e2e/web/accessibility.spec.ts` + `e2e/web/mobile-boundary.spec.ts` | `e2e-chromium / accessibility` + `mobile-boundary` |
| IndexedDBデータとUIの再読み込み時の不整合 | `NFR-RL-*` / `FR-TC-*`、Acceptance §3・5・9 | 主たる技法なし（Not primary） | State / Lifecycle、Data / Persistence consistency | Web E2E | `e2e/web/phase1-required.spec.ts` | `e2e-chromium / required` |
| boolean/null な IndexedDB インデックスキーの不正利用 | NFR-RL-011 / FR-PR-041/050、Acceptance §1 | — | Data / Persistence consistency | Repository Contract | `tests/repository-contract/repositories.test.ts` | `Vitest (repository)` |
| パスワードハッシュ・シード認証契約の不一致 | `NFR-SC-*` / `FR-AU-*`、Acceptance §2 | 主たる技法なし（Not primary） | Security / Authorization | Unit | `tests/unit/password-hasher.test.ts` | `Vitest (unit)` |
| 管理者クエリのページネーション・フィルター・ソート不一致 | FR-AD-* / NFR-MA-011、Acceptance §8 | デシジョンテーブル | Boundary | Application Integration | `tests/integration/admin-operations-use-cases.test.ts` | `Vitest (integration)` |

## 5. 単体テスト（Unit）の重点項目

単体テストでは、以下のロジック、計算、および状態遷移の境界値を重点的に検証します。

PriceCalculator（SKU単価ごとの端数切り捨て計算および明細割引合計）、送料無料までの残り金額計算（Shipping Remaining）、カタログ表示・非表示判定（Catalog Visibility）、検索フィルターおよびファセット集計（Search Filter/Facet）、商品の価格帯計算（Product Price Range）、バリエーションルールの適用（Variation Rule）、カート数量計算およびカート統合（Cart Quantity/Merge）、チェックアウトの開始・再開（Checkout Start/Resume）、商品・注文・決済・レビューの各状態遷移（Product/Order/Payment/Review State）、管理者権限の保護（Admin Protection）、レビューサマリーの差分更新（Delta）・未丸め平均値の保持・画面表示用の丸め境界値、PasswordHasher のフォーマット生成および検証契約（Format/Verify）。

## 6. リポジトリコントラクト（Repository Contract）の重点項目

- 一意性制約、インデックス、ソート、ページネーション、ファセット（Unique/Index/Sort/Page/Facet）の検証
- バージョン不整合（Conflict）の検知
- ApplicationTransactionRunner におけるトランザクションスコープとロールバック処理
- カート明細（Cart Item）の変更と親カートバージョンのアトミックな同時更新
- 初回のカート追加時に有効なカート（active Cart）が存在しない場合でも、カート作成・明細追加・親バージョン更新が1つのトランザクション内で確実に完了すること
- JSON、Date、Boolean型の相互変換処理
- カテゴリ名の一意性検証
- 有効なカート（active Cart）およびデフォルト配送先住所（default Address）の一意性制約
- レビューの評価別件数合計の整合性
- 管理画面オーバービュー用リードモデル（Admin Overview Read Model）の取得（低在庫1〜5件、在庫切れ0件の境界値を含む）
- 管理画面商品一覧における有効なSKU合計在庫フィルター（複数SKU混在、合計0件、1件、5件、6件の各境界）
- ホーム画面の新着商品（最大8件）に、公開中であれば在庫切れ商品も含める閲覧者向け表示ルール（Viewer Rule）
- 商品アグリゲート（Product Aggregate）全体のロールバック、バリアントの削除／無効化、および既存在庫の変更拒否処理
- ゲストカート統合とチェックアウト開始／再開（startOrResume）のアトミック性
- 画像アセットマニフェスト（Image Asset Manifest）の参照整合性。画像の欠落、ハッシュ不一致、容量超過はビルド失敗として検知し、実行時（Runtime）のリカバリー処理はテスト対象外とする
- isDefaultKey / isActiveKey / optionScopeKey の変換処理と一意性制約
- ストアフロントのホームおよびナビゲーションクエリと、表示名付きファセットの取得
- 管理画面の全一覧クエリにおける検索、フィルター、ソート、ページネーションの挙動
- CartDto リードモデルにおける価格差、上限超過、問題コードの反映
- 商品プレビューの非永続化処理および画像0件時のプレースホルダー表示
- 注文明細（Order Item）の代表画像スナップショットおよび注文金額スナップショットの保持
- 会員ランク変更に伴う有効なチェックアウト（active Checkout）の破棄（abandoned）処理のアトミック性
- 決済再開処理の冪等性、およびコンフリクト発生時における最新結果の返却
- 決済ゲートウェイの返却結果に依存せず、テスト用クロック（Test Clock）による同一時刻が決済および履歴レコードに正しく保存されること

## 7. E2Eリリースクライテリア（E2E Release Gate）

`e2e_design.md` に記載されている `WE-CORE-001` 〜 `WE-CORE-012` は、フェーズ1の機能要件と業務フローの対応関係を定義したものです。現在CIで実行される必須の実行単位（leg）は `pnpm run test:e2e:chromium` であり、`chromium` プロジェクト環境で `e2e/web/phase1-required.spec.ts` および `e2e/web/ui-ux-improvements.spec.ts` を実行します。PR時のWeb E2Eカバレッジ全体は、`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline` の5つで構成される `e2e-chromium` マトリクスジョブを指し、前述の12件の業務フロー対応や単一の必須legコマンド（`pnpm run test:e2e:chromium`）そのものとは区別して管理します。

なお、テストの重複や実行時間の肥大化を防ぐため、以下の検証項目はE2Eでは網羅せず、下位のテストレベルへ委譲します。

- フィルターの全組み合わせ、ソートの同順位処理（tie-break）、ファセット件数の網羅検証: Unit / Application Integration
- 全入力項目の文字数境界値、エラーサマリーの詳細表示検証: Component / Application Integration
- コンフリクト、ロールバック、一意性制約の網羅検証: Repository Contract
- レビュー評価分布の差分更新（Delta）、平均値の未丸め保存と表示丸め処理、価格・送料の全組み合わせ計算: Unit / Application Integration
- 一括操作（Bulk Action）における各対象データの個別失敗理由の検証: Application Integration

### 現在のNative CIとの境界

Web向けフェーズ1のE2Eリリースクライテリア（Release Gate）には、ネイティブアプリやMaestroのフローを混在させません。ネイティブ関連のコード変更時における現在の検証方針（Native contract）は、Android環境ではビルド＋ランタイム検証／Maestroの実行を必須とし、iOS環境ではビルド検証のみ（Build-only）としています。iOSシミュレータ上でのランタイム動作やMaestroテストの成功（PASS）までは保証対象外としており、単独で手動実行する `workflow_dispatch` と、ネイティブコード変更時にトップレベルの `native-ci` ワークフローから呼び出されるiOS用再利用可能ワークフロー（reusable workflow）とを明確に区別して運用します。なお、ネイティブコード変更時には、`native-ci / verify` ジョブにおいてiOSのビルド成功が必須条件となります。

## 8. テストデータ方針

- テストごとに前提となるシードシナリオ（Seed Scenario）を明示的に指定する。
- UI操作を通じて長い事前条件をセットアップしない。
- シードデータの期待値検証には、シードカタログ（Seed Catalog）やメタデータから取得した値を用いる。
- テスト用APIによるデータ書き込みは、初期化（Reset）、シナリオシード投入、テスト用クロック操作（Clock）、決済遅延シミュレーション（Payment Delay）のみに限定する。読み取りについても、メタデータおよび固定の読み取り専用検証DTO（Read-only Inspection DTO）の取得に限定し、任意のデータベース直接書き換えや任意クエリの実行機能は提供しない。
- UIパターンの境界値検証に必要なバリエーション（12件／13件の境界など）、0件データ、一部処理成功といった特殊な状態は、専用のシードデータとしてあらかじめ用意する。

## 9. アクセシビリティ検証

検索コンボボックス、モバイル用フィルター、商品ギャラリー、チェックアウト画面、評価・レーティング入力、商品登録・編集フォーム、管理者ナビゲーションについてキーボード操作による動作検証を実施し、重大な axe 違反（axe-coreの重大な指摘）をリリース前にすべて解消します。なお、全画面を対象としたビジュアルリグレッションテストの導入はフェーズ3で実施予定です。

## 10. UX・表示検証

自動テストによる機械的な検証にとどまらず、フェーズ1の受入検証時にはスクリーンショットの確認および実機・実ブラウザでの手動操作を通じて以下の項目を確認します。

- ストアフロントと管理画面（Admin）における視覚的デザインおよび情報密度の適切な分離
- 360px幅のモバイル画面における商品2列グリッドの視認性および可読性
- 主要なコールトゥアクション（CTA）および現在の画面位置（現在地）の明瞭さ
- 検索結果0件、初期の未登録状態（Empty）、エラー発生時における次のアクション（導線）のわかりやすさ
- UI文言辞書に定義された表記との完全な一致

## 11. パフォーマンス検証

大量商品データ（many-products）を用いて、検索サジェスト、ファセット集計、一覧画面の描画パフォーマンスをベンチマーク測定します。ただし、フェーズ1のリリースクライテリアとしては一律の固定目標時間（閾値）を設けていません。著しい操作遅延や操作不能、あるいは明らかなパフォーマンスの劣化（退行）が認められた場合に都度修正を行う方針とします。

## 12. 完了基準

- 単体テスト（Unit）、アプリケーション統合テスト（Application Integration）、リポジトリコントラクトテスト（Repository Contract）がすべて成功していること。
- PR時のWeb CIにおいて、`e2e-chromium` マトリクスジョブ（`required`、`accessibility`、`mobile-boundary`、`cross-role`、`training-web-baseline`）がすべて成功していること。なお、`required` ジョブの実行コマンドは `pnpm run test:e2e:chromium` とする。
- `main` ブランチにおいて、Chromium Mobileおよび可能な範囲でのFirefox／WebKit環境による動作確認が完了していること。
- デプロイ済み環境向けスモークテスト（Deployed Smoke）が成功していること。
- 致命的（Critical）および重要度高（High）の未解決課題が存在しないこと。

## 内部整合性とE2E

在庫履歴、注文・決済・配送（Order/Payment/Shipment）のステータス連動、レビューサマリーなどの内部的なデータ整合性については、アプリケーション統合テスト（Application Integration Test）およびDexieコントラクトテスト（Dexie Contract Test）を正本（真実のソース）として検証します。E2Eテストはユーザーインターフェース（UI）の挙動確認を最優先とし、内部状態の検証がどうしても必要な場合に限り、自動テスト用ビルド（Automation Build）に用意された固定の読み取り専用検証DTO（Read-only Inspection DTO）を使用します。

- 複数ロールをまたぐ一連のライフサイクル（Cross-role Lifecycle）検証は、PR時のWeb CIにおける `e2e-chromium` マトリクスの `cross-role` ジョブ（leg）として実行対象に含めます。
