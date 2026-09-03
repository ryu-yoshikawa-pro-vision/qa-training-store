# Plan

## Objective

- Issue #89 の `FormErrorSummary` を、新しい invalid submit ごとに summary へ focus する実装へ修正し、Signup / Login の入力値保持を調査したうえで、テスト、品質検証、commit、push、PR 作成まで完了する。

## Scope

- In:
  - `src/presentation/components/form-error-summary.tsx`
  - `src/presentation/pages/auth-pages.tsx`
  - `tests/component/presentation-foundation.test.tsx`
  - `tests/component/auth-account-pages.test.tsx`
  - Issue #89 の計画・Run Artifact
- Out:
  - validation rule / library、Auth service、route、Native form、無関係なフォーム UI の変更
  - 入力値消失を再現できない場合の独立した設計変更

## Assumptions

- React Hook Form の `formState.submitCount` を既存の submit signal として利用できる。
- `focusOnMount={false}` は初回・trigger 更新のどちらも focus を抑止する既存 opt-out として維持する。
- 動的な error state を渡す caller は `focusTrigger` を提供する契約へ更新する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: numeric な `focusTrigger` と、既存 Vitest / Testing Library convention を採用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `errors.length` 依存では同じ1件のまま再 submit したとき effect が再実行されず、`submitCount` を明示 signal として渡すと解消できる。
- H2: 入力値消失は focus 問題と独立の可能性があり、auth form の `reset` / `key` / conditional rendering / navigation と invalid path を確認してから同一 PR での修正要否を判断する。

## Research Plan

- Round 1 Query: FormErrorSummary の全 caller、auth の `useForm` / submit / reset / navigation、component test と package scripts を確認する。
- Round 2 Query: source evidence と focused component test で `submitCount` の再 focus、unrelated rerender、validation 後の入力値を確認する。
- Exit Criteria:
  - H1 に対し、現行依存関係と同一件数再 submit の回帰 test の支持根拠がある。
  - H2 に対し、調査箇所、再現可否、原因、修正有無を PR に記録できる。

## Approach

- repo mapping と計画保存後、component contract を最小修正し、既存 `submitCount` を2 callerへ配線する。
- focus 条件、accessibility、入力値保持の component test を追加し、focused → component web → format / lint / typecheck → verify の順に検証する。
- 実装後は diff triage / deep review を行い、差分起因の問題があれば最小修正して関連 gate を再実行する。
- commit 前に branch safety を再確認し、指定 message で commit、明示的に branch を push、base `main` の日本語 PR を作成・確認する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REVIEW -> VALIDATE -> COMMIT -> PUSH -> PR -> REPORT`

## Definition of Done

- 1回目の1件 invalid submit、同一1件の再 submit、同数内容変更、複数件の submit が summary に focus する。
- `focusOnMount={false}`、error count / content のみの rerender、submit と無関係な rerender が focus を奪わない。
- role / tabIndex / message / link が維持される。
- Signup validation 後の入力値保持の再現可否と判断が記録される。
- 指定検証が PASS（または既存 baseline / 環境制約を根拠付きで記録）し、commit / push / PR が完了する。

## Risks / Unknowns

- `submitCount` は valid submit でも増えるため、error 存在を必ず併せて判定する。
- trigger を required にするため、見落とした caller は typecheck で検出する。
- jsdom の focus timing は async resolver と関係するため、テストでは状態表示を待つ。

## Thinking Log

- 2026-09-03: production caller は Login / Signup の2箇所のみと確認した。両方が RHF の `formState.errors` を直接利用し、validation failure の `handleSubmit` valid callback には到達しない。
- 2026-09-03: `errors` 配列を依存にするだけでは unrelated rerender で focus し得るため採用しない。`submitCount` を `focusTrigger` として必要入力にし、error 状態は focus 可否の guard に限定する。
- 2026-09-03: `submitCount`更新とerror state反映が別renderになる可能性を考慮し、errorがまだ空のrenderではtriggerを処理済みとして記録しない。後続renderで同じtriggerのerrorが表示された時に初回focusできる回帰testを追加する。
