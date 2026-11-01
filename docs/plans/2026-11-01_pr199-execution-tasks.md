# PR #199：残タスク・優先順位・定期実行の作業手順

このファイルを**残タスク・作業優先順位・引継ぎ状態の正本**とする。目的・変更許可・完了基準は[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)に従う。分析の個別根拠は[分析台帳](../../training/ai-assisted-qa-course/coverage/supported-behaviors.json)と[分析レポート](../reports/2026-10-30_pr199-supported-behavior-analysis.md)、製品問題と既存差分の根拠は[製品改善レポート](../reports/pr199-product-improvements.md)に記録する。PR本文は要約に限り、このファイルと同じ残タスク一覧を重複して保守しない。

## 毎時0分・15分・30分・45分の実行手順

1. **最新を読む**：PR #199の現在HEAD/base、最新CI、未解決レビューThread、本ファイル、直前の作業と関連正本を確認する。記載済みSHA・件数・成功結果を無条件に採用しない。
2. **競合を避ける**：他の定期実行が同じファイルや課題を変更中なら重複作業を行わず、別の独立タスクを選ぶ。独立タスクも安全に選べなければ変更せず結果を報告する。GitHub上のHEADと対象ファイルを**書き込み直前にも再取得**する。古い内容の上書き、非fast-forward、force pushをしない。チェックと書込みは完全な排他制御ではないため、競合を検知したら再取得してやり直す。
3. **1回の作業を選ぶ**：下記の「次に着手できる作業」を上から確認し、権限内で完了条件に直接進む**まとまった作業1件**を選ぶ。実行回数を満たすためだけの文書同期、重複テスト、無意味なコミットはしない。検証だけを行う回も認める。
4. **実施・検証する**：現HEADのCIが失敗なら根本原因を優先し、既存の変更禁止境界を守る。フォーマッター・lint・関連テストを必要な範囲で確認する。実行中のCIがある場合、完了を確認せず次のpushで繰り返しキャンセルしない。
5. **引き継ぐ**：実際の差分と証拠だけを本ファイルの状態・次の作業へ反映する。個別の根拠は既存台帳・レポートに記録し、PR本文には最新HEAD、進捗、CIの実結果、主要な保留/承認待ち、次の対応と本ファイルのリンクを簡潔に反映する。push後にHEADを再照合する。未完了なら全4タスクを稼働し続け、全受入完了を実証できた場合のみ各定期タスクは**自分自身**を停止する。

**作業選択の判断**：最新HEADの必須CIが失敗した場合はP0の修正を先に行う。CIが実行中なら結果を待つ間、独立した分析・調査を進めてもよいが、完了前の連続pushで検証を無効化しない。P1はリスクが高く、かつ証拠と権限が揃った項目を先に進める。承認待ちは勝手に実行せず、他の対応可能項目へ移る。P2でもマージ前必須の未決があるため、最終段階まで放置しない。

## 現在状態（2026-11-01の確認に基づく、毎回再集計）

- PR #199はOPEN。直近の確認HEADは `e6d3fa3ba601350f0cf37b52e3d49a7a0b9c89fd`。これは固定の作業対象SHAではない。
- Scenario Shopの基本分析は**79/188操作**、残**109操作**、非default状態は**18/20**（残2）。188は漏れ・重複の最終監査前の暫定分母。分析済みは製品仕様適合や実Web/Native Run PASSではない。
- M00〜M10（11モジュール・51学習目標）の教材・演習・評価・知識グラフは配置済み。教材内容全量、独立AI評価、実行環境での受入は未完了。
- 既存製品差分19ファイルの全追加hunkは静的監査済み。処理方針・実回帰・必要な承認が一部未完。
- Web CIの現在HEAD結果は毎回取得する。最後に確認した進行中のRunは[41259179775](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41259179775)。前HEADの成功・失敗を最新HEADへ流用しない。
- Mobile App CIのPR自動トリガーは**一時停止中・未受入**。マージ前の復元と最終HEADでの必須job成功が必要。未解決レビューThreadは直近の確認で0件。

## 次に着手できる作業（優先順）

### P0：現HEADのWeb CI・レビューで確認された失敗

- **状態**：実行結果を毎回再取得。直前HEADでは学習用契約テストのPrettier違反があり、次HEADで修正検証中。
- **次の作業**：最新HEADのCIログを確認し、学習用コード・文書の原因なら修正して必要なローカル/CI検証を行う。製品SUT/製品テストの変更が必要なら根拠と影響を報告し承認を待つ。
- **完了条件**：同一の最新HEADでStyle Quality、Code Quality、contracts、関連E2E、verify、validateなど全必須Web CI jobが成功。skipped/cancelledや旧HEADの成功を流用しない。
- **証拠**：[PR Checks](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199/checks)。

### P1：全サポート動作の基本分析と分母監査

- **状態**：79/188操作、残109。分類率100%は基本分析率100%を意味しない。分母188は暫定。
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

### P1：学習用公開Template・本人Privateリポジトリ・2コアCodespaces

- **状態**：**BLOCKED（公開先、権限、費用・支払主体の明示承認待ち）**。
- **次の作業**：承認を要しない範囲で、`training/course-sync/manifest.json`、固定SHA、公開物/Secret除外、`course:sync`・`course:load`・非破壊再ロード、配布対象/依存を検証。承認後のみ公開Template作成、本人所有のPrivate repoと新規2コアCodespaceでShopの8082 Serve/Seed/Reset/Playwright実Runを確認。
- **完了条件**：公開範囲・本人の支払主体/無料枠・権限が承認済みで、**実Template由来**の2コア環境におけるload/Serve/Reset/Playwright/結果保全を実証。ローカルfixtureのPASSは代替不可。
- **正本**：[配布Plan](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[Target](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)。

### P2（マージ前必須）：既存製品差分19ファイルの処理方針

- **状態**：製品実装9、正式仕様1、既存製品テスト9の全追加hunkを静的監査済み。由来/回帰/処理方針は一部未完。低在庫UI等の一部は製品用別PR分離の**方針のみ**決定済み。
- **次の作業**：変更の意味単位で導入commit、呼出し元/先、認証・金額・データ整合と実回帰、教材目的との必要性を整理し、証拠が十分なら「PRに残す／別PRへ分離／取り消す」の方針を決定。承認が要る実際の移設/revert/別PR作成は行わず、判断待ちを明示。
- **完了条件**：全差分の扱いと必要な承認を明確化。承認待ちを残したままマージ準備完了にしない。
- **正本**：[製品改善レポート](../reports/pr199-product-improvements.md)。

### P0（マージ準備時）：Mobile App CIの復元と最終検証

- **状態**：`.github/workflows/native-ci.yml`のPR自動トリガーを一時停止中。未受入。
- **着手条件**：他のマージ前必須条件の完了が見込め、最終検証を開始する段階。
- **次の作業**：PR branchの`on.pull_request`を**元通り復元**して通常pushし、最終HEADのAndroid/Native Static/iOS/Maestro等の必須jobを実行。CI中の競合pushを避ける。
- **完了条件**：復元後の最終HEADでMobile・Webの必須CIが成功。一時停止workflowのままmainへ取り込まない。

## 変更境界と最終完了条件

- **変更可能**：教材、演習、評価、学習用fixture/専用Seed・Playwright/契約テスト、分析台帳、調査レポート、Plan、知識グラフ、学習用配布/検証ツールと必要な学習用CI。
- **無断変更禁止**：既存製品本体（`src/presentation/**`、`src/application/**`、`src/infrastructure/**`、`app/**`等）、正式製品仕様、既存Seed/Reset、既存製品テスト・workflow、過去の製品差分のrevert/移設/別PR化。既存`docs/spec/**`の意味不変なMarkdown書式修正のみ、CI/lint等で必要性を確認した場合の限定例外。
- **明示承認待ち**：外部Public Template公開・作成先/権限/費用、本人の課金を伴う環境、製品差分の移設/revert/別PR作成、製品の機能・正式仕様変更、新規Issue。merge、force push、branch削除、PR/Issue close、release/tagは禁止。
- **全タスク完了の判定**：確定分母の全サポート動作が証拠付き基本分析100%、非default状態全件の判断、教材/51学習目標/Skill・正式AI評価の検証、実Template→Private 2コアCodespaces→Playwrightとモデル校正の技術受入、製品差分処理と必要な承認、最新HEADのWeb/Mobile CI・レビュー条件がすべて満たされた場合のみ。実受講者の学習効果検証はこのPR完了条件の外。
