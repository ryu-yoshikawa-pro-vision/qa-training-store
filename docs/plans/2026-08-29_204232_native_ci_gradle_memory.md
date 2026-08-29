# Android Native CI Gradle メモリ不足解消プラン

## 0. 依頼概要

- 依頼内容: PR #82 の Mobile App CI で再現している Android Automation Build の Gradle/D8 メモリ不足を、依存更新PRとは分離した別PRで解消する。
- 背景:
  - PR #82 の `Android Automation Build` は `:app:mergeExtDexRelease` 実行中に `D8: java.lang.OutOfMemoryError: Java heap space` で失敗した。
  - 失敗ログでは Gradle Daemon が `max heap space: 2 GiB`、`max metaspace: 512 MiB` と報告し、メモリ設定不足を警告している。
  - `Android Production-validation Build` は同じ実行で完走したが、同じ 2 GiB / 512 MiB の不足警告が出ている。
  - PR #82 の Expo dependency update は Expo Doctor を通過しており、今回の直接の失敗箇所は dependency resolution ではなく Android Release APK の DEX merge である。
- 期待成果: 2つのAndroid Release buildへ限定的にGradle JVMメモリ上限を引き上げ、既存build契約を変えずに設定変更できることをPR #83で確認し、元のOOM発生条件での解消確認はPR #82のFollow-upで行う。

## 1. ゴール / 完了条件

- ゴール: Android Native CI の Release APK build で発生している Gradle/D8 JVMメモリ不足に対して、CI build commandの最小変更でメモリ上限を引き上げる。
- 完了条件（PR #83 のDoD）:
  - `.github/workflows/native-ci.yml` の `Android Automation Build` と `Android Production-validation Build` の `./gradlew :app:assembleRelease` に同一の `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` を追加する。
  - `-PreactNativeArchitectures=x86_64`、`--build-cache`、`--parallel`、`--stacktrace`、既存ログ保存、APK検証、artifact uploadの契約は変更しない。
  - `tests/contracts/native-ci-workflow.test.ts` で、両jobのGradle commandに `./gradlew :app:assembleRelease` → JVM memory設定 → `-PreactNativeArchitectures=x86_64` の順で同一設定が存在することを既存テスト内で固定する。
  - dependency、Native app source、iOS CI、runner class、Gradle worker数、cache戦略へ変更を広げない。
  - Repository標準validationがPASSする。
  - PR #83 の `Android Automation Build` と `Android Production-validation Build` がPASSし、新しいJVM memory設定によるbuild regressionがない。
  - 実装差分がWorkflow、既存contract test、Plan / Run Artifactの必要範囲に限定されている。

## 2. 現状理解と前提

- Current understanding:
  - `.github/workflows/native-ci.yml` には `android-automation-build` と `android-production-build` があり、どちらも `expo prebuild --platform android --no-install` 後に `./gradlew :app:assembleRelease` を実行する。
  - 両jobは現在 `-PreactNativeArchitectures=x86_64 --build-cache --parallel --stacktrace` を使用している。
  - Repositoryのmainには `android/gradle.properties` がなく、Android projectはCI中のExpo prebuildで生成されるため、今回 `android/gradle.properties` は追加しない。
  - `tests/contracts/native-ci-workflow.test.ts` は2つのAndroid buildの独立性、実行順、Gradle invocation等を既に文字列契約として検証しており、`expectInOrder()` helperも既存で使用できる。
  - Automation buildの直接原因はD8実行中のJVM heap不足であり、Production-validationでも同じメモリ不足警告が観測されている。
- Assumptions:
  - `-Xmx4g -XX:MaxMetaspaceSize=1g` は、現行の2 GiB / 512 MiBから安全側へ引き上げる最初の限定的な設定として適用し、妥当性はCI実測で確認する。
  - 4 GiB / 1 GiBでOOMが再発した場合は、このPRで `--parallel` 削除、worker制限、runner変更へ自動的に範囲を広げず、追加ログを基に再判断する。
- Non-goals:
  - PR #82 の `package.json` / `pnpm-lock.yaml` を取り込むこと。
  - Expo / React Native / その他dependency versionを変更すること。
  - `--parallel` の削除、`org.gradle.workers.max` の追加、Gradle cache戦略変更、runner大型化を同時に行うこと。
  - `android/gradle.properties` をRepositoryへ追加すること。
  - Native app source、Expo config、Android build.gradle、iOS CIを変更すること。
  - CI全体の高速化、リファクタリング、重複除去を行うこと。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。失敗ログ、変更対象、成功条件は今回の局所修正を決めるのに十分確認できている。
- 仮定してよい細部:
  - JVM args用の共通env / helperは作らず、2つのGradle invocationへ同じ値を直接記載する。
  - contract testは既存の `keeps Android automation and production builds independent and self-contained` テスト内で既存 `expectInOrder()` を再利用し、新しいtest helperやYAML parserは追加しない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Android Automation Release APK build
  - Android Production-validation Release APK build
  - Native CI workflow contract test
- Files to inspect / change:
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
- Scope確認のみ:
  - `package.json`
  - `pnpm-lock.yaml`
  - PR #82 の対象CIログ

## 5. 変更方針

- Change strategy:
  1. `Build Automation Release APK` のGradle commandを次の形にする。

```bash
./gradlew :app:assembleRelease \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g" \
  -PreactNativeArchitectures=x86_64 \
  --build-cache \
  --parallel \
  --stacktrace \
  2>&1 | tee "$RUNNER_TEMP/gradle-assemble-release.log"
```

  2. `Build Production-validation Release APK` も同じJVM argsを使用する。tee先は既存の `gradle-assemble-production-release.log` を維持する。
  3. architecture、build cache、parallel、stacktrace、evidence保存、APK生成・検証・uploadは変更しない。
  4. `tests/contracts/native-ci-workflow.test.ts` の既存Android build契約テストで、Automation / Production-validationそれぞれについて `expectInOrder()` を使い、`./gradlew :app:assembleRelease` → `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` → `-PreactNativeArchitectures=x86_64` の順を固定する。
  5. 4 GiB / 1 GiB適用後も同種OOMが再発した場合は、このPRで追加チューニングを続けず停止してログを再分析する。

- 実行タスク:
  - [ ] 1. 2つのAndroid Release build commandへ同一JVM argsを追加する。
  - [ ] 2. 既存contract testで `expectInOrder()` を再利用し、2jobのGradle command内でJVM argsの配置順を固定する。
  - [ ] 3. 対象外ファイルに差分がないことを確認する。
  - [ ] 4. Repository標準validationを実行する。
  - [ ] 5. PR #83 のAndroid Automation / Production-validation build結果を確認し、JVM memory設定導入によるbuild regressionがないことを確認する。

## 6. 検証方法

- Validation plan:
  - 静的・契約検証:
    - `pnpm run format:check`
    - `pnpm run lint`
    - `pnpm run typecheck`
    - `pnpm run test:contracts`
    - `pnpm run lint:markdown`
    - `git diff --check`
  - scope確認:
    - 実装差分が原則 `.github/workflows/native-ci.yml` と `tests/contracts/native-ci-workflow.test.ts` に限定されていることを確認する。
    - Plan / Run ArtifactはRepository運用上の成果物として許容する。
    - `package.json`、`pnpm-lock.yaml`、Native source、iOS workflowに差分がないことを確認する。
  - PR #83 CI確認:
    - `Android Automation Build` が完了すること。
    - `Android Production-validation Build` が完了すること。
    - 既存APK verification / artifact upload / bundle guardの契約が維持されること。
    - PR #83上でOOMが出ないことは確認するが、それだけでPR #82の元failure条件での解消を証明したとは扱わない。
    - #82未mergeによる既知のExpo dependency mismatchが別jobに残る場合は、今回のmemory fixの成否と混同しない。
- 成功判定:
  - `Android Automation Build` と `Android Production-validation Build` がPASSする。
  - 2jobのGradle commandに同一の4 GiB heap / 1 GiB metaspace設定が、`assembleRelease` とarchitecture指定の間に存在する。
  - 新しいJVM memory設定によるbuild regressionがない。
  - 既存build / artifact契約と対象外ファイルを変更していない。

## 7. リスクと停止条件

- Risks:
  - 4 GiB / 1 GiBでもD8 OOMが再発する可能性がある。
  - main起点のPR #83では、#82が未mergeの間は既知のExpo dependency mismatchが別jobに残る可能性がある。
- Stop conditions:
  - 4 GiB / 1 GiB適用後も同じOOMが再発した場合、`--parallel`削除、worker制限、runner変更へ連鎖的に進まない。
  - 新しいfailureが発生した場合、原因を確認せず追加設定を重ねない。
  - 変更にdependency / Native source / iOS CI等の対象外修正が必要になった場合は、このPRの実装を停止して別判断に戻す。
- Open questions:
  - なし。追加Gradle tuningの要否は4 GiB / 1 GiB適用後の実測でのみ判断する。

## 8. 成果物

- 実装時の変更ファイル:
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
- 付随成果物:
  - `docs/plans/2026-08-29_204232_native_ci_gradle_memory.md`
  - `.codex/runs/20260829-204232-JST/` の標準Run Artifact
- 実装は既存branch `fix/native-ci-gradle-memory` / PR #83 上で行う。

## 9. Follow-up（PR #83 のDoD外）

PR #83をmergeした後、PR #82で元のOOM発生条件に対する最終確認を行う。

1. PR #82へ最新mainを反映する。
2. PR #82のMobile App CIを再実行する。
3. Expo dependency mismatchが解消された元のfailure条件で `Native Static`、`Android Automation Build`、`Android Production-validation Build` が成立することを確認する。
4. `Android Automation Build` で `java.lang.OutOfMemoryError` / `Java heap space` が再発しないことを確認し、ここで今回のOOM解消を最終判定する。
5. 問題なければPR #82のmerge判断へ進む。

このFollow-upはPR #83の完了条件には含めない。
