# 計画

## 目的
- Codex Run Artifactへ保存されるローカル絶対Pathを、共通のContext／Variant／Residual検査で安定Tokenへ変換する。
- `codex-task.ps1`のJSON／JSONL書込みとRun終了時の最終Write+Check、CIの変更Artifact Checkを実装する。

## 対象範囲

- 対象:
  - `scripts/lib/codex-artifact-sanitizer.ps1` の正本実装
  - `scripts/sanitize-codex-artifacts.ps1` のWrite／Check CLI
  - `scripts/codex-task.ps1` の再帰サニタイズと終了時最終ゲート
  - PowerShell Fixture Test、Vitest Contract Test、既存CIへの品質ゲート追加
  - AGENTS／Repair Loop／Project Context／ADRと今回Run Artifactの更新
- 対象外:
  - Secret／Credential／Cookie／Token／メールアドレス／Device Serialの汎用Redaction
  - 過去Run Artifactの一括書き換え
  - Bash wrapperの同等実装（今回の指定対象外）
  - Commit／Push／PR更新／Remote CI実行

## 前提
- 標準対象拡張子は`.md`、`.json`、`.jsonl`、`.txt`とし、バイナリは読まない。
- Repository RootはGitの`rev-parse --show-toplevel`を正本とし、現在のRoot Aliasと明示Aliasを同一Tokenへ統一する。
- 既存の変更はユーザー変更として保持し、今回RunだけをWrite対象にする。

## 不明点
- 必ず質問する不透明点: なし。ユーザー指示に実装契約と完了条件が定義されている。
- 仮定してよい細部: PowerShell 5.1／pwsh双方で動くよう、BOMなしUTF-8と標準.NET APIを使う。
- 未回答の重要質問: Remote CIの実行結果は、Push禁止のため未確認として残す。

## 仮説
- H1: 現在の主な漏えい経路は`Write-TaskLog`／`Write-TaskReport`／`Write-RunManifest`のJSON化前の絶対Path値である。
- H2: JSONをParse・再出力する最終処理ではなく、UTF-8テキスト置換を正本にすればキー順・改行・JSONL構造を維持できる。
- H3: Contextを一度構築し、長いVariantから置換すれば、Repository／Temp／User Homeの包含関係とJunction Aliasを安定して扱える。

## 調査計画

- 第1回の調査: 既存PowerShell wrapperの書込み経路、Run schema、Contract Test方式、CI workflowを確認する。
- 第2回の調査: Fixture TestでPath Variant／JSON構造／Encoding／Residual／Idempotenceを実証する。
- 終了条件:
  - H1〜H3をコードとテストで支持する根拠がある。
  - 今回RunのWrite+Checkが成功し、過去Runは検査結果のみ報告される。

## 方針
- `repair-loop` skillに従い、allowed_filesを先に固定し、実装→Fixture／Contract→Format／Lint／Typecheck／既存Contract→Run最終サニタイズのbounded iterationで進める。
- パス置換は共通スクリプトへ集約し、CLIと`codex-task.ps1`は同じ関数をdot-sourceする。
- CIはWriteを行わず、Fixture Testと変更された`.codex/runs/**`のCheckだけを実行する。

## 完了条件
- 共通Sanitizer、CLI、`codex-task.ps1`統合、Fixture／Contract Test、CIゲート、運用文書が実装される。
- UTF-8 BOMなし、改行維持、Atomic Write、Idempotence、JSON／JSONL parse、Fail Closedを確認できる。
- 今回Runの`-Write -Check`成功、過去Runの一括変更なし、Git status／diff checkを報告できる。

## リスク／未確定事項
- Junctionの物理Root解決は環境差があるため、Git Root・現在Root・明示Aliasをすべて登録し、Fixtureでは明示Aliasで固定する。
- `pnpm config get`やMaestro実体が無い環境では、取得できた値だけを登録して処理を継続する。
- 既存Runには個人Pathが残っている可能性があり、今回のCheckで件数を計測するが無断修正しない。

## 判断ログ
- 2026-08-06 16:24 JST: ユーザー指定によりrepair用の新規Runを初期化。過去Runは一括書換えせず、今回Runのみ最終Write+Checkの対象とする。
- 2026-08-06 16:25 JST: `Write-TaskLog`／`Write-TaskReport`はPayload全体をJSON化前に処理し、`Write-RunManifest`とRun終了時CLIで二重防御する方針を採用。
- 2026-08-06 16:25 JST: 置換ロジックは`scripts/lib/codex-artifact-sanitizer.ps1`だけに置き、CLI／wrapper／Fixture Testから再利用する。
