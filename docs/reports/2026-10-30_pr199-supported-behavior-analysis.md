# Scenario Shop 全サポート動作の分類と基本分析（再調査）

## 判定

以前の「270/270で分類・基本分析100%」は撤回する。BR/AC・状態遷移・横断規則を画面操作と別々の機能として合算しており、実装側の一部操作が漏れていた。また、汎用文言を記載した行まで`analyzed`と見なしていたため、受入基準に適合していなかった。

今回、機能動作と根拠規則を分け、公開Use Caseを調査した。**正規化した188件の動作候補の分類追跡は実施したが、14件は仕様・実装・Seedの照合済み、174件は追加レビューが残る。PRの「全サポート機能の分類・基本分析100%」は未達である。**

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

**188件中、14件が`analyzed`（7.45%）、174件が`review_required`。状態別検証条件20件も未レビューとして保持する。** 旧台帳の共通文言、同一文章の期待結果、機能単位のリスク、未解決のRole/Platform組合せだけでは分析済みにしない。仕様上の分析が成立しない項目はBLOCKEDを残し、勝手に分母から取り除かない。

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
