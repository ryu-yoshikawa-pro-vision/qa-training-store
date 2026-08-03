# Phase 2前半 Tasks

## Now

- [x] 1. 添付Goal全文と`AGENTS.md`、`PLANS.md`、feature-plan、PROJECT_CONTEXT、ADR、直近Run、Phase 2計画、future資料を読む。
- [x] 2. Branch/HEAD/作業ツリーをread-only確認し、Strict Run `20260802-194908-JST`を初期化する。
- [x] 3. code/implementation/test investigator、公式一次資料、Toolchain、既存Code/Test/Config/CIを調査し、保存用計画とRun Planを作成する。

### Gate A: Route / Native Bundle

- [x] 5. 全`app/` Route Inventoryを作成し、Web/Native/Platform別/前半/後半/Admin/対象外を分類する。
- [x] 6. Native `app/_layout.tsx`、Web `app/_layout.web.tsx`、Platform別Route/Screen/Shell/Providerを実装する。
- [x] 7. Native Route Dependency Check、Android/iOS Native最小Bundle、Web URL契約、Web Buildを検証する。
- [x] 8. Gate A自己レビューとREPORT追記を行い、Critical/Highがないことを確認する。

### Gate B: Dependency / Capability / Security / Storage / Test Runner

- [x] 9. Application→Infrastructure直接依存、Use Case Constructor、Customer/Admin Repository Capability/Transaction Scopeを調査・設計する。
- [x] 10. Web/Native Composition RootとCustomer/Admin Capability/Scope分離を実装し、Web Dexie回帰を維持する。
- [x] 11. Native KV、Platform別PBKDF2、Format Parser、Config Plugin/Autolinking境界を実装する。
- [x] 12. Jest/jest-expo、Native Component Test、`tsconfig.native-tests.json`、typecheck scriptsを実装する。
- [x] 13. Gate BのArchitecture/Capability/PBKDF2/KV/Component/typecheck/Web Bundle検証と自己レビューを行う。

### Gate C: SQLite / Repository Contract

- [x] 14. Customer向けSQLite Schema/Version/Mapper/Connection/FK Actionと`PRAGMA foreign_keys`/`foreign_key_check`を実装する。
- [x] 15. SQLite Customer Adapter、`withExclusiveTransactionAsync` Transaction Runner、Commit後結果返却、Lock Error変換を実装する。
- [x] 16. Dexie/SQLite Shared Customer Contract、Harness専用DB/KV、Cleanup、Application DB不変確認を実装する。
- [ ] 17. Node/Android/iOSのSQLite Schema/Mapper/SQL/FK/Transaction/Contract/Harness検証を行う。
- [x] 18. Gate C自己レビューでSentinel基盤・不要Mutation Queue・Admin Dummyがないことを確認する。

### Gate D: Asset / Test Control / EAS 基礎

- [x] 19. 静的Native Asset Map生成、Web Manifest集合一致、Placeholder同梱、Asset Contractを実装する。
- [x] 20. Deep Link Test Control v1、Scenario/Clock/Delay Validation、Reset Mutex、Ready/Error/Contract Signalsを実装する。
- [x] 21. Production-validationでTest Control/HarnessをBundle/Route/Service/Handler/Guardごと無効化し、EAS Profile/Workflowの静的契約も保持する。
- [x] 22. Gate DのAsset/Reset/Production/EAS static validationと自己レビューを行う。EAS Cloud実行は対象外とする。

### Gate E: Android Vertical Slice

- [ ] 23. 利用可能なローカルAndroid経路でPreview相当Buildを生成し、Build情報を記録する。環境不足は未確認とする。
- [ ] 24. APKをAndroid Emulator/deviceへInstall・起動し、端末/Android Version/方法を記録する。
- [ ] 25. Home、一覧、検索、Category、Filter/Sort、Empty/Loading/Error/Not Found、Product/Variationを実操作する。
- [ ] 26. Cart追加/数量/削除/上限/在庫不足/Empty、Guest/Cart再起動復元、Deep Link Reset/Signalを実操作する。
- [ ] 27. Gate E自己レビューと不具合修正・再検証を行う。

### Gate F: iOS Vertical Slice

- [ ] 28. 利用可能なローカルiOS Simulator経路でBuildを生成し、Build情報を記録する。環境不足は未確認とする。
- [ ] 29. BuildをiOS SimulatorへInstall・起動し、方法/OS/Simulatorを記録する。
- [ ] 30. Home、検索/Category、Product/Variation、Cart追加/数量/削除、Reset、再起動復元を実操作する。
- [ ] 31. iOS実SQLite/PBKDF2/KV/FK Smoke、Harness隔離/Cleanup、Production設定を検証する。
- [ ] 32. Gate F自己レビューを行い、未実施項目をPASSにしない。

### Gate G: 総合回帰 / 文書 / 引継ぎ

- [x] 33. Format/Lint/Typecheck/Architecture/Security/Asset/Native RouteのStatic検証を行う。
- [x] 34. Unit/Integration/Dexie/SQLite/Shared Contract/Web/Native Component/PBKDF2/KV/Transaction/FK/Harness/Test Controlを検証する。
- [x] 35. Web Build、既存Playwright、Storefront/Cart、Accessibility/Mobile/URL/Cloudflare回帰とWeb 390×844／320×700 UI Reviewを検証する。
- [x] 36. Android/iOSローカル実環境（利用可能な場合）、Production-validation、`android/`/`ios/`のGit対象外を最終確認する。EAS Cloudは対象外とする。
- [x] 37. PROJECT_CONTEXT、History、ADR、README/Native手順、後半引継ぎ、最終Report/evaluationを更新し自己レビューする。

## Discovered

- D1. EAS CLIの常設導入・認証、EAS Project関連付け、費用/Credential方針はユーザー指示により対象外とする。
- D2. Android/iOSローカル実行環境の実在を確認し、未導入ならコード検証と実Native操作を分離して記録する。
- D3. Native UIの共有Visual Contract（tokens、Web情報順、画像比率、44px Touch Target）を検証可能にする。
- D4. EASをCloud実行せず、Profile／Environment／manual Workflowの静的契約だけを保持する。
- [x] D5. GitHub PR #8のReview Thread／CodeRabbit状態と添付レビュー指摘を再確認する。
- [x] D6. Formal Deep Link、Native Foundation Scenario Allowlist、Guest Mutation、Variation未選択を修正・テストする。
- [x] D7. Shared Application Use Case、Customer-only Schema方針、Reset Exclusive Transaction、rollbackを修正・テストする。
- [x] D8. 実行可能な専用Contract Harness、Application DB不変確認、Cleanup後Signal、Accessibility状態表示を実装・テストする。
- [x] D9. Production Module Resolution／生成Bundle Guard、Native Asset生成差分、Production route exclusionを実装・検証する。
- [x] D10. Android Emulator CI、iOS手動CI、責務別Maestro Flow、Artifact／Final Verifyを追加する。
- [x] D11. ADR、上位計画、README、PROJECT_CONTEXT、History、修正計画、Run Artifactを実態に更新する。
- [x] D12. Format、Lint、Typecheck、全Test、Web Build／E2E／A11y／Mobile、Security、Asset、Route、EAS static、Production Bundleを検証する。
- [ ] D13. GitHub Actions Run、ローカルAndroid Emulator／実機、iOS Simulator／実SQLiteを実行し、実環境証跡を保存する。
- [x] D14. PR #8再レビュー添付、最新GitHub Actions run／Job／失敗ログをread-onlyで再確認する。
- [x] D15. Android WorkflowのSDK Root／sdkmanager絶対Path、Release APK、Emulator OS boot／package service待機、Package／Process確認を修正する。
- [x] D16. Native変更検知、Detect Resultを含む最終Verify、専用Maestro Artifact収集を修正する。
- [x] D17. Native Application Service公開範囲と閲覧制限商品のError契約を修正し、Contract Testを追加する。
- [x] D18. Test Control ResetのSQLite→KV順序とSeed失敗時のKV不変／成功時順序Testを追加する。
- [x] D19. Cart Error再試行復旧と全Mutation Button無効化を実装し、Native Component Testを追加する。
- [x] D20. MaestroをFlow責務単位で独立させ、Restart／Dirty Reset／在庫／購入上限Flowを追加する。
- [x] D21. iOS Workflowをmanual-only Release Simulator Buildへ変更し、専用Artifact出力へ揃える。
- [x] D22. 再レビュー修正後の全静的／Unit／Component／Contract／Web回帰検証を実行する。
- [x] D23. 再レビュー修正の結果、既存Run Artifact、README、PROJECT_CONTEXT、ADR、Phase 2計画、Historyを実態に更新する。

## Resolved / Follow-up

- B1（解消）. ユーザーがEASを使わずローカルBuildを使う方針を確定したため、EAS Account/Project/費用/Credential/Workflowは開始条件から除外した。Android `adb`/Emulator/MaestroとiOS `xcrun`/Simulator/Xcodeは現環境にないため、該当する実操作は未確認として記録し、Task 5（Gate A実装）へ進む。

Progress: 73% (33/45)

## 2026-08-03 PR #8再レビュー追補

- D14〜D21は修正済み。D22の全検証とD23の最終Artifact反映後に進捗を再計算する。
- D13（修正後GitHub Actions／ローカルAndroid Emulator／iOS Simulator／実SQLite）は、Commit／Push禁止または実行環境不在のため未完了のまま保持する。

## 2026-08-03 00:20 JST 追補判定

- D3／D4は実装・静的検証・Web screenshot取得まで完了した。Native screenshotと実Native操作はGate E/Fの未完了項目として残す。
- `android/`は`expo prebuild --platform android --no-install`で生成したローカルIgnored成果物であり、Repositoryへ追加しない。`ios/`はWindows上で生成・Buildしていない。
- Progress: 66% (24/36)

## 2026-08-03 06:11 JST Format完了

- リポジトリ全体へ`pnpm run format`を実行し、Prettier対象ファイルを整形した。
- `pnpm run format:check`がPASSしたため、Task 33のFormat条件を完了扱いに更新した。
- Progress: 69% (25/36)

## 2026-08-03 11:59 JST 最終検証

- D22／D23の再レビュー修正後検証とRun／Docs反映を完了した。
- D13の修正後GitHub Actions Run、ローカルAndroid／iOS実環境、実SQLite証跡は未実施として保持する。

Progress: 78% (43/55)
