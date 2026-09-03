# Plan

## Objective

- Issue #90のSearchCombobox連続入力時のSuggestionちらつきを、150ms debounceと最新Request優先制御を維持したまま解消する。

## Scope

- In:
  - `src/presentation/components/search-combobox.tsx`のSuggestion Open/Loading/result/empty遷移
  - `tests/component/presentation-foundation.test.tsx`のIssue #90回帰テスト
  - 今回Runの標準Artifact
- Out:
  - Suggestion検索ロジック、検索対象、debounce時間の変更
  - Search UI全体の設計変更、共通化、新規依存、無関係なrefactor
  - ADR、PROJECT_CONTEXT、永続的なdocs reportの追加（今回の局所修正では不要）

## Assumptions

- Issue本文とDefinition of DoneをProduct側の正本とする。
- 現在の作業ブランチはユーザー指定どおりで、Codexはbranch作成・切替を行わない。
- `allowsEmptyCollection`により、itemsを一時的に空にしてもOpen中のPopoverは維持できる。

## Questions / Ambiguity

- 必ず質問する不透明点: なし
- 仮定してよい細部: 明示closeは`onOpenChange(false)`でRequest IDへ紐づける。
- 未回答の重要質問: なし

## Hypotheses

- H1: 入力変更時の`setShouldOpenSuggestions(false)`が、debounce/async待ちの間にPopoverを閉じる直接原因である。
- H2: async完了時の無条件`setShouldOpenSuggestions(true)`をRequest単位の明示close判定で制限すれば、Escape後の勝手な再Openを防げる。
- H3: itemsを空にしてLoadingを同一Popoverへ描画し、完了時にitemsを差し替えれば、旧候補を表示せず安定したLoading/result/empty遷移になる。

## Research Plan

- Round 1 Query: Issue #90、SearchCombobox、既存Component Test、React AriaのOpen/empty collection挙動を確認する。
- Round 2 Query: focused Component Testで旧実装の主要回帰assertionが失敗することを確認し、修正後に必須validationを実行する。
- Exit Criteria:
  - 連続入力中の`aria-expanded=true`と同一Popover内Loadingを検証できる。
  - result/empty、stale request、2文字未満、Escape、Keyboard/Enterを検証できる。
  - 150ms debounceと既存Sequence制御を維持している。

## Approach

- まず旧実装の状態遷移とテスト契約を確認し、テストでちらつきの旧挙動を固定してから最小差分で実装する。
- Request IDごとの明示closeを保持し、最新Requestだけがitems/loadingを更新する。
- focused test、指定quality gate、可能なら`pnpm run verify`を順に実行し、失敗時は最初の異常を調査して最小修正する。
- 最終diffを自己レビューし、Run Artifactをsanitizeしてからcommit、push、main向け非Draft OPEN PRを作成する。

## Definition of Done

- Issue #90のDefinition of Doneを満たす。
- 150ms debounce、最新Request優先、Loading/result/emptyの同一Popover遷移をComponent Testで確認する。
- 2文字未満、Escape、Keyboard選択、候補未選択Enter検索をComponent Testで確認する。
- 必須validationがPASS、または無関係な既知failureを根拠付きで切り分ける。
- 不要な変更を含めず、Run Artifactをsanitize済みでcommitする。
- 指定commit、branch push、main向け非Draft OPEN PR（`Closes #90`）まで完了する。mergeは行わない。

## Risks / Unknowns

- React Ariaが空Collectionを理由に自動closeする可能性がある。`allowsEmptyCollection`とComponent Testで確認する。
- 完了CallbackがEscape後に再Openする可能性がある。Request IDへclose意図を紐づけたテストを追加する。
- Popover維持により候補未選択Enterの既存経路が変わる可能性がある。Loading中の直接検索を明示検証する。

## Thinking Log

- 2026-09-03: Issue本文は検索ロジック変更ではなく、Open/Close境界と表示状態の分離を要求しているため、既存effectのsequence/debounceは維持する。
- 2026-09-03: `onInputChange`でのcloseを除去し、`setItems([])`と`setLoading(true)`を維持する。React Ariaの`allowsEmptyCollection`が同一Popoverを保持する前提をテストで確認する。
- 2026-09-03: 完了時の再Openは`onOpenChange(false)`が受けた現在Request IDを抑止値として使う。新しい入力ではSequenceが進むため、明示close後の別Requestは通常どおり開ける。
