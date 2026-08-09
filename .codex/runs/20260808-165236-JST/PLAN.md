# Plan

## Objective

- 最新`main`相当のPhase 2前半Native基盤を維持し、Phase 2後半の会員購入Flow、実SQLite契約、Android/iOS Maestro、Production-validation、正式Native CI Gateを実装・検証する。

## Scope

- In: Native Customer Auth／Session／Guest Cart Merge、Account／Address、Checkout／Mock Payment／Order、Review、Test Control／Harness、Native Component／Contract、Maestro、Android／iOS CI、Production-validation、関連文書とRun Artifact。
- Out: Native Admin、Guest Checkout、iOS物理端末／署名、EAS Cloud実行、Phase 3、任意SQL／Sentinel／新Storage／Global Mutation Queue、Git mutation。

## Assumptions

- checkoutの`HEAD`は`main`／`origin/main`と同じ`eb03909`で作業差分がない。
- Web/Application側の既存Use Case、Domain型、Repository Contract、Seed Scenarioを業務契約の正本とする。
- NativeはCustomer Capabilityだけを生成し、Web Dexie／DOM／CSS／Browser Storageを参照しない。
- WindowsではiOS Simulatorを実行できないため、Remote macOS CI未実施の項目はPASSにしない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Goalにスコープ、禁止事項、DoD、Git操作禁止が明示されている。
- 仮定してよい細部: 既存Route、Stable testID、Action Version、Scenario、CI Action Versionを維持し、追加判断が不要な局所実装は安全側に倒す。
- 未回答の重要質問: なし。Remote CIの実行結果だけはpush後のFollow-upで取得する。

## Hypotheses

- H1: 既存Web Application契約とDexie repositoryの挙動をSQLite Adapterへ移植すれば、Native UIとWebの業務意味を一致させられる。反証はRepository Contract／Integrationで判定する。
- H2: SQLite全購入者TableをFK付きで同一Schema／Seedへ追加し、Scope単位のexclusive transaction runnerを使えば、Checkout／Payment／Reviewの整合を保てる。反証は実SQLite ContractとHarnessで判定する。
- H3: iOSをReusable WorkflowのBuild／Runtime分離としてNative CIへ接続すれば、Android責務分離を壊さずfinal verifyへfail-closeできる。反証はCI Contract TestとYAML parseで判定する。

## Research Plan

- Round 1 Query: 必須文書、ADR、直近Run、現行Main、Native Route／Composition Root／SQLite／KV／Harness／Maestro／CIを確認する。
- Round 2 Query: Application Use Case、Domain Repository、Dexie実装、Seed Scenario、既存Contractを確認し、Nativeのsafe change surfaceと不足箇所を確定する。
- Exit Criteria:
  - 主要仮説ごとに既存コードとテストの支持／反証根拠がある。
  - Native購入拡張とiOS CI責務分離をADRへ保存している。
  - 実装対象ファイル、禁止事項、Gate別検証方法を`docs/plans/`とTASKSへ落としている。

## Approach

- 1. Baselineと既存契約を再確認し、Gate単位の変更境界を固定する。
- 2. Schema／Seed／Mapper／Repository／Transactionを先に実装し、Application Use Caseへ注入する。
- 3. AuthからReviewまでNative UIをGate順に実装し、各Gateのfocused testを追加する。
- 4. Harness／Maestro／Production Runtimeを実装し、AndroidとiOSの共通Flowを再利用する。
- 5. Android CIの既存Build／Runtime分離を保持し、iOSを同じGraphへ追加する。
- 6. 全回帰、文書、自己レビュー、Sanitizer、Remote未実施判定を行う。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> 実装 -> focused validation -> full validation -> REPORT`

## Definition of Done

- Gate A〜Gのコード／Static／Test／Local Runtime／Remote Runtimeを実施事実で判定し、Critical／Highを残さない。
- Android/iOSの主要購入Flow、実SQLite Harness、Production無効化、Build／Runtime分離、fail-close final verify、Web回帰、文書が最新実装と一致する。
- Remote CI未実施時は「コード実装完了・Local/static verification完了・Remote pending・Phase 2 final DoD pending」と記録する。

## Risks / Unknowns

- Native Schema拡張による前半FK／Seed／Harness回帰。対策: Schema、Seed、Mapper、Contractを同一Gateで検証する。
- Native Repositoryのtransaction scope不備による注文／決済／Review整合不良。対策: shared contract、Node SQLite、実Runtime Harnessを分離して検証する。
- WindowsでiOS Build／Simulatorを実行できない。対策: iOSはRemote macOS CIを未確認として記録し、静的／Android／Webを継続する。
- 既存baselineのformat／環境失敗。対策: 直近Run／差分／環境を確認し、仮説なしの再試行をしない。

## Thinking Log

- 2026-08-08 17:00 JST: `HEAD`が最新`main`と一致し差分なしであることを確認した。
- 2026-08-08 17:00 JST: NativeはCatalog／Guest Cartのみ、Web/Applicationは後半契約まで実装済みと確認した。Native専用Use Caseを新設せず、SQLite AdapterとComposition Rootを拡張する方針を採用した。
- 2026-08-08 17:00 JST: 前半のNative SQLite限定範囲とiOS CI単独Workflowを後半Goalの明示要件に合わせるため、ADR-0009／ADR-0010を実装前に保存した。

## Final status（2026-08-08）

- Android Automation／Productionの現行ソースBuild、実機Install／Smoke、購入系Maestro、Runtime／Boundary、Production validationを完了した。
- CI契約、全テスト、Web export、Native bundle guard、静的検査、Run artifact Sanitizerを完了した。自己レビューのCritical／High未解決findingはない。
- WindowsではiOS Simulator／Remote GitHub Actionsを実行できないため、Phase 2 final DoDはpendingとし、Run resultはpartialで保存する。次の実行者はmacOS／GitHub-hosted環境でiOS WorkflowとRemote final verifyを実行する。

## Postfix decision（2026-08-08 23:30 JST）

- Guest Cart統合をUI Flowでも数量変化として証明し、Native Shellのforeground Session refresh、Login／Profileの予期しないError表示を追加した。
- Native Detectの共有依存漏れと、iOS Production BuildへのRuntime直列依存を解消した。iOSは単一Build JobでAutomation／Production Artifactを生成し、Runtime JobはそのArtifactだけを消費する。
- 変更後Android実機のPurchase／Payment retry／Checkout restart／Review、Runtime／BoundaryはPASS。iOS実Runtime、Remote CI、最新Headの`native-ci / verify`は環境／未push制約で未実行のまま、Phase 2 final DoDはpendingとする。

## Repair decision（2026-08-09 00:25 JST）

- Self-review finding: Harnessの`work`が失敗すると、Application DB不変確認が実行されず、契約失敗がApplication DB変更をマスクし得る。
- Classification: `must_fix`。Application DB／KVを変更しないというPhase 2 Harness契約の検証経路に直接関係するため、将来拡張ではなく今回の契約修正として扱う。
- Allowed files: `src/test-controls/native-contract-harness.native.ts`、`tests/unit/native-contract-harness.test.ts`、`tests/contracts/native-contract-harness.test.ts`。
- Repair: `finally`内でApplication DB不変確認を常に実行し、契約成功時だけPBKDF2 smokeを続ける。元の契約エラーを優先して通知・throwし、cleanupは従来どおり成否を問わず完了させる。
- Validation: Harness focused 2 files／10 tests、全体Test（Unit 65／Integration 94／Repository 31／Web Component 76／Native Component 33／Contract 154）、Typecheck、Lint、対象PrettierがPASS。
- Remaining: WindowsではiOS Simulator／Remote CI／最新Headの`native-ci / verify`が未実行であり、Phase 2 final DoDはpendingのままとする。

## Repair decision（2026-08-09 00:31 JST、Iteration 4）

- Input finding: Android Native CIのProduction-validation verifierが、Production `assembleRelease`後の実APKをRuntime用Pathへ保存せず、存在しない`native-production-validation.apk`を検査・Uploadし得る。
- Classification: `must_fix`。CI／Production validationのfalse PASSに直結するHigh findingである。
- Allowed files: `.github/workflows/native-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: Production build直後に明示的なProduction APK sourceからRuntime用Pathへcopyし、copy後のPathだけをverify／Uploadする。Contract Testでsource、copy、verify、Uploadの順序とPathを固定する。
- Other findings: Purchase order／Checkout restartは`should_fix`候補として、High修正後に現行実装と仕様を再確認する。Native customer role boundaryは共有Auth契約との衝突があるため、要件判断が必要になる範囲を避けて局所的な実装境界を調査する。

## Repair decision（2026-08-09 00:36 JST、Iteration 5）

- Input finding: Native Role判定がSession取得完了前にCustomer childrenをmountし得て、Profile Use Caseもoperator／adminをCustomer profile操作から明示的に拒否していなかった。
- Classification: `must_fix`。仕様のoperator／admin「Native対象外、表示とLogoutのみ」というCustomer capability boundaryに直接関わる。
- Allowed files: `src/presentation/native/native-shell.tsx`、`src/application/use-cases/account-use-cases.ts`、`tests/component/native/native-shell.test.tsx`、`tests/integration/auth-account.test.ts`、`tests/contracts/native-runtime-service-surface.test.ts`。
- Repair: Role resolution完了までCustomer children／navigationをmountせず、非Customerは対象外PanelとLogoutだけを表示する。Profile read／writeにも既存Customer guardを適用し、管理Roleの拒否をIntegration／Native Component／Contractで固定する。
- Triage: `native-purchase.yaml`のorder ID assertion不足は現行Flowに`native-complete-order-id`があり、`beginOrder`／`resumePayment`のIDを表示するため`reject`。Checkout restartのresume不足は再起動後に`native-checkout-session-resumed`をassertし、新規startなら`started`となり失敗するため`reject`。Native Detectのcontract/docs path漏れは今回の実Runtime false PASSと直接因果しないため`defer`。

## Repair decision（2026-08-09 00:58 JST、Iteration 6）

- Input finding: Native Loginの`returnTo`付き経路が、operator／adminのLogin成功後にもCheckout active確認へ進むため、Customer対象外Panelへ遷移せずLogin画面にErrorを表示し得る。
- Classification: `must_fix`。仕様の「operator／adminはNative対象外表示とLogoutだけ」をLogin経路でも成立させるRole boundaryの実動作不備である。
- Allowed files: `src/presentation/native/native-purchase-screens.tsx`、`tests/component/native/native-purchase-screens.test.tsx`。
- Repair: Login成功結果のRoleを確認し、非CustomerはCheckout復帰判定を行わず安全なNative入口へreplaceする。Customerだけが既存のreturnTo／Checkout復帰resolverを通る。
- Validation plan: Native purchase Component focused、Typecheck、Prettier、全Testを再実行する。iOS／Remote Runtime未実行境界は変わらない。

## Repair decision（2026-08-09 01:05 JST、Iteration 7）

- Input finding: iOS Runtime Evidenceは`simctl diagnose`とMaestro成果物を保存するが、要求されたXcode Version、Simulator Runtime、Simulator Device、Install／Launchの実行環境情報を専用Evidenceへ明示保存していない。
- Classification: `must_fix`。iOS Runtime未実行でもWorkflowの正式Evidence契約を静的に完成させ、Remote実行時に必要な証跡が欠落しないようにする。
- Allowed files: `.github/workflows/native-ios-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: Runtime Evidence収集でXcode version、available runtimes／devices、選択Device、installed app一覧を失敗時もbest-effortで保存し、Contract TestでEvidence項目を固定する。
- Validation plan: iOS Workflow Contract、Prettier、Typecheck、全Test、Markdown／Artifact gateを再実行する。macOS Runtime／Remote未実行境界は変わらない。

## Repair decision（2026-08-09 01:22 JST、Iteration 8）

- Input finding: Iteration 5で`NativeShell`がpathname変更ごとに`currentUserLoaded=false`へ戻り、`Slot`をアンマウントしていた。現行Android RuntimeSuiteはContract Harness、Storefront、Cartで画面遷移後にホームへ戻り、3/5失敗した。
- Classification: `must_fix`。Native CustomerのAndroid実Runtime回帰であり、iOS／Remote未実行境界とは独立した現行変更起因の不具合である。
- Allowed files: `src/presentation/native/native-shell.tsx`、`tests/component/native/native-shell.test.tsx`。
- Repair: Session再取得自体はpathname／foregroundで継続し、初回の未解決状態だけCustomer childrenを抑止する。遷移中は既存の`Slot`を保持し、非Customer判定が確定した時点だけ対象外Panelへ切り替える。pathname遷移中にCustomer routeを保持するComponent Testを追加した。
- Validation plan: focused Component／Typecheck／Prettier後、Android Doctor／Preflight、現行Source APK Build／Install／Smoke／Test Control、RuntimeSuite、BoundarySuiteの順で実行する。RuntimeSuiteがPASSするまで後続Purchase／Reviewの再実行を行わない。

## Repair decision（2026-08-09、Iteration 9）

- Input finding: iOS Runtimeは`IOS_DEVICE`へSimulatorを選択・Install・Launchしているが、Native Customer MaestroとProduction-validationの`maestro test`へDevice IDを渡していない。macOS Runner上でMaestroが別Simulatorを自動選択すると、選択Deviceの実行証跡と実際のテスト対象が分離し得る。
- Classification: `must_fix`。iOS Build／Runtime／Maestroの対象Device契約と、要求された選択Simulator上の実Runtime証跡に直接関係する。
- Allowed files: `.github/workflows/native-ios-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: Native Customer 15 FlowとProduction-validation Flowの両方へ`--device "$IOS_DEVICE"`を渡し、Contract Testで2つのMaestro実行が同じ選択Deviceを使うことを固定する。
- Validation plan: iOS Workflow Contract focused、対象Prettier、全Contract、Markdown／Run Artifact gateを実行する。WindowsではiOS Simulator／Remote CIそのものは引き続き未実行とする。

## Repair decision（2026-08-09、Iteration 10）

- Input finding: Native CIのDetect PathはNative source、config、Maestro、Harness、SQLite、scripts、workflowsを含むが、Native Component TestとNative CI Contract Testを含まない。対象Testだけの変更ではNative Gateが起動せず、添付仕様の「CI ContractをDetect対象に含める」と矛盾する。
- Classification: `must_fix`。変更されたCI契約を正式Native CI Gateで検証できないため、CI trigger／contract coverageのcorrectnessに関わる。
- Allowed files: `.github/workflows/native-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: Detect Pathへ`tests/component/native/**`と`tests/contracts/native-ci-workflow.test.ts`を追加し、Workflow ContractでそのPathを明示的に固定する。Web-only Contract変更をNative変更扱いにする広いPath追加は行わない。
- Validation plan: Native CI Workflow Contract focused、全Contract、対象Prettier、Detect Pathの静的確認、Run Artifact gateを実行する。

## Repair decision（2026-08-09、Iteration 11）

- Input finding: iOS Runtime Evidenceは`xcrun simctl diagnose "$path"`を実行しているが、診断出力先を`--output`で指定していない。`|| true`で失敗を隠すため、要求された`simctl diagnose`成果物がUpload対象に存在しないまま終わる可能性がある。
- Classification: `must_fix`。iOS Runtime Evidenceの必須成果物に直接関係するCI／observability契約の不備である。
- Allowed files: `.github/workflows/native-ios-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: `simctl diagnose`へRuntime Evidence配下の明示的な`--output`ディレクトリを渡し、Contract Testでコマンドと出力先を固定する。診断失敗時のRuntime Failureを隠すための変更は行わない。
- Validation plan: iOS Workflow Contract focused、全Contract、対象Prettier、Run Artifact gateを実行する。

## Repair decision（継続ゴール、Iteration 12）

- Input finding: Native Detectは`tests/component/native/**`と`tests/contracts/native-ci-workflow.test.ts`だけを検知しており、SQLite／Harness／Repository等のNative契約テスト（`tests/contracts/native-*.test.ts`）単独変更をNative Gateへ接続していない。Web-only変更を広くNative扱いしないという要件を維持しつつ、Native契約テストの変更漏れを解消する必要がある。
- Classification: `must_fix`。CI Contract／Native契約テストの変更検知に関わるため、Native Gateのcorrectnessに直接影響する。
- Allowed files: `.github/workflows/native-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- Repair: Detect PathとWorkflow Contractへ`tests/contracts/native-*.test.ts`を追加する。`tests/contracts/**`のようなWeb専用契約まで含む広いglobは使わない。
- Validation plan: Native CI Workflow Contract focused、全Contract、対象Prettier、Detect Pathの一致確認、Run Artifact Sanitizerを実行する。

## Repair decision（継続ゴール、Iteration 13）

- Input finding: Native Order詳細は注文状態と合計だけを表示し、仕様が要求するPayment Status、Shipment Status、商品／価格／配送先SnapshotをUIへ露出していなかった。
- Classification: `must_fix`。Gate CのOrder詳細DoDと実DTOの利用に直接関係するため、未実装のまま完了扱いにできない。
- Allowed files: `src/presentation/native/native-purchase-screens.tsx`、`tests/component/native/native-purchase-screens.test.tsx`。
- Repair: Payment／Shipment status、価格内訳、配送先snapshot、商品画像・商品コード・SKU・variation・単価・明細価格を表示し、Component Testで主要項目を固定する。
- Validation plan: Native Purchase Component focused、全Native Component、Typecheck、対象Prettier、Run Artifact gateを実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 14）

- Input finding: Gate Bが要求するKeyboard対応に対し、Profile／Address／Checkout等の入力画面がScrollViewだけで、`KeyboardAvoidingView`とkeyboard tap契約を持っていなかった。
- Classification: `must_fix`。Android／iOSの入力操作時にキーボードがフォームを覆わないというNative UI DoDに直接関係する。
- Allowed files: `src/presentation/native/native-purchase-screens.tsx`、`tests/component/native/native-purchase-screens.test.tsx`。
- Repair: 入力を持つNative購入画面へ共通`KeyboardAvoidingView`（iOS padding／Android height）と`keyboardShouldPersistTaps="handled"`を追加し、Profile Component Testでwrapperを固定する。
- Validation plan: Native Purchase Component focused、全Native Component、Typecheck、対象Prettier、Run Artifact gateを実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 15）

- Input finding: Native LoginのCustomer復帰先遷移に`destination as never`があり、仕様の型逃げ禁止に反していた。
- Classification: `must_fix`。実行時の挙動を変えずに、Expo Routerの型契約で検証できる具体的な保守性違反である。
- Allowed files: `src/presentation/native/native-purchase-screens.tsx`。
- Repair: `router.replace(destination as never)`を`router.replace(destination)`へ変更し、型逃げを除去した。Checkout abandonは既存の`startOrResume`によるsession置換時abandonとIntegration Testで契約化済みのため、推測UIは追加しない。
- Validation plan: Native Component、Typecheck、対象Prettier、型逃げscan、git diff、Run Artifact gateを実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 16）

- Input finding: Native Purchase画面に`ApplicationError`判定とReview ratingの`as`型アサーションが残っており、貼付仕様と`docs/CODING_STANDARDS.md`の型逃げ禁止に反していた。
- Classification: `must_fix`。新規変更範囲内の型安全性とエラー境界に直接関係する。
- Allowed files: `src/presentation/native/native-purchase-screens.tsx`。
- Repair: `ApplicationError`の`instanceof`絞り込みと、Review ratingのliteral tuple／推論型へ置換し、`as never`を含む型逃げを残さない。
- Validation plan: Typecheck、Native Component、対象Prettier、型逃げscan、差分検査を実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 17）

- Input finding: 新規Native SQLite Application Repositoryの履歴・レビュー一覧・集計・カート更新・Sequence読み出しに、`String(row)`／`Number(row)`／Enum型アサーションが残っていた。SQLite既存値をRuntime検証せずDomainへ渡すため、規約違反として`must_fix`に分類した。
- Classification: `must_fix`。不正SQLite値のfail-closeと、実`expo-sqlite`購入経路のデータ契約に直接関係する。
- Allowed files: `src/infrastructure/database/sqlite/mappers.ts`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、`tests/contracts/native-sqlite-mappers.test.ts`。
- Repair: 既存mapperへ文字列・整数・Boolean・Enum parserを追加し、Application Repositoryの全対象Row／集計値／履歴／Review一覧をparser経由へ統一した。invalid role／quantity／product statusの境界テストを追加した。検証中に住所列名の組み立て誤り（`address_address_line1`）を検出したため、checkoutの`address_line1`とorderの`shipping_address_line1`を分離する最小修正を追加した。Transaction scopeの`as unknown as`はCustomer capability mapを実装するcompile-time adapter boundaryとして既存コメント付きで残した。
- Validation plan: focused mapper 4 tests、Repository Contract 31 tests、全Test（Unit 65／Integration 95／Repository 31／Web Component 76／Native Component 38／Contract 157）、Typecheck、対象Prettier、型逃げ／強制変換scan、差分検査、Run Artifact gateを実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 17 follow-up）

- Input finding: Nullable SQLite parserが`undefined`を`null`として受け入れており、列欠落をfail-closeできていなかった。
- Classification: `must_fix`。既存Rowの欠落値を不正なnullable値として検出するRuntime validationの厳密性に直接関係する。
- Allowed files: `src/infrastructure/database/sqlite/mappers.ts`。
- Repair: `parseNativeNullableString`／`parseNativeNullableEnum`は明示的な`null`だけを許可し、`undefined`や不明値を例外にする。
- Validation: focused mapper 4 tests、Repository Contract 31 tests、全Test Unit 65／Integration 95／Repository 31／Web Component 76／Native Component 38／Contract 157、Typecheck、対象Prettierを再実行してPASSした。

## Repair decision（継続ゴール、Iteration 18）

- Input finding: Native Transaction Runnerに`as unknown as TransactionScopeMap[S]`が残っており、Customer-only capabilityを全Transaction Scope genericへ強制接続していた。
- Classification: `must_fix`。貼付仕様の型逃げ禁止とCustomer／Admin Transaction Scope分離に直接関係する。
- Allowed files: `src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、`tests/contracts/native-customer-application-repositories.test.ts`。
- Repair: Native Repository Setへfail-closed Admin placeholderを型付きで定義し、Customer Scope allowlistをRuntimeで検証する。Admin Scopeはtransaction開始前に拒否し、`as unknown as`を除去する契約テストを追加する。
- Validation: focused Native Repository Contract 13 tests、Repository Contract 31 tests、全Test Unit 65／Integration 95／Repository 31／Web Component 76／Native Component 38／Contract 158、Typecheck、対象Prettierを実行する。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 19）

- Input finding: 既存Phase 1 CI Workflow／ContractのFormat残差により、`pnpm run format:check`／`pnpm run verify`が停止していた。加えて新規Native Repositoryの未使用`parseNativeNumber` importがLint warningを1件増やしていた。
- Classification: `must_fix`。Phase 2の必須ローカル品質ゲートを現行ワークツリーで完了できず、Native変更由来の警告も含むため、意味変更なしの最小修正を行う。
- Allowed files: `.github/workflows/ci.yml`、`tests/contracts/ci-workflow.test.ts`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts`。
- Repair: Phase 1 CI Workflow／ContractをPrettier整形し、未使用importを削除した。Workflow／Contractの意味変更はない。
- Validation: 修正後`pnpm run verify`（Format、Markdownlint 173、Lint 0 errors／63 warnings、Typecheck、全Test、Security、Image Manifest、Web export 2294 modules）、route 38、EAS static、Production bundle guard、Run Artifact gateをPASSした。iOS／Remote未実行境界は変わらない。

## Repair decision（継続ゴール、Iteration 20）

- Input finding: 品質ゲートの再確認で、`pnpm run verify`の5分実行上限により終了コードを取得できず、一時的に未確定となった。子プロセスはContract suiteからWeb exportまで進行していたため、コード失敗か実行上限かを切り分ける必要がある。
- Classification: `should_fix`。ゲート結果を未確定のまま完了扱いにせず、十分な実行時間で同一コマンドを一度だけ再検証する。
- Allowed files: `.codex/runs/20260808-165236-JST/REPORT.md`、`.codex/runs/20260808-165236-JST/run.json`、`.codex/runs/20260808-165236-JST/evaluation.json`。
- Repair: 重複実行を避けて残存プロセスの終了を確認し、コード変更なしで`pnpm run verify`を15分上限で再実行した。終了コード0を取得したため、タイムアウトはコード失敗ではなく5分上限による未確定と分類する。
- Validation: `pnpm run verify` extended rerun（Format、Markdownlint 174 files、Lint 0 errors／63 warnings、Typecheck、Image Manifest、Security、Unit 65、Integration 95、Repository 31、Web Component 76、Native Component 38、Contract 158、Web export 2294 modules）exit 0。iOS／Remote未実行境界は変わらない。

## Repair decision（PR #14 Artifact受け渡し、Iteration 21）

- `iteration_number`: 21。
- `input_findings`: PR #14のRemote Native CIで、Android RuntimeがBuild／upload済みの`native-automation.apk`ではなく`app-release.apk`を確認して停止した。iOSはArtifact確認前に、generated workspaceの先頭scheme `EXConstants`をBuildしてアプリ`.app`を生成できず、Runtimeがskipされた。
- `repair_plan`: Android Automation APKの保存名・upload path・download後の確認／install pathを`native-automation.apk`へ統一する。iOSはworkspace basenameと一致するアプリschemeを選択し、Automation／Productionの生成`.app`を固定名へ保存してuploadし、download後の固定pathを存在確認・`simctl install`へ渡す。既存のBuild／Runtime分離とfail-closeは維持する。Contract Testで4Artifactのproducer／consumer／install契約を固定する。
- `allowed_files`: `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`、同Run Artifact。
- `changed_files`: `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`。
- `validation_commands`: iOS／Android Workflow Contract focused、全Contract、対象Prettier、`pnpm run format:check`、`pnpm run lint:markdown`、`pnpm run verify`、Run Artifact JSON／Prettier／Sanitizer、可能ならPR #14 Remote Native CI。
- `validation_result`: focused Workflow Contract 17/17、全Contract 22 files／159 tests、対象Prettier、`pnpm run verify` exit 0（Format、Markdownlint 174 files、Lint 0 errors／63 warnings、Typecheck、全Test、Web export 2294 modules）を確認した。初回全Contractの5秒timeoutは該当file単独4/4と全Contract再実行159/159で切り分けた。
- `remaining_delta`: 現行Windowsでは`xcodebuild`／`xcrun`／`simctl`がなく、iOS実Runtimeをローカルでは実行できない。Remote再実行は修正HeadをPRへ反映した後に対象となる。
- `decision`: `continue`。Artifact実装とローカル品質ゲートは解消したが、修正HeadのRemote Android／iOS Runtimeとfinal `native-ci / verify`が残る。

## Repair decision（継続ゴール、Iteration 22）

- `iteration_number`: 22
- `input_findings`: 添付されたPR #14追加指示で、Storefrontのカテゴリ検出誤検知、Android／iOSのFlow fail-fast、Cartのowner固定ID再利用、認可HarnessのOR判定、Checkout認証切れの固定returnTo、NativeShellの非同期競合とlogout rejection未処理が未修正だった。
- `classification`: `must_fix`。いずれもPhase 2の実Runtime成立、認可fail-close、Cart永続性、Checkout復帰、Native Customer境界に直接影響する。
- `repair_plan`: Storefrontはhome／category／catalogのStable ID待機後に直接tapする。AndroidはRuntime準備とMaestro CLI成功後の各独立Flowへ`!cancelled()`条件を付け、Production install／MaestroをAutomation結果から独立させる。iOSは15 Flowを同一step内でstatus集約し、全Flow後にstepをfailさせ、Production install／Maestroを明示条件で継続する。Cartはactive確認後だけApplication Layerの`IdGenerator`からcaller提供IDを作り、SQLite／DexieはそのIDをINSERTする。Harnessは2アカウントと期待error codeを個別検証し、成功時もSessionをclearしてfailする。Checkoutはstep別returnTo、Shellはserial token／mounted guard／logout catchへ修正する。
- `allowed_files`: `maestro/native-storefront.yaml`、`.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、Cart契約／UseCase／SQLite／Dexie、Native Harness／Purchase／Shell、対象Component／Integration／Repository／Unit／Workflow Contract Test、同Run Artifact。
- `changed_files`: 上記の実装・テスト対象ファイルと`.codex/runs/20260808-165236-JST/TASKS.md`、`PLAN.md`、`REPORT.md`、`run.json`、`evaluation.json`。
- `validation_commands`: 対象Prettier、変更対象Vitest／Jest、Typecheck、全Contract、`pnpm run verify`、Run／Evaluation JSON parse、Run Artifact Prettier、Markdownlint、`git diff --check`、Sanitizer Write／Check。
- `validation_result`: 対象Workflow／Cart／Harness／SQLite／Integration Vitest 63/63、Native Purchase／NativeShell Jest 16/16、Typecheck、対象Prettier、全Contract 22 files／162 tests、`pnpm run verify` exit 0（Unit 66、Integration 97、Repository 32、Web Component 76、Native Component 43、Contract 162、Web export 2294 modules、Lint 0 errors／63 warnings）を確認した。初回全Contractの5秒timeoutは対象4/4単独PASS後の再実行で解消した。VitestでNative Jest対象を誤って実行した際のReact Native Flow parse failureは、正規のJest実行へ切り替え、追加テストを含む16/16 PASSで確認した。
- `remaining_delta`: Windowsには`xcodebuild`／`xcrun`／`simctl`がなく、iOS Simulator、実`expo-sqlite` iOS Harness、iOS Production-validationは未実行。Git mutation禁止のため修正HeadをRemoteへ反映しておらず、最新HeadのGitHub-hosted Android／iOS Native CIとfinal `native-ci / verify`も未実行。
- `decision`: `continue`。追加修正と全ローカル品質ゲートは完了したが、iOS／Remote実Runtimeの実行結果がないため完了扱いにしない。Progress: 97% (31/32)。

## Repair decision（PR #14追加修正、Iteration 24）

- `iteration_number`: 24。
- `input_findings`: 追加指示の確認で、`reviews-empty`にDelivered注文・レビュー対象商品が残る可能性、Native component fixtureの不正な`membershipRankSnapshot`、Native SQLite checkout期限更新のtransaction boundary不足、`expo-router/build/...`内部import／mockが残っていることを確認した。
- `classification`: `must_fix`。いずれも追加指示の直接対象であり、Review eligibility、Native runtime compile／test、checkoutのoptimistic concurrency、公開API契約に影響する。
- `repair_plan`: `reviews-empty`からDelivered注文と依存するcheckout／order item等を除去し、Customer Review UseCaseのeligibility回帰を追加する。fixtureを`gold`へ修正する。期限切れcheckoutの最新行再読込とversion条件付き更新を既存`context.write`境界内で行い、runtime／contract testを追加する。Native purchase screenとtest mockを公開`expo-router`／`expo-router/react-navigation`へ移行する。
- `allowed_files`: `src/seeds/scenarios.ts`、`tests/integration/review-user-use-cases.test.ts`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、`tests/repository-contract/native-customer-shared.test.ts`、`tests/contracts/native-customer-application-repositories.test.ts`、`tests/contracts/expo-router-public-imports.test.ts`、`src/presentation/native/native-purchase-screens.tsx`、`tests/component/native/native-purchase-screens.test.tsx`、`src/presentation/pages/admin-product-pages.tsx`、`tests/component/admin-product-pages.test.tsx`、同Run Artifact。Admin側は同じ内部`expo-router/build`依存を残さないための機械的な公開entrypoint移行に限る。
- `changed_files`: `src/seeds/scenarios.ts`、`tests/integration/review-user-use-cases.test.ts`、`src/infrastructure/database/sqlite/native-customer-application-repositories.ts`、`tests/repository-contract/native-customer-shared.test.ts`、`tests/contracts/native-customer-application-repositories.test.ts`、`tests/contracts/expo-router-public-imports.test.ts`、`src/presentation/native/native-purchase-screens.tsx`、`tests/component/native/native-purchase-screens.test.tsx`、`src/presentation/pages/admin-product-pages.tsx`、`tests/component/admin-product-pages.test.tsx`。他の既存差分は保持した。
- `validation_commands`: 対象Prettier、reviews／Native repository／Native purchase focused tests、Typecheck、全Contract、`pnpm run verify`、内部`expo-router/build`参照scan、Run／Evaluation JSON parse、Run Artifact Prettier、Markdownlint、`git diff --check`、Sanitizer Write／Check。
- `validation_result`: 対象Prettier PASS。reviews-empty Integration 8/8、Native SQLite repository 13/13、Native repository／Expo Router Contract 16/16、Native Purchase Component 13/13、Admin Product Component 4/4 PASS。内部`expo-router/build`参照scanは該当なし。`pnpm run verify` exit 0（Format、Markdownlint 174 files／0 issues、Lint 0 errors／64 warnings、Typecheck、Unit 66、Integration 98、Repository 33、Web Component 76、Native Component 45、Contract 165、Web export 2296 modules）。
- `remaining_delta`: WindowsのiOS実RuntimeおよびRemote最新HeadのNative CIは、前Iterationと同じ外部環境／Git mutation禁止により未実行のまま記録する。
- `decision`: `continue`。修正とローカル品質ゲートを実行し、実行結果に基づいてRun Artifactを更新する。

## Repair decision（PR #14最終修正指示、Iteration 25）

- `iteration_number`: 25。
- `input_findings`: 最終指示で、Android／iOS Build Jobの独立性、Automation／Production Artifact契約、Storefront semantic scroll、Reviewの2回目`hideKeyboard`、Profile logoutのbusy／error回帰、実Runtime／Production validation／final verifyの未確認を対象化した。
- `classification`: `must_fix`。Artifact producer／consumerの不一致はNative Runtime到達を直接阻害し、独立Build／fail-closeとContract Testは再発防止に必須である。iOS／Remote実行はWindows／Git mutation禁止の外部環境残差として分離する。
- `repair_plan`: Android／iOS BuildをAutomation／Productionへ分割し、保存名・Upload・Download・verify・installを固定する。Runtimeは成功BuildのOR条件で継続し、最終Gateは必須結果をfail-closeする。Maestro／Profile／Contractを最小差分で同期し、静的ゲートとAndroid実機をRunbook順に再検証する。
- `allowed_files`: `.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`、`maestro/native-review.yaml`、`maestro/native-storefront.yaml`、`src/presentation/native/native-purchase-screens.tsx`、対象Component／Contract Test、`docs/PROJECT_CONTEXT.md`、ADR／History、同Run Artifact。
- `changed_files`: 上記実装・テスト・文書と`.codex/runs/20260808-165236-JST/PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`。固定スワイプの試行は採用せず、Reviewのsemantic `scrollUntilVisible`と2回目`hideKeyboard`削除だけを最終差分に残す。
- `validation_commands`: focused Contract／Component、全Contract、`pnpm run verify`、対象Prettier／Markdownlint／差分／Sanitizer、Android Doctor／Build／Install／Smoke／Test Control／RuntimeSuite／BoundarySuite、Review単体、iOS／Remote availability check。
- `validation_result`: Android最新APKのBuild（Gradle `BUILD SUCCESSFUL`）／Install／Smoke／Test Control 1/1／RuntimeSuite 5/5／BoundarySuite 5/5を確認した。Reviewは保存タップまで進んだが、標準日本語IMEによるASCII本文変換後の保存完了assertionが失敗した。静的／Contract／Component／全verifyはPASS、iOS実Runtime／Remoteは未実行である。
- `remaining_delta`: Windowsに`xcodebuild`／`xcrun`／`simctl`／`gh`がなく、iOS Build／Simulator／Maestro／実`expo-sqlite` Harness／Production-validation、修正HeadのGitHub-hosted Native CI／final `native-ci / verify`は未確認。
- `decision`: `continue`。Artifact実装、Contract、ローカル品質ゲート、Android主要Runtimeは確認済みだが、Review端末依存Failure、iOS／Remote実Runtimeが残るため完了扱いにしない。Progress: 97% (33/34)。

## Repair decision（継続ゴール、Iteration 23）

- `iteration_number`: 23。
- `input_findings`: AppState復帰テスト追加後のNative Jestで、Jestの`AppState.addEventListener`が購読オブジェクトを返さないcleanup時に`subscription.remove`が例外となった。実装側の安全化に伴い、既存Native Runtime Service Surface Contractも旧文字列を期待して161/162で停止した。
- `classification`: `must_fix`。新規AppState回帰テストを含むNativeShellのcleanup契約と、全体品質ゲートのContract整合性に直接関係する。
- `repair_plan`: NativeShellの購読解除をoptional cleanupへ変更し、Contract Testの期待値を実装契約へ同期する。AppState active、refresh競合、logout rejection、全Contract、全verifyを再実行する。
- `allowed_files`: `src/presentation/native/native-shell.tsx`、`tests/contracts/native-runtime-service-surface.test.ts`、同Run Artifact。
- `validation_commands`: NativeShell Jest、対象Contract、`pnpm run verify`、Run／Evaluation JSON parse、Run Artifact Prettier、Markdownlint、`git diff --check`、Sanitizer Write／Check。
- `validation_result`: NativeShell 5/5、対象Contract 2/2、`pnpm run verify` exit 0（Format、Markdownlint 174 files、Lint 0 errors／64 warnings、Unit 66、Integration 97、Repository 32、Web Component 76、Native Component 44、Contract 162、Web export 2294 modules）を確認した。初回verifyの161/162は修正前Contract期待値による失敗であり、同期後の再実行で解消した。
- `remaining_delta`: Windowsには`xcodebuild`／`xcrun`／`simctl`がなく、iOS Simulator、実`expo-sqlite` iOS Harness、iOS Production-validationは未実行。Git mutation禁止のため修正HeadをRemoteへ反映しておらず、最新HeadのGitHub-hosted Android／iOS Native CIとfinal `native-ci / verify`も未実行。
- `decision`: `continue`。追加修正と全ローカル品質ゲートは完了したが、iOS／Remote実Runtimeの実行結果がないため完了扱いにしない。Progress: 97% (31/32)。
