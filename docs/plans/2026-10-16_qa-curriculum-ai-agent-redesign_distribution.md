# 新課程の教材同期・モジュール単位ロード設計

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
| **課題の評価** | 学習者・講師等 | 学習者の成果物、公開評価基準、公開Git上の模範・採点資料 | フェーズ別の実技・知識・判断の判定 | AI自己申告だけの合格判定、配布物にある完成例の転記を技能と認定 |

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
  scripts/training/sync-ai-assisted-qa.ts            # 管理者用同期スクリプト

学習用リポジトリ/                                   # 新設予定・公開Template
  .devcontainer/                                     # Codespaces用
  course/modules/M00/ ... M10/                       # 配布済み教材（ロード前でも参照可能）
  course/manifest.json                               # 配布元commit・モジュール資産一覧
  scripts/load-module.ts                             # 学習者が実行するロードスクリプト
  runtime/ など                                      # Scenario Shopの実行に必要な配布物
  workspace/M00/ ...                                 # 学習者による作業成果（都度ロード）

```

模範解答・採点用テスト・完成状態データは、publicな`qa-training-store`へ通常のMarkdown/JSON/TypeScript等としてcommitし、Git差分・PRレビューで内容を確認できる。公開資料は閲覧可能である。`training/course-sync/manifest.json`の許可リストと各ビルド経路では評価資料を学習用Template、`course:sync`/`course:load`、Web Build、公開Artifactへ含めない。この配布除外は秘密保持を意味しない。実際の評価担当者、個人の提出・評価記録の保存先と権限は未指定のまま保持する。暗号化アーカイブ、age、復号スクリプト、鍵管理、暗号化専用CIは設けない。

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
- 既存devcontainerの**Node 24のイメージとChromium導入処理**から必要な部分だけ再利用し、開発中に`package.json`・`pnpm-lock.yaml`・Playwright Configと配布ファイルの整合を静的/契約テストとCIで確認する。実際の2コアCodespaceでの初回導入・アプリ起動・Reset・E2E通し実行は、全11モジュールと関連機能の実装完了後に行う。未実施・不合格だけでは実装完了を止めず、運用開始判断へ記録する。
- 公開Templateが元リポジトリのコードを含む以上、正式仕様・既存実装そのものは学習者とAIに見える。それでも**評価用の模範テストコード・完成した実技回答を入れない**ことで転記リスクを減らす。

## Phase 3の学習

Phase 1・2と同じ**学習者個人のリポジトリ**を継続利用する。ここで初めてbranch・commit・PR・GitHub Actionsを教材で扱い、Phase 2の成果物を対象とした専用CIを実行する。**Phase 3専用workflowは、公開Template内では実行対象外の教材テンプレートに置く**。M09/M10で受講者が対象spec・権限を確認して`.github/workflows/`へ有効化する。最小権限は`permissions: contents: read`を基本とし、Secret不要・deployなし・Artifactは必要なテスト証拠のみとする。旧Training Copy生成処理は元リポジトリを丸ごと複製し、旧workflowを有効にするため、この同期・ロードには流用しない。新課程の実行範囲を明示した小さなworkflowと検証契約を用いる。

公開リポジトリであるため、受講者自身の実技・ログ・個人情報を公開commitへ入れる前に確認させる。Phase 1・2の`workspace/`は原則としてGit管理対象から除外し、Phase 2修了にGit操作を要求しない。Phase 3でM07の本人specを使う場合は、ignore状態と内容を確認したうえで`workspace/M07/repaired-assertion.spec.ts`だけを個別に強制stageし、stage後の一覧と差分を確認する。`workspace/M07/`の一括追加は行わない。Phase 3 workflowは同じspecに`PLAYWRIGHT_TEST_ROOT: workspace/M07`を指定する。M07成果物がない場合はM10専用fallbackを使い、そのworkflowには`workspace/M10/public-sample`を明示する。

## 必須の検証と未確定事項

下表の機能・学習契約は開発中のコード/教材レビュー、自動/契約テスト、静的検証、CIで確認する。実際の受講者・評価担当者・2コアCodespaceによる受入は全11モジュールと関連機能の実装完了後に行い、未実施を実装工程のBLOCKED理由にしない。

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
| Phase 2の実施 | 管理者の固定SHA Build・検証・同期と、学習用リポジトリ単体でのSetup→配布済みShop Serve→Seed/Reset→Playwright→結果確認を区別する。受講者側にフルBuildを要求せず、manifest/artifact不整合の事前拒否を自動/契約テストとCIで確認する。実際の2コアCodespaceでの通し確認は全量実装後に行う |
| Phase 3のspec引継ぎ | M07 specはPhase 2ではignoreされたまま保全し、Phase 3では本人が選んだspecだけを個別stageする。M07本人specとM10 fallbackで別のtest rootがworkflowへ明示され、relative importと同一specのローカル/CI実行を維持する |
| Phase 3の実施 | 学習用リポジトリの明示したコードだけをPR/CIで実行し、旧・正式workflowを発火させない |
| 無料運用 | 無料AIモデル・公開標準Runner等の利用経路を開発時の契約で確認し、実際の2コア利用量・無料枠は全量実装後に実測する。超過・利用不能なら運用開始を保留し、自動課金しない |

**開発工程で確認する事項**：build/import/asset依存の閉包からmanifest許可パスを導出し、fixture・契約・失敗系テストで、固定SHA・許可外/機密ファイル拒否・部分失敗・再実行・非破壊性・1モジュールロードを検証する。ローカルビルドとCIで必要ファイルの不足や実行経路の破損を検出する。実際のTemplateの名称・作成権限や2コアCodespacesでの実動作を、fixture検証の代替として報告しない。

**実装完了後の実地検証**：指定を受けた学習用TemplateでBuild/Serve/Testと管理者同期を行い、そこから作成した個人リポジトリの2コアCodespaceで本人が1モジュールをロードし、編集済み成果物の保持、別モジュールの非ロード、実技実行・保存ができるか確認する。個人の提出・評価記録の保存先・権限・管理担当、Templateの実名・作成権限、各受講者の無料枠・所要時間は未指定のまま保持し、推測して外部リポジトリや保存先を作成しない。公開模範・採点資料は本リポジトリ内へ通常ファイルとして保存済みとし、保存先未指定を理由に未作成にはしない。未指定事項は運用開始判断まで保持する。

設計上の公開開始入力と公開模範の用途分離、学習者配布境界、個人別成果物の保存先契約、出力先、同期更新手順は維持する。**OpenCode Zen無料モデルの利用可否・認証可否は確認済みであり、再検証対象ではない。**

**このPlanの実装完了条件には、教材の同期・ロード機能と、その許可リスト・固定SHA・機密データ拒否・非破壊性・モジュール単位動作を確認する自動/契約テストを含める。** 依存閉包からのmanifest確認、ローカルBuild/Serve/Playwright、fixture上の同期/ロード検証も開発工程で行う。実Templateからの非公開リポジトリ生成と2コアCodespaceでのPlaywright技術受入を今回PRに含め、実受講者の学習効果試行は後続に分ける。このPlanの文書更新時点ではTemplateの作成・同期/ロードのコード実装・mergeは行わない。後続の今回PR実装で公開Templateを作成し検証する。
