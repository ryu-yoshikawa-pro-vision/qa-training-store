# Expo SDK 推奨依存バージョン定期メンテナンス 実装プラン

## 目的

Expo SDK が現在推奨する依存バージョンと Repository の `package.json` / `pnpm-lock.yaml` がずれたことで、`Mobile App CI` の `Native Static > Run Expo Doctor` が失敗する事象を定期的に検知し、安全に修正用 Pull Request を作成できるようにする。

今回自動化する対象は、**現在使用中の Expo SDK line に対する compatible dependency version の不一致だけ**とする。

一般的な dependency update、Expo SDK major / minor upgrade、その他の Expo Doctor failure を自動修正しない。

## 現状

現在の `Mobile App CI` では `Native Static` job で次を実行している。

```text
pnpm dlx expo-doctor@${EXPO_DOCTOR_VERSION}
```

`package.json` または `pnpm-lock.yaml` が変更された Pull Request は Native change として扱われ、既存の Android / iOS build、Bundle Guard、Maestro 等の検証対象になる。

直近では Expo Doctor の dependency version check により、現在の Expo SDK 57 line に対する patch version mismatch が検出されている。

この具体的な target version を Workflow 内に固定値として持たせず、Expo CLI 自身の compatibility metadata を正本として利用する。

Expo CLI の次の既存コマンドを利用する。

```text
pnpm exec expo install --check
pnpm exec expo install --fix
```

`expo install --check` は現在の Expo SDK に対する推奨 dependency version との不一致を検出し、CI では不一致時に non-zero で終了する。

`expo install --fix` は現在の Expo SDK に対して不正な dependency version を compatible version へ更新する。

## 完了時の状態

- Expo compatible dependency check が週1回自動実行される。
- 必要に応じて `workflow_dispatch` から手動実行できる。
- 推奨 dependency version と一致している場合は Repository を変更せず終了する。
- 不一致がある場合だけ `expo install --fix` を実行する。
- 自動修正結果が `package.json` / `pnpm-lock.yaml` の範囲内であり、Expo SDK major / minor line を変更していない場合だけ修正 PR を作成する。
- 同じ目的の修正 PR がすでに OPEN の場合は重複 PR を作らない。
- 修正 PR は auto-merge しない。
- 修正 PR 作成後、既存 Web CI と Mobile App CI を明示的に実行する。
- 一般的な package update や Expo SDK upgrade は実施しない。

## 実装前提

- Package manager は Repository の既存 `pnpm@9.10.0` を使用する。
- Node.js は既存 CI と同じ Node 24 を使用する。
- Expo CLI は Repository にインストール済みの `expo` package を `pnpm exec expo` で使用する。
- Dependency compatibility の target version を Workflow 独自に保持しない。
- GitHub Actions の `GITHUB_TOKEN` を使用し、追加 PAT / GitHub App / 外部 credential は導入しない。
- `ci.yml` と `native-ci.yml` は現在 `workflow_dispatch` を受け付ける。
- `ci.yml` を `workflow_dispatch` で実行した場合、既存条件により Cloudflare Preview / Production deploy は実行されない。
- `native-ci.yml` を `workflow_dispatch` で実行した場合、既存 `detect` contract により Native change を true として full Native validation を実行する。
- Workflow が `GITHUB_TOKEN` で作成した Pull Request の `pull_request` run は GitHub の仕様上 approval-required になる可能性があるため、修正 PR 作成後に `workflow_dispatch` を明示的に発火して検証を開始する。

## 実装内容

### 1. Expo dependency maintenance 専用 Workflow を追加する

新規ファイルを追加する。

```text
.github/workflows/expo-dependency-maintenance.yml
```

Workflow name は次とする。

```text
Expo Dependency Maintenance
```

Trigger は次だけにする。

```yaml
on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
```

`0 0 * * 1` は毎週月曜日 00:00 UTC、JST 09:00 の実行とする。

今回 `pull_request` / `push` trigger は追加しない。

通常 PR ごとに同じ maintenance check を重複実行しない。

### 2. Workflow の権限を必要最小限にする

修正 branch の push、PR 作成、既存 Workflow の dispatch に必要な権限だけを指定する。

```yaml
permissions:
  contents: write
  pull-requests: write
  actions: write
```

次の権限は追加しない。

- issues: write
- deployments: write
- packages: write
- id-token: write

PAT、GitHub App secret、外部サービス token は追加しない。

### 3. 同時実行を防止する

Workflow 単位で concurrency を設定する。

```text
group: expo-dependency-maintenance
cancel-in-progress: false
```

既に実行中の maintenance を途中キャンセルして別実行へ差し替えない。

### 4. 既存 OPEN maintenance PR がある場合は no-op にする

自動修正を開始する前に、base `main` の OPEN PR を確認する。

自動生成 PR の固定 title は次とする。

```text
chore: Expo SDK推奨依存へ同期する
```

自動生成 branch は次の prefix とする。

```text
automation/expo-compatible-dependencies-
```

OPEN PR の中に、上記 title かつ上記 branch prefix の maintenance PR が存在する場合は、新しい dependency check / fix branch / PR を作らず正常終了する。

この場合は GitHub Actions Job Summary に既存 PR が存在するため skip したことを記録する。

OPEN maintenance PR を Workflow が自動更新、force push、close する処理は作らない。

### 5. Repository を現在の lockfile のまま install する

既存 CI と同じ Node / pnpm setup を使用する。

開始時は次を実行する。

```text
pnpm install --frozen-lockfile
```

dependency fix 前に lockfile を暗黙更新しない。

### 6. 現在の Expo SDK major / minor line を記録する

`expo install --fix` 前に `package.json` の `dependencies.expo` から major / minor を取得する。

例:

```text
57.0.17 -> 57.0
~57.0.18 -> 57.0
```

比較に必要なのは major / minor の数字だけとし、新しい semver library は追加しない。

Node.js の短い inline script で取得する。

Expo dependency が存在しない、または major / minor を一意に取得できない場合は Workflow を失敗させ、自動修正を開始しない。

### 7. `expo install --check` で compatible dependency mismatch を確認する

次を実行する。

```text
pnpm exec expo install --check
```

結果を次のように扱う。

#### exit code 0

現在の dependency が Expo SDK 推奨 version と一致しているため正常終了する。

- branch を作成しない
- commit しない
- PR を作成しない
- Web CI / Mobile App CI を追加 dispatch しない
- Job Summary に `No Expo dependency update required` 相当を記録する

#### non-zero

自動修正候補として `expo install --fix` へ進む。

`--check` の non-zero だけを根拠に PR を作成しない。

後続の `--fix`、差分制約、SDK line check、再 `--check` がすべて成功した場合だけ PR を作成する。

### 8. `expo install --fix` で現在の SDK line に対する compatible dependency へ揃える

次を実行する。

```text
pnpm exec expo install --fix
```

特定 package 名や version を Workflow 内へ hard-code しない。

例えば `expo`、`expo-constants` だけを対象とする専用 update command は作らない。

将来、同じ Expo SDK line で別の Expo-managed package に compatible version mismatch が発生した場合も Expo CLI の判断に従う。

### 9. Expo SDK major / minor upgrade を禁止する

`--fix` 後に再度 `package.json` の `dependencies.expo` major / minor を取得する。

修正前と修正後が一致することを必須条件とする。

例:

```text
57.0.x -> 57.0.y  OK
57.0.x -> 57.1.x  NG
57.0.x -> 58.0.x  NG
```

major / minor が変化した場合は Workflow を失敗させる。

この場合は branch / commit / PR を作成しない。

Expo SDK upgrade は別タスクとして扱う。

### 10. 自動修正で変更可能なファイルを固定する

`expo install --fix` 後の Git diff を確認する。

変更を許可するファイルは次だけとする。

```text
package.json
pnpm-lock.yaml
```

条件は次とする。

- diff が空なら失敗する
- 変更ファイルが上記2ファイルの subset であること
- 上記以外のファイルが1件でも変更された場合は失敗する

特に次が変更された場合は PR を作らない。

- `app.config.ts`
- `android/**`
- `ios/**`
- `.github/workflows/**`
- source code
- generated assets

Workflow 実行環境は ephemeral なので、失敗時の自動 revert / cleanup commit は作らない。

### 11. 修正後に dependency contract を再確認する

`--fix` 後に次を実行する。

```text
pnpm install --frozen-lockfile
pnpm exec expo install --check
git diff --check
```

すべて PASS を必須とする。

ここでは full `expo-doctor` を maintenance PR 作成前の Gate として追加しない。

理由は、この Workflow の自動修正責務を compatible dependency mismatch に限定し、Expo Doctor のその他の Finding まで自動修正条件へ混在させないためである。

Full Expo Doctor は後述の既存 Mobile App CI に任せる。

### 12. 修正 branch を作成する

更新が必要で、すべての safety check が PASS した場合だけ branch を作成する。

branch name は run ごとに一意にする。

```text
automation/expo-compatible-dependencies-${GITHUB_RUN_ID}
```

Git author は GitHub Actions bot を使用する。

commit message は次とする。

```text
chore: align Expo SDK compatible dependencies
```

commit 対象は `package.json` / `pnpm-lock.yaml` だけとする。

自動 branch に `--force` / `--force-with-lease` push は使用しない。

### 13. 修正 PR を作成する

GitHub CLI と `GITHUB_TOKEN` を使用して base `main` の OPEN PR を作成する。

PR title:

```text
chore: Expo SDK推奨依存へ同期する
```

PR body には最低限次を記載する。

- Expo compatible dependency mismatch の定期検知により自動生成されたこと
- `pnpm exec expo install --fix` を使用したこと
- Expo SDK major / minor line は変更していないこと
- 変更対象は `package.json` / `pnpm-lock.yaml` のみであること
- 修正後 `pnpm exec expo install --check` が PASS したこと
- Web CI / Mobile App CI を既存 `workflow_dispatch` で実行すること
- auto-merge しないこと

Workflow 内で PR label、assignee、reviewer の自動設定は今回追加しない。

### 14. PR 作成後に既存 CI を明示 dispatch する

`GITHUB_TOKEN` で作成した Pull Request の `pull_request` workflow run が approval-required になる可能性があるため、PR作成後に同じ修正 branch を対象として既存 workflow を明示実行する。

#### Web CI

```text
gh workflow run ci.yml --ref <maintenance branch>
```

現在の `ci.yml` では `workflow_dispatch` の場合、通常の Web validation は実行される一方で、Cloudflare Preview は `pull_request` のみ、Production deploy は `push` to `main` のみなので deployment は発生しない。

この既存条件を今回変更しない。

#### Mobile App CI

```text
gh workflow run native-ci.yml --ref <maintenance branch>
```

現在の `native-ci.yml` は `workflow_dispatch` の場合 `native_changed=true` として扱うため、Native Static / Expo Doctor / Android / iOS / Bundle Guard / Maestro 等の既存 full Native validation を利用する。

新しい maintenance Workflow 内に Android / iOS build や Maestro 実行ロジックを複製しない。

### 15. dispatch 後の CI 完了待ち・auto merge は行わない

Maintenance Workflow の責務は次までとする。

```text
check
  -> fix
  -> safety validation
  -> branch / PR creation
  -> existing Web CI dispatch
  -> existing Mobile App CI dispatch
```

既存 CI の完了を poll して maintenance Workflow 自身の中で待つ処理は追加しない。

PR は OPEN のままとする。

次は実施しない。

- auto-merge
- merge queue 登録
- failing PR の自動 close
- retry loop
- CI failure の自動修復

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
現在の Expo SDK major.minor を記録
       ↓
expo install --check
  ├─ PASS -> no-op
  └─ FAIL
       ↓
expo install --fix
       ↓
Expo SDK major.minor が不変か
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
一意な automation branch を push
            ↓
修正 PR を OPEN で作成
            ↓
Web CI workflow_dispatch
            ↓
Mobile App CI workflow_dispatch
            ↓
終了
```

## Contract test

既存 Repository では GitHub Actions workflow の重要 contract を `tests/contracts/native-ci-workflow.test.ts` で確認している。

新しい test framework / YAML parser は導入せず、既存の文字列ベース contract test の方針を利用して最小限の regression check を追加する。

`tests/contracts/native-ci-workflow.test.ts` で新しい maintenance workflow を読み、少なくとも次を確認する。

- `schedule` と `workflow_dispatch` が存在する
- `contents: write` / `pull-requests: write` / `actions: write` 以外の不要な write permission を追加していない
- `pnpm exec expo install --check` を使用する
- `pnpm exec expo install --fix` を使用する
- Expo SDK major / minor 不変 check がある
- 許可変更ファイルが `package.json` / `pnpm-lock.yaml` に限定されている
- OPEN maintenance PR の重複防止がある
- branch name が automation prefix + run ID で一意である
- Web CI を `workflow_dispatch` する
- Mobile App CI を `workflow_dispatch` する
- auto-merge command を含まない

Workflow shell の内部実装を一行単位で固定する fragile test にはしない。

## 主な変更対象

実装時の主要変更は次に限定する。

```text
.github/workflows/expo-dependency-maintenance.yml  # new
tests/contracts/native-ci-workflow.test.ts         # minimal contract追加
```

この Plan file は実装前の正本として維持する。

原則として次は変更しない。

```text
package.json
pnpm-lock.yaml
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
```

現在発生している Expo patch mismatch 自体を、この maintenance mechanism 実装 PR に混ぜて修正しない。

この mechanism が `main` へ merge された後、初回 `workflow_dispatch` または次回 schedule によって別の maintenance PR として修正する。

## Validation

### 実装 PR で実施する確認

少なくとも次を実行する。

```text
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
```

必要に応じて Repository の通常 `verify` / CI をそのまま利用する。

特に `test:contracts` で新規 Workflow contract と既存 Native / Web CI contract が同時に PASS することを確認する。

新規 maintenance Workflow は default branch へ merge される前は実際の schedule / workflow_dispatch 運用を完全には再現できないため、実装 PR で dependency を意図的に書き換えて疑似 PR を作るテストは行わない。

### merge 後の初回運用確認

Workflow が `main` に存在する状態になった後、一度 `workflow_dispatch` を手動実行する。

現在 Expo compatible dependency mismatch が残っている場合は、次を確認する。

1. maintenance Workflow が不一致を検出する。
2. `expo install --fix` で compatible version へ更新する。
3. Expo SDK major / minor line が変化していない。
4. 変更が `package.json` / `pnpm-lock.yaml` だけである。
5. 修正 PR が1件だけ OPEN になる。
6. Web CI の workflow_dispatch が開始される。
7. Mobile App CI の workflow_dispatch が開始される。
8. Mobile App CI の Expo Doctor dependency version failure が解消される。
9. auto-merge されない。

初回実行時点ですでに別対応で mismatch が解消済みの場合は、branch / PR を作らず no-op で終了することを正常結果とする。

## 完了条件

- `.github/workflows/expo-dependency-maintenance.yml` が追加されている。
- 毎週月曜 JST 09:00 と手動実行の両方を利用できる。
- `expo install --check` が PASS の場合は Repository を変更しない。
- mismatch の場合だけ `expo install --fix` を実行する。
- target package / target patch version を独自管理していない。
- Expo SDK major / minor line を自動更新しない。
- 自動修正で `package.json` / `pnpm-lock.yaml` 以外を変更できない。
- fix 後の `expo install --check` が PASS しなければ PR を作らない。
- OPEN maintenance PR がある場合に重複 PR を作らない。
- 自動 branch に force push しない。
- PR は OPEN で作成し、auto-merge しない。
- GITHUB_TOKEN 以外の credential を追加していない。
- PR作成後に既存 Web CI / Mobile App CI を workflow_dispatch している。
- Web / Native validation logic を maintenance Workflow へ複製していない。
- 現在の `ci.yml` / `native-ci.yml` / `native-ios-ci.yml` の責務を不要に変更していない。
- 既存 contract tests と新規 maintenance contract test が PASS する。

## 対象外

- Expo SDK major / minor upgrade
- React Native major / minor upgrade
- npm / pnpm package の一般的な最新版追従
- Dependabot の追加・再設計
- `expo.install.exclude` による warning suppression
- Expo Doctor の他 Finding の自動修正
- Expo Doctor を既存 Native CI から削除すること
- Expo Doctor failure を non-blocking に変更すること
- Android / iOS build logic の変更
- Maestro flow の変更
- Web CI / Native CI の既存 validation scope の縮小
- 自動 merge
- 自動 reviewer / assignee / label 管理
- Slack / email 通知
- failure 時の自動 issue 作成
- 外部 bot / SaaS の導入
- PAT / GitHub App の追加

## Stop 条件

次のいずれかが発生した場合は、推測で自動化範囲を広げず別対応として整理する。

- `expo install --fix` が Expo SDK major / minor を変更しようとする。
- `expo install --fix` が `package.json` / `pnpm-lock.yaml` 以外の Repository file を変更する。
- fix 後も `expo install --check` が失敗する。
- compatible dependency update に native configuration や source code の変更が必要になる。
- `GITHUB_TOKEN` では branch push / PR creation / workflow dispatch に必要な Repository permission を確保できない。
- `ci.yml` / `native-ci.yml` から `workflow_dispatch` が削除される、または既存条件が変わり maintenance branch の dispatch が安全に利用できなくなる。
- Web CI の workflow_dispatch が Production deploy を実行する構成へ変更される。
- 自動生成 PR を required check と正しく連携させるため PAT / GitHub App が必須になる。

## 実装順

1. 実装開始時に最新 `main` を取り込み、`package.json`、`ci.yml`、`native-ci.yml` の現在契約を再確認する。
2. `.github/workflows/expo-dependency-maintenance.yml` を追加し、schedule / manual trigger、権限、重複 PR guard を実装する。
3. `pnpm install --frozen-lockfile`、SDK line capture、`expo install --check` / `--fix` を実装する。
4. SDK major / minor guard、変更ファイル allowlist、修正後 validation を実装する。
5. GitHub Actions bot の一意 branch / commit / OPEN PR 作成を実装する。
6. PR 作成後に `ci.yml` / `native-ci.yml` を workflow_dispatch する。
7. `tests/contracts/native-ci-workflow.test.ts` に maintenance Workflow の最小 contract test を追加する。
8. format / lint / typecheck / contract tests と通常 CI を確認する。
9. 実装 PR には現在の Expo dependency version correction を混ぜずに完了する。
10. merge 後、maintenance Workflow を `workflow_dispatch` で1回実行し、mismatch が残っていれば別の自動 maintenance PR が生成されることを確認する。
