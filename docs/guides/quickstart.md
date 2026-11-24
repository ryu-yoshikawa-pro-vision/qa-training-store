# クイックスタート

## 新規コンシューマーリポジトリへの導入

1. `template/` の内容を対象リポジトリのルートへコピーする。
2. `scripts/init-project.*` を実行し、`runs/`、`docs/adr/`、`docs/history/`、`docs/plans/`、`docs/reports/` などの初期ディレクトリを作成する。既存の`.codex/runs/`はpreserved legacy/historyとして残す。
3. `AGENTS.md` を確認する。
4. `docs/PROJECT_CONTEXT.md` を対象プロジェクトの内容に合わせて更新する。
5. `bash scripts/verify` または `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1` を実行し、最低限のセットアップが完了していることを確認する。
6. 初回のリクエストでは `scripts/new-run.sh` または `scripts/new-run.ps1` を実行し、`runs/<run_id>/` を初期化する。
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
5. `docs/PROJECT_CONTEXT.md`、`docs/adr/`、`docs/plans/`、`docs/reports/`、`runs/`、`.codex/runs/` は機械的に上書きしない。
6. 必要なテンプレートの差分のみを反映する。
7. `bash scripts/verify` または PowerShell 版の verify スクリプトを実行する。
8. プルリクエスト（PR）で差分を確認し、プロジェクト固有の運用ルール、品質ゲート、安全制約が損なわれていないかをレビューする。

## モード選択の目安

| 作業内容 | 推奨モード |
| --- | --- |
| ドキュメント確認、PRレビュー、静的調査 | direct `codex`（必要に応じてread-only agentへ委任） |
| 通常の対話型実装・ドキュメント更新 | リポジトリ内からの direct `codex` |
| strict Run、機械管理されたエビデンス収集 | direct `codex` と既存Run collectorの明示実行 |
| git add / commit / push | ファイル変更タスク（file-changing task）の Git ライフサイクル規約に従う（ユーザーによって Git 操作が禁止されていない場合） |
| 削除、rename、git rm | 原則として実行しない。明示的に指定された対象のみ、Safety／Git safety 規約に従って実行する |

通常はリポジトリのルートから `codex` を直接起動します。具体的なshellやhostの運用は各consumerのポリシーに従ってください。`.codex/config.toml` は `workspace-write`、`approval_policy = "on-request"`、network access enabledを宣言します。承認要求経路が使えるかは実効runtimeに依存し、承認されてもsandbox、Hook、execpolicy等の拒否を上書きしません。project config/rulesはproject trust条件を満たす場合に読み込まれ、非managed環境ではHook定義もtrustが必要です。設定済みPreToolUse matcherはBashだけを対象とし、`apply_patch`やMCP toolには適用されません。
