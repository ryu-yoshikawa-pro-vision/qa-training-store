# Plan

## Objective
- PR #9の残存修正指示に限定し、Native Flowの非同期完了契約、脆いContract、SQLite接続解放、対象RunのArtifact完全性評価を修正・検証する。
- 既存のCodex Artifact Sanitizer、Native Persistence、Android CI、Maestro入力分離、Native成果物保存規約を壊さない。

## Scope
- In:
  - `tests/contracts/native-windows-local-validation.test.ts`
  - `maestro/native-low-stock.yaml`
  - `maestro/native-purchase-limit.yaml`
  - `tests/contracts/native-test-control-maestro.test.ts`
  - `tests/contracts/native-sqlite-transactions.test.ts`
  - `.codex/runs/20260807-094024-JST/REPORT.md`
  - `.codex/runs/20260807-094024-JST/evaluation.json`（事実整合性に必要な場合）
  - 本Runの標準Artifact
- Out:
  - Regex Cache、Sanitizer高速化、Action SHA pin、Retention／Cache cleanup、過去Run一括書換え、BOM保持、Remote CI、Git mutation
  - APK、`.artifacts/native-local/**`、`output/**`の追跡追加

## Assumptions
- `gh` CLIは利用できないため、PR Head確認は読み取り専用のGitHub APIまたはリポジトリの読み取り情報で補完する。
- `.codex/runs/20260807-094024-JST/REPORT.md`の完全一致は証明できないため、復旧元と不確実性を事実として追記する。
- Android実機が利用可能なら個別Maestro Flowを実行するが、実機Buildが必要な場合は既存Runbookのpreflightに従い、cache削除やcleanupはしない。

## Questions / Ambiguity
- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Triage
- `must_fix`: 上記5コード／テスト修正、対象Runの0 byte REPORT事象と評価の整合化。
- `should_fix`: なし。大規模抽象化やHelper化は行わない。
- `defer`: Remote CIの変更後結果（ユーザーのpush後に確認）。
- `reject`: BOM保持、今回明示的に却下された最適化・cleanup項目。

## Hypotheses
- H1: Windows Contractの空白差異は、Skillへ不自然な空白を足さず、Contract側の空白許容正規表現で解消できる。
- H2: Low Stock／Purchase Limitは、追加完了メッセージをIDで確認してからCart遷移することで永続化Raceを防げる。
- H3: SQLiteテストは対象テスト本体を`try/finally`で囲むことで、Assertion失敗時も`sqlite.close()`へ到達できる。
- H4: 0 byte REPORT事象を末尾追記し、既存`partial`評価をartifact integrity警告へ拡張すれば、履歴を改変せず事実整合性を回復できる。

## Research Plan
- Round 1 Query: 最新PR Head、対象コード、対象Run、Git追跡状態を確認する。
- Round 2 Query: 最小修正後にFocused Contract／Native Component／Sanitizer／Format／全品質ゲート／実行可能な個別Maestroを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- `PLAN -> TASKS -> read-only investigation -> bounded iteration 1 repair -> focused validation -> full validation -> Artifact integrity check` の順で進める。
- 修正は既存方式に合わせ、YAML parser導入、固定Sleep、Assertion削除、Flow skip、cache cleanupを行わない。

## Definition of Done
- Contractの空白依存がなく、Low Stock／Purchase Limitの順序Contractがある。
- SQLite対象テストが失敗時も`sqlite.close()`へ到達する。
- 旧RunのREPORT切り詰め事象と復旧限界が末尾追記され、evaluationと整合する。
- Focused test、Native Component、Sanitizer、Format、`pnpm run verify`が成功する。
- 実行可能な個別Native Flow結果、未実行のRemote CI、Native成果物のGit追跡状態を正確に報告する。
- Git mutation、不要な削除、Native成果物規約の逆転を行わない。

## Risks / Unknowns
- 旧REPORTは切り詰め前との完全一致を証明できない。再構成元を限定して記録する。
- ローカル実機のAPKが最新コードを含まない場合、Flowだけでコード変更を検証できない。必要時のみ正式wrapperでBuildする。
- PR Headは`gh`未導入のため、APIアクセス可否を別途確認する。

## Thinking Log
- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-08-07 19:25 JST: 現行コード確認で、5つのmust-fix（Contract空白、2 FlowのRace、Maestro順序Contract、SQLite finally、旧Run Artifact評価）が現存すると判断した。
- 2026-08-07 19:25 JST: Native成果物は`.gitignore`の`output/`と`.artifacts/`、APK除外で追跡外であることを確認した。既存の整理文書は変更対象に含めない。
