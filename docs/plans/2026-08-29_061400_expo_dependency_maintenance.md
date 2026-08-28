# Expo SDK 推奨依存バージョン定期メンテナンス 実装プラン

## 目的

Expo SDK が現在推奨する依存バージョンと `package.json` / `pnpm-lock.yaml` のずれにより、`Mobile App CI` の Expo Doctor が dependency version mismatch で失敗する事象を定期的に検知し、安全に修正用 Pull Request を作成できるようにする。

自動化対象は、**現在使用中の Expo SDK line に対する compatible dependency version の不一致だけ**とする。

次は自動化しない。

- 一般的な dependency update
- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- Expo Doctor のその他の Finding の自動修正
- auto-merge

## 現状

現在の `Mobile App CI` では `Native Static` job で Expo Doctor を実行している。

`package.json` または `pnpm-lock.yaml` が変更された Pull Request は Native change として扱われ、既存の Android / iOS build、Bundle Guard、Maestro 等の検証対象になる。

今回の maintenance Workflow では、target package 名や target patch version を独自管理せず、Repository にインストールされている Expo CLI の compatibility metadata を正本として次を利用する。

```text
pnpm exec expo install --check
pnpm exec expo install --fix
```

- `expo install --check`: 現在の Expo SDK に対する compatible dependency version との差分を確認する。
- `expo install --fix`: 現在の Expo SDK に対して compatible な dependency version へ補正する。

## 完了時の状態

- 毎週1回、自動で Expo compatible dependency check を実行できる。
- `workflow_dispatch` から手動実行できる。
- どの trigger から実行しても、検査・修正対象は必ず `main` とする。
- mismatch がなければ Repository を変更せず正常終了する。
- mismatch がある場合だけ `expo install --fix` を実行する。
- Expo SDK major / minor と React Native major / minor が変化しない場合だけ自動修正を続行する。
- 自動修正による Repository diff が `package.json` / `pnpm-lock.yaml` だけの場合に限り修正 PR を作成する。
- 同じ目的の OPEN maintenance PR がある場合は重複 PR を作らない。
- 修正 PR は OPEN のままとし、通常の PR CI / review / merge フローへ引き渡す。
- maintenance Workflow から Web CI / Mobile App CI を明示 dispatch しない。

## Repository 設定の前提

GitHub Actions から branch push と Pull Request 作成を行うため、Repository / Organization 側で GitHub Actions に必要な権限が許可されていることを前提とする。

初回運用前に、GitHub Actions が Pull Request を作成できる Repository 設定が有効であることを確認する。

Workflow の権限は次だけとする。

```yaml
permissions:
  contents: write
  pull-requests: write
```

`actions: write` を含め、今回不要な write permission は追加しない。

追加 PAT、GitHub App、外部 credential は導入しない。

## 主な変更対象

実装時の変更は原則として次の2ファイルに限定する。

```text
.github/workflows/expo-dependency-maintenance.yml

tests/contracts/expo-dependency-maintenance-workflow.test.ts
```

現在発生している Expo dependency mismatch 自体は、この mechanism 実装 PR には混ぜて修正しない。

原則として次は変更しない。

```text
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
tests/contracts/native-ci-workflow.test.ts
```

## 実装内容

### 1. maintenance Workflow を追加する

新規ファイル:

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

`pull_request` / `push` trigger は追加しない。

### 2. 既存 CI と同じ runtime / Action pin を再利用する

Node / pnpm は既存 CI と同じ値を使用する。

```text
Node.js: 24
pnpm: 9.10.0
```

新しい Action version を選定せず、実装開始時点の既存 CI で使用中の pin 済み commit SHA を再利用する。

現時点では次を使用している。

```text
actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8
pnpm/action-setup@a15d269cd4658e1107c09f1fabf4cbd7bd1f308a
actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444
```

実装開始時に既存 CI が更新されている場合は、その時点の既存 pin に合わせる。

### 3. 対象 branch を `main` に固定する

schedule / workflow_dispatch のどちらから実行しても、Repository の検査・修正対象は `main` とする。

checkout は明示的に次の契約とする。

```yaml
- uses: actions/checkout@<existing-pinned-sha>
  with:
    ref: main
    persist-credentials: false
```

`workflow_dispatch` 実行時に UI / CLI で選択された ref を maintenance 対象として使用しない。

自動生成 PR の base も `main` に固定する。

### 4. 同時実行を防止する

Workflow 単位で concurrency を設定する。

```yaml
concurrency:
  group: expo-dependency-maintenance
  cancel-in-progress: false
```

実行中の maintenance を途中キャンセルして別実行へ差し替えない。

### 5. OPEN maintenance PR がある場合は終了する

自動 branch prefix は次とする。

```text
automation/expo-compatible-dependencies-
```

base `main` の OPEN PR のうち、head branch が上記 prefix で始まる PR が1件以上存在する場合は、新しい check / fix / branch / PR を作らず正常終了する。

重複判定に PR title は使用しない。人間が PR title を変更しても duplicate guard が壊れないようにする。

既存 maintenance PR を自動更新、force push、close する処理は作らない。古い maintenance PR を破棄する必要がある場合は人間が close する。

### 6. 現在の lockfile で install する

次を実行する。

```text
pnpm install --frozen-lockfile
```

check 前に lockfile を暗黙更新しない。

### 7. Expo / React Native の major.minor を修正前に記録する

`package.json` の次を読み取る。

```text
dependencies.expo
dependencies.react-native
```

それぞれ major / minor の数字を取得する。

例:

```text
57.0.17  -> 57.0
~57.0.18 -> 57.0
0.86.3   -> 0.86
~0.86.4  -> 0.86
```

新しい semver library は追加せず、Node.js の短い inline script で取得する。

次の場合は Workflow を失敗させ、自動修正を開始しない。

- `expo` が存在しない。
- `react-native` が存在しない。
- いずれかの major / minor を一意に取得できない。

### 8. `expo install --check` を実行する

```text
pnpm exec expo install --check
```

#### exit code 0

更新不要として正常終了する。

- branch を作らない。
- commit しない。
- PR を作らない。

#### non-zero

自動修正候補として `expo install --fix` へ進む。

`--check` の non-zero だけを根拠に PR を作らない。後続の fix / safety check がすべて成功した場合だけ PR を作成する。

### 9. `expo install --fix` を実行する

```text
pnpm exec expo install --fix
```

特定 package 名や target patch version を command 内に hard-code しない。

`expo` / `expo-constants` など現在発生している package だけを個別更新する処理にはしない。

`expo install --fix` 自体が失敗した場合は Workflow を失敗させ、PR を作成しない。

### 10. Expo / React Native major.minor の変更を禁止する

fix 後に再度 `package.json` から Expo / React Native の major.minor を取得する。

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

### 11. changed file を allowlist で制限する

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

`app.config.ts`、`android/**`、`ios/**`、source code、generated file、Workflow file 等の変更を自動 PR に含めない。

### 12. fix 後の dependency contract を再確認する

次を実行する。

```text
pnpm install --frozen-lockfile
pnpm exec expo install --check
git diff --check
```

すべて PASS を必須とする。

full `expo-doctor` は maintenance Workflow 内では実行しない。

この Workflow の責務は compatible dependency mismatch の補正だけとし、full Expo Doctor は修正 PR に対する既存 `Mobile App CI` に任せる。

### 13. automation branch を作成して push する

すべての safety check が PASS した場合だけ branch / commit / push を行う。

branch name:

```text
automation/expo-compatible-dependencies-${GITHUB_RUN_ID}
```

commit message:

```text
chore: align Expo SDK compatible dependencies
```

commit 対象は次だけとする。

```text
package.json
pnpm-lock.yaml
```

Git author は GitHub Actions bot を使用する。

force push / force-with-lease は使用しない。

checkout は `persist-credentials: false` を維持する。push 前に `GH_TOKEN=${{ github.token }}` を使って `gh auth setup-git` 等の GitHub CLI 標準機能で git credential を設定し、token を remote URL や log へ埋め込まない。

### 14. 修正 PR を OPEN で作成する

GitHub CLI と `GITHUB_TOKEN` を使用し、base `main` の Pull Request を作成する。

PR title:

```text
chore: Expo SDK推奨依存へ同期する
```

PR body には最低限次を記載する。

- Expo compatible dependency mismatch の定期検知により自動生成されたこと。
- `pnpm exec expo install --fix` を使用したこと。
- Expo SDK major / minor が不変であること。
- React Native major / minor が不変であること。
- changed file が `package.json` / `pnpm-lock.yaml` だけであること。
- fix 後 `pnpm exec expo install --check` が PASS したこと。
- auto-merge しないこと。

label / assignee / reviewer の自動設定は追加しない。

### 15. PR 作成後は通常の PR フローへ引き渡す

maintenance Workflow から次は実行しない。

```text
gh workflow run ci.yml
gh workflow run native-ci.yml
```

`actions: write` permission も付与しない。

`GITHUB_TOKEN` を使用して作成した PR の `pull_request` Workflow run は approval-required 状態になるため、PR を確認する人が GitHub 上で Workflow 実行を承認する。

承認後は既存の通常 PR CI に任せる。

- Web CI
- Dependency Review
- Mobile App CI
- Expo Doctor
- Android / iOS build
- Bundle Guard
- Maestro

maintenance Workflow 内へこれらの validation logic を複製しない。

maintenance Workflow は PR 作成後に終了し、CI completion polling、retry、自動修復、auto-merge は行わない。

## Workflow 全体フロー

```text
schedule / workflow_dispatch
  ↓
main を checkout
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
  └─ non-zero
       ↓
expo install --fix
       ↓
expo / react-native major.minor 不変か
  ├─ No -> fail / PRなし
  └─ Yes
       ↓
changed file が package.json / pnpm-lock.yaml のみか
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
終了
```

## Contract test

新規ファイル:

```text
tests/contracts/expo-dependency-maintenance-workflow.test.ts
```

既存と同じ Vitest / 文字列ベース contract test を利用し、新しい test framework / YAML parser は導入しない。

次の重要 contract を確認する。

- `schedule` と `workflow_dispatch` が存在する。
- permission が `contents: write` / `pull-requests: write` に限定されている。
- checkout が `ref: main` と `persist-credentials: false` を持つ。
- 既存 CI と同じ pinned Action を利用する。
- `pnpm exec expo install --check` / `--fix` を使用する。
- Expo SDK major / minor guard がある。
- React Native major / minor guard がある。
- changed-file allowlist が `package.json` / `pnpm-lock.yaml` に限定されている。
- duplicate PR guard が base `main` + automation branch prefix で判定される。
- automation branch が run ID を含む。
- `gh workflow run` を含まない。
- auto-merge command を含まない。

Workflow shell の一行一行や PR body 文言を固定する fragile test にはしない。

既存 `tests/contracts/native-ci-workflow.test.ts` へ maintenance 固有 contract を追加しない。

## Validation

### 実装 PR

少なくとも次を実行する。

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
```

Repository の通常 CI も確認する。

実装 PR では dependency を意図的に古くして疑似 maintenance PR を作るテストは行わない。

### merge 後の初回運用確認

Workflow が `main` に merge された後、一度 `workflow_dispatch` を手動実行する。

初回実行前に GitHub Actions から branch push / PR 作成が許可されていることを確認する。

mismatch が残っている場合は次を確認する。

1. `main` の dependency mismatch を検出する。
2. `expo install --fix` で compatible version へ更新する。
3. Expo / React Native major.minor が変化しない。
4. changed file が `package.json` / `pnpm-lock.yaml` だけになる。
5. maintenance PR が1件だけ OPEN になる。
6. PR の通常 Workflow run が approval-required 状態になる。
7. 人間が Workflow 実行を承認後、既存 Web CI / Mobile App CI が実行される。
8. Mobile App CI の Expo Doctor dependency mismatch が解消される。
9. PR が auto-merge されない。

mismatch がすでに解消済みなら、branch / PR を作らず no-op で終了することを正常結果とする。

## Stop 条件

次のいずれかが発生した場合は、自動化範囲を広げず別対応とする。

- `expo install --fix` が失敗する。
- Expo SDK major / minor が変化する。
- React Native major / minor が変化する。
- `package.json` / `pnpm-lock.yaml` 以外が変更される。
- fix 後も `expo install --check` が失敗する。
- compatible dependency update に native configuration / source code の変更が必要になる。
- `GITHUB_TOKEN` で branch push / PR creation に必要な Repository permission を確保できない。
- GitHub Actions からの PR 作成を Repository / Organization policy 上許可できない。
- 通常 PR CI を承認不要で完全自動実行するため PAT / GitHub App が必要になる。

## 対象外

- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- npm / pnpm package の一般的な最新版追従
- Dependabot の追加・再設計
- `expo.install.exclude` による suppression
- Expo Doctor の他 Finding の自動修正
- Expo Doctor を既存 Native CI から削除すること
- Expo Doctor failure を non-blocking にすること
- Android / iOS build logic の変更
- Maestro flow の変更
- Web CI / Mobile App CI の再設計
- Web CI / Mobile App CI の明示 dispatch
- CI completion polling / retry / 自動修復
- auto-merge / merge queue 登録
- 自動 reviewer / assignee / label 管理
- Slack / email 通知
- failure 時の自動 Issue 作成
- PAT / GitHub App の追加

## 実装順

1. 実装開始時に最新 `main` を取り込み、`package.json` と既存 CI の Node / pnpm / Action pin を再確認する。
2. `.github/workflows/expo-dependency-maintenance.yml` を追加し、trigger / permission / `main` checkout / concurrency / duplicate PR guard を実装する。
3. frozen install、Expo / React Native major.minor capture、`expo install --check` / `--fix` を実装する。
4. major.minor guard、changed-file allowlist、fix 後 validation を実装する。
5. `persist-credentials: false` のまま git credential を設定し、一意 branch / commit / push を実装する。
6. base `main` の OPEN PR 作成を実装する。
7. `tests/contracts/expo-dependency-maintenance-workflow.test.ts` に最小 contract test を追加する。
8. format / lint / typecheck / contract tests と通常 CI を確認する。
9. 実装 PR に現在の Expo dependency correction を混ぜずに完了する。
10. merge 後、Repository Actions permission を確認して maintenance Workflow を1回手動実行し、mismatch が残っていれば別 maintenance PR が生成されることを確認する。
