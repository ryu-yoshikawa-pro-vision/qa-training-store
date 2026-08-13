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
- 未回答の重要質問: 最終commit SHAとremote Training Copy / Required CIはGit mutation禁止のため、このRunでは確定できない。

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
- commit / remote前提のGateはblockerとして分離される。

## Approach

- `workflow-contract.ts`をTrust Boundaryの共有validatorとし、Training Copy validatorとCurriculum validatorから再利用する。
- Workbook validatorは既存Normative parser utilityを利用し、CSV parserだけを局所実装する。
- Androidはmarker確認後、Training helperのDoctor / Prepare / Start、Automation Release Build、APK検査、Install、Smoke、Training baseline、Evidence、Stopの順で実行する。Formal Maestroは実行しない。
- 変更後の全sourceに対し、format / markdown / spec / curriculum / lint / typecheck / contracts / test / verify / Training Webを再実行する。

## Definition of Done

- P0順序、Trust Boundary、checksum、Workbook参照整合性、Android fail-close、stale Evidence、教材整合、CRLF、contract test依存整理が実装される。
- `pnpm run verify`、Training Web desktop/mobile/expected-failure、Training Android baseline、local contract / typecheckがPASSする。
- Visual marker、Android cleanup、iOS Build-only、Formal / Training境界を記録する。
- exact-SHA Training Copy、final committed PR HEAD、remote Required CI / Delivery Readiness、Fresh Learner full journeyが未完了なら100%扱いしない。

## Risks / Unknowns

- Windows Android Buildはrepository実体Pathが長く、短縮Junction + short virtual storeが必要になる可能性がある。別worktreeを指す既存aliasは使用しない。
- markerがrelease済みでもAPI34 x86_64 AVDが不足する可能性がある。SDK不足時はRunbookどおり導入し、失敗時は後続工程を止める。
- remote exact-SHA Gateはcommit/push禁止と外部GitHub実行に依存する。

## Thinking Log

- 2026-08-13 09:34 JST: strict active Runを作成し、PR #25のreview repairとして開始した。
- 2026-08-13 13:09 JST: lockfileをHEAD blobから完全復元し、`yaml` importer 3行だけを追加した。依存追加による15k行級の不要差分を残さない。
- 2026-08-13 13:15 JST: format / markdown / spec / curriculum / lint / typecheck、全contracts、Training Web 3モードを確認した。
- 2026-08-13 13:21 JST: markerはstatus=blockedだがrelease=true / next=true。Training Doctorはemulator不足でfail-closeしたため、SDK componentを導入して再確認した。
- 2026-08-13 13:40 JST: Training helperのscalar配列問題を修正。長いrepository PathによるCMake failureを確認し、current worktree専用 `<REPO_ROOT>` と `<PNPM_VIRTUAL_STORE>` のshort virtual storeで再生成した。
- 2026-08-13 13:56 JST: Gradle log上でx86_64 Release APK Build成功を確認。外側timeoutとGradle成功を分離し、APK bundle / ABIを検査した。
- 2026-08-13 14:18 JST: Training Maestro baseline 1/1、Evidence、cleanup、full test、verify、Training Web 3モードをPASSした。
