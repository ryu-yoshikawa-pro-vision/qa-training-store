# Plan

## Objective
- Codex Artifactサニタイザのfinding出力を相対パス・行番号・pattern・bounded/redacted contextへ整理し、残存パス漏えいと改行/alias境界をローカル契約で検証する。
- 実在するNative persistence/boundary 5フローをCIで個別識別可能にし、stable testID、hydration境界、低層Repository再生成テストを追加する。

## Scope
- In: サニタイザ共通helper/fixture/contract、native-ciの現行5フロー個別化、NativeCartScreenと関連テスト、SQLite永続化契約、Native文書/ADR/Run Artifact。
- Out: branch/commit/push/PR更新、リモートCI、存在しない旧フロー名の重複作成、無関係な機能変更、assertion削除や失敗隠蔽。

## Assumptions
- 実際のbranchは `fix/sanitize-codex-run-artifact-paths`。branch切替はしない。
- ユーザー指示の論理フロー名は現行repoの実在ファイルへマッピングし、現行のPersistence and Boundary 5フローを分割する。
- CIはfail-fastのまま、証跡収集はalwaysで実行し、flowごとに固有のJUnit/output dirを使う。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。現行ファイルとCI定義から安全に決定できる。
- 仮定してよい細部: 旧論理名は `native-restart-persistence`、`native-reset-dirty-state`、`native-out-of-stock`、`native-low-stock`、`native-purchase-limit` に対応させる。
- 未回答の重要質問: なし。リモートCIの結果は未確認として残す。

## Hypotheses
- H1: 構造化findingと固定長contextでstdout/stderrのraw pathと長いJSONL漏えいを防げる。
- H2: flow単位のCI出力で失敗原因分類と証跡保持が改善する。
- H3: stable testIDとhydration readyで再起動後UI検証が汎用文字列/ランダムIDから独立する。
- H4: 新しいRepositoryインスタンスによるread-backで保存層の永続化を直接検証できる。

## Research Plan
- Round 1 Query: 現行サニタイザ/CLI、native-ci、Maestro、NativeCartScreen、既存テスト、文書、subagent調査結果を確認する。
- Round 2 Query: 変更後のPS5.1/PS7、focused tests、品質ゲート、Native静的/実機検証を行う。
- Exit Criteria:
  - 主要仮説ごとに実装または検証結果の根拠がある。
  - 未実行のリモートCI/実機項目は理由と次アクションをREPORTへ記録する。

## Approach
- 既存dirty変更を保持し、対象を限定して最小差分で修正する。
- `PLAN -> TASKS -> 調査 -> 実装 -> focused validation -> 品質ゲート -> REPORT` の順で進める。
- 完了前に選定Run ArtifactだけをWrite+Checkし、サニタイザのCheckを再実行する。

## Definition of Done
- Sanitizer findingが相対パス/行番号/pattern/bounded-redacted contextで出力され、raw absolute path・source JSONL全体を出さない。
- EOL/alias/long JSONL/Write-Check-idempotency契約がPS5.1/PS7で通る。
- 現行Persistence/boundary 5 flowがCIで個別step/JUnit/output dirを持ち、失敗時証跡が収集される。
- 再起動のhydration/testID/値検証、低層Repository read-back、関連component/contractが通る。
- 文書/ADR/Run Artifactが実装と検証結果に一致する。

## Risks / Unknowns
- 現行flow名の不一致は対応表を文書化し、重複ファイルを作らない。
- 既存dirty stateはstatusとRun Artifactで追跡し、reset/checkout/deleteを行わない。
- 実機やExpo Doctorの環境依存失敗は原因分類し、品質ゲートで隠さない。

## Thinking Log
- 2026-08-07 JST: 追加指示は前回作業の補修なので、新しいRun `20260807-094024-JST` を作成した。
- 2026-08-07 JST: 実際のCIにはPersistence and Boundary 5 flowがあるため、ユーザー文面の旧論理名を現行5ファイルへ対応させる。
- 2026-08-07 JST: 容量確保後の実機再検証で、画面外の追加成功メッセージassertionが失敗した。Hierarchyに要素があることを確認し、stable testIDとscroll assertionへ修正して全Runtime／Persistence／Boundaryを再実行する方針とした。
- 2026-08-07 JST: Remote CIは今回のスコープ外かつ未実行のため、ローカル品質ゲート・静的ゲート・実機ゲートの結果と分離して記録する。
