# GPT-5.6 Luna Subagent Orchestration 実装計画

## 0. 依頼概要

- 依頼内容: `docs/plans/2026-08-11_110600_luna-subagent-orchestration.md` の Wave 0〜9、Definition of Done、Runtime Acceptance を最新ワークツリーへ実装・検証する。
- 背景: 現行 harness は GPT-5.4 mini / medium、旧 config key、4 custom agent のみで、runtime identity/model compliance と quality runner の契約が未整備である。
- 期待成果: Parent orchestration、GPT-5.6 Luna / max の5 custom agent、recursive delegation 防止、read-only parallel の観測、write isolation の判定、quality runner、Source Integrity、Failure Taxonomy SSOT、Local / External completion state を既存 harness の範囲で確立する。

## 1. ゴール / 完了条件

- ゴール: Plan の契約を Current Repository の実状態へ最小差分で移行し、静的契約と実行時証跡を分離して、確認できたものだけを PASS とする。
- 完了条件: Static Contract、実 custom agent spawn、read-only parallel、recursive negative、write capability decision、quality runner、Runtime Agent Compliance、Source Integrity、bounded Failure / Repair path、Run Artifact sanitizer を検証する。CLI version / Luna / runtime identity が未確認の場合は `LOCAL_IMPLEMENTATION_COMPLETE=false` を維持する。

## 2. 現状理解と前提

- Current understanding:
  - `.codex/config.toml` は `features.codex_hooks`、`agents.max_threads`、`agents.max_depth` を使用している。
  - 4 custom agent はすべて `gpt-5.4-mini` / `medium`。`quality_gate_runner` は存在しない。
  - hook script と artifact collector は存在するが、`SubagentStart` の stdin payload から agent identity / actual model を保存していない。
  - `working-tree-snapshot.ts` / `benchmark-revision.ts` が既存 Source Integrity の基盤である。
  - `docs/reference/failure-taxonomy.md` は10 categoryを説明するが、Planが参照する `spec/failure-taxonomy.json` は現ワークツリーに存在しない。
  - Codex CLI は `codex-cli 0.142.5`。GPT-5.6 Luna 実行は新しい Codex が必要という400エラーで拒否された。
  - Open PR #17 / #18 は planning-only で、今回の agent / config / harness ファイルと競合しない。PR #19 は現 HEAD の merge commit に含まれる。
- Assumptions:
  - Luna / max の静的設定は実行環境が更新された場合に有効になる。現在の CLI version blocker を隠さない。
  - recursive delegation は child TOML の `agents.enabled=false` と必要な `features.multi_agent=false`、behavioral prohibition、negative run の組合せで制御する。
  - write workspace isolation が Current Codex で証明できない場合は serial fallback を採用する。
  - `spec/failure-taxonomy.json` は既存 Markdown reference と evaluation schema の10 categoryを機械化する唯一の catalog として復元する。新しい category は追加しない。
- Non-goals:
  - Product / Test behavior の変更、独自 LLM runner、Responses API wrapper、custom session / distributed worker / large worktree manager、第二 Failure Taxonomy、Git mutation、remote PR write。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーの Implementation 指示を L3 explicit approval として扱う指定がある。
- 仮定してよい細部: 既存 snapshot / collector の summary 境界、hook failure は execution を止めない既存契約、quality runner の write-tool block は安全な識別がない限り追加しない。
- 未回答の重要質問: 現在の `0.142.5` でなく必要な公式 minimum の Codex が利用可能か、更新なしには解決できない。Runtime Agent Compliance は actual hook evidence が得られるまで未完了とする。

## 4. 影響範囲

- Entry points: `.codex/config.toml`、`.codex/agents/*.toml`、`.codex/hooks/observe.*`、`scripts/verify*`、`scripts/collect-run-artifacts.py`、Run Artifact collector。
- Main flow: Parent が scope / WP / validation set を決定 → custom agents を spawn / wait / close → observation / subagent evidence を collect → integration review → quality runner が required set を実行 → Parent が Failure Taxonomy と completion state を判断。
- Key abstractions: custom agent TOML、SubagentStart/SubagentStop observation、subagent-run schema、hook-observation schema、working-tree snapshot、既存 Failure Taxonomy、run.json / evaluation.json。
- Existing tests: `pnpm run verify`、`pnpm run test:contracts`、Markdown lint、既存 agentic-QA contract / snapshot tests、package.json の full verify、CI workflow contract。
- Safe change surface: harness config、custom agent instructions、hook observation fields、collector summary、static verify、reference docs、machine taxonomy catalog、Run Artifact。
- Unknowns: 0.142.5 の正式サポート不足、tool-based spawn と Codex CLI hook の接続、write isolation、quality runner write-attempt の完全観測、remote checks。

## 5. 変更方針

- Phase A: Strict Run と本計画を保存し、Current main / PR / CLI / custom agent capability を記録する。
- Phase B: config / agent identity / recursion migration。sandbox / approval / network profile は保持し、旧キーだけを除去する。
- Phase C: Parent / worker / quality runner / runtime compliance / completion state の契約を AGENTS と reference に追加する。
- Phase D: stdin JSON の SubagentStart/SubagentStop observation、actual agent_type/model evidence、collector summary、schema を最小拡張する。
- Phase E: Bash / PowerShell verify の parity、all-agent invariant、legacy absence、Failure Taxonomy SSOT、Source Integrity / quality runner contract を機械検証する。
- Phase F: 新しい CLI が利用できない状態でも、read-only multi-agent tool run、serial write fallback、quality gate / failure-repair simulation を可能な範囲で実施し、未確認を明示する。

## 6. 検証方法

- Static: TOML parse、agent identity/model/effort/sandbox、parent config、legacy absence、docs behavioral markers、taxonomy catalog、Bash / PowerShell parity。
- Runtime: `codex --version`、Luna/max acceptance、SubagentStart evidence、read-only parallel overlap、recursive negative、quality runner result、before/after Source snapshot。
- Repository: `bash scripts/verify`、PowerShell counterpart、`pnpm run test:contracts`、`pnpm run lint:markdown`、変更 scope に応じた `pnpm run verify`。
- Failure / Repair: 既存 contract fixture で bounded failure → investigators → Parent causal judgement → worker repair → revalidation。新しい Product fixture は作らない。
- 成功判定: 未実行・pending・unknown は PASS ではない。CLI blocker、runtime identity/model blocker、Source Integrity誤除外が残る場合は local completion false。

## 7. リスクと未解決論点

- CLI version 不足: global Codex を更新せず BLOCKED 記録。静的実装と fallback 検証は継続。
- hook payload の仕様差: official stdin fields (`agent_type`, `agent_id`, `model`) のみを読み、transcript parsing や `continue:false` に依存しない。
- quality runner の Source write: tool-level block を作らず、developer prohibition + observation + net snapshot を fail-close とする。
- taxonomy 欠落: reference と schema の既存10 categoryだけを JSON catalog 化し、別分類は作らない。
- external checks: GitHub Actions / platform checks は read-only確認可能な範囲だけ収集し、未確認は `MERGE_READY=false` とする。

## 8. ガバナンス / Rollback

- User / Owner explicit approval: 本依頼の「Planを最後まで実装する」という明示指示を、Plan Section 7.20 の L3 approval として記録する。
- L3 boundary: sandbox、child agent tool availability、multi-agent config、hooks / wrapper observation、runtime compliance、validation scope。
- Expected behavior: custom-only、Luna/max pin、child recursion禁止、read-only changed_files=[]、quality runner source修正禁止、completion state fail-close。
- Rollback condition: config / hook / collector が既存 safety hook を弱める、旧 harness verify が回復不能、Product/Test/Spec Source を generated 扱いする、または runtime contract が不明瞭になる場合。
- Rollback procedure: merge / commit 操作は行わず、人間が問題 commit を revert し、旧 config / agent / hook / harness contract に戻した後 baseline verify を再実行する。Agent自身は destructive rollback を行わない。

## 9. 成果物

- 変更対象: `.codex/config.toml`、5 custom agent TOML、AGENTS / reference、hook / collector / schema、`scripts/verify*`、必要な taxonomy catalog、Run Artifact。
- 付随証跡: `.codex/runs/20260811-124437-JST/`、`.artifacts/luna-orchestration/`（raw log）。
