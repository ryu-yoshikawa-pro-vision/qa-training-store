# Full QA Cycle Matrix

## Baseline Route Inventory

- Web: 38 route entries（Public 14 / Customer 11 / Admin 13）
- Native: 38 route entries（正式実装10 / Not Found 1 / Automation Harness 1 / placeholder 26）
- Web viewports: 1440×1000 / 1024×900 / 390×844 / 320×700
- Native primary runtime: 物理Android。iOSは環境別に分離する。

## Cycle completion contract

各行をCompleteにするには、Inventory、Web全route×4 viewports、Native全対象画面、Guest / Customer / Admin / Native主要Flow、Browser内Playwright、Mobile-MCP、Maestro-MCP、発見Issueの修正・再確認、Cycle regressionをすべて満たす。不完全Cycleは回数へ数えない。

## Baseline validation

- Web UI Reviewを`/guide`追加・Small Mobile全route化し、Desktop 46 / Tablet 46 / Mobile 53 / Small Mobile 53の計198 captureへ拡張した。
- 198 captureすべての自動overflow検査と全画像目視監査を完了し、最終stageは4 project PASS、目視finding 0件だった。
- 新規観測した`/guide`とReview投稿画面のMobile横overflowは、共通`.definition-grid`のMobile 1列化・縮小・折返しで修正し、Browser DOM実測とfocused regressionで解消を確認した。
- BrowserでAdmin Login、Scenario選択、確認Dialog、Reset、Customer Login、対象画面遷移を実操作した。
- 物理AndroidのDoctor / preflightを完了し、Maestro-MCPでNative Storefront 24 commandを完走した。Mobile-MCPは端末・Screenshot取得に成功したが、現環境の公開toolにtap / swipe / backがないため操作はMaestroへfail-forwardした。
- Windows上のiOS実操作不可は独立Blocked workstreamとして維持する。

| Cycle | Status | Web screens checked | Native screens checked | Web flows checked | Native flows checked | Viewports | Issues found | Issues fixed | Tests added/updated | Remaining blocker |
|---:|---|---:|---:|---:|---:|---|---:|---:|---:|---|
| 1 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 2 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 3 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 4 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 5 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 6 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 7 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 8 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 9 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 10 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 11 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 12 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 13 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 14 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 15 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 16 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 17 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 18 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 19 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |
| 20 | Pending | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 | — |

## Route inventory changes

| Cycle | Web count | Native count | Change |
|---:|---:|---:|---|
| Baseline | 38 | 38 | 旧InventoryからNative `/admin/test-control`をHarness Screenへ訂正 |
