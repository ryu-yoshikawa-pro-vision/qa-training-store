# Issue #73 Expo SDK 57 dependency alignment 実装計画

## 0. 依頼概要

- 対象Issue: #73 `fix: Expo Doctor の依存バージョン不整合を解消する`
- 作業ブランチ: `fix/issue-73-expo-sdk-57-dependency-alignment`
- baseline: `main` の `c0fea8a489286f829cc5e6cb5c5a95aa31465143`
- 背景: PR #70 のNative CI検証で、`Native Static / Run Expo Doctor` がExpo SDK 57の要求versionとの差分を検出してFAILした。
- 目的: Expo SDK 57が要求する依存versionへ必要最小限で整合させ、Expo Doctorと既存Web / Native品質ゲートを正常化する。
- 対応単位: 原則1 PRで完了する。互換性問題が実際に確認され、別変更として切り出す合理的理由が生じた場合のみ分離を検討する。

## 1. 現状

baseline時点の `pnpm dlx expo-doctor@1.17.6` で、以下12 packageのpatch version mismatchが確認されている。

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

Expo Doctorが要求するExpo SDK 57の依存versionへ、現在のdependency graphを基準に必要なpackageだけを更新し、Web / Android / iOS / Maestroを含む既存品質ゲートを維持する。

### Definition of Done

- [ ] 実装開始時点で最新 `origin/main` を含み、working treeがcleanである。
- [ ] 変更前に `pnpm dlx expo-doctor@1.17.6` を実行し、Issue #73の12 package mismatchが現在も再現することを確認している。
- [ ] baselineのdirect dependency / override / resolved graphを確認してから編集している。
- [ ] Expo Doctorが要求するpackageだけを必要最小限更新している。
- [ ] `expo.install.exclude`、Expo Doctor skip、CI gate緩和を使用していない。
- [ ] Issueと無関係なmajor / minor upgradeやdependency cleanupを混在させていない。
- [ ] `pnpm-lock.yaml` はpnpm 9.10.0で正規に再生成され、不要なsemantic dependency changeがない。
- [ ] `pnpm install --frozen-lockfile` がPASSする。
- [ ] `pnpm dlx expo-doctor@1.17.6` が17/17 PASSする。
- [ ] Issue #68で成立したMetro `0.84.5` remediationが維持され、affected `metro@0.84.4 -> image-size@1.2.1` pathが再発していない。
- [ ] Local Web / Native品質ゲートがPASSする。
- [ ] PR上のWeb CIがPASSする。
- [ ] PR上のMobile App CIでNative Static、Android Automation / Production-validation Build、Production Bundle Guard、Android Runtime / Maestro、Native iOS CI、`native-ci / verify` がPASSする。
- [ ] 最終PR差分が本Issueに必要なdependency変更とplan / Run artifactだけに限定されている。

## 3. 変更対象

### 実装対象

- `package.json`
  - Expo Doctorが要求するdirect dependency / devDependencyのversion整合。
  - 既存overrideが更新対象versionを固定している場合の必要最小限の整合。
  - React Native更新後もIssue #68のMetro resolutionを維持するため、実際のparent version変化により既存selectorが無効になる場合のみparent-scoped selectorを最小修正する。
- `pnpm-lock.yaml`
  - 上記 `package.json` の変更に伴う正規lockfile差分。
- `.codex/runs/<run_id>/`
  - Repository運用上必要なRun artifactのみ。

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

実際の互換性不具合が確認された場合も、原因を特定する前に上記へ変更を広げない。

## 4. 非ゴール

- Expo SDKのmajor / minor upgrade。
- React Nativeの0.86.3を超えるupgrade。
- Expo Doctorのversion変更。
- `expo install --fix` 等による無差別な一括更新をそのまま採用すること。
- `pnpm update --latest` / `pnpm audit --fix` 等のbroad update。
- Expo Doctor警告のignore / exclude化。
- CI gateのskip / allow-failure化。
- Metro / image-size remediationの再設計。
- Issue #73と無関係なsecurity alert、dependency、code cleanupの同時対応。

## 5. 実装前調査

### Task 1: baselineを固定する

1. `git fetch origin main` を実行する。
2. current branchが `fix/issue-73-expo-sdk-57-dependency-alignment` であることを確認する。
3. `origin/main` がHEADの祖先であることを確認する。
4. working treeがcleanであることを確認する。
5. baseline SHAを記録する。
6. branch作成後にmainが進んでいる場合は、実装開始前にlatest mainを安全に取り込み、baselineを更新する。

### Task 2: Expo Doctorのbaseline failureを再確認する

以下を実行し、Issue #73記載の12 package mismatchが現在も成立することを確認する。

    pnpm install --frozen-lockfile
    pnpm dlx expo-doctor@1.17.6

結果が変わっている場合は、Issue本文との差分を記録し、実際のcurrent mismatchだけを対象にする。

### Task 3: current dependency graphを確認する

編集前に以下を確認する。

- 12 packageのdirect declarationとresolved version。
- `expo-constants` のroot dependencyと `pnpm.overrides.expo-constants` の関係。
- `react-native@0.86.2` から解決される以下の実version。
  - `@react-native/community-cli-plugin`
  - `@react-native/metro-config`
  - Metro family
- Issue #68で導入したparent-scoped Metro overrideが現在どのedgeに適用されているか。
- `image-size` resolved instanceとMetroからの到達path。

少なくとも以下を利用してactual graphを確認する。

    pnpm why react-native
    pnpm why @react-native/community-cli-plugin
    pnpm why @react-native/metro-config
    pnpm why metro
    pnpm why image-size

## 6. 変更方針

### Task 4: direct dependenciesを必要最小限更新する

Expo Doctorのcurrent要求に従って、対象direct dependency / devDependencyだけを更新する。

baselineで確認済みの候補は以下。

- `@expo/metro-runtime`: `57.0.13` -> `57.0.14`
- `expo`: `57.0.16` -> `57.0.17`
- `expo-build-properties`: `57.0.14` -> `57.0.15`
- `expo-constants`: `57.0.14` -> `57.0.15`
- `expo-dev-client`: `57.0.15` -> `57.0.16`
- `expo-linking`: `57.0.7` -> `57.0.8`
- `expo-router`: `57.0.16` -> `57.0.17`
- `expo-sqlite`: `57.0.1` -> `57.0.2`
- `expo-system-ui`: `~57.0.2` -> Expo Doctorが要求する57.0.3互換範囲
- `react-native`: `0.86.2` -> `0.86.3`
- `eslint-config-expo`: `57.0.1` -> `57.0.2`
- `jest-expo`: `57.0.4` -> `57.0.5`

version declarationの形式は既存Repositoryの意図を維持する。Expo Doctorの表示が`~`だからという理由だけで、既存のexact pinを一律にrangeへ変換しない。

### Task 5: `expo-constants` overrideを整合する

`package.json` ではbaseline時点で `pnpm.overrides.expo-constants = 57.0.14` が存在する。

- direct dependencyを57.0.15へ更新した後も旧overrideを残して、resolved versionを57.0.14へ戻してはならない。
- overrideが現在も必要な理由を履歴 / graphから確認する。
- override自体が必要なら57.0.15へ最小更新する。
- overrideが不要と確認できた場合のみ削除を検討する。
- 理由を確認せず削除しない。

### Task 6: React Native更新後のMetro security remediationを維持する

React Nativeを0.86.3へ更新した後、lockfileを生成してactual graphを再確認する。

特に、既存overrideのparent selectorに含まれるversionが変化していないか確認する。

baselineのselector例:

- `@react-native/community-cli-plugin@0.86.2>metro`
- `@react-native/community-cli-plugin@0.86.2>metro-config`
- `@react-native/metro-config@0.86.1>metro-config`

React Native 0.86.3によってparent package versionが変わり、これらselectorが適用されなくなった場合:

- current graphで同じaffected edgeを特定する。
- Issue #68と同じ目的でMetro 0.84.5 resolutionを維持するために必要なselectorだけを更新する。
- global Metro overrideへ変更しない。
- 必要性を説明できない追加selectorを増やさない。

変更後に以下を確認する。

- affected `metro@0.84.4 -> image-size@1.2.1` pathが存在しない。
- Issue #68対応前の脆弱resolutionが再発していない。
- Metro familyを必要以上に変更していない。

## 7. lockfile更新

### Task 7: pnpm 9.10.0でlockfileを正規更新する

- Repository指定のpnpm 9.10.0を使用する。
- `package.json` の確定後にlockfileを更新する。
- unrelated packageを意図的にupdateしない。
- lockfile-only再生成またはRepository標準のinstall方法を使用する。
- 同じ操作を2回実行し、2回目で追加diffが発生しないことを確認する。
- `pnpm install --frozen-lockfile` がPASSすることを確認する。

lockfile差分では以下を確認する。

- 変更がIssue #73対象packageと、その必然的なtransitive dependency差分に限定されている。
- 無関係なimporter / snapshot / integrity / peer resolutionの変更がない。
- Metro / image-size resolutionが意図どおり維持されている。

## 8. ローカル検証

### Task 8: Expo / dependency検証

最低限以下を実行する。

    pnpm install --frozen-lockfile
    pnpm dlx expo-doctor@1.17.6
    pnpm why react-native
    pnpm why metro
    pnpm why image-size

期待結果:

- Expo Doctor 17/17 PASS。
- Issue #73の12 mismatchが0件。
- Issue #68のaffected `image-size` pathが再発していない。

### Task 9: Native preflight

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

### Task 10: Repository標準品質ゲート

以下を実行する。

    pnpm run format:check
    pnpm run lint:markdown
    pnpm run validate:spec
    pnpm run validate:spec-visuals:final
    pnpm run validate:curriculum
    pnpm run lint
    pnpm run typecheck
    pnpm run validate:image-manifest
    pnpm run security:check
    pnpm run test
    pnpm run build:web
    pnpm run build:spec

または、同等範囲を含むRepository標準の

    pnpm run verify

を使用してよい。

### Task 11: Web回帰

少なくとも主要Chromium回帰を実行する。

    pnpm run test:e2e:chromium

dependency更新によるWeb runtime / bundleへの回帰がないことを確認する。

## 9. 差分レビュー

### Task 12: scopeとsemantic diffを確認する

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
- lockfileに不要な広範囲差分がない。
- Issue #68のMetro remediationを維持するためにselector変更が必要だった場合、その変更だけが追加されている。

## 10. PR上の検証

### Task 13: Web CI

PR作成 / push後にWeb CIを確認する。

最低限以下がPASSすること。

- Dependency Review
- Style Quality
- Code Quality
- Vitest各suite
- Web build / E2E等、workflowが要求する既存gate

Dependency Reviewで新規moderate以上の脆弱性が検出された場合は採用しない。

### Task 14: Mobile App CI

`package.json` / `pnpm-lock.yaml` の変更によりNative changeとして検知されることを確認し、以下をすべてPASSさせる。

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

特定jobだけを手動dispatchで通したことを全体DoDの代替にしない。最終PR commitに対するPR CI全体で判定する。

## 11. 失敗時の扱い

### Expo DoctorがPASSしない場合

- current要求versionとresolved graphを確認する。
- `expo.install.exclude`、skip、ignoreで回避しない。
- 追加dependency updateが必要なら、Issue #73との因果関係を説明できるものだけ検討する。

### React Native 0.86.3で互換性問題が発生した場合

- 最初のfailureを特定する。
- Expo / React Nativeのversionをさらに上げて回避しない。
- Application codeやCIへ修正を広げる前に、0.86.3自体との互換性問題か、lockfile / peer resolution問題かを切り分ける。
- Issue #73だけでは安全に解消できないと判断した場合は、無理に1 PRへ詰め込まずBlockerとして報告する。

### 既存Metro remediationが崩れた場合

- current parent versionに合わせて必要最小限のparent-scoped selectorを修正する。
- global overrideや別security remediationへ広げない。
- Issue #68と同等の「affected path 0件」を回復できない場合は採用しない。

### 無関係な既存CI failureが発生した場合

- first failureと本変更の因果関係を確認する。
- 無関係なfailureを本PRで修正しない。
- ただしdependency更新が影響し得るfailureを「既存」と決めつけず、baselineとの差分で判断する。

## 12. 想定変更ファイル

原則として以下に限定する。

- `package.json`
- `pnpm-lock.yaml`
- `.codex/runs/<run_id>/...`
- `docs/plans/2026-08-27_092000_expo-sdk-57-dependency-alignment.md`

追加ファイル変更が必要になった場合は、Issue #73の完了に不可欠であることを説明できる場合だけ許容する。

## 13. 実装順序

1. latest main / clean working tree / baseline SHAを確認する。
2. baseline Expo Doctor failureを再現する。
3. 12 package、`expo-constants` override、React Native / Metro / image-size graphを記録する。
4. Expo Doctor対象direct dependencyだけを更新する。
5. `expo-constants` overrideを必要最小限整合する。
6. pnpm 9.10.0でlockfileを更新する。
7. React Native 0.86.3後のMetro / image-size graphを確認し、必要な場合のみ既存parent-scoped selectorを調整する。
8. lockfile安定性とfrozen installを確認する。
9. Expo Doctor 17/17 PASSとIssue #68 remediation維持を確認する。
10. Native preflight、Repository標準品質ゲート、Web E2Eを実行する。
11. semantic diff / scopeを確認する。
12. commit / pushしてPRを作成する。
13. Web CI / Mobile App CI全体を確認する。
14. 全DoDを満たした最終PR HEADで完了とする。

## 14. 完了時にPRへ残す情報

PR本文には少なくとも以下を記載する。

- Issue #73との対応関係。
- baselineと更新後の12 package version。
- `expo-constants` overrideをどう扱ったかと理由。
- React Native 0.86.3後のMetro parent version / overrideへの影響。
- Issue #68のaffected `image-size` pathが再発していない確認結果。
- Expo Doctor 17/17 PASS。
- Local validation結果。
- Web CI結果。
- Mobile App CI全job結果。
- 最終HEAD SHA。
- scope外変更がないこと。
