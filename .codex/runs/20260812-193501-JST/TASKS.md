# Tasks

## Now

- [x] 1. Wave 0: Start Gate、Current Spec/BR/AC/Validator、Web E2E、Maestro、Native CI、ADR、Curriculum、branch/diff/envを確認する（Planning PR #18のremote状態も確認済み）
- [x] 2. Wave 1: 22文書契約、Competency Rubric、Instructor Reference、Training architectureを確定する
- [x] 3. Wave 2: Workbook CSV 4件とSpecification traceabilityを実装する
- [x] 4. Wave 3: Training Playwright config、Projects、baseline/exercises/failure-exercises、Training typecheckを実装する
- [x] 5. Wave 4: Training Maestro、Android helper、baseline、Formal isolationを実装する（Android Training baseline／EvidenceまでPASS）
- [x] 6. Wave 5: Training Copy scripts、Workflow templates、allowlist、least-privilege contractを実装する（uncommitted final SHAによる実Copy PASSは保留）
- [x] 7. Wave 6: Part 1全9文書をCurrent Specと実在Training pathへ再baselineする
- [x] 8. Wave 7: Part 2全8文書をTraining CI、Formal CI、Android/iOS guaranteeへ再baselineする
- [x] 9. Wave 8: Setup、Recovery、Instructor/Rubric詳細、Learner navigationを完成する
- [x] 10. Wave 9: Curriculum validator、Package/tsconfig/verify、Phase 1 Web smoke、Native smoke、change detection、contract testを接続する
- [ ] 11. Wave 10: Fresh Learner、Web desktop/mobile、expected-failure、Android Training、local Delivery Readiness、Final reviewを実行する（Web／Android／review／全体testは実施済み、final SHA／remote Delivery Readiness保留）
- [ ] 12. 最終Evidence、Run manifest/evaluation、Sanitizer Write/Check、REPORT、scope auditを確定する

## Discovered

- Windows checkoutの全体Prettier baselineは今回の差分外（先行確認387ファイル、最新確認386ファイル）。変更対象59ファイルはPrettier-compatible check PASS。
- 初回の全体 `pnpm run test` はNative componentの単発timeoutで停止したが、Native component単体再実行と最終全体testはPASS。
- 先行の全体 `pnpm run test` はunit 66 / integration 98 / repository 33 / component 123後、Windows `serve-web-dist` temp cleanupのEPERMで停止したが、該当contract単独22/22と最終全体testはPASS。
- `training:copy:validate`の成功には、最終候補をcommitしたfull SHAが必要。現worktreeは未commitでGit mutation禁止のため、実Copy Deliveryは保留。
- Planning PR #18はclosed / merged済み。今回のImplementation branch用remote PR・Required CI Runは未作成／未実行。
- Android local Trainingはrelease marker取得後にDoctor、Prepare、arm64-v8a Release APK、Install、Smoke、Training Maestro baseline、Evidence、runtime cleanupまでPASSした。Formal Native Flowは実行していない。
- 最新のbounded local validationでは`pnpm run test`がunit 66、integration 98、repository 33、component 123、contract 204を含めてPASSした。単独`serve-web-dist` 22/22もPASSし、先行実行のWindows EPERM／Native timeoutは再現しなかった。
- 変更対象59ファイルのPrettier checkはPASS。ユーザー承認後にrepo-wide Prettier整形を実施し、全体`format:check`と`pnpm run verify`もPASSした。

## Blocked

- Final Delivery Readinessは、最終候補のcommit full SHA、Implementation PR、remote Required CI、Training Copy 3 Runが必要。Git mutation / push禁止のため、このthreadでは未完了として扱う。
- 全体 `format:check` / `pnpm run verify`はrepo-wide Prettier整形後にPASSした。残るBlockedはfinal exact-SHA、remote Required CI、Delivery Readinessのみ。
