# Phase 2前半：Native基盤・SQLite・Guest購入前Flow 実装計画

## 0. 依頼概要

- 依頼内容: `qa-training-store`のPhase 2前半を、Native基盤、SQLite、Guest Storefront/Cart、Test Control、ローカルBuild、実環境検証、自己レビュー、文書更新まで実施する。EASは使用しない。
- 背景: Web版で確立したDomain/Application契約をAndroid/iOSへ拡張し、後半の購入Flowへ引き渡せる前半基盤を作る。
- 期待成果: Android/iOSでGuestが商品探索からCart復元まで操作でき、Web契約を壊さず、後半へ引き渡せるRun Artifactを残す。ローカル環境で実行できないNative操作は未確認として明示する。

## 1. ゴール / 完了条件

- ゴール: Gate A〜Gを順番に通過し、利用可能なローカル経路でAndroid/iOS Buildを起動・操作・検証できるPhase 2前半を完成させる。EAS固有の成果物は本Runの対象外とする。
- 完了条件（DoD）: `docs/plans/phase2-native-goal/01_phase2-first-half-native-foundation.md` のDoD、Gate A〜G、最終完了判定をすべて満たす。未実施の実環境検証はPASSにしない。

## 2. 現状理解と前提

### Current understanding（確認済み事実）

- 現在のBranchは `feature/01_phase2-first-half-native-foundation`、HEADは `ebc3671adb8dc9e287b3ac91cc43ba4183de4d81`、作業ツリーは初期確認時にcleanだった。
- 現行コードはExpo SDK 57系のWeb中心実装で、`app/_layout.tsx`からCSS、Web Shell、`browser-runtime.web.ts`、Dexieへ接続している。`app/_layout.web.tsx`、Native Route/Screen、Native Composition Rootは存在しない。
- `src/application/create-application-services.ts`と複数のUse CaseがDexie具象やWeb Infrastructureへ直接依存している。Customer/Admin CapabilityとTransaction Scopeは混在した契約から整理が必要である。
- `package.json`には `expo-sqlite`、`expo-dev-client`、`react-native-quick-crypto`、`jest-expo`、`@types/jest`、`@testing-library/react-native`の直接依存がなく、`eas.json`と`.eas/workflows/`も存在しない。
- `app.config.ts`にはScheme `scenario-shop`、既存 `extra.schemaVersion`、`seedVersion`などがあるが、Android packageとiOS bundleIdentifierは未設定である。
- Nodeは `v24.12.0`、pnpmは `9.10.0`、Expo CLIは `57.0.10`、packageのExpoは `57.0.8`である。
- EAS CLIは常設されていないが、ユーザー判断によりEAS認証・Project・Workflowは本Runの開始条件および実装対象から除外する。
- Androidの `adb`、Emulator、SDK tools、Maestro、iOSの `xcrun`、`simctl`、Xcode、CocoaPodsは実行環境に存在しない。
- 既存TestはVitest/jsdom、Dexie、Web Component、Playwright browser emulationを中心に構成され、実SQLite、Native Component Test、Android/iOS実環境検証は未整備である。
- 3つのread-only project-scoped agentが、Route/依存経路、実装対象、Test/CI不足を実コードと照合した。
- 公式Expo資料で、SDK 57の`expo-sqlite`、`withExclusiveTransactionAsync`、`expo-sqlite/kv-store`、EAS profile/environment/workflowの仕様を確認した。

### Assumptions

- ユーザーが添付文書で固定したAndroid package、iOS bundleIdentifier、Scheme、Store非公開、EAS Submit非実施、CNG維持、依存導入許可は変更しない。Buildはローカル経路を使用する。
- EAS Account/Organization/Project、EAS Profile/Workflow、EAS Build/Submitはユーザー指示により本Runの非目標とする。
- ファイル名、Native Screenの局所分割、Test配置など、既存Conventionで決められる細部は計画に沿って安全側へ決める。
- `docs/future/phase2/`は非正本として参照だけに使い、Master Roadmap、前半計画、Repository規約より優先しない。

### Non-goals

- Login UI完成、Account、配送先、Checkout、Payment、Order、Review、購入系Maestro、Native Admin、Phase 3機能。
- App Store/Google Play公開、EAS Submit、Store提出用Profile、公開用Release Gate。
- Migration Recovery、全DB Fingerprint、Sentinel専用基盤、必要性を再現できない独自Mutation Queue。
- EAS Account/Projectの設定、EAS Profile/Workflow、EAS Build/Submit、Store公開用設定。
- ユーザー承認なしの上位計画変更、Branch/GitHub/Git mutation、ファイル削除やrename。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点（mandatory-question）

コード実装を止める未解決質問はない。ユーザーがEASを使わない方針を確定したため、ローカルNative toolchainが現環境にない場合は、実装・静的検証を進めたうえで実機操作を未確認として分離する。

### 仮定してよい細部

- 既存Web URLは現在のRoute名を維持し、Nativeでは後半対象Routeを安全な準備中/対象外画面にする。
- 共有するのはDomain、Application、DTO、Validation、文言、Platform非依存View Modelに限定する。

### 未回答の重要質問

- Phase 1 Web CIとCloudflare Deployの最新外部成功Runが確認できるか。
- Android SDK/EmulatorとiOS Simulatorのローカル実行経路は、実装後のFollow-upとして確認する。

## 4. 影響範囲

### Impacted areas

- Expo RouterのPlatform別Root/Route/Screen/Shell
- Application依存方向、Customer/Admin Repository Capability、Transaction Scope、Composition Root
- `expo-sqlite`のSchema、Mapper、Connection、Foreign Key、Transaction Runner、Customer Adapter
- Native KV、PBKDF2、Seed/Reset、Deep Link Test Control、Contract Harness、Asset Map
- Native Component Test、Jest/Vitest型境界、Production-validation Guard、CI責務分離
- Android/iOS Guest Storefront、Product、CartとWeb回帰、PROJECT_CONTEXT、ADR、Native手順

### Files to inspect

- `app/**`、`src/presentation/**`、`src/application/**`、`src/domain/**`
- `src/infrastructure/database/dexie/**`、`src/infrastructure/session/**`、`src/infrastructure/security/**`
- `src/seeds/**`、`src/test-controls/**`、`src/generated/**`、`scripts/**`
- `package.json`、`pnpm-lock.yaml`、`app.config.ts`、`tsconfig.json`、`vitest.config.ts`
- `.github/workflows/**`、既存Test、`docs/PROJECT_CONTEXT.md`、`docs/adr/**`

## 5. 変更方針

ユーザー判断によりEAS開始条件を除外し、次の順で実施する。各Gate終了時にRun Artifactへ自己レビューを追記し、Critical/Highを残したまま進めない。

1. Gate A: Route Inventory、`app/_layout.tsx` Native化、`app/_layout.web.tsx`追加、Platform別Route/Screen/Shell、Native Route Dependency Check。
2. Gate B: ApplicationからInfrastructure具象への直接依存除去、Customer/Admin CapabilityとScope分離、Native Composition Root、Native KV/PBKDF2、Jest/Vitest型境界。
3. Gate C: Customer向けSQLite Schema/Mapper/Connection/Foreign Key/Transaction、Dexie/SQLite Shared Contract、Harness DB/KV隔離とCleanup。
4. Gate D: 静的Native Asset Map、Deep Link Test Control Version 1、Ready/Error Signal、Production-validation無効化。
5. Gate E: 利用可能なローカルAndroid経路でBuild、Install、起動、Home→商品→Variation→Cart→数量→削除→再起動復元→Resetを実操作する。
6. Gate F: 利用可能なローカルiOS経路でBuild、Install、起動、同じGuest Flow、SQLite/PBKDF2/KV/FK Smokeを行う。実行環境がなければ未完了として分離する。
7. Gate G: Static/Type/Test/Web/Native回帰、実環境結果、文書/ADR/History/引継ぎ、最終自己レビュー。

上位計画を変更する必要が出た場合は、コード変更前に`Status: Accepted`、`Supersedes`、`Approved-by: user`を含むADR案とRun Artifactを更新し、承認なしでは実装しない。

## 6. 検証方法

### Validation plan

- Static/Type: format、lint、`typecheck:app`、`typecheck:native-tests`、統合typecheck、Architecture/Capability/Scope、Native Route Dependency、Security、Image Manifest、Native Asset Contract、Resolved Expo Config。
- Test: Unit、Application/Integration、Dexie Contract、SQLite Schema/Mapper/SQL、Shared Customer Contract、Web/Native Component、PBKDF2、KV、Transaction、FK、Harness Cleanup、Test Control。
- Web: Web Build、既存Playwright、Storefront/Cart、Accessibility、Mobile Boundary、URL契約、Cloudflare Deploy契約。
- Android: ローカルDevelopment/Preview相当Config、`expo run:android`等のBuild、Install、起動、Guest Storefront/Cart、再起動保持、Deep Link Reset、実SQLite Contract。
- iOS: ローカルSimulator経路でのBuild、Install、起動、Guest Storefront/Cart、Reset、再起動、実SQLite/PBKDF2/KV/FK Smoke。実行環境がなければ未確認として記録する。

### 成功判定

- Build成功を操作/Test成功と扱わない。
- 実行したコマンド、Test件数、Build ID、Workflow Run ID/URL、Profile、Environment、HEAD SHA、未Commit差分をRun Artifactへ記録する。
- Android/iOSの操作、実SQLite、Harness隔離/Cleanup、Production-validation無効化を個別にPASS/未完了判定する。
- Critical/Highがなく、文書更新と後半引継ぎ契約が完了して初めてPhase 2前半完全完了とする。

## 7. リスクと未解決論点

- Windows環境にAndroid/iOS実行ツールがない。コード完成と実環境検証を分離し、代替経路が承認されるまでPASSにしない。
- 現行ApplicationがDexie具象を直接生成するため、依存方向の修正範囲が大きい。まず既存Use Case/Contractを固定し、Web回帰を各Gateで再実行する。
- Native Cryptoを共有Entryへ漏らすとWeb Bundleが壊れる。Platform suffixと静的Dependency Checkを追加し、Web Buildで確認する。
- SQLite AdapterのSchema/Mapper/Transaction/FK不整合が後半へ波及する。Web/SQLite Shared Fixture、実Native Contract、`foreign_key_check`を完了条件にする。

## 8. 成果物

- Gate A〜Gのコード、Test、Config、ローカルNative Build/操作結果
- Platform/Route/Composition Root ADR、SQLite/Transaction/Test Strategy ADR
- Route Inventory、Native Asset Map、Contract Harness、Native手順、後半引継ぎ一覧
- `.codex/runs/20260802-194908-JST/` のPLAN/TASKS/REPORT/run.json/evaluation.json
- `docs/PROJECT_CONTEXT.md`と`docs/history/`の更新

## 9. 外部条件の確認結果と再開Gate

- 固定値: Android package/iOS bundleIdentifierは添付Goalの `com.ryuyoshikawa.scenarioshop`、Schemeは `scenario-shop`。再質問しない。
- ユーザー決定: EASは使用せず、EAS Account/Project/Profile/Workflow/Buildは無視する。ローカルBuildを優先する。
- 未確認: Phase 1外部CI/Cloudflare成功、Android/iOSローカル実行環境。これらはコード実装を止めず、実行結果を未確認として記録する。
- 現時点の判定: Blocked状態を解除し、Gate A実装へ進む。
- 再開位置: 同じRunのGate A Task 5。ユーザーのローカルBuild方針をREPORTへ追記してからTASKSを再開する。

## 10. 後半へ引き渡す契約（実装後に確定）

- Route Inventory、Root/Shell、Application依存方向、Customer/Admin Capability/Scope、Native Composition Root
- Native Schema Version、Table FK Action、Connection初期化、Transaction RunnerのCommit後結果返却契約
- Shared Contract Suite、Harness DB/KV形式、Application DB不変確認、Native KV Key
- PBKDF2形式/Library/Test Vector、Jest/Vitest型境界、Deep Link Protocol v1
- Native Asset Map形式、Stable Test ID、CNG方針、ローカルBuild手順
- 実環境未確認事項、残課題、後半開始条件。前半PRがmainへマージされるまでは後半開始可能と判定しない。

## 11. 調査エージェントの採用結果

- `code_researcher`: Route、Web専用Import、Root/Shell、Composition Root、既存Capability/Scope/Test Control/CIの実態を確認。採用した。
- `implementation_researcher`: Platform分離、SQLite/KV/PBKDF2/Harness/Asset/Test/EASの対象ファイルと順序を整理。採用した。
- `test_investigator`: 既存TestとNative/SQLite/KV/FK/Cleanup/実環境の未整備領域を整理。採用した。
- いずれもread-onlyで、コード・文書・Gitを変更していない。
