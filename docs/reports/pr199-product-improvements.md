# PR #199で発見した製品改善候補・既存製品差分の監査

## 2026-11-01 ユーザー判断：製品差分・重大問題・仕様の扱い

既存製品19ファイルは、同じ目的の製品実装・正式仕様・テストをまとめて**変更目的ごと**に必要性・安全性・回帰・PR目的との整合を判断する。ユーザーには差分・影響・根拠を提示して個別承認を受ける。実際の分離・revert・別PR作成は当面保留であり、製品本体/正式仕様の変更許可もない。

実証されたHighのセキュリティ・金額・データ整合問題では#199のマージ判断を止め、製品修正の検討を優先する。新規Issueは再現と重複確認済みのHighのみ、公開前に内容確認を行う。未修正セキュリティ問題の公開文書は概要と確認状態に限定し、詳しい再現資料は非公開で扱う。過去の公開Git履歴の内容が自動的に非公開になるわけではない。

正式仕様の意味上の変更はユーザーの個別承認が必要。Web/Nativeは画面構造・入力UI・利用者向けエラーメッセージも基本的に同等とするが、Platformの制約・適切な例外を実証して提示する。決済処理中は新しい二重決済試行を禁止し、同一キーの状態取得・冪等応答は許容する。これらの判断を製品実装のPASSや仕様修正済みと混同しない。


## 対象と更新規則

本レポートは[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)のScenario Shop全サポート動作の分析中に根拠を得た不具合・仕様不整合・UI/UX・性能・保守性・セキュリティ・テスト容易性等を記録する。製品全体の別の改善監査ではない。収集はPR #199の全機能分析と教材技術受入が完了するまで続ける。詳細な機能分析と実装経路は[全機能分析レポート](./2026-10-30_pr199-supported-behavior-analysis.md)を参照する。

同一の根本原因・対象・再現条件は同じ行を更新し、定期実行のたびに日時別に複製しない。各候補の根拠（BR/AC、実装、テスト、固定Seed、実Run）、確認済み事実/仮説、重大度・利用者影響・再現状況、製品適合の判定、教材の成立・代替、既存Issue/PRとの重複、推奨対応を具体化する。情報がない箇所は「未確認」とし断定しない。既存[Issue #97](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/97)は特定日の探索テスト分に対象が限定されており、このレポートの候補を自動で追記しない。新規Issueは原則作成しない。

**基本分析の完了と製品の仕様適合は別判定。** `analysis_status=analyzed`は根拠付き基本分析を意味するだけで、製品PASS・E2E/実画面PASS・不具合解消を意味しない。期待仕様や必要証拠が未決の分析は`review_required`/`blocked`のままとする。改善候補が未修正なだけでは教材受入を止めないが、演習が実行不能なら技術受入の未達とする。現在の候補は実行再現や仕様判断が未完であり、**確認済み不適合と推測を混同しない**。

## 現在の改善候補

| 対象・分類 | 確認した根拠・現象 | 現在の確認状態 | 教材・利用者への影響 | 次の調査・対応方針 |
| --- | --- | --- | --- | --- |
| Cart再検証の購入上限減少後の遮断漏れ（仕様適合・数量境界候補） | 正式`BR-CART-001/003`・`AC-CART-001/003`は在庫/購入上限の再検証を要求。Dexie `getCartDto:480-511` / SQLite `getCartDto:1601-1633`は最大数を`min(stock,purchaseLimit,99)`で計算する一方、blockingIssuesは数量>stockのみ判定。購入上限5→2、既存数量4、stock10ならDTOの問題未検出→Checkout開始/確認へ進み得る静的経路 | 条件付き静的推論。購入上限変更操作の成立・実Checkout/Android・後段の別ガード・既存Issue重複は未確認。High候補、製品不具合確定ではない | 過剰購入・注文整合のリスク。教材ではBR/ACとDTO/Checkoutガードの境界分析に使用可。未実行をPASSにしない | 学習用fixtureで購入上限変更後のCart DTO・Checkout開始/確認・版不変を制御実証。製品改修・Issue化は明示承認待ち。Q-32分析レポート参照 |
| Nativeログイン拒否理由の内部キー表示（UI/仕様適合候補） | 正式`authentication.md`は利用者向け理由表示を要求。Web `useAuthError`は日本語へ変換する一方、Native `NativeLoginScreen:192`→`asPurchaseError:1543`→`ErrorMessage:112-121`は`ApplicationError.message`を直接表示し、`errors.ts:6-10`の`message=messageKey`から`auth.account.suspended`等が表示され得る | 静的経路確認。実Android/視覚・全拒否条件のSession非生成・既存Issue重複は未確認。重大度Medium候補、製品不適合の最終判定は保留 | Native受講者が拒否理由を理解しにくい可能性。教材はWeb/Nativeの差を観察するCaseとして扱い、未実証を正解にしない | Q-10：停止/退会/誤資格/Storage失敗のNative実表示、Session/Cart不変、正式期待値と既存Issueを照合。製品コードは変更せず承認待ち |
| 在庫0/1〜5/6以上の管理在庫分類（仕様不整合） | `BR-ADMININV-001`/`AC-ADMININV-001`は6以上をavailable、Dexieは1以上で判定。UIの状態列は有効/無効Badge | 静的に差異確認、0/1/5/6の実画面未検証 | 在庫判断と境界値演習の正解に影響。未決期待値を固定しない | 実行再現と表示・件数を確認。製品修正は行わない |
| 商品一覧emptyの復旧導線（仕様解釈/UX候補） | 正式`storefront.md:63-74`は元画面へ戻る導線を要求。Web無条件0件のパネル内`action=null`だが`Breadcrumbs`にはホーム`/`リンクが残る。絞込0件は「条件をすべて解除」CTA、Nativeは0件案内のみ。既存componentはパネル内CTAの有無をassert | 静的照合済み。**戻る導線が全くないとは断定不可**。実Web/Android、視覚正本と「元の画面」の解釈、既存Issue重複は未確認。重大度Low〜Medium候補、適合判断保留 | 全件0と絞込0を分けたレビュー演習は可能。期待結果を不具合確定に固定しない | Q-22：`empty-catalog` WebのBreadcrumbs復帰、絞込解除、Native実画面と正式視覚正本を独立実行。SUT変更・新Issueなし |
| 管理商品絞り込みとページ位置（UI動作候補） | `AdminProductsContent`はkeyword以外のフィルターでpage1へ戻らない可能性 | 静的分析、50ページ目からの実再現未実施 | 対象データの見落としを招く可能性、教材の必須修正ではない | many-productsで再現し影響を確定 |
| 注文一覧のNative状態ラベル（UX/仕様判断） | Nativeは内部statusを表示、Webは日本語表示。正式なPlatform別契約は未確定 | 静的な表示差を確認 | Web/Nativeの検証条件を混同しない | 利用者向け表示契約を調査、未決は保持 |
| 決済失敗の理由・復旧・再試行（仕様差・不具合候補） | 失敗理由の汎用表示、Web/Native再試行選択差に加え、Native注文確認の`beginOrder`失敗後はカート導線を出すが確定ボタン自体は再押下可能（WebはCart/価格等の特定エラーで無効化）。Repository側の重複防止とは別論点 | 静的UI差のみ確認。実ブラウザ/Android、二重注文・決済発生は未確認 | M06/M07の誤った期待結果を防止。金額・注文の安全性は実Run待ち | エラー種別別の再押下、二重確定防止、実際の注文/決済/在庫不変を確認。製品修正せず適合判断保留 |
| Homeカテゴリー0件・会員特典のWeb/Native差（仕様判断） | Home DTOは両Repositoryでactiveカテゴリーと可視商品件数を返す。Web `home-page.tsx:100-143`は可視件数0を非表示・先頭最大6件、Native `native-screens.tsx:100-110`は0件を含む全activeカテゴリーをLink表示。別論点の会員特典はWeb表示/Native不在の静的候補 | 仕様上の「主要カテゴリー」0件/件数上限とNative会員特典契約は未決。defaultの4カテゴリーは全て1件以上。**empty-catalogは商品0件でもactiveカテゴリーを保持する**（`scenarios.ts:179-197`）ため、Web/Native Home差を既存Seedで実行検証できる見込み（実Run未実施）。`metadata.ts`の「カテゴリが空」という説明は実体と不一致。製品適合未確認 | 基本分析はRole/Seed/経路の証拠付きで成立。0件導線・会員特典のPlatform期待値を教材の正解に固定しない | 既存Issue重複と正式UI/視覚正本、activeカテゴリー商品0件の独立実Runを確認。SUT変更なし |
| 商品詳細の12/13 SKU・在庫0とWeb/Native選択UI差（仕様/UI適合候補） | 正式`storefront.md:17-23`は12以下buttons/13以上selectを規定。defaultのP-0010は12 SKU、P-0011は13 SKU。Web `product-detail-page.tsx:187-224`は境界どおりだが、Native `native-screens.tsx:660-701`は13 SKUもchipsで表示。Native helperは在庫0でも選択可能・Cart追加不可。P-0001のS20/M10/L0、P-0006単一在庫0は既存Seedで対照可能 | **静的なPlatform差を確認**。正式UI契約のNative適用範囲、実Android/視覚正本、inactive SKU負例は未確認。製品不適合は未確定、重大度Low〜Medium候補 | 基本分析は75/188へ更新。12/13境界・在庫0の学習用Caseは既存Seedで成立し、SUT変更は不要。Nativeの表示期待を正式正解に固定しない | Native実画面/視覚正本と正式UI契約のPlatform適用を確認し、適合判断を確定。inactive SKUは既存Seedにないため学習用fixtureの要否を別判断。無断で製品修正しない |
| 商品詳細Cart追加数量のWeb/Native差・上限超過説明（UI/UX候補） | Web `ProductDetailView:245-277`は数量1〜min(在庫,購入上限)を選択して追加、Native `NativeProductDetailScreen:724-738`は1点固定で追加。共通 `addCartQuantity` は既存Cart数量を合算し上限超過を `RangeError` とする。Webは汎用失敗案内、Nativeは例外message表示経路 | 静的なPlatform差のみ確認。正式仕様がNativeにも複数点一括追加を要求するか、超過時の実表示・Cart/版不変は未確認。重大度Low〜Medium候補、製品不適合は未判定 | まとめ買いの操作回数と超過理由の理解に影響し得る。教材はWeb/Native差を観察するCaseとし、未実行を正解に固定しない | Q-21：既存数量4→+2、rank別追加、実Web/Androidで表示・Cart DTO/versionを確認。製品変更・新Issueは承認待ち |
| Nativeカテゴリー画面の実名見出し（仕様/UI差候補） | `storefront.md:175-191`はdefaultカテゴリー名表示を要求。Web `CatalogListPage:240-300`は`getCategoryName`で実名、Native `NativeCatalogScreen:119-205`は固定「カテゴリの商品」 | **静的差異確認**、Android実画面・視覚正本との照合未実施。適合判断未確定、重大度Low〜Medium候補 | 商品の絞込自体は成立するが、どのカテゴリーを閲覧中か分かりにくい。教材はWeb/Native比較のレビュー題材として使用可、製品修正は教材の基本分析に不要 | Native実画面と正式視覚正本を確認。製品コードは変更せず、必要なら承認後に製品用別PRを提案。既存Issue重複は検索語一致なし・最終確認待ち |
| 検索対象範囲の解釈（仕様未決） | 実装は商品名/商品コード以外にカテゴリー・ブランド・SKUにも部分一致。正式な想定範囲は未確定 | 静的分析、実検索未受入 | 未確定の検索対象を仕様上の正解にしない | 正式仕様の対象範囲と実挙動を確認 |
| Checkout配送先の郵便番号/電話の非数字除去（入力品質・仕様解釈） | `CheckoutOrderUseCases.validateAddress`は`replace(/\D/g, "")`後に7桁/10〜11桁を判定。`100-0001`/`090-0000-0000`の正規化は追加統合テストで確認。数字以外の任意文字混入も除去され得るが、許容入力文字の正式境界は未確定 | 静的確認。任意文字混入の実入力・Web/Android・下位保存の独立実Runは未確認。製品不適合とは未判定 | 住所の誤入力受理・入力エラーの不一致が起こり得る。教材の正常/不正入力は既存Seedと正当なハイフン入力で成立 | 許容文字契約とWeb/Native UIの入力制約、負例（`abc1000001`等）を独立確認。製品改修せず判断保留 |
| サインアップ確認・学習環境注意事項のWeb/Native差（UI/仕様解釈） | Web `SignupPage`は確認パスワードと`noticeAccepted`を要求。Native `NativeSignupScreen`はメール・パスワード・表示名だけで`AuthUseCases.register`へ進み、成功時はWeb `/`、Native `/account/profile`へ遷移する。共通Use Caseはactive customer/regularとSessionを生成 | **静的なPlatform差のみ確認**。正式`authentication.md`は両Platformに同一の確認/同意UIを明示していない。実Android登録・通知表示・同意契約は未確認。重大度Low〜Medium候補、製品不適合未確定 | 誤った共通Signup期待結果を教材に固定しない。正常登録とWeb/Nativeの遷移先は別Caseにできる | 正式同意要件・視覚正本・実Android/Sessionを確認。製品改修・Issue作成は承認待ち。既存Issue重複は未確認 |
| 最終管理者保護の非self境界と認可競合（権限リスク・テスト容易性） | `BR-ADMINUSER-001/AC-ADMINUSER-001`。`requireAdmin()`はtransaction前にactive adminを解決し、本人変更を先に拒否。非self対象もactive adminなら安定した整合状態ではactive adminが少なくとも2名で、`countActiveAdmins() <= 1`の分岐には入らない。別管理者の権限/状態が認可後・transaction前に変化する制御interleavingでは分岐到達が可能。 **追加の静的権限リスク**：actorのadmin認可が`review-user-use-cases.ts:567-569/600-606`でtransaction外にあり、`SessionIdentityResolver.requireCurrentEntity:43-58`の結果を更新時に再照合しない。別管理者がactorをoperatorへ降格しセッションを失効させた後、先に認可済みのactorが別target operatorをadminへ昇格する場合、`changeRole`の`countActiveAdmins`保護はtargetがadminでないため通らず、targetのversionだけを照合して更新し得る（`review-user-use-cases.ts:571-597`、`transaction-runner.ts:59-62`）。**これはソース上のTOCTOU到達経路の推論であり、実並行での成立・権限越境の再現は未確認**。既存integrationはself等のみ、componentはmock文言のみ | 静的な到達条件を再評価。学習用`tests/contracts/ai-assisted-qa-admin-last-admin-interleaving.test.mjs`で非selfのrole降格/停止とtarget/version/session不変を制御interleavingで検査するコードを追加。**Web CI 41255533754のVitest contracts実job成功（制御interleaving 2 Caseを含む）**。実並行リクエスト・認可再確認の安全性は未実証。権限剥奪後のoperator→admin変更が成立するなら権限越境となるためHigh（セキュリティ）候補、製品不適合は未確定 | 通常状態のself保護と2管理者→1管理者許可を分離し、誤った非self通常Seedの負例を教材に採用しない。認可時点と更新時点の競合は別リスク | 学習用contractの実成功は確認済み。Q-01：別セッションでactor権限剥奪/セッション失効を完了させた後、先行中の`changeRole(operator→admin)`と`changeSuspension`を独立に実並行検証し、拒否・target/version/session不変を確認。製品修正なし。Issue重複未確認 |

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
| `src/presentation/native/native-purchase-screens.tsx` | Native会員特典、Checkout再開/置換、決済方法復元、確認画面・注文番号 | **PR差分全13 hunkを静的監査済み**（下記）。既存製品テストとの整合は確認したが、実Mobile・変更由来・安全性/PR適合は未確定、処理方針保留 |
| `src/presentation/native/native-screens.tsx` | 価格承諾操作の非価格問題時の禁止条件 | **追加1 hunkの静的監査済み。非価格問題を併発する場合に価格承諾ボタンを無効化。BR-CART-003と既存Repository拒否条件に整合するが、混在状態のNative実Run・変更由来・PR適合は未確認／処理方針保留** |
| `src/presentation/pages/checkout-order-pages.tsx` | 住所復元・決済選択/再試行・Checkout導線 | **PR差分全hunk・導入commit・仕様/Use Case/既存componentを静的監査済み**。実Web/Native・金額/本人認可・例外別復旧は未受入、処理方針保留 |
| `src/presentation/pages/product-detail-page.tsx` | 低在庫の購入上限表示 | **在庫3/設定上限5の表示と数量選択上限3を静的/コンポーネントテスト監査済み。製品用別PRへ分離する処理方針のみ決定（実行承認待ち）。実画面・表示解釈・製品受入は未確定** |
| `docs/spec/features/checkout-and-payment.md` | 既存の仕様変更の妥当性（後続の空行修正とは区別） | **mainとの差分全体を静的監査済み**。配送先一覧の文言変更＋再開/支払/確認の意味を持つ23行追加。正式仕様の変更として妥当性・承認/PR整合は未決、処理方針保留 |
| `tests/component/auth-account-pages.test.tsx` | 会員特典表示・住所emptyのcomponent証拠 | **追加2 hunkを静的監査済み。既存Web UI/価格計算・仕様と整合。製品用別PRへ分離する処理方針（実行は承認待ち）。実Native/視覚/認可E2Eは未受入** |
| `tests/component/catalog-pages.test.tsx` | 在庫表示の境界値証拠 | **低在庫3/設定上限5の表示アサーションを確認。実画面と数量上限の独立証拠は未確認、処理方針保留** |
| `tests/component/checkout-order-pages.test.tsx` | Checkout導線・表示のcomponent証拠 | **追加全hunkの静的監査済み。配送先復元・stale Cart・金額・決済方法復元・注文番号等のmock UI契約。製品用別PRへ分離する処理方針のみ決定（実行承認待ち）。実ブラウザ/本人認可・Native受入は未確認** |
| `tests/component/native/native-purchase-screens.test.tsx` | Native画面の表示・機能の回帰証拠 | **追加全6 hunkを静的監査済み**。Native UI mockによる状態・回復・表示検査であり、実Mobile・本人認可・PR適合は未確定、処理方針保留 |
| `tests/integration/admin-master-use-cases.test.ts` | カテゴリー大量件数・並び替えの回帰 | **既存4件＋47件で51件取得・全ID逆順並べ替えを検証、Web CI成功。並行更新負例は未実行、処理方針保留** |
| `tests/integration/auth-account.test.ts` | 住所候補の認可境界、既定配送先変更の原子性 | **追加2 hunkとも静的監査済み。既定配送先の原子的切替・旧version拒否はWeb Dexie/Native SQLite実装と整合。実Native/同時更新負例・変更由来は未確認、処理方針保留** |
| `tests/integration/cart-use-cases.test.ts` | 数量上限拒否・データ不変 | **在庫1・明細数量2の拒否とversion不変を確認、Web CI成功／判断保留** |
| `tests/integration/checkout-order-use-cases.test.ts` | Checkout Session・決済の回帰 | **PR差分全4 hunk・追加6 Caseを静的監査済み**。住所必須/正規化、決済コード拒否、未完了Step、stale Cart、確認/注文時の金額・version変化を検証。実UI/Native・同時操作は未受入、処理方針保留 |
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
- **実証・未決・処理方針**：[現HEADのWeb CI 41201740053](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41201740053)でVitest component、contracts、`validate`成功。Web低在庫の実画面・視覚正本、在庫3で4点追加を拒否する独立E2E、Native表示との期待値統一は未受入。重大度Low〜MediumのUX解釈候補。教材は既存`low-stock`/default Seedで検証可能、追加Seed不要。**処理方針は「製品用別PRへ分離する」と決定（実行は明示承認待ち）**。`744115a`の製品UI 1 hunkと対応するcomponent 1 Caseは独立した在庫表示改善であり、PR #199の教材・全サポート動作分析を成立させるための必須変更ではない。認証/本人データ/金額計算/Repository/Seed/決済ロジックはこの2 hunkで変更せず、数量選択上限は既存の`Math.min(stockQuantity, purchaseLimit)`を維持する。現HEAD `bf29cbaec6270910d276108c2f4d84e3517173b6`の[Web CI 41239603805](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41239603805)ではVitest component、Style Quality、契約・統合、Chromium E2E、`verify`/`validate`を含む必須jobが成功（Extended E2E mobile-chromiumはskippedでPASS算入しない）。ただし低在庫の実画面/視覚正本、実Android/iOSと製品PRとしての回帰受入は未実証。**本回では方針を記録するだけで、revert・移設・別PR作成・製品変更を行わない。**

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

### 既定配送先の原子的切替・旧version拒否（統合テスト追加hunk監査）

- **要求と入力**：正式`checkout-and-payment.md:25-39`は顧客本人の配送先一覧・追加/編集・既定設定を要求し、`authentication.md`の`BR-AUTH-002`は顧客データをcustomerに限定する。`AccountUseCases.createAddress/updateAddress`は`requireCustomer`と入力検証を経てRepositoryへ本人userIdとexpectedVersionを渡す。追加`tests/integration/auth-account.test.ts:383-438`は既存`regular-member` Seedのcustomerで自宅/勤務先を生成し、初回住所だけが既定、勤務先への切替後は両者version=2、旧version再送は`CONFLICT`、一覧不変を確認する。
- **Web/Native実装経路**：Web `DexieAddressRepository.updateAndReassignDefault`（`basic-repositories.ts:196-238`）はuserId照合・version照合・旧既定解除と新既定設定を単一Dexie transactionで実施。Native `NativeAddressRepository.updateAndReassignDefault`（`native-customer-application-repositories.ts:672-724`）も`context.write`内で本人照合、version検証、既定切替を実施。`addresses-page.tsx:135-165`と`native-purchase-screens.tsx:494-516`は本人のaddressId/versionを`updateAddress`へ渡す。Native側の追加独立テスト・実Android・競合タイミング/注入失敗rollbackの実Runは未確認。
- **判断**：追加統合テストの静的意味と現HEADの[Web CI 41208324870](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41208324870)のVitest integration成功を確認。ただしWeb CIはNative SQLite実機のPASSではない。今回のPR差分は統合テスト追加であり、住所Repositoryの実装は既存SUTとして読み取りのみ。認可/データ整合上の明確な回帰は静的に見つからないが、PR教材目的との整合・変更commit由来・実Mobile証拠が不足するため**処理方針は判断保留**。製品変更は行わない。

### 会員特典と配送先emptyのcomponent追加2 hunk監査

- **仕様・実装**：`authentication.md:BR-AUTH-002/SCREEN-AUTH-ACCOUNT-PROFILE`は本人の会員ランク/状態と内部ID非露出を要求。`profile-page.tsx:71-85`は`membershipDiscountRate`と`FREE_SHIPPING_THRESHOLD=5000`を参照し、regular=0%、gold=5%、platinum=10%、platinumのみ無条件送料無料を表示する。`checkout-and-payment.md:25-39`は配送先emptyの案内と登録導線を要求し、`addresses-page.tsx:102-110/198-239`は0/5件表示・空案内と同画面の追加フォームを提供する。Checkout配送先選択とは別画面。
- **追加テストの意味**：`tests/component/auth-account-pages.test.tsx:316-347`は3会員ランクの表示・private-customer-id非露出をmock DTOで検証。同ファイル`:359-369`は配送先0件の案内/フォーム/登録ボタンと「この配送先を使用」非表示を検証。現HEADの[Web CI 41208324870](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41208324870)でVitest component成功。mockのため実ログイン/実データ・Android表示・視覚正本の受入には代替不可。
- **製品適合・処理方針**：追加2 hunkは既存製品画面の回帰テストであり、教材専用fixture/評価/分析テストではない。既存の製品表示と仕様に整合し、当該テストを単独で製品用別PRへ**分離する処理方針を採用**する（実際の移設・revert・別PR作成はユーザー明示承認待ち）。製品UI/仕様/テストの新たな変更は行わない。

### Native Cartの価格承諾操作の混在問題ガード（既存製品UI 1ファイル監査）

- **正式要求・変更内容**：`docs/spec/features/cart.md`の`BR-CART-003/AC-CART-003`は価格変更だけでなく在庫切れ・非公開・会員ランク不足もCheckout阻害要因として扱う。PR差分`src/presentation/native/native-screens.tsx:939-949`は「最新価格を反映」の`disabled`条件へ`cart.blockingIssues.some(issue => issue !== "PRICE_CHANGED")`を追加。価格変更単独では操作可能、価格変更と他の阻害問題の混在時には無効化する。既存`acceptPriceChanges`のUse Case→Web Dexie/Native SQLiteは数量上限・在庫/権限を検証するため、UIのみで安全性を代替しない。
- **リスク・実証限界**：混在問題を抱えたまま価格だけ承諾する誤操作を避ける意図は仕様と整合する。一方、ボタンを無効化した状態からの修正導線、`blockingIssues`の集約順序、Nativeのアクセシビリティ/実操作は未検証。現HEADの[Web CI 41213242608](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41213242608)の成功はNative実機PASSではない。追加hunkと対応する独立Native操作テストの実行証拠は未取得。重大度Medium候補（誤承諾・復旧不能UX）。製品不適合を確定しない。
- **教材・処理方針**：既存`cart-with-invalid-items` Seedと`BR-CART-003`で価格変更単独/在庫不足混在を区別して分析可能。製品修正は教材の必須条件ではない。変更の導入commit・混在状態の実Native回帰・PR目的との整合が不足するため**判断保留**。製品UIを変更しない。

### Web Checkout component追加テスト（既存製品テスト1ファイル監査）

- **追加差分の範囲**：`tests/component/checkout-order-pages.test.tsx`の追加hunkを全件確認。配送先の非既定Snapshot復元/変更・削除時の再選択/保存失敗、確認DTOの数量・小計・割引・送料・合計、`CART_VERSION_CHANGED`/`PRICE_CHANGED`のCart戻り、注文確定時のstale拒否、建物名・決済表示、保存済み決済方法の再選択、未完了セッションの遮断/決済保存失敗、注文番号と本人注文詳細リンクをmockで検証する。
- **仕様・実装根拠**：`checkout-and-payment.md`の`BR-CHECKOUT-001/002/003`と`AC-CHECKOUT-001/002/003`、`checkout-order-pages.tsx:120-260/350-460/858-915`を照合。`resolveSelectedAddress`は保存Snapshotと登録住所の全主要フィールド一致を要求し、不一致では無断で既定へ切替えない。`checkoutNeedsCartReview`はCart version/価格/在庫/無効状態をCart確認へ誘導し、`beginOrder`失敗時の再確定ボタンを遮断。各追加テストはmock DTO/Serviceとrouter呼出しの確認であり、Repositoryの所有権・Cart version・在庫・注文/決済の原子性を直接検証しない。
- **実証・リスク・教材**：現HEADの[Web CI 41213242608](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41213242608)の`Vitest (component)`成功を確認。ただしテスト個別ログ、実ブラウザでの保存・再開、非本人注文ID拒否、Native同等性、視覚正本は未受入。重大度はCheckout状態/金額・所有権に関わるMedium〜Highの回帰影響候補で、当該追加テストの不適合は静的には未立証。教材は正式BR/ACと既存Seed・学習専用テストで独立に構成可能。
- **処理方針**：この追加hunkは学習用ではなく**既存製品componentテスト**であり、PR #199の教材・分析目的から独立する。製品用別PRへ分離する**方針のみ決定**する。実際の移設・revert・別PR作成は明示承認待ち。mockテストの成功を実Web/Native受入PASSへ流用しない。

### Native会員・Checkout表示/回復の既存差分（実装・既存componentテストとも全追加hunk静的監査）

- **対象と差分**：PRの`src/presentation/native/native-purchase-screens.tsx`追加hunkを、`tests/component/native/native-purchase-screens.test.tsx`の追加テストと照合。会員ランク/割引率/送料特典表示、Checkout sessionの`created/resumed/replaced`区別、住所Stepに限定した既知エラー回復、支払方法の再訪時復元、確認画面のSKU/配送先/小計/割引/送料/支払方法、注文完了時の公開`orderNumber`表示が対象。正式`BR-CHECKOUT-001/002/003`・`AC-CHECKOUT-001/002/003`、`src/application/use-cases/checkout-order-use-cases.ts`、`src/domain/services/pricing.ts`を参照し、UIが契約を勝手に拡張したとは断定しない。
- **回復・認可境界**：`useCheckoutSession:689-742`は`AUTHENTICATION_REQUIRED`でLoginへ遷移し、`CHECKOUT_STEP_INCOMPLETE/CART_VERSION_CHANGED/CHECKOUT_EXPIRED`だけを住所Stepの`checkout.start`へ回復する。Payment/Confirmでは任意の再開始を行わず、Sessionがない間は確定操作を実行しない。確認画面`getConfirmation(state.session.id)`の失敗は読み込み中のままにせずカート/住所へ誘導する。既存componentテストはmockの`getActive`失敗・`getConfirmation`失敗・決済方法復元を検査するが、本人認可・実DB状態・Android実操作の証明ではない。
- **残るリスク**：Native確認画面`beginOrder`の失敗後はエラーとカート導線が出る一方、`native-checkout-confirm-submit`の`disabled`は`busy`のみで、Webの`checkoutNeedsCartReview`による再確定禁止と差がある。**二重注文が発生すると断定できない**。Use Case/Repositoryのversion・冪等性、価格変更・stale Cart・通信失敗の独立負例と実Mobileで確認が必要。注文番号の公開表示は内部`orderId`の非表示という目的と整合するが、実本人注文へのリンク・視覚正本は未検証。
- **実証・処理方針**：HEAD `532e7eb1e8f0542e01eff7ac70f2d1472128c232`の[Web CI 41220046799](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41220046799)は`Vitest (component)`を含む必須Web jobs成功。ただしNative Jest個別実行、Android/iOS/Maestro、価格/注文の実回帰、変更コミット単位の由来、今回の教材目的への必要性は未確定。**製品適合・処理方針は判断保留**。学習用のレビュー題材として扱えても製品修正の承認にはならず、既存差分の移設・revertも行わない。
- **Native componentテストの全6 hunk追加差分監査**：`tests/component/native/native-purchase-screens.test.tsx`の会員rank別特典/内部ID非表示、保存済み決済方法復元、公開注文番号と注文履歴導線、Cart version不一致時の決済Step遮断、確認DTOの明細/配送先/金額・失敗時の復帰、Checkout `created/replaced`表示と予期しないStorageエラー時の自動再開始禁止、保存住所Snapshot復元、無効な直接入力の画面滞留を確認。既存の確認画面loadingテストは`PRICE_CHANGED`時の`beginOrder` mock拒否・カート導線へ置換され、別の確認取得失敗テストが追加されているため、単純なテスト追加だけではない。`native-purchase-screens.tsx:689-742/940-1061`、`checkout-order-use-cases.ts:141-215`、`checkout-and-payment.md`のBR/ACと静的に照合。特に`beginOrder`は本人Session/期待version/Cart versionをtransaction内で確認するが、componentテストはUse Case・DB・決済・在庫をmockしており実際の一回性/原子性を証明しない。無効住所テストも`setAddress`のError mockであり入力バリデーションの実行証拠ではない。Native確認画面の`disabled={busy}`は失敗後の再押下を一律禁止しないため、実Nativeで価格変更/通信失敗/再押下の負例を残す。**テスト1ファイルの全6 hunk静的監査は完了。製品実装もPR差分全13 hunkを確認したが、製品適合と処理方針は判断保留**。製品SUT・既存テストは変更していない。

- **Native実装の全13 hunkの意味単位確認（現HEAD `93e052a`）**：追加import（割引・送料無料閾値・accountラベル）、決済ラベル関数、プロフィール特典、`sessionOrigin`のreplaced追加、住所Stepのみの既知エラー再開始、置換通知、決済方法のSession保存値復元、確認DTO取得時のSession ID指定・非同期取消、確認取得失敗時のCart/住所復旧、SKU・住所・支払方法・小計/割引/送料、注文失敗時のCart導線、公開注文番号への切替をPR patch全体で照合。特に`methodOverride ?? session.paymentMethodCode ?? TEST-SUCCESS`は画面で選び直した値を優先するため、同一画面でSessionが切り替わった際の古いoverride残存は実操作で確認が必要。確認画面の再押下は`busy`だけで禁止され、`beginOrder`側には本人・Session version・Cart version・既存orderのガードがあるものの、通信結果不明時の実一回性は未実証。新たな製品修正権限は発生しない。

### Web Checkout画面の既存差分（実装1ファイル、全hunk静的監査）

- **由来・差分**：PR差分全hunkとbranch履歴を照合。配送先Snapshot復元は[commit `a4bf854`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/a4bf85453143f5ab049f92b3a82555f30d2e8350)、支払方法の保存値復元は[commit `5f2c3e6`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/5f2c3e68c511b3c90a294ab8474315b74b73df0d)、Cart/価格の再確認と注文確定ガードは[commit `d22e366`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/d22e366ac02aaffdaa6e9d4c55fcb2017cef3350)を確認。選択表示・保存失敗・busy表示・配送先建物名・型/書式修正も含む。教材専用ではなく既存Web製品UIの変更。
- **正式要求・実装**：`checkout-and-payment.md`の`BR-CHECKOUT-001/002/003`・`AC-CHECKOUT-001/002/003`、`CheckoutOrderUseCases.start/getActive/setAddress/setPayment/getConfirmation/beginOrder`、Web `checkout-order-pages.tsx:120-452/858-896`を照合。保存Snapshotと本人登録住所の全主要フィールド一致でのみ復元し、変更/削除後は既定住所へ無断で切り替えない。支払方法はSession保存値を優先、未保存時だけ`TEST-SUCCESS`を初期選択。Cart version/価格/在庫/無効状態の`ApplicationError`ではカート確認導線を表示し、該当する注文確定失敗後の再押下を禁止。配送先・支払方法の保存失敗では遷移せずエラー表示。
- **回帰・安全性の限界**：`tests/component/checkout-order-pages.test.tsx`の追加mockテストは住所復元/再選択、支払方法、stale Cart、確認金額と導線を検査。`tests/integration/checkout-order-use-cases.test.ts`はCart version/価格差の拒否とSession/注文/決済/在庫不変を一部検査。監査時HEAD `c217afe14a4cba548368f4d11e38acadf0652ba9`の[Web CI 41222249212](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41222249212)はcomponent/integration/contracts、主要Chromium E2E、verify/validateが成功。ただし個別の全負例、実本人ログイン/他人Session、並行二重確定、Web視覚正本、Native同等性は未実証。エラー分類外では再押下可能であり、冪等性の最終判定にはUse Case/Repositoryと実Runが必要。二重決済が起きるとは断定しない。
- **製品適合・教材・方針**：本人配送先/金額/注文に関わるMedium〜Highの回帰リスクだが、静的に認可緩和・二重決済は未立証。教材は既存Seedと学習専用テストで独立に実施可能。**処理方針は判断保留**（実Web/Native負例、本人認可、PR目的との必要性と分離時依存性が未確認）。製品UIの修正・revert・移設はしない。

### Checkout正式仕様の既存意味変更（仕様1ファイル、main差分静的監査）

- **差分と由来**：`main`の263行と現HEADの286行を比較。配送先一覧の「追加・編集・選択」を「追加・編集・既定の配送先設定」へ変更（[commit `1cff33a`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/1cff33a90a28)）。末尾に配送先Snapshotの再開/置換、Native直接入力の未決事項、異常時のSession再作成禁止、4種のモック支払方法、保存/遷移、確認前のCart version/価格再検証など**意味のある23行**を追加（`d05ae49`/`4d2b903`/`9b6b64b`/`d22e366`）。後続のMarkdown空行整形とは異なり**純粋な書式修正ではない**。
- **仕様/実装の整合と限界**：既存`BR-CHECKOUT-001/002/003`、`CheckoutOrderUseCases`、Web `checkout-order-pages.tsx`、Native `native-purchase-screens.tsx`、Web/Native component・統合テストと概ね整合。ただしWebは登録済み住所選択、Nativeは直接入力可という差の正式な許容方針は本文自体でも未決。新記述が製品仕様として承認済みか、単に既存動作の説明かは別途確認が必要。正本視覚・実Web/Android受入も未完了。
- **リスク・教材・方針**：未決のPlatform差を教材の正解に固定しない。正式仕様の意味変更を本PRの教材作業へ暗黙に含めない。**処理方針は判断保留**（要求妥当性、変更承認、分離先と既存差分依存が未確定）。仕様の意味変更・revertは実行しない。

### Checkout統合テストの全追加差分（4 hunk・6 Case）

- **全hunkと期待値**：`tests/integration/checkout-order-use-cases.test.ts`のPR差分は、(1) 未許可`TEST-UNKNOWN`の決済コード拒否・Session version/step/payment不変、(2) 住所未保存のPayment Step拒否、(3) Cart version更新後の`getActive(payment)`と`setPayment`拒否・Session不変、(4) 氏名/郵便番号/都道府県/市区町村/番地/電話の必須・形式エラーでSnapshot/step/version不変、(5) 郵便番号・電話の正規化と住所trim、(6) Cart versionまたは商品価格変更時の確認・注文開始拒否とSession/注文数/決済数/在庫数量/gateway呼出し不変、の追加6 Caseを含む。全4 patch hunkを確認した。正式`BR-CHECKOUT-001/002/003`と`CheckoutOrderUseCases.start/getActive/setAddress/setPayment/getConfirmation/beginOrder`の本人照合・version検証・transaction境界に静的に整合する。
- **安全性・未実行**：現HEAD `93e052aaa92aec60968b16bf138441165583c2a7`の[Web CI 41227393301](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41227393301)ではVitest integration、component、contracts、主要Chromium E2E、Style Quality、verify/validateを含む必須jobが実成功。これは追加Caseごとの独立ログ、別ユーザーSession/同時二重注文/実Android・iOS・Maestro、外部決済の一回性、全金額境界のPASSではない。未許可コードや入力正規化の仕様解釈候補は既存項目に統合し、重複登録しない。
- **製品適合・処理方針**：追加テストは既存製品の統合回帰であり学習専用契約ではない。金額/認可/注文のMedium〜High回帰リスクに対し静的・Web CIの証拠はあるが、実Native・並行性・コミット由来・他差分への依存・PR目的との整合が未確定のため**判断保留**。分離/revert/製品修正は承認前に実行しない。

### 処理方針の決定規則

- 各変更目的について、必要性（正式仕様・不具合・テスト）、安全性（認証/認可・データ整合・個人情報・回帰）、PR #199の教材目的との整合、代替手段、コミットと関連テストを監査する。
- **本PRに残す**：安全性・必要性・今回の目的との整合が証拠で確認できる。
- **別PRへ分離する**：製品として必要で安全だが、本PRの教材・分析目的から独立している。
- **取り消す**：必要性がなく誤った変更であると証拠から確認できる。削除やrevertによる影響も調査する。
- **判断保留**：仕様未決、証拠不足、認証・金額・状態・Native回帰などの確認が残る場合。安全性が確定したとみなさない。

処理方針は条件が満たされれば自動で判断・本表に記録してよいが、**実際のrevert・移設・別PR作成・機能修正は別途ユーザーの明示承認が必要**。PR #199のマージ前に最終の配置・未解決リスク・実行権限を確認する。書式例外は`docs/spec/**`のMarkdownだけに適用し、意味を変えない空行等をCI/lintとdiffで確認して変更可能とする。製品コード・製品テストや正式仕様の意味変更には適用しない。

## 現在の受入・管理上の注意

- 全サポート動作の暫定分母・基本分析済み件数・非default状態の件数は、必ず[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)の**最新内容から再集計**する。過去の集計値は進捗の正本ではない。
- 製品改善の未修正候補だけで分析の達成を拒否しない。ただし、分析に必要な仕様・証拠が未決なら基本分析未完、教材実行が阻害されるなら教材受入未完を維持する。
- PR本文は現行の主要な未解決事項と成果/受入状態のみ。調査の時系列履歴はGit履歴と全機能分析レポートへ残す。

## 2026-11-01 既存19ファイルの変更目的別判断表

PR #199のbase→HEADの**19ファイルの差分**と本レポートの各hunk監査を照合した。以下の9項目は承認・回帰を行うための意味単位であり、9件の確定不具合を意味しない。複数目的を含むファイル・テストは複数行へ関連付ける。製品SUTの修正、revert、分離、別PR作成はユーザー回答Q10により**保留**。

| 変更目的 | 関連する既存差分 | 確認できた内容 | 完了に不足する証拠・判断 | 現時点の方針 |
| --- | --- | --- | --- | --- |
| 顧客の住所候補参照の認可 | `account-use-cases.ts`、`auth-account.test.ts` | `suggestAddress`に`requireCustomer()`追加。追加統合テストがある | guest等の呼出し元・Web/Native回帰、導入背景 | 認可強化の必要性は妥当候補、配置は判断保留 |
| Checkout住所の必須/正規化・支払コード検証 | `checkout-order-use-cases.ts`、`checkout-order-use-cases.test.ts` | 必須項目・郵便/電話の数字正規化と支払コードの許可確認が追加 | 文字混入の許容範囲、既存保存値、Native/実画面・金額整合 | 仕様判断と負例実証後に個別承認 |
| Web Checkoutの復旧・表示 | `checkout-order-pages.tsx`、`checkout-order-pages.test.tsx` | 住所/決済方法の復帰、失敗経路、注文表示などの画面差分とcomponent証拠 | stale Cart、本人認可、各失敗での実Web、二重確定の防止 | 製品用変更としての妥当性を独立判断 |
| Native Checkout/会員表示の復旧 | `native-purchase-screens.tsx`、`native-purchase-screens.test.tsx`、`auth-account-pages.test.tsx` | 画面導線・Session復元・特典表示などの追加hunkとmockテスト | Android実Run、Web同等性、Session/金額・同時再押下 | 製品用変更としての妥当性を独立判断 |
| 価格変更承諾・数量上限・失敗時原子性 | `dexie/cart-checkout-repositories.ts`、`sqlite/native-customer-application-repositories.ts`、`native-screens.tsx`、`cart-use-cases.test.ts`、`native-customer-shared.test.ts` | Web/Native両Repositoryで承諾時の数量上限ガード追加、Nativeの操作条件追加、契約テスト追加 | 購入上限・version不変の実Web/Android、同時更新とrollback、他Cart問題との併発 | 金額/整合性優先で実証、処理方針保留 |
| 管理カテゴリーの全件取得・並べ替え | `dexie/basic-repositories.ts`、`admin-master-use-cases.test.ts` | 50件固定から総件数をページ取得し51件のテストを追加 | 途中ページの並行更新、並び順不変、実UI | 製品としての必要性は妥当候補、配置は保留 |
| 商品詳細の低在庫・購入上限案内 | `product-detail-page.tsx`、`catalog-pages.test.tsx` | 在庫と購入上限案内の表示条件、componentの境界ケースを変更 | Web/Native表示同等性、実画面での期待値、追加数量の拒否 | 既存レポートの**別製品PR分離案**は維持、実行保留 |
| 会員特典・配送先empty・既定配送先原子性 | `native-purchase-screens.tsx`、`auth-account-pages.test.tsx`、`auth-account.test.ts` | Web UIと既定配送先切替の追加テスト、Nativeの特典/住所導線の差分 | Web/Nativeの必須表示範囲、同時切替・旧version拒否、実表示 | 目的ごとに分割評価、方針保留 |
| Checkout正式仕様の意味変更 | `docs/spec/features/checkout-and-payment.md` と上記Checkout UI/Use Case/テスト | mainとの差分には再開/支払/確認など意味を持つ追加があり、単なるMarkdown書式差ではない | 正式期待値と導入背景、既存仕様/UX整合、ユーザーによる**意味変更の承認** | 書式例外の対象にせず、承認まで変更保留 |

上表のすべてで静的な差分と関連テストの存在は確認しているが、**実Web/Native回帰・仕様受入を全件完了したものではない**。特に認可、決済/金額、データ不変、同時操作、正式仕様の意味変更を優先し、必要なRunと具体的な処理提案を揃えた変更目的からユーザーへ個別承認を依頼する。現状の分離保留を解除したとは解釈しない。

