# Training Workflowのテンプレート

このディレクトリは、Production RepositoryのWorkflowを直接有効化する場所ではありません。`scripts/training/prepare-training-copy.ts` が完全なSource SHAからDisposable / training-only Copyを作り、`.github/workflows/`を次の2ファイルだけへ置き換えるときに使用します。

- `training-ci.yml`: Web baseline、Pull Request時の受講者Exercise（Receipt付き）、および講師が明示するchecked expected-failure entry。
- `training-native-ci.yml`: モバイルアプリ自動化の選択課程向けのWorkflowで、対象path変更またはmanual dispatch時にAndroid API 34 Emulator上のbaseline→exerciseを実行します。

`training-native-ci.yml`のEmulatorはGitHub Native CI専用のCanonical経路です。Windows Local Fresh Learner / Part 1 NativeのCanonicalは、`scripts/native/windows/android-local.ps1`で明示serialを指定するPhysical Android Device経路です。

ソースリポジトリの`training/github-actions/*.yml`はリポジトリ管理のtemplate / Referenceです。Training Copyでは、生成された`.github/workflows/*.yml`が有効なworkflowになります。Common-onlyのPRではNative Training workflowは自動起動しません。`workflow_dispatch`で手動起動できる環境でも、Nativeの手動RunはCommon完了に不要です。

`training-ci.yml`のPull Request用Exerciseは、CI Runner上のCheckout済みRepository rootを`--root .`として使い、`training:web:exercise:with-receipt`、Receipt、PlaywrightのReport／Screenshot／Trace／Videoを実行結果としてArtifactへ保存します。UploadされるArtifact名は`training-web-<run_id>-<run_attempt>`で、主な保存Pathは`output/training/playwright`、`receipts`、`evidence`です。これはローカルの`handoff-root/`へ自動的に戻るものではありません。受講者は`PR → Checks → Scenario Shop Training Web → Run Summary → Artifacts`の順でGitHubのRun／Check／Artifactを確認し、確認内容を自分のEvidenceへ記録します。

両Workflowは `permissions: contents: read`、GitHub-hosted runner、Secretなし、Environmentなし、OIDCなし、Deployなしを守ります。Source RepositoryのFormal Phase 1 / Native / iOS / Deploy Workflowをこのディレクトリから直接実行しません。
