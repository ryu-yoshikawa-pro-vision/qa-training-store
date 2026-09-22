# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #130と関連Phase 6判断を確認する。
- [x] 2. Current `main`のNative CI job graph / final gate / iOS reusable workflowを確認する。
- [x] 3. repair historyと高変更頻度boundaryを確認する。
- [x] 4. contract test / Native helper / change detectionを確認する。
- [x] 5. Refactor要否と採用しない代替案を確定する。
- [x] 6. 実装対象・検証・rollback・DoDを保存Planへ落とす。
- [x] 7. Plan-only Run Artifactを作成し、実装・PR作成を行わず終了する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- Plan保存規約: `PLANS.md`
- feature plan: `.agents/skills/feature-plan/**`
- Git branch安全: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- `scripts/native/android-maestro-run.sh`はCurrent Mobile App CIでFormal / Training Maestroから利用されるが、`detect`のNative path listへ明示されていない。
- Android job群をReusable Workflowへまとめると、CurrentのAutomation / Production個別resultと部分診断実行条件の再公開が必要になるため、今回の最小Refactorには適さない。
- iOSは既にReusable Workflow boundaryを持つため、その構造を変更する必要はない。

## Blocked（ブロック中）

- なし。
