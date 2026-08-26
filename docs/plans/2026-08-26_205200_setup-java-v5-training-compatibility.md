# Issue #46 actions/setup-java v5 Training Native CI 移行計画

## 0. 依頼概要

- 依頼内容: Issue #46「chore: actions/setup-java v5 の互換性を検証する」を、PR #44とは分離した対応として実施する。
- 背景: `training/github-actions/training-native-ci.yml` は `actions/setup-java` v4系を完全SHAで固定しているが、v4系は非推奨となっている。一方、通常の `.github/workflows/native-ci.yml` では既に `actions/setup-java` v5.7.0 を完全SHA固定で利用している。
- 期待成果: Training Native CI の `actions/setup-java` を既存Native CIで採用済みのv5.7.0へ安全に移行し、Java 17、setup-java v5自身のNode 24 runtime、リポジトリ側のNode 24、GitHub-hosted runner、Android build、既存のTraining workflow契約との互換性を確認する。

## 1. ゴール / 完了条件

- ゴール:
  - `training/github-actions/training-native-ci.yml` の `actions/setup-java` をv5系へ移行する。
  - 既存の完全SHA固定ポリシーとTraining workflowのセキュリティ境界を維持する。
  - 変更後のTraining workflow templateが、Training Copyの既存Canonical経路で正しく配置・検証できることを確認する。
  - setup-java v5のNode 24 runtimeが、現在利用するGitHub-hosted runner上でJava 17およびリポジトリ側のNode 24と共存してNative buildを実行できることを確認する。
- 完了条件（DoD）:
  - `training/github-actions/training-native-ci.yml` が `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` を使用している。
  - 上記SHAが公式 `actions/setup-java` のimmutableな `v5.7.0` tagが指すcommitであることを確認している。
  - `distribution: temurin` と `java-version: "17"` を維持している。
  - `scripts/training/workflow-contract.ts` の許可Actionが同じv5.7.0の完全SHAを参照し、旧v4 SHAを許可しない。
  - Training workflowの既存セキュリティ契約（完全SHA固定、`permissions: contents: read`、GitHub-hosted runner限定、checkout credential非保持、未許可Action拒否）を弱めていない。
  - 必要なTraining curriculum / workflow contractテストがPASSする。
  - 実装commitの完全SHAから既存のTraining Copy生成・検証経路を実行し、生成された `.github/workflows/training-native-ci.yml` が変更後テンプレートと一致し、Training workflow contractをPASSする。
  - `.github/workflows/native-ci.yml` を対象ブランチに対して `workflow_dispatch` で実行し、少なくとも `Android Automation Build` と `Android Production-validation Build` がPASSする。
  - dispatch結果から、setup-java v5自身のNode 24 runtimeがGitHub-hosted runner上で正常に起動し、Java 17 setup、リポジトリ側Node 24との共存、既存Gradle cache経路、両Android buildにruntime互換性問題がないことを確認する。
  - PR #44とは分離したIssue #46用PRとして提出できる状態になっている。

## 2. 現状理解と前提

- Current understanding:
  - `training/github-actions/training-native-ci.yml` は `ubuntu-24.04`、リポジトリ側Node 24、Temurin Java 17を使用している。
  - Training workflowの現在のJava Actionは `actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3` で、v4系の完全SHA固定である。
  - `.github/workflows/native-ci.yml` は既に `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` をJava 17で使用しており、Android Automation Build / Android Production-validation Buildを含む通常のNative CI経路で採用済みである。
  - 公式 `actions/setup-java` v5ではAction自身の実行runtimeがNode 20からNode 24へ変更されており、runner v2.327.1以上が必要である。これはworkflow内の `NODE_VERSION: 24` で設定するリポジトリ側Node runtimeとは別の互換性条件である。
  - `scripts/training/workflow-contract.ts` の `APPROVED_TRAINING_ACTIONS` は現在のv4 SHAだけを許可しているため、Training workflowだけをv5へ変更すると契約テストで拒否される。
  - `tests/contracts/training-curriculum.test.ts` はTraining workflowテンプレートを `validateTrainingWorkflow` に通し、未許可Action、mutable ref、self-hosted runner、過剰権限などをfail-closedで拒否する契約を持つ。
  - `training/github-actions/training-native-ci.yml` はSource Repository上で直接有効化するworkflowではない。`scripts/training/prepare-training-copy.ts` が完全なSource SHAからDisposable / training-only Copyを生成し、同テンプレートを `.github/workflows/training-native-ci.yml` として配置する。
  - `scripts/training/validate-training-copy.ts` は、生成されたTraining Copyのactive workflow allowlist、Source SHA整合、テンプレートとの完全一致、Training workflow contractを検証する。
  - Training workflowの `actions/setup-java` には `cache:` inputを設定しておらず、setup-java自身のdependency cacheは使用していない。通常のNative CIではGradle cacheを `gradle/actions/setup-gradle` 側で管理している。
  - `.github/workflows/native-ci.yml` の `workflow_dispatch` は変更検知に関係なく `native_changed=true` としてNative jobsを実行できるため、setup-java v5の実ランナー互換性確認に利用できる。
  - `actions/setup-java` v6.0.0は2026-08-24に公開済みだが、Issue #46はv5互換性確認を目的としており、リポジトリの通常Native CIも現在v5.7.0を採用している。
- Assumptions:
  - 本Issueでは新たなmajor version選定を行わず、リポジトリ内の通常Native CIで既に採用されているv5.7.0の完全SHAへ揃える。
  - v6への移行は本Issueへ混在させず、必要であれば別Issueで扱う。
  - v5移行そのものに不要なAction upgrade、Gradle cache方式変更、Android build最適化は行わない。
  - cacheについてはsetup-java自身のcache機能を新規利用しない。確認対象は、既存のpnpm / Gradle cache所有関係を変えず、通常Native CIの既存Gradle cache経路がv5利用下でもエラーなく動作することである。cache hit/missは外部状態に依存するため成功条件にしない。
  - `.github/workflows/native-ci.yml` のdispatchは、変更対象Training templateそのものの実行確認ではなく、同じsetup-java v5.7.0 / Java 17 / GitHub-hosted runnerを利用する実ランナー上のruntime互換性確認として扱う。
- Non-goals:
  - `.github/workflows/native-ci.yml` のsetup-javaバージョン変更。
  - `actions/setup-java` v6への移行。
  - Java、Node、pnpm、Gradle、Expo、Android SDK、Maestroなどのバージョン変更。
  - `actions/setup-java` への新しい `cache:` input追加。
  - `gradle/actions/setup-gradle` の設定変更。
  - Android build手順、emulator起動、Maestro実行、artifact収集の変更。
  - Training workflowをSource Repository上で直接実行するための新規workflow追加。
  - Training実行専用Repositoryや新しい検証基盤の追加。
  - Training workflow validatorのセキュリティ境界緩和。
  - PR #44の変更、再オープン、修正。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: v5の採用版は、通常Native CIで既に利用しているv5.7.0へ統一する。
- 未回答の重要質問: なし。
- Issue作成後にv6.0.0が公開されているが、本Issueの目的と既存Native CIとの整合を優先し、本対応ではv5.7.0を採用する。v6検討は本対応の完了条件に含めない。

## 4. 影響範囲

- Impacted areas:
  - Training Native CI workflow templateのJava Action参照。
  - Training workflowで許可するActionの完全SHA allowlist。
  - Training workflow契約テスト。
  - Training Copyの既存生成・検証経路による変更後テンプレート確認。
  - 実装後のGitHub Actions実ランナー確認。
- Files to inspect / change:
  - `training/github-actions/training-native-ci.yml`
  - `scripts/training/workflow-contract.ts`
  - `tests/contracts/training-curriculum.test.ts`
- Validation reference only:
  - `training/github-actions/README.md`
  - `scripts/training/prepare-training-copy.ts`
  - `scripts/training/validate-training-copy.ts`
  - `.github/workflows/native-ci.yml`
  - `tests/contracts/native-ci-workflow.test.ts`
  - `package.json`
- 原則として上記3変更対象以外のProduct code、依存ファイル、lockfileは変更しない。

## 5. 変更方針

- Change strategy:
  - 通常Native CIで既に採用済みのv5.7.0完全SHAをTraining Native CIへ流用し、既存設定をそのまま維持する。
  - 実装前に公式 `actions/setup-java` のimmutableなv5.7.0 tagが `b6effb05e454b25005698d916606bdc6ffcbf961` を指すことを確認し、完全SHA固定の根拠を明確にする。
  - Workflow参照とvalidator allowlistを同じ変更で更新し、片方だけが新旧SHAになる状態を残さない。
  - 既存のfail-closed契約を維持し、v5を許可するためにvalidatorを一般化したり、major tagやmutable refを許可したりしない。
  - Source Repositoryの正式Native CIとTraining templateの役割を混同しない。Training templateは既存Training Copy経路で直接検証し、正式Native CIのdispatchはv5の実ランナーruntime互換性確認として利用する。
  - v5移行に直接必要な差分だけに限定し、cache方式やAndroid buildフローを触らない。
- 実行タスク:
  - [ ] 1. 公式 `actions/setup-java` のimmutableな `v5.7.0` tagが `b6effb05e454b25005698d916606bdc6ffcbf961` を指すことを確認する。異なる場合は実装を開始せず、採用SHAを再評価する。
  - [ ] 2. `training/github-actions/training-native-ci.yml` の `actions/setup-java` を `b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0` へ置き換える。`distribution: temurin`、`java-version: "17"`、step順序、他Action、build手順は変更しない。
  - [ ] 3. `scripts/training/workflow-contract.ts` の `APPROVED_TRAINING_ACTIONS` から旧v4 SHAを削除し、同じv5.7.0完全SHAを許可する。Action名全体やmajor tagを許可するような緩和はしない。
  - [ ] 4. `tests/contracts/training-curriculum.test.ts` に、現在の `training-native-ci.yml` がv5.7.0の完全SHAを使用すること、旧v4 SHAへ戻した場合はworkflow contractが拒否することを確認する最小限の回帰契約を追加する。既存のgenericな未許可Action・mutable ref拒否テストは維持する。
  - [ ] 5. 差分を確認し、Java version、リポジトリ側Node version、runner、Android SDK、Gradle/Expo build command、Maestro checksum、権限、checkout設定、cache設定に意図しない変更がないことを確認する。
  - [ ] 6. Focused test、curriculum validation、全contract test、静的品質チェックを実行する。
  - [ ] 7. 実装内容をcommitした後、その完全SHAを `training:copy:prepare` の `--source-sha` に指定してDisposable Training Copyを生成し、`training:copy:validate` で検証する。生成先は作業用一時ディレクトリとし、Repositoryへ追加しない。
  - [ ] 8. Training Copyの `.github/workflows/training-native-ci.yml` がRepository内の変更後 `training/github-actions/training-native-ci.yml` と一致し、v5.7.0完全SHAを含み、既存Training workflow contractをPASSすることを確認する。
  - [ ] 9. 実装を対象ブランチへpushした後、`.github/workflows/native-ci.yml` を `workflow_dispatch` で対象ブランチに対して実行する。PRイベントによる変更検知だけには依存しない。
  - [ ] 10. dispatchしたNative CIで `Android Automation Build` と `Android Production-validation Build` を確認する。setup-java stepがNode 24 runtime互換性エラーなく起動し、Java 17がセットアップされ、リポジトリ側Node 24、既存Gradle cache経路、両APK buildが正常であることを確認する。
  - [ ] 11. 問題がなければIssue #46用の別PRとして提出する。互換性問題が確認された場合は、回避策を追加して無理に通さず、失敗箇所とv5移行を阻害する条件を記録して移行を止める。

## 6. 検証方法

- Validation plan:
  - Focused contract:
    - `pnpm exec vitest run tests/contracts/training-curriculum.test.ts --no-file-parallelism --maxWorkers=1`
  - Training validation:
    - `pnpm run validate:curriculum`
  - Training Copy validation:
    - 実装後の `git rev-parse HEAD` が示す完全SHAを使用する。
    - `pnpm run training:copy:prepare -- --source-sha <implementation-commit-sha> --target <temporary-training-copy-directory>`
    - `pnpm run training:copy:validate -- --root <temporary-training-copy-directory>`
    - 生成された `<temporary-training-copy-directory>/.github/workflows/training-native-ci.yml` が変更後テンプレートと完全一致し、v5.7.0完全SHAを含むことを確認する。
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
  - GitHub-hosted runner runtime compatibility:
    - 対象ブランチをrefとして `.github/workflows/native-ci.yml` を `workflow_dispatch` で実行する。
    - このdispatchは変更対象Training templateそのものの実行確認ではなく、同じsetup-java v5.7.0 / Java 17 / GitHub-hosted runnerを使用する既存Native CI経路でのruntime互換性確認として扱う。
    - `Android Automation Build` がPASSすることを確認する。
    - `Android Production-validation Build` がPASSすることを確認する。
    - setup-java stepが正常に完了し、v5自身のNode 24 runtimeに起因するrunner互換性エラーがないことを確認する。必要に応じてjobの `Set up job` / setup-javaログからGitHub-hosted runnerがv5の要求を満たしていることを確認する。
    - Java 17がセットアップされ、後続のリポジトリ側Node 24環境およびAndroid buildと共存していることを確認する。
    - `gradle/actions/setup-gradle` のcache処理が既存設定のままエラーなく完了することを確認する。setup-java自身の `cache:` は未使用のままとし、cache hit/miss自体は判定条件にしない。
- 成功判定:
  - Training workflowがv5.7.0完全SHAに移行し、旧v4 SHAがworkflowとallowlistから除去されている。
  - focused test、`validate:curriculum`、Training Copy validation、`test:contracts`、type/lint/security checksがすべてPASSする。
  - Disposable Training Copy内のactive `training-native-ci.yml` が変更後テンプレートと完全一致し、既存Training workflow contractをPASSする。
  - 手動dispatchしたNative CIのAndroid Automation / Production-validation buildがPASSし、setup-java v5自身のNode 24 runtime、Java 17、リポジトリ側Node 24、GitHub-hosted runner、既存Gradle cache経路に互換性エラーがない。
  - 完全SHA固定と既存security contractが維持されている。

## 7. リスクと未解決論点

- Risks:
  - Workflowだけv5へ変更すると `APPROVED_TRAINING_ACTIONS` と不整合になり、Training contractが失敗する。workflowとallowlistは同一変更で更新する。
  - allowlistを `actions/setup-java@v5` のようなmutable refに緩和すると、PR #44で導入した完全SHA固定ポリシーを後退させる。exact SHAのみ許可する。
  - `training/github-actions/training-native-ci.yml` はSource Repositoryで直接実行されるworkflowではないため、正式Native CIのdispatch結果だけでは変更後Training templateの検証にならない。既存Training Copy生成・検証経路を必須にしてテンプレート自体を確認する。
  - 正式 `.github/workflows/native-ci.yml` は本Issueで変更せず、既にv5.7.0を使用している。そのためdispatch結果はPR差分そのものの回帰テストではなく、v5のGitHub-hosted runner上のruntime互換性を確認する補助証拠として扱う。
  - setup-java v5自身のNode 24 runtimeと、workflowの `NODE_VERSION: 24` で設定するリポジトリ側Node runtimeを混同すると、何を検証したか不明確になる。両者を別の確認対象として扱う。
  - v5はrunner v2.327.1以上を要求する。GitHub-hosted runnerでsetup-java step自体が正常完了することを最低条件とし、runner runtime起因で失敗した場合はv5互換性未確認として扱う。
  - Training workflowではsetup-java自身のdependency cacheを使用していないため、「setup-java cacheのhit」を確認対象にしない。既存Gradle cache経路の正常動作と、cache構成を変更していないことだけを確認する。
  - cache hit/missはGitHub側のcache状態で変わるため、hitを要求すると不安定な完了条件になる。
  - v6.0.0が既に公開されているが、本Issueへv6移行を追加すると目的と変更範囲が広がる。本Issueでは既存Native CIと整合するv5.7.0へ限定する。
- Open questions:
  - なし。v5で実ランナー上の失敗が出た場合のみ、その失敗を根拠に追加対応の必要性を再評価する。

## 8. 成果物

- 変更ファイル:
  - `training/github-actions/training-native-ci.yml`
  - `scripts/training/workflow-contract.ts`
  - `tests/contracts/training-curriculum.test.ts`
- 付随ドキュメント / evidence:
  - 本計画書 `docs/plans/2026-08-26_205200_setup-java-v5-training-compatibility.md`
  - Training Copy validation結果。
  - Native CI `workflow_dispatch` のAndroid Automation / Production-validation build結果。
  - Issue #46用PR本文に、実施したvalidationと上記runtime確認結果を記載する。

## 9. 備考

- 本対応は `actions/setup-java` v5互換性確認とTraining Native CIの移行だけを対象とする。
- `actions/setup-java` v6.0.0は公開済みだが、本Issueでは対応しない。必要であれば別Issueで移行可否を検討する。
- 実装中に別のAction upgradeやCI改善点を見つけても、本Issueの完了に必須でなければ別Issueへ分離する。
- 実装差分は必要最小限とし、既に通常Native CIで成立している構成と既存Training Copy検証経路を再利用する。