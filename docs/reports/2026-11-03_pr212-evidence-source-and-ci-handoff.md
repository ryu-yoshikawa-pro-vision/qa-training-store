# PR #212：分析根拠の行参照・CI・未完了作業の引継ぎ（2026-11-03）

対象：[#212](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/212)（独立 head `work/pr199-parallel-supporting-analysis-20261103`）を、[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199) の固定 base HEAD `b671561a834998a58ef59c3047b7d47e76569c9c` と比較する。

## 変更境界

- このPRの書込みは `training/ai-assisted-qa-course/coverage/supported-behaviors.json` と `docs/reports/**` の独立レポートのみ。製品実装 `src/**`・`app/**`、正式製品仕様 `docs/spec/**`、Seed/Reset、既存製品テスト、#199の自動更新ブランチ、#210、#211は編集しない。
- `analysis_status=analyzed` は **基本静的分析を終えたという台帳上の分類**。製品受入、実Web/Android PASS、契約テストPASS、スクリーンショット照合、仕様判断完了を意味しない。#199のテストがこの分類を固定的に `review_required` と想定する箇所との衝突を後述する。
- PR #199の定期自動実行が停止していると仮定しない。取り込みには最新ベースのHEAD・各ID・各フィールドの差分を再取得すること。

## 今回の実施成果（操作数の水増しなし）

| 項目 | 変更前 | 変更後 | 判定 |
| --- | ---: | ---: | --- |
| 基本静的分析がanalyzedの操作 | 179/188 | **179/188（95.2%）** | 残り9 |
| analyzedの非default状態 | 17/20 | **17/20（85%）** | 残り3 |
| analyzedにおける `analysis_progress` 空欄 | 8 | **0** | 実験の成否ではない |
| 明示済み `related_use_cases` があるのに `use_case_evidence` 欠落 | 25 | **0** | 公開メソッド定義行に紐づけ |
| `audit_branch_refs` のファイル末尾を超える参照 | 22 | **0**（修正対象11ファイル・196参照を再確認） | 全154ファイル・2,388参照を機械調査 |
| Checkout Completeの誤ったSeed変換パス | 3 | **0** | 公式バリデータ期待パスへ修正 |

修正は各コミットで独立して行った。

- `a77b20c8410b40a8f00fe0f8531b289e1c1f4c91`：Checkout Complete 3操作の `seed_evidence.transform` を `src/seeds/scenarios.ts:33` へ修正。実データは `src/seeds/default-dataset.ts:422-475` の参照を維持。
- `a1044a2df1b15d7cbd1ee0bb5bf3f8236161e50b`：8操作の `analysis_progress` と基本レビュー・リスクの検証条件を既存実装/テストに基づき補完。
- `635cbd5103f7fba7b42bdc3a9524a1058e715ee2`：24操作＋1状態に正確な `use_case_evidence` を記録。Use Caseと関係しないUIのみの24 analyzed状態/操作は無理に紐づけない。
- `c5b9544c0d7d50324b237590a265c642a2bca3fc`：22の古い根拠行範囲を現行ソースへ移行。stale-cartの誤ったIntegration Test参照を `tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs:267-305` に置換。低在庫の「在庫0テスト」と「在庫3テスト」の誤同一視を訂正。

今回詳細を埋めた8件は `SCREEN-STOREFRONT-CART-A02-02`, `UC-ACCOUNT-UPDATE-PROFILE`, `UC-ADMIN-CHANGE-CATEGORY-STATUS`, `UC-ADMIN-CHANGE-BRAND-STATUS`, `UC-ADMIN-DELETE-DRAFT`, `UC-AUTH-LOGOUT`, `UC-REVIEW-DELETE`, `UC-CART-MERGE`。各操作について、許可Role・Version・前後のデータ不変・transaction境界・失敗注入・Web/Androidの未受入を区別した。既存テストは読解したのみで、この作業では実行していない。

## ソース整合監査の実施範囲

GitHub接続で当該固定ソースを読み取って以下を検証した。既存 `node scripts/training/validate-supported-behaviors.mjs` を起動したわけではなく、そのソース上の検査規則の一部を外部から独立に再評価した。

1. 正本の16ファイルに記載された271件のRequirement/画面操作/状態参照は `source_path/source_line/source_text` と一致（不一致0）。
2. 9 Use Caseファイルに関係する92レコードは正本の公開メソッド署名・行番号と一致（不一致0）。ソースからの公開メソッド抽出は76/76で一致。
3. `implementation_evidence` / `seed_evidence` / `seed_evidence.transform` の**624参照**は定義行の署名と一致（不一致0）。
4. 画面カタログ **38画面**、画面操作 **73仕様行/172分割操作**、非default状態 **20件**、正式BR/AC **46件**、公開Use Case **76件**について全件の対応を検査。Use Case/要件IDの未定義参照、重複操作ID、状態逆参照、analyzed必須項目の欠落について検査時に不整合0。これは手動で移植した検証規則の実行で、公式バリデータの直接PASSとは異なる。
5. `audit_branch_refs` **2,388参照、154ファイル**のファイル存在と行範囲を総点検。22参照は元の終了行が実ファイル終端を超えており修正。修正した11ファイルの196参照は後続照合で行範囲外0。行範囲が存在することはその範囲の記述が根拠として十分である保証ではない。
6. `source_commit` が40字SHAであること、`schema_version` が2であることを確認。**現PRの全ケースが正しく受入済みであるとの主張はしない**。

### 証拠の陳腐化を避けるために訂正した主な参照

- `src/presentation/guards/route-guard.tsx` は実際には57行。4件の管理画面・1件の在庫参照が末尾超過だったため、現在の16–55行の認証/Role分岐へ置換。
- `src/presentation/pages/admin-master-pages.tsx` は564行。ブランド管理画面は431–563行に再設定。
- `src/presentation/pages/checkout-order-pages.tsx` の注文詳細は現在664–793行。古い722–858行から変更。
- Web注文/注文処理/レビューのComponent Test参照、管理注文Component Test、ユーザー管理Integration Testの古い最終行を実在Caseへ移動。
- `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` の本来の証拠は `tests/contracts/ai-assisted-qa-checkout-confirmation.test.mjs:267-305` にある。ただし実行結果は今回未確認。
- `SCREEN-STOREFRONT-PRODUCT-DETAIL-S-low-stock` の現存Component Test `tests/component/catalog-pages.test.tsx:350-359` が直接扱うのは**在庫0**で、在庫3の実証として流用しない。

## CI結果（固定SHA、明示して混同しない）

| 対象SHA・Web CI実行 | Vitest (contracts) | Style Quality | その他 |
| --- | --- | --- | --- |
| #199 基準 `b671561a834998a58ef59c3047b7d47e76569c9c`、run [41628332183](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41628332183) | **1失敗**：`ai-assisted-qa-assessment.test.mjs` のCalibration復旧ケース | **失敗**：`ai-assisted-qa-admin-users-list.test.mjs`・`ai-assisted-qa-assessment.test.mjs` のPrettier | 既に全体失敗 |
| #212 `635cbd5103f7fba7b42bdc3a9524a1058e715ee2`、run [41658062532](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41658062532) | **13失敗**：基準と同じ評価1件＋`ai-assisted-qa-supported-behaviors.test.mjs` 12件 | **同じ2ファイル**で失敗 | Integration/Component/Unit/Repository、主要Web E2E・UI Review等の個別ジョブは成功したが、Workflow全体は失敗 |

増加分の12件は既存テストが `analysis_status==="review_required"` を固定期待する操作を、#212の台帳では `analyzed` と分類したため。例：`SCREEN-CHECKOUT-ADDRESS-A01-01`、`SCREEN-STOREFRONT-PRODUCT-DETAIL-A02-03`、`SCREEN-STOREFRONT-SEARCH-A02-02`、`SCREEN-AUTH-LOGIN-A02-01`、`SCREEN-AUTH-SIGNUP-A02-01`。既存テストの意図は製品側の未解決判断を基本分析の完了として扱わないことであり、#212の基本静的分析分類との意味的な衝突がある。**単にexpect値を置き換えたり台帳ステータスを無根拠に戻したりせず、#199側の契約の定義と#212側の完了定義を合意してからテスト/台帳の正本を調整する必要がある。**

基準CIも失敗しているので、#212がPrettierとCalibrationの全失敗を新規発生させたとはいえない。分離済み#211の教材側受入修正との重複も最新差分で確認すること。

このレポート作成時の新HEAD `c5b9544c0d7d50324b237590a265c642a2bca3fc` のWeb CI run [41660799570](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41660799570) は**確認時点でin_progress**。完了結果を推測しない。以後のレポート追加コミットなどによって最新HEADは変わるので、**同一最終HEADのCI再確認は別作業**。

## 残タスク：基本分析9操作（ID単位）

| ID | 続きで直接確認すべきケース・データ | 未確定とする理由 |
| --- | --- | --- |
| `SCREEN-ADMIN-PRODUCTS-A01-02` | (1) SKU/名前/商品コード検索の差、(2) Category/Brand/Rank/Status/Stock 0・1・5・6/価格境界/並び順、(3) many-products20/21ページング、(4) 旧選択Set→空`targetIds`→未捕捉`VALIDATION`、(5) 0 active SKU価格、(6) operator/adminと不許可Role、(7) Version競合/部分成功 | 正式UI仕様と製品実装の差・実Web/DB前後・a11yが未受入。製品判断は#210 |
| `SCREEN-ADMIN-USERS-A01-02` | (1) keyword・Role・StatusのAND、(2) Rank絞込欠落、(3) 作成/更新日sort欠落、(4) Role/Status変化後のpage残留、(5) 件数20/21・0件、(6) 退会/停止・operator/customer/guest拒否、(7) 表示情報の非露出 | 補助UI仕様・Web/Use Case/Repositoryが不一致で実証/判断待ち |
| `SCREEN-ADMIN-USER-DETAIL-A01-02` | 他人operator↔admin変更、期待Version一致・不一致、他者Session全削除、self/last-admin/withdrawn拒否、Change Dialog・DB前後 | #199の定期実行担当と重複排除 |
| `SCREEN-ADMIN-USER-DETAIL-A01-03` | customer Regular/Gold/Platinum、staff Rank変更不可、Session/Checkoutと割引再算定、Version・並行変更・Role | #199の定期実行担当と重複排除 |
| `SCREEN-ADMIN-USER-DETAIL-A01-04` | active↔suspended、全Session無効化・未完Checkout/Cart、withdrawn拒否、Version/同時停止/復帰 | #199の定期実行担当と重複排除 |
| `SCREEN-ADMIN-USER-DETAIL-A02-01` | self降格・自己停止、Web disabled、UseCase `SELF_CHANGE_FORBIDDEN`、RoleとSession不変 | #199の定期実行担当と重複排除 |
| `SCREEN-ADMIN-USER-DETAIL-A02-02` | withdrawn全Role/Rank/Status変更拒否、UI read-only・直UseCase・既存Order/Review/Session不変 | #199の定期実行担当と重複排除 |
| `SCREEN-ADMIN-USER-DETAIL-A02-03` | nonself最後のactive admin降格・停止 `LAST_ADMIN_PROTECTED`、複数admin正例、Count並列/transaction rollback/全Session前後 | #199の定期実行担当と重複排除 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | guest→Login、customer→staff、operator→admin、停止staff→/forbidden→/admin循環候補、production automation-admin拒否、Android文言・戻り、認可対象DOM非露出とDB前後 | Web/Android実Runと正式画面・Role仕様への適合判定待ち |

## 残タスク：非default状態3件

| ID | 続きで直接確認すべきケース |
| --- | --- |
| `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty` | `empty-catalog`の素の/productsで空状態、規定の復帰リンクとWebの `action=null` の衝突、検索条件あり0件との対照、Web画面/画像/a11y、#210で修正または仕様決定 |
| `SCREEN-CHECKOUT-ADDRESS-S-resume-notice` | checkout-resumeの最初の1回・reload時非表示・Session ID差・Resetで履歴clear・replaced表示差、Cart期限/Role、sessionStorage・Web正本画像 |
| `SCREEN-CHECKOUT-CONFIRM-S-stale-cart` | confirm-readyを明示作成後Cart版変更→getConfirmation/beginOrder拒否とOrder/Payment/Stock/History/Checkout不変。固定Seedはaddress Stepのまま。Webの現error CTAはpaymentへ戻るが仕様はCart復帰、Web E2E・画像・a11yで確定 |

## 横断残タスク（優先と受入条件）

1. **CI契約の調停**：#199の `tests/contracts/ai-assisted-qa-supported-behaviors.test.mjs` で固定`review_required`が意味する「未解決製品問題」と、#212台帳の「基本静的分析analyzed」の定義の衝突を仕様/受入レベルで切り分ける。対象12ケースを各操作IDへ突合。合意後に権限ある担当が既存テスト/台帳を変更。#212単独でテストを勝手に更新しない。
2. **基準の先行失敗**：#199基準のPrettier対象2ファイルとAssessment calibration復旧1件を、#211/対応担当の成果との重複と併せて確認。修正されたSHAの既存CIを再実行・同一HEADで評価。
3. **残9操作+3状態**：仕様判断/直接Web/Android/DB前後/Role/Version/Trace/正本画像、必要な再現用追加Case（製品テスト追加は別権限）を揃える。基本分析を上げるためだけに未解決の製品判断を消さない。
4. **任意の追加監査根拠**：`analyzed`で `audit_branch_refs` がない13件（Signup1、OrderDetail1、Admin Products2、Admin Product New4、Admin Product Detail4、Inventory1）を個別に確認。基本reviewから実ソースの正確な範囲へ変換する価値はあるが、任意項目なので未設定を自動FAILとしない。
5. **メソッド参照がない操作**：`use_case_evidence` がない analyzed 24件は全て `related_use_cases` も空。多くはGuide/Legal/ナビ/境界/Test ControlのUI振る舞いであり、実装経路を確認して必要な場合に限り関連Use Caseを追加。無関係なUse Case参照の水増しはしない。
6. **旧分析と製品差分の再監査**：#210分離後の最新製品実装、既存テスト/Seed・仕様・補助UI仕様の優先順位、CheckoutのWeb/Native不一致・決済method Validation・Cart復帰・業務OrderNumber・在庫原子性・管理検索・権限拒否を実証。#212の製品修正は禁止。
7. **全Behavior/Requirement/Methodの意味網羅**：38画面、188操作・20状態、79要求・46BR/AC、76公開Use Caseを、単なるID一致だけでなくRole×Platform×状態・境界・実際の呼出し関係で追跡。詳細Case採否・欠落状態/対象外と証拠保存先を明示。
8. **Web実行**：`node scripts/training/validate-supported-behaviors.mjs`、Vitest契約/統合/Component/Unit、Playwright、desktop/tablet/mobileスクリーンショット/DOM・a11y・Trace、IndexedDB操作前後、Resetと固定時計、複数Role・決済4結果・価格/Cart競合を同一SHAで確認。既存の特定CIジョブが成功したことと全Case個別PASSは混同しない。
9. **Android実行**：実機/妥当なエミュレータでMaestro、Native SQLite前後、断続/再開/端末再起動・Navigation/Session・在庫/注文、Native正本画像とWeb差を確認。
10. **学習教材M00–M10**：11モジュールの教材・演習・採点・修了、M02→M03の設計→実行受渡し、M04/M07/M10採点、M05–M07 Playwright、M08 Git、M09/M10 private CI・PR証拠、各実技/評価の前提環境・学習成果・安全な実行範囲を受入する。
11. **配布/運用と保護**：course:sync/配布manifest、演習用Project/画像・ライセンス・個人情報、秘密/認証情報保護、プラットフォーム・CI環境・Git権限、失敗とやり直し、受講者の再現性を確認。
12. **最新HEADの三者比較と統合**：#212独立差分には#199ベース当時に比べて **58操作**の `analyzed` 独自追加、共通 `analyzed`の根拠改善等がある。#199側の定期実行成果と項目別に突合し、勝手な上書きを防ぐ。base時点で#199だけの追加`analyzed`は0。次回統合時の値は再取得必須。
13. **PR完了基準**：#212はDraft。#199本体の作業・#210製品問題・#211教材問題の受入とCIを分離し、同一最終HEADで契約/format/必要CI/レビューを確認してから判断。merge/force push/branch削除/close/releaseは明示指示までしない。

## 重要な未検証事項

現作業でテストコードの実行やPlaywright/Android端末を操作していない。Web CIはGitHub Actionsの**過去コミットのログを実際に確認**した結果であり、本作業の最終コミットの合否ではない。実行環境不足を理由に範囲を勝手に縮小したわけではなく、権限と変更境界を守り、台帳/独立レポートへ直接追跡可能な実行条件を残している。
