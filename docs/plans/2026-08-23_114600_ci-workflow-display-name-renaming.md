# CI Workflow 表示名整理プラン

## 目的

GitHub Actions の Workflow 表示名を、開発フェーズ由来の一時的な名称ではなく、対象プラットフォームを直感的に識別できる恒常的な名称へ整理する。

今回の実装はトップレベルの `name:` 3 行だけを変更する。CI の job、実行条件、テスト内容、Workflow ファイル名、技術的な `native` 識別子は変更しない。

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

内部コードの `Native` / `native` は React Native / Expo 上の技術的な意味を持つため、今回の表示名整理とは分離して維持する。

## 実装範囲

以下の 3 箇所だけを変更する。

### `.github/workflows/ci.yml`

```diff
-name: Phase 1 CI
+name: Web CI
```

### `.github/workflows/native-ci.yml`

```diff
-name: Native CI
+name: Mobile App CI
```

### `.github/workflows/native-ios-ci.yml`

```diff
-name: Native iOS CI
+name: Mobile App iOS CI
```

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
- `native_changed`、`*.native.tsx`、`src/presentation/native/**`、`generate:native-assets` など技術的な `native` 識別子
- Workflow の `on:`、permissions、timeout、matrix、artifact、job dependency
- concurrency の実装
- `Cross-Browser Smoke` の表示名
- CI の統合・分割・高速化
- required check / branch protection / ruleset の再設計
- 新しい Workflow validator や actionlint の導入

ファイル名や内部の `Native` 命名まで整理する場合は影響範囲が異なるため、必要になった時点で別タスクとして扱う。

## 実装手順

### 1. 旧 Workflow 名の参照を確認する

変更前に以下を実行する。

```bash
git grep -n -E 'Phase 1 CI|Native CI|Native iOS CI'
```

確認目的は、Workflow の表示名を文字列として依存している現在有効なコード・設定・テスト・運用ドキュメントがないことを確認するためである。

判断基準:

- `.github/workflows/*.yml` の対象 `name:` は今回の変更対象。
- `docs/plans/` など過去の経緯を記録した文書に旧名称が残っていても一括置換しない。
- 現在有効なコード・設定・テストが Workflow 表示名そのものに依存している場合だけ影響を確認する。
- 今回の目的と無関係な `Phase 1` / `Native` という一般的な用語は変更しない。

レビュー時点では、変更対象 3 Workflow 以外に表示名変更を必須とする箇所は確認されていない。そのため、通常の実装差分は 3 行のみを期待する。

### 2. Workflow 表示名を変更する

以下をそのまま変更する。

1. `.github/workflows/ci.yml`: `Phase 1 CI` → `Web CI`
2. `.github/workflows/native-ci.yml`: `Native CI` → `Mobile App CI`
3. `.github/workflows/native-ios-ci.yml`: `Native iOS CI` → `Mobile App iOS CI`

それ以外の行は編集しない。

### 3. 既存 Contract Test を実行する

`tests/contracts/native-ci-workflow.test.ts` は対象 Workflow ファイルを直接読み込んでいるため、既存 Contract Test で回帰を確認する。

```bash
pnpm run test:contracts
```

今回の 3 行変更のためだけに新しいテストや YAML validator は追加しない。

### 4. 差分を検証する

```bash
git diff --check

git diff -- \
  .github/workflows/ci.yml \
  .github/workflows/native-ci.yml \
  .github/workflows/native-ios-ci.yml
```

期待する実装差分は、各 Workflow 先頭の `name:` 1 行ずつ、合計 3 行の置換だけである。

変更後の名称も確認する。

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
- `Cross-Browser Smoke` は変更されていない。
- 実装差分が原則として上記 3 行だけである。
- `pnpm run test:contracts` が成功する。
- `git diff --check` が成功する。
- CI の job、実行条件、内部識別子、concurrency 実装に意図しない変更がない。
- `Web CI` への rename に伴い `${{ github.workflow }}` ベースの concurrency group 名が変わることを既知の影響として受け入れている。
