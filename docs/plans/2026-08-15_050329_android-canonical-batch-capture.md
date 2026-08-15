# Android Canonical Visual Batch Capture 計画

## 0. 依頼概要

- 依頼内容: PR #24 の Android canonical visual 25件を、固定API34 canonical環境で一括取得・検証・promotionできる経路を追加する。
- 背景: 現在のNative CIは1 workflow run / 1 emulatorでsingle Capture Caseだけを取得するため、25件の実取得からFinal Visual Gateまでの実行経路がない。
- 期待成果: Registry由来の25件を一つのworkflow runで取得し、artifactのbatch provenance・profile・APK SHA・source SHAを全件検証してからcanonical assetへall-or-nothingで反映できる。

## 1. ゴール / 完了条件

- ゴール: `capture_case_key=all` による一括captureと、検証完了後だけpromotion・status transitionを行う安全なapply CLIを実装する。
- 完了条件（DoD）:
  - Android case listがRegistryからdeterministicに導出される。
  - single capture互換を維持する。
  - batchは1 APK build、1 emulator、1 profile normalization、1 installで25 caseを順番に処理する。
  - case失敗時は`complete=false`、workflow failure、promotion拒否になる。
  - batch manifest、全raw PNG、全per-case manifest、source SHA、APK SHA、canonical profileを全件検証できる。
  - validation後に一時WebPを全件生成し、成功後だけcanonical pathへ反映する。
  - 実capture完了前のAndroid `blocked`状態とFinal Gateは変更しない。

## 2. 現状理解と前提

- Current understanding:
  - PR #24 remote HEADは`c5082e4d78fe7c99b2e70cb09133f98cf21d7f0f`で、branchは`feat/implement-screen-catalog-visual-specification`。
  - remote Native CIは`capture_spec_visuals`とsingle `capture_case_key`を受け、`android-visual-capture.ts describe-case`→Maestro→PNG→manifest→artifactの経路を持つ。
  - `scripts/spec/visual-registry.ts`がAndroid Capture CaseのSSOTで、現在25件が`blocked`、canonical profileは`api_level=34`、`google_apis`、`x86_64`、`pixel_2`、`ja-JP`、`1`、light、portrait、`1080x1920`、density `440`。
  - `promoteAndroidVisualCapture`はsingle caseのmanifest・source SHA・APK digest・profile・canonical output pathを検証する既存ロジックである。
  - `materialize:spec-visual-references`はRegistryで`captured`になったcaseのMarkdown referenceを生成する。
- Assumptions:
  - 現local worktreeはPR #24の実装対象であり、ユーザーが後で同じ変更をcommit/pushする。
  - Git CLIの代わりにGitHub API/CLIのread-only操作を使い、commit/push/branch操作はしない。
  - batch applyはartifact root、同一runのAutomation APK、PR HEAD SHAを受け取り、全件検証成功後にexplicit status transitionを行う。
- Non-goals:
  - Product UI、Native setup/ready assertion、startup helper、Final Visual Gateの緩和。
  - 25 emulator matrix、generic capture DSL、workflow自動commit、placeholder/fake asset。
  - Physical API30 screenshotのcanonical promotion。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。固定profile、branch、dispatch inputs、promotion条件、Git禁止が明示されている。
- 仮定してよい細部: batch artifact内の`raw/<SCREEN>/<STATE>/android.png`と`android.manifest.json`、rootの`batch.manifest.json`というlayoutを採用する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Android visual capture CLIのRegistry listing、batch manifest validation、all-or-nothing promotion。
  - Native CI manual workflowのbatch loopとartifact upload。
  - contract testsとpackage script。
  - 実capture成功後の既存Registry status、Markdown reference、generated spec materialization。
- Files to inspect:
  - `.github/workflows/native-ci.yml`
  - `scripts/spec/android-visual-capture.ts`
  - `scripts/spec/visual-registry.ts`
  - `scripts/spec/materialize-visual-references.ts`
  - `maestro/native-visual-capture.yaml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `tests/contracts/visual-contract.test.ts`
  - `package.json`

## 5. 変更方針

- Change strategy:
  1. CLIにRegistry由来の`list-cases`とbatch manifest schema/validationを追加し、既存single manifest validatorを再利用する。
  2. `apply:android-spec-visuals`相当のbatch applyを追加し、validation→temporary WebP生成→canonical反映→explicit status transitionの順序を固定する。
  3. Native CIのcapture stepをsingle/all分岐にし、allでは同一emulator上でcaseごとに既存reset/setup/route/role/ready/screenshot/manifestを繰り返す。YAMLにcase keyを複製しない。
  4. contract testでsingle互換、Registry list、duplicate/missing/unexpected/incomplete/stale SHA/APK/profile/path traversal/all-or-nothingを固定する。
  5. local structural/static/contract/native validationを実行し、Final GateはAndroid 25 blockedのため期待どおりredのまま確認する。
  6. `HANDOFF_A_PUSH_REQUIRED`でユーザーへcommit/pushを依頼する。push後にremote gateを再確認してからActions dispatchへ進む。

## 6. 検証方法

- Validation plan:
  - `pnpm run format:check`
  - `pnpm run lint:markdown`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run validate:spec`
  - `pnpm run build:spec`
  - `pnpm run test:contracts`
  - `pnpm run test:component:native`
  - `pnpm run check:native-route-dependencies`
  - `pnpm run validate:eas:config`
  - `pnpm run validate:native-production-bundle`
  - `pnpm run verify`（Final GateのみEXPECTED FAIL）
  - CLI batch fixture tests（全件valid時のみpromotion、invalid時canonical mutationなし）。
- 成功判定:
  - State Aではbatch implementationと関連contractがPASSし、Final Gateは`Captured 69/94, Blocked 25`だけを理由にEXPECTED FAIL。
  - State BではActions runの同一run artifact/APK、25/25、`complete=true`、全profile/SHA一致を確認し、applyが全件成功する。
  - State Cでは最新PR HEADのrequired CIとFinal Visual GateがPASSする。

## 7. リスクと未解決論点

- Risks:
  - 1 case失敗を部分promotionするとcanonical provenanceが混在するため、batch manifestを必須にし、validationをmutation前に完了させる。
  - workflow内の同じEmulatorでも、各caseのreset/setupを省略すると前case stateを再利用するため、既存capture flowをcaseごとに起動する。
  - remote push前にActionsをdispatchすると旧workflowを実行するため、State B remote gateを必須にする。
  - ActionsのAPI34環境・権限・長時間実行が利用できない場合は、実行証跡を残して無理にpromotionしない。
- Open questions: 実装を止めるものはない。Actions実行時の失敗はjob/step原因を分類して次のiterationまたはHANDOFFへ接続する。

## 8. 成果物

- 変更ファイル: workflow、Android capture CLI、package script、contract tests（必要最小限）。
- 付随ドキュメント: 本計画、Run artifact。実capture成功後は既存materialize scriptでMarkdown/generated outputを更新する。

## 9. 備考

- Final Visual Gate、Android startup helper、Checkout Address/Payment/Confirm semanticsは変更しない。
- canonical assetは固定API34 profileのActions artifactからのみ生成する。
