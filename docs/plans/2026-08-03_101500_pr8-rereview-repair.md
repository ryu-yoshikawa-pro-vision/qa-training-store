# PR #8 再レビュー指摘修正計画

## 0. 依頼概要

- 依頼内容: PR #8 再レビューで残った Android CI、Native Service、Reset、Cart、Maestro、iOS Workflow の指摘を最新コードへ反映する。
- 背景: GitHub Actions の最新 Native CI は Detect／Native Static／Production Bundle Guard が成功した一方、Android Job は既存Workflowの `sdkmanager: command not found` で停止し、最終Verifyも失敗している。
- 期待成果: 指摘されたコード・Workflow・テスト・証跡を修正し、実行していないGitHub Actions／実Native検証を成功扱いにしない。

## 1. ゴール / 完了条件

- ゴール: Android CIがRunner上のSDKを明示解決し、Automation Release APK、Emulator boot、Install、Metroなし起動、Maestro受入、最終Verifyへ進めるWorkflowに修正する。併せてNative公開型、Reset順序、Cart復旧／二重操作、iOS Release定義を修正する。
- 完了条件（DoD）:
  - SDK Rootを `ANDROID_SDK_ROOT`、`ANDROID_HOME`、標準Rootの順に解決し、sdkmanager実体を絶対Pathで使う。
  - `adb`／`emulator`／`avdmanager`をBuild前に検証し、Automation Release APKを検証する。
  - Android OS boot完了とpackage service準備をTimeout付きで待つ。
  - Detect Result、Native変更Output、Static／Production／Android ResultをFail-safeに最終Verifyする。
  - Native Runtimeが前半対応MethodだけをPresentationへ公開し、閲覧制限商品を`PERMISSION_DENIED`、不存在を`null`で返す。
  - ResetはSQLite commit後にKVを更新し、Seed失敗時にKV／Identity／Clock／Delayを変更しない。
  - Cartの再試行でErrorから復旧し、Mutation中は全明細のMutation Buttonを無効にする。
  - Maestro Screenshotを専用出力へ収集し、Restart／Dirty Reset／在庫／購入上限Flowを追加する。
  - iOS WorkflowをRelease Simulator Buildへ変更する。
  - ローカル静的検証を成功させ、GitHub Actions再実行が未実施なら未実施と記録する。

## 2. 現状理解と前提

- Current understanding:
  - PR #8 head `dcc8983857fd7a7db1481d1037cf28c9794f9991` の Native CI run `30775548618` は、Detect／Native Static／Production Bundle Guardがsuccess、Androidが`sdkmanager command not found`でfailure、`native-ci / verify`もfailureだった。
  - 現在の作業ツリーはPR headと一致しcleanであり、Workflowはsdkmanager PATH前提、Debug APK、`adb wait-for-device`のみ、全Repository画像収集、iOS Debug Buildの状態である。
  - `NativeTestControlService`は現状、KV削除をSQLite Seedより先に実行している。
  - `NativeApplicationServices`は`CatalogUseCases`／`CartUseCases`の完全なClass型を公開している。
  - `NativeCartScreen`はitem単位のbusy判定で、load／mutation開始時のError clearがない。
- Assumptions:
  - GitHubへのCommit／Push／PR更新、EAS Cloud Build／Submit、`android/`／`ios/`のCommitは行わない。
  - Phase 2後半の機能、Queue／Saga／Cross-store Transactionは追加しない。
  - 実GitHub Actions Runは修正をremoteへ反映しない限り検証できないため、ローカル静的検証とは分離して記録する。
- Non-goals:
  - Production Keystore／Apple Credentialの追加。
  - 新しいDevice Farm／E2E Frameworkの追加。
  - Web側の未関連機能の変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。添付指示で修正対象・禁止事項・完了境界が明確である。
- 仮定してよい細部: 既存Run `20260802-194908-JST`へ結果をappendし、今回の計画書は再レビュー専用に追加する。
- 未回答の重要質問: 修正後のGitHub Actions Runを実行するためのCommit／Push許可は、今回の禁止事項により未解決のまま外部Follow-upとする。

## 4. 影響範囲

- Impacted areas: `.github/workflows`、`src/bootstrap`、`src/application`、`src/infrastructure/database/sqlite`、`src/test-controls`、`src/presentation/native`、`tests`、`maestro`、Run Artifact。
- Files to inspect: 添付指示の対象ファイル、既存Native CI／iOS CI／Maestro／Component／Contract Test、ADR-0005、Phase 2計画、README、PROJECT_CONTEXT。

## 5. 変更方針

- Change strategy:
  1. GitHub実行の失敗根因をWorkflowへ最小差分で反映する。
  2. Native Runtimeの公開境界をFacade Interfaceと実オブジェクトの両方で限定する。
  3. DB commitとKV更新の順序、CartのError／busy stateをテスト可能な形で固定する。
  4. Maestro／iOS／Artifactの契約を実行順序と証跡範囲まで明示する。
  5. 静的検証後、GitHub Actions未実行を正直にRun Artifactへ記録する。
- 実行タスク:
  - [ ] 1. Android SDK／Release APK／Emulator boot／Detect／Verify／Artifactを修正する。
  - [ ] 2. Native Service／閲覧制限／Reset／Cartを修正しテストを追加する。
  - [ ] 3. Maestro Flow／iOS Release Workflow／Workflow契約テストを追加する。
  - [ ] 4. Format／Lint／Typecheck／Test／Buildと静的契約を検証する。
  - [ ] 5. 既存Run Artifactへ結果・残差・未実施項目を追記する。

## 6. 検証方法

- Validation plan:
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - 対象Unit／Component／Contract／Repository Test
  - `pnpm run test`
  - `pnpm run validate:native-production-bundle`
  - `pnpm run build:web`
  - 既存のNative Asset／Route／Security／EAS static／Web E2E回帰
  - GitHub Actionsの既存Run／Jobs／Logsをread-onlyで確認
- 成功判定:
  - コード／Workflow静的検証とローカル回帰が成功すること。
  - GitHub Actions Android／Verifyは、Push禁止のため実行結果が存在しない限り未実施とする。
  - Windows上のAndroid SDK／Emulator、macOS上のiOS Simulatorは実環境がなければ未実施とする。

## 7. リスクと未解決論点

- Risks:
  - Release APKのNative Bundle成立はRunner実行でのみ確認できる。
  - Maestro CLIのScreenshot出力PathとJUnit出力Pathを分けないと証跡が混ざるため、専用`--test-output-dir`を使用する。
  - Native Facadeを狭める変更がContract HarnessやPresentationの既存利用を壊す可能性があるため、Typecheckと対象テストを先に通す。
- Open questions:
  - 修正Workflowを含むCommitをremoteへ反映してGitHub Actionsを再実行できるかはユーザー判断が必要。
  - iOS手動Workflowの実行環境はmacOS Runner提供時に確認する。

## 8. 成果物

- 変更ファイル: Workflow、Native Application／Infrastructure／Presentation、Tests、Maestro、Run Artifact。
- 付随ドキュメント: 本計画書、既存Run `20260802-194908-JST`のPLAN／TASKS／REPORT／run.json／evaluation.jsonの追記・更新。

## 9. 備考

- GitHub read-only evidence: Native CI run `30775548618`、Android job `91570459824`、Verify job `91570596205`。
- Maestro `--test-output-dir`は公式CLI契約に基づき、Screenshot等を専用出力へ保存する。
