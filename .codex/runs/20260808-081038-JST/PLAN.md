# Plan

## Objective

- Web 38 routesとNative 38 route entriesを対象に、同じ品質基準のFull QA + Improvement Cycleを最低20回実施し、重要問題を解消して最終品質ゲートまで完遂する。

## Scope

- In:
  - Web Phase 1のPublic 14 / Customer 11 / Admin 13 routes。
  - Native Phase 2前半の正式実装10画面、Not Found、Automation Harness、26 placeholder routes。
  - 1440×1000、1024×900、390×844、320×700。
  - Browser内Playwright、Mobile-MCP、Maestro-MCP、正式Android wrapper、既存自動Test。
  - 問題の原因調査、最小修正、Regression、再探索。
- Out:
  - Native後半機能の前倒し、外部決済 / Backend / Cloud / Store公開、EAS実行。
  - 大規模Refactor、無関係な依存更新、Git mutation、証跡の削除 / 上書き。

## Assumptions

- Native実操作の正式主経路は現在接続可能な物理Androidとし、iOSはWindows環境の独立Blocked workstreamとして静的契約確認と再探索を続ける。
- 自動Screenshot / E2Eと人間視点の実操作は別の必須証跡として扱う。

## Questions / Ambiguity

- 必ず質問する不透明点: 現時点ではなし。
- 仮定してよい細部: 一意stage名、route確認順、同じ契約を保つ局所的UI修正。
- 未回答の重要質問: 削除、移行、権限、外部副作用が新たに必要になった場合だけ確認する。

## Hypotheses

- H1: 既存UI Reviewを全38 routes × 4 viewportsへ拡張すると、Small Mobileと未収集routeの崩れをCycle単位で再現可能にできる。
- H2: Browser / Mobile-MCPの探索とPlaywright / Maestro regressionを分離すると、Test PASSだが使いにくい問題と再現可能な欠陥を両方捕捉できる。
- H3: 複数画面で共通する問題はtoken / shared component / shellで直すことで、20回の再確認中の一貫性を保てる。
- H4: Platform / Tool failureを独立Workstreamへ分離すれば、Goal全体を止めずに原因調査と他Cycle作業を進められる。

## Research Plan

- Round 1 Query: Route / Component / Scenario / Test / Runbook / 直近成功baselineをmappingする。
- Round 2 Query: 全routeの4 viewport coverageとBrowser / Android / MCP preflightを実行し、Cycle 1開始条件を固定する。
- Exit Criteria:
  - 現行Routeと正式Scopeが確定している。
  - 既存Testのcoverage gapと実行順が確定している。
  - 各Cycleを同じ手順で完了判定できる。

## Approach

- 保存計画: `docs/plans/2026-08-08_082111_full-qa-20-cycles.md`。
- 標準Cycle: `Inventory -> Web 4 viewport全画面 -> Native全画面 -> 主要Flow -> Issue修正 -> focused regression -> Cycle残余 -> cycle regression -> metrics記録`。
- Partial failureは分類・再試行条件・代替確認を記録し、独立作業を継続して後で戻る。

## Definition of Done

- 最低20件の完全Cycleが`CYCLE_MATRIX.md`でCompleteになっている。
- Cycle 20時点の修正可能な重要問題が0件で、必要ならCycle 21以降も完了している。
- 最終Web / Native品質ゲート、Strict evaluation、Sanitizer Write + Checkが完了している。
- Git mutationを行っていない。

## Risks / Unknowns

- 物理Android / IME / MCP / Buildの一時障害、Windows上でのiOS不可、長時間の全画面capture、Scenario state汚染。
- 小画面全route coverage追加によって既存未観測問題が多数見つかる可能性がある。

## Thinking Log

- 2026-08-08 08:21 JST: Web / Native route fileは各38件。Native旧Inventoryの`/admin/test-control`記述は現コードと不一致で、現行はHarness Screenを持つ。
- 2026-08-08 08:21 JST: Small Mobile UI Reviewが主要10 routeに限定され、`/guide`がcore capture外であるため、Cycle 1前のconfirmed coverage gapと判断した。
- 2026-08-08 08:21 JST: 直近Android成功baselineとRunbookを採用し、主要Deep Link FlowとIME依存Search Flowを分離する。
- 2026-08-08 08:21 JST: `feature-plan`によりrepo mappingとchange planningを分離し、保存計画を実装前の正本とした。
- 2026-08-08 09:11 JST: Baseline capture拡張により、従来未観測だった`/guide`とReview投稿画面のMobile横overflowを再現した。共通原因は`.definition-grid`の2列intrinsic sizingと`dd`既定marginであり、Mobile共通ruleで修正した。
- 2026-08-08 09:11 JST: Full UI Reviewは4 workerだと描画競合で300秒上限へ達したため、同じbreadthを安定完走できた2 workerを後続Cycleの基準条件とする。
- 2026-08-08 09:11 JST: Mobile-MCPはScreenshot / crash参照のみ公開され操作APIがない。Mobile-MCP視覚証拠とMaestro-MCP実操作証拠を分離し、欠損操作をMaestroへfail-forwardする。
