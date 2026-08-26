# Issue #46 actions/setup-java v5 Training Native CI 移行計画

## 0. 依頼概要

- 依頼内容: Issue #46「chore: actions/setup-java v5 の互換性を検証する」を、PR #44とは分離した対応として実施する。
- 背景: `training/github-actions/training-native-ci.yml` は `actions/setup-java` v4系を完全SHAで固定しているが、v4系は非推奨となっている。一方、通常の `.github/workflows/native-ci.yml` では既に `actions/setup-java` v5.7.0 を完全SHA固定で利用している。
- 期待成果: Training Native CI の `actions/setup-java` を既存Native CIで採用済みのv5.7.0へ安全に移行し、Java 17、Node 24、GitHub-hosted runner、Android build、既存のTraining workflow契約との互換性を確認する。

## 1. ゴール / 完了条件

- ゴール:
  - `training/github-actions/training-native-ci.yml` の `actions/setup-java` をv5系へ移行する。
  - 既存の完全SHA固定ポリシーとTraining workflowのセキュリティ境界を維持する。
  - Java 17および現在のNative CI経路で互換性があることを、静的な契約テストだけでなくGitHub-hosted runner上の実行結果でも確認する。
- 完了条件（DoD）:
  - `training/github-actions/training-native-ci.yml` が `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` を使用している。
  - `distribution: temurin` と `java-version: "17"` を維持している。
  - `scripts/training/workflow-contract.ts` の許可Actionが同じv5.7.0の完全SHAを参照し、旧v4 SHAを許可しない。
  - Training workflowの既存セキュリティ契約（完全SHA固定、`permissions: contents: read`、GitHub-hosted runner限定、checkout credential非保持、未許可Action拒否）を弱めていない。
  - 必要なTraining curriculum / workflow contractテストがPASSする。
  - `.github/workflows/native-ci.yml` を対象ブランチに対して `workflow_dispatch` で実行し、少なくとも `Android Automation Build` と `Android Production-validation Build` がPASSする。
  - Java 17セットアップ、Node 24環境、Gradle cache設定にv5移行起因のエラーがないことを実行ログで確認する。
  - PR #44とは分離したIssue #46用PRとして提出できる状態になっている。

## 2. 現状理解と前提

- Current understanding:
  - `training/github-actions/training-native-ci.yml` は `ubuntu-24.04`、Node 24、Temurin Java 17を使用している。
  - Training workflowの現在のJava Actionは `actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3` で、v4系の完全SHA固定である。
  - `.github/workflows/native-ci.yml` は既に `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` をJava 17で使用しており、Android Automation Build / Android Production-validation Buildを含む通常のNative CI経路で採用済みである。
  - `scripts/training/workflow-contract.ts` の `APPROVED_TRAINING_ACTIONS` は現在のv4 SHAだけを許可しているため、Training workflowだけをv5へ変更すると契約テストで拒否される。
  - `tests/contracts/training-curriculum.test.ts` はTraining workflowテンプレートを `validateTrainingWorkflow` に通し、未許可Action、mutable ref、self-hosted runner、過剰権限などをfail-closedで拒否する契約を持つ。
  - Training workflowの `actions/setup-java` には `cache:` inputを設定していない。通常のNative CIではGradle cacheを `gradle/actions/setup-gradle` 側で管理している。
  - `.github/workflows/native-ci.yml` の `workflow_dispatch` は変更検知に関係なく `native_changed=true` としてNative jobsを実行できるため、対象ブランチの実ランナー検証に利用できる。
- Assumptions:
  - 新しいv5系バージョンを別途選定せず、リポジトリ内の通常Native CIで既に採用されているv5.7.0の完全SHAへ揃える。
  - v5移行そのものに不要なAction upgrade、Gradle cache方式変更、Android build最適化は行わない。
  - cacheの互換性は「cache hitすること」ではなく、「既存cache設定を変えず、cache restore/saveを含む処理がエラーなく動作すること」で判定する。cache hit/missは外部状態に依存するため成功条件にしない。
- Non-goals:
  - `.github/workflows/native-ci.yml` のsetup-javaバージョン変更。
  - Java、Node、pnpm、Gradle、Expo、Android SDK、Maestroなどのバージョン変更。
  - `actions/setup-java` への新しい `cache:` input追加。
  - `gradle/actions/setup-gradle` の設定変更。
  - Android build手順、emulator起動、Maestro実行、artifact収集の変更。
  - Training workflow validatorのセキュリティ境界緩和。
  - PR #44の変更、再オープン、修正。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: v5の採用版は、通常Native CIで既に利用しているv5.7.0へ統一する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Training Native CI workflow templateのJava Action参照。
  - Training workflowで許可するActionの完全SHA allowlist。
  - Training workflow契約テスト。
  - 実装後のGitHub Actions実行確認。
- Files to inspect / change:
  - `training/github-actions/training-native-ci.yml`
  - `scripts/training/workflow-contract.ts`
  - `tests/contracts/training-curriculum.test.ts`
- Validation reference only:
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `package.json`
- 原則として上記3変更対象以外のProduct code、依存ファイル、lockfileは変更しない。

## 5. 変更方針

- Change strategy:
  - 通常Native CIで既に採用済みのv5.7.0完全SHAをTraining Native CIへ流用し、既存設定をそのまま維持する。
  - Workflow参照とvalidator allowlistを同じ変更で更新し、片方だけが新旧SHAになる状態を残さない。
  - 既存のfail-closed契約を維持し、v5を許可するためにvalidatorを一般化したり、major tagやmutable refを許可したりしない。
  - v5移行に直接必要な差分だけに限定し、cache方式やAndroid buildフローを触らない。
- 実行タスク:
  - [ ] 1. `training/github-actions/training-native-ci.yml` の `actions/setup-java` を `b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` へ置き換える。`distribution: temurin`、`java-version: "17"`、step順序、他Action、build手順は変更しない。
  - [ ] 2. `scripts/training/workflow-contract.ts` の `APPROVED_TRAINING_ACTIONS` から旧v4 SHAを削除し、同じv5.7.0完全SHAを許可する。Action名全体やmajor tagを許可するような緩和はしない。
  - [ ] 3. `tests/contracts/training-curriculum.test.ts` に、現在の `training-native-ci.yml` がv5.7.0の完全SHAを使用すること、旧v4 SHAへ戻した場合はworkflow contractが拒否することを確認する最小限の回帰契約を追加する。既存のgenericな未許可Action・mutable ref拒否テストは維持する。
  - [ ] 4. 差分を確認し、Java version、Node version、runner、Android SDK、Gradle/Expo build command、Maestro checksum、権限、checkout設定、cache設定に意図しない変更がないことを確認する。
  - [ ] 5. Focused test、curriculum validation、全contract test、静的品質チェックを実行する。
  - [ ] 6. 実装を対象ブランチへpushした後、`.github/workflows/native-ci.yml` を `workflow_dispatch` で対象ブランチに対して実行する。PRイベントによる変更検知だけには依存しない。
  - [ ] 7. dispatchしたNative CIで `Android Automation Build` と `Android Production-validation Build` を確認し、setup-java v5.7.0、Java 17、Node 24、Gradle cache処理、両APK buildが正常であることをログで確認する。
  - [ ] 8. 問題がなければIssue #46用の別PRとして提出する。互換性問題が確認された場合は、回避策を追加して無理に通さず、失敗箇所とv5移行を阻害する条件を記録して移行を止める。

## 6. 検証方法

- Validation plan:
  - Focused contract:
    - `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`
  - Training validation:
    - `pnpm run validate:curriculum`
  - Type / lint / formatting:
    - `pnpm run format:check`
    - `pnpm run lint`
    - `pnpm run typecheck`
    - `pnpm run lint:markdown`
  - Security / contract regression:
    - `pnpm run security:check`
    - `pnpm run test:contracts`
  - Diff hygiene:
    - `git diff --check`
  - GitHub-hosted runner compatibility:
    - 対象ブランチをrefとして `.github/workflows/native-ci.yml` を `workflow_dispatch` で実行する。
    - `Android Automation Build` がPASSすることを確認する。
    - `Android Production-validation Build` がPASSすることを確認する。
    - setup-java stepのログでJava 17がセットアップされ、v5移行に起因するNode/runtimeエラーがないことを確認する。
    - `gradle/actions/setup-gradle` のcache処理が既存設定のままエラーなく完了することを確認する。cache hit/miss自体は判定条件にしない。
- 成功判定:
  - Training workflowがv5.7.0完全SHAに移行し、旧v4 SHAがworkflowとallowlistから除去されている。
  - focused test、`validate:curriculum`、`test:contracts`、type/lint/security checksがすべてPASSする。
  - 手動dispatchしたNative CIのAndroid Automation / Production-validation buildがPASSする。
  - 完全SHA固定、Java 17、Node 24、GitHub-hosted runner、既存cache方式、既存security contractが維持されている。

## 7. リスクと未解決論点

- Risks:
  - Workflowだけv5へ変更すると `APPROVED_TRAINING_ACTIONS` と不整合になり、Training contractが失敗する。workflowとallowlistは同一変更で更新する。
  - allowlistを `actions/setup-java@v5` のようなmutable refに緩和すると、PR #44で導入した完全SHA固定ポリシーを後退させる。exact SHAのみ許可する。
  - 通常のPRイベントでは本Issueの変更ファイルがNative change判定に含まれず、Android build jobsがskipされる可能性がある。互換性確認は `workflow_dispatch` を必須とする。
  - cache hit/missはGitHub側のcache状態で変わるため、hitを要求すると不安定な完了条件になる。既存cache設定と処理成功のみ確認する。
  - 通常Native CIとTraining Native CIは完全に同一workflowではないため、通常Native CIの既存v5採用だけをもってTraining互換性確認完了とはしない。Training側はcontract testで構造を確認し、GitHub-hosted runner上では同じv5.7.0 / Java 17 / Node 24を使うNative build経路をdispatchして実行確認する。
- Open questions:
  - なし。v5で実ランナー上の失敗が出た場合のみ、その失敗を根拠に追加対応の必要性を再評価する。

## 8. 成果物

- 変更ファイル:
  - `training/github-actions/training-native-ci.yml`
  - `scripts/training/workflow-contract.ts`
  - `tests/contracts/training-curriculum.test.ts`
- 付随ドキュメント:
  - 本計画書 `docs/plans/2026-08-26_205200_setup-java-v5-training-compatibility.md`
  - Issue #46用PR本文に、実施したvalidationとNative CI dispatch結果を記載する。

## 9. 備考

- 本対応は `actions/setup-java` v5互換性確認とTraining Native CIの移行だけを対象とする。
- 実装中に別のAction upgradeやCI改善点を見つけても、本Issueの完了に必須でなければ別Issueへ分離する。
- 実装差分は必要最小限とし、既に通常Native CIで成立している構成を再利用する。
