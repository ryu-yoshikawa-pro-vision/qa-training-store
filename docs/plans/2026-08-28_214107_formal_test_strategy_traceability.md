# PR 2 — Formal Test Strategy / Perspective / Traceability 実装計画

## 0. 依頼概要

- 依頼内容: Master Plan の PR 2「Formal Test Strategy / Perspective / Traceability」を実装する。
- 背景: PR #75 で Current Documentation / SSOT の不整合を修正したため、その Current contract を前提に Formal Test Strategy と Traceability を最小変更で整理する。
- 期待成果: RA-G1 / RA-G3 / RA-G6 を解消し、PR 1 の RA-M1 / M2 / M3 / M5 / M6 / CUR-M9 を破壊しない。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Progress tracker: Issue #72
- Baseline: `main` commit `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`（PR #75 merge commit）
- Branch: `docs/formal-test-strategy-traceability`

## 1. ゴール / 完了条件

### ゴール

次の2文書だけを実装修正し、Current executable contract / workflow / ADR と一致する Test Strategy / Traceability を作る。

1. `docs/08_testing/test_strategy.md`
2. `docs/12_quality/requirements_traceability.md`

### 完了条件（DoD）

- `test_strategy.md`で Test Level / Test Type、Test Perspective、Execution / Platform / CI Gate を別軸として読める。
- Phase 1 Risk 16件を 1 Risk = 1 row で追跡でき、Risk → Representative Requirement / AC → applicable Technique / Perspective → Primary Test Level → Representative Formal Test / suite → CI Gate を辿れる。
- Requirement Group から representative Current verification を辿れる。Current automation がある箇所は既存 code / suite へ接続される。
- `WE-CORE-001`〜`WE-CORE-012`は Requirement / business-flow Mapping ID として Current E2E の `file path + exact title` へ接続される。
- 実装開始時点の Current 下位Traceability代表label全件が `exact-title` または `suite-level` で Current code へ接続され、未判定 / `stop` が残らない。
- Current Test ID / Mapping label taxonomy の説明が文書内で自己矛盾していない。
- Formal Regression / Training / UI Review を混同していない。
- Web / Android / iOS の Current asymmetric guarantee を正確に説明している。
- 新Risk ID、第三のTraceability SSOT、permanent inventoryを追加していない。
- Test code / workflow / validator / Product / Curriculum を変更していない。
- Required validation が PASS している。

## 2. 現状理解と前提

### Current understanding

- Current `main`は `12afd144cc81fb63a3c6d3a0edcee1eb6ed2317a`。
- Current `test_strategy.md`には Phase 1重要Risk 16件、既存の Test Level、E2E Release Gate、Native境界、Accessibility、UX、性能等の有効な説明がある。
- Current `requirements_traceability.md`には次がある。
  - Functional Requirement Group Matrix: `Test Suite`列あり。
  - Non-functional Group: 既存の`検証`列あり。
  - `WE-CORE-001`〜`012`: Requirement / business-flow mapping。
  - 下位代表label: Plan作成時点では §6 の18行 + §7後ろの孤立4行 = 22行。
  - `Test ID Rule`は `UT-*` / `RC-*` / `WE-*` / `AX-*` / `UX-*` / `BM-*` を定義する一方、下位表には `CT-*` / `CP-*` 等も存在する。
- `playwright.config.ts`は Product-side automation config であり、Formal E2E / Smoke と別責務の `ui-review-*` projects が同居する。
- `playwright.training.config.ts`は Training-only Playwright config。
- `training-web-baseline`は Web CI で実行されても Formal Regression coverage には昇格しない。
- Current Native guarantee は Android Build + Runtime / Maestro、iOS Build-only。iOS Runtime / Maestro PASS は Required guarantee ではない。

### Assumptions

- 実装開始時に Current `main`を再確認する。
- 無関係な変更では停止しない。PR 2の Test分類 / Traceability / Gate / platform guarantee に影響する semantic contract が変わっている場合だけ Plan を見直す。
- Current evidence だけで代表 verification / code / gate を確定できない場合は推測で埋めない。

### Non-goals

- Product behavior、Test Suite、CI Gate、workflow、package、Playwright config の変更。
- Test title / test file へのID追加や一括rename。
- `e2e_design.md`、contract test、validator、Curriculum、Training behavior の変更。
- 新しいStable Risk ID、Risk Registry、第三のTraceability SSOT、permanent Test Inventory の追加。
- 全Requirement × 全Test の1:1巨大Matrix。
- `test_strategy.md`全体の全面rewrite。Currentで正しい既存説明は原則維持する。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で blocking question はない。

ただし実装時に次のいずれかへ該当したら停止し、child Plan を見直す。

- Requirement Group のいずれかを Current verification へ合理的に接続できず、新Test / 新Gateを追加しないとTraceabilityが成立しない。
- Current下位代表labelを Current evidence から code / suite へ接続できない。
- `CT-*` / `CP-*` 等のtaxonomyを Current evidence から説明できず、新ID制度が必要になる。
- Riskを Representative Requirement / AC、Representative Formal Test / suite、CI Gate へ合理的に接続できない。
- RA-G3全体として Technique / Perspective の関係を Current evidence から説明できない。
- PR 2の完了に `e2e_design.md`、test、contract、validator、workflow、package、Playwright config、Product、Curriculum、Training behavior の変更が必要になる。
- PR 3 / PR 4 / PR 5 の Primary owner 領域へ踏み込む必要がある。

### 仮定してよい細部

- Techniqueが明確に主ではないRiskでは `—` / `Not primary` を使う。
- supporting suite は必要な場合だけ短く補足する。
- Group-level trace は1〜数個の representative verification に留める。

### 未回答の重要質問

- なし。

## 4. 影響範囲

### Impacted areas / Writable files

実装時に変更してよいのは次だけ。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- 新しい PR 2 implementation Run Artifact

Plan作成と実装を同一branchで行うため、Plan-only validation / Sanitizer完了後、実装開始直前のbranch HEADを `IMPLEMENTATION_BASE_SHA` として取得する。

- `IMPLEMENTATION_BASE_SHA`を implementation Run Evidence へ記録する。
- implementation scope は `IMPLEMENTATION_BASE_SHA...HEAD` で判定する。
- PR-wide diff に既存 child Plan / Plan Run Artifact が含まれることは scope violation としない。

### Files to inspect（read-only）

Current execution contract は entrypoint-first で確認する。

1. `package.json`
2. `playwright.config.ts`
3. `playwright.training.config.ts`
4. `.github/workflows/ci.yml`
5. `.github/workflows/cross-browser-smoke.yml`
6. `.github/workflows/native-ci.yml`
7. `.github/workflows/native-ios-ci.yml`
8. `docs/adr/0011-native-ci-ios-build-only-gate.md`
9. `docs/08_testing/e2e_design.md`
10. `docs/12_quality/acceptance_criteria.md`

Test file は Risk mapping / Requirement verification / direct reference で実際に参照するものだけ追加確認する。

## 5. 変更方針

### 5.1 `test_strategy.md`

Currentで正しい Phase 1 Risk、Unit重点、Repository Contract重点、Data方針、Accessibility、UX、性能等の説明は原則維持する。3軸とTraceabilityを明示するために必要な見出し・表・接続説明だけを最小修正し、文書全体の全面rewriteは行わない。

#### A. Test Level / Test Type

Current evidence に存在する分類だけを整理する。最低限:

- Unit
- Application Integration
- Repository Contract
- Component
- Static / Operational Contract
- Web E2E
- Native Component / Repository / Android Runtime E2E
- Deployed / Production Smoke

Accessibility / Responsive / Role / State / Boundary / Failure / UI Review を Test Level として追加しない。

#### B. Test Perspective

最低限:

- Accessibility
- Responsive / Mobile Web
- Role / Ownership
- State / Lifecycle
- Boundary
- Failure / Recovery

Current Risk / test で説明できる場合のみ Data / Persistence consistency、Security / Authorization、UX / Visual acceptance を使う。

#### C. Execution / Platform / CI Gate

Current workflow に存在するものだけを整理する。最低限:

- Web PR / main / schedule / manual
- `e2e-chromium` matrix
- UI Review
- Production Smoke / Preview Deployed Smoke
- non-PR Extended E2E
- weekly / manual Cross-browser Smoke
- Native PR conditional / Native manual
- Android Build + Runtime / Maestro
- iOS Build-only reusable gate
- Formal / Training boundary

workflowで同時に走ることと、同じcoverage分類であることを混同しない。

#### Risk mapping contract

Current Phase 1重要Risk 16件を順序・文言を維持して1 Risk = 1 rowで記載する。新Risk IDは作らない。

| Risk / Risk label | Representative Requirement / AC | Representative Technique | Representative Perspective | Primary Test Level | Representative Formal Test / suite | CI Gate |
|---|---|---|---|---|---|---|

- `Representative Requirement / AC`は必須。
- TechniqueとPerspectiveを同じ列へ混ぜない。
- TechniqueはCurrent risk / requirement / test intentから具体的に説明できる場合だけ記載し、非適用なら `—` / `Not primary` を許容する。
- Perspectiveは各Riskで意味のある分類を記載する。
- Primary Test Levelは原則1つ。
- Representative Formal Test / suiteは stable な suite / package command / Playwright project 等の代表実行単位とする。exact titleを大量複製しない。
- CI Gateはそのsuiteを実行・要求する最も近い workflow job / matrix leg とする。具体的なjob / legがあるのに `verify` / `validate`だけで一律に埋めない。

#### Formal / Training / Platform boundary

- `playwright.config.ts`に存在することだけを理由に `ui-review-*` を Formal Regression へ分類しない。
- `training-web-baseline`を Formal Regression coverage として数えない。
- Platform parityは同一suite化ではなく Current guarantee の説明とする。
- Web: Current Formal Web / Smoke / relevant CI contract。
- Android: Build + Runtime / Maestro。
- iOS: Automation / Production-validation Build-only。iOS Runtime / Maestro は Required guarantee ではない。

### 5.2 `requirements_traceability.md`

第三のTraceability fileは作らず、次の3層をこの文書内で閉じる。

1. Requirement Group → representative Current verification
2. WE-CORE 12 Mapping → representative E2E code
3. Current下位Traceability代表label → representative lower-level code / suite

#### Requirement Group

FunctionalとNon-functionalで既存表構造が違うため、同じ列を機械的に追加しない。

- Functional Requirement Group Matrix:
  - 既存`Test Suite`列は概念的なgroupingとして維持する。
  - その右へ`Representative Verification`を1列だけ追加する。
  - Current executable regression がある場合は representative file / suite へ接続する。
- Non-functional Group:
  - 新しい第4列を追加しない。
  - 既存`検証`列を `Representative Verification` として再利用する。必要なら列名を変更し、Current contractに基づく具体的なverificationへ整理する。
  - automated suite / Benchmark / UI Review / Static Check / Smoke 等の実在するCurrent verificationを使う。
- automationがないverificationへ架空のcode referenceを作らない。
- 全Test / 全Evidence一覧へ展開しない。
- package command / Playwright project / CI Gate の詳細は `test_strategy.md` 側で管理する。

#### WE-CORE

- `WE-CORE-001`〜`012`は Requirement / business-flow Mapping ID とする。executable test count として扱わない。
- identifier自体はrenameしない。
- Current `e2e/web/phase1-required.spec.ts`と照合し、各Mappingへ `repository-relative file path + exact test title` を記載する。

#### 下位Traceability代表label

Plan作成時点では §6 の18行 + §7後ろの孤立4行 = 22行だが、この件数は固定契約にしない。実装開始時点のCurrent全件を監査する。

各行を必ず次のいずれかへDispositionする。

1. `exact-title`: file path + exact test title
2. `suite-level`: 1つのtest file / suiteが明確に代表する場合のfile reference
3. `stop`: Current evidenceからlabelの意味または代表codeを説明できない

`stop`が1行でも残る場合はPR 2 completionへ進まない。

- Test codeにIDが存在しない場合、IDを新規埋込みしない。
- `UT-*` / `CT-*` / `CP-*` / `WE-*`等が executable test自身の正式IDか、Traceability上のrepresentative labelかをCurrent evidenceで区別する。
- `Test ID Rule`が実態を説明できていない場合は既存IDをrenameせずtaxonomy説明を修正する。
- §7後ろの孤立4行が実装開始時にも存在する場合、意味を変えず既存下位代表表へ統合する。

### 5.3 実行タスク

1. Plan-only validation / Sanitizer完了後、`IMPLEMENTATION_BASE_SHA`を取得する。
2. 新しいimplementation Runを作り、`IMPLEMENTATION_BASE_SHA`をEvidenceへ記録する。
3. latest `main`と§4のread-only入口を再確認し、semantic driftを判定する。
4. Requirement Group / WE-CORE / Current下位代表labelをpre-auditする。
5. §5.1に従って`test_strategy.md`を最小修正する。
6. §5.2に従って`requirements_traceability.md`を最小修正する。
7. RA-M1 / M2 / M3 / M5 / M6 / CUR-M9をfollow-up verificationする。
8. `IMPLEMENTATION_BASE_SHA...HEAD`でscopeを確認し、Validationを実施する。

## 6. 検証方法

### Validation plan

必須:

- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run test:contracts`
- `git diff --check`

Curriculum / TypeScript / validator / testは変更禁止なので、`validate:curriculum` / `typecheck`等をPR 2専用のrequired validationへ追加しない。これらの変更が必要になった場合はPlanを見直す。

### Manual cross-check

- 3軸が独立して読める。
- Risk 16行が7列schemaを守り、Technique非適用時に推測の値を入れていない。
- Formal Test / suite と CI Gate が最も近いCurrent実行単位を指している。
- Functional Groupは`Test Suite` + `Representative Verification`、NFRは既存`検証`列を再利用しており、二重管理になっていない。
- WE-CORE 12がMapping IDとしてCurrent exact E2Eへ接続されている。
- Current下位代表label全件がDisposition済み。
- Formal / Training / UI Review、Android Runtime / iOS Build-onlyを混同していない。
- Currentに存在しないproject / command / workflow job / guaranteeを書いていない。

### Scope validation

`IMPLEMENTATION_BASE_SHA...HEAD`が原則次だけであることを確認する。

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- active implementation Run Artifact

PR-wide diffには既存child Plan / Plan Run Artifactが含まれてよい。

## 7. リスクと未解決論点

### Risks

- Traceabilityを埋めるために存在しないautomationを発明するリスク。
  - 対策: Current verificationを正本とし、確定できなければStopする。
- Risk表が最終aggregate gateだけで埋まり情報量を失うリスク。
  - 対策: 最も近いworkflow job / matrix legを使う。
- `test_strategy.md`の3軸整理を理由に全面rewriteへ広がるリスク。
  - 対策: Currentで正しい説明を維持し、必要な見出し・表・接続説明だけ変更する。
- Plan差分をimplementation scope violationと誤判定するリスク。
  - 対策: `IMPLEMENTATION_BASE_SHA...HEAD`で判定する。

### Open questions

- 現時点でなし。§3のStop条件に該当した場合のみ再計画する。

## 8. 成果物

### 変更ファイル

- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- 新しいPR 2 implementation Run Artifact

### 付随ドキュメント

- このchild Plan
- Plan Run `20260828-214107-JST`

## 9. 備考 / Follow-up

- PR 2 merge後、最新`main`からPR 3「Decision B / Competency / Assessment Contract」を開始する。
- Phase 6はMaster PlanどおりPR 2 merge後から並行調査可能。
- PR 3 / PR 4 / PR 5の責務を本PRへ先取りしない。
