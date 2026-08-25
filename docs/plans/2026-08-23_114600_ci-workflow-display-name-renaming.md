# CI Workflow 表示名整理プラン

## 目的

GitHub Actions のトップレベル Workflow 表示名を、開発フェーズ由来・技術実装由来の名称から、対象プラットフォームを直感的に識別できる恒常的な名称へ整理する。

今回変更するのは、3つの Workflow ファイル先頭にあるトップレベル `name:` だけとする。

CI の job、step、テスト、実行条件、Workflow ファイル名、内部識別子、ログ文言は変更しない。

## 採用する名称

| Workflow | 現在の表示名 | 変更後 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `Phase 1 CI` | `Web CI` |
| `.github/workflows/native-ci.yml` | `Native CI` | `Mobile App CI` |
| `.github/workflows/native-ios-ci.yml` | `Native iOS CI` | `Mobile App iOS CI` |
| `.github/workflows/cross-browser-smoke.yml` | `Cross Browser Smoke` | 変更なし |

## 命名理由

### `Phase 1 CI` → `Web CI`

`Phase 1 CI` は開発段階を示す一時的な名称であり、恒常運用する CI の役割を表しにくい。

`.github/workflows/ci.yml` は Web Build、Chromium E2E、Accessibility、UI Review など Web 向け検証を主担当としつつ、Vitest、型チェック、静的解析、Contract Test などリポジトリ共通の品質ゲートも含む。

厳密な「Web 専用 Workflow」ではないが、Actions 一覧で主要な役割を最も簡潔に示す名称として `Web CI` を採用する。

### `Native CI` → `Mobile App CI`

`.github/workflows/native-ci.yml` は Expo / React Native ベースのモバイルアプリ向け CI である。

人間向けの分類名としては `Native CI` より `Mobile App CI` の方が対象を理解しやすい。

`Mobile CI` だけでは `.github/workflows/ci.yml` に含まれる mobile viewport / mobile-boundary 系 Web テストと混同する余地があるため採用しない。

### `Native iOS CI` → `Mobile App iOS CI`

`.github/workflows/native-ios-ci.yml` は iOS 向け Reusable Workflow / 手動実行 Workflow であるため、トップレベル表示名を `Mobile App iOS CI` とする。

内部で使われている `Native` / `native` は React Native / Expo 上の技術用語または既存識別子であり、今回の人間向け Workflow 分類名とは分離して維持する。

## 実装範囲

実装差分は原則として次の3行だけとする。

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

## 明示的に変更しないもの

今回の目的は「トップレベル Workflow 表示名の整理」である。名称を全面統一するタスクではない。

以下は変更しない。

- Workflow ファイル名
- job ID
- job 表示名
- step 表示名
- step 内のログ文言
- Contract Test の `describe(...)` 名
- Contract Test のロジック / assertion
- `phaseOneWorkflow`、`phase1-required.spec.ts` などの `phase1` / `Phase 1` 識別子
- `nativeWorkflow`、`native_changed`、`*.native.tsx`、`src/presentation/native/**`、`generate:native-assets` などの `native` / `Native` 識別子
- Workflow の `on:`、permissions、timeout、matrix、artifact、job dependency
- concurrency の実装
- `Cross Browser Smoke` の表示名
- required check / branch protection / ruleset
- CI の統合・分割・高速化
- 新しい Workflow validator、actionlint、専用テストの追加

Required status check の名前は job 名を基準とする。今回は job 名を変更しないため、トップレベル Workflow 名の rename に伴う branch protection / ruleset の required check 更新は不要と判断する。

### 意図的に残す旧名称の例

`.github/workflows/native-ci.yml` には、トップレベル Workflow 名とは別に次の人間向け表示・ログが存在する。

```yaml
native-ios:
  name: Native iOS CI
```

```yaml
verify:
  name: native-ci / verify
```

```yaml
- name: Require stable Native CI result
```

```text
All Native CI gates completed successfully.
```

これらは job / step / ログの名称であり、今回のトップレベル Workflow 表示名変更には含めない。

同様に Contract Test 内の次の suite 名も変更しない。

```ts
describe("Phase 1 CI deployment boundaries", ...)
describe("Native CI workflow contracts", ...)
describe("Native iOS CI workflow contracts", ...)
```

これらを整理する場合は、job/check 名やテスト命名を扱う別タスクとして検討する。

## 既知の影響

### `.github/workflows/ci.yml` の concurrency group

`.github/workflows/ci.yml` は concurrency group に `${{ github.workflow }}` を使用している。

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}
```

`github.workflow` は Workflow のトップレベル表示名を参照するため、`Phase 1 CI` → `Web CI` の rename 後は concurrency group の先頭文字列も変わる。

例:

```text
Phase 1 CI-pull_request-123
↓
Web CI-pull_request-123
```

これは名称変更に伴う既知かつ許容する影響とする。

rename 後も同じ Workflow・event・PR/ref 単位で排他されるため、concurrency の設計自体は変更しない。

切り替え時点で旧名称の Workflow run が実行中の場合、旧runと新runは一時的に別groupとなり相互cancelされない可能性があるが、移行時だけの影響であるため追加対応しない。

### Native / iOS Workflow

`.github/workflows/native-ci.yml` の concurrency group は `native-ci-...`、`.github/workflows/native-ios-ci.yml` は `native-ios-ci-...` という固定文字列を使用している。

そのため、トップレベル Workflow 表示名を変更しても同様の concurrency group 変更は発生しない。

## 実装手順

### 1. 変更前のトップレベル Workflow 名を確認する

```bash
git grep -n -E '^name: (Phase 1 CI|Native CI|Native iOS CI)$' -- .github/workflows
```

期待結果:

```text
.github/workflows/ci.yml:1:name: Phase 1 CI
.github/workflows/native-ci.yml:1:name: Native CI
.github/workflows/native-ios-ci.yml:1:name: Native iOS CI
```

この検索は行頭の `name:` だけを対象にするため、インデントされた job / step の `name:` は対象にしない。

### 2. トップレベル Workflow 表示名3箇所を変更する

以下だけを変更する。

1. `.github/workflows/ci.yml`: `Phase 1 CI` → `Web CI`
2. `.github/workflows/native-ci.yml`: `Native CI` → `Mobile App CI`
3. `.github/workflows/native-ios-ci.yml`: `Native iOS CI` → `Mobile App iOS CI`

各ファイルのトップレベル `name:` 以外は編集しない。

### 3. 既存 Contract Test を実行する

テストコード自体は変更しない。

対象 Workflow を直接読み込む既存 Contract Test で、rename による回帰がないことだけ確認する。

```bash
pnpm exec vitest run \
  tests/contracts/ci-workflow.test.ts \
  tests/contracts/native-ci-workflow.test.ts \
  --no-file-parallelism \
  --maxWorkers=1
```

今回の3行変更のためだけに新しいテストや Workflow validator は追加しない。

### 4. 差分を確認する

まず変更ファイル一覧を確認する。

```bash
git diff --name-only
```

実装による変更対象は原則として次の3ファイルだけとする。

```text
.github/workflows/ci.yml
.github/workflows/native-ci.yml
.github/workflows/native-ios-ci.yml
```

続けて差分品質と内容を確認する。

```bash
git diff --check

git diff -- \
  .github/workflows/ci.yml \
  .github/workflows/native-ci.yml \
  .github/workflows/native-ios-ci.yml
```

期待する実装差分は各 Workflow 先頭の `name:` 1行ずつ、合計3行の置換だけである。

### 5. 変更後のトップレベル Workflow 名を確認する

```bash
git grep -n -E '^name: (Web CI|Mobile App CI|Mobile App iOS CI)$' -- .github/workflows
```

期待結果:

```text
.github/workflows/ci.yml:1:name: Web CI
.github/workflows/native-ci.yml:1:name: Mobile App CI
.github/workflows/native-ios-ci.yml:1:name: Mobile App iOS CI
```

job / step / Contract Test に旧名称が残っていても、今回の完了条件には影響しない。

## 完了条件

- `.github/workflows/ci.yml` のトップレベル表示名が `Web CI` になっている。
- `.github/workflows/native-ci.yml` のトップレベル表示名が `Mobile App CI` になっている。
- `.github/workflows/native-ios-ci.yml` のトップレベル表示名が `Mobile App iOS CI` になっている。
- `Cross Browser Smoke` は変更されていない。
- 実装による変更ファイルが原則として上記3ファイルだけである。
- 実装差分が原則として上記3行の置換だけである。
- 対象 Contract Test 2ファイルが成功する。
- `git diff --check` が成功する。
- CI の job、step、実行条件、テストコード、内部識別子、ログ文言、concurrency 実装に意図しない変更がない。
- `Web CI` への rename に伴い `${{ github.workflow }}` ベースの concurrency group 名が変わることを既知の影響として受け入れている。
