# PR #219から#210・#213への調査結果引継ぎ

## 対象と判定方法

- 検証する製品SUT：PR #199の`docs/plan-ai-agent-qa-curriculum-redesign`、基点HEAD `46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f`。#219の受入テストとレポートは`work/pr199-sut-acceptance`に追加する。
- 製品修正の参照HEAD：PR #210 `03bd4c8abec15c8004d0fc8c8b09e36cc0f68f79`。未マージのため、#199の合格証拠としては扱わない。
- 分析正本：`training/ai-assisted-qa-course/coverage/supported-behaviors.json`。編集責務は#213。#219から直接変更しない。
- 証拠：Web CI [41792378802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41792378802)（Chromium cross-role 15/15・Integration 123件成功、ただしStyle Quality失敗。後続のPrettier修正済み）。別Run [41790967187](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41790967187)（Chromium cross-role 12/12成功）。旧Runの成功を現在HEAD全体のPASSに流用しない。
- 判定区分：実行での確認結果／実装・仕様の静的差分／再現未完了の仮説。CIの`it.fails`は意図した拒否がまだ成立しないことを表す既知不具合再現用であり、製品適合PASSには数えない。

## 検証で確認できた内容

| 対象 | 根拠 | 判定 |
| --- | --- | --- |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | PR #219のChromiumでoperator→admin Role変更後、旧Sessionで管理Routeに入れないことを確認（Run 41792378802）。Integrationでtarget Session削除・stale CASを確認 | 当該Caseの部分条件のみ実行PASS |
| `SCREEN-ADMIN-USER-DETAIL-A01-03/A01-04` | 同RunでRank変更が再読込後に反映、顧客停止後のLogin拒否を確認。IntegrationでCheckout abandonedとCart不変を確認 | 対応する一部条件のみPASS |
| `SCREEN-ADMIN-USERS-A01-02` | 同Runでkeyword×Role×Statusの一致/不一致を確認 | 一部条件のみPASS |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | 同Runでguest/customer/operator/admin/suspended/withdrawnの直URL境界と他人Order非露出を確認 | Webの代表条件のみPASS。Nativeと停止staffは未受入 |

## 製品修正担当#210への依頼

| 状態 | Case・対象 | 根拠と影響 | 担当先の確認内容 |
| --- | --- | --- | --- |
| 静的差分を確認。動的再現は要CIログ | `SCREEN-ADMIN-USER-DETAIL-A02-03`など（High） | #199の`AdminUserUseCases.changeRole/changeSuspension`は`requireAdmin()`とtransactionの間にactorの権限失効を再検査しない。#210の同ファイルでは`assertActorStillAuthorized`がtransaction内にある。失効済みactorが別ユーザー変更を継続する危険性 | #219 `tests/integration/pr219-actor-revocation.test.ts`の`it.fails`を旧#199 HEADで実行して失敗期待を確認し、#210 HEADでは通常`it`へ変更した独立テストで拒否コード・User/Session全表不変を確認する |
| 静的差分を確認。実ブラウザの停止staff再現は未実行 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01`（Medium） | `RouteGuard`はactiveを要求するが、`app/forbidden.tsx`の管理画面へのリンク表示はroleだけで判定。停止operatorの`currentUser`が残るケースでForbidden→admin→Forbiddenの循環を招く可能性 | #219 `tests/component/pr219-forbidden-route.test.tsx`の既知期待失敗Caseを確認し、権限外の管理リンクを表示せず安全な導線を提示するかを実ブラウザで判定 |
| 仕様判断待ち | `SCREEN-ADMIN-USERS-A01-02`（Medium） | #213の条件にはRank絞込み・作成/更新日sortの補助UI契約への言及がある一方、#199のAdminUsers Web画面はkeyword・Role・Statusのみを提供。正式BR/ACと補助UI仕様の優先関係は未確定 | #213で採否を確定し、仕様不適合と判定された場合のみ#210で画面・テストを修正 |
| 静的差分を確認。Android実行は未実施 | `SCREEN-BOUNDARY-FORBIDDEN-A01-01` Native（Medium） | `app/forbidden.native.tsx`はNative対象外の案内画面。正式`docs/spec/roles-and-permissions.md`の権限不足説明・安全な戻り導線との対応が未検証 | Android実機/エミュレータ上で文言、戻り先、DB不変、フォーカス・a11yを確認 |
| 未再現仮説 | `SCREEN-ADMIN-PRODUCTS-A01-02`（Medium） | `AdminProductsContent`のselectedが絞込みやページ移動時に残る一方、bulkは表示中のrowsのみに絞る。画面外の選択だけが残ると空のtargetIdsでbulk要求される可能性。SKU検索とカテゴリー/ブランド絞込についても実装・仕様差を要確認 | `many-products`の実ブラウザで表示外選択/空target/ページ正規化・拒否理由を再現し、DB前後を記録するまで不具合確定しない |

上表は実際に確認した全製品不具合の確定リストではない。未実行Caseで発見される問題は別途追記する。テストコードへの`it.fails`適用を製品修正や合格証拠として扱わない。

## 分析担当#213への依頼

- `SCREEN-ADMIN-USERS-A01-02`、`SCREEN-ADMIN-USER-DETAIL-A01-02/A01-03/A01-04/A02-01/A02-02/A02-03`、`SCREEN-BOUNDARY-FORBIDDEN-A01-01`について、採用Caseごとに既存Test/新規Testと実Run・未実行条件を紐付ける。上のWeb/Integration成功は該当する一部条件に限る。
- `docs/reports/2026-11-04_pr219-case-traceability.csv`は208動作の条件参照953行であり、953採用Caseや953件PASSの確定ではない。元台帳の`test_condition`/`case_policy`とBR/ACの採否を#213で確認する。
- `SCREEN-ADMIN-USERS-A01-02`のRank/並べ替え、`SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`の無条件0件・フィルター0件での戻り導線を、正式仕様・画面リファレンスに照らして判定する。見た目・Androidは未実施。
- #210の未マージ製品差分を#199のPASSとして台帳へ記入しない。

## 確認・再開条件

- 旧SUTの競合再現、停止staffのコンポーネント期待失敗、商品0件画面の追加E2Eは新規ソースを追加したが、固定HEADでのCI検証と証拠収集を継続する。
- Webのスクリーンショット・Traceの常時保存、IndexedDB/SQLite全表前後、Android実機・エミュレータ、アクセシビリティと視覚正本の比較は不足。Runのテスト成功を代替証拠にしない。
- このPRでは製品実装・正式仕様・既存Seed/Reset・既存製品テスト/CIの変更を行わない。差分は専用受入テスト・レポート・タスクリスト・作業記録に限定する。
