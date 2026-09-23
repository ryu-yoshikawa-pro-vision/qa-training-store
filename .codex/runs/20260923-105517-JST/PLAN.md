# Plan（計画）

## Objective（目的）

- PR #168 / Evaluator `9ea92af0b58ac9d1ab747359894c97e8b30fa746` のcanonical live Workflow E2E最終検証を1回だけ行い、Planの固定成功条件に沿って結果を確定する。

## Scope（対象範囲）

- In: PR・Plan・Evaluator revision確認、lockfile準拠依存導入、今回Run Artifact、tracked objectだけからのsanitized Target生成、Target Git preflight、physical Android device確認、canonical live run 1回、result評価、Run Artifact sanitization、必要なArtifact commit/pushとPR本文更新、push後CI。
- Out: Evaluator / Product / Testコード修正、Plan意味変更、case・分類・Runtime・Hook・sandbox変更、fallback / bypass、canonical run再試行、merge、Issue close、branch削除、force push。

## Assumptions（仮定）

- 依存はpackageManager `pnpm@10.34.5` と `pnpm-lock.yaml` の固定解決を使い、lockfile更新はしない。
- Evaluatorとsanitized Targetは親workspace直下の兄弟ディレクトリとする。
- Targetのrouting provenanceはfixture適用前Targetのsynthetic HEADを指し、Evaluator SHAとは区別する。

## Questions / Ambiguity（質問・曖昧性）

- Planとユーザー指定により解消済み。未回答の阻害質問なし。

## Research Plan（調査計画）

- PR #168 head / `origin/main` / worktree / 4 Plan文書 / runner preflight・result contractを確認する。
- physical deviceとcanonical runtime prerequisiteを確認してからrun開始可否を確定する。

## Approach（進め方）

1. PR headが指定Evaluator SHAで、`origin/main`にbehindせず、sourceがcleanであることを確認する。
2. `scripts/new-run.ps1`でこの作業専用Runを作り、目的・制約・checkpointを記録する。
3. `9ea92af...` のGit objectだけから明示されたpathを除外して兄弟Targetを生成し、fresh Git root commit・detached / clean / no remote・no alternatesを検証する。
4. physical deviceを確認する。条件が成立する場合のみcanonical commandを1回実行する。
5. runner resultをPlanどおり分類し、Run Artifact sanitizerを実行して残差0を確認する。
6. Artifact以外の差分がないことを確認する。必要ならArtifactのみcommit/pushし、PR本文と最新head CIを更新・確認する。

## Definition of Done（完了条件）

- canonical E2Eは指定Evaluator SHAで最大1回。
- `run_status=completed`、Planの全case・Artifact reuse・Semantic actual-output・CLI exit条件が揃った場合のみcanonical検証成功とする。
- Run Artifactがsanitizer residual 0で、credential・raw device serial・local absolute pathを含まない。
- Evaluator source差分が今回Run Artifactのみに限定される。
- pushした場合は最新PR headでWeb CI / Mobile App CIを確認し、PR本文へ結果を記録する。

## Risks / Unknowns（リスク・未知点）

- G10 / Host Runtime / Codex capability smokeがrun開始をblockする可能性がある。規則変更やbypassはせず、実行地点と結果を記録する。
- Windows Case Eには`device`状態のphysical Android serialが必要。emulatorは代用しない。
- Evaluator不具合はFindingとして記録して停止し、このRunではコードを修正しない。

## Thinking Log（判断記録）

- 開始時PR headとEvaluator HEADは指定SHAと一致。`origin/main`とのbehindは0、開始worktreeはclean。
- lockfile準拠の依存導入は成功。pnpm 10.34.5 / frozen-lockfile / 1,353 package、lockfile更新なし。
## Blocker update

- G10拒否: `git -c core.autocrlf=false add --all --force`。分類: `runtime Git configuration or environment overrides are forbidden for context-sensitive mutations`。
- 拒否時点: 指定revisionのGit objectからtracked content 945件をexportし、明示除外1,377件を除いてファイル一覧照合済み。Targetは親workspace直下に作成済みで、`git init`のみ完了。stage / synthetic root commit / detached HEADの確立前に停止した。
- canonical runner: 未起動。canonical run回数 0。`workflow-e2e-result.json`は未生成。physical device preflightも未実行。
- 対応: G10・Hook・設定・sandboxを変更せず、Target生成を再試行しない。Evaluatorコード修正なし。
- 2026-09-23: sanitizer残差0。read-only Target inventoryでforbidden path 0件・canonical 6 Skill存在・remote 0件・alternatesなしを確認。Target HEADは未作成のためTarget自体は未完成。
- 実行可能なtracked Run tasksは完了。canonical live Workflow E2EのDoDはG10 blockerで未達であり、成功扱いにしない。
