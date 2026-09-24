# Plan（計画）

## Objective（目的）

- PR #168のcommon smokeのresume引数順とtool実行不確定性を修正し、bounded diagnosticsと回帰testを追加する。
- 新しいEvaluator SHAで実装検証・CIを完了し、fresh sanitized Targetのmanual detach待ちまで準備する。detach後のcanonical live Workflow E2Eは1回だけ行う。

## Scope（対象範囲）

- In: `scripts/evals/run-skill-workflow-evals.ts`、`tests/repository-contract/skill-workflow-evals.test.ts`、このRun Artifact。
- Out: canonical Plan、schema version、case semantics、Hook/config、sandbox/approval/model、CI workflow、同一Evaluator SHAの再実行。

## Assumptions（仮定）

- 開始時PR headは`e6fc0af78bc90fee4bd8090361e953151324701b`。
- 前回canonical runは`0d0b11c3177577cbe7131919e39ba2430e74f553`で消費済み。
- CLIは`codex-cli 0.155.1`。この実行環境で`codex exec resume --help`も確認する。

## Questions / Ambiguity（質問・曖昧性）

- 未回答の要件質問なし。manual detachは新Target準備後にユーザー操作を依頼する。

## Hypotheses（仮説）

- H1: resume subcommandより後ろに置かれたexec-level `--sandbox` / `-C`等がresume turnを失敗させている。
- H2: smoke promptがshell実行を要求していないため`command_execution`がモデルのtool選択に依存している。
- H3: bounded turn diagnosticsで、次回blocked時に実際の失敗predicateを区別できる。

## Research Plan（調査計画）

- Round 1: PR/CI/前回result、Plan、runner/test、CLI help/tagged仕様を確認する。
- Round 2: focused/repository-wide validation、self-review、implementation commit/CI、fresh Target preflightを実施する。
- Exit Criteria: CLI argumentsとsmoke predicatesをtest固定し、CI PASS後にTargetをmanual detach待ちへ渡す。

## Approach（進め方）

- source変更はrunnerとrepository contract testの2 fileへ限定する。
- resume時もexec-level optionsを`resume <thread_id>`の前に置き、stdin prompt `-`を最後に保つ。
- fixed Node commandをturnごとに実行させ、expected command / exit 0とfile actual writeを別々に判定する。
- JSONL diagnostics、bounded redacted previews、probe exception reasonをresultの既存`smoke_probe`へ保存する。
- common smoke 12 predicatesのPASS条件、Plan、schema versionを変更しない。
- Targetは新Evaluator revisionのtracked Git objectだけから作成し、synthetic root commit後に手動detachを依頼する。
- canonical run終了までEvaluator SHAを動かさない。runは新Evaluator revisionで1回だけ。

## Definition of Done（完了条件）

- focused tests、`test:repository`、`lint:markdown`、`verify`、diff checkがPASSし、差分のself-reviewが完了する。
- implementation commitの最新head CIがPASSする。
- 新revisionからTargetを生成し、file/path/root/remote/alternates preflightがPASSしてmanual detach待ちとなる。
- detach後、全preflight PASS時だけcanonical runnerを1回実行し、resultをsanitizationしてartifact-only commit/push、PR本文更新、最新head CI確認を行う。
- canonical成功はPlanの全条件を満たした場合だけとする。

## Risks / Unknowns（リスク・未知点）

- resume parse修正後もHost Runtimeがsmoke capabilityを拒否しrun-level blockedになる可能性がある。diagnosticを正本として1回で停止する。
- smoke commandの実行とfile actual writeは独立して評価し、片方からもう片方を推定しない。
- 新しいTargetでmanual detachまたはphysical Android deviceの条件が成立しない場合、canonical runは起動しない。

## Thinking Log（判断記録）

- 2026-09-23: start headはremote/localとも`e6fc0af...`、PR OPEN、`origin/main`へのbehind 0、worktree cleanを確認。前回`0d0b11c...`はblockedで同revisionは再実行しない。
- 2026-09-23: installed CLIは`codex-cli 0.155.1`。resume helpに`--sandbox` / `-C`がなく、runnerの現在のpost-resume配置と一致しない。修正はこの指定revisionに対して行う。
