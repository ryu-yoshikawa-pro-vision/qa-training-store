# クイックスタート

## 新規コンシューマーリポジトリへの導入

1. `template/` の内容を対象リポジトリのルートへコピーする。
2. `scripts/init-project.*` を実行し、`.codex/runs/`、`docs/adr/`、`docs/history/`、`docs/plans/`、`docs/reports/` などの初期ディレクトリを作成する。
3. `AGENTS.md` を確認する。
4. `docs/PROJECT_CONTEXT.md` を対象プロジェクトの内容に合わせて更新する。
5. `bash scripts/verify` または `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1` を実行し、最低限のセットアップが完了していることを確認する。
6. 初回のリクエストでは `scripts/new-run.sh` または `scripts/new-run.ps1` を実行し、`.codex/runs/<run_id>/` を初期化する。
   - 通常の直接実行（direct `codex`）による lightweight／standard Run はマニフェストなしとする。
   - Bash: `bash scripts/new-run.sh --task-type implementation --workflow-level standard --no-run-manifest`
   - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/new-run.ps1 -TaskType implementation -WorkflowLevel standard -NoRunManifest`
7. 計画系のタスクは `PLANS.md`、レビュー系のタスクは `CODE_REVIEW.md` から対応するスキルを参照する。
8. 軽微な修正のみであれば `lightweight`、通常の実装であれば `standard`、安全性・移行・公開契約に関わる変更であれば `strict` を選択する。

## 最初に編集する項目

- プロジェクトの目的
- ディレクトリ構造
- 品質ゲート
- 安全制約
- よく使う検証コマンド
- 外部通信や認証が必要な作業の扱い

## 既存コンシューマーリポジトリの更新

既存のリポジトリへテンプレートの更新を取り込む場合は、コンシューマー固有の情報を保持・保護することを最優先とする。詳細な手順は `docs/guides/consumer-update.md` を参照する。

1. 現在の `template/codex-project.toml` またはリポジトリ内のメタデータから `template_version` を確認する。
2. ソースリポジトリの `CHANGELOG.md` と `MIGRATION.md` を確認する。
3. コンシューマーリポジトリ側で更新用ブランチを作成する。
4. テンプレートの差分を一時ディレクトリへ同期し、内容を確認する。
5. `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`docs/plans/`、`docs/reports/`、`.codex/runs/` は機械的に上書きしない。
6. 必要なテンプレートの差分のみを反映する。
7. `bash scripts/verify` または PowerShell 版の verify スクリプトを実行する。
8. プルリクエスト（PR）で差分を確認し、プロジェクト固有の運用ルール、品質ゲート、安全制約が損なわれていないかをレビューする。

## モード選択の目安

| 作業内容 | 推奨モード |
| --- | --- |
| ドキュメント確認、PRレビュー、静的調査 | `readonly` または direct `codex` |
| 通常の対話型実装・ドキュメント更新 | リポジトリ内からの direct `codex` |
| ローカルブランチの削除、マージ／リベースのリカバリなどの明示的な例外作業 | `codex-safe safe` による都度（on-request）承認 |
| 影響の大きい GitHub CLI などのネットワーク例外 | `codex-safe safe`（承認およびネットワークサンドボックスへの昇格に関するランタイム確認が完了した場合のみ） |
| 非対話の strict 実装、機械管理されたエビデンス収集 | `codex-task --run-id <run_id> --record-run-manifest` |
| git add / commit / push | ファイル変更タスク（file-changing task）の Git ライフサイクル規約に従う（ユーザーによって Git 操作が禁止されていない場合） |
| 削除、rename、git rm | 原則として実行しない。明示的に指定された対象のみ、Safety／Git safety 規約に従って実行する |

通常の direct `codex` は、`workspace-write`、`approval_policy = "never"`、およびネットワークアクセスが有効（network access enabled）の状態で動作する。execpolicy の `prompt` オペレーションは、承認プロンプトを表示せずに自動で拒否される。`auto-net` は削除せず、必要に応じて明示的に指定する既存のラッパープリセットとして維持する。