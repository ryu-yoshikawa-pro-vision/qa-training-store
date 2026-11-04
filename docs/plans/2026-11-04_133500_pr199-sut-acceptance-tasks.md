# PR #219 Scenario Shop検証準備・証拠引継ぎタスクリスト

対象：[#219](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/219)。作業ブランチは`work/pr199-sut-acceptance`、統合先は[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時にルートの`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、対象HEAD、既存テストとCIを確認する。

**責任変更（2026-11-05）**：旧リストの21項目中14項目は部分検証・引継ぎとして実施済み。旧未完7項目に含まれる**最終実受入**は、#213〜#219の作業内容と必要な#210の製品修正を統合した後、**#199の最後に実施する**。旧未完7項目の対応先は末尾に記す。#219には代わりに、AIエージェントがこのブランチで実施できる準備・検証・引継ぎ7項目を設ける。以後の`14/21`は**新しい#219専用リストの進捗**であり、Scenario Shopの受入率を表さない。

## 担当と変更範囲

| 担当 | 実施・判断すること | このPRで行わないこと |
| --- | --- | --- |
| #219（AIエージェント） | 既存仕様・テストの調査、専用Integration/Component/Web E2E・契約テストの補完、実行可能なCI結果の確認、既存Artifactの照合、Case候補・部分証拠・欠落・再開手順の整理、#199への引継ぎ | 製品適合の最終判定、Android端末実行済みとの宣言、正式Case採否の独断決定、共有workflow・製品SUT・正式仕様の修正 |
| #213（分析担当） | 79要件、188操作＋20状態、Risk/TR/Conditionの分析と正式Case採否・IDの確定 | #219の実行証拠を、照合なしに全条件PASSとすること |
| #210（製品修正担当） | 確認された製品不具合の修正と修正HEADの提示 | #219で製品コードを代行修正すること |
| #199（統合・最終受入担当） | 共有CI/Artifact保存の調停、全PR統合後の最終HEADでWeb/Android/SQLiteを実証し、正式Case単位で最終受入・独立レビューを判定 | #219の部分Runや既知不具合再現成功を製品受入PASSへ換算すること |
| 権限のある端末実行者・レビュアー | #199の最終工程で必要な実機・エミュレータ操作、権限付き実行、独立判定に協力 | 実行していない内容を実施済みと記録すること |

Scenario Shopは読み取り専用SUTとし、`src/**`、`app/**`、`docs/spec/**`、既存Seed/Reset、既存製品テスト・共有workflowは変更しない。#219で変更できるのは専用テスト、専用証拠・調査レポートと本タスクリスト。共有変更は#199へ、製品修正は#210へ引き継ぐ。課金・外部公開・PRマージ・force push・branch削除は行わない。

## チェックと証拠の扱い

- #219の`[x]`は**担当範囲の準備・個別実行・分類・引継ぎが完了**したことだけを示す。製品の最終受入、208動作/79要件の全条件合格、Android/SQLite実証完了を意味しない。
- Caseには正式採用と候補を区別し、各々の対象SUT HEAD（#199と未マージ#210を区別）/テストHEAD、Role/Session、Platform、Seed/Reset/Clock、操作、期待/観測、DB前後、実行コマンド、Run/job/attempt、終了結果、保存済み証拠の実在を記録する。確認できない値は推測で埋めない。
- テストが成功しても、**既知の製品不具合を再現した結果は製品FAIL**、locatorやCI設定の失敗はTEST ERROR、端末やArtifactの未実施は未実行/BLOCKEDとして分ける。成功時のTrace/画像/動画が保存されていなければ「未保存」と書く。ログへ個人情報・Session ID・DB実値を出さない。
- 既存テストを再利用できる条件は再利用する。188操作＋20状態のすべてに新規E2Eを1本ずつ作らない。正式な採用・除外・保留の判断は#213、最終実受入は#199に残す。

## 実施済み：#219の部分検証と引継ぎ（14件）

- [x] #199の固定HEAD・仕様・対象Role/State/Data・既存Playwright/Maestro/Integration/Repository/Component test・固定Seed/Clock/Reset経路を調査した
- [x] 固定Seedの通常操作と、SUTから隔離した失敗注入・競合fixtureを専用テストで用意した
- [x] guest/customer/operator/adminとsuspended/withdrawnの権限、直URL、Role変更後Session・他人データの条件をWeb/テストで部分検証し、製品FAILを区別した
- [x] `SCREEN-ADMIN-USERS-A01-02`と`SCREEN-ADMIN-USER-DETAIL-A01-02/A01-03/A01-04/A02-01/A02-02/A02-03`の検索、Role/Rank/Status、自己・withdrawn拒否、stale CAS/Session/rollbackを独立Caseで検証した
- [x] 最後の管理者の2→1許可・自己変更拒否・actor失効/競合を分類し、成立不能な非self最後の管理者Caseを作為的にPASSにしなかった
- [x] `SCREEN-ADMIN-PRODUCTS-A01-02`の商品検索/フィルター/選択残留/一括更新・SKU0件価格を、仕様・Web・Repositoryで比較した
- [x] `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`の無条件0件/フィルター0件/Errorを分け、戻り・画面幅・a11yの個別Runを記録した
- [x] Cartの公開・Rank/Sale価格、stock0/1/5/6、購入上限、version、拒否後DB不変を専用Integration等で検証した
- [x] Checkoutの住所再開通知、Session、24h期限、stale Cart、モック決済・再試行・在庫競合を専用テスト/既存Runで検証し、誤復帰を製品FAILに分類した
- [x] Order/Shipment/Reviewの遷移、CAS、rollback、スナップショット、本人/別ユーザー拒否を専用Integrationで検証した
- [x] required Chromiumの既存CIと#219追加Caseの個別実行を追跡し、CI成功を全208動作受入済みと扱わなかった
- [x] 製品不具合、テスト不具合、未実証仮説を分け、#210と#213へ再現根拠・教材への影響を引き渡した
- [x] Web/Android/DBのRisk別部分証拠、実行不能条件・必要機材/権限・再開方法を専用レポートへ記録した
- [x] #213へ分析IDと固定Run/暫定Webキーの対応、不足根拠を引き渡し、製品修正前後のHEADを混同しなかった

## 未完了：#219で実施する準備・検証・引継ぎ（7件）

- [ ] **専用ファイルの品質ゲートを整える。** 最新HEADのStyle Qualityで失敗した`docs/reports/2026-11-04_pr219-analysis-case-run-handoff.md:116`のMD012など、#219所有ファイルに起因するlint/formatter/契約テストを修正し、固定HEAD・該当job・結果を記録する。共有既存テストのflakyは原因と再現Runを#199へ渡し、独断で編集しない。
- [ ] **分析台帳とCase候補を突き合わせる。** #213の79要件（直接参照のない29横断要件を含む）、188操作＋20状態、Risk/TR/Condition/Case候補、既存テストの実assertion/Role/State/Platformを照合。既存Case再利用・追加が必要・正式判断待ち・不要候補と根拠を列挙する。正式Case ID・採否は#213/#199の決定待ちとして明記する。
- [ ] **利用可能なCase実行証拠を完成させる。** #219の専用CSVと固定GitHub Run/job/attempt、実測Clock、SUT/test HEAD、期待/観測、DB前後の実行済みassertion、存在するArtifactだけを照合・追記する。欠落したRole/Session/Trace/画像/動画/Networkを「収集済み」にせず、#199での取得条件・再実行Caseを残す。
- [ ] **自動化できる境界Caseを再確認する。** Web/Component/Integration/Contractsの既存Caseで必要な拒否・失効・stale・競合・rollbackのassertionを照合し、不足を#219専用テストで補完する。固定HEADで実行可能なCI結果と既知製品FAIL/TEST ERROR/未実行を切り分ける。製品修正後の最終再実行は#199へ渡す。
- [ ] **Web視覚・a11yの事前比較を整理する。** 320/390/767/768/1023/1024/1440px、Empty/Loading/Error/Conflict、キーボード・Focus・axeと既存UI Review画像を照合。既存画像の差分と取得できない成功時Trace/PNG/動画/axe JSONを区別し、共有workflowでの保存方法・正式正本との最終判定条件を#199へ渡す。ここで視覚受入を確定しない。
- [ ] **Android/SQLiteの最終実行手順を用意する。** 既存Native/Component/Maestro/SQLite/Sessionのテストと`.github/workflows/native-ci.yml`を確認し、端末・SDK/ADB・実行権限・Seed/Reset・Navigation/停止/再開/Forbidden/戻る・前後snapshotの手順、期待結果、証拠保存先とBLOCKED理由を整理する。端末を実行できなければPASSにしない。共有workflowは変更しない。
- [ ] **#199への引継ぎと#219差分レビューを完了する。** 専有ファイルのみの変更、#199最新baseとの比較、関連CI、#210の修正要否と未マージHEAD、#213の採否待ち、失敗・BLOCKED・残リスク、#199最終実受入用のCase/Run/再実行手順を一つの参照先から追えるようにし、独立レビューを依頼する。レビュー未実施なら完了にしない。

## #199の最後に移した最終実受入（このリストでは完了チェックしない）

移管前の未完7項目は削除ではなく、[#199統合・横断受入タスクリスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/docs/plan-ai-agent-qa-curriculum-redesign/docs/plans/2026-11-04_143600_pr199-integration-acceptance-tasks.md)で判定する。以下は旧リストの番号と移管先の対応であり、#219の進捗分母に含めない。

| 旧番号 | #199の最終工程で判定する内容 |
| --- | --- |
| 2 | 正式採用Caseごとの最終HEAD、Role/Session、実操作、期待/観測、DB前後、Run/exit、保存済みTrace/動画/画像・Console/Networkの証拠 |
| 7 | 停止staffのForbidden戻りリンクとAndroid拒否文言・端末上の動作、Session/DB非変更 |
| 13 | Web全画面幅とEmpty/Loading/Error/Conflict、キーボード/Focus/a11y、正式画像との最終視覚比較 |
| 14 | Android実機または妥当なエミュレータのNavigation、停止/再開、Role/Session/SQLite/戻る、Maestro実Run |
| 15 | IndexedDB/Dexie・SQLite・Session・Order/Payment/Shipment/Historyの前後snapshot、失敗注入・rollback・機密非露出 |
| 19 | 正式採用Case全件の期待・観測・修正先・残リスクと保存証拠についての独立した最終レビュー |
| 20 | #213の正式BR/AC/Risk/TR/Condition/Case採否と採用Case ID、既存テスト、79要件・208動作の追跡および最終結果 |

#199の最終実受入では、**全個別PRの統合、必要な製品修正の反映/未反映の明示、共有workflow・必須CIの最終HEAD検証を先に行う**。FAIL/BLOCKED/未実行をPASSとして消さず、最終判断と未完条件を残す。#219のDraft解除やチェック完了だけでは#199の受入・マージを許可しない。
