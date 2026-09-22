# Plan（計画）

## Objective（目的）

- PR #169の最終レビューで判明したStop Hook診断契約の不足を、既存のHook/launcher/state契約を壊さず修正する。
- active Stopのstdoutを1 invocationにつき最大1 JSONへ固定し、6種類のstate failureを実process contractでCI検証する。
- inactive Stopの安全な診断を`reason`と`systemMessage`へ分離し、Hook内部failureだけを安全なJSONLへ記録する。

## Scope（対象範囲）

- In:
  - `.codex/hooks/text_quality_gate.mjs` のactive cleanup順序、safe reason formatter、failure-only diagnostic JSONL。
  - `.codex/config.toml` のUnix/Windows Stop launcher fallback reasonとEncodedCommand再生成。
  - `tests/contracts/codex-text-quality.test.ts`、`tests/contracts/codex-hook-contract.test.ts` のprocess/launcher/log契約。
  - Plan、Safety Harness、今回のRun Artifact。
- Out:
  - state schema、cause allowlist、Hook event/matcher/timeout、fail-open/fail-closeの意味変更。
  - state/session履歴、session tracking、汎用logging framework、新規dependency/CI job、launcher永続ログ。
  - doctor、ADR、AGENTS.md、product codeの変更。

## Assumptions（仮定）

- 既存PR branchと現行mainの差分を確認し、mainのsecurity updateが今回の対象と競合しないためmerge/rebaseは行わない。
- 実Codexを人工的に壊して再現せず、fixture-based process contractを異常系の正本とする。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: cleanup failure fixtureはWindowsで安定しない場合、既存方針どおりPOSIX限定とする。log write failureはfilesystem fixtureで可能な範囲を検証する。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: active Stopのviolation診断をdeleteState成功後へ移動すれば、cleanup failure時もmain catchのdiagnosticだけが残り、stdoutは1 JSONになる。
- H2: safe code/cause formatterをreason、systemMessage、JSONLで共有すれば、allowlist外causeとraw exceptionを全経路から排除できる。

## Research Plan（調査計画）

- Round 1 Query: 現行HookのprocessStop/main catch/launcher fallbackと既存contractを確認する。
- Round 2 Query: 6分類fixture、cleanup failure、safe log、reason伝達を追加し、focused/標準/CIで検証する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- Task 0の現行状態・Plan・PR/CIを再確認する。
- Hook本体とlauncherを最小変更し、既存のactive missing/repeated Stop契約を維持する。
- process contractと情報漏えい防止、failure-only JSONLを追加する。
- Plan/Safety Harness/PR本文を同期し、Run Artifactをsanitizationしてcommit前に確定する。
- 通常commit/push後、最新headのWeb/Mobile/Hook/aggregate CIを確認する。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done（完了条件）

- active cleanup failureがfail-openかつstdout 1 JSON。
- 6 state failureがinactive Stop process contractで分類され、reason/systemMessage/logが安全に伝達される。
- launcher failure、通常violation、repeated active Stop、log write failureの既存境界が維持される。
- focused、test:hooks、diagnose、contracts、verify/wrapper、sanitizer、最新PR CIが成功する。
- strict Runの`evaluation.json`がschema validationを通り、collector後の`run.json`で`evaluation_present=true`になる。

## Risks / Unknowns（リスク・未知点）

- config.tomlのWindows EncodedCommand破損: 現行PowerShellをdecodeし、完全再エンコードして静的/decode contractで確認する。
- diagnostic logによる情報漏えい: finite safe code/causeだけをJSONLへ保存し、write failureはHook結果へ影響させない。
- mainとの差分: fetch後のmerge-baseと変更内容を確認し、意味上の依存が無い限り同期しない。

## Thinking Log（判断記録）

- 2026-09-22 14:16 JST: strict repair Runを開始。レビュー指摘はmust_fix、allowed filesをHook/config/tests/Plan/docs/Runに限定。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
