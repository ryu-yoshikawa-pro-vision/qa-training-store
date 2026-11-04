# PR #199 Scenario Shop実動作・実行証拠タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## 対象と製品変更の禁止

Scenario Shopは読み取り専用のSUT。変更可能なのは**新規の学習/受入専用テスト、実行証拠と専用調査レポート**。既存の`src/**`、`app/**`、`docs/spec/**`、既存Seed/Reset・既存製品テスト/workflowを変更しない。再現した製品不具合は別PR #210への根拠として残し、`supported-behaviors.json`へは編集せず分析担当に渡す。

分析の分母188操作/20状態は、必要な動的検証を絞るための追跡対象であって、全208件に新しいPlaywrightテストを一律作る義務ではない。Risk/TR/Condition/Caseの採否と既存テストを先に確認する。

## 実行準備と証拠

- [x] #199最新HEAD・仕様・対象Role/State/Data・既存Playwright/Maestro/Integration/Repository/Component test・固定Seed/Clock/Reset経路を確認
- [ ] 各CaseのHEAD、platform、Role/Session、Seed/Reset/Clock、操作前後、期待・観測、終了コード、Trace/動画/画像・Console/Network/Reportの保存先を記録し、別Runの結果を流用しない
- [x] 固定Seedと通常操作で状態を再現し、失敗注入や競合fixtureをSUTと隔離した学習専用経路で用意。実装/既存Seedは改変しない

## 認証・認可・管理ユーザー

- [x] guest/customer/operator/adminとsuspended/withdrawnの権限マトリクス、直URL、Role変更後Session失効、他人データの非露出を実Webで確認
- [ ] `SCREEN-ADMIN-USERS-A01-02`と`SCREEN-ADMIN-USER-DETAIL-A01-02/A01-03/A01-04/A02-01/A02-02/A02-03`の検索/Role/Rank/Status変更・自己拒否・withdrawn拒否・stale CAS/Session/rollbackを新規独立Caseで検証
- [ ] 最後の管理者について2→1の許可、自己変更拒否とactor失効/並行競合を区別。通常の有効actor同士では成立しない非self最後のadmin拒否を作為的にPASSさせない
- [ ] `SCREEN-BOUNDARY-FORBIDDEN-A01-01`で停止staffの戻りリンク循環、Android拒否文言、実画面情報/DB非変更を確認

## 商品・Cart・Checkout・注文

- [ ] `SCREEN-ADMIN-PRODUCTS-A01-02`の商品検索/フィルター/選択残留/一括更新・SKU0件価格を、仕様と実UI・Repo検索結果で比較
- [ ] `SCREEN-STOREFRONT-PRODUCT-LIST-S-empty`で無条件0件/フィルター0件/エラーを分離し、Breadcrumbs/CTAの戻り・視覚/a11yを操作確認
- [ ] Cartの商品公開・Rank/Sale価格、stock0/1/5/6、上限縮小、数量変更とversion、拒否後のCart/Checkout不変を比較
- [ ] Checkoutの住所再開通知（同一/別Session・Reload/Reset）、24h期限・旧Cart/stale確認、4種類のモック決済、再試行/二重確定/在庫競合の前後を検証
- [ ] Order/Shipment/Reviewの状態遷移・version CAS・rollback、OrderItem/Address/Rank価格スナップショットの不変、本人/別ユーザー拒否を確認

## Web/Android・DB・UX

- [ ] Web Desktop/モバイル/タブレットの320/390/767/768/1023/1024境界、キーボード/フォーカス/a11y、Empty/Loading/Error/Conflictと正本画像を比較
- [ ] Android実機または妥当なエミュレータ上のNavigation、停止/再開、Role/Session/SQLite/戻る、画面とNative境界をMaestro等で検証。実行環境がなければ未実施理由を記録
- [ ] IndexedDB/Dexie・SQLite/Session・Order/Payment/Shipment/Historyなどの前後snapshot、失敗注入、transaction rollbackと機密非露出を確認
- [x] 既存CIのrequired Chromium E2E成功は維持しつつ、本タスクで追加のCaseを実行・追跡。CI成功を「全208動作の実受入済み」に換算しない
- [x] 仕様不適合候補・再現できた問題・未実証仮説を区別し、Case/証拠/教材阻害/重大度を分析担当とPR #210用に引継ぐ。変更した製品ファイルがないことを確認

## 受入と引継ぎ

- [x] 実Web/Android・DBの各Riskに対応する実行証拠と未受入条件をレポートで整理し、実行できないCaseの再開条件・機材・権限を記す
- [ ] すべての採用Caseの期待・観測・修正先が追跡できる状態で独立レビューへ渡す。製品側の修正が必要でも本PRで実装しない

## 採用Case単位の進捗・分析台帳との引継ぎ（補完）

- [ ] 正式BR/ACとRisk/TR/Condition/Caseの採否から、必要な実行Case IDと既存の該当テストを特定。**各採用Caseごと**にPlatform/Role/State/Seed/Reset、対象SUT commit（#199側または#210側を区別）、期待・観測・DB前後・Trace/Report・実行コマンド・結果（PASS/FAIL/BLOCKED/未実行）と残リスクを専用レポートで管理。全208動作に新規E2Eを1本ずつ作らない
- [ ] #213の基本分析台帳のIDと実RunのCase ID/対象HEADを紐付け、分析担当へ不足根拠を受け渡す。#210が未マージの製品修正を#199の合格証拠へ流用せず、再現済み不具合・仕様判断待ち・環境問題を分けて#210へ根拠を引継ぐ。製品SUT・正式仕様・既存Seed/Reset・分析台帳は変更しない
