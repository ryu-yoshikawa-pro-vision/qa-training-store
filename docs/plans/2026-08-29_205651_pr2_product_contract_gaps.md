# PR 2 prerequisite Product contract gaps Plan

## 0. 依頼概要

- 依頼内容: `CT-DB-KEY-001 / FR-PR-050` と `CP-FORM-001 / NFR-MA-012` のProduct implementation gapを、最新`origin/main`から独立した最小差分で解消する。
- 背景: `normalizeCode` と `INPUT_LIMITS` は既存の正本として存在するが、対象Product write pathとForm / Application Use Caseのconsumerへ接続されていない。
- 期待成果: Product identifierのobservableな正規化・normalized uniquenessと、対象入力制限のshared-source利用を既存Formal Testで固定する。

## 1. ゴール / 完了条件

- ゴール:
  - Productの`productCode`とvariant `sku`のcreate / update経路が既存`normalizeCode()`を通り、正規化後の値でvalidation・unique index・persistenceへ進む。
  - NFR-MA-012に直接対応する認証・プロフィールのFormとApplication / Use Caseが既存`INPUT_LIMITS`を参照する。
  - 変更されたobservable behaviorを既存Integration / Component Testで検証する。
- 完了条件（DoD）:
  - FR-PR-050のtrim・NFKC・ASCII uppercase・pattern・normalized uniquenessがProduct write pathで成立する。
  - `INPUT_LIMITS`の対象fieldについて、FormとUse Caseのlimit sourceがcanonical constantへ統一される。
  - Product create / update、Registration / Profileの境界TestがPASSする。
  - required validation、focused Test、Sanitizer、scope checkがPASSする。
  - PR #78、coverage-remediation worktree、文書、workflow、schema / migration、CT-CATEGORY-002 / CT-BOUNDARY-001には変更がない。
  - commit / push / PR作成 / mergeは行わない。

## 2. 現状理解と前提

- Current understanding:
  - 最新`origin/main`は実装開始時点で`dfae7113e33fb9eb3f55fbd940acb285c7f1870c`。
  - `src/domain/services/normalization.ts`に`normalizeCode(value)`があり、trim・NFKC・ASCII uppercase・`[A-Z0-9_-]+`検証を実装している。
  - `src/application/use-cases/admin-product-use-cases.ts`はProduct code / SKUを現在trimのみで整形し、既存helperを参照していない。create、update、variant追加、variant更新が対象経路である。
  - ProductのDexie unique indexは保存値をkeyにするため、Application層でcanonical valueを作ればschema変更なしにnormalized uniquenessを成立させられる。
  - `src/application/contracts/common.ts`の`INPUT_LIMITS`は既存canonical constantであるが、`src` / `tests`の参照は定義以外にない。
  - 認証Formのpassword / displayName上限とAuth / Account Use Caseの同じliteral、Profile FormのdisplayName `maxLength`が重複している。
  - NFR-MA-012はEmail正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照する契約である。Error Summary / focus / field linkの既存Component Testは今回変更しない。
- Assumptions:
  - `INPUT_LIMITS`をApplication contractsからPresentationが参照する既存依存方向は許容される。新しいshared moduleやvalidation frameworkは作らない。
  - Email上限はNFR-MA-012と既存`INPUT_LIMITS.email`に直接対応するため、Registration Form / Use Caseへ接続する。Loginのpassword semanticsや無関係なFormのliteralは変更しない。
  - Empty identifierの既存Application validation semanticsを保つため、空文字は既存minimum validationへ渡し、非空値だけ`normalizeCode`で検証する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Requirement、canonical helper / constant、既存write path、既存Test layerがCurrent codeで確認できた。
- 仮定してよい細部: 新Testは既存`tests/integration/admin-product-use-cases.test.ts`、`tests/integration/auth-account.test.ts`、`tests/component/auth-account-pages.test.tsx`へ最小追加する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Application Product write normalization
  - Application auth / account validation
  - Web auth / profile Form schema and native input attributes
  - Existing Product and auth/account Integration Test、Web Component Test
- Files to inspect:
  - `docs/01_requirements/functional_requirements.md`
  - `docs/01_requirements/non_functional_requirements.md`
  - `src/domain/services/normalization.ts`
  - `src/application/contracts/common.ts`
  - `src/application/use-cases/admin-product-use-cases.ts`
  - `src/application/use-cases/auth-use-cases.ts`
  - `src/application/use-cases/account-use-cases.ts`
  - `src/presentation/pages/auth-pages.tsx`
  - `src/presentation/pages/profile-page.tsx`
  - `tests/integration/admin-product-use-cases.test.ts`
  - `tests/integration/auth-account.test.ts`
  - `tests/component/auth-account-pages.test.tsx`
  - `src/infrastructure/database/dexie/database.ts`

## 5. 変更方針

- Change strategy:
  1. `normalizeCode`をApplication Product Use Caseへimportし、Product codeの共通正規化、create variant、update variantへ接続する。Product repository、DB schema、migrationは変更しない。
  2. `INPUT_LIMITS`をAuth / Account Use CaseとSignup / Profile Formから直接参照する。既存のerror key・message・validation timingは維持する。
  3. 既存Integration TestでProduct create / updateのcanonical値と、正規化後に衝突するProduct code / SKUのunique拒否を確認する。
  4. 既存Auth / Account Integration TestとWeb Component TestでApplication/Formのlimit boundaryとFormのshared-backed attributesを確認する。
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
  - `pnpm exec vitest run tests/integration/admin-product-use-cases.test.ts tests/integration/auth-account.test.ts tests/component/auth-account-pages.test.tsx`
  - `git diff --check`
  - `scripts/sanitize-codex-artifacts.ps1 -Write` と`-Check`
- 成功判定:
  - 上記formal commandとfocused Testがexit 0であること。未実行・FAIL・timeoutはPASS扱いにしない。
  - Product manual reviewでcreate / update / variant add / variant updateのcanonical値、normalized unique、既存empty semantics、helper重複なしを確認する。
  - INPUT_LIMITS manual reviewでForm / Use Caseの直接参照、依存方向、対象外literal不変、error semantics不変を確認する。

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
