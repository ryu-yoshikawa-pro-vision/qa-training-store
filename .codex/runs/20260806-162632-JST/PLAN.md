# 計画

## 目的
- `tests/contracts`、Vitest 設定、`ci.yml`/`native-ci.yml`、PowerShell 実行性を確認し、sanitizer fixture test と contract test の実装・CI 接続条件を整理する。

## 対象範囲

- 対象:
  - `tests/contracts/*`
  - `vitest.config.ts`
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
  - `e2e/web/ui-review.spec.ts`
  - PowerShell での `pnpm run test:contracts`
- 対象外:
  - コード変更
  - workflow / test file の編集
  - ファイル削除

## 前提
- `sanitizeFolderName` は現状 `e2e/web/ui-review.spec.ts` のローカル関数で、直接テストするには切り出しが必要な可能性が高い。
- contract test は既存の `tests/contracts` に追加する想定で、Vitest 経由で実行する。

## 不明点

- 必ず確認する不透明点:
- sanitizer fixture test は「関数単体の純粋テスト」にするか、「UI Review spec のソース契約」にするか。
- 仮定してよい細部:
  - 既存の CI は `test:contracts` を `ci.yml` と `native-ci.yml` で実行している。
  - PowerShell 上では `pnpm run test:contracts` をそのまま起動できる。
- 未回答の重要質問:
  - 追加する sanitizer テストをどのレイヤーへ置くべきか。

## 仮説
- H1: sanitizer fixture test を `tests/contracts` に追加すれば、`pnpm run test:contracts`、`ci.yml` の Vitest job、`native-ci.yml` の static job に自動的に乗る。
- H2: `ui-review.spec.ts` の sanitizer は現状ローカル関数なので、直接検証したいならヘルパー分離か source-contract 方式が必要になる。

## 調査計画

- 第1回の調査: 既存 contract、Vitest config、CI workflow、ui-review spec を読む。
- 第2回の調査: PowerShell から `pnpm run test:contracts` を実行して、実行性を確認する。
- 終了条件:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## 方針
- 既存の contract テスト群を列挙し、Vitest / CI のどの gate に接続されているかを確認する。
- `ui-review.spec.ts` の sanitizer 周辺を読み、テスト可能性と切り出し要否を判断する。
- PowerShell から既存の contract suite を実行し、Windows 実行性を裏取りする。
- 標準フロー: `PLAN -> 調査 -> TASKS -> 実行結果記録 -> REPORT`

## 完了条件
- 関連テスト、失敗候補、追加テスト観点、実行コマンドを日本語で整理できている。
- sanitizer fixture test と contract test の接続条件と既存 gate への影響を明記できている。

## リスク／未確定事項
- `ui-review.spec.ts` が Playwright spec であるため、直 import テストはトップレベル副作用を持つ可能性がある。
- Windows での shell 依存は少ないが、workflow 内の bash スクリプトは PowerShell 直接実行対象ではない。

## 判断ログ
- `tests/contracts` は既に UI/CI/native の設定契約を広くカバーしており、今回の新規テストは既存 gate に自然に乗る。
- sanitizer 本体は `ui-review.spec.ts` のローカル関数なので、純粋関数化しない限り直接テストしづらい。
