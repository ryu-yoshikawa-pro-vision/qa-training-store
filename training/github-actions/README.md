# Training Workflow Template

このディレクトリは、Production RepositoryのWorkflowを直接有効化する場所ではありません。`scripts/training/prepare-training-copy.ts` が完全なSource SHAからDisposable / training-only Copyを作り、`.github/workflows/`を次の2ファイルだけへ置き換えるときに使用します。

- `training-ci.yml`: Web baselineと、Instructorが明示するchecked expected-failure entry。
- `training-native-ci.yml`: Native specialization向けのWorkflowで、対象path変更またはmanual dispatch時にAndroid API 34 Emulator上のbaseline→exerciseを実行します。

`training-native-ci.yml`のEmulatorはGitHub Native CI専用のCanonical経路です。Windows Local Fresh Learner / Part 1 NativeのCanonicalは、`scripts/native/windows/android-local.ps1`で明示serialを指定するPhysical Android Device経路です。

Source Repositoryの`training/github-actions/*.yml`はrepository-owned template / Referenceです。Training Copyでは、生成された`.github/workflows/*.yml`がactive workflowになります。Common-only変更ではNative Training workflowは起動しません。

両Workflowは `permissions: contents: read`、GitHub-hosted runner、Secretなし、Environmentなし、OIDCなし、Deployなしを守ります。Source RepositoryのFormal Phase 1 / Native / iOS / Deploy Workflowをこのディレクトリから直接実行しません。
