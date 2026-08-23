# 実装Run Plan: pnpm lockfile format ownership

## Objective

- `docs/plans/2026-08-23_200400_pnpm_lockfile_format_ownership.md` を正本として、`pnpm-lock.yaml` のformat ownerをPrettierからpnpm 9.10.0へ統一する。
- dependency graph、package.jsonのdependency定義、CI、security remediationは変更しない。

## Scope

- In:
  - `.prettierignore` への `pnpm-lock.yaml` 1行追加。
  - pnpm 9.10.0による `pnpm-lock.yaml` の一度限りのcanonical normalization。
  - 指定されたsnapshot、frozen install、semantic equality、idempotency、Prettier ownership、format/verify、最終diff確認。
  - AGENTS.mdで要求された現在Runの標準Artifact。
  - ユーザー明示のcommit、push、既存PR #52およびCI状態確認。
- Out:
  - `js-yaml` / Dependabot Alert #5 remediationまたはdismiss。
  - dependency update、pnpm/Prettier version update、package.json変更。
  - CI workflow、Dependabot設定、application/test code、gate弱体化、change detection変更。
  - lockfile validation script、ADR追加、force push、履歴改変、新規PR作成。

## Assumptions

- レビュー済みPlanのTask順序、停止条件、Task-specific scope ruleを追加判断なしで適用する。
- Task 1の事前条件（対象branch、pnpm 9.10.0、clean worktree）は確認済み。
- `.artifacts/issue-51/` はgitignore対象の一時Evidence保存先であり、commit対象外である。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: なし。指定されたコマンドと対象ファイルをそのまま使用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: pnpm 9.10.0のnormalization前後でRepository既存`yaml` parse結果は`deepStrictEqual`一致する。
- H2: normalizationを再実行してもcanonical snapshotとのbyte equalityが成立する。
- H3: `.prettierignore`追加後、Prettier `--file-info`は`ignored: true`を返し、format:checkはlockfileをformat対象にしない。

## Research Plan

- Round 1 Query: 必須文書、最近のADR/Run、対象Plan、manifest、CI、lockfile、開始状態を確認する。
- Round 2 Query: 実装後に各Taskの指定コマンド、最初の異常、差分scope、sanitizer、PR/CI状態を確認する。
- Exit Criteria:
  - Task 1〜10の成功条件がすべて満たされる。
  - semantic equalityまたはfrozen installに停止条件が発生した場合は後続処理を止め、分類とEvidenceを記録する。
  - 実装diffが`.prettierignore`と`pnpm-lock.yaml`に限定され、非対象変更がない。
  - Run Artifactのsanitizer Write/Checkが成功する。
  - 明示されたGit/PR確認を、成功または未完了として事実どおり記録する。

## Approach

- レビュー済みPlanのTask 1〜10を順番どおり実行する。
- Task 2のbefore snapshotを親で保存した後、`implementation_worker`へ`.prettierignore`と`pnpm-lock.yaml`だけの実装を委譲する。workerはRun Artifact/Git mutationを行わない。
- Task 5〜10、scope review、sanitization、commit/push、PR/CI確認は親が担当する。
- failure時はPlanのTask 5分類およびTask-specific scope ruleを適用し、同じ条件の無目的な再試行をしない。

## Definition of Done

- `.prettierignore`に`pnpm-lock.yaml`が1行だけ追加されている。
- pnpm 9.10.0でnormalizationされ、frozen install、semantic equality、pnpm idempotency、Prettier ignored=true、format:check、verifyが成功している。
- 最終diffに非対象変更がなく、Run Artifactがsanitizedされている。
- ユーザー許可どおりcommit/pushを実施し、PR #52反映と確認可能なCI状態を報告できる。未完了は成功扱いにしない。

## Risks / Unknowns

- 大規模lockfile diffへsemantic changeが混入する可能性: before/after全体のYAML deep equalityで停止判定する。
- frozen installがmanifest不整合か環境要因で失敗する可能性: Plan指定のA/B分類を行い、dependency変更で回避しない。
- verifyにIssue #51と無関係な既存failureがある可能性: 他tracked file変更が必要ならTask-specific scope ruleに従い記録して停止する。
- push後のCIは未完了または外部要因で取得不能な可能性:確認結果を事実どおり記録する。

## Thinking Log

- 2026-08-23 JST: 指定されたレビュー済みPlanを正本とし、再設計・scope拡張を行わないと決定。
- 2026-08-23 21:54 JST: Task 1で`pnpm 9.10.0`、branch `fix/pnpm-lockfile-format-ownership`、clean worktreeを確認。
- 2026-08-23 JST: `feature-plan` skillは既存Planに従う実装であるため、計画を再作成せず、required planning guidanceとrepo mappingだけを確認した。
- 2026-08-23 22:17 JST: ユーザーの再開指示により、前回のMD047をPlan本文不変の末尾LF補正だけでrepairする判断を追加した。
- 2026-08-23 22:21 JST: MD047は解消したが、既存application sourceのTS2322が次の最初の異常として検出された。application code変更は非対象のため停止する。
