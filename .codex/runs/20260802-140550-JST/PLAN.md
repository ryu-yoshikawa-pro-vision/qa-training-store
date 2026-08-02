# Plan

## Objective
- PR #4に残る5件を、既存契約を変えず最小差分で修正し、指定された対象テストと品質ゲートで確認する。

## Scope
- In:
  - `src/presentation/pages/review-user-pages.tsx`
  - `tests/component/review-user-pages.test.tsx`
  - `src/application/use-cases/review-user-use-cases.ts`
  - `tests/unit/customer-review-state.test.ts`
  - `tests/integration/review-user-use-cases.test.ts`
  - `e2e/web/ui-ux-improvements.spec.ts`
  - 指定された2つの既存Run Artifact
  - 今回のRun Artifactと、リポジトリ運用上必要な保存用計画書
- Out:
  - 添付で明示された今回対象外項目
  - 新規ライブラリ、DTO拡張、無関係なFormat・命名変更
  - Skip、期待値弱体化、固定Wait、無条件Retry、Git操作、削除・rename

## Assumptions
- 添付の修正指示を完了条件とし、既存の正常動作・Scenario・Test Control・Cart・Checkout・Preview・Dirty Navigationを維持する。
- `deriveCustomerReviewState`は状態値だけを導出し、Eligibilityの理由・Repository Access・Context組立はUse Caseに残す。
- Admin DTOの`membershipRank: null`は既存UIどおり`regular`をForm初期値にする。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。対象、変更方針、検証条件が添付で具体化されている。
- 仮定してよい細部: Admin Formの子Component化と`userId-version` keyの配置は、既存Hook規則に沿う局所実装として採用する。
- 未回答の重要質問: なし。

## Hypotheses
- H1: Admin FormをDTO取得後だけ描画し、`userId-version`で再マウントすれば、初期値の一過性表示・Mutation後の古い値・ユーザー切替時の残留を同時に防げる。
- H2: `getEligibility()`の既存分岐を共通Helperの結果で分岐し直せば、5状態の導出を一箇所へ集約しつつEligibility契約を維持できる。
- H3: Preview前の全Checkbox状態とReload後の全状態を配列比較すれば、先頭SKUだけの検証漏れを防げる。

## Research Plan
- Round 1 Query: 対象Component、Use Case、E2E、Unit/Integration Test、指定Run Artifactの現行状態を確認する。
- Round 2 Query: read-only調査結果と差分を照合し、最小変更と検証コマンドを確定する。
- Exit Criteria:
  - 5件それぞれに現行コード上の根拠がある
  - `allowed_files`を超えない変更方針が確定している
  - 追加判断なしで実装と検証へ進める

## Approach
- 1. 実装前調査結果を統合し、対象ファイルと変更境界を確定する。
- 2. Admin Form初期化、Review状態Helper適用、F-2全件比較を順に最小差分で実装する。
- 3. 指定Run Artifactの日時・status・Evidence Selectorだけを整合させる。
- 4. 対象テスト、Admin Component 3回連続、全体品質ゲート、指定E2E、JSON・差分監査を実行する。
- 標準フロー: `PLAN -> TASKS -> 実装 -> 対象検証 -> 全体検証 -> REPORT`

## Definition of Done
- Admin User Detailが初回から正しいRole／Rankを表示し、未変更Buttonが無効で、Mutation後・ユーザー切替時も最新DTOへ再初期化される。
- `CustomerReviewUseCases.getEligibility()`が`deriveCustomerReviewState()`を使用し、5状態とEligibility理由の既存契約が維持される。
- F-2が全SKUの変更前後Checkbox状態を比較し、PreviewがDBへ保存しないことを維持する。
- 指定Run Artifactのstatus・日時・Selectorが実在記録と整合し、JSONが正しく解析できる。
- 指定の対象テスト、3回連続Component Test、`verify`、Chromium/a11y/mobile/cross-role E2Eが成功する。
- 指定外の製品ファイル変更、Skip、弱体化、固定Wait、無条件Retry、Git操作、削除・renameがない。

## Risks / Unknowns
- Async stateの再取得タイミングで既存テストが不安定になる可能性があるため、Formをloading中に描画せず、Mutation後はversionを含むkeyで再マウントする。
- E2EのReload直後に未ロード状態を読む可能性があるため、既存の画面要素を待ってから全件比較する。
- 既存Lint warning 63件は今回対象外として件数を記録し、修正範囲を広げない。

## Thinking Log
- 2026-08-02 14:05 (JST): 添付指定、PROJECT_CONTEXT、ADR、既存Run、対象コード・テストを確認した。5件すべてが現行状態に残っているため、must_fixとして扱う。
- 2026-08-02 14:05 (JST): `review-user-pages.tsx`は既存のAsia/Tokyo表示修正を保持し、今回のAdmin初期化修正と混同しない。
