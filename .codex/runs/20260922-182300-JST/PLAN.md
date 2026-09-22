# Plan（計画）

## 目的

- Issue #130の保存Planへ再レビュー6件を反映し、実装時に判断が分かれない責務境界と検証条件へ確定する。

## 対象範囲

- 保存Planと本Run Artifact
- Android build Reusable Workflow境界
- Production Bundle Guard境界
- visual profile step境界
- change detection / contract test / Remote CI検証条件

Native CI実装、Product code、PR作成、merge、Issue closeは対象外。

## 確定した修正

- Reusable Workflow inputを`build_kind`だけにする。
- Artifact名 / filename / Evidence名はcalled workflowで`build_kind`から一意に決定する。
- Automation / Production buildの現行非対称contractを表で固定し、今回統一しない。
- `native-android-build.yml`にworkflow-level `concurrency`を追加しない。
- Production Bundle GuardのAPK extractionは`android-ci-production-bundle-guard.sh`へ移し、既存validatorのCLI / policyは変更しない。
- `android_adb_root`はworkflowへ残し、visual profile helperはNormalize step本文だけを所有する。
- `native_changed=false`は静的contractで保証し、今回のPR Remote CIでは`native_changed=true`だけを実測する。

## 完了条件

- 上記6点が保存Planへ反映されている。
- 実装タスク、contract test、検証、完了条件、リスク記載が同じ方針へ同期している。
- 実装・PR作成へ進んでいない。
