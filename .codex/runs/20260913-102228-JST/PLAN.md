# Plan

## Objective

Issue #135 のレビュー済み実装Planに従い、root `AGENTS.md` を常駐契約と条件付きreference入口へ整理し、既存policyの意味を維持したまま通常タスク開始時の無条件読み込み量を削減する。

## Scope

### In

- `AGENTS.md` の常駐契約、Skill routing、条件付き参照、Progress / Report / safety / repair / delegation / governanceの高レベル入口を整理する。
- `docs/reference/run-artifacts.md`、`docs/reference/codex-implementation-harness.md`、`docs/reference/repair-loop.md` の責務をPlanの正本配置へ合わせる。
- `.codex/templates/TASKS.md` の旧root詳細依存をreferenceへの短い導線へ置き換える。
- `scripts/verify` と `scripts/verify.ps1` のassertionを同じ意味契約へ移管する。
- 変更前後のbyte数、行数、通常タスク開始時の無条件読み込み量を記録する。

### Out

- 新規Hook、compact後再注入、textlint、validator / Workflow Engine、Skill package再設計。
- Product behavior、Run schema、Subagent runtime、Issue #117 / #134 の責務。
- Planで条件付きとされた既存正本の変更（不足や不整合が検証で判明した場合を除く）。

## Assumptions

- ユーザーの実装指示はPlanに記載されたL2 workflow / template構造変更の承認に該当する。
- 対象PR #147 は既存PRを継続利用し、mergeや新規PR作成は行わない。
- `main`との差分に既存Plan以外の意図しない変更がないことを初期確認で検証する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Planの変更対象、正本、検証、停止条件が確定している。
- 仮定してよい細部: 既存referenceに不足がある場合は、Plan記載の最小範囲だけ補完する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現行rootの詳細契約は、Plan指定の既存reference / Skill / agent定義 / Harnessへ責務分離できる。
- H2: `scripts/verify` / `scripts/verify.ps1` のroot assertionを正本側へ移すことで、意味を失わず旧root依存を検出できる。
- H3: root以外の一律読込指定を条件付き参照へ変更すれば、保守的な変更前下限より無条件読み込み量を減らせる。

## Research Plan

- Round 1 Query: branch / PR / Issue / main差分、現行root、Plan、直近ADR / Run、Plan指定のreference / template / verifyを確認する。
- Round 2 Query: 変更後の責務配置、旧契約依存、assertion、scope、sanitizer、指定検証の結果を照合する。
- Exit Criteria:
  - Planの全変更対象と非対象が差分で説明できる。
  - 各移管契約にroot残置または一意の正本がある。
  - 必須ローカル検証、Run Artifactサニタイズ、commit / push、最新PR head CI確認が完了する。

## Approach

1. 初期状態と変更前測定をRunへ記録する。
2. Planの順序に従って正本referenceを先に補完し、rootとTASKS templateを参照化する。
3. Bash / PowerShell verifyを同じ意味契約へ更新する。
4. 指定検証を上流から順に実行し、FAIL時はPlanのrepair policyとbounded停止条件に従う。
5. scope、diff、Run Artifact、sanitizer、branch safetyを確認してcommit / pushし、PR #147の最新headの必須CIを確認する。

## Definition of Done

- Plan指定の変更対象だけが変更され、既存policyの禁止条件、許可条件、例外、停止条件、復旧条件、必須確認が維持される。
- rootが単なるリンク集ではなく、常駐すべき契約と必要時参照の判断を保持する。
- Progress基本計算はrun-artifacts、CI連動はimplementation harness、Repository固有repair policyはrepair-loop referenceへ分離される。
- TASKS templateが旧root詳細を再伝播せず、Bash / PowerShell verifyが移管後の正本を検証する。
- 指定ローカル検証がPASS、またはPlanに沿った具体的な残存理由が記録される。
- Run Artifactがfinal commit前状態まで更新され、Sanitizer CheckがPASSする。
- 対象branchへcommit / pushし、PR #147の最新headで `Web CI` と `Mobile App CI` がsuccessとなり、必要なPR本文記録まで完了する。

## Risks / Unknowns

- root短文化で禁止・例外・停止条件を落とすリスク: 変更前rootとPlanの分類表を照合し、verifyと指定referenceで確認する。
- Progress / CI完了条件を複数文書へ重複定義するリスク: 基本計算とCI加算の正本を分離する。
- 実装後の品質ゲートFAIL: 最初の異常を分類し、安全な最小修正はbounded scope内で適用し、unsafe / permission / credential / requirement judgment / retry停止条件では停止する。
- GitHub CLIが環境にないため、PR / Issue / CI確認は利用可能なGitHub経路で行う必要がある。

## Thinking Log

- 2026-09-13: PR #147のhead branchは対象branch、local / remote headは一致し、作業ツリーはcleanだった。現在PRにはPlanのみがある。
- 2026-09-13: 初期 `AGENTS.md` は35838 bytes / 247行、`docs/PROJECT_CONTEXT.md` は116582 bytes / 418行。変更前の保守的下限はroot + context + 最新ADR 1件 + 最新Run 1件の標準Artifactとして記録する。
- 2026-09-13: 変更前の保守的下限は、`docs/adr/0022-test-automation-curriculum-native-specialization.md`（3139 bytes / 20行）と`.codex/runs/20260912-143053-JST/`の`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`（合計35600 bytes / 439行）を加え、191159 bytes / 1124行だった。変更後の通常task無条件対象はroot `AGENTS.md`のみで7895 bytes / 50行となり、183264 bytes / 1074行削減した。
- 2026-09-13: 指定ローカル検証で既存contract testの移管後期待とWindows timeoutが判明したため、rootへ詳細を戻さずassertionを正本へ移し、Hook policyを変えない個別timeoutだけを調整した。追加のProduct code、Hook、config、rules、Run schema変更は行っていない。
- 2026-09-13: 新規Run `20260913-102228-JST` をstrict / implementation / safeで正規初期化した。
