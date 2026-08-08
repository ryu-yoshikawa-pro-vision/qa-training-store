# Plan

## Objective

- PR #10の最終修正として、`docs/CODING_STANDARDS.md` のGlobal Augmentationサンプルだけを修正する。
- `declare global` の前に `export {};` を追加し、サンプルをmodule context（External Module）として成立させる。
- 今回の修正範囲は文書のみ。新しい改善・リファクタリング・品質ゲート追加は行わない。

## Scope

- In:
  - `docs/CODING_STANDARDS.md` の「interface」節のGlobal Augmentationサンプルへ `export {};` を追加
  - 必要最小限の説明文補足（任意）
  - Current Run Artifact（`PLAN.md` / `TASKS.md` / `REPORT.md` / `run.json`）
- Out:
  - Markdownlint設定、`.markdownlint-cli2.jsonc`、`package.json` script、`pnpm-lock.yaml`、CI
  - Native / Maestro / Component Test / Expo依存 / Sanitizer / Architecture Test / ESLint設定
  - 過去Run Artifact（`run.json changed_files` など）の書き換え
  - Git操作（branch / commit / push / PR更新いずれも禁止）

## Assumptions

- このセッションは新しい会話セッションのため、Current Runを新規作成する（`20260808-093602-JST`）。
- `declare global` はmodule context内でのみ有効であり、`export {};` を追加することでサンプルが独立ファイルとして成立する。
- `scenarioShopTestApi: TestApi` の型表現は変更しない。

## Questions / Ambiguity

- 特になし。指示書（# PR #10 最終修正指示）の内容をそのまま適用する。

## Hypotheses

- H1: `export {};` を `declare global` 直前に追加すれば、Markdownサンプルはmodule contextとして成立し、Markdownlint / Prettier / verify はPASSする。

## Research Plan

- Round 1 Query: 該当箇所の現状確認(`docs/CODING_STANDARDS.md` のGlobal Augmentationサンプル)
- Exit Criteria:
  - 該当箇所の変更が最小差分であること
  - `pnpm run lint:markdown`、`pnpm run format:check`、`pnpm run verify` の結果を確認すること

## Approach

1. 対象箇所の確認
2. `export {};` を追加（+必要最小限の説明文）
3. `pnpm run lint:markdown` / `pnpm run format:check` / `pnpm run verify` を実行
4. 差分確認（`docs/CODING_STANDARDS.md` とCurrent Run Artifactのみ）
5. Run Artifact更新、Sanitizer Write / Check

## Definition of Done

- `declare global` サンプルがmodule contextを持つ
- `export {};` が適切な位置へ追加されている
- `scenarioShopTestApi: TestApi` を変更していない
- `interface` 利用方針を変更していない
- 関係ないApplication / Native / CI / Markdownlint設定がunmodifiedである
- `pnpm run lint:markdown`、`pnpm run format:check`、`pnpm run verify` の結果を Run Artifactへ記録
- Git操作を行っていない

## Risks / Unknowns

- `format:check` / `verify` が既存Baseline問題（PR #9由来の未整形ファイルなど）でexit 0にならない可能性。その場合は今回変更差分との因果を評価し、範囲外ならRun Artifactに記録する。

## Thinking Log

- (記録はREPORT.mdへ)