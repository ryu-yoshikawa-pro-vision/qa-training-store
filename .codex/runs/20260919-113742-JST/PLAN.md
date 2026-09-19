# PR #157 目的適合修正 Plan

## Objective（目的）

PR #157の自己学習経路について、講師の口頭補足や暗黙知に依存せず、Commonの正式Receipt実行、C10、Completion check、Part 2 CI Receipt、Workbook契約、Diagnostic復元、Training Copy往復同期を教材・実装・テストの同一契約へ揃える。

## Scope（対象範囲）

### In

- `run-playwright-with-receipt.ts`の`--root`正式経路へ一時Runtime treeを追加する。
- C10 provided exerciseを`TC-CART-900`へ統一する。
- `training:completion:check`のP1/P2正式入口とCI Artifact復元手順を教材へ追加する。
- `TC-CART-101`の縦断契約、WorkbookのLayer / Tool値、既知のliteral Assertion検出を修正する。
- Diagnostic復元のRepository外root境界と、Training CopyからHandoffへの削除・rename同期を検証する。
- Runtime Contractを通常Contractから分離し、専用CI jobで一度だけ実行する。
- Completion Receiptの重複フィールドを削除する。

### Out

- Product Code、Formal Regression、Native / Expo / Maestroの変更。
- Codex Hook / Harness、Agent設定、依存追加、新しいManifest・状態DB・採点方式。
- Git commit、push、PR更新、merge、PR close、force push。
- 実GitHub Training Copyがない環境でのPart 2 V1 PASS判定。

## Assumptions（仮定）

- 実装開始時のHEADは指定された`6e6f11852c827b370f99162b08dd868e1b3c4183`であり、mainの後続変更は取り込まない。
- Canonical `reset-scenario.ts`はExecution専用の一時treeにだけ配置し、Handoffのlearner-owned codeには保存しない。
- `output/**`はローカル生成物であり、VitestのContract discoveryから除外する。
- Part 2の正式GitHub環境がないため、Part 2 V1はBLOCKEDのまま扱う。

## Questions / Ambiguity（質問・曖昧性）

- 既存実装とPR契約から今回の10項目の方針は確定できたため、Ownerへの追加質問は不要。
- 通常Contract全体はWindows環境で6分超のため完了しなかった。個別の必須Contract群と遅いworkflow検証は別途完了しており、成功扱いへ読み替えない。

## Hypotheses（仮説）

- H1: Runtime treeをRunner内部で構築すれば、学習者コードの正本・Path・digest意味を変えずにCanonical Helperを解決できる。
- H2: 既存のWorkbook、Receipt、Evidence、Completion契約を再利用すれば、新しい学習基盤を追加せず自己学習経路を接続できる。
- H3: Runtime専用Jobと通常Contractの明示的なexcludeにより、CIの二重実行とskip隠蔽を防げる。

## Research Plan（調査計画）

- 指定HEAD、mainとの差分、既存Runner / Reporter / Receipt、Workbook schema、Completion checker、Training Copy、CI、教材、ADR-0023を確認する。
- 複数の読み取り専用subagentでRuntime / Completion / Copy / CI / 教材の観点を分担し、指摘を統合する。
- 変更後に、必須Contract、Runtime専用script、型・Lint・文書・Security・Curriculum gateを実行する。
- Exit Criteria:
  - 10項目の回帰テストと教材契約が確認できる。
  - Runtimeは`2 passed (2)`でskipがない。
  - 未完了の通常Contract全体timeoutを明示記録する。

## Approach（進め方）

1. 現行実装と既存契約を調査し、既に修正済みの内容を戻さない。
2. Runner、Completion、Diagnostic、Copy同期、CI、Workbook schemaを最小差分で修正する。
3. 教材とContract testを実装契約へ同期する。
4. formatter、型検査、Lint、Security、Curriculum、必須Contract、Runtimeを実行する。
5. 差分範囲とRun Artifactを確認する。Git mutationは実施しない。

## Definition of Done（完了条件）

- Commonの教材記載コマンドが`--root`だけでLearner specを実行し、Receiptを生成する。
- C10 provided exerciseとLearner Caseが`TC-CART-900` / `TC-CART-101`として混同されない。
- P1-9 / P2-8からCompletion checkへ到達でき、Part 2のCI ReceiptをArtifactからHandoffへ戻せる。
- WorkbookのLayer / Tool誤記、literal Assertion、Diagnostic root escape、Copyの削除・rename、Receipt重複フィールドをContractで検出できる。
- Runtime専用scriptとCI jobが実行され、`2 passed (2)`、skipなしを確認する。
- Part 2 V1は実GitHub環境がないためBLOCKEDを維持する。
- 変更対象のformatter、必須static gate、`git diff --check`を実行し、未解消Failureを報告する。

## Risks / Unknowns（リスク・未知点）

- Windows上の通常Contract全体は長時間化するため、個別必須Contractと単独workflow testを根拠として分離記録する。
- ローカルの無視対象`output/**`がテスト探索へ混入するため、package scriptで除外する。
- CIの最終successは未pushのため未確認であり、Part 2学習者環境の代替にはしない。

## Thinking Log（判断記録）

- 2026-09-19: Runtime testの`testRootOption`回避を削除し、Common / C10をhandoff rootだけで実行するようにした。Diagnosticだけは明示rootを維持した。
- 2026-09-19: C10の決定的演習は`c10-cart-900.spec.ts` / `TC-CART-900`へ統一し、`TC-CART-101`はLearner Caseの縦断契約として残した。
- 2026-09-19: 固定Case件数quotaは追加せず、`TC-CART-101`自体のAutomate / Web E2E / Playwright / learner-owned条件を検証するようにした。
- 2026-09-19: `expect(1).toBe(1)`等は拒否し、`textContent()`等の実行時値比較は受け入れる回帰テストを追加した。`semantic_understanding`は`NOT_EVALUATED`のまま維持した。
- 2026-09-19: 通常ContractのRuntime除外に加えて、ローカル生成物`output/**`を除外した。Runtime専用scriptは`2 passed (2)`を確認した。
