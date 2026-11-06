# PR #219 統合前の確認とCase証拠照合（2026-11-06）

## 固定HEADと対象範囲

- #213: c6806d074aed8bf045f17af8d0da92a13a8bb505 / #219: f07cb3c8333d3909537287b9e7e8afd44fa107fc（変更前）
- #199: 157d88ef78d4e96fd8229a6a852b3f24c540a8e0 / #210: 4a53efbcf65ce7f5227d742e4c9d49a918e703f6。いずれもOPEN、未マージ。
- 本確認はGitHub上の実コード・CSV・既存Web CI/Run/Artifactの再照合。新たなブラウザ実操作・Android端末Run・SQLite実機検証は実施していない。

## 専用テストのassertionと仕様差

| 要件・対象 | 実際に確認した専用テスト | 製品判定／#210依存 |
| --- | --- | --- |
| BR-ADMINCAT-001/002、AC-ADMINCAT-001/002、管理SKU検索と有効SKU0件 | tests/integration/pr219-admin-product-query.test.ts:90,99 はSKU検索0件・Infinity/-Infinityをassert | 既知製品FAIL再現。#210の管理在庫available>=6修正とは別。両不具合の修正差分なし |
| 同、管理商品page/選択残留 | e2e/web/pr219-cross-role-lifecycle.spec.ts:383,544 は正常期待＋test.fail | 製品FAIL。期待失敗の緑を製品PASSにしない。#210該当修正差分なし |
| BR-ADMINUSER-001/AC-ADMINUSER-001、actor権限失効 | tests/integration/pr219-actor-revocation.test.ts:97,123 は降格・停止されたactorの不正更新成功を再現 | 製品FAIL再現。#210はtransaction内再認可を追加。修正HEADで拒否コードとUser/Session不変を直接回帰する |
| ROLE-ACCESS/UI-ERROR、停止staff Forbidden | tests/component/pr219-forbidden-route.test.tsx:54、Web E2E :924 は戻りリンク循環を再現 | 製品FAIL再現。IndexedDB23表digest不変は当該assertionのみ。Native Component成功を実端末PASSにしない |
| BR-CHECKOUT-002/AC-CHECKOUT-002、stale Cart | Web E2E :433 は誤った/checkout/payment復帰、:442 は拒否後DB digest不変、:480 は7幅/axe/キーボードのみ | 製品FAIL再現。#210に/cartへ戻す修正あり、統合後の直接回帰が必要 |
| Role/Session、version CAS、Cart/Checkout/Order/Payment/Shipment/Review rollback | tests/integration/pr219-admin-user-acceptance、pr219-cart-boundaries、pr219-checkout-boundaries、pr219-isolated-fixtures、pr219-order-review-boundaries | 既存fixtureと該当assertionだけ検証済み。正式全Case・端末SQLiteは未受入 |
| Empty/Loading/Error/Conflict | tests/component/pr219-storefront-states と Web E2E :607,704,797,850など | 部分assertionのみ。画面正本・成功時画像/Trace/axe JSONの永続証拠はない |

**今回の修正**：Web証拠CSVのPR219-WEB-017（1履歴）とPR219-WEB-024（3履歴）のcase_resultを「製品FAIL」で始まる分類へ統一。他の期待・観測、SHA、Run/job、時刻、Artifactの各列は維持した。契約テストは既知不具合の全対象キー017/018/019/024とKNOWN DEFECT REPROについて、説明欄ではなくcase_resultの製品FAIL判定を必須にした。製品コードとテストの期待assertionは弱めていない。

## #213の分析・正式Case候補

- #213 supported-behaviors.jsonの最新Blob ef2f50fd65e481ca90dc64da6f88934511c9eebeを実再集計。172画面操作、16独立Use Case操作、20非default状態＝208動作。全208動作・79要件がanalyzed。直接参照要件50、横断29。Use Caseメソッド76。
- 横断29件（Native4、権限7、状態遷移10、UI2、サポート範囲6）と#219横断CSVの代表Behavior・既存テスト・候補キーを全件照合、不一致0。候補あり10件、直接一致なし19件、重複込み43参照。既存テストはそのassertionのみ再利用。不足Role/State/Platform/Seed/実観測のみ追加候補。Native管理・Guest Checkout・iOS実機など正式対象外を新規Caseにしない。
- Web証拠が208動作へ直接関連するのは11動作。残197動作は既存テスト/横断契約/不足Case候補として照合対象であり、197件未テスト確定や197件新規E2E義務ではない。
- PR219-WEB-001〜027は暫定証拠キー。正式採用/不要/保留・最終ID/製品適合は#199の統合工程で決定。基本分析100%と製品適合100%を混同しない。

## Web50履歴・8 RunのGitHub API照合

| Run | 履歴行 | cross-role job／結果 | workflow結果 |
| --- | ---: | --- | --- |
| 41798882293 | 17 | 126470034417 failure | failure |
| 41811366480 | 22 | 126512596197 success | success |
| 41821726873 | 2 | 126547309356 success | failure |
| 41824802868 | 1 | 126557496126 success | failure |
| 41826786410 | 3 | 126564385617 success | success |
| 41832718832 | 3 | 126584626212 success | cancelled |
| 41841987928 | 1 | 126617054710 success | success |
| 41848289866 | 1 | 126638216102 success | success |

- 全8 RunでHEAD・attempt=1・job ID/結果・workflow結果・Artifactを実取得し、CSV50行との不一致0。全履歴は旧SUT SHA 46cd014ec8e9bbeb4fb0a9aa3631c6befb9f272f に対する部分証拠。
- 失敗Run 41798882293のcross-role Artifact 13306602054は存在する。他7 Runの成功時cross-role専用Artifactは未保存。UI Review画像は別jobであり成功Case画像ではない。Trace・動画・axe JSON・Network詳細・DB全表snapshotを保存済み扱いしない。IndexedDB23表digest assertionとsnapshot実物を区別する。Clockは実測3履歴とSeed由来期待Clockを分離。

## 差分・CI・レビュー

- #219と#199の共通祖先166412cf402f07ed3b4229eb6b3aeb6b5dd5cadfから分岐。#219既存変更34ファイルは専用テスト・専用CSV/報告・Run記録・専用タスクリスト。SUT/正式仕様/Seed/Reset/既存製品テスト/共有workflowに変更なし。
- #219変更前HEAD f07cb3cのWeb CI #42003538347 はcompleted/success、29ジョブ中27 success・2 skipped。Style/Code、Contracts、Integration、Component、Chromium required/cross-role、verify、validateすべてsuccess。#213 HEAD c6806d0のWeb CI #42015249698もsuccess。
- #219既存CodeRabbit3スレッドは全て解決済み。#199での正式採用Case独立レビューとは区別。#210 HEAD 4a53efbのWeb CI 41862790003とMobile CI 41862790087はfailureで、修正実装＝製品受入ではない。

## #199へ残す最終実受入

1. #213 Risk/TR/Condition/Case採否を確定し、採用CaseのID、最終SUT/Test SHA、Role/Session/Platform、Seed/Reset/実測Clock、操作・期待・観測、DB/Session前後、コマンド/exit、Run/job/attempt、保存Artifact、PASS/FAIL/BLOCKEDを関連付ける。
2. #210のSKU/0件価格、管理商品page/選択、actor失効、Checkout誤復帰、停止staff Forbiddenについて修正済・未修正・未統合を分ける。採用Caseを阻害する不具合に限り依存を明示し、修正後に直接回帰。#210は#219統合の無条件の前提としない。
3. Web 320/390/767/768/1023/1024/1440px、Empty/Loading/Error/Conflict、Keyboard/Focus/axeと正式画像の差分を確認。UI Reviewの1440px Empty高さ29px・Select配置差は未判定。成功時のTrace/画像/動画/axe JSON・Console/Network・匿名化DB前後保存とArtifact確認は#199共有workflowで行う。
4. Android実機/エミュレータでNavigation、停止・再開、Role/Session、Forbidden戻り、Maestro実Run、SQLite transaction/rollback、Cart/Checkout/Order/Payment/Shipment/Review前後を検証。端末/OS/アプリSHA、画像/動画/Logcat、Runを紐づけ。端末/SDK/権限不足はBLOCKEDと再開条件を記録。
5. 全PR統合後の同一最終HEADの必須Web/Mobile CI・独立レビューで製品FAIL、TEST ERROR、未実行、証拠不足、修正先、残リスク、再実行結果を確認。#219自身のreview解決だけで最終受入完了としない。共有E2E strict locator flakyは#199へ移管。

**制限**：今回はNode/pnpmのローカル実行環境とAndroid端末を使えない。変更後HEADに対応する新しいCIはpush後に確認。既存CIのdeploy-previewは通常push時に自動実行され得るが本PRで変更しない。
