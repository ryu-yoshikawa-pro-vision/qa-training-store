# 訓練用ワークフロー（Training Workflow）のテンプレート

このディレクトリは、本番リポジトリ（Production Repository）のワークフローを直接有効化するための場所ではありません。`scripts/training/prepare-training-copy.ts` が、完全なソースコミット（Source SHA）から使い捨ての訓練専用コピー（Disposable / training-only Copy）を作成し、`.github/workflows/` 配下を次の2つのファイルのみに置き換える際に使用します。

- `training-ci.yml`: Webのベースライン検証、プルリクエスト時の受講者用演習（Exercise、実行レシート付き）、および受講者が手動実行（`workflow_dispatch`）で選択する意図的失敗（expected-failure）エントリ。
- `training-native-ci.yml`: モバイルアプリ自動化の選択課程向けワークフロー。対象パスの変更時または手動実行（manual dispatch）時に、Android API 34 エミュレータ上で「ベースライン（baseline）→演習（exercise）」を実行します。

`training-native-ci.yml` で使用されるエミュレータは、GitHub Native CI専用の標準（Canonical）実行経路です。一方、Windowsローカル環境の新規受講者（Local Fresh Learner）や Part 1 Native における標準手順は、`scripts/native/windows/android-local.ps1` でシリアル番号（serial）を明示して接続する実機（Physical Android Device）経路となります。

ソースリポジトリ内の `training/github-actions/*.yml` は、リポジトリ管理用のテンプレートおよび参照用ファイル（template / Reference）です。訓練用コピー（Training Copy）では、生成された `.github/workflows/*.yml` が実際に有効なワークフローとして機能します。共通課題のみ（Common-only）のプルリクエストでは、Native Training ワークフローは自動起動しません。また、`workflow_dispatch` により手動実行できる環境であっても、共通課題の修了判定に Native ワークフローの手動実行は不要です。

`training-ci.yml` のプルリクエスト用演習（Exercise）では、CIランナー上でチェックアウトされたリポジトリルートを `--root .` として指定して実行します。その結果として、`training:web:exercise:with-receipt` の実行結果、実行レシート（Receipt）、およびPlaywrightのレポート、スクリーンショット、トレース、動画（Report／Screenshot／Trace／Video）がアーティファクト（Artifact）に保存されます。アップロードされるアーティファクト名は `training-web-<run_id>-<run_attempt>` で、主な保存パスは `output/training/playwright`、`receipts`、`evidence` です。
これらの成果物は、ローカル環境の `handoff-root/` へ自動的に同期・取得されるものではありません。受講者は `PR → Checks → Scenario Shop Training Web → Run Summary → Artifacts` の順にGitHub画面をたどって実行ログや成果物（Run／Check／Artifact）を確認し、その内容を自身のエビデンス（Evidence）へ記録してください。

確認後は、対象のアーティファクトをダウンロードして展開し、採用するCI実行レシート（CI Execution Receipt）を `<handoff-root>/receipts/` にコピーします。あわせて、レシートが参照する同一相対パスの `evidence/` 配下のファイル（`report.json`、`run.log`、Playwrightの各種レポート／トレース／スクリーンショット／動画を含む）についても、同じ実行回（Run）のものを `<handoff-root>/evidence/` へコピーしてください。
その際、ローカルのレシートを上書きしたり手作業で作成したりせず、`run.ci.github_run_id`、`run.ci.github_run_attempt`、`run.ci.artifact_name`、`run.ci.workflow`、`run.ci.job`、`run.ci_sha`、`run.submission_sha`、`run.training_copy_source_sha`、`run.execution_sha` の各値を、GitHub上のRun／Check／Artifactと突き合わせて検証します。GitHub画面で確認した実行情報（Run／Check／Artifact／Case／結果）は、人間が閲覧可能なエビデンス（人間可読Evidence）として別途 `<handoff-root>/evidence/` 配下に記録してください。なお、`04_execution-improvement.csv` では既存の `ci-exercise` などのコンテキスト（Context）値を使用し、CI実行レシートと人間可読エビデンスを正しく対応付けます。

失敗時のアーティファクト（Failure Artifact）の分析を学習する際は、GitHubの `Actions` タブから `Scenario Shop Training Web` を開き、`Run workflow` で `mode = expected-failure` を選択して手動実行します。発生した意図的な失敗内容、実行サマリー（Run Summary）、生成された `training-web-<run_id>-<run_attempt>` アーティファクト、ならびにトレース／スクリーンショット／動画／HTMLレポートを順次確認し、その原因を人間可読エビデンスに記録してください。なお、`training:web:check-expected-failure` はCI実行前やローカルでのエビデンス構造確認に用いる補助的なコマンドであり、このCIアーティファクト調査学習の代替とするものではありません。

いずれのワークフローも、`permissions: contents: read` の権限設定、GitHubホステッドランナー（GitHub-hosted runner）の利用を前提とし、Secret・Environment・OIDC・デプロイ処理を一切含まない構成を遵守します。ソースリポジトリに定義されている本番・正式なワークフロー（Formal Phase 1 / Native / iOS / Deploy Workflow）を、本ディレクトリから直接実行することはありません。
