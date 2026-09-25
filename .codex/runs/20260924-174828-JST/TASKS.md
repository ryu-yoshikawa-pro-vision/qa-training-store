# Tasks（タスク）

## Now（現在）

- 実行順は保存Planの実装順序に従う。CSS移動前gateが未解決なら後続のCSS作業へ進まない。
- [x] 1. 同一task active Runを確認し、standard implementation Runを初期化する。
- [x] 2. Current main、PR #181、Issue #131、Plan、global.css blob、Web root、architecture contract、workflow commandを再確認する。
- [x] 3. Current global.css selector / named at-rule consumer inventoryを作成し、TSX参照とUI ownerを分類する。`.fixture-account-panel`系と`.admin-resource-code`系は削除履歴を確認し`dead / remove`へ分類済み。source CSSは未変更。
- [x] 4. override chain、specificity、property、media/state、source orderをmappingする。owner間候補はpairwise判定ではなく、実表示state / viewportの全cascade chainと最終computed valueで再確認した。
- [x] 5. foundation / shared / Storefront / Admin間のowner分割後にCurrent computed behaviorを維持できない未解決dependencyが0件であることを証拠化し、移動前gateをPASSとする。Breadcrumbs hoverのみshared-local preservation ruleをCSS refactor時に追加する。
- [x] 6. gate通過後、保存Planの4 project / capture registryでbefore UI Reviewを取得し、Breadcrumb linkのhover前後computed colorを記録する。全captureは`issue-131-before-batch-01`〜`03`に保存。
- [x] 7. global.cssをfoundationへ整理し、shared.cssを作成・移動する。
- [x] 8. storefront.cssを作成し、Storefront selectorとresponsive ruleを移動する。
- [x] 9. admin.cssを作成し、Admin selectorとresponsive ruleを移動する。
- [x] 10. Web root CSS import順を保存Planどおり更新し、architecture contractを追加する。
- [x] 11. docs/PROJECT_CONTEXT.mdを更新し、更新前内容をdocs/historyへ保存する。
- [x] 12. static ownership self-reviewを行い、同一owner内rule順・className・Native boundaryを確認する。
- [x] 13. focused format/lint/typecheck/architecture contractとWeb buildを実行する。
- [x] 14. Chromium E2E、accessibility、mobile boundaryを実行する。
- [x] 15. after UI Reviewを取得し、before/afterをroute・scenario・viewportごとに比較する。
- [x] 16. pnpm run verifyとgit diff --checkを実行する。
- [x] 17. source diff / scopeをレビューし、Run Artifactをfinal commit前状態へ確定する。
- [x] 18. scripts/sanitize-codex-artifacts.ps1 -Write -Checkを実行し、residual finding 0を確認する。
- [ ] 19. branch safetyを確認しcommit、対象branchへ通常pushする。
- [ ] 20. local HEAD / remote branch head / PR #181 headの一致を確認する。
- [ ] 21. 最新headのWeb CIとMobile App CIがsuccessしたことを確認する。
- [ ] 22. PR #181本文にownership mapping、実装、local validation、visual比較、最新CIを記録する。
- [ ] 23. PR本文readbackと最新head / scopeを再確認し、完了状態を報告する。

## 完了処理の参照先

- 基本Progressの分母・表記: docs/reference/run-artifacts.md
- commit / push / PR / CI lifecycle: docs/reference/codex-implementation-harness.md
- quality gate failure repair: docs/reference/repair-loop.md と .agents/skills/repair-loop/**
- branch / refspec / recovery: docs/reference/git-branch-safety.md
- issue実装順序 / ownership / gate / validation: docs/plans/2026-09-24_162600_issue-131-global-web-css-ownership-boundary.md

checkbox taskの完了はfinal commit前のtracked task進捗であり、push後CIを含むtask全体の完了判定とは分離する。

## Discovered（発見事項）

- `.fixture-account-panel`系はcommit `01acf2c216fc72470253c0b49c616f0219377167`でLogin consumer削除後にCSSだけ残ったことを確認し、`dead / remove`へ分類した。
- `.admin-resource-code`系はcommit `0466614281efd2327bfba662dee10c3de5fd4d13`で注文詳細と商品編集のconsumer削除後にCSSだけ残ったことを確認し、`dead / remove`へ分類した。
- CSS selector listにはowner間で分割すべきgroupがある。例: `.wordmark` / `.admin-wordmark`、`.auth-card`・`.account-form` / `.filter-bar`、Storefront限定card selector / `.summary-card`、`.success-message` / `.operation-message`、`table-actions` / `.inline-actions`・`.button-row`。これらはselectorごとの移動時にpropertyを変えず分割する。
- link hover候補は全cascade chainと表示state / viewportで再評価した。Desktop navigationは後段`.desktop-navigation a:hover`（specificity `(0,2,1)`、`#111827`）が勝つ。Mobile navigationは`max-width: 899px`で表示される後段rule（通常 hover `#64748b`、`aria-current="page"` hover `#111827`）が勝つ。どちらもStorefront ownerへ移し、globalより後に読む予定順でCurrent behaviorを維持できるため、hover ruleを追加しない。
- Breadcrumbsは`.breadcrumbs a`と後段`a:hover`が同specificity `(0,1,1)`で競合し、Current hover colorは`var(--color-accent-dark)`。shared ownerで同値・同specificityの`:where(.breadcrumbs) a:hover`をbase ruleの後に置いて保持するmappingを確定した。gateでは未解決dependencyに数えない。
- その他のanchor color chainでは`.section-heading > a`が同specificityで後勝ちし、移動後もStorefront ownerがglobalより後に残る。Footer / Account / Admin navigationはowner-local hover ruleがよりspecific、Catalog / table linksはbase ruleがよりspecific。一般`a[href]` / `a:hover`はglobal owner内で相対順を保つ。別のbehavior-changing cross-owner dependencyは残らない。
- `.filter-bar input/select`（1066-1067）と`input/select:focus`（2669-2672）はpropertyが重なるが、focus側の`border-color`に`!important`があるためsource order依存ではない。
- PR #181 review finding: 静的selector / prefix auditでは`status-badge--${tone}`と`ConfirmDialog`の動的button modifierを捉えられていなかった。`.button--danger`、`.status-badge--danger`、`.status-badge--info`をshared ownerへ移し、3 selector限定のarchitecture contractとtargeted before / after UI Reviewを追加した。詳細とEvidenceはactive Run `REPORT.md`の2026-09-25 repair checkpointを参照する。

## Blocked（ブロック中）

- なし。Task 2のowner分割後behavior gate、before / after UI Review capture、static ownership auditはPASS。focused / repository validationとvisual residualの記録、Git / CI lifecycleを継続する。
