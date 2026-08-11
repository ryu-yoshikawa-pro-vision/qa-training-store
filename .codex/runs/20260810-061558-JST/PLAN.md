# 実装Run計画

## Objective

`docs/plans/2026-08-09_110500_specification-agentic-qa-foundation.md` を唯一のImplementation Contractとして、Scenario ShopのSpecification SSOT、BR/AC、静的HTML、Validator/CI、Normal/Gray-box/Black-box Agentic QA、Challenge/Evaluation、Curriculum、Documentation整理、Full ValidationをWave 0〜10の順で完遂する。

## Scope

- In: Planで固定された `docs/spec/**`、`scripts/spec/**`、`scripts/agentic-qa/**`、`training/agentic-qa/**`、QA Agent/Skill/Workflow、CI接続、Curriculum、既存文書の責務整理、Run Artifact、必要な契約テスト。
- Out: Product機能の意図しない変更、無関係なProduct Fix/Refactor、PlanのCore Contract変更、Git add/commit/push/merge/rebase/PR作成、iOS物理端末Agentic QA、AI QAのRequired CI Gate化、大型Docs Platform/外部SaaS。

## Assumptions

- 現在のHEADは `main` と同一SHAで、PR #14、PR #13のMerge commitが履歴に存在する。
- 明示されたGit操作禁止により新しいbranch作成・commit・pushは行わず、現在のmain同一SHAの作業branchをImplementation workspaceとして扱う。この差異はStart Gateの証跡へ記録し、Final判定では隠さない。
- Native/iOSの現行正式契約はADR-0011に従い、AndroidはRuntime、iOSはBuild-only。WindowsでiOS/Xcode/ghが無い場合はLocal Blockerとして明記し、独立Waveを継続する。
- Machine Contractは既存 `zod` とJSON parsingのみで実装し、依存追加は行わない。
- Run Artifactは日本語で記載し、絶対Path・生ログ・Secretを含めない。生ログは `.artifacts/**` に保存する。

## Questions / Ambiguity

- Wave 0でCurrent RepositoryとPlanのCore Contractが衝突した場合のみ、Core Contract変更をせずBlockerとして記録する。
- Model identifier、Browser/Native capability、Disposable Source Copy、Baseline/Patched Runtimeが現環境で取得不能な場合は、該当TaskをLocal Blockedにし、実行していない検証をPASS扱いしない。

## Hypotheses

- H1: 現RepositoryにはSpecification/Agentic QA/Challengeの新基盤は未実装であり、既存Product/Native基盤へ追加する必要がある。
- H2: 既存 `zod`、TypeScript runner、Vitest/Jest、既存CIのquality/verifyを使えば、JSON+Zod/Static HTML/Validatorを追加依存なしで成立できる。
- H3: WebのPlaywright runtimeとAndroid local capabilityは一部または全部利用可能だが、Black-boxのTool BoundaryはRepository rootのreadonlyとは別に狭いwrapper/isolated rootとして実装・検証する必要がある。
- H4: 現行Windows環境の依存Junctionを使えば、Disposable Source Copy上でWebのBaseline/Patched Buildと起動SanityをBoundedに実行できる。失敗時は最初のBuild/Runtime異常を記録し、Runnerへ進めない。

## Research Plan

- Round 1: Start Gate、git履歴、既存Path、package/CI、Product/Native/QA/Run schemaを横断調査する。
- Round 2: Subagentのread-only調査とWave 1 inventoryを照合し、Safe Change Surface、Local Blocker、実装順を確定する。
- Exit Criteria:
  - Wave 0/1の主要事実と未知がREPORTへ記録されている。
  - Planの固定契約を変更せずに進める対象Path、テスト、Runtime境界が確定している。
  - 実行不能な検証は原因、Evidence、次アクション付きでBlockedへ分類されている。

## Approach

1. strict Runを維持し、TASKSを上から実行する。
2. Wave 0〜1でProduct意図とExecutable Canonical Sourceを分離してinventoryする。
3. Wave 2〜5でNormative/Supporting仕様、Exact Grammar、Static HTML、JSON+Zod Validator、CIを構築する。
4. Wave 6〜7でQA Artifact、Isolation、Challenge、Patch、Benchmark、Runner/Evaluator、Scoringを構築し、可能な最小E2Eを実行する。
5. Wave 8〜9でCurriculumと既存入口の責務を同期する。
6. Wave 10でFocused→Full→Runtimeの順に検証し、Repair Loopをboundedに回す。
7. 最終Run ArtifactをSanitizer Write/Checkし、未解消Required Blockerがあればfail-closeで報告する。

## Definition of Done

- PlanのDefinition of Done、Wave 0〜10、Full Validation、Runtime Validation、Final fail-close条件を満たす。
- `docs/spec/README.md`が唯一のSpecification入口で、Normative allowlistとSupporting責務が明示される。
- Exact BR/AC/Section/Reference/Mode/Coverage/Isolation/Scoring/Revision契約が機械検証できる。
- `pnpm run validate:spec`、`pnpm run build:spec`、既存 `pnpm run verify` と必要なFocused/Runtime検証の結果が記録される。
- 未実行をPASS扱いせず、Product Behavior変更・無関係修正・Patch混入・第二Machine ContractがないことをScope Checkする。

## Risks / Unknowns

- 既存Branch名がPlan-only branchである可能性: Git操作禁止と衝突するため、HEAD/main同一性をEvidence化し、必要ならFinal Blockerとして明記する。
- Native capability、Playwright MCP、GitHub Actions remote実行、Xcodeは環境依存。独立Taskを止めない。
- 大規模な仕様化ではCurrent意図が不明な項目を推測しやすい。Unresolvedへ分離し、Oracle化しない。
- Generated outputやRun Artifactの絶対Path/CRLF/formatが既存Gateへ影響し得る。段階的に検証しSanitizerを最終実行する。

## Thinking Log

- 2026-08-10 JST: 貼り付けテキストと対象Plan全文を確認。Planの固定契約は変更しない方針を確定した。
- 2026-08-10 JST: HEAD `b281b87` は `main`、`origin/main`と同一で、履歴上PR #14/#13のMerge commitを確認。現在branchは `feat/specification-agentic-qa-foundation` であり、Git mutation禁止のため新branchを作らない制約を記録した。
- 2026-08-10 JST: ADR-0011のiOS Build-only、ADR-0009のNative Customer境界、ADR-0007/0008のMaestro/証跡、ADR-0006のSanitizerを現行判断の根拠にする。
- 2026-08-10 JST: Disposable Source CopyのWeb Challenge準備を、記録だけの順序から実Baseline/Patched Build・Serve・HTTP Sanity・process-tree cleanupへ拡張した。RunnerへSource/Patchを渡さない境界は維持する。
- 2026-08-10 JST: 当初のTool一覧監査ではNative Agentic capability不足と判定していたが、再監査でMaestro MCPの実機Toolを発見した。Runbook preflight後、`native-test-control.yaml`と`native-storefront.yaml`をMCP Fresh sessionでPASSし、B2を解消した。
- 2026-08-10 JST: 同一RunでNormalとScoredを扱うため、一次`qa-findings.json`をScored、Normal証跡を`qa-findings-normal.json`へ分離し、Validatorで両方のmode contractを検証する。
- 2026-08-10 JST: Full `verify`の84件formatter baselineは今回差分と独立しているため、無関係な大規模整形は行わず、Final DoDをfail-closeする。
- 2026-08-10 JST: H4の依存Junction準備で、Windowsの`.modules.yaml` symlink失敗とjunctionの`Dirent.isDirectory()`誤判定を特定した。非ディレクトリを除外し、`.bin`/`tsx`/`expo-router`は実体コピー、その他は実体ディレクトリjunctionとするfail-close overlayへ修正した。
- 2026-08-10 JST: Disposable Source Copy上のGround Truth adapterをBasic/Intermediate/Advanced全件で確認した。各baselineはclean、patchedは意図defectを観測し、HTTP 200/titleのみのgeneric sanityから契約対象のruntime sanityへ昇格できた。
- 2026-08-10 JST: DoD突合でEvaluator CLIがManifest由来のBenchmark Revision／Runtime Variant／Runner Profileを期待値として渡していない欠落を確認した。Canonical ManifestへRunner Profileを混在させず、EvaluatorがTool Profile bytes・Challenge budget・明示modelから期待Profileを再構成する方針を採用した。
- 2026-08-10 JST: Scoring監査でCandidate Findingのreview_needed分岐が未接続、Coverageの汎用normal参照がItem-specific EvidenceなしのNon-defectをTN化する欠落を確認し、fail-closeとNEへ修正した。Positive Allowlistの必須Capability検証とEvaluator別Session証跡も追加した。
- 2026-08-10 JST: 最新Basic Preparationでpatched loginのsession作成直後にpathnameを読む競合を検出した。既存成功結果と実行ログからSPA遷移待ち不足と分類し、`waitForURL`を追加してPreparation単独で再検証しPASSした。
- 2026-08-10 JST: Wave 6のWorking Tree Snapshot要件が説明とBenchmark Manifest収集に分散していたため、Normal／Gray-box専用のbefore／after／comparison JSON + Zod契約を追加した。Playwright CLIの実Runtime観察をSnapshot区間で実施し、追加Source差分0を確認した。
- 2026-08-10 JST: Wave 5のChanged BR／AC・直接参照Normative fileからAffected Challenge IDをCI／Review Summaryへ出す要件が、`summarizeSpecDrift` helperとテストだけでCI未接続だったためD5と分類した。既存Style Quality Job内へSummary CLIを接続し、ローカルWorking Treeでは未追跡specも含める方針を採用した。
- 2026-08-10 JST: ユーザーが既存84件のformatter baseline修復を明示承認したため、Repair Loop iteration 2として実行開始時点の`prettier --list-different`対象だけを許可スコープにした。84件をPrettierで整形し、残件0を確認した後、`pnpm run verify`を再実行して全ローカル品質ゲートの成功を確認した。
