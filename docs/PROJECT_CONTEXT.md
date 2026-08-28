# Project Context

## 目的

- このリポジトリで Codex を使うときの運用前提、重要な制約、主要ディレクトリを共有する。

## 運用の要点

- `AGENTS.md` の読込順と run 運用を必ず守る。
- 計画依頼では `docs/plans/TEMPLATE.md` をベースに計画書を作る。
- `docs/reports/` は durable な調査・監査・検証結果だけに使う。review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録では作らない。
- run の進捗と実行ログは `.codex/runs/<run_id>/REPORT.md` と `.codex/runs/<run_id>/logs/` に残す。
- プロジェクト配下の読み書きは通常承認なしでよいが、shell / PowerShell / git command によるファイル削除は禁止する。意図した差分としての `apply_patch` は許可する。
- read-only 調査 subagent は調査結果だけを返し、編集・作成・削除を行わない。
- `implementation_worker` は親 agent が承認した小さく限定された実装だけを担当し、対象ファイル以外の編集、削除、rename、git mutation を行わない。
- 重要な意思決定は `docs/adr/` に記録する。
- `docs/PROJECT_CONTEXT.md` 自体は living document として更新し、履歴は `docs/history/` に残す。

## ディレクトリ構成

- `.codex/templates/`: PLAN / TASKS / REPORT の run テンプレート
- `.codex/agents/`: project-scoped custom agents
- `.codex/rules/`: execpolicy ルール
- `.agents/skills/`: repo-local の planning / review workflow と references
- `docs/plans/`: ユーザー向け計画書
- `docs/reports/`: durable な調査・監査・検証レポート
- `docs/reference/`: operator / maintainer 向け補助資料
- `scripts/`: `codex-safe` / `codex-task` / `codex-sandbox` と verify
- `codex-project.toml`: template 適用後の project metadata

## Codex Hook / Run記録整理（2026-08-28）

- Logging Hookのcanonical loggerは`.codex/hooks/log_event.mjs`であり、`UserPromptSubmit`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`Stop`を同じNode実装へ接続する。Logging Hookはmatcherなし・timeout 5秒、既存Safety `PreToolUse`はBash matcherとblocking behaviorを維持する。
- Hook JSONLはlogger自身の配置位置から解決した`.codex/logs/hooks-<safe-session-id>.jsonl`へ保存し、Git管理しない。Hook JSONLはRunへ自動集約せず、`CODEX_RUN_ID`やactive-run registryによるcorrelationを追加しない。
- REPORTはTASK完了、blocker、重要判断、計画変更、Run完了のcheckpointだけを追記し、AIが残す意味情報を記録する。Subagent利用時はDelegation / Result / Parent decisionだけをcheckpointへ残し、machine factはHook JSONLへ委ねる。
- 新規Runのmanifestはschema v2で、report count、changed files、validation、network / scope、evaluationを保持する。旧Subagent／旧Hook observation専用fieldや専用Structured Artifactは新規生成せず、既存v1はlegacy field valueの保持だけを行う。
- `.codex/logs/*.jsonl`のgeneric cleanupは維持し、旧`.codex/observations/hooks.jsonl`専用cleanupと旧observerは廃止した。Product code、ECサイト仕様、カリキュラム本体はこの整理の対象外である。

## Codex Full Access Safety Hook（2026-08-16）

- Windows native Codex `0.147.0`のproject Hookは、`[features].hooks = true`、`PreToolUse` matcher `^Bash$`、`command_windows`を正本とする。deprecatedな`codex_hooks`、project-local profile、旧PowerShell／Python policy Hookには依存しない。
- Full Access common policyの正本は`.codex/hooks/pre_tool_use_policy.mjs`一つであり、G1-G10／N1-N4の明確な破壊代表だけをdenyする。schema-invalid inputはfail-close、safeは無出力、denyはstructured `hookSpecificOutput`を返す。
- Git operationはshell boundary内の各invocationを独立して解析し、`git -C <path> ...`でも同一policyを適用する。複数`-C`は出現順に累積してeffective repositoryを解決し、context未指定時のprotected branch判定はinvocationごとのrepositoryを対象にする。同一command内の後続Git operationも見逃さない。`--git-dir`／`--work-tree`を使うcontext-sensitive mutationはfail-closeし、read-only operationはblanket denyしない。
- Git executableはBash系の`git`とWindows／PowerShellの`git.exe`を同一視する。subcommand以降はquote-aware argument tokenで評価し、push destination、fetch refspec、`update-ref` target、`worktree add -B` targetもmutation targetとして静的に検査する。explicit safe push以外のimplicit／bulk／matching／wildcard／複数refspec、URL／pathだけのpushはfail-closeする。
- `-c`／`--config`／`--config-env`とinline `GIT_DIR`／`GIT_WORK_TREE`／`GIT_CONFIG_*`がrepository／mutation／push semanticsを変える場合はcontext-sensitive mutationをfail-closeする。read-only Git operationは必要以上に禁止しない。完全なshell／Git parser、alias expansion、wrapper、`.git`直接filesystem書換えは対象外である。
- shell command前半のbranch／cwd／persistent environment transition後にcontext-sensitive Git mutationが続く場合は、branch／cwdをsimulationせずfail-closeする。`update-ref -m`、fetch／pullの`--refmap`／`--stdin`、state-changing `git config`、protected branch delete／renameもtoken単位でtargetを検査し、target不明はfail-closeする。Bash line continuationと限定的なoption escapeを正規化するが、完全parserは実装しない。
- Windows launcher `.codex/hooks/pre_tool_use_policy_windows.ps1`はstdin／stdout／stderrとNode exit codeのtransportだけを担当する。Rulesはstatic prefixのdefense-in-depth、`auto-net`のRulesとwrapper制約は別preset契約である。
- 通常の`git add`／feature branch上のcommit・push／fetch／normal switch、path-based unstage、明示的recovery、`python -c`／`python -`／`terraform apply`／`kubectl apply`はcommon Hookでblanket denyしない。`apply_patch`はmatcher外である。

## Repository EOL Contract（2026-08-17）

- tracked text fileのcheckout EOLは`.gitattributes`の`* text=auto eol=lf`を正本とし、global `core.autocrlf`設定へ依存しない。root `.editorconfig`はUTF-8、LF、final newlineだけをEditor補助として指定する。
- Prettierは`.prettierrc.json`の`endOfLine: lf`で同じLF契約を明示する。`.bat`／`.cmd`はRepositoryにないためCRLF例外を設けない。
- EOL契約変更時の移行は既存変更を保持した`git add --renormalize .`とstaged／unstaged差分確認で一度だけ行い、branch switch後の`format:check`をWindows Nativeで検証する。

## UI デザイン基準

- Storefront と customer 画面は、白／暖色系 Off White、Dark Navy `#111827`、限定的な Gold `#C6A15B` を基調とし、商品画像と情報階層を主役にする。
- 本文色は `#111827`、補足色は原則 `#475569`、Border は `#E2E8F0` とし、Gold の文字色は WCAG AA を満たす `#7A5B22` を使う。
- 最大 Content Width は 1,280px、Spacing は 8px Grid、Button／Touch Target は原則44px以上、CardはBorder中心でShadowを限定する。
- Responsive境界は Mobile 767px以下、Tablet 768〜1023px、Desktop 1024px以上を基本とする。管理操作は既存契約どおり1024px以上に限定し、小画面では専用Warningを表示する。
- Visual Reviewの標準ViewportはDesktop 1440×1000、Tablet 1024×900、Mobile 390×844とし、Storefront／customerの主要FlowはSmall Mobile 320×700でも横overflow、44px touch target、Page End到達性を検証する。
- 共通の視覚実装は `src/presentation/design/tokens.ts`、`src/presentation/styles/global.css`、Storefront／Admin shell、共有Componentへ集約し、Domain、Use Case、Seed、Route、権限制御から分離する。
- 同一条件のVisual Reviewは `e2e/web/ui-review.spec.ts` と `ui-review-*` Playwright projectで取得し、`output/ui-review/<stage>/<viewport>/` に保存する。

## UI/UX改善実装後の状態（2026-08-01）

- WebのOne-time Noticeは `src/presentation/shells/app-frame.tsx` が単一のStateと消費Pathを所有し、Storefront/Admin Shellは表示だけを担当する。Cart統合、Checkout再開・置換、Scenario ResetのNoticeは `sessionStorage` の検証済みUnionを介して伝播し、Reloadでは再表示しない。
- Loginの内部Return先は `src/presentation/browser/return-to.web.ts` のCustomer向けAllowlistに限定する。Checkoutの各実ContentとPayment Processing/Complete/Failedは `use-route-heading-focus` で `h1` にFocusする。
- Scenarioの正本は `src/seeds/metadata.ts` の `SCENARIO_METADATA` / `PHASE_ONE_SCENARIOS` であり、Seedの初期Session、安全な戻り先、Guide表示、E2E収集可否を同じ定義から導出する。Test Control UIのResetだけがNotice保存と安全Pathへの遷移を行い、Test API ResetはDB/Session/ClockのResetとMetadata返却に限定する。
- Customer注文画面のReview表示はAdmin向けOrder Item DTOから分離したCustomer DTOを使い、購入時Snapshotに基づく `未投稿`、`公開中`、`非公開`、`削除済み（再投稿不可）` を表示する。Admin User Detailは自分自身のRole/状態変更と退会済みUserのMutationをUI上でも説明付きで拒否する。
- Admin Product Previewは保存前のForm値と既存DBの現在庫を分けて表示し、新規SKUだけ初期在庫を表示する。Product EditorはDirty状態をBreadcrumb/Sidebar/同一Origin遷移で共通確認し、PreviewはDBへ書き込まない。Shipment mutation後は最新Order/Shipmentを再取得して同時更新を表示する。
- `/guide` は固定Account、Role、Rank Benefit、Scenario Metadata、注意事項の学習入口であり、HomeはSession Role別CTAと公開商品0件の単一Empty Stateを持つ。Customer Account Navigationは390px/320pxで3列Gridを維持し、管理操作は従来どおり1024px以上の境界を維持する。
- UI/UXの回帰入口は `e2e/web/ui-ux-improvements.spec.ts` のFlow A〜J（Chromium 10 tests）で、Phase 1と合わせて `test:e2e:chromium` に収集する。Cross-role、Accessibility、Mobile boundary、4 viewport UI Reviewも既存CIスクリプトへ接続している。

## PR #4レビュー修正後の状態（2026-08-02）

- Scenario ResetはDatabase Resetの成否とNotice保存を分離する。Reset成功後のNotice保存失敗はReset失敗として表示せず、必ずMetadataのsafeResetPathへハード遷移する。ConfirmDialogは非同期Confirm中の再実行を防止する。
- Product Previewは削除予定を除いたeffective VariantをForm値から組み立て、有効SKU・必須入力・Main Imageを公開可否判定へ含める。Previewは永続化せず、既存SKUのDB現在庫と未保存Form状態を別表示する。
- Shipmentの表示ラベルはOrder StatusとShipment Statusの組合せをPresentationの共通mappingで変換し、Admin／Customerで同じ文言を使う。Login後Checkout fallbackは想定された3つの状態Errorだけを対象とし、Storage／予期しないErrorは握り潰さない。
- Cart統合の`adjustedItemCount`は部分調整だけを数え、完全除外は`fullyExcludedItemCount`だけで数える。Guideは利用者向け分類とラベルを表示し、内部Property名やDB用語を露出させない。

## PR #4追加修正後の状態（2026-08-02）

- Test Control UIのResetだけがNotice保存とsafeResetPathへの画面遷移を所有し、Test API ResetはUI Notice／UI遷移を行わず、DB・Session・ClockのResetとMetadata返却だけを行う。
- GuideとReset NoticeのRoute表示は`src/presentation/routing/guide-routes.ts`のlinkable-route allowlistを共有する。`/orders`と`/admin/reviews`などの静的Routeはリンク化し、動的な`/reviews`、決済結果Route、外部／Protocol-relative／親相対Pathは文字列表示に留める。
- Customer Review状態の5値（`NOT_ELIGIBLE`、`NOT_POSTED`、`PUBLISHED`、`HIDDEN`、`DELETED`）は`deriveCustomerReviewState`で導出する。未配達のReview Eligibilityは商品・Variation・Option・注文番号・注文日時のSnapshotを保持し、Read処理でDBを変更しない。
- Admin Product Previewの`reviewSummary`は既存商品のDB集計を全項目DTOへ明示変換し、新規Previewは全項目0とする。Customer注文詳細は`getMyCustomerOrder`を直接利用し、送料表示は`FREE_SHIPPING_THRESHOLD`を正本とする。
- CIのCross-role lifecycleはPRでも専用Playwright projectのまま実行する。Scenario DatasetのGuest／非Guest Session整合と、非同期ConfirmDialogのPromise返却をUnit／Component／Contractで検証する。
- Dirty NavigationはReact AriaのModal／DialogとExpo Routerの`usePreventRemove`を組み合わせ、戻る操作の履歴状態を復元してから確認する。破棄後は保存中の遷移ガードを解除して元の遷移Actionを遅延Dispatchし、保存中は確認を出さない。

## CI/CD構成（2026-08-02）

- Quality、Vitest、Build、Playwright 検証は独立 Job／Matrix として実行し、独立した検証を可能な範囲で並列化する。上流検証を集約する内部 Job ID は `verify` とし、既存 Required Check 互換性のため最終 Job ID `validate` を維持する。
- Automation／Production の `dist/` はそれぞれ一度だけ Build し、`web-dist-automation`／`web-dist-production` Artifact として後続の E2E、Smoke、デプロイ Job へ共有する。
- Playwright は `PLAYWRIGHT_USE_PREBUILT_DIST=true` のとき Download 済みの `dist/` を静的サーバーで配信し、Job 内の `build:web` 再実行を抑止する。環境変数が未指定の場合はローカルの従来どおり Build 後に配信する。
- PR は `verify`、Automation Artifact による Preview デプロイ、固有 Preview URL の Smoke Test を順に通過した後、最終 `validate` を成功させる。Dependency Review は `pull_request` では成功を、`push`／`schedule`／`workflow_dispatch` では Skip を `verify` が明示的に要求する。`deploy-preview` は Job-level `always()` と `verify`／`build-automation` の成功条件を併用するため、PRで `extended-e2e` が意図的に Skip されても条件評価され、上流失敗時は実行しない。Preview デプロイまたは Smoke が失敗・Skip した場合、通常の同一リポジトリPRでは `validate` が `always()` の結果判定で失敗する。main Push では `deploy-preview` を Skip として扱い、Preview Skip が伝播しない `deploy-production` の Job-level `always()`＋`validate`／`build-production` 成功条件により、最終 `validate` 成功後に Production デプロイと公開 URL Smoke Test を行う。
- Production デプロイは `cloudflare-production` の Job concurrency により同時実行しない。Cloudflare Secret 不足はデプロイ対象 Job 内の認証確認 Stepで明示的に失敗させ、認証情報はその確認 StepとWrangler Action Inputに限定する。全 Checkout は `persist-credentials: false` とする。UI Review Artifact は `UI_REVIEW_STAGE` をUpload pathへ再利用し、Preview branch名は許可文字を検証する。
- forkリポジトリからのPull RequestはCloudflare Preview用Secretを利用せず、`deploy-preview` を Skip とする。Dependabot PRも同様にPreviewを実行しない。`validate` はPRのhead repositoryとauthorを明示判定し、通常の同一リポジトリPRだけPreview成功を要求し、fork／Dependabot PRではPreview Skipを要求して成功する。同一リポジトリ内の通常PRでSecretが不足する場合はデプロイJob内で明示的に失敗し、fork PRを通すために `pull_request_target`、untrusted head checkout、またはself-hosted runnerを追加しない。全remote Actionはfull-length commit SHAで固定する。

## Required Browser CIとCross Browser Smoke（2026-08-20）

- Phase 1 CIのrequired browser guaranteeはChromium系に限定する。`extended-e2e`はjob idを維持したmobile Chromium専用の単一jobで、check nameは`Extended E2E (mobile-chromium)`とする。`verify`／`validate`の既存required gate構造と`build-automation`→`web-dist-automation`→`extended-e2e`のartifact consumer経路は維持する。
- Firefox／WebKitのPlaywright project、npm script、`e2e/web/smoke.spec.ts`は削除しない。これらのsmokeはPhase 1 CIから`Cross Browser Smoke`へ分離し、`schedule`＋`workflow_dispatch` onlyで実行する。PR／main required gateをblockするworkflowではない。
- `Cross Browser Smoke`はFirefox／WebKitの両方をofficial Playwright container `mcr.microsoft.com/playwright:v1.62.0-noble`内で実行する。packageの`@playwright/test` versionとcontainer image versionは一致させ、Node／pnpmはPhase 1 CIの正本値（Node 24／pnpm 9.10.0）を再利用し、pnpmは`package.json#packageManager`とも一致させる。Phase 1 CIからFirefox／WebKit向け`playwright install --with-deps`は除去し、Cross Browser Smokeではbrowser install step自体を持たない。
- Build boundaryをworkflow単位で分ける。Phase 1 CIはautomation build ×1とproduction build ×1を行い、それぞれの`dist/`をworkflow内artifactとして後続jobへ共有する。Cross Browser SmokeはPhase 1 CI artifactをworkflow横断で再利用せず、独立workflow内でautomation build ×1を行い、その同じdistをFirefox／WebKitの1回のPlaywright invocationで共用する。
- Environment boundaryも分ける。build-time automation envは`EXPO_PUBLIC_APP_ENV`、`EXPO_PUBLIC_BUILD_KIND`、`EXPO_PUBLIC_TEST_MODE`、`EXPO_PUBLIC_DEFAULT_SEED`に加えてbuild時だけ`EXPO_PUBLIC_BUILD_SHA=${{ github.sha }}`を持つ。既存artifactを消費する`extended-e2e`は`PLAYWRIGHT_USE_PREBUILT_DIST=true`を使い、`EXPO_PUBLIC_BUILD_SHA`を追加しない。新workflowを含む全Checkoutは`persist-credentials: false`を維持する。

## Phase 2前半 Native Foundation（2026-08-02）

- WebとNativeのRoot／Route／Shellを分離した。Webは既存のApp FrameとDexie Runtimeを継続し、Nativeは`NativeAppRuntimeProvider`、Native Shell、Native Customer SQLiteを使う。全Routeの分類は[`docs/plans/2026-08-02_215142_route-inventory.md`](./plans/2026-08-02_215142_route-inventory.md)に記録する。
- Native前半の実装範囲はGuest Home、Catalog、Search、Category、Product、Variation、Cart、Guide／Legalである。Login、Account、Checkout、Payment、Order、Review、AdminはNative placeholderとし、後半へ引き継ぐ。
- Native DBは`expo-sqlite`のCustomer-only schema、FK enforcement、WAL、exclusive transaction、seed versionを使用する。Native KVは`expo-sqlite/kv-store`、Password HashはPBKDF2-SHA256 adapter、Assetは静的生成Mapを使用する。
- Test Controlは`scenario-shop://test-control/reset`のVersion 1 Deep Link、Scenario／Clock／Delay validation、Reset mutex、Ready／Error signalを持つ。local／automation buildだけ有効で、production buildでは無効である。Native contract harnessは専用DB／KV namespaceとfinally cleanupを持つ。
- Application層はInfrastructure／Dexieをimportせず、Web Dexie Composition RootとNative Customer Composition Rootがportへadapterを注入する。`pnpm run check:native-route-dependencies`、`typecheck:native-tests`、Native Jestを検証入口とする。
- Native BuildはローカルWindows／macOSを正式な主経路とする。Androidは`expo prebuild`→Android Studio／Gradle Release／署名済みAPK→Emulator／端末Install、iOSは`expo prebuild`→Xcode／`expo run:ios` Release Simulator Build→Simulator Installを行う。個人iPhoneはDevelopment Signingの任意確認に限定し、Distribution IPA／Store提出は行わない。生成された`android/`／`ios/`、APK／App、署名鍵／CredentialはRepository成果物にしない。
- Native UIはWeb DOM／CSS／React Ariaを再利用せず、`src/presentation/design/tokens.ts`の色、8px Grid、Radius、Typography、Touch Target、商品画像比率をNative primitivesへ接続する。Home／Catalog／Product／Cartの情報順と画像比率をWebと揃え、390×844、追加で320×700のWeb／Native比較を行う。Android／iOS差分はPlatform Header／Navigation等の必要差に限定する。
- `eas.json`と`.eas/workflows/phase2-native-foundation.yml`はProfile／Environment mappingと将来の手動Workflowを静的に保持する。`pnpm run validate:eas:config`をローカル静的検証入口とし、EAS Cloud Build／Workflow／Maestro／Submitは通常経路として実行しない。
- 2026-08-02時点の実行環境にはAndroid SDK／`adb`／EmulatorとiOS `xcrun`／Simulatorがないため、実Native Build／Install／起動／操作／実SQLite Smokeは未確認である。Node／Web検証と実Native検証を混同しない。
- Node.js 24の組み込み`node:sqlite`でNative Customer SQLite Adapterの実SQL／FK／Seed／Catalog／Cart Shared Contractを検証するSuiteを追加した。これはAndroid／iOSの`expo-sqlite`実行検証とは分離して扱う。
- Native Guest Identityは初回だけseed既定値を設定し、以後はNative KVの保存値を再起動後も保持する。Guest Cartの初回作成も`withExclusiveTransactionAsync`内で行う。
- Native前半UIはCatalogの在庫／Sale／Rating filter、商品詳細のSale価格・在庫・購入上限・Review Summary・在庫切れVariation、二重追加防止を備える。ProductionのTest Control buildKindは解決済みExpo Configを優先する。

## PR #8レビュー修正後の状態（2026-08-03）

- Native Test Controlの正式URLは`scenario-shop://test-control/reset`であり、Pure Functionが`scheme`／`hostname=test-control`／`path=reset`を検証する。Native前半Scenarioは`src/seeds/metadata.ts`の`NATIVE_FOUNDATION_SCENARIOS`（8件）だけを受理する。
- Native Runtimeは既存の`CatalogUseCases`／`CartUseCases`へCustomer Catalog／Cart Gateway、Guest Actor、Native SQLite／Clock／KV Adapterを注入する。Native専用Use Caseの業務Validationを正本にしない。
- Native SQLite Resetは削除、Seed、Schema Metadata、Native Schema Version、`foreign_key_check`を一つのExclusive Transactionで実行し、失敗時に旧状態を残す。前半はCustomer-only Schemaに限定し、後半のTable追加時に`NATIVE_DATABASE_SCHEMA_VERSION`を更新する。Store公開前のDB再作成を許容し、Migration Recoveryは前半対象外とする。
- Contract Harnessは`scenario-shop-contract-<uuid>.db`と専用KV Prefixを使い、固定Customer Contract、FK違反、Cart add／update／remove、Application DBの必要最小限の不変確認を実行する。全Cleanupと不変確認が成功した後だけ`Native contract passed`を通知する。画面へ任意Exception／SQLは表示しない。
- ProductionではMetroの限定ResolverがAutomation／ProductionのNative Automation BridgeとHarness Screenを分離する。生成Android Hermes Bundle（`.hbc`）でAutomation Markerあり、Production Marker／`NativeTestControlService`なしを検査する。
- `.github/workflows/native-ci.yml`はPR／手動起動、Native変更時にUbuntu `ubuntu-24.04`／Android API 34 Emulator／compile SDK 36でDeep Link、Harness、Maestro Storefront／Cartを実行し、`native-ci / verify`へ集約する。`.github/workflows/native-ios-ci.yml`は`macos-26`／Xcode 26.4.1以上の手動Workflowで、初期段階ではRequired Checkへ含めない。
- 2026-08-03時点で、上記CIは定義済みだがGitHub Actions Runは未実施である。Windows上のAndroid SDK／`adb`／EmulatorおよびiOS Xcode／Simulatorも未提供のため、実Native Build／Install／操作／実`expo-sqlite` Smoke／Native screenshotは未確認である。Node／Web／生成Bundleの成功と実Native成功を混同しない。

## PR #8再レビュー修正（2026-08-03）

- GitHub Actions Native CI run `30775548618`の実態は、Detect／Native Static／Production Bundle Guardが成功、Android Jobが既存Workflowの`sdkmanager: command not found`で失敗、`native-ci / verify`も失敗である。これは修正後Workflowの成功実績ではない。
- Android Workflowは`ANDROID_SDK_ROOT`→`ANDROID_HOME`→`/usr/local/lib/android/sdk`の順でSDK Rootを解決し、`cmdline-tools`からsdkmanager絶対Pathを取得して、`ANDROID_HOME`／`ANDROID_SDK_ROOT`／PATHを後続Stepへ渡す。BuildはDebugではなくAutomation Release APKを使用し、OS boot完了とpackage service準備をTimeout付きで待つ。
- Native変更検知は共有Application／Domain／Seed／Config／Design Token／Generated／Manifest／Asset生成／Production Guardを含み、最終VerifyはDetect JobのResult、Native変更Output、Static／Production／AndroidのResultをFail-safeに確認する。
- Native RuntimeのPresentation公開型は前半対応MethodだけのFacade（Catalog: Home／Search／Detail／Category、Cart: Get／Add／Update／Remove）とし、`suggest`、`listReviews`、`acceptPriceChanges`を公開しない。Native SQLiteのGuest閲覧制限商品は`PERMISSION_DENIED`、不存在は`null`とする。
- Test Control ResetはSQLite Seed commit後にNative Control KV削除、Seed Identity復元、Clock、Payment Delayを更新する。Seed失敗時にKV／Identity／Clock／Delayを変更せず、Error Signalだけを通知する。
- Native Cartはload／mutation開始時にErrorをクリアし、Mutation中はCart全明細の数量変更／削除Buttonを無効にする。Component Testで再試行復旧と全Button無効化を固定する。
- MaestroはRestart Persistence、Dirty State Reset、Out-of-stock、Low-stock、Purchase Limitを独立Flowとして追加し、Screenshotは専用`--test-output-dir`へ収集する。iOS Workflowはmanual-onlyのRelease Simulator Buildへ揃える。
- 上記修正後WorkflowのGitHub Actions再実行、Windows Android Emulator、macOS iOS Simulator、実`expo-sqlite`証跡は、Commit／Push禁止またはToolchain不在のため未実施である。

## PR #8 Native CI再失敗修正（2026-08-03）

- 最新確認Runは`30780990538`。SDK解決／Installは成功したが、`Verify Android toolchain`で`emulator -version`が`libpulse.so.0`不足となり、Evidenceの旧`adb logcat -d`が接続待ちのままRunner shutdownまで停止した。
- `.github/workflows/native-ci.yml`は`libpulse0`を導入し、`ADB`／`EMULATOR`／`AVDMANAGER`／`APK_PATH`をSDK Rootから絶対Pathで解決して`GITHUB_ENV`へ保存する。SDK Path／adb／avdmanager／emulator診断を分割し、後続のAVD／Emulator／ADB／APK操作も絶対Pathへ統一する。
- Release APKは`APK_PATH`に集約し、Gradle出力を`gradle-assemble-release.log`へ保存する。EvidenceはADB Device確認、`logcat`のTimeout、Emulator／APK／JUnit／Maestro専用Artifactの存在分岐と3分Step Timeoutを持つ。Job Timeoutは50分とする。
- Native Product Detailは未選択時に`Variationを選択すると在庫を確認できます。`を表示し、在庫0／在庫ありを選択後だけ表示する。Out-of-stock Variationは選択できるがAddはdisabledとし、CartのLow-stock／Purchase-limit上限は同じdisabled／案内契約を使う。
- Native Runtimeは初期化Reject時に保持Promiseを解除し、Providerは同時初期化を防ぎながら再試行できる。実GitHub Actions再実行、Windows Android Emulator、macOS iOS Simulator、実`expo-sqlite`は未確認である。

## PR #8 Native CI処理順序・Runtime Cleanup修正（2026-08-03）

- 最新確認Runは`30785304641`（Commit `be27f8ff5b9ec5395cb9ce4e6a1f56a61cc2f8e3`）。Detect／Native Static／Production Bundle Guard／Android runtime dependencies／Expo Prebuild／Evidenceは成功したが、`Resolve Android SDK and sdkmanager`でSDK Component導入前の`ADB`／`EMULATOR`／`AVDMANAGER`存在確認が終了コード1となり、Install以降は未実施だった。
- Android ResolveはSDK Root、cmdline-tools、sdkmanagerの確認とPath生成／`GITHUB_ENV`／`GITHUB_PATH`保存だけを担当し、`ADB`／`EMULATOR`／`AVDMANAGER`の実在確認は`Install Android SDK components`後の`Verify Android SDK paths`へ限定する。Contract TestでResolve→Install→Verify paths→Verify adb→Verify avdmanager→Inspect emulator→Buildの順序と、Resolve内にTool検証がないことを固定する。
- Native RuntimeはDatabaseを開いた後の初期化処理を専用private helperで囲み、途中失敗時だけ`database.closeAsync()`を1回試行する。Cleanup失敗は握り潰して元の初期化Errorを再送出し、正常に返すRuntimeのDatabaseは閉じない。Jestで失敗／成功／Cleanup失敗の3契約を検証する。
- ローカルのformat／lint／typecheck／全Test／Native Contract／Repository／Asset／Security／Route／EAS static／Production Bundle／Web Build／Chromium／A11y／Mobile boundary／Expo Doctorは成功した。EAS Cloud、Commit／Push、修正後GitHub Actions、Windows Android実Native、macOS iOS実Native、実`expo-sqlite`は未実施のまま分離して扱う。

## PR #8 AVD永続化・PBKDF2契約修正（2026-08-03）

- 最新確認Headは`50411a63e643000a024d929b8869b240936ef56e`、Native CI Runは`30787501472`。SDK導入、APK生成、Bundle確認までは成功したが、Android Emulator Stepで`avdmanager create avd`がCustom hardware profile入力待ちになり、終了コード124で停止した。APK／SDK破損ではない。
- Android Workflowは`ANDROID_AVD_HOME=$RUNNER_TEMP/android-avd`を明示して作成・exportし、`avdmanager -p "$ANDROID_AVD_HOME/native-api34.avd"`、API 34／`google_apis;x86_64`、固定device profileを使う。作成後のAVDファイル列挙と`emulator -list-avds`の`native-api34`完全一致を起動前に要求する。
- EmulatorはPIDを保存し、ADB待機、`sys.boot_completed=1`、SDK／ABI確認、package service待機を分離し、各待機中にプロセス早期終了を検出する。失敗時もAVD home、AVD list、AVD files、emulator.log、ADB／boot／dumpsys／logcat／APK／Maestro／Signal証跡を回収する。
- Native Contract Harnessは専用DBのseed userから`password_hash`を取得し、`NativePbkdf2PasswordHasher`で`testpass1`の正誤、Unicode passwordの正誤を検証する。Application DB不変確認→PBKDF2→DB／KV cleanupの完了後にのみ`Native contract passed`を通知し、結果へ`checks.passwordHashing`を含める。password／hash値はログへ出さない。
- 今回のローカル検証ではUnit 13/66、Integration 9/91、Repository 5/28、Web Component 11/76、Native Jest 7/15、Contract 17/84、Chromium 27、A11y 4、Mobile boundary 4、Expo Doctor 17/17、静的Guard／Web Buildが成功した。Lintは0 errors／64 warnings。
- 修正後のGitHub Actions Run、Android SDK／adb／Emulator／Maestroによる実操作、iOS Simulator、実`expo-sqlite`は未実施である。EAS Cloud、Commit、Push、PR更新、`android/`／`ios/`のRepository追加は行わない。

## PR #8 CI復旧・Android CI高速化（2026-08-03）

- 最新確認Runは`30795820475`（Head `17d9d538a27058dcf81893d4d6f118cf36d52abf`）。Native Static／Production Bundle Guard／APK生成／Emulator起動／Evidence uploadは成功し、Android Jobは旧Workflowの`Install and launch APK`で`pidof`待機がexit 124となった。`native-ci / verify`はAndroid結果を受けて失敗し、Maestroは未実行である。Artifact `native-android-evidence-30795820475`（ID `8849743993`）のlogcatで、`NativeAutomationBridge`→`NativeTestControlRuntimeBridge`→`NativeAppRuntimeProvider`中の`RangeError: Maximum call stack size exceeded`を確認した。
- 原因はMetroのAndroid platform resolutionで`src/test-controls/native-signals.native.ts`から`./native-signals`を読み込む自己参照である。`native-signal-names.ts`へ定数／型を分離し、native／web双方がそこだけを参照する構造へ修正した。Native Jestの直接signal emission回帰Testと、native moduleが自己参照しないContract Testを追加した。
- Android Workflowは`android.needs: [detect]`としてNative Staticと並列化し、Production Bundle Guardは`[detect, static]`、最終Verifyは`[detect, static, production-bundle-guard, android]`を維持する。Gradle cache、条件付き`libpulse0`／SDK component導入、`prebuild --no-install`、x86_64専用Release APK、APK／ABI検査、Maestro cache、2つの責務別JUnit実行、成功時軽量／失敗時詳細Evidenceを定義した。AVD snapshot cacheは実測がないため採用せず、`-no-snapshot`を維持する。
- ローカルのformat／型チェック／Lint／Native Jest 8 suites・16 tests／今回のWorkflow・signal Contract 11 testsは成功した。VitestでNative Jest対象を直接起動する方法はReact Native Flow構文を扱えないため使用せず、`jest.config.cjs`を正式入口とする。既存Lint warningとReact `act` warningは残存するがerrorはない。
- 修正後WorkflowのGitHub Actions Run、Android Emulator／Maestro／Harness実証、WindowsローカルAndroid toolchain、macOS iOS toolchain、実`expo-sqlite`は未確認である。Commit／Push／PR更新／EAS Cloud実行は行わない。

## PR #8 Maestro CLI／Application Launch／Signal修正（2026-08-03）

- 最新確認Runは`30811624722`（HEAD `5fc9c14c7dc2975b6516e6fd2331cd1c7e0cc5b5`）。Native Static、Production Bundle Guard、Gradle Release APK、Emulator、APK Install、Application Launch、Evidence uploadはsuccessだったが、Cache Miss後の`Install pinned Maestro CLI`が旧`MAESTRO_VERSION=1.39.15`のURL HTTP 404／curl exit 22で失敗し、Maestro 2 Groupはskip、`native-ci / verify`はfail-closeした。
- GitHub公式Release APIと実Assetで、採用する固定Releaseを`cli-2.8.0`／`maestro.zip`、URLを`https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip`、HTTP 200と確認した。zipの実展開構造は`maestro/bin/maestro`のため、WorkflowのCache Hit検証、`--version`、PATHをその構造へ合わせた。Version／URL／Cache SchemaはWorkflow envへ集約し、Cache keyはOS／Version／Schema単位で分離する。
- Application Launchは`PACKAGE_ID`を共通化し、PID出現を最大60秒待ち、出現後6回・2秒間隔で10秒以上の継続稼働を確認する。Logcatは`Process: <package>`または`ReactNativeJS`に絞り、Fatal Exception、JavaScript Exception、Stack Overflow、Metro接続／Scriptロード失敗を検知する。
- Evidenceの正式Signal regexは`test-runtime-(ready|error)|native-contract-(running|passed|failed)`である。旧`native-test-runtime-ready`前提はContract Testで拒否する。
- ローカルのFormat／Lint（0 errors／64 warnings）／Typecheck／Native Component 8 suites・16 tests／Repository 5 files・28 tests／Contract 18 files・86 tests／Route 38／Production Bundle Guard／Workflow Bash構文は成功した。WindowsのJava／Android SDK／adb／Emulator不在により、ローカルMaestro`--version`、実APK操作、Maestro 10 Flowは未確認である。
- 修正後Remote Cache Miss／Hit、Maestro全Flow、Harness Signal、Evidence、`native-ci / verify`、Native CI全体時間は未確認である。Commit／Push／PR本文更新／EAS Cloud実行は行わない。

## PR #8 Native Test Control起動競合・受入テスト修正（2026-08-04）

- Native Runtimeの画面状態は`src/presentation/native/native-test-runtime-status.ts`の`NativeTestRuntimeStatus`と`RUNTIME_STATUS_LABELS`を正本とし、`booting`／`listening`／`resetting`／`ready`／`error`の固定文字列を使う。既存のService Signal（ready／error／contract）は診断・Contract互換性のため維持する。
- `NativeTestControlBridge`は`Linking.addEventListener("url", ...)`登録後に直接Callbackで`listening`を通知し、その後`Linking.getInitialURL()`を確認する。valid URLだけを処理中Setで排他し、Reset成功後に`router.replace()`、`ready`通知、失敗時`error`通知を行う。Unmount後はStatus／Navigationを更新しない。同一URLは処理完了後に再実行可能である。
- `NativeAutomationBridge`はDeviceEventEmitterのlistener登録順に依存せず、Bridge Callbackを直接画面へ接続する。Production disabled entryは従来どおりTest Control／Harnessをimportしない。
- Nativeの主要Maestro 10 FlowはCold Start後に`launchApp`、`Scenario Shop`、`Native test runtime listening`待機、Reset `openLink`、`Native test runtime ready`待機の順序を持つ。固定Sleepや単純なtimeout延長は追加しない。`native-reset-dirty-state`の2回目Resetは既存listenerを使い、ready待機を維持する。検索入力の確認は別Flowの`native-search.yaml`で行う。
- iOS Manual WorkflowはFlow実行前の`xcrun simctl openurl`を削除し、Reset責務をMaestroへ統一した。Maestro CLIは確認済みのcli-2.8.0／`maestro.zip`／nested `maestro/bin/maestro`へ固定する。
- Bridge Component Testは9 tests、Maestro／iOS／Production境界Contractを追加した。実Nativeで古い画面Stateが観測されていないため、`dataRevision`／`resetGeneration`は未追加である。
- 2026-08-04のローカル検証はformat／lint（0 errors・64 warnings）／typecheck、Unit 66、Integration 91、Repository 28、Web Component 76、Native Jest 25、Contract 100、Route 38、Image／EAS static／Production Bundle、`test`、`build:web`、`verify`、Android `expo prebuild --no-install`が成功した。Java／Android SDK／adb／Emulator／Maestro／Xcode／Simulatorは未導入のため、実Android／iOS操作とRemote CIは未確認である。

## PR #8 Native実機・Maestro再検証（2026-08-06）

- Windows実機検証の正式rootは、リポジトリを指すNTFS Junction `C:\q` とする。Maestro 2.8.0、Android API 30の物理Android端末を使用する。端末SerialはRun Artifactや文書へ保存しない。
- `scripts/native/windows/android-local.ps1` はPowerShell `$Args`衝突、production install時のdevDependency prune、Smokeの自動変数`$PID`衝突を修正済み。Prepare／Build／Install／Smoke／Controlは正式経路でPASSした。
- Native StatusはSafe Area内の単一accessible Textへ修正し、CIの`Native test runtime listening`可視性失敗を実画面／Hierarchy／logcatと照合した。Expo patch versionsはCI期待値へ揃え、`expo install --check`はPASSした。
- Maestro Flowは固定表示textではなくNative testIDを優先する。商品詳細は長い画像のためvariant／add controlを`scrollUntilVisible`で先に可視化する。既知商品の主要Storefront／Cart／Persistence FlowはProduct Deep Linkを使い、検索入力は`native-search.yaml`へ分離する。
- SHV48の既定日本語IMEではformal Maestro CLIの`inputText`がASCII検索語を入力できず、`MaestroInputMethodService`もCLI経路では入力値を保持しない。検索専用FlowだけをLatinIME等の制御された入力方式で実行し、検証後は元のIMEと有効IME一覧へ復元する。Maestro MCP経由の同一端末Flowはformal CLIの代替成功根拠にしない。
- `NativeCatalogScreen`には入力途中の非同期検索の古いレスポンス後勝ちを防ぐrequest serial guardを追加した。これはIME失敗の直接原因ではないが、keyword変更ごとの検索競合を防ぐ防御的修正である。
- 2026-08-06初回実機結果はRuntime Suite 3/5で、Storefront／Cartの商品カード未検出によりBoundary Suiteを停止した。2026-08-07にDeep Link化後の同じAPKを標準日本語IMEで再検証し、公式単体Gate 1/1、Runtime Suite 5/5、Boundary Suite 5/5を確認した。検索専用FlowはLatinIME条件で1/1を確認し、標準日本語IMEでは成功扱いにしない。主要FlowはDeep Link、検索入力は独立Flowへ分離する。更新後Remote CIは未確認であり、GitHub Actions再実行、`gh` CLI formal check、commit／push／PR更新は行わない。
- Web主要回帰27/27、Accessibility 4/4、mobile-chromium boundary 4/4、Web Build、Production Bundle GuardはPASSした。全体Unit／Integration／Repository／Web Component／Native Component／Contractとtypecheckも、repo設定を変えずに`node_modules/.pnpm-local`へ依存を再解決した正式コマンドでPASSした。Expo Doctorはphysical rootで16/17、package checkのnpm config warningを残す。`verify`は生成物を含むformat check 294件で停止したため、生成物を一括整形しない。
- Maestro MCPの`list_devices`は同一端末を返すが、長時間のformal CLI後の`inspect_screen`はDevice server `UNAVAILABLE`となる場合がある。再起動直後に取得したMCP証跡と、最終判定用のformal CLI JUnit／Maestro artifactを分けて扱う。端末Serialは記録しない。
- `.prettierignore`は`.artifacts`、`android`、`.expo-local-export`を含む生成物を対象外とする。追加後の`pnpm run format:check`と`pnpm run verify`はPASSした。Expo Doctorのpackage checkに残るlocal npm config warningと、MCP Device serverの再起動要否は環境固有の未完了事項として扱う。
- 人が確認・共有するモバイルネイティブのスクリーンショット、比較画像、選定した画面証跡は`output/mobile-native/`へ保存し、リポジトリ直下へ置かない。同一シナリオの再取得時はRun IDまたはJST timestampを名前へ含めて上書きを避ける。Maestro／ADB／Gradleの実行機械証跡は従来どおり`.artifacts/native-local/<timestamp>/`へ保存する。この運用の正本は[`docs/native/windows-android-local-validation.md`](./native/windows-android-local-validation.md)の7.2節とする。

## Windows Android Build復旧手順の補足（2026-08-07）

- 2026-08-06のPR #9修正後実機検証では、最初のRelease Buildで`react-native-nitro-modules`のCMake／Ninjaが`build.ninja`の`still dirty after 100 tries`で失敗した。`C:\v\qts`を使う設定へ切り替えた後も、`node_modules/.modules.yaml`、Package Link、生成済みAutolinkingに以前の`.pnpm-local`参照が残っていたことが観測された。
- `Prepare`だけでは古い参照が残る場合がある。復旧時は、Runbook 4.3に従い、`pnpm install --frozen-lockfile --virtual-store-dir=C:/v/qts`で再リンクし、`pnpm exec expo prebuild --clean --platform android --no-install`で生成Android／Autolinkingを再作成してからBuildする。`gradlew clean`／`-CleanNative`を最初の対処にしない。
- 上記の再生成後、最終Release Build、APK検査、Install、Smoke、`native-test-control.yaml`は成功した。Runtime Suiteは5 Flow中3成功／2失敗で、商品カードSelector未検出のため停止し、Boundary Suiteは実行していない。Build成功だけでNative検証全体をPASSと扱わない。
- 今後の標準入口は`C:\q`、Virtual Storeは`C:\v\qts`とし、古い`.pnpm-local`参照の確認・復旧手順は[`docs/native/windows-android-local-validation.md`](./native/windows-android-local-validation.md)の4.3節、症状別の説明は[`docs/native/windows-android-troubleshooting.md`](./native/windows-android-troubleshooting.md)の9節を正本とする。生成Android、APK、ログ、端末固有情報はRepositoryへ追加しない。
- 2026-08-07の変更後Release Buildでは、Native `.so` コピー中の`MergeNativeLibsTask`／`copyReleaseJniLibsProjectOnly`が、システムドライブの空き約28MBで失敗した。`.pnpm-local`残留や古いAutolinking参照は見つからなかったため、コードではなく`ENVIRONMENT_FAILURE`（既存Runの細分類: `SETUP_FAILURE`）と分類する。今後はBuild前に10GB以上の空きを確認し、容量確保後の同一Build再実行は1回に限定し、Cache／Virtual Storeの整理はユーザー確認後に行う。

## Native Maestro入力経路分離（2026-08-07）

- 既知商品の主要Storefront／Cart／Persistence／Reset Flowは`scenario-shop://products/product-basic-shirt`のProduct Deep Linkで商品詳細へ入り、物理端末のIMEへ依存させない。商品詳細の長い画像下にある固定表示TextをDeep Link直後にassertせず、商品詳細画面、variant、カート操作のNative testIDを検証する。
- 検索入力の`P-0001`、`native-product-card-product-basic-shirt`検出、カードタップ後の`native-product-detail-screen`確認は[`maestro/native-search.yaml`](../maestro/native-search.yaml)へ分離する。Android／iOS CIでも独立Stepとして実行し、JUnitと実行成果物を保存する。検索専用Flowは主要Runtime／Boundary Suiteの分母に含めない。
- 物理端末の標準日本語IMEで検索入力が保持されない場合は成功扱いにしない。LatinIME等を一時的に選択して検索専用Flowを実行し、終了後に元のIMEと有効IME一覧を復元する。詳細はRunbookのGate 2.5、Troubleshooting 7.1、ADR-0007を参照する。
- 2026-08-07のローカル結果は、標準日本語IMEでControl 1/1、Runtime 5/5、Boundary 5/5、LatinIME条件の検索・カードタップ・詳細確認Flow 1/1、全体typecheck PASSである。Remote CIは未実行である。

## 品質ゲートエラーの影響調査方針（2026-08-07）

- 品質ゲートで発生したエラーは、依頼やPRの直接変更範囲外に見えても、Baseline、変更差分、共有依存、CI／テスト契約、実行環境との因果を調査する。「既存エラー」「範囲外」というラベルだけで保留しない。
- 現在の変更が原因である、または現在の変更を正しく検証するために不可欠なエラーは、型注釈、回帰テスト、契約、文書を含めて最小修正し、関連ゲートを再実行する。安全に修正できることだけでは、現在のPRへ追加する根拠にならない。
- 現在の差分と因果関係がなく、独立して修正可能な問題は、別PRまたはユーザー承認後の対応候補としてRun Artifactへ記録する。真に無関係、環境依存、unsafe、要件判断が必要なものだけをbounded Repair Loopの`defer`／`needs_human`として残し、根拠、因果関係の評価、未実行検証、次アクションをRun Artifactと利用者向け報告へ記録する。今回の6件のimplicit-anyは、Native/PR変更の型検証を阻害していたため前者として修正した。

## Native永続化Flowの個別証跡とhydration境界（2026-08-07）

- Android CIのPersistence／Boundaryは、`native-restart-persistence.yaml`、`native-reset-dirty-state.yaml`、`native-out-of-stock.yaml`、`native-low-stock.yaml`、`native-purchase-limit.yaml`を個別Stepで実行する。各Stepは固有の`$RUNNER_TEMP/maestro-artifacts/<flow-name>/`、JUnit、Screenshot、Hierarchy、Maestro Outputを持ち、最初の失敗後も証跡収集Stepを実行する。
- `NativeCartScreen`はCart Repositoryの`getCart()`完了後に`native-persisted-state-ready`を表示し、Cart合計数量を`native-cart-badge-count`へ出す。商品・variant由来の`native-cart-item-<productId>-<variantId>`、`native-cart-quantity-<productId>-<variantId>`をMaestroの安定selectorとし、ランダムなcart item IDや画面上の汎用数量文字列に依存しない。
- `native-restart-persistence.yaml`は初回だけ`clearState: true`で起動し、add前／add後／stop前／再起動後／hydration後／Cart画面／最終確認のcheckpointを保存する。再起動後はStorageを保持したままbadge、商品、quantityのIDと値を再確認する。
- 下位契約ではNative SQLite Repositoryでadd後に新しいRepositoryインスタンスを作成してCartを読み戻し、product ID、variant ID、quantityが復元されることを確認する。UI側のhydration表示は別component testで確認する。

## Native永続化Flowの実機再検証追補（2026-08-07）

- ユーザーの容量確保後、Release Build、Install、Smoke、Maestro Control、Runtime Suite 5/5、Persistence／Boundaryの個別5/5、標準Boundary Suite 5/5を再実行し、すべて成功した。Build前に空き容量を確認し、容量不足時の自動cleanupは行わない。
- 最初の修正APKでRuntime Suiteの`native-storefront`／`native-cart`が、追加成功メッセージの画面外配置により文字列`extendedWaitUntil`で失敗した。Hierarchyには要素が存在したため、画面遷移や永続化の失敗とは分類しなかった。
- 追加成功メッセージへ`native-cart-add-message`を付け、Maestroで`scrollUntilVisible`後にassertし、Cart遷移前に`native-go-cart`を上方向へ再表示する最小修正を行った。修正後Runtime／Persistence／Boundaryは全て成功した。
- `pnpm run verify`はformat、lint（0 errors／64 warnings）、typecheck、security、Unit 66、Integration 91、Repository 28、Web Component 76、Native Jest 27、Contract 121、Web Buildを含めexit 0となった。警告とReact `act` console warningは既存契約として残る。
- Remote CIの再実行、commit、push、PR更新は行っていない。実行ごとのAPK、Maestro、ADB、Hierarchy、logcatは`.artifacts/native-local/<timestamp>/`へ保存し、Repositoryへ追加しない。

## ローカルビルド失敗の振り返りと再発防止（2026-08-07）

- 過去の失敗は、PowerShell／wrapper引数衝突、生成物を含むformat範囲、isolated依存解決、型検査、Native Jest worker競合、Virtual Store由来の古いCMake／Ninja参照、ホスト容量不足、IME入力経路、非同期検索、画面外要素のMaestro可視性に分かれる。最終行の`BUILD FAILED`、APK不存在、Install／Maestro停止は、上流失敗から生じた派生エラーとして扱う。詳細な時系列は[`docs/history/2026-08-07_local-build-failure-prevention.md`](./history/2026-08-07_local-build-failure-prevention.md)に保存する。
- Build／Install／Test／Maestroの前に、直近RunのREPORT、関連生ログ、変更差分、Shell／Version／環境変数、APKと成功条件を確認し、Runbook 5.1.1のpreflightを同じShellで実行する。Java／Gradle、SDK／Build Tools、ADB、容量、appId／Profile、CIとの差異が不明な場合は開始しない。
- 再実行は、目的、観測事実、最有力仮説、根拠、変更する一つの条件、成功条件、失敗時の次情報を記録してから行う。同一エラー2回連続、同じ工程3回失敗、最初のエラー不変、新しいログなし、仮説なしの場合は再試行を止め、原因調査へ戻る。Cache削除、Daemon停止、Timeout延長、Assertion削除、Flow skipだけで成功扱いにしない。
- 生ログは`.artifacts/native-local/<attempt-id>/`へ保存し、実行ごとに一意なattempt-idを使う。Run Artifactには要約と相対参照だけを記載し、RunIdの再利用による失敗ログ上書きを避ける。runnerのattempt分離やBuild容量preflight自動化は、別Strictのharness improvement candidateとして扱う。
- 成功ベースラインは、preflight後の正式wrapperによるRelease APK生成、APK／ABI確認、Install、Smoke、Control、Runtime 5/5、Boundary 5/5、検索専用Flowの制御IME条件PASS、`pnpm run verify` exit 0である。Remote CIの修正後結果は未確認であり、ローカル成功をCI成功とは記録しない。

## Codex Run ArtifactのPath Sanitization（2026-08-06）

- Run Artifactへ個人PC固有のローカル絶対Pathを保存しない。共通実装は`scripts/lib/codex-artifact-sanitizer.ps1`、CLI入口は`scripts/sanitize-codex-artifacts.ps1`とする。
- Repository、Android SDK、Java、pnpm virtual store、Maestro、Temp、User HomeをContextへ登録し、Windowsの大文字小文字、`\\`／`/`、JSON escaped backslash、file URI、末尾separatorを同一PathのVariantとして置換する。置換Tokenは`<REPO_ROOT>`などの安定した表記を使う。
- `codex-task.ps1`はLog／Report／Manifest／Evaluationの書込み前にsanitized Valueを通し、Run終了時にWrite＋Checkをfinallyで実行する。CIはFixture Testと変更された`.codex/runs/**`のCheck-onlyを実行する。
- 対象は`.md`、`.json`、`.jsonl`、`.txt`だけとし、Binaryは変更しない。Residual検査はfail-closedであり、過去Runは一括書換えせずCheck-onlyで状態を確認する。Secret Redactionは別責務である。

## Markdown品質ゲート（2026-08-08）

- 通常のMarkdown文書は、リポジトリ直下の`.markdownlint-cli2.jsonc`を設定正本として`pnpm run lint:markdown`で検査する。`.codex/runs/**`、依存・生成物ディレクトリは対象外とする。
- `pnpm run verify`とPhase 1 CIの`quality` jobは同じ`pnpm run lint:markdown`を実行する。Prettierが対象外とするMarkdownの構造品質を、Markdownlintで別の品質ゲートとして扱う。
- `.codex/templates/*.md`をRun Artifactの生成元としてMD022／MD029を満たす状態に保つ。過去の`.codex/runs/**`は一括整形・一括Lint・見出し日本語化を行わず、既存の機械契約とPath Sanitizationを維持する。

## CI並列Workflow最適化（2026-08-08）

- Phase 1 CIの`quality` jobは`style-quality`（format:check / lint:markdown）と`code-quality`（lint / typecheck / validate:image-manifest / security:check）へ2分割し、`verify`は両方の`needs.*.result == success`を要求する。Deployment（verify→deploy-preview→validate→deploy-production）の境界は維持する。
- Native CIは`detect`後、`native-static`／`production-bundle-guard`／`android-automation-build`／`android-production-build`を独立実行し、`android-runtime`が成功したBuildのArtifactだけを条件付きでDownload／Installする。最終`verify`（表示名`native-ci / verify`）はAutomation／Production Build、Android Runtime、iOS Gateの必須結果をfail-closeで確認する。Guardは`validate:native-production-bundle.ts`が`expo export`を自己完結実行するためStatic非依存で、Detect後のみに依存して並列化する。
- Android ArtifactはAutomationを`native-android-apk-${{ github.run_id }}`／`native-automation.apk`、Production-validationを`native-android-production-apk-${{ github.run_id }}`／`native-production-validation.apk`として、Gradle出力→保存名→Upload→Download後のverify／install pathを同一契約に固定する。Maestro Runtime/Smoke各FlowはBuild／Emulator／CLI／対象APKの成功条件を個別に持ち、前Flowの失敗で後続を止めない。
- Native未変更PRではNative固有jobをskipし、final `verify`は`detect`の`native_changed`出力を正本に、trueなら全Job success必須（fail-closed）、falseなら全skipを成功扱いとする。
- 構造契約は`tests/contracts/ci-workflow.test.ts`／`tests/contracts/native-ci-workflow.test.ts`に固定し、`tests/contracts/native-test-control-maestro.test.ts`はCRLF checkout環境でも契約検証できるよう読み取り時にLFへ正規化する（maestro・workflowファイルは`* text=auto`＋Windows autocrlfでCRLFになるため）。

## Phase 2後半 Native Customer購入自動化（2026-08-08）

- Native Customerの対象をLogin／Session、Profile／Address、Guest Cart統合、Checkout／Mock Payment、Order、Reviewへ拡張した。Native Admin、Guest Checkout、返金・キャンセル等は引き続き対象外である。
- Native SQLite Schema Versionを2へ更新し、住所、Checkout Session、Order／Item、Payment、Shipment、Status History、Review／Review Historyを追加した。FK、`foreign_key_check`、共有Application transaction scope、commit後返却、ロック時のfail-closeをNative repository adapterへ実装した。
- Native Composition Rootは共有Auth／Account／Cart／Checkout／Review Use Caseへ実SQLite repository、PBKDF2、Native KV、Address Lookup、Mock Payment Gatewayを注入する。Catalogはcustomer viewerを許可するが、Admin capabilityは公開しない。
- Test Control Scenarioは購入系Scenarioを受理し、`native-purchase.yaml` と `native-review.yaml` をAndroid Runtime経路へ接続した。共通Maestro FlowはiOS互換性のため保持するが、iOS正式GateはBuild-onlyである。Production validationではAutomation Markerを許可せず、Test Control／Harnessを公開しない。
- iOS Workflowは`workflow_call`／manual dispatch、`ios-automation-build`／`ios-production-build`の独立したunsigned Release `iphonesimulator` Build、Build-time metadata／Production guard、生成`.app` Artifact保存／Uploadへ分離し、iOS Build GateとしてNative CI final verifyへ接続した。iOS物理端末、署名、EAS Cloudは対象外である。
- Node `node:sqlite`による共有Contract／Application Flowは実行済みだが、これはAndroid／iOS実`expo-sqlite`の代替ではない。WindowsでのiOS実行とRemote CIは、各Runの実行結果が得られるまで未確認として扱う。
- 2026-08-08のWindows Android Runでは、今回の変更を含むAutomation Release APKのBuild／Install／Smoke、Control 1/1、既存Runtime 5/5、Boundary 5/5、Customer Purchase 1/1、Review 1/1を確認した。これはAndroid実`expo-sqlite`の証跡であり、iOS実Runtime／Remote CIの成功を意味しない。
- 最終自己レビューでは、Native SQLite v1→v2の加算的migration（既存Customer data保持）、Native loginのreturnTo allowlist、非customer Roleのshell隔離、SQLite lock errorのApplicationError変換を追加し、CIのProduction APK実体検証とPurchase／Checkout restartのMaestro assertionを修正した。Unknown schema versionは引き続きfail-closeする。
- 最新ソースのAndroid実機証跡は、Automation Build `20260808-220000-android-current-automation-build`、Purchase／Payment retry／Checkout restart／Review各1/1、Runtime／Boundary各5/5、Production targeted Build `20260808-221600-android-current-production-targeted`、Production-validation `20260808-222200-android-current-production-validation`である。Production bundleはAutomation／Harness／TestControl marker 0件を確認した。
- Windowsでは`xcodebuild`／`xcrun`／`simctl`／`gh`が未提供で、iOS Simulator RuntimeとGitHub-hosted Remote CIは未実行である。iOS Workflowの静的契約は検証済みだが、実行結果がないためPhase 2 final DoDは未完了として扱う。`format:check`は未変更Baseline 2ファイルのみ継続警告である。

## 2026-08-08 Phase 2 Postfix／現行検証

- `native-purchase.yaml`はGuest Cart追加→Cart数量1→Login→会員Cart統合後数量2→Checkout成功を同一Flowで確認する。Android実機の変更後APKでPurchase、Payment retry、Checkout restart、Review、Runtime／Boundaryを再実行し、すべて成功した。
- `NativeShell`はAppStateのforeground復帰時にAuth Sessionを再読込する。Native LoginのCheckout fallbackは`CHECKOUT_STEP_INCOMPLETE`、`CHECKOUT_EXPIRED`、`CART_VERSION_CHANGED`だけを既知状態として扱い、Storage等の予期しないErrorは表示する。Profile読み込みErrorはRetry可能なStateを表示する。
- Native Detectは共有`src/presentation/return-to.ts`、normalizer、static address lookup、Mock Payment Gatewayを含む。iOS WorkflowはAutomation／Productionを独立Build Jobで生成し、Resolved Expo Metadata、生成`.app`内`EXConstants.bundle/app.config`、Production marker guard、固定名Artifactを検査／保存する。iOS Runtime Flowは正式Gateに含めない。
- 変更後ローカル検証は、Focused Contract／Component／Typecheck／PrettierとAndroid実機で成功した。WindowsではXcode／Simulator／GitHub CLIがないため、iOS実`expo-sqlite`、Remote Native CI、最新Headの`native-ci / verify`は未実行である。静的PASSを実Runtime／Remote PASSへ繰り上げず、Phase 2 final DoDはpendingとする。

## Phase 2後半 最終自己レビュー追補（2026-08-09）

- Native SQLite mapperとCustomer Application Repositoryは、文字列・nullable値・整数・Boolean・Enum・履歴・集計値をRuntime parser経由でDomainへ渡す。列欠落や不正Enum／数値はnullableの明示的`null`以外を含めてfail-closeする。
- Native Customer Transaction RunnerはCustomer Scope allowlistをRuntimeで確認し、Customer-only Repository Setへ型付きのfail-closed Admin placeholderを置く。Admin Scopeはtransaction開始前にNative unsupportedとして拒否し、型アサーションでCapability境界を逃がさない。
- Native Purchase画面のLogin復帰、ApplicationError判定、Review ratingの型アサーションを除去した。現行ソースの型check／強制変換scanと、Unit 65、Integration 95、Repository 31、Web Component 76、Native Component 38、Contract 158の全TestはPASSした。
- iOS Workflow／Native CIの静的監査では、Automation／Production unsigned Release `iphonesimulator` Artifact、Build／Runtime分離、選択SimulatorへのMaestro明示渡し、Production-validation、`simctl diagnose`、Native変更なし時のSkip、最終fail-closeを確認した。WindowsではiOS実RuntimeとGitHub-hosted Remote CIが未実行であり、Phase 2 final DoDはpendingである。
- `pnpm run format:check`／`pnpm run verify`は未変更Baselineの`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`でFAILした。今回の変更範囲との因果は確認できず、別対応候補としてRun Artifactへ記録している。

## 2026-08-09 Phase 2 Self-review Repair

- Android Native CIのProduction-validationは、Production `assembleRelease`の明示的な`android/app/build/outputs/apk/release/app-release.apk`をRuntime用Artifact Pathへcopyしてから、同じPathをverify／Uploadする。Production buildの出力とRuntime消費物の取り違えをContract Testで固定する。
- Native ShellはSession／Role解決が完了するまでCustomer childrenとNavigationを表示せず、非Customer Roleには対象外PanelとLogoutだけを表示する。AccountのProfile read／writeもCustomer専用として扱う。
- 修正後の全TestはUnit 65、Integration 95、Repository 31、Web Component 76、Native Component 34、Contract 154がPASSし、Typecheck、Lint（0 errors／63 warnings）、対象Prettier、MarkdownlintもPASSした。WindowsでのiOS実Runtime／Remote CI未実行により、Phase 2 final DoDは引き続きpendingである。

## 2026-08-09 Phase 2 Runtime Regression Repair

- Iteration 6ではNative Login成功時の非Customer Role分岐を`returnTo`付きCheckout復帰より先に判定し、Customerだけが既存のCheckout recoveryへ進むようにした。Iteration 7ではiOS Runtime EvidenceへXcode／Simulator Runtime／Device／Installed Appの記録契約を追加した。
- Iteration 5のRole boundary実装で、NativeShellがpathname変更ごとに`currentUserLoaded=false`へ戻して`Slot`をアンマウントしていた。これによりAndroid RuntimeでHarness、Category、Cartへの遷移後にHomeへ戻る回帰が発生したため、初回Session解決中だけCustomer childrenを抑止し、遷移中はSlotを保持してSessionをバックグラウンド再取得するよう修正した。pathname遷移中のroute保持をComponent Testで固定した。
- 修正後の全TestはUnit 65、Integration 95、Repository 31、Web Component 76、Native Component 36、Contract 155がPASSした。Typecheck、Lint（0 errors／63 warnings）、対象PrettierもPASSした。Android実機ではIteration 8のBuild／Install／Smoke／Test Control 1/1、Runtime 5/5、Boundary 5/5を確認した。
- Android Runtimeの完全証跡は`.artifacts/native-local/20260809-013000-android-iteration8-*/`へ保存した。`format:check`／`verify`の残存FAILは未変更Baselineの`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`に限定され、iOS実Runtime／Remote CI／最新HeadのRemote `native-ci / verify`は引き続き未実行である。

## Phase 2後半 最終ローカルQuality Gate（2026-08-09）

- 既存Baselineだった`.github/workflows/ci.yml`と`tests/contracts/ci-workflow.test.ts`をPrettierで意味変更なしに整形し、`pnpm run format:check`をPASSへ戻した。
- Native Repositoryの未使用`parseNativeNumber` importを削除した。現行`pnpm run verify`はexit 0、Lint 0 errors／63 warnings、全Test、Security、Image Manifest、Web export 2294 modulesをPASSした。
- 現行ローカル品質ゲートは完了したが、WindowsではiOS Build／Simulator／Maestro／実`expo-sqlite` Harness／Production validation、GitHub-hosted Remote Android／iOS CI、最新Headの`native-ci / verify`が未実行である。Phase 2 final DoDはpendingとする。

## PR #14 iOS Build-only化後のNative CI現行契約（2026-08-09）

- Android BuildはAutomation／Production-validationの2 Jobへ分離し、Runtimeは両Jobを`always()`で受けて、どちらかが成功した場合だけ実行する。各Artifactを独立してDownload／verify／installし、Automation／Production Maestroは相互に依存させない。最終`verify`は両Build、Android Runtime、iOS Build GateをNative変更時に必須とする。
- iOS正式CIは`ios-automation-build`／`ios-production-build`／`ios-verify`だけで構成する。各BuildはResolved Expo metadataと生成`.app`内`EXConstants.bundle/app.config`のembedded metadata検査、`expo prebuild`、Pods、workspace／scheme解決、unsigned Release `iphonesimulator` `xcodebuild`、`.app`生成確認、固定名保存、Uploadを完結し、Productionはmarker guardを維持する。`ios-verify`は両Buildだけをfail-closeで集約する。
- iOSのSimulator boot／install／launch、Maestro、実`expo-sqlite` Contract Harness、Production-validation Runtime、`simctl diagnose`、Runtime Evidenceは正式Gateから除外した。Jobをskipやsuccessへ偽装するのではなく、Runtime Job自体をWorkflow topologyから削除している。
- iOS Artifactの現行契約はAutomation `native-ios-app-${{ github.run_id }}`／`native-automation.app`、Production `native-ios-production-app-${{ github.run_id }}`／`native-production-validation.app`である。`tests/contracts/native-ci-workflow.test.ts`は各BuildのRelease-iphonesimulator検出、固定名保存、Upload、両BuildのみのAggregateを固定する。
- Maestroの全16 Native Flowにあるcustom scheme `openLink` 38箇所とiOS conditional handlerは、Android回帰を避けるため共通ソースに保持する。ただし、これらをiOS Runtime PASSやiOS正式Gateの根拠にはしない。
- Android Production APKはBuild時にJavaScript／Hermes candidate assetの存在だけを確認し、両Android Release APKのUpload後、`production-bundle-guard`が実ArtifactをDownloadしてcandidate assetを展開する。展開したbytecodeはStandaloneと同じ`hermesc -dump-bytecode` validatorへ渡し、Automationの3 marker存在とProductionの3 marker不在をdecoded disassemblyでfail-closeに判定する。RuntimeのProduction APK install／MaestroはGuard success後だけ実行する。raw APK marker scanはWorkflowから除去した。
- 2026-08-09の最新APKによるAndroid実機はBuild（Metro初回生成を含む）／Install／Smoke／Test Control 1/1、Runtime 5/5、Boundary 5/5をPASSした。Review単体は保存操作まで進んだが、標準日本語IMEがASCII本文を変換し、保存完了assertionへ到達しなかったため、物理端末のIME依存Failureとして記録する。Reviewの2回目`hideKeyboard`は復元しない。
- iOS Runtimeを正式Gateから外す理由は、iOS Simulatorを継続的にローカル再現・デバッグできる環境を現行運用で保持しないため、GitHub-hosted macOS Runnerだけに依存するRuntime CIの保守性が低いからである。Androidは継続的に再現・デバッグできるためRuntime Gateを維持する。
- Windowsでは`xcodebuild`／`xcrun`／`simctl`／`gh`が未提供であり、iOS Buildのローカル実行、修正HeadのRemote Native CI／最終`native-ci / verify`は未確認である。iOS Runtimeは正式Gate対象外であり、未実行をPASSへ繰り上げない。Remote Gate結果が未取得のためPhase 2 final DoDはpendingとする。

## PR #14追加指示後の現行Runtime／Artifact契約（2026-08-09）

- Android AutomationのFormal Flowは、`scripts/native/android-maestro-run.sh`でforce-stop→`pm clear`→再force-stop→PID消失確認を完了してからMaestroを起動する。Training baselineも同じstartup helperを使い、Automation APK上で実行してからProduction-validation APKへ進む。Production FlowはRuntime listeningを待たず、`Scenario Shop`を30秒待ってからRuntime／Test Control／Contract Harnessの非表示を確認する。
- iOS正式CIはBuild-onlyのまま、Automation／Productionの生成`.app`についてSource側Resolved metadataに加えて、`EXConstants.bundle/app.config`のembedded `appEnvironment`／`buildKind`／`testMode`を直接検証する。Production marker Bundle Guard、固定名Artifact、fail-close Build Gateは維持する。
- Iteration 29でこの起動順序とembedded metadataをContractへ追加し、focused 61 tests、全Contract 173 tests、全local verify、Android RuntimeSuite／BoundarySuite各5/5をPASSした。Maestro-MCPはDevice Server `UNAVAILABLE`だったため、同一端末のLocal Runbook CLI結果で代替確認した。

## Specification / Agentic QA基盤（2026-08-10）

- Normative Product Specificationを`docs/spec/`へ集約し、Product Scope、Roles、State、UI/UX、FeatureごとのBR/ACを固定した。Feature文書は5つのH2節を順序も含めてValidatorで検査する。
- `scripts/spec/validate-all.ts`はMarkdownのRelative Link、BR/AC uniqueness、AC→BR、BR Acceptance coverage、Feature 5-section grammarと、`training/agentic-qa/`のJSON + Zod/Cross-file契約を一つの入口へ接続する。`scripts/spec/build-spec.ts`は`output/spec-site`へ静的HTMLを生成する。
- Spec変更時のReview Summaryは`scripts/spec/summarize-impact.ts`がChanged BR／ACと変更された直接参照Normative fileからAffected Challenge IDを導出する。既存Style Quality Job内で`GITHUB_STEP_SUMMARY`へ出力し、Working Tree modeでは未追跡`docs/spec`も扱う。AI Agentic QA Required Gateや新規CI Jobは追加しない。
- Agentic QAはNormal、Gray-box、Black-box Scoredを分離する。Normal／Gray-boxはSource Working TreeのReadonly Boundary、Black-boxは`learner-spec/`、`runbook/`、`challenge/`だけのisolated root、Fresh Session、Positive Tool Allowlist、Forbidden Capability Probeを成立条件とする。
- Normal／Gray-boxのQA Findingsは`working_tree_snapshot`でbefore／after／comparisonの同一形式JSONを参照し、`additional_source_diff_count=0`かつ`passed=true`をZod validatorで確認する。`.codex/runs/`／`.artifacts/`等のQA生成物はSource差分比較から除外する。
- Black-box Required Coverageの正本は`challenge.required_coverage`、Learner-safe Bundleは`challenge.spec_refs[]`のNormative owner fileだけを決定的に含む。Answer Key／Unified Diff PatchはInstructor-onlyで、Patchはdisposable copy上の`git apply --check`→`git apply`順序に限定する。
- Benchmark RevisionはClean committed inputだけ`git:<40 lowercase hex>`、未Commit／mixed inputはCanonical Manifest SHA-256の`sha256:<64 lowercase hex>`を使う。Benchmark Identityは`challenge_id + benchmark_revision + runtime_variant_id`で、同条件Runner比較にはRunner Profile完全一致を要求する。
- `scripts/agentic-qa/evaluate.ts`はAtomic Finding、Duplicate、`invalid_non_atomic`、TN／`FP_non_defect`／NE、blocked environment、Unexpected Valid Finding、Recall／Precision／FPR／CoverageをFrozen Runner Resultから再計算する。iOSはADR-0011どおりBuild-only、Android物理RuntimeとMaestro PASSはAgentic Capability PASSへ自動昇格しない。
- 現RunではWeb Normal Charter／Findings、Basic ChallengeのPreparation→Contract Fixture→Frozen Findings→Separate Evaluator→Evaluationを契約E2Eとして保存している。これはモデル比較結果ではなく、JSON/Zod、隔離、Identity、評価経路の実装確認である。
- Evaluator CLIはchallenge別Canonical ManifestをZod検証し、Manifest digest／Runtime Variant／Tool Profile bytes／Challenge budget／明示modelから期待Benchmark IdentityとRunner Profileを再構成してFrozen Findingsと照合する。Evaluation保存時もFrozen Findingsとの4項目Identity一致を再検証する。
- Candidate Findingは正式Scoreへ直行させず`review_needed`／human adjudicationとしてfail-closeし、Coverage完了だけではNon-defectをTNにせずItem-specific observationが無ければNEとする。Runner／Evaluatorは`.artifacts/agentic-qa/<run-id>/`の別Session証跡を持つ。
- 最新RunのBasic Preparationではpatched SPAのsession作成後URL遷移待ちを固定し、Baseline clean／Patched defect、Patch apply、Fresh Runner、Separate Evaluator、Identity一致を再確認した。`pnpm run test:contracts` 24 files／185 tests、Full typecheck、Spec validation／HTML build、Markdownlint、Lint 0 errors／64 warningsはPASS。Full `verify`は既存84 tracked fileのPrettier baseline、Remote CIは未取得のためfail-close継続中である。

## PR #16 Agentic QA fail-close 修正後（2026-08-10）

- Contract FixtureとOfficial model-backed Scored Runを分離した。`run-contract-fixture.ts`は固定Findingを生成する診断fixtureであり、`execution_kind=contract_fixture`、未完了Coverage、`fixture_not_official`、metrics nullのため正式スコアにならない。モデル実行基盤は未提供のためOfficial Scored Runは未実行として扱う。
- Forbidden Capability Probeはisolated rootの実ファイル／ディレクトリとrunner tool scopeを測定する。Basic Preparationでは17 capabilityすべて`available=false`を確認し、1件でも利用可能なら`assertForbiddenProbePasses`でfail-closeする。
- PreparationはDisposable Source Copy、Baseline sanity、patch check/apply、Patched sanity、同一patched runtime上のScored Initial State Reset、独立したTool Scope／Forbidden Probe、runtime stop／disposable cleanupを実処理し、`preparation-order.json`と`runtime-sanity.json`へ相対証跡を保存する。Coding Agent callbackは持たない。
- CoverageはMission completionとrequired evidence typeの包含を必須化し、FindingはExpected／Reproduction／Actual Deviation／Evidenceが同じDefectを示す場合だけTP候補になる。Runner sessionとEvaluator sessionは別UUIDを実測し、EvaluationはfixtureまたはCoverage不備をPASSへ昇格させない。
- Benchmark RevisionはNUL-separated Git status、renameのD/A正規化、code-unit comparator、Git failure fail-closeを使う。Snapshotはbefore／afterからcomparisonを再導出し、Spec／CLI／Challenge seed／Normative docsもfail-close契約へ更新した。既存84件のformatter baseline修復後、`pnpm run verify`を再実行する。

## PR #16追加レビュー追補（2026-08-10）

- Forbidden Probeのpolicy declarationとActual Exposed Tool Scopeを分離した。`actual_tool_scope.measured=false`のPreparation-only／Contract Fixtureは、filesystem probeがcleanでも`tool_scope_validated=false`として正式Scoringへ進まない。実ScopeにForbidden capabilityが含まれる場合は、`forbidden capability <name> is reachable; observed=...`としてfail-closeする。
- Coverageの`evidence_refs`／`evidence_types`はindex対応・同一ref重複禁止・type別syntaxを契約化した。Official Evaluationでは`.artifacts/`内の実体、URL parse、画像拡張子、path containmentを再確認し、descriptionだけではTPにしない。Screenshot等の意味判定不能なEvidenceは`review_needed`／humanへ落とす。
- Official model-backed EvaluationはBenchmark／Runtime Variant／Runner Profile期待値、実行artifactのmodel identifier／Fresh session／Actual Tool Scope／Forbidden Probe artifact／別Evaluator sessionを独立再検証する。いずれかが不足すれば`valid_for_scoring=false`、metricsはnullとする。
- `run-contract-fixture.ts`は`CHALLENGE-BASIC-001`専用fixtureとして他Challengeをrejectする。Preparationは未知Challengeのreset判定をserver起動より前に行い、Agent callbackを持たない。新規Benchmark ManifestはChallenge-specificを正本とし、genericはlegacy fallbackだけにする。

## メモ

- この文書はプロジェクト固有の実態に合わせて上書きしてよい。
- 標準経路は host 上の `codex-safe` / `codex-task --run-id <run_id>`。Docker sandbox は experimental かつ opt-in。

## Screen Catalog / Visual Specification（2026-08-12）

- Current `app/**` route scanはCatalog Universe 38件（Product 31、Supporting 4、Boundary 2、Test-only 1）で、`docs/spec/screen-catalog.md`へ固定した。Catalogはindexであり、Expected Product BehaviorのSSOTではない。Normative ownerは各Feature / root SpecificationのScreen Contractとし、cross-cutting `native-customer.md`はScreen Stateを所有しない。
- `scripts/spec/visual-registry.ts`はCapture Case metadataとPlatform単位statusを持ち、`scripts/spec/visual-contract.ts`はCatalog / owner / state / target / asset / Markdown reference / routeのintegrityをfail-closeで検証する。ScreenshotはNon-normative Referenceであり、Product Bugや未解決behaviorをcanonicalizeしない。
- 既存UI Reviewを再利用したWeb captureでCanonical WebP 69件を生成した。Markdownと`output/spec-site`のGenerated HTMLはactual image、lazy loading、canonical assetへのclick-throughを持つ。Repository asset budgetは1件1 MiB以下、合計100 MiB以下で検証する。
- Android canonical profileはNative CIのAPI 34 / `google_apis` / `x86_64` / `pixel_2`、ja-JP、font scale 1.0、light、portraitとし、`workflow_dispatch`の`capture_spec_visuals=true`だけでRaw PNG + source SHA + Automation APK SHA-256 manifestを生成する。Physical Androidはpromotion inputではない。
- この実装Runでは、Windows local Release buildの初期失敗を明示Virtual Store引数で修正し、API30 ARM physical deviceのRelease Build／Install／Smoke／Runtime／Boundary／Purchaseはpassedした。ただしAPI34／`google_apis`／`x86_64`／`pixel_2` emulator、AVD、API34 system imageはlocalに存在せず、Android 25 targetはcanonical capture未実行のblockedを維持する。Review FlowはMaestro-MCPの段階診断で、先頭から7件目への`speed: 10` timeoutと物理日本語IMEの非同期dismiss raceを分離し、`maestro/native-review.yaml`へ最初のscrollの`speed: 50`、animation待機、IME表示時だけの条件付きBackを反映した。標準Native入口でReview Flow 1/1を確認したが、Physical deviceはcanonical promotion inputではない。Webのcheckout processingは当初blocked登録だったが、2026-08-13の現worktree fresh UI ReviewでProcessing見出しをready判定し、canonical WebPとMarkdown referenceを生成した。Review repair前の履歴ではformatter-only baseline normalization後の`pnpm run verify`までpassedしているが、現在はFinal GateがAndroid target未完了をfail-closeする。詳細は`docs/history/2026-08-13_004500_screen-catalog-review-maestro-mcp.md`、最新Run REPORT、ADR-0013を参照する。

## PR #16 Skill-first + Harness-backed architecture (2026-08-10)

- Agentic QAのPrimary Entry PointはCoding Agent + Exploratory QA Skillである。Normal／Gray-boxを日常QAのPrimary Use Caseとし、Black-box Scoredは評価用途に限定する。
- `scripts/agentic-qa/**`はCoding Agentを起動・wrap・orchestrateせず、Deterministic Preparation、Contract Validation、Isolation Verification、Artifact Integrity、Evaluation、Scoringだけを担当するSupporting Harnessである。
- Black-boxのFresh Coding Agent Session、trusted session identity、Tool Isolation、Actual Tool Scope inventoryはAgent Runtime／HostのCapabilityで提供する。提供できないOfficial Scored E2Eは`BLOCKED`とし、Repository独自Runner／LLM wrapperで回避しない。

## PR #16 Skill-first CI／Charter／Benchmark追補 (2026-08-10)

- Preparation用Disposable Sourceはroot `node_modules`全体をWindowsではjunction、その他ではdirectory symlinkで参照し、pnpmのtransitive dependency topologyを保持する。これはPreparation Build専用で、Scored isolated rootには`node_modules`を公開しない。
- Normal／Gray-boxはcurrent runの`.codex/runs/<run_id>/qa-charter.json`をCoverage SSOTとする。欠落時はCoding AgentがUser Scope、Normative Specification、BR／AC、Risk、Platform、Role／Seed、Runtime Capabilityからbounded Charterを作成し、shared `exploration_budget`を含むZod契約で検証する。過去RunのCharterは暗黙再利用しない。
- Charter検証後、最初のRuntime interaction前にBEFORE Snapshotを取得し、Runtime QA、candidate Findings、AFTER Snapshot、comparison、追加Source差分0確認、Findings finalizationの順で進める。
- Benchmark Revisionのdigest inputはRunner Profileを含まない。Runner ProfileはRun／Evaluation metadataとして分離され、Profileだけの差分ではBenchmark Revision／Identityは不変、`sameRunnerCondition`だけがfalseになる。
- Official Black-box Scored E2Eは、Hostからtrusted Fresh Session等を取得できず、Prepared patched Target RuntimeをFresh Sessionへsource-freeに引き渡すlifecycleも未実装のため、`BLOCKED / DEFERRED / NOT EXECUTED`とする。Custom Runner／LLM wrapperは追加しない。

## 品質ゲート完了報告契約（2026-08-11）

- 実装・修正作業は、完了報告の前にリポジトリで定義された全品質ゲートとテストを実行する。通常のローカル入口は`pnpm run verify`とし、CIの変更パス条件で追加されるゲート（例：Native変更時の`pnpm dlx expo-doctor@1.17.6`、Native／E2E／Artifact検証）も該当する場合は省略しない。未実行のゲートをPASSとして扱わず、実行できない場合は理由と次の実行者・アクションを報告する。
- 品質ゲートのエラーは、当該作業の直接範囲外に見えても自動的に保留しない。Baseline、現在の差分、共有依存、CI／テスト契約、実行環境を調査し、現在の変更が原因である、または検証に不可欠である場合は現在の作業で最小修正する。真に無関係・環境依存・unsafe・要件判断が必要な場合だけ、根拠、未実行検証、残差、次の対応をRun Artifactと完了報告へ記録する。
- 完了報告には、実行した全ゲート／テストのコマンドと結果、警告、未実行項目、主要変更ファイルを含める。ローカル環境固有の警告はリポジトリ起因のFailureと混同せず、CI相当条件での再確認結果とともに記録する。

## PR #23 Official Black-box Scored E2E Repository Contract（2026-08-13）

- Official Black-box Scored E2EのRepository側基盤として、Shared Canonical JSON、Canonical Artifact Manifest、Runtime Variant Registry、Protected Patch、Source-free Prepared Target、Learner-safe Scored Skill／Runner Input、Initial State Bootstrap、Runtime Control、Output／Evidence Mapping／Freeze、Strict Official Verificationを実装した。
- Benchmark RevisionのdigestにはRuntime Variantを含めず、Benchmark Identity、Prepared Target、Runner Input、実ブラウザ条件では独立したIdentity dimensionとして扱う。Runner-visibleな変更はCanonical `runner-input.json`のhashへ反映する。
- Official Host証跡はRepository自己申告で補完しない。Fresh Session／Context、no-inheritance、Actual Tool Scope、Tool Isolation、Origin／Resource Boundary、source-free root、constrained output、exact Scored Skill source／revision／fallback禁止、Browser Variantをtrusted Host Receiptで検証し、欠落・不一致・未実行Probeはfail-closeする。Repository独自Agent Runner／LLM wrapperは追加しない。
- Disposable Source buildは、Windowsではoffline local installを使い、Linux/macOSではroot `node_modules` directory topologyを一時symlinkで再利用する。Linux CIのpnpm／tsxリンク解決を壊さず、Source cleanup後のLearner／Prepared Target／Runner rootへ`node_modules`やSourceは公開しない。
- 2026-08-13時点のdeterministic validationでは、Official black-box contract 34 tests、served-dist contract 23 tests、Preparation 1/1、Spec validation／HTML build、Unit／Integration／Web Component、Security／Image ManifestがPASSした。Full TypeScriptには既存`/guide` route型エラー、Full Contractには環境の`node:sqlite` bundling failureが残る。Host-trusted Receipt未提供のため、Official E2E／scoreは未実行・未採点である。

## Test Automation Curriculum / Training Environment（2026-08-12）

- Required Curriculumは `docs/curriculum/test-automation/` の22文書へ固定した。`02_competency-rubric.md` はC01〜C12／Level 0〜3の評価正本、`03_instructor-reference.md` はExpected Contract、Alternative Design、Anti-pattern、Facilitation、Troubleshootingの公開Referenceである。Agentic QA教材はOptional ReferenceとしてRequired Part 1から分離する。
- Expected Product Behaviorの教材Oracleは `docs/spec/` のNormative Specificationである。Current UI、既存Test、README、Observed Behaviorから新しい期待動作を逆算しない。Workbookは `training/workbook/` の4 CSVをcanonical templateとし、`spec_ref` → `br_ids` / `ac_ids` → `risk_id` → `test_case_id` → implementation / evidenceのTraceabilityを保持する。
- Formal Webは `playwright.config.ts` / `e2e/web/`、Formal Nativeは `maestro/` を正本とする。Training Webは `playwright.training.config.ts` と `training/playwright/` の `training-chromium`／`training-mobile-chromium`へ分離し、Training Nativeは `training/maestro/`へ分離する。Intentional Failureは通常baselineへ混在させない。
- Training Webの既定local runtimeはworktree専用の `PLAYWRIGHT_BASE_URL`（未指定時 `http://127.0.0.1:8082`）であり、Formal / Visual runtimeのPortを再利用しない。Training TypeScriptは `tsconfig.training.json` と `typecheck:training`を経由してRepository quality gateへ接続する。
- `training/github-actions/` はSecret不要、Deployなし、`permissions: contents: read`、GitHub-hosted Ubuntu runnerのTraining Workflow Templateを持つ。Training Copyは完全なSource commit SHAを指定し、active Workflow allowlistを `training-ci.yml`／`training-native-ci.yml`の2件へ検証する。Production／Deploy Workflow、Secret、OIDC、EnvironmentはTraining Copyへ持ち込まない。
- PR #25のRequired DoDはCurriculum / Training Environmentの完成とCurrent PR HEADのRequired CI・Local / CI Training baselineまでとし、Instructor管理remote Training Copy Delivery、Final Delivery 3 run、候補SHA freeze、SHA equality、Final Delivery RecordはFuture operational validation / optional instructor validationとして扱う。`prepare-training-copy` / `validate-training-copy`自体は安全な教材CopyのRequired Assetとして維持する。
- Required Phase 1 CIは `validate:curriculum` とTraining Web baselineを実行し、Native CIは `training/maestro/**`をchange detectionへ含め、既存Android Runtime／Emulator／APK／Maestro基盤でTraining baselineを実行する。不要な第二Formal Native基盤は作らない。
- GitHub Native CIのAndroid Training Runtimeは API 34 / `google_apis` / `x86_64`、単一の対象serial、package service ready、有限timeoutを必須とし、Maestro 2.8.0は展開先のnested `maestro/bin/maestro`をversion checkしてからbaselineを実行する。Windows Local runnerはPhysical DeviceをCanonicalとし、PATH上の`maestro.bat`をshell経由で解決して明示serialへFlowを渡す。Formal NativeのBuild／Runtime／cleanup契約を弱めず、Training専用の第二基盤は作らない。
- Current Native GuaranteeはAndroid = Build + Runtime E2E、iOS = Build-only（ADR-0011）である。Curriculum、Training Evidence、完了報告のいずれもiOS Simulator／Maestro／Runtime PASSを記録しない。

## PR #24 Screen Catalog / Visual Specification Review Repair（2026-08-13）

- `pnpm run validate:spec`はStructural Validationであり、Catalog grammar、Screen ownership、State／Capture Case／Asset／Markdown reference／Oracle integrityを検証する。正当な`blocked`／`pending` Targetはここでは許容する。Structural PASSはVisual Specification完成を意味しない。
- `pnpm run validate:spec-visuals:final`はFinal Completion Validationとして`pendingTargetCount === 0`、`blockedTargetCount === 0`、`capturedTargetCount === captureTargetCount`をfail-closeで要求する。`pnpm run verify`はこのFinal Gateを含むため、Android canonical captureが残る間は失敗することが正しい。
- Visual ValidatorはCapture RoleとImportant UI State Audience、platform／audienceのallowlist順序と重複、Screen Contract inner grammar、`shared`のdirect required captured reference、Normative BR／AC／local anchor Oracle、Canonical image alt、1 MiB per asset／100 MiB total budgetを検査する。CatalogやRegistryへExpected Behaviorを複製しない。
- Android manifestは期待値のコピーではなく、Native CI EmulatorのAPI／ABI／locale／font scale／UI mode／orientation／resolution／densityをruntime observationとして記録し、`validate-profile`と`validateAndroidVisualManifest`でCanonical Profileへ比較する。`system_image`と`avd_profile`はworkflow configuration由来としてmanifest provenanceへ明示する。
- Android canonical expected resolution／densityはAPI 34 `google_apis` `x86_64` `pixel_2`のCurrent workflowに固定し、`1080x1920`／`440`を使用する。既存CI runではcaptureが無効でresolutionのruntime evidenceしか得られず、densityはPixel 2 AVD configurationとの照合値であるため、manual captureでruntime実測が一致するまでFinal DoDへ昇格しない。参照: [AOSP Pixel 2 AVD config](https://android.googlesource.com/platform/external/adt-infra/+/refs/heads/emu-master-dev/emu-image/templates/avd/Pixel2.avd/config.ini)。
- Native manual dispatchには`capture_case_key`を追加し、`android-visual-capture.ts describe-case`でRegistryのroute／scenario／role／setup／ready／capture modeを解決する。PR CIはcaptureを実行しない。Artifact download後のmanifest／source SHA／APK SHA-256／profile／output path検証とdeterministic WebP promotionは`android-visual-capture.ts promote`を正式CLIとする。
- Checkout Processing Web TargetはProduct codeを変更せず、既存UI Reviewの`payment-processing` scenario、route、ready headingを使ってfresh captureした。Targetは`captured`、canonical WebPとMarkdown referenceは存在する。Final DoDの残存blockerはAPI34 Android required targetsのみである。

## PR #24 Review Repair iteration 2（2026-08-13）

- Checkout Processing WebのCapture Caseは、`支払いを処理しています`のexact semantic headingだけをready conditionとして受理する。Failed headingを同じmatcherへ含めず、Product codeやFailed画面をcanonical化する変更は行わない。
- Android Capture Caseは自然言語の`setup`／`ready`をshellで解釈しない。Registryからmachine-readableな`nativeSetupId`／`nativeReadyId`を解決し、既存Maestro subflowでguest cart／customer loginを実行し、role／route／ready conditionを実画面でassertした後だけscreenshotを取得する。Payment Processingは`customer-login-processing` setupで決済遷移の実行猶予を明示する。
- `scripts/native/android-maestro-run.sh`はAndroid workflow専用の起動前処理としてforce-stop→`pm clear`→PID消失確認→Maestro launchを実行する。共通Maestro YAMLから`launchApp(clearState: true)`を除去し、iOS互換のdeep-link subflowは維持する。timeout増加や無条件retryではstartup raceを隠さない。

## PR #24 Review Repair iteration 3（2026-08-13）

- AndroidのCheckout Address／Payment／Confirm Capture Caseは、customer roleと`regular-member` scenarioだけを宣言して終わらせず、`customer-checkout-address`／`customer-checkout-payment`／`customer-checkout-confirm`のmachine setup IDへ接続する。各setupは既存customer loginとNative Checkout操作を再利用し、Addressでactive Checkout Sessionを開始し、Paymentで住所を確定し、Confirmで`TEST-SUCCESS`を選択してから、registryのcanonical routeとready testIDをassertする。
- `native_checkout_step`と`CHECKOUT_STEP`はCapture CaseからMaestro subflowへ渡す実行契約であり、setupの自然言語をshellで解析しない。step固有の遷移が失敗した場合、screenshot取得・manifest生成・canonical promotionへ進まない。
- このsetup追加はNative Product codeやFinal Gateを変更しない。API34／`google_apis`／`x86_64`／`pixel_2` Emulatorでの実測captureとpromotionが完了するまで、Android 25 Targetはblocked、Final Visual DoDはBLOCKEDのまま維持する。
- Phase 1 CIのStyle Quality Required pathはStructural Validationの後にFinal Visual Specification gateを実行する。`validate:spec`のPASSは構造整合性のみを意味し、`validate:spec-visuals:final`／`verify`はpending／blockedが残る間fail-closeする。

## PR #24 Review Repair iteration 4（2026-08-13）

- `regular-member`のNative Test Control resetはcustomer Sessionと会員Cartを復元するため、Android visual captureではcustomer loginを重複実行しない。既存seedを使うTargetは`customer-seeded-session`、default／review／processingのようにguest seedからcustomer化が必要なTargetは既存`customer-login`系setupを使う。
- Checkout visual setupは、seeded customer roleとbasic-shirt Cartをassertした後、Address画面でactive Checkout Sessionを開始する。Paymentは住所保存後に`native-checkout-payment-session-ready`、Confirmはconfirmationロード後の既存`native-checkout-confirm-submit`をassertしてからcaptureへ進む。
- Native ready matcherはProduct ListとCategoryを専用heading testID（`native-product-list-heading`／`native-category-heading`）で分離する。Checkout Addressはactive session marker、Paymentはvalid session marker、Confirmはloaded confirmationのsubmit markerをroot testIDと併せて要求し、Shell navigationの同名ラベルやroute rootだけの誤受理を防ぐ。
- これらはCapture Caseのmachine metadataと既存Native UI stateを一致させるための最小変更であり、Final Gate、Android canonical profile、startup helper、manual dispatch境界、Productの業務挙動は変更しない。API34 capture未実行中はAndroid 25 Target blocked／Final Visual DoD BLOCKEDを維持する。

## PR #25 Windows Local Physical Device Canonical分離（2026-08-14）

- Windows Local Fresh Learner / Part 1 NativeのCanonical Android Runtimeは、USB接続・ADB authorization済み・起動済み・画面ロック解除済みのPhysical Android Deviceである。複数端末時はserialを明示し、`scripts/native/windows/android-local.ps1 -RequirePhysicalDevice`がADB status、Emulator property、`app.config.ts`の`minSdkVersion`、ABI、package service、awake、unlockedをfail-closeで確認する。
- Windows LocalのDevice ABIは`Auto`検出を維持し、arm64-v8a等へ固定しない。Build、APK integrity、Install、Smoke、Test Control、Training Maestro baseline、Evidenceは同じserialへ接続する。API 30は最低対応APIとして固定せず、`app.config.ts`をSource of Truthとする。
- Windows LocalのAndroid Emulator / AVDはFresh Learner完了条件から外した。Local専用で未検証だった`scripts/training/android-emulator.ps1`は削除し、AVD作成・起動・cleanupの保証はGitHub Native CI Workflowへ限定する。
- GitHub Native CIは従来どおりUbuntu GitHub-hosted runner上のAndroid API 34 / `google_apis` / `x86_64` Emulator、Formal Maestro、Training Maestro baselineを保証する。iOSは変更せずBuild-onlyである。Local Physical DeviceとCI Emulatorの結果を相互に代替しない。

## PR #24 Android canonical batch capture infrastructure（2026-08-15）

- Android manual captureはsingle case互換を維持しつつ、`capture_case_key=all`では`visual-registry.ts`からAndroid case keyをdeterministicに導出し、1 APK build／1 API34 Emulator／1 profile normalization／1 install上でcaseごとに既存reset・setup・route・role・ready・screenshot・manifestを実行する。25件をworkflow YAMLへ複製しない。
- Batch artifactは`batch.manifest.json`とRegistryから導出したraw/per-case manifestを持ち、`complete=true`、expected/captured case set一致、source SHA、同一run APK SHA-256、API34 canonical profile、PNG存在を全件検証する。partial/incomplete/stale/mixed provenanceはpromotionせず、Final Gateへ昇格しない。
- `apply:android-spec-visuals`は全件validation後にtemporary WebPを生成し、canonical pathへ反映する。Android statusはartifact存在から自動capturedにせず、実capture成功後の明示execution state変更でのみblocked→capturedへ遷移する。
- State A実装直後はユーザーpush待ちであり、GitHub Actions canonical capture、25件promotion、Android status transition、Final Visual Gate PASSは未実行である。

## PR #23 Official Artifact Chain再レビュー修正（2026-08-13）

- Runner-visibleな`input/**`は、`trusted/learner-safe-input-artifact-manifest.json`でfile setとbyte hashをfreezeする。Official verifierはRunner Inputのrun／Challenge／spec／Runbook／Skill／Output Contract／self hash bindingと、入力snapshotの実FSを再検証する。Host Capability Receiptの`learner_safe_input_artifact_sha256`はこのManifestのartifact hashへexact bindする。
- Repository-side `trusted/preparation/isolated-run-root/`も専用Manifestでfreezeし、frozen inputのspecification／Runbook／Challenge snapshotとのbyte identityを検査する。これはHost sandboxの証明ではなく、Host isolationの正本は引き続きTrusted Host Receiptである。
- Prepared TargetはCanonical Benchmark Manifestのrevision／source HEAD／patch hashとRunner Inputのallowed originsへexact bindする。Trusted evidence_refはcurrent runの`trusted/**`にある非symlink regular fileへ解決できるものだけをOfficial proofとして受理する。
- Official chainのgolden contract fixtureは、実Evidence file、別Evaluator session、`evaluateBlackBox()`の`valid_for_scoring=true`、空の`invalid_reasons`、非null coverage metricまで検証する。現HostのTrusted Capability不足はRepository実装を止めないが、Official execution／scoreはBLOCKED／NOT EXECUTEDのままとする。

## Lightweight Experiment Record運用（2026-08-17）

- Formal Experiment RecordのCanonical Locationは`docs/experiments/`、ID Conventionは`EXP-YYYYMMDD-NNN`とする。物理配置・Reference方式の正本は`docs/adr/0018-lightweight-experiment-records.md`と`docs/experiments/README.md`である。
- Formal Recordでは、immutableな`target_revision_ref`、既存Run Artifactを参照する`execution_conditions_ref`、repo-relativeなEvidence Referenceを使い、Raw Evidenceを重複コピーしない。専用Validator／Registry／Dashboard／Databaseは現時点で追加しない。
- ExperimentのGovernance、強度、Failure Taxonomy、Knowledge化、Promotion判断の正本は`docs/plans/2026-08-15_123700_agentic-qa-knowledge-feedback-loop.md`のままである。
- このPRではExperiment Readiness（Canonical Location／ID／Reference ConventionとAcceptance Validation）だけを整備し、Formal Experimentは実行していない。最初のFormal Experimentは、本当にExperimentが必要なQA／Training Questionを選択した時点で作成する。
- Baseline Revision `fc9e497817e6c3cff8d89ebd7b37244e759e9484` はBaselineの追跡用であり、Formal Experiment Target Revisionとは別である。Official Black-box Scoredは、受理可能なHost-trusted Receipt／Actual Tool Scope Evidenceがないため別Gapとして`BLOCKED / NOT EXECUTED`で扱い、今回のReadiness変更のFailureとはしない。

## Agentic QA Feedback Loop Post-merge Rebaseline（2026-08-19）

- Original assessment revision（Historical Baseline）は`fc9e497817e6c3cff8d89ebd7b37244e759e9484`、当時のPrevious Rebaseline revisionは`d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`である。Original BaselineをCurrent Stateとして扱わない。
- `fc9e497..d297497`の実diffはPR #31／#33のQA System、repository policy、workflow／Dependency Review／Preview-validate contract、full SHA pin、Codex Hook contractと関連Run／文書の変更であり、Test Target／Product Specification／Curriculum／Trainingの結論は`unchanged`である。
- QA System baselineは、Public Repository Hardening、Security／repository operation policy、Codex Hookのbranch-independence、protected branch commit G10 regression coverageを含むlatest-mainへ更新した。
- GAP-02はlightweight Documentation／ADRで解消する判断を維持する。Experiment Readiness／Formal Experiment境界も維持し、Formal Experiment Target Revisionは設定しない。Formal Experimentは`NOT EXECUTED`、Knowledgeは`none`、Promotionは`none`である。
- Official Scored GAP-01はHost-trusted Evidence不足による`BLOCKED / NOT EXECUTED`のままである。
- `.artifacts/`はlocal／CIのephemeral Raw Evidence専用で、Committed Formal Evidenceはfresh cloneで解決できるtracked Run Artifact／Manifest／Summary等を標準とする。新しいexternal storageやInfrastructureは追加しない。

## Agentic QA Feedback Loop Latest-main Delta Rebaseline（2026-08-20）

- Original Historical Baselineは`fc9e497817e6c3cff8d89ebd7b37244e759e9484`、Previous Rebaselineは`d297497e2d2aeb0fa1ff17c48dd0ae7a86e9455a`、Current Latest-main Rebaselineは`f21155f2bdc95e0d5f58ed846665f1a0051dcac6`である。3世代を混同しない。
- `d297497..f21155f`の実diffはPR #34のPlaywright Chromium install stability、CI contract、Run／Plan evidence、font fallback補正とfocused E2E assertionである。Chromium固定jobはbrowser-only install、`extended-e2e`はChromiumとFirefox／WebKitのinstall条件を分離し、Firefox／WebKitの既存`--with-deps`は維持した。
- Test Target: `unchanged`。PR #34のUI／E2E補正はCI／表示安定性のためのもので、Product Specification、Formal Regression target、Training targetの意味を変更しない。
- Curriculum: `unchanged`。`docs/curriculum/**`、`training/**`、Curriculum contractにdeltaはない。
- QA System: `updated`。Chromium系jobからruntime apt／Ubuntu mirror dependencyを除去し、browser binary installを維持した。install条件をCI contractで固定し、PR #34の実CI／rerun／workflow_dispatch evidenceを反映した。
- GAP-02とExperiment Readinessの判断は`unchanged`。Formal Experimentは`NOT EXECUTED`、Formal Experiment Target Revisionは設定しない。Knowledgeは`none`、Promotionは`none`。
- Official Scored GAP-01はHost-trusted Evidence不足による`BLOCKED / NOT EXECUTED`のまま変更しない。

## G1 Native Production Bundle Guard（2026-08-22）

- `scripts/validate-native-production-bundle.ts`はExpo Android exportの実`.hbc`を固定versionの`hermes-compiler`に含まれる`hermesc -dump-bytecode`でdecodeし、raw UTF-8 byte scanを行わない。CIからは`--automation-bundle-path`／`--production-bundle-path`で実APKから導出したartifactを入力できる。
- `.github/workflows/native-ci.yml`の`production-bundle-guard`はAutomation／Production Release APK artifactをdownloadし、`unzip`でcandidate assetを一時`.hbc`へ展開して共通validatorを実行する。Production build／Runtime側はmarker判定を重複せず、Production-validation MaestroはGuard後にHarness／Test Control／成功ラベルの不在を確認する。
- Localでは実Production Hermes exportのAutomation positive／Production negativeと逆入力failureを確認した。今回取得したActual APKでは3 markerのraw binary上の存在も確認されており、旧raw scanのfalse-negative自体を再現したものではない。raw binary substring scanはHermes bytecodeの内部表現へ依存するため、artifact形式の妥当性とmarker presence/absenceはHermes compilerによるdecoded bytecode inspectionでfail-closeに検証する。
- 修正Head `8e52136` のRemote Native CI run `32575898683`では、Actual Automation／Production APK artifactをdownloadし、APK内candidateを抽出して共通validatorへ接続したProduction Bundle GuardがPASSした。Automation decoded marker 3件を検出し、Production decoded markerは0件だった。Android Runtime／MaestroもGuard成功後にProduction APKをdownload／verify／installし、`native-production-validation`をPASSした。
- 同Remote runのAndroid Automation Build、Android Production-validation Build、Production Bundle Guard、Android Runtime／Maestro、iOS Automation／Production Build、Native iOS CI VerifyはPASSした。一方、`Native Static / Expo Doctor`は`@expo/metro-runtime`、`expo`、`expo-build-properties`、`expo-constants`、`expo-dev-client`、`expo-linking`、`expo-router`の7パッケージのpatch version mismatchでFAILし、`native-ci / verify`はこのfailureをfail-closeに反映してFAILした。これはG1のCLI接続修正とは独立した既存failureであり、Expo dependency updateは今回のPRへ追加しない。

## G3/G4 Native Catalog・Route Authorization（2026-08-22）

- Native Catalogは`SessionIdentityResolver`で現在Sessionから`ProductViewer`を解決し、`CatalogUseCases` → `CustomerCatalogGateway` → `NativeCustomerCatalogRepository` → `NativeCustomerSQLiteRepository`までviewerを保持する。Native SQLiteのvisibility、membership pricing、active sale、検索、facet、pagination、stable sort、Suggestionは既存Domain／Web Storefront semanticsを基準にする。
- Native Catalog/Search画面は既存のProductSearchRequest／ProductSearchResultを使い、Keyword、Category、Brand、Price、Inventory、Sale、Minimum rating、facet counts、total/page、paginationを送受信する。Search SuggestionはNative service surfaceからUseCase／Gateway／Repositoryへ接続し、2文字以上・最大8件・viewer-aware・deterministicとする。
- Native ShellはCustomer-only routeのGuest direct navigationを既存Login boundaryへ送り、management roleは既存unsupported boundaryでCustomer画面をmountしない。Guest storefront／cartは引き続き利用可能なrouteとして扱う。
