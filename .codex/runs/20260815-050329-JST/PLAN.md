# Plan

## Objective

- PR #24にRegistry由来のAndroid canonical visual batch capture/apply経路を追加し、push後に固定API34 Actionsで25件を取得・検証・promotionできる状態まで進める。

## Scope

- In: `native-ci.yml`のsingle/all capture、`android-visual-capture.ts`のlist/batch validation/apply、package script、contract tests、必要なRun/plan記録。
- Out: Product UI、Native Capture semantics、Final Gate、startup helper、Git mutation、Actions自動commit、canonical capture前のstatus変更。

## Assumptions

- Remote PR HEADはGitHub APIから取得する。Git CLIは使わない。
- batch artifactは`batch.manifest.json`と`raw/<screen>/<state>/android.png|android.manifest.json`を持つ。
- 実capture成功後、既存materialize scriptでMarkdown referenceを生成する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザーがprofile、branch、inputs、DoD、禁止事項を指定済み。
- 仮定してよい細部: single modeは既存の1件artifact互換を保ち、batch modeだけ`requested_mode=all`をapply許可する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Registryからcase keyを実行時に導出し、同一Emulatorでcaseごとに既存Maestro flowを再起動すれば、YAML重複なしで25件をisolated captureできる。
- H2: batch manifest、既存per-case manifest validator、実APK digest、canonical profileを全件検証してから一時WebPを生成すれば、partial/stale/mixed provenanceのpromotionをfail-closeできる。
- H3: status transitionをpromotion成功後の明示的処理に限定し、asset存在だけではcapturedへ昇格しなければFinal Gateの意味論を維持できる。

## Research Plan

- Round 1 Query: remote PR HEAD/workflowとlocal CLI/registry/testsをread-onlyで比較し、STATE A/B/Cを判定する。
- Round 2 Query: existing single capture flow、materialize、visual validator、Native workflow contractを読み、safe change surfaceとall-or-nothing境界を確定する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- remote gateを通過する前にlocal batch infrastructureを実装・testする。workflowはcapture inputが`all`のときだけRegistry listをloopし、APK build/emulator/profile/installは既存jobを一度だけ実行する。applyは全件validation→temporary WebP→canonical/status transitionの順序を持つ。local validation後にHANDOFF A、push後にremote gate→dispatch→watch→download→apply→materialize→final validationを進める。
- 標準フロー: `PLAN -> repo/remote mapping -> TASKS -> 実装 -> local validation -> HANDOFF/Actions -> promotion -> final validation -> REPORT`

## Definition of Done

- State A: batch infrastructure、contracts、local validationが完了し、Final Gateの25 blockedだけがEXPECTED FAILである。
- State B:同一Actions runから25/25 artifact/APKを取得し、source/profile/APK SHA全件一致、all-or-nothing promotion、status/materialization、Final Gate/verify PASSまで完了する。
- State C: push後の最新PR HEADにPhase 1/Native/Final required CI PASSを確認し、merge-readyを判定する。

## Risks / Unknowns

- partial captureのcanonical混入: `complete=true`と全expected/captured set一致を必須化し、invalid時はcanonicalを触らない。
- remoteに未pushのworkflowをdispatch: branch/head/workflow内容をAPIで再確認してからdispatchする。
- API34 runner failure: job/stepの最初の異常を記録し、原因修正が必要ならHANDOFF Aへ戻す。古いartifactを再利用しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

### 2026-08-15 05:03 JST

- GitHub APIでPR #24を確認し、HEAD=`c5082e4d78fe7c99b2e70cb09133f98cf21d7f0f`、対象branchが正しいことを確認した。
- remote workflowはsingle `capture_case_key`のみで、batch list/applyは未実装だったためSTATE Aと判定した。
- 既存の`promoteAndroidVisualCapture`、`materializeVisualReferences`、Maestro capture flowを再利用し、generic DSLを増やさない方針にした。
