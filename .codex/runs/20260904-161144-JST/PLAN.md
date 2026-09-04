# Plan

## Objective

- Issue #95の配送先削除確認ダイアログを、削除対象の既定状態と削除後の残存件数に一致させる。

## Scope

- In: `AddressesPage` の確認本文、既存住所Page component test、単一住所を確認する既存E2Eの期待値。
- Out: 削除Use Case、既定再設定Domain Rule、Repository、Native UI、共通ConfirmDialogの変更。

## Assumptions

- Issue本文にない通常削除・最後の配送先の説明は、利用者に状態が伝わる日本語を局所的に追加する。
- Issue本文が指定する既定削除かつ残存ありの文言は現行文言を維持する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Aは通常削除文言、Cは最後の配送先であることと削除後0件になることを説明する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `address.isDefault && addresses.length > 1` のときだけ既定再割り当て説明を表示すれば、UI説明が既存Domain結果と一致する。
- H2: 既存の住所Page component testへ3状態を追加し、単一住所E2Eの期待値を更新すれば、文言回帰を必要最小限で固定できる。

## Research Plan

- Round 1 Query: Issue本文、Project Context、ADR、README、package scripts、住所Page、ConfirmDialog、関連component/E2E/domain testを確認する。
- Round 2 Query: 変更後のテスト、lint、typecheck、build、diffを確認し、Domain/Application/Repositoryの差分がないことを検証する。
- Exit Criteria:
  - H1を支えるUI実装と既存Domainの不変性が確認できる。
  - H2を支える3ケースのcomponent testと既存E2Eの整合が確認できる。

## Approach

- repo mappingで確認した既存のPresentation境界だけを変更する。
- Bの文言は維持し、A/Cを条件分岐へ追加する。
- 変更後に関連テスト、lint、typecheck、build、diff checkを実行し、指定ブランチへcommit/push/PR作成する。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> 実装 -> 検証 -> REPORT -> commit/push/PR`

## Definition of Done

- 非既定削除、既定削除かつ残存あり、唯一の既定削除の3状態をテストで保証する。
- 既定再設定処理と削除処理に差分がなく、対象外ファイルを変更していない。
- 定義済み検証が成功し、コミット・push・OPEN PR URLを取得する。

## Risks / Unknowns

- `addresses.length > 1` は削除対象を含む現在の表示一覧に基づくため、削除後残存有無の判定として使用する。
- 全体buildが環境要因で失敗した場合は、最初の異常と今回の差分との因果を分離して記録する。

## Thinking Log

- 2026-09-04 16:16 JST: Issue #95はUI説明だけの変更を要求しており、既存Repositoryの削除・再割り当て処理は正しいため変更対象から除外した。
- 2026-09-04 16:20 JST: focused E2Eの実値は、作成カードを含めて残存住所がある「既定削除・残存あり」状態だったため、既存のBケース期待値は変更しない。Cケースはcomponent testで直接固定する。
