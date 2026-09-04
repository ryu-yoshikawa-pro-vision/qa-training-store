# Plan

## 目的

Issue #98を単独の教材へ複製せず、Master Plan §16のPR 4Aへ引き渡す。PR #103で確定したDecision B / Competency / Assessment Contractを維持したまま、Current Curriculumを監査し、boundedな学習体験・自己学習・Reference境界の修正を同一branchで実装して検証し、main向けPull Requestを作成する。

## 対象範囲

### In

- `docs/curriculum/test-automation/`のLearner Required Common、Native specialization、Optional / Legacy discoverability、Instructor Reference
- `docs/reference/curriculum-self-study-review.md`の再利用可能チェックリスト
- Issue #98 H98-1〜H98-4のDispositionと、既存SSOTへ到達できる最小説明
- `docs/spec/**`全Markdown/text contractの用語・表記・内部整合・semantic safety監査（実変更なし）
- Master PlanとPR #103 child Planの契約・Current validator / contract test / Training / Workbookとの照合

### Out

- Product behavior、Seed / Test Clock / Test Control、Formal Test Strategy、Training runner / workflow / Artifact contract
- `docs/spec/**`の実変更、PR 4Bの実装、Security curriculum / XSS専門Lesson
- 新しいFinding DB、Evidence台帳、Glossary、Scoring / review管理システム
- PR 5の実行基盤変更、Curriculum全体の全面rewrite、PRのmerge

## 現時点の事実と継承契約

- 現在branchは`docs/pr4a-curriculum-self-study-remediation`で、`origin/main`のPR #103 merge後commitへfast-forward同期済み。
- Working treeの既存差分は今回作成したRun Directoryだけである。
- Issue #72のCurrentは「PR 4A child Plan review / Pre-change audit preparation」、PR 4Aのplanningである。
- Part 1 Commonは`C01〜C07 + C09〜C10`、Part 2 / Final Commonは`C01〜C07 + C09〜C12`のbounded Level 2。`C08`はNative specializationでCommon非必須。
- Learner Required pathとRepository-required asset、CommonとNative specialization、Instructor supportとlearner-facing learning SSOTは別契約である。
- Native routeはP1-6→P1-7→P1-8、またはP1-6→P1-8、P2-5→P2-6→P2-7、またはP2-5→P2-7でskip / rejoinする。

## 仮説

- H1: Currentの主要なP1/P2リスクは、各moduleの説明不足そのものより、completionへ結び付く自己確認・Recovery・次の行動の具体性不足、Common routeへのNative / Repository詳細の混入、Instructor Referenceとの責務重複である。
- H2: H98-1〜H98-4は、既存のScenario / Test Control / Workbook / Failure Analysisの責務へ統合でき、Issue専用SSOTを追加せずに解消できる。
- H3: `docs/spec/**`はtext contractとして監査し、実際のsemantic Findingがなければcoverageのみをchild Planへ記録し、PR 4Bを作成しない。

## 調査・実装アプローチ

1. Current branch、base、Issue #72 / #98、PR #61 / #103、Master Plan、PR3 child Plan、AGENTS / Codex rulesを確認する。
2. Learner Required pathとlearner-facing specializationをfile / internal Lesson単位で監査し、Curriculum Findingをseverityと`fix_now` / `defer`へ分類する。
3. `docs/spec/**`全Markdown/text contract、Training / Workbook / validator / contract testを監査し、#98の4観点とPR3契約の対応を確定する。
4. 監査結果をchild Planへ記録し、自己レビュー後にbounded Findingだけを実装する。
5. 必須validation、manual cross-check、self-reviewを行い、Run artifactをsanitiseしてから指定branchへcommit / pushし、main向けOpen PRを作成する。

## 完了条件

- Pre-change auditと全FindingのDispositionがchild Planに記録されている。
- P0/P1およびDoDに必要なbounded P2/P3の`fix_now`が実差分で解消され、deferは理由とfollow-up boundaryが明記されている。
- Common route / specialization / Optional / Legacy / Instructor support / Repository-requiredの境界とPR #103契約が維持されている。
- Learner-facingのlearning goal → explanation → exercise → self-check → recovery → completion → next actionが確認できる。
- Issue #98専用の恒久教材・報告・台帳・第三SSOTが存在しない。
- `docs/spec/**`にPR 4Aの実変更がなく、PR 4B要否が確定している。
- 必須validationとmanual cross-checkが実行結果に基づき記録されている。
- self-review後、指定branchからmain向けPRが作成され、mergeしていない。

## Risks / Stop conditions

- Specificationが曖昧、Product decisionが必要、明確なSpecとProduct実装が不一致、Product behavior変更が必要、PR 3契約と矛盾する場合は推測実装せずchild Planへblocker / follow-upを記録する。
- P2/P3の全件cleanupや、Native / Security / CI / PR 5へのscope拡張が起きそうな場合はbounded scopeへ戻す。
- `docs/spec/**`でbounded semantics-preserving correctionが必要と判定した場合はPR 4Aへ混ぜず、PR 4B dispositionとfollow-upだけを記録する。

## 判断ログ

- Current mainはPR #103 merge後の`010dfc8d`であり、PR3の固定契約をchild Planの継承decisionとして扱う。
- P1-8にはNative Flow作成済みをCommonの前提とする記述があり、Common独立性のP1候補とする。
- P1-7にはTest Control URLの固定clock値がlearner-facing本文へ複製されており、既存SSOTへの参照へ置換するP2候補とする。
- P1-6にはBug / UX / 提案 / Evidence不足の区別と、入力・保存・escape表示・HTML解釈・実行のSecurity成立条件がないため、既存Failure Analysisへ最小限統合するP1/P2候補とする。
- `01_spreadsheet-test-design.md`の`RISK-CART-01`はWorkbook / validatorの`RISK-...-NNN`契約と不一致であり、局所修正する。
