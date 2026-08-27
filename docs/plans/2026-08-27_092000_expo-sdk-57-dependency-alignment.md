# Issue #73 Expo SDK 57 dependency alignment 実装計画

## 0. 依頼概要

- 対象Issue: #73 `fix: Expo Doctor の依存バージョン不整合を解消する`
- 作業ブランチ: `fix/issue-73-expo-sdk-57-dependency-alignment`
- branch作成時baseline: `main` の `c0fea8a489286f829cc5e6cb5c5a95aa31465143`
- 背景: PR #70 のNative CI検証で、`Native Static / Run Expo Doctor` がExpo SDK 57の要求versionとの差分を検出してFAILした。
- 目的: Expo SDK 57が要求する依存versionへ必要最小限で整合させ、Expo Doctorと既存Web / Native品質ゲートを正常化する。
- 対応単位: 原則1 PRで完了する。実際の互換性問題によりIssue #73の範囲だけでは安全に完了できない場合のみ分離を検討する。

## 1. 現状

branch作成時baselineの `pnpm dlx expo-doctor@1.17.6` では、以下12 packageのpatch version mismatchが確認されている。

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

baselineの関連事項:

- package managerは `pnpm@9.10.0`。
- Native CIは `package.json` / `pnpm-lock.yaml` の変更をNative changeとして扱う。
- `Native Static` はfrozen install、Native component tests、route dependency check、EAS config validation、Expo Doctorを実行する。
- Web CIはdependency review、format、lint、typecheck、tests、security、Web build等を実行する。
- `package.json` の `pnpm.overrides` には `expo-constants: 57.0.14` の固定と、Issue #68で導入したMetro `0.84.5` のparent-scoped overrideが存在する。
- Issue #68で除去した `metro@0.84.4 -> image-size@1.2.1` のaffected pathを、本IssueのReact Native更新で再発させてはならない。

## 2. ゴール / 完了条件

### ゴール

実装開始時点のcurrent Expo Doctor要求を正本として、必要なdirect dependency / devDependencyだけをExpo SDK 57互換versionへ更新し、既存の依存制約とWeb / Android / iOS / Maestro品質ゲートを維持する。

### Definition of Done

- [ ] 実装開始時点でlatest `origin/main` を含み、working treeがcleanである。
- [ ] 変更前に `pnpm dlx expo-doctor@1.17.6` を実行し、current mismatchを確定している。
- [ ] current direct dependency / override / resolved graphを確認してから編集している。
- [ ] Expo Doctorが要求するpackageだけを必要最小限更新している。
- [ ] `pnpm.overrides.expo-constants` は削除せず、更新後のdirect `expo-constants`と同じversionへ同期している。
- [ ] React Native更新後にIssue #68のMetro remediationを確認し、affected pathが再発していない場合はMetro overrideを追加・変更していない。
- [ ] affected Metro pathが実際に再発した場合のみ、そのpathを除去するために必要な最小parent-scoped selectorを修正している。
- [ ] `expo.install.exclude`、Expo Doctor skip、CI gate緩和を使用していない。
- [ ] Issueと無関係なmajor / minor upgrade、dependency cleanup、stale override cleanupを混在させていない。
- [ ] `pnpm-lock.yaml` はpnpm 9.10.0の指定手順で正規に再生成され、不要なsemantic dependency changeがない。
- [ ] lockfile再生成操作の2回目で追加diffが発生しない。
- [ ] `pnpm install --frozen-lockfile` がPASSする。
- [ ] `pnpm dlx expo-doctor@1.17.6` が17/17 PASSする。
- [ ] Issue #68で成立したMetro `0.84.5` remediationが維持され、affected `metro@0.84.4 -> image-size@1.2.1` pathが再発していない。
- [ ] Local Web / Native品質ゲートがPASSする。
- [ ] plan / Run artifactを含むtracked fileをすべてfinalizeした後に最終commitを作成し、final HEAD SHAを固定している。
- [ ] final HEAD SHAをpushした後、Repositoryのtracked fileを追加更新していない。
- [ ] PR上のWeb CIがfinal HEAD SHAでPASSする。
- [ ] PR上のMobile App CIでNative Static、Android Automation / Production-validation Build、Production Bundle Guard、Android Runtime / Maestro、Native iOS CI、`native-ci / verify` がfinal HEAD SHAでPASSする。
- [ ] 最終PR差分が本Issueに必要なdependency変更とplan / Run artifactだけに限定されている。

## 3. 変更対象

### 実装対象

- `package.json`
  - Expo Doctorが要求するdirect dependency / devDependencyのversion整合。
  - `pnpm.overrides.expo-constants` をdirect `expo-constants`と同じversionへ同期。
  - React Native更新後にIssue #68のaffected Metro pathが実際に再発した場合のみ、必要なparent-scoped Metro selectorを最小修正。
- `pnpm-lock.yaml`
  - 上記 `package.json` の変更に伴う正規lockfile差分。
- `.codex/runs/<run_id>/`
  - Repository運用上必要なRun artifactのみ。
- 本plan
  - 実装前レビューで確定した手順を正本とする。

### 参照のみ

- Issue #73
- `docs/plans/2026-08-26_200933_metro-0.84.5-image-size-remediation.md`
- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `app.config.ts`
- `metro.config.cjs`
- `scripts/validate-native-production-bundle.ts`

### 原則変更しない

- Application / domain / presentation code
- Web / Native CI workflow
- Android / iOS native project設定
- Maestro flow
- test code
- Expo Doctor設定
- `expo.install.exclude`
- Issue #73完了に不要な既存override

互換性不具合が確認された場合も、原因を特定する前に変更範囲を広げない。

## 4. 非ゴール

- Expo SDKのmajor / minor upgrade。
- React Nativeの0.86.3を超えるupgrade。
- Expo Doctorのversion変更。
- `expo install --fix` の結果を無検証でそのまま採用すること。
- `pnpm update --latest` / `pnpm audit --fix` 等のbroad update。
- Expo Doctor警告のignore / exclude化。
- CI gateのskip / allow-failure化。
- Metro / image-size remediationの再設計。
- `expo-constants` overrideの削除可否を本Issueで再設計すること。
- affected path再発と無関係なMetro override cleanup。
- Issue #73と無関係なsecurity alert、dependency、code cleanupの同時対応。

## 5. 実装前調査

### Task 1: baselineを固定する

1. `git fetch origin main` を実行する。
2. current branchが `fix/issue-73-expo-sdk-57-dependency-alignment` であることを確認する。
3. working treeがcleanであることを確認する。
4. `origin/main` がHEADの祖先であることを確認する。
5. branch作成後にmainが進んでいる場合は、実装開始前にlatest mainを取り込む。
6. 実装開始時のbaseline SHAを記録する。

既存未commit変更がある場合はstash / discard等で自動処理せずBlockerとして停止する。

### Task 2: Expo Doctorのbaseline failureを再確認する

以下を実行する。

    pnpm install --frozen-lockfile
    pnpm dlx expo-doctor@1.17.6

- Issue #73記載の12 mismatchがcurrentでも成立するか確認する。
- 要求versionが変化している場合は、Issue作成時のversionを固定採用せずcurrent Expo Doctor結果を正本とする。
- mismatchが減っている場合は残っている対象だけを更新する。
- Issue #73とは別種のfailureが出た場合は、dependency更新前に原因を切り分ける。

### Task 3: current dependency graphを確認する

編集前に以下を確認する。

- mismatch対象packageのdirect declarationとresolved version。
- root `expo-constants` と `pnpm.overrides.expo-constants` が同じversionを固定していること。
- `react-native` から解決される以下の実version。
  - `@react-native/community-cli-plugin`
  - `@react-native/metro-config`
  - Metro family
- Issue #68で導入したparent-scoped Metro overrideがどのedgeへ適用されているか。
- `image-size` resolved instanceとMetroからの到達path。

少なくとも以下を利用する。

    pnpm why react-native
    pnpm why @react-native/community-cli-plugin
    pnpm why @react-native/metro-config
    pnpm why metro
    pnpm why image-size

この時点でbaselineのMetro / image-size graphを記録し、更新後比較に使用する。

## 6. 変更方針

### Task 4: Expo Doctor対象direct dependencyだけを更新する

current Expo Doctor要求に従い、対象direct dependency / devDependencyだけを更新する。

Issue作成時の候補は以下。

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

version declarationは既存Repositoryの形式を維持する。

- exact pinは、Expo Doctor表示が`~`であることだけを理由にrangeへ変えない。
- baselineでrangeを使用している `expo-system-ui` は同じrange形式を維持する。
- Expo Doctor対象外packageを「同じfamilyだから」という理由で追加更新しない。

### Task 5: `expo-constants` overrideをdirect dependencyと同期する

baselineには以下が存在する。

- direct dependency: `expo-constants = 57.0.14`
- `pnpm.overrides.expo-constants = 57.0.14`

本Issueではoverrideの必要性を再設計しない。

- direct `expo-constants` をcurrent Expo Doctor要求versionへ更新する。
- `pnpm.overrides.expo-constants` も必ず同じversionへ更新する。
- overrideを削除しない。
- overrideのscope変更を行わない。

Issue作成時の要求が維持されている場合は、両方を `57.0.15` へ同期する。

### Task 6: direct dependency更新だけでlockfileを一度生成する

Task 4 / 5の変更後、Metro overrideはまだ変更せず、まずlockfileを生成する。

使用するコマンドは以下に固定する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

この状態でReact Native更新後のactual graphを確認する。

### Task 7: React Native更新後のMetro remediationを判定する

Task 6で生成したgraphに対して以下を確認する。

    pnpm why react-native
    pnpm why @react-native/community-cli-plugin
    pnpm why @react-native/metro-config
    pnpm why metro
    pnpm why image-size

判断順序は以下に固定する。

#### A. affected pathが再発していない場合

以下が存在しない場合:

    metro@0.84.4 -> image-size@1.2.1

- Metro overrideを追加しない。
- Metro overrideを変更しない。
- React Native更新によって旧parent selectorがno-opになっていても、本Issueではcleanup目的で削除しない。
- current graphが安全であることだけを記録する。

#### B. affected pathが再発した場合

- 再発したactual parent edgeを特定する。
- Issue #68と同じ目的で、affected pathを除去するために必要な最小parent-scoped selectorだけを更新する。
- baselineに存在したselectorを機械的に新versionへ置換しない。
- global `metro` / `metro-config` overrideへ変更しない。
- 必要性を説明できないselectorを追加しない。

Metro selectorを修正した場合は、再度以下を実行してlockfileを生成する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

最終的に以下を満たすこと。

- affected `metro@0.84.4 -> image-size@1.2.1` pathが0件。
- Issue #68対応前の脆弱resolutionが再発していない。
- Metro familyを必要以上に変更していない。

## 7. lockfile確定

### Task 8: pnpm 9.10.0でlockfileを安定化する

`package.json` の最終内容確定後、以下を実行する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

1回目実行後の `package.json` / `pnpm-lock.yaml` diffを確認する。

続けて同じコマンドをもう1回実行する。

    pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile

2回目実行後に `package.json` / `pnpm-lock.yaml` へ追加diffが発生していないことを確認する。

その後、以下を実行する。

    pnpm install --frozen-lockfile

確認事項:

- 変更がIssue #73対象packageと、その必然的なtransitive dependency差分に限定されている。
- 無関係なimporter / snapshot / integrity / peer resolutionの変更がない。
- Metro / image-size resolutionが意図どおり維持されている。
- frozen installがPASSする。

## 8. ローカル検証

### Task 9: Expo / dependency検証

以下を実行する。

    pnpm dlx expo-doctor@1.17.6
    pnpm why react-native
    pnpm why metro
    pnpm why image-size

期待結果:

- Expo Doctor 17/17 PASS。
- Issue #73のcurrent mismatchが0件。
- Issue #68のaffected `image-size` pathが再発していない。

### Task 10: Native preflight

以下を実行する。

    pnpm run generate:native-assets
    git diff --exit-code -- src/generated/native-product-assets.ts
    pnpm run validate:image-manifest
    pnpm run test:component:native
    pnpm run check:native-route-dependencies
    pnpm run validate:eas:config
    pnpm run validate:native-production-bundle

可能なローカル環境では以下も確認する。

    pnpm exec expo export --platform ios

ローカルでiOS native buildを必須にはしない。実buildはPR上のNative iOS CIで判定する。

### Task 11: Repository標準品質ゲート

Repository標準の以下を実行する。

    pnpm run verify

`verify`が環境依存または本Issueと無関係な既存failureで停止した場合は、first failureを特定したうえで未到達の品質ゲートを個別実行し、本変更の検証を欠落させない。

最低限、本変更に対して以下の結果を取得する。

- format / markdown lint
- spec / curriculum validation
- lint / typecheck
- image manifest / security check
- unit / integration / repository / component / contract tests
- Web build / spec build

### Task 12: Web回帰

主要Chromium回帰を実行する。

    pnpm run test:e2e:chromium

dependency更新によるWeb runtime / bundleへの回帰がないことを確認する。

## 9. 差分レビュー

### Task 13: scopeとsemantic diffを確認する

実装完了後に以下を確認する。

    git diff --check main...HEAD
    git diff --name-only main...HEAD
    git diff main...HEAD -- package.json pnpm-lock.yaml

確認事項:

- dependency変更はIssue #73に必要なものだけ。
- Application codeを変更していない。
- CI workflowを変更していない。
- test skip / ignore / excludeを追加していない。
- Expo Doctorを通すための回避設定を追加していない。
- `expo-constants` overrideを削除していない。
- affected Metro pathが再発していない場合、Metro overrideを変更していない。
- affected Metro path再発によりselector変更が必要だった場合、その変更だけが追加されている。
- lockfileに不要な広範囲差分がない。

## 10. final HEAD固定とPR作成

### Task 14: tracked fileをfinalizeする

PR CIへ進む前に、Repositoryへ含めるtracked fileをすべて確定する。

対象には少なくとも以下を含む。

- `package.json`
- `pnpm-lock.yaml`
- 本plan
- Repository運用上必要な `.codex/runs/<run_id>/...`

Local validation結果をRun artifactへ記録する必要がある場合は、この時点までに記録する。

### Task 15: final commit / push / PR

1. tracked fileをすべてfinalizeした状態でcommitする。
2. `git rev-parse HEAD` でfinal HEAD SHAを記録する。
3. final HEAD SHAを対象branchへpushする。
4. Issue #73をcloseする前提のPRを作成する。
5. PR head SHAが記録したfinal HEAD SHAと一致することを確認する。

この時点以降、PR CI結果をRepository内のRun artifact等へ追記して新しいcommitを作らない。

PR本文の更新やCI結果の記録はGitHub上のPR metadataへ行う。

final HEAD固定後にやむを得ずtracked fileを変更した場合は、新しいHEADをfinal HEADとして扱い直し、その新しいSHAに対してPR CIを再確認する。

## 11. PR上の検証

### Task 16: Web CI

final HEAD SHAに対するPR Web CIを確認する。

最低限以下がPASSすること。

- Dependency Review
- Style Quality
- Code Quality
- Vitest各suite
- Web build / E2E等、workflowが要求する既存gate

Dependency Reviewで本変更による新規moderate以上の脆弱性が検出された場合は採用しない。

### Task 17: Mobile App CI

`package.json` / `pnpm-lock.yaml` の変更によりNative changeとして検知されることを確認し、final HEAD SHAに対して以下をすべてPASSさせる。

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

特定jobだけの手動dispatchを全体DoDの代替にしない。最終PR HEADに対するPR CI全体で判定する。

## 12. 失敗時の扱い

### Expo DoctorがPASSしない場合

- current要求versionとresolved graphを確認する。
- `expo.install.exclude`、skip、ignoreで回避しない。
- 追加dependency updateが必要なら、Issue #73との直接の因果関係を説明できるものだけ検討する。

### React Native 0.86.3で互換性問題が発生した場合

- first failureを特定する。
- Expo / React Nativeのversionをさらに上げて回避しない。
- Application codeやCIへ修正を広げる前に、0.86.3自体との互換性問題か、lockfile / peer resolution問題かを切り分ける。
- `@react-native/jest-preset` 等のExpo Doctor対象外packageも、実際のfailureとの因果関係を確認せず更新しない。
- Issue #73だけでは安全に解消できない場合は、無理に1 PRへ詰め込まずBlockerとして報告する。

### 既存Metro remediationが崩れた場合

- affected pathの再発をactual graphで確認する。
- 再発した場合だけ必要最小限のparent-scoped selectorを修正する。
- global overrideや別security remediationへ広げない。
- Issue #68と同等の「affected path 0件」を回復できない場合は採用しない。

### 無関係な既存CI failureが発生した場合

- first failureと本変更の因果関係を確認する。
- 無関係なfailureを本PRで修正しない。
- dependency更新が影響し得るfailureを根拠なく「既存」と扱わず、baselineとの差分で判断する。

## 13. 想定変更ファイル

原則として以下に限定する。

- `package.json`
- `pnpm-lock.yaml`
- `.codex/runs/<run_id>/...`
- `docs/plans/2026-08-27_092000_expo-sdk-57-dependency-alignment.md`

追加ファイル変更が必要になった場合は、Issue #73の完了に不可欠であることを説明できる場合だけ許容する。

## 14. 実装順序

1. latest main / clean working tree / baseline SHAを確認する。
2. baseline Expo Doctor failureを再現し、current mismatchを確定する。
3. mismatch対象、`expo-constants` override、React Native / Metro / image-size graphを記録する。
4. Expo Doctor対象direct dependencyだけを更新する。
5. `expo-constants` overrideをdirect dependencyと同versionへ同期する。
6. Metro overrideを変更せず、指定lockfile-onlyコマンドで一度lockfileを生成する。
7. React Native更新後のMetro / image-size graphを確認する。
8. affected pathが再発している場合のみ、必要最小限のparent-scoped selectorを修正する。
9. 指定lockfile-onlyコマンドを2回実行してlockfileを安定化し、frozen installを確認する。
10. Expo Doctor 17/17 PASSとIssue #68 remediation維持を確認する。
11. Native preflight、Repository標準品質ゲート、Web E2Eを実行する。
12. semantic diff / scopeを確認する。
13. plan / Run artifactを含むtracked fileをすべてfinalizeする。
14. 最終commitを作成し、final HEAD SHAを固定してpushする。
15. PRを作成し、PR head SHAとfinal HEAD SHAの一致を確認する。
16. final HEAD SHAに対するWeb CI / Mobile App CI全体を確認する。
17. CI確認後はtracked fileを更新せず、PR本文を実績へ更新する。
18. 全DoDを満たしたfinal HEADで完了とする。

## 15. 完了時にPRへ残す情報

PR本文には少なくとも以下を記載する。

- Issue #73との対応関係。
- 実装開始時baseline SHA。
- baselineと更新後のcurrent mismatch対象package version。
- `expo-constants` direct dependency / overrideを同versionへ同期したこと。
- React Native 0.86.3後のMetro / image-size graph確認結果。
- Metro overrideを変更したか。変更した場合はaffected path再発の根拠と変更selector。
- Issue #68のaffected `image-size` pathが再発していない確認結果。
- Expo Doctor 17/17 PASS。
- lockfile安定性 / frozen install結果。
- Local validation結果。
- Web CI結果。
- Mobile App CI全job結果。
- final HEAD SHA。
- PR head SHAがfinal HEAD SHAと一致していること。
- scope外変更がないこと。