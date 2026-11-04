# PR #219 Scenario Shop SUT受入：実行準備・既存資産調査

## 確認範囲と判定

- 調査対象 PR #219：`a344595958769bbda2e62ca5e6c40b8b65df142c`（`work/pr199-sut-acceptance`）。
- 対象 SUT の統合先 PR #199：`46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`（`docs/plan-ai-agent-qa-curriculum-redesign`）。
- 対象 PR #210：未マージ。#210の変更済み製品動作を#199の検証済み動作として扱わない。
- 実施：GitHub APIによる上記固定HEADのソース、既存仕様、テストと設定の静的確認。
- 未実施：ローカルの`pnpm`、Playwright実Run、Android実機/エミュレータ、SQLite/IndexedDB前後検査。本レポートは製品適合PASSを表さない。

## 要件・対象Role、状態、データ

| 範囲 | 正本 | 確認内容・動的検証で必要な条件 |
| --- | --- | --- |
| 認証と権限 | `docs/spec/features/authentication.md`、`docs/spec/features/admin-users.md` | guest/customer/operator/admin、active/suspended/withdrawn、ログイン拒否、本人/他人、自己権限変更・最終管理者保護 |
| 商品管理 | `docs/spec/features/admin-catalog.md` | operator/admin、下書きと公開、管理一覧、在庫/Rank/価格・選択/一括更新 |
| Cart | `docs/spec/features/cart.md` | 在庫・購入上限・99点の最小値、商品状態/価格再検証、上限超過時の数量不変 |
| Checkout | `docs/spec/features/checkout-and-payment.md` | 同一Cart/VersionのSession再開、差異時の置換、24時間期限、Cart/価格差の確定拒否、TEST-SUCCESS/失敗/処理中 |
| 状態データ | `src/seeds/default-dataset.ts`、`src/seeds/scenarios.ts`、`src/seeds/metadata.ts` | 固定ユーザー、商品、注文データ。default、many-products、empty-catalog、out-of-stock、low-stock、checkout-resume、checkout-replaced、cart-version-invalidates-checkout、admin-bulk-partial-failure等を調査 |
| 分析台帳との対応 | `training/ai-assisted-qa-course/coverage/supported-behaviors.json` | 188操作・20非default状態は基本分析の追跡分母。実Run対象はRisk/TR/Condition/Caseの採否と既存テスト対応から決める。#213のみ書込可能 |

## テスト・固定時刻・リセット経路

- 固定時刻：`src/seeds/metadata.ts`の`BASE_CLOCK=2026-07-01T03:00:00.000Z`、`src/infrastructure/clock/clocks.ts`の`RuntimeClock/TestClock`。個別Caseの時刻変更は`window.__TEST_API__.setClock()`で可能。
- Web Seed/Reset：`e2e/web/fixtures.ts`の`scenario(name)`が`window.__TEST_API__.reset({scenario:name})`→reload→`getMetadata()`とguest/session IDを確認。画面を追加で開いた場合は閉じてからresetする。
- Web制御実装：`src/test-controls/test-api.web.ts`はlocal/automation buildでのみテストAPIを公開。`src/test-controls/test-control-service.ts`はDexie databaseを閉じて削除・Seed読込・Session/GuestID初期化・Clock反映。resetが開いたページに阻害された場合は`RESET_BLOCKED_BY_OPEN_PAGE`を返す。
- Web既存E2E：`e2e/web/phase1-required.spec.ts`、`cross-role-lifecycle.spec.ts`、`mobile-boundary.spec.ts`、`reset-boundary.spec.ts`、`accessibility.spec.ts`、`ui-review.spec.ts`。構成は`playwright.config.ts`。trace/video/screenshotは失敗時保存という設定であり、成功したCaseに常に動画があるとは言えない。
- Android既存Flow：`maestro/native-cart.yaml`、`native-purchase.yaml`、`native-payment-retry.yaml`、`native-session-checkout-restart.yaml`、`native-restart-persistence.yaml`、`native-review.yaml`、`native-test-control.yaml`ほか。`scripts/native/android-maestro-run.sh`が既存実行入口。実機/エミュレータRunは未実施。
- 既存Vitest：`tests/integration/{auth-account,cart-use-cases,checkout-order-use-cases,review-user-use-cases,admin-product-use-cases}.test.ts`、`tests/repository-contract/{repositories,cart-mutations,customer-shared,native-customer-shared}.test.ts`、`tests/component/{auth-account-pages,cart-page,checkout-order-pages,admin-product-pages,route-guard}.test.tsx`等。
- 既存実行コマンド（今回未実行）：`pnpm run test:integration`、`pnpm run test:repository`、`pnpm run test:component:web`、`pnpm run test:e2e:chromium`、`pnpm run test:e2e:cross-role`、`pnpm run test:e2e:mobile-boundary`、`pnpm run test:a11y`。対象選定時は`package.json`と`playwright.config.ts`の実行対象を確認する。

## Case別の証拠設計と未実行

各採用Caseには `Behavior ID / BR-AC / Risk-TR-Condition-Case / Platform / Role・Session / Seed-Reset-Clock / SUT SHA（#199か#210か） / 操作前状態 / 操作 / 期待 / 観測 / DB前後 / exit code / 実Run ID / Trace・動画・画像・Console・Network・Reportパス / PASS・FAIL・BLOCKED・未実行 / 残リスク`を紐付ける。

| 実証群 | 対象の代表ID・仕様 | 現状 |
| --- | --- | --- |
| 権限と管理ユーザー | `SCREEN-ADMIN-USERS-A01-02`、`SCREEN-ADMIN-USER-DETAIL-A01-02`〜`A02-03`、`BR-ADMINUSER-001` | 未実行。既存テストの対応・不足を先に確認 |
| Forbidden | `SCREEN-BOUNDARY-FORBIDDEN-A01-01`、`BR-AUTH-001/002` | 未実行。停止staff・直URL・画面非露出を分離 |
| 管理商品と商品0件 | `SCREEN-ADMIN-PRODUCTS-A01-02`、`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 未実行。絞り込み0件/無条件0件/エラーを分離 |
| CartとCheckout | `BR-CART-001/003`、`BR-CHECKOUT-001/002/003`、`AC-CHECKOUT-001/002/003` | 未実行。成功/拒否/競合後のDB不変を検証 |
| 注文とAndroid・視覚 | Order/Shipment/Review、Maestro、画面幅とアクセシビリティ | 未実行。実機/エミュレータ利用可否とRunを確認 |

## CIと分担先

- 既知のWeb CI Run `41782189154`（旧HEAD）はrequired Chromium E2EとVitestの各jobが成功した一方、Style QualityがMarkdown lintのMD039で失敗。後続`verify`/`validate`も失敗。これは現行HEADや全採用CaseのPASSではない。
- この調査時点で#219 HEAD `a344595958769bbda2e62ca5e6c40b8b65df142c`のWeb CI Run `41785298543`は実行中。完了結果は別途固定SHAとRunで確認する。
- #199の共有ファイル`docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md`、`package.json`、`playwright.config.ts`、既存製品test/workflowは本PRで修正しない。
- #213にCase ID・実Runリンクを渡す。#210へは再現済みの製品問題・未実証仮説・仕様判断待ちを区別して根拠を渡す。Android未実行時は機材・エミュレータ・CLI/権限・再開条件を記録する。

## タスクリストとの対応

- 1件目の静的調査は、上記固定HEADのソースと既存資産を確認したため完了。
- 2件目以降はCase単位の実Run・DB前後・証拠パスが未収集であり、完了としない。今後の実Runはこのレポートと混同せず実行時の固定HEADと証拠を追記する。

## 新規受入用Integrationテスト（動的なWeb受入とは別判定）

- 追加対象：`tests/integration/pr219-admin-user-acceptance.test.ts`（新規ファイル。既存製品テストは変更しない）。
- Case ID：`SCREEN-ADMIN-USER-DETAIL-A02-03`。関連：`BR-ADMINUSER-001`、`AC-ADMINUSER-001`。
- 条件1：isolated Dexieでactive adminを2人にセットし、有効actorからもう1人をoperatorへ変更する。2→1の許可、対象者のSession削除、最後に残ったadminの自己変更拒否と不変を検証。
- 条件2：対象者のversionが読み取り後に変わった状態で、古いexpectedVersionのRole変更を実行する。`CONFLICT`拒否、ユーザーとSessionの不変を検証。
- Seed：`default`、固定時刻：`2026-07-15T03:00:00.000Z`。Roleとversionの競合fixtureはテスト専用Dexie DB内でのみ作成する。
- 実行入口：`pnpm run test:integration`（`vitest run tests/integration`）。現時点では**CI結果・終了コード・実Run証拠は未確認**。追加ソースを実行済みPASSとしない。
- 制限：Web UI、Android、真正の同時actor競合、非self最終admin拒否はこのIntegrationテストで検証していない。チェックリストの認証/管理ユーザー実証項目は未完了のまま。

## CIによる追加Caseの実行結果（タスクリスト16番）

- 対象Run：Web CI [#41787879720](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41787879720)
- 実行対象SUT/検証コードSHA：`63ebb7f01711ea295dd94e2533afcf9788693e86`（PR #219）。親PR #199 baseは`46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。#210の製品修正は含まない。
- 新規Case：`tests/integration/pr219-admin-user-acceptance.test.ts`（2件）。`SCREEN-ADMIN-USER-DETAIL-A02-03`／`BR-ADMINUSER-001`・`AC-ADMINUSER-001`対応。Vitest (integration)で2件PASS、既存を含むIntegration計113件PASS。
- 観測1：actor=user-admin（有効なactive admin）、target=user-operatorを隔離DB内でadminにしてactive adminが2名の状態を作成。targetをoperatorに降格してactive adminが1名残り、targetのSessionが0になる。残った唯一のadminの自己降格は`SELF_CHANGE_FORBIDDEN`で拒否、actor DB変更なし。
- 観測2：target versionを事前に進め、古いexpectedVersionでの変更を`CONFLICT`拒否。target UserとSessionsが変更されない。
- 固定条件：`default` Seed、`2026-07-15T03:00:00.000Z` TestClock、Vitest実行、隔離Dexie DB。終了コードはCI Vitestジョブsuccess（0）。
- 既存必須E2E：同Runの`Chromium E2E (required)`がsuccess。Style Quality、Code Quality、verifyもsuccess。追加Case実行と既存必須CI維持のみをタスクリスト16番として完了する。
- Trace/動画/画像：本追加2件はIntegration testでありブラウザ操作を伴わないため対象外。Console/Network：同様にブラウザ証拠なし。詳細な実行ログとテスト結果は上記GitHub Actions Runの`Vitest (integration)`ジョブログ。個別DB前後はassert結果で確認し、snapshotファイルは未生成。AndroidとWeb UIの直接証拠は未取得。
- 制約：タスクリスト2番・4〜15番・18〜21番などに必要な全採用Case実Run・Trace/DB全表前後・Android証拠・独立レビューは未完了。CI成功は基本分析208動作の全件受入PASSを意味しない。

## 隔離DBでの正常操作・障害注入（タスクリスト3番の検証準備）

- 新規受入用テスト：`tests/integration/pr219-isolated-fixtures.test.ts`。固定Seed `out-of-stock` / `low-stock` / `checkout-resume`を、各テストで固有名のDexie DBへロードし、終了後にDBを削除する。
- テストCase：`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-01`のstock0/3状態、`SCREEN-ADMIN-USER-DETAIL-A01-04`の顧客停止→Session削除・Checkout abandoned・Cart不変、障害注入後のUser/Session/Checkout/Cartロールバック。
- Clockは`2026-07-15T03:00:00.000Z`の`TestClock`。障害注入は隔離DBの`checkout_sessions.hook("updating")`に限り、製品実装・既存Seed/Reset・既存テストに手を加えていない。
- 追加テストの実行は最新HEADのVitest (integration) CIで確認するまで未実行扱い。DBスナップショットはassertionベースでありファイルとして保存していない。直接Web/Android実Runの代わりにはならない。
