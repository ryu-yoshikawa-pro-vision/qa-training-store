# Phase 2後半 Native購入・自動化・正式CI 計画

## 0. 依頼概要

- 依頼内容: 最新`main`相当のPhase 2前半基盤を再調査し、Native会員購入Flow、実SQLite契約、Android/iOS Maestro、Production-validation、正式Native CI Gateまでを実装する。
- 背景: 現在のNativeはCatalog／Guest Cartまでで、Login、Account、Checkout、Payment、Order、Reviewはplaceholderである。Web/Application側には対応する業務契約とDexie実装が存在する。
- 期待成果: Android/iOSの購入者向け主要Flowを共有Application契約で実行でき、実Runtime検証とCI Contractが実装された状態にする。未実施のRemote CIはPASS扱いしない。

## 1. ゴール / 完了条件

- ゴール: Gate A〜G（Baseline/Auth、Account/Address、Checkout/Payment/Order、Review、Cross-platform Automation、Native CI/Production、最終回帰）を、前半のArchitecture／Storage／Harness契約を維持して完了する。
- 完了条件（DoD）:
  - Login、Logout、Session復元・無効Session fallback、Role拒否、Guest Cart統合がNativeで成立する。
  - Profile／Address CRUD、Validation、Default制約、未保存変更保護が成立する。
  - Checkout start/resume/abandon、Cart version／価格／在庫再確認、Mock Payment success／failure／retry／processing、Order一覧／詳細が成立する。
  - delivered OrderだけReview投稿可、編集／削除、Review Summary更新が成立する。
  - Native実SQLiteのFK／exclusive transaction／commit後返却／Harness隔離・cleanupが成立する。
  - Android／iOS主要Maestro、Production Runtime無効化、iOS実`expo-sqlite` HarnessのFlow定義とCI経路が存在する。
  - Android／iOS BuildとRuntimeを分離し、`native-ci / verify`がfail-closeで結果を集約する。
  - すべてのローカル／Remote検証を実施事実に基づきPASS／FAIL／BLOCKED／NOT RUNで記録する。

## 2. 現状理解と前提

### Current understanding

- checkoutは`feat/phase2-native-purchase-automation`だが、`HEAD`は`main`／`origin/main`と同じ`eb03909`で、作業差分はない。
- Native Root／Route／Composition Root、`expo-sqlite`のGuest Storefront／Cart、Native KV、PBKDF2、Version 1 Test Control、専用Harnessは前半で実装済みである。
- `src/application/use-cases/`、`src/domain/`、Web Dexie repository、Seed DatasetにはAuth、Account、Cart Merge、Checkout、Payment、Order、Reviewの既存契約がある。
- Native `CUSTOMER_SCHEMA_SQL`はusers／sessions／catalog／cart等を持つが、user_addresses、checkout_sessions、orders、payments、shipments、reviews等の購入系Tableはまだない。
- `.github/workflows/native-ci.yml`はDetect→Native Static／Production Bundle Guard／Android Build→Android Runtime→`native-ci / verify`のAndroid構造を持つ。iOSは`workflow_dispatch`のみのAutomation Build／Runtime一体Jobで、Native CIのfinal graphには未接続である。
- `eas.json`のdevelopment／preview／production-validation mappingとProduction Bundle Guardは既存契約として維持する。
- Windows checkoutではiOS Simulatorをローカル実行できない。GitHub-hosted macOS／Remote CI結果が得られるまでiOS実Runtimeは未確認と記録する。

### Assumptions

- Native購入者Runtimeは、既存の共有Use CaseとDomain型へNative SQLite repository／transaction runnerを注入する。Web用Dexie、DOM、CSS、React Aria、Browser StorageはNativeへ持ち込まない。
- Native Database Schema Versionは購入系Table追加に合わせて更新し、既存の前半DBを安全に再SeedできるDevelopment／Automation経路を採用する。Migration Recoveryは対象外とする。
- Native UIは既存のExpo Router URLを保ち、iOS／Android差はSafe Area、Keyboard、Back、Navigation等の必要箇所だけに限定する。
- 既存Scenarioで表現できる場合は新Scenarioを増やさず、Native Test Controlの受理範囲だけを購入Flow向けに拡張する。
- Remote CIの起動、commit、push、PR作成、Mergeはユーザー作業であり、本Runでは実施しない。

### Non-goals

- Native Admin、Guest Checkout、Password変更、退会、Cancel／Return／Refund、Audit Log、Payment timeout／unknown、Reconciliation、Crash Recovery、Migration Recovery。
- 新Storage、Sentinel基盤、全DB Fingerprint、独自Test Framework、Global Mutation Queue、任意SQL／Entity／Status変更API。
- iOS物理端末、署名、Provisioning Profile、IPA、TestFlight、App Store、Self-hosted Mac、Device Farm、EAS Cloud Build／Workflow／Submit。
- Phase 3機能、不要なComposite Action／Reusable Workflow階層、実測前の複雑なCache最適化。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーGoalで対象、禁止事項、DoD、Git操作禁止、Remote CI未実施時の判定が明示されている。
- 仮定してよい細部: 既存のWeb Application契約、Seed Scenario、Stable testID、既存CI Action Version、Native Route URLを正本として局所実装する。
- 未回答の重要質問: なし。Remote CIの実行結果だけは、ユーザーがpush後に取得するFollow-upである。

## 4. 影響範囲

- Impacted areas:
  - Native Composition Root／Route／Shell／購入者UI
  - Native SQLite schema、seed、mappers、repository capabilities、transaction runner
  - Native Session／Test Control／Payment Delay／Contract Harness
  - Native Component／Repository／Contract tests、Maestro Flow
  - Android／iOS Native CI、Production-validation、CI Contract
  - README、PROJECT_CONTEXT、Native Runbook、Phase 2計画、ADR、Run Artifact
- Files to inspect:
  - `src/application/contracts/**`, `src/application/use-cases/**`, `src/domain/**`
  - `src/infrastructure/database/dexie/**`, `src/infrastructure/database/sqlite/**`
  - `src/seeds/metadata.ts`, `src/seeds/scenarios.ts`, `src/seeds/default-dataset.ts`, `src/seeds/load-seed.ts`
  - `src/bootstrap/native-runtime.ts`, `src/presentation/native/**`, `app/**/*.native.tsx`
  - `src/test-controls/**`, `tests/component/native/**`, `tests/repository-contract/**`, `tests/contracts/**`
  - `maestro/**`, `.github/workflows/native-ci.yml`, `.github/workflows/native-ios-ci.yml`, `eas.json`, `app.config.ts`, `metro.config.cjs`

## 5. 変更方針

- Change strategy:
  1. Phase 2前半Baselineと既存Main／ADR／Runを記録し、Native購入拡張とiOS正式Gateの設計判断をADRへ保存する。
  2. Native SQLiteへ購入者Capabilityに必要なTable、FK、seed writer、row parserを追加し、共有Application repository contractを実装する。Scopeごとの`withExclusiveTransactionAsync()`で非冪等Mutationを囲み、結果はcommit後に返す。
  3. Native Composition RootでPassword、Clock、KV、Payment Gateway、Address Lookup、Repository、Transaction Runnerを注入し、Auth／Account／Checkout／Order／Review UIを実装する。Roleはcustomer購入Flowだけを許可し、operator／adminは対象外表示とLogoutだけにする。
  4. 購入系Scenario、Payment Delay、Harness Suite、Native Component／Contractを追加し、Application DB／KV隔離とReview／Orderの実SQLite整合を固定する。
  5. 共通可能なMaestro YAMLを作り、Flow先頭Reset、安定testID、Flow単位Evidence、Production無効化FlowをAndroid／iOSへ接続する。
  6. AndroidのBuild／Runtime分離を保持したままAutomation／Production Buildを追加し、iOS WorkflowをBuild／Runtime分離・`workflow_call`対応へ再構成してNative CIへ接続する。
  7. Gate別検証、全体回帰、自己レビュー、文書更新、Sanitizer Write／Checkを行い、Remote CI未実施なら完全完了と記録しない。
- 実行タスク:
  - [ ] 1. 必須文書、ADR、直近Run、現在のMain相当、Baselineコマンドを再調査しRun Artifactへ記録する。
  - [ ] 2. Native購入SQLite拡張とTransaction／Repository adapterを実装する。
  - [ ] 3. Native Composition Rootへ全Customer Application servicesを注入する。
  - [ ] 4. Gate AのAuth／Session／Role拒否／Guest Cart統合を実装する。
  - [ ] 5. Gate BのProfile／Address／Default／未保存変更を実装する。
  - [ ] 6. Gate CのCheckout／Payment／Orderを実装する。
  - [ ] 7. Gate DのReviewと専用Seed Scenarioを実装する。
  - [ ] 8. Test Control／Payment Delay／購入系Contract Harnessを拡張する。
  - [ ] 9. Native Component／Repository／Contractテストを追加する。
  - [ ] 10. Android／iOS主要MaestroとProduction-validation Flowを追加する。
  - [ ] 11. Android／iOS Build／Runtime分離、Artifact、Evidence、final verifyを実装する。
  - [ ] 12. CI Contract Test、EAS／Bundle Guard、Detect Pathを更新する。
  - [ ] 13. Web回帰、Native回帰、ローカル実機／Simulator検証を実行し、失敗を分類する。
  - [ ] 14. Documentation、ADR、PROJECT_CONTEXT履歴、Phase 3残課題、Run Artifactを更新する。
  - [ ] 15. 自己レビュー、Sanitizer、最終DoD判定を行う。

## 6. 検証方法

- Validation plan:
  - Baseline／focused: `pnpm run test:component:native`, `pnpm run test:repository`, `pnpm run test:contracts`, `pnpm run typecheck`, `pnpm run check:native-route-dependencies`, `pnpm run validate:eas:config`, `pnpm run validate:native-production-bundle`。
  - Gate別: Auth／Account／Checkout／Payment／Order／ReviewのUnit／Integration／Native Component／Repository Contractを対象ファイル単位で実行する。
  - SQLite: Node Contractは共有契約の高速回帰、Android Emulator／iOS Simulatorはビルド済みAppの実`expo-sqlite` Harnessとして別々に記録する。FK、transaction、idempotency、seed、cleanup、Application DB不変を確認する。
  - UI: Android／iOS Maestro主要8 FlowをFlow単位で実行し、失敗時にJUnit、Screenshot、Hierarchy、Runtime log（iOSは`simctl diagnose`）を`.artifacts`へ保存する。
  - CI: YAML parse、CI Contract、Detectのnative changed／skip、Build Artifact受け渡し、Build JobとRuntime Jobの相互非実行、iOS `iphonesimulator`／Release／`CODE_SIGNING_ALLOWED=NO`、final fail-closeを静的に検証する。
  - Full regression: `pnpm run lint:markdown`, `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:component:native`, `pnpm run test:repository`, `pnpm run test:contracts`, `pnpm run check:native-route-dependencies`, `pnpm run validate:eas:config`, `pnpm run verify`。
  - Android／iOS Build／Install／Maestroを新規実行する前に、直近Run、変更差分、Shell／Version、Toolchain、容量／SDK／ADB／Simulator条件、成功Baselineを確認し、仮説とAttempt IDをREPORTへ記録する。
- 成功判定:
  - コード／静的／ローカル検証は各項目を実行結果で判定する。
  - Android／iOSの実RuntimeまたはRemote CIを実行できない場合はBLOCKEDまたはNOT RUNとし、コード実装完了とPhase 2完全完了を分離する。
  - `native-ci / verify`はNative変更時にDetect、Static、Guard、Android Build／Runtime、iOS Build／Runtimeをすべてsuccess要求し、Native変更なし時のみ全重Job skipをsuccess扱いにする。

## 7. リスクと未解決論点

- Risks:
  - Native Schemaを広げると前半のFK／Seed／Harness／Schema Version契約を壊す可能性があるため、Schema、Seed、Contractを同一変更単位で検証する。
  - 共有Use Caseのtransaction scopeに対するSQLite Repository実装不足は、UIでは見えない注文／決済整合不良を起こすため、PaymentとReviewを実SQLite Contractで確認する。
  - WindowsではiOS Buildを実行できず、Remote CI未実行では正式DoDを満たせない。未確認をPASS扱いしない。
  - iOS Build／Runtime分離を既存Workflowへ追加する際、Android責務分離、Native変更なしSkip、Web CI独立性を壊す可能性がある。
  - 既存25ファイル等のbaseline format／環境エラーが再発した場合は、変更差分・共有依存・環境を比較し、無目的なretryをしない。
- Open questions:
  - Remote GitHub Actionsの最新Head実行結果は本Run開始時点で未取得であり、ユーザーのpush後に確認が必要である。
  - macOS Runnerの実際のXcode／Simulator／Maestro利用可否はWorkflow実行まで確定しない。

## 8. 成果物

- 変更ファイル: Gate A〜FのNative source、SQLite／Seed／Harness／tests、Maestro、Native CI／iOS CI、CI Contract、関連設定。
- 付随ドキュメント: 本計画、ADR、README、PROJECT_CONTEXTと履歴、Native Build／CI／Maestro／Production-validation手順、Phase 2計画、Run Artifact、Phase 3残課題。

## 9. 備考

- Git mutation（add／commit／push／reset／clean／checkout等）は行わない。
- Run Artifactの生ログは`.artifacts/native-local/<attempt-id>/`へ置き、標準ArtifactにはSanitizedな要約と相対参照のみを記録する。

## 10. 実装進捗（2026-08-08）

- 実装済み: Native SQLite購入Schema／Seed／Repository／Transaction、Customer Composition Root、Auth／Account／Checkout／Order／Review UI、購入系Scenario、Payment Delay、Contract Harness、Android／iOS Maestro Flow、iOS Reusable CI、Native CI final verify。
- 検証済み: Node `node:sqlite` Application Flow、Native Component／Repository／Contract、Typecheck、Lint、Security、Production Bundle Guard、Web Build、Android実機のBuild／Install／Smoke／Control／Runtime／Boundary／Purchase／Review。
- 未確認: Windows上のiOS Simulator、GitHub-hosted Remote CI、EAS Cloud。`pnpm run verify`は未変更Baseline 2ファイルのPrettier不整合で入口停止したため、後続ゲートは個別に実行してPASSを確認した。
- 判定: コード／静的／Android実機のPhase 2後半実装は進捗済みだが、iOS実RuntimeとRemote CIが未確認のため、Phase 2完全DoDは未完了として扱う。
