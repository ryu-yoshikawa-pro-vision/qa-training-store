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

## PR #218から移管した未完了タスク（2026-11-05）

[PR #218の配布・安全性タスクリスト](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/work/pr199-distribution-security/docs/plans/2026-11-04_133500_pr199-distribution-security-tasks.md)にあった未完了6項目の責任を整理する。**以下6件はすべて未完了**。先頭1件はWeb生成物の受入部分のみを移管し、配布manifest/validator・配布固有契約テストの実装と確認は引き続き#218が担当する。残り5件は受入条件ごと#199へ移管する。既存の横断項目（公開Web、配布・個人データ保護、通常チューター、最終実受入）との関係を残すが、同じ実績を二重に完了計上しない。#218の過去のチェック済み15件はそのまま保持する。

- [ ] **#218から一部移管：生成Webの実ファイル依存閉包。** #199所有の`scripts/docs/build-ai-assisted-qa.ts`・Web Build生成物で、JSの画像URI12件に対応する実ファイルを`node_modules/.pnpm`を含まない安全な公開パスへ出力し、参照URIを一致させる。HTML `src/href/srcset`、CSS `url/@import`、JS静的/動的import・runtime assetまで、同一固定HEADの実Artifact・manifestで欠落/0 byte/禁止パス0を確認する。旧教材5ページとそのリンク12件も生成物から除外する。**出力側の不備を配布側ガードの緩和で回避しない**。#218は`training/course-sync/manifest.json`のallowlist、固定Skill・SHA、生成物検証guardと契約テストを継続する。元タスク：#218「配布物の生成と固定SHA」先頭。
- [ ] **#218から移管：固定commitからの実Shop全量同期。** 生成Webの修正後、cleanな同一commitで`pnpm run build:web`→`course:sync`→`verify-distribution`→再同期・SHA/manifest/Skill照合を実施し、正常・失敗時の実行コマンド、exit、Run ID、Artifact、差分と最終HEADを残す。fixtureだけの同期PASSやWeb CIの単純なbuild成功で代替しない。本人のPrivate Codespaces実配布はこのリスト末尾の最終実受入として別判定。元タスク：#218「配布物の生成と固定SHA」2番目。
- [ ] **#218から移管：公開禁止資料・Secret・個人データの全成果物除外。** Web Build/Template/配布Artifactから`assessment/reference-solutions/**`、`scoring-tests/**`、`completed-states/**`、完成spec、正式workflow、旧教材、個人成績、`.env`/credential/secretが除外されていることを実ファイルと負例で確認。旧教材HTML5件とそのリンク12件は生成元を修正してから再検査する。既知Secretの正規表現0件だけで個人情報やバイナリの無害化を保証しない。#218で既に実装したTemplate/manifest拒否テストは再作成せず、統合最終HEADで受け入れる。元タスク：#218「配布除外・法的条件・安全性」先頭。
- [ ] **#218から移管：通常AIへの送信・保存境界。** 通常チューターの外部AI送信対象を本人回答・関連教材節・必要なRun要約に限定して明示する。送信前にToken/Secret・個人情報・無関係ファイルを拒否/除外し、ファイル別・総量・モデル入力のサイズ上限と負例を設ける。OpenCodeの読取許可・通常会話のGit外保存/保持先・復元/削除の説明を実装と一致させる。正式AI評価側の送信・権限・履歴は#217と境界を突合し、#217所有コードは直接重複実装しない。元タスク：#218「配布除外・法的条件・安全性」外部AI項目。
- [ ] **#218から移管：公開WebとTemplateの版不一致表示・受講者向け受入。** Web/Templateの同一Markdown・クイズJSONとrevisionの一致を維持し、WebでGit commitの`source_sha`（40桁）と教材内容SHA-256 revision（64桁）を混同せず提示する。異版時には原因・再生成/再読込方法を表示し、旧回答を無断流用・個人評価履歴を上書きしない。公開Webの一問ずつのクイズ操作・キーボード/アクセシビリティ・共通生成処理を#199のWeb受入で検証する。#219の製品画面受入とは分離する。#218で完了した**静的な35/35教材版照合と異版BLOCKED契約**は再実装しない。元タスク：#218「Web・AIチューター・成果物保全との接続」Web項目。
- [ ] **#218から移管：通常OpenCodeチューターと独立正式評価の分離。** 無料モデルの明示選択・Secret/Agent権限、段階ヒント・別条件・復習入力と、M04/M07/M10の独立正式AI評価の送信内容・権限・保存履歴/再開を、配布ファイル・公開設定・契約/負例テストで検証する。通常会話のSecret/PII・サイズ保護は直前の送信境界タスクと一緒に実装してよいが、両受入条件は個別に判定する。**実モデル認証・実料金・実対話は本人の最終実受入**へ残し、モック成功でPASSにしない。元タスク：#218同節のOpenCode項目。

既存の#199横断チェックに含まれる条件も、上記の担当変更で消去しない。**開始順**はWebの生成不備修正→実Shop全量同期/配布除外→Web版表示と通常AI送信/チューター境界→同一最終HEADのCI・最終実受入。#199の他の進行中作業・製品SUT変更禁止・マージ承認境界は変更しない。根拠：[PR #218監査レポート](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/blob/work/pr199-distribution-security/docs/reports/2026-11-05_pr218-distribution-audit.md)、[Web生成不備の引継ぎ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6657664676)。

## 個別PRの統合と重複管理

- [x] #213〜#219すべての最新HEAD/差分/チェック項目/未確認/BLOCKED/外部依存を確認。受入完了した範囲を#199へ統合し、各PRの未解決条件をこのリストで調停。**マージは個別の明示承認後のみ**。
- [ ] `package.json`、lockfile、`scripts/training/ai-assisted-qa-course.mjs`、共有`tests/contracts/ai-assisted-qa-curriculum.test.ts`・`ai-assisted-qa-practical-exercises.test.mjs`、共通設計Planなどを複数PRから同時編集しない。所有PRから変更目的と検証条件を受けて一か所で調停。
- [x] 旧課程`docs/curriculum/test-automation/**`、既存Training / 既存製品workflowと新課程の物理的な分離を最終差分で確認。#210との製品修正の混入・重複も確認。

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
  - **PR #217から移管・未完了（M00 P04）**：[#214](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/214) の `training/ai-assisted-qa-course/exercises/M00/exercise.md` にある架空誤回答（タブ閉鎖によるCodespace停止・Remoteへの自動反映）を、#217の `assessment/scoring-tests/M00.json` の `M00-CR-03` と同一統合HEADで照合する。学習者へ架空回答が提示され、実AIの応答とは別に本人が独立訂正し、指定2資料の原文見出し・出典を提出できることを確認する。不足時はLevel 2にしない。根拠：[移管記録](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6657600739)。
- [ ] M04→M05に分析・Case・BR/AC・初期データ、M07→M08に実Run済みspec・Config・Reset・結果が、同一ID/revisionで渡ることを検証。M02→M03、M05→M06、M09→M10も担当PRの証拠と最終配布条件で再照合。先行修了を公開基準入力から架空に復元しない。
- [ ] 通常OpenCode学習の段階的ヒント・別条件の課題・復習・再開と、M04/M07/M10の独立AI正式採点が混ざらないことを#214〜#218の引継ぎと通し検証で確認。講師の個別承認や有料モデルへの自動移行を要求しない。

## 配布・評価・実行証拠の相互受入

- [ ] #217の評価器が必要なM06/M07の新しいPlaywright Runを限定実行/取得して証拠を照合し、M10では本人の実GitHub APIから最新PR HEAD・Run/attempt・Check・Artifact・対象specを検証することを受け入れる。単なる自己申告/旧Run/作成済みログのハッシュ一致では合格にしない。
  - **PR #217から移管・未完了（M05 P05）**：`assessment/scoring-tests/M05.json` の `execution_evidence.required_runs` と共有 `scripts/training/validate-ai-assisted-qa.ts` の固定期待値を同時に更新し、`p05-cart-locator.spec.ts|main`（1件以上PASS・専用receipt・対象spec/SHA一致）の必須性を保つ。その後、`scripts/training/ai-assisted-qa-run-evidence.mjs` のM05専用Run注入を削除する。重複・欠落Runを拒否し、`pnpm run test:contracts`、`pnpm run validate`、production buildを最終統合HEADのCIで確認する。根拠：[移管記録](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199#issuecomment-6657600739)。
- [ ] #218配布manifest・固定Shop・Skill-local依存・`course:load/check`・正式採点資料の固定SHA取得・非破壊性が、#214〜#217の教材/状態/評価器と結合して機能するか検証。Phase 1/2の成果物・評価履歴をGit/PR不要で安全にエクスポート・保全できる条件を確認。
- [ ] #213の79要件・188操作・20状態の確定分母/基本分析率と、#219が準備したCase候補・既存テスト・固定Run/未実行・既知製品FAILを突合。正式Caseの採否・IDと最終Web/Android/DB実Runは本リスト末尾の最終実受入で判定する。#210の製品修正は未マージなら#199に反映済みと扱わず、対象commitを記録。
- [ ] 第三者由来Skill/依存物のライセンス・NOTICE、Secret/個人データ非漏洩、静的Web/Template/Artifactの除外を#218の証拠で最終確認。出典未確認・実機未実施をPASSへ変更しない。

## 最終CI・レビュー・完了

- [x] すべての作業PR統合後に`.github/workflows/native-ci.yml`の`pull_request`トリガーを本来の条件で復元し、既存の必須Mobile CIを再開。既存ジョブ/権限/コストに無断の仕様変更を加えない。
- [ ] 同じ**最終HEAD**でWebの必要なStyle/Type/Contracts/Unit/Integration/Component/required Chromium E2E/Build等と、Android/iOSの所定の必須Build・Static・Maestroなどを検証。成功・失敗・スキップ・未実行を分けて記録し、古いHEADを根拠にしない。
- [ ] 各個別PRと統合差分の独立レビューを行い、指摘の根拠・対応・再検証、要件の未決、公開前の権利とデータ保護、成果物の再現性を確認する。
- [ ] 残件・要承認・マージ後作業を区別して#199本文とPlanへ反映。全受入を満たすまで#199を完了・mainへマージしたと扱わない。

## 2026-11-07 子PR統合・配布契約修復・CI再開の確認

- **7PR統合と指摘の整理（完了）**：#213→#219→#218→#214→#217→#215→#216の全マージをGitHubで確認。すべて#199の履歴に含まれ、#199はOPEN、#210は独立・未マージ。#215のM07レビューは統合HEADのafter spec Blob `7a488032ae98efcbcf63fd867234fd7b44ee2613` と専用Chromium before 2/2・after 3/3のPASSを照合して解決。旧子PRの未実施本人受入は完了扱いにしない。
- **旧課程・SUTとの分離（完了）**：#199の差分419パス中、`docs/curriculum/test-automation/**`、`training/playwright/**`、`training/maestro/**`、製品SUT（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`src/domain/**`、`src/seeds/**`、`app/**`、`docs/spec/**`）の変更は0。新課程は`training/ai-assisted-qa-course/**`中心の別ディレクトリを使用する。別PR #210の修正は未採用。
- **配布と参考specの採用（静的確認）**：固定Skill manifestは105ファイル、取得元`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`を維持。M00/M05採点、M05専用P05 Run、M07参考spec、M10無効workflowを保持。配布全量同期、非公開素材・個人情報の実Artifact検査、本人環境の実Runは未完。
- **配布契約テスト修復（完了）**：統合後の[Web CI #42226444489](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42226444489)で、実コード中の文字列`"import"`を正規表現が誤認し、`tests/contracts/ai-assisted-qa-course-distribution.test.mjs`が1件FAIL。TypeScript ASTで実際のimport/export元とリテラル動的importだけを抽出するよう修正し、文字列・コメントの負例を追加した。
- **Web CI（コードHEADでPASS）**：`cd3491093199020f32a3eb0a39b038fd265bf808` の[Web CI #42252258802](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42252258802)はcompleted/success。Style/Code Quality、Vitest contracts（121ファイル・1,365 PASS、1 expected fail、15 skipped）、M06 fixed 3/3・initial 2/2・repeat 2/2、M07 before 2/2・after 3/3、必須Chromium、verify/validate、Previewを確認。CI成果と本人実学習・製品受入を混同しない。
- **Native CIトリガー（復元・起動確認）**：`.github/workflows/native-ci.yml`の`pull_request`を復元し、mainのBlob `4cfe49149152a2d05a031b92879c97591dc5bdb2` と一致。既存の`workflow_dispatch`・変更検知・全ジョブ・権限を維持。Mobile [CI #42252258966](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42252258966)のNative StaticはPASS、Android/iOS Buildはこの記録時点で進行中。最終成功・失敗・artifact・Maestroは未判定。**このPlanの変更によりHEADが進むため、最終HEADでの再検証は次の受入項目に残す。**
- **残件の境界**：最終HEADでのWeb/Mobile一式の同時合格、全Shop配布・除外・Revision・非破壊性、82理解事項の人間レビュー、79要件/188操作/20状態に対応する正式Case採否・Web/Android/DB前後、OpenCode実モデルと本人Private Codespaces、第三者素材の権利、独立レビューは未完。これらを静的テストや自動CIの成功だけで完了にしない。

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

- [ ] **#214 Phase 1の実動作（#214から移管）**：本人の個人用Private 2-core CodespacesでM00をロードし、別ファイルの編集・保存・再読込と差分・実行場所を確認する。編集済み`submission.md`の再ロード競合時は非0終了となり、前後のファイル内容が不変であることを保存証拠で確認する。Ports 6080のPrivate表示、支払者・利用枠・無料モデルの費用条件、SecretとAgent read/edit/command権限の許可・拒否を実画面で確認する。認証可能な通常OpenCodeで説明→段階ヒント→別条件→誤解別復習→再挑戦を行い、AI応答と本人の独立した判断、費用・権限・拒否時の挙動を記録する。独立M04正式評価の実受入は別項目で判定し、教材やCIの静的検証を本人実操作のPASSに換算しない
- [ ] **#214/#218 固定Skillの実行（#214から移管）**：固定`qa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324`を実学習環境に配布し、manifestで定義されたSkill-local `SKILL.md/references/assets/scripts`の実ファイル・entrypoint/import・Python 3.11とhelper実返却値を確認する。M02の`spec-analysis/test-analysis`でAuthority/Risk/Scopeと出典・source revisionを本人が採否し、同一入力をM03の`condition_structure(direct)`→技法runtime→`materialize_coverage(artifact)`→`case_structure`→`verify_runtime_evidence`へ通す。実行コマンド・exit・request/response JSON・`valid=true`・current fingerprint/structure state・固定SHAを保存し、参照欠落・旧fingerprint・不正Entity・`valid=false`等の負例拒否も確認する。未実行のsample/placeholderや終了コード0だけをPASSにしない。#218の配布manifest最終ファイル数と#214由来契約テストの整合は#199統合時に確認する
- [ ] **#215 Phase 2の実動作**：2コア学習環境で配布Shop/Seed/Reset/Playwrightを起動し、M05 TypeScript/Locator、M06独立spec・初回/再Run、M07 Trace/before-after/Page Object/fixtureを本人のCase・業務Assertion・Run証拠で判定
- [ ] **#216 Phase 3の実動作**：本人Private repoの費用/権限/対象specを明示確認し、安全なworkflowを本人が有効化したときに限り実PR head・Run/attempt・Check/Artifact・target SHAをGitHub APIで照合。M08〜M10は任意で、Phase 1/2の修了を変更しない
- [ ] **#217 OpenCode正式AI校正**：独立・最小権限の実モデルでM04/M07/M10を採点し、正答/誤答/別解/部分/旧Run/架空証拠/Prompt Injection/障害の校正結果と重大誤PASS 0件を確認。認証・無料モデル・料金・revisionが成立しなければBLOCKEDとし、モックCIだけで修了を出さない
- [ ] **#217/#218 個人データの実保全**：本人の提出Markdown/spec/Trace/Run・非公開評価履歴のGit/PR不要のエクスポート・復元・再ロード非破壊性を実確認。別モジュール/過去成果物の上書きやSecret送信を拒否
- [ ] **#218 配布・Web版の実照合**：最終統合SHAの11モジュール・22状態・Shop・固定Skill/manifestを実配布・ロードし、Web教材と配布版のrevision、不一致時の停止・公開評価資料/個人データ除外を確認。公開Webの全クイズ・画面幅・キーボード/a11y実操作は既存のWeb/クイズ最終チェックと合わせて確認
- [ ] **#218 権利・公開判断**：第三者Skill・素材の権利とNOTICEの一次資料を確認し、再配布許諾・費用/公開範囲の最終判断を実施。未確認の許諾や未実行の実受入は成功としない。Public Templateの実公開は#199マージ後に別途本人が行う

## 2026-11-06 Web生成・配布受入の部分検証

- 生成元修正は `scripts/docs/build-docs.ts` と `scripts/docs/repair-expo-router-web-assets.ts`、回帰テストは `tests/contracts/web-public-build.test.ts`。旧資料5ページの選別とリンク処理を生成前に修正し、Expo Router画像をライセンス確認の上で公開URIへ配置する。配布validatorや製品SUTは変更しない。
- 修正前：[Web CI #42148338991](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42148338991)、HEAD `76344d6530876e6eddae4bc5b0eba21374d14036`、production Artifact `13470714401`（312ファイル）。画像参照先の欠落12 URI、内部 `.pnpm` URI12、旧教材HTML5ページ・HTMLリンク12件。
- 修正後：[Web CI #42153712878](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42153712878)、生成修正commit `1a858a73fd8ec0a17f8ae966750e257a5c29fc6e`、production Artifact `13474021574`（320ファイル）。画像12/12実在・内部パス0、旧教材HTML/リンクとも0。HTMLローカル参照3,626件・CSS `url/@import` 12件の欠落0、空ファイル0。M00〜M10の教材/演習/クイズ各11件は維持。
- ただし#218の最終validator・manifestは別HEAD `17c0cf734727ad73e224e61752cf3d50423a5092` のまま。共有Web CIは#215が編集対象なので本件から変更していない。この作業環境には実リポジトリのclean checkout・`pnpm`・GitHub直接通信がなく、**同一修正後固定HEADでの実 `course:sync` → `verify-distribution` → 再同期は未実施**。#218の依存閉包・固定Skill・学習者の非破壊性・完成spec/個人情報の全除外はチェック不可。
- 生成物の対象パターン監査では禁止ファイルパス/既知Secret正規表現の一致0件。ただし未知の個人データ・第三者素材の権利許諾までの保証ではない。#218統合後のclean固定commitから実配布を行うまで、冒頭の移管3項目と横断受入項目は未チェックを維持する。
- 検査の詳細・環境制約・再実行方法：[公開Web・配布受入レポート](../reports/2026-11-06_pr199-web-distribution-audit.md)。最終HEADのCI・テスト結果は別途追記し、旧HEADの成功を流用しない。

## 2026-11-06 通常AI・M00/M05採点契約の修正と検証状況

- **状態：修正commitを通常push済み・技術受入未完。** PR #199のHEAD `9a5f2edca6ea5c0c675b25daae5834f5674d3209`へ12ファイルを反映。続くCIでStyle/Code Quality不備とテスト2件の失敗を確認したため、補正と最終HEAD再検証が必要。既存CIのCloudflare Pages Preview公開条件はそのままで、アクセス制御は未検証。
- 通常AI送信境界：`opencode mini`を直接対話できる起動経路から外し、各入力に`START`と`SEND`の本人確認、ファイル/質問/既存会話の検査を通す一回限りの`opencode run --standalone --pure`へ変更する案。公開配布manifestが持つ教材3件と、本人が指定した公開仕様最大1件だけ読取り、SHA-256・サイズ・禁止Path・Symlink・不正文字/PII/Secretを照合。workspaceや評価記録は自動読取しない。本人が`/excerpt`で選択した選択モジュールの学習者ファイル最大40行（8KiB）だけは、全ファイル検査と送信前再照合を通して送信可能。`/run UUID`で選択した既存Runはreceipt/report/SHA照合後の件数・結果・SHAのみ送信し、Trace/生reportは送らない。送信総量192KiB、質問8KiB、単独参照元64KiB。実OpenCode V2 2.0.22の権限・更新停止・履歴・認証・費用は未実行。
- 通常会話と正式評価の分離：固定モデル/agent、deny-allの`permissions`、孤立した一時HOME/XDG・`:memory:` DBを設定し、通常の会話はCLI実行中のメモリ内の直近4問答だけ参照する案。正式評価の採点・記録に書込む処理は追加しない。OpenCode本体またはProviderの実履歴・保持・削除は未検証。
- M00 P04：#214 HEAD `65640a02ac8429a812a9e88d5d952fc9fc94752e` の架空誤回答演習と#217 HEAD `44afe46fe2d53ec4f1f7d94f671a07d9e3621c3e` の`M00-CR-03`における別証拠・Pass/Reject条件を、#199統合先の二つの対象ファイルだけに取り込む案。実AIが正答しても架空誤回答を本人が訂正・根拠2資料を独立提示しない限りLevel 2にしない。
- M05 P05：既存2本の`product-link.spec.ts` before/afterを維持し、本人作成`p05-cart-locator.spec.ts` main・1件以上PASSを`M05.json`・共有`validate-ai-assisted-qa.ts`・許可spec・P05手順で一致させる案。既存receipt/Run・SHA・report照合は維持し、M06/M07は変更しない。
- #217にはM05専用`requiredRuns`追加注入が残っている。このブランチは未統合なので、**#217の元コードを変更・mergeしていない**。今後の承認済み統合時に注入を削除しないと重複する。評価器全体の統合・実校正・本人実Runは未完。
- **初回CIは不合格**：[Web CI #42165721629](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42165721629)のStyle QualityはPrettier 7ファイル違反、Code Qualityは新規テストの`Buffer`未importで失敗。後続診断CI #42166091628の契約テストは1,109 PASS・2 FAIL（公開ファイルのSHA検査優先と抜粋range正規表現）、1 expected fail・15 skip。この不備を修正し、公開教材中の例示連絡先/`.env`表記を送信前省略する回帰テストを追加。最終HEADの全CIが成功するまでは未完了。固定OpenCode 2.0.22の実CLI認可・保存先/削除、正式校正は引き続き未検証。
- [ ] **通常AIの送信・保存保護の受入**：モデルへ送られる最終payload・プロセス未起動の拒否動作・OpenCode V2の権限・ログ/セッション保存条件を実ランタイムで検証した上でチェック。
- [ ] **通常チューターと正式評価の分離の受入**：外部プロセス・設定継承・非公開履歴/Phase stateの不変、再開/削除・本人認証環境を検証した上でチェック。
- [ ] **M00 P04とM05 P05の最終統合受入**：#214/#217の対象契約整合、#215教材、固定SHAのreceipt/Run、M06/M07非回帰、最終HEADのCIを同一環境で検証した上で既存51目標・証拠受入のチェックに一括反映。独立した完了実績として二重計上しない。
