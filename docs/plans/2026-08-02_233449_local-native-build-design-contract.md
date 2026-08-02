# Build方針変更・Native視覚契約計画

## 0. 依頼概要

- 依頼内容: EAS Cloud Buildを主経路から外し、Windows／MacのローカルNative Buildを正式経路としてPhase 2前半の計画・文書・検証契約を更新する。あわせて、WebのDesign Token・情報階層をNative UIへ接続し、視覚契約を検証可能にする。
- 背景: 既存RunはEASを使用しない方針で停止していたが、今回の承認により、EASは将来利用可能な静的成果物だけを整備し、ローカルBuild／端末・Simulator検証を完了条件として扱える。
- 期待成果: ローカルBuild手順とEvidence項目、EAS静的設定、Native共通Token／Primitive、Web比較用Screenshot／契約Test、実Native環境再開条件が一貫する。

## 1. ゴール / 完了条件

- ゴール: Phase 2前半のローカルNative Buildを正式主経路として実行可能なRepository契約にし、Native UIが既存WebのColor／Spacing／Radius／Typography／情報階層を継承する。
- 完了条件（DoD）:
  - `eas.json`と`.eas/workflows/phase2-native-foundation.yml`が静的検証可能で、EAS Cloud実行を完了条件にしない。
  - README、PROJECT_CONTEXT、Run Artifact、計画書がローカルBuildを標準手順として説明する。
  - Native UIが`src/presentation/design/tokens.ts`を経由して共有Color／Spacing／Radius／Typographyを使用し、44px以上のTouch Targetを満たす。
  - Home、商品一覧、商品詳細、CartのNative共通PrimitiveとStable Test IDが再利用される。
  - Web 390×844（必要に応じて320×700）の視覚確認／Screenshotを取得し、Native比較は実環境がある場合のみPASSにする。
  - 既存Node／Web／Native Jest／静的検証が回帰しない。
  - Android／iOS実Native Buildが環境提供後に再開できる手順とEvidence項目が残る。

## 2. 現状理解と前提

- Current understanding:
  - NativeのGuest Storefront／Cart、Customer-only SQLite、KV、PBKDF2、Test Control、CNG構成は実装済み。
  - Native Styleは`native-components.tsx`に独自Color／数値があり、共有Tokenとの直接接続が不足している。
  - 現Windows環境にはAndroid SDK／JDK／adb／EmulatorおよびXcode／iOS Simulatorがない。
  - `docs/PROJECT_CONTEXT.md`には既存Web／Native UI基準とNative実装状況がある。
  - EAS設定・Workflowは現時点で未作成である。
- Assumptions:
  - ユーザー承認により、`eas.json`／Workflowの作成と静的Validationは許可されるが、Cloud Build／Workflow Runは実施しない。
  - Expo SDK 57の標準CNG／`expo prebuild`／`expo run:*`をローカル経路として使用する。
  - iOS実検証はMac環境が提供された後に同じRunの再開点から行う。
  - Native独自のレイアウト差はSafe Area、Navigation、Press状態、画面幅だけに限定する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。Build経路、EASの位置づけ、Production metadata、デザイン契約、成果物除外が明示された。
- 仮定してよい細部:
  - EAS Profile名は`development`、`preview`、`production-validation`を使用し、ローカルBuildのEnvironment名と対応させる。
  - EAS Workflowは手動dispatch相当の静的定義とし、Cloud実行は行わない。
  - 視覚比較の成果物は`output/ui-review/<stage>/`配下の再生成可能なScreenshotとRun Reportの結果記録に限定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - Expo config／EAS static config／local build docs
  - Native shared visual adapter／screens／shell／component tests
  - Web visual review command and screenshots
  - Project context／history／Run Artifact／evaluation
- Files to inspect:
  - `app.config.ts`, `package.json`, `README.md`
  - `src/presentation/design/tokens.ts`
  - `src/presentation/native/native-components.tsx`, `native-screens.tsx`, `native-shell.tsx`
  - `e2e/web/ui-review.spec.ts`, `playwright.config.ts`
  - `docs/PROJECT_CONTEXT.md`, `docs/adr/`, `.codex/runs/20260802-194908-JST/`

## 5. 変更方針

- Change strategy:
  1. 現行Token、Web主要画面、Native Style、EAS／local build状態を再確認し、既存Webを変更しないsafe change surfaceを固定する。
  2. `eas.json`／Workflow／Config metadata／package scriptsを、ローカルBuildを主経路とする形で追加・更新する。Cloud実行・Credential・Secretは扱わない。
  3. Native Styleを共有Token adapterへ置換し、Spacing／Radius／Typography／Status tone／44px Touch Targetを共通Primitiveへ集約する。
  4. Native UIのHome／Catalog／Product／Cartの情報順・画像・Sale／Stock／Review／Empty／Errorを視覚契約へ反映し、Stable Test IDを維持する。
  5. Web 390×844／320×700のScreenshotを取得し、Nativeは実環境がある場合の比較項目として記録する。現Windowsで実Native成功を推測しない。
  6. Static／Type／Test／Web Build／Screenshotを実行し、Docs／ADR／History／Run Artifactを更新する。
- 実行タスク:
- [x] 1. Build方針・EAS静的成果物・local script・docsの差分を実装する。
- [x] 2. Shared Design Token adapterとNative共通Primitiveを実装する。
- [x] 3. Native画面の視覚契約・Touch Target・Stable Test IDを調整する。
- [x] 4. EAS静的Validation、Web Screenshot、Static／Type／Test回帰を実行する。
- [x] 5. Run Artifact／PROJECT_CONTEXT／README／History／ADRを更新する。
- [ ] 6. Android／iOS local Build・Install・実操作はToolchain提供後に再開する。

## 6. 検証方法

- Validation plan:
  - `pnpm run format:check`（既存baseline warningを変更対象と分離）、`pnpm run lint`、`pnpm run typecheck`
  - `pnpm run test`、`pnpm run test:component:native`
  - `pnpm run build:web`、既存Playwright／a11y／mobile回帰
  - `pnpm run check:native-route-dependencies`、`pnpm run security:check`、`pnpm run validate:image-manifest`
  - `pnpm exec expo config --json`（local／automation／production）
  - `eas.json`のJSON／契約Test、`eas workflow:validate`（CLIが利用できる場合）
  - `UI_REVIEW_STAGE=phase2-local-design pnpm exec playwright test e2e/web/ui-review.spec.ts --project=ui-review-mobile --project=ui-review-small-mobile`または既存標準Script
  - Android／iOSはToolchain提供後に`expo prebuild`、local Development／Release／APK／Simulator Build、Install、Guest Flow、Reset、再起動、Production validationを記録する。
- 成功判定:
  - EAS CloudのIDがなくても、local Native Build／端末・Simulator検証が完了すれば主要Build条件を満たす。
  - EAS静的Validation未実施はPASSにせず、Cloud実行は「未実施」と明記する。
  - Screenshot取得はWeb側の事実、Native側は実端末の証拠がある場合だけ完了と判定する。

## 7. リスクと未解決論点

- Risks:
  - Nativeの数値を一括変更すると、狭い端末で横overflowや文字切れが発生する可能性がある。
  - EAS Workflow schemaのCLIバージョン差により静的Validationが失敗する可能性がある。
  - NativeをWeb Screenshotだけで完了扱いしない。
  - `expo prebuild`は`android/`／`ios/`を生成するため、Build後にCommit対象へ含めない。
- Open questions:
  - Android JDK／SDK／Emulatorを実行できるWindows環境と、Xcode／Simulatorを実行できるMac環境の提供時期。

## 8. 成果物

- 変更ファイル: EAS static config、local build scripts/docs、Native visual adapter／components／screens、visual contract tests、Run artifacts。
- 付随ドキュメント: README、PROJECT_CONTEXT、ADR、History、Run Report／Evaluation。

## 9. 備考

- EAS Cloud Build／Workflow Run／Submitはこの計画の主要経路ではなく、認証・課金・Credentialを要求する操作は実施しない。
- Goalの完全完了には、ローカルAndroid／iOSの実環境Evidenceが必要である。
