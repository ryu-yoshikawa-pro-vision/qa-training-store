# PR #199で発見した製品改善候補・既存製品差分の監査

## 対象と更新規則

本レポートは[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)のScenario Shop全サポート動作の分析中に根拠を得た不具合・仕様不整合・UI/UX・性能・保守性・セキュリティ・テスト容易性等を記録する。製品全体の別の改善監査ではない。収集はPR #199の全機能分析と教材技術受入が完了するまで続ける。詳細な機能分析と実装経路は[全機能分析レポート](./2026-10-30_pr199-supported-behavior-analysis.md)を参照する。

同一の根本原因・対象・再現条件は同じ行を更新し、定期実行のたびに日時別に複製しない。各候補の根拠（BR/AC、実装、テスト、固定Seed、実Run）、確認済み事実/仮説、重大度・利用者影響・再現状況、製品適合の判定、教材の成立・代替、既存Issue/PRとの重複、推奨対応を具体化する。情報がない箇所は「未確認」とし断定しない。既存[Issue #97](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/97)は特定日の探索テスト分に対象が限定されており、このレポートの候補を自動で追記しない。新規Issueは原則作成しない。

**基本分析の完了と製品の仕様適合は別判定。** `analysis_status=analyzed`は根拠付き基本分析を意味するだけで、製品PASS・E2E/実画面PASS・不具合解消を意味しない。期待仕様や必要証拠が未決の分析は`review_required`/`blocked`のままとする。改善候補が未修正なだけでは教材受入を止めないが、演習が実行不能なら技術受入の未達とする。現在の候補は実行再現や仕様判断が未完であり、**確認済み不適合と推測を混同しない**。

## 現在の改善候補

| 対象・分類 | 確認した根拠・現象 | 現在の確認状態 | 教材・利用者への影響 | 次の調査・対応方針 |
| --- | --- | --- | --- | --- |
| 在庫0/1〜5/6以上の管理在庫分類（仕様不整合） | `BR-ADMININV-001`/`AC-ADMININV-001`は6以上をavailable、Dexieは1以上で判定。UIの状態列は有効/無効Badge | 静的に差異確認、0/1/5/6の実画面未検証 | 在庫判断と境界値演習の正解に影響。未決期待値を固定しない | 実行再現と表示・件数を確認。製品修正は行わない |
| 商品一覧emptyの戻り導線（仕様不整合候補） | `storefront.md`のemptyは戻る導線要求、Web `catalog-list-page.tsx`は無条件の0件で`action={null}` | 静的照合、実画面未検証 | 教材のレビュー題材には使用可。別の条件で代替可能 | 仕様と画面の差を再現確認し、仕様適合は未確定 |
| 管理商品絞り込みとページ位置（UI動作候補） | `AdminProductsContent`はkeyword以外のフィルターでpage1へ戻らない可能性 | 静的分析、50ページ目からの実再現未実施 | 対象データの見落としを招く可能性、教材の必須修正ではない | many-productsで再現し影響を確定 |
| 注文一覧のNative状態ラベル（UX/仕様判断） | Nativeは内部statusを表示、Webは日本語表示。正式なPlatform別契約は未確定 | 静的な表示差を確認 | Web/Nativeの検証条件を混同しない | 利用者向け表示契約を調査、未決は保持 |
| 決済失敗の理由・復旧・再試行（仕様差・不具合候補） | 失敗理由の汎用表示、Web/Native再試行選択差、復旧導線・reject時表示は分析レポート参照 | 一部コード静的照合、実ブラウザ/Android未検証 | M06/M07の誤った期待結果を防止 | 実再現と仕様判断を分け、確定まで製品修正しない |
| Homeカテゴリー・会員特典のWeb/Native差（仕様判断） | 0件カテゴリーの表示と会員特典/Role導線にWeb/Native差がある | 静的分析。Platform意図は未確定 | 演習の期待結果を固定しない | Platform別BR/ACと画面正本を照合 |
| 商品詳細の多SKU・out-of-stock導線（演習条件） | 13 SKUのWeb select/Native chips差。out-of-stock SeedのTシャツMのみ0だがWebは在庫ありSを初期選択。defaultに単一在庫0商品あり | 既存SeedとUI静的照合、実画面確認は別 | 製品修正せず既存単一SKU商品で代替可 | 真の不具合と単なるSeed選択差を分ける |
| Nativeカテゴリー画面の実名見出し（仕様/UI差候補） | `storefront.md:175-191`はdefaultカテゴリー名表示を要求。Web `CatalogListPage:240-300`は`getCategoryName`で実名、Native `NativeCatalogScreen:119-205`は固定「カテゴリの商品」 | **静的差異確認**、Android実画面・視覚正本との照合未実施。適合判断未確定、重大度Low〜Medium候補 | 商品の絞込自体は成立するが、どのカテゴリーを閲覧中か分かりにくい。教材はWeb/Native比較のレビュー題材として使用可、製品修正は教材の基本分析に不要 | Native実画面と正式視覚正本を確認。製品コードは変更せず、必要なら承認後に製品用別PRを提案。既存Issue重複は検索語一致なし・最終確認待ち |
| 検索対象範囲の解釈（仕様未決） | 実装は商品名/商品コード以外にカテゴリー・ブランド・SKUにも部分一致。正式な想定範囲は未確定 | 静的分析、実検索未受入 | 未確定の検索対象を仕様上の正解にしない | 正式仕様の対象範囲と実挙動を確認 |
| Checkout配送先の郵便番号/電話の非数字除去（入力品質・仕様解釈） | `CheckoutOrderUseCases.validateAddress`は`replace(/\D/g, "")`後に7桁/10〜11桁を判定。`100-0001`/`090-0000-0000`の正規化は追加統合テストで確認。数字以外の任意文字混入も除去され得るが、許容入力文字の正式境界は未確定 | 静的確認。任意文字混入の実入力・Web/Android・下位保存の独立実Runは未確認。製品不適合とは未判定 | 住所の誤入力受理・入力エラーの不一致が起こり得る。教材の正常/不正入力は既存Seedと正当なハイフン入力で成立 | 許容文字契約とWeb/Native UIの入力制約、負例（`abc1000001`等）を独立確認。製品改修せず判断保留 |

この一覧は既存の分析記録からの整理であり、独立した実ブラウザ/Androidの再現証拠を新たに取得したことは意味しない。重大度と製品適合は各行の根拠・影響・実証に基づいて今後確定する。緊急性の高いセキュリティ/データ問題は発見した実行回で優先報告し、その他は定期実行で現在状態を報告する。

## PR #199に既に混在する製品差分（19ファイル）

製品実装9、正式仕様1、既存製品テスト9の計19ファイルを、PRのbase→HEAD差分として一次分類済み。**19ファイル=19個の独立した問題ではない**。同じ目的の実装・テスト・仕様変更はまとめて判断し、個々の変更hunkと関連コード、コミット由来、正式BR/AC、セキュリティ、Web/Native、既存回帰の証拠を確認する。以下の一次表は処理方針の確定ではない。

| 既存差分ファイル | 監査する変更目的・影響 | 現状 |
| --- | --- | --- |
| `src/application/use-cases/account-use-cases.ts` | 郵便番号住所候補の顧客認可ガード | **BR-AUTH-002と実装・統合テストを静的監査済み。実Web/Native導線・変更由来・PR整合は未確定、処理方針保留** |
| `src/application/use-cases/checkout-order-use-cases.ts` | 住所正規化/必須検証・許可決済コードの境界 | **PR差分全hunkと正式BR/AC・関連統合テストを静的監査済み。非数字文字の許容範囲、実Web/Native、変更由来・PR整合は未確定／処理方針保留** |
| `src/infrastructure/database/dexie/basic-repositories.ts` | カテゴリー全件取得・並び替え・ページ境界 | **51件のページ境界を静的/統合テスト監査済み。並行更新時の一貫性・製品変更としてのPR適合性は未確定、処理方針保留** |
| `src/infrastructure/database/dexie/cart-checkout-repositories.ts` | 価格承諾時の数量上限と原子性 | **数量上限の静的根拠・Web回帰CI確認済み、処理方針は判断保留**（下記監査参照） |
| `src/infrastructure/database/sqlite/native-customer-application-repositories.ts` | Native価格承諾の数量上限、Web同等性 | **Native SQLite契約の静的根拠・Web CI確認済み、実Mobile再検証待ち／判断保留** |
| `src/presentation/native/native-purchase-screens.tsx` | Native会員/Checkout/決済画面、書式・UI回帰 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/native/native-screens.tsx` | 価格承諾操作の非価格問題時の禁止条件 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/pages/checkout-order-pages.tsx` | 住所復元・決済選択/再試行・Checkout導線 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `src/presentation/pages/product-detail-page.tsx` | 低在庫の購入上限表示 | **在庫3/設定上限5の表示と数量選択上限3を静的/コンポーネントテスト監査済み。実画面・表示解釈・PR適合性は未確定、処理方針保留** |
| `docs/spec/features/checkout-and-payment.md` | 既存の仕様変更の妥当性（本更新では空行だけ修正） | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/auth-account-pages.test.tsx` | 会員表示・認証のcomponent証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/catalog-pages.test.tsx` | 在庫表示の境界値証拠 | **低在庫3/設定上限5の表示アサーションを確認。実画面と数量上限の独立証拠は未確認、処理方針保留** |
| `tests/component/checkout-order-pages.test.tsx` | Checkout導線・表示のcomponent証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/component/native/native-purchase-screens.test.tsx` | Native画面の表示・機能の回帰証拠 | 一次分類済み、個別の安全性・必要性・PR適合性は未確定 |
| `tests/integration/admin-master-use-cases.test.ts` | カテゴリー大量件数・並び替えの回帰 | **既存4件＋47件で51件取得・全ID逆順並べ替えを検証、Web CI成功。並行更新負例は未実行、処理方針保留** |
| `tests/integration/auth-account.test.ts` | 住所候補の認可境界、既定配送先変更の原子性 | **住所候補のguest/operator/customer/未登録郵便番号を監査済み。既定配送先切替・古いversion拒否の追加テストは別意味単位で未監査、ファイル全体は部分監査** |
| `tests/integration/cart-use-cases.test.ts` | 数量上限拒否・データ不変 | **在庫1・明細数量2の拒否とversion不変を確認、Web CI成功／判断保留** |
| `tests/integration/checkout-order-use-cases.test.ts` | Checkout Session・決済の回帰 | **住所の必須/正規化と決済コード拒否の追加Caseは監査済み。その他の追加Caseは未監査のためファイル全体は部分監査** |
| `tests/repository-contract/native-customer-shared.test.ts` | Native SQLiteの失敗時rollback | **後続明細失敗時の先行更新rollbackを契約テストで確認、実Mobile再検証待ち／判断保留** |

### 価格変更承諾時の数量上限・トランザクション（既存差分4ファイルの意味単位監査）

- **仕様と必要性**：正式`docs/spec/features/cart.md`の`BR-CART-001/003`・`AC-CART-001/003`は在庫・購入上限・99の最小値超過を拒否し、価格変更を承諾するまではCheckoutを遮断する。`src/domain/services/cart.ts`の`maximumCartQuantity`はその最小値を返す。価格承諾だけで在庫不足の明細を有効化しないガードは仕様上の安全性に関係する。
- **変更と根拠**：PR差分ではDexie `src/infrastructure/database/dexie/cart-checkout-repositories.ts:289-320`、Native SQLite `src/infrastructure/database/sqlite/native-customer-application-repositories.ts:1381-1425`の`acceptPriceChangesAndTouchCart`へ、数量が整数かつ1以上・`maximumCartQuantity(variant)`以下である検証を追加し、違反は`QUANTITY_LIMIT_EXCEEDED`で拒否する。Dexieは全明細検証後に`bulkPut`し、Nativeは`context.write`の排他トランザクション内で更新する。既存の所有者・公開・version検証を省略する差分はこの4ファイルの当該hunkでは確認されない。
- **追加回帰**：`tests/integration/cart-use-cases.test.ts:218-250`は既存defaultの明細を数量2・在庫1・旧価格999に設定し、承諾拒否と明細/Cart version不変を検証。`tests/repository-contract/native-customer-shared.test.ts:299-352`はregular-memberの2明細を使い、後続のマグ数量超過時に先行Tシャツの価格更新もrollbackされることをSQLite契約で検証。PR差分の実装2＋テスト2は同じ変更目的として扱い、4件の独立問題として数えない。
- **CIと未検証**：HEAD `aeb5b796b78985993debb29a618a01213f4adfa6`の[Web CI 41196968544](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41196968544)はVitest integration/repository/contracts、`verify`、`validate`を含む必須jobが成功。ただし**Mobile CIはPR branchで自動起動一時停止中**。実Android/iOS/Maestroでの再検証、コミット単位の変更由来、他の金額/決済回帰とPR #199の教材目的との整合の最終判断は未完了。Web CIの成功をNative実機PASSへ流用しない。
- **製品適合・影響・処理方針**：数量上限を超えた価格承諾の拒否とデータ不変は静的実装・契約上の確認ができ、重大度はデータ/購入整合性に関わる**Medium〜High候補**。当該追加ガード自体の不適合は未立証。教材は既存`cart-with-invalid-items`・`regular-member`等のSeedと独立の期待値で継続可能で、製品変更を教材成立の前提にはしない。**現時点の処理方針は判断保留**（安全性の実Mobile確認とPR整合・変更由来が不足）。最終的には「本PRに残す／製品用別PRへ分離する／取り消す」を根拠で決定し、実際のrevert・分離・変更は明示承認まで実行しない。

### カテゴリー全件取得と51件並べ替えの既存差分監査（実装1＋テスト1）

- **由来・目的**：[commit `3c3fb8c`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/3c3fb8c48beacce3c06fa139f4112ed07af23afd)で`DexieCategoryRepository.listAllForReorder`を従来の先頭50件取得から50件単位の全ページ取得に変更。関連する`tests/integration/admin-master-use-cases.test.ts`のPR差分は、既存4カテゴリーに47件を追加して51件取得・全IDの逆順並べ替えを確認する。両ファイルを同一の製品変更目的として扱う。
- **仕様・認可・データ根拠**：`docs/spec/features/admin-catalog.md`の管理カタログ、`AdminMasterUseCases.listAllCategoriesForReorder`の`requireStaff()`、`DexieCategoryRepository.searchForAdmin`の`sort_order`/ページ処理、`reorder`の全ID一致・version検証・Dexieトランザクションを静的に確認。今回の差分に認可ガードの削除は見られない。51件は既存default＋テスト内生成で成立し、既存Seedの改変は不要。
- **実証と限界**：[現HEADのWeb CI 41201740053](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41201740053)でVitest integration、contracts、`validate`が成功。ただしこのテストは同時書込中の複数ページ取得のスナップショット一貫性、途中の作成/削除・version競合、実ブラウザでの並べ替え操作を検証していない。Web CI成功をこれらのPASSと解釈しない。
- **製品適合・教材・処理方針**：50件を超える並べ替えの取りこぼし防止という必要性は静的/テストで裏付けられるが、運用中の並行更新安全性とPR #199の教材目的との整合は未確定。重大度はデータ並び順の整合に関するMedium候補。教材は既存の少数カテゴリー/通常管理操作で継続可能であり、本修正は教材成立の必須条件ではない。**処理方針は判断保留**。別製品PRへの分離を検討対象とするが、実行には明示承認が必要。

### 低在庫上限表示の既存差分監査（実装1＋テスト1）

- **由来・仕様**：[commit `744115a`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/744115a994bbbbf988e5b6ca6a52908315662fb2)で`ProductDetailView`の上限案内条件を`stockQuantity > purchaseLimit`から「SKU選択済みかつ在庫が正数」へ変更。正式`BR-STOREFRONT-003`と`storefront.md`の`low-stock`状態は残在庫と購入上限の両表示を要求する。関連`tests/component/catalog-pages.test.tsx`の追加テストは在庫3・設定購入上限5で「残り3点」「1回の購入上限は5点です。」を確認する。
- **実装・数量の意味**：`src/presentation/pages/product-detail-page.tsx:90-100/239-255`の数量選択上限は`Math.min(stockQuantity, purchaseLimit)`で3、案内に表示する`purchaseLimit`は設定値5。カートの`maximumCartQuantity`は在庫・設定上限・99の最小値を使用する。**案内の5点と実際の選択可能数3点は別概念**であり、表示が誤りと断定しない。ユーザーが5点購入可能と誤認するかは実画面/仕様解釈の追加確認が必要。
- **実証・未決・処理方針**：[現HEADのWeb CI 41201740053](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41201740053)でVitest component、contracts、`validate`成功。Web低在庫の実画面・視覚正本、在庫3で4点追加を拒否する独立E2E、Native表示との期待値統一は未受入。重大度Low〜MediumのUX解釈候補。教材は既存`low-stock`/default Seedで検証可能、追加Seed不要。**処理方針は判断保留**。既存SUT・正式仕様・製品テストは今回変更しない。

### 郵便番号住所候補の顧客ロール境界（実装1＋統合テスト一部）

- **正式要求と変更目的**：`docs/spec/features/authentication.md`の`BR-AUTH-002`/`AC-AUTH-002`は顧客データと購入導線を`customer`に限定する。PR差分の`src/application/use-cases/account-use-cases.ts`は`suggestAddress(postalCode)`の静的住所候補検索前に`await this.requireCustomer()`を追加した。既存の`SessionIdentityResolver.requireCurrentEntity`は未認証を`AUTHENTICATION_REQUIRED`で拒否し、`requireCustomer`は非customerを`account.customerOnly`で拒否する。住所辞書`src/infrastructure/address-lookup/static-address-lookup.ts`は3件の固定郵便番号で、外部API・個人情報照会ではない。
- **追加回帰の範囲**：`tests/integration/auth-account.test.ts`の新規ケースは未認証→拒否、operator→拒否、customerの`100-0001`→東京都/1000001、未知の`999-9999`→nullを検証。最新HEAD `9d20757a06713796ade89026c80af190927a1e4c`の[Web CI 41203998824](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41203998824)ではVitest integration・contracts・`validate`が成功。ただしこの統合テストの成功は実Web/Android画面の導線や実認証セッションのE2E受入を意味しない。
- **安全性・影響・未決**：非customerからの住所候補利用を拒否するガードの追加は要求上妥当で、現時点で認可緩和や外部情報漏えいを示す証拠はない。逆に既存のguest向け呼出しがこのガードで影響を受けないか、Web/Nativeの全呼出し元とUI表示を独立確認していない。重大度は認可境界としてMedium候補。教材は既存の`regular-member`とゲスト/スタッフのロール差で成立し、製品修正を必須としない。
- **処理方針**：**判断保留**。変更を導入したcommitの特定、全呼出し元・実画面の回帰、教材目的との整合を確認してから「本PRに残す／別PRへ分離／取り消す」を決定する。実装のrevert・分離・変更は明示承認まで行わない。なお同じ統合テストファイルに追加された「既定配送先の原子的切替と古いversion拒否」は別の意味単位であり、本節の監査完了数に含めない。

### Checkout住所・支払方法のApplication境界（実装1ファイル監査完了＋統合テスト一部）

- **対象・由来**：PR差分`src/application/use-cases/checkout-order-use-cases.ts`の`setAddress`、`setPayment`、`validateAddress`（当該ファイルのPR差分は2 hunk）と`tests/integration/checkout-order-use-cases.test.ts`の対応追加Caseを確認。変更を最初に導入したcommitの特定は未完了。統合テストにはSession再開/置換、stale Cart、注文直前再検証等の別意味単位も含まれるため、**テストファイル全体は部分監査**とする。
- **正式要求と実装**：`docs/spec/features/checkout-and-payment.md`の`BR-CHECKOUT-001/002`、`AC-CHECKOUT-001/002`、同仕様の「支払方法選択と確認画面への遷移」、`BR-AUTH-002`を参照。`setAddress`は`requireCustomer`・本人Session照合の後、氏名/都道府県/市区町村/住所のtrim、郵便番号/電話の非数字除去、必須/長さ/桁数を検証し、正規化後SnapshotをRepositoryへ渡す。`setPayment`は4種の`PAYMENT_METHODS`以外を`VALIDATION`で拒否し、Repositoryへの更新前に停止する。PR差分内で本人ガードやCart version検証を取り除く変更はない。
- **実テスト・CI証拠**：追加統合Caseは不正な決済コードを拒否して`version/unlockedStep/paymentMethodCode`不変、空欄/短い郵便番号/電話を拒否して`addressSnapshot/version`不変、`100-0001`と`090-0000-0000`の正規化保存を確認する。HEAD `cf8718dce6b913e18af940735c7367e5ef27f3d1`の[Web CI 41205964167](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41205964167)ではVitest integration/contracts、`validate`等の実jobが成功。ただしこの成功は各テストの単独実行ログやWeb/Android実画面の証拠ではない。
- **未決・リスク**：`replace(/\D/g, "")`はハイフン以外の非数字も除去するため、例えば`abc1000001`を`1000001`へ正規化し得る。これは静的に成立する入力品質の**仕様解釈候補**であり、正式許容文字・Web/Native UI入力制約・Repositoryの追加検証・実再現を確認するまで製品不適合とは判定しない。重大度Low〜Medium候補。決済の無効コード拒否は仕様と整合するが、直接Use Case呼出し以外の画面復旧・旧Session/並行更新・Native実Runは未受入。
- **教材と処理方針**：正常な住所と不正入力、決済コード拒否の教材は既存default/regular-memberと統合テストで成立し、新Seedや製品修正を必須としない。**処理方針は判断保留**（変更由来、実UI/Native回帰、入力契約、PR目的との整合の証拠不足）。revert/分離/製品機能変更は明示承認まで行わない。

### 処理方針の決定規則

- 各変更目的について、必要性（正式仕様・不具合・テスト）、安全性（認証/認可・データ整合・個人情報・回帰）、PR #199の教材目的との整合、代替手段、コミットと関連テストを監査する。
- **本PRに残す**：安全性・必要性・今回の目的との整合が証拠で確認できる。
- **別PRへ分離する**：製品として必要で安全だが、本PRの教材・分析目的から独立している。
- **取り消す**：必要性がなく誤った変更であると証拠から確認できる。削除やrevertによる影響も調査する。
- **判断保留**：仕様未決、証拠不足、認証・金額・状態・Native回帰などの確認が残る場合。安全性が確定したとみなさない。

処理方針は条件が満たされれば自動で判断・本表に記録してよいが、**実際のrevert・移設・別PR作成・機能修正は別途ユーザーの明示承認が必要**。PR #199のマージ前に最終の配置・未解決リスク・実行権限を確認する。書式例外は`docs/spec/**`のMarkdownだけに適用し、意味を変えない空行等をCI/lintとdiffで確認して変更可能とする。製品コード・製品テストや正式仕様の意味変更には適用しない。

## 現在の受入・管理上の注意

- 全サポート動作の暫定分母188件、基本分析71件、非default状態18/20件という数値は、必ず[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)の**最新内容から再集計**する。本文中の数値は初期整理時の参考であり、進捗の正本ではない。
- 製品改善の未修正候補だけで分析の達成を拒否しない。ただし、分析に必要な仕様・証拠が未決なら基本分析未完、教材実行が阻害されるなら教材受入未完を維持する。
- PR本文は現行の主要な未解決事項と成果/受入状態のみ。調査の時系列履歴はGit履歴と全機能分析レポートへ残す。
