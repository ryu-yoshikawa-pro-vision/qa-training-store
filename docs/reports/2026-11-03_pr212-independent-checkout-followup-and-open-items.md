# PR #212 独立分析：Checkout追加15操作と未完了タスク（2026-11-03）

対象：[`PR #212`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/212)（base は [`PR #199`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199) の作業ブランチ）、独立head `work/pr199-parallel-supporting-analysis-20261103`。

## 作業範囲・判定の意味

- 正本の読み取り：`docs/spec/**`、`src/**`、`src/seeds/**`、既存の `tests/**`、`docs/05_ui/ui_specifications.md`。
- 書込み：`training/ai-assisted-qa-course/coverage/supported-behaviors.json` とこの独立分析レポートだけ。製品コード、正式仕様、既存Seed/Reset、既存製品テスト、PR #199、#210、#211には書き込まない。
- `analyzed` は **ソースに基づく基本静的分析が済んだ状態**であり、仕様適合、テストPASS、Web/Android動的受入、製品の修正済みを意味しない。
- 基準にしたPR #199のHEADは `b671561a834998a58ef59c3047b7d47e76569c9c`。自動実行で更新されるため、取込み時には最新HEADへ再照合する。

## 今回の成果と進捗

| 指標 | 作業前 | 作業後 | 残り |
| --- | ---: | ---: | ---: |
| action / use_case 基本静的分析 | 164 / 188 | **179 / 188（95.2%）** | **9** |
| 非default状態の基本分析 | 17 / 20 | **17 / 20（85%）** | **3** |
| 要件台帳の項目数 | 79 | 79 | 要件ごとの検証網羅監査は未完 |
| Use Case メソッド台帳 | 76 | 76 | 使用経路・受入の個別網羅監査は未完 |

- Checkout Address **5件**：`SCREEN-CHECKOUT-ADDRESS-A01-01`、`A01-02`、`A02-01`、`A02-02`、`A02-03`。
- Checkout Confirm **7件**：`SCREEN-CHECKOUT-CONFIRM-A01-01`、`A01-02`、`A01-03`、`A01-04`、`A02-01`、`A02-02`、`A02-03`。
- Checkout Complete **3件**：`SCREEN-CHECKOUT-COMPLETE-A01-01`、`A01-02`、`A01-03`。
- 上記15件は `review_required`→`analyzed`。各IDに入力条件/期待結果/異常系/Case採用/ソース行の根拠を追加。**実行証拠や製品仕様の未決定部分をPASSと判定していない**。
- 管理商品、管理ユーザー一覧、アクセス拒否の **3操作**について、追加の問題候補/分岐/テスト条件/根拠を更新した。こちらは全て **`review_required`のまま**（進捗の水増しなし）。

## 今回の重要な静的所見（製品変更はしない）

1. **配送先のWeb/Android差**：Web `checkout-order-pages.tsx:115-236` は本人の保存済み住所から選択し、再開したSessionの非既定住所をradio選択へ復元しない。Android `native-purchase-screens.tsx:712-850` は保存済み住所に加え自由入力を許す。`CheckoutOrderUseCases.validateAddressLimits:612-637` は文字数上限のみで必須/郵便/電話形式は検証しない。仕様が自由入力を許すかは確定できない。
2. **再開/置換通知**：Web `checkout-order-pages.tsx:133-147` は `one-time-notice.web.ts:153-160` でSession ID+kind単位の一度だけ通知。Android `native-purchase-screens.tsx:661-697` は `replaced` を `started` と表示し、置換を区別しない。WebのReset時履歴削除と再現には実ブラウザが必要。
3. **注文確認のWeb/Android差**：Web `checkout-order-pages.tsx:319-455` は支払方法・価格内訳・住所/支払方法変更リンクを表示するが、Android `native-purchase-screens.tsx:907-973` には同等の情報/導線がない。Webでも住所の建物名/電話の表示はない。Androidで `getConfirmation` が拒否された場合、`confirmation===null` の永続Loadingが疑われる。
4. **Cart版/価格変更の拒否と戻り先**：Use Case `getActive/getConfirmation/beginOrder` と両RepositoryはCart版/価格差を拒否するが、Web `CheckoutLoadError` は確認ページで `/checkout/payment` に戻し、submit errorは文言のみ。Androidは明示的Cart復帰がない。正式 `BR-CHECKOUT-002` のCart復帰要件との適合判定が必要。なお `cart-version-invalidates-checkout` のSeedは `unlockedStep=address` であり、confirm-ready競合は追加の遷移/変更が必要。
5. **業務注文番号の欠落**：正本完了画面は「注文番号」を要求し、Web `checkout-order-pages.tsx:558-560` は `orderNumber` を表示。Android `native-purchase-screens.tsx:1060-1072` は `orderId` を「注文ID」と表示。default Seedの内部 `order-paid` と業務 `ORD-20260701-0002` は明確に別値。
6. **管理商品絞込の不一致**：補助UI仕様 `docs/05_ui/ui_specifications.md:174-186` ではSKU検索、カテゴリー/ブランド絞込を要求する。Web `admin-product-pages.tsx:56-215` にカテゴリー/ブランド絞込はなく、Dexie `product-repositories.ts:453-459` のキーワード検索は商品名/コードのみでSKUなし。フィルター/ページ変更時 `selected` が残るがbulk対象は現在ページとの積集合で、空対象時 `AdminProductUseCases.bulkChangeStatus:223-233` が `VALIDATION` を投げ、Web bulkのcatchなし。ゼロactive SKU商品の価格計算は `Math.min(...[])` / `Math.max(...[])` になり得る。これらは実ブラウザで未再現。
7. **管理ユーザー一覧のRank/Sort欠落**：補助UI仕様 `docs/05_ui/ui_specifications.md:169-170,174-183` はRank絞込/登録日・更新日sortを要求。Web `review-user-pages.tsx:516-616` はkeyword/Role/Statusのみ、Use Case `review-user-use-cases.ts:520-535` とRepository `basic-repositories.ts:65-105` にはRank/Sortがある。Role/Status変更時にpageもリセットされない。
8. **アクセス拒否の戻り先/説明**：Web `app/forbidden.tsx:5-14` はRoleがoperator/adminなら `accountStatus` を見ず管理画面リンクを表示。停止staffが再度 `RouteGuard:16-55` に拒否されるループ候補。Android `app/forbidden.native.tsx:1-4` は「Native前半の対象外」と説明し、正本 `roles-and-permissions.md:29-57` の権限不足説明と意味が違う。未動的検証。
9. 既存の `ai-assisted-qa-checkout-confirmation.test.mjs:125-375` は所有権・Cart版・価格・支払方法変更で非作成や競合を検査するコードだが、**今回は実行しておらずPASS保証はない**。旧報告にある「製品修正済み」は#210へ分離した現在のSUTで再検証が必要。

## 残り9操作：ID別の作業

### 優先：独立監査済みだが動的・正式適合待ちの3件

| ID | 残る具体的な作業 | 受入証拠・判断 |
| --- | --- | --- |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | (1) SKU/商品名/コード検索の仕様対比、(2) Category/Brand/Rank/Status/Stock0-1-5-6/Price範囲/Sort、(3) many-productsでページ変更後のfilter、(4) 選択Set残留→空bulk、(5) 0active SKU価格境界、(6) Version競合/部分失敗、(7) operator/admin以外拒否 | Web desktop/tablet + DB/Version前後 + Error/Trace + 公式画面との照合。補助UI仕様と正式受入の採否は#210判断候補 |
| `SCREEN-ADMIN-USERS-A01-02` | (1) Role/Status/KeywordのANDとCase、(2) Rankフィルターの欠落、(3) 登録/更新日sortの欠落、(4) 非keyword変更後のpage残留、(5) 20件境界/Empty、(6) operator/customer/停止staffの拒否、(7) 個人情報とSession非露出 | Web desktop/tablet + UseCase直呼びと画面の比較 + DB/Session前後 + 公式/補助仕様との優先判断 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | (1) Guest→Login、(2) Customer→staff、(3) Operator→admin、(4) active/停止staffの/adminリンク、(5) production automation-admin、(6) Android拒否説明と安全な戻り先、(7) 戻る/直接URL/Session失効、(8) 機密DOM非露出・DB非変更 | 実Web/Android・Role/Build別・a11y/画面画像/Redirect Trace。停止staff循環は再現未了 |

### PR #199の定期実行との重複を避ける6件

以下はPR #199側で作業が進む可能性があるため、PR #212で同時に編集せず最新ID/フィールド比較後に担当を分ける。

| ID | 残る具体的な作業 |
| --- | --- |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | operator↔adminの他者ロール変更、Version CAS、自己変更・最終Admin禁止、対象Userの全Session無効化、他表不変、失敗理由/確認Dialog、最新追加契約テストの実行 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | customerのregular/gold/platinum変更、staff Rank編集不可、自己変更拒否、旧Version/他人・停止/withdrawn、変更後Checkout割引・SessionとOrder Snapshotの影響 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | active↔suspendedの状態変更、ログイン/Checkout/Session/Cartへの副作用、withdrawn変更不可、最後のAdmin・自己停止拒否、競合/二重送信/DB復元 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 本人adminの自己降格・自己停止・同権限の再送、UI disabledとUseCaseのSELF_CHANGE_FORBIDDEN、対象Version・権限状態・Sessionの不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | withdrawnのrole/rank/status全更新拒否、Web read-only/リンク/直接API、既存Order/Reviewと個人データの非漏出、Role/Version/DB前後 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 非self最後のactive admin降格/停止でLAST_ADMIN_PROTECTED、複数adminの合法変更、Count同時競合、UI具体理由・transaction rollback・Session不変 |

## 残り3非default状態：操作とは別受入

| ID | 残る具体的な作業 |
| --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | `empty-catalog`で0件/フィルター0件/ロードエラーを区別。正本storefrontの戻り導線要件とWebのActionなし（既存テストもActionなしを期待）の相違を#210で決定。Web Desktop/モバイル、戻り操作、正本画像/a11yを実測 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | `checkout-resume`で初回表示1回→同ID再入場/リロード抑止→別Session再通知→Reset/ログアウト復帰、sessionStorage clear、固定Clock期限・Cart版と区別。Web desktopの表示/Trace/スクリーンショット |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | confirm-readyまで進めてからCart versionだけ変更。固定Seedの`unlockedStep=address`を前提にしない。拒否メッセージ/カート復帰、ダブルクリック、注文・決済・在庫・履歴の前後不変、Web正本画像とa11y。Androidは明示対象外の画面状態として別分析 |

## 横断的な残タスクと受入条件

### 台帳と正本の整合

1. 188操作（172 action + 16 use_case）・20 stateの分母と `docs/spec/screen-catalog.md`、79要件、76 Use Caseメソッドのリンクを画面/Role/Platform/状態単位で照合する。今回は構造数とID一意性までは確認したが、正本と全件突合は未了。
2. 179件の `analyzed` に存在する `expected/risk/test_condition/case_policy/case_selection_reason` 等の空欄を機械検査。今回 **この5項目は179/179埋まっている**。個別の正確性と十分性は未監査。
3. 全208のID一意性、要件参照（79件の定義ID）、関連Use Case参照（76メソッドの定義ID）について機械検査：**重複0・参照不整合0**。これは参照IDの存在確認であり、内容・到達性・網羅性の承認ではない。
4. `analysis_progress` が空の分析済み **8件**：`SCREEN-STOREFRONT-CART-A02-02`, `UC-ACCOUNT-UPDATE-PROFILE`, `UC-ADMIN-CHANGE-CATEGORY-STATUS`, `UC-ADMIN-CHANGE-BRAND-STATUS`, `UC-ADMIN-DELETE-DRAFT`, `UC-AUTH-LOGOUT`, `UC-REVIEW-DELETE`, `UC-CART-MERGE`。経緯・証拠を再読し、必要なら現行正本に合わせて補う。
5. `use_case_evidence` が未設定の分析済み **47件**、`related_use_cases` 配列が空の **23件**、今回の追加監査用 `audit_branch_refs` がない **21件**。UI専用/Use Case専用の操作も含むため直ちに不備と断定しない。個別に必須性と相当する証拠を判定する。
6. 以前の「UI不具合修正済み」「回帰テスト追加済み」の記載を、分離された #210 の製品変更と混同せず **最新HEAD** の実装/実在テスト/CI結果で再評価。古い計画のPASSを移植しない。

### Web/Android・データ整合

1. ResetのVersion・Build種別・Seed/Clock/roleの再現性、再実行/失敗途中/rollback・Session/IndexedDB/SQLiteの前後差を証拠化。
2. Checkoutの住所・決済・確認・処理・成功/失敗・再試行と4種決済、旧Cart、価格/Sale/Rank変更、24時間期限、同時操作、最終在庫不足、二重Order/Shipment/History、本人/別人/無認証を横断。
3. 管理商品・ユーザー・Inventory・Order・Reviewの検索/ソート/ページ/権限/版競合/一括部分成功を固定Seedと操作後変更で検査。
4. Web browser Playwrightで各Role・状態の操作、URL直アクセス、正本画面との比較、DOM/Console/Network/Trace、IndexedDB前後を保存し、少なくとも不具合候補に再現証拠を与える。
5. Android実機または妥当なエミュレータとMaestroで同条件を検査し、Native SQLite、プロセス再起動、Navigation、タップ・戻る操作、スナップショット、不正Roleを確認。
6. デスクトップ/タブレット/Androidの画面画像・レイアウト/可読性/キーボード/フォーカス/スクリーンリーダー/エラー・空状態・通信中表示を比較。
7. 仕様と実装の差は根拠付きで#210の判断・修正候補へ渡す。**製品コード・公式仕様・Seed・既存製品テストをPR #212から直接更新しない**。

### 教材・CI・PR統合

1. PR #199本体の教材M00〜M10（11モジュール）と演習/評価、既知のM02→M03の技法から実行への受渡し、M04/M07/M10の採点、M05〜M07 Playwright、M08 Git、M09/M10 private CIとPR証拠を、教材の受入基準ごとに独立レビューする。
2. `course:sync`、配布用manifest、レッスン/クイズ、学習環境、22状態に関する検証を正本で追跡する。画像/ライセンス・セキュリティ・学習データ保護も検証。
3. `node scripts/training/validate-supported-behaviors.mjs`、契約/Unit/Integration/Vitest、Web Playwright、Android/Maestroを必要な環境で実行し、ログ/終了コード/保存先/HEADを記録。**この作業では一つも実行していない**。
4. PR #199の自動実行を止めたり上書きしたりせず、PR #212の `analyzed` 179件とPR #199最新ID/フィールドの三者比較を実施し、重複/異なる根拠/未決項目の競合を解消してから統合する。
5. PR #199/ #212のCI・Reviewを最終統合**同一HEAD**で確認。Draft解除/mergeは権限のある担当者の判断と明示指示を要し、現時点で実施しない。
6. #210（製品問題）/ #211（教材）、既存Issue/Plan/受入タスクと現成果を参照して未着手・検証待ち・仕様判断待ちを分ける。新Issue、PRのmerge、branch削除、強制pushをしない。

## 検証の範囲と次の作業順

今回の確認はGitHub上の**コード・仕様・既存テストを読み取った静的追跡とJSONの機械整合チェック**。実際のテスト/ブラウザ/Android/CIを実行していないので、`analyzed` 179件を「製品受入済み179件」や「テスト179件PASS」と読むことはできない。

次の優先順は、(1) PR #199最新HEAD差分照合、(2) 管理商品/管理ユーザー/アクセス拒否3件のWeb/Android実行と正式受入判断、(3) 定期実行側の6件を重複排除しながら監査、(4) 非default 3状態の実ブラウザ確認、(5) 179件の既存証拠監査と残要件/教材/CIの最終受入。個別の問題は#210の対象であり、このPRで直接修正しない。
