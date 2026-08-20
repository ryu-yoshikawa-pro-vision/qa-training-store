# Maintenance Investigation Report

## 1. Metadata

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Started at JST: `2026-08-20 01:07:34 +09:00`
- Initial HEAD: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
- Initial branch: `docs/2026-08-20-maintenance-investigation`
- Goal: Product、Normative Specification、Formal Regression、各種Test、Runtime、Agentic QA、Curriculum、CI、Script、Config、Documentationを横断監査し、Evidence付きMaintenance Candidateを収集する。修正は行わない。
- Report path: `docs/reports/2026-08-20_010734_maintenance-investigation.md`
- Report contract: 本ファイルのみをGoal中に新規作成・追記する。既存記録の削除・上書き・意味変更はしない。

## 2. Non-mutation Contract

- Product、Test、Specification、Curriculum、CI、Config、Script、Dependency、Fixture、Seed、Snapshot、Agent、Skill、Harness、QA Policy等のSourceは変更しない。
- `git add`、`commit`、`push`、`reset`、`clean`、`checkout`等のGit mutationは実行しない。
- formatter write、autofix、snapshot更新、generate/apply/promote、migration、prebuild等のSource変更を伴う操作は実行しない。
- Runtimeで生成される一時artifactは必要な場合のみ使用し、durableな追加成果物へ昇格しない。
- Goal開始時点のSource Integrity baselineは、branch、HEAD、`git status --short`空、`git diff --name-only`空、`git diff --stat`空であった。

## 3. Baseline

### 3.1 読み込み済みの入口

- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/adr/`の最近の記録（詳細はWave 0ログへ追記）
- `.codex/runs/`の最近の記録（変更せず参照のみ）
- `docs/spec/README.md`
- `QA_AGENT.md`
- `.agents/skills/exploratory-qa/SKILL.md`
- `docs/reference/agentic-qa-workflow.md`

### 3.2 Inventory

Wave 0でProduct、Normative Specification、Test、Curriculum、QA System、CI、Script、Config、Documentationの正本・存在範囲・未確認領域を追記する。

## 4. Coverage Ledger

| Area | Status | Evidence | Remaining |
|---|---|---|---|
| Wave 0 Baseline / Inventory | in_progress | 初期Git baseline、入口文書の読込 | 全Artifact catalog、主要script/config/CI、正本関係 |
| Wave 1 Specification Internal Consistency | not_started | - | 全Normative、BR/AC、用語、状態、境界 |
| Wave 2 Specification ↔ Implementation | not_started | - | 主要Feature、Role、State、Web/Native |
| Wave 3 Specification ↔ Formal Tests | not_started | - | Test layer、oracle、gap、flake、fixture |
| Wave 4 Deterministic Validation | not_started | - | 安全性確認後のread-only command |
| Wave 5 Web Runtime Exploratory QA | not_started | - | 利用可能性確認後のbounded runtime QA |
| Wave 6 Role / Permission / State | not_started | - | Role、direct access、lifecycle、persistence |
| Wave 7 Responsive / Accessibility / UX | not_started | - | Desktop、mobile、keyboard、a11y、overflow |
| Wave 8 Native / Maestro | not_started | - | Android preflight、既存保証、Maestro |
| Wave 9 Curriculum Internal Review | not_started | - | 教材通読、順序、rubric、guarantee |
| Wave 10 Curriculum ↔ Repository | not_started | - | command/path/script/feature/role照合 |
| Wave 11 Fresh Learner Simulation | not_started | - | 書かれた導線の実行可能性 |
| Wave 12 CI / Repository Maintenance Audit | not_started | - | workflow/script/doc/config整合 |
| Wave 13 Cross-layer Audit | not_started | - | Spec→Implementation→Test→Runtime→CI→Curriculum |
| Wave 14 Finding Verification | not_started | - | Critical/High/Medium、duplicate、false positive |
| Fresh-angle Wave A | not_started | - | Wave 14後に新規情報量を評価 |
| Fresh-angle Wave B | not_started | - | Wave Aと独立した最終確認 |

Progress: 0% (0/16)

## 5. Wave Log

### Wave 0 — Baseline / Inventory

- Status: in_progress
- Started: `2026-08-20 01:07 JST`
- Scope: Repository、Product、Test、Curriculum、QA Systemの存在・正本・未確認範囲。
- Constraint: 読み取りのみ。Source変更なし。

## 6. Findings

（Wave 1以降、Findingごとに指定形式でappendする。）

### MNT-001

- Detected at: `2026-08-20 Wave 2`（Specification ↔ Implementation 静的追跡）
- Wave: Wave 2 — Specification ↔ Implementation
- Area: Native Customer Storefront / Search
- Category: `REGRESSION_GAP`
- Severity: medium
- Confidence: high
- Status: observed
- Related specification: `docs/spec/features/storefront.md` の `BR-STOREFRONT-002`、`SCREEN-STOREFRONT-SEARCH`。StorefrontはWeb/Native共通挙動、Searchは商品名・Code・Suggestion・Filterを対象とし、Search defaultは `android` をRequired platformに含む。
- Related implementation: `src/application/customer-capabilities.ts` の `CustomerCatalogGateway`、`src/application/use-cases/catalog-use-cases.ts:94-100`、`src/bootstrap/native-runtime.ts:28-32,193-198`、`src/presentation/native/native-screens.tsx:238-302`。
- Related tests: `tests/contracts/native-runtime-service-surface.test.ts:19-21` は Native service surfaceに `acceptPriceChanges` を要求する一方、`catalog.suggest` を要求しない。`tests/repository-contract/storefront-catalog.test.ts` はWeb/Dexie repositoryの検索Suggestionを検証するが、Native SearchのSuggestion/Filter UIまたはNative gateway surfaceを検証するテストは確認できなかった。
- Related curriculum: Wave 2時点では未照合。Curriculum WaveでNative Storefront/Searchの説明と照合する。
- Related CI / scripts: `pnpm run test:contracts` およびNative component/formal testの対象候補。実行結果はWave 3/4で記録する。
- Environment: Source/Specification read-only inspection。Android Runtimeはまだ利用可能性未確認で、Native runtime reproductionは未実施。
- Preconditions: Normative Storefront/Search contractをExpected oracleとして採用し、Native customer capability・runtime surface・Search screenを比較すること。
- Observation: Normative contractはNative SearchをWeb共通StorefrontのSearchとしてCatalogに含め、Suggestion/FilterをFunctionsとBRに含めている。しかしNativeのCustomerCatalogGatewayとNativeCatalogServiceには `suggest` がなく、Native use caseは `customerGateway !== null` の場合Suggestionを空配列で返す。NativeSearchScreenはkeyword入力と検索ボタンだけを描画し、検索リクエストのCategory/Brand/価格/在庫/Sale/最低評価Filterはすべて固定値で、Suggestion UIも存在しない。
- Expected: AndroidのNative Searchで、共通Storefront契約に従い、商品名/Code検索、2文字以上のSuggestion（最大8件）、および適用可能なFilterを利用できる。少なくとも仕様上Required platformであるSearch defaultのAndroid挙動が同じBehavior contractを満たす。
- Actual: Native Searchはkeyword-onlyの検索導線で、Suggestion capability/UIがなく、Filter stateを利用者が指定できない。Source上 `catalog.suggest` をNative surfaceから除外するContract assertionも存在する。
- Reproduction steps: (1) `docs/spec/features/storefront.md` のPurpose、BR-STOREFRONT-002、SCREEN-STOREFRONT-SEARCHを読む。(2) `src/application/customer-capabilities.ts` と `src/bootstrap/native-runtime.ts` にNative Suggestion surfaceがないことを確認する。(3) `src/application/use-cases/catalog-use-cases.ts:94-100` でNative gateway時のSuggestionが空配列になることを確認する。(4) `src/presentation/native/native-screens.tsx:238-302` でkeyword以外の入力/Filterがないことを確認する。(5) `tests/contracts/native-runtime-service-surface.test.ts:21` の `catalog.suggest` 非要求を確認する。
- Reproduction count: Source comparison 1回。Native runtime reproduction 0回（環境未確認）。
- Evidence: `rg` による該当行確認、Normative Search screenのRequired platform `web-desktop, android`、Native service surfaceの型定義、Native screenの固定検索入力、Native contract testの非要求アサーション。EvidenceはReportへ要約し、生成artifactには依存していない。
- Impact: Android Native Customerの検索探索能力が、Normative Storefront/Search contractが示す共通範囲より狭い可能性がある。検索の発見性とFilterによる商品絞り込みに影響し、Native/Web差分をFormal Testで検出できないRegression Gapとなる。
- User / learner / QA impact: Native利用者はSuggestionやFilterを使えず、QAはNative Searchの共通Behaviorを自動保証できない。Curriculumへの影響は未照合。
- Possible root cause: Native向けservice surfaceを最小化する設計時に、Web StorefrontのSuggestion/Filter capabilityがNativeへ投影されていない。Contract testがその縮小surfaceを意図したものとして固定している可能性がある。
- Alternative explanations: (a) Native Searchをkeyword-onlyに限定する設計意図が別文書にある、(b) Storefront仕様の「共通挙動」またはAndroid Required platformがSearchの全Functionsへ適用されない、(c) Suggestion/Filterが別Native画面・OS標準UIへ委譲されている可能性。ただしWave 1で確認したKnown Deviationsには該当記録がなく、現時点でこれらを支持するNormative evidenceは未確認。
- Known deviation check: `docs/spec/known-deviations.md` にNative Searchの縮小保証は確認できない。`docs/spec/unresolved-specifications.md` のWeb/Native pixel parity未確定は意味的Search capabilityの根拠にはならない。
- Duplicate check: Search SuggestionとFilterは同一Native Search capability surfaceの欠落として一つに集約。別root causeのCart/Checkout差分とは混在させない。
- Suggested follow-up: Native Runtimeを利用可能な環境でSearch default、2文字入力、Suggestion、Filter、結果整合を実操作で確認し、仕様適用範囲を確定する。`catalog.suggest` 非要求ContractとCurriculum記載も併せて再評価する（今回Goalでは実行しない）。
- Requires change?: maybe
- Notes: Runtime未再現のため現時点のStatusは`observed`。実装差分は明確だが、Search contractのNative適用範囲を追加確認してからMaintenance優先度を決める。

### MNT-002

- Detected at: `2026-08-20 Wave 4`（Agentic QA preparation deterministic execution）
- Wave: Wave 4 — Deterministic Validation Execution / Agentic QA contract
- Area: Agentic QA training challenge preparation / Cross-platform patch artifact
- Category: `EVALUATION_FAILURE`
- Severity: medium
- Confidence: high
- Status: reproduced
- Related specification: `training/agentic-qa/challenges/CHALLENGE-BASIC-001/challenge.json`（`BR-AUTH-001`、`AC-AUTH-001`）および `training/agentic-qa/challenges/CHALLENGE-BASIC-001/runbook.md`。
- Related implementation: `training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch` は `src/application/use-cases/auth-use-cases.ts` の suspended account guardを fault injectionするPatchとして定義されている。現行Sourceの対象文脈自体は存在する。
- Related tests: `tests/runtime/agentic-qa-preparation.test.ts:11-31` の `prepareChallenge` 実行。`scripts/agentic-qa/prepare-challenge.ts:262` が `git apply --check` 失敗を `Challenge patch preparation failed` として報告する。
- Related curriculum: `training/agentic-qa/challenges/CHALLENGE-BASIC-001/`、`training/agentic-qa/instructor/answer-key/CHALLENGE-BASIC-001.json`。Learner-facing challenge preparationの前提artifactが現行Windows worktreeで適用不能になる。
- Related CI / scripts: `pnpm run test:agentic-qa:preparation`、`scripts/agentic-qa/prepare-challenge.ts`。`git apply --check` はpatch pathを直接読み、Sourceを変更しない。
- Environment: Windows worktree、Node `v24.12.0`、pnpm `9.10.0`、Git `core.autocrlf=true`。Source fileはworking tree LF、Patch fileはworking tree CRLF。Repository `.gitattributes` は `* text=auto eol=lf` を宣言している。
- Preconditions: Current checkoutのnormalized/index contentとworking-tree line ending、challenge patchの適用可能性を確認すること。
- Observation: `pnpm run test:agentic-qa:preparation` は `CHALLENGE-BASIC-001.patch` の `git apply --check` で失敗し、`src/application/use-cases/auth-use-cases.ts:203` のcontextへpatchを適用できない。Patchのindex contentはSource contextと一致するが、`git ls-files --eol` は patch 3件すべて `i/lf w/crlf attr/text=auto eol=lf`、対象Sourceは `i/lf w/lf` を示す。PatchはLFを含む13行すべてCRLFで、SourceはCRLF 0行。
- Expected: Deterministic preparationが現行checkoutでchallenge patchを検査・隔離適用し、`result.patch.apply_check` が `passed` になる。少なくともRepositoryが宣言するLF contractと、Agentic QA preparationのpatch inputが同じline-ending semanticsで扱われる。
- Actual: 通常の `git apply --check -- training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch` は `patch does not apply` でexit 1。`--ignore-whitespace` を付けた検査だけはexit 0となり、line-ending whitespace mismatchが直接要因であることを支持する。
- Reproduction steps: (1) `pnpm run test:agentic-qa:preparation` を実行する。(2) `git apply --check -- training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch` を実行する。(3) `git ls-files --eol -- training/agentic-qa/instructor/challenge-patches/*.patch src/application/use-cases/auth-use-cases.ts` でindex/working-tree EOLを確認する。(4) `git apply --check --ignore-whitespace -- training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch` を比較用に実行する（Patchを適用しない）。
- Reproduction count: preparation test 1回FAIL、通常の`git apply --check` 2回FAIL（初回/verbose）、`--ignore-whitespace` 1回PASS。Source mutation 0回。
- Evidence: preparation test output `Challenge patch preparation failed: ... git apply --check ... patch failed: src/application/use-cases/auth-use-cases.ts:203`、通常検査の `while searching for` context error、`git ls-files --eol` の `w/crlf` patch / `w/lf` source、`.gitattributes` の `eol=lf`。比較検査でwhitespace無視時だけ適用可能。
- Impact: Windows環境でdeterministic Agentic QA preparationが開始できず、Basic challengeのfault-injected runtime、Fresh Learner / instructor workflow、Preparation contract testが失敗する。CIがLinux LF checkoutだけでPASSする場合、Local/CIの再現性差を隠す可能性がある。
- User / learner / QA impact: LearnerまたはMaintainerが教材上のAgentic QA challengeをローカルで準備できない。QA preparation failureをProduct behavior failureと誤認するか、逆にchallengeを実行せず未確認のままにするリスクがある。
- Possible root cause: `training/agentic-qa/instructor/challenge-patches/*.patch` のworking-tree EOLがRepositoryのLF contractから外れており、patch適用時にSourceのLF contextと一致しない。`core.autocrlf=true` とpatch生成/checkout経路の相互作用が候補。
- Alternative explanations: (a) Git for Windowsの設定だけがこのworktreeに固有、(b) test runnerがpatchをraw bytesで扱うことが意図された環境依存、(c) patch contentのcontext変更がline ending以外にもある。ただしHEADのSource contextとindex patch contentは一致し、`--ignore-whitespace`で検査が通るため、現時点ではEOL mismatchが最有力。
- Known deviation check: Agentic QA challengeのout-of-scopeはLearnerのSource inspectionであり、Preparation実行環境のEOL差を許容するKnown Deviationは確認できない。`.gitattributes`はLFを要求している。
- Duplicate check: 他の2つのAgentic QA patchも同じ `i/lf w/crlf` 状態だが、同じEOL root causeによる複数patch影響として本Findingに集約。MNT-001のNative Search capability差分とは独立。
- Suggested follow-up: Patch artifactのEOL provenance、Windows/CI checkout、`prepareChallenge`のpatch input normalization contractを確認し、WindowsとLinuxの両方でpreparationを実行する（今回Goalでは修正・再生成・patch適用を実行しない）。
- Requires change?: yes
- Notes: Product defectではなくAgentic QA / Curriculum execution contractのFailure。test実行時に同時起動していた別Contract suiteは時間超過の環境要因を含むため、本Findingの根拠は独立した`git apply --check`とEOL比較に置く。

## 7. Reconciliations

（誤検知、Duplicate、追加Evidenceは元Findingを残したままappendする。）

## 8. Command Execution Log

（安全性確認済みのread-only validationを実行したものからappendする。）

## 9. Blocked / Not Executed

（環境、依存、Runtime capability、安全性不明等をEvidence付きでappendする。）

## 10. Source Integrity Log

### Initial baseline

- Time: `2026-08-20 01:07:34 JST`
- Command set: `git branch --show-current`; `git rev-parse HEAD`; `git status --short`; `git diff --name-only`; `git diff --stat`
- Result: branch=`docs/2026-08-20-maintenance-investigation`; HEAD=`da924e0dd9764416fbe2f66ad534db7b3d9ccf40`; status/diffはすべて空。
- Expected tracked change at completion: `docs/reports/2026-08-20_010734_maintenance-investigation.md`のみ。

### Wave 0 completion — Baseline / Inventory

- Finished at: `2026-08-20 01:15 JST`（概算。開始・終了の正確なコマンド時刻は各Command Logに記録する。）
- Repository:
  - Branch: `docs/2026-08-20-maintenance-investigation`
  - HEAD: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
  - Package manager: `pnpm@9.10.0`
  - Local versions: Node `v24.12.0`、Playwright `1.62.0`、Maestro CLI `2.8.0`
  - Top-level Product/Runtime: `app/`、`src/`、`public/`、`android/`
  - Test/QA: `tests/` 85 files、`e2e/` 8 files、`maestro/` 23 files、`scripts/agentic-qa/` 26 files
  - Curriculum/Training: `docs/curriculum/`、`training/`（Web、Native、GitHub Actions、Workbook、Agentic QA）
  - CI workflow: `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml`
- Normative Specification boundary:
  - Normative sources are `docs/spec/product-scope.md`、`roles-and-permissions.md`、`state-and-scenarios.md`、`ui-ux-contract.md`、`docs/spec/features/*.md`.
  - `README.md`、`glossary.md`、`change-process.md`、`known-deviations.md`、`unresolved-specifications.md` are supporting/operational; they are not higher-priority Expected Behavior oracles.
  - `known-deviations.md` reports no active deviation. `unresolved-specifications.md` has one active question: Web/Native pixel parity beyond shared meaning is not determined and must not be treated as a defect oracle.
  - Low-level Route、Role/Status、Seed、Design Token、Build Config、App/Test ID、Accessibility label are delegated to the Feature-specific Executable Canonical Sources.
- Product scope:
  - Web covers Storefront、Customer purchase、Operator/Admin management; Admin operations require the 1024px desktop boundary and a narrow viewport warning.
  - Native covers Customer Guest Storefront、Cart、Login、Account、Address、Checkout、Payment、Order、Review; Native Admin and Guest Checkout are excluded. Android has Build + Runtime/Maestro guarantee; iOS has Build-only guarantee.
  - Excluded behavior includes external payment/shipping, Guest Checkout, Native Admin, refund/return/coupon/point/wishlist and other explicitly listed exclusions.
  - Roles are `guest`、`customer(active/suspended/withdrawn)`、`operator(active)`、`admin(active)`; Customer owns only own data, Admin owns user management, Operator/Admin do not use the customer purchase capability.
  - State contract distinguishes Product、Account、Checkout、Order、Shipment、Review、Cart transitions and terminal states; Scenario reset owns Database/Session/Guest Identity/Clock/Payment Delay, with UI Test Control owning Notice/navigation and Test API Reset returning metadata only.
- Formal and training separation:
  - Formal Web is under `e2e/web/`; Formal Native is under `maestro/`; Training Web is under `training/playwright/`; Training Native baseline is under `training/maestro/`.
  - `package.json` exposes separate unit/integration/repository/component/contract, Playwright, Maestro, training, specification, curriculum, security, image, and build commands. The aggregate `verify` includes quality, spec/curriculum, type/lint, security, all formal lower-layer suites, Web build and spec build; its generation behavior is to be checked before execution.
  - CI has independent Style/Code/Vitest/Build/Playwright/UI review/Smoke/Extended E2E jobs and Native CI with Android/iOS build/runtime gates. The exact job conditions and changed-path filters remain Wave 12 scope.
- QA system:
  - Exploratory QA mode is Normal by default; Gray-box requires approved controls; Black-box Scored requires host-trusted isolation/tool-scope evidence and is not selected for this maintenance audit.
  - `QA_AGENT.md` and `docs/reference/agentic-qa-workflow.md` require Normative Oracle confirmation, bounded Charter/Coverage, before/after working-tree snapshots, atomic findings, and no product repair during QA.
  - This audit intentionally overrides creation of a current Run/Charter and records only into this user-authorized Report; runtime QA will still be bounded and will preserve Source Integrity.
- Inventory limits at this point:
  - Exact implementation-to-BR/AC mapping, detailed Screen Catalog-to-route parity, full test oracle strength, curriculum execution, CI contract edge cases, and runtime behavior remain unverified and are carried into later Waves.
  - Android `adb devices -l` returned no visible device after the local daemon start; Native Runtime is not yet treated as PASS or FAIL. Web Runtime capability will be checked separately.
- Negative evidence: no Product/Test/Spec/Curriculum/CI/Config/Script mutation was observed during Wave 0. The only worktree change is the intentionally untracked Report path.
- Wave status: completed (inventory coverage); no Maintenance Finding finalized in Wave 0.
- Progress: 6% (1/16)

### Wave 1 — Specification Internal Consistency

- Status: completed for the static Specification System scope; runtime and implementation comparison are intentionally deferred to later Waves.
- Checked:
  - Normative markdown grammar, Navigation, relative links, anchors, feature section order, BR/AC heading grammar, duplicate IDs, AC→BR references, and every active BR having an AC or explicit N/A path.
  - Screen Catalog ownership, Screen Contract grammar, state table schema, state slug/type/audience/platform allowlists, required baseline states, visual reference paths, capture registry/status, and final visual completeness through the existing validator.
  - Cross-document terminology for roles/statuses, 1024px Admin boundary, 767px/768px responsive boundary, Native scope, Android/iOS guarantee, Known Deviation and Unresolved behavior.
- Evidence:
  - `pnpm run validate:spec` direct execution: PASS, 3 challenges, Catalog Universe 38, Product 31, Supporting 4, Boundary 2, Test-only 1, Important States 58, Required Visual States 56, Capture Targets 94, Captured 94, Pending 0, Blocked 0, Canonical Assets 94, total 6,605,598 bytes.
  - `pnpm run validate:spec-visuals:final` direct execution: PASS with the same complete visual counts.
  - `pnpm run validate:curriculum` direct execution: PASS, 22 required documents and 4 workbook files; this is recorded here only as an early contract probe and will be revisited in Curriculum Waves.
  - Read-only BR/AC audit over 22 non-template `docs/spec/**/*.md` files: 24 unique BR IDs / 98 occurrences and 24 unique AC IDs / 74 occurrences; no duplicate BR or AC headings.
  - Screen Catalog read-only row audit: 38 rows; Product 31, Supporting 4, Boundary 2, Test-only 1; no duplicate Screen ID.
  - `docs/spec/known-deviations.md`: no active entries. `docs/spec/unresolved-specifications.md`: one explicit visual-parity question, so pixel-only Web/Native differences remain non-defect unless a separate normative contract exists.
- Consistency result: no confirmed SPEC_AMBIGUITY or internal Specification contradiction identified in this Wave. This is bounded negative evidence, not a claim that the full Product is defect-free.
- Not checked yet: implementation semantics, generated/runtime route behavior, assertion strength, actual Web/Native behavior, Curriculum instruction execution, CI execution outcomes, and cross-layer freshness.
- Progress: 12% (2/16)

### Wave 4 — Deterministic Validation Execution (追加記録)

- 実行済みの安全なread-only validationは、format/check、Markdown lint、lint、typecheck、security、image manifest、EAS config、Native route dependency、Specification/Curriculum validator、unit、integration、repository、Web component、Native componentを含む。
- 主要結果: format/check、Markdown lint、typecheck、security、各validator、unit 66 tests、integration 98 tests、repository 33 tests、Web component 76 tests、Native component 49 testsはPASS。`lint`はexit 0でwarning 64件、error 0件。
- `test:contracts`は他の長時間テストと同時起動した最初の試行で、`tests/contracts/codex-hook-contract.test.ts`のmatrix 1件が15秒timeoutした。対象ファイル単独を`--no-file-parallelism --maxWorkers=1`で再実行すると70/70 PASSし、55件のno-contextケースの直接probeも約5.99秒で完了した。これは後続Reconciliationで環境競合によるfalse positiveとして扱う。
- `test:agentic-qa:preparation`はMNT-002のとおり、challenge patchの通常`git apply --check`で再現FAIL。`--ignore-whitespace`でのみPASSする比較を含め、単なる並列実行timeoutとは独立した証拠を得た。
- `verify`全体は未実行。`package.json`上、`build:web`が`prepare:font-assets`と`generate:image-manifest`を呼び、後者がtracked generated fileを書き換えるため、このGoalの修正禁止契約と両立しない。個別のread-only validationを優先した。
- Wave status: deterministic validationは主要な安全範囲を完了。Agentic QA preparationはMNT-002でreproduced、contract timeoutはReconciliation待ち。
- Progress: 19% (3/16)

### Wave 5–7 — Web Runtime / Role-State / Responsive Accessibility (bounded scope)

- Prebuilt Runtime probe:
  - `WEB_SERVER_DIST_ROOT=dist WEB_SERVER_PORT=8081 pnpm exec tsx scripts/serve-web-dist.ts`でloopback配信は開始した。
  - `/`のDOMは空で、Consoleに`Error: No routes found`（`dist/_expo/static/js/web/entry-*.js`）が出た。`dist/index.html`は存在するが、`dist`内にroute manifest候補はなく、prebuilt artifact単独ではRuntime QAのoracleを成立させられなかった。
  - このprobeはRuntime BLOCKED/NOT PASSとし、Source defectとは断定しない。distは既存artifactで、Source current stateとのfreshnessをこのprobeだけで証明できない。
- Source Web Runtime probe:
  - 既存の`pnpm run start:web -- --port 8082`（`CI=1`、`EXPO_NO_DOCTOR=1`、Sourceを変更しない開発サーバー）を使用。初回bundleは数秒以上の待ち時間後に起動したが、`http://127.0.0.1:8082/`のDOMが表示され、App shellとproduct dataを確認できた。
  - Normal path: Home→Products→Product detail→Guest Cartを確認。商品6件、カテゴリ/ブランド/在庫/Sale/最低評価/sort controls、product detailのSKU/quantity、add-to-cart success statusが表示された。
  - Alternate/invalid/recovery: Searchで`zzzz-no-match`を入力し、0件とempty-state message、disabled filter、`条件をすべて解除`を確認。解除後は6件へ復帰した。
  - Repeated action/persistence: 同一商品を2回追加するとCartの同一line item quantityが2、subtotalが¥7,000になった。Cart reload後もquantity 2とsubtotalが保持された。
  - Session transition: GuestのCartを保持したまま`regular@example.com`/`testpass1`でloginすると`カートを保存しました`が表示され、customer sessionへ遷移した。Guest direct `/admin`は`/login`へ、Customer direct `/admin`は`/forbidden`へ遷移した。
  - Admin role: `admin@example.com`/`testpass1`でloginし、既定viewportでは`1024px以上`を求める管理画面boundaryが表示された。1280×800へ明示的に変更後、Admin Dashboard、管理navigation（商品、カテゴリ、ブランド、在庫、注文、レビュー、ユーザー、テスト制御）、主要指標、注文tableを確認した。Admin Productsではstatus/rank/stock/price/sort controlsと一括操作disabled stateを確認した。
  - Checkout boundary: customer Cartから`/checkout/address`へ進むと、配送先0/5のempty stateと`配送先を登録` recovery linkが表示された。空フォームの登録操作ではデータは作成されず、browser required validationで必須項目が未入力となることをDOM/validationMessageで確認した。実在個人情報を入力せず、address creation・payment・order completionは実行していない。
  - Responsive: 390×844でAccount/Address pageを確認し、desktop navigationがmobile navigationへ切り替わり、主要form controlsとfooter linksがDOM上で到達可能だった。主観的なvisual preferenceはFindingにしない。
- Runtime error handling: Source Runtime 8082の起動後DOMでは上記journeyの表示を確認した。再利用したbrowser tabには先行prebuilt 8081の`No routes found` logが残るため、Console log全体をSource Runtimeのfresh error証拠とは扱わない。
- Wave coverage: Web Storefront、Search empty/recovery、Guest/Customer/Admin role boundary、Cart persistence、Admin desktop boundary、mobile navigation、Checkout no-address recoveryを確認。Payment success/failure、Order lifecycle mutation、Review投稿、Scenario reset、Test Controlは未実行で後続Wave/Blocked ledgerへ残す。
- Finding conclusion: このbounded Runtime scopeではMNT-001以外の新しい再現Product defectを確定しない。MNT-001はNative scopeであり、Web Search/Filter controlsの存在は同Findingを否定しない。
- Wave status: Wave 5–7は主要な安全範囲を部分完了。未確認のpayment/order/review、fresh scenario reset、keyboard/focusの実操作は残る。
- Progress: 19% (3/16)

### Command Execution Log — early static probes

#### `pnpm run validate:spec` / `pnpm run validate:spec-visuals:final` / `pnpm run validate:curriculum`

- Purpose: validate Specification grammar/visual contract/Agentic QA contract and Curriculum structural contract without writing files.
- Attempt 1: a PowerShell timing wrapper was used to capture START/EXIT/END; all three returned exit 1 with no output. This result is classified as wrapper-output/tooling failure, not command failure; no generated or tracked file diff was observed.
- Attempt 2: each command was executed directly for failure diagnosis. All three returned exit 0 with the PASS output recorded above.
- Reproduction count: wrapper anomaly 1; direct command PASS 1 each.
- Source Integrity after attempts: no Product/Test/Spec/Curriculum/CI/Config/Script diff; only the authorized untracked Report exists.

### MNT-003

- Detected at: `2026-08-20 Wave 4`（Native production bundle guardの実行と出力形式の比較）
- Wave: Wave 4 — Deterministic Validation Execution / Native bundle contract
- Area: Native automation/production bundle guard and CI artifact inspection
- Category: `TOOL_FAILURE`
- Severity: medium
- Confidence: high
- Status: reproduced
- Related specification: NativeのAndroid Build/Runtime保証、およびproduction bundleにテスト制御を含めないRepository契約。`docs/spec/product-scope.md`のAndroid保証とテスト対象/生産対象の境界に関係する。
- Related implementation: `scripts/validate-native-production-bundle.ts`のAutomation marker/Harness marker検査、`metro.config.cjs`のNative automation/production resolver、`src/presentation/native/native-automation-bridge.enabled.tsx` / `disabled.tsx`。
- Related tests: `tests/contracts/native-production-module-resolution.test.ts`は自動化時の`.enabled` resolutionとproduction時の`.disabled` resolutionを静的にPASS。ただしHermes `.hbc`のraw marker検査の可視性までは検証しない。
- Related curriculum: Native QA / production bundle boundaryを参照する教材およびローカル検証導線。本Waveでは教材との直接矛盾は未確定。
- Related CI / scripts: `package.json`の`validate:native-production-bundle`、`.github/workflows/native-ci.yml`のAPK bundle raw scan。
- Environment: Windows、Node `v24.12.0`、pnpm `9.10.0`、Expo exportのAndroid Hermes出力。一時出力はignored `output/native-bundle-guard/`配下に保存し、Sourceは変更していない。
- Preconditions: `APP_ENV=automation`、`EXPO_PUBLIC_BUILD_KIND=automation`、`EXPO_PUBLIC_TEST_MODE=true`でAndroid exportを行い、Automation bundleにmarkerとHarness markerが存在すること、production bundleにそれらがないことをguardが検査する。
- Observation: `pnpm run validate:native-production-bundle`はAutomation exportまでは進むが、`Automation bundle does not contain the Test Control/Harness markers`でexit 1。通常出力は`entry-*.hbc`であり、raw byte検索でmarker、Harness marker、`NativeTestControlService`、`Scenario Shop`、`native-nav-home`を検出できなかった。同じAutomation条件で`expo export --no-bytecode --no-minify`を実行すると、出力JavaScript bundleには全ての主要markerとNative route markerが存在した。
- Expected: GuardがAutomationのTest Control/Harness有無とproductionへの非混入を出力形式に対応して正しく判定し、有効なAutomation bundleを出力形式だけで失敗扱いしない。
- Actual: Hermes `.hbc`ではraw-string検査がfalse negativeとなり、guardがAutomationの正常なmarkerを認識できず、production側の検査まで到達しない。これは生産バンドルへのテスト制御漏洩を意味しない。
- Reproduction steps: (1) `pnpm run validate:native-production-bundle`を実行する。(2) Automation出力の`.hbc`に主要markerをraw検索する。(3) 同じ環境変数で`pnpm exec expo export --platform android --output-dir <ignored-temp> --no-bytecode --no-minify`を実行する。(4) JavaScript出力の同じmarkerを検索する。
- Reproduction count: guard 1回FAIL、no-bytecode比較export 1回完了。marker検索結果は`.hbc` 0件、JavaScript 1 bundleで全て検出。Source mutation 0回。
- Evidence: guardのexit出力、ignored一時出力の`.hbc` raw検索結果、`automation-no-bytecode-20260820-021500/_expo/static/js/android/entry-*.js`におけるmarker/Harness/control-service/route-markerの検出。一時artifactは後日失われる可能性があるため、Reportに検索結果と相対Pathを記録した。
- Impact: Native bundle guardのローカル検証がHermes出力で完了できず、CIの同様なraw scanも出力形式によっては無効なfalse negativeまたは検証不能になる可能性がある。Production boundaryの安全性をこのチェック結果だけで保証できない。
- User / learner / QA impact: NativeをローカルまたはCIで正当に検証する門戸が閉じる。Productionにテスト制御が漏れているという結論はできないが、guardのFAIL/PASSのどちらもbyte形式に依存する。
- Possible root cause: Hermes bytecodeがJavaScript文字列をそのまま保持しない、またはmarkerの保持形式がbytecode処理で変わるため、guard/CIのraw substring方式がExpoの現行export形式と適合していない。
- Alternative explanations: (a) 使用中のExpo/Hermes versionがこの環境だけの出力差を生む、(b) `hbc`内の文字列が別encodingで存在する、(c) marker/resolverの静的想定とexportの実際が不一致。marker不在のProduct/Production leakまでは検証していない。
- Known deviation check: `docs/spec/known-deviations.md`にこのguardのHermes raw scanを許容する記録は確認できない。
- Duplicate check: MNT-002のAgentic QA patch EOL failureとは異なるNative bundle/tool contractのroot problem。MNT-001のNative Storefront capability差分とも異なる。
- Suggested follow-up: Hermes出力を対象にした非破壊の検証方式を設計し、Automation/Productionの両出力で有効性を確認する。その際、本Failureの検査不能とProduction漏洩は別問題として扱う（今回Goalでは修正しない）。
- Requires change?: yes
- Notes: Automation出力の静的resolverチェックはPASSし、`--no-bytecode`比較でmarker存在を確認したため、本Findingはアプリ機能のBugとはせず、bundle guardの検証失敗とする。

### MNT-004

- Detected at: `2026-08-20 Wave 5`（Web prebuilt runtime probeとMetro cache切り分け）
- Wave: Wave 5 — Web Runtime / Prebuilt artifact reproducibility
- Area: Web static export cache behavior and prebuilt Playwright smoke
- Category: `AUTOMATION_FLAKE`
- Severity: medium
- Confidence: medium
- Status: reproduced
- Related specification: Web Storefrontの主要導線と、Automation/Production artifactを配布してFormal smokeを実行するCI契約。`docs/spec/product-scope.md`および`docs/adr/0002-ci-artifact-pipeline.md`のartifact/runtime境界に関係する。
- Related implementation: `package.json`の`build:web`（`expo export --platform web`）、`playwright.config.ts`の`PLAYWRIGHT_USE_PREBUILT_DIST`、`scripts/serve-web-dist.ts`。
- Related tests: `e2e/web/smoke.spec.ts`、`pnpm run test:smoke`。Source dev serverを使うFormal E2Eは別途PASSし、prebuilt smokeだけがcache状態により差分を示した。
- Related curriculum: `docs/curriculum/test-automation/part2/05_playwright-ci.md`がBuild artifact再利用とProduction artifact smokeを教材化している。Fresh learner Web baselineはsource runtimeでPASSした。
- Related CI / scripts: `.github/workflows/ci.yml`のbuild-automation/build-productionとprebuilt artifact配布、`scripts/serve-web-dist.ts`。
- Environment: Windows、Node `v24.12.0`、pnpm `9.10.0`、Expo `57.0.14`、既存Metro cacheが存在する状態。出力はignored `output/web-export-probe-*`と`output/playwright`に保存し、Sourceは変更していない。
- Preconditions: 現行`app/`を持つcheckoutで、Metro cacheをclearせず`pnpm exec expo export --platform web --output-dir <ignored-temp>`を実行し、生成artifactを`serve-web-dist`で配信する。
- Observation: cache clearなしのexportはexit 0でも745 modules、`metadata.json`にroutes情報がなく、bundleに`products` route文字列がなく、Runtimeで`Error: No routes found`となった。`pnpm run test:smoke`は同artifactに対して3回（初回+retry 2回）すべてStorefront heading未検出でFAILした。`expo export --clear`を同一checkoutで実行すると2297 modulesのbundleが生成され、`serve-web-dist`経由の同じ`pnpm run test:smoke`は1/1 PASSした。
- Expected: `build:web`が現行Sourceから有効なrouteを含むWeb artifactを決定的に生成し、prebuilt smokeがcacheの残存状態によってroute-less artifactを受け取らない。
- Actual: stale Metro cacheがある場合、export自体は成功扱いだがroute-less artifactになり、prebuilt Runtimeが利用不能になる。Cache clear後は正常化する。
- Reproduction steps: (1) cache clearなしで`expo export --platform web --output-dir <ignored-temp>`を実行する。(2) `WEB_SERVER_DIST_ROOT=<ignored-temp> WEB_SERVER_PORT=<loopback-port> pnpm exec tsx scripts/serve-web-dist.ts`で配信する。(3) `PLAYWRIGHT_USE_PREBUILT_DIST=true DEPLOYED_BASE_URL=<loopback-url> pnpm run test:smoke`を実行する。(4) `expo export --platform web --clear --output-dir <ignored-temp>`を実行し、同じsmokeを比較する。
- Reproduction count: cache clearなしのfresh output 2回でroute-less bundle、route-less artifact smoke 1試行（Playwright retry 3回）FAIL。clearありexport 1回、clear artifact smoke 1/1 PASS。Source mutation 0回。
- Evidence: clearなしbundleの745 modules、`metadata.json`のroute情報なし、browser Consoleの`No routes found`、prebuilt smokeのheading未検出、clearありbundleの2297 modules、clear artifact smoke PASS。Temporary artifactは後日失われる可能性があるため、Reportには相対Pathと結果要約だけを残した。
- Impact: ローカルまたはcacheを共有するCI環境で、Buildがexit 0のまま実行不能なWeb artifactを生成し、後続E2E/Production smokeで失敗するか、artifactの不正を早期に検知できない可能性がある。Current GitHub-hosted clean runnerで同じcache状態になるかは未確認。
- User / learner / QA impact: prebuilt Webを使うQAはSource runtimeとの差を見落とし、失敗をProduct defectと誤分類する可能性がある。教材のartifact再利用設計の再現性にも影響する。
- Possible root cause: `build:web`がMetro cacheをclearせず、Expo Router contextの古いroute-less transformを再利用した可能性が高い。`--clear`後にroute treeが再生成され、bundleが2297 modulesへ増加した。
- Alternative explanations: (a) cacheは別branch/別設定の過去bundleに由来し、通常checkoutでは発生しない、(b) Windows固有のMetro cache path/locking、(c) `onDemandFilesystem`またはExpo Router/Metro versionの組合せでcache invalidationが不安定。CI clean runnerでの再現性は未確認。
- Known deviation check: `docs/spec/known-deviations.md`にroute-less exportを許容する記録はない。`docs/adr/0002-ci-artifact-pipeline.md`はprebuilt artifactを正式runtime targetとして扱う。
- Duplicate check: 先行Waveのprebuilt Runtime `No routes found`観測を本Findingへ統合。MNT-003のNative Hermes marker検査、MNT-002のAgentic QA patch EOL、MNT-001のNative capability差分とは別root cause。
- Suggested follow-up: clean runner、cache warm runner、branch switch後の同一Buildで再現性を比較し、artifactにroute presenceを検証するread-only gateの必要性を評価する（今回Goalではbuild script/CIを変更しない）。
- Requires change?: maybe
- Notes: Product Source dev runtimeは正常で、clear済みartifact smokeもPASSしたため、現時点では恒常Product defectとは判定しない。Cache条件付きのartifact reproducibility候補として後続評価へ渡す。

## Append-only wave completion and reconciliation log

### Wave 2 — Specification ↔ Implementation

- Status: completed with bounded static coverage; Native runtime portion is recorded as blocked under Wave 8.
- Checked: product scope, role/permission policies, state transitions, cart limits, pricing/discount/free-shipping policies, session/auth boundaries, Web/Native application capability surfaces, route boundaries, seed scenario inventory, and test-only controls.
- Evidence: src/domain/policies/state-transitions.ts, src/domain/policies/permissions.ts, src/domain/services/cart.ts, src/application/use-cases/catalog-use-cases.ts, src/application/customer-capabilities.ts, src/bootstrap/native-runtime.ts, src/presentation/native/native-screens.tsx, scripts/check-native-route-dependencies.ts, and the normative feature documents.
- Result: MNT-001 is the only material static Specification ↔ Implementation candidate confirmed in this wave. Web implementation areas inspected for the bounded journeys were consistent with the normative contract. Runtime-only claims were not promoted from source inspection alone.
- Limitation: full feature-by-feature runtime coverage, Native device behavior, payment success/failure, order lifecycle mutation, review mutation, and scenario reset were not all exercised.

### Wave 3 — Specification ↔ Formal Tests

- Status: completed for the available formal test inventory and assertion review; execution results are in the command log addendum.
- Checked: unit, integration, repository contract, Web component, Native component, contract, Playwright E2E, accessibility, mobile-boundary, cross-role, and Maestro inventories; test-only control separation; fixture/seed references; retries, fixed waits, locator style, conditional assertions, and assertion scope where relevant.
- Negative evidence: formal suites cover the tested Web journeys and lower-layer policy contracts. No duplicate Finding was created merely because the same policy appears at multiple appropriate layers.
- Gap recorded in MNT-001: Native Storefront suggestion/filter/pagination controls have no corresponding Native UI test coverage, while the normative Storefront contract lists common Web/Native behavior. Native runtime execution was unavailable, so this remains an observed static gap rather than a reproduced device failure.

### Additional Evidence: MNT-001

- The initial observation concerned Native Search suggestion support. A second static trace found the same narrowed Native Storefront capability at Product List level:
  - docs/spec/features/storefront.md gives common Storefront BR coverage for keyword, category, brand, price, stock, Sale, and minimum rating. It also defines the Search suggestion contract and Android-required Search/Product List coverage.
  - src/presentation/native/native-screens.tsx exposes stock, Sale, and rating chips in the Native catalog but no brand or price-range controls and no user-facing pagination control. The Native search screen exposes keyword input and results but no suggestion UI.
  - src/application/customer-capabilities.ts and src/bootstrap/native-runtime.ts expose no Native suggestion capability; src/application/use-cases/catalog-use-cases.ts returns an empty suggestion result for the Native gateway.
  - Native contract and Maestro coverage exercise keyword/category/detail/cart paths, not suggestion, brand, price-range, or pagination behavior.
- Reconciliation: these are affected areas of the same Root Problem (Native Storefront behavior is narrower than the common Storefront normative contract), not a second independent Finding. MNT-001 remains observed, medium, high confidence; it is not reproduced because no authorized Android runtime was available.

### Reconciliation: initial contract-suite timeout

- Previous observation: the first full pnpm run test:contracts attempt was launched concurrently with other long-running suites and reported one timeout in tests/contracts/codex-hook-contract.test.ts while 395 of 396 tests had completed.
- Additional evidence:
  - The isolated command pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 passed 70/70 tests.
  - A later standalone pnpm run test:contracts completed with 30 files and 396/396 tests passing, exit code 0, in 206.15 seconds.
  - A direct bounded performance probe of the hook matrix completed successfully; no deterministic individual case failure was observed.
- Decision: do not create a Maintenance Candidate for the initial timeout. It is reconciled as an environment/resource-contention observation from concurrent execution, not evidence of a persistent product, test, or contract defect. The original timeout record remains above unchanged.

### Reconciliation: MNT-004 cache-conditioned Web artifact

- The route-less export was reproduced twice under the same stale-cache condition, so the original reproduced status is retained.
- A same-checkout export with --clear produced a routeful 2297-module artifact and passed the same prebuilt smoke. A subsequent warm export without --clear also produced the routeful artifact; a full prebuilt Chromium run against the clear artifact passed 27/27.
- Decision: MNT-004 is not classified as a constant Product defect and is not a false positive. It remains a medium-confidence AUTOMATION_FLAKE / artifact reproducibility candidate because the exit-0 route-less artifact is a real observed condition, while clean GitHub-hosted runner reproducibility was not established.

### Wave 4 — Deterministic Validation Execution final status

- Status: completed for safe, read-only commands; explicit omissions and upstream stops are listed in the blocked ledger.
- PASS commands:
  - pnpm run format:check — Prettier check passed.
  - pnpm run lint:markdown — 297 Markdown files, zero issues.
  - pnpm run lint — exit 0, 64 warnings, zero errors.
  - pnpm run typecheck — app, Native test, and training typechecks passed.
  - pnpm run security:check — runtime and credential-scan file checks passed.
  - pnpm run validate:image-manifest — passed.
  - pnpm run validate:eas:config — required profiles and manual-only workflow checks passed.
  - pnpm run check:native-route-dependencies — 38 Native routes passed.
  - pnpm run test:unit — 13 files, 66 tests passed, 67.58 seconds.
  - pnpm run test:integration — 9 files, 98 tests passed, 63.89 seconds.
  - pnpm run test:repository — 5 files, 33 tests passed, 54.42 seconds; Node experimental SQLite warning only.
  - pnpm run test:component:web — 11 files, 76 tests passed, 82.02 seconds.
  - pnpm run test:component:native — 12 suites, 49 tests passed, 30.644 seconds; React act(...) environment warning was observed but did not fail the suite.
  - Standalone pnpm run test:contracts — 30 files, 396 tests passed, 206.15 seconds.
- No source or tracked generated file changed during these commands. pnpm run verify was intentionally not executed because its build:web path invokes tracked image-manifest generation; the aggregate command was not proven read-only under this contract.

### Wave 5–7 — Web Runtime, Role/Permission/State, Responsive/Accessibility

- Status: partially completed with direct source-runtime browser checks and formal Web suites.
- PASS evidence:
  - Source runtime Storefront, Search empty/recovery, Product detail, Cart quantity/persistence, Guest /admin redirect, Customer /admin forbidden, Admin desktop boundary/dashboard/catalog, Checkout no-address recovery, and 390×844 responsive navigation/form reachability were exercised.
  - pnpm run test:e2e:chromium against the source runtime: 27 passed.
  - pnpm run test:a11y: 4 passed.
  - pnpm run test:e2e:mobile-boundary: 4 passed.
  - pnpm run test:e2e:cross-role: 4 passed.
  - Clear prebuilt artifact pnpm run test:smoke: 1/1 passed; full prebuilt Chromium run: 27/27 passed.
- Not asserted as PASS: payment completion/failure, order lifecycle mutation, review submission, scenario reset/Test Control, keyboard/focus interaction, and every loading/retry/reload/back/direct-navigation combination. The bounded checks did not produce another confirmed Product defect.
- Web runtime evidence was kept separate by port. The prior route-less prebuilt tab retained its own Console error and was not used as fresh evidence against the source runtime.

### Wave 8 — Native / Maestro

- Status: blocked for device runtime; static Native checks completed.
- Android Doctor preflight was run first using the repository-local Android runbook. maestro --version reported 2.8.0; adb devices -l showed no authorized device. Doctor exited 1 with No authorized device. Check 'adb devices -l'.
- Per the Native runbook, Android build/install/Maestro flows were not started after this upstream preflight failure. No arbitrary retry or source change was made.
- iOS runtime is not a current Repository guarantee; the specification records iOS as build-only, and no iOS runtime was required for this audit.
- Native static route-dependency checks and Native component tests passed. MNT-001 and MNT-003 retain their separate static/tool findings. Native runtime behavior is not treated as PASS by absence of execution.

### Wave 9 — Curriculum Internal Review

- Status: completed for the curriculum tree and primary learning path.
- Checked: learning goal/prerequisite ordering, Part 1/Part 2 boundaries, formal-versus-training separation, Web/Native guarantee language, expected-failure semantics, workbook/skill references, rubric/instructor references, command freshness, current file paths, capstone entrypoints, and the role of Agentic QA in the learning sequence.
- pnpm run validate:curriculum passed for 22 required curriculum documents and 4 workbook files.
- The actual entrypoint is docs/curriculum/test-automation/README.md; no document reviewed claimed the absent root-level README paths as the canonical entrypoint. No Curriculum Finding was promoted from the absence of convenience README files.
- MNT-002 is the only material curriculum/training execution candidate found: the documented Agentic QA Basic challenge preparation cannot apply its current patch on this Windows working tree.

### Wave 10 — Curriculum ↔ Current Repository

- Status: completed for commands, paths, scripts, workflows, feature references, guarantees, and training entrypoints encountered in the curriculum.
- Web baseline and mobile training scripts executed against the current source runtime:
  - pnpm run training:web:baseline — 1 passed.
  - pnpm run training:web:mobile — 1 passed.
- The expected-failure exercise itself was run directly with the training Playwright config. It failed at the intentional false assertion as expected; the destructive wrapper training:web:check-expected-failure was not run because its implementation begins by recursively deleting the existing evidence directory.
- Native training baseline could not be executed because the Android Doctor preflight was blocked. This is recorded as an environment limitation, not a curriculum PASS.

### Wave 11 — Fresh Learner Simulation

- Status: partially completed.
- A learner-facing Web sequence was followed from the curriculum entrypoint through baseline, mobile, source runtime, and expected-failure exercise. Commands and port assumptions were usable in the current checkout; the expected failure produced the intended assertion and evidence artifacts.
- Native learner execution was blocked before device setup by the no-authorized-device preflight. No hidden learner prerequisite was inferred from that environment failure.
- The intentionally destructive expected-failure wrapper was not executed, so its cleanup and postcondition behavior remain unknown.

### Wave 12 — CI / Repository Maintenance Audit

- Status: completed for main CI, Native CI, iOS CI, training workflow references, package scripts, and contract tests.
- Checked: Node/pnpm alignment, artifact build/serve sequence, prebuilt versus source runtime, path filters, required-job gating, PR/event conditions, Android runtime gating, iOS build-only guarantee, script references, training ports, and security checks.
- tests/contracts/ci-workflow.test.ts and tests/contracts/native-ci-workflow.test.ts were included in the standalone 396-test contract PASS.
- MNT-003 is a confirmed tool/CI bundle-scan candidate because Native CI uses the same raw marker approach as the failing local guard. MNT-004 is the Web build/artifact reproducibility candidate. No additional CI semantic contradiction was confirmed.
- Training workflow action references are less pinned than the main CI workflow; this was recorded as an observation only because current repository contracts do not establish that the training workflow must use the main workflow’s SHA-pinning policy.

### Wave 13 — Cross-layer Audit

- Status: completed for the highest-risk verticals and partially bounded elsewhere.
- Vertical trace A: Storefront normative common Web/Native contract → Native capability/use-case/route/UI → Native contract/Maestro coverage → Android runtime blocked. Result: MNT-001.
- Vertical trace B: Agentic QA patch contract → line-ending attributes and patch bytes → preparation test/command → Windows apply-check failure and ignore-whitespace control. Result: MNT-002.
- Vertical trace C: Native automation/production boundary → Metro resolver → Hermes bundle output → raw marker guard and Native CI scan → no-bytecode control. Result: MNT-003.
- Vertical trace D: Web artifact ADR/CI build contract → Expo export with stale cache → served prebuilt runtime → smoke failure → clear/warm controls and full prebuilt PASS. Result: MNT-004.
- No additional independent Root Problem was separated from these four candidates. Lower-layer PASS results were not used to claim runtime coverage where runtime was blocked.

### Wave 14 — Finding Verification

- Status: completed for all four candidates.
- MNT-001: confirmed normative/static contradiction; not a device-reproduced Product failure because Android was unavailable; no active Known Deviation and no duplicate.
- MNT-002: reproduced with normal git apply --check; --ignore-whitespace is a diagnostic control, not an adopted fix; all three challenge patches share the same line-ending condition and are one Root Problem.
- MNT-003: reproduced guard failure and isolated output-format sensitivity with no-bytecode control; not evidence of Production test-control leakage.
- MNT-004: reproduced stale-cache route-less artifact, then passed clear/warm controls; not a constant Product defect and not a false positive.
- No Critical or High candidate was supported by the collected evidence. No candidate was downgraded to false positive or duplicate after the additional controls.

### Fresh-angle A — Cache/output-format isolation

- Rationale: the initial prebuilt failures could have been a single stale artifact or a browser/serving error. A new angle was needed to distinguish export cache state, output format, and runtime serving.
- New evidence: clear versus clearless Web exports, warm clearless export, served smoke, and full prebuilt Chromium; Android Hermes .hbc versus --no-bytecode --no-minify JavaScript marker comparison.
- Result: MNT-003 and MNT-004 judgments were refined without source changes. The Web route-less condition is cache-conditioned; the Native guard failure is output-format-sensitive.

### Fresh-angle B — Concurrency/reproducibility and learner execution

- Rationale: the first contract timeout occurred while suites were concurrent, and curriculum claims needed a learner-path check independent of static reading.
- New evidence: isolated hook contract PASS, standalone full contract PASS, Web training baseline/mobile PASS, direct expected-failure exercise, and explicit non-execution of the destructive wrapper.
- Result: the initial contract timeout was reconciled as non-persistent contention evidence; MNT-002 remained reproduced independently; remaining learner/native unknowns are documented as blocked or not executed.

Progress: 100% (16/16 workflow decisions closed; completed, partially completed, or blocked with evidence)

## 8. Command Execution Log — consolidated addendum

### Static validators and lower-layer suites

The following commands were executed only after inspecting their package scripts and relevant called scripts for tracked-file writes. Unless a result below explicitly says FAIL or BLOCKED, the command exited 0. For earlier attempts whose wall-clock seconds were not captured, the Report preserves the measured runtime and result rather than inventing timestamps.

- Command: pnpm run format:check
  - Purpose: read-only Prettier conformity check.
  - Start/end: Goal execution window; exact wall-clock seconds not captured. A direct confirmation completed with output All matched files use Prettier code style!
  - Result: PASS; no write mode.
  - Source integrity: authorized Report only.
- Command: pnpm run lint:markdown
  - Purpose: Markdown documentation lint.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; markdownlint v0.23.2 checked 297 files, 0 issues.
  - Source integrity: authorized Report only.
- Command: pnpm run lint
  - Purpose: source lint.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS with 64 warnings and 0 errors. Warnings were recorded as observations, not auto-fixed.
  - Source integrity: authorized Report only.
- Command: pnpm run typecheck
  - Purpose: app, Native-test, and training type contracts.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS.
  - Source integrity: authorized Report only.
- Command: pnpm run security:check
  - Purpose: runtime file and credential-pattern checks.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 233 runtime files and 317 credential-scan files.
  - Source integrity: authorized Report only.
- Command: pnpm run validate:image-manifest
  - Purpose: read-only image manifest contract.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS.
  - Source integrity: authorized Report only.
- Command: pnpm run validate:eas:config
  - Purpose: EAS profile and manual-only workflow contract.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS.
  - Source integrity: authorized Report only.
- Command: pnpm run check:native-route-dependencies
  - Purpose: Native route import boundary contract.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 38 Native routes.
  - Source integrity: authorized Report only.
- Command: pnpm run test:unit
  - Purpose: unit regression suite.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 13 files, 66 tests, 67.58 seconds.
  - First meaningful failure: none.
  - Source integrity: authorized Report only.
- Command: pnpm run test:integration
  - Purpose: integration suite.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 9 files, 98 tests, 63.89 seconds.
  - First meaningful failure: none.
  - Source integrity: authorized Report only.
- Command: pnpm run test:repository
  - Purpose: repository-contract suite.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 5 files, 33 tests, 54.42 seconds.
  - Warning: Node experimental SQLite warning.
  - Source integrity: authorized Report only.
- Command: pnpm run test:component:web
  - Purpose: Web component suite.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 11 files, 76 tests, 82.02 seconds.
  - Source integrity: authorized Report only.
- Command: pnpm run test:component:native
  - Purpose: Native component suite without a device.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 12 suites, 49 tests, 30.644 seconds.
  - Warning: React act(...) testing-environment warning at native runtime provider; no test failure.
  - Source integrity: authorized Report only.
- Command: pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
  - Purpose: isolate the first concurrent contract timeout.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 1 file, 70 tests, 35.66 seconds.
  - Source integrity: authorized Report only.
- Command: pnpm run test:contracts, standalone final attempt
  - Purpose: full formal contract regression after concurrency hypothesis.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: PASS; 30 files, 396 tests, 206.15 seconds. This is the final contract result.
  - Source integrity: authorized Report only.

### Specification, visual, and curriculum validators

- Commands: pnpm run validate:spec; pnpm run validate:spec-visuals:final; pnpm run validate:curriculum.
- Purpose: normative Specification, final visual contract, and Curriculum structure.
- Start/end: Goal execution window; exact wall-clock seconds not captured. An initial PowerShell timing wrapper returned exit 1 with no output; each command was then run directly for diagnosis.
- Result: direct runs PASS. Spec validators reported Catalog 38 rows, Product 31, Supporting 4, Boundary 2, Test-only 1, 58 important states, 56 required visual states, and 94/94 capture targets. Curriculum validator reported 22 required documents and 4 workbook files.
- First meaningful failure: wrapper output anomaly only; direct command did not fail.
- Source integrity: authorized Report only.

### Agentic QA preparation

- Command: pnpm run test:agentic-qa:preparation
- Purpose: deterministic challenge patch preparation and validation.
- Start/end: Goal execution window; runtime 246 seconds.
- Result: FAIL, one preparation test failure. First meaningful failure was normal git apply --check for CHALLENGE-BASIC-001.patch at auth-use-cases.ts line 203.
- Downstream: no Repair workflow and no source mutation.
- Control commands: normal git apply --check for the Basic patch failed; git apply --check --ignore-whitespace passed. Byte inspection found the three challenge patches with working-tree CRLF while source files and .gitattributes require LF.
- Finding: MNT-002. Source integrity: authorized Report only.

### Web formal and training execution

- Command: pnpm run test:e2e:chromium against source runtime on loopback port 8082
  - Purpose: formal Web E2E.
  - Runtime: approximately 3.2 minutes.
  - Result: PASS; 27 tests.
- Command: pnpm run test:a11y against source runtime
  - Purpose: accessibility contract.
  - Runtime: approximately 1.4 minutes.
  - Result: PASS; 4 tests.
- Command: pnpm run test:e2e:mobile-boundary against source runtime
  - Purpose: mobile viewport boundary.
  - Runtime: approximately 33.3 seconds.
  - Result: PASS; 4 tests.
- Command: pnpm run test:e2e:cross-role against source runtime
  - Purpose: cross-role lifecycle/boundary checks.
  - Runtime: approximately 1.1 minutes.
  - Result: PASS; 4 tests.
- Command: pnpm run training:web:baseline against source runtime
  - Purpose: learner Web baseline.
  - Runtime: approximately 8.6 seconds.
  - Result: PASS; 1 test.
- Command: pnpm run training:web:mobile against source runtime
  - Purpose: learner mobile baseline.
  - Runtime: approximately 5.1 seconds.
  - Result: PASS; 1 test.
- Command: pnpm exec playwright test training/playwright/failure-exercises --config=playwright.training.config.ts --project=training-chromium
  - Purpose: exercise the documented intentional expected failure without invoking the destructive wrapper.
  - Start/end: Goal execution window; exact wall-clock seconds not captured.
  - Result: FAIL as expected at the intentionally false assertion. Screenshot, video, and trace evidence were generated under temporary output.
  - Wrapper omission: pnpm run training:web:check-expected-failure was not executed because scripts/training/run-expected-failure.ts starts with recursive deletion of the evidence root.
- Command: pnpm run test:smoke against stale-cache prebuilt artifact
  - Purpose: prebuilt artifact smoke.
  - Result: FAIL after Playwright retry policy (three attempts); route-less artifact, Storefront heading missing, Runtime Error: No routes found.
  - Finding: MNT-004.
- Command: pnpm run test:smoke against --clear prebuilt artifact
  - Purpose: cache-control comparison.
  - Result: PASS; 1/1.
- Command: pnpm run test:e2e:chromium against --clear prebuilt artifact
  - Purpose: full formal test against build artifact.
  - Runtime: approximately 1.6 minutes.
  - Result: PASS; 27 tests.
- Command: warm export without --clear followed by artifact inspection
  - Purpose: reproducibility control after cache recovery.
  - Result: PASS routeful 2297-module artifact; no source mutation.

### Native and bundle validation

- Command: maestro --version
  - Purpose: tool availability.
  - Result: PASS; 2.8.0.
- Command: adb devices -l
  - Purpose: device availability preflight.
  - Result: no authorized device.
- Command: Android Doctor from the repository Native runbook
  - Start: 2026-08-20 01:30:18 JST.
  - End: 2026-08-20 01:30:24 JST.
  - Result: BLOCKED/exit 1; No authorized device. Check adb devices -l.
  - Downstream: Android build/install/Maestro were not executed.
- Command: pnpm run validate:native-production-bundle
  - Purpose: automation/production bundle boundary guard.
  - Result: FAIL at Automation marker check against Hermes .hbc; production check was not reached.
  - Control: same automation export with --no-bytecode --no-minify contained the expected marker, Harness, NativeTestControlService, and Native route strings.
  - Finding: MNT-003. No production leak conclusion.

### Web export probes

- Command: pnpm exec expo export --platform web --output-dir output/web-export-probe-20260820-024000
  - Purpose: cacheless-flag (without --clear) artifact reproducibility probe.
  - Result: exit 0 but 745 modules, no route metadata, route-less bundle; served smoke failed.
- Command: pnpm exec expo export --platform web --output-dir output/web-export-probe-root-20260820-024500 with explicit app-root context
  - Purpose: rule out a wrong Router root as the only explanation.
  - Result: same 745-module route-less artifact.
- Command: pnpm exec expo export --platform web --clear --output-dir output/web-export-probe-clear-20260820-025000
  - Purpose: cache isolation control.
  - Result: exit 0, 2297 modules, routeful artifact; smoke and full prebuilt E2E passed.
- Command: pnpm exec expo export --platform web --output-dir output/web-export-probe-warm-20260820-025500
  - Purpose: warm-cache reproducibility control.
  - Result: exit 0, 2297 modules, routeful artifact.
- Temporary servers on loopback ports 8083 and 8084 were stopped after evidence collection. Browser tabs were finalized. Temporary output remains non-durable/ignored and may be removed by the environment later.

## 9. Blocked / Not Executed — final addendum

- Android authorized device/emulator: BLOCKED by the required Doctor preflight. Evidence is the 2026-08-20 01:30:18–01:30:24 JST Doctor result and adb devices -l output. Native runtime, Android build/install, and Maestro flows are not PASS.
- iOS runtime: NOT EXECUTED because current normative guarantee is build-only and the current Windows environment does not provide an iOS runtime. This is not treated as a defect.
- pnpm run verify: NOT EXECUTED because build:web invokes generated image-manifest handling that can update a tracked file; aggregate read-only safety was not established.
- Native production build after guard failure: NOT EXECUTED, following the Native runbook’s upstream-failure stop rule. No production bundle leakage was inferred.
- training:web:check-expected-failure: NOT EXECUTED because its wrapper recursively deletes existing evidence before running. The non-destructive underlying expected-failure Playwright command was executed and failed at the intended assertion.
- Full Web payment/order/review mutation and exhaustive state/recovery matrix: NOT EXECUTED in the bounded runtime audit. Existing formal inventory and lower-layer tests were inspected; absence of execution is not PASS.
- Native Search/Product List runtime reproduction of MNT-001: BLOCKED by Android environment. Static Specification ↔ Implementation evidence remains valid but is not device-reproduced.

## 10. Source Integrity Log — final addendum before sanitization

- Temporary server shutdown and browser finalization completed without tracked source changes.
- No product, test, Specification, Curriculum, CI, config, script, dependency, fixture, seed, snapshot, agent, skill, harness, or QA-policy file was edited.
- No git add, commit, push, reset, clean, checkout, rm, or other Git mutation was executed.
- Current expected change set before final sanitizer: the authorized untracked Report only; no tracked diff.
- A final read-only Git check and the required Report-only sanitizer Write/Check remain before completion.

## Final Synthesis

### Confirmed / Reproduced Findings

- Total Maintenance Candidates: 4.
- MNT-001 — observed, medium, high confidence, REGRESSION_GAP: Native Storefront/Search capability is statically narrower than the common normative Storefront contract. The affected scope includes Native suggestions and the Native Product List’s missing brand/price controls and pagination behavior. Android runtime reproduction is blocked, so this is not labeled device-reproduced.
- MNT-002 — reproduced, medium, high confidence, EVALUATION_FAILURE: Agentic QA challenge patch preparation fails on the current Windows working tree under normal git apply --check because the challenge patch files are CRLF while the applied source/context is LF. The same root cause affects the three challenge patches; it is one candidate.
- MNT-003 — reproduced, medium, high confidence, TOOL_FAILURE: Native production-bundle guard fails on the current Hermes .hbc Automation output because raw marker inspection finds no Test Control/Harness markers. A no-bytecode JavaScript control contains the markers, so the result demonstrates a guard/output-format contract failure, not a confirmed production test-control leak.
- MNT-004 — reproduced, medium, medium confidence, AUTOMATION_FLAKE: Web export can exit 0 yet produce a route-less artifact under the observed stale Metro cache condition. Clear and warm controls produced routeful artifacts and passed smoke/full prebuilt E2E; this is not classified as a constant Product defect.

Status counts: reproduced 3, observed 1, suspected 0, unresolved 0, false_positive 0, duplicate 0, blocked Finding status 0.
Severity counts: critical 0, high 0, medium 4, low 0, info 0.

### Suspected / Unresolved Findings

- No separate suspected or unresolved MNT ID was retained. The possible Native Search request-order race, React act warning, lint warnings, training workflow action pinning difference, and incomplete runtime matrix remain observations/unknowns rather than evidence-backed Maintenance Candidates.
- These observations were not silently treated as PASS; they are listed under Remaining Unknowns and the relevant Wave limitations.

### False Positives / Duplicates

- No Finding was removed. The initial concurrent Contract-suite timeout was reconciled as a non-persistent resource-contention observation after isolated and standalone PASS results; it was not assigned an MNT ID.
- MNT-001’s Native Search and Product List symptoms were intentionally grouped under one Root Problem.
- MNT-002’s three CRLF challenge patches were intentionally grouped under one Root Problem.
- MNT-004’s initial prebuilt No routes found observation was retained in that Finding and refined with clear/warm controls; it was not downgraded to false_positive.

### Blocked Areas

- Android authorized device/emulator was unavailable. Native runtime, Android build/install, and Maestro execution were not performed after the required Doctor failure.
- iOS runtime was not performed because the current guarantee is build-only and the environment is Windows.
- pnpm run verify was not run because its build path may write a tracked generated image manifest and aggregate read-only safety was not established.
- Native production build was stopped behind the failing bundle guard per the Native runbook.
- The destructive expected-failure wrapper was not run. Its underlying intentional-failure Playwright exercise was run directly.
- Payment success/failure, completed order lifecycle, review submission, Test Control/scenario reset, and exhaustive keyboard/focus/loading/retry/back/direct-navigation combinations were not all exercised.

### Coverage Summary

- Wave 0 inventory: completed.
- Wave 1 Specification internal consistency: completed; validators PASS and no internal contradiction confirmed.
- Wave 2 Specification ↔ Implementation: completed with bounded static coverage; Native runtime limitation retained.
- Wave 3 Specification ↔ Formal Tests: completed for inventory/assertion review; formal lower-layer and Web suites executed where safe.
- Wave 4 deterministic validation: completed for safe commands; aggregate verify intentionally not executed.
- Waves 5–7 Web runtime, role/state, responsive/accessibility: partially completed with source-runtime journeys and formal Web suites PASS; the unexecuted matrix is explicit.
- Wave 8 Native/Maestro: blocked at Doctor, static Native checks PASS.
- Wave 9 Curriculum internal review: completed.
- Waves 10–11 Curriculum ↔ Repository and Fresh Learner: Web portions completed/validated; Native and destructive wrapper portions blocked or not executed.
- Wave 12 CI/repository maintenance: completed for main, Native, iOS, training references, scripts, and contracts.
- Wave 13 cross-layer audit: completed for the four highest-risk verticals; no fifth independent root problem found.
- Wave 14 Finding verification: completed for all four candidates.
- Fresh-angle A and B: completed; cache/output-format and concurrency/learner angles changed or confirmed judgments.
- Overall progress: 100% (16/16 workflow decisions closed with PASS, partial, blocked, or not-executed scope explicitly recorded). This is coverage closure, not a claim that every Product behavior was executed.

### Highest-risk Areas

1. Native Storefront parity and its missing formal/UI/runtime coverage, pending an Android-capable environment.
2. Native Automation/Production bundle guard validity for Hermes output and the corresponding CI raw scan.
3. Agentic QA challenge patch preparation on Windows and the LF/CRLF contract.
4. Web prebuilt artifact reproducibility when Metro cache state is not clean.

### Cross-layer Observations

- Lower-layer policies and formal Web tests can PASS while a Native common-contract gap remains outside available device execution.
- Build/export exit 0 is not sufficient evidence that a routeful Web artifact was produced under the observed cache condition.
- Static resolver contracts and no-bytecode marker controls support separation of Native test tooling from production, but the current Hermes raw-marker guard cannot complete its intended proof.
- Training and formal Web paths are separated and the executed learner Web baseline is usable; Agentic QA preparation has a distinct Windows line-ending failure.
- The current CI contract tests provide structural coverage for workflow shape, but they do not prove all artifact output-format assumptions at runtime.

### Suggested Analysis Order

This is follow-up analysis guidance only; no follow-up action was executed in this Goal.

1. Establish an Android-capable validation environment and verify MNT-001’s shared Native Storefront behavior against the normative Oracle, then map the smallest correct contract/test boundary.
2. Analyze MNT-003’s Hermes-aware guard design and compare local/CI Expo export formats without conflating guard failure with production leakage.
3. Trace MNT-002 patch provenance and Windows/Linux checkout behavior, then validate the learner preparation contract on both line-ending environments.
4. Reproduce MNT-004 on a clean GitHub-hosted runner and controlled cache states before deciding whether the candidate is local-only or CI-relevant.
5. Revisit the unexecuted payment/order/review and keyboard/focus matrix only after the higher-risk environment/tool contracts are resolved.

### Remaining Unknowns

- Whether MNT-001 is observable on a real Android device and whether the intended platform scope contains an intentional Native simplification not represented in the current Known Deviations.
- Whether Hermes bytecode contains equivalent marker information in a non-raw encoding that a safe guard could inspect.
- Whether MNT-004 occurs on a clean GitHub-hosted runner or only after this Windows checkout’s cache history.
- Whether the three Agentic QA challenge patches are generated with CRLF or converted during a particular checkout/provenance step.
- Whether training workflow action pinning is intentionally relaxed or merely a maintenance policy difference.
- Whether the React act warning indicates only test-environment setup noise or masks an assertion timing weakness.

### Final Source Integrity

- Final check time: 2026-08-20 02:55:34 JST before this final synthesis append.
- Initial HEAD: da924e0dd9764416fbe2f66ad534db7b3d9ccf40.
- Final HEAD: da924e0dd9764416fbe2f66ad534db7b3d9ccf40.
- Branch unchanged: docs/2026-08-20-maintenance-investigation.
- Final pre-synthesis check: git status --short --untracked-files=all showed only the authorized untracked Report; git diff --name-only and git diff --stat were empty.
- Required sanitizer: Report-only Write/Check completed with files_scanned 1, files_changed 0, replacements_total 0, residual_findings 0. A final sanitizer Check will be repeated after this append.
- No Product, Test, Specification, Curriculum, CI, Config, Script, Dependency, Fixture, Seed, Snapshot, Agent, Skill, Harness, or QA Policy change was made. No Git mutation, Issue, PR, Repair Loop, or Harness Improvement was performed.
- Subagents: none used; direct read-only investigation was sufficient, so no child Run Artifact was created.

Progress: 100% (16/16)

### Final Source Integrity Reconciliation

- Final read-only check at 2026-08-20 02:56:28 JST: branch and HEAD unchanged; git status showed only the authorized untracked Report; git diff --name-only and git diff --stat were empty.
- Final Report-only sanitizer Write/Check at completion checkpoint: files_scanned 1, files_changed 0, replacements_total 0, residual_findings 0.
- No SOURCE_INTEGRITY_VIOLATION occurred.

### Final check after sanitizer

- Read-only Git check at 2026-08-20 02:56:50 JST: HEAD da924e0dd9764416fbe2f66ad534db7b3d9ccf40 and branch docs/2026-08-20-maintenance-investigation remained unchanged.
- git status --short --untracked-files=all listed only docs/reports/2026-08-20_010734_maintenance-investigation.md. git diff --name-only and git diff --stat were empty.
- The final sanitizer Write/Check reported one file scanned, zero files changed, zero replacements, and zero residual findings.

## Continuation audit addendum — completion recheck

### Completion-audit result

- The prior Final Synthesis explicitly listed unexecuted Web payment/order/review and Mobile coverage. This continuation closed those gaps with the existing prebuilt artifact without changing Source.
- The prior Final Synthesis stated that keyboard/focus interaction was not executed. The already recorded Accessibility suite actually contains and passed the keyboard skip-link, image-dialog focus restoration, and admin alertdialog Escape/focus restoration test. This is corrected below without deleting the original limitation record.
- No requirement was interpreted as permitting source repair, snapshot promotion, visual-reference update, or Git mutation. No such action was taken.

### Wave 5–7 additional runtime evidence

- Command: pnpm run test:e2e:mobile against the clear prebuilt artifact on loopback port 8084.
  - Result: PASS; all 14 Phase 1 Mobile Chromium cases.
  - Covered: Guest search/filter/detail/cart, cart boundaries, login and guest-cart merge, successful checkout, payment failure/retry, price/stock/rank recheck, order reload, review edit, Admin product aggregate and lifecycle, inventory/order progression, user suspension protection, customer logout protection, and Admin logout protection.
  - This is stronger evidence for the previously unexecuted payment/order/review and cross-role state paths than the earlier bounded runtime probe.
- Command: pnpm run test:e2e:smoke:firefox against the clear prebuilt artifact.
  - Result: PASS; 1/1.
- Command: pnpm run test:e2e:smoke:webkit against the clear prebuilt artifact.
  - Result: PASS; 1/1.
- Command: pnpm run training:web:mobile:exercise against the training configuration.
  - Result: PASS; 1/1 starter exercise, 53.6 seconds.
  - Warning: the existing source server was not reusable at the time, so the Playwright training webServer path started its own server. Its output included Metro cache-deserialization/fallback warnings; Git status remained unchanged.
- The source-runtime WebKit smoke had previously timed out at page.goto waiting for load, while the same smoke passed on the clear prebuilt artifact. The source-runtime Mobile suite similarly produced repeated page.goto/domcontentloaded timeouts before it was stopped under the no-new-information retry rule; the same full suite passed 14/14 on the prebuilt artifact. These results isolate the failures to source-dev server/cache/browser interaction under that environment, not to the tested Product assertions.

### Reconciliation: prior keyboard/focus limitation

- Previous record: Wave 5–7 described keyboard/focus interaction as not executed.
- Evidence already present in the executed command pnpm run test:a11y: e2e/web/accessibility.spec.ts includes the test named Keyboardで本文へ移動し、Dialogを閉じるとFocusが戻る and it passed as part of the 4-test Accessibility suite.
- Decision: treat keyboard skip-link and the two tested dialog focus-return paths as completed PASS coverage. Keep broader keyboard traversal, every form-control focus order, and all modal/error variants in Remaining Unknowns. No Finding is created.

### Reconciliation: source-dev startup and browser smoke controls

- An initial attempt to start Expo with an explicitly empty CI environment failed immediately with GetEnv.NoBoolean; this was an invalid environment injection, not a Product failure.
- The normal source-dev start without cache clear emitted Metro Unable to deserialize cloned data and did not expose the requested port. The server was stopped after the upstream startup failure.
- Starting the same source runtime with Expo --clear rebuilt the temporary Metro cache and eventually exposed port 8082. Firefox smoke then passed against source runtime; WebKit source smoke still timed out at page.goto, while WebKit against the clear prebuilt static artifact passed.
- Decision: add this as supporting evidence for MNT-004’s cache/output reproducibility concern and as an environment/browser observation. Do not create a separate MNT ID because the canonical CI extended-e2e path consumes a prebuilt artifact and the prebuilt Firefox/WebKit controls passed.

### Observation: UI review concurrent versus sequential execution

- Command: four UI review projects (desktop/tablet/mobile/small-mobile) against the clear prebuilt artifact with workers=4 and a fresh temporary UI_REVIEW_STAGE.
- Result: 3/4 projects passed; tablet failed once at checkout-processing route readiness because the expected 支払いを処理しています heading was not visible within 7.5 seconds. The other three viewport projects completed.
- Independent controls:
  - tablet-only UI review restricted to checkout-processing-order-payment-failed: PASS 1/1.
  - full tablet UI review alone with workers=1 and a fresh stage: PASS 1/1 in approximately 1.9 minutes.
- Decision: this is an observed concurrency/resource-sensitive UI review flake candidate, not a confirmed Product or responsive defect. It is not assigned a new MNT ID because the failing invocation is not the CI matrix’s canonical one-project-per-job execution, and the exact route passed both targeted and sequential controls. The event remains evidence for future automation-flake analysis.

### Continuation command execution log

- Start/end reference: continuation execution window 2026-08-20 02:58–03:25 JST; exact command wall-clock seconds are retained where the runner emitted them. Temporary server sessions and browser artifacts were closed/stopped after evidence collection.
- Source integrity check after the Mobile and UI review commands at 2026-08-20 03:25:05 JST: git status listed only the authorized Report; git diff --name-only and git diff --stat were empty.
- Temporary UI review stages produced only ignored output artifacts. They were not promoted to specification assets, snapshots, or any durable document.
- The failed source-dev Mobile run was stopped after the fourth case began, following three consecutive same-class page.goto timeouts. No retry of that same source-dev condition was performed; the prebuilt artifact was the independent control.

### Continuation coverage status

- Wave 5–7: expanded from partial to substantially covered for formal Web prebuilt journeys, browser smoke, Mobile Phase 1, accessibility keyboard paths, and UI review viewport controls. Source-dev cache/browser startup limitations remain explicitly bounded.
- Wave 10–11: Training mobile exercise is now executed PASS; Native learner path remains blocked by Android Doctor.
- Wave 14/Fresh-angle: additional controls did not add a new Root Problem, change any MNT status, or produce a false-positive/duplicate candidate.

Progress: 100% (16/16; continuation completion audit and additional controls recorded)

## Final Synthesis — continuation reconciliation

### Current candidate counts

- Maintenance Candidates remain 4: MNT-001 observed; MNT-002, MNT-003, and MNT-004 reproduced.
- No new MNT ID was created from the source-dev Mobile timeout, source-dev WebKit timeout, or concurrent UI review tablet failure because independent prebuilt/sequential controls passed and the canonical CI shape does not reproduce the same condition.
- Status counts remain: reproduced 3, observed 1, suspected 0, unresolved 0, false_positive 0, duplicate 0, blocked Finding 0.
- Severity counts remain: critical 0, high 0, medium 4, low 0, info 0.

### Requirements audit outcome

- Product / Specification / Implementation / formal test / Curriculum / CI / scripts inventory: covered with bounded static and executable evidence.
- Deterministic validation: safe validators and lower-layer suites PASS; intentional unsafe aggregate verify remains NOT EXECUTED because build:web can write tracked generated output.
- Web Runtime: source and prebuilt paths investigated; prebuilt formal Chromium, Mobile 14/14, Firefox smoke, WebKit smoke, Accessibility 4/4, cross-role, boundary, and UI review viewport controls are covered. Source-dev cache/browser limitations are retained as environment evidence.
- Role / Permission / State: prebuilt Phase 1 14/14 plus cross-role and accessibility/admin paths cover the major specified journeys.
- Native / Maestro: static checks and component suite PASS; Android runtime remains BLOCKED at the required no-authorized-device Doctor preflight.
- Curriculum / Fresh learner: Web baseline, mobile, starter exercise, and expected-failure semantics covered; Native execution remains blocked and destructive wrapper remains intentionally unexecuted.
- Cross-layer and Finding verification: completed; the four existing candidates remain the evidence-backed set.

### Final integrity for continuation

- HEAD remained da924e0dd9764416fbe2f66ad534db7b3d9ccf40 and branch remained docs/2026-08-20-maintenance-investigation.
- Only the authorized Report is present as an untracked change; no tracked source diff exists.
- No source fix, test fix, specification/curriculum/CI/config/script change, snapshot update, visual promotion, Git mutation, issue, PR, Repair Loop, or Harness Improvement was performed.

### Final continuation Source Integrity checkpoint

- Check time: 2026-08-20 03:26:44 JST.
- Branch: docs/2026-08-20-maintenance-investigation.
- HEAD: da924e0dd9764416fbe2f66ad534db7b3d9ccf40, unchanged from the initial baseline.
- git status --short --untracked-files=all listed only the authorized Report; git diff --name-only and git diff --stat were empty.
- Loopback ports 8081–8084 had no listening audit server after cleanup.
- Report-only sanitizer Write/Check: 1 file scanned, 0 files changed, 0 replacements, 0 residual findings.
- SOURCE_INTEGRITY_VIOLATION: none.

## MCP Runtime補完 Addendum — 既存調査を維持した追加フェーズ

### 追加フェーズの方針

- 既存ReportのWave、Finding、Command結果、Final Synthesisは削除・上書きせず、Runtime Evidenceが不足していた箇所だけを追加確認した。
- 既に十分な静的確認・Formal Test・Prebuilt Web Runtime確認があるSpecification、Implementation、Curriculum、CI領域は、網羅性だけを理由に再実行していない。
- 追加対象は、前回ReportでNative RuntimeがDoctor前にBLOCKEDだったMNT-001、Nativeの主要Lifecycle/Error Recovery、ならびにPlaywright-MCPでまだ実操作Evidenceを持っていなかったWebの検索・カート・Direct Navigation・Responsive範囲とした。
- 画面を操作した後は、Accessibility/UI snapshotだけで完了扱いにせず、取得可能なRendered Screenshotを実際に確認した。スクリーンショットはMCPまたは一時Runtimeの一時Artifactであり、Report以外の永続成果物には昇格していない。

### 追加前Coverageの棚卸し

| 領域 | 追加前の状態 | 追加フェーズでの扱い |
|---|---|---|
| Specification / Implementation / Curriculum / CI | Staticおよび既存Validationで確認済み | 再実行しない。既存Evidenceを正本として保持 |
| Web Formal Runtime | Prebuilt Chromium、Mobile、Firefox、WebKit、Accessibility、Cross-role等を既存Reportで確認済み | Playwright-MCPで検索、Empty、Responsive、Cart Persistence、Direct Role boundaryの不足Evidenceのみ補完 |
| Web Runtime Visual | 既存UI reviewおよび一部Formal Screenshotあり | MCPでHome、Search result/empty、Mobile Home、Product、Cart、Login redirectを追加視認 |
| Native Runtime | Android Doctorで当初BLOCKED。Static/Componentのみ | 実機へ接続後、Build/Install/Smoke/MaestroとMCP操作を実施 |
| Native Storefront / Search | MNT-001はStaticのみ、Native Search Flowの失敗はProduct defect未確定 | Search入力条件をIME controlで分離し、Search/Product/Cartを実操作 |
| Native Checkout / Order / Review | Formal Flowの実行Evidenceが不足 | Purchase、Payment retry、Orders、ReviewをMaestro-MCPで実行・視認 |
| Native Admin / iOS | Current Native Scope外または保証外 | 未実行。BLOCKED / Scope外として維持 |

### MCP Availability

- Playwright-MCP: 利用可能。Browser tab、Navigate、Snapshot、Click、Type、Select、Resize、Back、Screenshot、Console確認を実行できた。
- Maestro-MCP: 利用可能。Physical Android device 354955112942476（SHV48、API 30、arm64-v8a）を検出し、Flow実行、UI inspect、Screenshot取得を実行できた。
- Androidの既定IMEは元の状態へ復元した。追加調査中に一時的にLatinIMEを有効化したが、終了時のdefault_input_methodとenabled_input_methodsは調査開始時のSharp IWnn + Google voice input構成へ戻っている。

### Android Runtime enablement evidence

- Native runbookのDoctor: Physical device、API 30、ABI arm64-v8aをPASS。
- 旧い長いWorkspace PathのBuildはCMake/Ninjaの260文字超過でFAILした。これはPath/Windows Tooling条件の失敗であり、Product挙動の失敗とは判定していない。
- 既存の短いPath aliasを使った同一HEADのRelease BuildはPASS（Gradle BUILD SUCCESSFUL、APK Verify PASS）。APK SHA-256は B6287DFE755B111F0B3F721777418DB5A5046F9E8963E8259B0C213F98C5E882。
- Install、Launch Smoke、Test Control Gate、RuntimeSuite 5/5、BoundarySuite 5/5はPASS。
- Native Search Flowは既定の日本語IMEでFAILしたが、後述のIME controlによりProduct defectとは分離した。
- Build/Install/Testの生ログおよびMaestro outputは .artifacts/native-local/20260820-074248-shortpath/ 配下の一時Artifactに残る。Reportは結果を要約し、Artifact pathだけを永続Evidenceの根拠にはしていない。

### Runtime Coverage Ledger — MCP追加分

| Platform | Area | Role | Main | Negative | Boundary | State / Persistence | Visual | Runtime Evidence |
|---|---|---|---|---|---|---|---|---|
| Web | Home / Storefront | Guest | Yes | Partial | Partial | Yes | Yes | Playwright-MCP、desktop/mobile screenshot |
| Web | Search | Guest | Yes | Yes（0件） | Partial | Yes | Yes | Playwright-MCP、P-0001、ZZZ-NOT-FOUND |
| Web | Product detail | Guest | Yes | Partial（L disabled） | Yes（M、数量5） | Yes | Yes | Playwright-MCP、Rendered control state |
| Web | Cart | Guest | Yes | Partial | Yes（数量5、送料境界） | Yes（route reload後も1件保持） | Yes | Playwright-MCP、fallback server |
| Web | Direct Admin URL | Guest | No | Yes | N/A | Yes | Yes | Playwright-MCP、/adminから/loginへredirect |
| Web | Responsive | Guest | Yes | Partial | Mobile viewport | Yes | Yes | Playwright-MCP、390x844 screenshot |
| Native | Search / Product detail | Guest | Yes | Partial（IME入力条件） | Partial（サイズL在庫切れ） | Yes | Yes | Maestro-MCP、実機inspect/screenshot |
| Native | Cart / Guest checkout boundary | Guest | Yes | Yes（login required） | Yes | Yes | Yes | Maestro-MCP、Cart persisted、GuestからLogin |
| Native | Purchase / Order lifecycle | Customer | Yes | Partial | Partial | Yes | Yes | Maestro-MCP native-purchase、Orders screenshot |
| Native | Payment failure / retry | Customer | Yes | Yes | Partial | Yes（retry後完了） | Yes | Maestro-MCP native-payment-retry、31 commands PASS |
| Native | Review editor | Customer | Yes | Partial | No | Yes | Yes | Maestro-MCP native-review、本文表示と保存結果を視認 |
| Native | Admin / iOS | Admin / iOS | No | No | No | No | No | Scope外または保証外。未実行 |

LedgerのYesは該当操作とRendered UIの確認が存在することを意味し、全State・全Role・全Viewportの網羅を意味しない。

### Native Search runtime and IME separation

- Maestro-MCPでSearch画面を開き、Native Search heading、keyword input、検索ボタン、empty stateを実画面で確認した。
- 既定のSharp IWnn IMEでMCPのASCII入力 P-0001 を行うと、UI上の値は Pー０００１ に変換された。Submit後はProduct cardが表示されず、既存 native-search.yaml の native-product-card-product-basic-shirt assertionもFAILした。
- LatinIMEを一時的に有効化して同じ画面・同じ入力を実行すると、UI上の値は正確な P-0001 となり、native-product-card-product-basic-shirt、ベーシックTシャツ、P-0001、価格¥2,000、評価4.5が表示された。
- LatinIME controlでProduct detailへ進み、Mサイズ選択、在庫10点、購入上限5点、カート追加、Cart画面のM・¥2,000・送料¥500・合計¥2,500を確認した。Cartからcheckoutを押すとLogin画面へ遷移し、Guest login後にHomeへ戻ってもCart badgeと商品が維持された。
- したがって native-search.yaml のFAILは、少なくとも今回の実機条件ではIME入力変換が上流原因であり、Search Product lookup自体の失敗を直接示さない。既定IMEを使う現実の日本語入力としての期待値は別途仕様判断が必要だが、今回のMNT候補にはProduct defectとして追加しない。
- Search画面とProduct/Cart画面をScreenshotで確認した範囲では、入力、カード、サイズ、在庫、価格、追加完了、Cart summaryに明確な重なり、clipping、押下不能、誤ったVisual stateは見つからなかった。

### Native Lifecycle / Recovery runtime

- Maestro-MCPで既存 native-purchase.yaml を実行し、通常のLogin、Cart merge、Address、Payment success、Order completion、Orders表示までPASS（1 flow、47 commands）。Order screenでは注文一覧、status、order ID、価格をRendered UIで確認した。
- Maestro-MCPで既存 native-payment-retry.yaml を実行し、declined payment、processing、payment failure、Retry、Order completionをPASS（1 flow、31 commands）。最終画面は「注文完了」、注文ID、注文一覧ボタンを含み、ScreenshotでもTextとButtonの配置を視認した。
- Maestro-MCPで既存 native-review.yaml を実行し、Review editor、rating、body、保存成功メッセージをPASS（1 flow、28 commands）。Rendered ScreenshotではReview heading、rating state、body、保存成功が確認できた。
- Native payment retry後に新しいProduct/State defectは再現しなかった。Payment failure画面、Retry action、completion stateのFormal Flowと実画面状態の対応は確認できた。
- Native reviewでは、Flowの inputText: Native Maestro review が既定IMEにより別の日本語混在文字列（名地ヴぇ前st炉）として表示された。一方、LatinIME controlでMCP ASCII reviewを入力すると本文は文字列どおり表示され、保存成功した。これはAppの保存処理が常に文字列を壊す証拠ではない。

### Web Playwright-MCP runtime

- 既存exportを一時HTTP serverで配信し、Homeをdesktop相当で開いてRendered Hero、navigation、product cards、テスト環境表示を視認した。
- 既存exportを単純なPython static serverで配信した場合、/searchへの初回Direct URLは404になった。これはstatic serverがSPA fallbackを実装していないためで、Product defectとは判定していない。Homeからのclient-side Search navigationは正常に動作した。
- SPA fallback付きの一時serverでは、/search?q=P-0001を初回Direct URLで開き、1件のProduct result、Search input、Filter controls、Product cardを確認した。同じURLを再度Navigateしてreload相当を行っても、検索結果と画面構造が維持された。
- Search resultから ZZZ-NOT-FOUND を入力すると0件、empty heading、説明、条件解除buttonが表示された。ScreenshotでもEmpty cardは画面内に収まり、text overlapやbutton clippingはなかった。
- HomeからProduct detailへclient-side navigationし、Mサイズ、数量5、Cart addを実操作した。保存成功status、CartでのM・P-0001-02、小計¥2,000、送料¥500、合計¥2,500を確認した。同じOriginでCartを再Navigateしても1件と合計¥2,500が維持され、Reload後Persistenceを確認した。
- 390x844へResizeし、Home、Product、Search、CartのMobile Navigation、Hero、Input、Button、商品画像、固定Bottom navigationを視認した。今回確認した範囲では、読めない文字、主要操作の画面外逸脱、横方向の明白なoverflow、固定Navによる主要操作遮蔽は見つからなかった。
- /adminをGuestでDirect Navigateすると/loginへredirectし、メールアドレス、パスワード、Login button、学習用注意書きを視認した。Unauthenticated Admin accessの新しい矛盾は確認しなかった。
- Search emptyからBrowser Backを実行するとHomeへ戻った。今回の初期履歴とclient-side query遷移では、Search query間のBack履歴保持までは判定できず、既存Formal browser boundary coverageがあるためFindingにはしない。
- Python static serverでは/favicon.icoの404 Console errorを観測したが、SPA fallback serverではConsole error 0件だった。これは一時server／export hosting条件に依存する環境Observationであり、Product Findingにはしない。
- source Expo web serverの追加起動は実行したが、指定portをListen状態にできず、同じ条件を意味なく再試行せず停止した。MNT-004に記録済みのsource-dev/cache条件の補助Evidenceとして扱い、prebuilt/fallback serverによるRuntime確認を優先した。

### Reconciliation: MNT-001

- Previous status: observed
- Previous confidence: high
- New status: reproduced
- New confidence: high
- Reason: Android physical device上でNative Search/Product/CartのRendered UIを実操作し、Native Searchがkeyword inputと検索結果に限定され、Suggestion UI、Brand/Price filter、Pagination controlを持たないことを確認した。これは先行Static Traceで確認した同一Root Problemの実機上の挙動である。
- Additional evidence: Native Search screenのinspect、Search screenshot、Product detailのMサイズ/在庫/購入上限/Cart screenshot、LatinIME controlでのP-0001 lookup成功。既定IMEでのASCII変換とSearch Flow FAILは別の環境入力条件として分離した。
- Specification check: Storefront/SearchのNormative contractにあるAndroid Required platform、Suggestion/Filterの共通範囲、Known DeviationsにNative keyword-only縮小の記載がないことは先行Waveの確認どおり。Runtimeで縮小UIは確認できたが、Native共通契約の適用範囲を将来明文化すべき余地はAlternative explanationとして残る。
- Decision: MNT-001は削除・書き換えず、実機Runtimeで再現した候補へ更新する。Native SearchのIME failureをMNT-001のProduct failureとしては統合しない。

### MNT-005

- Detected at: 2026-08-20 MCP Native Runtime補完
- Wave: Wave 14 Finding Verification / Wave 15 Fresh-angle Runtime
- Area: Native Review formal Flow and text-entry oracle
- Category: ORACLE_FAILURE
- Severity: low
- Confidence: medium
- Status: observed
- Related specification: docs/spec/features/reviews.md のBR-REVIEW-001、BR-REVIEW-002、AC-REVIEW-001、AC-REVIEW-002。Review bodyは保存・編集対象で、1〜1000文字のvalidation対象。
- Related implementation: src/presentation/native/native-purchase-screens.tsx のNativeReviewScreen、Review create/update use case。LatinIME controlでは入力文字列がそのまま本文として表示・保存された。
- Related tests: maestro/native-review.yaml は inputText: Native Maestro review を実行するが、保存後に本文がその文字列であること、または再読込後に期待本文が残ることをassertしない。Flowの最終oracleはレビュー保存成功メッセージである。
- Related curriculum: Native Reviewの実行導線に直接対応する既存Flow。今回の追加調査では教材本文の変更は行わず、教材／Formal Flowが入力値の正確性をどこまで保証するかは未確定。
- Related CI / scripts: Maestro Native Flow実行導線、およびNative runtime test contract。今回のFlowはMCPで実行した。
- Environment: SHV48 API 30 physical device、同一HEADのRelease APK、既定IMEはSharp IWnn。比較controlではLatinIMEを一時有効化し、終了時に元へ復元した。
- Preconditions: native-review.yamlのreviewable-orders scenario reset、固定Customer login、delivered orderのreview editor表示。
- Observation: Flowは31ではなく28 commandsでPASSし、保存成功メッセージを返した。しかしFlowの入力文字列 Native Maestro review は、既定IME下のRendered inputでは名地ヴぇ前st炉のような別文字列へ変換された。Flowはこの相違を検出せずPASSした。LatinIMEでMCP ASCII reviewを入力したcontrolでは、本文は入力文字列どおり表示され、同じ保存成功メッセージが表示された。
- Expected: FlowがDeclared input literalの保存を保証する意図なら、保存後または再読込後に本文が入力値どおりであることを確認すること。意図が「空でないbodyで保存できること」だけなら、Flowのoracle範囲を明示すること。
- Actual: 保存成功だけでPASSし、IME変換による本文の相違を見逃す。
- Reproduction steps: (1) 既定IMEでnative-review.yamlをMaestro-MCP実行。(2) Review bodyのRendered UIをinspect/screenshot。(3) LatinIME controlでMCP ASCII reviewを入力し同じsaveを実行。(4) 両方のRendered bodyと保存結果を比較。
- Reproduction count: Default IMEでのFlow PASSと本文相違を1回観測。LatinIME controlを1回実行し、AppがASCII literalを保持できることを確認。同一条件の反復は不要と判断。
- Evidence: Maestro-MCP Flow result success=true、native-review.yamlのinputTextと最終assert、inspect_screenのReview body、MCP Screenshot、LatinIME controlの本文表示。MCP Screenshotは一時Artifactで、Reportへの要約以外に昇格していない。
- Impact: Native ReviewのFormal PASSが、入力本文の保存内容まで保証していると誤認される可能性がある。IME条件に起因する入力変換、または将来の本文mapping不具合を保存成功assertだけでは検出できない。
- User / learner / QA impact: QA learnerはFlow PASSを本文検証済みと誤解する可能性がある。Customer data corruptionを今回確認したわけではないが、Review text regressionのoracle coverageは弱い。
- Possible root cause: Flowがsuccess messageのみをoracleにしており、入力値または保存後bodyをassertしていない。既定IMEがASCII automation inputを日本語混在文字列へ変換することが、差異を可視化した。
- Alternative explanations: (a) Flowの意図はnon-empty validationとsave transitionだけで、literal保持を保証しない、(b) 日本語IMEによる変換は実利用上の意図的なcompositionであり、Flowの入力文字列は例示にすぎない、(c) Review bodyのNormative contractは自由な文字列を許容するため、今回の本文自体はProduct defectではない。
- Known deviation check: Review bodyのIME変換を正当化するKnown Deviationは未確認。Web/Native pixel parityのUnresolved questionとは別問題。
- Duplicate check: Native SearchのIME起因FAILやMNT-001のNative capability gapとは、対象oracleとRoot Problemが異なるため統合しない。MNT-002〜MNT-004のEOL、Bundle scan、Web cacheとも独立。
- Suggested follow-up: 後続Maintenance判断で、Flowの目的をliteral body保証かnon-empty save保証か確定し、必要なら入力IME precondition、body assertion、save後reload assertionの最小組合せを検討する。今回のGoalでは変更・再実装しない。
- Requires change?: maybe
- Notes: Product defect、Data integrity defect、またはIME自体の不具合とは確定しない。現時点はFormal Test oracleの不足候補としてlow/mediumで記録する。

### Visual Inspection Reconciliation

- Native: Search、Product detail、Cart、Review、Payment completionのScreenshotを確認した。主要Text、Input、size state、stock、price、status、buttonは読み取れ、明白な重なり・clipping・画像破損・押下不能は見つからなかった。
- Web: Home desktop、Search result、Search empty、Home mobile、Product size/quantity state、Cart summary、Cart reload後、Guest Admin redirectのScreenshotを確認した。モバイル固定Nav、商品画像、Empty card、Cart summaryは今回のViewportで機能を阻害していなかった。
- Visual findingは追加しない。主観的なデザイン改善ではなく、Normative/UI contractとの明確な不一致または操作阻害だけを候補化する基準を維持した。

### MCP Command / Operation Log

| 時刻 / Attempt | Operation | Result | Purpose / first meaningful result |
|---|---|---|---|
| 2026-08-20 JST / 20260820-074248-shortpath | Android Doctor、Release Build、Install、Smoke | PASS | Physical device runtime enablement。長いPathの先行Build FAILはPath/tool condition |
| 2026-08-20 JST | Maestro-MCP native-purchase.yaml | PASS、1 flow、47 commands | Customer purchase、order completion、Orders visual |
| 2026-08-20 JST | Maestro-MCP native-review.yaml | PASS、1 flow、28 commands | Review save。本文oracle不足をMNT-005へ記録 |
| 2026-08-20 JST | Maestro-MCP native-payment-retry.yaml | PASS、1 flow、31 commands | Declined payment、failure、retry、completion |
| 2026-08-20 08:20–08:26 JST | Playwright-MCP、prebuilt export、simple static server | Partial | Home/Search/Product/Cart操作は可能。Direct /searchはserver fallback不足で404 |
| 2026-08-20 08:25–08:26 JST | Playwright-MCP、同一prebuilt export、SPA fallback server | PASS | Direct Search、reload persistence、Admin redirect、Mobile screenshot、Console errors 0 |
| 2026-08-20 JST | Native IME set/enable/disable control | PASS / restored | Search literal入力の環境要因分離。既定IMEを復元 |

- 失敗を隠す目的の同一Test再実行はしていない。Native Searchの再実行は、IME環境要因を分離する明確な仮説があったため実施した。
- Playwright-MCPのScreenshot、snapshot、console outputはMCPの一時Artifactであり、Report以外の永続成果物にはしていない。Maestro-MCPのtakeScreenshotが生成した native-payment-retry-complete.png、native-purchase-complete.png、native-review-complete.png は一時的な未追跡Artifactであり、git addは行っていない。

### MCP補完フェーズのBlocked / Not Executed

- Native iOS Runtime: Current GuaranteeがBuild-onlyのため未実行。PASS扱いしない。
- Native Admin: Current Native Scope外のため未実行。
- Native全画面の全Viewport、Keyboard traversal、TalkBack相当のAccessibility、全Error/Recovery組合せ: 今回のRisk-based scopeでは未実行。既存Static/Formal coverageと今回の実機範囲を超える。
- Web authenticated Adminの追加操作、Web Payment/ReviewのMCP操作: 既存Prebuilt Formal/Cross-role/UI reviewが十分なため、同じJourneyの再実行はしなかった。Direct unauthenticated Admin boundaryだけはMCPで補完した。
- Web source Expo dev server: 追加起動は指定portをListenできず停止。source-dev startup/cache条件はMNT-004の補助Evidenceとして残し、Product defectとはしない。
- Simple static serverのDirect SPA URL 404: fallback未設定の一時server制約。SPA fallback serverで同じDirect URL、reload、console 0 errorsを確認したため、Product Findingにはしない。

### MCP補完 Coverage / Finding status

- Completed: Web Playwright-MCPのHigh-value Search、Empty、Direct URL、Reload、Cart Persistence、Responsive Visual、Guest Admin boundary。Native Maestro-MCPのSearch/Product/Cart、Purchase/Orders、Payment retry、Review、Visual inspection。
- Partially completed: Native SearchのSuggestion/Filterは実機で「存在しない」ことを確認したが、Native共通Specificationの適用範囲にはAlternative explanationが残る。Native全般のAccessibility/Responsiveは未網羅。
- Blocked / Scope外: iOS、Native Admin、全Native Accessibility。
- New material evidence: MNT-001を実機runtimeへReconcile。MNT-005をReview Flow oracle候補として追加。
- False positive / duplicate: Search Flowの既定IME FAIL、Python static serverのfavicon/SPA 404、source Expo startup failureはProduct Findingに昇格しない。既存MNT-001〜MNT-004とのDuplicateは確認しなかった。

## Final Synthesis — MCP Runtime補完

### Current candidate counts

- Maintenance Candidatesは5件。MNT-001、MNT-002、MNT-003、MNT-004はreproduced。MNT-005はobserved。
- Status counts: reproduced 4、observed 1、suspected 0、unresolved 0、false_positive 0、duplicate 0、blocked Finding 0。
- Severity counts: critical 0、high 0、medium 4、low 1、info 0。
- MNT-001は旧Final Synthesisのobserved記録を残したまま、Android実機上で同じNative capability narrowingを確認したため、今回のReconciliationでcurrent statusをreproducedとした。
- MNT-005はReviewの保存成功assertが本文literalを保証しない候補。Product defectやIME defectとは確定せず、low/mediumのORACLE_FAILUREとして保持する。

### Runtime coverage outcome

- Playwright-MCP: 実ApplicationのHome、Search normal/empty、Product selection、Cart add/summary/reload、Guest Admin direct access、Mobile visualを確認した。既存Formal Web runtimeを単純再実行したものではない。
- Maestro-MCP: Physical Androidで実ApplicationのSearch、Product、Cart、Guest checkout boundary、Purchase/Orders、Payment failure/retry、Reviewを操作し、各主要状態のRendered UIを視認した。
- Native availabilityについて、前回Final Synthesisの「Doctor前でBLOCKED」という記録は過去時点の事実として保持する。今回のReconciliationでは、同一Goal内で後から実機が利用可能になり、Build/Install/Maestro/MCPがPASSしたことを追記した。
- Runtimeで明確な新規Product layout、state transition、authorization defectは確認しなかった。Native Search capability gapとReview oracle gapの2点だけが、今回の追加Evidenceで判断を更新した対象である。

### Remaining unknowns

- Native共通Storefront contractがSuggestion、Brand/Price filter、PaginationまでAndroidへ必須適用されるかどうかのNormative boundary。
- Native既定日本語IMEでのASCII automation inputの望ましい扱いと、Maestro Flowの入力前提。
- Native全範囲のAccessibility、Responsive boundary、長文・極端な商品名・全Error recovery。
- iOS Runtime、Native Admin Runtime、Web authenticated AdminのMCP追加操作。
- Static export hostingのSPA fallbackとfavicon assetを各CI/deployment hostでどう保証するか。今回のfallback serverはRuntime確認用の一時条件であり、CI hostの完全再現ではない。

### Suggested analysis order

1. MNT-001のNormative platform boundaryを確定し、Native keyword-onlyがintentional scopeかRegressionかを決める。
2. MNT-005のReview Flow oracleを、literal body保証かnon-empty save保証かの教材・Formal Test契約と照合する。
3. MNT-003、MNT-004、MNT-002を既存EvidenceどおりTool/Automation/Curriculum候補として優先度付けする。

### Final Source Integrity for MCP補完

- 2026-08-20 08:27 JST checkpoint: HEAD da924e0dd9764416fbe2f66ad534db7b3d9ccf40、branch docs/2026-08-20-maintenance-investigation。Initial HEADから不変。
- Report以外のtracked fileに差分はない。git diff --name-only、git diff --statはReport以外を示していない。
- Maestro-MCPのroot PNGは一時未追跡Artifactで、git add、commit、pushは行っていない。Report以外のtracked fileへの変更ではない。
- Product、Test、Specification、Curriculum、CI、Config、Script、Dependency、Seed、Fixture、Snapshot、Agent、Skill、Harness、QA Policyの修正は一切実施していない。
- Issue、PR、Repair Loop、Harness Improvement、Git mutationは実施していない。
- 次のsanitizer Write/CheckをReport-onlyで実行し、結果をこのReport末尾へ追記する。

Progress: 100% (16/16; MCP Runtime補完フェーズ完了)

### Final Source Integrity Check — MCP補完終了

- Check time: 2026-08-20 08:32:06 JST。
- HEAD: da924e0dd9764416fbe2f66ad534db7b3d9ccf40。Initial HEADおよび前回checkpointから不変。
- Branch: docs/2026-08-20-maintenance-investigation。
- git status --short --untracked-files=all は、許可されたReportとMaestro-MCPが生成した一時未追跡PNG 3件だけを表示した。これらはGit管理対象へ追加していない。
- git diff --name-only は空、git diff --statも空。Report以外のtracked fileに差分はなく、SOURCE_INTEGRITY_VIOLATIONは発生していない。
- Runtime用の一時server port 8081〜8084、8090、8091は最終確認時にListenしていない。
- Report-only Sanitizer Write/Check: files_scanned 1、files_changed 0、replacements_total 0、residual_findings 0。
- このGoalでは修正、追加テスト、Specification/Curriculum/CI変更、Snapshot/Visual promotion、Git mutationを一切実施していない。
