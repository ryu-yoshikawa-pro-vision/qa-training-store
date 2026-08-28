# Expo SDK 推奨依存バージョン定期メンテナンス 実装プラン

## 目的

Expo SDK が現在推奨する依存バージョンと `package.json` / `pnpm-lock.yaml` のずれにより、`Mobile App CI` の Expo Doctor が dependency version mismatch で失敗する事象を定期的に検知し、安全に修正用 Pull Request を作成できるようにする。

自動化対象は、**現在使用中の Expo SDK line に対する compatible dependency version の不一致だけ**とする。

対象外:
- 一般 dependency update
- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- Expo Doctor のその他の Finding の自動修正
- auto-merge

## 方針

Repository にインストールされている Expo CLI の compatibility metadata を正本として使う。

```text
pnpm exec expo install --check
pnpm exec expo install --fix
```

特定 package 名や target patch version は Workflow に hard-code しない。

修正 PR 作成後は maintenance Workflow から既存 CI を明示 dispatch せず、通常の PR CI / review / merge フローへ引き渡す。

## 変更対象

原則として次の2ファイルだけを変更する。

```text
.github/workflows/expo-dependency-maintenance.yml
tests/contracts/expo-dependency-maintenance-workflow.test.ts
```

この mechanism 実装 PR では現在の Expo dependency mismatch 自体を修正しない。

原則として変更しないファイル:

```text
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
tests/contracts/native-ci-workflow.test.ts
```

## Repository / CI 前提

- Node.js: `24`
- pnpm: `9.10.0`
- Action は実装開始時点の既存 CI で使用中の pinned commit SHA を再利用する。
- `GITHUB_TOKEN` だけを使用する。
- 初回運用前に GitHub Actions から branch push / PR 作成が Repository / Organization policy 上許可されていることを確認する。

Workflow permission:

```yaml
permissions:
  contents: write
  pull-requests: write
```

`actions: write` を含む不要な write permission、PAT、GitHub App、外部 credential は追加しない。

現時点の既存 Action pin:

```text
actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8
pnpm/action-setup@a15d269cd4658e1107c09f1fabf4cbd7bd1f308a
actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444
```

既存 CI が更新済みなら、その時点の pin に合わせる。

## 実装内容

### 1. maintenance Workflow を追加する

新規ファイル:

```text
.github/workflows/expo-dependency-maintenance.yml
```

Workflow name: `Expo Dependency Maintenance`

Trigger:

```yaml
on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
```

毎週月曜日 00:00 UTC / JST 09:00 と手動実行を利用できるようにする。`pull_request` / `push` trigger は追加しない。

### 2. maintenance 実行元と対象を `main` に固定する

schedule / workflow_dispatch のどちらから実行しても検査・修正対象は必ず `main` とする。

`workflow_dispatch` の場合は、変更処理を始める前に `github.ref == refs/heads/main` を必須とする。GitHub の手動実行 UI で `main` 以外の branch / ref が選択された場合は Workflow を失敗させ、install / fix / branch push / PR 作成へ進まない。

そのうえで checkout も `main` に固定する。

```yaml
- uses: actions/checkout@<existing-pinned-sha>
  with:
    ref: main
    persist-credentials: false
```

`workflow_dispatch` で選択された ref を maintenance 対象に使用しない。自動生成 PR の base も `main` に固定する。

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

- 重複判定に PR title は使用しない。
- 既存 maintenance PR を自動更新、force push、close しない。
- 不要になった PR は人間が close する。

### 5. dependency contract を読み込む

```text
pnpm install --frozen-lockfile
```

`package.json` の `dependencies.expo` と `dependencies.react-native` から major.minor を取得する。新しい semver library は追加せず、Node.js の短い inline script を使う。

例: `57.0.17 -> 57.0`、`~0.86.4 -> 0.86`

次の場合は失敗させる。
- `expo` が存在しない。
- `react-native` が存在しない。
- major.minor を一意に取得できない。

### 6. compatible dependency mismatch を確認する

```text
pnpm exec expo install --check
```

最初の `expo install --check` は、mismatch 検出時の non-zero をその場の Workflow failure にせず、exit code を明示的に取得して後続分岐に利用する。

- exit code `0`: 更新不要として正常終了し、branch / commit / PR を作成しない。
- non-zero: 自動修正候補として `expo install --fix` へ進む。

実装では、最初の check だけ `set +e` / exit code capture、`continue-on-error` + step outcome などの方法で結果を取得してよい。shell の具体的な書き方は固定しない。

non-zero だけを根拠に PR を作成せず、後続の fix / safety check がすべて成功した場合だけ PR を作成する。

fix 後に再実行する `expo install --check` は通常どおり non-zero を Workflow failure とし、自動修正を続行しない。

### 7. compatible dependency を修正する

```text
pnpm exec expo install --fix
```

特定 package / version を個別指定しない。command が失敗した場合は Workflow を失敗させ、PR を作成しない。

### 8. Expo / React Native major.minor を確認する

fix 前後で `expo` と `react-native` の major.minor がそれぞれ一致することを必須とする。

許可:

```text
expo:         57.0.x -> 57.0.y
react-native: 0.86.x -> 0.86.y
```

major / minor が変化した場合は失敗させる。

### 9. fix 後の dependency contract を再確認し、最終 changed-file allowlist を確認する

Repository を変更し得る validation を先にすべて実行する。

```text
pnpm install --frozen-lockfile
pnpm exec expo install --check
git diff --check HEAD
```

すべて PASS を必須とする。

full `expo-doctor` は maintenance Workflow では実行せず、修正 PR に対する既存 `Mobile App CI` に任せる。

上記 validation がすべて終了した後、commit 直前に Repository の最終変更ファイル一覧を1回だけ確認する。

許可する変更ファイル:

```text
package.json
pnpm-lock.yaml
```

tracked / untracked の両方を対象にする。

```text
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

上記を集約した最終変更ファイル一覧について次を必須とする。

- 一覧が空でない。
- 一覧が `package.json` / `pnpm-lock.yaml` の subset である。
- 上記以外が1件でも含まれる場合は失敗させる。
- native config、source code、generated file、Workflow file、その他の untracked file を自動 PR に含めない。

allowlist 確認後から commit まで Repository を変更する command は実行しない。

### 10. automation branch を作成して push する

すべての safety check が PASS した場合だけ実施する。

```text
branch: automation/expo-compatible-dependencies-${GITHUB_RUN_ID}
commit: chore: align Expo SDK compatible dependencies
files: package.json, pnpm-lock.yaml
```

- Git author は GitHub Actions bot を使用する。
- force push / force-with-lease は使用しない。
- `persist-credentials: false` を維持する。
- push 前に `GH_TOKEN=${{ github.token }}` と `gh auth setup-git` 等の GitHub CLI 標準機能で credential を設定する。
- token を URL / log へ埋め込まない。

### 11. 修正 PR を OPEN で作成する

GitHub CLI と `GITHUB_TOKEN` を使用する。

```text
base: main
title: chore: Expo SDK推奨依存へ同期する
```

PR body には次を記載する。
- Expo compatible dependency mismatch の定期検知により自動生成されたこと。
- `expo install --fix` を使用したこと。
- Expo / React Native major.minor が不変であること。
- changed file が `package.json` / `pnpm-lock.yaml` だけであること。
- fix 後 `expo install --check` が PASS したこと。
- auto-merge しないこと。

label / assignee / reviewer は自動設定しない。

### 12. PR 作成後は通常 PR フローへ引き渡す

maintenance Workflow から次は実行しない。

```text
gh workflow run ci.yml
gh workflow run native-ci.yml
```

`GITHUB_TOKEN` で作成した PR の `pull_request` Workflow run は approval-required 状態になるため、PR を確認する人が GitHub 上で実行を承認する。

承認後は既存 CI に任せる。
- Web CI / Dependency Review
- Mobile App CI / Expo Doctor
- Android / iOS build
- Bundle Guard / Maestro

maintenance Workflow 内へこれらを複製しない。CI completion polling、retry、自動修復、auto-merge も行わない。

## Workflow フロー

```text
schedule / workflow_dispatch
  ↓
workflow_dispatch かつ ref != main?
  ├─ Yes -> fail / 変更なし
  └─ No
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
expo install --check の exit code を取得
  ├─ 0 -> no-op
  └─ non-zero
       ↓
expo install --fix
       ↓
major.minor guard
       ↓
pnpm install --frozen-lockfile
expo install --check
git diff --check HEAD
       ↓
tracked + untracked final changed-file allowlist
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

既存と同じ Vitest / 文字列ベース contract test を利用し、新しい test framework / YAML parser は追加しない。

確認する contract:
- `schedule` / `workflow_dispatch`
- permission が `contents: write` / `pull-requests: write` のみ
- `workflow_dispatch` で `main` 以外の ref を変更処理前に拒否する guard
- checkout が `ref: main` / `persist-credentials: false`
- 既存 CI と同じ pinned Action
- 最初の `expo install --check` の non-zero を即時 Workflow failure にせず、`--fix` 分岐へ利用する
- fix 後の `expo install --check` は non-zero を failure とする
- `expo install --fix`
- Expo / React Native major.minor guard
- post-fix validation で `git diff --check HEAD` を使用する
- changed-file allowlist が `git diff --name-only HEAD` と `git ls-files --others --exclude-standard` の両方を対象にし、許可ファイルを `package.json` / `pnpm-lock.yaml` のみに限定する
- duplicate PR guard が base `main` + automation branch prefix で判定される
- automation branch が run ID を含む
- `gh workflow run` を含まない
- auto-merge command を含まない

shell の一行一行、step name、PR body 文言、allowlist step の具体的な位置を文字列順序で固定する fragile test にはしない。既存 `tests/contracts/native-ci-workflow.test.ts` へ maintenance 固有 contract を追加しない。

## Validation

### 実装 PR

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
```

Repository の通常 CI も確認する。依存を意図的に古くして疑似 maintenance PR を作るテストは行わない。

### merge 後の初回確認

`main` へ merge 後、一度 `workflow_dispatch` で `main` を選択して実行する。

実行前に GitHub Actions から branch push / PR 作成が許可されていることを確認する。

mismatch が残っている場合は次を確認する。
1. `main` の mismatch を検出し、最初の `expo install --check` の non-zero で Workflow が即時終了せず fix へ進む。
2. compatible version へ修正する。
3. Expo / React Native major.minor が変化しない。
4. post-fix validation 後の最終 changed file が、tracked / untracked を含めて `package.json` / `pnpm-lock.yaml` だけになる。
5. maintenance PR が1件だけ OPEN になる。
6. PR Workflow run が approval-required 状態になる。
7. 人間が承認後、既存 Web CI / Mobile App CI が実行される。
8. Expo Doctor dependency mismatch が解消される。
9. auto-merge されない。

mismatch が解消済みなら no-op を正常結果とする。

`main` 以外を選択した `workflow_dispatch` は変更処理前に失敗し、branch / commit / PR を作成しないことも確認する。

## Stop 条件

次の場合は自動化範囲を広げず別対応とする。
- `workflow_dispatch` が `main` 以外の ref から実行された。
- `expo install --fix` が失敗する。
- Expo SDK major / minor が変化する。
- React Native major / minor が変化する。
- post-fix validation 後の最終変更ファイルに `package.json` / `pnpm-lock.yaml` 以外が存在する。
- fix 後も `expo install --check` が失敗する。
- compatible dependency update に native config / source code の変更が必要になる。
- `GITHUB_TOKEN` で branch push / PR creation に必要な権限を確保できない。
- GitHub Actions から PR 作成を policy 上許可できない。
- 通常 PR CI を承認不要で完全自動実行するため PAT / GitHub App が必要になる。

## 対象外

- Expo SDK / React Native major・minor upgrade
- 一般 dependency update / Dependabot 再設計
- `expo.install.exclude`
- Expo Doctor の他 Finding の自動修正
- Expo Doctor の削除 / non-blocking 化
- Android / iOS build / Maestro の変更
- Web CI / Mobile App CI の変更・明示 dispatch
- CI polling / retry / 自動修復
- auto-merge / merge queue
- reviewer / assignee / label / 通知 / Issue 自動化
- PAT / GitHub App の追加

## 実装順

1. 最新 `main` と既存 CI の Node / pnpm / Action pin を確認する。
2. trigger / permission / manual main-ref guard / `main` checkout / concurrency / duplicate PR guard を実装する。
3. frozen install、major.minor capture、最初の `expo install --check` の exit code capture / 分岐、`expo install --fix` を実装する。
4. major.minor guard、fix 後 validation（`git diff --check HEAD` を含む）、commit 直前の tracked + untracked final changed-file allowlist を実装する。
5. automation branch / commit / push / OPEN PR 作成を実装する。
6. 専用 contract test を追加する。
7. format / lint / typecheck / contract tests と通常 CI を確認する。
8. 実装 PR に現在の dependency correction を混ぜず完了する。
9. merge 後、Actions permission を確認して `main` から1回手動実行する。