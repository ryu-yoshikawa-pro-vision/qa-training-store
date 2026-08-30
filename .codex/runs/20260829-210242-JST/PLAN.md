# PR 2 prerequisite Product contract gaps Run Plan

## Objective

- PR #78から独立した`fix/pr2-product-contract-gaps`で、最新`origin/main`に残る`CT-DB-KEY-001 / FR-PR-050`と`CP-FORM-001 / NFR-MA-012`のProduct implementation gapだけを解消する。

## Scope

- In:
  - 既存`normalizeCode()`をProduct `productCode` / variant `sku`の全write pathへ接続する。
  - 既存`INPUT_LIMITS`を今回のRequirementに直接対応するAuth / Account Use CaseとSignup / Profile Formへ接続する。
  - 既存Integration / Component Testへobservable boundaryとnormalized uniquenessの最小Testを追加する。
  - 本Planと本Run Artifact。
- Out:
  - `CT-CATEGORY-002`、`CT-BOUNDARY-001`のcoverage追加。
  - PR #78の文書、Child Plan、Master Plan、既存Run、coverage-remediation worktree。
  - DB schema / index / migration / persisted data migration、workflow、package script、config、validator、Curriculum / Training、Native側の追加設計。
  - unrelated limitsの一括共通化、refactoring、Test ID / title制度変更、commit / push / PR / merge。

## Current Evidence

- 実装開始時点の`origin/main` / base SHAは`dfae7113e33fb9eb3f55fbd940acb285c7f1870c`。
- `src/domain/services/normalization.ts`の`normalizeCode`はtrim・NFKC・ASCII uppercase・`[A-Z0-9_-]+` validationを持つが、Product write pathは現在trimのみである。
- `src/application/use-cases/admin-product-use-cases.ts`では、Product create / update、variant create、variant updateが存在する。
- Dexie Product / Variant unique indexは保存値をunique keyとするため、Applicationでcanonical valueを作ればDB変更なしにnormalized uniquenessを成立させられる。
- `src/application/contracts/common.ts`の`INPUT_LIMITS`はcanonical値を持つが、現在の`src` consumerはない。Auth registrationのpassword / displayName、Account profileのdisplayName、Signup / Profile Formに同値literalがある。
- `FR-PR-050`はproductCode / SKUのTrim・Unicode NFKC・ASCII大文字化後のpattern validationとcase-insensitive uniquenessを要求する。
- `NFR-MA-012`はEmail正規化、文字数上限、Application Errorを共有関数・共有定数・共有型から参照することを要求する。

## Assumptions

- Applicationは既存Domain serviceを参照でき、Presentationは既存Application contractsを参照できるため、module移動は不要である。
- empty Product identifierは既存`validateMinimum`のApplication validation semanticsを維持し、非空値だけ`normalizeCode`へ渡す。
- `INPUT_LIMITS.email`はNFR-MA-012に直接対応するため、Registration Form / Use Caseのemail lengthへ接続する。Login passwordの既存minimum semanticsや無関係なFormは変更しない。
- Product code / SKUのmaxlengthなど、今回のnormalize/unique gapを超えるlimit拡張は実施しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Requirement、canonical helper / constant、対象write path、既存Test layerをCurrent codeで確認済み。
- 仮定してよい細部: 新Testは既存`tests/integration/admin-product-use-cases.test.ts`、`tests/integration/auth-account.test.ts`、`tests/component/auth-account-pages.test.tsx`へ追加する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `normalizeCode`をApplication Product Use Caseのnormalized inputへ接続すれば、既存Dexie unique indexでcanonical persistenceとnormalized uniquenessを観測できる。
- H2: `INPUT_LIMITS`をAuth / Account Use CaseとSignup / Profile Formへ直接参照させれば、FormとApplicationのlimit sourceを一致させられる。
- H3: 既存Integration / Component Testで、Product create / update / duplicateとRegistration / Profile / Signup boundaryを新Test fileなしで固定できる。

## Research Plan

- Round 1 Query: 最新mainのRequirement、helper / constant、Product write path、Auth / Account validation、Form、既存Test、package scriptsをread-onlyで確認する。
- Round 2 Query: 変更対象を最小化し、空値・normalization・unique・limit boundary・依存方向の実装とTestを確定する。
- Exit Criteria:
  - 2 gapそれぞれのCurrent failure、変更対象、observable Test evidenceが特定されている。
  - DB変更やProduct behavior不適合が発見された場合は、推測実装せずStopする。
  - 実装後のManual Reviewで全Product identifier write pathと対象INPUT_LIMITS consumerを確認できる。

## Approach

1. 独立worktreeの最新main、Plan、Run、base SHAを記録する。
2. PlanのCurrent evidenceを最新mainで再確認し、gapが解消済みなら対象ごとに変更せず停止する。
3. `normalizeCode`をProduct use caseへ接続し、create / update / variant create / variant updateをcanonical valueで処理する。
4. Auth / Account Use CaseとSignup / Profile Formを`INPUT_LIMITS`へ接続し、既存error semanticsを維持する。
5. 既存suiteへ最小のobservable Testを追加する。
6. required validation、focused Test、scope check、Sanitizerを実行し、Run Artifactへ結果を同期する。

## Test Strategy

- Product integration:
  - raw whitespace / full-width / lowercaseのProduct codeとSKUが保存・返却時にcanonical uppercaseになる。
  - create後updateでも両identifierがcanonical化される。
  - raw文字列が異なってもcanonical valueが既存Product code / SKUと同じならunique制約で拒否される。
- Input limit integration:
  - Auth registrationのpassword / displayName / email boundaryをApplicationで検証する。
  - Profile updateのdisplayName max boundaryをApplicationで検証する。
- Input limit Component:
  - Signup schemaがmax boundaryでForm submissionを拒否する。
  - Signup / Profile input attributeが`INPUT_LIMITS`由来の値になる。
- implementation detailのhelper呼出し回数やliteral不存在だけはTestの主証拠にしない。

## Validation Plan

- `pnpm install --frozen-lockfile --ignore-scripts`（node_modulesが不足する場合のみ）。
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run typecheck`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:component`
- `pnpm run test:contracts`
- 変更対象のfocused Vitest suite
- `git diff --check`
- `scripts/sanitize-codex-artifacts.ps1 -Write` / `-Check`

## Risks / Unknowns

- `normalizeCode("")`はTypeErrorになるため、既存のempty required validationを壊さない局所的な境界処理が必要。
- Product repositoryを直接変更するとApplication boundaryを迂回してscopeが拡大するため、DB schema / repository / migrationへ変更しない。
- `INPUT_LIMITS`をPresentationがApplication contractsから参照する方向は既存のPresentation -> Application依存に合致するが、ApplicationからPresentationへの逆依存は作らない。
- Required validationの環境依存failureは、今回の差分との因果を調査し、timeout変更・retry無制限・alternate PASSの読み替えを行わない。

## Stop Conditions

- 最新mainでgapが解消済みである。
- `normalizeCode`接続にDB schema / index / migration / persisted data migration / product identity変更が必要になる。
- Requirementのnormalized uniquenessやinput limitの期待値がCurrent Specから一意に決められない。
- `INPUT_LIMITS`接続に大規模dependency inversionやvalidation framework再設計が必要になる。
- Product変更により既存Testが失敗し、Product behaviorの追加判断が必要になる。
- workflow / package / config / validator / PR #78関連ファイルの変更が必要になる。

## Definition of Done

- FR-PR-050のProduct code / SKU create / updateが`normalizeCode`を通り、canonical persistenceとnormalized uniquenessをfocused Testで確認できる。
- NFR-MA-012の対象Form / Use Caseが`INPUT_LIMITS`を直接参照し、対象boundary TestがPASSする。
- required validation、focused Test、scope、SanitizerがPASSする。
- Product / Test / Plan / Run以外の禁止scopeへ変更がなく、PR #78と既存coverage-remediation worktreeが不変である。
- commit / push / PR作成 / mergeを行わない。

## Follow-up

- この作業が成功した後、別作業として最新mainから`CT-CATEGORY-002`と`CT-BOUNDARY-001`のFormal coverage remediationを再開する。
- Product修正のreview / merge後に、PR #78 branchを最新mainへ追従させ、Traceabilityを再監査する。

## Thinking Log

- 2026-08-29 20:56 JST: 元PR #78と既存coverage-remediation worktreeのdirty stateを守るため、`origin/main`から独立worktreeを作成する方針を採用した。
- 2026-08-29 21:02 JST: 最新mainのread-only再監査で2件のgapが継続していることを確認し、既存helper / constantを移動せずconsumer wiringだけを行う計画を確定した。
