# 配送先削除確認文言の条件分岐計画

## 0. 依頼概要

- 依頼内容: Issue #95 の要求に従い、配送先削除時の確認ダイアログ文言を削除対象と残存配送先の有無で出し分ける。
- 背景: 現在は配送先の `isDefault` や残存件数に関係なく、既定配送先の再割り当て説明が表示される。
- 期待成果: 非既定削除、既定削除かつ残存あり、最後の既定削除の3状態で、実際の削除結果と一致する説明を表示する。

## 1. ゴール / 完了条件

- ゴール: Presentation/UI側の確認ダイアログだけを最小限変更し、既存の削除・既定再設定ロジックを維持する。
- 完了条件（DoD）:
  - 非既定配送先では通常の削除文言を表示し、再割り当て説明を表示しない。
  - 既定配送先かつ削除後に配送先が残る場合は、Issue指定の再割り当て説明を表示する。
  - 最後の既定配送先では、配送先がなくなることを説明し、再割り当て説明を表示しない。
  - 上記3ケースのPresentationテストがPASSする。
  - 関連する既存E2Eの期待値、lint、typecheck、build、`git diff --check` がPASSする。
  - 指定ブランチへコミット・pushし、main向けOPEN PRを作成する。

## 2. 現状理解と前提

- Current understanding:
  - `src/presentation/pages/addresses-page.tsx` の各 `ConfirmDialog` は、現在すべて同じ「既定の配送先を削除した場合は、残っている最も古い配送先が新しい既定になります。」を表示している。
  - `addresses` は画面に表示している配送先一覧であり、削除対象はその一覧の1件なので、削除後に残るかは `addresses.length > 1` で判定できる。
  - Domain/Application/Repository側には、既定削除時に `createdAt` 昇順・`id` 昇順の先頭を再設定する既存処理がある。
  - 既存の `tests/component/auth-account-pages.test.tsx` は `AddressesPage` をモックサービスでテストでき、既存の `e2e/web/ui-ux-improvements.spec.ts` は単一配送先の削除ダイアログを確認している。
- Assumptions:
  - Issue本文にA/Cの完全一致文言は指定されていないため、Aは「この配送先を削除します。」、Cは「最後の配送先を削除します。削除後は配送先が登録されていない状態になります。」とする。
  - Bの文言はIssue本文・現行文言の正本をそのまま維持する。
  - 画面上の一覧は削除対象を含むため、UIで最古の配送先を再計算せず、残存有無だけを判定する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Issue本文とユーザー指示で目的、非目標、検証、完了操作が明確である。
- 仮定してよい細部: A/Cの具体的な説明文、テストを既存の住所Page component testへ追加すること。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Presentation: 配送先カードの確認ダイアログ本文の条件分岐。
  - Component test: 3状態の文言表示。
  - E2E: 既存の住所Card・削除Dialogの期待値が、実際に生成される「既定削除・残存あり」状態と一致することを確認する。
  - 対象外: Domain、Application、Repository、Native住所削除処理、ConfirmDialog共通実装。
- Files to inspect:
  - `src/presentation/pages/addresses-page.tsx`
  - `tests/component/auth-account-pages.test.tsx`
  - `e2e/web/ui-ux-improvements.spec.ts`
  - `src/infrastructure/database/dexie/basic-repositories.ts`
  - `tests/integration/auth-account.test.ts`
  - `package.json`

## 5. 変更方針

- Change strategy:
  1. `AddressesPage` の既存削除処理は変更せず、`address.isDefault` と `addresses.length > 1` だけで確認本文を選ぶ。
  2. Bの既存文言を維持し、A/Cの文言をそれぞれ通常削除／最後の配送先向けとして明確にする。
  3. 既存の住所Page component testへ3ケースを追加し、一覧再取得や削除Use Caseの挙動をテストへ持ち込まない。
  4. 既存E2Eは実際のテスト状態を確認し、既定削除・残存ありを検証している場合はIssue指定文言の期待値を維持する。
  5. 差分と品質ゲートを確認した後、指定ブランチへ必要な変更だけをコミットし、明示refspecでpushしてPRを作成する。
- 実行タスク:
  - [ ] 1. 確認ダイアログ本文の3状態分岐を実装する。
  - [ ] 2. Component testへ3ケースを追加し、既存E2Eの単一住所期待値を更新する。
  - [ ] 3. 関連テスト、lint、typecheck、build、diff checkを実行する。
  - [ ] 4. 差分・スコープを確認し、Run Artifactをサニタイズする。
  - [ ] 5. コミット、push、OPEN PR作成を行う。

## 6. 検証方法

- Validation plan:
  - `pnpm exec vitest run tests/component/auth-account-pages.test.tsx`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run build:web`
  - `git diff --check`
  - 必要に応じて関連E2Eを実行し、実行できない場合は理由を記録する。
  - 最終的に `git diff` と `git status --short` で、Domain/Application/Repositoryに差分がないことを確認する。
- 成功判定: 3つの文言ケースが期待どおりにPASSし、定義済みの静的検証・buildが終了コード0、差分に空白エラーと不要なロジック変更がないこと。

## 7. リスクと未解決論点

- Risks:
  - 既存E2Eの住所件数はテスト状態の初期化や作成経路に依存するため、実値に基づいてB/Cの期待値を確認する。
  - `addresses.length > 1` を削除対象の残存判定に使う前提が崩れると誤表示になる。カードが同一配列の要素を対象にしていることを実装で確認済み。
  - 全体buildが環境要因で失敗した場合は、最初の異常と今回の差分との因果を分離して記録する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル:
  - `src/presentation/pages/addresses-page.tsx`
  - `tests/component/auth-account-pages.test.tsx`
- 既存E2Eの確認対象:
  - `e2e/web/ui-ux-improvements.spec.ts`（実際の状態がBケースのため、期待値は変更なし）
- 付随ドキュメント:
  - `.codex/runs/20260904-161144-JST/`
  - 本計画書

## 9. 備考

- 既定配送先の選択ルールをUI側へ複製せず、「再割り当てが発生する条件」の説明だけを行う。
