# PR #199 分析台帳・要件照合タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。この文書は作業ブランチ専用の未完了タスクリスト。開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、関連仕様・テスト、最新HEAD/CIを確認する。
>
> **完了判定**：各項目の受入条件と検証証拠（対象HEAD、ファイル/Case、コマンド・Run/ログ・結果）を記録してから`[x]`へ変更する。調査・テスト追加・CI通過だけでは自動的に分析/教材受入完了にしない。実行不能なら未チェックで理由と再開条件を残し、他の着手可能な項目へ進む。
>
> **変更境界**：本ブランチの担当範囲だけを編集。製品SUT・正式仕様・既存Seed/Reset・既存製品テストは読み取り専用。共有ファイルや他ブランチの専有ファイルが必要なら、PRコメントに理由・影響・受入条件を記録し#199で調停する。#199へのマージは行わない。

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
- [ ] `SCREEN-BOUNDARY-FORBIDDEN-A01-01`：停止staffの戻りリンク循環、Web/Native拒否理由差、別Role・直URL・情報保護とCase採否を確定

## 残3状態の基本分析

- [ ] `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`：パンくずの戻り導線と正式仕様の関係を確定。パネル内CTA欠落だけで製品不適合と断定しない
- [ ] `SCREEN-CHECKOUT-ADDRESS-S-resume-notice`：同一/別Session、初回/再入場/Reload、Resetと期限・Cart版の条件を確認
- [ ] `SCREEN-CHECKOUT-CONFIRM-S-stale-cart`：確認画面到達後のversion変更、拒否・復帰・Order/Payment/Inventory非変更を整理。Seedの初期unlockedStepと混同しない

## 全件照合・回帰防止

- [ ] 正式仕様（product-scope、screen-catalog、各feature、Role/State/UI/Native）と188操作・20状態の分母を再監査。抜け・同義重複と除外根拠を確定し、分母が変わる場合は理由と契約テストを更新
- [ ] 79要件の原文解釈・正式期待・Risk/TR/Condition/Case採否を全件確認し、分析状態を証拠付きで更新（29件の直接未参照も含む）
- [ ] 直接参照のない29横断要件（Native4、権限7、状態遷移10、UI2、範囲6）をBehavior個別または横断契約に割り当て、対応する検証方法・残リスクを記録。形式を揃えるためだけの架空の参照は追加しない
- [ ] 分析済み全196 Behaviorの説明・Risk/TR/Condition/Case採否・参照根拠を監査し、形式的な空欄検査と意味上の十分性を区別
- [ ] `use_case_evidence`の公開メソッドID/path/line/signatureを現在HEADの76メソッドと照合する継続validator/負例（誤ID・古い行・署名違い・別メソッド）を追加
- [ ] 分析済みだが`related_use_cases`が空の23件をUI専用等として個別判定し、追加が必要なものだけ追跡。補助・準備用Use Caseを直接呼出しと誤記しない
- [ ] 分析台帳変更の直接validator/契約テストとWeb CIを確認し、9操作/3状態・79要件のbefore/afterを固定HEADで報告

## 完了条件

- [ ] 分母を確定し、全対象の分類率・証拠付き基本分析率が100%。未決は未完のまま扱い、製品適合や動的受入の未完を別途#199へ引継ぐ
- [ ] 自分の所有ファイルの検証結果、他ブランチへの証拠依頼、PRの差分をレビューできる状態にする

## 要件ID・実行証拠の受渡し（補完）

- [ ] 79要件ごとに、正式仕様のBR/ACと期待結果、参照Behavior/横断契約、Risk/TR/Condition/Caseの採否、根拠ファイル・検証結果・未決事項を追跡する。**既存`supported-behaviors.json`を正本**にし、必要なら同JSONから参照対応を導出する。別の手入力正本は増やさない。未レビュー要件をまとめて完了扱いにしない
- [ ] 29件の直接未参照要件は「未テスト」と決め付けず、個別Behaviorまたは横断契約/既存テストのどこで検証するかを要件ID別に確定。不足・保留・不要の理由と、#219に依頼する実RunのCase ID/条件を記録
- [ ] #219から受け取った採用Caseの実行証拠は対象HEAD/Case IDを確認し、台帳へ必要な根拠を反映する。#219の動的PASSを基本分析ステータスへ自動転記せず、製品修正は#210へ引継ぐ

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
