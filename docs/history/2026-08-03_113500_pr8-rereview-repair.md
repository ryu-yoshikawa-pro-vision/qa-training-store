# 2026-08-03 PR #8再レビュー修正履歴

## 背景

PR #8のNative CI run `30775548618`をread-onlyで確認した。Detect／Native Static／Production Bundle Guardは成功したが、Android Jobは既存Workflowの`sdkmanager: command not found`で失敗し、`native-ci / verify`も失敗していた。

## 修正

- Android SDK Rootを`ANDROID_SDK_ROOT`、`ANDROID_HOME`、標準Rootの優先順で解決し、cmdline-tools配下のsdkmanagerを絶対Pathで呼ぶWorkflowへ変更した。
- Android Buildを`assembleRelease`へ変更し、APK存在、Package、Process、OS boot、package serviceを確認するようにした。
- Native変更検知へ共有層／生成Asset／Production Guardを追加し、VerifyへDetect ResultとOutputのFail-safe検証を追加した。
- Native Application Serviceを前半対応MethodだけのFacadeへ限定し、Native閲覧制限商品のError契約を固定した。
- Test Control ResetのSQLite→KV順序、Seed失敗時のKV不変、成功時呼出順をテストした。
- Native CartのError再試行復旧と全Mutation Buttonのbusy無効化を実装・Component Test化した。
- Maestroの独立Flow、専用Screenshot出力、iOS Release Simulator Workflowを追加・補強した。

## 検証境界

- ローカル静的／Node／Jest検証は修正後に実行する。
- GitHub Actionsの修正後再実行はCommit／Push禁止のため未実施とする。
- Windows Android Emulator、macOS iOS Simulator、実`expo-sqlite`は環境不在のため未実施とする。
