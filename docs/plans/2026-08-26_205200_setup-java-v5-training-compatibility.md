# Issue #46 actions/setup-java v5 Training Native CI 移行計画

## 0. 依頼概要

- 依頼内容: Issue #46「chore: actions/setup-java v5 の互換性を検証する」を、PR #44とは分離した対応として実施する。
- 背景: `training/github-actions/training-native-ci.yml` は `actions/setup-java` v4系を完全SHAで固定しているが、v4系は非推奨となっている。一方、通常の `.github/workflows/native-ci.yml` では既に `actions/setup-java` v5.7.0 を完全SHA固定で利用している。
- 期待成果: Training Native CI の `actions/setup-java` を既存Native CIで採用済みのv5.7.0へ安全に移行し、Java 17、setup-java v5自身のNode 24 runtime、リポジトリ側Node 24、GitHub-hosted runner、Android build、既存Training workflow契約との互換性を確認する。

## 1. ゴール / 完了条件

- ゴール:
  - `training/github-actions/training-native-ci.yml` の `actions/setup-java` をv5.7.0へ移行する。
  - 完全SHA固定と既存Training workflowのセキュリティ境界を維持する。
  - 変更後Training workflow templateを既存Training Copy経路で検証する。
  - setup-java v5を利用する既存Native CI経路をGitHub-hosted runner上で実行し、runtime互換性を確認する。
- 完了条件（DoD）:
  - `training/github-actions/training-native-ci.yml` が `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` を使用している。
  - `distribution: temurin` と `java-version: "17"` を維持している。
  - `scripts/training/workflow-contract.ts` が同じv5.7.0完全SHAだけを許可し、旧v4 SHAを許可しない。
  - 既存Training workflowのセキュリティ契約を弱めていない。
  - 必要なworkflow / contractテストがPASSする。
  - 最終PR HEADの完全SHAから生成したDisposable Training CopyがvalidationをPASSする。
  - 最終PR HEADをrefとして `.github/workflows/native-ci.yml` を `workflow_dispatch` し、`Android Automation Build` と `Android Production-validation Build` がPASSする。
  - 上記dispatchでsetup-java v5自身のNode 24 runtime、Java 17、リポジトリ側Node 24、GitHub-hosted runner、既存Gradle cache経路に互換性エラーがない。
  - PR #44とは分離したIssue #46用PRとして提出できる状態になっている。

## 2. 現状理解と前提

- `training/github-actions/training-native-ci.yml` は `ubuntu-24.04`、リポジトリ側Node 24、Temurin Java 17を使用している。
- Training workflowの現在のJava Actionは `actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3` である。
- `.github/workflows/native-ci.yml` は既に `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` をJava 17で利用している。
- 上記v5.7.0 tagと完全SHAの対応は確認済みである。
- setup-java v5ではAction自身のruntimeがNode 20からNode 24へ変更され、runner v2.327.1以上が必要である。これはworkflowの `NODE_VERSION: 24` で設定するリポジトリ側Nodeとは別である。
- `training/github-actions/training-native-ci.yml` はSource Repository上で直接実行するworkflowではなく、`scripts/training/prepare-training-copy.ts` によりDisposable / training-only Copyの `.github/workflows/training-native-ci.yml` へ配置される。
- `scripts/training/validate-training-copy.ts` は生成済みTraining Copyのactive workflow、Source SHA、テンプレート一致、Training workflow contractを検証する。
- Training workflowの `actions/setup-java` では `cache:` inputを使用していない。Gradle cacheは通常Native CIの `gradle/actions/setup-gradle` が管理している。
- `actions/setup-java` v6.0.0は公開済みだが、本Issueはv5互換性確認を対象とし、既存Native CIもv5.7.0を利用しているため、本対応ではv5.7.0へ統一する。

### Non-goals

- `.github/workflows/native-ci.yml` の変更。
- `actions/setup-java` v6への移行。
- Java、Node、pnpm、Gradle、Expo、Android SDK、Maestroなどのバージョン変更。
- `actions/setup-java` への `cache:` input追加。
- `gradle/actions/setup-gradle` の設定変更。
- Android build、emulator、Maestro、artifact収集フローの変更。
- Training workflowをSource Repositoryで直接実行するための新規workflow追加。
- Training実行専用Repositoryや新しい検証基盤の追加。
- Training workflow validatorのセキュリティ境界緩和。
- PR #44の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 未回答の重要質問: なし。

## 4. 影響範囲

### 変更対象

- `training/github-actions/training-native-ci.yml`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`

### 参照のみ

- `training/github-actions/README.md`
- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`
- `.github/workflows/native-ci.yml`
- `tests/contracts/native-ci-workflow.test.ts`
- `package.json`

上記3変更対象以外のProduct code、依存ファイル、lockfileは変更しない。

## 5. 変更方針

- 通常Native CIで採用済みのv5.7.0完全SHAをTraining Native CIへ適用する。
- Workflow参照とvalidator allowlistを同じ変更で更新する。
- validatorを一般化せず、major tagやmutable refを許可しない。
- setup-java自身のcache機能を追加せず、既存cache構成を維持する。
- 正式Native CIのdispatchは変更対象Training templateそのものの実行確認ではなく、同じsetup-java v5.7.0を使うGitHub-hosted runner上のruntime互換性確認として扱う。

### 実行タスク

- [ ] 1. `training/github-actions/training-native-ci.yml` の `actions/setup-java` を `b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` へ置き換える。`distribution: temurin`、`java-version: "17"`、step順序、他Action、build手順は変更しない。
- [ ] 2. `scripts/training/workflow-contract.ts` の `APPROVED_TRAINING_ACTIONS` から旧v4 SHAを削除し、v5.7.0完全SHAを許可する。allowlist方式は維持する。
- [ ] 3. `tests/contracts/training-curriculum.test.ts` に、現在の `training-native-ci.yml` がv5.7.0完全SHAを使用することと、旧v4 SHAへ戻した場合にworkflow contractが拒否することを確認する最小限の回帰テストを追加する。既存generic contract testsは変更しない。
- [ ] 4. 差分を確認し、Java version、リポジトリ側Node version、runner、Android SDK、build command、Maestro checksum、permissions、checkout設定、cache設定に意図しない変更がないことを確認する。
- [ ] 5. Focused contract、curriculum validation、全contract test、静的品質チェックを実行する。
- [ ] 6. 実装・テスト修正をすべてcommitし、PRへ含める最終HEAD SHAを確定する。この後にコードまたはテストを変更した場合は、以降のTraining Copy validationとworkflow dispatchを新しいHEADで再実行する。
- [ ] 7. 最終HEAD SHAを `training:copy:prepare` の `--source-sha` に指定し、現在のworking tree外の一時ディレクトリへDisposable Training Copyを生成する。`training:copy:validate` を実行しPASSを確認した後、一時ディレクトリを削除する。
- [ ] 8. 最終HEADをpushし、そのbranch/refに対して `.github/workflows/native-ci.yml` を `workflow_dispatch` する。実行対象commitが最終PR HEADと一致していることを確認する。
- [ ] 9. dispatchした `Android Automation Build` と `Android Production-validation Build` がPASSすることを確認する。setup-java step、Java 17、リポジトリ側Node 24、既存Gradle cache経路、両APK buildに互換性エラーがないことを確認する。
- [ ] 10. 問題がなければIssue #46用PRとして提出する。互換性問題が確認された場合は、回避策を追加して無理に通さず、失敗箇所と移行を阻害する条件を記録して移行を止める。

## 6. 検証方法

### Local / contract validation

```bash
pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1
pnpm run validate:curriculum
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run lint:markdown
pnpm run security:check
pnpm run test:contracts
git diff --check
```

### Training Copy validation

最終PR HEADの完全SHAを使用する。

```bash
pnpm run training:copy:prepare -- --source-sha <final-pr-head-sha> --target <temporary-directory-outside-current-working-tree>
pnpm run training:copy:validate -- --root <temporary-directory-outside-current-working-tree>
```

- 生成先は現在のworking tree外とし、Repositoryへ追加しない。
- validation PASS後に生成先を削除する。
- 最終HEADが変わった場合は新しいSHAで再実行する。

### GitHub-hosted runner runtime validation

- 最終PR HEADをrefとして `.github/workflows/native-ci.yml` を `workflow_dispatch` する。
- workflow runの対象commitが最終PR HEADと一致していることを確認する。
- `Android Automation Build` と `Android Production-validation Build` がPASSすることを確認する。
- setup-java stepが正常に完了し、v5自身のNode 24 runtimeに起因するrunner互換性エラーがないことを確認する。
- 必要に応じて `Set up job` / setup-javaログからGitHub-hosted runnerがv5の要求を満たしていることを確認する。
- Java 17がセットアップされ、リポジトリ側Node 24およびAndroid buildと共存していることを確認する。
- `gradle/actions/setup-gradle` のcache処理が既存設定のままエラーなく完了することを確認する。cache hit/missは成功条件にしない。

## 7. リスクと未解決論点

- Workflowとallowlistの片方だけを更新するとTraining contractが失敗するため、同一変更で更新する。
- mutable refを許可すると完全SHA固定ポリシーが後退するため、exact SHAのみ許可する。
- 正式Native CIは今回変更しないため、workflow dispatchだけを変更後Training templateの直接検証として扱わない。Training template自体はTraining Copy validationで確認する。
- setup-java v5自身のNode 24 runtimeとリポジトリ側Node 24を別の確認対象として扱う。
- setup-java自身のdependency cacheは未使用のため、cache hitを確認対象にしない。
- v6移行は本Issueへ含めない。

## 8. 成果物

- `training/github-actions/training-native-ci.yml`
- `scripts/training/workflow-contract.ts`
- `tests/contracts/training-curriculum.test.ts`
- 本計画書 `docs/plans/2026-08-26_205200_setup-java-v5-training-compatibility.md`
- PR本文に以下を記載する。
  - 検証した最終PR HEAD SHA
  - 実行したlocal / contract validation結果
  - Training Copy validation結果
  - Native CI `workflow_dispatch` の対象commitとAndroid Automation / Production-validation build結果

## 9. 備考

- 本対応は `actions/setup-java` v5.7.0互換性確認とTraining Native CI移行だけを対象とする。
- 実装中に別のAction upgradeやCI改善点を見つけても、本Issueに必須でなければ別Issueへ分離する。
- 実装差分は必要最小限とし、既存Native CI構成と既存Training Copy検証経路を再利用する。
