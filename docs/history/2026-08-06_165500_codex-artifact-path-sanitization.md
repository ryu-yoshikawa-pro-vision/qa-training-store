# Codex Run ArtifactのローカルPath Sanitization実装

日付: 2026-08-06（JST）

## 変更理由

Repositoryへ保存するRun Artifactに、個人PC固有のユーザー名やローカル絶対Pathが残る可能性があったため、記録生成時と完了時の両方で検査できる運用へ変更した。

## 実施内容

- Context／Path Variant／再帰 Value／Residual検査を共有PowerShell実装へ集約した。
- `scripts/sanitize-codex-artifacts.ps1` にWrite／Check CLI、UTF-8 no BOM、同一Directory内のAtomic置換を追加した。
- `scripts/codex-task.ps1` のLog／Report／Manifest／Evaluation書込み前処理と、成功・失敗を問わないRun終了ゲートへ接続した。
- PowerShell Fixture Test、Vitest Contract Test、CIのFixture／変更Run Artifact Checkを追加した。
- `AGENTS.md`、Repair Loop文書、Project Context、ADRへ運用契約を記録した。

## 運用判断

- 過去Runは履歴を保つため自動Writeせず、Check-onlyで残存状況を確認する。
- Binaryと許可拡張子以外は変更対象にしない。
- Secret RedactionはPath Sanitizationと別責務として扱う。

## 検証

- 共通Fixtureは20契約、Vitest Contractは7契約を検証する。
- 実行ログ、最終Check結果、過去Runの残存件数は今回RunのREPORTへ追記する。
