# Repository-wide Audit Report

## 1. Metadata

- Repository: `ryu-yoshikawa-pro-vision/qa-training-store`
- Started at JST: `2026-08-20 10:39:37 +09:00`
- Initial HEAD: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
- Initial branch: `docs/2026-08-20-maintenance-investigation`
- Audit objective: Current Repository 全体を、仕様・実装・Test・Runtime・Visual UI・CI・Documentation・Curriculum・Agent / QA Contractまで独立かつ非変更で横断監査し、後続のMaintenance Candidate解析に使えるEvidence付きFindingを作成する。
- Report path: `docs/reports/2026-08-20_103937_repository-audit.md`

## 2. Non-mutation Contract

- Product、Test、Specification、Documentation、Curriculum、CI、Config、Script、Fixture、Dependency、Generated Artifact、Agent、Skill、Harness、Git historyは変更しない。
- Repository内で新規作成・変更してよい永続ファイルは本Report 1ファイルだけとする。
- `.codex/runs/**` は新規作成・更新しない。
- Findingを発見しても修正・Issue作成・PR作成・Repair・Harness Improvementへ移行しない。
- Git操作はread-onlyに限定する。
- 本Reportはappend-onlyとし、既記録のFindingを削除・上書き・改番せず、解釈変更はReconciliationとして後方追記する。
- Secret候補は全文転記せずredactする。
- Test / Runtimeの一時成果物はGit管理外のTemporary Artifactとして扱い、正式成果物へ追加しない。

## 3. Repository Inventory

## 4. Documentation Inventory

## 5. SSOT Map

## 6. Coverage Ledger

## 7. Static Audit Log

## 8. Documentation / Specification Audit Log

## 9. Test Audit Log

## 10. CI / Config / Script Audit Log

## 11. Security / Repository Hygiene Log

## 12. Runtime / MCP Verification Log

## 13. Visual Inspection Log

## 14. Cross-layer Audit Log

## 15. Findings — Reserved

## 16. Reconciliations — Reserved

## 17. Blocked / Not Executed — Reserved

## 18. Source Integrity Log — Initial

### 2026-08-20 10:39:37 JST — Initial baseline

- `git branch --show-current`: `docs/2026-08-20-maintenance-investigation`
- `git rev-parse HEAD`: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
- `git diff --name-only`: 出力なし。
- `git diff --stat`: 出力なし。
- 開始前から存在する未追跡物: `docs/reports/2026-08-20_010734_maintenance-investigation.md`、`native-payment-retry-complete.png`、`native-purchase-complete.png`、`native-review-complete.png`。
- 上記4件は今回の監査が生成したものではなく、内容変更・移動・削除を行わない基準線として固定した。
- 監査開始時のtracked diffは0件。

## Audit Record 1 — 2026-08-20 10:58 JST — Repository / Documentation Inventory

### Repository Inventory

- `git ls-files`で確認したtracked fileは1,275件。
- 主要tracked構成: `app/` 78、`src/` 155、`tests/` 85、`e2e/` 8、`maestro/` 23、`scripts/` 79、`training/` 28、`docs/` 361、`.github/` 7、`.codex/` 387、`.agents/` 10、`public/` 12。
- Application route surfaceはWeb/Native variantを含む`app/`、Product/Application/Domain/Infrastructure/Presentation/Seed/Test Controlは`src/`に分離されている。
- Test surfaceはUnit 13、Integration 9、Component 23、Repository Contract 5、Contract 31、Runtime 1、Playwright Web 8、Formal Maestro 23、Training Playwright 3、Training Maestro 3として存在する。
- Workflowは`.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml`の3件。Training用Workflow templateは`training/github-actions/`に分離されている。
- Rootには`node_modules/`、`dist/`、`android/`、`.artifacts/`、`.expo*`、`output/`等の生成・一時領域が存在する。tracked/untracked/ignoredの分類はRepository Hygiene phaseで個別確認する。
- Generated/reference候補は`src/generated/`、`public/images/product-image-manifest.json`、`docs/spec/assets/`、`output/spec-site`生成経路、Native asset map、Visual Registry/Canonical screenshotである。
- 開始前未追跡物4件はInventory基準線から分離して保全する。

### Documentation Inventory / Classification

- `normative`: `docs/spec/product-scope.md`、`roles-and-permissions.md`、`state-and-scenarios.md`、`ui-ux-contract.md`、`docs/spec/features/**/*.md`。
- `supporting/reference`: `docs/spec/README.md`、`screen-catalog.md`、`glossary.md`、`change-process.md`、`known-deviations.md`、`unresolved-specifications.md`、`docs/reference/**`、`docs/00_overview`〜`docs/13_decisions`、`docs/guides/**`、`docs/native/**`。
- `repository / agent policy`: `AGENTS.md`、`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md`、`SECURITY.md`、`CONTRIBUTING.md`、`.agents/skills/**`、`.codex/**`のConfig/Agent/Rule/Template。
- `training`: `docs/curriculum/test-automation/**`、`training/workbook/**`、`training/playwright/**`、`training/maestro/**`、`training/github-actions/**`、`training/agentic-qa/**`。
- `decision / historical / future`: `docs/adr/**`、`docs/history/**`、`docs/plans/**`、`docs/reports/**`、`docs/future/**`、`CHANGELOG.md`、`MIGRATION.md`。
- `operational`: `.github/**/*.md|yml`、`docs/09_deployment/**`、`docs/10_operations/**`、Safety Harness/Run Artifact/Repair/QA workflow reference、package scriptsと各Config。
- Current Requirement、Future Plan、Historical Recordを混同しないため、Normative Oracle priorityを`docs/spec/README.md`記載どおり固定した。既存Reportは独立監査主要phase完了までFindingの答えとして参照しない。

### Preliminary SSOT Map

| Concern | Current SSOT |
|---|---|
| Product behavior / BR / AC | `docs/spec/`のNormative Product Behaviorとfeature BR/AC |
| Roles / permissions | `docs/spec/roles-and-permissions.md`; low-level type/policyは`src/domain/contracts/entities.ts`と`src/domain/policies/permissions.ts` |
| State / scenarios | `docs/spec/state-and-scenarios.md`; low-level type/seed/resetは記載されたExecutable Canonical Sources |
| Screens | Behavior ownershipは各Primary Normative Screen Contract、route indexは`docs/spec/screen-catalog.md`、route valueは`app/` |
| UI / UX meaning | `docs/spec/ui-ux-contract.md`; token/label/test ID等のlow-level valueは`src/presentation/`、`app/`、`docs/05_ui/` |
| Web / Native guarantee | `docs/spec/product-scope.md`と`docs/spec/features/native-customer.md`; CI implementationはNative workflows |
| Curriculum | `docs/curriculum/test-automation/**`; Product Oracleは`docs/spec/`、Workbook templateは`training/workbook/` |
| Agent behavior | `AGENTS.md`を入口とするrepo policy、各workflow entry、repo-local Skill、`.codex/config.toml` |
| QA behavior | `QA_AGENT.md`、`exploratory-qa` Skill、`docs/reference/agentic-qa-workflow.md`; machine contractは`scripts/agentic-qa/contracts.ts` |
| CI guarantee | `.github/workflows/**`とそのContract Test、package scripts、関連ADR |

### Delegation Record

- read-only subagentを4件使用: Implementation/Web/Native、Documentation/Specification/Curriculum/Agent、Tests/CI/Fixtures、Repository Hygiene/Security/Config。
- 全subagentへSource変更禁止、追加subagent禁止、旧Report/過去Runを答えとして使わない独立調査、exact path/line Evidence必須を指定した。
- Parentがrequirement interpretation、Finding採否、Runtime対象、最終validation、duplicate/false-positive判断、完成判断を保持する。
- `exploratory-qa` Skillの通常Bootstrapは`.codex/runs/<run_id>/qa-charter.json`を要求するが、ユーザーの明示的な`.codex/runs/**`変更禁止と単一Report契約を優先し、Charter/Run Artifactは作成しない。Runtime scopeとStop Conditionは本Reportとユーザー指定で管理する。

## Audit Record 2 — 2026-08-20 11:19 JST — Check-only Validation / Runtime Preflight

### Safe-command review

- `package.json`および呼出先を先に確認した。`pnpm run verify`は`build:web`経由でtracked generated fileを再生成し得るため、Non-mutation Contractに適合しないaggregateとして実行しなかった。
- 代わりに、書込みを伴わないcheck-only commandを個別実行した。Web runtime bundleはtracked generatorを呼ばない`pnpm exec expo export --platform web --output-dir .artifacts/repository-audit/web-dist`でignored temporary directoryへ出力した。
- Node `v24.12.0`、pnpm `9.10.0`。直近の同日Runにある成功baselineも確認し、同条件の無目的な再実行を避けた。

### Validation result

| Command / scope | Result | Evidence summary |
|---|---|---|
| `pnpm run format:check` | PASS | writeなし。 |
| `pnpm run lint:markdown` | PASS | 298 files、0 issues。 |
| `pnpm run validate:spec` | PASS | 38 screens、58 important states、56 required states。 |
| `pnpm run validate:spec-visuals:final` | PASS | 94/94 capture targets、pending 0、blocked 0、6,605,598 bytes。 |
| `pnpm run validate:curriculum` | PASS | 22 curriculum docs、4 workbook templates、Training configを検証。 |
| `pnpm run lint` | PASS with baseline warnings | 0 errors、64 warnings。警告数は直近成功baselineと一致。 |
| `pnpm run typecheck` | PASS | app、Native component tests、Training TypeScript。 |
| `pnpm run validate:image-manifest` | PASS | 現在のmanifest validation contract内で整合。 |
| `pnpm run security:check` | PASS | runtime 233 files、credential scan 319 files。実値candidateなし。 |
| `pnpm run validate:eas:config` | PASS | EAS schema/contract。 |
| Native route dependency validation | PASS | 38 routes。 |
| Unit | PASS | 66/66。 |
| Repository Contract | PASS | 33/33。Node SQLite experimental warningのみ。 |
| Web Component | PASS | 76/76。 |
| Native Component | PASS | 49/49。既知のReact `act(...)` warningを観測。 |

### Failure classification / information-gain stop

- Integration full runは98件中1件、`many-products` seed caseが10秒timeout。Resource-heavy suiteを並列実行した条件だったため、同testを既定timeoutのまま単独再確認し1/1 PASS（test time 3.49秒）。Product/fixture defectではなく、初回は監査側の並列resource contentionによるEnvironment Failureとして扱う。
- Contract full runは396件中391件PASS、5件timeout。`codex-hook-contract.test.ts`を単独再確認して69/70 PASS、quote/backslash/LF/CRLF stdin semantics caseが5秒timeout（5.175秒）。同一異常が2回連続したため再試行を停止した。
- `android-visual-capture-batch.test.ts`を単独再確認して4/6 PASS、2件が既定5秒timeout（5.035秒、5.006秒）。fixture setupが25枚の1080x1920 PNG生成とmanifest検証をtest単位で行うこと、Vitest global `testTimeout`設定がないことを確認した。同工程の追加再試行はInformation Gainがないため停止した。
- 上記Contract timeoutはCurrent Windows runtimeで単独再現したため、Test Quality / Flake Finding候補として実装・CI・baselineとの関係を再確認する。FAILをProduct Bug扱いしていない。

### Temporary Web runtime

- `pnpm exec expo export --platform web --output-dir .artifacts/repository-audit/web-dist`: PASS、2,297 modules、5,045 files、約170,760,568 bytes。Metro cache deserialize失敗後にfull crawlへ安全にfallbackし、exportは成功したため再実行していない。
- temporary distを`http://127.0.0.1:8091`で配信し、Playwright CLIのpersistent headed sessionからHomeを直接表示した。
- 初回semantic snapshotでmain/footer、商品card、search、navigationを確認。初回rendered screenshotでも読不能、overlap、操作不能は未観測。Desktop/Mobile、検索、認証validation、role/direct URL、状態遷移は後続の直接操作対象とする。
- Console初回観測は自動要求された`/favicon.ico`の404が1件。明示favicon契約の有無とUser impactを確認するまでFindingにはしない。

### Source Integrity checkpoint

- `git diff --name-only`: 出力なし。
- `git diff --stat`: 出力なし。
- `git status --short`: 開始前未追跡4件と今回の単一Reportだけ。tracked sourceの変更は0件。
- `.artifacts/`、`.playwright-cli/`等のtemporary outputはignore対象であり、正式成果物へ追加していない。

## Audit Record 3 — 2026-08-20 11:32 JST — Runtime / Visual Verification

### Tool availability

- Playwright MCPそのものはcallable toolとして公開されていなかったため、同じreal Chromiumを操作するRepository既定のPlaywright CLI persistent sessionを使用した。Semantic snapshot、DOM state、Console、直接操作、rendered screenshotを組み合わせ、既存E2Eの再実行だけで代替しなかった。
- Maestro MCPはcallable toolとして公開されていなかった。RepositoryのNative Runbook／Skillに従い、Windows Android local helper、Maestro CLIの既存証跡、ADBによる直接route操作とscreenshotで確認した。
- Android DoctorはPASS: Node 24.12.0、pnpm 9.10.0、Java/SDK/ADB、Maestro 2.8.0、USB physical device、API 30、arm64 runtime。Device serialはReportへ保存しない。
- iOSはWindows hostに`xcodebuild`／Simulator経路がなく、Current guaranteeもBuild-onlyであるためRuntime／VisualをBLOCKEDとして扱う。Remote GitHub Actionsは起動していない。

### Web Runtime Coverage Ledger

| Platform | Area | Role | Main | Negative | Boundary | State | Visual | Evidence |
|---|---|---|---|---|---|---|---|---|
| Web Desktop 1440×1000 | Home / Search suggestion | customer | Home render、Suggestion selection→Product | 2文字入力後のpopover state | query `セラ` / `Scenario` | async load、keyboard open | yes | screenshot、ARIA state、option count |
| Web Desktop 1440×1000 | Login | guest | form render | empty submit | required fields | Error Summary→field focus | yes | semantic snapshot、screenshot |
| Web Desktop 1440×1000 | Authorization | customer | login | `/admin` direct URL | customer role | `/forbidden` redirect | semantic | URL＋heading |
| Web Desktop 1440×1000 | Product / Cart | customer | Product追加→Cart | — | pre-existing item + added item | reload persistence | yes | item count、Cart screenshot |
| Web Mobile 390×844 | Home / Search | customer | Home、Search、Filter open | — | responsive | mobile nav、collapsed filter | yes | scrollWidth、screenshot |
| Web Small Mobile 320×700 | Home | customer | Home | — | minimum responsive boundary | vertical page end path | yes | `scrollWidth == innerWidth`、screenshot |

### Web observations

- Desktop Home、Login validation、Cart、Mobile Home/Search/Filterのrendered UIを実際に視認した。Element overlap、読不能、broken image、unusable control、viewport外の水平overflowは確認しなかった。
- Login empty submitは「入力内容を確認してください」のSummary、email/password修正linkを表示し、emailへfocusした。これはProduct behaviorとして正常だが、Normative state metadataのScenario名とは不一致であり、静的Finding候補をRuntimeで裏付けた。
- regular customer login後に`/admin`へ直接遷移すると`/forbidden`へredirectされ、「このページを表示する権限がありません」を表示した。確認したcross-role境界は正常だった。
- Product追加後のCartは2 item、合計¥4,000を表示し、reload後も追加したitemが残った。Current viewer/cart persistenceは確認範囲で正常。
- Home headerのasync Suggestionは、通常のtyping後700ms時点でも`aria-expanded=false`、option 0だった。一方で`ArrowDown`後は同じ既取得queryから`セラ`で1 option、`Scenario`で3 brand optionsが即時表示され、選択遷移も成功した。別queryで2回再現したため、2文字入力だけではSuggestionを見せないProduct Bug Candidateとして再確認対象にした。
- Browser consoleの最終error/warningは0。初回だけbrowserのimplicit `/favicon.ico` requestに404を観測したが、明示ContractとUser impactを欠くためFinding化しない。

### Native Runtime Coverage Ledger

| Platform | Area | Role | Main | Negative | Boundary | State | Visual | Evidence |
|---|---|---|---|---|---|---|---|---|
| Android physical API 30 | Search | guest | direct route launch | empty keyword | Native capability surface | empty prompt | yes | ADB route＋fresh screenshot |
| Android physical API 30 | Catalog | guest | direct route launch | — | filter/sort surface | current default catalog | yes | ADB route＋fresh screenshot |
| Android physical API 30 | Runtime baseline | guest/customer | Control/Runtime/Boundary | not-found/out-of-stock/limits | persistence and stock | same-day evidence review | yes | current local APK evidence |

### Native observations / blocker classification

- Current physical device上でfreshに`scenario-shop://search`を開き、画面にKeyword fieldとSearch buttonだけがあることを視認した。Suggestion、Brand、価格、Facet、Pagination controlはない。
- `scenario-shop://products`をfreshに開き、Keyword、sort、在庫、Sale、最低評価のcontrolはある一方、Brand／価格／Pagination UIがないことを視認した。静的request固定値と一致する。
- 同日local artifactのRuntime 5/5とBoundary 5/5は成功していた。Native Search 1 flowは`native-product-card-product-basic-shirt`未出現で1/1 FAILし、Hierarchyはunfiltered productsを示した。端末で有効なIMEはSharp日本語IMEとVoice inputだけでLatinIMEがなく、Runbook既知条件どおりASCII入力保持を保証できない。これは`DEVICE_FAILURE`／IME environmentとして扱い、同条件のFlowを繰り返さなかった。
- 上記Search flow failureはNative capability欠落Findingの直接原因とは扱わない。UI surfaceとUse CaseがSuggestion/Brand/価格/Pageを公開しない事実は、IMEと独立してfresh visual＋static cross-layer evidenceで確認した。
- Android screenshot、Doctor log等は`.artifacts/repository-audit/`または`.artifacts/native-local/`にのみ保存し、Reportには要約だけを記録した。

### Runtime Source Integrity checkpoint

- `git diff --name-only`: 出力なし。
- `git diff --stat`: 出力なし。
- tracked source変更は0件。Browser/ADB操作はApplication local stateとignored temporary evidenceだけを変更した。

## Audit Record 4 — Delegated investigation adoption and cross-layer candidate set

### Delegation results

- `implementation_audit` はNative Catalog actor固定、Web Dexie Cart item所属検証欠落、Checkout結果RouteのURL kind依存、Native Customer route guard欠落、Native Search/Facet差分をread-onlyで指摘した。Parentは対象ファイル・Normative Specification・既存Testを再読し、REP-001〜REP-006として採用または統合した。
- `docs_spec_curriculum_audit` はDesign TokenのSSOT差分、Phase 1文書のCurrent Native境界不鮮明、iOS Workflow教材のdrift、Authentication visual stateのScenario不一致を指摘した。Parentは現行Workflow・ADR・Spec・Runtime evidenceを照合し、REP-007〜REP-010として採用した。
- `tests_ci_audit` はContract timeout候補、Flow J conditional assertion、Training expected-failure wrapper bypass、E2E設計文書とCIの差分、Generated image manifestの再生成／drift検出境界、Training action tag、Native push trigger、Agentic QA preparationのCI接続を指摘した。Parentは安全なcheck-only commandと既存結果を再確認し、REP-011〜REP-018のうち独立Root Causeだけを採用した。
- `repository_hygiene_audit` はCredential実値なし、主要生成物／一時物のtracked混入なし、`.gitignore`は概ね整合、root直下の既存Native PNGとmanual image helperのorphan候補を指摘した。Parentはroot PNGのみ、ユーザー所有の事前存在untracked artifactとしてREP-019へ記録し、helperはDynamic/manual CLIの代替説明が残るためFinding化しなかった。
- Delegated childはSource、Test、Document、Configを変更せず、追加subagentも起動していない。既存ReportやRun Artifactを結論のSSOTとして先行利用していない。

### Cross-layer synthesis before formal findings

- Normative StorefrontはWeb/Native共通のViewer条件、Facet、価格、Sale、在庫、評価、Paginationを要求する。一方、Native bootstrapはGuest actorを固定し、Native UIはBrand／価格／Paginationを送信・表示しない。
- Normative CheckoutはPayment／Order stateと所有者境界を要求するが、Webの結果画面はURLの`kind`、Native CompleteはorderIdの有無だけで表示を決める。
- Web runtimeではSearch suggestion、Checkout result direct URL、Login validationを操作して、Static候補と画面表示を独立に再確認した。Android physical runtimeではCatalog/Search/Customer route/Checkout direct URLをADB deep linkで確認し、Rendered screenも視認した。
- Static quality gatesの大半はPASSしたが、Contract suiteの5秒既定timeout異常とAgentic QA deterministic preparationのpatch apply failureは、Product behaviorとは別の品質／運用リスクとしてFinding化した。

## 15. Findings — Audit Results

### REP-001

- Detected at: 2026-08-20 12:40 JST
- Audit area: Native implementation / Web-Native consistency / roles and permissions
- Category: WEB_NATIVE_CONTRADICTION
- Severity: high
- Confidence: high
- Status: repository_verified
- Primary artifact: `src/bootstrap/native-runtime.ts`
- Related artifacts: `src/application/native/guest-storefront.ts`; `src/infrastructure/database/sqlite/native-customer-repositories.ts`; `src/application/use-cases/catalog-use-cases.ts`
- Related specification: `docs/spec/product-scope.md`; `docs/spec/features/storefront.md`; `docs/spec/features/native-customer.md`; `docs/spec/roles-and-permissions.md`
- Related implementation: `native-runtime.ts:102,111,132`; `guest-storefront.ts:53-70`; `native-customer-repositories.ts:101,290,734`
- Related tests: `tests/repository-contract/native-customer-shared.test.ts`; `tests/component/native/`
- Related CI: `.github/workflows/native-ci.yml` Native static/component/runtime jobs
- Related documentation: `docs/PROJECT_CONTEXT.md` current Native Customer scope
- Related curriculum: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- Platform: Android Native; same Native application path is shared by iOS builds
- Environment: Static current HEAD; Android physical API 30 visual route confirmation
- Preconditions: Customer session exists and customer has Gold/Platinum rank-restricted catalog access
- Observation: `NativeCustomerSQLiteRepository` is constructed, but `new GuestActorResolver()` is always passed to `CatalogUseCases`. The Native catalog gateway checks only `viewer.kind` and then calls repository methods without forwarding the viewer. Repository visibility uses `product.requiredRank === null`, and Native DTO prices are mapped with `membershipRank: null`/guest price.
- Expected: `docs/spec/product-scope.md` includes Native Customer Storefront, and `BR-STOREFRONT-001/003` require the current Viewer rank to determine visibility and price. A logged-in Gold/Platinum customer should observe and purchase the same rank-eligible catalog semantics as Web.
- Actual: The Native catalog path always evaluates catalog/search/detail as Guest even when a customer session is persisted. Rank-restricted products such as `product-running-shoes` and `product-premium-bag` cannot be surfaced through the customer viewer path and customer pricing is not applied.
- Reproduction steps: 1) Trace `native-runtime.ts` from `storefrontRepository` to `GuestActorResolver`; 2) trace `CatalogUseCases` to `createNativeCustomerCatalogGateway`; 3) inspect gateway omission of `viewer`; 4) inspect repository `requiredRank` and viewer price mapping; 5) compare with Web Dexie viewer mapping at `cart-checkout-repositories.ts:346-347,441`.
- Reproduction count: Static trace reproduced across three independent implementation files; no source mutation
- Runtime verification: Native Catalog route was launched fresh and guest surface was observed. A rank-specific customer login was not promoted to PASS because the physical device's Japanese IME could not reliably enter the seeded ASCII credential; the static actor path is deterministic and independent of that IME limitation.
- Visual verification: Yes. Fresh Native Catalog screenshot shows guest catalog controls and no evidence of rank-specific customer pricing/visibility.
- Evidence: `src/bootstrap/native-runtime.ts:102-111,132`; `src/application/native/guest-storefront.ts:53-70`; `src/infrastructure/database/sqlite/native-customer-repositories.ts:101,290,734`; `src/seeds/default-dataset.ts:85-130,731-753`; `.artifacts/repository-audit/native/native-catalog-screen.png`
- Impact: Web and Native no longer describe the same current customer catalog capability.
- Product impact: Rank-gated products and rank price behavior are unavailable or incorrect in Native Customer flow.
- User impact: Gold/Platinum Native customers can receive a guest-like catalog and may be unable to discover or buy entitled products.
- QA impact: Guest-only Native contracts can pass while customer rank regressions remain invisible.
- Developer impact: Session resolution and catalog actor resolution appear connected but are actually separate, increasing repair ambiguity.
- Learner impact: Curriculum teaches Web/Native shared behavior while the Native runtime silently applies Guest semantics.
- CI / Operational impact: Existing Native Runtime/Contract suites do not establish a customer-rank Native assertion.
- Possible root cause: Native bootstrap retained `GuestActorResolver` from the guest-only adapter while adding persisted customer sessions.
- Alternative explanations: Native Customer may intentionally be guest-only; rejected because Product Scope, Native Customer BR, and common Storefront BR explicitly include Customer and Viewer rank behavior.
- Known deviation check: No matching intentional Native rank deviation was found in `docs/spec/known-deviations.md` or `docs/spec/unresolved-specifications.md`.
- Intentional behavior check: Native Admin and Guest Checkout are intentionally excluded, but Native Customer catalog is not excluded.
- Duplicate check: Not a duplicate of REP-003; REP-001 is actor/session rank resolution, REP-003 is missing Native filter/pagination UI.
- Suggested follow-up: Trace Native session-aware actor resolution from login through CatalogUseCases and add an explicit Gold/Platinum Native contract/runtime case before changing implementation.
- Requires change?: yes
- Notes: This is a current cross-layer behavior candidate, not a conclusion based only on prior reports.

### REP-002

- Detected at: 2026-08-20 12:42 JST
- Audit area: Checkout / payment state / direct URL handling / Web-Native consistency
- Category: PRODUCT_BUG_CANDIDATE
- Severity: high
- Confidence: high
- Status: reproduced
- Primary artifact: `src/presentation/pages/checkout-order-pages.tsx`
- Related artifacts: `src/presentation/native/native-purchase-screens.tsx`; `src/application/use-cases/checkout-order-use-cases.ts`
- Related specification: `docs/spec/features/checkout-and-payment.md`; `docs/spec/state-and-scenarios.md`; `docs/spec/features/orders.md`
- Related implementation: Web `checkout-order-pages.tsx:517-581`; Native `native-purchase-screens.tsx:995-1053`
- Related tests: `tests/component/checkout-order-pages.test.tsx:259-279`; `tests/component/native/native-purchase-screens.test.tsx`
- Related CI: Chromium E2E matrix in `.github/workflows/ci.yml`; Native Android Runtime in `.github/workflows/native-ci.yml`
- Related documentation: `docs/spec/features/checkout-and-payment.md` direct-result and state-boundary contracts
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`; `part2/07_ci-cd-quality-gates.md`
- Platform: Web and Android Native
- Environment: Local Web dist on `127.0.0.1:8091`; Android physical API 30
- Preconditions: Authenticated Web customer with seeded `order-paid` and `order-payment-failed`; Native route opened without an orderId
- Observation: Web `OrderResultContent` loads an order but selects heading, symbol, retry block, and explanation solely from the URL `kind`; it does not compare `state.value.orderStatus` with `kind`. Native Complete renders success for any route and optional orderId; Native Failed loads the order but does not reject a non-failed status before rendering failure/retry.
- Expected: Direct result URLs must verify the order owner and actual payment/order state before showing success or failure. Native Complete must not claim an order completion when no valid orderId/state exists.
- Actual: Web `/checkout/failed?orderId=order-paid` displayed `支払いを完了できませんでした` for a paid order. Web `/checkout/complete?orderId=order-payment-failed` displayed `ご注文が完了しました` for a failed order. Native `scenario-shop://checkout/complete` displayed `注文完了` with no orderId and no order lookup.
- Reproduction steps: Web 1) navigate to `/checkout/failed?orderId=order-paid`; 2) observe order number `ORD-20260701-0002` and failed heading; 3) navigate to `/checkout/complete?orderId=order-payment-failed`; 4) observe success heading and order detail link. Native 5) launch `scenario-shop://checkout/complete`; 6) observe success screen without order ID.
- Reproduction count: Web two opposite-state direct URLs reproduced once each; Native no-order route reproduced once
- Runtime verification: Reproduced with Playwright CLI snapshots and Android ADB deep link. No database or source reset was performed.
- Visual verification: Yes. Web failed-result screenshot and Native no-order Complete screenshot were visually inspected; both show a coherent but semantically false state.
- Evidence: `src/presentation/pages/checkout-order-pages.tsx:517-581`; `src/presentation/native/native-purchase-screens.tsx:995-1053`; Playwright snapshots for the two direct URLs; `.artifacts/repository-audit/web/web-paid-order-failed-route.png`; `.artifacts/repository-audit/native/native-checkout-complete-no-order.png`
- Impact: A user can be shown a payment outcome that contradicts the persisted Order/Payment state.
- Product impact: Success/failure result integrity and retry affordance are wrong for direct navigation or stale/shared links.
- User impact: Customer may believe payment failed and retry a paid order, or believe a failed order completed.
- QA impact: Component failure-page test uses a paid default fixture and asserts failure presentation, masking the missing state assertion.
- Developer impact: Route `kind` is treated as a trusted state input even though `orderStatus` is available.
- Learner impact: Training examples can teach URL-driven result assertions rather than state-driven verification.
- CI / Operational impact: Existing normal checkout path can pass because processing route chooses the correct result before the direct URL boundary is exercised.
- Possible root cause: Result pages were implemented as presentational variants and never added a state-kind consistency guard.
- Alternative explanations: A direct result URL may be considered test-only; rejected because the current spec explicitly defines reload/direct state boundaries and the links are reachable product routes.
- Known deviation check: No intentional deviation found.
- Intentional behavior check: Test payment is intentionally deterministic, but deterministic outcomes still must agree with the persisted state.
- Duplicate check: Not a duplicate of REP-006; REP-002 is result-state integrity, REP-006 is customer authorization boundary.
- Suggested follow-up: Define a single state-aware result resolver for Web and Native, add opposite-state and missing-order negative cases, and review retry idempotency.
- Requires change?: yes
- Notes: No payment was executed during direct URL verification.

### REP-003

- Detected at: 2026-08-20 12:45 JST
- Audit area: Native Storefront / Facet / Pagination / Web-Native consistency
- Category: WEB_NATIVE_CONTRADICTION
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `src/presentation/native/native-screens.tsx`
- Related artifacts: `src/infrastructure/database/sqlite/native-customer-repositories.ts`; `src/application/use-cases/catalog-use-cases.ts`; `src/presentation/pages/catalog-list-page.tsx`
- Related specification: `docs/spec/product-scope.md:18-22`; `docs/spec/features/storefront.md:5,13-15,65,72-74,147-155,212-222`
- Related implementation: `native-screens.tsx:117-230,238-280`
- Related tests: `tests/repository-contract/native-customer-shared.test.ts`; `tests/contracts/shared-customer-repository-suite.ts`; `tests/contracts/native-test-control-maestro.test.ts`
- Related CI: Native component/static/runtime jobs; no Native UI assertion for Brand/price/pagination was found
- Related documentation: `docs/PROJECT_CONTEXT.md:97,102`
- Related curriculum: `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`; `part2/06_native-ci-maestro.md`
- Platform: Android Native; iOS build-only surface is not runtime-verified
- Environment: Android physical API 30 fresh Catalog and Search routes
- Preconditions: Open `/products` or `/search` in Native
- Observation: Native Catalog sends `brandIds: []`, `minimumPrice: null`, `maximumPrice: null`, fixed `page: 1`, `pageSize: 20`; the UI renders only keyword, four sort chips, stock/sale/rating chips, and product cards. Native Search sends the same empty brand/price filters and renders only keyword plus Search.
- Expected: Current Storefront scope and `BR-STOREFRONT-002` require Keyword, Category, Brand, price, inventory, Sale, minimum rating, deterministic total/page/facet behavior. Product List and Search default states are required on Android.
- Actual: Native has no Brand selector, minimum/maximum price controls, Facet counts, or page navigation. The UI cannot express all current common Storefront filters and cannot navigate beyond the fixed first page.
- Reproduction steps: 1) launch `scenario-shop://products`; 2) inspect visible controls and screen hierarchy; 3) launch `scenario-shop://search`; 4) inspect visible controls; 5) compare request literals in `native-screens.tsx` with the common application request contract.
- Reproduction count: Static request/UI trace plus fresh visual screenshots
- Runtime verification: Fresh Android Catalog and Search routes were launched and captured. The Native Search Flow's ASCII-input failure was separately classified as IME environment failure and is not used as the cause here.
- Visual verification: Yes. `.artifacts/repository-audit/native/native-catalog-screen.png` and `native-search-screen.png` show the reduced control surfaces.
- Evidence: `docs/spec/features/storefront.md:13-15,65,72-74,147-155,212-216`; `src/presentation/native/native-screens.tsx:117-230,238-280`; `src/infrastructure/database/sqlite/native-customer-repositories.ts:166-251`; screenshots above
- Impact: Native user cannot perform the same product discovery/filter journey described as common current behavior.
- Product impact: Brand/price filtering, facet-driven refinement, and multi-page catalog exploration are unavailable in Native UI.
- User impact: Customers may fail to find a product or cannot narrow a large catalog.
- QA impact: Repository contracts prove adapter capability but do not prove the Native presentation exposes it.
- Developer impact: Application request fields suggest feature support while the UI hard-codes empty/null values.
- Learner impact: Web/Native parity claims in the curriculum are misleading for Storefront exploration.
- CI / Operational impact: Existing Maestro search validates keyword input and one known product, not filter/pagination coverage.
- Possible root cause: Native first-pass screen was intentionally implemented as a reduced UI while the common contract and Product Scope were later expanded.
- Alternative explanations: Android may intentionally omit some advanced facets; no such platform exception was recorded, and Android Product List/Search states are marked required.
- Known deviation check: `docs/spec/known-deviations.md` does not list this omission.
- Intentional behavior check: iOS runtime exclusion is intentional, but Android Native Storefront omission is not documented as intentional.
- Duplicate check: REP-001 concerns rank actor resolution; this Finding is limited to UI/request surface.
- Suggested follow-up: Decide an explicit platform scope or implement/contract Brand, price, facet, and pagination behavior; add Android UI coverage for the chosen contract.
- Requires change?: yes
- Notes: The underlying Native SQLite adapter already accepts the missing request fields, so this is not merely a backend capability gap.

### REP-004

- Detected at: 2026-08-20 12:47 JST
- Audit area: Web Search UX / async state / accessibility interaction
- Category: PRODUCT_BUG_CANDIDATE
- Severity: medium
- Confidence: high
- Status: reproduced
- Primary artifact: `src/presentation/components/search-combobox.tsx`
- Related artifacts: `src/presentation/shells/storefront-shell.tsx`; `src/infrastructure/database/dexie/storefront-repositories.ts`
- Related specification: `docs/spec/features/storefront.md:23,147-155`
- Related implementation: `search-combobox.tsx:45-72,81`
- Related tests: `tests/component/presentation-foundation.test.tsx:58-90`
- Related CI: Chromium E2E and UI Review jobs in `.github/workflows/ci.yml`
- Related documentation: `docs/05_ui/validation_and_messages.md:19`
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- Platform: Web desktop and responsive Web
- Environment: Local Web dist, Chromium headed session at 1440×1000
- Preconditions: Search input has at least two characters and async suggestion loader returns results
- Observation: Component loads suggestions after a 150ms timer and updates `items`, but uses `menuTrigger="input"`. After normal typing, `aria-expanded` remained false and the popover contained zero options even after the result promise completed. Pressing ArrowDown then exposed the already loaded options.
- Expected: `BR-STOREFRONT-002` and the UI contract state that two or more characters provide up to eight suggestions that a pointer/touch/keyboard user can discover without a second unrelated interaction.
- Actual: Suggestions are not discoverable after ordinary typing; the user must press ArrowDown before the popover opens. Enter while collapsed routes to a search page instead of selecting a visible suggestion.
- Reproduction steps: 1) focus header combobox; 2) type `セラ`; 3) wait 700ms; 4) inspect `aria-expanded` and option count; 5) press ArrowDown; 6) observe one option and select it. Repeat with `Scenario` and observe three brand options only after ArrowDown.
- Reproduction count: Two independent queries, both reproduced
- Runtime verification: Playwright CLI real browser; ARIA snapshot and selection navigation captured
- Visual verification: Yes, collapsed/no-popover state and post-ArrowDown popover were inspected at desktop and the Search filter was visually inspected at mobile
- Evidence: `src/presentation/components/search-combobox.tsx:45-72,81`; `tests/component/presentation-foundation.test.tsx:66-90` (test always presses ArrowDown); browser snapshots under `.playwright-cli/`
- Impact: Async suggestion feature exists but is hidden during the common typing path.
- Product impact: Search discovery and direct product/category navigation degrade to an extra unexplained key action.
- User impact: Mouse/touch users may see no suggestions and may assume search is not working.
- QA impact: Existing component test opens the menu with ArrowDown and therefore does not cover the default post-typing state.
- Developer impact: Async data readiness and popup-open state are not coupled.
- Learner impact: Search suggestion acceptance criteria can appear green while the primary interaction is broken.
- CI / Operational impact: Existing E2E covers product search journeys but not an assertion that the async popover opens after typing alone.
- Possible root cause: React Aria menu trigger remains input-driven while items are updated asynchronously after the ComboBox input event.
- Alternative explanations: Keyboard-first design could require ArrowDown; spec and touch-oriented responsive guarantee do not state that requirement.
- Known deviation check: None found.
- Intentional behavior check: No documented intentional delayed-open behavior found.
- Duplicate check: Independent from Native Search omission in REP-003.
- Suggested follow-up: Add a post-async-load open-state contract for keyboard, pointer, and touch flows, then update the component/E2E test to start from ordinary typing.
- Requires change?: yes
- Notes: Browser console had no final errors/warnings; this is a behavior/state issue, not a console error.

### REP-005

- Detected at: 2026-08-20 12:50 JST
- Audit area: Web persistence / Cart repository contract / ownership validation
- Category: REPOSITORY_CONTRACT_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `src/infrastructure/database/dexie/cart-checkout-repositories.ts`
- Related artifacts: `src/application/use-cases/cart-use-cases.ts`; `src/infrastructure/database/sqlite/native-customer-repositories.ts`
- Related specification: `docs/spec/features/cart.md:5,17-23,76-80`; `docs/spec/roles-and-permissions.md`
- Related implementation: Dexie `cart-checkout-repositories.ts:216-250,256-271`; Native SQL `native-customer-repositories.ts:460-465`
- Related tests: `tests/repository-contract/repositories.test.ts`; `tests/repository-contract/native-customer-shared.test.ts`
- Related CI: Web component/repository/contract suites; no negative foreign-item mutation contract identified
- Related documentation: `docs/PROJECT_CONTEXT.md:59,394`
- Related curriculum: `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
- Platform: Web Dexie persistence; Native comparison path included
- Environment: Static current HEAD; no user data mutation performed
- Preconditions: A caller supplies a valid active cartId and an itemId belonging to another cart
- Observation: Dexie update and delete load `this.db.carts.get(input.cartId)` and `this.db.cart_items.get(input.itemId)` independently, validate versions, then mutate the item without checking `currentItem.cartId === currentCart.id`. Native SQL explicitly selects `WHERE id = ? AND cart_id = ?`.
- Expected: Cart mutation must be scoped to the active owned cart; an item from another cart must be rejected as not found/forbidden and must not be changed or deleted.
- Actual: A foreign item record can pass the Dexie repository's entity/version checks and be updated or deleted while the requested cart is merely touched.
- Reproduction steps: 1) construct two cart records and one item under cart B in a Dexie test DB; 2) call `setQuantityAndTouchCart` with cart A id and item B id/version; 3) observe no cartId relationship assertion in the code path; 4) compare Native SQL predicate.
- Reproduction count: Static trace; no mutation test executed because audit is non-invasive
- Runtime verification: Not executed; UI never supplies a foreign ID in normal path, so direct repository contract is the high-value verification.
- Visual verification: Not applicable
- Evidence: `src/infrastructure/database/dexie/cart-checkout-repositories.ts:216-250,256-271`; `src/infrastructure/database/sqlite/native-customer-repositories.ts:460-465`; `src/application/use-cases/cart-use-cases.ts:151-214`
- Impact: Web and Native persistence adapters enforce different ownership boundaries.
- Product impact: Malformed/stale/local storage or test-control input could mutate an item outside the requested cart.
- User impact: Normally low likelihood because UI sends current item IDs, but stale tabs or corrupted local data can produce cross-cart mutation.
- QA impact: Positive Cart tests can pass while the ownership negative path remains unprotected.
- Developer impact: Adapter behavior diverges silently; future callers may assume the Native predicate exists in Web.
- Learner impact: Repository contract examples do not expose the missing relationship invariant.
- CI / Operational impact: Local Dexie data corruption is difficult to diagnose because the operation may return success.
- Possible root cause: Web implementation validates entity/version but omitted the relational ownership predicate present in SQL.
- Alternative explanations: The application use case always resolves the active cart and UI item list; this limits normal exploitability but does not remove repository contract risk.
- Known deviation check: No intentional Web-only exception found.
- Intentional behavior check: No.
- Duplicate check: Not a duplicate of Native rank or checkout findings.
- Suggested follow-up: Add a non-mutating repository contract test for foreign item IDs and align Web predicate/error semantics with Native.
- Requires change?: yes
- Notes: This Finding is about local persistence integrity, not server authorization.

### REP-006

- Detected at: 2026-08-20 12:52 JST
- Audit area: Native route guards / role authorization / direct URL boundary
- Category: PRODUCT_BUG_CANDIDATE
- Severity: medium
- Confidence: high
- Status: reproduced
- Primary artifact: `src/presentation/native/native-shell.tsx`
- Related artifacts: `app/account/profile.native.tsx`; `app/account/addresses.native.tsx`; `app/orders/index.native.tsx`; `src/presentation/native/native-purchase-screens.tsx`
- Related specification: `docs/spec/roles-and-permissions.md`; `docs/spec/features/authentication.md`; `docs/spec/features/native-customer.md`; `docs/spec/state-and-scenarios.md`
- Related implementation: `native-shell.tsx:60-153`; route files delegate directly to screen components
- Related tests: `tests/component/native/native-purchase-screens.test.tsx`; Native route dependency contract
- Related CI: Native component and Maestro routes
- Related documentation: `docs/PROJECT_CONTEXT.md:91,97`
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`; `part2/06_native-ci-maestro.md`
- Platform: Android Native
- Environment: Android physical API 30, guest session after logout
- Preconditions: No current customer session; open a Customer-only deep link directly
- Observation: Shell blocks non-customer roles after a session is loaded, but does not block a guest (`currentUser === null`). Customer screen components then call services and render an `auth.required` error instead of redirecting to login or an explicit unauthorized boundary.
- Expected: Direct Customer-only URLs should apply the same role/authorization boundary as Web: guest→login or safe entry, non-customer→forbidden/unsupported, and no Customer screen should execute as an unauthenticated guest.
- Actual: `scenario-shop://account/profile` as guest rendered the Profile screen's generic `Profileを読み込めませんでした` / `auth.required` panel while the shell header still exposed Cart/Login. This is an error state, not a route-level guard.
- Reproduction steps: 1) log out through Native header; 2) launch `scenario-shop://account/profile`; 3) wait for runtime; 4) inspect heading/error and absence of login redirect.
- Reproduction count: One fresh guest direct-route reproduction
- Runtime verification: Android ADB deep link and fresh screenshot; no source or seed reset
- Visual verification: Yes. `.artifacts/repository-audit/native/native-profile-direct-url-guest.png` shows the generic error panel.
- Evidence: `src/presentation/native/native-shell.tsx:60-65,137-153`; `app/account/profile.native.tsx`; `.artifacts/repository-audit/native/native-profile-direct-url-guest.png`
- Impact: Native authorization boundary is inconsistent with Web and with the explicit Customer-only route contract.
- Product impact: Unauthorized route access reaches screen service logic and produces an implementation error instead of a safe navigation state.
- User impact: Guest sees a confusing technical error instead of a login action.
- QA impact: Route tests that start from navigation controls may miss direct deep-link behavior.
- Developer impact: Each Customer screen may need its own auth failure handling, duplicating boundary logic.
- Learner impact: Role/permission training differs by platform.
- CI / Operational impact: Existing Native flows usually begin from supported navigation and do not cover guest direct Customer links.
- Possible root cause: Shell only treats loaded non-customer roles as unsupported and assumes router entry controls prevent guest direct access.
- Alternative explanations: Native may intentionally allow guest screen mount and rely on service errors; no such deviation is documented and the result is not user-recoverable without manual navigation.
- Known deviation check: None found.
- Intentional behavior check: Native Admin exclusion is intentional; Customer route guest error is not listed as an accepted boundary.
- Duplicate check: Distinct from REP-002 result state and REP-001 catalog actor.
- Suggested follow-up: Establish a Native route guard policy for guest/non-customer and add deep-link negative cases for profile, addresses, orders, and checkout.
- Requires change?: yes
- Notes: The observed error string is a service error key and is not treated as a credential disclosure.

### REP-007

- Detected at: 2026-08-20 12:55 JST
- Audit area: Normative specification / visual registry / Authentication scenario
- Category: SPEC_CONTRADICTION
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `docs/spec/features/authentication.md`
- Related artifacts: `src/seeds/metadata.ts`; `src/seeds/scenarios.ts`; `e2e/web/ui-review.spec.ts`; `docs/spec/assets/screens/SCREEN-AUTH-LOGIN/validation-error/web-desktop.webp`
- Related specification: `docs/spec/features/authentication.md:34-35`
- Related implementation: `src/seeds/scenarios.ts:144-146`; Login form validation implementation
- Related tests: `e2e/web/ui-review.spec.ts:847-853`; Login component tests
- Related CI: UI Review matrix in `.github/workflows/ci.yml`
- Related documentation: `docs/05_ui/validation_and_messages.md:20-22`
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- Platform: Web desktop visual contract
- Environment: Static current HEAD plus local Web browser
- Preconditions: Evaluate the `SCREEN-AUTH-LOGIN/validation-error` state and its named scenario
- Observation: Normative table declares the Login `validation-error` state condition as `storage-write-failure`, whose scenario metadata sets `failNextWrite: true`. The visual capture setup instead opens `/login` and submits an empty form, exercising required-field validation before any storage write. Runtime empty submit correctly produced the required-field Summary and email focus.
- Expected: State slug, scenario/setup, expected UI, and visual artifact should describe the same failure path. A storage-write failure should show the storage/transaction failure contract, while required-field validation should have a separate state or an explicit alias.
- Actual: The same `validation-error` artifact is labeled as storage-write-failure but is generated by an empty-submit validation path. The current visual/runtime result is valid for required-field validation, not evidence for storage-write failure recovery.
- Reproduction steps: 1) inspect `authentication.md` state row; 2) inspect `storage-write-failure` scenario metadata and `failNextWrite`; 3) inspect UI Review setup at `ui-review.spec.ts:847-853`; 4) submit empty Login in browser and observe required-field Summary/focus.
- Reproduction count: Cross-document contradiction verified once; runtime behavior independently observed
- Runtime verification: Empty-submit path reproduced in Playwright; the storage-failure path was not promoted to PASS because its setup is absent from the visual capture.
- Visual verification: Yes. Login validation screenshot and rendered Summary/focus were inspected.
- Evidence: `docs/spec/features/authentication.md:34-35`; `src/seeds/metadata.ts:394-398`; `src/seeds/scenarios.ts:144-146`; `e2e/web/ui-review.spec.ts:847-853`; `.playwright-cli/` snapshot
- Impact: Visual evidence and acceptance review can be incorrectly considered proof of the wrong failure mode.
- Product impact: The product's actual storage-write recovery remains unclear; current required-field UX itself appeared usable.
- User impact: Low direct impact for empty input; high ambiguity when storage write fails.
- QA impact: False-positive visual coverage for `storage-write-failure` and missing negative coverage for actual persistence failure.
- Developer impact: A later implementation may satisfy the wrong state because the slug and setup disagree.
- Learner impact: Scenario-driven QA training teaches the wrong precondition/evidence mapping.
- CI / Operational impact: Visual Review can pass while the named scenario is not exercised.
- Possible root cause: State row was repointed to a storage scenario while the existing capture callback remained an empty-submit smoke setup.
- Alternative explanations: The state slug may be intended as a generic validation-error alias; no alias or informative-only marker is documented.
- Known deviation check: No matching deviation or unresolved specification entry found.
- Intentional behavior check: Required-field validation is intentional, but its label as storage failure is not explained.
- Duplicate check: Independent from REP-008 token drift.
- Suggested follow-up: Split required-field and storage-write failure states or make the state contract explicitly alias both setup paths, then add a real failNextWrite capture/assertion.
- Requires change?: yes
- Notes: This Finding does not claim the observed empty-submit UX is itself defective.

### REP-008

- Detected at: 2026-08-20 12:58 JST
- Audit area: Documentation SSOT / Design system / UI contract
- Category: DOCUMENTATION_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `docs/05_ui/design_system.md`
- Related artifacts: `docs/spec/README.md`; `docs/spec/ui-ux-contract.md`; `src/presentation/design/tokens.ts`; `src/presentation/styles/global.css`
- Related specification: `docs/spec/README.md:33`; `docs/spec/ui-ux-contract.md:9,21`
- Related implementation: `src/presentation/design/tokens.ts:2-53`
- Related tests: Visual/spec validators and UI Review screenshot contracts
- Related CI: `validate:spec-visuals:final`, UI Review matrix
- Related documentation: `docs/05_ui/design_system.md:44-46,87-95,142-156`
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`; `02_competency-rubric.md`
- Platform: Web and Native design documentation
- Environment: Static current HEAD
- Preconditions: A developer, learner, or reviewer needs concrete token values
- Observation: Normative SSOT map says Design Token low-level values come from code/config, and `ui-ux-contract.md` points readers to `src/presentation/design/tokens.ts` and `docs/05_ui/`. The two sources disagree materially: documented radius medium/large 8/12 vs code 10/16; documented text/action/focus colors `#0F172A/#1D4ED8/#7C3AED` vs code `#111827/#111827/#2563EB`; documented 360/600/900/1280 breakpoints vs current UI contract 767/768/1024; documented 1:1 product image vs code product-card ratio 4/5.
- Expected: One labeled current token source, with noncanonical references explicitly marked or regenerated, so implementation, visual review, and curriculum use the same values.
- Actual: `docs/05_ui/design_system.md` has no historical/noncanonical banner while `ui-ux-contract.md` links it as a concrete reference. A reader can select values that contradict the executable canonical code.
- Reproduction steps: 1) read SSOT boundary in `docs/spec/README.md`; 2) read `ui-ux-contract.md`; 3) compare `docs/05_ui/design_system.md` tables with `tokens.ts`; 4) compare breakpoint text in the two documents.
- Reproduction count: Four independent token families cross-checked
- Runtime verification: Not needed for the documentation contradiction; current Web/Native screenshots were visually inspected elsewhere.
- Visual verification: Indirect; screenshots reflect code tokens, not the stale table values.
- Evidence: `docs/spec/README.md:33`; `docs/spec/ui-ux-contract.md:9,21`; `docs/05_ui/design_system.md:44-46,87-95,142-156`; `src/presentation/design/tokens.ts:2-53`
- Impact: Design decisions and review verdicts can depend on which document was consulted.
- Product impact: Future UI work may introduce visual inconsistency or unintended token changes.
- User impact: Potential inconsistent color, spacing, radius, ratio, and responsive behavior across future screens.
- QA impact: Visual review may flag implementation as wrong or accept a drifted implementation depending on oracle selection.
- Developer impact: SSOT exception is documented but the linked low-level reference remains contradictory.
- Learner impact: Design-system exercises can produce values that fail current screenshot/implementation checks.
- CI / Operational impact: Validators verify structural references, not semantic equality between design table and code token object.
- Possible root cause: Code token values were updated during UI work without updating the earlier design-system reference.
- Alternative explanations: `docs/05_ui` may be intended as an older informative baseline; it is not labeled as such and remains linked from the current contract.
- Known deviation check: No known-deviation entry explains these differences.
- Intentional behavior check: Platform-specific Native conversion does not explain Web token contradictions.
- Duplicate check: Not a duplicate of REP-009 legacy Phase boundary.
- Suggested follow-up: Choose and label one current token oracle, reconcile concrete values, and add a validation or generated-reference policy for future drift.
- Requires change?: yes
- Notes: This is a documentation/SSOT risk; it is not a claim that every current screenshot is visually defective.

### REP-009

- Detected at: 2026-08-20 13:01 JST
- Audit area: Documentation boundary / historical versus current specification
- Category: DOCUMENTATION_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `docs/08_testing/e2e_design.md`
- Related artifacts: `docs/spec/product-scope.md`; `docs/spec/features/native-customer.md`; `docs/PROJECT_CONTEXT.md`; `.github/workflows/native-ci.yml`
- Related specification: `docs/spec/product-scope.md:13-18`; `docs/spec/features/native-customer.md:1-24`
- Related implementation: Native routes and `.github/workflows/native-ci.yml`
- Related tests: Native component/contract/Maestro suites
- Related CI: `.github/workflows/native-ci.yml` PR Native CI; `.github/workflows/ci.yml` Web CI
- Related documentation: `docs/08_testing/e2e_design.md:7-12,31-35,61`
- Related curriculum: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- Platform: Repository-wide Web/Native QA contract
- Environment: Static current HEAD
- Preconditions: A reader uses testing design documents to determine current required scope
- Observation: `docs/08_testing/e2e_design.md` states Phase 1 has 12 required Web E2E, mobile runs on main, and Native/Maestro are future Phase 2 excluded from Phase 1 Gate. Current Product Scope includes Android Native Customer as a current guarantee, Native CI is PR-triggered, and Project Context records Native runtime/contract gates as current.
- Expected: Current versus historical design should be clearly separated, or the document should be updated to the current Native and CI contract.
- Actual: The document is a current-looking `docs/08_testing` design with no historical label or supersession link. It can direct reviewers/learners to the wrong gate count, trigger, and Native status.
- Reproduction steps: 1) read `docs/08_testing/e2e_design.md`; 2) inspect Product Scope and Native CI triggers; 3) compare current `package.json` E2E scripts and CI matrix; 4) confirm no explicit historical banner in the design document.
- Reproduction count: Three independent boundary differences verified
- Runtime verification: Not required; current CI/static contracts provide the contradiction.
- Visual verification: Not applicable
- Evidence: `docs/08_testing/e2e_design.md:7-12,31-35,61`; `docs/spec/product-scope.md:13-18`; `.github/workflows/native-ci.yml:1-12`; `docs/PROJECT_CONTEXT.md:97,111,250`
- Impact: QA gate interpretation and scope selection differ by document.
- Product impact: Native current behavior may be treated as future or unguaranteed.
- User impact: Indirect; implementation and validation work can omit current Native paths.
- QA impact: Wrong required test count/trigger can create false confidence about regression coverage.
- Developer impact: Maintainers may update the wrong suite or reintroduce obsolete Phase 1 boundaries.
- Learner impact: Exercises may teach a retired architecture as current.
- CI / Operational impact: Manual/main/PR scheduling expectations are inconsistent.
- Possible root cause: Original Phase 1 E2E design was retained after Native Phase 2 promotion without a historical marker.
- Alternative explanations: The document could be intentionally historical; repository structure and wording do not identify it as historical.
- Known deviation check: No superseded-by link or migration note in the document.
- Intentional behavior check: iOS Build-only and Native Admin exclusion are intentional but do not justify saying all Native is future.
- Duplicate check: REP-010 is specifically curriculum iOS trigger drift; REP-009 is broader current/historical boundary drift.
- Suggested follow-up: Add explicit `Historical`/`Superseded` classification and link to the current E2E/Native gate SSOT, or reconcile the document.
- Requires change?: yes
- Notes: This does not treat a different test count alone as a defect; the finding is the unmarked current-boundary contradiction.

### REP-010

- Detected at: 2026-08-20 13:04 JST
- Audit area: Curriculum ↔ CI / iOS Native gate
- Category: CURRICULUM_GAP
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- Related artifacts: `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`; `.github/workflows/native-ios-ci.yml`; `.github/workflows/native-ci.yml`; `docs/adr/0011-native-ci-ios-build-only-gate.md`
- Related specification: `docs/spec/product-scope.md:13`; ADR-0011 Decision 1/3
- Related implementation: `.github/workflows/native-ios-ci.yml:4-11`; `.github/workflows/native-ci.yml:1985-1992`
- Related tests: `tests/contracts/native-ci-workflow.test.ts`
- Related CI: Reusable iOS workflow is called by Native CI and its result is required by `native-ci / verify`
- Related documentation: `docs/PROJECT_CONTEXT.md:250,260-266`
- Related curriculum: `part2/06_native-ci-maestro.md:36-42,234`; `part2/08_integration-design-capstone.md:14-22,288`
- Platform: iOS Native CI
- Environment: Static current HEAD; Windows host cannot execute iOS
- Preconditions: Learner uses the curriculum to classify iOS trigger and Required Gate status
- Observation: Curriculum says `native-ios-ci.yml` is `workflow_dispatch` only, manual Build-only baseline, and not automatically included in PR Required Gate. Current workflow exposes `workflow_call` and `workflow_dispatch`; Native CI calls it for Native changes, and final verify requires `native-ios` result. ADR-0011 explicitly says top-level `native-ci / verify` requires the reusable iOS Build-only Gate.
- Expected: Curriculum must describe the current reusable-workflow/final-gate contract, while retaining the Build-only/no-runtime distinction.
- Actual: A learner following the curriculum can conclude iOS is manual-only and non-required when current Native CI treats both iOS builds as a required result for Native changes.
- Reproduction steps: 1) read curriculum trigger/gate text; 2) inspect `native-ios-ci.yml:on`; 3) inspect `native-ci.yml:native-ios` and `verify.needs`; 4) compare ADR-0011.
- Reproduction count: Cross-layer trigger/gate contradiction verified
- Runtime verification: Blocked by Windows iOS toolchain; static workflow/ADR evidence is sufficient for the documentation drift.
- Visual verification: Not applicable
- Evidence: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md:36-42,234`; `part2/08_integration-design-capstone.md:14-22`; `.github/workflows/native-ios-ci.yml:4-11`; `.github/workflows/native-ci.yml:1985-1992`; `docs/adr/0011-native-ci-ios-build-only-gate.md:16-24`
- Impact: Curriculum classification of a quality gate is wrong for current Repository behavior.
- Product impact: No direct runtime product impact; Native CI assurance can be misunderstood.
- User impact: Indirect learner/operator impact.
- QA impact: iOS build gate may be omitted from a learner's required-check design or incorrectly treated as optional.
- Developer impact: Workflow changes may be evaluated against obsolete acceptance expectations.
- Learner impact: High risk of practicing the wrong trigger/Required Gate model.
- CI / Operational impact: Documentation and branch protection expectations can diverge.
- Possible root cause: Curriculum was written before ADR-0011 changed iOS from manual-only to reusable Build-only gate.
- Alternative explanations: The curriculum may intentionally present an earlier baseline for comparison; the text does not label it as historical in these sections.
- Known deviation check: ADR-0011 is accepted and current; no curriculum supersession note found.
- Intentional behavior check: iOS Runtime/Maestro remaining out of scope is intentional and not the finding.
- Duplicate check: REP-009 covers broader legacy boundary; this Finding is the iOS gate-specific drift.
- Suggested follow-up: Update curriculum trigger/gate wording and explicitly retain the Build-only versus Runtime distinction.
- Requires change?: yes
- Notes: No iOS runtime PASS is inferred from the workflow; this is a static contract comparison.

### REP-011

- Detected at: 2026-08-20 13:10 JST
- Audit area: Contract tests / timeout / flake risk
- Category: AUTOMATION_FLAKE
- Severity: medium
- Confidence: high
- Status: reproduced
- Primary artifact: `tests/contracts/codex-hook-contract.test.ts`
- Related artifacts: `tests/contracts/android-visual-capture-batch.test.ts`; `vitest.config.ts`; `package.json`
- Related specification: Repository contract and visual capture contract in `docs/PROJECT_CONTEXT.md`
- Related implementation: `.codex/hooks/pre_tool_use_policy_windows.ps1`; `scripts/spec/android-visual-capture.ts`
- Related tests: `tests/contracts/codex-hook-contract.test.ts:441-481`; `tests/contracts/android-visual-capture-batch.test.ts:36-96,284-329`
- Related CI: `package.json:test:contracts`; `.github/workflows/ci.yml` Vitest/Contracts job
- Related documentation: `docs/PROJECT_CONTEXT.md:228,230`
- Related curriculum: `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md`
- Platform: Windows local contract execution; CI cross-platform risk
- Environment: Windows Node 24 / Vitest default 5s test timeout
- Preconditions: Run the formal contract suite with default Vitest timeout and one worker
- Observation: Full Contract run reached 391/396 and reported a Windows launcher stdin semantics case at about 5.175s against the 5s default timeout. Isolated rerun reproduced the same timeout abnormality twice. The Android visual batch contract also showed two default-timeout failures at about 5.0s while creating 25 1080×1920 PNG fixtures; its isolated run reached 4/6 before the timeout condition.
- Expected: Contract tests should complete deterministically under the official `test:contracts` command, or expensive fixture cases should have an explicit, evidence-based timeout and bounded resource budget.
- Actual: Host scheduling/fixture generation can turn a contract assertion into a timeout; the suite then reports failure without identifying whether the contract or the test budget is at fault.
- Reproduction steps: 1) run `pnpm run test:contracts`; 2) record first timeout; 3) run only the affected file with `--no-file-parallelism --maxWorkers=1`; 4) observe same 5s-boundary behavior; stop after repeated same signal per audit policy.
- Reproduction count: Full suite plus isolated rerun; Android batch failures observed in same contract phase
- Runtime verification: Test runner only; no product runtime implication inferred
- Visual verification: Not applicable; fixture PNGs are generated for contract validation only
- Evidence: command output summarized in Audit Record 2; `vitest.config.ts` has no explicit timeout; `tests/contracts/codex-hook-contract.test.ts:466-481`; `tests/contracts/android-visual-capture-batch.test.ts:36-96`; `package.json:24-26`
- Impact: Formal contract gate can be flaky or slow under supported Windows execution.
- Product impact: None directly established.
- User impact: Indirect developer/learner feedback delay.
- QA impact: False negative CI/local result and temptation to rerun or loosen assertions.
- Developer impact: Timeout origin is ambiguous and may hide real regression behind resource variability.
- Learner impact: Contract practice can fail before the intended assertion is evaluated.
- CI / Operational impact: Required quality gate may fail near a fixed 5s boundary; repeated reruns consume CI time.
- Possible root cause: Subprocess/PowerShell launcher startup and 25-image Sharp fixture generation exceed Vitest default timeout on Windows.
- Alternative explanations: Host load or antivirus/filesystem contention; both are environment-sensitive, so this is a flake candidate rather than Product Bug.
- Known deviation check: No per-test timeout or resource note found.
- Intentional behavior check: Finite timeout behavior is intentional, but the test budget is not documented for these expensive cases.
- Duplicate check: This combines one root class (timeout budget) across two contract files, not two independent findings.
- Suggested follow-up: Measure stable p95 by host/CI, set narrowly scoped timeout or reduce fixture cost, and preserve failure diagnostics without disabling the contract.
- Requires change?: yes
- Notes: The 97/98 Integration result was separately isolated to PASS and is not included here as a Product finding.

### REP-012

- Detected at: 2026-08-20 13:13 JST
- Audit area: Playwright E2E assertion quality / cross-role lifecycle
- Category: TEST_QUALITY_RISK
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `e2e/web/ui-ux-improvements.spec.ts`
- Related artifacts: `e2e/web/cross-role-lifecycle.spec.ts`; `src/application/use-cases/admin-operations-use-cases.ts`
- Related specification: `docs/08_testing/e2e_design.md:31-35`; cross-role lifecycle expectations
- Related implementation: Admin order transition controls
- Related tests: `ui-ux-improvements.spec.ts:335-348`
- Related CI: `test:e2e:chromium` in `.github/workflows/ci.yml` and CI Chromium matrix
- Related documentation: `docs/PROJECT_CONTEXT.md:62,77`
- Related curriculum: `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- Platform: Web Chromium
- Environment: Static test review; no test mutation
- Preconditions: Run Flow J under `cross-role-product-lifecycle` scenario
- Observation: Flow J checks `count()` for the `発送準備を開始` button and only clicks/asserts the transition if the count is nonzero. If the button is absent, the test continues to login and assert only that the customer order heading is visible.
- Expected: The cross-role flow must assert the expected precondition and shipment transition, or explicitly classify the scenario as already transitioned with a separate assertion.
- Actual: A missing start-transition control can yield a passing Flow J without validating inventory/order shipment progression.
- Reproduction steps: 1) inspect Flow J source; 2) note conditional `if (await ...count())`; 3) observe no `else` failure or state assertion; 4) compare the named flow's lifecycle purpose.
- Reproduction count: Static control-flow trace
- Runtime verification: Existing current E2E was not rerun solely to force the branch; no need to repeat a passing journey without new information.
- Visual verification: Not applicable
- Evidence: `e2e/web/ui-ux-improvements.spec.ts:335-348`; `docs/08_testing/e2e_design.md:31-35`; `docs/PROJECT_CONTEXT.md:77`
- Impact: Cross-role regression can be silently skipped while the test reports PASS.
- Product impact: None directly proven; key lifecycle coverage is weak.
- User impact: Indirect.
- QA impact: False-positive risk / false negative regression detection.
- Developer impact: A missing control caused by fixture or UI regression is not distinguished from an already-transitioned state.
- Learner impact: Teaches conditional assertions as a substitute for a state contract.
- CI / Operational impact: CI can show green while the core Flow J transition is unverified.
- Possible root cause: Test was made tolerant of pre-transitioned seed state without adding a mutually exclusive already-transitioned assertion.
- Alternative explanations: The scenario may intentionally allow both pre/post states; no explicit state assertion documents that choice.
- Known deviation check: No exception in E2E design found.
- Intentional behavior check: Conditional branching may be intentional for idempotence, but omission of the else assertion remains a test quality risk.
- Duplicate check: Independent from REP-011 timeout and REP-014 documentation count drift.
- Suggested follow-up: Make Flow J state-aware: require exactly one allowed initial state, assert the transition or explicit already-transitioned state, and keep fixture reset deterministic.
- Requires change?: yes
- Notes: This is a test-quality Finding, not a claim that the current Product shipment transition is broken.

### REP-013

- Detected at: 2026-08-20 13:17 JST
- Audit area: Training workflow / package script / expected-failure evidence contract
- Category: SCRIPT_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `training/github-actions/training-ci.yml`
- Related artifacts: `scripts/training/run-expected-failure.ts`; `package.json`; `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- Related specification: Training workflow contract and intentional-failure artifact boundary
- Related implementation: `scripts/training/run-expected-failure.ts:5-56`
- Related tests: `scripts/training/workflow-contract.ts`; curriculum validator
- Related CI: Training workflow template line 59; active Training Copy derives from this template
- Related documentation: `training/github-actions/README.md`; `docs/PROJECT_CONTEXT.md:395-398`
- Related curriculum: `docs/curriculum/test-automation/part2/05_playwright-ci.md:206`
- Platform: GitHub Actions Training Web
- Environment: Static current HEAD
- Preconditions: Run Training workflow with `mode: expected-failure`
- Observation: Package script `training:web:check-expected-failure` invokes a wrapper that removes the evidence directory, runs the intentional failure, and requires nonzero exit plus `.zip`, `.png`, `.webm`, `.html` evidence. The Training workflow instead runs raw `pnpm run training:web:expected-failure` and uploads evidence with `if-no-files-found: warn`.
- Expected: The workflow that teaches/guarantees the evidence contract should call the wrapper or explicitly assert equivalent evidence and fail closed.
- Actual: Raw test failure may satisfy the workflow step while missing or incomplete evidence is only a warning. The documented command and package-level contract are bypassed.
- Reproduction steps: 1) inspect package scripts; 2) inspect wrapper evidence checks; 3) inspect workflow command/upload condition; 4) compare curriculum instruction.
- Reproduction count: Static caller-to-wrapper trace
- Runtime verification: Not run because it would intentionally execute a known failing exercise and generate disposable output; source trace is conclusive.
- Visual verification: Not applicable
- Evidence: `package.json:39-40`; `scripts/training/run-expected-failure.ts:5-56`; `training/github-actions/training-ci.yml:57-64`; `docs/curriculum/test-automation/part2/05_playwright-ci.md:206`
- Impact: Training green/red result no longer guarantees the artifact lesson it claims to teach.
- Product impact: None to production product.
- User impact: Learner/instructor evidence can be incomplete without a failed job.
- QA impact: False-positive Training validation and missing artifact regression.
- Developer impact: Two similarly named scripts have materially different guarantees.
- Learner impact: The exercise can demonstrate intentional failure without demonstrating trace/screenshot/video/HTML collection.
- CI / Operational impact: `if-no-files-found: warn` masks missing evidence.
- Possible root cause: Workflow was authored against the raw Playwright command while the wrapper was added later.
- Alternative explanations: The workflow may intentionally teach the raw command first; it is the active Training template and the curriculum specifically names the wrapper for evidence.
- Known deviation check: No documented exception found.
- Intentional behavior check: Expected failure itself is intentional; missing evidence masking is the risk.
- Duplicate check: Independent from REP-011 formal contract timeout.
- Suggested follow-up: Align workflow command with wrapper or duplicate its evidence checks, then keep raw command as an explicitly lower-level exercise only.
- Requires change?: yes
- Notes: No training command was executed during this audit to avoid intentional failure artifacts beyond the existing temporary scope.

### REP-014

- Detected at: 2026-08-20 13:21 JST
- Audit area: E2E design / package scripts / CI trigger matrix
- Category: DOCUMENTATION_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `docs/08_testing/e2e_design.md`
- Related artifacts: `docs/PROJECT_CONTEXT.md`; `package.json`; `e2e/web/`; `.github/workflows/ci.yml`
- Related specification: Current E2E and CI assurance described in Project Context
- Related implementation: Playwright project definitions in `playwright.config.ts`
- Related tests: `e2e/web/phase1-required.spec.ts`; `ui-ux-improvements.spec.ts`; `accessibility.spec.ts`; `mobile-boundary.spec.ts`; `cross-role-lifecycle.spec.ts`; `ui-review.spec.ts`
- Related CI: `.github/workflows/ci.yml:304-437,490-556`
- Related documentation: `docs/08_testing/e2e_design.md:7-35`; `docs/PROJECT_CONTEXT.md:50,62,77`
- Related curriculum: `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- Platform: Web E2E and UI Review
- Environment: Static current HEAD
- Preconditions: Reader needs to know required E2E count and trigger
- Observation: E2E design states 12 Phase 1 required flows, mobile on main, and cross-role lifecycle on main/weekly. Current repository has 14 tests in the Chromium aggregate (Phase 1 plus Flow A-J), a separate PR Chromium matrix entry for accessibility, mobile-boundary, and cross-role, and PR UI Review across four viewports. Project Context also describes Flow A-J and PR connections.
- Expected: A single current E2E inventory should state count, project, trigger, and whether a suite is formal, visual, cross-role, or training.
- Actual: The design document gives an older count/trigger model without current/superseded labeling. CI executes broader PR coverage than the document describes.
- Reproduction steps: 1) read `docs/08_testing/e2e_design.md`; 2) inspect `package.json` E2E scripts and `playwright.config.ts` projects; 3) inspect CI matrix entries; 4) compare Project Context current summary.
- Reproduction count: Count, mobile trigger, cross-role trigger, and UI Review trigger differences verified
- Runtime verification: Not required; package/config/CI trace is direct.
- Visual verification: UI Review matrix was statically traced; targeted Web screenshots were captured elsewhere.
- Evidence: `docs/08_testing/e2e_design.md:7-35`; `package.json:28-38`; `playwright.config.ts:31-80`; `.github/workflows/ci.yml:304-437,490-556`; `docs/PROJECT_CONTEXT.md:62,77`
- Impact: Reviewers cannot infer the current required test surface from the design document alone.
- Product impact: No direct product behavior defect established.
- User impact: Indirect QA/release assurance impact.
- QA impact: Wrong suite selection, stale count assumptions, and misunderstanding of PR versus main coverage.
- Developer impact: Test additions may be placed in a retired trigger class.
- Learner impact: E2E planning exercises use obsolete numbers and scheduling examples.
- CI / Operational impact: Documentation drift can cause false “CI gap” or false “extra coverage” conclusions.
- Possible root cause: E2E design was not updated after UI Review, cross-role, mobile boundary, and Flow A-J were connected to PR CI.
- Alternative explanations: The document may be intended as a historical design baseline; it lacks a historical label or link.
- Known deviation check: No supersession metadata found.
- Intentional behavior check: Different CI jobs for cost/reliability are intentional; the Finding is the undocumented drift.
- Duplicate check: REP-009 covers Native/Phase boundary; this Finding is Web E2E count/trigger drift.
- Suggested follow-up: Refresh the current E2E inventory and explicitly classify the older 12-flow model as historical or design baseline.
- Requires change?: yes
- Notes: No test was rerun solely to count cases; inventory and workflow trace are deterministic.

### REP-015

- Detected at: 2026-08-20 13:25 JST
- Audit area: Generated artifact / image manifest / build and CI drift detection
- Category: GENERATED_ARTIFACT_DRIFT
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `scripts/generate-image-manifest.ts`
- Related artifacts: `src/generated/product-image-manifest.ts`; `public/images/product-image-manifest.json`; `config/product-image-assets.json`; `scripts/validate-image-manifest.ts`; `package.json`
- Related specification: Generated asset/source boundary in `docs/PROJECT_CONTEXT.md:355,407-410`
- Related implementation: `generate-image-manifest.ts:37-93`; `validate-image-manifest.ts:29-94`
- Related tests: `tests/contracts/image-manifest.test.ts`; image manifest validation
- Related CI: `.github/workflows/ci.yml:116,236,290`; Native workflows only diff-check native asset map, not product-image manifest
- Related documentation: `docs/PROJECT_CONTEXT.md:359,407`
- Related curriculum: `docs/curriculum/test-automation/part1/09_specification-agentic-qa.md`
- Platform: Web and Native generated asset consumers
- Environment: Static current HEAD; `build:web` was run in a disposable dist target and succeeded
- Preconditions: A developer edits config/assets or hand-edits a generated manifest before CI/build
- Observation: `build:web` always runs `generate:image-manifest`, which overwrites tracked TypeScript and JSON generated outputs before export. CI invokes `build:web` in automation and production jobs, then verifies `dist/index.html`, but does not compare the generated files to Git after generation. Validator checks JSON metadata, file hash/size, config entry identity/path/active flag, and seed references; it does not compare the TypeScript output byte-for-byte with JSON/config or detect a pre-build tracked diff.
- Expected: Source config, generated outputs, generator, and CI should make drift explicit; a generated-file mismatch should fail before build/test artifacts replace the evidence.
- Actual: CI can normalize or overwrite generated output during build and still pass, while a stale tracked TypeScript output or unreviewed generator change is not surfaced as a drift failure. Current generated files were in sync at audit time.
- Reproduction steps: 1) inspect `package.json:59-62`; 2) inspect generator write targets; 3) inspect validator comparison scope; 4) inspect CI build steps for post-generation `git diff`; 5) confirm current `validate:image-manifest` PASS does not prove TypeScript/JSON byte equality.
- Reproduction count: Static source→generator→validator→CI trace
- Runtime verification: Disposable `pnpm exec expo export --platform web --output-dir .artifacts/repository-audit/web-dist` succeeded after generator/validator; no tracked output was changed.
- Visual verification: Generated images were not visually rebaselined; existing validation reported 94/94 visual references valid.
- Evidence: `package.json:59-62`; `scripts/generate-image-manifest.ts:37-93`; `scripts/validate-image-manifest.ts:29-94`; `.github/workflows/ci.yml:236-249,290-299`; `src/generated/product-image-manifest.ts`; `public/images/product-image-manifest.json`
- Impact: Generated/source drift can be hidden by the same build step intended to validate it.
- Product impact: A stale or incorrect image manifest could reach dist/native consumers if generator/config assumptions diverge.
- User impact: Potential wrong image metadata, alt text, tags, or asset availability.
- QA impact: PASS of the validator/build does not prove the committed generated TypeScript output was reviewed or synchronized.
- Developer impact: A source diff can be overwritten during local/CI build, complicating review and reproducibility.
- Learner impact: Generated artifact lineage is harder to demonstrate.
- CI / Operational impact: Build jobs verify output existence, not generated-source cleanliness.
- Possible root cause: Generator is treated as a build prerequisite rather than a checked source-generation step.
- Alternative explanations: Generated files may be intentionally regenerated on every build; that does not provide a drift audit or review signal.
- Known deviation check: No explicit “generated files are always overwritten and not reviewed” policy found.
- Intentional behavior check: Native asset generation has a separate diff guard; the product-image manifest does not.
- Duplicate check: Not a duplicate of REP-016 action pin or REP-018 preparation failure.
- Suggested follow-up: Decide whether generated outputs are committed SSOT, then add a non-mutating generation/drift check before build and validate both output formats from the same source.
- Requires change?: yes
- Notes: Current generated artifact status was PASS; this is a prevention/detection gap, not a current stale-output claim.

### REP-016

- Detected at: 2026-08-20 13:28 JST
- Audit area: Training workflow security / repository contract
- Category: SECURITY_RISK
- Severity: medium
- Confidence: high
- Status: repository_verified
- Primary artifact: `training/github-actions/training-ci.yml`
- Related artifacts: `training/github-actions/training-native-ci.yml`; `scripts/training/prepare-training-copy.ts`; `scripts/training/validate-training-copy.ts`; `CONTRIBUTING.md`
- Related specification: `CONTRIBUTING.md:33`; `docs/PROJECT_CONTEXT.md:87,397`
- Related implementation: Training Copy scripts copy workflow templates verbatim and validate source SHA/allowlist, not remote action pin form
- Related tests: `scripts/training/workflow-contract.ts`; `tests/contracts/ci-workflow.test.ts`
- Related CI: Active production workflows use full SHA; disposable Training Copy uses template tags
- Related documentation: `training/github-actions/README.md`
- Related curriculum: `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- Platform: GitHub Actions Training Copy
- Environment: Static current HEAD
- Preconditions: `prepare-training-copy` activates the two training workflow templates
- Observation: Both Training templates use mutable action tags such as `actions/checkout@v4`, `actions/setup-java@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4`. Repository policy requires full-length commit SHA for remote actions. Training Copy preparation copies templates exactly, and validation enforces the two-file allowlist/source SHA but does not enforce action pinning.
- Expected: Disposable/Training workflows should either be explicitly exempted with a documented risk boundary or use the same full-SHA pinning contract as active workflows.
- Actual: A training copy that is described as a repository-owned active workflow set can resolve different third-party action code over time without a source diff.
- Reproduction steps: 1) inspect `CONTRIBUTING.md:33` and Project Context policy; 2) inspect both training templates; 3) inspect prepare/validate scripts for pin validation; 4) observe exact-template copy behavior.
- Reproduction count: All remote action references in both Training templates checked
- Runtime verification: Not executed; static contract is direct.
- Visual verification: Not applicable
- Evidence: `CONTRIBUTING.md:33`; `docs/PROJECT_CONTEXT.md:397`; `training/github-actions/training-ci.yml:30-62`; `training/github-actions/training-native-ci.yml:30-158`; `scripts/training/prepare-training-copy.ts:47-57`; `scripts/training/validate-training-copy.ts:65-90`
- Impact: Training CI is not reproducible or supply-chain pinned to the same standard as production CI.
- Product impact: No direct production runtime impact established; Training environment integrity is affected.
- User impact: Learner/instructor workflows may change behavior without repository changes.
- QA impact: Training results may be influenced by moving action tags.
- Developer impact: A copy can pass repository-contract validation while violating global action policy.
- Learner impact: Curriculum demonstrates a weaker security practice than the repository's own policy.
- CI / Operational impact: Remote action tag movement or compromise can break or alter Training runs.
- Possible root cause: Training templates were intentionally kept readable/tag-based and the validator only guards workflow scope/source identity.
- Alternative explanations: Training Copy may be considered disposable; the policy and README still describe it as an active repository-owned workflow set.
- Known deviation check: No explicit tag-based Training exception found.
- Intentional behavior check: Secret/deploy exclusion is intentional and does not justify mutable action references.
- Duplicate check: Not a duplicate of REP-013 expected-failure command drift.
- Suggested follow-up: Pin Training action references or document a narrowly scoped exemption and validate it explicitly.
- Requires change?: yes
- Notes: No credential or secret value was found or copied into this Finding.

### REP-017

- Detected at: 2026-08-20 13:31 JST
- Audit area: Native CI trigger / release assurance
- Category: CI_GAP
- Severity: medium
- Confidence: medium
- Status: suspected
- Primary artifact: `.github/workflows/native-ci.yml`
- Related artifacts: `.github/workflows/ci.yml`; `.github/workflows/native-ios-ci.yml`; branch protection policy not available locally
- Related specification: `docs/spec/product-scope.md:13`; Native build/runtime guarantee
- Related implementation: Native CI detect and final verify jobs
- Related tests: `tests/contracts/native-ci-workflow.test.ts`
- Related CI: Native CI `on` block and top-level Web CI `on` block
- Related documentation: `docs/PROJECT_CONTEXT.md:111,250,300`
- Related curriculum: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md:36`
- Platform: GitHub Actions Native Android/iOS
- Environment: Static current HEAD; remote GitHub settings not inspected
- Preconditions: A Native-affecting commit reaches `main` through a direct push or a path outside the PR gate
- Observation: `.github/workflows/native-ci.yml` triggers on `pull_request` and `workflow_dispatch`, but not `push`. Root Web CI triggers on `push` to `main` and has no Native job dependency. Therefore a direct/main push can run Web CI without Native Build/Runtime/iOS Gate.
- Expected: If main push is an accepted delivery path, current Native guarantee should be revalidated on push or the repository contract should explicitly forbid direct Native-affecting pushes and rely on PR required checks.
- Actual: The local workflow graph does not itself prove Native assurance after a main push; branch protection/required-check settings are outside the repository evidence.
- Reproduction steps: 1) inspect trigger blocks; 2) inspect root CI jobs and final `verify` dependencies; 3) confirm no native workflow call on root `ci.yml` push path; 4) do not push or invoke remote CI.
- Reproduction count: Static trigger graph
- Runtime verification: Blocked by no remote CI invocation and no permission to mutate/push.
- Visual verification: Not applicable
- Evidence: `.github/workflows/native-ci.yml:1-12`; `.github/workflows/ci.yml:1-12,583-620`; `docs/PROJECT_CONTEXT.md:250`
- Impact: Potential Native assurance gap at post-merge/main delivery boundary.
- Product impact: A Native regression could be present on main if direct pushes are allowed.
- User impact: Android/iOS consumers may receive changes not covered by Native gate.
- QA impact: Local/PR PASS may be mistaken for main push coverage.
- Developer impact: Trigger intent depends on external branch protection not represented in repository contract.
- Learner impact: CI trigger exercise cannot determine whether push coverage is guaranteed from repository alone.
- CI / Operational impact: Main Web CI has no Native result to fail-close.
- Possible root cause: Native workflow was designed as PR/manual only while Web CI retained main push/deploy triggers.
- Alternative explanations: Branch protection may forbid direct pushes and require Native PR checks; this external state was not available for verification.
- Known deviation check: Project Context documents PR/manual Native trigger but no explicit direct-push prohibition.
- Intentional behavior check: Manual iOS Build-only scope is intentional; missing push trigger is separate.
- Duplicate check: Not a duplicate of REP-010 curriculum drift.
- Suggested follow-up: Record branch protection as an explicit contract or add a tested push/main Native gate according to release policy.
- Requires change?: maybe
- Notes: This remains suspected rather than reproduced because no remote push was performed.

### REP-018

- Detected at: 2026-08-20 13:36 JST
- Audit area: Agentic QA preparation / Windows compatibility / required CI step
- Category: SCRIPT_DRIFT
- Severity: medium
- Confidence: high
- Status: reproduced
- Primary artifact: `tests/runtime/agentic-qa-preparation.test.ts`
- Related artifacts: `scripts/agentic-qa/prepare-challenge.ts`; `training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch`; `src/application/use-cases/auth-use-cases.ts`; `.github/workflows/ci.yml`
- Related specification: Agentic QA preparation contract in `docs/reference/agentic-qa-workflow.md` and training Agentic QA contract
- Related implementation: `prepare-challenge.ts:230-262`
- Related tests: `tests/runtime/agentic-qa-preparation.test.ts`
- Related CI: `.github/workflows/ci.yml:355-357` required preparation step
- Related documentation: `docs/PROJECT_CONTEXT.md:320,329,340`
- Related curriculum: `docs/curriculum/test-automation/part1/09_specification-agentic-qa.md`
- Platform: Windows local Agentic QA preparation; possible cross-platform patch format risk
- Environment: Windows Node 24; current source file LF, patch worktree CRLF under `core.autocrlf=true`
- Preconditions: Run `pnpm run test:agentic-qa:preparation` from this current Windows worktree
- Observation: The preparation test ran for about 262.7 seconds and failed when `git apply --check` applied `CHALLENGE-BASIC-001.patch` to `src/application/use-cases/auth-use-cases.ts`. Default `git apply --check` fails with `patch does not apply`; diagnostic `git apply --check --ignore-whitespace` passes. The preparation script invokes the strict default command and has no line-ending normalization.
- Expected: Deterministic preparation should apply the protected challenge patch on the supported Windows workflow or fail quickly with a clear compatibility classification. Required CI should not spend about five minutes before a known patch-format failure.
- Actual: Current Windows preparation cannot create the challenge runtime; the required test exits 1 after the long baseline/build phase. The patch file is CRLF while the target source is LF in the current worktree.
- Reproduction steps: 1) run `pnpm run test:agentic-qa:preparation`; 2) observe failure at `applyPatchToDisposable`; 3) run read-only `git apply --check -- training/.../CHALLENGE-BASIC-001.patch`; 4) observe failure; 5) run diagnostic `git apply --check --ignore-whitespace` and observe pass; no patch application or source write performed.
- Reproduction count: Preparation test failed once; strict `git apply --check` independently reconfirmed; repeated full test was intentionally stopped after no new information.
- Runtime verification: Agentic QA preparation runtime did not reach patched challenge; this is the blocked result.
- Visual verification: Not applicable; no patched runtime was produced.
- Evidence: Test output recorded in Audit Record 3/4; `scripts/agentic-qa/prepare-challenge.ts:230-262`; `training/agentic-qa/instructor/challenge-patches/CHALLENGE-BASIC-001.patch`; `git ls-files --eol` showing source `w/lf` and patch `w/crlf`; `.github/workflows/ci.yml:355-357`
- Impact: Deterministic Agentic QA/Training preparation is unavailable in this Windows environment and can block the Required Chromium job.
- Product impact: No product runtime defect established.
- User impact: QA engineer/learner loses the intended challenge preparation path and waits several minutes for failure.
- QA impact: Agentic QA capability cannot be evaluated; a preparation failure must not be converted into a product finding or PASS.
- Developer impact: Patch portability depends on checkout line-ending state not represented in the preparation contract.
- Learner impact: Agentic QA exercise cannot start from the official deterministic preparation command.
- CI / Operational impact: Required CI step can fail late and mask downstream challenge coverage; Linux behavior remains unverified in this audit.
- Possible root cause: Patch file is CRLF in the Windows worktree while the target source is LF, and strict `git apply` is used without normalization/ignore policy.
- Alternative explanations: Linux checkout may normalize both files to LF and pass; this environment-specific possibility prevents a universal failure claim.
- Known deviation check: No Windows-specific patch compatibility note found.
- Intentional behavior check: Strict patch application/fail-closed behavior is intentional, but current line-ending incompatibility is not documented.
- Duplicate check: Distinct from REP-011 test timeout; REP-018 is a deterministic preparation contract failure.
- Suggested follow-up: Establish patch line-ending normalization or a platform-aware apply contract, add a fast preflight, and verify on Windows and Linux before reclassifying the CI step.
- Requires change?: yes
- Notes: No patch was applied and no Product/Test/Training source was modified.

### REP-019

- Detected at: 2026-08-20 13:39 JST
- Audit area: Repository hygiene / generated and temporary artifact boundary
- Category: REPOSITORY_STRUCTURE_RISK
- Severity: low
- Confidence: high
- Status: observed
- Primary artifact: Repository-root untracked PNGs: `native-payment-retry-complete.png`, `native-purchase-complete.png`, `native-review-complete.png`
- Related artifacts: `.gitignore`; `docs/native/windows-android-local-validation.md:7.2`; `docs/PROJECT_CONTEXT.md:188,224`
- Related specification: Native evidence/output path contract
- Related implementation: None; files are screenshots
- Related tests: Repository hygiene/security checks did not treat these root PNGs as tracked source
- Related CI: No root PNG artifact policy found in CI
- Related documentation: `docs/native/windows-android-local-validation.md:7.2`
- Related curriculum: `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- Platform: Android Native evidence
- Environment: Pre-existing untracked worktree state before this audit
- Preconditions: A user or agent runs `git add .` or packages the repository root
- Observation: Three Native completion screenshots existed at repository root in the initial `git status --short`. Current documentation directs human screenshots to `output/mobile-native/` and machine evidence to `.artifacts/native-local/<timestamp>/`; the root PNGs are not tracked and are not ignored by the repository hygiene policy.
- Expected: Temporary/evidence screenshots should remain under designated ignored output paths or be explicitly classified; root-level artifacts should not be easy to stage accidentally.
- Actual: Root PNGs are visible to generic staging/packaging and have no provenance/run identifier in their names.
- Reproduction steps: 1) inspect initial `git status --short`; 2) inspect file names and root location; 3) compare Native Runbook output paths; 4) confirm no file was moved/deleted during audit.
- Reproduction count: Three files observed at start and preserved unchanged
- Runtime verification: Screenshots were not regenerated for this Finding; their existence and location were verified.
- Visual verification: Existing PNG content was not used as current Product visual evidence; current screenshots were stored under temporary artifact directories.
- Evidence: Initial source integrity log; `docs/native/windows-android-local-validation.md:7.2`; `docs/PROJECT_CONTEXT.md:188`; root file names
- Impact: Low repository cleanliness and accidental-staging risk.
- Product impact: None.
- User impact: Indirect developer/reviewer confusion about canonical Native evidence.
- QA impact: Evidence provenance and current/old screenshot distinction can be lost.
- Developer impact: Root artifacts can be accidentally included in commits or delivery bundles.
- Learner impact: Learners may copy an obsolete screenshot instead of following the evidence path.
- CI / Operational impact: Generic packaging may include untracked root PNGs even though CI ignores `.artifacts`.
- Possible root cause: Manual Native screenshot capture left outputs in the worktree root before the current path contract.
- Alternative explanations: Files may be intentionally user-owned temporary evidence; this is why severity is low and status is observed.
- Known deviation check: Initial untracked files predated this audit and are not attributed to the audit actions.
- Intentional behavior check: User may intentionally keep local screenshots; repository contract still lacks a root-level classification.
- Duplicate check: Not a generated-source drift Finding.
- Suggested follow-up: Keep manual evidence under documented output paths and consider an explicit ignore/classification rule for root screenshot names; user-owned files should be handled separately.
- Requires change?: maybe
- Notes: Audit did not delete, move, rename, or stage these files.

## 16. Reconciliations — Audit Results

### Reconciliation: OBS-001 — Integration `many-products` timeout

- Previous status: suspected Product/fixture failure during parallel Integration run
- New status: environment_failure / not promoted to Finding
- Reason: The same test passed in isolation with the default timeout in 3.49 seconds; the first failure occurred only during the parallel full run.
- Additional evidence: No source diff, no fixture mutation, and no repeated isolated failure.
- Final interpretation: Resource contention candidate; retained in Audit Record 2, excluded from REP count.

### Reconciliation: OBS-002 — Native Search ASCII input failure

- Previous status: suspected Native Search/Product defect
- New status: environment_failure / blocked verification
- Reason: Physical device had no LatinIME and the runbook records Japanese IME ASCII-input limitations. Hierarchy showed unfiltered products, but the filter/UI capability gap was independently reproduced without relying on input.
- Additional evidence: `docs/PROJECT_CONTEXT.md:182,200-203`; current device capability inventory; fresh Catalog/Search screenshots.
- Final interpretation: Do not treat the one failed Search Flow as proof of a Native product bug; retain the independent static/UI REP-003 evidence.

### Reconciliation: OBS-003 — Browser favicon 404

- Previous status: observed console/network error
- New status: not a Finding
- Reason: It was an implicit browser request with no explicit current contract or demonstrated user impact; final console state had zero errors/warnings.
- Final interpretation: Retain as a low-value observation only.

### Reconciliation: OBS-004 — Manual image helper orphan candidate

- Previous status: orphan/dead-artifact candidate for `scripts/prepare-product-image.ts`
- New status: unresolved observation, not a Finding
- Reason: The file is a plausible manual CLI entrypoint even though no package script references it; static absence of a caller cannot rule out documented/manual use.
- Final interpretation: Suggested maintenance inventory item only; no REP ID allocated.

### Finding reconciliation summary

- No formal REP ID was deleted, renumbered, downgraded, or converted to false positive/duplicate after assignment.
- No formal Finding is classified `false_positive` or `duplicate` at audit close.

## 17. Blocked / Not Executed — Final

- Playwright MCP callable tool: unavailable. Real Chromium was operated through the repository Playwright CLI with semantic snapshots, direct interactions, console inspection, and rendered screenshots.
- Maestro MCP callable tool: unavailable. Native verification used existing local Android helper/CLI, ADB deep links, and fresh screenshots.
- iOS local runtime/visual: blocked by Windows host without Xcode/Simulator. This is consistent with the current Build-only iOS contract; no iOS Runtime PASS was inferred.
- Remote GitHub Actions / branch protection settings: not executed or inspected. No push, workflow dispatch, PR, issue, or external mutation was performed.
- Native Gold/Platinum interactive login: not promoted to PASS because the physical device's available IME could not reliably enter seeded ASCII credentials. REP-001 remains repository-verified from the deterministic actor path.
- Direct Web Dexie foreign-item mutation: not executed because it would require constructing/mutating local database state; static adapter comparison is recorded in REP-005.
- Agentic QA patched challenge runtime: blocked by REP-018 preparation failure; no patched runtime or learner artifact was treated as PASS.
- Full `pnpm run verify`: intentionally not run because its `build:web` aggregate regenerates tracked generated outputs, which violates this audit's non-mutation contract. Safe constituent checks were run individually; disposable Web export was directed to `.artifacts/repository-audit/web-dist`.
- Full formal E2E/Maestro suite: not re-run wholesale. Targeted runtime checks were selected for information gain; existing PASS evidence was reviewed without treating unexecuted paths as PASS.
- Intentional expected-failure Training workflow: not executed; its caller/evidence contract was audited statically in REP-013.

## 18. Source Integrity Log — Final

### Final pre-synthesis checkpoint

- Initial HEAD: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
- Current HEAD before final synthesis: unchanged from initial HEAD.
- Branch: `docs/2026-08-20-maintenance-investigation`
- `git diff --name-only`: no tracked paths.
- `git diff --stat`: empty.
- `git status --short`: only the single audit Report plus the four pre-existing untracked user artifacts are present; no `.codex/runs/**` artifact was created or changed.
- No `git add`, `commit`, `push`, `reset`, `clean`, delete, rename, or move was executed.
- Browser/ADB interactions changed only local application state and ignored/temporary evidence; no tracked source was changed.

# Final Synthesis

## Repository Health Summary

The repository has a strong static baseline: specification, visual registry, curriculum, lint, typecheck, image/security checks, Unit, Repository, Web Component, Native Component, and most Contract checks passed. `.gitignore` and credential scans did not reveal tracked secrets or generated/temp leakage. The highest-risk reality is cross-layer divergence: Native catalog identity and Storefront surface do not match the current common contract, checkout result routes trust URL presentation state, and the current training/CI/documentation contracts do not consistently describe or enforce the same behavior.

## Confirmed / Reproduced Findings

- Reproduced runtime behavior: REP-002 (opposite Web checkout result states and Native no-order success), REP-004 (async suggestions hidden until ArrowDown), REP-006 (guest Native Customer deep link shows service error), REP-011 (contract timeout boundary), REP-018 (Agentic QA patch preparation failure).
- Repository-verified cross-layer findings: REP-001, REP-003, REP-005, REP-007, REP-008, REP-009, REP-010, REP-012, REP-013, REP-014, REP-015, REP-016.
- Suspected due external branch-protection uncertainty: REP-017.
- Observed pre-existing hygiene item: REP-019.

## High-confidence Product Bug Candidates

REP-001, REP-002, REP-003, REP-004, and REP-006 are the primary Product/Web-Native behavior candidates. REP-001 and REP-002 are the highest-impact candidates because they affect rank-dependent catalog meaning and payment outcome integrity. REP-003/004/006 are medium-severity usability or capability-boundary defects with direct visual/runtime evidence.

## Critical Findings

None observed. No credential, private key, destructive repository mutation, or confirmed cross-user server-side data exposure was found.

## High Findings

2 findings: REP-001 Native catalog is permanently Guest-resolved; REP-002 checkout result screen can contradict persisted payment/order state.

## Medium Findings

16 findings: REP-003 through REP-018 excluding REP-019. They cover Native common Storefront gaps, Web Search state, Cart repository ownership, Native route guard, specification/SSOT drift, curriculum/CI drift, test flake/false-positive risk, generated artifact detection, mutable Training actions, Native trigger uncertainty, and Agentic QA preparation.

## Low Findings

1 finding: REP-019 root-level pre-existing Native screenshots outside the documented evidence paths.

## Info Findings

None formalized. Lower-confidence observations remain in Reconciliations and Remaining Unknowns.

## Test / Regression Risks

- REP-011: 5-second default timeout boundary in Windows Hook and Android visual batch Contract tests.
- REP-012: Flow J can pass without exercising shipment-start transition.
- REP-013: Training expected-failure workflow bypasses its evidence-enforcing wrapper.
- REP-015: Build-time regeneration can conceal committed generated-file drift.
- Existing Native Search ASCII failure is classified as device/IME environment failure, not a Product finding.

## CI Risks

REP-013, REP-015, REP-016, REP-017, and REP-018 are the principal CI/operational risks. Production CI is generally fail-closed and remote actions in active workflows are SHA-pinned; Training templates are the policy exception. Native PR/manual gates are explicit, but push/main coverage depends on external branch protection. Required Agentic QA preparation currently fails on this Windows worktree.

## Repository Structure Risks

REP-019 is the only formal structure/hygiene Finding. The root screenshots predate this audit and were preserved. The manual product-image helper remains an unresolved orphan candidate only because dynamic/manual CLI usage cannot be ruled out.

## Web / Native Risks

The main Web/Native divergence chain is REP-001 → rank actor, REP-003 → filter/pagination UI, REP-006 → direct route guard, and REP-002 → result-state rendering. Web Cart also has an adapter-level ownership predicate gap (REP-005). Android runtime was partially available and visually inspected; iOS remained Build-only/blocked locally.

## UI / Visual Risks

No broad layout collapse, clipping, broken image, horizontal overflow, unreadable text, or unusable touch-target defect was confirmed in the inspected Web 1440×1000, 390×844, 320×700 or Android screenshots. REP-004 and REP-006 are state/affordance defects visible in rendered UI; REP-002's screens are visually coherent but semantically wrong.

## Documentation / Specification Risks

REP-007 (Authentication state scenario), REP-008 (Design Token SSOT), REP-009 (legacy/current Native boundary), REP-010 (iOS gate curriculum), and REP-014 (E2E count/trigger) show that documents, specifications, curriculum, and CI no longer form one unambiguous current oracle.

## Curriculum Risks

REP-009, REP-010, REP-013, REP-014, REP-016, and REP-018 can cause learners to use obsolete trigger models, incomplete evidence commands, mutable actions, or an unavailable deterministic preparation path. Curriculum validators pass structurally; these are semantic/current-reality gaps.

## Security / Hygiene Risks

No actual secret value, private key, token, or credential was found in the audited tracked scope. `security:check` passed and active production workflows use full SHA action pins. REP-016 is a Training supply-chain/reproducibility risk; REP-019 is an accidental staging/provenance risk.

## Agent / QA Contract Risks

REP-018 is the direct Agentic QA contract failure. The repository's Agent/QA policies otherwise consistently separate discovery, repair, child delegation, source mutation, and artifact handling. No conflicting parent/child policy was confirmed during the instruction audit.

## False Positives / Duplicates

No formal Finding ended as false positive or duplicate. The Integration timeout, Native IME Search failure, favicon 404, and manual image helper were explicitly reconciled or blocked rather than inflated into Product findings.

## Blocked Areas

iOS Runtime/Visual and Remote CI; Playwright MCP and Maestro MCP direct tools; Native rank-specific interactive login on this physical device; Linux cross-check of Agentic QA patch application; branch protection/main push behavior; direct Web foreign-item mutation; actual storage-write-failure visual state; full intentional-failure Training artifact run.

## Highest-risk Areas

1. Checkout result state integrity and retry semantics (REP-002).
2. Native Customer identity/rank resolution (REP-001).
3. Native common Storefront capability and parity (REP-003).
4. Required Agentic QA preparation portability (REP-018).
5. Web async search discovery and route authorization boundaries (REP-004, REP-006).
6. Current specification/curriculum/CI oracle alignment (REP-007–REP-016).

## Cross-layer Problems

| Chain | Evidence | Consequence |
|---|---|---|
| Specification → Native bootstrap → Runtime | Common Customer/rank rules vs GuestActorResolver | Rank customers receive Guest catalog semantics (REP-001) |
| Specification → UI → Runtime | Result route state contract vs URL `kind`/no-order Native screen | Payment outcome can be falsely shown (REP-002) |
| Specification → Native UI → Tests | Facet/price/page contract vs fixed empty/null request fields | Native capability gap is not covered by current UI tests (REP-003) |
| Scenario metadata → Visual setup → Runtime | storage-write-failure label vs empty-submit setup | Wrong failure evidence is accepted (REP-007) |
| Script wrapper → Training Workflow → Evidence | Wrapper enforces artifact set, workflow calls raw test and warns | Incomplete expected-failure evidence can pass (REP-013) |
| Generator → Build → CI | Build overwrites generated outputs, no post-generation diff | Generated drift can be hidden (REP-015) |
| Policy → Training template → Copy validator | Full-SHA policy vs mutable `@v4` tags | Training action resolution is not reproducible (REP-016) |
| Windows worktree → Patch → Required CI | CRLF patch vs LF source, strict apply | Agentic QA preparation blocks on supported host (REP-018) |

## Suggested Maintenance Analysis Order

1. REP-002 payment/result-state ownership and opposite-state regression tests.
2. REP-001 Native session-aware catalog actor and rank/pricing contract.
3. REP-003 decide common-vs-platform Storefront scope and expose/validate missing facets.
4. REP-018 patch portability and fast preparation preflight.
5. REP-004 suggestion popup state and pointer/touch/keyboard regression coverage.
6. REP-006 direct Customer route guard and safe login boundary.
7. REP-011/012/013/015 test/CI false-positive and generated-artifact guardrails.
8. REP-007/008/009/010/014 documentation, SSOT, and curriculum reconciliation.
9. REP-016/017/019 Training supply-chain, Native trigger, and repository hygiene decisions.

## Remaining Unknowns

- Whether Linux checkout normalization makes REP-018 non-reproducible outside Windows.
- Whether external branch protection forbids direct main pushes and thereby closes REP-017.
- Whether Native Gold/Platinum login/catalog runtime reproduces REP-001 beyond the deterministic static actor trace.
- Whether actual Web Dexie foreign-item mutation can be reached through supported Test Control without manually constructing data.
- Whether the actual `storage-write-failure` Login state has a separate intended UI contract.
- Whether iOS reusable Build-only Gate succeeds on current GitHub-hosted macOS Runner.
- Whether remote CI action resolution/Training Copy behavior differs from static workflow semantics.

## Final Coverage

- Inventory: 1,275 tracked files; application, Web, Native, Unit, Integration, Component, Repository Contract, Contract, Playwright, Maestro, Training, scripts, workflow, config, fixtures/seeds/mocks, generated assets, security, Agent/Skill/QA policy, curriculum, and repository structure reviewed.
- Validation executed: format, Markdown, Spec, Visual final, Curriculum, lint, typecheck, image manifest, security, EAS, Native route, Unit 66/66, Repository 33/33, Web Component 76/76, Native Component 49/49, disposable Web export; all PASS except recorded Contract timeout and Agentic QA preparation failure.
- Runtime/visual: Web desktop/mobile/small-mobile targeted journeys and screenshots; Android physical API 30 direct-route/catalog/search/profile/checkout screenshots plus reviewed baseline evidence; iOS and MCP direct tools blocked.
- Formal Finding count: 19 (critical 0, high 2, medium 16, low 1, info 0).
- Status count: reproduced 5, repository_verified 12, suspected 1, observed 1, false_positive 0, duplicate 0, blocked 0 formal (blocked areas are listed separately).
- Formal coverage ledger: Documentation 5 findings; Specification 4; Web implementation 3; Native implementation 4; Contract/Test quality 2; CI/Script/Generated 6; Curriculum/Training 6; Security/Hygiene 2. Overlap is intentional because one Finding can span layers.

## Final Source Integrity

- Initial HEAD: `da924e0dd9764416fbe2f66ad534db7b3d9ccf40`
- Final HEAD: unchanged (`da924e0dd9764416fbe2f66ad534db7b3d9ccf40`)
- Final branch: `docs/2026-08-20-maintenance-investigation`
- Final tracked diff: empty; changed tracked file list: none.
- The only new/changed durable file is this audit Report. The four pre-existing untracked user artifacts remain untouched. No Product/Test/Specification/Documentation/Curriculum/CI/Config/Script/Fixture/Generated/Agent/Skill/Harness file was modified.
- Audit completed without repair, formatting write, generation write to tracked files, snapshot/golden update, issue/PR, or Git mutation.

## Final Close Recheck

- Sanitizer command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path docs/reports/2026-08-20_103937_repository-audit.md -Write -Check`
- Sanitizer result: `files_scanned=1`, `files_changed=0`, `replacements_total=0`, `residual_findings=0`.
- Final `git status --short`: the audit Report and the four pre-existing untracked user artifacts only.
- Final `git diff --name-only`: empty; final `git diff --stat`: empty.
- Final HEAD remains `da924e0dd9764416fbe2f66ad534db7b3d9ccf40` on `docs/2026-08-20-maintenance-investigation`.
- Close decision: audit-only scope satisfied; no repository repair or Git mutation performed.

## Report QA Recheck

- Command: `pnpm exec markdownlint-cli2 docs/reports/2026-08-20_103937_repository-audit.md`
- Result: 4 `MD024/no-duplicate-heading` messages for the required Skeleton headings (`15. Findings`, `16. Reconciliations`, `17. Blocked / Not Executed`, `18. Source Integrity Log`) appearing again when their append-only detailed sections were added.
- Interpretation: Report-structure warning caused by the mandatory initial Skeleton plus append-only detailed sections; no product, repository, or source-integrity Finding. No existing Report text was edited or removed to suppress it.

## Post-audit Cleanup Reconciliation — 2026-08-20

- User requested confirmation and handling of the three root-level PNGs after the audit had closed.
- Visual inspection confirmed they are Native completion evidence: payment retry completion, purchase/order completion, and review completion screens.
- Previous location: repository root, untracked and not ignored.
- Action: moved, without deletion, to the documented human-evidence directory `output/mobile-native/`.
- Target is covered by `.gitignore:22` (`output/`); filenames and byte sizes were preserved.
- Reconciliation of REP-019: the original audit observation remains append-only historical evidence; the current root-level hygiene condition has been addressed by this user-requested move.
- No Product, Test, Specification, CI, Config, Generated source, or Git history was changed.

## Reconciliation Addendum — PR #35 Evidence

### Reconciliation: REP-018 — Ubuntu PR CI evidence

- Previous evidence: Windows local worktree reproduced strict patch-apply failure for the Agentic QA preparation path under the observed CRLF patch / LF source combination.
- Additional evidence: PR #35 GitHub-hosted Ubuntu CI passed `Verify Agentic QA deterministic preparation`.
- Current interpretation: REP-018 is not a universal Agentic QA preparation failure. Current evidence scopes it to Windows / line-ending portability under the observed checkout configuration.
- Current affected environment: Windows checkout/worktree with the observed line-ending configuration.
- Not demonstrated: Failure on GitHub-hosted Ubuntu.
- Current status: `reproduced` on Windows; cross-platform scope narrowed.

### Reconciliation: REP-011 — Ubuntu CI control

- Windows local: the 5-second timeout boundary was reproduced in the contract execution described in the original Finding.
- PR #35 Ubuntu CI: the Vitest Contracts job passed.
- Interpretation: Current evidence supports a Windows/local timing-budget reliability risk, not a currently reproduced Ubuntu CI failure.
- Finding remains: yes; host-dependent timeout-budget risk remains under the original ID.

### Reconciliation: REP-019 — Local worktree classification

- Original observation: three untracked Native screenshots existed at repository root before the audit.
- Additional interpretation: the files predated the audit, were not tracked Repository content, and were user-owned local artifacts. The later user-requested move to `output/mobile-native/` is recorded above and does not convert the original observation into a Repository defect.
- Final classification: `local_worktree_observation`.
- Repository defect: no.
- Requires repository change: no.
- Reason retained: the original evidence remains in the report under the append-only contract, while REP-019 is excluded from current Repository maintenance candidates.

### Reconciliation — Final Markdown validation

- Earlier observation: `pnpm run lint:markdown` passed against an intermediate state of this Report.
- PR CI observation: the final committed Report failed Markdown lint with four `MD024/no-duplicate-heading` errors.
- Root cause: append-only reporting added final section headings that duplicated the initial Skeleton headings.
- Interpretation: the earlier PASS was valid only for the intermediate Report state and did not validate the final committed artifact.
- Resolution in this PR: only the duplicate Report headings were made unique. No Finding content or Product/Test/Specification source was repaired.
- Final validation: `pnpm run format:check` PASS and `pnpm run lint:markdown` PASS on the final report state after the heading-only correction.

## Final Synthesis — PR CI Reconciliation

- Windows-scoped findings: REP-011 remains a host-dependent local timeout-budget risk; REP-018 remains reproduced on Windows with the cross-platform claim narrowed. The corresponding maintenance report entries MNT-002 and MNT-004 are reconciled below in their own report.
- Ubuntu CI control: PR #35 passed the Agentic QA deterministic-preparation check and the relevant Contract/Web build and downstream browser jobs cited by the review evidence; no current Ubuntu failure is inferred from the Windows observations.
- Local-only observation: REP-019 remains an append-only historical ID but is not a Repository defect or current Repository maintenance candidate.
- Formal Finding identifiers and historical counts are retained; no Finding was deleted, merged, renumbered, or repaired.
- This PR changes report structure and evidence interpretation only. Product, Test, Specification, Curriculum, CI, Config, Script, Fixture, Seed, Agent, Skill, Harness, Dependency, and Generated source were not changed.

## Reconciliation Addendum — Latest Review: Three Logical Inconsistencies

### Cross-report Mapping Clarification

- `REP-018` corresponds to `MNT-002`. Both describe the Windows / CRLF-LF line-ending portability problem in Agentic QA deterministic preparation.
- `REP-011` has no corresponding formal `MNT-*` Finding. The Maintenance Investigation observed Contract timeout behavior, but later reconciled that observation as environment / resource contention without promoting it to a formal Maintenance Finding.
- `MNT-004` is an independent stale-Metro-cache Web artifact reproducibility Finding. It does not correspond to `REP-011` and has a separate root cause.
- Cross-report Root Cause analysis must not pair `REP-011` with `MNT-004`.
- This clarification is the latest interpretation of the cross-report mapping. Earlier wording that could be read as pairing `REP-011` / `REP-018` with `MNT-002` / `MNT-004` remains preserved as historical report text under the append-only contract.

### Reconciliation: REP-014 — Root-cause deduplication

- Additional comparison: `REP-009` and `REP-014` both originate from `docs/08_testing/e2e_design.md`.
- Shared root cause: the document represents an older Phase / E2E design model without a clear Historical / Superseded classification, while the current Repository has moved to a different Web / Native / CI assurance model.
- `REP-009` captures the broader Phase / Native / current-versus-historical boundary drift.
- `REP-014` captures the Web E2E count / trigger / UI Review manifestation of the same stale document.
- Current interpretation: retain both historical Finding IDs under the append-only contract, but treat `REP-014` as a child / duplicate manifestation of `REP-009` for Root Cause prioritization.
- Unique maintenance root cause: one for `REP-009` and `REP-014`.
- Finding deletion: no.
- Requires separate implementation fixes: no; both should be handled through the same `docs/08_testing/e2e_design.md` maintenance decision.

### Reconciliation: REP-013 — Training expected-failure contract

- Additional evidence: `scripts/training/workflow-contract.ts:13-19` explicitly permits `pnpm run training:web:expected-failure` as a Training Workflow command.
- Additional evidence: the same executable command allowlist does not list or approve `pnpm run training:web:check-expected-failure` as the Training Workflow entrypoint. The package script and curriculum still define the wrapper as a separate evidence-checking command (`package.json:40`; `docs/curriculum/test-automation/part2/05_playwright-ci.md:204-208`).
- Previous interpretation: the Training Workflow was treated as bypassing the evidence-enforcing wrapper and therefore as confirmed `SCRIPT_DRIFT`.
- Current interpretation: the Repository does not currently prove that this bypass is accidental. The raw command may be intentionally used so that the CI exercise visibly fails, while the wrapper may serve a separate local / contract verification purpose.
- Remaining inconsistency: Curriculum documentation refers to the wrapper as part of Failure Artifact validation, while the executable Training Workflow contract intentionally permits the raw command.
- Current status: `unresolved` / contract ambiguity.
- Current category: curriculum / executable-contract inconsistency, rather than confirmed `SCRIPT_DRIFT`.
- Severity: medium.
- Confidence: medium.
- Requires change?: maybe.
- Suggested follow-up: clarify the intended responsibility split between (1) raw expected-failure CI execution, (2) evidence-contract validation wrapper, and (3) learner-facing curriculum; then align documentation or executable contract only if required.
- False positive decision: not confirmed as a false positive. The evidence establishes an unresolved contract boundary, not which artifact is the sole current SSOT.

### Finding Count versus Root Cause Count

- Formal Finding ID count remains `19` for historical traceability.
- `19 IDs` must not be read as `19 independent maintenance root causes`; at minimum, `REP-009` and `REP-014` are one stale-`e2e_design.md` root cause with two manifestations.
- Current actionable candidate count and fully deduplicated Root Cause count are intentionally not re-computed in this reconciliation. `REP-019` remains excluded from current Repository maintenance candidates as a local-worktree observation.
- No Finding was deleted, merged, renumbered, or mechanically changed to `duplicate`; the relationship is recorded for prioritization only.

## Final Synthesis — Root Cause Reconciliation

### Cross-report mapping

- `REP-018` ↔ `MNT-002`: shared Windows / line-ending portability root cause in Agentic QA deterministic preparation.
- `REP-011` ↔ formal `MNT-*` Findingなし: the Maintenance observation was reconciled as environment / resource contention and was not promoted.
- `MNT-004`: independent stale-Metro-cache Web artifact reproducibility Finding.

### Root-cause deduplication

- `REP-009` and `REP-014` remain separate historical Finding IDs but represent one maintenance root cause in `docs/08_testing/e2e_design.md`.
- Formal Finding ID count, current actionable candidate count, and unique root-cause count are separate measures. The report does not claim `19 IDs = 19 independent root causes`.

### REP-013

- `workflow-contract.ts` explicitly permits the raw expected-failure command and does not approve the wrapper as the Training Workflow entrypoint.
- The prior confirmed-`SCRIPT_DRIFT` interpretation is therefore narrowed to an unresolved curriculum / executable-contract inconsistency; intentional responsibility separation remains possible.
- `REP-013` is not classified as a false positive. Follow-up is to clarify the contract intent before deciding whether any documentation or executable-contract alignment is required.

### Scope preservation

- `REP-016`, `REP-017`, and all other Finding bodies remain unchanged by this addendum.
- This addendum changes only cross-report mapping and interpretation. No Product, Test, Specification, Curriculum, Training Workflow, CI, Config, Script, Fixture, Seed, Agent, Skill, Harness, Dependency, or Generated source was changed.
