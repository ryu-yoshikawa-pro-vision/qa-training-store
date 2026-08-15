# PR #25 と最新 main の意味的統合計画

## 0. 依頼概要

- 依頼内容: PR #24を含む最新`main`（`6fd393340742170877838bd9d025631895e194fa`）とPR #25 HEAD（`6aa054b3ed0a7e39f178e3638bef18bb4de903c5`）のmerge conflictを、両PRの契約を維持したまま解消する。
- 背景: 旧baseから並行実装されたVisual SpecificationとCurriculum / Training Environmentが、CI、Native workflow、package scripts、Project Context、契約テストで競合している。ADR-0013の番号重複とTraining Maestroの旧`clearState`起動も意味的競合である。
- 期待成果: source上の競合マーカーを除去し、Visual Final Gate、Curriculum Gate、Formal / Training Native起動契約、Windows Physical Device契約、ADR番号、lockfile、契約テストを整合させる。

## 1. ゴール / 完了条件

- ゴール: PR #24の最新設計へPR #25のTraining assetsを最小差分で適応する。
- 完了条件（DoD）:
  - 競合マーカーがなく、sourceの未解消競合がないことを確認する（Git indexの最終stageはユーザーが`git add`する）。
  - `ci.yml`にVisual Final GateとCurriculum Gate、Required Training Web matrixが残る。
  - `package.json`とlockfileにVisual / Curriculum / Trainingのscripts、typecheck、Expo patch versionsが共存する。
  - Native CIのFormalおよびTraining Maestroが`android-maestro-run.sh`を使い、TrainingがProduction APKより前にfail-closeで実行される。
  - standalone Training runnerでもtarget serialを固定し、OS-level cleanup後にMaestroを起動する。Training YAMLから`clearState: true`を除去する。
  - ADR-0013をScreen Catalog側に限定し、Curriculum側をADR-0014へ移行する。
  - Windows Local Physical Device、GitHub API34 Emulator、iOS Build-only、remote Training Copy Optional境界を維持する。
  - 指定されたlocal validation、sanitizerを実行する。push後の新HEAD CIはユーザー操作後の確認事項として残す。

## 2. 現状理解と前提

- Current understanding:
  - mergeは開始済みで、`MERGE_HEAD`は`6fd393340742170877838bd9d025631895e194fa`、HEADは`6aa054b3ed0a7e39f178e3638bef18bb4de903c5`である。
  - unmerged fileは`.github/workflows/ci.yml`、`.github/workflows/native-ci.yml`、`docs/PROJECT_CONTEXT.md`、`package.json`、`tests/contracts/native-ci-workflow.test.ts`の5件である。
  - `scripts/native/android-maestro-run.sh`はforce-stop、pm clear、再force-stop、PID消失確認後にMaestroを起動する既存契約を持つ。
  - `scripts/native/windows/android-local.ps1`にはVirtual Store明示とPhysical Device fail-close契約が既に自動統合されているため、内容を確認し、欠落時だけ最小修正する。
- Assumptions:
  - ユーザー指定の最終順序と契約を正本とする。
  - Git add / commit / push / merge / rebase等はユーザーが行うため、Agentはworking treeのsource修正とread-only検証まで実施する。
- Non-goals:
  - Product business logic、Visual implementationの巻き戻し、新しいCI基盤、remote Delivery、Final Candidate SHA freeze、AVDをWindows Local Canonicalへ戻すこと。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーが最終契約、許可されたGit境界、検証コマンドを指定済み。
- 仮定してよい細部: 既存の`android-maestro-run.sh` interfaceをNative CIとTraining runnerで再利用し、runner側のADB cleanupは小さな関数として既存のserial resolution後へ追加する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: Phase 1 Required CI、Native CI、standalone Training Android、package / lockfile、ADR / Project Context、Curriculum contract。
- Files to inspect / change:
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
  - `package.json`
  - `pnpm-lock.yaml`
  - `scripts/training/run-maestro-baseline.ts`
  - `training/maestro/baseline/native-training-baseline.yaml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `tests/contracts/training-curriculum.test.ts`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/adr/0013-curriculum-pr-required-dod-scope.md` → `docs/adr/0014-curriculum-pr-required-dod-scope.md`
  - `scripts/native/windows/android-local.ps1`
  - `training/github-actions/training-native-ci.yml`
  - Active Run `.codex/runs/20260813-093427-JST/`

## 5. 変更方針

- Change strategy:
  1. 競合5ファイルをours/theirsの一括採用をせず、両側の必須契約をunionする。
  2. `package.json`の最終scriptsを確定し、Visual Final Gateの後にCurriculum Gateを置いてlockfileを再生成する。
  3. Native Formal FlowとTraining baselineを共通startup helperへ接続し、Training YAMLの`clearState`依存を除去する。standalone runnerには同等のADB cleanupを追加する。
  4. ADR番号とcurrent referenceを修正し、Project Contextは日付順に両PRのsectionを保持する。
  5. Contract testをVisual / Formal / Trainingの統合契約へ拡張し、focusedからfull validationへ進む。
- 実行タスク:
  - [ ] 1. 競合ファイル5件のsource統合とmarker除去
  - [ ] 2. Visual / Curriculum Gate、Training matrix、package scripts、lockfileを統合
  - [ ] 3. Native / standalone Training startup contractをrebaseline
  - [ ] 4. ADR番号、Project Context、current referenceを修正
  - [ ] 5. 統合contractを追加・更新する
  - [ ] 6. Static / contract / full validationとsanitizerを実行する

## 6. 検証方法

- Validation plan:
  - conflict marker、unmerged path、`git diff --check`、ADR旧参照を確認する。
  - `pnpm install --lockfile-only`、`pnpm install --frozen-lockfile`、Expo Doctorを実行する。
  - format、markdown、spec、visual final、curriculum、lint、typecheck、training typecheck、focused contracts、full contracts、full test、verifyを順に実行する。
  - Native実機／Emulatorは環境が利用可能な場合のみRunbookに従って実行し、未実行をPASS扱いしない。
- 成功判定: 指定GateがPASSし、失敗時は最初の異常を分類してbounded repairを行う。同一failureの無目的retryはしない。

## 7. リスクと未解決論点

- Risks:
  - Visual側の`typecheck`やTraining Web matrix削除が自動mergeで混入しやすいため、package / workflowの実体を契約テストで確認する。
  - Training YAMLの`clearState`除去後もstandalone runnerがcleanupを担保しないと回帰するため、runner contractを追加する。
  - Active Runは過去の完了履歴を持つため、REPORTはappend-onlyで追記し、過去Evidenceを削除しない。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: 上記のsource / contract / ADR / lockfile / Active Run。
- 付随ドキュメント: 本計画書。`docs/reports/`の追加レポートは作成しない。

## 9. 備考

- ADR-0013 Screen Catalogは変更しない。
- Task 14のremote Training Copy / Final DeliveryはOwner DecisionどおりDeferred / Optionalのまま維持する。

## 10. 現時点の結果

- ユーザー作成のmerge commit `77ef6b685488c680a3fd24000316ccdf313fe05b` により、最新main `6fd393340742170877838bd9d025631895e194fa` の取り込みとGit conflict解消は完了している。
- Semantic repairとして、Visual / Curriculum Gateの共存、Training Maestroの共通startup helper、standalone ADB cleanup、`clearState`除去、ADR-0014移行、Expo / yaml lockfile整合、Windows Physical Device契約を確認した。
- Local source validationは主要gate / contract / test / buildでPASSした。ただし全体`format:check`と`verify`はorigin/main由来の40ファイルの整形baselineで停止し、Expo DoctorはExpo API fetch timeoutだったため、Local validationは完全PASSではない。
- 最新merge後のexact HEADについてPhase 1 CI / Native CIは未確認であり、ユーザーのstage / commit / push後に確認する。Remote Training Copy、`FINAL_CANDIDATE_SHA`、Final Delivery RecordはDeferred / Optionalのまま維持する。

## 11. 品質ゲート修復結果（2026-08-15）

- `prettier --list-different`で検出された40ファイルを対象に、ロジック変更を伴わない`prettier --write`を実行した。再確認した`pnpm run format:check`はPASSし、Gitの内容差分は増えていない。
- `pnpm run verify`は、実測したtest時間を踏まえて10分上限で再実行し、287.4秒でPASSした。format、markdown、spec、Final Visual、curriculum、lint、typecheck、image manifest、security、full test、Web build、Spec buildを確認した。
- `pnpm dlx expo-doctor@1.17.6`のschema fetch timeoutは未解消の環境依存blockerとして維持する。新exact HEADのPhase 1 / Native CIもユーザーのcommit / push後に確認する。
