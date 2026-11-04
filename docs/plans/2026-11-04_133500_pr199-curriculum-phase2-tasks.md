# PR #199 Phase 2（M05〜M07）実技タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、このリスト、最新HEAD/CI、関連仕様・テストを確認する。
>
> **完了条件**：各チェック項目の仕様/教材/コードの整合と必要な実行証拠（対象HEAD、実行環境・コマンド・結果・Run）を得たときだけ`[x]`へ変更する。未実行/BLOCKEDは理由・再開条件を記録して未完のまま保持。製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow、および他ブランチの所有ファイルは変更しない。変更依頼はPR上で#199へ引継ぐ。個別PRは#199をbaseとし、許可なくマージしない。

## 変更範囲

15学習目標。編集できるのは`docs/curriculum/ai-assisted-qa/modules/M05..M07/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・学習専用Playwright資産、固有の契約テストと証拠レポート。製品用E2E・本番用Seed/Reset・`assessment/**`・共通manifest・知識グラフは対象外。

## M05：TypeScript・Playwright基礎（5目標）

- [ ] `M05-01`：Node/pnpm/TypeScriptの`await`・型・関数、最小specの実行と1箇所の安全な変更→再実行を演習/提出/採点基準へ整合
- [ ] `M05-02`：Role/Name/Label/test IDによるLocatorと一意性、複数Cart明細を全体/商品単位でscopeする区別を実画面で確認
- [ ] `M05-03`：可視/クリック成功とCart更新・DB保存の保証範囲の差、弱いAssertionを業務結果で補強する判断を確認
- [ ] `M05-04`：Web-first assertion・auto wait・根拠のない`waitForTimeout`と実エラーの区別を演習/負例へ反映
- [ ] `M05-05`：新課程専用Config、8081/8082/6080、指定spec、Trace/JSON report・receiptの実行経路と保存先を一致させる

## M06：別条件からのWeb E2E実装（5目標）

- [ ] `M06-01`：固定3 CaseのTODO補完と、新しい未演習の別Caseからの独立spec作成を分けて受入。正式BR/AC→Case→Locator→Assertion→実Runを追跡
- [ ] `M06-02`：学習用ResetとBrowser Context、単独Run・同じ条件の再実行、実行順・残存IndexedDBによる誤判定防止を実証
- [ ] `M06-03`：無関係でもPASSするAssertionを正本の業務結果へ修正し、変更前後の失敗/成功を示す
- [ ] `M06-04`：CLI/対象spec・Case・Run ID/結果・Trace/reportを同じ実行に紐付け、旧Runの流用とファイル名だけの一致を拒否
- [ ] `M06-05`：未実行・環境BLOCKED・FAIL・PASSを、終了コードとログ・実操作に基づき区別する

## M07：失敗解析・保守設計・Phase 2総合演習（5目標）

- [ ] `M07-01`：Test/Product/Environment/Flakyの原因候補、仕様/初期状態/ログでの切分けと追加確認を整理
- [ ] `M07-02`：Trace・スクリーンショット・標準出力・reportから失敗操作/Assertionを特定する別Run演習を検証
- [ ] `M07-03`：Retry/Timeout延長ではなく原因の切分けを先に判断する基準を確認
- [ ] `M07-04`：AIパッチの採否・最小修正・修正前後の別Runと仕様上の期待結果維持を実証
- [ ] `M07-05`：重複specと保守変更からPage Object/標準fixtureを採否し、小規模な実装・import・前後Runと保守効果を示す

## 学習用実行・横断的な確認

- [ ] M05 P03の型検査が誤型で非0/修正で0を返し、P05の2明細Locator参照specが専用Configで実Chromium実行できることを固定HEAD/ログで確認
- [ ] M06の`CASE-CART-004`（削除）・`CASE-CART-005`（数量1→2、再読込保持）を新specの独立Caseとして初回・再実行それぞれ2件以上の実Runで確認。Web数量UIはselectであり、Web数量0変更を架空の操作にしない
- [ ] M07保守前の2件以上・保守後の独立3件以上を別Runで実証。学習者固有の変更と公開参照spec・完成状態の用途を分ける
- [ ] 8082配布Shop Serve/Reset、report/Trace/fixtureの独立性・新旧テスト混入を検証。配布元ファイル/manifestの不備は配布ブランチへ証拠を引継ぐ
- [ ] 全15目標の教本・P01〜P06・提出欄・start/end・評価基準・復習先を個別照合。M07正式AI評価は評価ブランチへ引継ぎ、本人Private 2コアCodespaces実行は決定済みの後続時期に回す
- [ ] 対象テスト、Playwrightの実Run、CI、証拠/残リスクを固定HEADで報告。実行環境がない項目は未実行として残す
