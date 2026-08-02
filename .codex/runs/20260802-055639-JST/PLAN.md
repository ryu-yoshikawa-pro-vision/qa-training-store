# Plan

## Objective
- PR #4レビュー指摘を現行コードと照合し、有効な11項目を最小差分で修正し、関連自動テストとPlaywright-MCP実動確認まで完了する。

## Scope
- In: Scenario Reset、Product Preview、Payment Processing/Checkout Login、Cross-role E2E、Last Active Admin、Cart統合、Reset Notice、Home/Guide、Shipment表示、指定テストとRun証跡。
- Out: 新機能、契約の不必要な変更、依存追加、テスト弱体化、Git commit/push/PR/merge、無関係な整形。

## Assumptions
- 既存のApplication Error、Scenario Metadata、Test API、DTO契約を正本として再利用する。
- 既存の長いCross-role lifecycle testは残し、独立した3つの回帰テストを追加する。
- Routeは内部Pathだけを安全にLink化し、不正値や外部URLはLink化しない。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。
- 仮定してよい細部: 表示変換は既存dictionaryへ集約し、Shipment mappingは純粋関数としてテストする。
- 未回答の重要質問: なし。

## Hypotheses
- H1: Reset、Preview、Error mapping、Shipment、Cart、Noticeに現行コード上の有効な残件がある。
- H2: Flow I、Cross-role、Home/Guideの現行回帰テストはレビュー要求を十分に検証していない。

## Research Plan
- Round 1 Query: 11指摘を対象コード・既存テスト・直近Runと照合し、Fixed / Already resolved / Not applicableを分類する。
- Round 2 Query: 必要最小限の変更と追加テストを実装し、指定自動テスト・UI Review・MCPで再検証する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- read-only調査をcode/implementation/testの3 agentへ分担し、親agentがscopeを確定する。次にReset/Preview/表示・Errorを修正し、E2EとUnit/Component/Integration/Repositoryテストを追加する。最後に必須検証とChrome Browser ClientのPlaywright-MCPを行う。
- 標準フロー: `PLAN -> repo調査 -> TASKS -> 実装 -> 検証 -> REPORT`

## Definition of Done
- 指摘のうち現行コードで有効なものを全て修正し、既に解消済みのものは追加変更しない。
- 指定自動テスト、Build、4 viewport UI Review、MCP実動確認が成功し、Console/Page Errorがない。
- Run artifactと最終差分を確定し、Git mutationを行わない。

## Risks / Unknowns
- Reset成功後のNotice Storage失敗と、PreviewのForm未保存Variant状態をComponent/Integrationで明示的に固定する。
- E2EのScenario/Payment Delay/Role状態は各TestでReset・復元し、既存契約を変更しない。

## Thinking Log
- 2026-08-02 05:56 JST: Branchは指定どおり、source worktreeはclean。直近Run 20260801-210228-JSTは完了済みのため、新しいstrict repair Runを作成した。
- 2026-08-02 05:57 JST: 現行コードでResetのtry分離不足、Previewの公開Issue不足/messageKey露出、Flow Iの直接URL、Cross-roleの単一長文、Cart集計重複、Home/Guide/Shipment/Authの指摘が確認できた。詳細triageはread-only agent結果と突合する。
- 2026-08-02 07:45 JST: code_researcher、implementation_researcher、test_investigatorの調査結果を親agentで突合した。code_researcherの「Reset/Previewは解消済み」という結論は現行コードの直接確認と不一致だったため採用せず、実装・テスト・MCPで再検証した。implementation_workerはNotice/Guideの2ファイルだけを限定編集した。
- 2026-08-02 07:45 JST: E2E初回実行で、Cart追加直後の遷移競合と新規表示文言のstrict locator不整合を検出した。固定待機や期待値緩和はせず、UI成功状態の待機と意味的なscope修正を行い、再実行で全件成功した。
- 2026-08-02 07:45 JST: Playwright-MCPではReset、Preview、Payment Processing、Cross-role 3本、Home/Guide、Last Active Admin、Shipment mappingをUI操作だけで確認した。最終的に標準ScenarioとPayment Delay 500msへUIから復元し、ブラウザを終了した。
