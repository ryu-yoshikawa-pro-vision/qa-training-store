# Issue #141 Expo互換依存関係更新と自動メンテナンス復旧 Plan

## 0. 依頼概要

- 対象: Issue #141「Expo互換依存関係の更新と自動メンテナンス失敗を解消する」
- 作業ブランチ: `issue-141-expo-dependency-maintenance`
- branch作成時の`main`: `12fff8eafccef4ab939efec623ac8a8d4f1ac539`
- 背景:
  - Expo SDK 57が期待するpatch versionと、現在の8 packageに差分がある。
  - PR #133のMobile App CIでは`Native Static`の`Run Expo Doctor`がversion mismatchで失敗した。
  - `main`の`Expo Dependency Maintenance`では`pnpm exec expo install --fix`がpackage更新後に`app.config.ts`へ`expo-sqlite`のconfig plugin追加を要求し、dynamic configを自動編集できず停止した。
  - 現行workflowは自動更新で変更してよいファイルを`package.json`と`pnpm-lock.yaml`に限定している。
- 期待成果:
  - Expo SDK 57が要求する互換packageへ揃える。
  - `app.config.ts`へ`expo-sqlite`を明示し、Expo CLIがdynamic configを自動編集しようとして失敗する状態を解消する。
  - `Native Static`のExpo Doctorを復旧する。
  - `Expo Dependency Maintenance`の既存の安全策を維持し、今回のblockerを除去する。

## 1. ゴール / 完了条件

### ゴール

Issue #141で確認された次の2つの失敗を、既存のRepository設計を広げずに解消する。

1. Expo SDK 57の互換version mismatchを解消する。
2. `expo install --fix`が`expo-sqlite`をdynamic `app.config.ts`へ自動追加しようとして停止する状態を解消する。

### 完了条件

#### App Config

- `app.config.ts`の`plugins`へ`expo-sqlite`が1回だけ明示登録されている。
- `expo-router`と`expo-build-properties`の既存設定を維持している。
- `expo-sqlite`へ`enableFTS`、`useSQLCipher`、`customBuildFlags`等の不要なoptionを追加していない。
- `tests/contracts/app-config.test.ts`が`expo-sqlite`のplugin登録を回帰検出できる。
- `pnpm exec expo config --json`が成功し、既存runtime metadataを維持している。
- `pnpm exec expo config --type prebuild --json`が成功し、JSONの`_internal.pluginHistory["expo-sqlite"]`が存在する。

#### 依存関係

- `pnpm exec expo install --check`が成功する。
- Native Staticと同じ`pnpm dlx expo-doctor@1.17.6`が成功する。
- `pnpm install --frozen-lockfile`が成功する。
- `package.json`のExpo互換packageが、実装時点のSDK 57推奨versionへ更新されている。
- `pnpm.overrides.expo-constants`が更新後のdirect dependencyと一致している。
- `pnpm-lock.yaml`が最終`package.json`と整合している。
- Expo / React Nativeのmajor.minorを変更していない。
- peer dependency warningを確認し、warningを消すだけのdirect dependency、override、major.minor upgradeを追加していない。

#### Maintenance workflow

- `Expo Dependency Maintenance`の既存のno-op / update分岐、major.minor guard、changed-file allowlist、非force push、main向けPR作成契約を変更していない。
- plugin追加後のversion mismatch状態で`pnpm exec expo install --fix`を実行し、今回のdynamic configエラーが再発しないことを確認する。
- `expo install --fix`直前の作業ツリーを基準点として記録し、fixからworkflow後続処理までに新たに変更されたpathが`package.json`と`pnpm-lock.yaml`だけであることを確認する。
- fix前後で`app.config.ts`と`tests/contracts/app-config.test.ts`の内容が変わっていないことをhash等で確認し、既存の人間による変更とautomation由来の変更を区別する。
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`が成功する。
- mainへ反映後、更新不要状態の`Expo Dependency Maintenance`を`workflow_dispatch`で実行し、no-opで成功する。

更新必要状態からGitHub上で新しいautomation PRを実際に作成するE2E確認は、mainへ意図的に古い依存関係を戻さない限り再現できない。今回の実装では、次の証跡を組み合わせて確認する。

1. 今回のblockerだった`expo install --fix`以降をversion mismatch状態で再現し、dynamic configエラーが解消していること。
2. workflowのPR作成経路自体を変更していないことと、そのcontract testが成功すること。
3. 同じPR作成経路がPR #136で実際に成功していること。

この組み合わせを今回のupdate path確認とし、「今回の変更後にGitHub Actions上でupdate-needed状態から新しいPR作成までE2E実行した」とは扱わない。

#### PR CI

- `Web CI / verify`が成功する。
- `Native Static`が成功する。
- Android Automation BuildとAndroid Production-validation Buildが成功する。
- Native iOS CIのAutomation BuildとProduction-validation Buildが成功する。
- `native-ci / verify`が成功する。
- 今回のPRで起動した必須CIがすべて成功する。
- Repository標準検証が成功する。

## 2. 現状理解と前提

### 確認済み

#### Expo互換version差分

2026-09-11の`Expo Dependency Maintenance` run `34620578860`とPR #133 Mobile App CI run `34617976977`では、次の8 packageがExpo SDK 57の期待versionからずれていた。

| package | 現在 | Expoが期待したversion |
| --- | --- | --- |
| `expo` | `57.0.21` | `~57.0.22` |
| `expo-constants` | `57.0.17` | `~57.0.18` |
| `expo-crypto` | `57.0.2` | `~57.0.3` |
| `expo-dev-client` | `57.0.18` | `~57.0.19` |
| `expo-linking` | `57.0.9` | `~57.0.10` |
| `expo-router` | `57.0.20` | `~57.0.21` |
| `expo-sqlite` | `57.0.2` | `~57.0.3` |
| `expo-system-ui` | `~57.0.3` | `~57.0.4` |

この表は2026-09-11時点の証跡であり、実装時には固定値として使わない。branch上で`pnpm exec expo install --check`を再実行し、その時点のSDK 57推奨値を確認する。

#### `Expo Dependency Maintenance`の失敗位置

run `34620578860`では次の順に進んだ。

1. `pnpm install --frozen-lockfile`: 成功。
2. `pnpm exec expo install --check`: 8 packageの不一致を検出。
3. `pnpm exec expo install --fix`: package更新を開始。
4. package更新後、Expo CLIが`expo-sqlite`のconfig plugin追加を要求。
5. `app.config.ts`がdynamic configのためExpo CLIが自動編集できず、exit code 1で停止。
6. `Sync expo-constants override`以降は未実行。

失敗箇所はchanged-file allowlistやPR作成処理ではなく、その前段の`expo install --fix`である。

#### `app.config.ts`とExpo CLI

現在の`app.config.ts`の`plugins`は次の2系統である。

- `expo-router`
- `expo-build-properties`

`expo-sqlite`はdependencyには存在するが、`plugins`にはない。

Expo SDK 57のCLI実装では、install対象packageがconfig pluginを持ち、現在の`plugins`に含まれておらず、auto pluginにも該当しない場合にapp configへ追加しようとする。dynamic configを自動編集できない場合は、追加内容を提示してエラーにする。

一方、既存`plugins`にpackage名が含まれていれば自動追加対象から除外される。そのため、`app.config.ts`へ`expo-sqlite`を明示することは今回のCLI failureに直接対応する。

参考:

- `packages/@expo/cli/src/install/utils/autoAddConfigPlugins.ts`
- `packages/@expo/cli/src/utils/modifyConfigPlugins.ts`
- Expo Config plugins: https://docs.expo.dev/config-plugins/development-and-debugging/
- Expo app config: https://docs.expo.dev/workflow/configuration/

#### `expo-sqlite` config pluginのdefault動作

Expo SDK 57の`expo-sqlite` config pluginは、次のoptionが指定された場合だけGradle / Podfile propertyを書き換える。

- `customBuildFlags`
- `enableFTS`
- `useSQLCipher`
- `useLibSQL`
- `withSQLiteVecExtension`

`"expo-sqlite"`だけを指定した場合、これらは`undefined`であり、plugin自身は対応propertyを追加しない。

したがって、今回のPlanでは「optionなしのpluginがどのnative propertyを変更するか」を未回答事項として残さない。optionなしで明示登録し、prebuildと実buildが既存契約どおり成功することを確認する。

#### Native生成物の管理

Repositoryの`.gitignore`は`android/`と`ios/`を除外している。したがって、prebuild後の生成物を`git diff`で「tracked native diff」として確認することはできない。

今回の検証は次で行う。

- `expo config --type prebuild --json`を実行し、`_internal.pluginHistory["expo-sqlite"]`でplugin解決を確認する。
- freshな`android/` / `ios/`生成先でのprebuild成功確認。
- 必要な場合は生成されたGradle / Podfile propertyを直接確認する。
- 最終的には既存のAndroid / iOS build CIで実buildを確認する。

生成された`android/` / `ios/`をcommit対象にはしない。

#### maintenance workflowの既存契約

`.github/workflows/expo-dependency-maintenance.yml`は次を実装している。

- scheduleと`workflow_dispatch`だけで起動する。
- manual runは`main`以外を拒否する。
- checkout対象を`main`へ固定する。
- 既存のautomation PRがあれば重複作成しない。
- `expo install --check`でno-op / updateを分岐する。
- update前後でExpo / React Nativeのmajor.minorをguardする。
- `pnpm.overrides.expo-constants`をdirect dependencyへ同期する。
- override同期後にlockfileを再生成する。
- update後に`pnpm install --frozen-lockfile`と`expo install --check`を再実行する。
- changed fileを`package.json`と`pnpm-lock.yaml`だけに制限する。
- force pushしない。
- auto-mergeしない。

`tests/contracts/expo-dependency-maintenance-workflow.test.ts`がこれらを契約として固定している。

今回の失敗だけを理由に、allowlistへ`app.config.ts`を追加しない。`app.config.ts`は定期dependency updateで自動変更する対象ではなく、今回の実装で人間が明示的に整合させる。

#### PR #136の実績

同じmaintenance workflowは2026-09-09にPR #136「chore: Expo SDK推奨依存へ同期する」を自動作成し、`package.json`と`pnpm-lock.yaml`だけの更新を完了している。

今回変更しないbranch作成・commit・push・PR作成部分については、この実績を既存経路の証跡として使う。

#### Native CIの状況

PR #133 run `34617976977`では、次は成功している。

- Android Automation Build
- Android Production-validation Build
- Native iOS CI / iOS Automation Build
- Native iOS CI / iOS Production-validation Build

失敗したのは`Native Static`の`Run Expo Doctor`で、17 checks中1 check、8 packageのpatch mismatchだった。

このため、現状の主な既知不具合は依存version checkである。ただし更新後にもAndroid / iOS buildが成立することをPR CIで確認する。

#### Web CIの確認範囲

今回更新対象となる`expo`、`expo-router`、`expo-linking`、`expo-constants`等はWeb側のbuildやroutingにも影響し得る。Repositoryの`Web CI / verify`はDependency Review、lint / typecheck、Vitest、automation / production Web build、Playwright E2E、UI Review、production smoke等を集約している。

そのため、ローカル`pnpm run verify`だけで完了扱いにせず、PR上では`Web CI / verify`の成功も必須とする。

### peer dependency warning

`expo install --fix`の途中で少なくとも次が確認されている。

- `expo-router 57.0.21` / `expo-constants`
- `react-native 0.86.3` / `@react-native/jest-preset`
- `@react-native/community-cli-plugin` / `@react-native/metro-config`
- `expo-modules-core` / `react-native-worklets`

判断基準:

- Expo SDK 57の推奨versionへ揃えた後もwarningが残るか確認する。
- `pnpm install --frozen-lockfile`、Expo Doctor、test、prebuild、buildを阻害する場合だけ追加対応を検討する。
- Repositoryがdirect dependencyとして管理するpackageで、同じmajor.minor内のpatch整合が必要と確認できた場合だけ追加更新する。
- transitive warningを消すためだけにdirect dependencyやoverrideを追加しない。
- Expo CLIの推奨versionとpeer metadataが一時的に食い違う場合、warningだけを理由にExpo推奨versionから戻さない。
- React Native / Expoのmajor.minor upgradeへ広げない。

### 前提

- 実装開始時に`main`が進んでいる場合は、branch作成時SHAとの差分を確認してからbranchの取り込み方を決める。
- package versionは手編集で推測せず、`pnpm exec expo install --check`と`pnpm exec expo install --fix`を正とする。
- `expo install --fix`を実行する前に`app.config.ts`へ`expo-sqlite`を追加する。
- `pnpm.overrides.expo-constants`は既存workflowと同じルールでdirect dependencyへ同期する。
- `expo-sqlite`のplugin optionは追加しない。
- `android/` / `ios/`は生成物として扱い、Git管理へ追加しない。

### 対象外

- Expo SDK 58以降へのupgrade。
- React Native 0.87以降へのupgrade。
- `Expo Dependency Maintenance`の汎用dependency updater化。
- dynamic `app.config.ts`を自動編集する独自script / AST editorの追加。
- changed-file allowlistの拡張。
- peer warningをゼロにすること自体を目的とした依存変更。
- Issue #141と無関係なdependency整理。
- PR #133のカリキュラム変更。
- Dependabotや他workflowの再設計。
- `android/` / `ios/`生成物のGit管理への追加。

## 3. 質問 / 曖昧性

### 実装時に確認する事項

1. 実装時点でSDK 57の推奨patchが2026-09-11時点から進んでいないか。
2. 互換package更新後にpeer dependency warningがどれだけ残るか。
3. `@react-native/jest-preset`等のdirect dependencyに追加patch更新が必要か。

これらは実装時のCLI出力と検証結果で判断できるため、現時点ではユーザー質問で停止しない。

### 判断ルール

- SDK 57の推奨patchが進んでいた場合は実装時の`expo install --check`を正とする。ただしExpo / React Nativeのmajor.minorは維持する。
- warningが残っても標準検証とNative buildが成功し、upstream peer metadataの不一致と説明できる場合は追加修正しない。
- direct dependencyのpatch更新が必要と確認できた場合だけIssue #141の範囲へ追加し、対応するtestを確認する。
- workflow固有の別不具合が再現した場合だけworkflow変更を検討する。

### update path確認の制約

Issue #141は「更新が必要な状態ではworkflowが更新PR作成まで進む」を完了条件に含む。一方、workflowは`main`専用であり、branchから安全guardを維持したまま実際のautomation PR作成まで通すことはできない。

今回のPlanでは安全guardを緩めず、次の合成した証跡で確認する。

- version mismatch状態で`expo install --fix`からallowlist相当までを再現し、今回のblockerが除去されたことを確認する。
- PR作成部分を変更していないことをdiffとcontract testで確認する。
- PR #136で同じPR作成経路の実績を確認する。
- merge後のmainではno-op経路を実行する。

branch上では`app.config.ts`、contract test、Run Artifact等の人間による変更がすでに存在するため、workflowの`git diff --name-only HEAD`をそのまま実行してallowlistを判定しない。`expo install --fix`直前の作業ツリーを基準点として記録し、fix以降に追加された差分だけを比較する。

新しいupdate-needed PRをGitHub Actions上で実際に作成していない場合、その点は実装結果で明示する。

## 4. 影響範囲

### 必須変更

#### `app.config.ts`

- `plugins`へ`expo-sqlite`を文字列pluginとして1回追加する。
- optionは追加しない。
- 既存の`expo-router`、`expo-build-properties`、runtime metadata、Android package、iOS bundle identifierを変更しない。

#### `tests/contracts/app-config.test.ts`

production codeへ新しいhelperやfactoryを追加せず、現在のdefault exportを直接評価してplugin契約を追加する。

最低限確認する内容:

- `expo-sqlite`が1回だけ存在する。
- `expo-router`が存在する。
- `expo-build-properties`が存在する。

既存の`resolveRuntimeEnvironment`のtestは維持する。

#### `package.json`

- `expo install --fix`が示すSDK 57互換packageへ更新する。
- `pnpm.overrides.expo-constants`を更新後のdirect dependencyへ同期する。
- Expo / React Nativeのmajor.minorを変更しない。

#### `pnpm-lock.yaml`

- 最終`package.json`とoverrideに合わせて再生成する。
- Issue #141と無関係な意図しない解決変更が混ざっていないか確認する。

### 原則変更しない

- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `src/infrastructure/database/sqlite/**`

これらへ変更が必要になった場合は、Issue #141の既知原因とは別の再現結果を示してから範囲を広げる。

## 5. 変更方針

### 5.1 baselineを確認する

実装開始時に次を実行する。

```bash
pnpm install --frozen-lockfile
pnpm exec expo install --check
pnpm dlx expo-doctor@1.17.6
```

記録する内容:

- 実装時点の対象packageと推奨version。
- Expo Doctorのbaseline failure。
- 既存のpeer dependency warning。

`main`がbranch作成時から進んでいる場合は、関連変更を確認してからbranchへ取り込む。

### 5.2 `expo-sqlite`をApp Configへ明示する

`app.config.ts`の`plugins`へ`expo-sqlite`を追加する。

想定形:

```ts
plugins: [
  "expo-router",
  "expo-sqlite",
  [
    "expo-build-properties",
    {
      // existing config
    },
  ],
],
```

optionは追加しない。

追加直後に次を確認する。

```bash
pnpm exec expo config --json
pnpm exec expo config --type prebuild --json
```

確認内容:

- 通常configが解決できる。
- `extra.appEnvironment`等の既存runtime metadataが変わっていない。
- prebuild configのJSONに`_internal.pluginHistory["expo-sqlite"]`が存在する。
- pluginが重複していない。

`expo config --type prebuild --json`は目視だけで済ませず、JSONを一時ファイルへ保存してNodeまたは`jq`で`_internal.pluginHistory["expo-sqlite"]`の存在をassertする。

### 5.3 App Configの回帰testを追加する

`tests/contracts/app-config.test.ts`から`app.config.ts`のdefault exportを直接評価する。

production側の新しい公開helperやconfig factoryは追加しない。

確認する契約:

- `expo-sqlite`が1回だけ存在する。
- `expo-router`が維持される。
- `expo-build-properties`が維持される。

このtestにより、将来`expo-sqlite`がpluginsから誤って削除され、次回のdependency maintenanceで同じdynamic config failureが再発することを防ぐ。

### 5.4 version mismatch状態のままupdate pathを1回だけ通す

`app.config.ts`とcontract testを修正した後、依存関係がまだ古い状態で`expo install --fix`直前の基準点を記録する。

最低限、次を保存する。

- `git diff --name-only HEAD`と`git ls-files --others --exclude-standard`から得られる変更path一覧。
- `app.config.ts`の内容hash。
- `tests/contracts/app-config.test.ts`の内容hash。

その後、次を1回だけ実行する。

```bash
pnpm exec expo install --fix
```

ここを今回のdynamic config blockerに対する主な再現確認とする。後から依存関係を意図的にdowngradeして同じ確認を繰り返さない。

確認内容:

- `Cannot automatically write to dynamic config at: app.config.ts`が再発しない。
- Expo互換packageが更新される。
- Expo / React Nativeのmajor.minorが変わらない。
- `app.config.ts`へ追加の自動変更を要求しない。
- Issue #141と無関係なdirect dependencyを追加しない。
- fix後も`app.config.ts`と`tests/contracts/app-config.test.ts`のhashがfix直前から変わっていない。

### 5.5 `expo-constants` overrideとlockfileを同期する

現行workflowと同じルールを適用する。

- `dependencies["expo-constants"]`を確認する。
- `pnpm.overrides.expo-constants`を同じversion指定へ同期する。

その後:

```bash
pnpm install --lockfile-only --no-frozen-lockfile
pnpm install --frozen-lockfile
```

確認内容:

- lockfileが最終manifestと一致する。
- `expo-constants`が期待したpatchへ解決される。
- unrelated dependencyの意図しない大量変更がない。

必要に応じて次を使う。

```bash
pnpm why expo-constants
pnpm why expo-sqlite
pnpm why expo-router
```

### 5.6 peer dependency warningを分類する

更新後の`pnpm install --frozen-lockfile`でwarningを再確認する。

#### `expo-router` / `expo-constants`

Expo CLIが要求する両packageのversionと`expo install --check` / Expo Doctorを優先する。peer metadataが古いpatchを要求していても、warningだけを理由に`expo-constants`を戻さない。

#### `react-native` / `@react-native/jest-preset`

`@react-native/jest-preset`はdirect devDependencyである。warningが残る場合はsame `0.86.x` lineで必要なpatch整合があるか確認する。追加更新する場合はNative Jest testを必須とする。

#### `@react-native/community-cli-plugin` / `@react-native/metro-config`

transitive dependencyのwarningだけを理由に`@react-native/metro-config`をdirect dependencyへ追加しない。prebuild / Android buildへ実害がある場合だけ調査する。

#### `expo-modules-core` / `react-native-worklets`

Expo SDK 57の標準解決でDoctor・test・buildが成功するなら、warning抑制用overrideを追加しない。

### 5.7 prebuildとNative buildを確認する

`android/`と`ios/`は`.gitignore`対象なので、tracked diffの確認は行わない。

Androidではfresh生成先で次を実行する。

```bash
pnpm exec expo prebuild --platform android --no-install
```

確認内容:

- prebuildが成功する。
- 必要に応じて生成された`android/gradle.properties`等を直接確認し、option未指定なのに不要な`expo.sqlite.*` propertyが追加されていないことを確認する。

macOS等の実行可能な環境ではiOSも確認する。

```bash
pnpm exec expo prebuild --platform ios --no-install
```

ローカルiOS prebuildを実行できない場合は、その事実を記録し、PR CIのiOS build結果を必須証跡とする。

最終的なNative保証はPR CIで確認する。

### 5.8 maintenance workflowの後続契約を確認する

branchからworkflowのmain guardを緩めない。

今回の`expo install --fix`成功後に、workflowと同じ後続処理を確認する。

- `expo-constants` override同期。
- lockfile再生成。
- Expo / React Native major.minor不変確認。
- `pnpm install --frozen-lockfile`。
- `pnpm exec expo install --check`。

allowlist相当の確認は、workflowの`git diff --name-only HEAD`をbranch上でそのまま使わない。5.4で保存したfix直前の基準点と、後続処理完了時点を比較する。

成功条件:

- fix直前から新たに変更されたpathが`package.json`と`pnpm-lock.yaml`だけである。
- `app.config.ts`と`tests/contracts/app-config.test.ts`の内容hashがfix直前から変わっていない。
- active Run Artifact等、fix直前から存在していた人間による変更をautomation生成差分として誤判定しない。

これにより、実workflowの「automationが生成する変更を`package.json` / `pnpm-lock.yaml`へ限定する」という意図を、既存の人間変更があるbranch上でも再現する。

workflow自体を変更しないため、PR作成部分は次で確認する。

- `main`との差分にworkflow変更がない。
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`が成功する。
- PR #136で同じPR作成経路が成功した実績を確認する。

### 5.9 merge後にmainのno-op経路を確認する

main反映後、`Expo Dependency Maintenance`を`workflow_dispatch`で実行する。

期待結果:

- `Check Expo-compatible dependencies`: success。
- `needs_fix=false`。
- `Finish without changes when dependencies are compatible`: 実行。
- `Fix Expo-compatible dependencies`以降: skip。
- workflow全体: success。

このrunはno-op経路の確認であり、update-needed PR作成経路のE2E証跡として扱わない。

## 6. 実行タスク

### 実装前確認

- [ ] `main`の最新SHAとbranch作成時SHA `12fff8e...`の差分を確認する。
- [ ] Issue #141、run `34620578860`、run `34617976977`の失敗内容を再確認する。
- [ ] `pnpm install --frozen-lockfile`を実行する。
- [ ] `pnpm exec expo install --check`で実装時点の対象packageと期待versionを記録する。
- [ ] `pnpm dlx expo-doctor@1.17.6`のbaseline failureを確認する。

### App Config

- [ ] `app.config.ts`へ`expo-sqlite`を1回だけ追加する。
- [ ] `expo-sqlite`へoptionを追加しない。
- [ ] `pnpm exec expo config --json`でruntime metadataを確認する。
- [ ] `pnpm exec expo config --type prebuild --json`をJSONとして検証し、`_internal.pluginHistory["expo-sqlite"]`の存在をassertする。
- [ ] `tests/contracts/app-config.test.ts`へplugin契約を追加する。

### 依存関係更新

- [ ] `expo install --fix`直前の変更path一覧と`app.config.ts` / `tests/contracts/app-config.test.ts`のhashを基準点として記録する。
- [ ] version mismatch状態で`pnpm exec expo install --fix`を1回実行する。
- [ ] dynamic config errorが消えたことを確認する。
- [ ] `app.config.ts` / `tests/contracts/app-config.test.ts`がfixによって変更されていないことをhashで確認する。
- [ ] package変更内容とmajor.minor不変を確認する。
- [ ] `pnpm.overrides.expo-constants`を同期する。
- [ ] `pnpm install --lockfile-only --no-frozen-lockfile`でlockfileを再生成する。
- [ ] `pnpm install --frozen-lockfile`を再実行する。
- [ ] fix直前の基準点との差分から、新たな変更pathが`package.json` / `pnpm-lock.yaml`だけであることを確認する。
- [ ] peer dependency warningを分類する。

### 回帰確認

- [ ] `pnpm exec expo install --check`が成功する。
- [ ] `pnpm dlx expo-doctor@1.17.6`が成功する。
- [ ] App Config contract testが成功する。
- [ ] Expo Dependency Maintenance contract testが成功する。
- [ ] Android prebuildが成功する。
- [ ] 実行可能な環境ではiOS prebuildを確認する。実行できない場合はPR CIを必須証跡とする。

### 標準検証

```bash
pnpm install --frozen-lockfile
pnpm exec expo install --check
pnpm dlx expo-doctor@1.17.6
pnpm run test:contracts
pnpm run test:component:native
pnpm run check:native-route-dependencies
pnpm run validate:eas:config
pnpm run typecheck
pnpm run lint
pnpm run lint:markdown
git diff --check
pnpm run verify
```

active Run ArtifactをRepositoryへ追加または更新した場合は、作業完了前にRepository規約どおり`scripts/sanitize-codex-artifacts.ps1`のWriteとCheckを実行する。未sanitizationのRun Artifactが残る場合は完了扱いにしない。

PR上では少なくとも次を確認する。

- `Web CI / verify`
- `Native Static`
- `Android Automation Build`
- `Android Production-validation Build`
- `Native iOS CI / iOS Automation Build`
- `Native iOS CI / iOS Production-validation Build`
- `native-ci / verify`
- 今回のPRで起動したその他の必須CI

### merge後確認

- [ ] main反映後、`Expo Dependency Maintenance`を`workflow_dispatch`で実行する。
- [ ] no-opでsuccessになることを確認する。
- [ ] 不要なautomation PRが作成されないことを確認する。
- [ ] update-needed経路を今回新規E2E実行していない場合、その点を実装結果に明記する。

## 7. 検証方法

### Expo互換依存関係

```bash
pnpm exec expo install --check
```

成功条件:

- exit code 0。
- 実装時点でSDK 57が要求するpackageにoutdatedが残らない。

```bash
pnpm dlx expo-doctor@1.17.6
```

成功条件:

- exit code 0。
- `Check that packages match versions required by installed Expo SDK`がPASSする。

### App Config

```bash
pnpm exec expo config --json
```

成功条件:

- config解決成功。
- runtime metadataが既存期待値を維持する。

```bash
pnpm exec expo config --type prebuild --json
```

成功条件:

- config解決成功。
- 出力JSONの`_internal.pluginHistory["expo-sqlite"]`が存在する。

この確認は目視ではなく、JSONを一時ファイルへ保存してNodeまたは`jq`でassertする。

`tests/contracts/app-config.test.ts`では次を自動検証する。

- `expo-sqlite`が1回だけ存在する。
- `expo-router`が存在する。
- `expo-build-properties`が存在する。

### manifest / lockfile整合

```bash
pnpm install --frozen-lockfile
```

成功条件:

- exit code 0。
- lockfile更新要求が出ない。

### maintenance update path

今回のblocker確認は、plugin追加後・version mismatch状態での最初の`pnpm exec expo install --fix`で行う。

fix直前に次を基準点として保存する。

- 変更path一覧。
- `app.config.ts`のhash。
- `tests/contracts/app-config.test.ts`のhash。

後続処理完了後、基準点と比較する。

成功条件:

- dynamic config errorなし。
- Expo / React Native major.minor不変。
- final `expo install --check` success。
- fix直前から新たに変更されたpathが`package.json` / `pnpm-lock.yaml`だけである。
- `app.config.ts`と`tests/contracts/app-config.test.ts`はfix直前から内容不変である。

PR作成部分はworkflow非変更、contract test、PR #136の実績で確認する。

### Native prebuild / build

成功条件:

- Android prebuild成功。
- iOS prebuildを実行した場合は成功。
- PR CIのAndroid / iOS build成功。
- production / automation build metadata contractを壊していない。

`android/` / `ios/`はGit管理対象外なので、`git diff`によるnative生成物検証は完了条件にしない。

### PR CI

成功条件:

- `Web CI / verify`がsuccess。
- `native-ci / verify`がsuccess。
- `Native Static`とAndroid / iOSの各buildがsuccess。
- 今回のPRで起動した必須CIにfailureがない。

ローカル`pnpm run verify`は必要だが、GitHub Actions上の`Web CI / verify`の代替とはみなさない。

### workflow contract

```bash
pnpm exec vitest run tests/contracts/expo-dependency-maintenance-workflow.test.ts --no-file-parallelism --maxWorkers=1
```

成功条件:

- trigger、permission、main guard、duplicate PR guard、major.minor guard、allowlist、非force push、非auto-merge契約がすべてPASSする。

### Run Artifact sanitization

active Run ArtifactをRepositoryへ追加または更新した場合は、作業完了前に`scripts/sanitize-codex-artifacts.ps1`のWriteとCheckを実行する。

成功条件:

- Write後のArtifactに未sanitizationのローカル絶対pathが残らない。
- Checkが成功する。
- actual `run.json`を直接編集していない。

### 最終diff

```bash
git diff --check
git status --short
```

想定する最終変更:

- `app.config.ts`
- `tests/contracts/app-config.test.ts`
- `package.json`
- `pnpm-lock.yaml`
- active Runの標準Artifact

workflow固有の別不具合が確認された場合だけ、追加で次を変更候補とする。

- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`

これ以外の変更はIssue #141との因果を説明できなければ除外する。

## 8. リスクと未解決論点

### SDK 57推奨patchが実装時に進む可能性

Issue作成後にSDK 57の推奨patchが更新される可能性がある。

対応:

- 実装時の`expo install --check`を正とする。
- Expo / React Nativeのmajor.minor guardは維持する。

### peer metadataの一時不整合

Expo CLIが推奨するversionと個別packageのpeerDependenciesが同時に更新されない場合がある。

対応:

- warningだけでversionを戻さない。
- Expo Doctor、test、prebuild、buildの実結果で判断する。
- transitive warning用の独自overrideを増やさない。

### Native生成物はGit管理されていない

`android/` / `ios/`は`.gitignore`対象であり、生成差分をGit diffで残せない。

対応:

- plugin解決は`expo config --type prebuild --json`の`_internal.pluginHistory["expo-sqlite"]`で確認する。
- prebuild成功と必要な生成propertyの直接確認を行う。
- 最終保証はPR CIの実buildで行う。

### branch上の人間変更とautomation生成差分が混在する

`app.config.ts`、contract test、Run Artifact等は`expo install --fix`より前に変更されるため、workflowの`git diff --name-only HEAD`をbranch上でそのまま使うとallowlist違反になる。

対応:

- `expo install --fix`直前を基準点として変更path一覧を保存する。
- `app.config.ts`とcontract testのhashを保存する。
- fixから後続処理完了までの追加差分だけを比較する。
- 人間変更済みファイルがfixによって追加変更されていないことをhashで確認する。

### update-needed workflowのlive E2Eを再現しない

mainへ反映した時点では依存関係が互換状態になるため、mainのworkflowはno-opとなる。update-needed状態を再現するにはmainへ意図的なversion mismatchを作る必要があり、今回の検証のためだけには行わない。

対応:

- blockerまでのupdate pathをbranch上で再現する。
- PR作成部分のworkflowを変更しない。
- contract testとPR #136の実績を使う。
- merge後はno-op経路を実行する。
- 新しいupdate-needed PRを実際に作成していない場合は明示する。

### lockfileの不要差分

`expo install --fix`とoverride同期でlockfileに広い差分が出る可能性がある。

対応:

- `package.json`の変更packageを先に確認する。
- lockfile差分が対象packageの解決変更で説明できるか確認する。
- unrelated dependency更新を同じPRへ混ぜない。

## 9. 成果物

### 実装PRで想定する変更

必須:

- `app.config.ts`
- `tests/contracts/app-config.test.ts`
- `package.json`
- `pnpm-lock.yaml`

原則変更しない:

- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `src/infrastructure/database/sqlite/**`

### Run Artifact

Repository規約に従い、実装時のactive Runでは次を管理する。

- `.codex/runs/<run_id>/PLAN.md`
- `.codex/runs/<run_id>/TASKS.md`
- `.codex/runs/<run_id>/REPORT.md`
- workflow levelで必要な`run.json`

Repositoryへ追加するRun Artifactは完了前に`scripts/sanitize-codex-artifacts.ps1`のWrite / Checkを実行する。actual `run.json`を直接編集しない。

### 保存Plan

- `docs/plans/2026-09-12_071621_issue-141-expo-dependency-maintenance.md`

## 10. 実装時に避ける対応

- `app.config.ts`を自動編集する専用parser / AST変換scriptを追加する。
- maintenance workflowのchanged-file allowlistへ`app.config.ts`を追加する。
- workflowのmain guardを検証目的で緩める。
- `expo install --fix`のexit codeを無視する。
- `continue-on-error`でDoctor / compatibility checkを通過扱いにする。
- Expo Doctorからversion checkを除外する。
- `expo.install.exclude`へ今回の対象packageを追加して不一致を隠す。
- Expo / React Native major.minorを更新する。
- peer warningを消すためだけにtransitive packageをdirect dependencyへ追加する。
- 根拠なく新しい`pnpm.overrides`を追加する。
- `expo-sqlite`へ未使用のoptionやcustom build flagを追加する。
- testのためだけにApp Config用の新しいproduction helper / factoryを追加する。
- `android/` / `ios/`をGit管理へ追加する。
- update path確認のためだけに、最終更新後のpackageを再downgradeして検証をやり直す。
- branch上でworkflowの`git diff --name-only HEAD`をそのままallowlist判定に使い、人間変更をautomation生成差分と誤認する。
- Issue #141と無関係なdependency整理を同時に行う。

## 11. 実装順序

1. `main`差分と実装時点のSDK 57推奨versionを確認する。
2. `app.config.ts`へ`expo-sqlite`を明示する。
3. `expo config --json`と`expo config --type prebuild --json`を実行し、`_internal.pluginHistory["expo-sqlite"]`までassertする。
4. `tests/contracts/app-config.test.ts`へplugin回帰testを追加する。
5. fix直前の変更path一覧と`app.config.ts` / contract testのhashを基準点として記録する。
6. version mismatch状態のまま`expo install --fix`を1回実行し、dynamic config blockerの解消と基準ファイル不変を確認する。
7. `expo-constants` overrideとlockfileを同期し、基準点との差分からautomation由来の変更pathを確認する。
8. Expo check / Doctorとpeer warningを確認する。
9. prebuild、contract test、Native test、Repository標準検証を実行する。
10. active Run Artifactを更新した場合はsanitizationのWrite / Checkを完了する。
11. workflow自体は別のworkflow固有不具合が確認されない限り変更しない。
12. PR CIで`Web CI / verify`、`native-ci / verify`、Android / iOS buildを含む必須CIを確認する。
13. main反映後にmaintenance workflowのno-op経路を確認する。

この順序により、今回の不具合を最初に発生しているApp ConfigとExpo CLIの境界で修正し、既存workflowの安全guardやPR作成経路を不要に変更しない。