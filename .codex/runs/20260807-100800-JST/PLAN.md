# Plan

## Objective

- Scenario Shopのコーディング規約を、シンプルかつ堅牢な基準として策定する。
- 開発入口とReview入口の関連文書へ規約を接続する。
- 同一BranchのPR品質ゲートを確認し、失敗があれば原因を特定して最小修正する。

## Scope

- In:
  - `docs/CODING_STANDARDS.md`
  - `CONTRIBUTING.md`
  - `CODE_REVIEW.md`
  - 規約策定のHistoryとRun Artifact
  - PR品質ゲートで確認されたBranch起因の失敗修正
- Out:
  - 規約導入だけを目的とした既存`interface`の一括変換
  - 大量のESLint Ruleの同時導入
  - Application Architectureの再設計
  - 変更と無関係な既存問題の修正

## Assumptions

- `main`のTypeScript Strict設定、Architecture Contract、Platform Dependency Checkを正本とする。
- 規約は新規・変更コードから段階的に適用する。
- GitHub ActionsのPR Workflowを品質ゲートの実測結果として使用する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし
- 仮定してよい細部: 文書名、章構成、Historyの配置
- 未回答の重要質問: なし

## Hypotheses

- H1: 既存規約を10章程度へ絞ることで、重要な型安全性とArchitecture基準を埋もれさせずに運用できる。
- H2: `type`統一、未検証`as`の制限、非nullアサーション回避、境界検証、単一正本の5点が最も効果が高い。
- H3: 文書変更だけではApplicationの品質ゲートに回帰を発生させない。

## Research Plan

- Round 1 Query: TypeScript、ESLint、Architecture Test、Application Use Case、SQLite Mapper、Native Test Mockを確認する。
- Round 2 Query: `AGENTS.md`、`CODE_REVIEW.md`、`PROJECT_CONTEXT.md`の責務を確認し、重複しない文書構成を決める。
- Exit Criteria:
  - 規約の各Ruleが現在のRepository上の具体的なRiskへ対応している
  - 単なる好みや行数制限を含めない
  - 品質ゲート結果と未解決事項を記録できる

## Approach

1. 現行設定と代表コードから実害のある論点を抽出する。
2. 規約を型、境界、状態、Architecture、Error、Testへ絞る。
3. `CONTRIBUTING.md`と`CODE_REVIEW.md`から規約へ接続する。
4. Draft PRを作成し、GitHub Actionsの品質ゲートを確認する。
5. Branch起因の失敗だけを最小修正し、再実行結果を記録する。

## Definition of Done

- コーディング規約が正式文書として追加されている。
- `type`統一と`interface`の例外条件が明記されている。
- `as`、`!`、外部データ、状態、Architecture、Error、Testの基準が明記されている。
- 開発入口とReview入口から規約を参照できる。
- PR品質ゲートの結果が確認され、Branch起因の失敗が残っていない。

## Risks / Unknowns

- 文書が長すぎると運用されないため、一般論と既存文書の重複を避ける。
- Lintを即時強制すると既存コードの大規模変更になるため、本Runでは段階導入方針だけを定める。
- Local GitHub CLIと外部Networkが利用できないため、GitHub ConnectorとGitHub Actionsを使用する。

## Thinking Log

- 2026-08-07 10:08 JST: ユーザー指示により`agent/coding-standards`を`main`から作成した。
- 2026-08-07 10:10 JST: 規約は23章の初稿から、実害に直結する10章へ圧縮する方針を採用した。
- 2026-08-07 10:12 JST: 通常型は`type`へ統一し、`interface`は宣言マージが必要な宣言ファイルへ限定した。
- 2026-08-07 10:15 JST: 大量Lint導入と既存型の一括変換は過剰と判断し、対象外とした。
