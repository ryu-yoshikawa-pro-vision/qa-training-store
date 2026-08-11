# 計画

## 目的

PR #20 のレビュー指摘を原因単位で修正し、GPT-5.6 Luna orchestration の runtime evidence、execpolicy、portable validation、Run Artifact が実際に証明できる範囲だけを PASS とする状態へ戻す。

## 対象範囲

### 含むもの

- Runtime Agent Compliance の invocation 単位の `expected` / `observed` / `missing` / `unexpected` / `violations` / `status` 集約と contract test。
- Node.js validation dispatcher と、prefix allow の限界を wrapper の引数検証で補う execpolicy 整理。
- PowerShell/Bash hook の stdin guard、Python interpreter discovery、Bash/PowerShell verify parity。
- parse 済み TOML の legacy key 検査、Failure Taxonomy と evaluation の整合、catalog の `$schema` 除去。
- Run baseline と Parent/accepted subagent changes の aggregate、current completion state、Evidence kind の整合。
- suite-local Vitest timeout、計画・履歴・参照文書・Run Artifact の表現修正。
- read-only parallel runtime acceptance、validation dispatcher の positive/negative、quality gate、最終 sanitizer。

### 含まないもの

- Product behavior、assertion の意味、独自 orchestration platform、custom session manager、Responses API wrapper。
- 新しい Failure Taxonomy / Source Integrity framework、global timeout の維持、Git mutation、PR更新、review thread resolve。

## 前提

- 対象ブランチは `feat/luna-subagent-orchestration`、開始時の source worktree は clean。HEAD の実装差分は PR #20 の既存 commit として再確認済み。
- `gpt-5.6-luna` と `max` は既存の current Codex CLI で受理済みだが、reasoning effort は runtime で直接観測できない場合は configured evidence としてのみ記録する。
- project-scoped agent の invocation identifier は既存 `subagent_run_id` と `metadata.runtime_agent_id` を利用し、1:1 identifier が欠けるケースは PASS に補完しない。
- `.codex/runs/` は source `changed_files` から除外し、Run baseline は開始時点の source changed files として保存する。

## 質問・曖昧性

- 必ず質問する不透明点: なし。添付指示が修正内容、scope、完了条件を明示している。
- 仮定してよい細部: 現行 collector と snapshot の相対 path semantics、hook failure は既存どおり実行を止めないこと、PowerShell 実行ファイルは PATH discovery すること。
- 未回答の重要質問: external GitHub checks の状態はこの作業の local completion と分離し、実行できない場合は `MERGE_READY=false` とする。

## 仮説

- H1: expected records の `metadata.runtime_agent_id` と hook `agent_id` を照合すれば、同じ role の複数 invocation も set 比較なしで欠落を検出できる。
- H2: validation dispatcher を `spawn` の argv と固定 action allowlistで実装すれば、execpolicy の prefix allow が extra argument を通しても underlying command は実行されない。
- H3: source baseline との差分を collector が再計算し、accepted subagent changes と union すれば、pre-existing dirty source を混ぜず Parent change を失わない。
- H4: suite-local timeout は対象 suite の cold-load だけを許容し、他の Vitest test の default 5秒契約を維持できる。

## 調査計画

- Round 1: PR #20 の現行 commit、既存 Plan/ADR/Run、collector、hook、rule、verify、schema、Vitest を確認する。
- Round 2: read-only custom agent を同一 Parent から parallel spawn し、runtime hook の identity/model と `changed_files=[]` を確認する。
- Round 3: bounded repair iteration ごとに focused contract、static validator、Bash/PowerShell parity、dispatcher negative、tests、full local gate を検証する。
- 終了条件:
  - expected invocation 全件の 1:1 観測がない Run は pass にならない。
  - dispatcher の unknown/extra、arbitrary `pwsh -Command`、suite-local timeout、taxonomy relation、changed-files aggregate の各 contract test が PASS。
  - required local gate、runtime acceptance、Source Integrity、sanitizer の未実行・unknown を PASS に補完しない。

## 進め方

1. finding を `must_fix` / `should_fix` / `defer` / `reject` に分類し、iteration 1 の allowed files を宣言する。
2. read-only research の結果を反映して、runtime/dispatcher/portability/artifact の根因を小さな patch にまとめる。
3. timeout と文書・Run Artifact の修正を分離して検証する。
4. implementation worker は必要な場合だけ serial で限定利用し、quality runner は Parent-defined set を変更せず実行する。
5. 最後に Run Artifact を更新し、sanitizer の Write/Check を全追記後に実行する。

## 完了条件

- Runtime Compliance に invocation 単位の完全性があり、expected 空・欠落・unexpected generic・model mismatch・allowlist外・同一role片側欠落を非PASSにする contract test がある。
- validation dispatcher、execpolicy、arbitrary PowerShell prompt、Bash/PowerShell/Python portability が確認できる。
- Bash/PowerShell verify parity、parsed TOML legacy check、Failure Taxonomy/evaluation relation、catalog、Run aggregate、completion state、Evidence kind が整合する。
- `vitest.config.ts` に global `testTimeout` がなく、対象 suite のみ15秒である。
- read-only 3-agent parallel、quality gate、required validation、focused/full tests、`pnpm run verify`、Source Integrity、sanitizer が証跡付きで完了する。
- local checks 完了時のみ `LOCAL_IMPLEMENTATION_COMPLETE=true`、external pending 時は `MERGE_READY=false`。

## リスク・未解決

- CLI hook が一部 invocation を観測しない場合は `incomplete`/`unknown` として停止し、fixture を runtime PASS に昇格しない。
- PowerShell 7 固定 path を使わず PATH discovery するため、実行可能な shell がない環境では dispatcher を明示的に失敗させる。
- 古い Run の履歴は削除せず、current state と `Historical (...)` を明示的に分離する。

## 判断ログ

- 2026-08-11 20:05 JST: Run `20260811-200537-JST` を PR #20 修正用 Strict Run として初期化した。
- 2026-08-11 20:08 JST: 現行実装を再確認し、最優先根因を runtime completeness、prefix allow、baseline aggregate、global timeout、artifact taxonomy と分類した。
