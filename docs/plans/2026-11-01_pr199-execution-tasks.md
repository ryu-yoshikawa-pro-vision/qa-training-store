# PR #199：残タスク・優先順位・定期実行の作業手順

## 2026-11-01 製品分離後の参照再整合と分析状態（最新）

HEAD `a3f279d1307302517585e23d4ec9c03d69f38395` で、`training/ai-assisted-qa-course/coverage/supported-behaviors.json` の分離前のCheckout参照を、PR #199が参照する現行`main`に整合させた。**操作50/188件が分析済み、残138件、非default状態14/20件が分析済み、残6件**（全188操作・20状態は分母の最終監査前）。従来の「80/188・18/20」は**#210へ製品差分を分離する前の暫定値**であり、現在の完了数ではない。

修正した参照は、配送先の正式仕様文言4件、画面定義行43件、Use Caseの直接証拠25件、公開メソッド定義行7件。根拠となるCheckout画面実装は#210分離前と内容が異なるため、**既存の分析済み34件（操作30・状態4）を`review_required`へ戻した**。これは修正待ちの製品不具合34件ではない。分析状態は、各動作の現行仕様・UI/Use Case/Repository・Seed・必要なCaseと期待結果を再照合してから更新する。

基本分析の再成立と、製品としての不具合修正・既存19ファイルの分離は別判定。製品修正・実回帰は [PR #210](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/210) が担当し、PR #199の既存製品SUTは読み取り専用のままにする。再照合した静的分析で成立するものは、実Web/Native PASSと区別して再度`analyzed`にできる。

## 2026-11-01 完了：製品差分19ファイルの分離（最新決定）

PR #199の製品実装9ファイル、正式製品仕様1ファイル、既存製品テスト9ファイルの計19ファイルを、`main`起点の [`product/scenario-shop-maintenance`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/tree/product/scenario-shop-maintenance) に移した。**PR #199の同19ファイルは`main`の内容へ復元済みで、分離方針の最終判断は完了**。この19ファイルについて「本PRに残す／別PRへ分離／取り消す」を繰り返し判断しない。今後の追加の製品修正、正式製品仕様、既存製品テストの更新は同じ専用ブランチで扱う。製品用PRの作成・`main`へのマージは別指示待ち。

定期タスクはPR #199の教材・全サポート動作分析・証拠付き技術受入を継続する。製品改善候補の記録・実証は継続するが、製品SUTの修正や「既存19ファイルの処理方針」の再質問は行わない。既存の製品差分監査表・過去の担当枠別キューは歴史的記録で、現行のマージ前P2ではない。学習教材やCIの回帰が分離で生じた場合は教材側で必要な検証・整合を行い、製品実装をPRに戻して回避しない。詳しくは[製品専用ブランチ](./2026-11-01_pr199-scenario-shop-product-branch.md)。

## 2026-11-01 本人確定：B1・B2・B3の実施順序（現行・旧規則より優先）

- **B1（本PRでの配布準備は完了）**：公開先 `ryu-yoshikawa-pro-vision/ai-assisted-qa-learner` は本人が本PRマージ後に自ら作成・公開する。マージ前の外部リポジトリ作成や公開承認質問は不要。既存の配布manifest・`course:sync`・`verify-distribution`を使用し、マージ済みclean `main` で `node scripts/training/prepare-learner-template.mjs`を実行すると、リポジトリ外の `../ai-assisted-qa-learner/` に完全なコピー元を生成・検証する。生成先の中身を本人が公開先へコピーする。マージ前の固定SHAで生成済みファイルをPR内へ重複保存しない。実配布の検証が済むまでは実Run PASSとしない。
- **B2（本人の著作権回答は解消）**：外部ライブラリ等の第三者依存物以外の教材・コード・固定Skillは本人が作成したと明示された。制作元・著作権を再質問しない。独自部分のMITを維持し、外部ライブラリ・フォント等の元ライセンス・NOTICE、生成物のSecretと配布禁止対象の技術監査は継続する。
- **B3（後続受入）**：本人Privateリポジトリ・2コアCodespacesは本PRの**他の全作業が完了した後**に、本人がB1のPublic Templateから実施する。B1実公開もB3実受入も、**本PRマージ前の必須ゲートから除外**する。実行時のみ無料枠・課金設定を本人が確認し、未実行をPASSとしない。
- 旧節の「PR内Public Template作成」「公開先の再承認」「PR内Private 2コア実Run必須」は本節で置き換える。4定時タスクは分析・教材・配布元監査の実行可能な作業を続ける。製品変更禁止、必要なCI・独立レビュー、PRマージの本人明示指示は維持する。

## 2026-11-01 共通の逐次実行規則（4定期タスクすべてに適用）

**現行規則**：毎時00・15・30・45分の4実行は、異なる担当枠ではなく同じ1つの未完了作業を順番に引き継ぐ。実行頻度は維持する。下の「過去の担当枠別キュー」のQ-ID割当て、他枠を扱わない規則、各枠単独の自己停止条件は**履歴・参考情報**であり、現在の作業選択に使用しない。Q-ID、既存のPlan、目標ID、Case ID、分析台帳は維持する。

### 共通の現在作業と進め方

- **現在の対象**：`SCREEN-CHECKOUT-CONFIRM-A01-02`（所有権・金額/配送先・注文確定時の再検証）。HEAD `4f5b5f16232`のWeb CI #41351501411で隔離Dexieの直接契約3/3 PASS（137ms）。同テストの`useCasesFor`がReact Hookと誤認されCode Qualityに1 errorを発生させたため、学習用helperを`makeCheckoutUseCases`へ改名（意味不変、修正後CI未検証）。C4の価格/会員ランク変更後の再確定、C5の実Web/Android・DB前後は未受入で、`review_required`を維持する。
- **CI横断**：HEAD `4f5b5f16232`の[Web CI #41351501411](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41351501411)で対象契約3/3 PASS、Code Quality failureは上記helper名の`react-hooks/rules-of-hooks` 1 error、Style Quality failureは別の学習用5ファイル、Vitest contracts全体は旧`analyzed`期待と現台帳`review_required`等の15失敗。確認時点でrequired Chromium E2Eはin_progress。直接Case PASSとCI全体・製品適合・実Web PASSは別判定。Mobile CIは復元待ち。
- **単位**：操作ID 1件、学習目標ID 1件、Case IDとその対応関係1組など、既存の受入条件を満たして閉じられるまとまり。Q-13（M00〜M04）、Q-24（M05〜M07）、Q-33（M08〜M10）全体を1件と扱わない。目的・要求の範囲を縮小しない。
- **選択順**：まず現在作業を再取得し、実行可能であれば同じIDの未解決条件を扱う。完了または再開条件を持つ`review_required`/`BLOCKED`/実環境待ちに移した場合だけ、同じPlanのP1未完了のうち①全サポート動作と非default状態の証拠付き分析、②教材・演習・評価の目標別整合、③学習用配布/Skill/実行検証、④製品既存差分の承認不要な監査、の順で**着手可能な1件**を選ぶ。安全性の高い認可/金額/データ保護の根拠あるHighは優先する。候補を選んだ根拠とIDを引継ぎ記録へ残す。
- **進行・完了**：同じIDの仕様→実装/呼出し元・先→Seed/状態→Risk/TR/Condition/Case・採否→必要な変更→直接のテスト・根拠を確認する。変更しただけで「完了」にしない。静的分析、直接テスト、実Web/Native、製品適合、本人Codespaces、AI評価、CIは別の判定として記録する。単一の対象に必要な直接検証を終えた場合に次へ進む。
- **待機・再開**：権限/個別承認/実端末/モデル/費用、確認すべき仕様・実行証拠がなくなったら、そのIDを完了扱いせず「検証待ち」または`review_required`/`BLOCKED`として不足・再開条件を記す。その後は着手できる次の1件へ移り、待機中の作業を同時実行しない。新しい根拠が出たら優先順位を再判定する。

### CIを理由に日々の分析・教材作業を止めない

- 新しいHEAD・CI・レビューを開始時に短く確認するが、**CIがqueued/in_progress/cancelled/失敗でも、それだけで主作業を中断しない**。無関係なStyle Quality等の失敗はファイル・Run・原因と再開条件を引継ぎに記録し、次の実行可能な分析・教材作業を優先する。CI結果の確認だけで1枠を消費しない。
- 変更箇所の直接のフォーマット/テスト/静的検証は可能な限り実施する。修正後の**最終CI受入**は独立した未完の横断条件として保持し、旧HEADの成功を流用しない。実Runの失敗をPASSとして上書きしない。CIの失敗が当該作業の安全性やその先の検証に直結し、ほかの作業も進められない場合は原因を修正する。
- `src/**`等のSUT・正式仕様・既存製品用test/workflowの変更・revert/分離、公開Template、課金、新規Issue、mergeその他の禁止操作は、CI失敗を理由に例外化しない。最終マージ前はWeb/Mobile必須CIの同一最終HEAD成功、独立レビュー、既存の承認が必要。

### 4つの実行での同時変更・引継ぎ

- 各回、**同じ共通作業**と直前のGitHub HEAD/関連ファイルを確認する。自動化の実行時刻で対象を分割しない。別実行の作業が進行中・同一ファイル更新中と判明した場合、その回は読取りのみとしてコミットせず、既存作業の完了条件と次の確認を報告する。15分間隔だけを排他ロックとみなさない。
- 作業結果を保存するときは変更対象と共通Planの最新Blob SHA・HEADを再確認し、**同一親HEADからの1 commitを通常のfast-forwardで確定**する。HEADが変われば差分を再取得し、並行更新を統合できなければ書込みを中断する。複数ファイル更新を別々のcommitに分散して中途半端な状態にしない。競合する実行から同時に安全な単一commitを作れない環境では、変更せず証拠と次回の条件を報告する。
- 新規の状態更新用commit、待機用commit、PR本文の単なる同期は作らない。実質的な成果がある場合だけ、既存Planの「現在作業/結果/次の対象」を必要最小限で更新し、必要な関連ファイルと同じcommitへまとめる。共有状態の原子的な排他は自動化プロンプトだけでは保証されないため、重複実行の兆候がある場合は安全側に停止する。
- **終了条件**：4定期タスクのどれも、自己判断でほかの自動化を停止/更新しない。PR全体の受入条件が全て満たされ、ユーザーから運用停止の指示があった場合のみ設定変更する。各回の報告には対象ID、実施・未実施、直接検証、CIの別判定、HEAD、再開条件を示す。

## 2026-11-02 共通逐次：SCREEN-CHECKOUT-CONFIRM-A01-02（注文確認の所有権・金額・配送先直接契約）

- **対象・仕様**：正式`docs/spec/features/checkout-and-payment.md:120-152,244-248`は確認画面で商品・配送先・価格・決済方法を提示し、古いカート/価格不一致では注文・決済を作成しないことを要求。現台帳は製品分離後の`review_required`であり、旧`analyzed`を期待する`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`の失敗を根拠なく台帳へ逆反映しない。
- **UI→Use Case→Repository**：`CheckoutConfirmContent`は`getConfirmation()`の`checkoutActionVersion`と金額/配送先/支払方法を表示し、確定時`beginOrder`へ同versionを渡す。`CheckoutOrderUseCases.getConfirmation`はactive customerを要求し、Session ID指定時は所有者・有効期限・Cart.versionを検証。Dexie `getConfirmation`はaddress/paymentの設定とCart.versionを確認し、現在のUser.membershipRankによるCart DTOから商品/割引/送料/合計を生成する。`beginOrder`は別のcreate-order transaction内で再確認してからOrder/Paymentを作成するため、単なる確認取得と注文確定を混同しない。
- **Role/State/Data・Risk**：defaultの`cart-regular-active`/`cart-item-regular-shirt`とregular customer、active checkoutのaddress→payment→confirmを学習専用fixtureで構成。C1=正当customerの確認金額・配送先・決済方法・actionVersion一致と参照前後のCart/Checkout/Order/Payment/Session不変（採用）。C2=guest/staff/他customerによる住所・決済情報の非露出と拒否後全snapshot不変（Highデータ保護候補として採用）。C3=Cart.version変更後の確認拒否とOrder/Payment未作成（採用）。C4=価格変更/会員ランク変更・confirm表示後の別Session更新、beginOrder再検証（採用、直接Case未実施）。C5=Web/Androidの表示・戻り導線、視覚・アクセシビリティとDB前後（採用、実Run待ち）。
- **今回の直接作業**：`tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs`の隔離Dexie+default Seed 3 Case（成功読取、Role/所有権拒否、stale Cart拒否）はHEAD `4f5b5f16232`のVitest contractsで**3/3 PASS（137ms）**。同HEADのPrettier対象ファイル警告はなし。一方、`useCasesFor`が`readyCheckout`内でReact Hookと誤認されるESLint errorを確認し、helperを`makeCheckoutUseCases`へ意味不変改名。**改名後の直接Vitest/ESLint/Prettier・実Web/Androidは未実行**。本契約の直接成功を製品適合、台帳`analyzed`、実Web PASSへ昇格しない。基本分析50/188・非default14/20は変更しない。
- **CI横断・次回**：HEAD `4f5b5f16232`の[Web CI #41351501411](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41351501411)は確認時点でin_progress、Code Quality/Style Quality/Vitest contractsはfailure（原因は上記のとおり）。次回は**同ID**で改名後の同一HEAD直接CIとC4を検証。特に正式`AC-CHECKOUT-002`は価格変更時のOrder/Payment非作成を要求し、Dexie `getConfirmation`はCartの価格変更を拒否する一方、会員ランク変更では最新rankで金額を再計算する。`beginOrder`は注文作成transactionで確認DTOを再取得するが、表示時の金額snapshotとの同一性比較は静的に未確認。別Sessionでrank/割引が変わった場合の黙示的金額変更を**Highの未検証候補**として直接CaseとWeb実Runで判定する。製品SUT/正式仕様/既存Seed/Reset/製品テスト/workflowは無変更。
## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDER-DETAIL-A01-02（追加第4 Caseの直接結果確定・実Run待ち）

- **対象の直接結果**：現HEAD `a487040b69c84c410e0b8039724d65ffdd28132f`の[Web CI #41348239221](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41348239221)のVitest contractsログで`tests/contracts/ai-assisted-qa-admin-order-detail-actions.test.mjs`は**4 Case PASS（165ms）**。新規第4 Caseは別operator Sessionが同一versionを取得し、先行更新後の古いversion更新が`CONFLICT`となり、Order/Shipment/Historyの成功側更新と拒否側全snapshot不変、Payment/Session不変を検査した。隔離Dexieの**逐次interleaving**であり実同時競争・実Webではない。
- **formatter・全体CIの別判定**：同HEAD Style QualityのPrettier警告5ファイルに本契約テストは含まれず、対象ファイルの書式チェックは通過したと判断できる。ただしStyle Quality job全体はfailure。Vitest contractsは対象4件成功と別に15件failure（旧`analyzed`期待と現行`review_required`等）、required Chromium E2E・verify・validateもfailure。CI全体は未受入。
- **未受入・再開条件**：Web desktop/tabletの5状態・操作version、別Session実ブラウザでの競合・UI再読込、DB/Session前後、視覚/アクセシビリティの証拠が揃うまで本IDの`review_required`を維持。製品適合・実Web PASS・基本分析件数を昇格しない。再開条件が変わらなければ同じ静的監査を繰り返さない。
- **次の共通逐次対象**：`SCREEN-CHECKOUT-CONFIRM-A01-02`。既存`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`は本IDの旧`analyzed`期待を保持する一方、現HEADのCIは実台帳の`review_required`を示している。製品分離後の決済/注文確認の根拠再照合を優先し、まず台帳の実在・状態、正式仕様、Web/Native、Use Case/Repository、Seed、Case採否を検証する。旧期待に合わせて無根拠に`analyzed`へ戻さない。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDER-DETAIL-A01-02（別Sessionの古いversion拒否を追加）

- **直接実行の証拠**：HEAD `777d605e016d46cb5b59eac196e4b399bc520d06` の [Web CI #41345765211](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41345765211) の Vitest (contracts) ログで `tests/contracts/ai-assisted-qa-admin-order-detail-actions.test.mjs` は**3 Case PASS（115ms）**。5注文状態の読取、paid→deliveredの3遷移とstale拒否、禁止遷移/不正配送入力/非staff拒否が隔離Dexieで成功。対象ファイルは同HEADのStyle Quality警告5件には含まれないが、これは本回の独立formatter実行の代用ではない。
- **追加した直接Case（第4 Case）**：独立した2つのoperator Sessionが同じ `order-paid` version=1 を取得し、1つ目のSessionでpreparingへ更新後、2つ目の古いversionの更新が`CONFLICT`となることを検証する。拒否前後のOrder/Payment/Shipment/History/Sessionの全snapshot同一、成功側のみOrder.version=2・Shipment/Historyが各1件増えることをassert。学習用隔離fixtureのみを変更し、正式仕様・製品SUT・Seed/Reset・既存製品テストは無変更。**逐次的な別Sessionの競合Caseであり、実際の同時トランザクション競争の実証ではない**。
- **未受入・再開条件**：追加第4 Caseの同一HEAD Vitest/Prettier、Web desktop/tabletの5状態の操作可否・version表示、実ブラウザの別Session競合、DB前後、視覚/アクセシビリティを確認する。対象`review_required`、基本分析50/188・非default14/20、製品適合/実Web/最終CIの未受入を維持。CI横断のStyle Quality 5ファイル・supported-behaviors旧期待15件・required Chromium E2Eの失敗は独立管理し、本IDの作業を止めない。次の共通実行も同IDの直接結果から再開する。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDER-DETAIL-A01-02（次アクション・操作version）

- **正本・対象**：共通Planの現対象`SCREEN-ADMIN-ORDER-DETAIL-A01-02`（Web/Operator/Admin/default・`review_required`）。正式`docs/spec/features/admin-orders.md`は次アクション、注文アクションversion表示、`paid→preparing→shipped→delivered`と古いversion拒否、Order/Shipment同一トランザクションを要求する。画面表示と更新の製品適合は別判定。
- **UI→Use Case→Repository**：`AdminOrderDetailContent`は詳細の`orderStatus`と`orderActionVersion`を表示し、`paid`は「発送準備を開始」、`preparing`は配送会社/追跡番号と「発送済みにする」、`shipped`は「配達完了にする」、`pending_payment/payment_failed/delivered`は操作なし案内。各requestに表示中の`orderActionVersion`を渡す。`AdminOperationsUseCases.startPreparation/ship/completeDelivery`はstaff認可後、Dexie transaction内で`requireOrderVersion`（不一致`CONFLICT`）と許可状態を確認し、Order/Shipment/OrderStatusHistoryを更新する。`DexieOrderRepository.getDetail`の`orderActionVersion`はOrder.version。transaction scopeには`orders/order_status_histories/shipments`が含まれる。
- **Seed/Role/State/Data**：defaultの5注文は`payment_failed/paid/preparing/shipped/delivered`、初期Order.version=1。PaymentとShipmentは別系列で、`paid/payment_failed`はShipmentなし、`preparing`はpending、`shipped`はshipped、`delivered`はdelivered。active operator/adminを許可、guest/customer/停止staffは拒否。更新時のOrder/Shipment/Historyの一貫性とPayment/Session不変を前後snapshotで確認する。
- **リスクとCase採否**：C1=5状態の表示version・許可ボタン/入力・終端状態の操作なし案内（採用、実Web待ち）。C2=paid→preparing→shipped→deliveredのversion 1→2→3→4、ShipmentとHistoryの原子更新（採用）。C3=古いversion/二重押下・別Session競合時の`CONFLICT`とDB不変（High候補として採用、実並行未確認）。C4=禁止遷移・空白/長さ超過の配送情報・Role拒否と全テーブル不変（採用）。C5=競合失敗後、UIは汎用メッセージのみで`setMutation`を呼ばず自動再取得しないため、古いversionを保持して再試行が連続失敗する可能性（採用、実Web未再現、製品不具合未確定）。C6=desktop/tablet視覚正本、キーボード/スクリーンリーダー、画面更新・再読込、別SessionとDB/Session前後（採用）。
- **直接証拠・独立判定**：調査HEAD `8be00cea7ca91650ee6f9fab94a28865ba0ab62c`の正式仕様、UI、Use Case、Dexie、Seed、既存Integrationに対する**静的文字列16条件/16一致**（許可状態、version表示/伝播/競合、transaction対象、Seed、既存テスト、失敗時UI）。学習専用`tests/contracts/ai-assisted-qa-admin-order-detail-actions.test.mjs`に隔離Dexieの3 Caseを追加（5状態のread-only、version付き全遷移とstale拒否・Payment/Session不変、禁止遷移/無効入力/非staff拒否とDB不変）。新規JSのimport除外構文解析は成功。**新規Vitest/formatter、Web desktop/tablet、実並行、視覚/アクセシビリティは未実施**。既存Integration jobの成功は新規Caseや実WebのPASSではない。台帳`review_required`、基本分析50/188操作・14/20状態、製品適合/実Run/最終CIを昇格しない。
- **CI・再開条件・引継ぎ**：調査HEADのWeb CI [#41344697902](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41344697902)はcompleted/failure。Code Quality、integration、unit、repositoryはsuccessだがStyle Quality、Vitest contracts、required Chromium E2E、verify、validateはfailure。新HEADの最終CIは別途判定。次回も**同ID `SCREEN-ADMIN-ORDER-DETAIL-A01-02`**で新規Vitest/formatterの直接結果を確認し、可能なら実Web/競合・DB前後証拠を追加。必要証拠が得られない場合は`review_required`のまま再開条件を残し、台帳で実在を確認した次の操作IDへ移る。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDER-DETAIL-A01-01（顧客・注文/配送snapshot）

- **実在ID・正式契約**：台帳`behaviors[157]`の`SCREEN-ADMIN-ORDER-DETAIL-A01-01`はWeb、Operator/Admin、default/`orders-phase1-statuses`、`review_required`。正式`docs/spec/features/admin-orders.md:12-16,46-50`は「顧客スナップショット、注文・配送ステータス、次のアクション、バージョン」を要求する。顧客の現在プロフィールと「注文時点の顧客情報」を同一のオラクルとみなさない。
- **UI→Use Case→Repository（静的事実）**：`AdminOrderDetailPage`の`StaffPage`→`RouteGuard access="staff"`→`AdminOrderDetailContent`→`AdminOperationsUseCases.getOrder(orderId)`（`requireStaff`）→`DexieOrderRepository.getById/getDetail`。画面は`customer.displayName/email/userId`、`shippingAddress`、`items`、`membershipRankSnapshot`、`paymentAttempts`、`shipment`、`orderStatus`、`orderActionVersion`を描画。RepositoryはOrderの`shippingAddressSnapshot`/`membershipRankSnapshot`とOrderItemの各`*Snapshot`を返す。一方、Use Caseは`users.getById(order.userId)`で**現行UserのdisplayName/email**を取得し、Orderに注文時の顧客名/メールsnapshotは保存されていない。顧客プロフィール変更後の画面は現行User、配送先・商品・ランクは注文時点という異なる時点の値になり得る。正式「顧客スナップショット」が現行顧客概要を許容するか未確定であり、製品不具合とは断定しない。
- **同時読取・欠損時の境界**：`getOrder`は`getById`と`getDetail`を`Promise.all`で別読取し、その後Userを取得。`getDetail`内もOrderとItem/Payment/Shipment/Historyを別読取する。単一の一貫したDB snapshotを保証する明示transactionは見当たらない。更新が読取間に挟まると顧客/配送/操作versionの時点が混在する可能性があるが、実再現なし。OrderまたはUserが存在しないとUse Caseは`NOT_FOUND`、UIは取得errorを`not-found`にまとめる。認可・Storage障害時の機微情報非露出と誤案内を独立に検証する。
- **Seed/Role/State/Data**：defaultと`orders-phase1-statuses`は同一基本dataset。regular customerの5注文（payment_failed/paid/preparing/shipped/delivered、初期version 1）を使い、Paymentのfailed/succeededとShipmentのなし/pending/shipped/deliveredを**Order.statusとは別系列**で照合する。guest/customer/suspended operatorの直URLおよびUse Case拒否、active operator/adminの許可を確認する。閲覧だけでOrder/OrderItem/Payment/Shipment/History/User/Sessionが変化しないことを前後比較する。
- **Risk/TR/Condition/Case採否**：C1=5注文のID・番号・状態・version・支払試行・配送とSeed照合（採用）。C2=住所・商品名/SKU/金額・ランクが注文時snapshotから表示され、現行Product/User変更後も履歴値を保持（採用）。C3=現行User名/メール変更時の表示と「顧客snapshot」の正式期待を区別（採用、正式オラクル保留）。C4=guest/customer/停止staffの直接拒否・機微情報非露出、欠損Order/Userの画面状態（High候補として採用、実漏洩未確認）。C5=別SessionがOrder/Shipment/Userを更新する読取競合時の一貫性、versionとOrder/Shipment不変（採用、実競合未確認）。C6=desktop/tablet視覚正本・キーボード/スクリーンリーダー・再読込とDB/Session前後（採用）。
- **直接検証と独立判定**：HEAD `d1a489194f8e9b5f2160aa73647997133526d983`の正式仕様・UI・Use Case・Repository・Seedに対し静的文字列10条件/10一致（顧客仕様、UIの現行顧客表示、現行User読取、Order二重読取、配送先/ランク/商品snapshot、Payment/Shipment表示、5状態Seed、staff二重境界）。**これはVitest/実Web/DBのPASSではない**。既存Integrationの注文操作成功は本IDのRole別実画面や混在snapshotを証明しない。今回の直接Vitest・formatter・Playwright/Android・DB前後実Runは未実施。台帳`review_required`、基本分析50/188操作・14/20非default状態を維持する。
- **CI・再開・次の1件**：調査HEADのWeb CI [#41343801501](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41343801501)はcompleted/failure（Style Quality、Vitest contracts、required Chromium E2E、verify、validate）。integration job成功は本IDの直接受入ではない。再開条件はC1〜C6の隔離Dexie直接Case、現行User変更・注文時snapshotの正式期待、Role別実Web、同時読取再現、DB/Session前後、視覚/アクセシビリティ証拠。次の共通対象は台帳`behaviors[158]`の`SCREEN-ADMIN-ORDER-DETAIL-A01-02`（次アクションとversion表示）。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDERS-A02-01（注文詳細へのversion付き導線）

- **対象・正式期待**：台帳`behaviors[156]`の実在する`SCREEN-ADMIN-ORDERS-A02-01`はWeb、Operator/Admin、default、`review_required`。`docs/spec/features/admin-orders.md:19-25`は「注文詳細のバージョン付きアクションへ進める」、`BR-ADMINORD-001/AC-ADMINORD-001`は正しい順序・versionと注文/配送の同時整合を要求。**遷移時にversionをURLへ渡す契約ではない**。遷移自体と配送状態変更の成功を同一CaseのPASSにまとめない。
- **UI→Route→Use Case→Repository（静的事実）**：`src/presentation/pages/admin-operations-pages.tsx:425-440`の一覧の注文番号`Link href={`/admin/orders/${order.orderId}`}`はorderIdだけを渡す。`app/admin/orders/[orderId].tsx`がroute paramを読み、`AdminOrderDetailPage`の`StaffPage`→`RouteGuard access="staff"`（active operator/admin）→`AdminOrderDetailContent`→`AdminOperationsUseCases.getOrder(orderId)`（独立に`requireStaff`）→`DexieOrderRepository.getById/getDetail`に進む。Repository DTOの`orderActionVersion`は**詳細取得時の`order.version`**であり、詳細画面に表示され、準備/発送/配達のrequestへ渡される。変異時の`requireOrderVersion`は現行versionと照合し不一致を`CONFLICT`として拒否する。
- **Seed/Role/State/Data**：`default`と`orders-phase1-statuses`は同じ基本datasetを使う。defaultの5注文（`order-payment-failed`/`order-paid`/`order-preparing`/`order-shipped`/`order-delivered`、version初期値1）で、各一覧行→同一orderIdの詳細/現行versionを照合する。guest/customer/停止staffの直URLおよびUse Case直呼出しは、UIのRouteGuardと独立して拒否を確認する。対象外orderIdはUse Caseの`NOT_FOUND`だが、詳細UIは`state.error`を含め`not-found`へ集約するため、権限変更後/Storage障害の誤案内は表示期待のレビュー候補であり、漏洩や製品不具合確定ではない。
- **Risk/TR/Condition/Case採否**：C1=operator/adminの一覧5件→選択orderId・注文番号・versionの詳細一致（採用）。C2=guest/customer/suspended staffの直URL/Use Case拒否、機微な注文・配送先の非露出（High候補として採用、実漏洩未確認）。C3=不在orderId・不正URL・取得障害の区別と戻り導線（採用、UIの正式文言は保留）。C4=一覧表示後に別Sessionが更新した場合、詳細では最新versionを取得し、古いversionの更新は`CONFLICT`、注文/Shipment不変（採用、実競合未確認）。C5=選択・詳細参照のみではOrder/Payment/Shipment/Session/Historyが不変（採用）。C6=desktop/tabletのリンク、キーボード、スクリーンリーダー、視覚正本、再読込と戻る操作（採用）。`getOrder`は`getById`と`getDetail`を独立並列読取するため、更新が読取間に挟まる場合のsnapshot一貫性は別途再現が必要。顧客表示は現行Userから補完されるため「注文時点の顧客スナップショット」との差は次ID A01-01で切り分ける。
- **直接検証と判定**：PR HEAD `f760854319526acfa8cc6957e3dc137e70113371`の正式仕様/Route/Guard/Use Case/Dexie/Seedを照合し、一覧Link・orderId・staff二重境界・versionの取得/表示/使用・Seed一致の**静的文字列11条件/11一致**を確認（実行可能なUI/認可/DBテストではない）。既存`tests/integration/admin-operations-use-cases.test.ts`には配送遷移・version検査があるが、一覧リンク→詳細のRole別実Webと前後DB snapshotを直接証明しない。対象の新規Vitest/formatter、Web desktop/tablet、別Session競合、DB/Session不変は**未実施**。台帳`review_required`を維持し、基本分析/製品適合/実WebをPASSへ昇格しない。調査HEADのWeb CI #41342149723はcompleted/failure（Style Quality=Prettier 5ファイル、supported-behaviors契約の旧`analyzed`期待、required Chromium E2EのCheckout再確認、verify/validate）。CIは別の最終受入事項であり作業選択を止めない。
- **再開・次の1件**：上記C1〜C6の直接Vitest/Playwright・Role/DB・視覚・version競合の証拠と正式なエラー/顧客snapshot期待が揃った際にA02-01を再判定する。次の共通対象は台帳に実在する`SCREEN-ADMIN-ORDER-DETAIL-A01-01`（注文詳細の顧客/配送スナップショット）を1件扱う。製品SUT・正式仕様・既存Seed/Reset・既存製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDERS-A01-02（注文絞り込み・境界）

- **正本と期待の分離**：現HEADの台帳に実在する`SCREEN-ADMIN-ORDERS-A01-02`はWeb、Operator/Admin、default/`orders-phase1-statuses`、`review_required`。台帳は「決済状態・配送状態・検索条件を変更すると対象注文だけ」を期待する。正式`docs/spec/features/admin-orders.md:19-27`は「注文一覧、決済ステータス、配送ステータス、フィルター」を要求するが、**決済・配送それぞれの独立したフィルター操作**を明記しない。正式契約と台帳の解釈を混同しない。
- **UI→Use Case→Repository（静的事実）**：`app/admin/orders`→`AdminOrdersContent`（`admin-operations-pages.tsx:301-451`）→`AdminOperationsUseCases.searchOrders`（`admin-operations-use-cases.ts:115-133`、`requireStaff`）→`DexieOrderRepository.search`（`order-review-repositories.ts:172-223`）。UIは注文番号/顧客keyword、**Order.statusだけ**の単一select、開始/終了日、最低/最高合計、sort、paginationを提供。Payment.status・Shipment.status専用フィルターはなく、Repositoryも両テーブルを検索条件に使わない。注文一覧の表示列もOrder.statusのみ（前ID A01-01参照）。正式仕様上のフィルター対象範囲と台帳期待は未確定であり、製品不具合確定ではない。
- **境界と共通原因候補**：Use Caseはkeyword trim/長さだけを検証し、Repositoryは大小文字を無視した番号/メール部分一致、金額の`>= minimumTotal`/`<= maximumTotal`、`createdFrom`以上/`createdTo`**未満**、Order.status、userId、sortを適用し、最後にpageを切り出す。UIの終了日は`YYYY-MM-DDT23:59:59.999Z`を渡すため、その日の**最後の1msが除外される**（Repositoryの排他的上限との静的な接続差）。UIのdateはUTC組立でありローカル日付の期待も未確定。金額の上下限矛盾・非有限値、日付範囲の逆転に対するUse Caseの明示検証はない。さらにfilter変更時に`page`を1へ戻さず、以前のpageが残るため、ヒット件数が減ったとき空ページになる可能性がある。いずれも実Web再現・正式期待未確認の候補として扱う。
- **Seed/Role/State/Data**：default Seedは`payment_failed/paid/preparing/shipped/delivered`の5注文を同一regular customerに作り、注文日時は2026-07-01の01:00〜05:00 UTC、Paymentはfailed/succeeded、Shipmentはpreparing以降のみ。UIのstaff RouteGuardとUse Caseのstaff認可は別層。guest/customer/停止staffの直接Use Case拒否、operator/adminの表示、Order/Payment/Shipment/Session不変を独立に検証する。
- **Risk/TR/Condition/Case採否**：C1=operator/adminのstatus・keyword・金額等値境界とOrder/Payment/Shipment非変更（採用）。C2=開始日含む/終了日除くAPI境界とUIの最終1ms・UTC解釈（採用、UI期待は保留）。C3=createdFrom>createdTo、min>max、非有限値/負数、keyword上限の拒否または空結果とDB不変（採用、正式オラクル保留）。C4=filter変更時のpage維持・0件表示とsort tie-break（採用）。C5=guest/customer/停止staffの拒否と保護注文非露出（High候補として採用、実漏洩未確認）。C6=Web desktop/tabletの状態表示、Payment/Shipment別フィルターの正式必要性、キーボード/スクリーンリーダー、DB/Session前後（採用、実Run待ち）。
- **直接Caseと判定**：既存`tests/integration/admin-operations-use-cases.test.ts`の検索Caseは条件をまとめて渡すが、厳密な対象ID・境界・拒否後の不変をassertしない。学習用`tests/contracts/ai-assisted-qa-admin-order-filters.test.mjs`へ独立Dexie/default Seedの3 Case（複合絞り込みと境界・排他的上限/ページング/不正page・customer/guest/停止staff拒否とOrder/Payment/Shipment/Session不変）を追加。作成したJSは`node --check`構文検査成功。**依存付きVitest/Prettier・実Web desktop/tablet・視覚・アクセシビリティ・正式フィルター解釈は未実施/未確定**。APIの排他的上限の確認CaseはUIの終了日仕様適合を証明しない。台帳`review_required`、基本分析50/188・状態14/20を維持し、製品適合・実Run・最終CIをPASSにしない。
- **再開と次の共通対象**：新Caseの同一HEAD Vitest/formatter、Webのstatus・金額・日付最終1ms・page2→条件変更、Role別直URL、DB/Session前後、Payment/Shipmentフィルターの正式期待が揃った時に本IDを再判定する。次は台帳に実在する`SCREEN-ADMIN-ORDERS-A02-01`（選択した注文詳細へのversion付き導線）を1件扱う。製品SUT・正式仕様・既存Seed/Reset・製品テスト/workflowは無変更。

## 2026-11-02 共通逐次：SCREEN-ADMIN-ORDERS-A01-01（注文一覧と決済・配送状況）

- **対象と正本**：台帳の実在操作`SCREEN-ADMIN-ORDERS-A01-01`は`action`、Web、Operator/Admin、default、`review_required`。正式`docs/spec/features/admin-orders.md`の機能一覧は「注文一覧、決済ステータス、配送ステータス、フィルター」を要求し、BR-ADMINORD-001/AC-ADMINORD-001は注文・配送の整合した状態遷移を要求する。A01-01は一覧表示・読取りの受入であり、フィルター詳細はA01-02、遷移/競合更新は詳細画面の別IDとして切り分ける。
- **Web→Use Case→Repository**：`app/admin/orders`→`AdminOrdersPage`/`AdminOrdersContent`（`src/presentation/pages/admin-operations-pages.tsx:293-455`）→`AdminOperationsUseCases.searchOrders`（`src/application/use-cases/admin-operations-use-cases.ts:115-133`、`requireStaff`）→`DexieOrderRepository.search`（`src/infrastructure/database/dexie/order-review-repositories.ts:172-212`）。一覧表は「注文番号/顧客/状態/商品数/合計/作成日時」の6列で、`OrderStatusBadge(order.status)`を表示する。Repositoryの`AdminOrderListItem`射影は`order.status`のみを返し、`Payment.status`と`Shipment.status`を個別に取得・返却していない。**正式仕様の決済/配送ステータスを独立に一覧表示する期待との静的差**があるが、一覧の「状態」が両者の代替として認められるかは正式期待の確認待ち。製品不具合/情報漏洩と断定せず、製品SUTを修正しない。
- **Role/Seed/データ**：`StaffPage`の`RouteGuard access="staff"`とUse Caseの`requireStaff`を別の認可層として扱う。default Seedは`payment_failed,paid,preparing,shipped,delivered`の5注文を生成し、`orders-phase1-statuses`はdefaultと同じデータを返す（`src/seeds/scenarios.ts:30-38`）。Paymentはfailed/succeeded、Shipmentはpreparing=pending、shipped=shipped、delivered=delivered（paid/payment_failedにはShipmentなし）。状態の3系列を混同せず、Role別直URLとSession有効性、表示前後のDB不変を別途実証する。
- **Risk/TR/Condition/Case採否**：C1=operator/adminで5注文の番号・顧客・Order.status・件数/金額をSeedと照合（採用）。C2=paid/preparing/shipped/delivered/payment_failedについてOrder/Payment/Shipmentを別系列で照合し、一覧表示が正式期待を満たすか確認（採用、Mediumの表示欠落候補）。C3=guest/customer/停止staffの直URL拒否・注文情報非露出（採用、High候補だが未再現）。C4=注文詳細へのリンクが対象IDと一致し、他注文のスナップショットを混入しない（採用）。C5=desktop/tabletの視覚・キーボード/スクリーンリーダー・0件/エラーとDB/Sessionの前後snapshot（採用）。C6=既存Integrationの検索結果が実画面の各状態を保証するか区別し、`orders-phase1-statuses`のシナリオ同値性を検査（採用）。日付・金額・ページングの詳細境界はA01-02へ分離。
- **直接証拠と未受入**：既存`tests/integration/admin-operations-use-cases.test.ts`の「searches orders by customer, status, period, total, sort, and page」は顧客メール・金額ソートを確認するが、Payment/Shipment独立表示とWeb Role別描画をassertしない。調査HEAD `00017e161b0f`のWeb CI #41339877367でVitest integrationはsuccessだが、本IDの実Web/desktop/tablet・負例・DB/Session・視覚/アクセシビリティの直接証拠には流用しない。今回の検証は仕様・UI・Use Case・Repository・Seed・既存テストの静的照合のみで、直接新規Vitest/formatter/Playwrightは未実施。台帳`review_required`、基本分析50/188操作・14/20非default、製品適合・実Run・最終CIは未完了のまま。
- **再開条件・次**：一覧で決済/配送ステータスを別表示する正式期待の確定、Web operator/adminと拒否Roleの実操作、Order/Payment/Shipmentの同一ID前後snapshot、視覚正本・アクセシビリティ、必要な学習用直接Caseを揃えて本IDを再判定する。待機中の同IDを並列実行せず、次は台帳の実在操作`SCREEN-ADMIN-ORDERS-A01-02`（注文絞り込み）を1件扱う。

## 2026-11-02 共通逐次：SCREEN-ADMIN-INVENTORIES-S-stock-boundaries（在庫フィルター直接契約）

- **正式仕様と静的事実**：`docs/spec/features/admin-inventory.md`のBR-ADMININV-001/AC-ADMININV-001は0=`out_of_stock`、1〜5=`low_stock`、6以上=`available`の排他的分類を要求。Web `AdminInventoriesContent`の「在庫あり/低在庫/在庫切れ」選択→`AdminOperationsUseCases.searchInventory`のstaff認可→`DexieInventoryRepository.search`に到達する。Repositoryは`available`を1以上で判定するため、1/5がlowとavailableに重複する。表の「状態」列は`ActiveBadge(isActive)`であり在庫分類ではない。これは既存の製品差分候補で、製品変更は行わない。
- **新規学習用Case**：`tests/contracts/ai-assisted-qa-inventory-stock-boundaries.test.mjs`に隔離Dexie+default Seedを用いた2 Caseを追加。テスト内でのみ4 SKUを0/1/5/6に設定し、C1=out/lowの境界を実Repositoryで検証、C2=availableは6のみという正式オラクルを`it.fails`で**既知の期待失敗**として保持する。C2がテストランナー上success扱いでも**製品適合PASSではない**。将来製品側で修正したら`it.fails`を通常Caseに変える必要がある。既存Seed/Resetは変更しない。
- **未実施・再開条件**：JS構文チェックのみ実施。直接Vitest/Prettier、実Web desktopでのoperator/admin・0/1/5/6の絞り込み件数/ラベル、視覚正本、調整履歴/DB不変性は未実施。対象は`review_required`を維持し、直接テストの同一HEAD実Run・製品専用ブランチの修正有無・実画面の証拠が変わった場合のみ再判定する。CI横断は前HEAD `b831ca63ae15` のWeb CI #41338665920がfailure（Style Quality、Contracts、required Chromium E2E、verify/validate）。新HEADのCIは別判定。基本分析50/188操作・14/20非default状態は未更新、分母監査も未完。
- **次回**：新CaseのCI結果が得られたら当該Caseの直接判定を更新する。実Web/製品修正の新証拠がなければ本IDの再調査を反復せず、台帳から次の独立した`review_required`操作IDを確定して1件進める。

## 2026-11-02 共通逐次：SCREEN-STOREFRONT-PRODUCT-LIST-S-empty（0件時の復帰導線）

- **正式期待と既存実装の差（静的事実）**：`docs/spec/features/storefront.md`の商品一覧`empty`状態はguest/customer・`empty-catalog`・Web desktopで「表示可能な商品がない理由と元の画面に戻る導線」を要求する。Web `CatalogListPage`は無条件0件に`StatePanel kind="empty" action={null}`を渡し、StatePanel既定のホームCTAを明示的に消す。一方、ページ全体には`Breadcrumbs`の「ホーム」`href="/"`が残る。したがって「画面に戻る導線が一切ない」は誤り。**パンくずが正式な『元の画面に戻る導線』を満たすかは未決**であり、欠陥/PASSのどちらにも断定しない。
- **条件付き0件・Native・Seed**：価格等のフィルター後0件は`StatePanel kind="filter-empty"`の「条件をすべて解除」ボタンが`router.replace("/products")`を呼ぶ。Native一覧の0件表示は「商品が見つかりません」「検索条件を変えてお試しください。」であり、Androidのempty視覚正本は正式必須外だがNative機能の実Runは別判定。`emptyCatalog` Seedは商品・Variant・Review・Cart/Order等を空にするがカテゴリー自体を削除しない。Seedの初期Sessionと、実画面へのログイン・Reset・読み込みを混同しない。
- **採用Case・Risk/TR**：C1=Web無条件0件の説明とパンくずのホーム遷移、C2=StatePanel内CTAなしと正式『復帰導線』の解釈、C3=価格/検索条件付き0件の解除操作、C4=guest/active customer・`empty-catalog`と検索Repository件数、C5=Native empty表示/遷移、C6=Web desktop視覚・キーボード・DB/Session不変。C1/C3の現行UI挙動は学習用直接Caseを追加したが、**仕様適合の採点オラクルは未確定**。Medium候補：復帰導線の認知可能性。Role別公開条件・DB不変は未実証。
- **直接証拠と独立判定**：既存`tests/component/catalog-pages.test.tsx`は無条件0件・検索/価格フィルター0件を検査し、HEAD `9ab6c414ed9d`のWeb CI #41337557220ではVitest component jobがsuccess。ただし新規`tests/contracts/ai-assisted-qa-catalog-empty-navigation.test.tsx`の2 Caseは今回追加であり、TSX構文/transpile診断0件のみ、Vitest・Prettier・実Web/Android・視覚・DB snapshotは未実施。既存component成功を新CaseのPASSに流用しない。CI全体はStyle Quality・contracts・required E2E・verify/validate失敗。
- **判定・再開条件・次**：台帳`analysis_status=review_required`と基本分析50/188・非default 14/20を維持。新Caseの同一HEAD直接Vitest、Web desktopの実操作・視覚・アクセシビリティ、パンくずを復帰導線とみなす正式判断、Native・Role/Seed・DB/Session実証が再開条件。次の独立対象は`SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`（在庫0/1/5/6の閾値と正式仕様差）。製品SUT・正式仕様・既存Seed/Reset・製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-STOREFRONT-HOME-A02-02（顧客用導線）

- **正式契約・台帳**：現行`supported-behaviors.json`の実在操作`SCREEN-STOREFRONT-HOME-A02-02`は`review_required`、Web/Android・default、期待は「有効な顧客に購入・アカウント導線を表示し、管理操作を案内しない」。正式`docs/spec/features/storefront.md:29-32`のRole別導線とBR/AC-STOREFRONT-001〜003を参照。台帳のテンプレートRiskは公開/Rank/価格を含むが、ホームCTAの成立と購入・認可・価格の成立を混同しない。
- **Web UI→認可（静的事実）**：`app/index.tsx`→`HomePage`→`HomeContent`は`currentUser.role === "customer"`でHeroの`マイページ`→`/account/profile`を提示し、`商品を見る`→`/products`も維持する。active customerには管理CTAを表示しない（前IDの学習用`ai-assisted-qa-home-guest-actions.test.tsx`がRole別Heroを直接Case化）。遷移先の`RouteGuard access="customer"`はactive customerのみ許可し、guestを`/login`、operator/adminとsuspended/withdrawn customerを`/forbidden`へ送る。`HomeContent`自体はaccountStatusを見ないため、停止/退会の既存Sessionが解決されるとアカウントCTAを提示しつつ遷移先で拒否する静的なUX差がある。情報漏洩・製品不具合は実Run/期待確認前に確定しない。
- **Session/閲覧データ**：`AuthUseCases.getCurrentUser`→`SessionIdentityResolver.getCurrentEntity`は既存Sessionに対応するUserを状態に関係なく返し、`toCurrentUserDto`はaccountStatusを保持する。一方、`CatalogUseCases.getHome`→`SessionIdentityResolver.getViewer`はactive customer+rankが揃う場合のみcustomer viewerとし、停止/退会・staffはguest viewerへ落とす。従ってCTAのRole分岐と商品閲覧条件は別であり、停止Sessionで会員限定商品が漏れると静的に断定しない。実DB/Session前後の不変性は未証明。
- **Android差**：`NativeHomeScreen`のHeroはRoleに依らず商品探索/検索の2導線で、顧客アカウントは`NativeShell`ヘッダーの`アカウント`→`/account/profile`、注文はbottom navの`/orders`から到達する。Shellはstaffを対象外にするがcustomerのaccountStatusを直接確認せず、`getCurrentUser`は停止/退会Userを返し得る。Webと導線位置が違うことだけで不適合とはしない。Android実機の認可・停止Session・視覚正本は未確認。
- **Seed/Case採否**：defaultのactive regular/gold/platinum、suspended/withdrawn customer、operator/adminとguest、gold-member/empty-catalogを対象とする。C1=Web active customerのHeroと管理CTA非表示（既存Case採用）。C2=顧客宛RouteGuardのactive/停止/退会/guest/staff境界（今回学習用直接Case採用）。C3=Native customerのヘッダー・注文navとstaff遮断（採用、実Android待ち）。C4=停止/退会SessionのCTA表示と遷移後の拒否、Rank限定商品非露出（採用、期待/実Run待ち）。C5=default/gold-member/empty-catalogのRole別公開商品・価格・購入可否（採用）。C6=desktop/Android視覚・アクセシビリティとSession/Cart/Order/Guest ID前後不変（採用）。
- **追加した学習用検証と判定**：`tests/contracts/ai-assisted-qa-home-customer-boundary.test.tsx`にRouteGuardのactive customer 1・停止/退会2・staff2・guest1の計6 Caseを追加。これはHomeのリンクからの実遷移やNative実認可を再現せず、SUTのRouteGuardを直接描画する契約テスト。TSX構文transpile診断0件（依存なしの静的検査）、Prettier/直接Vitest/実Chromium/Android・DB snapshotは未実施。既存のHeroモックCaseと合わせても実Run/製品適合/基本分析完了にはならず`review_required`維持。
- **再開条件・次**：新Caseの同一HEAD Vitest、Web desktopでのactive/停止/退会/guest/staff遷移とDB/Session前後、Android顧客・停止Session・管理Role遮断、default視覚/アクセシビリティ、Rank/価格の実証が必要。次の台帳掲載順で独立着手可能な`review_required`候補は`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。
- **CI横断**：調査HEAD `cdcc2cdc48bc`のWeb CI #41335786106はcompleted/failure（Style Quality、Vitest contracts 15件の旧`analyzed`期待、required Chromium E2E、verify/validate）。既存Home guest-actions学習Caseはcontract jobの成功群に含まれるが、CI全体のPASSではない。追加Caseの新HEAD CIは独立判定とする。

## 2026-11-02 共通逐次：SCREEN-STOREFRONT-HOME-A02-01（ゲスト用導線）

- **正本・台帳**：`supported-behaviors.json`の実在操作`SCREEN-STOREFRONT-HOME-A02-01`は`review_required`、Web/Android、default、`BR-STOREFRONT-001〜003`と`AC-STOREFRONT-001〜003`。正式`docs/spec/features/storefront.md:29-32`は既存Role規約に応じたゲスト/顧客の導線を要求する。台帳の期待はゲストにログイン・登録等の利用可能な導線を表示し、会員専用操作の完了画面を出さないこと。ログインと登録の両方をホームHeroに必須とは断定しない。
- **Web経路（静的事実）**：`app/index.tsx`→`HomePage`の`RouteGuard access="public"`→`HomeContent`（`src/presentation/pages/home-page.tsx:12-72`）。`currentUser === null`ならHeroは`商品を見る`→`/products`と`ログインして購入`→`/login`、active customerは`マイページ`→`/account/profile`、operator/adminは`管理画面へ`→`/admin`。HeroにCheckout完了への直接リンクはない。実際の購入可否は別のRouteGuard/Use Case判定であり、CTAの表示だけを認可PASSとみなさない。
- **Native経路と差**：`NativeShell`（`src/presentation/native/native-shell.tsx`）はguestにヘッダー`ログイン`→`/login`を提示し、`NativeHomeScreen`（`src/presentation/native/native-screens.tsx:31-117`）は`商品を探す`→`/products`、`検索する`→`/search`を提示する。Web Heroの購入ログインCTAとNative Shellのログイン導線は位置・文言が異なるが、現時点では正式契約違反と断定しない。Native operator/adminはShellで購入者向け画面より先に対象外となる。
- **閲覧データと認可境界**：`CatalogUseCases.getHome`→`SessionIdentityResolver.getViewer`→`DexieStorefrontCatalogQueryRepository.getHome`→`DexieProductQueryRepository.buildCandidates`。guest・staff・非active customerは`getViewer`上guest相当で、`canViewerSeeProduct`により非公開/ランク制限商品の候補を除外する設計。Web HeroのCTA選択はRoleだけを見て`accountStatus`を見ないため、既存Sessionのsuspended customerに`マイページ`を提示し得るが、遷移先の`RouteGuard access="customer"`は拒否する。実到達性・正式UX期待は未確認であり、漏洩・製品不具合とは確定しない。
- **Seed・Role/State/Data**：`default`はguest初期Session、active regular/gold/platinum customerとoperator/adminを持つ。`empty-catalog`は公開商品なし、`gold-member`はcustomer Sessionを作る。guestとcustomerのCTAを比較するときはSession状態とCatalog viewerを独立に確認し、ランク制限商品の非露出とCheckout権限を混同しない。
- **Risk/TR/Condition/Case採否**：C1=Web guestの`/products`と`/login`のリンク・会員専用完了導線非表示（採用）。C2=Web active customer/operator/adminのHero CTAとRole別RouteGuard（採用）。C3=Android guestのヘッダーログイン・探索/検索とNative Shellの非customer遮断（採用、実Android待ち）。C4=suspended/withdrawn customerのSession再取得・リンク遷移・保護情報非露出（採用、期待と実Run待ち）。C5=default/empty-catalog/gold-memberの公開商品・Rank制限・価格表示とDB不変（採用）。C6=desktop/Android視覚正本、キーボード/スクリーンリーダー、遷移前後のSession/Guest/Cart/Order snapshot（採用）。
- **直接検証と独立判定**：学習用`tests/contracts/ai-assisted-qa-home-guest-actions.test.tsx`にC1/C2のWeb Hero 4 Role表示を検査するVitest Caseを追加。既存`tests/repository-contract/storefront-catalog.test.ts`にはguestでランク制限商品を除外する契約がある。追加CaseはローカルTypeScript TSX構文/transpile診断0件だが、依存付きVitest・Prettier・実Chromium/Android・DB snapshotは未実施。RouteGuardは新Caseでモックされており、実認可・Web/Native実Run・製品適合・教材受入PASSにはしない。基本分析は`review_required`維持。
- **再開・次**：新Caseの同一HEAD Vitest、Role/Session別の実Web、Native guest/customer実Run、停止/退会Session、ランク制限商品の非露出、視覚・アクセシビリティ・DB前後の証拠が揃えば本IDを再判定する。次の実在IDは`SCREEN-STOREFRONT-HOME-A02-02`（顧客用導線、`review_required`）。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。
- **CI横断**：調査時HEAD `d7f436286d51`のWeb CI #41334980000はcompleted/failure（Style Quality、Vitest contracts、required Chromium E2E、verify、validate）。新Caseを含む変更後HEADのCIは別判定。Mobile CIのPRトリガーは復元しない。
## 2026-11-02 共通逐次：SCREEN-STOREFRONT-HOME-A01-05（会員ランク特典案内）

- **台帳と正式契約**：現HEADの`supported-behaviors.json`に実在する`SCREEN-STOREFRONT-HOME-A01-05`は`review_required`、Web/Android、default、RoleはWeb guest/customer/operator/admin・Android guest/customer。正式`docs/spec/features/storefront.md:21-32`はホームの会員ランク案内と購入価格の特典整合を要求し、default視覚正本をWeb desktop/Android双方に置く。価格の直接根拠は`BR-STOREFRONT-003`。
- **Web表示と価格経路（静的事実）**：`app/index.tsx`から`HomePage`→`HomeContent`→`CatalogUseCases.getHome`→`DexieStorefrontCatalogQueryRepository.getHome`。Webの`home-page.tsx:165-183`は商品数が0でも会員特典panelを描画し、一般会員は5,000円以上で送料無料、goldは5%割引、platinumは10%割引・常時送料無料と案内する。文言は`FREE_SHIPPING_THRESHOLD`と`membershipDiscountRate`から生成され、画面内でviewerの現在ランクを表示・強調するわけではない。価格/送料の計算本体は`src/domain/services/pricing.ts`の`calculateOrderTotals`で、割引はSKU単価ごとに切り捨て、送料無料判定は割引前小計5,000円以上、platinumは常時0円。案内と計算は同じ定数/関数を参照するが、画面表示と実Checkoutの一致は実Run未確認。
- **Android差（未確定の製品適合候補）**：`NativeHomeScreen`（`src/presentation/native/native-screens.tsx:31-117`）は`catalog.getHome`の結果でHero、カテゴリー、新着、セールを表示するが、会員ランク案内の表示処理がない。Nativeの`getHome`はSQLiteのviewer-aware候補を返すものの、案内文を提供するDTO項目はない。正式仕様のWeb/Android共通ホーム契約との差は静的に成立するが、Android視覚正本・実機・受入優先順位を照合するまでは不具合確定としない。SUTは変更しない。
- **Seed・Role/State/Data**：default Seedはregular/gold/platinumのactive customerを持つ（`src/seeds/default-dataset.ts:730-753`）。guest・管理Roleは購入ランクの適用対象ではない。案内は全Roleへ共通表示されるため、現在のviewerの割引が自動適用されたと誤読させないことを検証する。empty-catalogでもWeb案内は表示される。購入価格はviewer/商品/期間と独立に再確認する。
- **Risk/TR/Condition/Case採否**：C1=Webの5,000円・5%・10%・送料無料文言とPricing定数の一致（採用）。C2=4,999/5,000円の送料境界、gold/platinumの単価割引切捨て、数量を含む金額計算（採用）。C3=Android会員案内の有無と正式default視覚正本（採用、実機期待待ち）。C4=guest/regular/gold/platinum/管理Roleの案内と実価格・権限の分離（採用）。C5=empty-catalogとgold-member Seedでの表示・導線（採用）。C6=閲覧のみでCart/Order/Sessionを変更しないこと、実Checkout金額との一致（採用、実Web/Android前後snapshot待ち）。
- **直接検証と判定**：学習用`tests/contracts/ai-assisted-qa-home-membership-benefits.test.tsx`にWebの会員案内文とPricing 4,999/5,000円・各rankの直接Caseを追加。既存`tests/unit/pricing.test.ts`の単価切捨て/送料を再利用し、重複する製品テストは変更しない。追加Caseの依存付きVitest・Prettier、実Web/Android・実Checkout・視覚正本・DB/Session前後は未実施。静的監査とテスト追加だけで`analyzed`/製品適合/実Run PASSへ昇格しない。`review_required`維持。新Case同一HEAD実行、Android実画面と視覚正本、Role別/金額/不変の実証が再開条件。次の共通対象は台帳で実在を確認した`SCREEN-STOREFRONT-HOME-A02-01`。
- **CI横断**：監査HEAD `b0a932913235`のWeb CI #41333717183はcompleted/failure（Style QualityのFormat check、Vitest contracts、required Chromium E2E、verify、validate）。Unit/Component/Integration等の成功は本CaseのPASSを意味しない。変更後HEADの最終CIは別判定。Mobile CIのPRトリガーは復元しない。

## 2026-11-02 共通逐次：UC-CATALOG-LIST-REVIEWS（公開レビュー一覧・Platform境界）

- **正本・状態**：`supported-behaviors.json`の実在Use Case ID `UC-CATALOG-LIST-REVIEWS`は`review_required`、Web/Android、Role guest/customer/operator/admin、`BR-REVIEW-002`。正式`docs/spec/features/reviews.md:9-15`はpublishedだけを商品表示・集計対象とする。`docs/spec/features/storefront.md:100-125`はWeb/Androidの商品詳細にレビュー**サマリー**を要求するが、レビュー**本文一覧**のAndroid必須性は明示しない。台帳のWeb/Android一括期待を未確定のまま製品不具合にしない。
- **Web実装経路**：`app/products/[productId].tsx`→`ProductDetailView`（`product-detail-page.tsx:72-89,309-363`）→`CatalogUseCases.listReviews`（`catalog-use-cases.ts:134-146`）→`DexieReviewRepository.listPublished`（`order-review-repositories.ts:330-350,418-427`）。pageは1以上の整数、pageSizeは20のみ。DBではproductId一致かつstatus=publishedだけを抽出し、newest/rating_desc/rating_ascで並べ、同点はID昇順。Web UIは最初の20件を描画するが次ページ操作を提供しない。非同期取得は`.then`のみで拒否時のエラー表示・再試行はない（実Web障害の有無は未実証）。
- **Native境界**：`native-runtime.ts:25-34,196-205`の`NativeCatalogService`は`listReviews`を公開しない。`native-screens.tsx:763-775`は`reviewSummary`件数・平均・分布のみ表示する。共通`CatalogUseCases.listReviews`の`customerGateway`経路は空items/total=0を返すが、現在のNative商品詳細UIはそのメソッドを呼ばない。Nativeサマリーを「0件表示」と誤判定しない。将来の一覧要求を勝手に追加しない。
- **Seedと採用Case**：default Seedの`product-mug`にはpublished 3件（評価5/4/2）、hidden 1件・deleted 1件があり、後者2件は一覧/集計から除外する。C1=Web guest/customerのmug publishedのみ・件数/平均と整合（採用）。C2=newest/rating昇降順・同点ID順・page=2の空items/total維持（採用）。C3=page 0/小数/NaN・pageSize不正のVALIDATIONとDB不変（採用）。C4=Role/非公開・ランク制限商品のレビュー問い合わせと情報非露出（High候補、正式期待・実Run待ち）。C5=NativeのサマリーとWeb本文一覧の仕様境界・Android実表示（採用、期待の確定待ち）。C6=Webの取得失敗・画面切替時の古い結果・アクセシビリティと20件超のUI（採用、負例実Run待ち）。
- **直接検証と限界**：学習用`tests/contracts/ai-assisted-qa-catalog-review-contract.test.ts`にC1〜C3のうちdefault Seed、3 sort、2ページ目、無効page拒否とDB/サマリー不変のVitestを追加。ローカルTypeScript transpileの構文診断は0件。ただし依存付きVitest/formatter/実Chromium/Androidは未実行であり、テスト追加自体をPASSにしない。製品SUT・正式仕様・既存製品テスト/workflowは変更しない。
- **再開・次**：同一HEADの新Vitest実行、Web商品詳細で公開/非公開/削除とRole別アクセス・エラー/再試行・20件超の実観測、Native一覧必須性の正式判断と実Androidサマリー、DB前後snapshotが揃った時に本IDを再判定する。それまでは`review_required`を維持し、次の未処理`SCREEN-STOREFRONT-HOME-A01-05`へ逐次移る。CIは最終受入として独立判定する。

## 2026-11-02 共通逐次：SCREEN-BOUNDARY-NOT-FOUND-A02-01（アプリ境界として未検出を表示）

- **対象・正式仕様**：台帳`supported-behaviors.json`の操作ID`SCREEN-BOUNDARY-NOT-FOUND-A02-01`は`review_required`、`action`、Web/Android、Role `All`、default。正式`docs/spec/ui-ux-contract.md`の「フレームワーク内部のエントリではなく、ユーザーが直接観測できる境界サーフェス」は未知ルートの専用UIを要求し、`docs/spec/screen-catalog.md`は`+not-found`をWeb/AndroidのBoundaryとして掲載する。A01-01（見出し・本文）とA01-02（ホーム復帰）に対し、本操作は**ルーティング境界での分類・直接到達・再読込**を検証する。
- **Web経路**：`app/+not-found.tsx`→`StatePanel kind="not-found"`→`section.state-panel--not-found`、見出し「ページが見つかりません」、本文、`Link href="/"`。既知`app/forbidden.tsx`は別の`kind="forbidden"`を用いる。Web rootは`AppRuntimeProvider`→`AppFrame`→`Slot`で、未知URLでもアプリの初期化経路を通る。`scripts/serve-web-dist.ts`は**拡張子なしの未知パス**を`index.html`へSPA fallbackし、拡張子付き未検出ファイルはプレーン404にする。静的アセット404を画面ルートの不具合と混同しない。実デプロイ先の同等設定は未確認。
- **Native経路・Role差**：`app/+not-found.native.tsx`→`NativeUnsupportedScreen title="ページが見つかりません"`→`NativeStatePanel`。ただし本文はNative Customer対象外の説明を流用する。`NativeRootLayout`→`NativeShell`→`Slot`で、operator/adminは子ルート表示より先にRole対象外パネルを受ける。正式`All`期待とShellの対象Role境界の優先順位は実Android deep linkと期待仕様の照合待ち。画面本文の差を確定不具合と断定しない。
- **Role/State/DataとCase採否**：C1=Web guest/customer/operator/adminで拡張子なしの未知深いURLへ直接到達しnot-found専用UIを表示、既知forbiddenと区別（採用）。C2=同じ未知URLのブラウザ再読込とローカルSPA fallback、実デプロイ差を照合（採用）。C3=Native guest/customerの未知deep link、operator/adminのShell先行遮断、未検出本文とホーム復帰（採用、Role仕様解釈は保留）。C4=未知URLから内部stack・actor ID等の非露出、キーボード・スクリーンリーダー・視覚正本・フォーカス（採用）。C5=初期化とルート固有の更新を区別し、Session/Guest/DBの前後snapshotを確認（採用）。C6=拡張子付き静的アセット404と拡張子なし画面ルートの境界を分離（採用、全てのファイル404にアプリ画面を要求しない）。
- **直接Case・独立判定**：既存学習用`e2e/web/ai-assisted-qa-course.spec.ts`のA01-02向けCaseは未知単一路→ホームとGuest/Session pointerを確認する。今回同ファイルへ、**未知の深いURLの直アクセス→not-found専用UI→再読込→既知forbiddenとの区別**を検査する別Caseを追加。仕様・Route・Shell・serverの静的経路は照合したが、新Caseのformatter/Chromium実行、Android実Run、全Role、公開環境、DB/Session snapshot、視覚・アクセシビリティは未実施。テスト追加はPASSではない。基本分析`review_required`、製品適合・Web/Native実Run・CI最終受入はいずれも未完了。
- **再開条件・次**：同一HEADの新E2E実Run、Web Role/デプロイ別、Android deep linkとShell境界、実際の状態前後・視覚/フォーカスの証拠が揃えばA02-01を再開する。台帳の後続`review_required`候補`UC-CATALOG-LIST-REVIEWS`を次の共通逐次対象とする。製品SUT・正式仕様・既存Seed/Reset・製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-BOUNDARY-NOT-FOUND-A01-02（安全なホームへの復帰）

- **正本・台帳**：実在操作`SCREEN-BOUNDARY-NOT-FOUND-A01-02`は`action`、`web,android`、Role `All`、default、`UI-ERROR/UI-A11Y`、`analysis_status=review_required`。正式`docs/spec/ui-ux-contract.md:25-38`は存在しないルートの明示とストアフロントへの復帰アクションを要求し、`docs/spec/screen-catalog.md:45-50`はWeb/Android両対象。A01-01（未検出表示）とA01-02（実際の復帰操作）を別Caseとする。
- **Web経路・データ**：`app/+not-found.tsx:1-5`→`StatePanel kind="not-found"`→`src/presentation/components/states.tsx:53-63`の`Link href="/"`「ホームへ戻る」→`app/index.tsx`→`HomePage`の`RouteGuard access="public"`→`catalog.getHome()`。未検出自体にUse Case/Repository書込みはないが、`AppRuntimeProvider`の初期化とホームの読取りがあるため、全DB不変を静的に保証しない。ローカル静的サーバー`scripts/serve-web-dist.ts`は拡張子なし未知パスを`index.html`へSPA fallbackする設計。実デプロイ先でも同じ挙動かは未確認。
- **Android経路・Role境界**：`app/+not-found.native.tsx`→`NativeUnsupportedScreen`（`src/presentation/native/native-screens.tsx:995-1006`）→`NativeButton`「ホームへ戻る」→`router.replace("/")`→`app/index.native.tsx`の`NativeHomeScreen`。ボタンは`native-components.tsx:83-106`で`accessibilityRole="button"`を指定。一方`NativeShell`（`native-shell.tsx:59-64,139-158`）は非customerのoperator/adminで子Routeより先にRole対象外を表示し、ホームへの遷移後も同じ制限を受ける。正式`All`の復帰期待とNativeのRoleサポート境界の優先関係は未実証。Nativeの未検出本文が「対象外」説明を流用する点は前対象A01-01の未確定差として維持する。
- **Risk/TR/Condition/Case採否**：C1=Web guestで未知URL→見出し・ホームリンク→クリック後`/`とホーム見出し（採用）。C2=Web customer/operator/adminおよび停止Sessionでホーム復帰と保護データ非露出（採用）。C3=Android guest/customerで未知deep link→ボタン→`/`、履歴置換、ホーム表示（採用）。C4=Android operator/adminのShell先行遮断と`All`期待、ログアウト後の安全な復帰（保留付き採用）。C5=320/390/desktop、キーボード/スクリーンリーダー、遷移後見出しフォーカス、視覚正本（採用）。C6=WebのGuest/Session pointer、AndroidのSession/SQLite等の前後snapshotで初期化副作用とRoute固有変更を分離（採用）。本操作は決済・商品更新のUse Caseを呼ばず、危険なDB操作の実行を試験条件に含めない。
- **追加した直接Case・検証限界**：学習用`e2e/web/ai-assisted-qa-course.spec.ts`へC1とWeb Guest/Session pointerのC6を観測するPlaywright 1件を追加。既存`playwright.config.ts`の`chromium`と`package.json`の`test:e2e:chromium`はこの既存specを対象とする。直接実行・formatter・全CI・実Web/Native・全Role・DB/SQLite snapshot・視覚/フォーカスは未実施。追加テストは未実行でありPASSではない。前HEADのWeb CI #41329325006はfailure（Style Quality、contracts、required Chromium E2E、verify、validate）。現HEADの結果は独立判定とする。
- **状態・再開・次**：静的経路の照合と実行可能なWeb回帰Case追加まで。A01-02は`review_required`を維持し、`analyzed`/製品適合/Web・Android実Run PASS/教材受入へ昇格しない。直接E2Eの同一HEAD実Run、Role別Web、Android deep link/Role、Session/DB前後と視覚・フォーカスを再開条件とする。次は`SCREEN-BOUNDARY-NOT-FOUND-A02-01`（未検出をアプリ境界として扱う）。製品SUT・正式仕様・Seed/Reset・既存製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-BOUNDARY-NOT-FOUND-A01-01（未検出画面の表示）

- **正本・台帳**：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`の実在操作`SCREEN-BOUNDARY-NOT-FOUND-A01-01`（`action`、`web,android`、Role `All`、default、`UI-ERROR/UI-A11Y`）は`review_required`。正式`docs/spec/ui-ux-contract.md:25-38`は存在しないルートの明示とストアフロントへの戻り、Web desktop/Androidの視覚正本を要求。`docs/spec/screen-catalog.md:45-50`は両プラットフォーム対象とする。Use Case呼出しを要する操作ではなく、Route→境界UI→ホーム導線の確認を主とする。
- **Web直接経路**：`app/+not-found.tsx:1-5`→`src/presentation/components/states.tsx`の`StatePanel kind="not-found"`→辞書`notFoundTitle=ページが見つかりません`、説明「URLが正しいか確認するか、ホームへ戻ってください。」、`Link href="/"`。loading/empty/conflict/forbiddenとは異なる`kind`で、デフォルトの戻り先はストアフロント。Web rootは`AppRuntimeProvider`と`AppFrame`を経由するため、ルート単体に更新処理がなくても初期化時のDB処理まで「全DB不変」と推定しない。
- **Android直接経路・差分候補**：`app/+not-found.native.tsx:1-5`→`NativeUnsupportedScreen title="ページが見つかりません"`→`NativeStatePanel`、`NativeButton`の`router.replace("/")`。戻り導線はあるが、共通本文が「この画面はNative Customerの対象外です。Web版または権限のあるCustomer画面を利用してください。」であり、未知URLを「サポート対象外」と誤解させる可能性がある。正式な未検出メッセージ・Android視覚正本との一致は未実証で、製品不具合と断定しない。`NativeShell`はoperator/adminの画面を先に遮断し得るため、仕様の`All`とNativeのサポートRole境界を別条件で観測する。
- **Role/State/Data・リスク**：default Seedで未知ルートを直指定し、guest/customerとactive operator/admin（Web）、Androidのguest/customer/非customerを区別する。未知URLの表示・戻りはデータ変更操作ではないが、Web/Native rootの初期化とSession取得は別処理である。内部エラー/ID/stack/未許可データ露出、誤った未検出とforbiddenの混同、ホーム導線不全、アクセシビリティ/フォーカスをリスクにする。既存`tests/component/route-guard.test.tsx`と学習用`e2e/web/ai-assisted-qa-course.spec.ts`、`e2e/web/mobile-boundary.spec.ts`には本操作の直接の未知ルートassertを確認できず、別操作のCI成功を本件PASSに流用しない。
- **Risk/TR/Condition/Case採否**：C1=Web desktopの存在しないURLでnot-found見出し・説明・ホームリンク・復帰後のURLを確認（採用）。C2=guest/customer/operator/adminで未検出とforbidden/ログイン拒否を混同せず、内部情報非露出を確認（採用）。C3=Androidの未知deep linkで見出し・本文・ホーム復帰と視覚正本を照合（採用、本文差分候補を重点確認）。C4=Androidの非customer RoleでShell先行遮断と`All`契約の期待を確認（保留付き採用）。C5=キーボード/スクリーンリーダー・遷移後見出しフォーカスと320/390/desktop表示（採用）。C6=ルート操作前後のSession/DBを観測し、初期化副作用とルート固有の更新を分離（採用）。
- **独立判定・再開条件**：仕様/Route/UI/Shell/Seed適用範囲の静的照合のみ。直接Vitest/Playwright、Android実Run、視覚正本、全Role、DB/Session snapshot、フォーカスは未実施。Android本文とRoleの差は未確定の製品適合候補で、学習教材側で期待値を固定しない。基本分析`analyzed`、製品適合、Web/Native実Run PASS、CI最終PASSのいずれにも昇格させず`review_required`維持。次は台帳掲載順の`SCREEN-BOUNDARY-NOT-FOUND-A01-02`（安全な画面に戻る）。製品SUT・正式仕様・既存テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-TEST-CONTROL-A02-01（本番非公開・認可境界）

- **対象・仕様・台帳**：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`の実在操作`SCREEN-TEST-CONTROL-A02-01`は`analysis_status=review_required`。正式`docs/spec/state-and-scenarios.md`はTest ControlをAutomation Web専用・視覚正本対象外とし、`docs/spec/screen-catalog.md`もWeb Automation/Admin・Android非対象とする。今回の静的照合は基本分析成立、製品適合、実Web/Native、教材受入のPASSではない。
- **UI・Role・Buildの直接経路**：`app/admin/test-control.tsx:1-3`→`AdminTestControlPage`→`Guard access="automation-admin"`（`review-user-pages.tsx:844-849`）→`RouteGuard`（`route-guard.tsx:25-55`）。未ログインは`/login`、activeでないadmin・customer・operatorは`/forbidden`、active adminでも`isTestApiBuild()`がfalseなら`/forbidden`。AdminShellのナビリンク（`admin-shell.tsx:27-32`）とGuideの導線（`guide-page.tsx:105-107`）もRole/buildで分岐する。ただしリンク非表示だけでは直URL拒否の証拠にならない。
- **Test APIと公開境界の相違**：`test-api.web.ts:23-51`の`isTestApiBuild`は`automation/local`だけtrueで、`installTestApi`はそのbuildと`window`の存在のみを確認し`window.__TEST_API__`へreset/clock/paymentDelay/inspectionを登録する。画面RouteGuardや現在のUser Roleを経由しない。これはテスト専用APIのbuild境界であり、UIのadmin認可をAPIの権限保証として扱わない。`browser-runtime.web.ts:61-67`は初期化後に`installTestApi`を呼ぶ。`EXPO_PUBLIC_BUILD_KIND`未指定時は`test-api.web.ts:24`と`app.config.ts:14`の双方で`local`へfallbackするため、配布buildで明示設定・成果物確認が必要。
- **Cloudflareの環境名を区別**：`docs/09_deployment/cloudflare_pages.md:7-19,36-45`では`main`がデプロイ元でも`EXPO_PUBLIC_BUILD_KIND=automation`のQA学習環境として運用する。従って公開URL上の`window.__TEST_API__`存在を即座に「production build漏洩」とは判定しない。一方、一般公開用production成果物では非露出が必要。IndexedDBはorigin別のブラウザ内データで、サーバー共有DBや認証Secretの漏洩を今回の静的証拠から推定しない。
- **既存検証と今回の直接静的チェック**：`tests/component/route-guard.test.tsx:56-77`はproduction拒否とlocal/automationでのadmin許可を検査。`tests/contracts/test-api.test.ts:4-21`はbuild allowlistとproductionのAPI非登録を検査。`tests/integration/seeds.test.ts:184-190`にもproduction非登録Caseがある。今回、仕様・UI・RouteGuard・Test API・AdminShell・Guide・config・Cloudflare設定・既存テストを同じHEADで取得し、build/Role/導線/API/未設定fallback/配布設定の10個の**ソース文字列・分岐照合**が10/10一致した。これはテストランナーによる実行ではない。同HEADのWeb CI #41327183312ではbuild-production・production-smoke・componentがsuccess、contracts・Style Quality・required Chromium E2E・verify・validateはfailure。production-smokeの個別assert詳細を本対象の全Case PASSへ拡張しない。
- **Risk/TR/Condition/Case採否**：C1=automation/localのactive adminで画面・ナビ・Guide導線を確認（採用）。C2=guest/customer/operator/停止adminの直URL拒否・画面情報非露出と拒否前後のDB/Session不変（High、採用）。C3=production成果物のactive admin直URL拒否、導線非表示、`window.__TEST_API__`非露出を実browserで確認（High、採用）。C4=automation/localの`window.__TEST_API__`がUI Guardを経由しないことを隔離ブラウザで検証し、Reset等の副作用・origin別データ境界を確認（High候補、採用）。C5=build環境変数未指定/誤設定時の`local`fallbackと実配布設定・生成成果物の整合（High候補、採用）。C6=Cloudflare QA用automation URLと一般公開production成果物を混同せず、URL/HEAD/build SHA/metadata/Browser storageを対応付ける（採用）。Native Test Control画面は本操作の対象外。
- **未実施・判定・次**：直接Vitestの対象Case再実行、Role別Web直URL、production/automationビルドのブラウザでのAPI非露出・露出、DB/Session snapshot、Cloudflare実デプロイ設定と実URLの確認は未実施。特にC4/C5は公開攻撃経路やデータ破壊が再現したわけではない。既存の`review_required`を維持し、証拠取得後に再開する。次の未処理候補は台帳掲載順の`SCREEN-BOUNDARY-NOT-FOUND-A01-01`。製品SUT・正式仕様・Seed/Reset・製品テスト/workflowは変更しない。

## 2026-11-02 共通逐次：SCREEN-TEST-CONTROL-A01-04（シードリセット）

- **対象と正式仕様**：台帳 `supported-behaviors.json` の操作IDは実在し `analysis_status=review_required`。正式 `docs/spec/state-and-scenarios.md` の「シナリオ制御」はDB、Session、Guest ID、Clock、決済遅延の初期化を要求し、画面の完了通知と安全な画面遷移はUIのみが担う。Test ControlはAutomation Web専用でNative/productionの実画面受入対象外。
- **UI→Service→Seed**：`review-user-pages.tsx:844-990` は `Guard access="automation-admin"`、固定30シナリオ選択、破壊的操作の確認、二重送信抑止、成功時のNotice保存・`safeResetPath`への再読込を持つ。失敗時は遷移しない。Service `src/test-controls/test-control-service.ts:67-98` は `isPhaseOneScenario` の入力検証後、Dexie DBを閉じ削除し、Session/Guest IDをclear、新DBへ対象Seedをload、初期identity/clockを復元する。削除失敗は `RESET_BLOCKED_BY_OPEN_PAGE`。API `src/test-controls/test-api.web.ts` は同じServiceを呼ぶがUIの再読込を行わずmetadataを返す。Seedの `app_settings["test-control"]` はClock `BASE_CLOCK`、遅延500msへ戻る。
- **Risk/TR/Condition/Case**：R1=無効scenarioの事前拒否とDB/Session/Guest/Clock不変（採用）。R2=別タブによるDB削除拒否時の再接続・全テーブル/identity不変（採用）。R3=default→gold-member成功時の全テーブル再初期化・Clock/遅延/Session/Guest復元（採用）。R4=Web確認/二重送信・成功時Noticeと安全遷移・失敗時非遷移（採用）。R5=guest/customer/operator/停止admin/productionでの画面・Test APIの隔離（High候補、採用）。R6=DB削除成功後のSession clear・Seed投入失敗時の部分破壊と回復手順（High候補、追加検証採用、実障害未確定）。R7=別タブ/同時Reset競合（採用）。Native画面は非対象。
- **追加した学習用直接Case**：`tests/contracts/ai-assisted-qa-test-control-reset.test.mjs` に、(1) 不正scenarioと削除失敗の拒否・全Dexie table/Session/Guest/Clock不変、(2) 成功時のgold-member SeedとClock/遅延/identity復元を追加。既存 `tests/integration/seeds.test.ts` は成功Resetと削除失敗コードを検査するが、今回の全テーブル不変や変更済み値からの復元は直接の学習用検査として補完する。
- **独立判定**：正式仕様/実装/Seed/既存テストの静的照合は実施。追加Caseのformatter/直接Vitest、実Web desktop/tablet、複数タブ、DB削除成功後の部分失敗、UI Notice/遷移、build公開隔離は未実施。静的監査やテスト追加を `analyzed` /製品適合/実Web PASSへ昇格させない。`review_required`を維持。再開条件は直接Caseの同一HEAD実Run、Web実Run+前後snapshot、R5/R6/R7の期待値と安全性証拠。次の共通対象は `SCREEN-TEST-CONTROL-A02-01`。

## 2026-11-02 共通逐次：SCREEN-TEST-CONTROL-A01-03（決済遅延設定）

- **正式仕様と境界**：`docs/spec/state-and-scenarios.md:39-46`はAutomation WebのTest Controlで決済遅延を設定する操作を規定し、視覚正本対象外とする。Web `review-user-pages.tsx:852-868,1027-1046`のnumber入力は0〜30000ms、初期stateは固定500で、表示中の`metadata.paymentDelayMs`をフォームに反映しない。保存済み値が1200でも再表示したフォームは500となる可能性がある（静的UI差、実Web未確認）。`Guard access="automation-admin"`はactive admin+automation/local buildに限定するが、`window.__TEST_API__.setPaymentDelay`は画面Guardを経由しない。公開テストbuildの隔離が前提であり、直ちに外部脆弱性と断定しない。
- **呼出し元・先と状態**：`TestControlService.setPaymentDelay`（`src/test-controls/test-control-service.ts:112-120`）は整数0〜30000ms以外を`VALIDATION`で拒否し、許可値のみDexie `app_settings["test-control"]`へ書込み、`getMetadata`に返す。default Seedは`DEFAULT_PAYMENT_DELAY_MS=500`（`src/seeds/metadata.ts:13`、`default-dataset.ts:815-820`）。この操作自体はReset/Session削除/Cart・Order更新を呼ばない。`browser-runtime.web.ts:31-33`は`getMetadata().paymentDelayMs`を非同期providerとして`MockPaymentGateway`へ渡し、`charge`（`src/infrastructure/payment/mock-payment-gateway.ts:14-39`）は新規冪等キーの決済要求時にprovider値を読んで遅延する。**完了済み同一キーはキャッシュ結果を即返すため、設定値の遅延が再現されないのは設計上の分岐**。同Gatewayの`setDelay`は10000ms上限だがWebの動的provider経路では呼ばれない。上限差だけで欠陥認定しない。
- **既存証拠と限界**：`tests/component/review-user-pages.test.tsx:509-516`は1200msのUI→mock Service呼出しを確認。`tests/integration/seeds.test.ts:144-146,211-221`は1200ms metadataとNaN/-1/30001拒否を確認するが、実Gatewayの遅延時間・境界0/30000・永続再読込・拒否時の全DB不変は直接検査しない。確認HEAD `444ab0565c663cfa5810a7e0d977e553686f5e82`の[Web CI #41323891727](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41323891727)はcompleted/failure。unit/integration/component/buildはsuccess、contracts/Style Quality/required Chromium E2E/verify/validateはfailure。対象直接実Web・全CI PASSには流用しない。
- **Risk/TR/Condition/Case採否**：C1=active admin+automation/localで0/500/1200/30000の保存値・再読込metadataとフォーム初期値を比較（採用）。C2=NaN/小数/-1/30001等の拒否・エラー表示・`app_settings`/Session/Cart/Order不変（採用）。C3=guest/customer/operator/停止adminとproductionのUI非露出、Test APIのbuild隔離を確認（High候補、採用）。C4=新規決済attemptに設定遅延が適用され、決済成功/失敗結果・Order/Checkout状態が遅延設定のみで変化しないことをfake timerと独立実Webで検査（採用）。C5=同一冪等キーの完了キャッシュと未完了の並列要求を区別し、二重課金・二重書込みがないことを直接検証（High候補、採用）。Nativeは当該Test Control画面の対象外。
- **判定・再開条件**：静的経路と既存テスト内容のみ照合。個別Vitest再実行・formatter・実Web・Gateway時間測定・DB前後snapshot・build公開隔離は未実施。C5の並列決済は未再現のリスク候補であり、実障害と断定しない。`review_required`を維持し、`analyzed`/製品適合/実Run PASSに変更しない。次の共通候補は`SCREEN-TEST-CONTROL-A01-04`（シナリオReset、台帳実在を次回再確認）。SUT・正式仕様・既存Seed/Reset・製品テスト/workflowは変更しない。

## 2026-11-01 承認事項の更新（定期タスクとスケジュール外の分担）

Q01〜Q17と訂正後のQ08は[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)を正本として扱う。既存4枠のQ-ID・分析・教材・実証の割当てを変えない。スケジュール外の判断は次のとおり。

- **Template・Q-34 / B1〜B3**：配布元準備は本PRで完了。本人がPRマージ後にPublic Templateを作成・コピーする。本人のPrivate 2コア実受入はPRの他の作業完了後。両者をマージ前ゲートに含めず、公開先・本人著作権・実施順序を再質問しない。外部ライブラリの通知、Secret除外、配布生成・検証は継続。
- **AI評価・Q-14**：公開素材と受講者の演習回答・コード・必要なRun要約を正式AI評価で外部無料モデルに送信してよい。Token/Secret/個人情報・無関係な資料は禁止。モデル校正・実Run・誤PASS拒否が未達の限り正式修了を認定しない。
- **製品19ファイル**：`product/scenario-shop-maintenance`への分離を完了。PR #199からは製品実装・仕様・テスト差分を除去済み。今後の製品修正は専用ブランチで扱う。High相当の問題が実証されたら根拠と影響を報告してマージ判断を停止するが、既存19ファイルの分離判断を再開しない。
- **未決仕様・マージ**：RankフィルターとCheckout郵便番号/電話番号の許容文字は2026-11-01本人回答で期待仕様を確定（[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)）。実Web/Native、回帰、製品改修は未受入。その他の意味変更はユーザー承認。Web/Nativeは画面・入力・エラー文言も基本同等とし、例外は調査。処理中の二重決済は禁止、同一キーの冪等応答は許容。マージは全条件達成・独立レビュー・ユーザー明示指示後のみ。

既存の進捗数値・キューの未完欄は最新台帳・実Runを確認するまで変更しない。この追記は定期作業の完了判定ではない。

このファイルを**残タスク・作業優先順位・引継ぎ状態の正本**とする。目的・変更許可・完了基準は[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)に従う。分析の個別根拠は[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)と[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)、製品問題と既存差分の根拠は[製品改善レポート](../reports/pr199-product-improvements.md)に記録する。PR本文は要約に限り、このファイルと同じ残タスク一覧を重複して保守しない。

## 作業判断の原則

- **目的を優先**：PR #199の教材・評価・学習環境と全サポート動作の分析・技術受入のために必要な作業だけを行う。タスクリストの記述を無条件に正しいものとせず、正式仕様、実装、既存テスト、CIと照合する。矛盾は根拠と影響を記録する。
- **証拠を優先**：仕様・コード・固定Seed・実行結果に基づく事実、推論、未確認事項を区別する。静的分析、契約テスト、実Web/Native Run、製品仕様適合と教材受入を別々に判定し、未実行・証拠不足はPASSにしない。
- **原因から調べる**：CI失敗や仕様差は実ログ、呼出し元・先、共通処理、既存ガードとテストを確認する。根拠のない不具合認定や表面的な修正を避け、必要な影響範囲を検証する。
- **既存の仕組みを活用**：既存コード・Skill・validator・fixture・テストの再利用を先に検討する。現在の要求から必要性を説明できない抽象化・依存・改修を増やさない。一方、必要な例外処理・安全性・検証は省略しない。
- **実質的な完了を重視**：IDや文書を埋めるだけで完了にしない。各受入条件に対応する根拠を残し、未決は不足証拠・次の対応・再開条件を明示する。製品の問題を発見しても製品本体の修正権限にはならず、末尾の変更境界を守る。

## 過去の担当枠別キュー（履歴・現行選択には使用しない）

毎時0・15・30・45分は**別々の作業担当枠**とし、同じ操作IDを同時に分析しない。共通の手順は次のとおり。

1. PR #199の現HEAD、最新CI/レビュー、分析台帳、本ファイルを取得する。古いSHA・件数・CI結果を流用しない。
2. 自分の実行時刻の「直近の作業キュー」で**未完了かつ着手可能な最上位1件**を選ぶ。P0のCI失敗は0分枠が担当する。他の枠はそのCI原因を重複修正せず、独立した作業を選ぶ。担当外の作業は原則編集しない。
3. 記載した対象・根拠・完了条件に従って、関連ファイル、正式仕様、Seed/Use Case/Repository/UI、既存テストを確認する。分析成立時のみ台帳を `analyzed` に変更する。製品適合、実Web/Native Run、学習受入は別の検証とする。
4. 書込み前に現HEADと変更対象ファイルの最新内容を取得し直す。同一ファイルを他の実行が更新中なら先に書込みしない。コミット/更新のSHA不一致・競合を検知したら旧内容を上書きせず差分を再確認する。**GitHubファイルのSHA確認は作業開始の排他ロックではない**。複数ファイル変更は旧HEADへの上書きを避けて通常pushし、途中で競合したら状態を整合させてから再開する。force push禁止。
5. 関連のformatter・lint・テストと実CIを確認する。CIが走っている場合は、重複の軽微なコミットでキャンセルを繰り返さない。1件の作業成果と検証をまとめる。成果・障害・未解決点・次のIDは該当行と既存レポートに記録し、**実質的な状態変化があるときだけ**PR本文を現時点の要約へ更新する。無変更の回は無意味な同期コミットを作らず報告する。

**各行の状態**：`未着手`→`進行中`→`完了`、または`BLOCKED`（理由と再開条件必須）。`レビュー待ち`は証拠・正式仕様の未決として保持する。表は作業管理用であり、分析台帳の `analysis_status` と同じ意味ではない。今の担当枠は時刻で固定し、別の担当者IDや予約コミットは作らない。「進行中」だけでは排他制御にならず、古い状態や他の作業Runの存在を確認してから再開する。作業が15分を超えるときは次の枠と同じ共有ファイルを同時更新せず、後から始めた側は独立調査・結果確認に切り替える。

### 直近の作業キュー

表の操作ID・状態は2026-11-01時点の分析台帳 `supported-behaviors.json` を照合済み。**この行の順序は担当枠内での着手順**。最新台帳で既に `analyzed` ならその分析行を飛ばして次へ進む。仕様差・証拠不足は無理に完了にせず、理由を記録して同一行の再調査を無限に繰り返さない。

| 担当枠 | 作業ID・優先 | 対象・状態 | 次の具体的な作業 | 完了/引継ぎの判定 |
| --- | --- | --- | --- | --- |
| 毎時0分 | Q-00 / P0 | 最新HEADのWeb CI（条件付き）・結果確認待ち | 最新HEADの必須job結果を確認し、失敗時だけ実ログの原因箇所と再現コマンドを特定。学習用範囲の原因なら修正 | 全必須job成功のRun URL・HEADを記録。実行中なら他枠の作業を止めず、不要なpushを控える |
| 毎時0分 | Q-01 / P1 | `SCREEN-ADMIN-USER-DETAIL-A02-03`・`review_required` | 最終管理者保護について認可後の操作者権限変更・別session・version/Session不変の実証可能性を確認。制御interleaving契約2件と実並行を区別 | 静的/実行証拠と不足を分析レポート・製品改善レポートへ記録。未実証なら未完を維持 |
| 毎時0分 | Q-02 / P1 | `SCREEN-ADMIN-USER-DETAIL-A02-01`・`review_required` | 本人によるrole/状態破壊の拒否を、正式admin-users仕様・Web UI・Use Case・Repository・default Seedの自己操作条件で追跡 | Role/State/Data・拒否結果・変更前後の不変性・Case採否が揃ったら基本分析へ |
| 毎時0分 | Q-03 / P2（マージ前） | Checkout正式仕様差分は静的監査済み、承認/実回帰待ち | 製品改善レポートにmain差分・導入commit・未決のWeb/Native住所契約を記録済み。新証拠がない限り再調査しない | 正式仕様の承認/Platform期待値と実回帰の証拠取得時に処理方針を確定。revert/分離は明示承認待ち |
| 毎時0分 | Q-04 / P1 | `SCREEN-ADMIN-DASHBOARD-A01-01`は`review_required`維持、`A01-02`の管理メニュー導線は静的基本分析済み | A01-02は7基本リンク、admin-onlyユーザー、test-build専用制御、RouteGuard、1023/1024px、default staff Seed、既存E2Eを証拠付きで照合し`analyzed`。実Web/負例/DB不変は未受入。A01-01は集計母集団と独立実証待ち | A01-01の再開条件が変わるまで再調査しない。A01-02の実Runは別受入。次はQ-05 / `SCREEN-ADMIN-DASHBOARD-A02-01` |
| 毎時0分 | Q-05 / P1 | `SCREEN-ADMIN-DASHBOARD-A02-01`・`review_required` | 1023/1024pxの管理操作遮断と警告を正式admin-catalog、AdminShell/CSS、RouteGuard、default operator/admin、既存E2E/視覚正本で照合。guest/customer・停止staffの負例と警告時のデータ非露出、操作不可を分離 | Risk/TR/Condition/Case採否と必要な静的根拠が揃えば基本分析へ。実Web/視覚・拒否の独立実証は別判定。次は同枠の未処理ID |
| 毎時15分 | Q-10 / P1 | `SCREEN-AUTH-LOGIN-A02-01`・レビュー待ち（静的監査済み、`review_required`維持） | Webは拒否理由を日本語化、Nativeは`ApplicationError.messageKey`をそのまま表示する静的差を確認。停止/退会/誤資格/Storage失敗の実Android表示と拒否後Session/Cart不変、正式期待値は未受入。分析レポート「2026-11-01 Q-10」を参照 | 製品適合・実Runを未判定として維持。実端末/失敗注入・既存Issue確認を再開条件とし、次の独立作業Q-11へ進む |
| 毎時15分 | Q-11 / P1 | `SCREEN-AUTH-SIGNUP-A02-02`・静的監査済み、`review_required`維持 | 正規化後の既存メールはtransaction前に`EMAIL_ALREADY_EXISTS`で拒否。Webは日本語化、Nativeは`auth.email.exists`キー表示経路。競合時の二重事前確認、Session pointer/guest Cart不変と実Web/Androidは未実証。分析レポート「2026-11-01 Q-11」を参照 | 同一/正規化メールの拒否、guest Cart/Session/DB不変、同時登録競合、Web/Native表示を独立検証するまで完了にしない。再開条件を記録し、次の独立作業Q-12へ進む |
| 毎時15分 | Q-12 / P1 | `SCREEN-AUTH-SIGNUP-A02-01`・静的監査済み、`review_required`維持 | WebはZodでメール形式/上限、表示名、パスワード8〜72、確認一致、注意事項同意を送信前検証。Nativeは3入力のみ、password初期値`testpass1`、確認/同意UIなし、Use Caseの共通検証へ直接委譲。Web Zodと共通正規化/簡易メール正規表現の境界差、Nativeエラー文言、実Web/Androidは未実証。分析レポート「2026-11-01 Q-12」参照 | 正式仕様のPlatform別確認/同意要否、境界値・不正入力時の非書込み・利用者向け表示を独立検証するまで未完。再開条件待ちとして次の独立作業Q-13へ進む |
| 毎時15分 | Q-13 / P1 | M00〜M04教材・Skill・Phase 1評価・受入未完（M00-01の静的経路照合済み） | M00-01の教材・P01/P02/P05・提出・採点・開始/終了状態を照合し、配布後の入力パスと初回ロード順序の不一致を教材側で是正。M00-02は固定Skill実体・P03/P06・採点契約を静的照合し、単なる手順書説明とSkill実起動を混同する教材導線を修正。実OpenCode Skill起動/本人Level 2は未受入。M00-03では自作読取り専用依頼P04の権限・根拠見出し・AI応答の独立照合・前後無変更確認を演習/提出/採点へ整合。実OpenCode/本人Level 2は未受入。M00-04では`submission.md`の編集後に再ロードが競合拒否となる既存契約と、自作`practice.md`保全だけでは拒否証拠にならない点を照合。教材・P05/P06・提出・M00-CR-04を修正し、架空の危険判断と実Ports/支払者/利用枠確認を分離。**静的整合のみ**で実Codespace・本人Level 2は未受入。M01-01では教材の独立バックエンドAPI/サーバーDBという誤説明を、WebのCartUseCases→Dexie/IndexedDBとREADME制約に合わせて是正。架空の欠陥報告は実観測でないと明示し、P01〜P03・M01-CR-01の要件は維持。**静的整合のみ**で本人の実画面・保存値・Level 2は未受入。M01-02はWeb数量UIが`select`であること、探索と自動化の限界、回帰3候補からの選定、P04の主観的並び順と正式ソート・在庫0追加拒否の契約を教材/演習/提出に整合。**静的照合のみ**で本人の実観測・Level 2は未受入。次は**M01-03**のAI/人間の責務とP06・採点の整合。M00-04実Runは新証拠が出た場合のみ再開する。詳細は目的別監査レポート「Q-13 M00-01」を参照 | M00-01は教材パスの静的整合を確認しただけで、実Codespace/Skill/再ロード/本人Level 2は未受入。M00-02以降も目標ID別に実証し、M00〜M04一括PASSにしない |
| 毎時15分 | Q-14 / P1 | M04/M07/M10のOpenCode正式AI評価・校正未受入 | 評価Planの必要な独立セッション・入力Snapshot・決定論的gate・正/負例・再評価を実テストで確認。実モデルの接続/無料条件/権限がなければ停止理由を整理 | 校正済みモデルID・実Run・誤PASS拒否の証拠が得られた部分だけ完了。無断課金しない |
| 毎時30分 | Q-20 / P1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`・静的監査済み、`review_required`維持 | Web/Native UI→CartUseCases→Dexie/SQLite、P-0001/0005/0006、共有Repository契約の拒否後Cart DTO不変を監査。新規Cart失敗時のtransaction rollback、inactive SKU/99境界・実Web/Android/視覚は未実証。分析レポート「Q-20」参照 | 未実証の負例・Cart version不変を再開条件とし、次の独立作業Q-21へ進む。未実行をPASSにしない |
| 毎時30分 | Q-21 / P1 | `SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-02`・静的監査済み、`review_required`維持 | guest/customer・会員rank・sale価格・同一SKU合算をWeb/Native→CartUseCases→Dexie/SQLiteで照合。Webは1〜min(stock,limit)点指定、Native詳細は1点固定。上限超過の既存Cart version不変、rank別価格、実Web/Androidは未実証。分析レポート「Q-21」参照 | 追加時の数量超過・rank別価格/Cart DTO・新規Cart rollback・実画面/Androidを独立検証するまで未完。再開条件を維持し、次の独立作業Q-22へ進む |
| 毎時30分 | Q-22 / P1 | `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`・静的監査済み、`review_required`維持 | 正式emptyは復帰導線を要求。Web無条件0件は`StatePanel action=null`だがBreadcrumbsのホームリンクあり、条件付き0件は解除CTAあり。Nativeは0件メッセージのみ（Android視覚必須外）。`empty-catalog`は商品0件でもactiveカテゴリーを保持することをコードで確認。分析レポート「Q-22」参照 | Web実画面・視覚正本と「元の画面に戻る」解釈、Native実Run、既存Issue重複を再開条件として未完維持。次の独立作業Q-23へ進む |
| 毎時30分 | Q-23 / P1 | `SCREEN-ADMIN-INVENTORIES-S-stock-boundaries`・`review_required` | 在庫0/1/5/6の分類、Web表示、既存Seed/通常の在庫操作、正式しきい値を照合 | `available>=1`と正式`available>=6`の差を確定。製品修正はしない |
| 毎時30分 | Q-24 / P1 | M05〜M07教材・Seed/Reset・Playwright技術受入未完。P03型検査対象漏れを是正、P05複数明細Locatorの学習用参照specを追加（実Run未受入） | P05：default guestでMug/タオル2明細を作り、全体の数量/削除が各2件、商品明細にscope後は各1件であることをread-only参照specで検証する設計。既存Cart JSX/Seed/既存M06 Playwrightと静的照合。参照specの実Chromium Runは新課程専用`playwright.ai-assisted-qa.config.ts`/`ai-assisted-qa-chromium`で実施し、HEAD・spec SHA・JSON report・終了コードを対応付ける（直接CLI実行は`course:run`のreceiptではない）。学習者本人のP05証拠、続いてM05 P06・M06→M07のCase/Reset/Trace | P03はローカルTypeScript 5.8.3で誤型非0/修正0。P05はTypeScript構文と静的根拠のみでブラウザ未実行。M06教材はWeb版のDexie/IndexedDBと数量selectの実装に合わせて説明を是正（静的照合のみ）。 M06完了参照stateの別Case期待責務を004削除と005数量1→2・再読込保持の両方へ整合し、学習用契約テストで固定（実Run未受入）。2コアCodespaces・before/after・実M05〜M07評価は未受入、PASSにしない |
| 毎時45分 | Q-30 / P1 | `SCREEN-CHECKOUT-PROCESSING-A02-02`・レビュー待ち（静的監査済み、`review_required`維持） | Web/Nativeの再試行UI不存在、`retryPayment`の処理中既存試行返却、`resumePayment`の同一キー再開を静的照合済み。禁止の意味（明示拒否か冪等返却か）・同時Gateway呼出し・実Web/Nativeは未決。根拠は分析レポート「2026-11-01 Q-30」 | 仕様判断と並列/実Run証拠が揃うまで完了にしない。再開条件を記録し、次の独立作業Q-31へ進む |
| 毎時45分 | Q-31 / P1 | `SCREEN-CHECKOUT-FAILED-A01-02`・静的監査済み、`review_required`維持 | Webは4種の再試行選択、Nativeは`TEST-SUCCESS`固定。失敗後のみ新attemptを作成し、Order version不一致は拒否するが、処理中はversion照合前に既存試行を返す。再試行時のCart/Checkout Session再検証は行わない（既存Orderの再試行としての仕様妥当性は未決）。根拠は分析レポート「2026-11-01 Q-31」 | 実Web/Native、stale version/別ユーザー、未確定結果・並列実行の証拠とプラットフォーム別の正式期待値が揃うまで未完。再開条件待ちとしてQ-32へ進む |
| 毎時45分 | Q-32 / P1 | `SCREEN-STOREFRONT-CART-A02-01`・静的監査済み、`review_required`維持 | `BR-CART-003/AC-CART-003`とWeb/Native Cart→Use Case→Dexie/SQLite→Checkoutを照合。公開/rank/在庫/価格の問題はDTOへ反映されるが、数量が後から下がった購入上限を超えてもDTOの`blockingIssues`へ追加されない静的経路を確認。Webは理由別表示、Nativeは一律「購入前に確認が必要」。既存契約・統合テストは購入上限縮小と実Web/Androidを未実証。分析レポート「2026-11-01 Q-32」参照 | 旧Cart/item version拒否、購入上限縮小後のCheckout遮断、価格同意・非価格問題の順序、DB不変・実Web/Android・正式判断を追加実証するまで未完。再開条件待ちとして次の独立作業Q-33へ進む |
| 毎時45分 | Q-33 / P1 | M08〜M10教材・Phase 3評価・専用CI受入未完（M08-01/02/04の静的整合を一部補強） | M08の未追跡ファイルと`git diff`の違い、既存差分と配布物の区別、M08-CR-04に必要な抽象化採否の別条件を演習・提出欄へ補強。根拠は目的別監査レポート「2026-11-01 Q-33」。M08-03では2回目commit単独とPR base/head全差分の混同を防ぎ、仕様/Case→変更diff→対象spec→実Run/未実行→commit SHAの対応表とM09引継ぎ契約を演習・提出欄へ補強。実Codespaces/本人の実commit・PR/CIは未受入。M09-01ではPR用完成見本を手動`workflow_dispatch`へ転用する際のPR payload欠落・選択ref/checkout SHA/PR HEADの混同を教材・P01・提出欄で是正。基準`.disabled`案と採点契約は維持し、本人の別条件YAML/実Run/Level 2は未受入。M09-02ではRunメタデータのmerge SHAとcheckout SHA、PR head、Run/attempt、Check、Artifact内target-sha.txt、対象specの照合手順をM09教本・P02・提出欄へ補強。実Runは未受入。M09-03では配布合成A/B/CとREADME旧Case1〜3解説、P03別条件の不一致を是正。`if-no-files-found`警告/失敗、`if: always()`、SHA不一致とstep failureを分離し、提出診断表を補強。M09-CR-03は維持、本人の実Run/Level 2は未受入。M09-04ではP04の「1日3回」と「週2回」を独立した架空条件として分離し、4行のRun数・対象spec・Runner・未検証期間・Billing確認先・停止条件を教材/演習/提出に整合。M09-CR-04の基準は維持、実Billing/本人Level 2は未受入。M09-05ではcheckout/依存・Browser・Artifactの権限境界、外部PR+pull_request_target提案、他CI・Secret分離を教本/P05/P06/提出へ補強（静的整合のみ、実受入未完）。次はM10-01（Phase 2成果物・PR差分・公開範囲、P01/P02・M10-CR-01） | M08〜M10の各目標ID、固定HEADの実Run/Check/Artifact、本人判断・復習/再評価を個別受入。実Private Codespace、正式AI評価、専用CIの実Runが未確認ならPASSにしない |
| 毎時45分 | Q-34 / P1 | 公開Template→本人Private 2コアCodespaces・外部承認待ち | 承認不要のmanifest/Secret除外/`course:sync/load`/非破壊再ロードを検証。公開先・権限・費用の承認は一覧化 | 外部Template作成は明示承認までBLOCKED、内部検証は個別に進める |

### キューを消化した後の補充規則

上記の具体的な行が完了・BLOCKEDで作業できない場合は、分析台帳の `behaviors[]` から**`analysis_status=review_required`のうち担当枠に属する未処理ID**を、台帳内の掲載順に**次の1件**として選ぶ。対象の実在・状態を再確認したうえで、上表と同じ形式（作業ID、操作ID、状態、具体的な次の操作、完了条件、担当枠）で追加し、元の行を維持する。初期キューの行が少なくなった時点で補充し、毎回全109操作の優先度を比較し直さない。BLOCKED対象は理由と再開条件を記録して次のIDへ進む。

担当枠の割当ては**IDの接頭辞**で固定する（下記は優先順に判定し、1 IDを2枠へ割り当てない）。

- **0分**：`SCREEN-ADMIN-DASHBOARD-*`、`SCREEN-ADMIN-USERS-*`、`SCREEN-ADMIN-USER-DETAIL-*`、`SCREEN-BOUNDARY-*`、`SCREEN-TEST-CONTROL-*`、以下で未指定のID。
- **15分**：`SCREEN-AUTH-*`、`SCREEN-ACCOUNT-*`、`SCREEN-ORDERS-*`、`SCREEN-ADMIN-PRODUCTS-*`、`SCREEN-ADMIN-PRODUCT-NEW-*`、`SCREEN-ADMIN-PRODUCT-DETAIL-*`、`UC-AUTH-*`、`UC-ACCOUNT-*`、`UC-USER-*`。
- **30分**：`SCREEN-STOREFRONT-*`（ただし`SCREEN-STOREFRONT-CART-*`を除く）、`SCREEN-ADMIN-INVENTORIES-*`、`SCREEN-ADMIN-CATEGORIES-*`、`SCREEN-ADMIN-BRANDS-*`、`UC-CATALOG-*`、`UC-INVENTORY-*`。
- **45分**：`SCREEN-STOREFRONT-CART-*`、`SCREEN-CHECKOUT-*`、`SCREEN-REVIEWS-*`、`SCREEN-ADMIN-REVIEWS-*`、`SCREEN-ADMIN-ORDERS-*`、`SCREEN-ADMIN-ORDER-DETAIL-*`、`SCREEN-SUPPORTING-*`、`UC-CART-*`、`UC-CHECKOUT-*`、`UC-ORDER-*`、`UC-REVIEW-*`。

接頭辞で割当てを決めるのは**作業の担当**だけであり、製品の正式分類・分母・リスク・テスト深度を変更しない。2026-11-01時点の未分析111 entriesは上の規則で**0分25、15分25、30分25、45分36**に割当て可能（操作109・状態2）。追加・変更された動作は割当ても再計算する。IDごとに必要な根拠・リスク・テスト条件・Case採否は従来どおりすべて検証する。

**その他の受入**：分析以外の仕事は表のQ-03/13/14/24/33/34を細分化して補充する。作業が減っても承認待ちの外部操作や既存製品改修を推測で始めず、残る教材・実評価・配布・既存差分の既存Plan上の全条件を対象に保つ。Mobile App CI復元と最終HEADのフル実行は、他のマージ前条件が整った**マージ準備時に0分枠が担当**する。早期の復元や未実行のPASS扱いは禁止。

## 現在状態（2026-11-01の確認に基づく、毎回再集計）

- PR #199はOPEN。前回の確認HEADは `5601231df0bd3ac96a679d80cae15615396758fa`。これは固定の作業対象SHAではない。
- Scenario Shopの基本分析は**50/188操作**、残**138操作**、非default状態は**14/20**（残6）。#210分離後のCheckout参照再整合で34件を証拠再照合待ちに戻した。188は漏れ・重複の最終監査前の暫定分母。分析済みは製品適合・実Web/Native Run PASSではない。
- M00〜M10（11モジュール・51学習目標）の教材・演習・評価・知識グラフは配置済み。教材内容全量、独立AI評価、実行環境での受入は未完了。
- 既存製品差分19ファイルの静的監査は完了し、`product/scenario-shop-maintenance`へ分離済み。製品としての実回帰・仕様適合は専用ブランチの後続検証であり、PR #199の分離待ちではない。
- Web CIの現在HEAD結果は毎回取得する。最後に確認した進行中のRunは[41259747230](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41259747230)。前HEADの成功・失敗を最新HEADへ流用しない。
- Mobile App CIのPR自動トリガーは**一時停止中・未受入**。マージ前の復元と最終HEADでの必須job成功が必要。未解決レビューThreadは直近の確認で0件。

## 全体の受入条件と残課題（作業選択は上記キューを優先）

### P0：現HEADのWeb CI・レビューで確認された失敗

- **状態**：実行結果を毎回再取得。直前HEADでは学習用契約テストのPrettier違反があり、次HEADで修正検証中。
- **次の作業**：最新HEADのCIログを確認し、学習用コード・文書の原因なら修正して必要なローカル/CI検証を行う。製品SUT/製品テストの変更が必要なら根拠と影響を報告し承認を待つ。
- **完了条件**：同一の最新HEADでStyle Quality、Code Quality、contracts、関連E2E、verify、validateなど全必須Web CI jobが成功。skipped/cancelledや旧HEADの成功を流用しない。
- **証拠**：[PR Checks](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199/checks)。

### P1：全サポート動作の基本分析と分母監査

- **状態**：50/188操作、残138（#210分離後に34件を再照合待ちへ変更）。分類率100%は基本分析率100%を意味しない。分母188は暫定。
- **次の作業**：未分析の高リスク動作から、正式BR/AC、Role/State/Data、Web・Native UI→Use Case→Repository、Seed実値、Risk/TR/Condition/Case採否を個別確認。成立したものだけ`analysis_status=analyzed`へ変更し、個別証拠と契約テストを同期する。未決/不適合候補は製品改善レポートへ記録する。
- **完了条件**：全サポート動作の漏れ/重複を監査して分母確定、分類100%、**証拠付き基本分析100%**。未決・BLOCKEDを完了扱いしない。詳細Caseの採否・残リスクも追える。
- **正本**：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`、`scripts/training/validate-supported-behaviors.mjs`、`tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs`、[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)。

### P1：非default状態の残2件

- **状態**：18/20。商品一覧emptyの戻るCTAと管理在庫0/1/5/6の境界に仕様・実装差があり`review_required`。
- **次の作業**：仕様、Web/Native表示、既存Seed/通常操作による境界と実行証拠を照合。製品の不具合認定、教材の期待結果、基本分析成立を混同しない。
- **完了条件**：個別の仕様根拠と分析・Case採否が成立し、20/20件を判定。証拠不足・未決は未完のまま明示。

### P1：教材11モジュール・51項目と実践/Skill

- **状態**：教材・演習・クイズ・完成資料・知識グラフは配置済み。内容の全量レビューと実地技術受入は未完。
- **次の作業**：各項目の学習目標、初心者向け説明、BR/AC、例題/演習、開始・終了状態、提出証拠、模範と評価基準、復習先を実体照合。M02→M03の`qa-workflow-skills`は実runtimeのcurrent evidenceと最終gateを検証。M05〜M07のSeed/Reset/Playwrightも実行証拠を確認する。
- **完了条件**：M00〜M10の全51目標に教材と評価可能な証拠が対応し、重大な内容誤り・欠落を修正。模範/完成specは学習者配布から除外し、既存の旧教材/正式テストを壊さない。
- **正本**：[学習目標・順序](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)。

### P1：正式AI評価・再評価・校正

- **状態**：`course:assess`等の実装は存在するが、実モデルによる正式評価と誤PASS拒否、全Phaseの通し受入は未完。
- **次の作業**：M04/M07/M10で全必須objective ID、提出/Runの実在とSHA、独立評価セッション、本人の別条件回答、Level 2判定、再提出・履歴の非破壊性を検証。OpenCodeの実モデルID、無料/費用、権限、認証、非対話JSON、未実行/異常/Prompt Injection/誤PASSを校正する。
- **完了条件**：正答/誤答/別解/証拠不足・改ざん・未実行/モデル失敗の負例が正しく判定され、**重大な誤PASS 0**、正式結果と履歴/復習/再評価が本人の非公開workspaceに保存される。校正不能なら正式修了を発行せずBLOCKEDを記録。
- **正本**：[評価Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)、[配布Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)。

### P1：認可競合・実動作・教材阻害の検証

- **状態**：最終管理者保護の制御interleaving学習用契約2 Caseは旧HEADのCIで成功。実並行リクエストと再認可、Web/Native実動作は未受入。認証ログイン拒否理由、Signup、注文失敗・復旧にも未決がある。
- **次の作業**：別セッションによる権限剥奪後の操作、Session/DB/version不変、ログイン拒否理由・returnTo・Signup Web/Native差を必要な独立実行で確認する。実再現・仕様差・推測を区別し、教材が実行可能か判断する。
- **完了条件**：分析の根拠不足が解消し、再現した製品問題はリスクと教材代替/阻害判断を記録。製品修正は別途承認なしに行わない。
- **正本**：[製品改善レポート](../reports/pr199-product-improvements.md)。

### P1：学習用Template配布準備とマージ後の本人作業

- **B1準備：完了**。既存manifest/配布元教材・Skill・LICENSE/NOTICEと`course:sync`・`verify-distribution`、マージ済みmainのSHAから外部コピー先を作る`scripts/training/prepare-learner-template.mjs`を用意した。生成物をPR内に二重保存せず、実生成・全Hash/Secret確認は別受入。
- **B1公開：本人のPRマージ後作業**。本人が公開先を作成し、上記で生成した内容をコピーする。エージェントは公開しない。マージ前ゲート・追加質問から除外。
- **B2：本人制作物の権利確認完了**。外部ライブラリ等の原ライセンス・NOTICE検査は続ける。
- **B3：他のPR作業完了後に本人が実施**。Public Template由来Private repo/2コアCodespacesでload/Serve/Reset/Playwright/モデル接続を検証する。無料枠を超える課金は禁止。マージ前の実Runゲートから除外し、未実行と明記。

### 完了：既存製品差分19ファイルの専用ブランチへの分離

- **状態：完了**。元の19ファイルを`main`起点の`product/scenario-shop-maintenance`に保全し、PR #199の差分から除去した。差分の「本PRに残す／別PRへ分離／取り消す」の最終判断は不要。履歴の静的監査結果は[製品改善レポート](../reports/pr199-product-improvements.md)に保持する。
- **今後の製品変更**：専用ブランチを継続利用し、変更ごとに正式仕様・Web/Native・関連テスト・CIと安全性を確認する。製品用PR作成、`main`への統合は別の明示指示が必要。製品不具合の分析・教材の技術受入はPR #199で継続する。
- **完了条件**：PR #199の`main`との差分に対象製品19ファイルが残っていないこと、専用ブランチに19ファイルが元のblobのまま存在すること。製品側の実回帰や新規修正の完了を意味しない。

### P0（マージ準備時）：Mobile App CIの復元と最終検証

- **状態**：`.github/workflows/native-ci.yml`のPR自動トリガーを一時停止中。未受入。
- **着手条件**：他のマージ前必須条件の完了が見込め、最終検証を開始する段階。
- **次の作業**：PR branchの`on.pull_request`を**元通り復元**して通常pushし、最終HEADのAndroid/Native Static/iOS/Maestro等の必須jobを実行。CI中の競合pushを避ける。
- **完了条件**：復元後の最終HEADでMobile・Webの必須CIが成功。一時停止workflowのままmainへ取り込まない。

## 変更境界と最終完了条件

- **変更可能**：教材、演習、評価、学習用fixture/専用Seed・Playwright/契約テスト、分析台帳、調査レポート、Plan、知識グラフ、学習用配布/検証ツールと必要な学習用CI。
- **無断変更禁止**：既存製品本体（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`等）、正式製品仕様、既存Seed/Reset、既存製品テスト・workflow、過去の製品差分のrevert/移設/別PR化。既存`docs/spec/**`の意味不変なMarkdown書式修正のみ、CI/lint等で必要性を確認した場合の限定例外。
- **明示承認・変更境界**：製品差分19ファイルの`product/scenario-shop-maintenance`への分離は今回の指示で完了。製品機能・正式仕様の追加変更や製品用PR作成・`main`への統合は別途確認する。B1 Public Template実公開とB3本人2コア実受入はマージ後の本人作業。merge、force push、branch削除、PR/Issue close、release/tagは禁止。
- **PRマージ前の完了判定**：確定分母の全サポート動作の証拠付き基本分析100%、非default状態全件の判断、教材/51学習目標/Skill・正式AI評価の開発環境での検証、配布準備/第三者NOTICE/Secretの監査、製品差分19ファイルの専用ブランチ分離（完了）、最新HEADのWeb/Mobile CI・独立レビューを満たす。**B1実公開とB3実Private 2コアCodespaces受入は本人の指示によりマージ後へ移した**。後続実受入は削除せず未実施として扱う。実受講者の学習効果検証も本PR完了条件の外。
