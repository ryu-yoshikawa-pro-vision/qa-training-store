# PR #4追加修正計画

## Goal

PR #4の追加指示について、現行コードで有効な問題だけを最小差分で修正し、CI・自動テスト・Playwright-MCPの実動確認まで完了する。

## Current understanding

- 現在のBranchは `feat/ui-ux-user-journey-improvements`、Baseは `main`。
- `.github/workflows/ci.yml` のCross-role lifecycleはPRイベントで実行されない。
- Review eligibility/state、Preview review summary、Dirty Navigation Dialog、route linkability、Customer order detail cast、Scenario dataset、送料定数、ConfirmDialogのPromise契約に追加確認が必要である。
- Run Artifactの絶対Path、REPORTの順序、`changed_files`の意味、ADRのTest API説明にも修正要求がある。

## Assumptions

- 既存のApplication／Domain契約と前回修正済みReset・Preview・Processing・Cross-role・Shipment・Cart・Guide仕様を維持する。
- 既存依存の `react-aria-components` と既存テスト基盤を使用し、新規Libraryは追加しない。
- `changed_files`は当該Runのsource変更を表すrepo-relative POSIX pathとし、`.codex/runs/`生成物は除外する。

## Non-goals

- 新機能、大規模リファクタリング、固定待機やRetry追加、Git/PR操作。
- 現行契約上有効なPlaywright alias、`default` metadata、固定学習アカウント、docstring coverageコメントの変更。

## Impacted areas

- CI workflow、Review/Checkout/Preview use case、Admin Product dirty navigation、Guide/Reset route presentation、Scenario seed/test contracts、Run generator and documentation.

## Change strategy

1. 現行コードと既存テストを調査し、各コメントをFixed / Already resolved / Not applicable / Intentionally unchangedへ分類する。
2. Review状態導出を小さな純粋関数へ集約し、未配達contextとPreview review summaryを正しいDTOへ返す。
3. Dirty Dialogをcontrolled accessible modalへ変更し、route allowlist・Notice・Metadata・Cart文言・Customer order service・送料定数・Confirm Promise・PR CIを修正する。
4. Unit/Integration/Component/E2Eで各契約を固定する。
5. Run generator/templateと指定Run文書を正規化し、ADR/PROJECT_CONTEXT/historyを整合させる。
6. 必須自動テスト、4 viewport UI Review、Playwright-MCP、scope/Git監査を実施する。

## Validation plan

- 指示書の全 `pnpm` check/test/build コマンド。
- UI Review 4 viewport（`UI_REVIEW_STAGE=pr4-review-fix`）。
- `git diff --check`、絶対Path検索、JSON parse、Run artifact strict collector。
- Playwright-MCPでDirty Dialog focus/trap/restore、未配達Review、Preview集計、Guide/Reset links、Cart Notice、独立Cross-role A/B/Cを確認する。

## Risks

- react-ariaのcontrolled DialogがBrowser Backの再実行契約に影響しないよう、既存navigation handlerを維持する。
- direct `getMyCustomerOrder`化で不足するテストmockはmock側だけをApplication契約へ合わせる。
- 古いRunの絶対Pathは削除せず、匿名化と説明の修正に限定する。

## Open questions

- なし。詳細な実装配置は既存構造を調査した上で安全側に決定する。
