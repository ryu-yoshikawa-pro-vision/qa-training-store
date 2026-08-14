# Plan

## Objective

PR #25のレビュー指摘と追加レビュー結果を、Current Normative Specification、Repository契約、Plan #18へ照合して修正する。P0 Native CI順序、Training Copy Trust Boundary、Workbook Traceability、Windows Android runbook、Expected Failure Evidence、教材整合性を閉じ、ローカルで実行可能な品質Gateを再確認する。

## Scope

- In: Curriculum / Training assets、Training validator、Workbook validator、Training GitHub Actions template、Required Native CIのTraining接続、Contract tests、Run Artifact。
- Out: Product Business Logic、Formal Regression期待値、iOS Runtime保証、Visual / Official E2E worktree、main worktree、Git mutation、remote Delivery Readiness。

## Assumptions

- `docs/spec/`のNormative Specificationを教材Oracleとし、既存教材やUIからExpected Behaviorを再推測しない。
- Androidは `$env:QA_STORE_COORD_DIR\visual-android-released.json` のrelease markerを正本とする。今回のmarkerは `android_runtime_released=true` / `next_agent_can_use_android=true` なので、statusがblockedでも独立検証可能と判断する。
- Android guaranteeはBuild + Runtime E2E、iOS guaranteeはBuild-onlyのまま維持する。
- Current canonical `.codex/templates/RUN_MANIFEST.json` に `scope` はないため、CodeRabbitのscope指摘だけを根拠にschemaを拡張しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Review要求、Plan、Repository契約、markerにより実行範囲を確定できる。
- 仮定してよい細部: YAML構造parseには既存依存にない最小の `yaml` direct devDependencyを追加する。任意shellの意味解析器は作らない。
- 未回答の重要質問: なし。Owner Decisionによりremote Training Copy Delivery、Final Candidate SHA、SHA equality、Final Delivery RecordはPR #25のRequired DoD / Merge Gateから外し、Future operational validation / optional instructor validationへdeferする。Current PR HEADのRequired CIと既存Local / CI baselineを、今回のDoD判定対象とする。

## Hypotheses

- H1: Native Training baselineをProduction APK切替前へ移動し、Automation APKのinstall成功とMaestro CLI成功を要求すれば、同一package ID上書きによるTraining Control欠落を防げる。
- H2: YAMLを構造parseして `jobs.*.steps[].uses/run` をallowlist検査すれば、named `uses`、multiline `run`、bracket secrets表現の漏れをfail-closeできる。
- H3: WorkbookのRFC 4180相当parse、Normative BR/AC存在確認、4 CSV間参照検証をまとめれば、表面的なregex PASSをTraceability Integrityへ引き上げられる。

## Research Plan

1. Review comments、Current validator、Workflow、Normative Specification、ADR、Curriculum、既存Runを照合する。
2. P0から修正し、関連fixture / contractを追加する。
3. 静的Gate、full test、Web、Android marker後のTraining baseline、cleanup、Run Artifact sanitizerを実行する。

Exit Criteria:

- 各主要findingにvalid / invalid判断と根拠がある。
- ローカルで実行可能なGateは未実行をPASS扱いせず記録される。
- commit / remote前提の任意運用GateはRequired blockerとして扱わず、Required DoDとの差分として明示される。

## Approach

- `workflow-contract.ts`をTrust Boundaryの共有validatorとし、Training Copy validatorとCurriculum validatorから再利用する。
- Workbook validatorは既存Normative parser utilityを利用し、CSV parserだけを局所実装する。
- Androidはmarker確認後、Training helperのDoctor / Prepare / Start、Automation Release Build、APK検査、Install、Smoke、Training baseline、Evidence、Stopの順で実行する。Formal Maestroは実行しない。
- 変更後の全sourceに対し、format / markdown / spec / curriculum / lint / typecheck / contracts / test / verify / Training Webを再実行する。

## Definition of Done

- P0順序、Trust Boundary、checksum、Workbook参照整合性、Android fail-close、stale Evidence、教材整合、CRLF、contract test依存整理が実装される。
- `pnpm run verify`、Training Web desktop/mobile/expected-failure、Training Android baseline、local contract / typecheckがPASSする。
- Visual marker、Android cleanup、iOS Build-only、Formal / Training境界を記録する。
- Required Curriculum / Workbook・Training assets / Formal・Training境界 / Curriculum validator / Training Playwright desktop・mobile / learner exercise / expected-failure lifecycle / Windows Local Physical Android Training Maestro baseline / GitHub Native CI API34 Emulator Training baseline / `pnpm run verify` / Current PR HEAD Required CI / Critical・High Source finding解消が完了条件である。Training Copyのprepare / validateはRequired Assetとして維持する。remote Training Copy publish・3 runs・FINAL_CANDIDATE_SHA・SHA equality・Final Delivery Recordは任意の将来運用であり、未実施でも100%判定を妨げない。

## Risks / Unknowns

- Windows Android Buildはrepository実体Pathが長く、短縮Junction + short virtual storeが必要になる可能性がある。別worktreeを指す既存aliasは使用しない。
- markerがrelease済みでもAPI34 x86_64 AVDが不足する可能性がある。SDK不足時はRunbookどおり導入し、失敗時は後続工程を止める。
- remote Training Copyのexact-SHA Deliveryは将来任意の運用検証であり、今回のRequired DoDやMerge blockerではない。Current PR HEADのRequired CIはユーザーのcommit / push後に確認する。

## Thinking Log

- 2026-08-13 09:34 JST: strict active Runを作成し、PR #25のreview repairとして開始した。
- 2026-08-13 13:09 JST: lockfileをHEAD blobから完全復元し、`yaml` importer 3行だけを追加した。依存追加による15k行級の不要差分を残さない。
- 2026-08-13 13:15 JST: format / markdown / spec / curriculum / lint / typecheck、全contracts、Training Web 3モードを確認した。
- 2026-08-13 13:21 JST: markerはstatus=blockedだがrelease=true / next=true。Training Doctorはemulator不足でfail-closeしたため、SDK componentを導入して再確認した。
- 2026-08-13 13:40 JST: Training helperのscalar配列問題を修正。長いrepository PathによるCMake failureを確認し、current worktree専用 `<REPO_ROOT>` と `<PNPM_VIRTUAL_STORE>` のshort virtual storeで再生成した。
- 2026-08-13 13:56 JST: Gradle log上でx86_64 Release APK Build成功を確認。外側timeoutとGradle成功を分離し、APK bundle / ABIを検査した。
- 2026-08-13 14:18 JST: Training Maestro baseline 1/1、Evidence、cleanup、full test、verify、Training Web 3モードをPASSした。
- 2026-08-13 16:59 JST: 追加レビュー修正では、既存P0順序を再設計せず、YAML構造の`runs-on` / checkout `persist-credentials`、alternate package execution、remote script pipeを共有Trust Boundaryへ追加した。Current Training Workflowはnegative fixtureを含めてPASSした。
- 2026-08-13 16:59 JST: Learner Exercise用Mobile entrypointをBaseline entrypointから分離し、教材・Curriculum validator・contractへ接続した。Maestro runnerはpure invocation helperへ分離し、main-module判定によるsilent-success経路を除去した。CSV BOM許容とsdkmanager教材fallbackも追加した。
- 2026-08-13 16:59 JST: CodeRabbitのAction SHA pinning提案はRepository全体のSupply Chain Policy変更となるため不採用。`scope` / `scope_ref`追加も、PLAN.mdのScopeがStrict要件を満たしcanonical RUN_MANIFEST schemaにfieldがないため不採用。PR #25の7c442d3でのPhase 1 / Native CI成功は修正前Evidenceとして記録するが、今回のSource変更後はFinal Candidateへ流用しない。
- 2026-08-13 16:59 JST: Subagentは使用しなかった。Native delegation markerとrepair scopeを照合し、親Agentでレビュー照合・最小実装・validation・最終判断を完結できたため、調査結果の分散を避けた。
- 2026-08-13 16:59 JST: 変更後の静的Gate、focused / full contracts、full test、verify、Training Web desktop / mobile baseline / learner exercise / expected-failure、Android Training baseline 1/1とcleanupを確認した。Android Build invocationは外側timeoutとGradle `BUILD SUCCESSFUL`を分離し、既存APKの独立検査後に後続へ進めた。
- 2026-08-13 18:33 JST: 最終review repairのallowed scopeを、教材sdkmanager fallback、`scripts/validate-curriculum.ts`の非null assertion、active Runのcurrent PR / CI同期の3件へ限定した。既修正Native順序、Trust Boundary、Mobile Exercise、Maestro runner、CSV BOMは再設計しない。
- 2026-08-13 18:33 JST: PR #25のcurrent HEAD `50021adbfca10c7a8db3bcf7f9395c4203d59be8`とGitHub上のPhase 1 CI / Native CI successをread-onlyで確認した。今回の2 Source変更は未コミットなので、50021adのCI Evidenceを今回修正後のFinal Candidateへ流用しない。
- 2026-08-13 18:33 JST: 教材fallbackをhelperと同じ`Sort-Object FullName`→最後のcandidate選択へ修正し、選択Pathを出力。`specReferences.get(specRef)!`は`undefined`をfailするRuntime checkへ置換した。format、markdown、curriculum、typecheck、focused contract、verifyはPASS。
- 2026-08-13 19:56 JST: goal5の最終Source repairでは、教材側の既修正実装を再変更せず、`validate:curriculum`へfallback選択規則の3 token（sort、最後のcandidate、選択Path出力）を回帰Contractとして追加した。TASKS / run.json / evaluation.jsonは、6ef3f6cの既存CI成功を履歴として保持しつつ、今回修正後のFINAL_CANDIDATE_SHA未固定をcurrent stateへ同期する。Source repair後はcommit / post-repair CI / Fresh Learner / exact-SHA Deliveryを次工程へ残す。

## Owner Decision（2026-08-14）

- PR #25のRequired Definition of Doneを、Curriculum / Workbook・Training assets / Formal・Training境界 / validator / Training Web desktop・mobile / learner exercise / expected-failure lifecycle / Windows Local Physical Android Training Maestro baseline / GitHub Native CI API34 Emulator Training baseline / `pnpm run verify` / Current PR HEAD Required CI / Critical・High Source finding解消へ再定義した。
- Instructor管理remote Training Copyの作成・publish、remote Web / Android / expected-failureの3 runs、`FINAL_CANDIDATE_SHA` freeze、PR HEADとTraining Copy resolved SHAのequality、Final Delivery Recordは、Future operational validation / optional instructor validationへdeferする。これらは今回のTask、Progress分母、DoD、Merge blockerに含めない。
- 既存のTraining Copy prepare / validateは安全な教材Copyを作成・検証するRequired Assetとして維持する。Local Physical AndroidとGitHub Native CI Emulatorの責務分離、既存Source implementation、過去REPORT履歴は変更しない。
- Task 14はDeferredとしてRequired Progressの分母から除外し、Required task 20件が完了しているためProgressは`100% (20/20)`とする。Current PR HEAD `86ee40a23a18a5c7bb1b9917be626c598fb46103`のPhase 1 CI #202 / Native CI #144はこのOwner Decision前の既存commitでsuccessだが、今回のArtifact変更後のCIとしては扱わず、ユーザーのcommit / push後に新HEADで再確認する。

## 最終repair計画（2026-08-15）

### 対象と仮説

- P1-1: Current PR HEAD `422d4c39bb764ec18752554dbb75115940e5123e`のNative CI failureは、Expo SDK 57の7つのpatch依存と`expo-constants` overrideの不整合が原因で、Native RuntimeのFailureではない。
- P1-2: 統合Planに残るFinal Delivery / final HEAD / Delivery Sourceの必須表現をOptional / Future operational validationへ同期すれば、ADR-0013とRequired DoDの矛盾が解消する。
- Run Artifact: 過去の完了TaskとREPORT履歴を保持したまま、Task 22〜24で今回のrepair結果とpost-repair exact-head CI pendingを追跡する。

### Allowed scope

- `package.json`
- `pnpm-lock.yaml`
- `docs/plans/2026-08-10_141200_test-automation-curriculum-remediation.md`
- `.codex/runs/20260813-093427-JST/{PLAN,TASKS,REPORT,run.json,evaluation.json}`

Windows Local Physical Android、GitHub Native CI API34 Emulator、iOS Build-only、既存Training implementation、Training Copy prepare / validate、過去Run / historyは変更しない。Final Delivery remote validationは今回開始しない。

### Repair-loop decision

Expo dependency patch alignment、Plan stale contract cleanup、Run Artifact reconciliationの3 taskを完了後に、local quality gateを実行する。新exact-head Phase 1 / Native CIはユーザーのcommit / push後に確認するため、今回のlocal repairではPASSへ繰り上げない。
