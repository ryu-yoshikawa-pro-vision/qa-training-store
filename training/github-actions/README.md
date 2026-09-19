# Training Workflowのテンプレート

このディレクトリは、Production RepositoryのWorkflowを直接有効化する場所ではありません。`scripts/training/prepare-training-copy.ts` が完全なSource SHAからDisposable / training-only Copyを作り、`.github/workflows/`を次の2ファイルだけへ置き換えるときに使用します。

- `training-ci.yml`: Web baseline、Pull Request時の受講者Exercise（Receipt付き）、および受講者が`workflow_dispatch`で選択するexpected-failure entry。
- `training-native-ci.yml`: モバイルアプリ自動化の選択課程向けのWorkflowで、対象path変更またはmanual dispatch時にAndroid API 34 Emulator上のbaseline→exerciseを実行します。

`training-native-ci.yml`のEmulatorはGitHub Native CI専用のCanonical経路です。Windows Local Fresh Learner / Part 1 NativeのCanonicalは、`scripts/native/windows/android-local.ps1`で明示serialを指定するPhysical Android Device経路です。

ソースリポジトリの`training/github-actions/*.yml`はリポジトリ管理のtemplate / Referenceです。Training Copyでは、生成された`.github/workflows/*.yml`が有効なworkflowになります。Common-onlyのPRではNative Training workflowは自動起動しません。`workflow_dispatch`で手動起動できる環境でも、Nativeの手動RunはCommon完了に不要です。

`training-ci.yml`のPull Request用Exerciseは、CI Runner上のCheckout済みRepository rootを`--root .`として使い、`training:web:exercise:with-receipt`、Receipt、PlaywrightのReport／Screenshot／Trace／Videoを実行結果としてArtifactへ保存します。UploadされるArtifact名は`training-web-<run_id>-<run_attempt>`で、主な保存Pathは`output/training/playwright`、`receipts`、`evidence`です。これはローカルの`handoff-root/`へ自動的に戻るものではありません。受講者は`PR → Checks → Scenario Shop Training Web → Run Summary → Artifacts`の順でGitHubのRun／Check／Artifactを確認し、確認内容を自分のEvidenceへ記録します。

確認後は、対象Artifactをダウンロードして展開し、選択したCI Execution Receiptを`<handoff-root>/receipts/`へコピーします。Receiptが参照する同じ相対Pathの`evidence/`配下（`report.json`、`run.log`、PlaywrightのReport／Trace／Screenshot／Videoを含む）も、同じRunのものを`<handoff-root>/evidence/`へコピーします。Local Receiptを上書きしたり、Receiptを手入力で作ったりせず、`run.ci.github_run_id`、`run.ci.github_run_attempt`、`run.ci.artifact_name`、`run.ci.workflow`、`run.ci.job`、`run.ci_sha`、`run.submission_sha`、`run.training_copy_source_sha`、`run.execution_sha`をRun／Check／Artifactと照合します。GitHub画面で確認したRun／Check／Artifact／Case／結果は、別の人間可読Evidenceとして`<handoff-root>/evidence/`へ記録します。`04_execution-improvement.csv`では既存の`ci-exercise`などのContextを使い、CI Receiptと人間Evidenceを対応付けます。

Failure Artifactを学ぶときは、GitHubの`Actions`から`Scenario Shop Training Web`を開き、`Run workflow`で`mode = expected-failure`を自分で選んで実行します。意図したFailure、Run Summary、`training-web-<run_id>-<run_attempt>` Artifact、Trace／Screenshot／Video／HTML Reportを順に確認し、原因を人間可読Evidenceへ記録します。`training:web:check-expected-failure`はCI前やローカルのEvidence構造確認を行う補助入口であり、このCI Artifact学習の代わりにはしません。

両Workflowは `permissions: contents: read`、GitHub-hosted runner、Secretなし、Environmentなし、OIDCなし、Deployなしを守ります。Source RepositoryのFormal Phase 1 / Native / iOS / Deploy Workflowをこのディレクトリから直接実行しません。
