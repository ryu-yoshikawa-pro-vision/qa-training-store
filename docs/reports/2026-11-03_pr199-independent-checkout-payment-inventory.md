# PR #199 非干渉基本分析：Payment／管理在庫の再照合と残24操作

## 状況（2026-11-03、独立ブランチ）

- 作業ブランチ：`work/pr199-parallel-supporting-analysis-20261103`
- 今回の引継ぎ起点：`90f75eb79a3462f75d1e5a1b405b309b231b1aeb`（159/188操作、17/20状態）
- 今回の静的基本分析：**+5操作**、最新**164/188操作（87.2%、残24）／17/20非default状態（残3）**
- 解析用台帳：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`
- 台帳更新コミット：`400f7db756d223bc207b264a62aff12c8ed335ab`、`ae5fc0943d2b4d5c9f39b67510711f8d5df01dfd`
- PR #199本体の比較時HEAD：`b671561a834998a58ef59c3047b7d47e76569c9c`、121/188操作／17/20状態。独立ブランチのみでanalyzedの43件はPR未取込（固定HEAD比較）。取込前に再計算する。

**重要**：`analyzed`は正式仕様・Web/Native実装・Seedを再照合した静的な基本分析の状態であり、製品適合PASS・直接Web/Android実Run・教材評価・CI成功は含まない。

## 今回analyzedへ変更した操作（5件）

| ID | 内容 | 実Run待ち |
|---|---|---|
| `SCREEN-ADMIN-INVENTORIES-A02-02` | Web expectedVersion→Use Case→Dexie Version判定→在庫と履歴のtransaction、実Seed/既存テスト | 成功後stale送信・真正の同時競合・履歴書込み途中失敗・Role・UI復帰 |
| `SCREEN-CHECKOUT-PAYMENT-A01-01` | 4モックコード、Web/Native UI・Application・Dexie/SQLite制約を比較 | 不正コードのWeb保存可能性、Android CHECK拒否とエラー、DB前後 |
| `SCREEN-CHECKOUT-PAYMENT-A01-02` | 保存成功後のconfirm遷移と拒否時のWeb未捕捉Promise/Native catch差 | Web実エラー・非遷移/表示/再試行、Native実機、Session不変 |
| `SCREEN-CHECKOUT-PAYMENT-A02-01` | 住所未保存StepのgetActive拒否、Web/Native UIとDexie/SQLite guard | 直URL・Role/expiry・DB前後/Android ready marker |
| `SCREEN-CHECKOUT-PAYMENT-A02-02` | Cart.version mismatchの拒否、固定Seedのaddress Stepを区別、Web/Native復帰導線 | Payment到達後の版更新、戻り先・Session/Order/Payment不変 |

## 製品側での判断候補（#210。今回修正せず）

1. **Webの支払コードruntime検証不足**：`CheckoutOrderUseCases.setPayment:170-174`に許可コード検証はなく、Web Dexie `setPayment:684-710`も値をそのまま保存。Android SQLite `schema.ts:187`には4コードのCHECK制約があり、Web/Nativeで失敗条件が異なる。実際の不正値注入・保存結果は未実証。
2. **Webの支払保存失敗表示**：`checkout-order-pages.tsx:263-275`は`try/finally`のみで`catch`がなく、`onClick={() => void submit()}`から拒否時未処理Promiseとなる経路。Native `native-purchase-screens.tsx:861-876`は`catch`でエラー表示する。製品差分分離前の『修正済み』を現行SUTに継承しない。
3. **Cart不一致時の復帰先**：正式`BR-CHECKOUT-002`はCartへ戻すが、Web Paymentの`CheckoutLoadError href="/checkout/address"`は不一致理由を区別しない。Nativeは専用のCart復帰Linkなし（共通ナビゲーションの復帰可能性は実機未確認）。
4. **在庫競合後の再選択**：Web管理在庫は調整失敗時に選択済みVersionを更新せず、同じフォームを再送すると再競合する可能性がある。再取得・閉じて再選択する導線の実Web確認が必要。原子性は`adjust-inventory` transactionで実装されるが、実並行・履歴書込み途中失敗は未実証。

## 残る基本分析24操作（ID別）

### Checkout・住所（5件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-CHECKOUT-ADDRESS-A01-01` | Webの登録済み配送先選択とNativeの直接入力、正式『配送先を選択』契約、本人所有・Snapshot/保存前後を照合 |
| `SCREEN-CHECKOUT-ADDRESS-A01-02` | setAddress成功後だけPaymentへ進むこと、Session.version/unlockedStep、失敗時非遷移・復帰・Role/expiry |
| `SCREEN-CHECKOUT-ADDRESS-A02-01` | 再開通知の初回/再読込抑止/Reset後、one-time-notice.web.tsとSession ID、Web/Native差を直接実Run |
| `SCREEN-CHECKOUT-ADDRESS-A02-02` | 期限切れ/他人/旧Cart versionでの古いSession通知、getActive/startOrResume/エラー表示、通知とDB状態を分離 |
| `SCREEN-CHECKOUT-ADDRESS-A02-03` | Cart更新後の旧Checkout abandoned、新Session作成とreplaced通知、Web one-time表示/Native扱い |

### Checkout・注文確認（7件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-CHECKOUT-CONFIRM-A01-01` | Cart明細と確認DTOの商品/Variant/SKU/数量/lineTotal比較、2商品以上・Web/Android |
| `SCREEN-CHECKOUT-CONFIRM-A01-02` | 本人配送先Snapshot・保存済み住所変更後の不変、別ユーザーの住所表示防止、Web/Native |
| `SCREEN-CHECKOUT-CONFIRM-A01-03` | Subtotal/会員割引/送料/Total、Cart更新・Price変更・Membershipの境界、金額の再計算 |
| `SCREEN-CHECKOUT-CONFIRM-A01-04` | 保存済みpaymentMethodCodeと確認UI表示の一致、4方法の表示・権限・別Session |
| `SCREEN-CHECKOUT-CONFIRM-A02-01` | 古いCart versionでbeginOrder拒否、Order/Payment/Inventory/Historyの完全な非作成・復帰導線 |
| `SCREEN-CHECKOUT-CONFIRM-A02-02` | 価格差異時の注文確定拒否、差異検出タイミング・Cart/Order/Payment/Inventoryの不変・正本との一致 |
| `SCREEN-CHECKOUT-CONFIRM-A02-03` | カート・配送先・支払方法への修正導線、戻り先と解放Step、Web/Android差・直接URL |

### Checkout・完了（3件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-CHECKOUT-COMPLETE-A01-01` | mock成功/失敗/処理中の画面遷移とpaid/Payment/Order/Inventoryの状態一致・冪等性 |
| `SCREEN-CHECKOUT-COMPLETE-A01-02` | 業務注文番号orderNumberと内部orderIdの分離、default paid Seed・Web/Android表示 |
| `SCREEN-CHECKOUT-COMPLETE-A01-03` | 本人だけの注文履歴への遷移と照合、guest/他人・paid/failed・注文番号一致 |

### 管理・商品（1件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-ADMIN-PRODUCTS-A01-02` | filter変更後のPage/選択残留・一括対象0件/未捕捉VALIDATION、20/21件・多商品・正式UI期待判断 |

### 管理・ユーザー（1件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-ADMIN-USERS-A01-02` | Role/Rank/Status、登録日/更新日sortの正式補助UI仕様とWebにない条件の適合判断、Use Case実条件 |

### 管理・ユーザー詳細（定期実行優先）（6件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | Role変更の許可範囲・自己変更禁止・Version・Session失効・最終管理者保護 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | 会員Rank変更の権限・本人価格/Checkout・Session波及・変更履歴・競合 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | account status停止/復帰/withdrawn変更可否・認証/Cart/Sessionの後続制約 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | 自分自身の管理権限変更拒否、変更者・対象者一致条件・DB/Session不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | withdrawnユーザーへの変更拒否、Use Case/Repositoryの権限・状態変更不変 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | 最後のactive adminの変更拒否、管理者2人同時変更の競合とTransaction内再検証 |

### 権限境界（1件）

| ID | 残る確認・受入 |
|---|---|
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | Web/Native RouteGuardの権限不足表示、停止staffの復帰先ループ・情報非露出・DB不変 |

## 非default状態の未受入3件

| ID | 残る根拠と実証 |
|---|---|
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | 正式storefront.mdは商品0件時に戻り導線を要求。一方Webのunfiltered `/products` はCTAなし、既存component testもCTAなしを期待。製品適合判断と実表示/視覚受入が残る。 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | Web再開通知の初回表示・リロード後抑止・Reset後再表示・Session ID別表示、実ブラウザ証拠が残る。 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | 旧Cartで確定拒否/正しい修正導線/Order・Payment・Inventory不変、Seedのaddress未解放とCart版競合の再現条件を分けた実証が残る。 |

## 基本分析以外の残タスク（独立管理）

| 対象 | 具体的な作業・完了条件 |
|---|---|
| 分母・完全性 | 188操作・20状態をscreen-catalog、BR/AC、公開Use Case、Role/Platform、画面数、`action/use_case/state`区分と全件照合。抜け/二重計上を洗う |
| 分析済み164件の品質 | 分析根拠のファイル/行/署名、現SUTと旧#210差分の混入、Seed実値、Case採否、実装経路、Web/Android差、例外・回復をIDごとに再監査 |
| Web直接検証 | PlaywrightのReset→Role/Session/Cart/Version/price/stockを正常・境界・異常で実Run。画面/DOM/IndexedDB前後、Trace/スクリーンショット/失敗ログを操作IDへ保存 |
| Android直接検証 | Native UI・SQLiteの保存/再起動/セッション/失効、Roleと購入導線、Maestro実行、Web差・セッション/Order/Payment/Stock不変の証拠 |
| 視覚・アクセシビリティ | 正本画像とのWeb desktop/tablet/Android比較、keyboard/focus/スクリーンリーダー/ラベル/エラー復帰を画面状態ごとに検証 |
| 製品 #210 | 支払方法境界/保存エラー/Cart復帰・在庫Version/管理商品0 SKU価格に加え、Test API Build未設定、Reset途中失敗、Nativeレビュー、Cart同時更新/価格同意/住所/ログイン等の既知候補を製品専用ブランチで判断。#199で製品SUTは修正しない |
| 教材 #211 | 学習用契約テスト、教材・演習・評価の整合、Skill、実技/採点/再提出・受入の証拠を照合 |
| M00〜M10 | 11モジュール・51目標ごとに説明/演習/採点ルーブリック/期待結果/実行証拠/教材リンクの相互整合、配布後実ロード |
| M02→M03 | 固定Skill runtime受け渡し、IDE依存のない起動・パラメータ伝搬・停止/失敗経路を実行確認 |
| M04/M07/M10 | OpenCodeなど実モデルで評価の校正、誤PASS拒否、反例、再提出、異常終了と証拠の整合 |
| M05〜M07 | Playwright実Run/Trace、期待結果/再実行、学習者が判断する範囲、fixture/DB前後を実証 |
| M08 | 本人によるGit操作・branch/commit/push/PR理解と証拠による受入（代理で本人実施扱いにしない） |
| M09〜M10 | Private repoでCI run/check/artifact/SHA・秘匿情報・権限/実行条件/失敗時評価を同一実SHAで確認 |
| 配布 | `course:sync`、全hash、22状態、M00〜M10ロード、同期中断/差分/再同期/復旧を実行 |
| セキュリティ・ライセンス | Secret/個人情報/公開素材、配布JS/CSS、第三者License/NOTICEの実配布物監査 |
| PR #199統合 | 最新PR HEADと独立HEADで各behavior IDとfield単位の三者比較。43件の未統合analyzedは固定HEAD時点の数であり、定期実行成果を上書きせず差分取込/矛盾解消する |
| 最終CIとレビュー | PR #199の**統合後同一最終HEAD**でWeb/Mobile必須job、契約、lint、typecheck、E2E、独立レビューを確認。過去のCIを流用しない。Mobile PR trigger復元はマージ準備時 |
| 本人作業境界 | Public Template作成、Private 2-core Codespaces実受入は合意に従いマージ後。merge/force-push/branch削除/Issue作成/課金/公開は未実施 |

## 競合防止、差分検証

- 変更はこの独立ブランチの`supported-behaviors.json`で上記5操作のみ。他203件のbehavior ID、requirements、use_case_methods、正式仕様、製品SUT、既存Seed、テスト、共通Plan、PR #199本体、#210/#211には書き込んでいない。
- 前コミットと比較して`159→162→164/188`、状態`17/20`を確認。要素順序・その他トップレベルJSONも維持。
- GitHub connectorでのソース静的照合・データ構造比較・コミットは実施。ローカル`validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは実行していない。全量台帳の追加validator受入は残る。

## 次の独立作業候補

未分析のうちCheckout Address 5件とConfirm 7件を、Role/Cart/Session/Seedの分岐を整理して静的基本分析へ進める。特に`SCREEN-CHECKOUT-ADDRESS-A02-02`（未完成の実装照合）と`SCREEN-CHECKOUT-CONFIRM-A02-02`（価格差/注文非作成）が優先候補。管理ユーザー詳細6件は定期実行と競合しやすいため独立側では触れない。いずれも製品適合/実証の未受入は別管理。
