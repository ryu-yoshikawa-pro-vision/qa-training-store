# Issue #60: Codex Git branch protectionの実装契約同期

## 変更理由

- `.codex/hooks/pre_tool_use_policy.mjs`が`git -C <path> <subcommand>`を通常形式と同じGit operationとして判定し、`-C`のeffective repository contextでprotected branchを確認するよう変更された。
- living documentである`docs/PROJECT_CONTEXT.md`へ、Git global option正規化とeffective repository contextの契約を反映する。

## 変更内容

- Git invocationのglobal option／subcommand解析を既存Hookへ共通化した。
- `git -C` variant、protected／feature branch、別repository、quoted path、shell chainingのcontract testを追加した。
- Windows launcher、sandbox／approval、branch manager、Git wrapper、依存関係は変更していない。

## PR #65 レビュー修正追補（2026-08-25）

- 1つのshell command内の各Git invocationを独立評価し、invocationごとのeffective repository contextを既存G1〜G10へ渡す契約へ修正した。
- 複数`-C`を出現順に累積解決し、`--git-dir`／`--work-tree`を含むcontext-sensitive mutationはG10相当でfail-closeする回帰を追加した。
- 同一subcommandの後続dangerous operationと、duplicate IDを持つ`POLICY_MATRIX`全variantを配列indexで個別検証する契約を追加した。

## 検証結果

- focused Codex Hook contract: 75/75 PASS。
- 全contracts: 403/403 PASS。
- `pnpm run verify`: PASS。unit、integration、repository、component、contracts、web build、spec buildを含む統一品質ゲートを完了した。
