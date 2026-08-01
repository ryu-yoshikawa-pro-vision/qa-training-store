# Plan

## Objective
- 指定URLの起動済みアプリをPlaywright MCPの独立Browser Contextで探索し、利用できない場合は指示書の終了形式でMarkdownレポートを返す。

## Scope
- In: 指示書、必読リポジトリ文書、Playwright MCP利用可否の確認、探索不能時の記録。
- Out: ソース・設定・テスト・依存関係・ドキュメントの変更、アプリの起動停止、Git操作、Playwright MCP以外のブラウザ操作。

## Assumptions
- アプリはユーザーが `http://localhost:8081` で起動済みである。
- Playwright MCPが利用できない場合は、URLへ接続せず探索を終了する。
- Run Artifactの作成はリポジトリ規約上の必須記録であり、製品ファイルの変更には該当しない。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。
- 仮定してよい細部: なし。
- 未回答の重要質問: Playwright MCPが現在のセッションに登録されているか。

## Hypotheses
- H1: 現在のツール一覧にPlaywright MCPのブラウザ操作機能がない場合、指示書の終了条件により探索不能となる。
- H2: Playwright MCPが利用可能なら、独立Contextで対象URLへ接続後、SnapshotとScreenshotを併用して探索する。

## Research Plan
- Round 1 Query: 必読資料、指定指示書、最近のRun、利用可能ツール一覧を確認する。
- Round 2 Query: H1/H2を判定し、H1なら探索を開始せず終了レポートを作成する。
- Exit Criteria:
  - Playwright MCPの利用可否を確認できている。
  - 利用不可の場合、指示書指定の終了理由と次の対応をレポートできている。
  - 製品ファイル、Git、アプリプロセスへ副作用を与えていない。

## Approach
- `PROJECT_CONTEXT.md`、最近のADR／Run、指定指示書、AGENTS.mdを確認する。
- 現在のツール一覧からページ移動、Snapshot、クリック、入力、Screenshot、Viewport変更の有無を確認する。
- Playwright MCPがなければ他のブラウザ手段へ切り替えず、探索不能として終了する。

## Definition of Done
- 指示書に従ったMarkdown形式の探索結果を返す。
- Playwright MCPがない場合は、探索を実施せず、確認内容と対応方法を明記する。
- Run Artifactへ判断とEvidenceを日本語で記録する。

## Risks / Unknowns
- Playwright MCPが未登録のため、画面・Screenshot・Accessibility Snapshotの確認結果を作成できない可能性がある。
- 指示書が禁止するCLI／通常Playwright／curl等へ切り替えない。

## Thinking Log
- 2026-08-01 12:01 JST: 指定指示書は探索とレポート作成のみを要求し、ファイル変更・アプリ起動停止・Git操作・代替ブラウザ操作を明示的に禁止している。
- 2026-08-01 12:01 JST: ツール一覧を名称・説明で確認したが、Playwright MCPのブラウザ操作機能は見つからなかった。指示書1.1の終了条件を適用する。
