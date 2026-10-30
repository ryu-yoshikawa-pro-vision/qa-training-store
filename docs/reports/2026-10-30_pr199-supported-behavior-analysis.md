# Scenario Shop 全サポート動作の分類と基本分析（再調査）

## 判定

以前の「270/270で分類・基本分析100%」は撤回する。BR/AC・状態遷移・横断規則を画面操作と別々の機能として合算しており、実装側の一部操作が漏れていた。また、汎用文言を記載した行まで`analyzed`と見なしていたため、受入基準に適合していなかった。

今回、機能動作と根拠規則を分け、公開Use Caseを調査した。**正規化した188件の動作候補の分類追跡は実施したが、30件は仕様・実装・Seedの照合済み、158件は追加レビューが残る。PRの「全サポート機能の分類・基本分析100%」は未達である。**

## 今回確認した母集団

`training/ai-assisted-qa-course/coverage/supported-behaviors.json`をschema version 2へ移行した。

| 内容 | 件数 | 集計方針 |
| --- | ---: | --- |
| 38画面に含まれる73の機能記述を操作へ分解 | 172 | 動作として暫定分母へ |
| 通常時と異なるUI状態 | 20 | 既存操作の条件として追跡（分母には加算しない） |
| 画面記述だけでは追跡できなかったUse Case固有動作 | 16 | 実装との照合候補として暫定分母へ |
| **動作候補計** | **188** | 分析状況を別途判定 |
| BR/AC | 46 | 動作の受入根拠。分母へ二重加算しない |
| 認可/遷移/UX/スコープ等の横断契約 | 33 | 横断根拠。分母へ二重加算しない |
| 公開Use Caseメソッド | 76 | 動作候補へ参照付けし、仕様からの見落としを検出 |

UI状態20件は既存操作の状態別条件として追跡し、二重に加算しない。状態の検証は維持する。

商品公開状態とレビュー公開状態の**一括変更**は、以前の表示結果の項目と分離して独立の検証責務とした。

追加で確認した操作には、プロフィール更新、配送先削除・候補提示、商品複製・下書き削除、レビュー削除、ログアウト、カート価格承認、カテゴリー並び替え、カテゴリー/ブランドの状態変更、商品レビュー一覧などを含む。

**188という値は最終的な全製品の分母ではなく、対象仕様と公開Use Caseの照合に基づく現在の候補数。** 画面内に実装されている操作、内部の条件分岐、Native固有契約、実際のSeedで成立する状態を再確認した後で確定する。画面単位の動作の粒度とUse Case固有動作の粒度も、同じ操作を二重計上していないか最終点検する。

## 完了率の扱い

`node scripts/training/validate-supported-behaviors.mjs`は構造の不一致をエラーにし、分類済み・基本分析済み・未レビュー・BLOCKEDを別々に報告する。基本分析は`analysis_status=analyzed`に加え、Role/Platform/State/Data、期待結果、Risk、TR、Condition、Case選定・除外理由、関連BR/AC、仕様・実装・Seedレビューの証拠が必要となる。

**188件中、28件が`analyzed`（14.89%）、160件が`review_required`。状態別条件は18/20件が未レビューとして残る。** 旧台帳の共通文言、同一文章の期待結果、機能単位のリスク、未解決のRole/Platform組合せだけでは分析済みにしない。仕様上の分析が成立しない項目はBLOCKEDを残し、勝手に分母から取り除かない。

完了判定は`node scripts/training/validate-supported-behaviors.mjs --require-complete`で行う。CIの通常検証は構造の整合性を確認するが、**CIの成功を「内容のレビュー完了」と読み替えない**。

## 継続する独立確認

- 正式仕様、画面コンポーネント、全公開Use Case、Seed/シナリオを照合し、動作IDとRole/State/Platformごとの対象を確定する。
- 各動作のBR/AC対応、操作前提、具体的なData、期待結果、主要リスク、検証責務(TR)、Condition、Case採否理由、未決/対象外/残リスクをレビューする。
- 代表的な同義記載の二重計上と、Role/State分岐を統合すべき箇所を確認する。
- AndroidランタイムとiOSビルド限定を分離し、Web/Nativeの対象条件を誤って全プラットフォームへ適用しない。
- 型・行数・IDの形式検査だけでは内容の真偽を保証できないため、仕様と実装を根拠に人間が確認する。

既存の新機能/評価資料の配布禁止、固定SHA、非破壊同期などの安全境界は変更しない。

## Platform・Roleの確認結果

`SCREEN-AUTH-SIGNUP`の`validation-error`行にある`必須プラットフォーム: -`は**視覚リファレンスを別画面のエラー表示で代表する**という意味であり、サインアップのバリデーション機能そのものが非対応という意味ではない。従来台帳の`platform: -`は修正する。

`PLATFORM-NATIVE`の保証範囲はAndroidランタイムとiOSビルド限定を区別する。ストアフロントの閲覧はWebでは管理者・オペレーターもゲスト相当で行えるが、Androidでは管理画面と管理者の購入導線を対象にしない。誤ってWebのRole一覧をNativeへ一律適用しない。

以上は分類の修正であり、すべてのRole/State組合せを実機やSeedで確認し終えたという意味ではない。

## 追加のUse Case監査

`AdminProductUseCases.duplicate`は商品コード/SKUをクリアし初期在庫0の新規フォーム用DTOを返し、複製操作ではDBへ保存しない。`bulkChangeStatus`は0件/51件/重複IDを入力段階で拒否し、最大50件を1件ずつ変更する部分成功契約。`AdminReviewUseCases.getDetail`はStaff権限を検査してレビューと変更履歴を返し、`bulkChangeVisibility`は件別の成功・失敗と公開レビュー集計を分けて処理する。該当4件を仕様・Use Case・Seedと照合して`analyzed`へ変更した。

別の確認事項として、`AccountUseCases.suggestAddress`はUse Case内部に`requireCustomer`を持たず、画面の顧客限定とUse Caseのアクセス可能範囲を混同できない。また`CatalogUseCases.listReviews`は`customerGateway`経由で空の一覧を返すため、Web/Nativeの期待結果を一律に定義できない。これらは分析未完了のまま、台帳に論点を記録した。

## 追加監査：配送先一覧・配送先削除、価格承諾とカテゴリー並び替え

- `SCREEN-CHECKOUT-ADDRESSES-A01-01`：配送先一覧の仕様、Web/Native呼出し、`AccountUseCases.listAddresses`の顧客認可、Dexie/SQLiteの`listByUser(userId)`を照合。両者とも本人の`userId`で抽出し、`createdAt`と`id`で順序を確定する。初期`default`/`regular-member`には住所がないため、本人・別顧客住所を作成して確認する条件へ変更。注文・決済の責務を混同しない。
- `UC-ACCOUNT-DELETE-ADDRESS`：Use Caseの`requireCustomer`、Dexie/SQLiteの所有者検査・`expectedVersion`・既定住所再割当を照合。非既定/既定/最終住所と別顧客・旧versionの具体的な条件を定義し、分析済みに変更。既存のWeb統合テストに既定住所の再割当例があるが、すべてのCaseを新規実行したという意味ではない。
- **追加分析済み2件。基本分析済み14/188（7.45%）、確認待ち174件**。状態別条件20件は依然として未レビューであり、暫定分母188件は変更しない。
- `UC-CART-ACCEPT-PRICES`：Web/Nativeの実際の`CartUseCases`構築経路はRepository-backedであり、NativeをGateway専用とみなす推測は誤り。価格承諾では各明細のversion、公開状態、在庫0等を確認するが、数量が残在庫・購入上限を超える際の価格承諾自体の拒否条件は別途照合が必要。未分析のまま。
- `UC-ADMIN-REORDER-CATEGORIES`：`reorder`は全カテゴリーIDを要求し、取得側`listAllForReorder`は`pageSize:50`である。Seedは4カテゴリー。51件以上を作成可能な場合の操作成立性と正式仕様が未確認のため、分析済みにしない。

全機能の実ブラウザ・Native実行や全境界Caseの合格を主張する更新ではない。構造Validatorの成功も意味レビューの代替にしない。

## カテゴリー並び替え・カート価格承諾の実装境界（追加監査）

- **カテゴリー並び替え**：正式カテゴリ管理画面の並べ替え入力は全IDと各versionを送る。Dexieの更新処理も全カテゴリーIDを要求する一方、従来の一覧取得は先頭50件のみだった。取得処理を50件ずつ全ページ取得する形に修正し、Seedの既存4件へ47件追加した51件の回帰テストを追加。重複・欠落・旧versionの拒否契約は維持した。
- **価格承諾**：Web/Native双方のCart Repositoryは現行商品の可否を判定していたが、在庫が正の数で、明細数量が現在の在庫・購入上限を超える場合でも価格を更新できた。既存の`maximumCartQuantity`を使って明細数量を検査し、拒否時は`QUANTITY_LIMIT_EXCEEDED`でCart・明細version・価格を変更しない。Native UIでも非価格ブロックが残る場合は承諾ボタンを無効にした。Dexie/SQLite双方に回帰テストを追加。
- この2動作について仕様、Use Case、UI、Repository、Seedの条件分岐を確認し、**基本分析16/188（8.51%）、確認待ち172件、状態別条件20件未レビュー**とした。修正後の実行結果はCIで別途判定する。

実公開Template・Codespaces/OpenCode受入と機能分母の最終確定は依然として未達である。

## 郵便番号候補の顧客認可

`UC-ACCOUNT-SUGGEST-ADDRESS`はWebの顧客用配送先画面から呼び出されるが、Use Case内部に顧客認可がなかった。正式仕様のUse Case層での認可要件と整合させるため、`AccountUseCases.suggestAddress`へ`requireCustomer()`を追加し、guest/operatorの拒否とcustomerの候補取得・辞書未登録時のnullを統合テストへ追加した。固定辞書は外部通信せず、住所の保存処理とは独立。Nativeはサービス経路を提供するが、補完UIを提供しているとは扱わない。

**基本分析17/188（9.04%）、要レビュー171件**。状態別条件20件は未レビュー。動作分母188件は暫定のままである。

## 配送先登録・編集・空状態の追加監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESSES-A01-02`（追加）、`A01-03`（編集）、`A02-01`（住所未登録案内）と、その状態別条件`SCREEN-CHECKOUT-ADDRESSES-S-empty`を正式仕様、Web/Nativeの画面とUse Case、Dexie/SQLite Repository、初期Seedで照合した。

- **追加**：初期住所0件、1件目の既定住所付与、2～5件目の追加と既定切替、6件目の拒否、郵便番号・電話番号の正規化、不正入力・顧客以外の拒否。住所保存は注文・決済確定とは独立している。
- **編集**：本人所有者ID、expectedVersion、既定住所の保持と別住所の既定昇格、他人住所・旧version・未登録ID・不正入力を区別する。WebとNativeとも対応Use Caseを共有する。
- **未登録状態**：`default`/ `regular-member`の`userAddresses=[]`を実際の成立条件として確認。Webでは空メッセージと同画面の新規登録フォーム、Nativeでは未登録メッセージと新規住所フォームを表示。Webの0件表示と入力フォームが共存することをcomponentテストへ追加した。視覚状態`empty`の必須リファレンスはWebデスクトップで、Nativeの空表示は機能上の動作として追跡する。

### 画面契約の要確認事項

`SCREEN-CHECKOUT-ADDRESSES-A01-04`（「配送先を選択」）の台帳は`/account/addresses`を操作対象としている。しかし、この画面で確認した操作は住所の表示・追加・編集・削除・既定切替であり、注文に使う住所のラジオ選択と「この配送先を使用」は`/checkout/address`（`SCREEN-CHECKOUT-ADDRESS`、`src/presentation/pages/checkout-order-pages.tsx`）で提供される。正式仕様には`SCREEN-CHECKOUT-ADDRESSES`の機能説明に「選択へと進める」とある。画面をまたぐ導線か、別画面の機能の重複計上かを整理するまで、当該操作は`review_required`を維持する。暫定分母188件も、この点を含む全機能調査の完了までは確定しない。

上記の監査を反映し、**基本分析20/188（10.64%）、確認待ち168件、非default状態別条件19/20件未レビュー**。分類済みであっても全件テスト成功とは扱わない。

## 住所管理画面の「選択」機能分類を修正（2026-10-31）

`SCREEN-CHECKOUT-ADDRESSES-A01-04`について、正式画面カタログの`/account/addresses`、Web `addresses-page.tsx`、Native `NativeAddressesScreen`、別画面`/checkout/address`のWeb/Native実装を照合した。

- 住所管理画面の操作は「既定にする」であり、`AccountUseCases.updateAddress({addressId, expectedVersion, makeDefault:true, ...})`へ到達する。旧既定の`isDefault`を解除し、選択先を既定に設定する。DexieとSQLiteは所有者・version検査とトランザクションを持つ。
- 注文時の住所選択は別画面`SCREEN-CHECKOUT-ADDRESS`の操作である。Webは保存済み住所から選び`checkout.setAddress`へ住所スナップショットを渡す。Nativeは保存済み住所から入力欄へ反映した後に住所を確定でき、自由入力も可能。WebとNativeの条件差は別の分析対象とする。
- 画面仕様`checkout-and-payment.md`の住所管理機能説明を「一覧表示・追加・編集・既定の配送先設定」に改め、台帳`A01-04`の動作と紐づくUse Case・期待結果・テスト条件を修正した。既存の操作を単に削るのではなく、注文時の選択と独立した既定住所の設定動作として数えるため、**暫定188件を維持**する。
- Webの統合テストへ、非既定住所を既定へ昇格し、旧既定のversion更新と古いversionでの再更新拒否を確認するCaseを追加した。CI成功・Native実機受入は別途判定する。

以上により基本分析**21/188（11.17%）**、残り167件、非default状態別条件19件未レビュー。機能母集団の最終確定・全対象受入は引き続き未達。

## アカウントプロフィールの4操作を追加分析（2026-10-31）

`SCREEN-AUTH-ACCOUNT-PROFILE`の本人プロフィール、会員ランク、アカウント状態、管理者機能・内部IDの非表示を、`authentication.md`、`roles-and-permissions.md`、`AccountUseCases.getProfile`、Web/Native UI、Seedの3種類の会員シナリオで照合した。

- **本人情報**：`SessionIdentityResolver.requireCurrentEntity`と`AccountUseCases.requireCustomer`で本人・active顧客に限定し、Web/Androidともメール・表示名・電話番号を本人のDTOから表示する。guest、operator/admin、suspended/withdrawnは認証・権限で拒否される。
- **ランクと特典**：Webが表示する一般/ゴールド/プラチナ、割引率0/5/10%、送料閾値5,000円・プラチナ無条件無料の表示が、以前のNativeにはなかった。Native画面に共通`labels.rank`、`membershipDiscountRate`、`FREE_SHIPPING_THRESHOLD`を用いた表示を追加した。
- **アカウント状態**：Webでは`active`を「利用中」と表示していたが、Nativeでは項目自体が欠落していた。Nativeに`labels.account`による「アカウント状態：利用中」を追加した。停止/退会済みの状態はプロフィールを見せず、Use Caseが拒否する契約を維持した。
- **情報の非表示**：両UIとも内部`user.id`やRole変更・管理用操作を表示しない。DTO内部にIDが存在することとユーザー向け表示を分け、Web/NativeのcomponentテストでID非表示と各ランク表示を確認するCaseを追加した。

これら4件の仕様・Use Case・Seedの分岐が照合できたため、台帳上の基本分析を`analyzed`にした。**基本分析25/188（13.30%）、要レビュー163件、非default状態19件未レビュー**。Native実機・最新CIの成功は別途確認し、分析記録だけで受入完了としない。

## Checkout再開通知のWeb限定状態を個別監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-S-resume-notice`は`SCREEN-CHECKOUT-ADDRESS-A02-01`の非default状態条件であり、独立動作として二重計上しない。正式仕様では`web-desktop`のみ必須。Roleはactive Customerで、guest/operator/adminおよび停止・退会済み顧客は購入不可。

`checkout-resume` Seedは`regular@example.com`、Cart version=1と同versionのactive `checkout-active`セッション（unlockedStep=address、version=1）を生成。固定時計2026-07-01T03:00:00Zから24時間有効。Webの`CheckoutOrderUseCases.start`→`CheckoutAddressContent`→`claimCheckoutNotice`を追跡し、初回の再開通知、同Session reloadでの非表示、Seed Reset後の再表示、Cart版変更による置換通知の区別を確認した。`e2e/web/ui-ux-improvements.spec.ts` Flow C（141-155行）にも同条件の期待結果がある。**既存E2Eの存在を最新HEADのPASSとは扱わない。**

この状態条件1件を`analyzed`へ変更。**基本操作25/188（13.30%）、残163件、状態別条件18/20件未レビュー**。親のWeb/Native再開操作は入力復元やプラットフォーム差の精査が残るため`review_required`のまま。分母188件は暫定、Template/Codespaces/OpenCode受入も未完了。

## Checkout配送先入力と決済ステップ遷移の追加監査（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-A01-02`を仕様、Web・Native UI、`CheckoutOrderUseCases.setAddress`、Dexie・SQLite Repository、`regular-member` Seedで照合した。Webは本人が登録した配送先を選択して保存し、Nativeは保存済み住所の反映または直接入力した住所Snapshotを保存する。両経路とも正常な保存後だけ`/checkout/payment`へ遷移し、Sessionの`version`を1増加して`unlockedStep=payment`にする。保存が失敗した場合はエラーを表示して前画面を維持し、注文・決済は作らない。

確認過程で、`CheckoutOrderUseCases`の住所検証が文字数上限だけを確認し、必須項目の空欄、郵便番号の桁数、電話番号の桁数を拒否しない不備を発見した。Nativeの直接入力から不正な住所SnapshotがSessionへ保存され得たため、顧客の`AccountUseCases`と同様に入力値の正規化（前後空白、郵便・電話の数字化）と必須/形式/長さ検証を追加した。異常値が保存されずSessionのversion/stepが変わらないこと、有効なハイフン付き郵便・電話を正規化保存できることを統合テストへ追加。Web/Nativeの画面に保存失敗時の非遷移テストも加えた。

`SCREEN-CHECKOUT-ADDRESS-A01-01`の操作自体は**引き続き`review_required`**とした。Webは登録済み住所がなければ選択できないが、Nativeは保存済み住所が0件でもフォームに固定の初期住所が入り、直接入力のまま進める。正式な画面仕様には「配送先を選択」とあるものの、登録済み住所を必須とするか、Nativeの自由入力を許可するかまでは書かれていない。今回の形式検証修正で不正な値は拒否するが、登録済み必須という仕様判断までは代行しない。Web・Nativeの受入期待を確定してから分析を完了させる。

分析集計は**26/188件（13.83%）**、残り162件、非default状態別条件18/20件未レビュー。CI成功・Android実機・画面リファレンス受入と、実Template/Codespaces/OpenCode受入は別に確認する。

## チェックアウト再開とセッション置換の追加分析（2026-10-31）

`SCREEN-CHECKOUT-ADDRESS-A02-01`（セッション再開通知）と`SCREEN-CHECKOUT-ADDRESS-A02-03`（置換通知）を仕様、Web/Native、Use Case、Dexie/SQLite、固定Seedで照合した。状態別条件の`SCREEN-CHECKOUT-ADDRESS-S-resume-notice`は別の操作として二重加算しない。

- 同じ顧客・Cart/versionで期限内のCheckout Sessionは`resumed`として同じセッションを返す。Webの通知は`sessionStorage`で同一Session/通知種別につき初回のみ。Nativeは`getActive`を使い既存の配送先入力を復元する。
- Webの再開画面は以前の`addressSnapshot`を参照せず、常に既定住所を選択していた。非既定住所で進行して戻ると意図しない配送先変更になり得るため、Snapshotに一致する登録住所を復元し、一致する住所がない場合は既定住所へ無断で変更せず再選択を要求するよう修正した。Web componentテストで非既定住所の復元と、変更・削除された住所を検出するCaseを追加した。
- `checkout-replaced` Seedは旧Sessionの`cartVersion=1`、現Cart`version=2`を生成する。Use Caseの`start`とDexie/SQLiteの`startOrResume`は旧Sessionを`abandoned`にし、新Sessionを住所・支払方法なしで作成する。Webは置換通知を表示するが、Nativeでは以前`replaced`を`started`へ潰して「Checkoutを開始しました」と表示していた。Nativeで置換を独立の結果として保持し、通知とcomponentテストを追加した。
- `SCREEN-CHECKOUT-ADDRESS-A01-01`のWeb「保存済み住所の選択」/Native「自由入力」の仕様差と、旧Session全般の案内操作`A02-02`は未分析として残す。今回の修正はその仕様判断を代行しない。

以上で**基本分析28/188（14.89%）、確認待ち160件、状態別条件18/20件未レビュー**。新しい回帰テストと画面改修はCI・実機の最終PASSを別途確認する。

## チェックアウト決済方法の選択と確認遷移の監査（2026-10-31）

`SCREEN-CHECKOUT-PAYMENT-A01-01`（決済方法を選択）と`A01-02`（確認画面へ遷移）について、正式BR/AC、Web/Native Payment UI、`CheckoutOrderUseCases.getActive/setPayment`、Dexie/SQLite、`regular-member`/`checkout-resume` Seedと関連テストを照合した。

- `PAYMENT_METHODS`は`TEST-SUCCESS`、`TEST-DECLINED`、`TEST-INSUFFICIENT`、`TEST-AUTH-FAILED`の4種類。UIのTypeScript型だけでは実行時の不正コードを拒否できないため、Application境界に許可リスト検証を追加。未許可コードは`VALIDATION`で拒否し、Sessionの決済方法・version・ステップを不変に保つ統合テストを追加した。
- Webの決済方法保存は以前`try/finally`のみで、保存失敗時にエラー表示がなく未処理Promiseが発生し得た。Nativeと同じく失敗時に画面へエラーを表示し、`/checkout/confirm`へ進まず、再試行可能にする修正とcomponentテストを追加した。
- 配送先の再選択が必要な場合、共通サマリーボタンが`disabled`だけで「処理中…」と表示していた。送信中`busy`と操作不能`disabled`を分離し、住所未選択時は操作名を保持するよう修正した。
- NativeのCheckout復帰処理が、保存領域の読み取り失敗など予期しない`getActive`エラーまで新Session開始に変換していた。復帰対象を`CHECKOUT_STEP_INCOMPLETE`/`CART_VERSION_CHANGED`/`CHECKOUT_EXPIRED`に限定し、`STORAGE_READ_FAILED`時はCart取得・Session新規作成をせずエラーを表示するcomponentテストを追加した。
- CI `41088684235`の実ログを調査。契約テストの失敗は37件の実装行参照の古さと、既に分析済みの再開操作を未分析と期待するテストが原因。実装行37件、Use Case証拠7件、公開メソッド7件の参照を実ソース署名に合わせて更新し、契約テストを修正した。componentテストの失敗は無選択時のボタン表示名の誤り。Style QualityはNative/Web/契約テストのPrettier形式違反が原因で、対象を修正した。これらの最新CI成功は未確認であり、古いCIのPASSに読み替えない。

**現時点：基本分析30/188件（15.96%）、確認待ち158件、非default状態条件18/20件未レビュー。** 188件は暫定分母。Android実機・正本画面リファレンス・実Template/非公開2コアCodespaces/OpenCode実モデル校正の必須受入は未完了。

