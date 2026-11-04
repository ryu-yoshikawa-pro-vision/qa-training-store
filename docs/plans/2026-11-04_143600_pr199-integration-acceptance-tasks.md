# PR #199 統合・横断受入タスクリスト

対象PR：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。作業ブランチは`docs/plan-ai-agent-qa-curriculum-redesign`。個別PR #213〜#219の専用タスクリストと[分担Plan](./2026-11-04_pr199-parallel-branches.md)を参照する。**このファイルは#199本体だけで編集する**。以前の共通逐次Planの時刻別キューや当時のHEAD/進捗を現行のタスクとして流用しない。

## 個別PRの作業完了と実受入の扱い（2026-11-05）

個別#213〜#219は**GitHub接続エージェントができる調査・教材/コード修正・契約/負例テスト・既存GitHub Actionsでの検証・固定SHAの証拠整理**を担当する。本人のPrivate Codespaces・OpenCode認証済み実モデル・Private GitHub repo・料金/権限の判断、実機/ブラウザ・個人成果物操作、第三者再配布権利の最終判断は**#199の最後の実受入**として扱う。CIでテストを実行した証拠は保存するが、実利用者の学習・実受入のPASSへ自動変換しない。

個別PRのタスクリストのチェック済み項目は当該PRのコード/教材/自動テストの進捗として引き継ぎ、#199実受入が終わるまでチェックを取り消す必要はない。実受入のためのfixture、実行手順・期待結果・必要な権限/費用・対象SHA・未実行理由は、各PRの成果物から受領する。個別PRの実行可能なCI/契約テストの修正を#199へ先送りしない。

## 作業境界と完了判定

- このリストは個別PRの作業を重複実装するためではなく、複数PR間に残る**共有実装・意味的な対応・最終検証**を受け入れるためのもの。
- [ ] の完了には対象の最終HEAD、参照した仕様/ファイル、実行テスト・CI Run/証拠・結果を記録する。内容レビュー、構造検証、実モデル採点、実Web/Android、製品適合を別々に判定する。
- `src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`、正式製品仕様、既存Seed/Reset・製品用テストは読み取り専用。製品修正は#210に任せる。#213の分析台帳と#219の動的証拠を混同しない。
- Public Templateの実公開は#199マージ後の本人作業。Private repo/2コアCodespaces実受入は他の全作業完了後の本人作業で、マージ前必須ゲートに戻さない。未実行をPASSとは記録しない。実受講者の習熟試行も後続工程。
- 本リストの作成・PRのDraft解除・CI通過はmerge許可と同義ではない。#199をmainへマージしない。

## 個別PRの統合と重複管理

- [ ] #213〜#219すべての最新HEAD/差分/チェック項目/未確認/BLOCKED/外部依存を確認。受入完了した範囲を#199へ統合し、各PRの未解決条件をこのリストで調停。**マージは個別の明示承認後のみ**。
- [ ] `package.json`、lockfile、`scripts/training/ai-assisted-qa-course.mjs`、共有`tests/contracts/ai-assisted-qa-curriculum.test.ts`・`ai-assisted-qa-practical-exercises.test.mjs`、共通設計Planなどを複数PRから同時編集しない。所有PRから変更目的と検証条件を受けて一か所で調停。
- [ ] 旧課程`docs/curriculum/test-automation/**`、既存Training / 既存製品workflowと新課程の物理的な分離を最終差分で確認。#210との製品修正の混入・重複も確認。

## 公開Webの教材閲覧・クイズ

所有者は#199統合先。#214〜#216は各モジュールの教材Markdown・クイズJSON内容を確認・修正し、Web共通処理は変更提案を#199へ渡す。基準：`docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md`。

- [ ] 既存`scripts/docs/build-docs.ts`→`scripts/docs/build-ai-assisted-qa.ts`で公開学習入口・M00〜M10の11教材・クイズが一つの正本Markdown/JSONから生成されることを確認。入口、目標、前提、本文、コード/演習、前後移動、復習、公開仕様リンク、旧課程のURL非回帰を受け入れる。
- [ ] 一問表示→選択→前/次→未回答拒否→全問後の採点/選択肢解説/誤答別復習→再挑戦、0問/不正ID/欠落選択肢・リンクの拒否、読み込み失敗時の再読込を検証。既存`e2e/web/ai-assisted-qa-course.spec.ts`と`tests/contracts/ai-assisted-qa-curriculum.test.ts`を優先し、不足する負例だけ追加。
- [ ] 同一ブラウザの版付き`localStorage`による途中保存とrevision変更後の旧回答非流用を検証。Webの自己確認は正式Phase合格を変更せず、Codespaces上の個人成績を送信・上書きしない。Webと配布教材のソース版不一致は明示し、無断同期しない。
- [ ] Desktop/スマートフォン/タブレット、キーボード/フォーカス/画面読み上げ、直URL、XSS/HTML出力・Secret/採点完成資料の不混入、公開Build/Smoke/旧Webの回帰を検証。**#219の製品UI受入とは別**。

## 知識グラフ・51目標・教材の意味的な整合

基準：`docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md`、`..._learning-map.md`、`..._progression.md`、`docs/curriculum/ai-assisted-qa/knowledge-graph.json`。現行の82理解ノードは`draft_requires_content_review`であり、機械的なID一致だけで承認済みにしない。

- [ ] #214〜#216から各モジュールの理解事項（現行82件）のレビュー結果を受領し、意味・粒度・重複・前提順序・説明節・適用実技・クイズの観測点と評価基準を確認。人間レビュー未実施は承認済みと偽らず、開発時の内容/AI校正証拠と区別。
- [ ] `knowledge-graph.json`と`scripts/training/knowledge-graph.mjs`を統合先で検証・必要に応じ更新。既存`validate`、`table`、`impact --changed-files <path-list-file>`で全51目標・理解事項・教材・クイズ/実技・Phase採点・22開始/終了状態の参照、未登録変更、削除/移動、仕様/Skill改訂時の影響を検査。既存機能と同じ実装を増やさない。
- [ ] 51目標の「説明→例→誘導→別条件→提出証拠→Level 2判定→復習先」をモジュール横断で全量照合し、`table`の出力と実ファイルを比較。Web確認クイズの正解のみで独立した実技や本人判断を認定しない。
- [ ] M04→M05に分析・Case・BR/AC・初期データ、M07→M08に実Run済みspec・Config・Reset・結果が、同一ID/revisionで渡ることを検証。M02→M03、M05→M06、M09→M10も担当PRの証拠と最終配布条件で再照合。先行修了を公開基準入力から架空に復元しない。
- [ ] 通常OpenCode学習の段階的ヒント・別条件の課題・復習・再開と、M04/M07/M10の独立AI正式採点が混ざらないことを#214〜#218の引継ぎと通し検証で確認。講師の個別承認や有料モデルへの自動移行を要求しない。

## 配布・評価・実行証拠の相互受入

- [ ] #217の評価器が必要なM06/M07の新しいPlaywright Runを限定実行/取得して証拠を照合し、M10では本人の実GitHub APIから最新PR HEAD・Run/attempt・Check・Artifact・対象specを検証することを受け入れる。単なる自己申告/旧Run/作成済みログのハッシュ一致では合格にしない。
- [ ] #218配布manifest・固定Shop・Skill-local依存・`course:load/check`・正式採点資料の固定SHA取得・非破壊性が、#214〜#217の教材/状態/評価器と結合して機能するか検証。Phase 1/2の成果物・評価履歴をGit/PR不要で安全にエクスポート・保全できる条件を確認。
- [ ] #213の79要件・188操作・20状態の確定分母/基本分析率と、#219が準備したCase候補・既存テスト・固定Run/未実行・既知製品FAILを突合。正式Caseの採否・IDと最終Web/Android/DB実Runは本リスト末尾の最終実受入で判定する。#210の製品修正は未マージなら#199に反映済みと扱わず、対象commitを記録。
- [ ] 第三者由来Skill/依存物のライセンス・NOTICE、Secret/個人データ非漏洩、静的Web/Template/Artifactの除外を#218の証拠で最終確認。出典未確認・実機未実施をPASSへ変更しない。

## 最終CI・レビュー・完了

- [ ] すべての作業PR統合後に`.github/workflows/native-ci.yml`の`pull_request`トリガーを本来の条件で復元し、既存の必須Mobile CIを再開。既存ジョブ/権限/コストに無断の仕様変更を加えない。
- [ ] 同じ**最終HEAD**でWebの必要なStyle/Type/Contracts/Unit/Integration/Component/required Chromium E2E/Build等と、Android/iOSの所定の必須Build・Static・Maestroなどを検証。成功・失敗・スキップ・未実行を分けて記録し、古いHEADを根拠にしない。
- [ ] 各個別PRと統合差分の独立レビューを行い、指摘の根拠・対応・再検証、要件の未決、公開前の権利とデータ保護、成果物の再現性を確認する。
- [ ] 残件・要承認・マージ後作業を区別して#199本文とPlanへ反映。全受入を満たすまで#199を完了・mainへマージしたと扱わない。

## Scenario Shopの最終実受入（#199の最後に実施）

[#219専用タスクリスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/work/pr199-sut-acceptance/docs/plans/2026-11-04_133500_pr199-sut-acceptance-tasks.md)から、旧未完7項目の**実受入責任**を引き継ぐ。#219の14/21件などはテスト準備・部分証拠の進捗であり、本節の受入率ではない。

**実施時点**：#213〜#219を必要な範囲で統合し、#210の製品修正について反映済み・未反映を確定し、共有workflowの調停と**同じ最終HEAD**の必須CI/独立したPR差分レビューを終えた後。必要な実機/エミュレータ・SDK・権限と成功時Artifact保存経路を用意する。#219で追加したTest/Componentや旧SUTの過去Runだけを根拠に受入しない。

**判定責任**：#199統合・最終受入担当が正式採用CaseごとにPASS/FAIL/BLOCKED/未実行/TEST ERRORを記録し、端末操作・権限付き実行・独立レビューは実施可能な担当者が行う。#213のCase採否が未確定なら未確定とし、製品不具合再現テストの成功、flakyのretry成功、既知の視覚差分、未保存Artifactを製品適合PASSにしない。Android実機を操作できない環境では実行したと報告しない。

- [ ] **旧#219-2：採用Caseの最終実行証拠。** #213が正式に採用した全Caseについて、正式Case ID、79要件・Behavior/Condition、SUT/test最終SHA、Role/Session、Platform、Seed/Reset/Clock、操作、期待/観測、DB前後、コマンド/exit、Run/job/attempt、実在するTrace/動画/画像・Console/Network/Reportを照合。保存・実行できなかった証拠は未取得理由と再開条件を記す。
- [ ] **旧#219-7：停止staffのForbidden。** Webの戻りリンク循環と権限・旧Session、Android上の拒否文言/戻る/Navigation、前後DB・Sessionの不変性を最終SUTで実証し、既知不具合の修正有無とFAILを判定する。
- [ ] **旧#219-13：Web視覚・a11y。** Desktop/Tablet/Mobileの320/390/767/768/1023/1024/1440px、Empty/Loading/Error/Conflict、Keyboard/Focus/axe、正式正本画像との比較を最終HEADの保存証拠で判定する。#219の過去UI Review画像差分や成功時Artifact未保存を未判定のまま残さない。
- [ ] **旧#219-14：Android端末実証。** 実機または妥当なエミュレータで、Maestro等によるNavigation、停止/再開、Role/Session、SQLite、Forbidden、戻る、画面状態のCaseを実行し、端末/OS/アプリSHA・Run/動画/画面と実行不可条件を記録する。Native Component jobの成功だけで代替しない。
- [ ] **旧#219-15：DBとrollback。** Web IndexedDB/DexieとAndroid SQLite、Session、Cart/Checkout/Order/Payment/Shipment/History等の採用Case別before/after、失敗注入/競合、transaction rollback、機密非露出を確認し、テーブル全数や実行範囲を偽らない。
- [ ] **旧#219-19：採用Caseの独立レビュー。** 正式Case全件の期待・観測・PASS/FAIL/BLOCKED・修正先（#210等）・証拠の実在と残リスクを、実施者とは独立に確認し、判断者・指摘・再検証結果を残す。レビュー未実施は完了にしない。
- [ ] **旧#219-20：正式採用Caseの対応・最終判定。** #213のBR/AC/Risk/TR/Condition/Case採否、79要件・188操作＋20状態・29横断要件、既存テストのassertionと新規Caseを突合し、採用/既存再利用/不要/保留を確定。208動作に一律新規E2Eを課さず、未受入条件と製品FAIL・環境BLOCKEDを含めて#199の最終受入結果へ反映する。

本節の実受入はScenario Shopの対象機能についての判定であり、本文冒頭に記載した**#199マージ後のPublic Template公開や本人Private repo/2コアCodespaces実受入**とは別工程。ここに未完了・FAIL・BLOCKEDが残る場合、全受入が完了したとは記載せず、#199の完了/マージ可否を別途判断する。

## 学習・評価・配布の最終実受入（#199の最後に実施）

この節は#214〜#218から引き継ぐ。上記のScenario Shop実受入と同じく、**個別PRの技術準備・共有ファイルの調停・最終HEADのCIが整った後**に実施する。Public Template公開は従来どおり#199マージ後の本人作業。Private 2コアCodespacesも他のPR作業完了後に本人が実施し、許可・環境が未準備ならBLOCKEDとして後続条件を残す。実受講者の学習効果試行は本PRの対象外。

- [ ] **#214 Phase 1の実動作**：本人がM00をロードしてファイル/差分/保存、Private Port、無料枠・Secret/Agent権限を確認。認証可能な通常OpenCodeで段階ヒント・別条件・復習・再挑戦を実行し、実本人判断とAI案の違いを記録
- [ ] **#214/#218 固定Skillの実行**：学習環境に固定`qa-workflow-skills`とPython helperをロードし、M02 Authority/Risk/ScopeからM03条件/技法runtime/coverage/Case/evidence gateまで実行。終了コードだけでなく結果JSON・`valid=true`・source SHA・参照不備拒否を確認
- [ ] **#215 Phase 2の実動作**：2コア学習環境で配布Shop/Seed/Reset/Playwrightを起動し、M05 TypeScript/Locator、M06独立spec・初回/再Run、M07 Trace/before-after/Page Object/fixtureを本人のCase・業務Assertion・Run証拠で判定
- [ ] **#216 Phase 3の実動作**：本人Private repoの費用/権限/対象specを明示確認し、安全なworkflowを本人が有効化したときに限り実PR head・Run/attempt・Check/Artifact・target SHAをGitHub APIで照合。M08〜M10は任意で、Phase 1/2の修了を変更しない
- [ ] **#217 OpenCode正式AI校正**：独立・最小権限の実モデルでM04/M07/M10を採点し、正答/誤答/別解/部分/旧Run/架空証拠/Prompt Injection/障害の校正結果と重大誤PASS 0件を確認。認証・無料モデル・料金・revisionが成立しなければBLOCKEDとし、モックCIだけで修了を出さない
- [ ] **#217/#218 個人データの実保全**：本人の提出Markdown/spec/Trace/Run・非公開評価履歴のGit/PR不要のエクスポート・復元・再ロード非破壊性を実確認。別モジュール/過去成果物の上書きやSecret送信を拒否
- [ ] **#218 配布・Web版の実照合**：最終統合SHAの11モジュール・22状態・Shop・固定Skill/manifestを実配布・ロードし、Web教材と配布版のrevision、不一致時の停止・公開評価資料/個人データ除外を確認。公開Webの全クイズ・画面幅・キーボード/a11y実操作は既存のWeb/クイズ最終チェックと合わせて確認
- [ ] **#218 権利・公開判断**：第三者Skill・素材の権利とNOTICEの一次資料を確認し、再配布許諾・費用/公開範囲の最終判断を実施。未確認の許諾や未実行の実受入は成功としない。Public Templateの実公開は#199マージ後に別途本人が行う
