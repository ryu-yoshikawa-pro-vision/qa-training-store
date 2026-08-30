# PR 2 prerequisite Product contract gaps Plan

## 0. 依頼概要

- 依頼内容: `CT-DB-KEY-001 / FR-PR-050` と `CP-FORM-001 / NFR-MA-012` のProduct implementation gapを、最新`origin/main`から独立した最小差分で解消する。
- 背景: `normalizeCode` と `INPUT_LIMITS` は既存の正本として存在するが、対象Product write pathとForm / Application Use Caseのconsumerへ接続されていない。
- 期待成果: Product identifierのobservableな正規化・normalized uniquenessと、対象入力制限のshared-source利用を既存Formal Testで固定する。

## 1. ゴール / 完了条件

- ゴール:
  - Productの`productCode`とvariant `sku`のcreate / update経路が既存`normalizeCode()`を通り、正規化後の値でvalidation・unique index・persistenceへ進む。
  - NFR-MA-012について、`docs/05_ui/validation_and_messages.md`の`主な入力`を起点に、明示的な文字数上限を持つActive入力をbounded auditし、既存`INPUT_LIMITS`のcanonical keyをPresentation / FormとApplication / Use Caseの両方から参照する。
  - 変更されたobservable behaviorを既存Integration / Component Testで検証する。
- 完了条件（DoD）:
  - FR-PR-050のtrim・NFKC・ASCII uppercase・pattern・normalized uniquenessがProduct write pathで成立する。
  - `INPUT_LIMITS`の対象fieldについて、FormとUse Caseのlimit sourceがcanonical constantへ統一される。
  - Product create / updateとbounded audit対象consumerのApplication / Form境界TestがPASSする。
  - required validation、focused Test、Sanitizer、scope checkがPASSする。
  - PR #78、coverage-remediation worktree、文書、workflow、schema / migration、CT-CATEGORY-002 / CT-BOUNDARY-001には変更がない。
  - commit / push / PR作成 / mergeは行わない。

## 2. 現状理解と前提

- Current understanding:
  - 最新`origin/main`は実装開始時点で`dfae7113e33fb9eb3f55fbd940acb285c7f1870c`。
  - `src/domain/services/normalization.ts`に`normalizeCode(value)`があり、trim・NFKC・ASCII uppercase・`[A-Z0-9_-]+`検証を実装している。
  - `src/application/use-cases/admin-product-use-cases.ts`はProduct code / SKUを現在trimのみで整形し、既存helperを参照していない。create、update、variant追加、variant更新が対象経路である。
  - ProductのDexie unique indexは保存値をkeyにするため、Application層でcanonical valueを作ればschema変更なしにnormalized uniquenessを成立させられる。
  - `src/application/contracts/common.ts`の`INPUT_LIMITS`は既存canonical constantであり、認証・プロフィール以外にも同義のForm / Application validation consumerが存在する。
  - `docs/05_ui/validation_and_messages.md`の`主な入力`には、Search Keywordを含む25件の明示的な文字数上限がある。`INPUT_LIMITS`には全25件に対応するkeyが存在し、既存consumerの一部はFormまたはApplicationの片側だけ、または未接続である。
  - 前回bounded auditで接続済みのEmail / Password / 表示名、住所ラベル / 宛名、Category / Brand name、Review title / body、Inventory reasonは維持し、今回の仕様表監査では全Active consumerの反対側と未接続項目を再確認する。bulk件数、formatted postal code、pagination、購入数など文字数Ruleではないliteralは対象外とする。
  - 認証Formのpassword / displayName上限とAuth / Account Use Case、Profile FormのdisplayNameは前回実装で既に`INPUT_LIMITS`へ接続済みである。
  - NFR-MA-012はEmail正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照する契約である。Error Summary / focus / field linkの既存Component Testは維持し、今回の対象は仕様表上の文字数上限とそのconsumerに限定する。
- Assumptions:
  - `INPUT_LIMITS`をApplication contractsからPresentationが参照する既存依存方向は許容される。新しいshared moduleやvalidation frameworkは作らない。
  - Email上限はNFR-MA-012と既存`INPUT_LIMITS.email`に直接対応するため、Registration Form / Use Caseへ接続する。Loginのpassword semanticsや無関係なFormのliteralは変更しない。
  - Empty identifierの既存Application validation semanticsを保つため、空文字は既存minimum validationへ渡し、非空値だけ`normalizeCode`で検証する。
  - NativeのActive入力も同じ仕様表のPresentation consumerとして監査する。ただしCurrent Productに存在しないAdmin Product / Shipping等のNative入力は新設しない。
  - 仕様表の25件は既存keyを再利用し、新しいlimit keyやvalidation frameworkを作らない。郵便番号・電話番号は形式Ruleであり、文字数上限監査の対象外として既存のformat制約を維持する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Requirement、canonical helper / constant、既存write path、既存Test layerがCurrent codeで確認できた。
- 仮定してよい細部: 新Testは既存`tests/integration/admin-product-use-cases.test.ts`、`tests/integration/auth-account.test.ts`、`tests/component/auth-account-pages.test.tsx`へ最小追加する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Application Product、Auth / Account、Checkout、Catalog、Master、Review、Operations validation
  - Web / NativeのActive Form input attributes and immediate validation
  - Existing Product、Account、Checkout、Catalog、Master、Review、Operations Integration Test、Web / Native Component Test
- Files to inspect:
  - `docs/01_requirements/functional_requirements.md`
  - `docs/01_requirements/non_functional_requirements.md`
  - `src/domain/services/normalization.ts`
  - `src/application/contracts/common.ts`
  - `src/application/use-cases/admin-product-use-cases.ts`
  - `src/application/use-cases/auth-use-cases.ts`
  - `src/application/use-cases/account-use-cases.ts`
  - `src/application/use-cases/checkout-order-use-cases.ts`
  - `src/application/use-cases/catalog-use-cases.ts`
  - `src/application/use-cases/admin-master-use-cases.ts`
  - `src/application/use-cases/review-user-use-cases.ts`
  - `src/application/use-cases/admin-operations-use-cases.ts`
  - `src/presentation/pages/auth-pages.tsx`
  - `src/presentation/pages/profile-page.tsx`
  - `tests/integration/admin-product-use-cases.test.ts`
  - `tests/integration/auth-account.test.ts`
  - `tests/component/auth-account-pages.test.tsx`
  - `src/presentation/pages/addresses-page.tsx`
  - `src/presentation/pages/admin-product-pages.tsx`
  - `src/presentation/pages/admin-master-pages.tsx`
  - `src/presentation/pages/review-user-pages.tsx`
  - `src/presentation/pages/admin-operations-pages.tsx`
  - `src/presentation/pages/catalog-list-page.tsx`
  - `src/presentation/components/search-combobox.tsx`
  - `src/presentation/native/native-components.tsx`
  - `src/presentation/native/native-screens.tsx`
  - `src/presentation/native/native-purchase-screens.tsx`
  - `tests/integration/admin-master-use-cases.test.ts`
  - `tests/integration/review-user-use-cases.test.ts`
  - `tests/integration/admin-operations-use-cases.test.ts`
  - `tests/integration/checkout-order-use-cases.test.ts`
  - `tests/integration/catalog-use-cases.test.ts`
  - `tests/component/admin-master-pages.test.tsx`
  - `tests/component/review-user-pages.test.tsx`
  - `tests/component/admin-operations-pages.test.tsx`
  - `tests/component/admin-product-pages.test.tsx`
  - `tests/component/catalog-pages.test.tsx`
  - `tests/component/native/native-catalog-screen.test.tsx`
  - `tests/component/native/native-purchase-screens.test.tsx`
  - `src/infrastructure/database/dexie/database.ts`

## 5. 変更方針

- Change strategy:
  1. `normalizeCode`をApplication Product Use Caseへimportし、Product codeの共通正規化、create variant、update variantへ接続する。Product repository、DB schema、migrationは変更しない。
  2. `validation_and_messages.md`の`主な入力`にある明示的な文字数上限を仕様表起点で再監査し、ActiveなWeb / Native FormとApplication / Use Caseを既存`INPUT_LIMITS`へ接続する。既存のerror key・message・validation timingは維持し、未接続consumerの不足validationだけを補う。
  3. 既存Integration TestでProduct create / updateのcanonical値と、正規化後に衝突するProduct code / SKUのunique拒否を確認する。
  4. 既存Auth / Account / Checkout / Catalog / Admin Master / Review / Inventory Integration TestとWeb / Native Component TestでApplication/Formのlimit boundaryとFormのshared-backed attributesを確認する。
  5. 変更箇所をself-reviewし、required validation、focused Test、scope、Sanitizerを完了する。
- 実行タスク:
  - [x] 1. 最新main、Requirement、helper / constant、write path、既存Testを再確認する。
  - [x] 2. 新Planと専用Run ArtifactへCurrent evidence、base SHA、変更scopeを記録する。
  - [x] 3. Product code / SKUのcanonical normalizationとnormalized uniquenessを実装する。
  - [x] 4. Auth / Account Use CaseとSignup / Profile Formを`INPUT_LIMITS`へ接続する。
  - [x] 5. Product / Auth / Formのobservable boundary Testを追加する。
  - [x] 6. required validationと変更Test Levelのfocused Testを実行する。
  - [x] 7. Manual review、scope check、Sanitizer Write / Checkを実施する。
  - [x] 8. Run Artifactを実績へ同期し、commit/pushなしで完了報告する。
  - [ ] 9. 仕様表の25件をActive / Already compliant / Repair / Not Active / Not Applicableへ分類し、今回対象consumerを確定する。
  - [ ] 10. Active Form / Use Caseの不足limitを既存`INPUT_LIMITS`へ接続し、既存Formal Testを最小更新する。
  - [ ] 11. 修正範囲のfocused / required validation、manual audit、scope、Sanitizerを実施する。
  - [ ] 12. Run ArtifactとPR #84本文を実績へ同期し、明示pathでcommit / pushする。

## 6. 検証方法

- Validation plan:
  - `pnpm install --frozen-lockfile --ignore-scripts`（依存が必要な場合のみ）。
  - `pnpm run format:check`
  - `pnpm run lint:markdown`
  - `pnpm run validate:spec`
  - `pnpm run typecheck`
  - `pnpm run test:unit`
  - `pnpm run test:component`
  - `pnpm run test:contracts`
  - `pnpm run test:integration`
  - `pnpm exec vitest run <今回変更した既存Integration / Component suite> --no-file-parallelism --maxWorkers=1`
  - `git diff --check`
  - `scripts/sanitize-codex-artifacts.ps1 -Write` と`-Check`
- 成功判定:
  - 上記formal commandとfocused Testがexit 0であること。未実行・FAIL・timeoutはPASS扱いにしない。
  - Product manual reviewでcreate / update / variant add / variant updateのcanonical値、normalized unique、既存empty semantics、helper重複なしを確認する。
  - 仕様表25件のActive分類、Form / Use Caseの直接参照、依存方向、対象外literal不変、error semantics不変を確認する。

## 7. リスクと未解決論点

- Risks:
  - `normalizeCode`を空文字へ直接適用すると既存のrequired validation error semanticsが変わるため、空値の扱いを先に確認して保つ。
  - Product write pathを一部だけ変更するとcreate / updateで契約が分岐するため、既存の全Product identifier write pathを確認する。
  - Formだけを変更するとApplication境界を迂回できるため、Auth / Account Use Caseも同じconstantを参照する。
  - 既存テスト環境のtimeoutやBaseline failureが発生した場合は、最初の異常と今回差分との因果を切り分け、test codeやtimeoutを変更しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - 2件のProduct / Form implementationに直接必要な既存source file
  - 既存Product / Auth / Component Test file
  - 本Plan
  - 本作業専用Run Artifact
- 付随ドキュメント:
  - PR #78の文書、Child Plan、Master Plan、既存Runは変更しない。

## 9. 備考

- CT-CATEGORY-002とCT-BOUNDARY-001は今回対象外であり、coverage追加を混在させない。
- PR #78および既存coverage-remediation worktreeのdirty stateは別worktreeで保持する。

## 10. Review repair（2026-08-30）

- 対象Finding:
  - Product `productCode` / SKUの`normalizeCode()`が投げるDomain `TypeError`をApplication `VALIDATION`へ変換し、既存のrequired semanticsとmessage keyを維持する。
  - `CatalogUseCases.suggest()`のSearch Keyword上限超過を空配列ではなく`catalog.search.invalid`の`VALIDATION`として返し、2文字未満の未開始条件とは区別する。
- 変更許可範囲:
  - `src/application/use-cases/admin-product-use-cases.ts`
  - `src/application/use-cases/catalog-use-cases.ts`
  - `tests/integration/admin-product-use-cases.test.ts`
  - `tests/integration/catalog-use-cases.test.ts`
  - 本Planとactive Run Artifact
- 非対象:
  - Domain `normalizeCode()`、Product normalization方式、Search UI、PR #78、coverage-remediation、workflow、package/config、DB、他の入力制限。
- 検証:
  - focused Product / Catalog Integration Test、required validation、既存Sanitizer、scope checkを実行する。failure時はraw `TypeError`漏出・Suggestion境界・今回差分との因果を切り分け、timeout変更や無制限retryは行わない。
