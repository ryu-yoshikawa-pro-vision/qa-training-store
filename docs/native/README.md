# Native ローカル検証

ネイティブビルドは EAS Cloud ではなく、Windows や macOS のローカルツールチェーン（Toolchain）を主経路とします。

本ディレクトリは、人間と AI エージェントが同一の手順および停止条件で検証を実行するためのマスタードキュメント（正本）です。個別の README や Skill に詳細な手順を重複して記載しないでください。

## Windows／Android

- [Windows Android 実機検証 Runbook](./windows-android-local-validation.md)
- [Windows Android トラブルシューティング](./windows-android-troubleshooting.md)
- 実行エントリーポイント: [`scripts/native/windows/android-local.ps1`](../../scripts/native/windows/android-local.ps1)
- AI エージェント用 Skill: [`.agents/skills/android-native-local-validation/SKILL.md`](../../.agents/skills/android-native-local-validation/SKILL.md)

## 検証の基本順序

1. `Doctor`
2. `Prepare`
3. `Build`
4. `Install`
5. `Smoke`
6. `Test`（`native-test-control.yaml` 単体）
7. `RuntimeSuite`
8. `BoundarySuite`

単体の Flow が失敗した場合は、後続の Suite を実行してはなりません。スクリーンショット、アクセシビリティ階層（Accessibility Hierarchy）、logcat、JUnit レポート、Maestro の出力結果を保存し、失敗原因を特定してから修正を行ってください。

ビルド、インストール、テスト、および Maestro を再実行する前には、直近の実行結果（Run）と失敗ログ、変更差分、成功条件を必ず確認し、Runbook 5.1.1 の事前確認（preflight）と仮説テンプレートを活用してください。同一条件下での無目的な再実行、上流工程で失敗している状態での後続工程の続行、タイムアウト延長やアサーション削除のみによる見せかけのパス扱いは禁止します。

Persistence（永続化）および Boundary（境界値）の CI 実行では、以下の 5 つの Flow をそれぞれ独立したステップとして実行します。各ステップは固有の JUnit レポートと `maestro-artifacts/<flow-name>/` を保持し、先行する Flow が失敗した場合でも、後続の証跡収集は `always` 条件で確実に実行します。

- `native-restart-persistence.yaml`
- `native-reset-dirty-state.yaml`
- `native-out-of-stock.yaml`
- `native-low-stock.yaml`
- `native-purchase-limit.yaml`

アプリ再起動後のカート（Cart）確認では、汎用的な数量文字列ではなく、`native-persisted-state-ready`、`native-cart-badge-count`、`native-cart-item-<productId>-<variantId>`、`native-cart-quantity-<productId>-<variantId>` を使用します。なお、`native-persisted-state-ready` はカートリポジトリの読み込み完了後にのみ表示させてください。

ScrollView 内の成功メッセージや結果表示を Maestro で検証する際は、安定した（stable な）testID を付与し、`scrollUntilVisible` で画面の可視領域内へ移動させてからアサーションを実行します。表示要素が画面下端へ移動した後に上側の操作へ戻る必要がある場合は、対象 ID を `direction: UP` で再度画面内に表示させてください。画面外の要素に対して文字列の `extendedWaitUntil` だけで判定したり、アサーションの削除や固定スリープ（Sleep）でテスト失敗を隠蔽したりしてはなりません。

Windows 環境における Android ビルドのパス（Path）やオートリンキング（Autolinking）の復旧手順については、Runbook 4.3 および [トラブルシューティング 9](./windows-android-troubleshooting.md#9-buildninja-が-still-dirty-after-100-tries-で失敗) を参照してください。

## Maestro の入力経路

- 既知商品の詳細、バリエーション（Variant）、カート、永続化（Persistence）を確認する主要 Flow では、`scenario-shop://products/<productId>` のディープリンクを用いて商品画面を開きます。主要 Flow の成否を IME の入力状態に依存させないでください。
- 検索欄への `inputText`、商品コード検索、検索結果カードのタップ、商品詳細画面の表示確認については、テストカバレッジを維持しつつ [`maestro/native-search.yaml`](../../maestro/native-search.yaml) に切り離して管理します。この検索 Flow は、Runtime および Boundary の主要 Flow とは別枠で実行します。
- 物理端末の標準日本語 IME が ASCII 入力状態を保持できない場合は、検索専用 Flow を成功と見なしてはならず、LatinIME などの制御可能な入力方式へ一時的に切り替えてから実行してください。検証終了後は、元の IME および有効な IME の一覧を必ず復元してください。
- 検索入力の失敗を回避することを理由に、既知商品を対象とする主要 Flow へ検索操作を戻したり、`assertVisible` による検証を削除したりしてはなりません。

## ネイティブテスト成果物の保存先

- 人間が目視確認や共有に利用するモバイルネイティブのスクリーンショット、比較画像、および選定した画面証跡は `output/mobile-native/` に保存します。リポジトリ直下には配置しないでください。
- 同一シナリオを複数回検証・保存する場合は、既存の成果物を上書きしないよう、シナリオ名、検証フェーズ、Run ID または JST タイムスタンプをファイル名やサブディレクトリ名に含めてください。
- Maestro、ADB、Gradle の各種ログ、JUnit レポート、アクセシビリティ階層情報、APK 情報といった実行ごとの機械的なログ・証跡は、引き続き `.artifacts/native-local/<timestamp>/` 配下に保存します。共有・確認用の成果物は `output/mobile-native/`、実行ごとの詳細な機械証跡は `.artifacts/` と、役割を明確に分担します。
- `output/` は Git の管理対象外であるため、生成物をリポジトリにコミットするための `.gitkeep` や、個別の ignore 設定の追加は行いません。

## CI との違い

- GitHub Actions: API レベル 34 の x86_64 エミュレータ環境
- Windows ローカル環境: USB 接続された Android 実機（ABI は接続実機から自動判定）
- CI とローカル環境では、主要な Runtime および Boundary において同一の Maestro Flow を使用し、検索入力 Flow は独立したテストとして実行・管理します。
- APK はターゲット ABI が異なるため、CI で生成されたアーティファクトを実機検証用として流用してはなりません。

## Phase 2後半 ネイティブ Customer 購入検証

- Native Customer（顧客向けネイティブ機能）では、ログイン・セッション管理、プロフィール・配送先住所、ゲストカート統合、チェックアウト・モック決済、注文処理、レビュー投稿を、共通のアプリケーションユースケースおよび実 SQLite アダプターを介して実行・検証します。なお、Native Admin（管理者機能）は対象外です。
- 購入関連の主要 Flow は [`maestro/native-purchase.yaml`](../../maestro/native-purchase.yaml) および [`maestro/native-review.yaml`](../../maestro/native-review.yaml) です。各 Flow では Test Control による状態リセットと安定した testID を使用し、購入 Flow が失敗した場合は Review Flow を実行しないでください。
- Node.js の `node:sqlite` を用いたリポジトリ契約テスト（Repository Contract）は、SQL、外部キー制約（FK）、トランザクション挙動の高速な検証を目的としたものであり、Android および iOS 実環境における `expo-sqlite` ランタイム証跡の代用にはなりません。
- Android のローカル検証は本 Runbook の単体 Flow から順に開始します。一方、iOS は macOS 上の Reusable Workflow を介して、Automation 用および Production 用の未署名 Release Simulator ビルドを個別に実行し、ビルドメタデータ、Production Bundle Guard、生成された `.app` アーティファクトの検証を行います。なお、iOS シミュレータ上でのランタイム実行検証は、現行の正式な CI 責務には含めません。
- ネイティブコード変更時における最終ゲート `native-ci / verify` では、Detect、Static、Production Bundle Guard、Android（Automation／Production）ビルド、Android ランタイム検証、iOS（Automation／Production）ビルド、および iOS ビルドゲートのすべてにおいて fail-close（安全側に倒した厳格な判定）を要求します。リモート CI が未実行の段階では、ローカルで通っていても PASS 扱いとしてはなりません。

### 2026-08-08 現行ソース検証メモ

- 現行の Android 実機環境において、変更適用後の Automation Release APK を用いたビルド（`20260808-231500-android-postfix-build`）、インストール（`20260808-231900-android-postfix-install`）、スモークテスト（`20260808-231920-android-postfix-smoke`）の正常完了を確認しました。また、購入検証 Flow（`20260808-231940-android-postfix-purchase-merge`）では、ゲストカート数量 1、ログイン後のカート統合数量 2、およびチェックアウト成功を含むシナリオが 1/1 件すべて成功しています。
- 同一の変更後 APK において、Runtime 検証（`20260808-232100-android-postfix-runtime`）および Boundary 検証（`20260808-232400-android-postfix-boundary`）はいずれも各 5/5 件の Flow が成功しました。決済リトライ検証（`20260808-232800-android-postfix-payment-retry`）、チェックアウト途中の再起動検証（`20260808-232900-android-postfix-session-restart`）、レビュー投稿検証（`20260808-233000-android-postfix-review`）についても、それぞれ 1/1 件の成功を確認しています。
- Production 向けビルドでは、JS バンドルの対象タスクに絞った `--rerun-tasks` 実行後、パス短縮を施したワークスペース環境にて通常の `assembleRelease` を実施しました。その結果、現行 Postfix APK における Production マーカー 0 件、インストールおよびスモークテストの通過、ならびに `native-production-validation.yaml` の 1/1 件パスを確認しました。証跡は試行記録 `20260808-235600-android-postfix-production-current-shortpath` および `20260808-235900-android-postfix-production-install` に保存済みであり、全タスクを巻き込む無目的な `assemble --rerun-tasks` の再実行は行いません。
- iOS 向けワークフローでは、Automation および Production 用に解決された Expo メタデータを `expo config --json` で検査し、各ビルド後に生成された `.app` 内の `EXConstants.bundle/app.config` も直接検証します。Production ビルドではビルド時マーカーガード（Build-time marker guard）を維持し、双方のシミュレータ用 App を固定名のアーティファクトとして保存・アップロードします。なお、Windows 環境では iOS ビルドおよびリモートの GitHub Actions 実行は未実行であるため、静的なワークフロー契約テストの PASS とは明確に区別して記録しています。
- Android Automation の全 16 Flow は、コールドスタート時に `Native test runtime listening` の出力を最大 30 秒待機してから `Scenario Shop` の画面へ遷移します。一方、Production Flow では `Scenario Shop` のみ最大 30 秒待機した上で、Test Control や Contract Harness が非表示であることを検証します。なお、実行順序は `tests/contracts/native-test-control-maestro.test.ts` にて固定化されています。

## リポジトリへ追加しないもの

- `android/`、`ios/`
- APK／AAB／IPA
- `local.properties`
- SDK／NDK／CMake／Maestro 本体
- キーストア（keystore）、パスワード、認証情報（credential）
- `.artifacts/`
- Windows 固有の絶対パスを含む `.npmrc`
