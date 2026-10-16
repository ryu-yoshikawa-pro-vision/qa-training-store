# Consumer リポジトリ更新ガイド

既存の consumer リポジトリにテンプレートの更新を取り込む際は、consumer 固有の情報を保護することを最優先とします。`sync-template` は便利なツールですが、同期先ディレクトリ直下のファイルやディレクトリを丸ごと置き換える仕様であるため、使い方を誤るとプロジェクト固有のファイルを消失させてしまう恐れがあります。

## 原則

- 必ず更新用ブランチを作成してから作業を進める。
- 作業前にまず `CHANGELOG.md` と `MIGRATION.md` を確認する。
- `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`docs/plans/`、`docs/reports/`、`.codex/runs/` は機械的に上書きしない。
- source（テンプレート元）リポジトリ側で、事前に `plan-consumer-update` を実行する。
- 既存のリポジトリに直接同期する前に、必ず `--plan-only` またはドライラン（dry-run）を実行する。
- 不安がある場合は、一時ディレクトリに同期して差分を手動で反映する。

## 推奨フロー

1. consumer リポジトリ側で更新用ブランチを作成する。
2. 現在の `template_version` を確認する。
3. source リポジトリの `CHANGELOG.md` と `MIGRATION.md` を確認する。
4. source リポジトリで `tools/plan-consumer-update.*` を実行し、保護対象パス（protected path）と手動レビューが必要な箇所を確認する。
5. 一時ディレクトリへ同期するか、`sync-template --exclude-protected` による上書き同期（overlay sync）を選択する。
6. consumer 固有のファイルを除外しながら差分を確認する。
7. 必要なテンプレートの差分のみを consumer リポジトリへ反映する。
8. `bash scripts/verify` または PowerShell 版の verify を実行する。
9. 必要に応じて `cleanup-runs` をドライラン（dry-run）で実行し、過去の実行で生成された成果物（generated run artifact）の整理候補を確認する。
10. プルリクエスト（PR）を作成し、差分をレビューする。

## 更新計画の出力

Bash:

```bash
/path/to/codex-templates/tools/plan-consumer-update.sh /path/to/consumer-repo
/path/to/codex-templates/tools/plan-consumer-update.sh --json /path/to/consumer-repo
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\plan-consumer-update.ps1 -Destination path\to\consumer-repo
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\plan-consumer-update.ps1 -Destination path\to\consumer-repo -Json
```

出力結果では以下の項目を確認します。

- source / consumer それぞれの `template_version`
- 保護対象パス（protected path）
- 更新候補
- 手動レビューが必要な項目
- 推奨される同期・検証コマンド（sync / verify command）

## 一時ディレクトリへの同期例

一時ディレクトリへ同期する場合も、既存ディレクトリを削除して再作成するのではなく、毎回ユニークな未作成のディレクトリパスを使用します。これにより、`--force` / `-Force` や削除コマンドを使わずに安全に差分を確認できます。

Bash:

```bash
target="${TMPDIR:-/tmp}/codex-template-next-$(date +%Y%m%d%H%M%S)"
/path/to/codex-templates/tools/sync-template.sh "$target"
echo "Synced template to: $target"
```

PowerShell:

```powershell
$target = Join-Path $env:TEMP ("codex-template-next-" + [guid]::NewGuid().ToString())
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\sync-template.ps1 -Destination $target
Write-Host "Synced template to: $target"
```

## 直接同期する場合

既存のリポジトリに直接同期する場合は、まずドライラン（dry-run）を実行して削除対象を確認します。

Bash:

```bash
/path/to/codex-templates/tools/sync-template.sh --plan-only --exclude-protected --force /path/to/consumer-repo
/path/to/codex-templates/tools/sync-template.sh --dry-run --force /path/to/consumer-repo
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\sync-template.ps1 -Destination path\to\consumer-repo -Force -PlanOnly -ExcludeProtected
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\sync-template.ps1 -Destination path\to\consumer-repo -Force -DryRun
```

保護対象パス（protected path）を残したまま上書き同期（overlay sync）を行う場合:

Bash:

```bash
/path/to/codex-templates/tools/sync-template.sh --exclude-protected --force /path/to/consumer-repo
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\sync-template.ps1 -Destination path\to\consumer-repo -Force -ExcludeProtected
```

破壊的変更を伴う上書き（destructive overwrite）を行う場合は、削除対象が想定通りであることを確認した上で、必ず明示的な確認フラグを付与して実行します。

Bash:

```bash
/path/to/codex-templates/tools/sync-template.sh --force --confirm-destructive-overwrite /path/to/consumer-repo
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File path\to\codex-templates\tools\sync-template.ps1 -Destination path\to\consumer-repo -Force -ConfirmDestructiveOverwrite
```

## 上書きしない対象

| パス | 理由 |
| --- | --- |
| `docs/PROJECT_CONTEXT.md` | プロジェクト固有の文脈・背景情報が含まれるため |
| `docs/adr/` | consumer リポジトリ固有の設計判断履歴（ADR）であるため |
| `docs/plans/` | consumer リポジトリ固有の計画履歴であるため |
| `docs/reports/` | consumer リポジトリ固有の調査・検証履歴であるため |
| `.codex/runs/` | 過去の実行ログや作業履歴であるため |
| `docs/history/` | consumer リポジトリ固有の変更履歴であるため |
| 認証情報や環境設定 | テンプレートの管理対象外であるため |

## レビュー観点

- `AGENTS.md` に記載された安全制約が、consumer リポジトリの実態と矛盾していないか。
- `scripts/verify` が consumer リポジトリ上で問題なく実行できるか。
- `plan-consumer-update` が提示した保護対象パス（protected path）および手動レビュー項目が妥当か。
- `sync-template --exclude-protected` の実行によって、consumer 固有のパスが確実に保持されているか。
- `.codex/config.toml` の sandbox / approval / network 設定が意図通りになっているか。
- consumer 固有のファイルが誤って削除・上書きされていないか。
- `template_version` の値と `CHANGELOG.md` の記載内容が一致しているか。

## ロールバック手順

更新後に問題が発生した場合は、consumer リポジトリ側で作成した更新用 PR をクローズするか、更新用ブランチを破棄します。既存の main ブランチへ直接同期しない運用を徹底しておけば、ロールバックはブランチの削除だけで安全に完了します。