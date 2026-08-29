# Android Native CI Gradle メモリ不足解消プラン

## 0. 依頼概要

- 依頼内容: PR #82 の Mobile App CI で再現している Android Automation Build の Gradle/D8 メモリ不足を、依存更新PRとは分離した別ブランチ・別PRで解消する。
- 背景:
  - PR #82 の `Android Automation Build` は `:app:mergeExtDexRelease` 実行中に `D8: java.lang.OutOfMemoryError: Java heap space` で失敗した。
  - 同ログで Gradle Daemon は `max heap space: 2 GiB`、`max metaspace: 512 MiB` と報告し、メモリ設定不足の警告を出している。
  - `Android Production-validation Build` は完走しているが、同じ 2 GiB / 512 MiB の設定不足警告を出している。
  - PR #82 の Expo dependency update 自体は Expo Doctor を通過しており、今回の失敗は dependency resolution ではなく Android Release APK の DEX merge 中に発生している。
- 期待成果: Android Automation / Production-validation の Release build に必要十分な Gradle JVM メモリを明示し、#82 の Expo SDK 推奨依存更新後も Android Automation Build が安定して完走できる状態にする。

## 1. ゴール / 完了条件

- ゴール: Android Native CI の Release APK build で発生している Gradle/D8 JVM メモリ不足を、CI build command の最小変更で解消する。
- 完了条件（DoD）:
  - `.github/workflows/native-ci.yml` の `Android Automation Build` と `Android Production-validation Build` の `./gradlew :app:assembleRelease` に同一の Gradle JVM メモリ設定を明示する。
  - JVM 設定は `-Xmx4g -XX:MaxMetaspaceSize=1g` とし、Gradle Daemon に `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` として渡す。
  - `-PreactNativeArchitectures=x86_64`、`--build-cache`、`--parallel`、`--stacktrace`、ログ保存先、APK生成・検証・artifact upload の既存契約は変更しない。
  - `tests/contracts/native-ci-workflow.test.ts` で Automation / Production-validation の両jobに同一の JVM 設定が存在することを固定する。
  - 実装PRでは dependency、app/native source、iOS CI、runner class、Gradle worker数等へ変更を広げない。
  - 実装後、対象の contract test とRepository標準validationがPASSする。
  - メモリ修正PRをmainへmerge後、PR #82 に最新mainを反映して Mobile App CI を再実行し、Expo更新後の `Android Automation Build` と `Android Production-validation Build` が双方PASSし、`OutOfMemoryError` が再発しないことを最終確認する。

## 2. 現状理解と前提

- Current understanding:
  - `.github/workflows/native-ci.yml` には Android Release APK を独立して作成する `android-automation-build` と `android-production-build` がある。
  - 両jobとも `expo prebuild --platform android --no-install` 後に `./gradlew :app:assembleRelease` を実行する。
  - 両jobのGradle build commandは `-PreactNativeArchitectures=x86_64 --build-cache --parallel --stacktrace` を使用している。
  - Repositoryのmainには `android/gradle.properties` が存在せず、Android projectはCI中のExpo prebuildで生成されるため、永続的な `android/gradle.properties` 編集は今回のsafe change surfaceではない。
  - `tests/contracts/native-ci-workflow.test.ts` は Android Automation / Production-validation build の独立性、実行順、Gradle invocation等を既に文字列契約として検証している。
  - PR #82 の失敗ログでは Automation build が `:app:mergeExtDexRelease` の D8 実行中に `java.lang.OutOfMemoryError: Java heap space` で失敗し、直前にGradleが2 GiB heap / 512 MiB metaspaceの不足を警告している。
  - Production-validation build も同じメモリ不足警告を出すが、同じ実行では成功している。
- Assumptions:
  - GitHub-hosted `ubuntu-24.04` 上で Gradle Daemon の heap 4 GiB / metaspace 1 GiB を確保しても、runner全体のメモリ制約を圧迫しすぎない。
  - `org.gradle.jvmargs` をGradle CLIのsystem propertyとしてbuild invocationへ限定して指定することで、Expo prebuild生成物を恒久変更せずに両buildへ同じ設定を適用できる。
  - 4 GiB / 1 GiB で解消しない場合は、今回のPRで `--parallel` 削除やworker制限等へ自動的に範囲を広げず、追加ログを基に別判断する。
- Non-goals:
  - PR #82 の `package.json` / `pnpm-lock.yaml` をこのPRへ取り込むこと。
  - Expo / React Native / その他dependency versionを変更すること。
  - `--parallel` の削除、`org.gradle.workers.max` の追加、Gradle cache戦略変更、runner大型化を同時に行うこと。
  - `android/gradle.properties` をRepositoryへ新規追加すること。
  - Native app source、Expo config、Android build.gradle、iOS CIを変更すること。
  - CI全体の高速化・リファクタリング・重複除去を行うこと。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。失敗ログ、変更対象、成功条件が今回の局所修正を決めるには十分確認できている。
- 仮定してよい細部:
  - JVM argsは共通変数・新規helperを作らず、Automation / Production-validation の2つのGradle invocationへ同じ値を直接明示する。2箇所だけなので、抽象化より可読性と差分最小化を優先する。
  - contract testは既存の `keeps Android automation and production builds independent and self-contained` 周辺へ必要最小限のassertionを追加する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - GitHub Actions Mobile App CI の Android Automation Release APK build
  - GitHub Actions Mobile App CI の Android Production-validation Release APK build
  - Native CI workflow contract test
- Files to inspect:
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - PR #82 の Android Automation / Production-validation build log
  - `package.json` / `pnpm-lock.yaml` はscope確認のみとし、変更しない。

## 5. 変更方針

- Change strategy:
  1. `android-automation-build` の `Build Automation Release APK` で、既存 `./gradlew :app:assembleRelease` に `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` を追加する。
  2. `android-production-build` の `Build Production-validation Release APK` にも同一設定を追加する。Production buildでも同じメモリ不足警告が観測されているため、Automationだけの片側修正にしない。
  3. 既存のarchitecture、build cache、parallel、stacktrace、teeによるevidence保存はそのまま維持する。
  4. `tests/contracts/native-ci-workflow.test.ts` に、Automation / Production-validation の両jobが完全に同一の JVM args を持つことを確認するassertionを追加する。
  5. それ以外のGradle tuningは行わない。4 GiB / 1 GiB 適用後もOOMする場合は、今回の実装を無制限に拡張せず停止してログを再分析する。

- 実行タスク:
  - [ ] 1. `.github/workflows/native-ci.yml` の2つのAndroid Release build commandへ `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` を追加する。
  - [ ] 2. `tests/contracts/native-ci-workflow.test.ts` に両jobのJVM memory contractを追加する。
  - [ ] 3. 差分がworkflow/testの必要最小範囲に限定されていることを確認する。
  - [ ] 4. format / lint / typecheck / contract / diff validationを実行する。
  - [ ] 5. PR上のMobile App CIでAndroid Automation / Production-validation build結果とGradleログを確認する。
  - [ ] 6. メモリ修正PRをmerge後、#82へ最新mainを反映してExpo更新後のAndroid buildを再検証する。

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
    - Plan / Run ArtifactはRepository運用上の成果物として別途許容する。
    - `package.json`、`pnpm-lock.yaml`、Native source、iOS workflowに差分がないことを確認する。
  - CI確認（メモリ修正PR）:
    - `Android Automation Build` がD8/Gradle OOMなしで完了すること。
    - `Android Production-validation Build` が完了すること。
    - 既存APK verification / artifact upload / bundle guardの契約が維持されること。
    - main側にPR #82未反映のExpo mismatchが残っている期間は、`Native Static` のExpo Doctor failureを今回のmemory fix起因と誤認しない。別問題として#82で解消する。
  - 最終回帰確認（#82）:
    - メモリ修正PRを先にmainへmergeする。
    - PR #82 に最新mainを反映する。
    - #82 の `Native Static`、`Android Automation Build`、`Android Production-validation Build` を含むMobile App CIを再実行する。
    - Expo dependency mismatchが解消された状態で、Automation / Production-validationの両buildがPASSすることを確認する。
- 成功判定:
  - `Android Automation Build` に `java.lang.OutOfMemoryError` / `Java heap space` が出ない。
  - `Android Production-validation Build` も既存成果物を生成し続ける。
  - Gradle invocationに4 GiB heap / 1 GiB metaspaceが明示され、2 jobで設定差がない。
  - #82更新後のMobile App CIで依存整合性とAndroid buildの両方が成立する。

## 7. リスクと未解決論点

- Risks:
  - 4 GiB / 1 GiBでもD8 OOMが再発する可能性は残る。
    - 対応: その場合はこのPRでworker数、`--parallel`、runner sizeまで連鎖的に変更せず、effective JVM settingsとOOM箇所を再取得して次の最小変更を決める。
  - main起点のmemory fix PRでは、#82が未mergeの間は既知のExpo Doctor mismatchが残る可能性がある。
    - 対応: memory fix PRとdependency PRの責務を混ぜず、memory fix merge後に#82へmainを反映して最終greenを確認する。
  - JVM argsを2箇所へ直接書くため将来driftする可能性がある。
    - 対応: contract testで両jobの同一値を固定する。2箇所だけのため現時点では共通helper/env導入は行わない。
- Open questions:
  - なし。追加Gradle tuningが必要かどうかは4 GiB / 1 GiB適用後の実測でのみ判断する。

## 8. 成果物

- 変更ファイル（実装時）:
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
- 付随ドキュメント:
  - `docs/plans/2026-08-29_204232_native_ci_gradle_memory.md`
  - `.codex/runs/20260829-204232-JST/` の標準Run Artifact
- 実装前PR:
  - 本プランのみを先にOPEN PRとして作成し、その同一branch / PRで後続実装を行う。

## 9. 備考

- 今回の判断根拠は「Expo patch updateだから戻す」ではなく、実ログ上の直接原因であるGradle/D8 JVM OOMである。
- Production-validationも同一のメモリ不足警告を出しているため、Automationだけに設定を入れるより、同じRelease build契約の2jobへ同一設定を入れる方が再発防止として最小かつ一貫している。
- これ以上のGradle最適化は、4 GiB / 1 GiBで失敗するという新しい証拠が出るまで行わない。
