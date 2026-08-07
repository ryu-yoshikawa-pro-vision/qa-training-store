# Codex ArtifactサニタイズCIとNative永続化テスト残課題の修正計画

## 目的

前回修正を維持したまま、Codex Run Artifactサニタイザの診断出力を相対パス・行番号・パターン種別・短いマスク済みコンテキストへ整理し、改行・長いJSONL・パス境界の残課題をテストする。併せて、実際に存在するNativeの永続化・境界フローをCI上で個別実行できるように分離し、安定したtestID、hydration完了境界、低層永続化テストを追加する。

## 現状理解

- 実際のブランチは `fix/sanitize-codex-run-artifact-paths` であり、ユーザー指示に記載されたブランチ名とは異なる。ブランチ切替は行わず、現在の作業ツリーを対象にする。
- サニタイザにはLF/CRLF/CRを共通処理する `Split-CodexArtifactLines` が既にあるが、finding出力は絶対パスと内容を診断形式へ組み立てるため、相対パス・bounded context契約を追加する余地がある。
- 現在のNative CIには、ユーザー文面上の `native-persistence.yaml` 等は存在しない。実在する `native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`、`native-out-of-stock.yaml`、`native-low-stock.yaml`、`native-purchase-limit.yaml` の5フローを、既存のPersistence and Boundaryグループとして個別ステップへ分割する。
- `NativeCartScreen` はカート読み込み完了を `cart !== null` で判断できるが、Maestro向けのhydration境界、合計数量バッジ、ランダムなitemIdに依存しない商品・variant単位のtestIDは不足している。
- 低層のSQLiteトランザクションテストはあるが、新しいRepositoryインスタンスで保存データを読み戻す契約は未確認である。

## スコープ

### In

- `scripts/lib/codex-artifact-sanitizer.ps1` と関連fixture/contractの診断出力、改行、長文、alias boundary、Write/Check/idempotencyテスト。
- 実在する5つのNative persistence/boundary Maestro flowと `.github/workflows/native-ci.yml` の個別実行・証跡パス。
- NativeCartScreenの安定testIDとhydration ready表示、および関連component/contractテスト。
- Native SQLite Repositoryのadd -> 新規Repository -> read-back契約テスト。
- Native運用文書、PROJECT_CONTEXT、ADR、今回のRun Artifact。
- ローカルの品質ゲート、PowerShell fixture、Native静的/低層/可能な実機検証。

### Out

- Gitのbranch/commit/push/PR更新、リモートCIの実行。
- 存在しない旧フロー名の重複ファイル作成。
- プロダクトのカート永続化仕様そのものの変更、無関係なWeb/Naitveフローの大規模整理。
- 失敗を隠すためのassertion削除、sleep/retry追加、skip、continue-on-error。

## 前提・曖昧さ

- ユーザー指示の論理名と現在のリポジトリの実ファイル名が一致しないため、実在するPersistence and Boundary 5フローへマッピングし、対応表を文書化する。確認のためのユーザー回答待ちは不要と判断する。
- CIは各ステップを通常のfail-fastで実行し、最初の失敗後も `if: always()` の証跡収集を実行する。各フローの出力ディレクトリとJUnit名は固有にする。
- 実機検証は接続状態とローカルAndroid環境が利用できる範囲で行い、利用できない検証は理由と代替証拠を記録する。

## 仮説

- H1: サニタイザのCLI出力を構造化し、相対パスと固定長のマスク済みcontextだけにすれば、長いJSONLやユーザー固有パスをstdout/stderrへ漏らさず、行番号も安定して検証できる。
- H2: Persistence/boundary flowを個別のMaestroステップと証跡ディレクトリへ分ければ、最初の失敗を失わず、失敗原因をflow単位で分類しやすくなる。
- H3: `native-persisted-state-ready` と商品・variant由来の安定testIDを導入すれば、再起動後のUI検証を汎用的な数量文字列やランダムitemIdから切り離せる。
- H4: 同じSQLiteを新しいRepositoryインスタンスから読み戻すテストで、保存層とhydration表示層を分離して検証できる。

## 調査・実行計画

1. 既存サニタイザ、CI、Maestro、NativeCartScreen、テスト、文書、subagent調査結果を確認する。
2. Run ArtifactのTASKS/REPORTへ確定した前提と変更範囲を記録する。
3. サニタイザの出力契約とfixture/contractを実装し、PS5.1/PS7で検証する。
4. Nativeのstable testID/hydration、Repository契約、Maestro assertionとCI個別ステップを実装する。
5. 関連文書とADRを更新する。
6. format、lint、typecheck、focused tests、契約テスト、`pnpm run verify`、Native静的検証、可能な実機検証を行う。
7. 選定したRun ArtifactだけをWrite+Checkし、未サニタイズ出力・未確認事項・品質ゲート結果をREPORTへ記録する。

## Definition of Done

- サニタイザのfindingが相対ファイルパス、行番号、pattern、bounded/redacted contextで出力され、raw absolute path・source JSONL全体をstdout/stderr/summaryへ出さない。
- LF/CRLF/CR、空/末尾改行なし/空行、alias boundary、長文JSONL、Write/Check/idempotencyのローカル契約が通る。
- 実在するPersistence/boundary 5フローがCIで個別識別可能なstep/JUnit/output dirを持ち、証跡収集が失敗時にも走る。
- 再起動フローが初回clearState一回、hydration境界、stable testID、数量/商品/variantの値、段階的スクリーンショットを検証する。
- 新規Repositoryインスタンスによる保存・読み戻し契約とUI hydration testが通る。
- Native関連文書、PROJECT_CONTEXT、ADR、Run Artifactが実装・検証結果と一致する。
- ローカル品質ゲートのエラーを対応または原因分類し、範囲外に見える失敗も影響可能性を評価して記録する。リモートCI未実行は未確認事項として明記する。

## リスクと対策

- 実ファイル名と指示上の名前の不一致: 新規の重複flowは作らず、現在の5フローを対応表で明示する。
- Maestroの失敗証跡上書き: flowごとに固有のoutput dir/JUnit名を使用し、collect stepをalwaysにする。
- UI selectorの不安定さ: random itemIdをtestIDの主キーにせず、productId/variantIdとhydration readyを使う。
- Windows PowerShell 5.1互換性: .NET Core専用APIや `-split ..., -1` に依存せず、既存のRegex helperを拡張する。
- 既存のdirty worktree: 変更前後のstatusと対象ファイルを記録し、既存変更をリセットしない。

## 判断ログ

- 2026-08-07 JST: 追加指示は前回作業の補修として新Runで開始した。実際のbranch/headと既存dirty stateを保持する。
- 2026-08-07 JST: ユーザー指定の4論理フロー名は現行repoに存在しないため、現行CIが実行する5つのPersistence and Boundary flowへマッピングする方針とした。
