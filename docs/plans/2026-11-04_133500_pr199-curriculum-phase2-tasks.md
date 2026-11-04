# PR #199 Phase 2（M05〜M07）実技タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業開始時に`AGENTS.md`、[並行分担Plan](./2026-11-04_pr199-parallel-branches.md)、このリスト、最新HEAD/CI、関連仕様・テストを確認する。
>
> **完了条件**：各チェック項目の仕様/教材/コードの整合と必要な実行証拠（対象HEAD、実行環境・コマンド・結果・Run）を得たときだけ`[x]`へ変更する。未実行/BLOCKEDは理由・再開条件を記録して未完のまま保持。製品SUT・正式製品仕様・既存Seed/Reset・製品用テスト/workflow、および他ブランチの所有ファイルは変更しない。変更依頼はPR上で#199へ引継ぐ。個別PRは#199をbaseとし、許可なくマージしない。

## 変更範囲

15学習目標。編集できるのは`docs/curriculum/ai-assisted-qa/modules/M05..M07/**`、対応する`training/ai-assisted-qa-course/exercises/Mxx/**`・`states/Mxx/**`・`docs/curriculum/ai-assisted-qa/quizzes/M05.json`〜`M07.json`・学習専用Playwright資産、固有の契約テストと証拠レポート。製品用E2E・本番用Seed/Reset・`assessment/**`・共通manifest・知識グラフは対象外。

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
- [x] `M07-03`：Retry/Timeout延長ではなく原因の切分けを先に判断する基準を確認
- [ ] `M07-04`：AIパッチの採否・最小修正・修正前後の別Runと仕様上の期待結果維持を実証
- [ ] `M07-05`：重複specと保守変更からPage Object/標準fixtureを採否し、小規模な実装・import・前後Runと保守効果を示す

## 学習用実行・横断的な確認

- [ ] M05 P03の型検査が誤型で非0/修正で0を返し、P05の2明細Locator参照specが専用Configで実Chromium実行できることを固定HEAD/ログで確認
- [ ] M06の`CASE-CART-004`（削除）・`CASE-CART-005`（数量1→2、再読込保持）を新specの独立Caseとして初回・再実行それぞれ2件以上の実Runで確認。Web数量UIはselectであり、Web数量0変更を架空の操作にしない
- [ ] M07保守前の2件以上・保守後の独立3件以上を別Runで実証。学習者固有の変更と公開参照spec・完成状態の用途を分ける
- [ ] 8082配布Shop Serve/Reset、report/Trace/fixtureの独立性・新旧テスト混入を検証。配布元ファイル/manifestの不備は配布ブランチへ証拠を引継ぐ
- [x] 全15目標の教本・P01〜P06・提出欄・start/end・評価基準・復習先を個別照合。M07正式AI評価は評価ブランチへ引継ぎ、本人Private 2コアCodespaces実行は決定済みの後続時期に回す
- [ ] 対象テスト、Playwrightの実Run、CI、証拠/残リスクを固定HEADで報告。実行環境がない項目は未実行として残す

## クイズ・理解事項・自習・Phase間引継ぎ（補完）

- [x] `docs/curriculum/ai-assisted-qa/quizzes/M05.json`〜`M07.json`の設問/正答/誤答理由/復習先を15目標と理解事項に照合。コードを読む・書く・実Runする技能を定義問題やAI自己報告だけで達成扱いにしない
- [x] `knowledge-graph.json`のM05〜M07の理解事項ごとに、前提の飛躍、教材節、`can_do`、実技の観測、評価基準を意味的に確認。未レビューの`draft_requires_content_review`は承認済みに変更せず、必要な関係/ノード更新を#199に引継ぐ
- [ ] M04→M05の確定Case・初期Role/State/Data・BR/ACと、M07→M08の本人spec・Config・Reset・Trace/Run/成果物のID/revisionを実ファイルで照合し、別の公開開始サンプルを本人の過去修了証拠とみなさない
- [ ] 通常のOpenCodeの段階ヒント・失敗後の復習が本人の実装/診断を奪わないか確認。Phase 2のspec、Trace、Run記録をGit/PRなしで安全にエクスポートする手順を教材に記載・検証。共通配布機構は#218、正式評価時の再実行は#217へ引継ぐ

## 2026-11-04 静的確認の証拠・未完了理由

- [PR #215 Phase 2受入記録](../reports/2026-11-04_pr215-phase2-acceptance.md)に、固定HEAD `268d06236e5b068b924f1d71e296a6ad6b0bb4f1`で照合した内容、各ファイルのBlob SHA、未実行の条件、共有領域への引継ぎを記録した。
- 上記でチェックしたのはM07-03の**判断基準**とM05〜M07の**クイズ内容照合**だけであり、実RunやPhase 2の学習到達・正式AI評価をPASSとしたものではない。
- 8082 Chromium、M05型検査、M06 004/005 initial/repeat、M07 before/after、配布ShopやGit不要の成果物保全は未実施。実際のRun IDとreport等が揃うまで該当チェックを保持する。

## 2026-11-04 追加レビュー（PR #215継続）

- 知識ノード30件の教材参照、`can_do`、採点基準、クイズ・実技、前提関係を[Phase 2受入記録](../reports/2026-11-04_pr215-phase2-acceptance.md)へ記録。Graph本体の変更要否は#199の[引継ぎコメント](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6629751490)へ記載。`draft_requires_content_review`は変更していない。
- M05 P03の型エラー/修正の`tsc`結果は隔離コンテナによる補助検証であり、本人Codespaces・専用Config・Chromiumの実Runを示さないため関連する学習目標・横断実行項目は保留。
- **Progress: 12% (3/25)**。実行環境に依存する項目と全15目標の完全受入は未完了。

## 2026-11-04 15目標の個別照合

- [Phase 2受入レポート](../reports/2026-11-04_pr215-phase2-acceptance.md)に15目標ごとの教材、P01〜P06、提出、start/end、公開評価基準、クイズ復習先を固定HEAD `d260c1a29f98b4684780dbe9340e18f6ed058f7e`で照合した結果を記録。
- 人間の正式なPhase修了、実Chromium・TypeScript受講者実行、配布後の本人証拠は未確認。共有参照とM07正式AI評価は#199/#217の境界内で調停。
- **Progress: 16% (4/25)**。
