# 計画

> このRunは同一タスクで重複作成されたため、実装・検証を
> `20260802-170105-JST`へ移管し、`superseded`として終了した。
> 以下は作成時点の計画であり、本Runでは実行していない。

## 目的

- 親Agent承認済み計画に従い、`.github/workflows/ci.yml` と `playwright.config.ts` を最小差分で更新する。

## 範囲

- In:
  - `.github/workflows/ci.yml`
  - `playwright.config.ts`
- Out:
  - tests / src / package.json / scripts / docs の編集
  - ファイル削除、rename、移動
  - 依存追加、Retry増加、continue-on-error、Workflow分割、Composite Action、Container 追加

## 前提

- 既存の Playwright / CI の基本構成は維持し、指定された Job / 環境変数 / 実行順だけを置き換える。

## 質問・曖昧性

- 必ず質問する不透明点:
  - なし
- 仮定してよい細部:
  - 既存の Job 名や artifact 名は、仕様に明示されたものへ合わせる。
- 未回答の重要質問:
  - なし

## 仮説

- H1: 既存の CI は単一 Job に多くの責務が混在しているため、指定 Job 群へ分割する必要がある。
- H2: Playwright 設定は `DEPLOYED_BASE_URL` がある場合に webServer を作らない構造へ整理する必要がある。

## 調査計画

- Round 1 Query:
  - 既存の `ci.yml` / `playwright.config.ts` の責務分担を確認する
- Round 2 Query:
  - なし
- Exit Criteria:
  - 仕様にある Job / env / concurrency / artifact / Playwright webServer 条件が反映される
  - 指定外ファイルを変更しない

## 進め方

- 現状の CI / Playwright 設定を確認する。
- 仕様どおりの Job 構成へ最小差分で置換する。
- 2ファイルのみを編集し、簡易検証を行う。

## 完了条件

- 2ファイルだけが更新される。
- 指定された CI 行動と Playwright 行動が反映される。
- 主要な構文エラーがないことを簡易検証で確認する。

## リスク・未知事項

- GitHub Actions の式や YAML 構文を壊すと CI が動かない。
- Job 分割後に artifact の依存関係がずれる可能性がある。

## 判断ログ

- 2026-08-02: まず対象2ファイルの現状を確認し、run artifact を作成してから編集する方針にした。
