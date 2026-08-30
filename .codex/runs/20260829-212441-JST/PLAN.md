# Plan

## Objective

- 既存の実装仕様 `docs/plans/2026-08-29_204232_native_ci_gradle_memory.md` に従い、PR #83のAndroid Native CI 2つのRelease buildへ同一JVM memory設定を最小差分で追加する。

## Scope

- In:
  - `.github/workflows/native-ci.yml` の `android-automation-build` と `android-production-build` のGradle invocation。
  - `tests/contracts/native-ci-workflow.test.ts` の既存Android build契約テストと既存 `expectInOrder()`。
  - このRunの標準Run Artifact。
- Out:
  - Expo / React Native / その他dependency、`package.json`、`pnpm-lock.yaml`。
  - Native app source、iOS CI、runner class、worker数、`--parallel`、cache strategy、`android/gradle.properties`。
  - 新規helper、env抽象化、YAML parser、専用test file、PR #82 Follow-up。
  - commit、push、PR操作。

## Assumptions

- JVM argsは2つのGradle commandへ直接同じ文字列で追加する。
- 完成形は `./gradlew :app:assembleRelease` → `-Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"` → `-PreactNativeArchitectures=x86_64` の順とし、既存の後続引数・tee先を維持する。
- ローカルで実行可能なRepository標準validationを実施し、未pushの変更に対するGitHub Actions実行は未実施として明示する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。durable planに対象、完成形、contract、Non-goals、Validation、Stop conditionsが明記されている。
- 仮定してよい細部: なし（既存テストの構造に合わせて局所的に実装する）。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 2つの対象Gradle invocationへ同一JVM argsを挿入し、既存のbuild/artifact契約を変えずにメモリ設定を適用できる。
- H2: 既存contract testへ順序契約を追加することで、将来のcommand組み替えを検知できる。

## Research Plan

- Round 1 Query: Plan、Run、ADR、PROJECT_CONTEXT、Workflow、既存contract test、validation scriptsを確認する。
- Round 2 Query: 実装後のdiff、scope、format/lint/typecheck/contracts/markdownlint/git diff checkを検証する。
- Exit Criteria:
  - 2つのcommandだけへ同一JVM argsが追加されている。
  - 既存 `expectInOrder()` による順序契約が2jobへ追加されている。
  - Non-goalへの差分がない。
  - Plan指定のローカルvalidation結果と、未実施のRemote CI項目が明確である。

## Approach

1. Planと既存コードからsafe change surfaceを確定する。
2. Workflowの2箇所へJVM argsだけを追加する。
3. 既存contract test内へ2job分の順序assertionを追加する。
4. diff/scopeを確認し、Plan記載の全ローカルvalidationを順番に実行する。
5. failureがあれば最初の異常を特定し、PlanのStop conditionsを守って判断を記録する。

## Definition of Done

- 2つのAndroid Release build commandに同一の `-Xmx4g -XX:MaxMetaspaceSize=1g` が指定されている。
- `assembleRelease` → JVM args → architecture指定の順序が既存contract testで固定されている。
- 既存のarchitecture、cache、parallel、stacktrace、ログ、APK検証、artifact契約が変わっていない。
- Plan記載のローカルvalidationがPASSするか、失敗原因と停止判断が記録されている。
- 対象外ファイルへ変更を広げていない。
- PR #82 Follow-upは実施していない。

## Risks / Unknowns

- 4 GiB / 1 GiB適用後の実GitHub Actions Android buildは、未push状態では確認できない。push後のPR #83 CI確認が残る。
- 4 GiB / 1 GiBでもOOMが再発した場合は、`--parallel`削除、worker制限、runner変更などへ広げず停止する。

## Thinking Log

- 2026-08-29 21:24 JST: 直前のplanning Run `20260829-204232-JST` はcompletedのため上書きせず、実装用Run `20260829-212441-JST`を新規作成した。
- 2026-08-29 21:25 JST: current branchは`fix/native-ci-gradle-memory`、PR #83 headと一致し、作業ツリーはclean。対象Workflowには2つの同形Gradle invocation、contract testには既存`expectInOrder()`がある。
