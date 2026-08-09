# Native ローカル検証

Native Build は EAS Cloud ではなく、Windows／macOS のローカル Toolchain を主経路とする。

このディレクトリは、人間と AI エージェントが同じ手順・同じ停止条件で実行するための正本である。README や Skill に詳細手順を複製しない。

## Windows／Android

- [Windows Android 実機検証 Runbook](./windows-android-local-validation.md)
- [Windows Android トラブルシューティング](./windows-android-troubleshooting.md)
- 実行入口: [`scripts/native/windows/android-local.ps1`](../../scripts/native/windows/android-local.ps1)
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

単体 Flow が失敗した場合、後続 Suite は実行しない。スクリーンショット、Accessibility Hierarchy、logcat、JUnit、Maestro Output を保存し、失敗原因を確認してから修正する。

Build／Install／Test／Maestroの再実行前は、直近Runと失敗ログ、変更差分、成功条件を確認し、Runbook 5.1.1のpreflightと仮説テンプレートを使う。同一条件の無目的な再実行、上流失敗後の後続工程、Timeout延長やAssertion削除だけの成功扱いは禁止する。

Persistence／BoundaryのCI実行は、次の5 Flowを1つずつ独立したStepとして実行する。各Stepは固有のJUnitと`maestro-artifacts/<flow-name>/`を持ち、先行Flowが失敗しても後段の証跡収集は`always`で実行する。

- `native-restart-persistence.yaml`
- `native-reset-dirty-state.yaml`
- `native-out-of-stock.yaml`
- `native-low-stock.yaml`
- `native-purchase-limit.yaml`

再起動後のCart確認では、汎用的な数量文字列ではなく、`native-persisted-state-ready`、`native-cart-badge-count`、`native-cart-item-<productId>-<variantId>`、`native-cart-quantity-<productId>-<variantId>`を使う。`native-persisted-state-ready`はCart Repositoryの読み込み完了後だけ表示する。

ScrollView内の成功メッセージや結果表示をMaestroで確認するときは、stableなtestIDを付け、`scrollUntilVisible`で可視領域へ移動してからassertする。表示要素が画面下端へ移動した後に次の上側の操作へ戻る場合は、対象IDを`direction: UP`で再表示する。画面外要素に対する文字列`extendedWaitUntil`だけで判定せず、assertion削除や固定Sleepで失敗を隠さない。

Windows Android Build の Path／Autolinking 復旧は、Runbook 4.3 と [トラブルシューティング 9](./windows-android-troubleshooting.md#9-buildninja-が-still-dirty-after-100-tries-で失敗) を参照する。

## Maestro の入力経路

- 既知商品の詳細、Variant、Cart、Persistenceを確認する主要Flowは、`scenario-shop://products/<productId>`のDeep Linkで商品を開く。主要FlowをIMEの入力状態に依存させない。
- 検索欄への`inputText`、商品Code検索、検索結果カードのタップ、商品詳細画面の表示確認は、[`maestro/native-search.yaml`](../../maestro/native-search.yaml)に分離してカバレッジを維持する。これはRuntime／Boundaryの主要Flowとは別に実行する。
- 物理端末の標準日本語IMEがASCII入力を保持しない場合、検索専用Flowを成功扱いにせず、LatinIME等の制御された入力方式へ一時切替してから実行する。終了後は元のIMEと有効IME一覧を必ず復元する。
- 検索入力の失敗を理由に、既知商品の主要Flowへ検索操作を戻したり、`assertVisible`を削除したりしない。

## Native テスト成果物の保存先

- 人が確認・共有するモバイルネイティブのスクリーンショット、比較画像、選定した画面証跡は `output/mobile-native/` に保存する。リポジトリ直下には置かない。
- 同じシナリオを複数回保存する場合は、シナリオ名、検証段階、Run ID または JST timestamp をファイル名またはサブディレクトリに含め、既存成果物を上書きしない。
- Maestro／ADB／Gradle のログ、JUnit、Hierarchy、APK 情報など実行ごとの機械証跡は、引き続き `.artifacts/native-local/<timestamp>/` に保存する。`output/mobile-native/` は共有・確認用の成果物、`.artifacts/` は実行証跡として役割を分ける。
- `output/` は Git 管理外であるため、生成物を Repository に追加するための `.gitkeep` や個別の ignore 追加は行わない。

## CI との違い

- GitHub Actions: API 34 の x86_64 Emulator
- Windows ローカル: USB 接続した Android 実機。ABI は実機から自動判定する
- CI とローカルは主要Runtime／Boundaryで同じ Maestro Flow を使い、検索入力Flowは独立した実行として扱う
- APK は ABI が異なるため、CI Artifact を実機用として流用しない

## Phase 2後半 Native Customer 購入検証

- Native Customer は、Login／Session、Profile／Address、Guest Cart統合、Checkout／Mock Payment、Order、Reviewを共有Application Use Caseと実SQLite adapterで実行する。Native Adminは対象外である。
- 購入系の主要Flowは [`maestro/native-purchase.yaml`](../../maestro/native-purchase.yaml) と [`maestro/native-review.yaml`](../../maestro/native-review.yaml) である。各FlowはTest Control Resetと安定testIDを使い、購入Flow失敗後にReview Flowを実行しない。
- Node `node:sqlite`のRepository ContractはSQL／FK／transactionの高速確認であり、Android／iOSの実`expo-sqlite` runtime証跡の代替ではない。
- Androidローカルは本Runbookの単体Flowから開始する。iOSはmacOS上のReusable WorkflowでBuild／Runtimeを分離し、署名なしRelease Simulator AppをArtifactで受け渡す。
- Native変更時の最終 `native-ci / verify` は、Detect、Static、Production Bundle Guard、Android Automation／Production Build、Android Runtime、iOS Automation／Production Build、iOS Runtimeをfail-closeで要求する。Remote CI未実行時はPASSと扱わない。

### 2026-08-08 現行ソース検証メモ

- 現行Android実機では、変更後Automation Release APKのBuild `20260808-231500-android-postfix-build`、Install `20260808-231900-android-postfix-install`、Smoke `20260808-231920-android-postfix-smoke`を確認した。Purchase `20260808-231940-android-postfix-purchase-merge`はGuest Cart数量1、Login後の統合数量2、Checkout成功を含む1/1である。
- 同じ変更後APKでRuntime `20260808-232100-android-postfix-runtime`とBoundary `20260808-232400-android-postfix-boundary`は各5/5、Payment retry `20260808-232800-android-postfix-payment-retry`、Checkout restart `20260808-232900-android-postfix-session-restart`、Review `20260808-233000-android-postfix-review`は各1/1である。
- Productionは、JS bundleのtargeted `--rerun-tasks`後に短縮Workspace条件で通常`assembleRelease`を行い、現行Postfix APKのProduction marker 0件、Install／Smoke、`native-production-validation.yaml` 1/1を確認した。Attempt `20260808-235600-android-postfix-production-current-shortpath`と`20260808-235900-android-postfix-production-install`に証跡を保存し、全`assemble --rerun-tasks`の無目的な再実行は行わない。
- iOS WorkflowはAutomation／ProductionのRuntime Metadataを`expo config --json`で検査し、独立Build Jobで生成した両Simulator AppをArtifact化してRuntimeへ渡す。WindowsではiOS SimulatorとRemote GitHub Actionsは未実行であり、静的Workflow契約のPASSとは分離して記録する。

## Repository へ追加しないもの

- `android/`、`ios/`
- APK／AAB／IPA
- `local.properties`
- SDK／NDK／CMake／Maestro 本体
- keystore、password、credential
- `.artifacts/`
- Windows 固有の絶対パスを含む `.npmrc`
