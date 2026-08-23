# CI Workflow 表示名整理プラン

## 目的

GitHub Actions の CI 名を、開発フェーズ由来の一時的な名称ではなく、対象プラットフォームが直感的に分かる恒常的な名称へ整理する。

今回の変更では CI の実行内容・発火条件・job 構成・内部識別子は変更せず、GitHub Actions 上で人間が確認する Workflow 表示名だけを最小限変更する。

## 背景

現在は以下の Workflow 名になっている。

- `.github/workflows/ci.yml`: `Phase 1 CI`
- `.github/workflows/native-ci.yml`: `Native CI`
- `.github/workflows/native-ios-ci.yml`: `Native iOS CI`
- `.github/workflows/cross-browser-smoke.yml`: `Cross-Browser Smoke`

`Phase 1 CI` は開発段階を示す名称であり、現在の恒常的な CI の役割を表していない。実際には Web build、Vitest、Chromium E2E、アクセシビリティ、Web の mobile-boundary など Web 側の品質ゲートをまとめているため、`Web CI` の方が役割を正確に表す。

また `Native CI` は Expo / React Native ベースのモバイルアプリ向け CI であり、GitHub Actions 一覧を見た人にとっては `Mobile App CI` の方が対象を理解しやすい。単なる `Mobile CI` だと Web 側にも存在する mobile viewport / mobile-boundary 系テストと混同する余地があるため採用しない。

## 採用する名称

| 現在 | 変更後 |
| --- | --- |
| `Phase 1 CI` | `Web CI` |
| `Native CI` | `Mobile App CI` |
| `Native iOS CI` | `Mobile App iOS CI` |
| `Cross-Browser Smoke` | 変更なし |

## 変更対象

### 1. `.github/workflows/ci.yml`

Workflow 先頭の表示名のみ変更する。

```yaml
name: Web CI
```

現在の `name: Phase 1 CI` を置き換える。

### 2. `.github/workflows/native-ci.yml`

Workflow 先頭の表示名のみ変更する。

```yaml
name: Mobile App CI
```

現在の `name: Native CI` を置き換える。

### 3. `.github/workflows/native-ios-ci.yml`

Workflow 先頭の表示名のみ変更する。

```yaml
name: Mobile App iOS CI
```

現在の `name: Native iOS CI` を置き換える。

## 変更しないもの

今回の目的は GitHub Actions 上の Workflow 表示名整理であり、技術的な `native` 用語の全面置換ではない。以下は変更しない。

- Workflow ファイル名
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
  - `.github/workflows/native-ios-ci.yml`
- job ID / job 名
- `native_changed` などの output・変数名
- `Detect Native Changes` / `Native Static` など内部の job 表示名
- `*.native.ts` / `*.native.tsx`
- `src/presentation/native/**` などのディレクトリ名
- `generate:native-assets` など既存 script 名
- Maestro / Android / iOS の処理内容
- `on:`、permissions、concurrency、timeout、matrix、artifact 名
- `Cross-Browser Smoke` の Workflow 名

理由は、これらの `native` は React Native / Expo における技術上の意味を持っており、今回の UI 上の分類名変更とは責務が異なるため。

## 実装手順

1. `.github/workflows/ci.yml` の `name` を `Phase 1 CI` から `Web CI` に変更する。
2. `.github/workflows/native-ci.yml` の `name` を `Native CI` から `Mobile App CI` に変更する。
3. `.github/workflows/native-ios-ci.yml` の `name` を `Native iOS CI` から `Mobile App iOS CI` に変更する。
4. 差分を確認し、上記 3 行以外に意図しない変更が入っていないことを確認する。
5. Workflow を文字列として検証する既存 contract test への影響を確認する。特に `tests/contracts/native-ci-workflow.test.ts` は `.github/workflows/ci.yml`、`native-ci.yml`、`native-ios-ci.yml` を直接読み込んでいるため、既存テストを実行して回帰がないことを確認する。
6. GitHub Actions の YAML として構文上問題がないことを確認する。

## 検証

最低限、以下を実施する。

```bash
pnpm run test:contracts
```

リポジトリに既存の Workflow/YAML 検証コマンドがある場合は、それも実行する。

さらに差分を確認する。

```bash
git diff -- .github/workflows/ci.yml .github/workflows/native-ci.yml .github/workflows/native-ios-ci.yml
```

期待する差分は原則として各 Workflow の先頭 `name:` の 3 行のみ。

## 完了条件

- GitHub Actions 上の Workflow 名が以下になる。
  - `Web CI`
  - `Mobile App CI`
  - `Mobile App iOS CI`
  - `Cross-Browser Smoke`
- CI の実行条件・処理・job 構成に変更がない。
- 内部の技術用語としての `native` は維持されている。
- 既存 contract test が通る。
- 意図しないファイル変更がない。

## スコープ外

以下は今回実施しない。

- `ci.yml` を `web-ci.yml` にリネームすること
- `native-ci.yml` を `mobile-app-ci.yml` にリネームすること
- `native-ios-ci.yml` を `mobile-app-ios-ci.yml` にリネームすること
- job 名やコード上の `Native` / `native` の一括リネーム
- CI 構成の統合・分割・高速化
- required check / branch protection の再設計

ファイル名まで整理する場合は参照元・contract test・ドキュメント・branch protection 等への影響範囲が広がるため、必要性が出た時点で別途検討する。
