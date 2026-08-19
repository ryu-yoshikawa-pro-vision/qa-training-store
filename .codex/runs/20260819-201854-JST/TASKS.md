# Tasks

## Now

- [x] 1. 必須文書・最新ADR・過去Runを読み、Strict Runを初期化する
- [x] 2. plan、main／branch差分、PR #34、既存CI／UI artifact baselineを確認する
- [x] 3. 対象workflow／contractの変更点と非変更境界を確定する
- [x] 4. Chromium固定5 jobのinstall commandをbrowser-onlyへ変更する
- [x] 5. `extended-e2e`をChromium／非Chromiumの条件付きinstallへ分岐する
- [x] 6. CI contract testへ今回のinstall契約を追加する
- [x] 7. local quality gates、contract、diff scope、禁止事項を検証する
- [x] 8. 既存branchへcommit／pushし、PR #34の初回CIを完了させる
- [x] 9. PR required checks、Chromium install log、UI Review 4 viewportを確認する
- [x] 12. Firefox／WebKitの結果を切り分け、Run Artifact sanitizer／evaluation／完了報告を行う
- [x] 13. Repair iteration 1でLinkのfont-family継承とfocused regression assertionを追加し、local validationを完了する
- [ ] 14. 修正版を既存branch／PR #34へcommit／pushする
- [ ] 15. 修正版PRのPhase 1 CI、Chromium install log、required checksを確認する
- [ ] 16. 修正版UI Review 4 viewportをbaselineと目視比較する
- [ ] 17. visual acceptance後、同一commitの追加rerunを前run完了後に2回実行・確認する
- [ ] 18. visual acceptance後、`workflow_dispatch`でmobile-chromiumのinstall／launch／testを確認する
- [ ] 19. 修正版のevaluation、sanitizer、Run Artifact、最終報告を更新する

## Discovered

- [x] D1. browser-only UI Reviewのfont fallback差異を分類し、今回変更を成立／保留判定する

## Blocked

- 10. 同一commitの追加rerun（旧タスク）: 初回UI Reviewで明確なfont fallback退行が判明したため保留していた。修正版のvisual acceptance後にタスク17として再開する。
- 11. `workflow_dispatch` mobile-chromium（旧タスク）: pre-merge visual acceptance未達のため保留していた。修正版のvisual acceptance後にタスク18として再開する。
