# Plan

## Objective

- Issue #109 の `SearchCombobox` における `onOpenChange` の `TS7006` を、指定された最小修正で解消する。

## Scope

- In:
  - `src/presentation/components/search-combobox.tsx` の `open` 引数への `boolean` 型注釈
  - 既存の SearchCombobox 関連テストの確認・実行
  - `typecheck`、変更ファイルに関係する静的検証、差分確認、commit／push／PR 作成
- Out:
  - SearchCombobox の実行時挙動、検索 UX、debounce、loading、open state 制御
  - React Aria component 構成、型設計全体、依存関係、PR #103 の変更
  - Issue #109 と無関係な TypeScript error の修正

## Assumptions

- Issue #109 の記載どおり、`onOpenChange={(open: boolean) => { ... }}` だけで解消する。
- 型注釈追加は実行時挙動を変更しないため、新規テストは追加しない。
- 作業対象ブランチはユーザー指定の `fix/issue-109-search-combobox-onopenchange-ts7006` に固定する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Issue の対応方針・完了条件が明確。
- 仮定してよい細部: boolean 注釈で解消しない場合のみ callback 型を追加調査する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `open` への `boolean` 明示により TS7006 が解消する。
- H2: 変更は callback 内の既存処理を維持するため、実行時ロジックと検索 UX は不変である。

## Research Plan

- Round 1 Query: Issue #109、対象コンポーネント、関連テスト、package scripts、branch／working tree を確認する。
- Round 2 Query: 最小修正後に typecheck、既存関連テスト、lint／format check を実行し、失敗時は最初の異常と今回の変更との因果を切り分ける。
- Exit Criteria:
  - `onOpenChange` の TS7006 が解消し、`pnpm run typecheck` が成功する。
  - SearchCombobox 関連テストが存在する場合に成功する。
  - 変更差分が対象箇所と Run Artifact に限定され、依存ファイルや PR #103 の変更を含まない。
  - commit、指定 branch からの push、main 向け OPEN・非 Draft PR 作成まで確認できる。

## Approach

- Issue と既存コード／テストを確認し、`onOpenChange` の `open` だけへ `boolean` を付ける。
- 検証結果と差分を確認し、別問題は混入させずに commit、明示 refspec で push、PR を作成する。
- 標準フロー: `PLAN -> TASKS -> 最小修正 -> Validation -> 差分確認 -> commit -> push／PR -> REPORT`

## Definition of Done

- Issue #109 の TS7006 が解消している。
- `pnpm run typecheck` と実行した関連検証が成功している、または無関係な既存 failure を明記して切り分けている。
- Product code の変更が `src/presentation/components/search-combobox.tsx` の最小差分に留まる。
- 指定メッセージで commit し、指定 branch を remote へ push し、main 向け OPEN・非 Draft PR を作成して URL を確認する。
