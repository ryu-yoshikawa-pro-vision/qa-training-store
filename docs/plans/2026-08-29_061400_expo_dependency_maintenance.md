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

## 方針

Repository にインストールされている Expo CLI の compatibility metadata を正本として次を利用する。

```text
pnpm exec expo install --check
pnpm exec expo install --fix
```

特定 package 名や target patch version を Workflow 内へ hard-code しない。

修正 PR 作成後は maintenance Workflow から既存 CI を明示 dispatch せず、通常の PR CI / review / merge フローへ引き渡す。

## 変更対象

実装時の変更は原則として次の2ファイルに限定する。

```text
.github/workflows/expo-dependency-maintenance.yml
tests/contracts/expo-dependency-maintenance-workflow.test.ts
```

この mechanism 実装 PR では現在の Expo dependency mismatch 自体を修正しない。

原則として次は変更しない。

```text
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
tests/contracts/native-ci-workflow.test.ts
```

## Repository / CI 前提

- Node.js は既存 CI と同じ `24` を使用する。
- pnpm は既存 CI と同じ `9.10.0` を使用する。
- Action は新しい version を選定せず、実装開始時点の既存 CI で使用中の pinned commit SHA を再利用する。
- GitHub Actions の `GITHUB_TOKEN` だけを使用する。
- Repository / Organization 側で GitHub Actions から branch push / Pull Request 作成が許可されていることを初回運用前に確認する。

Workflow permission は次だけとする。

```yaml
permissions:
  contents: write
  pull-requests: write
```

`actions: write` を含む不要な write permission、PAT、GitHub App、外部 credential は追加しない。

現時点の既存 Action pin は次。

```text
actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8
pnpm/action-setup@a15d269cd4658e1107c09f1fabf4cbd7bd1f308a
actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444
```

実装開始時に既存 CI が更新済みなら、その時点の pin に合わせる。

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

毎週月曜日 00:00 UTC / JST 09:00 と手動実行を利用できるようにする。

`pull_request` / `push` trigger は追加しない。

### 2. maintenance 対象を `main` に固定する

schedule / workflow_dispatch のどちらから実行しても、検査・修正対象は必ず `main` とする。

```yaml
- uses: actions/checkout@<existing-pinned-sha>
  with:
    ref: main
    persist-credentials: false
```

`workflow_dispatch` 実行時に選択された ref を maintenance 対象として使用しない。

自動生成 PR の base も `main` に固定する。

### 3. 同時実行を防止する

```yaml
concurrency:
  group: expo-dependency-maintenance
  cancel-in-progress: false
```

### 4. OPEN maintenance PR の重複を防止する

自動 branch prefix:

```text
automation/expo-compatible-dependencies-
```

base `main` の OPEN PR に、head branch が上記 prefix で始まるものが存在する場合は正常終了する。

重複判定に PR title は使用しない。

既存 maintenance PR を自動更新、force push、close しない。不要になった PR は人間が close する。

### 5. 現在の dependency contract を読み込む

次を実行する。

```text
pnpm install --frozen-lockfile
```

その後 `package.json` から次を取得する。

```text
dependencies.expo
dependencies.react-native
```

Node.js の短い inline script で major.minor を抽出する。新しい semver library は追加しない。

例:

```text
57.0.17  -> 57.0
~57.0.18 -> 57.0
0.86.3   -> 0.86
~0.86.4  -> 0.86
```

`expo` / `react-native` が存在しない、または major.minor を一意に取得できない場合は失敗させる。

### 6. compatible dependency mismatch を確認する

```text
pnpm exec expo install --check
```

- exit code `0`: 更新不要として正常終了する。branch / commit / PR は作成しない。
- non-zero: 自動修正候補として次へ進む。

non-zero だけを根拠に PR を作成しない。後続の fix / safety check がすべて成功した場合だけ PR を作成する。

### 7. compatible dependency を修正する

```text
pnpm exec expo install --fix
```

特定 package / version を個別指定しない。

command 自体が失敗した場合は Workflow を失敗させ、PR を作成しない。

### 8. 自動修正の safety check を行う

#### Expo / React Native major.minor

fix 前後で次がそれぞれ一致すること。

```text
expo major.minor
react-native major.minor
```

許可:

```text
expo:         57.0.x -> 57.0.y
react-native: 0.86.x -> 0.86.y
```

禁止:

```text
expo:         57.0.x -> 57.1.x
expo:         57.0.x -> 58.0.x
react-native: 0.86.x -> 0.87.x
react-native: 0.86.x -> 1.0.x
```

major / minor が変化した場合は失敗させる。

#### changed file

許可する変更ファイルは次だけとする。

```text
package.json
pnpm-lock.yaml
```

- diff が空なら失敗させる。
- 上記以外が1件でも変更されたら失敗させる。
- native config、source code、generated file、Workflow file 等を自動 PR に含めない。

### 9. fix 後の dependency contract を再確認する

```text
pnpm install --frozen-lockfile
pnpm exec expo install --check
git diff --check
```

すべて PASS を必須とする。

full `expo-doctor` は maintenance Workflow では実行しない。修正 PR に対する既存 `Mobile App CI` に任せる。

### 10. automation branch を作成して push する

すべての safety check が PASS した場合だけ実施する。

branch name:

```text
automation/expo-compatible-dependencies-${GITHUB_RUN_ID}
```

commit message:

```text
chore: align Expo SDK compatible dependencies
```

commit 対象:

```text
package.json
pnpm-lock.yaml
```

Git author は GitHub Actions bot を使用する。

force push / force-with-lease は使用しない。

checkout は `persist-credentials: false` を維持する。push 前に `GH_TOKEN=${{ github.token }}` を使用して `gh auth setup-git` 等の GitHub CLI 標準機能で credential を設定し、token を URL / log へ埋め込まない。

### 11. 修正 PR を OPEN で作成する

GitHub CLI と `GITHUB_TOKEN` を使用する。

```text
base: main
title: chore: Expo SDK推奨依存へ同期する
```

PR body には最低限次を記載する。

- Expo compatible dependency mismatch の定期検知により自動生成されたこと。
- `expo install --fix` を使用したこと。
- Expo / React Native major.minor が不変であること。
- changed file が `package.json` / `pnpm-lock.yaml` だけであること。
- fix 後 `expo install --check` が PASS したこと。
- auto-merge しないこと。

label / assignee / reviewer の自動設定は追加しない。

### 12. PR 作成後は通常 PR フローへ引き渡す

maintenance Workflow から次は実行しない。

```text
gh workflow run ci.yml
gh workflow run native-ci.yml
```

`GITHUB_TOKEN` で作成した PR の `pull_request` Workflow run は approval-required 状態になるため、PR を確認する人が GitHub 上で Workflow 実行を承認する。

承認後は既存の通常 PR CI に任せる。

- Web CI
- Dependency Review
- Mobile App CI
- Expo Doctor
- Android / iOS build
- Bundle Guard
- Maestro

maintenance Workflow 内へこれらを複製しない。

CI completion polling、retry、自動修復、auto-merge は行わない。

## Workflow フロー

```text
schedule / workflow_dispatch
  ↓
main checkout
  ↓
OPEN maintenance PR?
  ├─ Yes -> no-op
  └─ No
       ↓
pnpm install --frozen-lockfile
       ↓
Expo / React Native major.minor 記録
       ↓
expo install --check
  ├─ PASS -> no-op
  └─ non-zero
       ↓
expo install --fix
       ↓
major.minor guard
changed-file allowlist
       ↓
pnpm install --frozen-lockfile
expo install --check
git diff --check
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

既存と同じ Vitest / 文字列ベース contract test を利用する。新しい test framework / YAML parser は追加しない。

確認する重要 contract:

- `schedule` / `workflow_dispatch`
- permission が `contents: write` / `pull-requests: write` のみ
- checkout が `ref: main` / `persist-credentials: false`
- 既存 CI と同じ pinned Action
- `expo install --check` / `--fix`
- Expo / React Native major.minor guard
- changed-file allowlist が `package.json` / `pnpm-lock.yaml` のみ
- duplicate PR guard が base `main` + automation branch prefix で判定される
- automation branch が run ID を含む
- `gh workflow run` を含まない
- auto-merge command を含まない

shell の一行一行や PR body 文言は固定しない。

既存 `tests/contracts/native-ci-workflow.test.ts` には maintenance 固有 contract を追加しない。

## Validation

### 実装 PR

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
```

Repository の通常 CI も確認する。

依存を意図的に古くして疑似 maintenance PR を作るテストは行わない。

### merge 後の初回確認

`main` へ merge 後、一度 `workflow_dispatch` で実行する。

実行前に GitHub Actions から branch push / PR 作成が許可されていることを確認する。

mismatch が残っている場合は次を確認する。

1. `main` の mismatch を検出する。
2. compatible version へ修正する。
3. Expo / React Native major.minor が変化しない。
4. changed file が `package.json` / `pnpm-lock.yaml` だけになる。
5. maintenance PR が1件だけ OPEN になる。
6. PR Workflow run が approval-required 状態になる。
7. 人間が承認後、既存 Web CI / Mobile App CI が実行される。
8. Mobile App CI の Expo Doctor dependency mismatch が解消される。
9. auto-merge されない。

mismatch が解消済みなら no-op を正常結果とする。

## Stop 条件

次の場合は自動化範囲を広げず別対応とする。

- `expo install --fix` が失敗する。
- Expo SDK major / minor が変化する。
- React Native major / minor が変化する。
- `package.json` / `pnpm-lock.yaml` 以外が変更される。
- fix 後も `expo install --check` が失敗する。
- compatible dependency update に native config / source code の変更が必要になる。
- `GITHUB_TOKEN` で branch push / PR creation に必要な権限を確保できない。
- GitHub Actions から PR 作成を Repository / Organization policy 上許可できない。
- 通常 PR CI を承認不要で完全自動実行するため PAT / GitHub App が必要になる。

## 対象外

- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- 一般 dependency update / Dependabot 再設計
- `expo.install.exclude`
- Expo Doctor の他 Finding の自動修正
- Expo Doctor の既存 CI からの削除 / non-blocking 化
- Android / iOS build / Maestro の変更
- Web CI / Mobile App CI の変更・明示 dispatch
- CI polling / retry / 自動修復
- auto-merge / merge queue
- reviewer / assignee / label / 通知 / Issue 自動化
- PAT / GitHub App の追加

## 実装順

1. 最新 `main` と既存 CI の Node / pnpm / Action pin を確認する。
2. maintenance Workflow の trigger / permission / `main` checkout / concurrency / duplicate PR guard を実装する。
3. frozen install、Expo / React Native major.minor capture、`expo install --check` / `--fix` を実装する。
4. major.minor guard、changed-file allowlist、fix 後 validation を実装する。
5. automation branch / commit / push / OPEN PR 作成を実装する。
6. 専用 contract test を追加する。
7. format / lint / typecheck / contract tests と通常 CI を確認する。
8. 実装 PR に現在の dependency correction を混ぜずに完了する。
9. merge 後、Repository Actions permission を確認して1回手動実行する。
