# Plan

## Objective

- （今回の指示を達成する）

## Scope

- In:
- Out:

## Assumptions

- （不明点があれば明示）

## Questions / Ambiguity

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses

- H1:
- H2:

## Research Plan

- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 満たしたら完了とする条件

## Risks / Unknowns

- リスクと対策

## 今回の実行計画

- 目的: Issue #60の`git -C <path>` bypassを防止し、指定branchで検証・commit・push・OPEN PR作成まで完了する。PRはmergeしない。
- 現在確認できた事実: 最新`origin/main`と指定branchは`690274a`で一致し、指定branchの既存worktreeはclean。Hookの`getOperationTail()`／`hasOperation()`／`needsGitContext()`は`git`直後のsubcommandを前提としている。
- 仮説: Git invocationを共通token解析してsubcommandを正規化し、`-C` pathを実行cwdから解決すれば、既存G1〜G10/N1〜N4を再利用しながらbypassと別repository誤判定を防止できる。
- In: Node Hookの共通解析、effective repository context、contract regression、必要最小限のsafety harness文書。
- Out: branch manager、PR state manager、Git wrapper、Windows launcherのpolicy二重実装、sandbox／approval／permission変更、依存更新、#63変更。
- 実施順: 計画保存 -> Hook実装 -> contract test -> focused／全contracts／quality gate -> self-review -> sanitizer／evaluation -> commit -> push -> PR -> 最終確認。
- 検証: `pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1`、`pnpm run test:contracts`、`pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run verify`、`git diff --check`、Run Artifact sanitizer。
- rollback: 変更を単一commitにまとめ、必要時はそのcommitだけをrevertする。mainへのmutation、force操作、履歴書き換えは行わない。

## PR #65 レビュー修正計画

- 目的: Issue #60の既存実装を、Git invocation単位のrepository context評価へ修正し、PRレビューで確認された4つの安全境界漏れを閉じる。
- 対象: `.codex/hooks/pre_tool_use_policy.mjs`、`tests/contracts/codex-hook-contract.test.ts`、既存plan、必要最小限のreference／living docs、既存Strict Run Artifact。
- 実装契約: shell boundary内の全Git invocationを列挙し、invocationごとにsubcommand、operation tail、effective cwd、GitContextを決定して既存G1〜G10へ渡す。1件でもDENYならcommand全体をDENYする。
- `-C`契約: 正式な`-C <path>`だけを扱い、同一invocation内の複数`-C`を出現順に累積する。各invocationはprocess cwdから独立して解決する。
- repository-changing option契約: `--git-dir`／`--work-tree`のseparator／`=`形式を検出し、完全なGit semanticsを再実装せず、context-sensitive mutationではG10相当でfail-closeする。safe read-only operationは既存契約どおりALLOWする。
- 検証契約: matrixは配列indexでcaseとevaluationを1対1比較する。複数invocation、後続force push、後続`reset --hard`、multiple `-C`、quoted path、repository-changing option、Windows launcherをcontract testへ明示する。
- 対象外: 完全なGit／shell parser、branch／worktree／PR state manager、Git wrapper、Windows launcherのpolicy二重実装、dependency／lockfile、履歴書き換え。
- 完了条件: focused contract、全contracts、format、markdown lint、lint、typecheck、verify、diff check、Run Artifact sanitizerがPASSし、self-review後に追加commitを明示refspecでpushしてPR #65をOPENのまま更新する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
