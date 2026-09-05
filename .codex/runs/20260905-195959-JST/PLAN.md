# 実行計画（Issue #117 PR1）

## 目的

正本Plan `docs/plans/2026-09-05_164300_issue-117-pr1-skill-package-portability.md` に従い、6つのAgent Skillを既存意味論を保ったままportable packageへ整理し、root routing / Repository input mappingを整理し、最小Skill validatorを品質ゲートへ接続する。

## 正本とスコープ

- 実装内容、対象範囲、非対象範囲、移行順、Validator仕様、Semantic preservation条件、DoDは正本Planに従う。
- 対象Skillの順序は `code-review`、`feature-plan`、`repair-loop`、`harness-improvement`、`exploratory-qa`、`android-native-local-validation`。
- PR1は move / deduplication / responsibility separation / package integrity validation に限定する。
- `name` / `description` はbaselineとしてfreezeする。
- `.codex/agents/**`、product code、依存更新、PR2以降のEval・semantic redesignは変更しない。
- Gitのadd / commit / push、command-based deletionは実行しない。

## 実行前提

- 作業branchは `refactor/117-pr1-skill-package-portability` で確認済み。
- 正本Planの実装開始を止める未決定事項はない。
- Repository固有のpolicy / command / path / schemaはlogical external inputまたはroot-side mappingとして残し、package内の詳細workflow正本にはしない。
- 旧pathはconsumer検索とunique contract判定後に、通常文書・thin pointer・削除を決める。念のためのpointerは作らない。

## 実装・検証方針

1. Phase 0で変更対象だけのbaseline、migration matrix、hidden binding、Template分類、semantic invariantをRun artifactへ記録する。
2. 最小validatorをexported `validateSkills(rootDir = process.cwd())` + 薄いCLIとして実装し、temporary fixture testを追加する。
3. Validator実装直後に `pnpm run test:repository` と `pnpm run validate:skills` を実行する。
4. 各Skillを正本Planの順序で、package整理 -> root/reference整理 -> `AGENTS.md` mapping -> targeted validation -> semantic確認まで閉じる。
5. Skill移行中の基本検証は `pnpm run validate:skills` と `pnpm run lint:markdown` とする。
6. routing / link / legacy path / dependency direction / semantic preservationを最終確認する。
7. 最終総合gateは `pnpm run verify` を1回実行する。失敗時だけ正本Plan指定の個別commandで切り分け、最小修正後に再検証する。
8. 完了前にRun artifactのsanitization Write / Checkを実行する。

## 仮説

- H1: 現行Skill packageとroot/referenceには、Planが示す6領域のworkflow重複とRepository固定path依存が存在する。
- H2: 既存のTypeScript / `tsx` / `yaml` stackで、追加依存なしにPlan指定のvalidatorを実装できる。
- H3: 6 Skillのfrontmatter identityとsemantic invariantは、本文のcanonical移設・重複除去だけで保持できる。

## 完了判定

正本PlanのDoDを最初から最後まで照合し、6 Skillのpackage portability、root routing SSOT、Repository input mapping、legacy path判断、Validatorの最小責務、validator testのverify到達、`name` / `description` freeze、`.codex/agents/**` 無変更、PR1外変更なし、`pnpm run verify` PASSを確認できた場合に完了とする。

## Phase 0 inventory（変更対象だけ）

### Frontmatter baseline

| Skill directory | `name` | `description` baseline |
|---|---|---|
| `code-review` | `code-review` | `Use when reviewing changes, handling /review, or doing self-review in this repository.` |
| `feature-plan` | `feature-plan` | `Use when a task needs planning, an explicit plan, or Plan Mode in this repository.` |
| `repair-loop` | `repair-loop` | `Use when applying review findings, fixing validation failures, or running a bounded Review -> Repair -> Validate loop.` |
| `harness-improvement` | `harness-improvement` | `Use when converting run results, evaluation findings, repair-loop outcomes, or repeated failures into harness improvement candidates.` |
| `exploratory-qa` | `exploratory-qa` | `Execute specification-driven Normal, Gray-box, and isolated Black-box Agentic QA for Scenario Shop.` |
| `android-native-local-validation` | `android-native-local-validation` | `Use when setting up Windows Android tooling, building a local Release APK, installing it on a physical device, running Maestro flows, or investigating a Native physical-device failure.` |

`name` / `description` のbaselineは、実装前に取得した各 `SKILL.md` のfrontmatterと一致するものとしてfreezeする。

### Migration matrix

| Skill | package-local canonical | logical external input / Repository-side contract | 移設・整理対象 |
|---|---|---|---|
| `code-review` | `references/review-workflow.md` のgeneric review ordering / findings / output / durable-report条件 | Repository coding policy、review persistence policy、external review approval、具体保存先は `CODE_REVIEW.md` と `AGENTS.md` mapping | `CODE_REVIEW.md` のEntry Point・task routing・generic objective/output重複を除く。copyable review skeletonなし。 |
| `feature-plan` | `references/planning-workflow.md`、`assets/plan-template.md` | `docs/plans/`保存先、filename、active Run / lifecycleは `PLANS.md` と `AGENTS.md` mapping | `docs/plans/TEMPLATE.md` 本文をassetへ移設し、consumer更新後に旧pathを削除判断。 |
| `repair-loop` | `references/repair-workflow.md` のbounded loop / triage / stop / evidence | evaluation / failure taxonomy / run artifact / scope policy / sanitizerのRepository contractは `docs/reference/repair-loop.md`、`AGENTS.md` mapping | packageのroot固定読込を外部入力名へ変更し、referenceの詳細をrootから除去。Subagent evidence利用は維持。 |
| `harness-improvement` | `references/improvement-workflow.md` のCandidate field / classification / evidence / review workflow | concrete target path catalog / path-based strictness mapping / shared integrationは `docs/reference/harness-improvement-loop.md`、`AGENTS.md` mapping | packageからRepository固有target一覧を除去し、root referenceへ移す。新schema/registryは作らない。 |
| `exploratory-qa` | `references/workflow.md` と `references/scored-mode.md` のportable Mode / Charter / Coverage / Budget / Evidence / Finding / finalization | Normative Specification、QA Machine Contract、schema / path / validator / scoring / scripts / execution ownershipは `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` | `SKILL.md`を薄くし、root/referenceのportable workflow重複を除去。既存のConcrete QA contractとHarness mappingは維持。 |
| `android-native-local-validation` | `references/windows-android-workflow.md` のphase / retry / stop / failure / evidence / completion semantics | Windows runbook、具体command/version/path/package ID/serial/troubleshootingは `docs/native/**` と `scripts/native/windows/android-local.ps1` | package referenceを追加し、root runbookからgeneric decisionの二重正本を整理。Windows + PowerShell + physical Androidは維持。 |

### Hidden Repository binding / confirmed consumers

- package内の `AGENTS.md`、`CODE_REVIEW.md`、`PLANS.md`、`QA_AGENT.md`、`docs/**`、`scripts/**` 固定読込は、Skill workflowのcore正本ではなくlogical external inputへ変換する。
- `tests/contracts/codex-artifact-sanitization.test.ts` は repair-loopのRepository-side sanitizer contractを確認するconsumerとして維持・必要最小限更新する。
- `tests/contracts/spec-agentic-qa.test.ts` は exploratory-qa packageのbootstrap orderingを確認するconsumerとして、package-local referenceをcanonicalにした後もSemantic markerを維持する。
- `tests/contracts/native-windows-local-validation.test.ts` は native runbook / helper / Skillの整合を確認するconsumerとして維持する。
- `docs/plans/README.md`、`PLANS.md`、`scripts/verify`、`scripts/verify.ps1` は旧Plan Template pathのconsumerまたはstatic contractのため、package assetへのmappingへ更新する。
- `docs/spec/glossary.md`、`README.md`、歴史的plan/history/report/ADRはRepository-side説明・履歴として扱い、過去の記録を上書きしない。現行実行の入口だけcanonical mappingへ更新する。
- `docs/native/README.md`、ADR-0005、native testsは具体的なRepository runbook / Skill entry linkを保持する。これはpackageからrootへ戻るworkflow正本cycleではない。

### Template classification

- `feature-plan`: `docs/plans/TEMPLATE.md` は実行時にcopyして値を埋める既存static skeleton。`assets/plan-template.md`へ意味変更なしで移設する。
- `code-review`: `Required review format` はfield / order / meaningのOutput Contractであり、既存copyable skeletonは確認できない。新assetは作らない。
- `harness-improvement`: Candidate model / Output formatは意味契約であり、既存copyable skeletonは確認できない。新assetは作らない。
- `exploratory-qa`: Charter / Findingはportable semantic contractとRepository Machine Contractの分離対象であり、既存copyable skeletonを発明しない。
- `repair-loop` / `android-native-local-validation`: 既存copyable skeletonなし。新assetは作らない。

### Semantic invariants to compare

- `code-review`: findings-first、severity / evidence / location / suggested fix / verdict / confidence、no-findings時の残余リスク、durable reportは明示要求またはRepository policy時のみ、external review起動承認。
- `feature-plan`: repo mapping、Current understanding / Assumptions / Non-goals、mandatory question、blocking / assumptions allowed、validation plan、plan-save-before-implementation、Template項目。
- `repair-loop`: bounded iteration、finding triage、allowed scope、repeated failure / max iteration / unsafe / scope stop、evaluation / taxonomy / REPORT接続、Subagent-generated evidence。
- `harness-improvement`: Candidate field semantics、evidence必須、target / strictness / status / owner decision、auto-apply禁止、implementationとの分離、Subagent evidence。
- `exploratory-qa`: Normal / Gray-box / Black-box Scored selection / boundary、Charter / Required Coverage / Budget / Stop、BEFORE -> Runtime -> candidate -> AFTER -> zero source diff、Evidence sufficiency、atomic Finding、Scored blocker。
- `android-native-local-validation`: Windows + PowerShell + physical Android、Doctor -> Prepare -> Build -> Install -> Smoke -> Test -> Suiteの上流順、preflight、retry/no-progress stop、failure classification、evidence / cleanup、未実行をPASSにしない、Git禁止。

### Legacy path decisions (Phase 0)

- `docs/plans/TEMPLATE.md`: unique Repository contractなし。active consumerを `assets/plan-template.md` へ更新後、confirmed consumerも残らなければ削除する。thin pointerは作らない。
- `docs/reference/repair-loop.md`: evaluation / failure taxonomy / run artifact / scope / sanitizer等のRepository-specific shared contractが残るため、通常文書として維持し、package workflowの二重正本にしない。
- `docs/reference/harness-improvement-loop.md`: Repository target catalog / strictness / shared integrationが残るため、通常文書として維持し、Candidate workflowの二重正本にしない。
- `docs/reference/agentic-qa-workflow.md`: Scenario Shop Machine Contract / concrete artifact / validator / scoring / execution mappingを残すIntegration Guideとして維持し、portable semantic contractは保持しない。
- `docs/native/windows-android-local-validation.md` / `docs/native/windows-android-troubleshooting.md`: 人間向けWindows runbook / troubleshootingとして維持し、generic decision semanticsはpackageへ寄せる。

## 判断ログ

- 2026-09-05 20:00 JST: 正本Plan全文、AGENTS.md、PROJECT_CONTEXT、最近のADR/Run、feature-plan手順を確認した。Plan上の未決定事項はなし。
- 2026-09-05 20:00 JST: Strict workflowでRunを初期化し、以後の進捗・判断・検証結果をこのRunへ記録する。
