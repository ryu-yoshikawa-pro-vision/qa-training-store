# Plan（計画）

## Objective（目的）

Codex用の既存Shell安全性判定をOpenCode V2でも共有し、重複した危険操作判定を作らない。

## Scope（対象範囲）

- In: OpenCode V2の設定、Plugin、契約テスト、Hook testスクリプト、運用・ロールバック文書。
- Out: Codexの既存Hook・sandbox・wrapperの変更、OS sandbox実装、MCP等のShell以外の経路、ログイベントの意味変更。
- 正本計画: `docs/plans/2026-11-17_223407_codex-opencode-v2-common-safety.md`

## Assumptions（仮定）

- ユーザー承認に基づき専用ブランチで実装する。mainへの直接変更・mergeはしない。
- 実機検証不可の間、OpenCodeのShellは原則承認制とする。

## Questions / Ambiguity（質問・曖昧性）

- 実装を妨げる質問はない。未検証のV2 runtime動作は検証結果として区別する。

## Hypotheses（仮説）

- H1: V2 `execute.before`から既存の`evaluateCommand()`を呼べる。
- H2: Codexの判定を変更せず、同一の危険操作をOpenCodeでも拒否できる。
- H3: Shellを原則`ask`にすることでPlugin未ロード時の自動実行リスクを減らせる。

## Research Plan（調査計画）

- 既存Codex Hookの公開関数、受信payload、ポリシー行列を確認する。
- OpenCode公式V2 Pluginとpermissionsの形式を確認する。
- 契約テストと実機ランタイム検証の境界を明示する。

## Approach（進め方）

1. 既存Hookを正本としてOpenCode Pluginを実装する。
2. V2 permissionsと対象の契約テストを追加する。
3. 運用・rollbackを文書化し、別ブランチPRのCIを確認する。

## Definition of Done（完了条件）

- Codex既存Hookを変更せず、OpenCode V2 Pluginの設定と契約テストが追加される。
- 変更ファイルを対象とする検証結果を報告する。
- OpenCode実機での動作確認は別途証拠が必要であり、未実施の場合は未完了とする。

## Risks / Unknowns（リスク・未知点）

- Plugin APIはベータであり、実環境での起動・信頼と権限の組合せは未検証。
- GitHub Connector経由で変更しているためローカルpnpm検証を実行できない。
- rollbackは本PRの変更をrevertする。既存Codex設定は不変。
