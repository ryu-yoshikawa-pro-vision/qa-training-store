# PR #133 Test Automation Curriculum 学習体験改善

## 変更理由

正本Plan `docs/plans/2026-09-08_161615_test-automation-curriculum-learning-experience.md` に従い、初学者向けの学習順序、既存Workbook、Playwright / Maestro演習、Failure分析、演習用CI、評価基準、仕様書導線の契約を同じ状態へ揃える。

## 判断と移行

- CommonはWeb中心で完了し、Nativeは選択式のspecializationとして既存Lesson番号のまま分岐・再joinする。
- P1-4より前は仕様・Role・状態・画面観察を中心にし、実装上のScenario Metadataは実装段階の照合へ置く。
- 既存4 CSVのスキーマを維持し、Cartの代表ケースを購入上限と購入不可明細へ分ける。実行行の`run_context`、`result`、`evidence`は状態契約として検証する。
- Playwrightの基準確認、受講者Exercise、恒久Failure、診断Failure、Maestro Exerciseを別の責務として扱う。Training WorkflowのPull Requestではbaseline後に受講者Exerciseを実行する。
- `docs/spec/README.md`では期待動作の読み始めを先に示し、仕様管理用語を後段へ置く。認証ScenarioとFixture pathの文書不整合はProduct codeを変更せず修正し、旧Capstoneは案内Aliasへ短縮する。

## CI品質ゲート修復（2026-09-09 19:45 JST）

- Push後のWeb CIで、公開済みカリキュラムのナビゲーションがP1-1開始・共通Reference後段の4グループになったことに対し、`e2e/web/smoke.spec.ts`のグループ期待値を同期した。これは公開ドキュメントの変更を検証する期待値の修復であり、製品挙動やBR / ACの意味は変更していない。
- Native StaticのExpo Doctorは、Training script追加によりNative変更検出が起動した結果、既存の`expo` 57.0.20 / `expo-router` 57.0.19をSDK 57の推奨57.0.21 / 57.0.20へ揃えるFAILを検出した。`package.json`と`pnpm-lock.yaml`を更新し、新規パッケージは追加していない。
- 変更後は`pnpm run verify`、`npx expo install --check --json`、`pnpm dlx expo-doctor@1.17.6 --verbose`（`npm_config_loglevel=error`でローカルnpm警告を抑制）、公開Smoke 4件を再確認した。Remote GitHub Actionsの再実行結果は修復commitのpush後に確認する。

## Native Runtime修復結果（2026-09-09 21:20 JST）

- 先行Remote run `34342343793`のAndroid Runtime / Maestroは、アプリのMainActivityとReact Native JSが起動・存続している一方、API 34 fresh AVDのPixel Launcher ANRダイアログが最初のMaestro assertionを覆ったためFAILした。
- 修復Iteration 2では`.github/workflows/native-ci.yml`にAPK起動前の`com.google.android.apps.nexuslauncher`停止を追加し、`tests/contracts/native-ci-workflow.test.ts`で配置と順序を固定した。Product Code、Maestro Flow、BR / ACの意味は変更していない。
- 修復後Mobile App CI run `34347593657`は、Native Static、Android Automation / Production Build、Production Bundle Guard、Android Runtime / Maestro、iOS Automation / Production Build、iOS Native CI Verify、`native-ci / verify`を全てPASSした。Android Runtimeでは追加ステップと全Maestro FlowがPASSした。対応するWeb CI run `34347593379`も全チェックPASSした。

## 対象外

Product Behavior、BR / ACの意味、Seed Scenario、`src/**`、Formal Regression、本番 / Preview CI、Native保証範囲、既存のAgentic QA基盤は変更しない。
