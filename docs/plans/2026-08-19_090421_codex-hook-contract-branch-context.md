# Codex Hook contractのbranch依存修正計画

## 0. 依頼概要

- 依頼内容: PR #31 post-mergeのPhase 1 CIで失敗したA4 contract testを修正する。
- 背景: matrixの`testCase.context`を使わず、CI checkout branchをHookが参照していた。
- 期待成果: A4/A5がcheckout branchに依存せず、G10 protected branch policyを維持したままfeature branchへ修正をpushする。

## 1. ゴール / 完了条件

- ゴール: `tests/contracts/codex-hook-contract.test.ts` のmatrix代表テストをcontext-awareにする。
- 完了条件（DoD）:
  - A4/A5がmatrix context `feature/safe`でallowになる。
  - G10系の既存deny契約を維持する。
  - focused test、full contracts 393/393、format、lint、typecheck、diff checkが成功する。
  - commit / pushを完了し、PR作成・レビュー操作・mergeは行わない。

## 2. 現状理解と前提

- Current understanding: Hookの`evaluateCommand(command, suppliedContext)`は明示contextを受け取れる。matrixのA4/A5にはfeature branch contextが定義されているが、代表テストは全caseをCLI経由で実行している。
- Assumptions: Hook本体は正しく、修正はcontract test内のchild Node process helperで完結する。
- Non-goals: Hook policy、workflow、package / lockfile、Application / Native sourceの変更。retryやCI skipの追加。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存contextual testと共有できる小さなhelperの形は実装時に決定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: contracts testのみ。
- Files to inspect:
  - `tests/contracts/codex-hook-contract.test.ts`
  - `.codex/hooks/pre_tool_use_policy.mjs`
  - `docs/adr/0016-codex-pretooluse-node-policy.md`

## 5. 変更方針

- Change strategy:
  - contextなしcaseは現在の`runNodeHook()`を維持する。
  - contextありcaseは`evaluateCommand(testCase.command, testCase.context)`をchild Node processから呼び、実Git checkoutを参照しない。
  - allowはnull、denyはcase idのstructured decisionを確認する。
- 実行タスク:
  - [x] baselineとscopeを確認する。
  - [ ] context-aware helperを実装する。
  - [ ] focused / full contractと品質gateを実行する。
  - [ ] diff、sanitizer、evaluationを確認する。
  - [ ] commit / pushする。

## 6. 検証方法

- Validation plan:
  - `pnpm run test:contracts -- --run tests/contracts/codex-hook-contract.test.ts`
  - `pnpm run test:contracts`
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `git diff --check`
  - 可能なら`pnpm run verify`
- 成功判定: target contractと全contractsがpassし、品質gateがpass、changed source fileがtarget testだけであること。

## 7. リスクと未解決論点

- Risks: verifyが長時間または環境依存で失敗する可能性がある。最初の異常を記録し、無関係なコードを変更しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `tests/contracts/codex-hook-contract.test.ts`（実装差分）。
- 付随ドキュメント: 標準Run Artifact、計画書。Hook本体・workflow・packageは変更しない。

## 9. 備考

- allowed_files: `tests/contracts/codex-hook-contract.test.ts`
- expected_changed_files（source scope）: `tests/contracts/codex-hook-contract.test.ts`
- push先: `origin/fix/codex-hook-contract-branch-context`
