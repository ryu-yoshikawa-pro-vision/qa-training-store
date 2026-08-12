# Test Automation Curriculum / Training Environment再Baseline

## 変更概要

- Planning PR #18のWave 0〜10に対応するCurriculum／Training実装を、Current Normative Specificationへ接続した。
- Required Curriculum 22文書、Competency Rubric、Instructor Reference、CSV Workbook、Training Web / Native入口、Validator、CI Templateを追加・更新した。
- Formal RegressionとTraining Testを `e2e/web` / `maestro` と `training/`へ分離した。
- Required Phase 1 CIとNative CIへ、curriculum validation、Training Web baseline、Training Maestro baseline、`training/maestro/**` change detectionを接続した。

## 保証境界

- AndroidはBuild + Runtime E2E。
- iOSはADR-0011に従うBuild-only。iOS Runtime／Maestro PASSは教材完了条件にしない。
- Training Copyは完全なSource SHAとactive Workflow allowlistを検証し、Production Secret／OIDC／Deploy権限を持たない。

## 検証時点の留保

- Visual Android release markerが未確認のため、Emulator、ADB、APK install、MaestroはこのRunでは開始していない。
- Windows checkoutのCRLFとRepository indexのLF差により、全体 `format:check` はBaseline failureとして別記録する。変更ファイルは対象Prettierで整形し、他の静的検証は個別に実行する。

## 静的契約追補（2026-08-12）

- Android TrainingはAPI 34 / `google_apis` / `x86_64`、単一serial、package service ready、有限timeoutを要求し、Maestro 2.8.0は `maestro/bin/maestro` のversion check後に実行する契約へ固定した。
- Visual Android release marker未確認のため、上記契約の実Runtime実行とMaestro Evidence取得は引き続き保留である。

## Android local実行追補（2026-08-13）

- Release marker確認後、Windows localでは`maestro.bat`を明示serialへ渡すTraining runnerでbaselineを実行し、Formal Native Flowと分離した1/1 Evidenceを取得した。
- Windowsの長い依存pathは`C:/v/qts`と`virtual-store-dir-max-length=20`の短縮topologyで解消した。Repository root、他worktree、Formal Native基盤は変更していない。
