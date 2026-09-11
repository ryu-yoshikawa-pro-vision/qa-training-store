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
  - `app.config.ts`と`expo-sqlite`のconfig plugin状態を明示的に整合させる。
  - `Native Static`のExpo Doctorを復旧する。
  - `Expo Dependency Maintenance`をdynamic configエラーで停止させず、no-opまたは既存の更新PR作成経路へ進める状態に戻す。
  - workflowへdynamic configの汎用編集機構を追加しない。

## 1. ゴール / 完了条件

### ゴール

Issue #141で確認された2つの失敗を、同じ原因領域で最小限に解消する。

1. Expo SDK 57の互換version mismatchを解消する。
2. `expo install --fix`が`expo-sqlite`を`app.config.ts`へ追加しようとして停止する状態を解消する。

### 完了条件

- `pnpm exec expo install --check`が成功する。
- Native Staticと同じ`pnpm dlx expo-doctor@1.17.6`が成功する。
- `pnpm install --frozen-lockfile`が成功する。
- `app.config.ts`の`plugins`とインストール済みExpo moduleの状態が整合している。
- `expo-sqlite`をconfig pluginへ追加する場合、その理由が「将来用」ではなく、現在のExpo CLI / maintenance workflowの実行要件として説明できる。
- `expo-sqlite`をconfig pluginへ追加した結果、Android / iOSの既存prebuild・build契約を壊していない。
- `package.json`のExpo互換packageが、実装時点の`pnpm exec expo install --check`が示すSDK 57推奨versionへ更新されている。
- `pnpm.overrides.expo-constants`が更新後のdirect dependencyと矛盾していない。
- `pnpm-lock.yaml`が最終`package.json`と整合している。
- Expo / React Nativeのmajor.minorが変更されていない。
- peer dependency warningを確認し、今回の変更で実害があるものと、警告のみのものを区別している。
- warningを消すことだけを目的に不要なdirect dependency、override、major.minor upgradeを追加していない。
- `Expo Dependency Maintenance`の既存no-op / update分岐、major.minor guard、changed-file allowlist、非force push、main向けPR作成契約を維持している。
- 更新不要状態では、`main`上の`Expo Dependency Maintenance`が正常にno-opする。
- 更新必要状態について、今回のdynamic config blockerが除去され、`expo install --fix`後に自動生成される変更が既存allowlistの`package.json` / `pnpm-lock.yaml`へ収まることを実装時に再現確認する。
- `Native Static`が成功する。
- Android / iOSの既存build保証を壊していない。
- 関連contract testとRepository標準検証が成功する。

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

実装時にはこの表を固定値として無条件に使わず、branch上で`pnpm exec expo install --check`を再実行し、その時点のSDK 57推奨値を確認してから更新する。

#### `Expo Dependency Maintenance`の失敗位置

run `34620578860`では次の順に進んだ。

1. `pnpm install --frozen-lockfile`: 成功。
2. `pnpm exec expo install --check`: 8 packageの不一致を検出。
3. `pnpm exec expo install --fix`: package更新を開始。
4. package更新後、Expo CLIが`expo-sqlite`のconfig plugin追加を要求。
5. `app.config.ts`がdynamic configのためExpo CLIが自動編集できず、exit code 1で停止。
6. 以後の`Sync expo-constants override`、lockfile再生成、major.minor guard、再install、再check、allowlist確認、branch / PR作成はすべて未実行。

つまり、workflowのPR作成処理やallowlist処理で失敗したのではなく、その前段の`expo install --fix`で停止している。

#### `app.config.ts`

現在の`plugins`は次の2系統だけである。

- `expo-router`
- `expo-build-properties`

`expo-sqlite`は`package.json`のdependencyには存在するが、`plugins`にはない。

#### Expo公式仕様

Expo公式ドキュメントでは、config pluginを持つmoduleを`expo install`した場合、Expo CLIはpluginをapp configへ追加しようとする。一方、`app.config.js` / `app.config.ts`のdynamic configはCLIが自動編集できず、開発者が手動で更新する必要がある。

また、`expo-sqlite`はbuilt-in config pluginを持つ。公式SQLiteドキュメントではconfig pluginは主にnative build時の設定値を扱うために使われている。

このため、`expo-sqlite`のconfig pluginが通常のSQLite API利用そのものに必須かどうかと、現在のRepositoryで`expo install --fix`を正常に完了させるために明示登録が必要かは分けて判断する。

今回のRepositoryでは、maintenance workflowが`expo install --fix`を正式な更新経路として使っているため、CLIが追加を要求するpluginをdynamic configへ明示することには現在の運用上の理由がある。

参考:

- Expo Config plugins / `expo install`: https://docs.expo.dev/config-plugins/development-and-debugging/
- Expo app config / dynamic configuration: https://docs.expo.dev/workflow/configuration/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/

#### maintenance workflowの既存契約

`.github/workflows/expo-dependency-maintenance.yml`はすでに次を実装している。

- scheduleと`workflow_dispatch`だけで起動する。
- manual runは`main`以外を拒否する。
- checkout対象を`main`へ固定する。
- 既存のautomation PRがあれば重複作成しない。
- `expo install --check`でno-op / updateを分岐する。
- update前後でExpo / React Nativeのmajor.minorをguardする。
- Repository固有の`pnpm.overrides.expo-constants`をdirect dependencyへ同期する。
- override同期後にlockfileを再生成する。
- update後に`pnpm install --frozen-lockfile`と`expo install --check`を再実行する。
- changed fileを`package.json`と`pnpm-lock.yaml`だけに制限する。
- force pushしない。
- auto-mergeしない。

`tests/contracts/expo-dependency-maintenance-workflow.test.ts`がこれらを契約として固定している。

今回の失敗だけを理由に、このallowlistへ`app.config.ts`を追加しない。`app.config.ts`は人間が意図を確認して明示変更する設定であり、定期dependency updateの自動変更対象へ広げる必要はない。

#### PR #136の実績

同じmaintenance workflowは2026-09-09にPR #136「chore: Expo SDK推奨依存へ同期する」を自動作成し、`package.json`と`pnpm-lock.yaml`だけの更新を完了している。

したがって、branch作成・commit・push・PR作成の経路は過去に動作実績がある。Issue #141では、今回新たに発生したdynamic config blockerと互換version差分を優先して扱う。

#### Native CIの状況

PR #133 run `34617976977`では、Android Automation Build、Android Production-validation Build、iOS Automation Build、iOS Production-validation Buildは成功している。

失敗したのは`Native Static`の`Run Expo Doctor`で、17 checks中1 check、8 packageのpatch mismatchだけが失敗理由として出ている。

この結果から、現状の8 package mismatchだけで既存Android / iOS buildが壊れているとは判断しない。ただし、更新後にも同じbuild経路が成立することは確認する。

### peer dependency warning

`expo install --fix`の途中で少なくとも次のwarningが確認されている。

- `expo-router 57.0.21` / `expo-constants`
- `react-native 0.86.3` / `@react-native/jest-preset`
- `@react-native/community-cli-plugin` / `@react-native/metro-config`
- `expo-modules-core` / `react-native-worklets`

これらはwarningが出た事実だけではIssue #141の追加修正対象と確定しない。

判断基準:

- Expo SDK 57の公式互換versionへ揃えた後もwarningが残るか確認する。
- `pnpm install --frozen-lockfile`、Expo Doctor、test、prebuild、buildを阻害するwarningは原因を確認する。
- Repositoryがdirect dependencyとして管理しているpackageで、同じmajor.minor内のpatch整合が必要と確認できた場合だけ追加更新を検討する。
- transitive dependencyのwarningを消すためだけに新しいdirect dependencyやoverrideを追加しない。
- Expo CLIの期待versionとpackage peer metadataが一時的に食い違う場合、warningを消すためにExpo推奨versionから戻さない。
- React Native / Expoのmajor.minor upgradeへ広げない。

### 前提

- 実装開始時に`main`が進んでいる場合は、branch作成時SHAとの差分を確認してからrebase / merge方針を決める。Plan保存だけの現時点ではbranchを動かさない。
- package version更新は手編集で推測せず、まず`pnpm exec expo install --check`と`pnpm exec expo install --fix`を使う。
- `expo install --fix`を実行する前に、dynamic config blockerを先に解消する。
- `pnpm.overrides.expo-constants`は既存workflowと同じ考え方でdirect dependencyへ同期する。
- `app.config.ts`に`expo-sqlite`を追加する場合、config optionは要求されていないため、根拠なく`enableFTS`、`useSQLCipher`等を設定しない。
- pluginの並び順は既存設定を壊さないよう、`expo-router`と`expo-build-properties`の構成を維持しつつ`expo-sqlite`を明示的なpluginとして追加する。prebuild差分で順序依存が確認された場合のみ見直す。

### 対象外

- Expo SDK 58以降へのupgrade。
- React Native 0.87以降へのupgrade。
- `Expo Dependency Maintenance`の汎用dependency updater化。
- dynamic `app.config.ts`を自動編集する独自script / AST editorの追加。
- changed-file allowlistを将来用に広げること。
- peer warningをゼロにすること自体を完了条件にすること。
- Issue #141と無関係なdependency整理。
- PR #133のカリキュラム変更。
- Dependabotや他workflowの再設計。

## 3. 質問 / 曖昧性

### 実装前に確認するが、現時点で質問して停止しない事項

1. `expo-sqlite` config pluginの明示追加が、default optionのままAndroid / iOS生成物へどの差分を発生させるか。
2. 8 package更新後に、Issueで確認されたpeer dependency warningがどれだけ残るか。
3. 実装時点でExpo SDK 57の推奨patchが2026-09-11時点からさらに進んでいないか。
4. `pnpm.overrides.expo-constants`へdirect dependencyのrange文字列をそのまま同期した場合、lockfileが期待versionへ一意に解決されるか。

### 判断ルール

- `expo-sqlite` plugin追加後に`expo config --json`、clean prebuild、Android / iOS buildが成功し、意図しないnative変更が出なければ、明示plugin登録を採用する。
- default plugin追加でnative生成物に差分が出る場合、その差分がExpo SQLiteの標準plugin動作かを確認する。既存native contractを壊す場合は、pluginを追加するだけで完了扱いにしない。
- package推奨versionが更新されていた場合は、Issue本文の古いpatchへ固定せず、その時点のSDK 57互換versionを使う。ただしmajor.minorは維持する。
- warningが残っても標準検証がすべて成功し、upstream peer metadata上の不一致と説明できる場合は追加修正しない。

### 未回答の重要事項

- `expo-sqlite` plugin追加後の実際のprebuild差分は、実装branchで依存を構築して検証するまで未確認。
- 更新後のpeer warningが実害を持つかは未確認。
- workflowの次回実更新時にGitHub側でPR作成まで成功することは、現時点のbranchだけでは完全には再現できない。過去のPR #136実績と、実装時のupdate-path再現、merge後のmain no-op実行を組み合わせて確認する。

## 4. 影響範囲

### 変更予定

#### `app.config.ts`

- `plugins`へ`expo-sqlite`を明示追加する。
- optionは追加しない。
- 既存のruntime metadata、Android package、iOS bundle identifier、`expo-router`、`expo-build-properties`設定を変更しない。

#### `package.json`

- Expo SDK 57互換packageを`expo install --fix`が示す内容へ更新する。
- `pnpm.overrides.expo-constants`を更新後のdirect dependencyと同期する。
- Expo / React Nativeのmajor.minorを変更しない。
- peer warningだけを理由に不要なpackage追加をしない。

#### `pnpm-lock.yaml`

- 最終`package.json`に合わせて再生成する。
- unrelated packageの意図しない大量更新がないかdiffを確認する。

### 変更要否を実装時に判断

#### `tests/contracts/app-config.test.ts`

`expo-sqlite` plugin明示登録をRepository contractとして固定する価値がある。

優先順:

1. 既存`app.config.ts`のdefault exportをproduction code側の余計なrefactorなしで直接評価できるなら、resolved configの`plugins`に`expo-sqlite`が1回だけ含まれることをcontract testへ追加する。
2. testのためだけにconfig factoryや新しい公開helperを追加する必要があるなら、過剰なproduction refactorは行わない。
3. その場合はExpo Doctor、`expo config --json`、prebuild、maintenance update-path再現を主な回帰確認とし、静的文字列testだけを無理に追加しない。

#### `.github/workflows/expo-dependency-maintenance.yml`

原則変更しない。

変更を検討する条件は、`app.config.ts`と互換packageを正しく揃えた後も、workflow固有の処理に別の欠陥が再現した場合だけとする。

今回のdynamic config失敗だけを理由に次を行わない。

- `app.config.ts`をchanged-file allowlistへ追加する。
- `app.config.ts`の自動編集stepを追加する。
- `expo install --fix`を独自package更新scriptへ置き換える。
- allowlistを削除・緩和する。

#### `tests/contracts/expo-dependency-maintenance-workflow.test.ts`

workflowを変更しないなら変更しない。

workflow変更が本当に必要になった場合のみ、既存contractを維持または意図した変更へ更新する。

### 確認対象

- `package.json`
- `pnpm-lock.yaml`
- `app.config.ts`
- `.github/workflows/expo-dependency-maintenance.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/app-config.test.ts`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- Expo SQLiteを利用する`src/infrastructure/database/sqlite/**`

SQLite application codeは、config plugin追加でruntime API利用方法を変える必要がない限り変更しない。

## 5. 変更方針

### 方針A: dynamic config blockerを先に解消する

1. 実装開始時の`main`との差分を確認する。
2. clean install可能な状態を作る。
3. 現在の`pnpm exec expo install --check`結果を保存する。
4. `app.config.ts`へ`expo-sqlite`を文字列pluginとして追加する。
5. `pnpm exec expo config --json`でconfig解決が成功することを確認する。
6. `expo-sqlite`がresolved plugin一覧へ入っていることを確認する。
7. ここではpackage versionをまだ手編集しない。

期待する形の例:

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

plugin順序は上記を初期案とするが、既存prebuildと比較して問題がないことを確認する。

### 方針B: Expo SDK 57互換packageをCLIで更新する

`app.config.ts`を先に整合させた後、次を実行する。

```bash
pnpm exec expo install --fix
```

実行後に確認する。

- `expo install --fix`がdynamic configエラーで停止しない。
- `package.json`で変更されたpackageがIssue #141の対象と整合する。
- Expo / React Nativeのmajor.minorが変わっていない。
- `app.config.ts`へ追加の自動変更が発生していない。
- 意図しないdependencyが追加されていない。

### 方針C: `expo-constants` overrideを同期する

現行workflowと同じルールを適用する。

- `dependencies["expo-constants"]`を確認する。
- `pnpm.overrides.expo-constants`をdirect dependencyと同じversion指定へ同期する。
- override自体を削除するかどうかは今回のIssueでは再設計しない。

同期後:

```bash
pnpm install --lockfile-only --no-frozen-lockfile
pnpm install --frozen-lockfile
```

確認事項:

- lockfileが最終manifestと一致する。
- `expo-constants`の解決versionが期待したpatchになる。
- unrelated dependencyの大量変更がない。

### 方針D: peer dependency warningを再確認する

更新後に`pnpm install --frozen-lockfile`のwarningを記録し、次の順で判断する。

#### `expo-router` / `expo-constants`

- Expo CLIが要求する2 packageのversionを優先して`expo install --check`とExpo Doctorを確認する。
- `expo-router`側peer metadataが古いpatchを要求していても、Expo公式checkが新patchを要求し標準検証が成功するなら、warningだけを消すために`expo-constants`を戻さない。

#### `react-native` / `@react-native/jest-preset`

- `@react-native/jest-preset`はRepositoryのdirect devDependencyなので、warningが残る場合はsame `0.86.x` lineのpatch整合を確認する。
- patch更新が必要と判断した場合でも、Native Jest testがすべて成功することを条件とする。
- warningだけで無条件に更新しない。

#### `@react-native/community-cli-plugin` / `@react-native/metro-config`

- transitive dependencyの状態を確認する。
- warningを消すだけの目的で`@react-native/metro-config`を新しいdirect dependencyへしない。
- prebuild / Android buildへ実害がある場合だけ原因を追う。

#### `expo-modules-core` / `react-native-worklets`

- direct dependencyかtransitive dependencyかを確認する。
- Expo SDK 57の標準解決でDoctor・buildが成功するなら、warning抑制用のoverrideを追加しない。

### 方針E: config pluginによるnative差分を確認する

config plugin追加によって既存native build契約が変わらないことを確認する。

最低限:

```bash
pnpm exec expo config --json
pnpm exec expo prebuild --platform android --no-install
```

可能な環境ではiOSも確認する。

```bash
pnpm exec expo prebuild --platform ios --no-install
```

既存RepositoryではAndroid / iOS buildがGitHub Actions上で保証されているため、ローカルprebuildだけで完了扱いにせずPR CI結果も確認する。

prebuildがtracked native fileを変更する場合:

- `expo-sqlite` pluginの標準動作による必要差分か確認する。
- 現在のnative directory管理方針と照合する。
- 必要差分ならIssue #141の範囲として扱うかを根拠付きで判断する。
- 不要・環境依存の生成差分ならcommitしない。

### 方針F: maintenance update pathを実装branchで再現する

本workflowはmanual runでも`main`以外を拒否し、checkoutも`main`固定である。そのため、Issue branchのGitHub Actionsをそのまま実行してupdate pathを検証するためにworkflowの安全guardを緩めない。

代わりに、実装時は次の形で今回のblocker除去を確認する。

1. `app.config.ts`へ`expo-sqlite`を追加した状態を基準にする。
2. package更新前の状態または一時worktreeで`pnpm exec expo install --fix`を実行する。
3. dynamic config errorが再発しないことを確認する。
4. `expo install --fix`後、workflowと同じ`expo-constants` override同期を行う。
5. lockfile再生成、major.minor guard相当の確認、frozen install、`expo install --check`を行う。
6. 自動更新による変更が`package.json` / `pnpm-lock.yaml`へ限定されることを確認する。
7. 一時的なdowngradeや検証用変更は最終diffへ残さない。

Git pushやPR作成処理そのものはPR #136で既存workflowの動作実績があるため、Issue #141のbranch検証用に安全guardを壊して再実行しない。

### 方針G: merge後にmain no-opを確認する

Issue #141の実装がmainへ入った後、`Expo Dependency Maintenance`を`workflow_dispatch`で`main`から実行する。

期待結果:

- `Check Expo-compatible dependencies`: success。
- `needs_fix=false`。
- `Finish without changes when dependencies are compatible`: 実行。
- `Fix Expo-compatible dependencies`以降のupdate path: skip。
- workflow全体: success。

この確認はbranch上ではなく、mainへ反映された後の運用確認として扱う。

## 6. 実行タスク

### 実装前確認

- [ ] `main`の最新SHAとbranch作成時SHA `12fff8e...`の差分を確認する。
- [ ] Issue #141、run `34620578860`、run `34617976977`の失敗内容を再確認する。
- [ ] `pnpm install --frozen-lockfile`を実行する。
- [ ] `pnpm exec expo install --check`を実行し、実装時点の対象packageと期待versionを記録する。
- [ ] `pnpm dlx expo-doctor@1.17.6`のbaseline failureを確認する。

### config修正

- [ ] `app.config.ts`の`plugins`へ`expo-sqlite`を明示追加する。
- [ ] `expo-sqlite`へ不要なoptionを追加しない。
- [ ] `pnpm exec expo config --json`が成功することを確認する。
- [ ] resolved configで`expo-sqlite`が重複せず登録されていることを確認する。

### dependency更新

- [ ] `pnpm exec expo install --fix`を実行する。
- [ ] dynamic config errorが消えたことを確認する。
- [ ] `package.json`の変更packageを確認する。
- [ ] Expo / React Nativeのmajor.minorが変わっていないことを確認する。
- [ ] `pnpm.overrides.expo-constants`をdirect dependencyへ同期する。
- [ ] `pnpm install --lockfile-only --no-frozen-lockfile`でlockfileを再生成する。
- [ ] `pnpm install --frozen-lockfile`を再実行する。
- [ ] peer dependency warningを分類する。

### 回帰確認

- [ ] `pnpm exec expo install --check`を再実行して成功する。
- [ ] `pnpm dlx expo-doctor@1.17.6`を再実行して成功する。
- [ ] `pnpm exec expo config --json`を再確認する。
- [ ] Android clean prebuildを確認する。
- [ ] 実行可能な環境ではiOS clean prebuildも確認する。
- [ ] config plugin追加によるtracked native diffを確認する。
- [ ] `tests/contracts/app-config.test.ts`へ過剰なproduction refactorなしでplugin contractを追加できるか判断する。
- [ ] workflowを変更していない場合、`tests/contracts/expo-dependency-maintenance-workflow.test.ts`がそのままPASSすることを確認する。

### maintenance update-path確認

- [ ] plugin追加済み・互換package更新前相当の一時状態で`expo install --fix`を再現し、dynamic config errorが出ないことを確認する。
- [ ] workflowと同じoverride同期、lockfile再生成、major.minor確認、frozen install、再checkを通す。
- [ ] 自動更新による変更が`package.json` / `pnpm-lock.yaml`へ限定されることを確認する。
- [ ] 検証用の一時変更を最終diffから除去する。

### 標準検証

変更内容に応じて最低限次を実行する。

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
git diff --check
```

Repository標準の最終確認:

```bash
pnpm run verify
```

Native関連変更としてPR上では少なくとも次のCI結果を確認する。

- `Native Static`
- `Android Automation Build`
- `Android Production-validation Build`
- `Native iOS CI / iOS Automation Build`
- `Native iOS CI / iOS Production-validation Build`
- `native-ci / verify`

package / config変更によりWeb側CIが起動する場合は、その結果も失敗がないことを確認する。

### merge後確認

- [ ] main反映後、`Expo Dependency Maintenance`を`workflow_dispatch`で実行する。
- [ ] no-opでsuccessになることを確認する。
- [ ] dynamic config errorが再発しないことを確認する。
- [ ] 不要なautomation PRが作成されないことを確認する。

## 7. 検証方法

### 依存関係の成功判定

```bash
pnpm exec expo install --check
```

- exit code 0。
- 8 packageまたは実装時点で検出されたSDK 57 packageについてoutdated扱いが残らない。

```bash
pnpm dlx expo-doctor@1.17.6
```

- exit code 0。
- `Check that packages match versions required by installed Expo SDK`がPASSする。

### manifest / lockfile整合

```bash
pnpm install --frozen-lockfile
```

- exit code 0。
- lockfile更新要求が出ない。

必要に応じて:

```bash
pnpm why expo-constants
pnpm why expo-sqlite
pnpm why expo-router
```

で解決versionと依存経路を確認する。

### app config

```bash
pnpm exec expo config --json
```

- config解決が成功する。
- `plugins`に`expo-sqlite`が存在する。
- 既存の`expo-router` / `expo-build-properties`設定が維持される。
- runtime metadataが変わっていない。

### native prebuild / build

- Android prebuildが成功する。
- iOS prebuildを実行可能な環境では成功する。
- PR CIのAndroid / iOS buildが成功する。
- production / automation build metadata contractを壊していない。

### workflow contract

```bash
pnpm exec vitest run tests/contracts/expo-dependency-maintenance-workflow.test.ts --no-file-parallelism --maxWorkers=1
```

- 既存のtrigger、permission、main guard、duplicate PR guard、major.minor guard、allowlist、非force push、非auto-merge契約がPASSする。

workflowを変更しない場合でも、dependency / config変更が既存contractと矛盾しないことを確認するため実行する。

### app config contract

contract testを追加する場合:

- `expo-sqlite`がpluginとして1回だけ存在する。
- 既存pluginを削除していない。
- testのためだけのproduction abstractionを増やしていない。

### update-path再現

一時状態で`expo install --fix`を実行し、最低限次を確認する。

- dynamic config errorなし。
- Expo / React Native major.minor不変。
- final `expo install --check` success。
- 自動更新対象が`package.json` / `pnpm-lock.yaml`に限定される。

### 最終diff

```bash
git diff --check
git status --short
```

期待する最終変更候補:

- `app.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- 必要性を確認できた場合だけ`tests/contracts/app-config.test.ts`
- workflow固有の別不具合が確認された場合だけ`.github/workflows/expo-dependency-maintenance.yml`と対応contract test

これ以外の変更が出た場合は、Issue #141との因果を説明できなければ除外する。

## 8. リスクと未解決論点

### `expo-sqlite` pluginのnative生成差分

`expo-sqlite`のconfig pluginにはnative build設定を変更する能力がある。default optionで実際にどの差分が出るかはprebuildで確認する。

対策:

- optionを指定しない。
- clean prebuildの差分を確認する。
- Android / iOS CIで実buildを確認する。

### Expo packageの公開タイミング差

Issue作成後にSDK 57の推奨patchが進む可能性がある。

対策:

- 実装時の`expo install --check`を正とする。
- major.minor guardは維持する。
- Issue本文のpatchへ古く固定しない。

### peer metadataの一時不整合

Expo CLIが推奨するversionと、個別packageのpeerDependenciesが同時に更新されない場合がある。

対策:

- warningだけでversionを戻さない。
- Expo Doctor、test、prebuild、buildの実結果で判断する。
- transitive warning用の独自overrideを増やさない。

### maintenance workflowのbranch検証制約

workflowはmain専用なので、Issue branchから実際のautomation PR作成まで通すことは安全guard上できない。

対策:

- guardを緩めない。
- PR #136の既存PR作成実績を使う。
- branchでは今回のblockerまで含めたupdate stepを一時再現する。
- merge後にmain no-opを実行する。

### lockfileの不要差分

`expo install --fix`とoverride同期でlockfileに広い差分が出る可能性がある。

対策:

- `package.json`の変更を先に確認する。
- lockfile diffが対象packageの解決変更で説明できるか確認する。
- unrelated dependency更新を同じPRへ混ぜない。

## 9. 成果物

### 実装PRで想定する変更

必須候補:

- `app.config.ts`
- `package.json`
- `pnpm-lock.yaml`

条件付き:

- `tests/contracts/app-config.test.ts`

原則変更しない:

- `.github/workflows/expo-dependency-maintenance.yml`
- `tests/contracts/expo-dependency-maintenance-workflow.test.ts`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`

原則変更しないファイルへ変更が必要になった場合は、Issue #141の既知原因だけでは説明できない別の再現結果を先に示す。

### 保存Plan

- `docs/plans/2026-09-12_071621_issue-141-expo-dependency-maintenance.md`

## 10. 実装時に避ける対応

- `app.config.ts`を自動編集する専用parser / AST変換scriptを追加する。
- maintenance workflowのchanged-file allowlistへ`app.config.ts`を追加して症状だけ回避する。
- `expo install --fix`のexit codeを無視する。
- `continue-on-error`でDoctor / compatibility checkを通過扱いにする。
- Expo Doctorからversion checkを除外する。
- `expo.install.exclude`へ今回の8 packageを追加して不一致を隠す。
- Expo / React Native major.minorを更新する。
- peer warningを消すためだけにtransitive packageをdirect dependencyへ追加する。
- 根拠なく新しい`pnpm.overrides`を追加する。
- `expo-sqlite`へ未使用の`enableFTS`、`useSQLCipher`、custom build flags等を追加する。
- Issue #141と無関係なdependency整理を同時に行う。

## 11. 実装開始時の判断順序

1. `main`差分と実装時点のExpo推奨versionを確認する。
2. `app.config.ts`へ`expo-sqlite`を明示してdynamic config blockerを先に除去する。
3. `expo install --fix`でSDK 57互換patchへ更新する。
4. `expo-constants` overrideとlockfileを同期する。
5. Expo check / Doctorを通す。
6. peer warningを再確認し、実害があるものだけ追加対応を検討する。
7. prebuild / contract test / native test /標準検証を通す。
8. workflow自体は、別のworkflow固有不具合が確認されない限り変更しない。
9. PR CIでAndroid / iOS buildを確認する。
10. merge後にmainのmaintenance workflowを手動実行し、no-op successを確認する。

この順序を崩して、先にworkflowのallowlistや自動編集機構を広げない。今回の失敗は、まずRepositoryのdynamic app configとExpo CLIが要求するplugin状態を一致させれば解消できる可能性が高く、既存の安全guardを削る理由にはならない。
