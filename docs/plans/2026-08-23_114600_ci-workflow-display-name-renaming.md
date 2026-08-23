# CI Workflow 表示名整理プラン

## 目的

GitHub Actions の Workflow 表示名を、開発フェーズ由来の一時的な名称ではなく、対象プラットフォームを直感的に識別できる恒常的な名称へ整理する。

今回の実装は、Workflow のトップレベル `name:` 3 行と、それらの旧名称を人間向けテスト表示名として使用している Contract Test の `describe(...)` 3 行だけを変更する。CI の job、実行条件、テスト内容、Workflow ファイル名、技術的な `native` / `phase1` 識別子は変更しない。

## 背景

現在の Workflow 表示名は以下となっている。

| Workflow | 現在の表示名 | 変更後 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `Phase 1 CI` | `Web CI` |
| `.github/workflows/native-ci.yml` | `Native CI` | `Mobile App CI` |
| `.github/workflows/native-ios-ci.yml` | `Native iOS CI` | `Mobile App iOS CI` |
| `.github/workflows/cross-browser-smoke.yml` | `Cross-Browser Smoke` | 変更なし |

`Phase 1 CI` は開発段階を示す名称であり、恒常運用する CI の名称として役割が分かりにくい。`.github/workflows/ci.yml` は Web Build、Chromium E2E、Accessibility、UI Review など Web 向けの検証を主担当としつつ、Vitest、型チェック、静的解析、Contract Test などリポジトリ共通の品質ゲートも含む。Actions 一覧での主要な役割を端的に示す名称として `Web CI` を採用する。

`Native CI` は Expo / React Native ベースのモバイルアプリ向け CI であるため、人間向けの分類名として `Mobile App CI` の方が明確である。`Mobile CI` だけでは Web 側の mobile viewport / mobile-boundary 系テストと混同しやすいため採用しない。

内部コードの `Native` / `native`、`Phase 1` / `phase1` は既存の技術的・歴史的識別子として別の責務を持つため、今回の表示名整理とは分離して維持する。

## 実装範囲

実装差分は原則として以下の 6 行だけとする。

### 1. `.github/workflows/ci.yml`

```diff
-name: Phase 1 CI
+name: Web CI
```

### 2. `.github/workflows/native-ci.yml`

```diff
-name: Native CI
+name: Mobile App CI
```

### 3. `.github/workflows/native-ios-ci.yml`

```diff
-name: Native iOS CI
+name: Mobile App iOS CI
```

### 4. `tests/contracts/ci-workflow.test.ts`

Contract Test の人間向け suite 名も Workflow 名に合わせる。

```diff
-describe("Phase 1 CI deployment boundaries", () => {
+describe("Web CI deployment boundaries", () => {
```

### 5. `tests/contracts/native-ci-workflow.test.ts`

同一ファイル内の 2 箇所を変更する。

```diff
-describe("Native CI workflow contracts", () => {
+describe("Mobile App CI workflow contracts", () => {
```

```diff
-describe("Native iOS CI workflow contracts", () => {
+describe("Mobile App iOS CI workflow contracts", () => {
```

Contract Test の `describe(...)` はテスト実行時に人間が見る表示名であり、今回整理する Workflow 名と同じ旧名称を使っているため合わせて変更する。テストロジックや assertion は変更しない。

## 既知の影響

`.github/workflows/ci.yml` の concurrency group は `${{ github.workflow }}` を使用している。

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}
```

`github.workflow` は Workflow の表示名を参照するため、`Phase 1 CI` から `Web CI` への変更後は concurrency group の先頭文字列も変わる。

例:

```text
Phase 1 CI-pull_request-123
↓
Web CI-pull_request-123
```

これは今回の名称変更に伴う意図された副作用として許容する。rename 後も同じ Workflow・event・PR/ref 単位で排他されるため、concurrency の設計自体は変更しない。

ただし rename の切り替え時点で旧名称の Workflow run がまだ実行中の場合、新名称の run とは別 group になるため、一時的に相互 cancel されない可能性がある。これは移行時だけの影響であり、恒常的な問題ではないため追加対応しない。

`.github/workflows/native-ci.yml` などの concurrency group は固定文字列を使用しているため、この表示名変更による同様の影響はない。

## 実装しないこと

今回の変更を名称整理以上に広げない。以下は変更しない。

- Workflow ファイル名
- job ID / job 表示名
- `phaseOneWorkflow`、`phase1-required.spec.ts` など内部の `phase1` / `Phase 1` 識別子
- `nativeWorkflow`、`native_changed`、`*.native.tsx`、`src/presentation/native/**`、`generate:native-assets` など技術的な `native` 識別子
- Contract Test のロジック、assertion、テスト構成
- Workflow の `on:`、permissions、timeout、matrix、artifact、job dependency
- concurrency の実装
- `Cross-Browser Smoke` の表示名
- CI の統合・分割・高速化
- required check / branch protection / ruleset の再設計
- 新しい Workflow validator、actionlint、専用テストの導入

ファイル名や内部識別子まで整理する場合は影響範囲が異なるため、必要になった時点で別タスクとして扱う。

## 実装手順

### 1. 旧 Workflow 名の現在有効な参照を確認する

変更前に以下を実行する。

```bash
git grep -n -E 'Phase 1 CI|Native CI|Native iOS CI' -- . ':(exclude)docs/plans/**'
```

目的は、Workflow 表示名そのものに依存する現在有効なコード・設定・テスト・運用ドキュメントを確認することである。

レビュー時点で変更対象として確認済みなのは以下だけである。

- `.github/workflows/ci.yml`
- `.github/workflows/native-ci.yml`
- `.github/workflows/native-ios-ci.yml`
- `tests/contracts/ci-workflow.test.ts` の `describe("Phase 1 CI ...")`
- `tests/contracts/native-ci-workflow.test.ts` の `describe("Native CI ...")`
- `tests/contracts/native-ci-workflow.test.ts` の `describe("Native iOS CI ...")`

判断基準:

- 上記 6 箇所は今回変更する。
- `docs/plans/**` は過去の経緯を残すため検索から除外し、一括置換しない。
- `Phase 1 Required`、`phase1-required.spec.ts`、`phaseOneWorkflow` など Workflow 表示名そのものではない識別子は変更しない。
- `Native component`、`native_changed`、`nativeWorkflow` など技術的な `Native` / `native` 用語は変更しない。
- 想定外の完全一致参照が見つかった場合だけ、その参照が人間向け Workflow 名なのか、実際の文字列依存なのかを確認する。今回の目的と無関係なら変更しない。

### 2. Workflow 表示名 3 箇所を変更する

以下をそのまま変更する。

1. `.github/workflows/ci.yml`: `Phase 1 CI` → `Web CI`
2. `.github/workflows/native-ci.yml`: `Native CI` → `Mobile App CI`
3. `.github/workflows/native-ios-ci.yml`: `Native iOS CI` → `Mobile App iOS CI`

トップレベル `name:` 以外の Workflow 行は編集しない。

### 3. Contract Test の人間向け suite 名 3 箇所を変更する

以下だけを変更する。

1. `tests/contracts/ci-workflow.test.ts`: `Phase 1 CI deployment boundaries` → `Web CI deployment boundaries`
2. `tests/contracts/native-ci-workflow.test.ts`: `Native CI workflow contracts` → `Mobile App CI workflow contracts`
3. `tests/contracts/native-ci-workflow.test.ts`: `Native iOS CI workflow contracts` → `Mobile App iOS CI workflow contracts`

`describe(...)` の文字列以外は編集しない。

### 4. 対象 Contract Test を実行する

今回直接関係する 2 ファイルだけを実行する。

```bash
pnpm exec vitest run \
  tests/contracts/ci-workflow.test.ts \
  tests/contracts/native-ci-workflow.test.ts \
  --no-file-parallelism \
  --maxWorkers=1
```

今回の名称変更のためだけに新しいテストや YAML validator は追加しない。通常の CI では既存の Contract Test 全体が実行されるため、ローカル確認は直接影響する 2 ファイルに絞る。

### 5. 旧 Workflow 名が現在有効な参照から消えたことを確認する

変更後に同じ検索を実行する。

```bash
git grep -n -E 'Phase 1 CI|Native CI|Native iOS CI' -- . ':(exclude)docs/plans/**'
```

期待結果は 0 件である。

`Phase 1` や `Native` を含む別の一般用語・技術用語まで消す必要はない。

### 6. 差分を検証する

まず変更ファイル一覧を確認する。

```bash
git diff --name-only
```

実装による変更対象は原則として以下の 5 ファイルだけである。

```text
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
tests/contracts/ci-workflow.test.ts
tests/contracts/native-ci-workflow.test.ts
```

続けて差分品質と内容を確認する。

```bash
git diff --check

git diff -- \
  .github/workflows/ci.yml \
  .github/workflows/native-ci.yml \
  .github/workflows/native-ios-ci.yml \
  tests/contracts/ci-workflow.test.ts \
  tests/contracts/native-ci-workflow.test.ts
```

期待する実装差分は、Workflow の `name:` 3 行と Contract Test の `describe(...)` 3 行、合計 6 行の置換だけである。

最後に変更後の Workflow 表示名を確認する。

```bash
git grep -n -E '^name: (Web CI|Mobile App CI|Mobile App iOS CI)$' -- .github/workflows
```

以下の 3 件が確認できればよい。

```text
.github/workflows/ci.yml:name: Web CI
.github/workflows/native-ci.yml:name: Mobile App CI
.github/workflows/native-ios-ci.yml:name: Mobile App iOS CI
```

## 完了条件

- `.github/workflows/ci.yml` の表示名が `Web CI` になっている。
- `.github/workflows/native-ci.yml` の表示名が `Mobile App CI` になっている。
- `.github/workflows/native-ios-ci.yml` の表示名が `Mobile App iOS CI` になっている。
- `tests/contracts/ci-workflow.test.ts` の対応する suite 名が `Web CI deployment boundaries` になっている。
- `tests/contracts/native-ci-workflow.test.ts` の対応する suite 名が `Mobile App CI workflow contracts` / `Mobile App iOS CI workflow contracts` になっている。
- `Cross-Browser Smoke` は変更されていない。
- `docs/plans/**` を除く現在有効な参照に旧 Workflow 名 `Phase 1 CI` / `Native CI` / `Native iOS CI` が残っていない。
- 実装による変更ファイルが原則として上記 5 ファイルだけである。
- 実装差分が原則として上記 6 行の置換だけである。
- 対象 Contract Test 2 ファイルが成功する。
- `git diff --check` が成功する。
- CI の job、実行条件、テストロジック、内部識別子、concurrency 実装に意図しない変更がない。
- `Web CI` への rename に伴い `${{ github.workflow }}` ベースの concurrency group 名が変わることを既知の影響として受け入れている。
