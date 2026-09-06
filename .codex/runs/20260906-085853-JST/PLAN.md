# Plan

## Objective

- PR #123 の CodeRabbit finding 9件を、正本Plan・Repository contract・現HEADと照合し、妥当な2件だけを最小修正する。
- `.codex/runs/20260905-195959-JST/REPORT.md` はappend-onlyで監査補正を追記し、Skill Validatorのsymlink経由package escapeを拒否する。
- targeted validation、最終 `pnpm run verify`、Run Artifact sanitization、CodeRabbit threadのreply / resolveまで行う。commit / pushは行わない。

## Scope

- In:
  - `scripts/validate-skills.ts`
  - `tests/repository-contract/validate-skills.test.ts`
  - `.codex/runs/20260905-195959-JST/REPORT.md` 末尾への補正checkpoint
  - 今回Run `.codex/runs/20260906-085853-JST/` の標準artifact
  - CodeRabbitの既存review threadへの根拠付きreply / resolve
- Out:
  - feature-plan template、過去Runの `evaluation.json` / `run.json` / `PLAN.md`
  - absolute path handling、verify.ps1、codex-task / collector、Harness lifecycle
  - Skill semantic redesign、Validator拡張、dependency / product code / `.codex/agents/**` / `scripts/agentic-qa/**` / `scripts/native/**`
  - commit、push、force push、新規PR、CodeRabbit再review起動

## Assumptions

- 現在のbranch `refactor/117-pr1-skill-package-portability` とPR #123 headが一致している。
- Attempt 3 / 4の正確な実時刻は既存証跡で客観的に確定できない場合、推測せず論理順だけを補正checkpointへ記録する。
- Windowsでの `fs.symlinkSync` fixtureが権限上作成できない場合は、テスト実行事実を記録し、skip実装は追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーが対応対象と非対象を明示済み。
- 仮定してよい細部: symlink fixtureの一時path、existing error wordingの再利用、補正checkpointの簡潔な内容。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `realpathSync(packageRoot)` と `realpathSync(targetPath)` の比較を既存package boundary check直後へ追加すれば、Validator責務を広げずsymlink escapeを拒否できる。
- H2: CodeRabbitのfeature-plan、Run lifecycle、absolute path、verify.ps1指摘は正本Plan / Repository contract / scopeと不一致であり、コード変更せず根拠を返信できる。

## Research Plan

- Round 1 Query: branch、PR head、正本Plan、対象Run、Validator、review threadを再確認する。
- Round 2 Query: symlink実装・fixture・既存relative link/image契約を確認し、targeted validationと最終verifyを実行する。
- Exit Criteria:
  - 2件の妥当なfindingだけが修正され、7件の非対象findingは根拠付きで返信されている。
  - symlink regression test、targeted validation、最終verify、sanitizationがPASSする。
  - 未コミット差分が許可されたscope内にあり、commit / pushを行っていない。

## Approach

- 既存コードを調査し、REPORT補正をappend-onlyで追記する。
- Validatorは既存target処理へrealpath後のpackage boundary確認だけを追加し、fixture testを最小追加する。
- targeted validation、lint、最終verify、scope確認、sanitizationを順に実行する。
- validation PASS後にCodeRabbitへreplyし、実体のあるthreadをresolveする。outside-diff findingはPR上で根拠を記録する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT -> validation -> reply/resolve`

## Definition of Done

- Attempt 1→2→3→4の論理順を過去REPORT末尾へappend-onlyで補正し、未知の実時刻を推測していない。
- Validatorがsymlink解決後のSkill package外targetを既存エラー表現でFAILし、inside symlinkは許容する。
- 既存relative link/image、fragment/query、external/anchor/reference-styleの契約を壊していない。
- targeted tests、`pnpm run validate:skills`、`pnpm run test:repository`、`pnpm run lint:markdown`、`pnpm run verify`、`git diff --check`、sanitizationがPASSする。
- CodeRabbitの9件について、2件は修正後にreply / resolve、7件は変更しない根拠をreply / resolveする。修正前のresolveはしない。
- 変更scope外ファイルが無変更で、commit / pushは未実施である。

## Risks / Unknowns

- Windowsのsymlink作成権限がローカルテストを不安定にする可能性がある。skipは追加せず、実行結果をRunへ記録する。
- GitHub API上、outside-diff findingは独立threadを持たない可能性がある。その場合はPR上の根拠コメントで記録し、実在threadだけをresolveする。
- 過去Run artifactの直接編集を避け、今回REPORTだけを指定どおりappend-onlyで追記する。

## Thinking Log

- 2026-09-06: CodeRabbit findingは現HEADの8 inline threadとfeature-planのoutside-diff finding 1件として確認した。正本Planは通常link/imageを同一処理し、package boundaryとrelative dependency integrityを要求している。
- 2026-09-06: evaluation / run lifecycle / PLAN heading / verify.ps1 / absolute pathはユーザー指定どおり今回変更しない。これは「より堅牢にする」ための先回り変更を避ける判断である。
