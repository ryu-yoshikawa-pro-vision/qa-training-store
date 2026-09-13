# PR #133 未対応3件の再修復計画

## 0. 依頼概要

- 依頼内容: PR #133の未対応3件を、指定された4つのsourceファイルへ限定して修正し、source commit・pushと検証証跡を残す。
- 背景: 前回RunではP1-4以前の`src/seeds/metadata.ts`参照、Evidence validatorの説明文直後のPath境界、local検証Evidenceの第三者追跡性が未対応のまま残った。
- 期待成果: P1-2 / P1-3の標準導線からExecutable Sourceの早期直接読解を外し、危険なEvidence参照を説明文との間に空白がなくても拒否し、新しいRunのGit管理ArtifactまたはGitHub Actionsへ追跡できるlocal検証Evidenceを記録する。

正本Planは`docs/plans/2026-09-08_161615_test-automation-curriculum-learning-experience.md`であり、本計画は今回の未対応3件だけを扱う追補である。

## 1. ゴール / 完了条件

- ゴール:
  - P1-2 Lesson 3、Lesson 6、既存SSOT説明から`src/seeds/metadata.ts`の初学者向け直接読解を外す。
  - P1-3冒頭から同ファイルへの直接照合を外し、仕様・Risk・Test Case・`automation_decision`の学習順序を維持する。
  - `assertEvidenceReference()`で`Trace:`直後のdrive / UNC / absolute / `file:` / traversal参照を拒否し、HTTP URL・Artifact・output・Run参照を許可する。
  - local検証のmachine-managed Evidenceを新Runの実在するreport / manifest、またはGitHub Actions runへ解決可能な形で記録する。
- 完了条件（DoD）:
  - 実装前に既存validatorの危険な6入力が通過することをcontract test経路で確認し、負例へ追加する。
  - `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`、`03_test-design-and-automation-selection.md`、`scripts/validate-curriculum.ts`、`tests/contracts/training-curriculum.test.ts`の4ファイルがsource diffへ含まれる。
  - `pnpm run validate:curriculum`、`pnpm run typecheck:training`、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`が成功する。
  - `Training Copy prepare` / `validate`が新しい`SOURCE_SHA`で成功し、source SHA一致を確認する。
  - 新Runのmachine-managed report / manifest、Evaluation、Sanitizerの証跡が存在し、主要Evidenceが`.artifacts/**`だけに依存しない。
  - `SOURCE_SHA != BEFORE_SHA`、対象branchへnon-force push済み、PR HEADとremote SHAが一致し、worktreeがcleanである。

## 2. 現状理解と前提

- Current understanding:
  - 開始時点の`BEFORE_SHA`は`a9ecc1d6fd4dff1e75ded3af6a8c342f1d455a38`で、PR #133のheadRefNameとcurrent branchは一致している。
  - P1-2のLesson 3 / Lesson 6 / 「既存SSOTへ戻る経路」とP1-3冒頭に、P1-4より前の`src/seeds/metadata.ts`直接参照が残っている。
  - Evidence validatorのPath開始境界は`^`、空白、引用符等を中心に判定しており、説明文直後の`Trace:C:\...`等を境界として扱えていない。
  - 既存のvalidatorはEvidenceの実体をfilesystemで確認する契約ではなく、今回も`existsSync`は追加しない。
- Assumptions:
  - 指定された4つのsourceファイルだけで3件を局所修正できる。
  - `repair` task type、`safe` preset、`strict` workflow levelが既存の正式値であり、今回のbounded repairに適する。
  - Runのactual `run.json`は`new-run`、`codex-task`、collectorだけが更新する。
- Non-goals:
  - Native CI、C09、C12、Training Workflow、既に修正済みの他の教材経路の再設計。
  - 新しいPath parser、dependency、filesystem存在確認、test skip / retry / timeout拡大。
  - 過去Run `20260911-075512-JST`の編集、外部Full Review / re-review、merge、force push。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象、禁止事項、完了条件、branch、BASE SHAが明示されている。
- 仮定してよい細部: 既存fixtureの構造に合わせた負例追加、正規表現または既存局所helperの最小修正、source commitとRun Artifact commitの分離。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: P1-2 / P1-3教材、curriculum Evidence validator、そのcontract test、新Runの検証Artifact。
- Files to inspect / source change:
  - `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`
  - `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
  - `scripts/validate-curriculum.ts`
  - `tests/contracts/training-curriculum.test.ts`
- Administrative artifacts: 新Run `.codex/runs/20260911-232344-JST/`、本計画、必要最小限の`PROJECT_CONTEXT` / history追記。

## 5. 変更方針

- Change strategy:
  1. 現行4ファイル、正本Plan、validator / contractの実経路を確認する。
  2. source変更前に6つの危険な`Trace:`入力を既存fixture経路で再現し、通過事実を記録する。
  3. 先にcontract testへ危険な負例と正当なURL・Artifact・output・Runの正例を追加する。
  4. testを満たす最小validator修正を行う。`https:`のscheme内の`:`をdrive separatorとして扱わない。
  5. P1-2 / P1-3の本文を、人間向けSSOTと`/guide`中心の順序へ修正し、Executable Sourceの具体値はPlaywright実装後へ送る。
  6. 指定されたfocused / standard validationを行い、4つのsourceファイルだけをsource commitする。
  7. 新`SOURCE_SHA`でTraining Copyを実行し、新Runのmachine Evidence、Evaluation、Sanitizer、PR説明を同期してpushする。

## 6. 検証方法

- 事前再現: `pnpm exec vitest run tests/contracts/training-curriculum.test.ts`の既存fixture経路で危険な6入力の現行通過を確認する。
- focused: `pnpm run validate:curriculum`、`pnpm run typecheck:training`、対象contract test。
- standard: `pnpm run test:contracts`、`pnpm run verify`、`git diff --check`。
- Evidence: `codex-task` / collectorのmachine-managed report、Git管理Run Artifact、GitHub Actions runを優先し、`.artifacts/**`は補助ログとする。
- 成功判定: 上記DoDをすべて満たし、各Evidence Refのpathとselectorが実在し、summaryが参照先と一致すること。

## 7. リスクと未解決論点

- URLの`https://`を誤って拒否しないよう、危険Path判定はURI schemeを先に許可する。
- 説明文内の通常テキストをPathと誤認しないよう、既存のPath開始境界とEvidence契約の範囲を保つ。
- 標準verifyやwrapperで環境問題が出た場合は、最初の異常を記録し、同じ条件の無目的な再試行をしない。
- PR #133の他の修正済み領域は今回の変更差分へ含めない。

## 8. 成果物

- 変更ファイル: 上記4つのsourceファイル、必要最小限のRun / plan / living documentation Artifact。
- 付随ドキュメント: 新Runの`PLAN.md`、`TASKS.md`、`REPORT.md`、`run.json`、`evaluation.json`、必要なhistory。

## 9. 備考

- この計画は開始時の`BEFORE_SHA`とPR #133のhead確認結果を基準にする。
