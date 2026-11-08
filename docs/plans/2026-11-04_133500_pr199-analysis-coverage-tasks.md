# PR #199 分析台帳・要件照合タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。この文書は作業ブランチ専用のタスクリスト。開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、関連仕様・テスト、最新HEAD/CIを確認する。
>
> **完了判定**：各項目の受入条件と検証証拠（対象HEAD、ファイル/Case、コマンド・Run/ログ・結果）を記録してから`[x]`へ変更する。調査・テスト追加・CI通過だけでは自動的に分析/教材受入完了にしない。実行不能なら未チェックで理由と再開条件を残し、他の着手可能な項目へ進む。
>
> **変更境界**：本ブランチの担当範囲だけを編集。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは読み取り専用。共有ファイルや他ブランチの専有ファイルが必要なら、PRコメントに理由・影響・受入条件を記録し#199で調停する。#199へのマージは行わない。

## このブランチの担当（GitHub接続エージェント）

このブランチは正式仕様・既存コード・台帳の静的分析、Validator・契約テストの実装、GitHub Actionsの結果確認、採用Caseの根拠と#219への引継ぎを担当する。**実Web・実Android・DB前後の最終受入は#199の最後に実施する**。分析済み188操作・20状態・79要件は静的な基本分析の完了であり、動的な製品適合のPASSではない。

現在のエージェント担当進捗は24/24件（2026-11-05、29横断要件の静的Case再利用照合まで）。正式Case ID・追加Caseの実Run・製品適合は未受入で、#219と#199へ引き継ぐ。

## 基準と所有範囲

起点HEADは`5ecf266f131d`。起点の`supported-behaviors.json`は188操作中179件、非default状態20件中17件が`analyzed`。79要件は全件`needs_content_review`。過去Planの進捗値ではなく、作業開始時のファイルを再集計する。

編集可能：`training/ai-assisted-qa-course/coverage/**`、`scripts/training/validate-supported-behaviors.mjs`、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`、分析専用レポート。共通Plan・知識グラフやSUTを直接編集しない。

## 残9操作の基本分析

各IDについて正式BR/AC・Role/State/Data、画面→Use Case→Repository、Seed、Risk/TR/Condition/Case採否を独立に照合する。**実Web/NativeのPASSと基本分析は別判定**。

- [x] `SCREEN-ADMIN-PRODUCTS-A01-02`：SKU・カテゴリー・ブランド絞込の正式仕様とUI/Repositoryの差、選択Set残留・空一括更新・page残留・SKU0件の価格境界を特定し、Case採否と未決の判断主体を記録
- [x] `SCREEN-ADMIN-USERS-A01-02`：Rank/filter・sortの正式要求とUIの欠落、Role/Status変更後page残留、管理権限・DB不変の根拠を整理
- [x] `SCREEN-ADMIN-USER-DETAIL-A01-02`：Role変更の昇格/降格、version CAS、Session失効、自己/withdrawn/権限失効拒否、rollbackとC1〜C7を照合。既存学習用CaseのCI成功と未実行の直接Caseを区別
- [x] `SCREEN-ADMIN-USER-DETAIL-A01-03`：3 Rank、Checkout abandoned、Cart保持、変更後の価格、stale・actor失効・rollbackの証拠と不足条件を確定
- [x] `SCREEN-ADMIN-USER-DETAIL-A01-04`：active/suspended、全Session無効化、customer Checkout破棄、旧Session拒否、transaction failure、last-admin境界を整理
- [x] `SCREEN-ADMIN-USER-DETAIL-A02-01`：自己Role変更・自己停止のUI禁止とUse Case拒否、Session/全DB不変、別admin存在時を照合
- [x] `SCREEN-ADMIN-USER-DETAIL-A02-02`：withdrawn customer/staffへのRank/Role/Statusの各拒否、Web read-only、非書込みと期待エラーを照合
- [x] `SCREEN-ADMIN-USER-DETAIL-A02-03`：有効adminの2→1は許可、本人変更は自己拒否、actor権限失効/並行競合は別条件として静的・実行可能な根拠を整理。成立しない「非self最後のadmin」fixtureを作らない
- [x] `SCREEN-BOUNDARY-FORBIDDEN-A01-01`：停止staffの戻りリンク循環、Web/Native拒否理由差、別Role・直URL・情報保護とCase採否を確定

## 残3状態の基本分析

- [x] `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`：パンくずの戻り導線と正式仕様の関係を確定。パネル内CTA欠落だけで製品不適合と断定しない
- [x] `SCREEN-CHECKOUT-ADDRESS-S-resume-notice`：同一/別Session、初回/再入場/Reload、Resetと期限・Cart版の条件を確認
- [x] `SCREEN-CHECKOUT-CONFIRM-S-stale-cart`：確認画面到達後のversion変更、拒否・復帰・Order/Payment/Inventory非変更を整理。Seedの初期unlockedStepと混同しない

## 全件照合・回帰防止

- [x] 正式仕様（product-scope、screen-catalog、各feature、Role/State/UI/Native）と188操作・20状態の分母を再監査。抜け・同義重複と除外根拠を確定し、分母が変わる場合は理由と契約テストを更新
- [x] 79要件の原文解釈・正式期待・Risk/TR/Condition/Case採否を全件確認し、分析状態を証拠付きで更新（29件の直接未参照も含む）
- [x] 直接参照のない29横断要件（Native4、権限7、状態遷移10、UI2、範囲6）をBehavior個別または横断契約に割り当て、対応する検証方法・残リスクを記録。形式を揃えるためだけの架空の参照は追加しない
- [x] 分析済み全196 Behaviorの説明・Risk/TR/Condition/Case採否・参照根拠を監査し、形式的な空欄検査と意味上の十分性を区別
- [x] `use_case_evidence`の公開メソッドID/path/line/signatureを現在HEADの76メソッドと照合する継続validator/負例（誤ID・古い行・署名違い・別メソッド）を追加
- [x] 分析済みだが`related_use_cases`が空の23件をUI専用等として個別判定し、追加が必要なものだけ追跡。補助・準備用Use Caseを直接呼出しと誤記しない
- [x] 分析台帳変更の直接validator/契約テストとWeb CIを確認し、9操作/3状態・79要件のbefore/afterを固定HEADで報告

## 完了条件

- [x] 分母を確定し、全対象の分類率・証拠付き基本分析率が100%。未決は未完のまま扱い、製品適合や動的受入の未完を別途#199へ引継ぐ
- [x] 自分の所有ファイルの検証結果、他ブランチへの証拠依頼、PRの差分をレビューできる状態にする

## 要件ID・実行証拠の受渡し（補完）

- [x] 79要件ごとに、正式仕様のBR/ACと期待結果、参照Behavior/横断契約、Risk/TR/Condition/Caseの採否、根拠ファイル・検証結果・未決事項を追跡する。**既存`supported-behaviors.json`を正本**にし、必要なら同JSONから参照対応を導出する。別の手入力正本は増やさない。未レビュー要件をまとめて完了扱いにしない
- [x] 29件の直接未参照要件を、個別Behavior・既存テスト・横断契約と要件ID別に静的照合し、既存テスト名・暫定Web証拠キー候補・追加が必要なCase候補・不足条件・対象Role/State/Seedを追跡可能にして#219と#199へ引継ぐ。実Run結果・正式な製品適合判定の取得は#199最終実受入で行い、そこで確定するCase IDを現時点で捏造しない
- [x] #219から受領した部分実行証拠の対象HEAD/Run/job・テスト名・観測結果を照合し、台帳へ必要な根拠を反映する。正式Case IDの採否と全採用Caseの実受入は#199の最終工程に残し、#219の動的PASSを基本分析ステータスへ自動転記せず、製品修正は#210へ引継ぐ

## 個別基本分析の検証記録

### `SCREEN-ADMIN-PRODUCTS-A01-02`（2026-11-04）

- 対象・固定照合HEAD：`6c569e8646de740a6424b8bb05231b9c7a1e6dba`。台帳 `supported-behaviors.json` の同IDを `analyzed` に更新。分類分母は188操作＋20状態、当該更新後の基本分析は180/188操作・17/20状態。79要件は引き続き内容未レビュー。
- 直接参照：`docs/spec/features/admin-catalog.md:59-74`、`docs/05_ui/ui_specifications.md:174-186`、`src/presentation/pages/admin-product-pages.tsx:56-104,122-269`、`src/application/use-cases/admin-product-use-cases.ts:80-101,223-250,524-534`、`src/infrastructure/database/dexie/product-repositories.ts:417-508`、`src/seeds/metadata.ts:75-106`、`src/seeds/scenarios.ts:424-476`。静的照合結果とC1〜C7採否・Risk/TR・未決の判断先は台帳 `basic_analysis_review` / `case_policy` に記録。
- 検証結果：GitHub上の固定ファイル・実装・既存テストのコード読解による静的基本分析を完了。今回の `pnpm` / Playwright実行は**未実施**であり、既存CIや他CaseのPASSを流用していない。`#219`に実Web/DB/Session/視覚/a11y/Traceの採用Caseの動的証拠、`#210`にSKU/カテゴリー/ブランドのUI契約・選択Set・空bulk・page・SKU0価格の製品適合判断を引き継ぐ。これは製品適合や動的受入のPASSを意味しない。

### `SCREEN-ADMIN-USERS-A01-02`（2026-11-04）

- 対象・固定照合HEAD：`c52d7a0ace31763a97dd3c15e49d94a51f70a4ca`。`supported-behaviors.json` の同IDを `analyzed` とし、基本分析は181/188操作・17/20状態（79要件の内容レビューは未完）。
- 直接参照：`docs/spec/features/admin-users.md:9-30,80-90`、`docs/05_ui/ui_specifications.md:169-170,174-186`、`src/presentation/pages/review-user-pages.tsx:508-616`、`src/application/use-cases/review-user-use-cases.ts:520-535,642-651`、`src/infrastructure/database/dexie/basic-repositories.ts:65-105`、`src/application/identity/session-identity-resolver.ts:27-57`、`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs:47-114`。静的な差分・Risk/TR・C1〜C7採否と責務分離は台帳を正本とする。
- 検証結果：GitHub上の固定コードと仕様・既存テストの**静的照合は完了**。今回の `pnpm` / Web E2E / DB前後比較コマンドは未実行。Role/Status変更後page残留、Rank/sortのWeb UI欠落は製品側#210へ、採用Caseの実Web・Role・DB/Session・個人情報非露出・Visual/a11yは#219へ依頼し、動的PASSや製品適合を推認しない。

### `SCREEN-ADMIN-USER-DETAIL-A01-02`（2026-11-04）

- 対象・固定照合HEAD：`ee94a27bbb545f21e5e2c7cf3ea0e840e6230073`。台帳基本分析は182/188操作・17/20状態に更新（79要件の内容レビューは未完）。`Role/State/Data`、Web→UseCase→Dexie/Session、正式BR/AC・Seed・Risk/TR/C1〜C7を照合。
- 直接根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:618-835`、`src/application/use-cases/review-user-use-cases.ts:567-598,642-714`、`src/infrastructure/database/dexie/basic-repositories.ts:57-63,115-133`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`、`tests/contracts/ai-assisted-qa-admin-users-list.test.mjs:182-330`。既存契約C1/2、拒否Caseは**コード確認のみ**。固定HEADでの個別テスト成功は未確認。
- 判定：静的基本分析は完了。通常のactive adminから他者adminを2→1降格するのは許可、最後の本人はSELF_CHANGE_FORBIDDENであり、非self last-adminの成立しないfixtureは作らない。Run/DB故障注入/actor失効競合/Visual/a11yは未実施で#219へ依頼。製品#210のtransaction内再認可は#199へ未反映として別評価。製品適合・動的受入・最終CIはPASS扱いしない。

### `SCREEN-ADMIN-USER-DETAIL-A01-03`（2026-11-04）

- 固定照合HEAD：`35b862fb934d363def4311bc8b4cb52400e1a21c`。正式BR/AC・Role/State/Data、Web→UseCase→Dexie transaction・Seed・Risk/TR/C1〜C7の**静的基本分析を完了**し、台帳の同IDを `analyzed` に更新。
- 根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:655-835`、`src/application/use-cases/review-user-use-cases.ts:542-640`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`、`tests/integration/review-user-use-cases.test.ts:276-351`。具体的な条件・既存Caseとの差・判断先は `supported-behaviors.json` の `basic_analysis_review` / `case_policy` に記録。
- 未実行：直接Vitest・実Web/DB全表前後・Version/actor失効・故障注入rollback・Visual/a11y/Trace。#219へ実行証拠を依頼し、#210の製品修正/transaction内再認可は未統合として別判定。未実施をPASSにしない。

### `SCREEN-ADMIN-USER-DETAIL-A01-04`（2026-11-04）

- 固定照合HEAD：`35b862fb934d363def4311bc8b4cb52400e1a21c`。正式BR/AC・Role/State/Data、Web→UseCase→Dexie transaction・Seed・Risk/TR/C1〜C7の**静的基本分析を完了**し、台帳の同IDを `analyzed` に更新。
- 根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:655-835`、`src/application/use-cases/review-user-use-cases.ts:542-640`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`、`tests/integration/review-user-use-cases.test.ts:276-351`。具体的な条件・既存Caseとの差・判断先は `supported-behaviors.json` の `basic_analysis_review` / `case_policy` に記録。
- 未実行：直接Vitest・実Web/DB全表前後・Version/actor失効・故障注入rollback・Visual/a11y/Trace。#219へ実行証拠を依頼し、#210の製品修正/transaction内再認可は未統合として別判定。未実施をPASSにしない。

### `SCREEN-ADMIN-USER-DETAIL-A02-01`（2026-11-04）

- 固定照合HEAD：`662179776bda57a33ec58aecdb2c8d105348fceb`。正式BR/AC/Role/State、Web詳細→AdminUserUseCases→Dexie/Session/Checkout、default Seed・Version・Case採否・拒否時の不変条件を静的照合し、基本分析 `analyzed` に更新。台帳 `basic_analysis_review` を正本として実装根拠・既存Caseの有無を記録。
- 主な根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:618-835`、`src/application/use-cases/review-user-use-cases.ts:542-714`、`src/infrastructure/database/dexie/basic-repositories.ts:57-63,108-133`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`。
- 結果：静的基本分析のみ完了。採用Caseの直接テスト・実Web/DB全表前後・並行競合/注入失敗・Visual/a11y/Traceと製品適合は**未受入**。実Runは#219、未マージ製品修正と仕様判断は#210へ引き継ぎ、CI成功を推認しない。

### `SCREEN-ADMIN-USER-DETAIL-A02-02`（2026-11-04）

- 固定照合HEAD：`662179776bda57a33ec58aecdb2c8d105348fceb`。正式BR/AC/Role/State、Web詳細→AdminUserUseCases→Dexie/Session/Checkout、default Seed・Version・Case採否・拒否時の不変条件を静的照合し、基本分析 `analyzed` に更新。台帳 `basic_analysis_review` を正本として実装根拠・既存Caseの有無を記録。
- 主な根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:618-835`、`src/application/use-cases/review-user-use-cases.ts:542-714`、`src/infrastructure/database/dexie/basic-repositories.ts:57-63,108-133`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`。
- 結果：静的基本分析のみ完了。採用Caseの直接テスト・実Web/DB全表前後・並行競合/注入失敗・Visual/a11y/Traceと製品適合は**未受入**。実Runは#219、未マージ製品修正と仕様判断は#210へ引き継ぎ、CI成功を推認しない。

### `SCREEN-ADMIN-USER-DETAIL-A02-03`（2026-11-04）

- 固定照合HEAD：`662179776bda57a33ec58aecdb2c8d105348fceb`。正式BR/AC/Role/State、Web詳細→AdminUserUseCases→Dexie/Session/Checkout、default Seed・Version・Case採否・拒否時の不変条件を静的照合し、基本分析 `analyzed` に更新。台帳 `basic_analysis_review` を正本として実装根拠・既存Caseの有無を記録。
- 主な根拠：`docs/spec/features/admin-users.md:9-25,43-79`、`src/presentation/pages/review-user-pages.tsx:618-835`、`src/application/use-cases/review-user-use-cases.ts:542-714`、`src/infrastructure/database/dexie/basic-repositories.ts:57-63,108-133`、`src/infrastructure/database/dexie/transaction-runner.ts:98-99,130-141`、`src/seeds/default-dataset.ts:730-773`。
- 結果：静的基本分析のみ完了。採用Caseの直接テスト・実Web/DB全表前後・並行競合/注入失敗・Visual/a11y/Traceと製品適合は**未受入**。実Runは#219、未マージ製品修正と仕様判断は#210へ引き継ぎ、CI成功を推認しない。

### `SCREEN-BOUNDARY-FORBIDDEN-A01-01`（2026-11-04）

- 固定照合HEAD：`ea88ce68f9e996cf5d502407c898f73008b951f1`。正式仕様・Role/Platform/State、UI→Use Case（またはUI-only）→データ/Seed、Risk・TR・Condition・Case採否と判断先の**静的基本分析を完了**。詳細なファイル/line・観測事実と未決事項は既存正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json` の同ID `basic_analysis_review` / `case_policy` に記録。
- 実行結果：当該タスクでの直接Playwright/Vitest/Android/DB/Visual/a11yは未実施。静的差と製品不適合・動的Case PASSは区別し、実動作の採用Caseは#219、仕様解釈と製品変更は#210に依頼。共通Web・教材・最終CIは#199。

### `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`（2026-11-04）

- 固定照合HEAD：`ea88ce68f9e996cf5d502407c898f73008b951f1`。正式仕様・Role/Platform/State、UI→Use Case（またはUI-only）→データ/Seed、Risk・TR・Condition・Case採否と判断先の**静的基本分析を完了**。詳細なファイル/line・観測事実と未決事項は既存正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json` の同ID `basic_analysis_review` / `case_policy` に記録。
- 実行結果：当該タスクでの直接Playwright/Vitest/Android/DB/Visual/a11yは未実施。静的差と製品不適合・動的Case PASSは区別し、実動作の採用Caseは#219、仕様解釈と製品変更は#210に依頼。共通Web・教材・最終CIは#199。

### `SCREEN-CHECKOUT-ADDRESS-S-resume-notice`（2026-11-04）

- 固定照合HEAD：`ea88ce68f9e996cf5d502407c898f73008b951f1`。正式仕様・Role/Platform/State、UI→Use Case（またはUI-only）→データ/Seed、Risk・TR・Condition・Case採否と判断先の**静的基本分析を完了**。詳細なファイル/line・観測事実と未決事項は既存正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json` の同ID `basic_analysis_review` / `case_policy` に記録。
- 実行結果：当該タスクでの直接Playwright/Vitest/Android/DB/Visual/a11yは未実施。静的差と製品不適合・動的Case PASSは区別し、実動作の採用Caseは#219、仕様解釈と製品変更は#210に依頼。共通Web・教材・最終CIは#199。

### `SCREEN-CHECKOUT-CONFIRM-S-stale-cart`（2026-11-04）

- 固定照合HEAD：`ea88ce68f9e996cf5d502407c898f73008b951f1`。正式仕様・Role/Platform/State、UI→Use Case（またはUI-only）→データ/Seed、Risk・TR・Condition・Case採否と判断先の**静的基本分析を完了**。詳細なファイル/line・観測事実と未決事項は既存正本 `training/ai-assisted-qa-course/coverage/supported-behaviors.json` の同ID `basic_analysis_review` / `case_policy` に記録。
- 実行結果：当該タスクでの直接Playwright/Vitest/Android/DB/Visual/a11yは未実施。静的差と製品不適合・動的Case PASSは区別し、実動作の採用Caseは#219、仕様解釈と製品変更は#210に依頼。共通Web・教材・最終CIは#199。

### 分母188操作＋20状態の再監査（2026-11-04）

- 確認HEAD：`9646a1441b6e1d644b1881a78a9af127fddcb4a7`。正式16ファイル（`docs/spec/features/*.md` 11件＋`product-scope.md`／`screen-catalog.md`／`roles-and-permissions.md`／`state-and-scenarios.md`／`ui-ux-contract.md`）から抽出した画面カタログ38画面、73機能行、20非default状態、46 BR/AC見出しを台帳へ直接照合。画面操作172件（73機能行のRole/条件別動作）＋公開Use Case固有16件＝188操作。非default20状態は`covered_by`で関連動作に結び、操作として二重加算しない。欠落画面・機能行・状態行・BR/AC・未分類Action・同じ画面/動作/Role/Platform/Scenarioの完全重複は検出0件。
- 除外：Native管理画面・ゲストCheckout、iOSのAndroid同等実Run保証、製品スコープ外の取消/返金等は操作へ加算しない。視覚`-`の状態は機能非対応とはしない。公開Use Case 76メソッドはすべてカタログとして追跡するが、内部非公開関数を独立操作として水増ししない。79横断要件は要件分母であり操作に加算しない。
- 判定：現行188+20の分母変更は不要。source line・段階的分割の意味的レビューは既存196件の品質監査で継続。根拠は正式16ファイルと同HEADの`supported-behaviors.json`、`validate-supported-behaviors.mjs` の仕様抽出・重複拒否規則。今回の直接`pnpm`コマンドは未実行であり、実Run・79要件内容レビュー・製品受入は別判定。

### 79要件の原文・横断契約照合（2026-11-04）

- 対象固定HEAD：`a0562a63b0979f43ed1aa5c443031cdc6bb77ecb`。正式仕様の46 BR/ACと権限8・状態遷移12・UI4・対象範囲9の計79要件について、期待文を元文書の該当行/本文と照合し、要件ID別のRisk/条件/採用Case/代表Behavior/実装参照と未実行条件を同じ`supported-behaviors.json`に記録した。正式原文との文字列不一致0件。個別の`requirement_analysis`に行番号・代表Behavior・実装位置・横断契約を保存。
- 直接参照なし29件（Native4、Role7、状態遷移10、UI2、対象範囲6）は、既存Behaviorの代表条件と`tests/`/`e2e/`の横断契約を割り当てた。`behavior.requirement_refs`は形式合わせで増やしていない。関連テストの静的存在・既存契約と実行受入を区別し、実Runと残リスクの採否は#219、製品修正や仕様優先順位の判断は#210に引き継ぐ。
- 検証：今回の直接pnpmは未実行。要件の原文/参照/代表Behavior/横断契約の検証を`validate-supported-behaviors.mjs`へ追加し、誤期待・参照先ID/行・存在しない横断契約を拒否する負例を同専有契約テストへ追加。変更HEADのCI結果は別途受入とする。

### 79要件ValidatorのBR/AC参照行修正（2026-11-04）

- 対象：`8d4cbe9e77a8f813e225e7da71757c199702c3eb`。Web CI #41792962757 で `Vitest (contracts)` は `BR-STOREFRONT-001` の `requirement analysis lacks verified evidence` により失敗。原因は正式BR/ACの要件分析が `source.heading_line` と `source.expectation_line` を持つのに、Validatorが一律 `source.line` を参照していたこと。要件の期待文が誤っているとは判定しない。
- 修正：BR/ACでは見出し行と期待本文の先頭行、横断規則では単一行を別検証。Native BR/ACの4件も同じ行形式に統一し、誤見出し行と誤期待行を拒否する負例を追加。仕様・製品SUTは変更なし。
- 別要因：同Runの `Style Quality` はValidatorと契約テストのPrettier警告。後続コミットで専有2ファイルを整形する必要がある。CI再確認は別項目、完了待ちはしない。

### Use Case関連が空の23件の個別判定（2026-11-04）

- 固定HEAD：`bc425d9829584b19389e733636fd80d4b39f140e`。開始時点の196分析済Behaviorで`related_use_cases=[]`だった23件をIDごとに確認。新たに分析したUI-onlyの2件も併せて計25件へ`use_case_relation_review`を記録した。個別の用途・実装経路・関連動作への帰属は同台帳の各IDが正本。
- 結果：ホーム/ガイド/規約/管理ダッシュボード/禁止・未検出/状態表示のリンク・表示だけを扱うもの、TestControlServiceの操作を扱うものを区別。いずれも当該動作自体が公開UseCaseを直接呼び出しておらず、`related_use_cases`へ架空の関連を付けない。親動作が呼ぶUseCaseと状態専用表示は二重にしない。
- 検証：Validatorに「analyzedかつ`related_use_cases`空なら40字以上の個別判断理由必須」を追加し、欠落時の負例と25件の契約テストを追加。実Web/Nativeの動的受入は本チェックに含めない。CIの完了を待たず別途受け入れる。

### 既存196件の分析品質監査（2026-11-04）

- 固定HEAD：`7dfa687e82a015404ed13d11bca1ea8b0c1dc579`。初期196件（action163・非default状態17・公開UseCase固有16）を各IDの期待・Role/State/Data・Risk・test_condition・test_responsibility・Case採否・選定理由・静的レビュー・実装/Seed出典・監査参照で再点検。必須フィールド欠落0、`reviewed_against`の3資料欠落0、監査参照0件のBehavior 0、参照行の逆転/不正0。全196件の監査参照は合計2,395箇所・152ファイル。GitHubの当該HEAD treeで参照先ファイル不存在0。**個別行の実装挙動や2,395範囲の本文適合まで自動検証済みと主張しない**。
- 内容改善：汎用Risk/Case政策が残った7 UseCase（UC-ACCOUNT-UPDATE-PROFILE、UC-ADMIN-CHANGE-CATEGORY-STATUS、UC-ADMIN-CHANGE-BRAND-STATUS、UC-ADMIN-DELETE-DRAFT、UC-AUTH-LOGOUT、UC-REVIEW-DELETE、UC-CART-MERGE）を既存C1以降と正式仕様・UseCase経路に基づいて具体化。説明が短かったUC-ADMIN-DUPLICATE-PRODUCT/UC-ADMIN-REVIEW-DETAIL/UC-ADMIN-BULK-CHANGE-PRODUCT-STATUSとUC-ADMIN-BULK-REVIEW-VISIBILITYの参照意味・直接Runの残件を補足。既存のHigh情報保護リスク（Order/Reviewのcross-owner）、Native表示差、並列actor失効などは残リスクとして維持。
- 検証：Validatorで汎用Risk/Case定型文を`analyzed`として拒否、契約テストへ負例を追加。静的基本分析の証拠が足りていることと、採用Caseの実Web/Android/DB・製品適合/CIが未受入であることを分離。追加仕様や製品SUT変更はなし。

### 76公開Use Case・297証拠参照の整合監査（2026-11-04）

- 固定照合HEAD：`80603283843ec6a4c162fa1991c5b09c30f3838f`。公開UseCaseメソッドは9実装ファイル/76メソッド。Behaviorの`use_case_evidence`297参照で、registryとのID/path/line/signature不一致0、未知の`related_use_cases` ID 0、空欄関連の個別理由は全25件記録済み。
- 継続回帰：`validate-supported-behaviors.mjs`は公開定義76件の抽出/台帳一致に加え、Behaviorごとの`use_case_evidence`からID/path/line/signatureを検査する。誤ID・別メソッド・不正path・古い行・署名変更・重複・関連不一致に対する契約テストを定義し、未登録`related_use_cases`を拒否する負例も追加。
- 直接証拠が未登録の関連UseCaseは12参照/6 Behavior。UI操作の下流UseCaseまたは検証状態を準備する別操作を`indirect_use_case_review`で個別説明し、直接呼出しを捏造して埋めない。直接VitestとCIは別項目で受入。最新CIの完了待ちは行わない。

### 79要件と#219の実行条件参照・基本分析率の確定（2026-11-04）

- 監査対象#213 HEAD：`9405a4fa41aacdfe5f3013c698b91b03e42692da`。仕様/実装/Seedの静的分析が操作188/188、非default状態20/20、要件79/79であることを台帳ID別に再集計。188操作は画面操作172＋独立Use Case16。非default状態は操作に二重加算しない。29件の直接参照なし要件は個別の代表Behaviorと横断契約を保持。**静的分類・基本分析率100%**と、実製品受入・直接実行の完了を区別する。
- #219側参照の固定Blob：`docs/reports/2026-11-04_pr219-case-traceability.csv`（`7ece3d3ca7bbdce8a4c8de4431e0c0b057e146ea`）。953行すべて `acceptance_status=未受入`、895行に`condition_ref`、58行は空。208 Behaviorすべてを追跡している。79要件ごとに`requirement_analysis.sut_case_trace`へ、代表Behaviorと#219 CSV上の正確な`behavior_id`/`condition_ref`の組を記録し、参照先不在0件。合計205組の代表Behavior、条件参照993件、条件空44件（要件間の重複を含む）。仕様期待・Risk/TR/Case採否・横断契約の正本は既存`requirement_analysis`と各要件本文。
- **未受入**：#219 CSVに独立`case_id`列がなく、記録した組は正式Case IDの発行を意味しない。各Caseの採用確定と動的PASS、実Run ID/exit code/DB・Trace・Visual・Androidは未取得。29件のCase候補・既存テストの静的照合と#219から受領した一部の実Run証拠の台帳反映は、担当タスクとして完了チェック済み。これは正式Case IDの発行や全採用Caseの採否・実Run/DB/Android/Visual受入を意味せず、未受入条件は#199の最終工程で判定する。CIの完了は待たず、今回の直接`pnpm`実行は未実施。

### #219実行証拠の受渡し（2026-11-04）

- #213照合前HEAD：`f4ed749cd307b9b7442b9f8adec5af5dbd2894cb`。#219の固定引継ぎレポート`docs/reports/2026-11-04_pr219-analysis-case-run-handoff.md` blob `32d397bc11dd57e20499a2edda5351eaae7a09d7`、Web Run 41792378802（HEAD `5e91b912e72cd6c0bb9b683a1ae7470fb56cf833`・cross-role job `126449277139` success・15件PASS）、Run 41795950215（HEAD `9adff1e41687e14d20af8ebf9ba22bf588df0605`・Integration job `126460341746` success 123件PASS＋2件expected fail、Component job `126460341893` success 104件PASS＋1件expected fail、cross-role job `126460743631` failure内でempty 2件個別PASS）、Run 41796764234（HEAD `2cd64eaff7eb64fefa7d440905702cb69a3a803b`・Integration job `126462596786` success 125件PASS）をジョブログと対照。
- 受領対象：分析台帳の**10 Behavior・18件のケース証拠**を`pr219_runtime_evidence`に、テスト名・ファイル・Run/HEAD・job ID・観測・未受入条件とともに記録。Web管理Role/Rank/停止・検索・権限拒否・ストア商品0件の該当条件PASSと、停止staffの戻りリンク・失効actor更新の**製品FAIL再現**、商品管理E2Eの**TEST ERROR**を区別。
- 限界：上記workflowの全体結論はsuccessではない。失敗を期待するテストまたは現不具合をassertするテストのjob成功を製品適合PASSと数えない。#219の953条件参照CSVはなお全行`未受入`である。#210 HEADでの修正後受入、Android/SQLite・全表DB/Trace/視覚・一部Web Caseは未実行。固定Runと対応する**一部の結果を受領・転記するタスクのみ**完了チェックし、全採用Caseの動的受入を宣言しない。

### PR差分と他ブランチへの受渡し（2026-11-04）

- #213差分確認：base #199 `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`、レビュー直前HEAD `73013e3b336d4840623542b07b7bc826a35ba727`。変更4ファイルは`training/ai-assisted-qa-course/coverage/supported-behaviors.json`、`scripts/training/validate-supported-behaviors.mjs`、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`、本タスクリストだけ。製品SUT/正式仕様/Seed/Reset/他PR専有資料・共通知識グラフの変更なし。PRはDraftであり独立レビュー承認やマージ許可ではない。
- #219へ[実Run/Case IDの不足依頼](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/219#issuecomment-6626681708)を投稿。#213へ[レビュー用証拠・未受入の説明](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/213#issuecomment-6626771774)を投稿。10 Behaviorの18件の部分証拠と製品FAIL/TEST ERRORは正本JSONに記録し、Runと該当Caseを分離した。
- CI確認（完了待ちはしない）：旧HEAD `7df0503`の[Web CI #41802509407](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41802509407)でStyle QualityはPrettier警告によりfailure。対象は本PR専有のValidatorと契約テスト。後続コミット`a578d12`と`73013e3`で条件式・長行を修正したが**最新HEADでのStyle/契約/verify成功は未確認**。直接`pnpm`/Vitestコマンドはこの環境から未実行であり、実行したと記載しない。検証結果の実施/未実施と他ブランチ依頼をレビュー可能な形で記録したため本項目のチェックを付した。Validator/CI受入は後続HEAD `d213e5b1` のWeb CI #41807455738で成功を確認し、担当タスクのチェックを完了した。後続コミットのCI結果をこのRunから推認しない。

### 分析台帳・Validator・契約テストの固定HEAD受入（2026-11-04）

- 比較起点：`5ecf266f131d`の台帳は179/188操作、17/20非default状態が`analyzed`、79要件は`needs_content_review`。照合済みの分析コミット`d213e5b102b056075f20ef6e3b422bc1d09aa025`では188/188操作（172画面操作＋16独立Use Case）、20/20非default状態、79/79要件が静的基本分析済み。追加分析した9操作・3状態は上記「残9操作」「残3状態」の各ID。29横断要件は直接参照なしを維持し、採用Caseの実Run受入とは別。
- [Web CI #41807455738](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41807455738)：対象HEAD `d213e5b1`、workflow全体`completed/success`。Style Quality、Code Quality、`Vitest (contracts)`、Chromium E2E (required)、`verify`、`validate`が成功。契約テストは74ファイル成功・1102件PASS・1件expected fail・15件skipped。専用`ai-assisted-qa-supported-behaviors.test.mjs`は58件PASS。正常系・負例から`validateCoverage({ root })`を実行し、分母/79要件/Use Case参照の整合を検査。
- 直前の失敗Run #41803626336（HEAD `8e90a369`）は専用Validator/契約テストのPrettier不一致と37要件の`dynamic_acceptance`表記不一致が独立原因。後続の`4d95aee`で37件の動的受入未完を明記し、`d213e5b`で短い式を整形。上記最新固定HEADの成功により両方の回帰を解消。
- 検証の限界：この作業環境での単独`node scripts/training/validate-supported-behaviors.mjs --require-complete`とローカル`pnpm`コマンドは未実施。CIの契約テストが直接`validateCoverage`を呼び出した事実と区別する。CI成功は全採用Caseの実Web/Android/DB/Trace/Visual受入または#210の製品修正受入を意味しない。本チェックを付けた文書のみの後続コミットの新CI結果を過去HEADの成功から推認しない。

### 29件の横断要件と既存テストの内容監査（2026-11-04）

- 対象固定HEAD：`d08be6415d124d1f34a6c1e4c8a2230e741cc1ab`（変更前）。直接要件参照のない29件はNative 4・Role 7・Transition/State 10・UI 2・Scope/Platform 6。静的分析の正本は`training/ai-assisted-qa-course/coverage/supported-behaviors.json`の各`requirement_analysis`・`test_condition`・`case_policy`・`sut_case_trace`。下記は既存テストを読んだ確認範囲と未受入条件の**引継ぎ索引**であり、第二の正本ではない。
- 各行の既存テストは、上記正本の`cross_cutting_contract`にある同名ファイル（`tests/contracts/`、`tests/component/`、`tests/integration/`、`e2e/web/`）に対応する。テスト名・コードを静的確認した。**ファイルが存在するだけで要件の全条件を検証したことにはしない**。既存CIで通過したテストも、そのassertionに含まれない条件までPASSへ拡張しない。

- `BR-NATIVE-001` — `native-runtime-service-surface.test.ts`。既存の静的確認範囲：顧客サービスAPI/非管理Roleの静的契約。#219へ依頼する未受入条件：WebとAndroidのLogin〜ReviewのDTO・Error・State同等実Run。
- `BR-NATIVE-002` — `native-sqlite-transactions.test.ts`。既存の静的確認範囲：排他transaction・失敗時rollback等の契約。#219へ依頼する未受入条件：Production bundleへのTest Control混入、実端末SQLite制約。
- `AC-NATIVE-001` — `native-runtime-service-surface.test.ts`。既存の静的確認範囲：Native顧客サービス提供範囲と非顧客Role拒否。#219へ依頼する未受入条件：Cart→Checkout→Payment→Order→ReviewのWeb/Android実行同等性。
- `AC-NATIVE-002` — `native-ci-workflow.test.ts`。既存の静的確認範囲：Automation/ProductionとAndroid/iOSのworkflow契約。#219へ依頼する未受入条件：成果物の本番汚染検査・Android実行/iOS build証拠。
- `ROLE-01` — `route-guard.test.tsx`。既存の静的確認範囲：未認証Route・本番Test Control拒否。#219へ依頼する未受入条件：Guest Cart許可、顧客/管理Use Case・Routeの拒否とDB不変。
- `ROLE-02` — `auth-account.test.ts`。既存の静的確認範囲：顧客本人のProfile操作・管理Role排除。#219へ依頼する未受入条件：Checkout許可、他人Order/住所と管理Routeの拒否。
- `ROLE-03` — `auth-account.test.ts`。既存の静的確認範囲：認証・Session関連契約。#219へ依頼する未受入条件：停止/退会の新旧Session・Checkout拒否をWeb/Androidで区別。
- `ROLE-04` — `ai-assisted-qa-admin-users-list.test.mjs`。既存の静的確認範囲：operatorのUser DTO拒否・DB不変。#219へ依頼する未受入条件：Store管理許可、User管理/CheckoutのRouteとUse Case拒否。
- `ROLE-05` — `review-user-use-cases.test.ts`。既存の静的確認範囲：admin Role/Rank/Status変更の統合契約。#219へ依頼する未受入条件：Store/User管理許可、Checkout拒否と競合・自己変更境界。
- `ROLE-RANK` — `checkout-order-use-cases.test.ts`。既存の静的確認範囲：金額/Rank再検証・Checkout拒否。#219へ依頼する未受入条件：regular/gold/platinum閲覧制限と送料・Discount、表示金額との一致。
- `ROLE-STATUS` — `review-user-use-cases.test.ts`。既存の静的確認範囲：Status変更・Session失効。#219へ依頼する未受入条件：active↔suspended/withdrawn、再開後旧Session不復活・DB不変。
- `TRANSITION-PRODUCT` — `admin-product-use-cases.test.ts`。既存の静的確認範囲：下書き生成・公開可否/削除の境界。#219へ依頼する未受入条件：draft/published/unpublished/discontinued全辺・拒否/終端とversion。
- `TRANSITION-ACCOUNT` — `review-user-use-cases.test.ts`。既存の静的確認範囲：Status変更と自己/withdrawn拒否。#219へ依頼する未受入条件：双方向許可・同値/旧version/actor失効拒否、Session/DB不変。
- `TRANSITION-CHECKOUT` — `checkout-order-use-cases.test.ts`。既存の静的確認範囲：開始/再開・Cart version整合。#219へ依頼する未受入条件：active→converted/abandoned/expiredと24h期限/再利用禁止。
- `TRANSITION-ORDER` — `admin-operations-use-cases.test.ts`。既存の静的確認範囲：paid→delivered操作・version更新。#219へ依頼する未受入条件：pending_payment/payment_failed含む全辺・逆遷移拒否/History不変。
- `TRANSITION-SHIPMENT` — `admin-operations-use-cases.test.ts`。既存の静的確認範囲：Order/Shipment同時更新。#219へ依頼する未受入条件：pending→shipped→delivered各辺・逆転/旧version/rollback。
- `TRANSITION-REVIEW` — `review-user-use-cases.test.ts`。既存の静的確認範囲：Review公開/削除とsummary。#219へ依頼する未受入条件：published↔hidden→deletedの全許可/拒否と再投稿/rollback。
- `TRANSITION-CART` — `cart-use-cases.test.ts`。既存の静的確認範囲：Guest abandon/Cart更新・上限境界。#219へ依頼する未受入条件：consumed/abandoned終端・Cart統合・旧Cart/重複購入の拒否。
- `STATE-TERMINAL` — `review-user-use-cases.test.ts`。既存の静的確認範囲：Review deleted・withdrawn保護の一部。#219へ依頼する未受入条件：Product/Order/Review/Checkout/Cartの6終端を個別に逆遷移拒否。
- `STATE-BOUNDARY` — `ai-assisted-qa-checkout-confirmation.test.mjs`。既存の静的確認範囲：stale Cart・価格/Rankなど確認境界。#219へ依頼する未受入条件：Loading/Empty/Error/Conflict/NotFound・processing中取消/再試行。
- `STATE-NATIVE` — `native-runtime-service-surface.test.ts`。既存の静的確認範囲：Native顧客サービス範囲。#219へ依頼する未受入条件：NATIVE_CUSTOMER_SCENARIOSのAndroid/SQLite/Navigationの実Run。
- `UI-BREAKPOINT` — `mobile-boundary.spec.ts`。既存の静的確認範囲：320px・900px filter同期/管理Route警告。#219へ依頼する未受入条件：767/768/1023/1024px・390×844と320×700、焦点/管理操作禁止。
- `UI-DESIGN` — `native-visual-contract.test.ts`。既存の静的確認範囲：共通Tokenと44pxタッチ規約の静的契約。#219へ依頼する未受入条件：Web/Android実画面・正本画像の配色/余白/タッチ寸法比較。
- `SCOPE-SUPPORTED-1` — `catalog-use-cases.test.ts`。既存の静的確認範囲：Catalog閲覧者/固定Clock/検索の一部。#219へ依頼する未受入条件：Facet・Sale・在庫・Variation・Review要約をWeb/Androidで実行。
- `SCOPE-SUPPORTED-2` — `checkout-order-use-cases.test.ts`。既存の静的確認範囲：Checkout/Payment・Snapshot。#219へ依頼する未受入条件：Guest→Customer Cart統合からCustomer購入・決済、Guest Checkout拒否。
- `SCOPE-SUPPORTED-3` — `review-user-use-cases.test.ts`。既存の静的確認範囲：Review/集計・管理操作。#219へ依頼する未受入条件：Order/Address/Rank/価格Snapshotと決済・配送・本人Review接続。
- `SCOPE-SUPPORTED-4` — `admin-operations-use-cases.test.ts`。既存の静的確認範囲：在庫/Order/Shipment管理操作。#219へ依頼する未受入条件：Category/Brand/Product/Review/Userをoperator/adminで権限別受入。
- `SCOPE-SUPPORTED-6` — `accessibility.spec.ts`。既存の静的確認範囲：WebのGuest/Customer/Admin代表a11yとFocus。#219へ依頼する未受入条件：全対象状態・幅別のKeyboard/ScreenReader/Empty/Loading/Conflict/NotFound。
- `PLATFORM-NATIVE` — `native-ci-workflow.test.ts`。既存の静的確認範囲：Android/iOS workflow・本番/Test構成。#219へ依頼する未受入条件：Native顧客機能Android実行、Native管理/Guest Checkout非提供確認、iOS Build-only。

- 採用判断：記載した不足条件は`test_condition`に従う実行候補。仕様対象外のNative管理機能・Guest Checkout・iOS実機検証、成立しない状態遷移や同一Caseの二重計上は不要。その他の不足条件は「未受入」であり「未テスト確定」ではない。必要な既存Caseを再利用し、足りない観測だけを#219が追加・実行する。証拠のないPASSやテスト作成済みだけのPASSを採用しない。
- #219への依頼：29の要件IDそれぞれに採用/既存兼用/不要/保留を判断し、独立Case ID（`behavior_id`・`condition_ref`だけでない）と既存テスト名・具体的assertion、Platform/Role/Seed/Clock、#199側か#210側か識別できる固定SUT/Test HEAD、期待・観測・Run/job/exit・DB前後・Trace/Visual/Androidの実在する証拠、未実施なら再開条件を返す。#219の953条件参照CSV（blob `7ece3d3ca7bbdce8a4c8de4431e0c0b057e146ea`）には`case_id`列がなく、受入状態は全件「未受入」。実行Case IDを**創作しない**。
- **完了チェックの範囲**：本項目は29要件の既存テスト・Case候補・不足条件を静的に照合し、#219/#199へ引き継ぐ作業としてチェック済み。正式Case IDの採用・全採用CaseのRun対応、実行済み/未実行/製品FAIL/TEST ERRORの最終受入判定は未完了であり、#199の最終工程で証拠付きで確定する。

## 2026-11-05 29横断要件の静的Case再利用・受渡し

- 照合基準：変更前の分析台帳Blob `132301c4cfe0e9886e8176157c807b70713ced98`、#199 HEAD `166412cf402f07ed3b4229eb6b3aeb6b5dd5cadf`、#219の横断要件候補CSV Blob `da0d14b148e94034952ae13aa3968f6d0b0cd8b2`。#219の実Run/Test SHAと混同しない。
- 29要件全ての `requirement_analysis.case_reuse_review` に、実在する既存テスト名・参照先（16ファイル）、Role/Platform/State/Seed、追加Case候補の不足条件、#219のWeb暫定証拠キー候補を記録。代表Behavior一致の候補キーがある要件は10件、ない要件は19件（候補参照43件、要件間重複含む）。テスト名や`PR219-WEB-`キーは正式Case IDではない。
- 各要件で既存テストの該当assertionを再利用し、不足条件を追加Case候補として#219へ引き継ぐ。Native管理/Guest Checkout/iOS実機など対象外の条件をCaseに追加しない。既存テスト・候補キーがあること自体を要件PASSとしない。正式Case ID、Run/DB/Android/Visualの製品適合、#210未マージ修正の受入は引き続き未確定・未受入。
- 専用契約テストに29件全ての既存テスト名の実在・固定CSV参照・必要メタデータ・未受入状態の検査を追加。GitHub上で16テストファイルの実際のテスト名を静的確認済み。ローカル`pnpm`/Vitestは未実行。
- 変更前HEAD `111061fb3ee9a334ab15ed180e4c9f0488c1a85b` の [Web CI #41862801885](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41862801885) はworkflow全体success。変更後HEAD `3251b58` の [Web CI #41936366723](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41936366723) は2026-11-05にworkflow全体`completed/success`（Style・Code・Vitest・Chromium・verify・validate成功）。本節以降の変更HEADのCIは別のRunで確認する。24/24は#213の静的分析・証拠引継ぎであり、#219と#199の最終実受入完了を意味しない。
