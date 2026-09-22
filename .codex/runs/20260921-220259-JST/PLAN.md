# Plan（計画）

## Objective（目的）

- 正本Plan [`docs/plans/2026-09-20_133400_codex-hook-offline-diagnostics.md`](<REPO_ROOT>/docs/plans/2026-09-20_133400_codex-hook-offline-diagnostics.md) のTask 0〜12を、現行`origin/main`を基準に実装する。
- Codexを起動しない `pnpm run test:hooks` と、Repository rootのHook設定・既存text quality stateを変更せず診断する `pnpm run diagnose:hooks` を追加する。

## Scope（対象範囲）

- In:
  - PlanのHook contract、shared pure state validator、baseline failure code、safe cause、doctor CLI、process contract、wrapper、CI、運用文書、Run Artifact。
  - 既存のfail-open / fail-close、schema v2、state lifecycle、active Stop cleanup、Windows / Ubuntu既存CI経路。
  - 既存PR #169のbranch `feat/codex-hook-offline-diagnostics`への通常commit / pushと、PR本文・最新head CIの確認。
- Out:
  - Codex Host、trust / managed override、project root / cwd layering、user / system / plugin Hook、Hook framework、state repair / history、evidence file、session tracking、新規CI job / dependency。
  - merge、force push、branch削除、PR close、Issue close、release、tag作成。

## Assumptions（仮定）

- Plan作成後のmain側変更は、fetch済み`origin/main`と現行branchの実コード・CI・package managerを正本として反映する。
- PR #169はOPENで、head branchと作業branchは一致している。既存の別PR用pending Runは今回のtaskへ流用しない。
- filesystemのsymlink作成がOS権限で不可能なcontract testは、Planの指示どおりそのcaseだけをOS制約としてN/Aにし、拒否実装自体は緩めない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。ユーザー指示と指定Planで責務境界・DoD・Git操作が確定している。
- 仮定してよい細部: 現在のHook実装、既存contract test、`smol-toml`、Node標準機能の既存構造を最小差分で再利用する。
- 未回答の重要質問: なし。

## Research Plan（調査計画）

- Round 1: Plan全文、`origin/main`、PR / branch / merge base / working tree、Hook / config / contract / CI / package / verify wrapperを確認する。
- Round 2: Task順に実装し、focused、wrapper、標準verify、最終verify、scope、sanitizationを確認する。
- Exit Criteria:
  - Planの成功判定をすべて満たし、baseline failure分類・safe cause・read-only doctor・CI共通入口の根拠がある。
  - 失敗は原因分類と修正または未実行理由をRun/最終報告へ記録する。

## Approach（進め方）

1. Task 0の現行状態確認と実装baselineを確定する。
2. Task 1〜6で既存contractを正本として共有state validator、Hook診断詳細、focused入口、回帰testを実装する。
3. Task 7〜9でdoctor本体とtemp Git process contractを実装する。
4. Task 10〜12でoffline切り分け、既存CIへの最小組み込み、運用文書を反映する。
5. focused / wrapper / 標準 / `pnpm run verify`、diff scope、Run Artifact sanitization後にcommit・pushし、PR最新headの必須CIを確認する。

## Definition of Done（完了条件）

- 指定Planの「5. 検証方法」と「6. 成功判定」をすべて満たす。
- `test:hooks`、`diagnose:hooks`、両verify wrapper、Repository標準検証、最終`pnpm run verify`を実行し、今回の変更に起因するfailureを解消する。
- Run Artifactをsanitization / Checkし、変更範囲をPlanと照合したうえで、PR #169の対象branchへ通常pushする。
- push後の最新PR headでPlan記載のUbuntu / Windows必須CI（`Vitest (contracts)`、`Codex Hook contract (Windows)`、aggregate `verify`）を確認し、PR本文へ実装・検証・CI結果を反映する。

## Risks / Unknowns（リスクと対策）

- shared validator抽出で受理条件やdecisionを変えるリスク: 既存schema / state lifecycleを回帰testで固定し、詳細code以外の差分を許容しない。
- diagnosticからstate本文・path・session・secretが漏れるリスク: 出力は固定code、件数、event概要に限定し、doctorはcommand本文を解析・出力しない。
- doctorがsymlink追跡やGit index refreshを起こすリスク: ancestorを順に`lstat`し、Gitは`GIT_OPTIONAL_LOCKS=0`付きread-only commandだけに限定する。
- Windows依存fixtureと既存長時間Hook contractのリスク: Planのtimeout・OS差異契約を維持し、symlink / permissionだけをOS制約として分類する。

## Thinking Log（判断記録）

- 2026-09-21 JST: Plan全文801行を確認した。
- 2026-09-21 JST: fetch後の`origin/main`は`fa930b8`、HEADは`49e4bb2`、merge baseは`fa930b8`。Plan作成時baseとの差分を現行実装へ優先適用する。
- 2026-09-21 JST: PR #169はOPEN、head branchは`feat/codex-hook-offline-diagnostics`、working treeはclean。既存PR #167用Runは今回のtaskと無関係なため新Runを初期化した。
- 2026-09-21 JST: Task 0 wrapper baselineはPowerShellが既存text quality 30件FAIL（`textlint_rule_load`、node_modules junctionが別workspaceを指す環境要因を確認）、BashはGit BashからNodeを解決できず`node: not found`。実装後に依存環境を再構成して再検証する。
