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

## Case追跡表の生成（タスクリスト2番・20番は未完了）

- 追跡表：`docs/reports/2026-11-04_pr219-case-traceability.csv`。元データ：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`、Blob `3143b229afd6dddad52ef7c09a9e91c5995af07f`（#219 HEAD `e81f4c090c755d60dc8b90a120c704e1dda7a900`で取得）。
- 元台帳の188操作・20状態＝208動作、79要件を確認した。条件表現`C1`等を参照として抽出した`953`行（うち元台帳で番号が明示されていない動作`58`件を1行ずつ含む）。**`953`件の採用Caseが確定したという意味ではない**。各条件の採否・分割・統合は元台帳の`test_condition`、`case_policy`、BR/ACを照合して確定する。
- 各行にBehavior ID、条件参照、Platform、Role、Scenario、要件、元台帳の期待結果と固定SUT SHAを記録した。未実行の観測・DB前後・Trace/動画/画像・Console/Network・Run・exit codeは空欄、判定はすべて**未受入**。既存の2件のIntegration PASSはCase単位の証拠として上記のCI節で管理しており、部分条件だけで候補行全体をPASSに変更しない。
- 元台帳の`source_commit`は`383efc9107ef3d5f78c5659473277166c1bba2de`であり現行#199 HEAD `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`とは異なる。台帳の更新・採否は#213に委ね、#219はCaseと実Runの対応のみ追加する。
- 再開：各候補について元台帳の採否を読み、実Runと固定HEAD・期待/観測・DB前後を紐付けた後に判定を更新する。未実施とBLOCKEDはPASSにしない。番号未付与を即座に仕様漏れと断定しない。

## PR #219専用Webクロスロール受入テスト（実ブラウザ証拠はCI待ち）

- 新規テスト：`e2e/web/pr219-cross-role-lifecycle.spec.ts`。既存`playwright.config.ts`の`cross-role-chromium`に設定された`/cross-role-lifecycle\\.spec\\.ts/`と命名を一致させ、既存`pnpm run test:e2e:cross-role`で実行する。共有config/workflowは変更しない。
- 対象：`SCREEN-BOUNDARY-FORBIDDEN-A01-01`、`BR-AUTH-001/002`、`SCREEN-ADMIN-USER-DETAIL-A01-02`。guest/customer/operator/admin、suspended/withdrawn、他人の注文表示拒否、Role変更後の古いSessionを直接URLで検証する。
- 元Seedのユーザーと注文データだけを使用し、Role更新は隔離したPlaywright Browser Context内の通常UI操作に限定。各テストは既存`scenario()`からResetしてから開始する。
- 期待と判定：顧客・管理機能のルート分離、他人の注文詳細の非露出、Role変更後のSession失効。実CIのPlaywright実Runが成功するまで未実行扱い。画面/DBの全条件を満たすまでタスクリスト4番は未完了。

## 固定Seed・隔離DB・障害注入の実行結果（タスクリスト3番完了）

- 実行SUT/Test SHA：`b8798bb25083c7a3812cf9281a8c39c24eacc17c`。Web CI Run：[41790169454](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41790169454)、Vitest (integration) job `126441617077`。
- 実行コマンド（CI）：`pnpm run test:integration`。終了ステータス：ジョブsuccess（exit 0）。`tests/integration/pr219-isolated-fixtures.test.ts` **4/4 PASS**、`tests/integration/pr219-admin-user-acceptance.test.ts` **2/2 PASS**、Integration全体**117件PASS**。Style Qualityもsuccess。
- `out-of-stock`でVariant `variant-basic-shirt-02`のstock 0、`low-stock`でstock 3を孤立したDexie DBから検証。通常操作は`checkout-resume`の顧客停止によりSession削除・Checkout abandoned・Cart不変をassert。
- 障害注入は隔離Dexie DBの`checkout_sessions.hook("updating")`が書込み中に例外を投げる方法。変更を試みたUser/Session/CheckoutとCartの操作前後が一致することをassert。先行するrole変更のstale CAS fixtureも対象者・Session不変をassertしている。
- 成功証拠はVitestのassertとCIログ。ブラウザTrace/Video/NetworkはIntegration検証には該当せず、Android/実Web・全表snapshotは別項目の未実行条件。成功Run全体では、新コミットによるキャンセルで一部jobがcancelledとなり`verify`/`validate`もfailure。**IntegrationのPASSをRun全体の合格と呼ばない**。
- 変更範囲は新規受入専用テスト・調査レポート・タスクリストに限定。`src/**`、`app/**`、`docs/spec/**`、既存Seed/Reset・既存製品テストは不変更。#199側と#210側の製品差分は混ぜていない。

## Web Role・認可境界の実ブラウザ受入（タスクリスト4番完了）

- 実行SUT/Test SHA：`b27c77fec49f758f4ba1110ea9863cfea6bc5875`、Web CI [#41790967187](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41790967187)、Chromium E2E (cross-role) Job `126444779774`。
- コマンド：`pnpm run test:e2e:cross-role`（`playwright test --project=cross-role-chromium`）。ジョブsuccess（exit 0）。`e2e/web/pr219-cross-role-lifecycle.spec.ts`の**8/8件PASS**、既存4件含む**12/12件PASS**。
- ケース・Seed・期待/観測：

| Case/関連要件 | Seed / Role・Session | 期待・観測（Chromium実行） |
| --- | --- | --- |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` Guest | `default` / guest（Sessionなし） | `/checkout/address`→`/login?returnTo=...`、`/admin/users`→`/login`。保護画面のheadingなし（PASS） |
| 同 Customer | `regular-member` / active customer | 本人Order `order-paid`は表示、`/admin/users`は`/forbidden`へ遷移し管理画面非露出（PASS） |
| 同 Operator | `default` / active operator login | 在庫管理は閲覧可、ユーザー管理とCheckoutは`/forbidden`で非露出（PASS） |
| 同 Admin | `default` / active admin login | 管理ユーザーは表示、Checkoutは`/forbidden`で非露出（PASS） |
| `BR-AUTH-001` Suspended | `suspended-user` / suspended Session Seed | Checkout直URLはlogin/forbiddenへ遷移しCheckout heading非露出（PASS） |
| `BR-AUTH-001` Withdrawn | `withdrawn-user` / withdrawn Session Seed | Checkout直URLはlogin/forbiddenへ遷移しCheckout heading非露出（PASS） |
| `BR-AUTH-002` 所有権 | `default` / gold customer login | regular customerの`order-paid`を開くとnot-foundでOrder heading非露出（PASS） |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` Session | `default` / operator→admin login | adminがoperatorをadminへ変更後、操作前のoperator Session IDを復元して再読込しても管理Routeはloginへ移動（PASS） |

- テストの開始は`e2e/web/fixtures.ts`の`scenario()`で固定Seed/Clock・Resetを確認。実行条件はChromiumデスクトップ。成功時のTrace/動画/画像は既存`playwright.config.ts`が失敗時保持のため常設Artifactとして保存されていない。証拠は上記jobログとテスト名、固定SHA、検証assertion。
- 本項目のWeb Roleマトリクス・Session失効・他人情報非露出は実証済み。**Android拒否文言/停止staffの循環（タスクリスト7番）、全表DB Snapshot（15番）、独立レビュー（19番）は未受入**であり流用しない。

## 管理ユーザー検索・Rank・Statusの追加Web E2E（タスクリスト5番の継続）

- `e2e/web/pr219-cross-role-lifecycle.spec.ts`に検索語×Role×StatusのAND絞り込み、顧客Rank変更後の画面再読込、顧客停止の確認Dialogと再ログイン拒否の3テストを追加。従来の8件に追加するため、このファイルは11件の新規ケースになる。
- `SCREEN-ADMIN-USERS-A01-02`、`SCREEN-ADMIN-USER-DETAIL-A01-03/A01-04`へ紐付ける。既存IntegrationはRank変更・Checkout abandoned、Role/StatusでのSession失効と競合、自己/withdrawn拒否の一部を実証済み。
- `src/presentation/pages/review-user-pages.tsx`の管理一覧はキーワード・Role・Statusを扱うが、Rank絞り込みやcreated/updatedによるsort UIはこの実装で見つからなかった。補助UI仕様との関係は#213/#210の仕様判断待ちとして扱い、製品側の修正は行わない。
- 新規3件の実ブラウザCI結果は未確認。全対象操作・例外/rollback・画面/DB照合が揃うまで5番は未完了。

## 管理ユーザーの追加Use Case受入（タスクリスト5番の検証準備）

- `tests/integration/pr219-admin-user-acceptance.test.ts`に検索のAND条件（keyword/role/status/rank）、管理者本人の停止拒否とSession不変、退会済みRank/Status拒否とDB不変、Rank/Statusのstale version拒否とDB不変の4件を追加。
- `tests/integration/pr219-isolated-fixtures.test.ts`に、`checkout-resume` SeedでRank変更時のCheckout abandoned後、User保存に障害注入してtransaction rollbackを検証する1件を追加。いずれも隔離Dexie DB内だけの操作。
- `src/presentation/pages/review-user-pages.tsx`ではRank絞り込みと登録日/更新日のsort UIが提供されていない。正式仕様と補助UI仕様の優先関係を#213/#210へ照会する前提で、現行SUTに対するE2E・Use Caseの挙動のみ受入テストとする。
- 追加5件はCIで実Runを確認するまで未実行扱い。タスクリスト5番はまだ未完了。

## 認可後・transaction前のactor失効競合（タスクリスト6番は未完了）

- 新規`tests/integration/pr219-actor-revocation.test.ts`はPR #199旧SUTで予想される認可時点差を隔離Dexie DBで再現する。actor=`user-admin`が`requireAdmin()`を通過した後、`change-user-access` transaction開始直前にactorをoperatorまたはsuspendedにしてSessionを削除する。
- `changeRole(user-operator→admin)`と`changeSuspension(user-customer-regular→suspended)`の両方で**拒否と対象User不変**を正しい受入期待値とする。
- #199 HEADの`AdminUserUseCases`は`requireAdmin()`をtransactionの外で1度行うだけで、開始時の再認可が存在しない。#210の`product/scenario-shop-maintenance` HEAD `03bd4c8abec15c8004d0fc8c8b09e36cc0f68f79`には`assertActorStillAuthorized`があるが、別HEADで未マージ。
- 旧実装に対するテストは`it.fails`で**期待した拒否が成立しないことを検知する既知不具合再現用**。テストランナーのgreenには含まれても、製品適合PASSに絶対に換算しない。#210で修正された製品HEADを独立検証するとき、`it.fails`を通常の`it`へ変更し、拒否コード・全表不変・同時更新の証拠で受入する。実CI前は現象の動的再現は未確認。
- このテストは固定Seedを書き換えず、隔離DBでのみactor権限とSessionを変更する。DB全表の網羅や、実ブラウザ・Androidの動的判定とは別。

## Role変更後のSession削除失敗の隔離検証

- `tests/integration/pr219-isolated-fixtures.test.ts`に、`changeRole(user-operator→admin)`でUser更新後のSession削除が失敗する注入Caseを追加。
- 隔離DB内に対象者Sessionを用意し、`sessions.hook("deleting")`で例外を発生させてUser・Sessionが実行前と一致することをassertする。テスト対象は`change-user-access` transaction rollback。既存Seedや製品実装には変更なし。
- このCaseはまだ実行成否未確認のため、管理ユーザー全受入（5番）のチェックは付けない。

## ForbiddenRoute 停止staffの戻りリンク（タスクリスト7番は未完了）

- 静的差分：`src/presentation/guards/route-guard.tsx`は管理Routeへ入る際`accountStatus === "active"`を要求。一方`app/forbidden.tsx`の戻りリンク表示条件は`role === "operator" || role === "admin"`のみで、statusを検査しない。停止staffの`currentUser`が残った場合、Forbidden→admin→Forbiddenへ戻る導線が成立する可能性がある。
- 新規`tests/component/pr219-forbidden-route.test.tsx`はactive operator/customerの基準Caseと停止operatorの期待失敗Case（`it.fails`）で差分を証明する。後者は**製品不具合候補であって製品適合PASSではない**。実CIで旧SUTに対する動的証拠を取得するまでは未再現扱い。
- `app/forbidden.native.tsx`は`NativeUnsupportedScreen title="この操作はNative前半の対象外です"`を返す一方、正式`docs/spec/roles-and-permissions.md`は権限不足の説明と安全な戻り先を要求する。Androidの見た目・操作は未実行であり、仕様との関係を#210へ引継ぎ、独断で修正しない。
- DB変更なし、機密children非表示、実ブラウザでの停止staff再現とAndroid実機確認が不足するため7番のチェックは保留する。

## Storefront商品0件の実Web検証準備（タスクリスト9番）

- 既存`cross-role-chromium`に受入専用2ケースを追加（`e2e/web/pr219-cross-role-lifecycle.spec.ts`）。設定ファイルは#199の共有所有のため変更せず、現在の実行対象ファイル内の別`describe`で管理する。
- `empty-catalog`の無条件0件は`/products`のEmpty StatePanelでCTAがなく、BreadcrumbsのHome linkをキーボードEnterで利用できることを確認する。
- `default`の`/products?minPrice=999999`で0件となる場合はFilter Empty StatePanelと`条件をすべて解除`の機能を確認する。
- 検索API失敗のError画面・視覚正本画像・全幅と実画像証拠/a11y・Reset直後のDB snapshotは未検証。これらが揃うまでタスクリスト9番は未完了。
