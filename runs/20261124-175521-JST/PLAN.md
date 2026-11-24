# Plan（計画）

## Objective（目的）

- G10拒否診断、Codex sandboxとの切り分け、Git CLI復旧手順、迂回防止とCodex/OpenCode回帰を整備する。既存Issue #192を再利用し、最新mainから専用PRを作る。

## Scope（対象範囲）

- In: 共通G10 Hook、既存hook診断、Git safety / Codex safety reference、OpenCode共通adapter契約、隔離Git CLI fixture、既存品質ゲート。
- Out: PR #199/#229、product、AGENTS.md、sandbox設定の変更、GitHub API経由のcommit/ref更新、merge/close/force push。

## Assumptions（仮定）

- G10の拒否IDと安全境界を維持し、必要なreason文と診断表示を改善する。実装中に見つかったactive command substitutionの解析抜けは、既存policyへの接続を追加して閉じる。
- ユーザー承認に基づき`.codex/config.toml`の`approval_policy`だけを`never`から`on-request`へ変更した。`workspace-write`、network、`writable_roots`、Hooksは維持。Codex公式仕様上、workspace-writeでも`.git`等は保護されるため、通常のGit metadata書込みはruntimeで別途確認する。
- Codex 0.172.0。OpenCode v2.3.0は一時XDG data dirで起動し、server logでPlugin entrypointのロードを確認したが、tool invocationは未確認。契約テストと実runtime確認を区別する。
- 同目的のOPEN Issue #192を参照する。PR #227はmerge済みで今回の変更先ではない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 現在の承認範囲を越えるsandbox / approval変更が必要と判明した場合は、具体的な差分とrollbackを示して承認を得る。
- 仮定してよい細部: managed executorの承認付き単発実行は設定変更でなく、許可済みGit CLI経路の候補として検証する。
- 未回答の重要質問: 現時点ではなし。CLI直接起動/ OpenCode runtimeで検証できない項目は未確認として報告する。

## Hypotheses（仮説）

- H1: 事象はG10による正規root未確認の実行前拒否と、workspace-writeが保護する`.git`/`.codex` metadataへのsandbox拒否が異なる層で起きた。
- H2: managed executorの承認付きsandbox実行は、G10 anchorを維持した通常Git CLI操作に利用できる。通常commit/pushまで別途検証する。

## Research Plan（調査計画）

- Round 1 Query: local/mainとGitHub状態、Issue #192、G10/診断/テスト、OpenCode設定、Codex/OpenCode公式権限仕様を読む。
- Round 2 Query: baseline tests、実装後decision comparison、隔離Git CLIのadd/commit/bare push、CIと独立reviewを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach（進め方）

- 決定論的なG10安全判定を維持し、reason表示のみ分類する。診断はread-onlyでruntime未知情報を`未確認`と表示する。
- Git safety referenceを復旧手順の正本にし、他文書は短い参照に留める。
- 確認後、明示ファイルstage、literal-root anchor、通常のGit CLI、single refspec pushを使う。API経由のcommit/ref更新は禁止。
- 標準フロー: `PLAN -> baseline -> TASKS -> 実装 -> REPORT -> review/validation -> commit/push/PR/CI`

## Definition of Done（完了条件）

- G10 decision ID/allow-deny結果維持、diagnostics/read-only、recovery docs一致、OpenCode契約維持、isolated CLI tests成功、CI成功、独立review完了。
- 最新headの通常Git CLI commit/pushとPR作成を確認し、PR #199/#229に変更がない。

## Risks / Unknowns（リスク・未知点）

- root/errorの診断改善で判定を緩和しない。診断文字列にraw command/path/remote/credentialを出さない。
- `on-request`が`.git`書込みを許可するとは仮定しない。現在の実行経路で拒否された場合は拒否レイヤーを特定し、正規CLIの承認経路で成功が確認できるまでGit復旧を完了扱いにしない。
- runtime未検証（direct CLI/OpenCode/Windows/WSL）は実機PASSと報告しない。

## Thinking Log（判断記録）

- 2026-11-24: Issue #192がOPEN。GitHub main=`b8beb9f...`。branchは通常Git CLIでmainから作成。
- 2026-11-24: Codex official specではworkspace-write内の`.git`/`.codex`はprotected read-only。ユーザー承認を受け、project `approval_policy`を`on-request`へ変更。これは承認経路の有効化であり、protected `.git`書込み権限の証明ではない。
- 2026-11-24: managed executor経由のG10 root-anchored `git switch -c`が成功。これはcommit/pushの実行確認ではない。
