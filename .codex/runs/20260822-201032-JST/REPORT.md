# Report (append-only)

- 行動のたびに追記する（調査/編集/判断も含む）
- コマンドや確認結果は必ず記録する

## Evidence Record (optional)

- Record ID:
- Round:
- Query:
- Source:
- Supports/Refutes:
- Confidence:
- Decision:
- Rationale:
- Open Issues:
- Next Action:

## YYYY-MM-DD HH:MM (JST)

- Summary:
- Completed:
- Changes:
- Commands:
  - `...` => result
- Notes/Decisions:
- New tasks:
- Remaining:
- Progress: NN% (done/total)

## Deletion candidates

- Codex はファイルやディレクトリを削除しない。
- 不要に見えるファイルは、ユーザーが手動確認できるようにここへ記録する。

| Path | Reason | Suggested action |
|---|---|---|
|  |  |  |

## 2026-08-22 21:15 (JST)

- Summary: G1の必須文書、最新main、Production artifact経路、Standalone／WorkflowのRoot Causeを確認した。
- Completed: `HEAD == origin/main`を確認し、G1専用計画を`docs/plans/`へ保存した。実Expo Hermes exportをAutomation／Productionで生成し、`hermesc -dump-bytecode`でAutomation marker 3件／Production marker 0件を確認した。
- Changes: Product／CI sourceは未変更。Run ArtifactとG1専用計画のみ追加した。
- Commands:
  - `git fetch origin main` => `HEAD == origin/main == a3a58ae4b4168c34307e6dd0f2d21c039a972fab`
  - `pnpm install --frozen-lockfile --ignore-scripts` => PASS
  - `pnpm run validate:native-production-bundle`（baseline）=> PASS（現環境ではraw scanが見える出力だったため、Hermes disassemblyで方式を追加確認）
  - `hermesc -dump-bytecode` on Automation HBC => marker 3件検出
  - `hermesc -dump-bytecode` on Production HBC => 禁止marker 0件
  - `scripts/native/windows/android-local.ps1 -Action Doctor` => PASS（実機 API 30 / arm ABI / Maestro 2.8.0）
  - `scripts/native/windows/android-local.ps1 -Action Prepare`（`CI=true`、別Alias）=> PASS
  - Production `:app:assembleRelease` => FAIL（最初の異常: `react-native-reanimated` CMake/Ninja `build.ninja still dirty after 100 tries`。詳細は`.artifacts/native-local/20260822-211000-production-apk-build/assemble-production-release.log`）
- Notes/Decisions: Hermes compilerのdisassemblyをinspection正本とし、`--no-bytecode` projectionはEvidenceに採用しない。WorkflowはActual APKからHBCを抽出して同じvalidatorを呼ぶ設計にする。既存の別Repository Junctionは上書きせず、検証専用Aliasを使用した。
- New tasks: D1 Actual Gradle APK再現時のHBC確認、D2変更後Remote Native CI artifact確認。
- Remaining: Validator／Workflow／Contract／Maestroの実装とfocused validation。
- Progress: 13% (1/8)

## 2026-08-22 21:17 (JST)

- Summary: G1のStandalone validator、Actual APK artifact由来のNative CI Guard、Production-validation Maestro contractを実装し、実Production Hermes exportで判定を確認した。
- Completed:
  - `scripts/validate-native-production-bundle.ts`を、固定`hermes-compiler`の`hermesc -dump-bytecode`で全`.hbc`をdecodeするfail-close inspectorへ変更した。`--automation-bundle-path`／`--production-bundle-path`で外部artifactを受け取れる。
  - `.github/workflows/native-ci.yml`の`production-bundle-guard`を両Android Release APKの後段へ移し、両artifactをdownload・candidate asset展開して同じvalidatorへ渡すようにした。Build／Runtimeのraw marker scanは削除し、bundle存在確認だけを維持した。
  - `maestro/native-production-validation.yaml`に`Native contract passed`の不在assertionを追加し、Guard success後のProduction APK install／MaestroをContractで固定した。
  - `hermes-compiler`をpackage／lockへ固定versionで明示した。Product behavior、G3／G4 Product変更、Generic inspection framework、retry／timeout増加は追加していない。
- Commands / Evidence:
  - `pnpm install --frozen-lockfile --ignore-scripts` => PASS。lockfileは変更されず、`hermes-compiler 250829098.0.16`を解決した。
  - `pnpm run validate:native-production-bundle` => PASS。実Expo Android exportのAutomation／Production `.hbc`（各7.4MB）を生成し、Hermes disassemblyでAutomation marker 3件、Production marker 0件を確認した。
  - Explicit artifact validator => PASS。既存Actual Production Hermes exportの`.hbc` pathをCLIへ渡し、Automation／Productionを同一検査経路で確認した。
  - Swapped controls => 期待どおり両方FAIL（exit 1）。Production artifactをAutomation入力にした場合は3 marker不足、Automation artifactをProduction入力にした場合は3 marker検出でfail-closeした。
  - `pnpm exec vitest run tests/contracts/native-ci-workflow.test.ts tests/contracts/native-test-control-maestro.test.ts --no-file-parallelism --maxWorkers=1` => PASS（2 files、72 tests）。
  - `pnpm run typecheck` => PASS（app／native-tests／training）。
  - `pnpm run lint` => exit 0（0 errors、既存warning 64件）。
  - `pnpm run format:check` => PASS。`pnpm run lint:markdown` => PASS（0 issues）。
  - `node -e` YAML parse => PASS。`production-bundle-guard`のneedsはdetect／両Android build、Runtimeのneedsはguardを含む。
  - `rg` marker／`grep -aE` check => Native workflow内にraw marker literalおよびmarker scanは残っていない。
- Notes / Decisions:
  - Actual APKのLocal `assembleRelease`は先行Preflight後、`react-native-reanimated`のCMake/Ninja `build.ninja still dirty after 100 tries`で停止した。同じ条件の再試行は行わず、Local APK／MaestroをPASS扱いしない。
  - `pnpm run test:contracts`は398/398 testsまで通過したが、既存`serve-web-dist.test.ts`のWindows Temp cleanup hookがEPERMでcommand exit 1になった。変更対象外のcleanup環境事象として記録し、同test単独を一度だけ実行して23/23 PASSを確認した。
  - 修正HeadのRemote Native CI／`native-ci / verify`はdispatchしていないため、Remote APK artifact／Maestro evidenceは未取得のままとする。
- Remaining: Run Artifactのevaluation／sanitizer、最終差分確認、normal commit／push判断。
- Progress: 83% (5/6)

## 2026-08-22 21:22 (JST)

- Summary: 最終品質確認とRun Artifactの形式／秘匿情報チェックを完了した。
- Completed:
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260822-201032-JST -Write -Check` => PASS（5 files、0 changes、0 residual findings）。
  - Run `run.json`／`evaluation.json` => valid JSON。`git diff --check` => PASS。
  - `pnpm run format:check` => PASS。`pnpm run lint:markdown` => PASS（305 files、0 issues）。
  - Workflow YAML parse => PASS。Native workflow raw marker／`grep -aE` check => none。
- Notes / Decisions: B2（Local APK／Maestro）とB3（Remote Native CI）は外部実行条件のためBlockedとして保持する。G1の実装DoDはStandalone Actual Production Hermes outputとWorkflow／contract接続で判定可能な状態になった。
- Remaining: 最終差分確認後のnormal commit／push。Push後もPR作成／mergeは行わない。
- Progress: 83% (5/6)

## 2026-08-22 21:23 (JST)

- Summary: 指定branchへの通常commit／pushを完了した。
- Completed:
  - `git commit -m "fix: inspect native production Hermes artifacts"` => PASS。commit `5ea9382ace563d07ec8f7ce36eea788f3815671f`。
  - `git push origin fix/native-production-bundle-guard` => PASS。remote branchへ通常pushした。
  - Push前後のworking treeはclean。`origin/main`は`a3a58ae4b4168c34307e6dd0f2d21c039a972fab`のままで、G1 branchは最新mainからの変更だけを含む。
- Notes / Decisions: PRは作成せず、merge／force push／rebase／amendは行っていない。B2／B3（Local APK／Remote Native CI）は未実行境界として保持する。
- Remaining: なし（G1 implementation scope）。Remote Native CI／Maestroの実Runは別途実行者が必要。
- Progress: 100% (6/6)
