# Tasks

## Now

- [x] 1. 添付Plan、repo契約、Current Spec、Challenge、Tool Profile、Agentic QA scripts/testsを確認する
- [x] 2. HEAD、branch、worktree、Runtime設定、実行コマンドのbaselineを確認する
- [x] 3. Host Capability Matrixをtrusted / machine-readable / enforceable観点で完成させる
- [x] 4. Wave 0判定に応じて、後続Waveを停止するか実装へ進む。未達ならBLOCKED reportを作成する
- [x] 5. 指定Validation、self-review、scope audit、Run Artifact Sanitizerを実行する
- [x] 6. REPORT、TASKS、PLAN、run.jsonを確定し、ユーザー向け完了報告を行う
- [x] 7. Shared Canonical JSON / Runtime Variant / Artifact Manifest / Host Receipt Contractを実装する
- [x] 8. Learner-safe Scored Skillとcanonical Runner Input packaging/hashを実装する
- [x] 9. Source-free Prepared Target identity、Protected Patch、served-resource probeを実装する
- [x] 10. Generic Initial State Bootstrap / trusted receipt / runtime-control operation logを実装する
- [x] 11. Budget / Execution Summary / Output Import / Evidence Mapping / Artifact Freezeを実装する
- [x] 12. Deterministic Evaluatorへ新しいidentity・receipt・freeze検証を接続する
- [x] 13. Basic / Intermediate / AdvancedのPreparation/contract entry pointとreproducibilityを接続する
- [x] 14. Documentation、Run artifact、自己レビューを更新する
- [x] 15. Contract・runtime preparation・required validationを実行して結果を記録する

## Discovered

- [x] D1. `PLAYWRIGHT_BASE_URL`はProcess/User/Machine環境のいずれにも設定されていない
- [x] D2. `training/agentic-qa/skills/scored-v1.md`とPrepared Target artifactは現在のworktree/Runに存在しない
- [x] D3. 現Hostの実行可能コマンドでは`pnpm`、`gh`、`adb`、`docker`が利用できず、汎用PowerShell shell capabilityは露出している
- [x] D4. 指定Validationの実行可否とbaseline結果を確定する
- [x] D5. Windows Disposable Sourceの依存解決をroot junctionからoffline hoisted installへ変更し、Expo Router bundle discoveryを再確認する
- [x] D6. Prepared Web distのsubresource request境界と直接navigation拒否をContract Testで固定する

## Constraints (Official実行時の外部入力)

- B1. Host-trusted Fresh Session / Fresh Context / no inheritance / identity / Actual Tool Scope / Tool Isolationの証跡は実行時入力として検証し、未提供時は`valid_for_scoring=false`とする
- B2. 固有`PLAYWRIGHT_BASE_URL`とsource-free Prepared Target handoffが未提供の実行は、別Runtimeで代用せずinvalid/not executedとする
