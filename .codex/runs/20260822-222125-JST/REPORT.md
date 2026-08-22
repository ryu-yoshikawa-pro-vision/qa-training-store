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

## 2026-08-22 22:21 (JST)

- Summary: PR #45のレビュー／実CI failureをrepair-loopへ入力し、最小修正範囲を確定した。
- Completed:
  - `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、最近のADR、直近Run、`CODE_REVIEW.md`、repair-loop reference／skillを通読した。
  - PR #45のNative CI run `32573446886`と失敗ログを確認した。
- Changes: 変更はまだ行っていない。allowed filesは`.github/workflows/native-ci.yml`、`tests/contracts/native-ci-workflow.test.ts`、`docs/PROJECT_CONTEXT.md`、今回の`docs/history/`追記、およびRun Artifactに限定する。
- Commands:
  - `gh run view 32573446886 --log-failed` => Automation／Production Buildは成功。Guardは`tsx ... "--" ...`を実行し`Error: Unknown argument: --`で失敗。Runtimeはskipped。Native StaticはExpo Doctor mismatchでfailure。
  - `gh pr view 45 ...` => PRはopen、base=`main`、head=`fix/native-production-bundle-guard`。CodeRabbit recent reviewはactionable commentなし。
- Notes/Decisions:
  - must_fix: workflowのliteral `--`除去、正しいargv形のContract追加。
  - should_fix: 既存テストでCLI境界を簡単に固定できる場合のみ追加する。大規模分割はしない。
  - defer: PR #45以前からのExpo Doctor patch version mismatch。今回のdependency更新は`hermes-compiler`のみで、Expo一式は更新しない。
  - validator本体、Hermes decode方式、APK extraction、Guard後Runtime依存、Maestro negative assertion、aggregate fail-closeは変更しない。
- New tasks: なし。
- Remaining: 修正、local gates、Remote Native CI、living documentation更新。
- Progress: 33% (2/6)

## 2026-08-22 22:28 (JST)

- Summary: repair iteration 1の最小修正とlocal validationが完了した。
- Iteration:
  - iteration_number: 1
  - input_findings: `must_fix` = pnpm script invocationのliteral `--`、回帰Contract不足。`defer` = 既存Expo Doctor mismatch。
  - repair_plan: Workflowの一行を修正し、Production Bundle GuardのContractへ正／誤commandのexact assertionを追加する。validator本体と既存G1設計は変更しない。
  - allowed_files: `.github/workflows/native-ci.yml`, `tests/contracts/native-ci-workflow.test.ts`, `docs/PROJECT_CONTEXT.md`, `docs/history/`の今回追記、今回のRun Artifact。
  - changed_files: `.github/workflows/native-ci.yml`, `tests/contracts/native-ci-workflow.test.ts`。
  - validation_commands:
    - `pnpm exec vitest run tests/contracts/native-ci-workflow.test.ts tests/contracts/native-test-control-maestro.test.ts --no-file-parallelism --maxWorkers=1` => 2 files / 72 tests PASS。
    - `pnpm run validate:native-production-bundle` => 実Expo Android Hermes exportを生成し、Automation decoded marker 3件検出、Production decoded marker 0件でPASS。
    - `pnpm run validate:native-production-bundle --automation-bundle-path <production.hbc> --production-bundle-path <automation.hbc>` => exit 1、Automation marker不足でFAIL。
    - `pnpm run validate:native-production-bundle --automation-bundle-path <automation.hbc> --production-bundle-path <automation.hbc>` => exit 1、Production禁止marker検出でFAIL。
    - `pnpm run typecheck` => PASS。
    - `pnpm run lint` => exit 0、0 errors / 64 existing warnings。
    - `pnpm run format:check` => PASS。
    - `pnpm run lint:markdown` => PASS、0 issues。
    - `git diff --check` => PASS。
  - validation_result: local修正対象の全gate PASS。swapped controlは期待どおりFAIL。Standaloneは`hermesc -dump-bytecode`経由の実`.hbc`でPASS。
  - remaining_delta: 修正HeadのRemote Native CI未実行。PROJECT_CONTEXTのRemote状態はCI結果確定後に更新する。
  - decision: continue
- Changes: `.github/workflows/native-ci.yml`の`pnpm run validate:native-production-bundle -- "${validator_args[@]}"`を`pnpm run validate:native-production-bundle "${validator_args[@]}"`へ変更。Contract Testは正しいcommandを要求し、余分な`--`付きcommandを拒否する。
- Notes/Decisions:
  - validatorの`parseBundlePaths()`へ`--`受理処理は追加していない。
  - Hermes decode、APK candidate extraction、Production Guard依存、Maestro negative assertion、aggregate fail-closeは未変更。
  - Expo DoctorはPR #45以前からのpatch version mismatchであり、G1修正へ混ぜない。
- New tasks: Remote Native CIの実行・確認、Remote結果に応じたliving documentation更新。
- Remaining: `git commit`／通常push、PR #45 Native CI確認、Run Artifact sanitizer、完了判定。
- Progress: 67% (4/6)

## 2026-08-22 23:01 (JST)

- Summary: 修正HeadのRemote Native CIでActual APK由来のProduction Bundle GuardとGuard後Runtimeを確認した。
- Completed:
  - `git commit -m "fix: repair native bundle guard cli wiring"` => commit `8e52136`を作成。
  - `git push origin fix/native-production-bundle-guard` => 通常push成功。force push／rebase／amend／mergeは未実施。
  - Remote run `32575898683`を監視し、全jobの結論とstep-level stateを確認した。
- Remote Evidence:
  - `Android Automation Build` => success。Actual Automation APK artifactを生成。
  - `Android Production-validation Build` => success。Actual Production APK artifactを生成。
  - `Production Bundle Guard` job `97039927927` => success。
    - `native-android-apk-32575898683`と`native-android-production-apk-32575898683`をdownloadし、両方のartifact digestを検証。
    - APKから`unzip -Z1`で`assets/.*\\.(bundle|hbc)` candidateを列挙し、`unzip -p`でHBCを抽出。
    - `pnpm run validate:native-production-bundle "${validator_args[@]}"`を実行。ログにliteral `--`はなく、`Unknown argument: --`も発生していない。
    - `hermesc -dump-bytecode`を用いた共通validatorがAutomation decoded marker 3件を検出し、Production decoded marker 0件としてPASS。
  - `Android Runtime / Maestro` job `97039980115` => success。
    - Guard後にProduction APKをdownload／verify／`adb install -r`し、`native-production-validation`を`[Passed]`で完了。
    - Production APKのdownload／verify／install／Maestro stepがGuard success後に実行された。
  - iOS Automation／Production BuildとNative iOS CI Verify => success。
  - `native-ci / verify` job `97041617526` => failure。`STATIC_RESULT=failure`（Expo Doctor）、Production Guard／Android Build／Android Runtime／iOSはすべてsuccessを要求するfail-closeを確認。
- Expo Doctor Evidence:
  - Native Staticの`pnpm dlx expo-doctor@1.17.6`は16/17 checks passed、1 check failed。
  - `@expo/metro-runtime`、`expo-build-properties`、`expo-constants`、`expo-dev-client`、`expo-linking`、`expo-router`のpatch version mismatch。これはPR #45以前からの独立failureであり、今回のPRへExpo dependency updateは追加しない。
- Iteration:
  - iteration_number: 1
  - changed_files: `.github/workflows/native-ci.yml`, `tests/contracts/native-ci-workflow.test.ts`, `docs/PROJECT_CONTEXT.md`, `docs/history/2026-08-22_230145_g1-cli-connection-repair.md`, 今回Run Artifact。
  - validation_result: CLI接続修正、Focused／Standalone／swapped control、Actual APK Guard、Guard後Production Runtime／MaestroはPASS。aggregateは既存Expo Doctor failureをfail-closeに反映してFAIL。
  - remaining_delta: Expo Doctor／aggregateの別PR対応のみ。G1修正由来のNative CI failureは確認されていない。
  - decision: stop_success（G1 repair objective達成。既存Expo Doctor failureはdeferとして分離）。
- Changes: `docs/PROJECT_CONTEXT.md`をRemote実績とraw scan evidenceに合わせて更新し、`docs/history/2026-08-22_230145_g1-cli-connection-repair.md`へ今回の修正と結果を記録した。
- Remaining: Run Artifact sanitizer Write／Check、最終status確認、docs／run更新の通常commit／push。
- Progress: 100% (6/6)

## 2026-08-22 23:03 (JST)

- Summary: repair-loopの最終確認を完了した。G1 CLI接続修正はRemote Actual APK検査までPASSし、既存Expo Doctor failureはpartialの残差として明示した。
- Completed:
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260822-222125-JST -Write -Check` => 5 files scanned、0 changed、0 residual findings。
  - `pnpm run lint:markdown` => 306 files、0 issues。
  - `pnpm run format:check` => PASS。
  - `git diff --check` => PASS（Run manifestの改行warningのみ）。
  - `git status --short` => 変更は今回のWorkflow／Contract、PROJECT_CONTEXT／history、Run Artifactのみ。
- Decision: `stop_success`。レビュー対象のCLI接続failureは解消され、Contract、Standalone、swapped control、Actual APK Guard、Guard後Runtime／Maestroを実測PASSした。`native-ci / verify`のFAILはNative Static / Expo Doctorの既存patch mismatchだけであり、G1のfailureとは分類しない。
- Evaluation: `.codex/runs/20260822-222125-JST/evaluation.json`を`result=partial`、`primary_failure_category=flaky_or_env_issue`として保存した。partialはRemote aggregateが既存Expo Doctor failureをfail-closeで反映したためで、G1 task completionはpassと評価した。
- Remaining: G1 scope内の未完了事項なし。Expo dependency patch mismatchとaggregate green化は別PRで扱う。
- Progress: 100% (6/6)

## 2026-08-22 23:58 (JST)

- Summary: Previous Evidence Correctionとして、Remote Native CIのExpo Doctor実ログに合わせてパッケージ数と一覧の誤記を訂正した。
- Completed:
  - 実CIログを再確認し、mismatch対象は6件ではなく7パッケージであることを確認した。
  - 抜けていたパッケージ`expo`を特定した。
- Corrected Evidence:
  - 正しい対象一覧は`@expo/metro-runtime`、`expo`、`expo-build-properties`、`expo-constants`、`expo-dev-client`、`expo-linking`、`expo-router`。
  - 実ログの表現は`7 packages out of date.`。
- Scope/Decision:
  - この追記はEvidence記録のみの訂正であり、G1 implementation／validation resultに変更はない。
  - Production Bundle Guard、Actual APK Hermes inspection、Android Runtime／Maestroは引き続きPASSとして保持する。
  - Expo dependency updateは今回のPRへ追加せず、別PR対象として維持する。
- Changes: 既存の過去記録は変更せず、この訂正エントリをREPORT末尾へappend-onlyで追加した。
- Remaining: なし。
- Progress: 100% (5/5)
