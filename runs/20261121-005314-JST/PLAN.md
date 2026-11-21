# Plan（計画）

## Objective（目的）

- Codex実行ラッパーとそのためだけの設定・検査を除き、direct `codex`を標準にする。

## Scope（対象範囲）

- In: wrapper/sandbox/手動cleanupの現行実装、専用テスト/CI/verify/docs、直接起動設定と安全性契約。
- Out: 保存済みRun、Native/Web製品、Windows向けコード・CI自体、sandbox/approval/Hooks/rules/agentsの緩和。

## Assumptions（仮定）

- userが明示した対象と理由は、指定済みwrapper/専用設定/テストの削除承認にあたる。
- strict Runのmanifest機械更新は既存collectorの明示実行で保ち、`run.json`を手編集しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。
- 仮定してよい細部: wrapper固有テストと独立Hook/Run/credential契約を分離する。
- 未回答の重要質問: direct Codex runtimeはユーザーCodex HOME配下のreadonly SQLite stateにより起動できず、Hook trust/runtime検証は未完了。

## Hypotheses（仮説）

- H1: safe/task/sandboxはCI・verifyと互いの内部呼び出し以外の通常実行元がない。
- H2: cleanup scriptsは手動補助のみで、Run作成/収集/サニタイズとは独立して削除できる。
- H3: collector/new-run/manifest/evaluationとHook/sanitizer/security scanはwrapper廃止後も必要。

## Research Plan（調査計画）

- Round 1: call graph、config/trust、strict Run、test/CI、docsをread-onlyで調査。
- Round 2: wrapper削除後の独立契約を残し、Linux検証とCIで回帰を確認。
- Exit Criteria: 指定実行経路に依存する箇所がない。残存契約を独立テスト・docsで説明できる。

## Approach（進め方）

1. 計画を保存し、read-only調査結果をRunへ記録する。
2. wrapper、sandbox、auto-net preset、cleanup専用機能を削除し、直接起動・Run/安全性契約へdocs/verify/CIを整合する。
3. 基本テストを実行し、stage品質、通常commit/push、PR CIまで確認する。

## Definition of Done（完了条件）

- wrapper専用機能が不要な場所から除かれ、direct `codex`が現行手順となる。
- strict Run、Hook、sandbox/approval、execpolicy、subagent、sanitizer、credential検査、Git safety、履歴を維持する。
- Linux検証と最新HEAD必須CIが成功する。
- 実runtime安全性を確認できない場合は成功扱いにせず理由を記録する。

## Risks / Unknowns（リスク・未知点）

- wrapperと統合されたテストにRun/Hooks契約が混在している。
- runtime trust stateはCodexユーザー環境に保持され、現環境ではCodex SQLite stateがreadonlyで直接CLI起動できない。

## Thinking Log（判断記録）

- 開始HEAD/local/originは`64f6378a166a407d9b5d02b2acbd8ed1e71cc5c3`で一致。PRはopen、baseは`main`、開始HEADのWeb/Mobile CIはsuccess。
- 3つのread-only Luna roleでcall graph、安全性設定、collector/cleanup契約を並行調査した。
- user-level `codex --version`は0.170.0。直接CLIは通常起動と`--no-daemon`の両方でCodex HOME内SQLiteのread-only open失敗（exit 1）。設定変更やtrust bypassは行わずruntime未検証。
- CodeQLの未解決threadは2件ともHook契約test内。今回の削除範囲外として保持する。
