# Issue #73 Expo SDK 57 dependency alignment 実装計画

## 0. 依頼概要

- 対象Issue: #73 `fix: Expo Doctor の依存バージョン不整合を解消する`
- 作業ブランチ: `fix/issue-73-expo-sdk-57-dependency-alignment`
- branch作成時baseline: `main` の `c0fea8a489286f829cc5e6cb5c5a95aa31465143`
- 背景: PR #70 のNative CI検証で、`Native Static / Run Expo Doctor` がExpo SDK 57の要求versionとの差分を検出してFAILした。
- 目的: Expo SDK 57が要求する依存versionへ必要最小限で整合させ、Expo Doctorと既存Web / Native品質ゲートを正常化する。
- 対応単位: 原則1 PRで完了する。Issue #73の範囲だけでは安全に完了できない互換性問題が実際に確認された場合のみ分離する。

## 1. 現状

Issue作成時の `pnpm dlx expo-doctor@1.17.6` では以下12 packageのpatch version mismatchが確認されている。

| package | expected | baseline |
| --- | --- | --- |
| `@expo/metro-runtime` | `~57.0.14` | `57.0.13` |
| `expo` | `~57.0.17` | `57.0.16` |
| `expo-build-properties` | `~57.0.15` | `57.0.14` |
| `expo-constants` | `~57.0.15` | `57.0.14` |
| `expo-dev-client` | `~57.0.16` | `57.0.15` |
| `expo-linking` | `~57.0.8` | `57.0.7` |
| `expo-router` | `~57.0.17` | `57.0.16` |
| `expo-sqlite` | `~57.0.2` | `57.0.1` |
| `expo-system-ui` | `~57.0.3` | `~57.0.2` |
| `react-native` | `0.86.3` | `0.86.2` |
| `eslint-config-expo` | `~57.0.2` | `57.0.1` |
| `jest-expo` | `~57.0.5` | `57.0.4` |

関連する既存仕様:

- RepositoryのCIはNode 24、pnpm 9.10.0を使用する。
- `package.json` / `pnpm-lock.yaml` の変更はNative changeとして検知される。
- `Native Static` はfrozen install、Native component tests、route dependency check、EAS config validation、Expo Doctorを実行する。
- Web CIはVitest、build、E2E等の既存品質ゲートを実行する。
- `package.json` の `pnpm.overrides` には `expo-constants` 固定と、Issue #68で導入したMetro 0.84.5のparent-scoped overrideが存在する。
- Issue #68では対象2 GHSAにaffectedなresolved `image-size` instanceを0件にすることを安全条件としている。本IssueのReact Native更新でこれを再発させてはならない。

## 2. ゴール / Definition of Done

### ゴール

実装開始時点のcurrent Expo Doctor要求を正本として、必要なdirect dependency / devDependencyだけをExpo SDK 57互換versionへ更新し、Issue #68のsecurity remediationと既存Web / Native CIを維持する。

### Definition of Done

- [ ] 実装開始時点でlatest `origin/main` を含み、working treeがcleanである。
- [ ] Local実行環境がNode 24系、pnpm 9.10.0である。
- [ ] 変更前に `pnpm dlx expo-doctor@1.17.6` を実行し、current mismatchを確定している。
- [ ] 変更前にIssue #68対象2 GHSAにaffectedなresolved `image-size` instanceが0件である。
- [ ] Expo Doctorが要求するdirect dependency / devDependencyだけを必要最小限更新している。
- [ ] `pnpm.overrides.expo-constants` は削除せず、更新後のdirect `expo-constants`と同じversionへ同期している。
- [ ] React Native更新後も対象2 GHSAにaffectedなresolved `image-size` instanceが0件である。
- [ ] affected `image-size` instanceが0件ならMetro overrideを追加・変更・cleanupしていない。
- [ ] affected instanceが再発した場合のみ、Issue #68の既存remediationを維持するために必要な最小parent-scoped selectorを修正している。
- [ ] `expo.install.exclude`、Expo Doctor skip、CI gate緩和を使用していない。
- [ ] Issueと無関係なmajor / minor upgrade、dependency cleanup、stale override cleanupを混在させていない。
- [ ] `pnpm-lock.yaml` はpnpm 9.10.0で正規再生成され、2回目の再生成で追加diffが発生しない。
- [ ] `pnpm install --frozen-lockfile` がPASSする。
- [ ] `pnpm dlx expo-doctor@1.17.6` が17/17 PASSする。
- [ ] 必要なtargeted Local validationがPASSする。
- [ ] plan / Run artifactを含むtracked fileをfinalizeした後にfinal commitを作成している。
- [ ] final commit後、記録したbaseline SHAからの最終diffをレビューし、working treeがcleanである。
- [ ] PR head SHAがfinal branch HEAD SHAと一致している。
- [ ] そのfinal branch HEADに対応する最新PR Web CI / Mobile App CIがPASSする。
- [ ] 最終PR changed filesがIssue #73に必要なdependency変更、plan、Repository運用上必要なRun artifactだけに限定されている。

## 3. 変更対象

### 実装対象

- `package.json`
  - current Expo Doctorが要求するdirect dependency / devDependencyのversion整合。
  - `pnpm.overrides.expo-constants` をdirect `expo-constants`と同versionへ同期。
  - React Native更新後にaffected `image-size` instanceが再発した場合のみ、Issue #68の既存remediationを維持するためのparent-scoped Metro selectorを最小修正。
- `pnpm-lock.yaml`
  - 上記変更に伴う正規lockfile差分。
- `.codex/runs/<run_id>/...`
  - Repository運用上必要なRun artifactのみ。
- 本plan

### 参照のみ

- Issue #73
- Issue #68
- `docs/plans/2026-08-26_200933_metro-0.84.5-image-size-remediation.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `package.json`
- `pnpm-lock.yaml`

### 原則変更しない

- Application / domain / presentation code
- Web / Native CI workflow
- Android / iOS native project設定
- Maestro flow
- test code
- Expo Doctor設定
- `expo.install.exclude`
- Issue #73完了に不要な既存override

## 4. 非ゴール

- Expo SDKのmajor / minor upgrade。
- React Nativeの0.86.3を超えるupgrade。
- Expo Doctorのversion変更。
- `expo install --fix` の結果を無検証でそのまま採用すること。
- `pnpm update --latest` / `pnpm audit --fix` 等のbroad update。
- Expo Doctor警告のignore / exclude化。
- CI gateのskip / allow-failure化。
- `expo-constants` overrideの削除可否の再設計。
- affected instance再発と無関係なMetro override cleanup。
- Issue #68のsecurity remediation自体の再調査・再設計。
- Issue #73と無関係なsecurity alert、dependency、code cleanup。

## 5. 実装手順

### Task 1: baselineと実行環境を固定する

以下を確認する。

    git fetch origin main
    git branch --show-current
    git status --short
    node --version
    pnpm --version

条件:

- branchは `fix/issue-73-expo-sdk-57-dependency-alignment`。
- working treeはclean。
- Node majorは24。
- pnpmは9.10.0。
- `origin/main` がHEADの祖先であること。
- mainが進んでいる場合は実装開始前にlatest mainを安全に取り込む。
- latest main取込後の `origin/main` SHAを実装baseline SHAとして記録する。

既存未commit変更がある場合はstash / discard等で自動処理せずBlockerとして停止する。

### Task 2: Expo Doctorのcurrent failureを再確認する

    pnpm install --frozen-lockfile
    pnpm dlx expo-doctor@1.17.6

- Issue記載の12 mismatchがcurrentでも成立するか確認する。
- 要求versionが変化している場合はcurrent Expo Doctor結果を正本とする。
- mismatchが減っている場合は残っている対象だけを更新する。
- 別種のfailureが先に出た場合はdependency編集前に原因を切り分ける。

### Task 3: Issue #68のbaseline安全条件だけを確認する

    pnpm list image-size --depth Infinity --json

Issue #68で対象とした2 GHSAのaffected rangeに該当するresolved `image-size` instanceが0件であることを確認する。

baseline時点でaffected instanceが存在する場合は、本Issueのdependency更新前からIssue #68の前提が崩れているため、Issue #73へ混ぜずBlockerとして報告する。

この時点ではMetro dependency graphの詳細調査を行わない。

### Task 4: Expo Doctor対象dependencyだけを更新する

current Expo Doctor要求に従い、対象direct dependency / devDependencyだけを更新する。

Issue作成時の候補:

- `@expo/metro-runtime`: `57.0.13` -> `57.0.14`
- `expo`: `57.0.16` -> `57.0.17`
- `expo-build-properties`: `57.0.14` -> `57.0.15`
- `expo-constants`: `57.0.14` -> `57.0.15`
- `expo-dev-client`: `57.0.15` -> `57.0.16`
- `expo-linking`: `57.0.7` -> `57.0.8`
- `expo-router`: `57.0.16` -> `57.0.17`
- `expo-sqlite`: `57.0.1` -> `57.0.2`
- `expo-system-ui`: `~57.0.2` -> `~57.0.3`
- `react-native`: `0.86.2` -> `0.86.3`
- `eslint-config-expo`: `57.0.1` -> `57.0.2`
- `jest-expo`: `57.0.4` -> `57.0.5`

ルール:

- current Expo Doctor結果が異なる場合はcurrent要求を優先する。
- 既存exact pinは表示上の`~`だけを理由にrangeへ変えない。
- baselineでrangeを使う`expo-system-ui`は同じrange形式を維持する。
- Expo Doctor対象外packageを「同じfamilyだから」という理由で追加更新しない。

### Task 5: `expo-constants` overrideを同期する

本Issueではoverrideの必要性を再設計しない。

- direct `expo-constants` をcurrent要求versionへ更新する。
- `pnpm.overrides.expo-constants` も必ず同versionへ更新する。
- overrideを削除しない。
- overrideのscopeを変更しない。

### Task 6: lockfileを生成し、Issue #68の安全条件を再確認する

Task 4 / 5後、既存Metro overrideを変更せず以下を実行する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile
    pnpm list image-size --depth Infinity --json

#### affected instanceが0件の場合

- Metro overrideを追加しない。
- Metro overrideを変更しない。
- React Native更新により旧parent selectorがno-opになっていてもcleanup目的で削除しない。
- Task 7へ進む。

#### affected instanceが再発した場合

この場合だけ原因を調査する。

    pnpm why react-native
    pnpm why @react-native/community-cli-plugin
    pnpm why @react-native/metro-config
    pnpm why metro
    pnpm why metro-config
    pnpm why metro-core
    pnpm why image-size

- Issue #68で除去したMetro経路がReact Native patch更新により再発したものなら、そのaffected pathを除去するために必要な最小parent-scoped selectorだけを修正する。
- baseline selectorを機械的に新parent versionへ置換しない。
- global Metro overrideへ変更しない。
- 必要性を説明できないselectorを追加しない。
- 別系統の新しいaffected pathで、Issue #68 remediationの単純維持では解消できない場合はIssue #73へsecurity remediationを拡張せずBlockerとして報告する。

selectorを修正した場合は以下を実行する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile
    pnpm list image-size --depth Infinity --json

最終条件は対象2 GHSAにaffectedなresolved `image-size` instanceが0件であること。

### Task 7: lockfileを安定化する

Task 6で最終package構成に対するlockfileを生成済みの状態から、同じコマンドをもう1回実行する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

2回目で `package.json` / `pnpm-lock.yaml` に追加diffが発生しないことを確認する。

その後:

    pnpm install --frozen-lockfile

確認事項:

- Issue #73対象packageと必然的なtransitive差分だけである。
- 無関係なimporter / snapshot / integrity / peer resolution変更がない。
- frozen installがPASSする。

### Task 8: targeted Local validationを実行する

以下を実行する。

    pnpm dlx expo-doctor@1.17.6
    pnpm list image-size --depth Infinity --json
    pnpm run test:component:native
    pnpm run check:native-route-dependencies
    pnpm run validate:eas:config
    pnpm run validate:native-production-bundle
    pnpm run typecheck
    pnpm run build:web

期待結果:

- Expo Doctor 17/17 PASS。
- current mismatch 0件。
- 対象2 GHSAにaffectedなresolved `image-size` instance 0件。
- Native component / route / EAS / production bundle validation PASS。
- typecheck PASS。
- Web build PASS。

ローカルで以下は重複実行しない。

- `pnpm run verify`
- `pnpm run test:e2e:chromium`
- Android / iOS native実build
- Maestro runtime

これらは最終PRのWeb CI / Mobile App CIで判定する。

## 6. final commit / 最終差分 / PR

### Task 9: tracked fileをfinalizeしてfinal commitを作成する

Local validation結果を含め、Repositoryへ含めるtracked fileをすべて確定する。

想定対象:

- `package.json`
- `pnpm-lock.yaml`
- 本plan
- Repository運用上必要な `.codex/runs/<run_id>/...`

その後final commitを作成し、以下を記録する。

    git rev-parse HEAD

これをfinal branch HEAD SHAとする。

### Task 10: final commitに対して最終diff reviewを行う

Task 1で記録した実装baseline SHAを `<baseline-sha>` として使用する。

    git diff --check <baseline-sha>...HEAD
    git diff --name-only <baseline-sha>...HEAD
    git diff <baseline-sha>...HEAD -- package.json pnpm-lock.yaml
    git status --short

条件:

- working treeがclean。
- Application code / CI workflow / test skip / ignore / exclude変更なし。
- `expo-constants` override削除なし。
- affected instanceが再発していない場合はMetro override変更なし。
- lockfileに不要な広範囲diffなし。
- plan / Run artifactを含む最終changed filesがIssue #73の範囲内。

### Task 11: push / PR作成

- final branch HEADをpushする。
- Issue #73をcloseする前提でPRを作成する。
- PR head SHAがfinal branch HEAD SHAと一致することを確認する。
- GitHub上のPR changed filesも想定範囲内であることを確認する。

この後、PR CI結果をRun artifactへ追記するためだけのcommitは作らない。CI結果はPR本文などGitHub metadataへ記録する。

tracked fileを変更した場合は新しいcommitをfinal branch HEADとして扱い直し、Task 10以降をやり直す。

## 7. PR上の検証

### Task 12: Web CI

final branch HEADに対応する最新PR Web CIを確認する。

既存workflowが要求するWeb品質ゲートがすべてPASSすること。

主な確認対象:

- Dependency Review
- Style Quality
- Code Quality
- Vitest各suite
- Web build
- Chromium E2Eを含む既存E2E

Dependency Reviewで本変更による新規moderate以上の脆弱性が検出された場合は採用しない。

### Task 13: Mobile App CI

`package.json` / `pnpm-lock.yaml` がNative changeとして検知され、final branch HEADに対応する最新PR runで既存Native gateがすべてPASSすること。

主な確認対象:

- Native Static
  - `Run Expo Doctor` を含む
- Android Automation Build
- Android Production-validation Build
- Production Bundle Guard
- Android Runtime / Maestro
- Native iOS CI
  - iOS Automation Build
  - iOS Production-validation Build
  - iOS Native CI Verify
- `native-ci / verify`

`pull_request` workflowはGitHubのPR merge resultを実行し得るため、「final branch HEAD SHAそのものをcheckoutして実行した」とは記載しない。

確認するprovenance:

- PR head SHAがfinal branch HEAD SHAと一致している。
- 最新PR CIがそのfinal head更新後のPR状態に対応している。
- PR merge result上で既存Web / Native gateがPASSしている。

特定jobの手動dispatchをPR CI全体の代替にしない。

## 8. 失敗時の扱い

### Expo DoctorがPASSしない

- current要求versionとresolved graphを確認する。
- exclude / skip / ignoreで回避しない。
- 追加dependency updateはIssue #73との直接因果を説明できるものだけ検討する。

### React Native 0.86.3で互換性問題が発生する

- first failureを特定する。
- React Native / Expoをさらにupgradeして回避しない。
- Application code / CIへ修正を広げる前に、0.86.3自体の互換性かlockfile / peer resolutionかを切り分ける。
- `@react-native/jest-preset` 等のExpo Doctor対象外packageを根拠なく更新しない。
- Issue #73の範囲で安全に解消できない場合はBlockerとして報告する。

### affected `image-size` instanceが再発する

- この場合だけ`pnpm why`系でactual parent pathを特定する。
- Issue #68の既存remediationの単純維持で解消できる場合だけ最小parent-scoped selectorを修正する。
- 別の新規security remediationが必要ならIssue #73へ混ぜずBlockerとして報告する。

### 無関係な既存CI failure

- first failureと本変更の因果関係を確認する。
- 無関係なfailureを本PRで修正しない。
- dependency更新が影響し得るfailureを根拠なく既存扱いしない。

## 9. 想定変更ファイル

原則:

- `package.json`
- `pnpm-lock.yaml`
- `.codex/runs/<run_id>/...`
- `docs/plans/2026-08-27_092000_expo-sdk-57-dependency-alignment.md`

追加ファイルが必要になった場合はIssue #73完了に不可欠であることを説明できる場合だけ許容する。

## 10. 完了時にPR本文へ残す情報

- Issue #73との対応関係。
- 実装baseline SHA。
- baselineと更新後のcurrent mismatch対象version。
- `expo-constants` direct / overrideを同versionへ同期したこと。
- 対象2 GHSAにaffectedなresolved `image-size` instanceが0件であること。
- Metro override変更有無。変更した場合は再発したactual pathと変更selector。
- Expo Doctor 17/17 PASS。
- lockfile安定性 / frozen install結果。
- targeted Local validation結果。
- final branch HEAD SHA。
- PR head SHAがfinal branch HEAD SHAと一致していること。
- Web CI / Mobile App CI結果。
- PR merge result上で既存gateがPASSしたこと。
- 最終changed filesがscope内であること。
