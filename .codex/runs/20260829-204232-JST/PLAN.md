# Plan

## Objective

- PR #82 の Android Automation Build で再現した Gradle/D8 JVM OOMを、依存更新とは分離した最小のNative CI変更で解消するための実装計画を確定し、実装前提のOPEN PRを作成する。

## Scope

- In:
  - 失敗ログの根本原因確認
  - `.github/workflows/native-ci.yml` のAndroid Release build経路のrepo mapping
  - `tests/contracts/native-ci-workflow.test.ts` の既存契約確認
  - durable plan `docs/plans/2026-08-29_204232_native_ci_gradle_memory.md` の作成
  - `fix/native-ci-gradle-memory` branchと実装前提PRの作成
- Out:
  - Workflow実装変更
  - dependency更新
  - PR #82の変更
  - Gradle tuningの実行

## Assumptions

- 実装はAndroid Automation / Production-validationの2つのGradle invocationだけへ `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` を追加する方針とする。
- 4 GiB / 1 GiBで再発した場合は、同一PRで無制限にworker / parallel / runner tuningへ広げず再分析する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。失敗ログと既存CI構造から、今回の最小計画を確定できる。
- 仮定してよい細部: 2箇所だけなのでJVM args用の新規helper/envは作らず直接明示する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Android Automation Buildの直接原因はExpo dependency incompatibilityではなく、D8 `mergeExtDexRelease`中のGradle JVM heap不足である。
- H2: Automation / Production-validation両buildへ4 GiB heap / 1 GiB metaspaceを明示すれば、既存build契約を変えずにOOMを解消できる。

## Research Plan

- Round 1 Query: PR #82失敗ログから最初の根本例外、effective heap/metaspace、Production側の同種警告を確認する。
- Round 2 Query: `native-ci.yml` の2つのAndroid build commandと既存contract testを確認し、安全な変更面を確定する。
- Exit Criteria:
  - H1を直接ログで支持できる。
  - H2を適用する具体的な変更箇所とvalidationが確定している。
  - 実装者が追加判断なしで進められるdurable planが保存されている。

## Approach

- 原因ログを事実として固定する。
- Android Automation / Production-validationの共通build契約だけを変更対象とする。
- dependency、runner、parallel、worker等の追加変更をNon-goalへ明記する。
- memory fixをmainへ先にmergeし、その後#82へmainを反映してExpo更新後の実buildで最終確認する2段階validationを採用する。

## Definition of Done

- durable planが`docs/plans/2026-08-29_204232_native_ci_gradle_memory.md`に保存される。
- branch `fix/native-ci-gradle-memory` がmain最新から作成される。
- Run Artifactが保存される。
- 実装前提のOPEN PRがmain向けに作成される。
- 実装コードはまだ変更されない。

## Risks / Unknowns

- mainには#82未反映のExpo mismatchが残るため、後続memory fix PRのNative Staticが既知理由でFAILする可能性がある。これはmemory fixと混ぜず、#82を最終検証PRとして使う。
- 4 GiB / 1 GiBでOOMが残る場合は別の実測が必要。

## Thinking Log

- 2026-08-29 20:42 JST: Automation buildはD8 `mergeExtDexRelease`で`Java heap space` OOM。Gradleは2 GiB heap / 512 MiB metaspace不足を明示。Production buildにも同じ警告があるため、片側だけでなく2つのRelease buildへ同一設定を適用する計画とした。
- 2026-08-29 20:42 JST: `android/gradle.properties`はmainに存在せずExpo prebuild生成物なので、Repositoryへ追加せずGradle invocationへ限定して渡す方がsafe change surfaceとして小さい。
