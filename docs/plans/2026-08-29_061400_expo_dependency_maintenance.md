# Expo SDK 推奨依存バージョン定期メンテナンス 実装プラン

## 目的

Expo SDK が現在推奨する依存バージョンと Repository の `package.json` / `pnpm-lock.yaml` のずれにより、`Mobile App CI` の `Native Static > Run Expo Doctor` が失敗する事象を定期的に検知し、安全に修正用 Pull Request を作成できるようにする。

今回自動化する対象は、**現在使用中の Expo SDK line に対する compatible dependency version の不一致だけ**とする。

一般的な dependency update、Expo SDK major / minor upgrade、React Native major / minor upgrade、その他の Expo Doctor failure は自動修正しない。

## 現状と前提

現在の `Mobile App CI` では `Native Static` job で次を実行している。

```text
pnpm dlx expo-doctor@${EXPO_DOCTOR_VERSION}
```

`package.json` または `pnpm-lock.yaml` が変更された Pull Request は Native change として扱われ、既存の Android / iOS build、Bundle Guard、Maestro 等の検証対象になる。

直近では Expo Doctor の dependency version check により、現在の Expo SDK 57 line に対する patch version mismatch が検出されている。

具体的な target package / target patch version を Workflow 内へ固定せず、Repository にインストールされている Expo CLI の compatibility metadata を正本として利用する。

利用するコマンドは次とする。

```text
pnpm exec expo install --check
pnpm exec expo install --fix
```

- `expo install --check`: 現在の Expo SDK と Expo-managed dependency の推奨 version 差分を確認する。
- `expo install --fix`: 現在の Expo SDK に対して compatible な version へ補正する。

Package manager / runtime は既存 CI と揃える。

```text
Node.js: 24
pnpm: 9.10.0
```

追加 PAT、GitHub App、外部 credential は導入せず、GitHub Actions の `GITHUB_TOKEN` を利用する。

## 完了時の状態

- Expo compatible dependency check が週1回自動実行される。
- `workflow_dispatch` から手動実行できる。
- mismatch がなければ Repository を変更せず正常終了する。
- mismatch がある場合だけ `expo install --fix` を実行する。
- Expo SDK major / minor と React Native major / minor が不変の場合だけ自動修正を続行する。
- 自動修正の Repository diff が `package.json` / `pnpm-lock.yaml` だけの場合に限り修正 PR を作成する。
- 同じ目的の OPEN maintenance PR がある場合は重複 PR を作らない。
- 修正 PR は auto-merge しない。
- 修正 PR 作成後、既存 Web CI / Mobile App CI を `workflow_dispatch` で補助的に実行する。
- PR 固有の `pull_request` validation と、maintenance Workflow からの `workflow_dispatch` validation を同一視しない。
- 一般的な package update、Expo SDK upgrade、React Native major / minor upgradeは行わない。

## Repository 設定の前提

GitHub Actions から branch push / PR 作成を行うため、Repository / Organization 側で GitHub Actions に必要な権限が許可されていることを運用前提とする。

特に Repository の Actions 設定で、GitHub Actions が Pull Request を作成できる設定が有効であることを初回運用前に確認する。

Workflow 自体には必要最小限の権限だけを付与する。

```yaml
permissions:
  contents: write
  pull-requests: write
  actions: write
```

次は付与しない。

- `issues: write`
- `deployments: write`
- `packages: write`
- `id-token: write`

Repository / Organization policy により `GITHUB_TOKEN` で branch push、PR 作成、workflow dispatch のいずれかが許可できない場合は Stop 条件とする。PAT / GitHub App をこのタスク内で追加しない。

## 実装内容

### 1. 専用 Workflow を追加する

新規ファイルを追加する。

```text
.github/workflows/expo-dependency-maintenance.yml
```

Workflow name:

```text
Expo Dependency Maintenance
```

Trigger:

```yaml
on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
```

`0 0 * * 1` は毎週月曜日 00:00 UTC / JST 09:00 とする。

`pull_request` / `push` trigger は追加しない。通常 PR ごとに maintenance check を重複実行しない。

### 2. 同時実行を防止する

Workflow 単位で concurrency を設定する。

```yaml
concurrency:
  group: expo-dependency-maintenance
  cancel-in-progress: false
```

実行中の maintenance を途中キャンセルして別実行へ差し替えない。

### 3. OPEN maintenance PR の重複を防止する

dependency check / fix を開始する前に、base `main` の OPEN PR を確認する。

固定 PR title:

```text
chore: Expo SDK推奨依存へ同期する
```

自動 branch prefix:

```text
automation/expo-compatible-dependencies-
```

上記 title かつ branch prefix に一致する OPEN PR が1件以上ある場合は、新しい branch / commit / PR を作らず正常終了する。

Job Summary に既存 maintenance PR のため skip したことを記録する。

既存 maintenance PR を自動更新、force push、close する処理は作らない。

### 4. 現在の lockfile で install する

既存 CI と同じ setup を使用し、開始時に次を実行する。

```text
pnpm install --frozen-lockfile
```

check 前に lockfile を暗黙更新しない。

### 5. Expo / React Native の major.minor を修正前に記録する

`expo install --fix` 前に `package.json` から次を読み取る。

```text
dependencies.expo
dependencies.react-native
```

それぞれ major / minor の数字を取得する。

例:

```text
57.0.17   -> 57.0
~57.0.18  -> 57.0
0.86.3    -> 0.86
~0.86.4   -> 0.86
```

新しい semver library は追加せず、Node.js の短い script で major / minor を抽出する。

次の場合は Workflow を失敗させ、自動修正を開始しない。

- `expo` が存在しない。
- `react-native` が存在しない。
- いずれかの major / minor を一意に取得できない。

### 6. `expo install --check` で mismatch を確認する

次を実行する。

```text
pnpm exec expo install --check
```

#### PASS

更新不要として正常終了する。

- branch を作らない。
- commit しない。
- PR を作らない。
- Web CI / Mobile App CI を追加 dispatch しない。
- Job Summary に `No Expo dependency update required` 相当を記録する。

#### non-zero

自動修正候補として `expo install --fix` へ進む。

`--check` の non-zero だけを根拠に PR を作らない。後続 safety check がすべて PASS した場合だけ PR を作成する。

### 7. `expo install --fix` を実行する

次を実行する。

```text
pnpm exec expo install --fix
```

特定 package 名や target patch version を update command に hard-codeしない。

例えば現在発生している `expo` / `expo-constants` だけを専用更新する処理にはしない。

### 8. Expo SDK major / minor と React Native major / minor の変更を禁止する

`--fix` 後に再度 `package.json` から次を取得する。

```text
expo major.minor
react-native major.minor
```

修正前後がそれぞれ一致することを必須とする。

許可例:

```text
expo:         57.0.x -> 57.0.y  OK
react-native: 0.86.x -> 0.86.y  OK
```

禁止例:

```text
expo:         57.0.x -> 57.1.x  NG
expo:         57.0.x -> 58.0.x  NG
react-native: 0.86.x -> 0.87.x  NG
react-native: 0.86.x -> 1.0.x   NG
```

どちらかの major / minor が変化した場合は Workflow を失敗させ、branch / commit / PR を作成しない。

Expo SDK upgrade / React Native major・minor upgrade は別タスクとして扱う。

### 9. 自動修正で変更可能な Repository file を固定する

`expo install --fix` 後の Git diff を確認する。

許可する変更ファイルは次だけとする。

```text
package.json
pnpm-lock.yaml
```

条件:

- diff が空なら失敗する。
- changed file が上記2ファイルの subset である。
- 上記以外が1件でも変更されたら失敗する。

特に次が変更された場合は PR を作らない。

- `app.config.ts`
- `android/**`
- `ios/**`
- `.github/workflows/**`
- source code
- generated assets

Workflow runner は ephemeral なので、失敗時の自動 revert / cleanup commit は作らない。

### 10. 修正後の dependency contract を再確認する

次を実行する。

```text
pnpm install --frozen-lockfile
pnpm exec expo install --check
git diff --check
```

すべて PASS を必須とする。

ここでは full `expo-doctor` を maintenance PR 作成前の Gate に追加しない。

理由は、この Workflow の自動修正責務を compatible dependency mismatch に限定し、その他の Expo Doctor Finding を自動修正判断へ混在させないためである。

Full Expo Doctor は既存 `Mobile App CI` に任せる。

### 11. 一意な修正 branch を作成して push する

すべての safety check が PASS した場合だけ branch / commit / push を行う。

branch name:

```text
automation/expo-compatible-dependencies-${GITHUB_RUN_ID}
```

commit message:

```text
chore: align Expo SDK compatible dependencies
```

Git author は GitHub Actions bot を使用する。

commit 対象は次だけとする。

```text
package.json
pnpm-lock.yaml
```

force push / force-with-lease は使用しない。

#### Git push の認証方法

既存 Repository の CI が `persist-credentials: false` を基本としているため、この maintenance Workflow でも checkout credential を永続化しない。

```yaml
- uses: actions/checkout@...
  with:
    persist-credentials: false
```

push 前に `GH_TOKEN=${{ github.token }}` を利用して GitHub CLI の git credential を明示設定する。

実装は `gh auth setup-git` 等の GitHub CLI 標準機能を利用し、token を remote URL や log に埋め込まない。

### 12. 修正 PR を OPEN で作成する

GitHub CLI と `GITHUB_TOKEN` を使用して base `main` の Pull Request を作成する。

PR title:

```text
chore: Expo SDK推奨依存へ同期する
```

PR body には最低限次を記載する。

- Expo compatible dependency mismatch の定期検知により自動生成されたこと。
- `pnpm exec expo install --fix` を使用したこと。
- Expo SDK major / minor が不変であること。
- React Native major / minor が不変であること。
- Repository diff が `package.json` / `pnpm-lock.yaml` のみであること。
- 修正後 `pnpm exec expo install --check` が PASS したこと。
- Web CI / Mobile App CI を `workflow_dispatch` で補助実行すること。
- PR 固有 validation は別契約であること。
- auto-merge しないこと。

label / assignee / reviewer の自動設定は追加しない。

### 13. `GITHUB_TOKEN` による PR 作成と Workflow event の契約を明確にする

GitHub Actions の `GITHUB_TOKEN` によって branch push / PR 作成を行った場合、それによって発生した通常イベントから別の Workflow run が再帰的に起動することを前提にしない。

`workflow_dispatch` / `repository_dispatch` はこの再帰実行制限の例外なので、maintenance PR 作成後の補助 validation は明示的な `workflow_dispatch` で開始する。

したがって、次の2種類の validation を区別する。

#### A. maintenance Workflow から明示 dispatch する補助 validation

PR 作成後に同じ maintenance branch を対象として次を実行する。

```text
gh workflow run ci.yml --ref <maintenance branch>
gh workflow run native-ci.yml --ref <maintenance branch>
```

#### B. `pull_request` event 固有 validation

通常の PR event でのみ成立する check は、上記 `workflow_dispatch` の代替ではない。

特に現在の Web CI の `Dependency Review` は `github.event_name == 'pull_request'` の場合だけ実行されるため、maintenance Workflow から dispatch した Web CI では SKIP される。

このタスクでは Web CI を改造して Dependency Review を workflow_dispatch へ移植したり、maintenance Workflow 内へ Dependency Review logic を複製したりしない。

自動生成 PR は auto-merge せず OPEN のままとし、merge 前に Repository の通常 PR 運用で必要な PR 固有 validation が満たされていることを人間が確認する。

PR 固有 required check を無人で完全に成立させるために PAT / GitHub App / CI 再設計が必要になる場合は Stop 条件とする。

### 14. Web CI を補助 dispatch する

```text
gh workflow run ci.yml --ref <maintenance branch>
```

現在の `ci.yml` では `workflow_dispatch` の場合、通常の Web validation は実行される。

一方で次は実行されない。

- `Dependency Review`: `pull_request` event 限定。
- Cloudflare Preview: `pull_request` event 限定。
- Production deploy: `push` to `main` 限定。

この既存条件を今回変更しない。

### 15. Mobile App CI を補助 dispatch する

```text
gh workflow run native-ci.yml --ref <maintenance branch>
```

現在の `native-ci.yml` は `workflow_dispatch` の場合 `native_changed=true` として扱うため、既存の次の validation を再利用する。

- Native Static / Expo Doctor
- Android Automation Build
- Android Production-validation Build
- iOS Automation Build
- iOS Production-validation Build
- Production Bundle Guard
- Android Runtime / Maestro

maintenance Workflow 内に Android / iOS build、Bundle Guard、Maestro logic を複製しない。

### 16. CI 完了待ち・自動修復・auto-merge は行わない

Maintenance Workflow の責務は次までとする。

```text
check
  -> fix
  -> safety validation
  -> branch / commit / PR
  -> Web CI workflow_dispatch
  -> Mobile App CI workflow_dispatch
  -> end
```

次は実装しない。

- CI completion polling
- retry loop
- CI failure 自動修復
- failing PR 自動 close
- auto-merge
- merge queue 登録

## Workflow 全体フロー

```text
schedule / workflow_dispatch
  ↓
OPEN maintenance PR があるか
  ├─ Yes -> no-op
  └─ No
       ↓
pnpm install --frozen-lockfile
       ↓
expo / react-native major.minor を記録
       ↓
expo install --check
  ├─ PASS -> no-op
  └─ FAIL
       ↓
expo install --fix
       ↓
expo major.minor 不変 AND react-native major.minor 不変か
  ├─ No -> fail / PRなし
  └─ Yes
       ↓
変更ファイルが package.json / pnpm-lock.yaml のみか
  ├─ No -> fail / PRなし
  └─ Yes
       ↓
pnpm install --frozen-lockfile
expo install --check
git diff --check
  ├─ FAIL -> PRなし
  └─ PASS
       ↓
automation branch / commit / push
       ↓
OPEN PR 作成
       ↓
Web CI workflow_dispatch
       ↓
Mobile App CI workflow_dispatch
       ↓
終了
```

## Contract test

新しい maintenance Workflow の contract は専用 test file で確認する。

新規ファイル:

```text
tests/contracts/expo-dependency-maintenance-workflow.test.ts
```

新しい test framework / YAML parser は導入せず、既存 contract test と同じ Vitest / 文字列ベース確認を利用する。

少なくとも次を確認する。

- `schedule` と `workflow_dispatch` が存在する。
- `contents: write` / `pull-requests: write` / `actions: write` を使用する。
- 不要な write permission を追加していない。
- `persist-credentials: false` を維持する。
- GitHub CLI を使った明示的な git credential setup がある。
- `pnpm exec expo install --check` を使用する。
- `pnpm exec expo install --fix` を使用する。
- Expo SDK major / minor 不変 guard がある。
- React Native major / minor 不変 guard がある。
- changed file allowlist が `package.json` / `pnpm-lock.yaml` に限定されている。
- OPEN maintenance PR の重複防止がある。
- branch name が automation prefix + run ID で一意である。
- Web CI を `workflow_dispatch` する。
- Mobile App CI を `workflow_dispatch` する。
- auto-merge command を含まない。

Workflow shell の一行一行を固定する fragile test にはしない。

既存 `tests/contracts/native-ci-workflow.test.ts` には maintenance Workflow 固有 contract を追加しない。

## 主な変更対象

実装時の主要変更は次に限定する。

```text
.github/workflows/expo-dependency-maintenance.yml        # new
tests/contracts/expo-dependency-maintenance-workflow.test.ts # new
```

この Plan file は実装前の正本として維持する。

原則として次は変更しない。

```text
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
tests/contracts/native-ci-workflow.test.ts
```

現在発生している Expo patch mismatch 自体を、この maintenance mechanism 実装 PR に混ぜて修正しない。

mechanism が `main` へ merge された後、初回 `workflow_dispatch` または次回 schedule によって別の maintenance PR として修正する。

## Validation

### 実装 PR で実施する確認

少なくとも次を実行する。

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
```

Repository の通常 CI も確認する。

新規 maintenance Workflow は default branch へ merge される前は本番の schedule / workflow_dispatch 運用を完全には再現できないため、実装 PR 内で依存を意図的に古くして疑似 maintenance PR を生成するテストは行わない。

### merge 後の初回運用確認

Workflow が `main` に存在する状態で一度 `workflow_dispatch` を手動実行する。

初回実行前に Repository / Organization の GitHub Actions 設定で、`GITHUB_TOKEN` による branch push / PR 作成 / workflow dispatch が許可されていることを確認する。

現在 Expo compatible dependency mismatch が残っている場合は次を確認する。

1. maintenance Workflow が mismatch を検出する。
2. `expo install --fix` で compatible version へ更新する。
3. Expo SDK major / minor が変化していない。
4. React Native major / minor が変化していない。
5. changed file が `package.json` / `pnpm-lock.yaml` だけである。
6. 修正 PR が1件だけ OPEN になる。
7. Web CI の `workflow_dispatch` が開始される。
8. Mobile App CI の `workflow_dispatch` が開始される。
9. Mobile App CI の Expo Doctor dependency mismatch が解消される。
10. workflow_dispatch Web CI で PR-event-only Dependency Review が SKIP されることを想定どおり確認する。
11. PR が auto-merge されない。

初回実行時点ですでに mismatch が解消済みなら、branch / PR を作らず no-op で終了することを正常結果とする。

## 完了条件

- `.github/workflows/expo-dependency-maintenance.yml` が追加されている。
- 毎週月曜 JST 09:00 と手動実行を利用できる。
- `expo install --check` PASS 時は Repository を変更しない。
- mismatch 時だけ `expo install --fix` を実行する。
- target package / target patch version を Workflow 独自に管理していない。
- Expo SDK major / minor を自動更新しない。
- React Native major / minor を自動更新しない。
- changed file が `package.json` / `pnpm-lock.yaml` 以外なら PR を作らない。
- fix 後 `expo install --check` が PASS しなければ PR を作らない。
- OPEN maintenance PR がある場合は重複 PR を作らない。
- checkout credential を永続化せず、push credential の利用方法が明示されている。
- 自動 branch に force push しない。
- PR は OPEN で作成し auto-merge しない。
- `GITHUB_TOKEN` 以外の credential を追加していない。
- Web CI / Mobile App CI を workflow_dispatch している。
- workflow_dispatch validation が PR-event-only validation の代替ではないことが明確である。
- Web / Native validation logic を maintenance Workflow へ複製していない。
- `.github/workflows/ci.yml` / `native-ci.yml` / `native-ios-ci.yml` の責務を不要に変更していない。
- 専用 maintenance contract test と既存 contract tests が PASS する。

## 対象外

- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- npm / pnpm package の一般的な最新版追従
- Dependabot の追加・再設計
- `expo.install.exclude` による warning suppression
- Expo Doctor の他 Finding の自動修正
- Expo Doctor を既存 Native CI から削除すること
- Expo Doctor failure を non-blocking にすること
- Android / iOS build logic の変更
- Maestro flow の変更
- Web CI / Native CI validation scope の縮小
- PR-event-only Dependency Review logic の maintenance Workflow への複製
- Web CI を maintenance PR 用に再設計すること
- 自動 merge
- 自動 reviewer / assignee / label 管理
- Slack / email 通知
- failure 時の自動 Issue 作成
- PAT / GitHub App の追加

## Stop 条件

次のいずれかが発生した場合は、自動化範囲を広げず別対応として整理する。

- `expo install --fix` が Expo SDK major / minor を変更しようとする。
- `expo install --fix` が React Native major / minor を変更しようとする。
- `expo install --fix` が `package.json` / `pnpm-lock.yaml` 以外を変更する。
- fix 後も `expo install --check` が失敗する。
- compatible dependency update に native configuration / source code の変更が必要になる。
- `GITHUB_TOKEN` で branch push / PR creation / workflow dispatch に必要な Repository permission を確保できない。
- GitHub Actions からの PR 作成を許可する Repository / Organization policy を利用できない。
- `ci.yml` / `native-ci.yml` から `workflow_dispatch` が削除される、または maintenance branch に対する dispatch が安全に利用できなくなる。
- Web CI の workflow_dispatch が Production deploy を実行する構成へ変更される。
- 自動生成 PR を required PR check と完全に連携させるため PAT / GitHub App / CI大幅再設計が必須になる。

## 実装順

1. 実装開始時に最新 `main` を取り込み、`package.json`、`ci.yml`、`native-ci.yml` の現在契約を再確認する。
2. `.github/workflows/expo-dependency-maintenance.yml` を追加し、schedule / manual trigger / permissions / concurrency / duplicate PR guard を実装する。
3. frozen install、Expo / React Native major.minor capture、`expo install --check` / `--fix` を実装する。
4. Expo / React Native major.minor guard、changed-file allowlist、修正後 validation を実装する。
5. `persist-credentials: false` のまま GitHub CLI で push credential を設定し、一意 branch / commit / push を実装する。
6. OPEN PR 作成を実装する。
7. PR 作成後に `ci.yml` / `native-ci.yml` の workflow_dispatch を実装する。
8. `tests/contracts/expo-dependency-maintenance-workflow.test.ts` に最小 contract test を追加する。
9. format / lint / typecheck / contract tests と通常 CI を確認する。
10. 実装 PR には現在の Expo dependency correction を混ぜずに完了する。
11. merge 後、Repository Actions permission を確認して maintenance Workflow を手動実行し、mismatch が残っていれば別 maintenance PR が生成されることを確認する。
