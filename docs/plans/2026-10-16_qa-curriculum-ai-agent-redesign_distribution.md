# 新課程の教材同期・モジュール単位ロード設計

## 自習者のAIチューターと正式AI評価の配布・データ境界

公開Templateには、受講者の学習と演習に必要な手順、教材、許可されたAIチューター/独立評価の起動入口、提出・証拠の保存先を**manifest許可リストの必要範囲**で配布する。教材の公開模範・完成状態・校正用採点テストをTemplate/Webへ無差別にコピーしない。評価処理は既存の`ai-assisted-qa-course.mjs`を拡張し、`course:check`のファイル存在/参照の成功と本人の正式習熟判定を別にする。

既存`assessment/scoring-tests/Mxx.json`・ルーブリックは**publicな正本だが学習用配布から除外する**方針を維持する。AI正式採点は受講者のCodespaceで**配布元の固定source SHAに一致する公開評価正本を評価時に読取り専用で取得**し、取得元、対象module、SHA・ファイルハッシュ・schema・rubric/criterion IDが期待どおりか検証してから使用する。学習者が取得できない、取得版が合わない、参照・校正が不足する場合は判定不能/BLOCKEDとし、旧版やモデルの推測へfallbackしない。公開評価資料を配布除外することを秘密保持と説明しない。学習者個人の提出物やSecretを取得処理で公開しない。

本人の`workspace/Mxx/`に評価入力の固定スナップショット、必要な実行証拠、構造/Run検査結果、別セッションのAI判定、目標IDごとの理由・未達/復習・再評価履歴を非公開保存する。非公開repoの初期設定でも**個人データがリモートGitへ自動pushされない**ことを確認する。AI評価器が提出物の命令を実行しないよう、限定した読み取り権限・入力件数/サイズ・Secret除外・Schema検証を設ける。結果保存はコード側の検査を経て行い、AIに書込み/高権限ツールを与えない。Phase 1/2の本人保全はGit不要のエクスポートで成立する。

## 正式AI評価資料の取得・保存・情報送信契約（2026-10-26レビュー反映）

**評価資料の固定取得**：学習用の`course/distribution-manifest.json`（実配置名は既存loaderの配布manifest契約に合わせる）の`source_sha`（40桁commit SHA）を評価開始時に確定し、教材の版を勝手に更新しない。管理者の`course:sync`工程で、公開の`training/ai-assisted-qa-course/assessment/scoring-tests/M00.json`〜`M10.json`、3つのPhase rubric、必要な模範/仕様等について**許可された取得先のrepo・相対path・固定SHA・期待SHA-256**を算出した小さな**内容を含まない参照メタデータ**を生成し、manifestの管理下で学習者へ配布する。評価資料本文は既存の配布禁止リストを維持する。取得対象は選択したPhaseと採点に必要な最小範囲に限定する。

Node.jsの評価処理が`https://api.github.com/repos/ryu-yoshikawa-pro-vision/qa-training-store/contents/<固定path>?ref=<固定SHA>`または**同一commitのGitHub raw**からHTTPSで読み取り取得し、ホスト/所有者/repo/相対path/commit/内容SHA-256/Schema/module/criterion IDを参照メタデータと一致検証する。redirect、予期しないHTML応答、サイズ超過、symlink、認証を要求する予期しない取得先、未知pathは拒否する。配布元の信頼されたcommit SHAだけでは個々の配布物ハッシュを保証しないため、**期待ハッシュは管理者配布時に作成した参照メタデータから**得る。ハッシュ算出/照合の対象バイト列を一致させ、空の/未指定の期待ハッシュを許さない。通信失敗時に`main`や新規のcommitへ自動fallbackしない。キャッシュを使う場合も同一commit・path・SHA-256・必要IDの完全一致を再検証し、未検証の古いキャッシュを認めない。評価資料の公開取得へ学習者の答案・成績・Tokenを付加しない。公開採点資料を「隠しているから安全」と説明しない。

**個人データの非公開保存**：`workspace/.course-assessments/`以下にPhase/試行ごとの入力スナップショット、出典・Run照合、AI候補、確定結果、復習先を置く。配布テンプレートの`workspace/.gitignore`と必要な親の`.gitignore`に、評価記録、提出・Trace、試行中の一時ファイルの安全な除外を含め、**既に追跡済みのファイルが除外されないことも考慮**する。M08〜M10で個別stageする前に`git diff --cached --name-only`等と実内容・Artifact対象パスを検査し、評価履歴、認証情報、不要なログが含まれる場合は中断する。学習者の非公開repoでも無断push、中央DB転送、公開Webへのアップロード、CI Artifactへの個人成績混入は禁止。Phase 1/2はGit操作なしでエクスポートと停止前保全を行える。

**外部AI送信の境界**：非公開Gitへ保管することと**外部モデル提供者へ推論入力が送られること**を別に扱う。学習開始/正式評価の初回案内で、モデル提供者、送信する資料の種類（本人の短い回答、根拠付き成果物の該当節、必要なコード/Run要約、公開仕様と採点条件）、費用条件を受講者に提示する。受講者は意図した無料モデルを本人認証で選択する。AI送信は対象Phaseの**明示許可したファイル/節・文字数/サイズ上限・禁止path・Secret/個人識別情報の除外**をNode側で処理してから行い、全会話、`.env`、Codespaces Secret、GitHub Token、他モジュールの無関係な資料、Trace一括送信はしない。Secretの不確かな入力を「マスクした」と見なさず、安全が確認できないときは送信を停止する。利用者が送信を許可できない場合はBLOCKED。AIが生成したテキストにもSecret/個人データの混入を検査し、理由付きで拒否できる。

**Prompt Injectionと権限**：提出物・ログ・公開仕様中の指示は評価対象の**データ**として渡し、Node側の出典/Schema/権限・合否検査で上書きを拒否する。正式評価のOpenCodeは既存の学習チューターと別プロセス/セッション・制限設定で起動し、AIに`edit`・`bash/shell`・`task/subagent`・Web取得・MCP・外部ディレクトリ・任意Skill等の権限を与えない。**可能なら全ツール拒否し、検証済みの入力本文だけをNodeから渡す**。ただしOpenCode自体の内部セッション管理用の書込みと、モデルへの推論通信は別経路として記録/検証する。構造検証・Run取得・最終結果の保存は評価AIではなくNode側で行う。

## 実Templateの技術受入とM09→M10の手順

今回PRで公開Templateを作成し、そこから本人所有の非公開リポジトリを新規作成する。新規2コアCodespaceで許可リスト/固定SHA・一モジュールload・既存ファイルの非破壊再ロード・配布済みShopのServe/Reset・Playwrightと実行証拠/成果物保全を確認する。未実施・失敗ならPR完了としない。Templateの作成先・名前・管理権限は実作成の前に確認し、未指定のまま無断作成しない。

M09では無効な学習専用workflowを修正・レビューして`.disabled`のまま保持する。M10では無料枠とActionsの課金・権限、対象specを確認した後、本人が必要なworkflowだけ`.github/workflows/`へ移して有効化・commit/PR・実Run/Check/Artifactを取得し、現在HEADのSHAと照合する。終わったら不要なtrigger・Artifact・使用量を確認して必要に応じ安全に無効化する。旧/正式workflowは有効化しない。

## 今回PRでの公開Templateと個人非公開リポジトリ（2026-10-25）

今回のPR実装工程で管理者用の**公開Templateリポジトリを実際に作成**し、固定SHA・配布許可リスト・契約テストで整合を検証する。受講者は公開TemplateからGitHubのTemplate機能で本人所有の**非公開リポジトリ**を作る。公開forkから非公開へ変更する手順は採用しない。Template由来の新規2コアCodespaceで配布物照合・1モジュールload・Serve/Reset・Playwrightと結果保存まで技術受入する。個人のOpenCodeモデル認証は受講者初回確認、学習効果試行は今回PR外。

**Codespace停止はremoteリポジトリへの成果物保存ではない**。Phase 1/2はGit操作なしの安全なエクスポート、削除前の存在確認を行い、Phase 3では意図したspecだけGitで保全する。個人の無料枠のみを使い、非公開GitHub Actionsの実行分数・Artifact保存・課金停止条件を確認する。超過・権限不足はBLOCKEDとする。

## 目的と責務

**教材の正本は公開の`qa-training-store`に維持する。** 受講者がCodespacesで課題を進めるための**別の公開学習用リポジトリ**を用意し、配布対象だけを同期する。受講者自身がモジュールIDを指定して、そのモジュールの課題を作業領域へロードする。

処理の責務を分ける。

| 処理 | 実行者 | 入力 | 出力 | してはいけないこと |
| --- | --- | --- | --- | --- |
| **教材の同期** | 教材管理者 | `qa-training-store`の確定commit、配布許可リスト | 学習用リポジトリの教材・環境・ロードスクリプト | 無差別な全リポジトリ複製、解答・Secret・正式workflowの配布、無断push |
| **モジュールのロード** | **学習者本人** | 学習用リポジトリ内の配布済み教材、`M00`〜`M10`の1 ID | **指定した1モジュール**の作業フォルダ | 他モジュールの自動ロード、学習者の編集・過去成果物の上書き、同期先リポジトリの更新 |
| **課題の評価** | **学習者本人（AI/決定論的検査を起動）** | 非公開workspaceの提出・証拠、固定SHAの公開採点正本、実行検査結果 | M04/M07/M10の目標ID別Level 2正式判定、根拠/復習/再評価履歴 | 講師の承認待ち、AI自己申告/旧Runだけの合格、公開への個人成績送信、評価器の勝手な編集 |

### リポジトリ構成（実装案）

```text
qa-training-store/                                  # 公開・教材とScenario Shopの正本
  docs/curriculum/ai-assisted-qa/                    # 教材Markdown、クイズJSON（正答・解説込み）
  training/ai-assisted-qa-course/                    # 課題素材・未完成spec・公開の評価資料
    assessment/reference-solutions/M00.md ... M10.md
    assessment/playwright/M05/ ... M07/  # 評価用の完成spec
    assessment/scoring-tests/M00.json ... M10.json
    assessment/completed-states/M00.json ... M10.json
  training/course-sync/manifest.json                 # 配布対象を明示する許可リスト
  scripts/training/ai-assisted-qa-course.mjs           # 管理者sync・学習者load/checkの既存CLI

学習用リポジトリ/                                   # 新設予定・公開Template
  .devcontainer/                                     # Codespaces用
  course/modules/M00/ ... M10/                       # 配布済み教材（ロード前でも参照可能）
  course/manifest.json                               # 配布元commit・モジュール資産一覧
  scripts/training/ai-assisted-qa-course-core.mjs      # 既存の許可リスト同期・非破壊ロード
  runtime/ など                                      # Scenario Shopの実行に必要な配布物
  workspace/M00/ ...                                 # 学習者による作業成果（都度ロード）

```

模範解答・採点用テスト・完成状態データはpublicな`qa-training-store`へ通常ファイルとして保存し、固定source SHA・manifestと契約テストで評価資料をTemplate/Web Buildから除外する。学習者が正式評価する際は固定版の**公開正本を読取り専用取得し検証**するが、学習用に模範/校正例を自動埋め込まない。これは秘密保持ではない。個別の正式評価結果と再評価履歴は本人の非公開workspaceに保存し、中央の提出先・評価担当者の指定は不要。暗号化アーカイブや新DBは作らない。

## 知識グラフとの境界

教材・理解事項・Skillの変更影響は[基準グラフ](../curriculum/ai-assisted-qa/README.md)で管理する。グラフは**学習用Templateへの配布許可リストではない**。`training/course-sync/manifest.json`が実際の同期範囲を決定する。

**基準グラフ全件や運用用CLIは学習者へ自動同期しない。** 必要な教材・モジュール向けの参照情報だけを管理者が許可リストへ明示する。Skillの正本は別リポジトリ`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`であり、ローダーが公開元の別Skillを自動収集しない。公開の模範・採点資料は評価資料ディレクトリに置き、グラフに本文を複製せず、学習者配布から除外する。

## 管理者による教材同期

実装予定のコマンド例：

```sh
pnpm course:sync --source-sha <40文字の確定SHA> --target ../ai-assisted-qa-learner
```

- `training/course-sync/manifest.json`を**配布許可リスト**の正本とする。共通の実行環境・依存ファイル、各モジュールの教材・課題・必要な仕様断片、ロード用スクリプトとその補助ファイルを**必要な範囲で明示**する。ファイル対応先とモジュール帰属を追える構造にする。配布元のcommit SHAを記録する。
- 同期処理は**実在する固定SHAの内容**を対象とし、意図しない未commit変更を混ぜない。存在しないファイル・意図しない配布範囲・禁止パス・シンボリックリンクによる領域逸脱を検出した場合は停止する。
- 学習者配布から明示的に除外するもの：`training/ai-assisted-qa-course/assessment/**`。模範解答、評価用完成Playwright spec、採点用テスト、完成状態を含む。この配布除外は資料を秘密にする仕組みではない。その他、旧教材の完成済み回答や不要な完成spec、`.env`、認証情報、`.git/`、開発用の不要なworkflow、ビルド成果物、`node_modules/`、元リポジトリのPlan全文も許可しない。
- **学習用のクイズJSONは問題・正答・公開解説を一体で配布**し、Webまたは必要に応じてそこから生成する閲覧用Markdownから学べるようにする。一方、**実技・修了課題の完成解答は配布しない**。修了課題の模範・採点資料はpublicなGit上に置く一方、学習者向け配布物からは除外する。これは秘密保持ではなく、学習者の本人判断は評価時に初めて提示する条件で確認する。公開正答へのリンクを残す場合、AIが参照する可能性も明示する。
- 同期先への変更は管理者が差分を確認して適用する。**スクリプトはcommit・push・公開設定変更を自動で行わない**。同期先に存在する学習者の`workspace/`・提出物を削除・上書きしない。公開Templateの更新は管理者が行い、既存の受講者個人リポジトリへ自動同期しない。
- 正本に重複する教材を手で保守しない。`training/course-sync/`には設定・契約テスト等を置き、配布物はスクリプトで生成する。全面クローンや旧`prepare-training-copy.ts`の結果をそのまま公開しない。

## 公開Web閲覧と学習用Templateの分担

[Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)では、既存の`scripts/docs/build-docs.ts`を拡張し、**これから新規制作する新課程M00〜M10の教材閲覧・一問ずつのクイズ・全問終了後の結果と復習**を静的ページとして公開する。**新規制作する`docs/curriculum/ai-assisted-qa/`の教材MarkdownとクイズJSON**をWebと学習用Templateの共通正本とし、旧課程のMarkdownからの一括変換や手編集のWeb専用問題データは作らない。旧`/docs/curriculum/`の公開ページは維持する。

- **公開Web**：GitHubログイン前でも閲覧でき、モジュールの前提・目標・学習順序・実技への案内を表示する。管理用の既存`docs/curriculum/ai-assisted-qa/README.md`は受講者入口に流用せず、受講者用`start-here.md`から独立URLへ生成する。Webクイズの途中回答はローカルブラウザ内にのみ保存し、個人GitHubや公開リポジトリへ同期しない。
- **学習用Template**：CodespacesでAI/Skill・Playwrightの実技を行うため、**新規作成した新課程の**Markdown教材・モジュール別クイズJSON・開始入力・未完成課題と必要runtimeを許可リストに従って配布する。Webページや生成MarkdownをTemplateで手動編集する第二正本にしない。学習者による`course:load Mxx`の単位・上書き防止・自動進行禁止は維持する。
- **更新と整合**：Webは正本の公開ビルド時の教材版、Templateは管理者が同期した確定SHAに基づく。学習者はWebの最新版と本人がロードした教材の版を照合でき、**Webで再回答・再読込してもCodespaces側の過去成果物や修了評価を勝手に更新しない**。
- **評価資料の配布除外**：公開Git上の模範解答・採点用テスト・完成状態データをWebページ・ビルド出力・Webクイズ・学習者配布物へ含めない。これは秘密保持ではない。学習者個人の提出物・評価記録やSecretは公開ページ・Git・ビルド出力へ含めない。公開の学習用四択の解説は公開する。

## モジュール別の開始・終了状態と配布境界

- M00〜M10の**各モジュールの開始基準・終了基準とその実データ**を[状態設計](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)に従って作成する。`start.json`/`end.json`には前提・出力契約・学習者配布時に実行する照合条件だけを置き、完成回答・採点テストの内容は含めない。完成資料は公開の`assessment/`へ置く。
- **公開できる正しい開始入力は各モジュールの配布物`course/modules/Mxx/inputs/`に含める**。受講者が先行成果物を失っても、M03・M05・M08を含む後続学習を継続できる。入力は先行修了課題と異なる条件を持ち、完成状態資料は含めない。本人の先行成果物と同梱サンプルは**同じ入力契約に適合する別ID・revision**として管理し、入力元を記録する。
- 学習者は**指定した1モジュールだけ**をロードする。開始時に不足・版違い・不整合・未確認を示せる必要があるが、本人の成果物を自動で復旧・修復・上書きしない。**復旧スクリプトは作らない**。
- 終了基準の完全な成果物はpublicなGit上の通常ファイルとして公開し、学習者向け同期対象には開始条件、未完成課題、公開可能な評価観点だけを含める。配布除外は秘密保持ではない。模範解答と同じ文字列の有無だけで修了を判定しない。

## 学習者によるモジュール単位ロード

実装予定のコマンド例：

```sh
pnpm course:load M03
```

1. 初回のM00ロードには**モジュールとは別の受講開始ガイド**を用意し、ターミナルやpnpmの意味をまだ知らない受講者でも、画面上の位置を確認してコマンドをコピー・実行できるようにする。これは修了評価ではない。学習者は自分の学習用リポジトリの**2コアCodespace**で実行する。IDは`M00`〜`M10`のうち**1つだけ**を受け付け、フェーズ全体の一括ロード・自動進行は行わない。
2. ローダーは配布済みの`course/manifest.json`から**指定IDのファイルだけ**を読み、`workspace/M03/`など所定の作業場所に課題文、入力資料、未完成ファイル、テンプレートを準備する。共通ランタイムは起動環境の一部として別管理し、モジュールごとにコピーし直さない。
3. **以前のモジュールの本人成果物は維持**する。開始契約に適合する先行成果物があれば参照し、なければ**指定したモジュールに同梱された公開可能な正しい入力**を使えるようにする。先行修了課題の模範成果物をロード・自動複製せず、前モジュールも勝手にロードしない。どちらを使ったかを記録し、先行修了と混同しない。
4. 同じモジュールを再ロードしたとき、既存の編集済みファイルを**上書き・削除しない**。未変更のファイルはそのままにし、配布元と差分があれば**衝突箇所だけを報告して停止**する。**復元機能は実装しない**。コピー途中の失敗では配置済みファイルと未配置ファイルを明示し、上書きなしで再実行可能にする。
5. 配布版のsource SHA、モジュールID、ロード時刻（ローカルで得られる場合）、配置したファイル一覧と**先行本人成果物／モジュール同梱サンプルのどちらを入力に選んだか**を学習者側の記録へ残す。個人Secret・全AI会話・不要な認証情報は記録しない。
6. ローダーは自分のリポジトリ内の配布済みファイルだけを扱う。**Git認証・`clone`・APIアクセス・ネットワーク接続・PR作成・GitHub Actions実行をPhase 1/2のロード要件にしない**。
7. コマンドを手入力する操作は**学習者の意思決定**とし、AIエージェントが先回りして次のモジュールをロードすることを正式な導線・評価としない。

**注意：配布済みの`course/modules/`は、ロード前でも学習用リポジトリに存在する。ロードは作業開始と上書き防止の操作であり、AIから未ロード教材を秘密にするアクセス制御ではない。** 未ロード教材もAIが参照し得るため、隠す必要がある評価資料は**そもそも公開・配布しない**。

## M03の公開開始サンプルとSkillの配布

- **M03の`inputs/`**には、先行修了課題と条件が異なる**正しいM02相当の検証責務Markdown**、対応BR/AC・Role/State/Data・Risk・Scope・優先度、採用した正式仕様/Skill revisionを含める。Scopeは固定Skill上のMachine Entityではなく、意味・正式な出典・仕様revisionを持つ`SCOPE-...`参照である。**Authority/Product Riskの実際のEntityが必要な演習では、その固定commitの現行入力から再現できる資料・手順**を一緒に配布する。説明用の架空ID・空のEntity contentを真正な実行根拠として使用しない。
- **機械入力の準備**はM03の手順として、M02の検証責務から`test_requirements[]`と`test_conditions[]`の参照を対応付ける。配布する実行例は`condition_structure(direct)`から技法runtime、`materialize_coverage(artifact)`、`case_structure`まで必要な**Skill-local scripts・referencesと共有`runtime_contract.py`**が揃う構成にする。Skill正本と教材側の複製が版違いなら開始判定を通さない。
- **開始判定**では、検証責務・仕様BR/AC・Risk・Scope参照・Authorityの対応、必要な参照元とrevision、Skillと補助ファイルの存在を確認する。Authority/Risk Entityの実在・current性、Scope参照の意味・出典・revisionが不明な場合は`確認不能`または`不足・不整合`として扱い、**見かけ上の`ready`や終了コード0をPASSにしない**。
- **教材の公開範囲**は開始入力・未完成技法/Caseテンプレート・検証方法に限り、M03自身または先行フェーズの公開修了課題模範・採点用テストは学習者配布に含めない。追加の自動復旧や学習者の過去成果物の書換えは行わない。
- この条件は**M03の新課程入力による通し受入が成功して初めて充足**する。固定commitの既存CI成功や`SKILL.md`の存在をもってM03の配布・実行を検証済みと宣言しない。

## ロードの開始判定と教材revision

- `pnpm course:load Mxx`は、**学習者が指定した1モジュール**だけを配置し、配置後に公開の`start.json`と照合する。チェック結果は配布・構造の`ready`、`insufficient`、`mismatch`、`unverifiable`に分類し、項目・必要revision・使用する入力元を表示する。`ready`は必要ファイルと参照の一致を表すだけで、実行環境の利用可能性を保証しない。`pnpm course:check Mxx --state start|end`は実行環境の必須項目を`unverified`として併記し、Node.js/pnpm/Playwright/Seed/Reset等を実行したと誤認させない。**終了チェックの構造判定だけでLevel 2を認定しない**。
- コピー先を事前に検証し、対象外パスやシンボリックリンク、衝突を拒否する。複数ファイルのコピーに失敗したら**配布済みの内容を破壊せず、どこまで配置されたかを報告**する。同じsource SHAで再実行しても編集済みファイルを変更しないことを検証する。
- **配布用Template**は確定したmanifest・source SHAで管理者が更新する。GitHub Templateから作成した学習者個人リポジトリへ、その後の更新を自動反映しない。配布元revisionと、学習者が実際に受講しているrevisionを記録し、**受講中は無断更新しない**。更新時は教材・開始/終了状態・評価の差分を確認し、新版で学習を開始する時点から明示的に適用する。
- **Phase 1・2の提出物**は`workspace/Mxx/submission.md`（学習項目・仕様根拠・入力元・AIの採否・未確定事項）と必要な`evidence/`・コードを揃え、CodespacesからGitのcommitを要求せずにダウンロード・共有できる。**公開Git履歴へ個人の提出物を自動保存しない**。

## Scenario Shopを別リポジトリから利用する

Phase 2を成立させるには、管理者が製品リポジトリの固定SHAからScenario Shopをビルド・検証・同期し、学習用リポジトリのCodespacesからは**配布済み`course/shop/`を起動し、Seed/Resetを行ってPlaywrightを実行できること**が必要である。受講者側で製品のフルビルドを再実行しない。教材だけを同期しても不十分。

- `qa-training-store`にある製品・仕様・Seed/Resetを正本として維持する。配布先に入れる製品関連ファイルは**学習用ランタイムとして生成するコピー**であり、二重に開発・保守する正本にはしない。
- 同期許可リストへ、学習者のServe/Testに必要な依存・設定・事前生成した静的ファイル・Seed/Resetを、**実行可能な依存の閉包**として列挙する。Scenario ShopのBuildは管理者が固定SHAをCheckoutして行い、受講者へは検証済み静的出力を`course/shop/`へ配布する。既存`build:web`は画像/フォント準備・`expo export --platform web`・文書生成を含むため、受講者workflowで再実行しない。**`package.json`・lockfile・必要なruntime import先・public/assets・Serve設定・Seed/Resetの配布経路まで追跡**する。元リポジトリ全体のcloneや正式回帰spec・旧workflow・模範実装は配布しない。実在ファイル一覧は実装時の静的import/起動経路から確定し、manifestに追加した各パスの必要理由を記録する。
- **新課程専用Config**は既存の`PLAYWRIGHT_TEST_ROOT`を使い、Phase 2の`workspace/M05/`〜`M07/`内の指定specに加え、Phase 3用の本人M07 spec、`workspace/M08/public-sample/`・`workspace/M10/public-sample/`内のmodule-local公開fallbackと、開発者向けの`training/ai-assisted-qa-course/assessment/playwright/M05`〜`M07`だけを許可する。結果は`output/training/ai-assisted-qa/`に分離する。評価用specの許可はこの正本リポジトリ内の開発実行向けであり、Template/同期/ロード/Web Buildには含めない。任意path、M09その他のworkspace、`assessment/playwright`のM00〜M04/M08〜M10、旧`training/playwright`は許可しない。`course/shop/`または`.course/`が存在する環境ではdistribution manifest、22状態のsource SHA/revision、全配布ファイルのhash、Shopの不足・余剰・symlinkをテスト開始前に検証する。不一致時は失敗させ、manifestがない同期状態から製品フルBuildへ黙って切り替えない。Buildは管理者同期時だけ行い、Serveは既存の`scripts/serve-web-dist.ts`の安全なloopback起動を再利用する。**8082はテスト専用のlocalhost、8081は通常Web、6080はprivate noVNC**とし、不要な公開ポートを増やさない。
- 既存devcontainerの**Node 24のイメージとChromium導入処理**から必要な部分だけ再利用し、開発中に`package.json`・`pnpm-lock.yaml`・Playwright Configと配布ファイルの整合を静的/契約テストとCIで確認する。実際の2コアCodespaceでの初回導入・アプリ起動・Reset・E2E通し実行は今回PRの必須技術受入とする。未実施・不合格ならPRを完了しない。
- 公開Templateが元リポジトリのコードを含む以上、正式仕様・既存実装そのものは学習者とAIに見える。それでも**評価用の模範テストコード・完成した実技回答を入れない**ことで転記リスクを減らす。

## Phase 3の学習

M09では専用workflowを`.disabled`のままレビューし、M10で初めて対象spec・権限・費用を確認して必要な専用workflowだけを`.github/workflows/`へ手動で有効化する。

Phase 3ではignore・差分・importを確認し、M07本人specと必要なPage Object/fixture/helper/設定の依存閉包のみを個別stageする。`workspace/M07/`の一括追加は禁止し、ログ/Trace/Secret/個人記録を含めない。クリーンcheckout後のimport解決と実行を確認し、CIの`PLAYWRIGHT_TEST_ROOT`を対象specに合わせる。M07本人specがない場合は別IDのM10公開fallbackを使う。

### 今回PRの公開Template・2コア技術受入

管理者が固定SHAからBuild・検証した製品を`course/shop/`へ許可リストで配布する。今回PRでは、公開Template→本人所有の非公開repo→新規2コアCodespace→配布SHA/許可ファイル検証→1モジュールload/非破壊再ロード→**配布済みShopの8082 Serve/Reset**→Playwright実Run→結果・成果物保全を確認する。受講者の製品フルBuildは要求しない。担当、SHA、実コマンド・exit/Run・保存物を記録し、失敗・未実施の場合はPR未完了とする。本人個別OpenCode認証・実受講者試行は別時点とする。

## 必須の検証と未確定事項

下表の機能・学習契約は開発中のコード/教材レビュー、自動/契約テスト、静的/AI校正/CIで確認する。実Template由来の2コアCodespace技術受入とAI正式評価の実行・誤PASS拒否は今回PR内で行う。実受講者による講師なしの学習効果試行は後続の改善工程とする。

| 検証 | 合格条件 |
| --- | --- |
| 同期対象の正しさ | manifestで許可したファイルだけを同期。禁止した解答・認証情報・正式workflow・正式回帰specを除外。配布元SHAを記録 |
| 同期の再実行 | 同じSHAなら同じ配布内容となり、同期先の受講者成果物を壊さない。意図せぬ差分・欠落は失敗 |
| モジュールID | M00〜M10の**1 IDだけ**を受け付ける。未知ID・複数ID・危険なパスは拒否 |
| ロードの再実行 | 同じIDを再ロードしても既存の編集・成果物を上書きせず、他モジュールへ影響しない。コピー途中の失敗・配布内容の衝突を報告し、安全に再実行できる |
| 先行成果物なし | 本人の前工程成果物がなくても、指定モジュール同梱の**先行修了課題とは異なる公開可能な正しい入力**で着手でき、過去の成果物や修了記録を作り替えない |
| M03の入力と実行 | M02の検証責務・実在Authority/Risk/Scope・Skill revisionを公開開始サンプルでも再現でき、必要なSkill-local helperの欠落と参照不整合を開始判定で検出する。direct起点→artifact materialize→Caseの受入が実行証拠で確認できる |
| 開始・終了状態 | **全11モジュールの基準データと公開可能な照合条件**が実在し、各開始時の不足・版不一致・不整合が分かる。本人の成果物は変更しない |
| 学習者の操作 | 公開Webで受講範囲を選び教材と確認クイズを利用し、実技は**受講開始ガイドで**M00をロードするだけならGit・GitHub API・CIの操作を必要としない。M00前にターミナル・pnpmの知識を問わない。AIの自動進行を要求しない |
| 学習用配布の境界 | publicな正本リポジトリの模範・採点・完成状態資料は、学習用Template/同期/ロード/Web Build/公開Artifactに含まれない。配布除外は秘密保持ではなく、同期・ロード・build契約テストで確認する |
| Phase 1の実施 | ロードした仕様・Skillから分析・設計を行い、完成例の転記なしに独立修了できる |
| Phase 2の実施 | 管理者の固定SHA Build・検証・同期と、学習用リポジトリ単体でのSetup→配布済みShop Serve→Seed/Reset→Playwright→結果確認を区別する。受講者側にフルBuildを要求せず、manifest/artifact不整合の事前拒否を自動/契約テストとCIで確認する。実際の2コアCodespaceでの通し確認は今回PRの技術受入で行う |
| Phase 3のspec引継ぎ | M07 specはPhase 2ではignoreされたまま保全し、Phase 3では本人が選んだspecだけを個別stageする。M07本人specとM10 fallbackで別のtest rootがworkflowへ明示され、relative importと同一specのローカル/CI実行を維持する |
| Phase 3の実施 | 学習用リポジトリの明示したコードだけをPR/CIで実行し、旧・正式workflowを発火させない |
| 無料運用 | 本人の非公開repoでのActions無料枠・Artifact・権限と課金停止を使用前に確認し、2コアのPlaywright技術受入は今回PRで行う。超過・利用不能なら運用開始を保留し、自動課金しない |

**開発工程で確認する事項**：build/import/asset依存の閉包からmanifest許可パスを導出し、fixture・契約・失敗系テストで、固定SHA・許可外/機密ファイル拒否・部分失敗・再実行・非破壊性・1モジュールロードを検証する。ローカルビルドとCIで必要ファイルの不足や実行経路の破損を検出する。実際のTemplateの名称・作成権限や2コアCodespacesでの実動作を、fixture検証の代替として報告しない。

**今回PRの技術受入と後続の試行**：管理者が固定SHAから製品Build・検証・同期し、実公開Templateから作成した非公開repoの新規2コアCodespaceで、受講者相当の操作による1モジュールload・非破壊再ロード・配布済みShopのServe/Reset・Playwright/結果保全を確認する。個人の提出・評価記録の保存先・権限、Templateの実名・作成権限、各受講者の無料枠・所要時間は未指定のまま保持する。

設計上の公開開始入力と公開模範の用途分離、学習者配布境界、個人別成果物の保存先契約、出力先、同期更新手順は維持する。**OpenCode CLIのモデル接続・個人認証・必要Skillは受講者初回起動で確認し、失敗した場合はBLOCKEDとする。**

**このPlanの実装完了条件には、教材の同期・ロード機能と、その許可リスト・固定SHA・機密データ拒否・非破壊性・モジュール単位動作を確認する自動/契約テストを含める。** 依存閉包からのmanifest確認、ローカルBuild/Serve/Playwright、fixture上の同期/ロード検証も開発工程で行う。実Templateからの非公開リポジトリ生成と2コアCodespaceでのPlaywright技術受入を今回PRに含め、実受講者の学習効果試行は後続に分ける。このPlanの文書更新時点ではTemplateの作成・同期/ロードのコード実装・mergeは行わない。後続の今回PR実装で公開Templateを作成し検証する。
