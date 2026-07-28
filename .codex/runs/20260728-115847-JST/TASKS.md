# Tasks

## Now
- [x] 1. 添付Goal・必読規約・直近Runを確認し、今回Runを初期化する
- [x] 2. Repository／docs／Route／Role／Presentation／Design／Test／直近差分をmappingする
- [x] 3. 実装前のExecution Planを`docs/plans/`へ保存し、Baseline coverageを確定する
- [x] 4. 全対象Routeを3 ViewportでBaseline撮影し、画像を実見して重大度別Auditを作る
- [x] 5. Wave 1（基盤）を実装・検証・撮影・比較する
- [x] 6. Wave 2（Storefront）を実装・検証・撮影・比較する
- [x] 7. Wave 3（Checkout／Account）を実装・検証・撮影・比較する
- [x] 8. Wave 4（Admin）を実装・検証・撮影・比較する
- [x] 9. Wave 5（Edge State）を実装・検証・撮影・比較する
- [x] 10. 全必須・利用可能な追加Regression Testを実行し、失敗を切り分ける
- [x] 11. 最終Visual Reviewを2回実施し、全Route／Role／Viewport／完了基準を監査する
- [x] 12. 差分・非変更領域・Run Artifactを確定し、指定形式の最終報告を完成させる

## Discovered

## Blocked

## Paused（2026-07-28 15:34 JST、ユーザー指示）

- Task 10:
  - 最終差分に対する`format`／`format:check`／全体`lint`／`typecheck`を再実行する。
  - Unit／Integration／Repository／Component／Contract／`build:web`を最終差分で再実行する。
  - `test:e2e:chromium` 14/14と`test:a11y` 4/4は完了済み。Mobile Boundaryは直接Playwright実行の`.last-run.json`がPASSだが、環境shim回避手順を整理して正式コマンドまたは同等コマンドで再確認する。
  - 未実行の追加回帰: `test:e2e:mobile`、`test:e2e:cross-role`、Firefox smoke、WebKit smoke、`pnpm run verify`、`bash scripts/verify`、`git diff --check`。
  - `playwright.config.ts`、`tests/contracts/playwright-config.test.ts`、`scripts/serve-web-dist.ts`に停止直前のsubagent由来・未レビュー差分がある。保持／取り消しを最初に判断し、採用する場合はFormat・Contract・Security・E2Eを再検証する。
- Task 11:
  - 全37 Route＋8 EdgeをDesktop 1440×1000、Tablet 1024×900、Mobile 390×844、代表320×700で最終撮影する。
  - 独立した最終Visual Reviewを2回実施し、各回の全画像を原寸確認する。新規Critical／High／対応可能Mediumが出た場合は修正後に2回をやり直す。
- Task 12:
  - `code-review` skillで最終差分を自己レビューし、必要ならbounded Repair Loopを行う。
  - Domain／Application Use Case／Database／Route／Permission／Seed／Test Controlが非変更であることを差分監査する。
  - 一時runnerを標準Run Artifactから分離し、Run manifest／TASKS／REPORTを完成させる。
  - 指定された`# UI/UX Improvement Report`形式で、全検証結果・Visual Stage・残存課題を報告する。
  - 全完了後にのみGoalをcompleteへ更新する。

Progress: 100% (12/12)
