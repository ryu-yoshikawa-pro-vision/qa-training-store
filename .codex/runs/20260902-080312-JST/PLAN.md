# Plan

## Objective

PR #88の最終レビューで残ったNFR-MA-021のpositive Formal evidence不足を、
既存のCurrent architecture・D-033・Remediation Planのscopeを変えずに解消する。

## Scope

### In

- `tests/contracts/architecture.test.ts` の既存Native shared presentation contractを最小補強する。
- `StyleSheet`、代表的なReact Native primitives（`View` / `Text`）、shared `tokens` importを、import順に依存しないnamed-import assertionで固定する。
- 既存Run Artifactを更新し、validation・scope・Stop conditionを記録する。
- push後にPR #88のCurrent headとexact-head CIを確認し、必要なPR本文のhead表記だけ同期する。

### Out

- Product code、Requirement、Decision Log、Traceability、workflowの変更。
- NFR-MA-021のnegative dependency scan、Web stylesheet composition root contract、NFR-MA-022の変更。
- 全Native file scan、primitive一覧の完全固定、AST/parser/framework、Native architecture再設計。
- PR #78へのいかなる変更。

## Input finding / triage

- `must_fix`: test名が示すReact Native primitives接続に対し、既存assertionが`StyleSheet`とtokens importしか確認していない。
- `defer`: なし。
- `reject`: なし。
- `needs_human`: なし。修正方法とscopeはユーザー指示で確定している。

## Allowed files / expected scope

- `tests/contracts/architecture.test.ts`
- `.codex/runs/20260902-080312-JST/PLAN.md`
- `.codex/runs/20260902-080312-JST/TASKS.md`
- `.codex/runs/20260902-080312-JST/REPORT.md`
- `.codex/runs/20260902-080312-JST/evaluation.json`
- PR #88本文（GitHub外部リソース）

Product / requirement / decision / workflow / PR #78 / traceabilityは変更しない。

## Approach / bounded repair iteration

1. branch、working tree、remote、Plan前提、既存contractを確認する。
2. `reactAriaNamedImports`相当の小さなhelperを必要最小限だけ一般化し、React Native named importsから`StyleSheet` / `View` / `Text`を確認する。
3. focused contract、既存native dependency gate、full verify、Chromium E2Eを実行する。
4. self-review、Run Artifact sanitizer、commit前scope確認を行う。
5. commit/push後、PR #88の最新headに対するWeb / Mobile App CIとログを確認する。

同じfailureが反復した場合、scope超過、unsafe action、requirement ambiguityが発生した場合はrepair-loopを停止して報告する。

## Definition of Done

- Native shared presentation contractが`react-native`の`StyleSheet` / `View` / `Text`とshared tokensへの接続を直接assertする。
- named import判定がimport順に依存せず、既存RAC contract・negative gate・Web root contractを変更しない。
- focused test、`pnpm run check:native-route-dependencies`、`pnpm run verify`、`pnpm run test:e2e:chromium`、`git diff --check`がPASSする。
- Product / Requirement / Decision / workflow / Traceability / PR #78に差分がない。
- commit/push後のPR #88 exact-head CIでWeb required ChromiumとMobile Native StaticがPASSし、指定ログを確認できる。
- Run ArtifactのSanitizer Write / CheckがPASSし、Stop conditionが0件である。

## Risks / Unknowns

- 小さなregex helperのmodule matchingが現行の複数行importを取りこぼす可能性があるため、focused testで確認する。
- CIの実行時間・queue・再試行は外部状態であり、古いheadの結果を再利用しない。
- 現時点でRepository内の判断不能なUnknownはない。CIの一時的な失敗が出た場合はログとmain比較を根拠に分類する。

## Thinking Log

- 2026-09-02 JST: Productは既に`Image` / `Pressable` / `StyleSheet` / `Text` / `TextInput` / `View`とshared `tokens`をimportしている。GapはFormal assertionだけであり、変更許可範囲をarchitecture contractへ限定する。
