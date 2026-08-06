# PR #8 Native CI再失敗・残存指摘 修正計画

## 1. Goal

Run `30780990538`で確認された`Verify Android toolchain`失敗とEvidence収集の停止を解消し、現行HEADに未反映のNative UI／Runtime／境界検証をPhase 2前半の範囲で修正する。実装・ローカル検証までを行い、GitHubへのPush後に実Runで確認すべき事項を分離して記録する。

## 2. Current understanding

- PR #8の最新HEADとローカルHEADは`ebf7c452baf66141c41905b536607d9f530b6527`で一致している。
- Run `30780990538`ではSDK解決とSDK component installは成功した。
- `Verify Android toolchain`は`adb`／`avdmanager`成功後、`emulator -version`が`libpulse.so.0`不足で終了コード127となって失敗した。
- `Collect Android evidence`は接続先のない`adb logcat -d`を無期限に実行し、約39分後にRunner shutdownで終了した。
- 現行Workflowは一括Verify、PATH依存、35分Job、APK Path重複、Gradle Log未保存、Evidence timeout未設定である。
- Product DetailはVariation未選択を在庫0として表示し、Out-of-stock Variationを選択できない。Runtime Providerには失敗後の画面再試行がない。
- `android/`と`ios/`はRepository成果物にせず、EAS Cloud Build／Commit／Push／PR更新は行わない。

## 3. Assumptions

- `libpulse0`はUbuntu hosted runnerでAndroid Emulatorの依存を満たす最小追加パッケージとしてWorkflow内で導入する。
- `emulator -version`は診断Stepとして終了Codeと出力を保存し、実行ファイルの存在／実行権限はSDK Path Verifyで判定し、最終的な利用可否はEmulator起動Stepで判定する。
- Out-of-stock Variationは「選択」は可能にし、「カート追加」は無効のままにする。Low-stock／Purchase-limitの上限表示は同じCart UI契約を再利用する。
- Providerの再試行は単一の初期化Promiseとin-flight guardで制御し、既存のRuntime Service Surfaceを拡張しない。

## 4. Non-goals

- EAS Cloud Build／EAS Workflow／Submit、Store公開設定、Production Credentialの追加。
- `android/`／`ios/`の正本化、生成Native Projectの直接編集、Git commit／push／PR本文更新。
- Phase 2後半のLogin／Checkout／Payment／Order／Review、購入完了フロー、独自CI Framework／Device Farm。
- 実GitHub Actions再実行、Android Emulator／iOS Simulator／実expo-sqliteの成功証跡。これらはPushまたは環境提供後の受入項目として残す。

## 5. Impacted areas

- Android Native CI WorkflowとWorkflow Contract Test
- Native Product／Cart Presentation、Variation選択補助、Maestro Flow
- Native Runtime Bootstrap／Provider／Shell
- Native Component／Contract／Unit Test
- 既存Run Artifact、計画・履歴・PROJECT_CONTEXTの実態記録

## 6. Files to inspect

- `.github/workflows/native-ci.yml`
- `src/bootstrap/native-runtime.ts`
- `src/presentation/native/native-runtime-provider.tsx`
- `src/presentation/native/native-shell.tsx`
- `src/presentation/native/native-screens.tsx`
- `src/presentation/native/native-variation-selection.ts`
- `tests/component/native/**`
- `tests/contracts/native-ci-workflow.test.ts`
- `maestro/native-out-of-stock.yaml`
- `maestro/native-low-stock.yaml`
- `maestro/native-purchase-limit.yaml`
- `.codex/runs/20260802-194908-JST/**`

## 7. Change strategy

1. Android WorkflowのSDK解決Stepで`ADB`／`EMULATOR`／`AVDMANAGER`／`APK_PATH`を絶対Pathとして解決し、`GITHUB_ENV`へ保存する。
2. SDK Path、adb、avdmanager、emulator診断を個別Stepへ分割し、後続のAVD／Emulator／ADB／APK／Artifact処理を絶対Pathへ統一する。Emulator依存を導入し、Release APK Buildのpipefail＋tee、Evidence timeout＋Device分岐を追加する。
3. Product Detailで未選択・在庫0・在庫ありを分離し、Out-of-stock Variationの選択とAdd disabledをComponent Testで固定する。Cartの上限到達案内とdisabledを既存の`maximumQuantity`から導出し、Maestro Flowで数量不変を確認する。
4. Runtime初期化失敗時にキャッシュPromiseを解除し、Provider／Shellに同時初期化を防ぐ再試行UIを追加する。初回失敗→再試行成功をComponent Testで固定する。
5. Workflow／Native UI／RuntimeのContract・Component・Unit Test、Format／Lint／Typecheck／全Test／Web回帰を実行する。
6. Run ArtifactへRun `30780990538`の成功／失敗／未実施を追記し、修正後GitHub Run未取得を残す。

## 8. Validation plan

- `pnpm install --frozen-lockfile`
- `pnpm run format`／`pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- 対象Native Component／Contract／Unit Test、続いて`pnpm run test`
- `pnpm run generate:native-assets`＋生成差分確認、Manifest／Security／Route／EAS static／Production Bundle Guard
- `pnpm run build:web`、Chromium E2E、A11y、Mobile boundary、`expo-doctor@1.17.6`
- `git diff --check`
- 実Native／修正後GitHub Actionsは未実施として報告し、成功扱いにしない。

## 9. Risks

- Hosted runnerのEmulator依存パッケージ名やHeadless Warning差異により、実Runで別の起動障害が残る可能性がある。診断ログと実起動判定を分離する。
- Out-of-stock Variationを選択可能にすると、Add経路が誤って有効になるリスクがあるため、選択可否とAdd可否を別関数／別Assertionで固定する。
- Providerの再試行で既存Routeのloading/error表示が競合する可能性があるため、ShellのRuntime errorを優先表示し、in-flight中の再実行を拒否する。
- Run Artifactの過去記録は上書きせず、既存Runへ追記する。

## 10. Open questions

- なし。添付指示のPhase 2前半、ローカル検証、外部未実施の境界をそのまま採用する。

## 11. Follow-up notes

- ユーザーが修正をPushした後、Runの`Verify Android SDK paths`、`Verify adb`、`Verify avdmanager`、`Inspect emulator binary`、Release APK、Emulator、Maestro各Flow、Evidence Artifact、`native-ci / verify`を確認する。
- `libpulse0`追加後もEmulator起動が失敗する場合は、実Runの新しいログを根拠に次のrepair iterationを開始し、同じ原因の盲目的再試行はしない。
