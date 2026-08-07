# Native Maestro入力経路分離計画

## 0. 依頼概要

- 依頼内容: 物理Android端末の日本語IMEによる`inputText`不成立が、商品カード未検出としてStorefront／Cartの主要Flowを失敗させないようにする。検索入力の検証は専用Flowとして維持し、運用方針を文書化する。
- 背景: 同じインストール済みAPKで、SHV48の標準日本語IMEでは`P-0001`入力後に`native-product-card-product-basic-shirt`が検出できず、LatinIMEでは公式単体Gate 1/1とRuntime Suite 5/5が成功した。
- 期待成果: 主要Native FlowがIME非依存のDeep Link経路で安定し、検索入力のカバレッジを失わず、実機での専用入力Flowの前提条件が明確になる。

## 1. ゴール / 完了条件

- ゴール:
  - 商品を既知の`product-basic-shirt`へ遷移する主要Flowから、検索欄への`inputText`依存を除く。
  - `P-0001`の検索入力と商品カード表示を専用Maestro Flowで検証し続ける。
  - CI、ローカル実機、Native文書の責務と実行方法を一致させる。
- 完了条件（DoD）:
  - Storefront／Cart／Persistence系の主要Flowが`scenario-shop://products/product-basic-shirt`を使用する。
  - `maestro/native-search.yaml`が検索入力を独立して検証し、主要Runtime／Boundary Flowへ混在しない。
  - CIは主要Runtime／Boundaryと検索入力Flowを識別可能な別実行として扱う。
  - 標準日本語IMEでは専用検索Flowを成功扱いにせず、LatinIME等の制御されたIME条件を明記する。
  - Runbook、Troubleshooting、PROJECT_CONTEXT、ADR、履歴、Run Artifactが実装内容と一致する。

## 2. 現状理解と前提

- Current understanding:
  - Native商品詳細Routeは`scenario-shop://products/{productId}`で既存のOut-of-stock／Low-stock／Purchase-limit Flowから利用されている。
  - `native-storefront.yaml`、`native-cart.yaml`、`native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`だけが、対象商品へ到達する前に`P-0001`を入力している。
  - `native-local`のRuntimeSuiteは5 Flow、BoundarySuiteは5 Flowで固定され、CIも同じ主要Flow群を列挙している。
  - 検索画面には`native-catalog-search-input`と`native-product-card-product-basic-shirt`のtestIDがある。
- Assumptions:
  - 既存のProduct Deep Linkは公開商品詳細のテスト契約として継続利用できる。
  - 検索入力専用Flowは、主要Runtime／Boundaryの成功条件とは別に実行してよい。
  - Flowと文書だけの変更なので、現在インストール済みのAPKを再Build／再Installする必要はない。
- Non-goals:
  - 日本語IMEまたはMaestro CLI自体の恒久修正。
  - Native Catalogの検索仕様、Seed、商品Selector、アプリ本体コードの変更。
  - Remote CIの再実行、Git操作、生成APKや端末証跡のRepository追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。既存のDeep Link契約とユーザーが承認した「主要Flowと検索入力Flowの分離」方針で局所実装できる。
- 仮定してよい細部: 検索専用Flowのファイル名は`native-search.yaml`とし、ローカルでは既存の`Test -Flow`入口で実行する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Maestro主要Flow、検索入力専用Flow、Native CIのMaestro実行。
  - Windows Android実機Runbook、IMEトラブルシューティング、プロジェクトContext、ADR／履歴。
- Files to inspect:
  - `maestro/native-storefront.yaml`
  - `maestro/native-cart.yaml`
  - `maestro/native-restart-persistence.yaml`
  - `maestro/native-reset-dirty-state.yaml`
  - `maestro/native-search.yaml`（新規）
  - `.github/workflows/native-ci.yml`
  - `scripts/native/windows/android-local.ps1`
  - `docs/native/README.md`
  - `docs/native/windows-android-local-validation.md`
  - `docs/native/windows-android-troubleshooting.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/adr/0007-native-maestro-input-path-separation.md`（新規）

## 5. 変更方針

- Change strategy:
  1. 既知商品の詳細・Variant・Cart操作を検証する4つの主要FlowをProduct Deep Linkへ切り替える。
  2. `P-0001`入力、検索実行、対象商品カード検出だけを`native-search.yaml`へ分離する。検索検証自体は削除しない。
  3. CIでは検索入力Flowを主要Runtime／Boundaryとは別のMaestro実行として追加する。ローカルの標準Runtime／Boundaryの分母は変更しない。
  4. 文書へ、主要FlowはIME非依存、検索専用FlowはIME条件付き、標準日本語IMEでの失敗は未検証／失敗として扱うことを記載する。
- 実行タスク:
  - [ ] 1. 主要4 FlowをDeep Linkへ変更し、検索入力専用Flowを追加する。
  - [ ] 2. CIで検索専用Flowを別実行へ追加する。
  - [ ] 3. Runbook、Troubleshooting、README、Context、ADR、履歴を更新する。
  - [ ] 4. YAML／format／lint／typecheckと実機Maestroを検証する。

## 6. 検証方法

- Validation plan:
  - 変更後のMaestro YAMLで、主要Flowに`inputText: "P-0001"`が残っていないことを検索する。
  - `pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`git diff --check`を実行する。
  - 実機で既定IMEのまま`Test`、`RuntimeSuite`、`BoundarySuite`を実行する。主要FlowのDeep Link化により入力依存なしで通ることを確認する。
  - LatinIMEを一時有効化した実機で`-Action Test -Flow maestro/native-search.yaml`を実行し、終了後に元のIMEと有効IME一覧を復元する。
  - Remote CIはPush／Workflow再実行禁止のため実行しない。
- 成功判定:
  - 主要Runtime 5/5、Boundary 5/5、検索専用Flow 1/1がそれぞれ確認できる。
  - 未実行のRemote CIはPASSと記録しない。

## 7. リスクと未解決論点

- Risks:
  - Product Deep LinkのRoute契約が壊れると、検索以外のFlowも失敗する。既存のBoundary Flowで同じRouteを利用していることを根拠に変更する。
  - 検索専用FlowはIME条件に依存する。標準日本語IMEでの失敗をアプリ不具合や検索仕様不具合と混同しない。
  - CIと物理端末でIMEが異なるため、CI成功だけで標準日本語IMEの検索入力成功を保証しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 主要Maestro 4 Flow、検索専用Maestro Flow、Native CI、Native運用文書、PROJECT_CONTEXT、ADR、履歴、Run Artifact。
- 付随ドキュメント: 本計画書。

## 9. 備考

- `output/mobile-native/`と`.artifacts/native-local/<timestamp>/`の成果物責務分離は維持し、今回の変更で生成物や端末固有情報をRepositoryへ追加しない。
