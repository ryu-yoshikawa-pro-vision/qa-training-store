# Plan

## Objective

- 指定された実装計画を正本として、Issue #46のTraining Native CIを`actions/setup-java` v5.7.0へ最小差分で移行する。
- 既存PR #70の指定ブランチへ変更を反映し、最終HEADをLocal / contract、Training Copy、GitHub-hosted Native CIで検証する。

## Scope

### In

- `training/github-actions/training-native-ci.yml`のsetup-java参照だけをv5.7.0完全SHAへ更新する。
- `scripts/training/workflow-contract.ts`のTraining action allowlistだけを同じ完全SHAへ更新する。
- `tests/contracts/training-curriculum.test.ts`へ、v5固定と旧v4拒否の最小回帰テストを追加する。
- 上記変更に対する指定Local / contract validation、final branch diff、Disposable Training Copy validation、既存Native CIの`workflow_dispatch`、PR #70のSHA確認を行う。

### Out

- 指定プランのNon-goals全般。特に`.github/workflows/native-ci.yml`、依存・lockfile、他Action、Java / Node / pnpm / Gradle / Android SDK / Maestroのバージョン、cache、build / emulator / Maestroフロー、validatorのsecurity boundaryは変更しない。
- 新しいPRの作成、PR #44の変更、scope外の既存問題の修正。
- 指定プラン自体の変更（実装上の事実誤認が判明しない限り変更しない）。

## Assumptions

- 現在のブランチ`chore/issue-46-setup-java-v5-compatibility`がPR #70のhead branchであり、PR #70へ反映する。新しいPRは作成しない。
- 現在のworking treeは初期確認後、Run artifact以外の未コミット差分を持たない。
- 通常Native CIで既に使われている`b6effb05e454b25005698d916606bdc6ffcbf961`が、指定プラン記載のv5.7.0完全SHAである。
- GitHub Actions runtime validationは外部GitHub状態に依存するため、失敗時は最初の異常とv5互換性起因かを分離して記録する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存PRの本文更新は、プランの成果物欄にある検証結果を反映するため、最終検証後に行う。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Training workflowとallowlistを同じv5.7.0完全SHAへ更新すれば、既存のTraining workflow security boundaryを維持したままcontractを通過する。
- H2: 既存Native CIのsetup-java v5.7.0 / Java 17 / Node 24 / Gradle cache / Android build経路は、指定refでのdispatchにより互換性確認できる。

## Research Plan

- Round 1: branch / PR / working tree、PROJECT_CONTEXT、最近のADR / Run、指定プラン、対象workflow・validator・回帰テストを確認する。
- Round 2: 3ファイルの最小差分を実装し、diff triageとdeep self-reviewでsecurity boundary、非意図変更、test gapを確認する。
- Round 3: 指定Local validation、commit後のfinal diff、最終SHAでTraining Copy、push後のNative CI dispatchとjob/log結果、PR head SHAを確認する。
- Exit Criteria:
  - 指定3ファイル以外に実装差分がなく、v5 exact SHAと旧v4拒否がcontractで確認できる。
  - 指定Local / contract validationが全てPASSする。
  - 最終SHAでfinal diffとTraining Copy validationがPASSする。
  - dispatch対象commitが最終SHAと一致し、Android Automation / Production-validation BuildがPASSする。
  - PR #70 head SHAと検証済み最終ブランチHEADが一致する。

## Approach

1. 指定プランを変更せずに現行実装との整合を確認する。
2. 3つの変更対象だけを最小差分で編集する。
3. `code-review` skillのdiff triage / deep review手順で自己レビューする。
4. プラン記載順のLocal / contract validationを実行し、失敗時は原因分類と安全な最小修正を行う。
5. 変更を対象ブランチへcommitし、commit直前・push直前にbranch safetyを再確認する。
6. 同じ最終SHAでTraining CopyとNative CI dispatchを検証し、外部PR metadataへ結果を反映する。

## Definition of Done

- 指定プランのDoDを全て満たす。
- `actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961 # v5.7.0`、`distribution: temurin`、`java-version: "17"`がTraining Native CIに存在する。
- validatorは旧v4を許可せず、完全SHA allowlistを維持する。
- Training workflowのpermissions、checkout、runner、Node / pnpm、Android / Maestro、cache / build / evidence契約に意図変更がない。
- PR #70に最終検証結果を記載し、PR head SHAと検証済み最終HEADが一致する。

## Risks / Unknowns

- GitHub-hosted runnerやAndroid buildの一時的失敗をsetup-java v5の互換性問題と誤認しないため、workflow runの対象commit、最初の失敗step、setup-java / Java / Node / Gradle cacheログを確認する。
- validation後にHEADが変わると証跡が無効になるため、最終HEADを固定し、変更が発生した場合はTraining Copyとdispatchを新SHAで再実行する。
- `.codex/runs/`は正式Run artifactとして保存するが、コード差分のscope判定から分離する。

## Thinking Log

- 2026-08-26: 対象ブランチはPR #70のheadと一致し、working treeは初期時点でcleanだった。既存のIssue #46用active Runはなかったため、Strict implementation Runを新規初期化した。
- 2026-08-26: 指定プランは133行を最後まで確認した。現行Training workflow / allowlistは旧v4 SHAで一致し、通常Native CIは指定v5.7.0 SHAを既に使用しているため、3ファイルの局所変更で実装可能と判断した。
- 2026-08-26: Native delegation markerが`No child subagent delegation`のため、read-only subagentは起動しない。レビューは親agentが`code-review` skillを用いて実施する。
