# Plan

## Objective

- ユーザー指定どおり、既存の変更を保持したまま `pnpm run format` を実行し、変更範囲外を含むPrettier整形結果を確認・記録する。

## Scope

- In:
  - `pnpm run format` が対象とするリポジトリ全体
  - 実行前後の差分、format check、Run Artifact
- Out:
  - Product仕様やロジックの手修正
  - Git add／commit／push、削除、rename

## Assumptions

- 既存のCodex Hook実装差分を含む現在のworktreeを保持したまま整形する。
- Prettierのwrite対象に含まれる変更範囲外ファイルの変更は、ユーザーが明示的に許可している。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。実行コマンドと対象範囲が明示されている。
- 仮定してよい細部: `package.json`の`format` scriptをそのまま使う。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `pnpm run format`はPrettier writeのみを行い、削除やGit mutationを行わない。
- H2: 実行後に`pnpm run format:check`がPASSし、差分は整形変更として確認できる。

## Research Plan

- Round 1 Query: `package.json`のformat script、worktree状態、Run／repo契約を確認する。
- Round 2 Query: `pnpm run format`を実行し、format checkと差分範囲を確認する。
- Exit Criteria:
  - `pnpm run format`の終了結果を記録する。
  - `pnpm run format:check`、`git diff --check`、sanitizer／Run Artifactを確認する。

## Approach

- 現在の差分を保存し、Run Artifactを初期化する。
- `pnpm run format`を実行する。
- format check、diff、必要なRun Artifact sanitizationを実行する。
- 標準フロー: `PLAN -> repo確認 -> TASKS -> 実行 -> REPORT`

## Definition of Done

- `pnpm run format`が完了する。
- `pnpm run format:check`がPASSする。
- formatterが作成した変更を確認し、実行結果をRun Artifactへ記録する。
- Git mutation、削除、renameを行わない。

## Risks / Unknowns

- 既存の変更範囲外ファイルが多数変更される可能性がある。実行前後の差分を記録する。
- Formatterがコード意味を変更しないことをformat checkとdiff確認で検証する。

## Thinking Log

- 2026-08-17 06:18 JST: ユーザーが変更範囲外を含む`pnpm run format`を明示依頼したため、全体formatを実行する。Git mutationや削除は行わない。
