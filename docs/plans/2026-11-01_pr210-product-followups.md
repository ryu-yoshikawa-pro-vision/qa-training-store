# PR #210：Scenario Shop製品側の残課題と検証条件

## 対象と扱い

[PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199) の全サポート動作分析で得られた製品側の修正・確認候補を、[PR #210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210) の継続作業として管理する。製品実装・正式製品仕様・既存製品テストの変更は `product/scenario-shop-maintenance` で行い、教材PRへ戻さない。

これは **製品側の対応先を確定する管理文書**。問題の重大度・実行再現・製品修正の妥当性・CI成功を認定したものではない。ユーザーが確定済みの仕様回答と、コードの静的照合を区別する。認可・金額・決済関連の再現詳細は必要以上に公開せず、検証は権限が限定された環境で行う。未確認の事項を根拠に製品本体を変更せず、意味を変える仕様変更や影響の大きい修正には必要な承認を得る。

**正本の分担**：個々の操作ID・BR/AC・Role/State/Data・教材への影響と未実行理由は [#199の製品改善レポート](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/reports/pr199-product-improvements.md) と [全機能分析レポート](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/reports/2026-10-30_pr199-supported-behavior-analysis.md) に保持する。この文書では **#210で検証・修正すべき製品経路**と受入条件だけを追跡する。#199の分析が続く間は新証拠を照合して更新し、元の調査を重複して始めない。

## 2026-11-01 仕様確定2件の実装と検証

[コミット `ec5785d2`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/ec5785d23604cd26467275037ee605eda3fc3ec6) で管理ユーザー一覧のRankフィルター、Checkoutと保存配送先の入力文字検証、component/integration回帰を追加した。RankはRole・Statusとの併用とページ番号のリセットを検証し、住所は有効なハイフン付き入力を正規化、英字・空白・不正な区切り文字を拒否して保存済み状態を変更しない契約をテストする。配送先登録・編集の`AccountUseCases`でも検証しないと不正値が先に正規化されるため、両境界を変更した。

**実装コミット済みと製品受入は別**。変更直後のWeb CIではVitest integration・componentとCode Qualityが成功したが、追加テストのPrettier違反でStyle Qualityが失敗したため、本追記と同じコミットで書式を修正する。最新HEADの必須CI・Web実画面・Native実機回帰・独立レビューが成功するまでは2項目とも最終受入は未完了とする。

## 仕様回答済み：製品側の修正対象

| 項目・操作ID | #210 HEADの静的根拠 | #210側で必要な検証・対応 |
| --- | --- | --- |
| **管理ユーザー一覧の会員Rank絞り込み** `SCREEN-ADMIN-USERS-A01-02` | `src/presentation/pages/review-user-pages.tsx` の `AdminUsersContent` はメール・Role・Statusのみ。 `AdminUserUseCases.search` は `membershipRanks` を受け付ける。 | 2026-11-01の本人回答で **Rankを含む4種の絞り込みが必須**。一覧のRank選択と検索条件・ページ位置、Role/Status併用を検証し、UIとcomponent/統合回帰を整合させる。実Webでの絞込・不正Roleからの拒否も確認する。 |
| **Checkoutの郵便番号・電話の不要文字の拒否** `SCREEN-CHECKOUT-*` | `src/application/use-cases/checkout-order-use-cases.ts` の `validateAddress` は `replace(/\D/g, "")` で非数字をすべて取り除いてから長さを検証する。 | 本人回答は **数字と形式上必要なハイフンのみ許可、英字等は拒否**。正常値・ハイフン・英字/記号混入、エラー情報、保存済みSession/Cart/version不変を既存 `tests/integration/checkout-order-use-cases.test.ts` 等で検証。Web/Nativeの入力UIと共通Use Caseの信頼境界を整理する。 |

上記2件は **期待仕様が確定**しており、実装との差を静的に確認済み。ただし実Web/Nativeと、どの修正案が安全かの直接検証は未完了。既存の`docs/spec/features/checkout-and-payment.md`に含まれる別の意味変更は、この2件の仕様回答によって自動承認されたものではない。

## 高リスク候補：実証を優先する

| 対象 | 静的根拠・現在の限界 | #210側の検証観点 |
| --- | --- | --- |
| **管理者権限の変化とユーザー更新の競合** `BR-ADMINUSER-001 / AC-ADMINUSER-001` | `src/application/use-cases/review-user-use-cases.ts` の `changeRole` / `changeSuspension` は操作者認可と更新transactionに時間差がある。#199の学習用制御interleaving 2 Caseの成功は、実並行での権限越境の再現ではない。 | 権限・Sessionの失効と更新を別セッションで検証し、拒否時のtarget・version・Session不変を確認。実再現または安全性の欠落が確定した場合のみ、更新時の認可境界と関連回帰を修正対象にする。詳しい再現情報の公開は避ける。 |
| **購入上限縮小後のCart/Checkout再検証** `BR-CART-001/003 / AC-CART-001/003` | Dexie `cart-checkout-repositories.ts#getCartDto` と Native SQLite `native-customer-application-repositories.ts#getCartDto` は `maximumQuantity` を計算する一方、`blockingIssues` への追加は在庫不足等のみ。購入上限変更後の実Checkout成立は未実証。 | 上限の変更前後で既存明細・Cart DTO・Checkout開始/確認・注文/在庫・versionの変化を独立に検査。両RepositoryとUIを同じ契約で確認し、根拠のある場合にのみ回帰テスト・共通修正を追加する。 |
| **決済処理中の再操作と失敗復帰** | Web/Nativeの確定ボタン再押下・復帰UIには静的差がある。一方、`CheckoutOrderUseCases` の重複処理防止・冪等結果が別層に存在するため、二重決済は未実証。 | 同一キーの冪等応答を許容しながら新規二重決済を拒否できること、例外ごとのUI・注文/決済/在庫不変を検証。実際の二重決済は証拠なしに断定しない。 |

高リスク候補は新規Issue化や確定Highと同義ではない。再現証拠、既存Issue重複確認、影響範囲を揃えて別途判断する。

## UI/UX・状態表示：実Web/Nativeと正式仕様の照合待ち

以下も製品側の修正候補として #210 が対応先となる。**実装を自動変更する確定仕様ではない**。

| 候補 | #210で確認すること |
| --- | --- |
| Nativeログイン拒否理由が `messageKey` のまま表示される可能性 | 停止・退会・誤資格・保存失敗の実Android表示とSession/Cart不変、Webとの差 |
| 管理在庫の0/1/5/6以上の区分 | `available>=6`の正式期待とDexieの`>=1`判定、UIに表示する状態の責務 |
| 商品一覧empty時の復帰導線 | Web Breadcrumbs、条件解除CTA、Native空状態が正式な「戻る導線」を満たすか |
| 管理商品絞り込み後のページ位置 | ページ2以降でフィルター変更した際の再検索・結果非表示の有無 |
| Native注文一覧のステータス表示 | 利用者向け日本語表示と内部status表記のPlatform差 |
| Homeカテゴリー商品0件と会員特典表示 | Web/Nativeにおける0件カテゴリー・件数上限・特典表示の期待 |
| 商品詳細の12/13 SKU選択UIと在庫0 | Web button/selectとNative chipsの正式Platform契約、実画面 |
| 商品詳細Cartへの追加数量・上限超過エラー | Web複数点指定とNative1点追加の妥当性、拒否後Cart/version不変 |
| Nativeカテゴリー画面の見出し | カテゴリー実名が必要か、正式視覚・Android実画面 |
| 検索対象の範囲 | 商品名・商品コード以外のカテゴリー/ブランド/SKU一致を期待するか |
| Signup確認・注意事項同意と完了先 | Web/Nativeの入力/同意UI・遷移先・Session状態の仕様差 |

新しい製品候補が #199 の分析から見つかった場合も、具体的な変更・回帰検証の管理先は #210 に追加する。#199側には証拠と教材・分析への影響を記録する。

## 既存19ファイルの変更受入

PR #210の作成時点で、製品実装9・正式仕様1・既存製品テスト9の内容を #199 の旧HEADから移した。**「どちらのPRに置くか」の判断は完了**。ただし各変更の必要性、正式仕様との適合、非default状態、認可、金額、Web/Native、CIは個別に未検証事項がある。特にCheckout正式仕様の意味変更は自動受入しない。

今後は`main`との差分に対して、通常のWeb/Mobile CIと対象直接テスト、必要な独立レビューを実施する。実行なしのPASS・旧HEADの結果の流用・#199の学習用contractを製品実機回帰に代用することは禁止。製品コードの修正/意味変更は必要な承認の範囲で行い、このPRのマージはユーザーの別指示を要する。
