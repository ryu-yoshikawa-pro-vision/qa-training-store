# 新課程のScenario Shop演習・実行・CI分離設計

## 今回確定した演習対象と実行環境（2026-10-25）

Scenario Shopの`docs/spec/`と実装済み機能を棚卸しし、**対象機能すべて**に正式仕様・Risk・TR・Condition・Caseの対応、または根拠付きの対象外・未決・BLOCKEDを付ける。最低カバレッジは**対象機能の分析・設計上の扱い100%**。全条件組合せ・全Caseの100%実行や全E2E化は求めず、自動化採用はリスク・費用・効果で判断する。各機能における判断の妥当性を`coverage-analysis`と仕様正本で確認する。

Phase 2では実行可能な別条件のCaseから本人がE2Eを構成し、必要なケースでPage Object/fixtureによる保守設計を実装・判断する。Phase 3では本人所有の非公開リポジトリでworkflowのtrigger・jobs・permissions・Secret・Artifact・SHA・無料枠・運用判断を含めCIを設計する。固定qa-workflow-skillsはQA成果物を扱う全工程で必須とし、環境・Git・CI自体には無理に適用しない。障害時の追加指示・手動対応も評価する。

今回PRで公開Templateを作成し、Template由来の個人非公開リポジトリ・新規2コアCodespacesでPlaywrightまで技術受入する。OpenCode個人モデルは初回起動時確認、受講者による教材効果試行はPR外。

## 結論

**Phase 1は別の学習用リポジトリのCodespacesでAIによるテスト分析・設計、Phase 2は同じCodespaceでPlaywright実装・実行、Phase 3は同じ個人リポジトリでGitHub・CI（選択）**とする。各フェーズに独立した実技・修了判定を用意する。新旧の教材・評価・受講者コード・CIの実行経路を分離し、テスト対象としてのScenario Shopと正式仕様・Seedは共用する。**新課程のために製品本体へ故意の不具合を導入せず、製品機能の追加も原則として行わない。** 既存のデータと演習で不足することが具体的に確認できた場合は、まず新課程側の教材・専用Seed経路から最小の変更を検討する。それでも必要な操作・状態を再現できないと確認した場合に限り、正式仕様・既存回帰への影響を評価したうえで製品機能の追加を検討する。

## 新課程で使う学習対象

| モジュール | Scenario Shop・既存資料の候補 | 必要な実践 |
| --- | --- | --- |
| Phase 1 / M00〜M02 | Codespaces内で開く`docs/spec/features/cart.md`等の仕様資料、商品一覧・Cartの条件表 | Codespace・OpenCode CLIの初回操作→AIへの自分の依頼、BR/AC・Role/State・Riskの区別 |
| Phase 1 / M03 | `BR-CART-001`、`default`、`low-stock`、`out-of-stock`の**仕様・条件資料** | 境界値・期待結果を配布資料で設計。実際のSeed/Playwright実行は不要 |
| Phase 1 / M04 | `cart-with-invalid-items`、`BR-CART-003`、**未演習の条件** | AIの設計案をレビューし、初見条件の自動化候補とCaseを確定（Phase 1独立総合演習） |
| Phase 2 / M05〜M06 | Phase 1の本人Caseが有効な場合はそのCase、ない/無効な場合は各モジュールの公開fallback、Cart、`training/playwright/support/reset-scenario.ts` | Codespacesに導入済みのNode.js/Playwrightの設定理解、コード作成・Reset・Codespace内実行。fallback利用はPhase 1本人修了と区別 |
| Phase 2 / M07 | 既存`diagnostic-cart.spec.ts`、`c10-locator-maintenance.spec.ts`、未演習条件 | 誤ったAssertionの原因特定・最小修正・前後別Run（Phase 2独立総合演習） |
| Phase 3（選択）/ M08〜M09 | Phase 2のspec、Training用の隔離コピー | Git差分・PR・対象SHAのCIと証拠 |
| Phase 3（選択）/ M10 | Phase 2で作ったspecとテスト実行環境 | **再実装せずCIへ組み込み**、対象SHA・Run/Artifact・失敗時対応を評価（Phase 3総合演習） |

これらは**演習候補**であって、実際にすべて動作検証済みという意味ではない。Phase 1の初見条件は仕様資料上で解ける内容に限定する。Phase 2で使う未演習条件には実行可能なSeed/Resetと既知の期待動作が必要。Phase 3はPhase 2のspecをそのまま使う。

## 教育上必要な演習範囲と対象の確定方法

既存のCart中心の対応表は**初期候補**とし、学習項目ごとに適切な仕様・条件を選び直す。異なる機能を使う目的はケース数の増加ではなく、既習の考え方を別条件にも適用できるか確認すること。以下は正式仕様・既存Seedに根拠のある**候補**であり、採用済み・実機検証済みの一覧ではない。

| モジュール | 優先する候補と正式な根拠 | 学習・独立演習で確認する違い |
| --- | --- | --- |
| M01〜M02 | Cart（`BR-CART-001〜003`）、商品公開・閲覧条件、会員／アカウント状態 | 期待と観測、Role/State/Data/Journey、リスクと検証責務を仕様から導く |
| M03 | Cart数量（`BR-CART-001`）、在庫分類（`BR-ADMININV-001`）、検索条件（`BR-STOREFRONT-002`）、必要に応じて注文状態 | 境界値と状態分類、条件の組合せ、状態遷移から適した技法を選ぶ。**少なくとも主要な設計能力で、説明に使用した条件とは異なる条件・判断構造を確認する** |
| M04 | Cart統合・再検証（`BR-CART-002〜003`）または別機能の仕様 | AI案の不足・重複・誤期待結果、未決事項、自動化とテスト層の採否を判断する |
| M05 | 商品表示など、前提が少なく期待結果が明確な短いWeb操作 | TypeScript・Locator・Assertionの意味を理解してからM06へ進む |
| M06 | 公開fallbackの固定3 Cart Case。Phase 1の本人Caseが有効な場合は出所・revisionを記録して固定Caseと照合 | 正常結果・拒否時の不変条件・境界またはRole/State差を含む3 Caseについて、Case→Seed/Reset→Locator/Action/Assertion→実行証拠を確認する。本人Caseとの対応/差またはfallback利用を記録し、fallbackをPhase 1修了と扱わない |
| M07 | 既存のCart診断specと、原因・証拠が異なる失敗素材 | テストコード、初期状態・環境、タイミング・Flakyなど異なる原因を証拠から診断する。修正可能な課題で前後の別Runを比較し、製品不具合は修正を強制しない |
| M08〜M10 | M06〜M07の承認済みspec・実行結果 | 教育対象をGit/PR/CIへ移し、テストケースの再設計を重複して要求しない |

演習の採用前に、各候補について**(1) 学習項目と技法、(2) 正式仕様・BR/AC・操作種別、(3) 初期Role/State/DataとSeed、(4) 操作、(5) 期待結果・操作後の不変条件、(6) 観測箇所・テスト層、(7) Reset/再実行、(8) 仕様・環境のrevision、(9) 実行確認の状態**を対応させる。対応のID・参照関係は[知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に従い、独立した手動台帳を正本として増やさない。

- **Phase 1**は仕様と配布データ上で条件・期待結果を独立に導出できることを確認する。実画面の起動・Seed/Reset実行を合格条件にしない。
- **Phase 2**の実行演習は、学習者用Template単体で必要なSeed/Reset・操作・Assertionによる観測・繰返し実行が成立した候補だけを採用する。Seed名やBR/ACの存在だけで実行可能と判定しない。
- まず既存機能・Seedを活用する。必要な条件が再現できない場合のみ学習用の資料・専用Seed・失敗診断素材を最小限追加し、**それでも学習目標を達成できないことが具体的に確認された場合だけ**製品機能・状態の拡張を検討する。製品の仕様を恣意的に変えたり、本体へ故意のバグを導入したりしない。
- 受講者向けの詳しい解説例と、修了時の初見課題は異なる条件にする。技法の種類を増やすためだけに意味のない組合せや到達不能な状態を作らない。

## 新旧と製品の物理的な境界

| 役割 | パス・扱い |
| --- | --- |
| 旧教材 | `docs/curriculum/test-automation/`：**不変更** |
| 新教材・評価資料の正本 | `docs/curriculum/ai-assisted-qa/`：管理用README、受講者用start-here、教材Markdown、公開正答・解説付きクイズJSON。模範解答・採点用テスト・完成状態データは`training/ai-assisted-qa-course/assessment/`へ通常ファイルとして公開し、学習用Template/同期/ロード/Web Buildからは除外する。この除外は秘密保持ではない |
| 旧Trainer | `training/playwright/`、`training/workbook/`：既存の提出形式・コードは不変更 |
| 既存探索QA | `training/agentic-qa/`：Scored Challenge等。新課程として上書きしない |
| 新Trainerの正本 | `training/ai-assisted-qa-course/`：配布可能な未完成spec・課題素材と実行手順だけ |
| 教材の同期定義 | `training/course-sync/manifest.json`（配布許可リスト）、`scripts/training/sync-ai-assisted-qa.ts`（管理者用・実装予定） |
| 学習用リポジトリ | **別の公開Template**を生成・管理し、学習者のCodespacesで`pnpm course:load Mxx`を本人が実行。教材・作業領域を分離 |
| 模範・採点・完成状態資料 | `training/ai-assisted-qa-course/assessment/reference-solutions/Mxx.md`、`scoring-tests/Mxx.json`、`completed-states/Mxx.json`等の通常ファイルとしてpublic Git上でレビュー可能にする。学習用Template/同期/ロード/Web Build/公開Artifactからは配布許可リストで除外する。これは秘密保持ではない |
| 製品仕様・Seed | `docs/spec/`、`src/seeds/`：新旧が共通参照する正本 |
| 旧validator・旧修了確認 | `scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts`：変更しない |
| 新validator | 必要なら `scripts/ai-assisted-qa/` に置く。新課程の構造・問題/解答・実行結果のみ対象 |
| 正式テスト・デプロイ | `e2e/web/`、`maestro/`、既存の正式workflow：Training課題を混入しない |

レッスン用ファイルは旧課程へ追記しない。学習用リポジトリに配布したREADMEから、学習者が**モジュール単位でロードし**、学習の順序、確認クイズ、実技、復習と修了まで進められることを目指す。同期元の許可リスト・ロード・解答の扱いは[同期・ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)を参照する。

## Codespacesの共通環境・無料枠管理（Phase 1〜3）

- **標準は学習用Templateから作成した個人リポジトリのGitHub Codespaces、2コア**。受講者はGitHubにログインし、**Templateから自分のリポジトリを作って**Codespaceを作成する。**現行`.devcontainer/devcontainer.json`には`hostRequirements`の設定がなく、2コアは固定されていない**。作成時にMachine typeを確認し2コアを選ぶ。2コア利用の実機安定性は全量実装後の実地検証で確認する。
- 同期元の既存`.devcontainer/devcontainer.json`のNode.js 24、pnpm、Chromium、OpenCode CLI、Codex CLI、GitHub CLI、desktop-liteを**学習用リポジトリの実行環境へ必要に応じて再利用する**。**全環境を新規実装・再導入しない**。Codespacesの起動ログ、必要コマンドと教材の実行環境を確認してから演習する。OpenCode Zen無料モデルの認証可否は再検証しない。既存手順は[Codespaces利用ガイド](../guides/codespaces.md)を参照する。
- **GitHub Free個人無料枠は120コア時間/月、15 GB-month/月**（2コアなら計算上約60起動時間/月）。組織アカウントにはCodespaces無料枠がないため、受講者本人がCodespaceの所有者・支払主体であることと、残量・支出上限を事前に確認する。単純に「リポジトリが公開だから無償」と判定しない。ストレージは停止中も消費する。費用・認証・利用権限が満たせない場合は受講/運用開始を保留し、実装工程のBLOCKED理由にはせず、無断で有料環境へ変更しない。
- OpenCodeは既存の**CLI**を標準とし、**OpenCode Zenの無料モデルが利用可能であることは確認済み**とする。モデルの利用可否・認証可否を再検証する工程は設けない。VS Code拡張は必須にしない。`OPENCODE_API_KEY`は**個人のCodespaces Secret**で扱い、Secret・認証キャッシュを配布物・公開PR・ログへ保存しない。有料モデルや有料の自動切替は学習経路に含めない。Codespacesの本人無料枠・所要時間は別に管理する。
- GitHub Codespacesの**8081（通常Web）と6080（noVNC）はPrivate**のままにし、5901を外部公開しない。Training用Playwrightの8082は専用テストサーバーで、8081をTraining実行先として使わない。コード生成`codegen`と実際のE2E実行対象の違いを教材で示す。
- 学習終了時はCodespaceを停止し、不要なCodespace・Artifactの保存量を確認する。**Phase 1で設計Markdown、Phase 2でspec・設定・結果・ログ**をGit操作なしでダウンロード・保全できる機能と手順を用意し、開発時は自動/契約テストで確認する。削除・利用枠超過・再構築に伴うデータ消失に備え、段階的にバックアップする。所要時間・実際のストレージ消費・無料枠内の完走可否は全11モジュールと関連機能の実装完了後に実測し、実装完了の条件にはしない。

## 開始・終了基準状態とフェーズ間の引継ぎ

[全モジュールの状態設計](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)に従い、**M00〜M10の正しい開始データ・終了データ・照合条件**を実際に用意する。開始状態は必ずしも「テストがPASSする状態」ではない。M07等の意図的なFAILも正しい開始状態として扱う。

- **M04終了→M05開始**は承認済み分析・Case・仕様根拠・初期データが一致する。Phase 2のNode/Playwright準備はM05の条件として切り分ける。
- **M07終了→M08開始**は実行確認済みspec・Config・Reset・結果証拠が一致する。Git/PRをM07の修了条件へ持ち込まない。
- 前段階の本人成果物を失っても、後続モジュールの入力として何が正しいか判断できる基準データを保持する。**自動復元や模範解答の公開同期は行わない**。
- 受講者の実際の開始状態の整合と、本人がモジュールの技能を習得したことは別に判定する。

## 管理者による同期と学習者によるモジュール単位ロード

- 教材管理者が確定した配布元commitと許可リストから**別の公開学習用Template**を更新する。`qa-training-store`全体のcloneや旧`prepare-training-copy.ts`の出力をそのまま配布しない。受講者による同期スクリプトの実行は想定しない。
- **学習者本人**が`pnpm course:load M03`のように**1モジュールIDを指定**し、必要な課題ファイルを`workspace/M03/`へロードする。過去の成果物・編集済みファイルを上書きせず、他モジュールを自動ロードしない。ロードのためにGitコマンド・ネットワークアクセス・CIは要求しない。
- 配布済みの他モジュールは、ロード前でもAIから参照可能である。模範解答・採点用テストは公開Git上で閲覧できる通常ファイルにする一方、学習者向け配布許可リストへ含めない。これは秘密保持ではない。通常の学習用クイズの公開解説、完成評価資料、評価時に初めて提示する具体的条件を区別する。
- 学習者の作業フォルダと課題素材・実行環境を分ける。学習者の成果物はモジュール間で参照可能にし、同期・再ロードで消さない。今回PRでは公開Templateを作成し、個人非公開リポジトリのPlaywright受入を行う。受講者の個人成果物を自動pushしない。

## Phase 1：CodespacesでのAI操作・テスト設計

1. 受講者は**個人の学習用リポジトリでCodespaceを作成**するが、Gitコマンド・clone・PR操作を覚える必要はない。本人が**M00から必要なモジュールを一つずつロード**し、配布済み教材の入口、仕様・課題・回答テンプレートの場所を確認する。利用する`qa-workflow-skills`は**別リポジトリ**なので、受講者がGitを操作せずにSkill本体・Python helper・参照ファイルへアクセスできる導入手順を用意する。必要なrevision・Python依存とSkillの発見・実行を検証し、SKILL.mdだけのコピーで済ませない。
2. M00ではCodespacesのVS Code・ターミナル・OpenCode CLI起動、作業範囲・Skill発見を段階的に習い、初回は**ロードした課題領域の読み取り中心**の操作から始める。目的と許可範囲を理解した後に学習用ファイルへの編集を許可する。
3. M02〜M04では仕様に基づくRisk/Condition/Case、AI提案の採否と根拠をCodespace内のMarkdown等で保存し、フェーズ終了時に受講者自身がGit操作なしでダウンロードする。画面実行・Playwright・CIを**Phase 1修了の必須条件にしない**。
4. [評価設計](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)のPhase 1総合演習を初見の仕様条件で行い、Phase 2への引継ぎ成果物を作る。AI認証や外部Skillが実行できない場合はBLOCKEDと記録し、成功を捏造しない。

## Phase 2：Codespaces内でのWeb実技の実行設計

元の`qa-training-store`の`playwright.training.config.ts`は`training/playwright`を標準の`testDir`とし、`PLAYWRIGHT_TEST_ROOT`で切り替えられるが、結果出力は`output/training/playwright/`である。**別リポジトリではこのConfigの移植だけで動くと決めつけず**、必要な製品ランタイム・Config・Seed/Reset・依存を同期許可リストで明示する。

**Phase 2はCodespacesを使用するがGitコマンド・PR・CIの操作なしで独立して完結する。** そのまま旧コマンドを呼ぶだけでは新課程の専用specを検証したことにならない。

1. **同期した学習用リポジトリ単体のCodespaces**でNode.js/pnpm・Playwright/Chromium、Scenario ShopのBuild/Serve・Seed/Reset・Config・対象サーバーを実行可能にしてから、構成の意味を受講者に確認させる。構成を理解して必要な設定・実行を再現することを評価し、devcontainerの全面再構築・Git/PR操作を要求しない。
2. 同期元の`training/ai-assisted-qa-course/playwright/`等から**未完成spec・課題素材だけ**を配布し、受講者がロードした`workspace/M06/`等に自分のspecを作る。正式回帰specや完成例は配布しない。
3. 学習用リポジトリのBuild/Serve/Test・必要なSeed/Resetを同期元の確定SHAから再現する。**テスト対象と結果出力先を旧課程とは別**にする。必要なら新しい`playwright.ai-assisted-qa.config.ts`を作り、旧`playwright.training.config.ts`の設定を安全に参照する。設定を丸ごと複製しないことを優先する。
4. 同期元の既存`reset-scenario.ts`と依存するファイルを**配布可能な形で**参照・同期し使用できるか検証する。使えなければ理由を示したうえで、必要最小限の新課程専用helperを追加する。
5. Webの主対象は既存Cart。数量・在庫・Role/Stateの実際の仕様ID、画面、Seedと一致することを確認する。
6. 新課程のspecを実行するCLIコマンドを明示し、Training serverの**8082**と通常Webの**8081**を混同しない。codegenの表示にはPrivateの6080を使う場合があるが、画面録画の成功をE2Eの成功に読み替えない。`training:web:exercise`を新課程のコマンドに読み替えない。
7. 新課程のTrace/Report/Receiptは学習者の個人リポジトリ内の専用出力先に作成し、終了時にGit操作なしで必要なspec・Config・実行証拠をダウンロードする。旧課程の実行結果の流用や上書きを防ぐ。**成功したBaselineと本人のテスト成功は別**。

新規のpackage scriptが必要になったら`package.json`へキーを追加してもよいが、既存のscriptの引数・意味は変えない。旧課程の`check-completion`は新課程の合否判定に使用しない。

## Phase 3（選択）：学習者個人のGitHubリポジトリとCI

### 既存実装との境界

- `scripts/training/prepare-training-copy.ts`は元リポジトリを**全体clone**し、旧`training-ci.yml`と`training-native-ci.yml`だけを有効化する。`validate-training-copy.ts`はその2件を固定許可している。今回の**教材の同期・ロード**と責務が違うため、旧経路は変更・再利用しない。
- 既存`training-ci.yml`の実行対象は旧課程のspecであり、**新課程のPhase 2実技を検証した証拠にはならない**。
- 新課程のPhase 3は、**Phase 1・2で使用した受講者個人の学習用リポジトリ**を使う。ここで初めてGit/PR/CIの操作を教える。

### 採用案：専用workflow

1. 同期する学習用Templateには、必要なら**Phase 3専用の最小workflowテンプレート**を置く。ただし、`qa-training-store`の正式workflowや旧Training Copyのworkflowを有効な状態で同期しない。
2. Phase 3を選択した受講者が、Phase 2で動作したspecをGitで管理し、専用のGitHub Actionsを作成・有効化する。Phase 1・2の自動実行・CI利用を必須にしない。
3. 専用workflowは新課程のテストだけを対象にし、Secret不要・権限最小化・デプロイ経路なし・対象SHAとRun/Artifactの対応を確認する。
4. **本人の非公開リポジトリ＋標準GitHub-hosted Runner**を無料利用の第一候補とする。個人情報やSecret、不要な学習者成果物を公開commitしない。private/larger runnerの利用を無料と決めつけない。
5. 実際のGitHub権限・Runner・workflow実行が利用不能ならPhase 3の実技をBLOCKEDにする。すでに完了したPhase 1・2の評価は維持する。

## 知識グラフからテスト対象とSkillを見直す

[基準グラフ](../curriculum/ai-assisted-qa/README.md)は、学習目標の必要知識と**Scenario Shopの正式な仕様ファイル**、別リポジトリ**`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**の使用候補を参照する。`qa-training-store/.agents/skills/`は今回のQA workflow Skillの正本として扱わない。

- 製品のBR/AC・Seed/Reset・テスト用画面が変わったとき、`impact`は**影響候補**を列挙する。元の仕様に照らして教材の例・実技・修了条件を再確認する。**学習対象の機能を自動で増減させない**。
- Skillが改訂されたとき、現在参照するcommitと変更後のSkill本体・補助Pythonスクリプト・入出力契約を比較して、関連モジュールの演習を再実行するか判断する。**参照関係だけでは起動成功・Skillの正しさを保証しない**。
- 登録済みの仕様4ファイル・Skill 11件は**学習・演習の参照候補**であり、完成時は[知識グラフ完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に従って実際に採用した教材・実技・評価との関係を確定する。関連Skillの実行経路は、モデルの利用可否とは別に課題として検証する。

## 既存コードに基づく実行・配布契約

調査対象：`.devcontainer/devcontainer.json`、`package.json`、`playwright.training.config.ts`、`scripts/serve-web-dist.ts`、`training/playwright/support/reset-scenario.ts`。

- **ツール**：既存devcontainerはNode.js 24、`pnpm@10.34.5`、Playwright Chromiumを導入する。学習用Templateには、この実行経路に必要な設定・依存だけを同期し、通常製品の開発/正式回帰workflowは配布しない。
- **ビルド**：`build:web`は`prepare:font-assets`→`generate:image-manifest`→`validate:image-manifest`→`expo export --platform web`→`build:docs`を実行する。教材同期の許可リストは、この経路で必要なimport・asset・生成スクリプト・lockfileまで含め、固定SHAから再現できることを確認する。ファイルの追加理由はmanifestに記録し、不要な全体複製は行わない。
- **起動**：既存`scripts/serve-web-dist.ts`は`WEB_SERVER_DIST_ROOT`（既定は`dist`）から静的ファイルを提供し、loopback以外のbindを拒否する。学習用のテストURLは`http://127.0.0.1:8082`を使用する。8081は通常Web、6080は必要な場合だけprivate noVNC。**8082を外部公開しない**。
- **Playwright**：既存`playwright.training.config.ts`の`PLAYWRIGHT_TEST_ROOT`、`PLAYWRIGHT_BASE_URL`、`webServer`、`reuseExistingServer`、report/Traceの構成を参考にする。ただし、旧`training/playwright`のspecを走らせないため、**新課程専用Config**は指定した`workspace/M05`、`workspace/M06`、`workspace/M07`の実技と、`workspace/M08/public-sample`・`workspace/M10/public-sample`のmodule-local公開fallbackだけを学習者用経路として許可し、結果を`output/training/ai-assisted-qa/`へ保存する。評価用完成specを開発時に実行するため、同Configは`training/ai-assisted-qa-course/assessment/playwright/M05`〜`M07`も追加の限定許可対象とする。これらはpublicな評価資料であり秘密ではないが、manifest、同期、ロード、Web Buildから除外する。M05はTypeScript/Playwright基礎、M06/M07はPhase 2、M08/M10はPhase 3で前工程のspecがない場合の公開sampleに使う。任意path、M09その他のworkspace、旧`training/playwright`、`assessment/playwright`のM00〜M04/M08〜M10は許可しない。環境・CIともに対象specと出力先を確認する。
- **Seed/Reset**：既存`training/playwright/support/reset-scenario.ts`は`window.__TEST_API__`の準備を待ち、`reset({scenario})`の後で`getMetadata().scenario`を照合する。新課程から再利用する場合も**テストモードで同APIが公開されること**を確認し、学習者が作るspecの開始前に必要なResetを行う。既存のReset契約と重複する独自処理は作らない。
- **開発中の受入**：許可リスト、依存閉包、起動設定、Reset契約、Playwright設定・spec・結果保存先をソース/契約テストで検証し、リポジトリCIでBuild・自動テストと旧Trainingとの出力分離を確認する。設定不足、テスト失敗、仕様不整合を実装未完了として修正する。
- **実装完了後の実地検証**：実際の学習用Templateから作成した個人リポジトリの新規2コアCodespaceで`pnpm install --frozen-lockfile`、指定ビルド、8082起動、Reset、M06/M07の指定1 spec、結果保存まで実行し証拠を残す。実際のCodespaceで未実施・失敗であることだけでは実装完了や他モジュール実装を止めない。運用開始は[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)の別判断とする。

## qa-workflow-skillsの工程別利用

基準とするのは**別リポジトリ`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**のSkill Packageである。確認したcommitには22 Skillがあるが、22件すべての配布・習得を必須にしない。

| 工程 | 使用するSkillの候補 | 課題の前提 |
| --- | --- | --- |
| M00 | `qa-workflow`の役割紹介・安全なSkill発見 | **複合workflowの実行を必修化しない** |
| M02 | `spec-analysis`, `test-analysis` | 正式な仕様・BR/ACと対象範囲。M03の前に検証責務ID・仕様根拠・リスクを明文化する |
| M03 | `test-condition-design`（初回は`direct` mode）→`test-case-design`、必要時`coverage-analysis` | M02の検証責務（テスト要求相当）、仕様/リスク参照、入力modeに適合する構造化データと上流Entity。条件を設計した後にCaseへ渡す |
| M04 | `adversarial-review` | 本人が作成・確認したCaseと仕様 |
| M06 | **`e2e-test-inspection` → `e2e-test-implementation` → `e2e-test-execution`** | 対象画面/既存コードを確認してから実装。実装Skillにinspection結果が必要 |
| M07 | `e2e-test-result-analysis`, `e2e-test-reporting` | 実際のRun・Trace・失敗ログと仕様 |

### M02→M03のSkill実行契約

固定commit `7cc6cba7772de549841a39d71694cbafbc783324`のSkill本体に従い、工程単位でmodeと入力・出力を変える。**初回演習を`direct`とするのは条件設計の入口であり、Case完成まで全工程をdirectで実行する意味ではない。**

| 工程・スクリプト | mode・必要な入力 | 検証する結果 |
| --- | --- | --- |
| M02の検証責務 | 人が読めるMarkdown等。TR相当ID、BR/AC、リスク・Scope、期待する成立条件、優先度、未決 | 仕様正本に根拠があり、未決は推測で補完されていない |
| `condition_structure.py` | **`direct`**。`metadata`17キー、`input`15キー、`test_requirements[]`各行5キー。前工程のcurrent Authority/Risk Entity、M02が定義する意味・出典・revision付きScope参照と`test_conditions[]`の根拠を確認 | current TR Entityは必須ではない。ただし未解決のAuthority/Risk依存を省略して`ready`になり得るため、M02の参照集合とTCN/Model出力を独立照合 |
| 選択した技法のruntime | その技法の`model_key`、確定TCN/Model、入力・データ要求。**適用した技法だけ**実行 | 実際の決定論的結果、currentなModel/技法結果 |
| `materialize_coverage.py` | **`artifact`必須**。`artifact:materialize_coverage:<TCN-ID>`と対応する`scope_key`、current TCN/Model・技法結果 | CI、親TCN・Scope・fingerprint、カバレッジとテストデータ要求 |
| `case_structure.py` | **独立したmode指定が必要**。current TR Entityがない初回例はdirect候補。current TCN/CIなどを実際に渡し、固定commitの実行で採用modeを確定 | CIが最低1件、TCN/CI/TR/期待結果Authority・必要データの対応が成立 |
| `verify_runtime_evidence` | 正規化した入力と実際の各runtime Input/Result・Machine Entity・成果物Markdown。通常の全件生成は`partial_rerun=false`、`previous_artifact_markdown=null` | **`valid=true`**と必要なruntime単位、依存/freshnessの整合。意味上の仕様適合は別途レビュー |

- **機械入力と教材本文を混ぜない**：M02の検証責務の文章はMarkdown等の正本に置く。`test_requirements[]`の行へ`description`・`br_refs`等の未知キーを足さず、`tr_id`・`priority`・`authority_refs`・`risk_refs`・`scope_refs`だけにする。requiredは[学習順序の入力契約](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)で定義する。
- **根拠の実在性を別に確認**：BR/ACとAuthority EntityのIDを同一視しない。Authorityは`spec-analysis`、Product Riskは`test-analysis`の実際の成果物に基づき、Scopeの参照先・版も確認する。固定revisionのScopeは独立したMachine Entityではなく、`SCOPE-...`形式の参照文字列である。`test_requirements[]`から`test_conditions[]`へTR・Authority・Risk・Scopeの参照が欠けた場合、**directでreadyでも失敗とする**。TR Machine Entityへの依存はdirectで必須ではない。
- **Dispositionを誤用しない**：`requirement_dispositions[]`はmodeに関係なく対象のcurrent TR Entityが必要。通常の初回direct例では空配列とし、仕様未確定・未対応はM02の未決として保持する。勝手にdispositionで閉じたことにしない。
- **成功の判断**：`run_cli`の終了コード0は一部`invalid_input`でも返るため成功条件にしない。結果envelope、`runtime_status`・`support_status`・`result_status`・`deterministic_generated`、未解決事項、生成Entity、最終evidence gateを確認する。実行のない仮想fingerprint・Machine Entityは作らない。
- **学習者に要求する範囲**：受講者は検証責務、根拠、技法、条件/ケース、期待結果、AI成果物の採否を判断する。17キーのmetadata、fingerprintの計算、runtime内部の契約を暗記させない。Skill・エージェントが生成したJSONと実行結果は、既存runtimeで検証する。

**未実行の受入項目**：実際のCart BR/AC、Authority/Risk runtime出力、M02が定義するScope参照から、`condition_structure(direct)`→技法→`materialize_coverage(artifact)`→`case_structure(適切なmode)`→最終証拠検証まで通るかは、**PR #199の新課程入力について確認する**。Scopeを存在しないMachine Entityとして扱わない。固定commitの既存CI成功は流用しない。特に**direct生成TCNからartifact materializeとCaseへの接続**が成立しなければ原因と最小限の代替経路を調査する。新しいruntimeやモジュールの追加を先に決めない。

- 学習用Templateに必要なSkillは**使用するSkill Package全体（`SKILL.md`、`references/`、`assets/`、必要なSkill-local `scripts/`）**を同一の固定commitから同期する。ファイル単位のコピー漏れを検出する。外部の共有評価ランタイム`scripts/skills/evals/`は、今回の演習が明示的に必要としない限り配布しない。
- Skill-localの決定論的runtimeは**Python 3.11標準ライブラリ**を前提とすることを確認した。開発時はPython helperの入力/出力契約をfixture・契約テストで検証する。Codespaces側でPython 3.11以上・Skill-localのscriptが呼び出せるかは、全11モジュールの実装完了後に実地検証する。開発専用の大量のテスト依存は持ち込まない。
- **学習目標を優先**し、Skillのruntime・保存形式・migrationの全機能を初心者に理解させることを必修にしない。Skillが現在の課題条件を扱えない場合はBLOCKEDを記録し、AIによる架空のruntime結果で代用しない。
- 知識グラフで候補関係として登録済みのSkillは、**この工程表と実技の実行結果を確認してから採用関係を確定する**。`e2e-test-inspection`は現在の候補グラフに未登録なので、完成時にM06との関連を追加する。

## AIエージェントとqa-workflow-skills

- M00でCodespaces上のOpenCode CLIを使い、**Git操作を受講者に要求せずに**必要な`qa-workflow-skills`を用意してSkillの発見・安全な利用を確認し、使用したrevisionを記録する。
- 仕様分析、テスト設計、Playwright実装、実行結果分析は対応する既存Skillを必要に応じて使う。`qa-workflow`経由ですべての工程を強制する必要はない。
- 補助Pythonスクリプト、参照ファイル、Runtimeの依存を実際に確認する。Skill名の存在やAIの自己報告のみでは合格にしない。
- `training/agentic-qa/`のScored Challengeや`.agents/skills/exploratory-qa/`とは別の責務として扱う。必要がある場合も新教材に引用するだけで、採点ランナーを無断で共通化しない。
- AIへの仕様・コード提供は模擬ECの必要な範囲に限定する。APIキー・Secret・受講者の個人情報を教材・公開PRに保存しない。

## 「テスト対象の修正」の判断条件

1. **既存状態だけで学習目標を満たせる**：新教材・問題・新課程の演習ファイルだけを作り、製品は変更しない。
2. **初期データ・Resetや表示例だけが不足**：新課程側で安全に準備できる方法を優先し、Seed変更は正本・既存回帰への影響を確認してから判断する。
3. **正式仕様の確定した動作を製品が満たしていない**：既存の問題として根拠・再現条件・影響範囲を切り分け、カリキュラム変更と混同せず別に扱う。
4. **わざと失敗する演習が必要**：新課程の診断教材に誤った期待結果を持つspec等を設け、製品自体へ意図的なバグを入れない。

Phase 1の初見の分析・設計課題、Phase 2の初見のPlaywright課題で使用する条件が不足すれば、正式仕様内の別条件を調べる。仕様の未確定箇所を正解として固定してはならない。M10ではPhase 2の資産をCIへ接続するため、未演習ケースの追加実装を要求しない。

## 受入試験

| 検証 | 合格条件 |
| --- | --- |
| 教材分離 | 旧`docs/curriculum/test-automation/**`に差分0。新教材だけで一連の導線が成立 |
| 学習項目とクイズ | [学習順序・習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)に基づき、**M00前の開始ガイドと51項目すべての説明・演習・Level 2判定・復習先**がある。公開クイズ、公開模範・採点資料、評価時に初めて提示する条件を区別 |
| 共通開始 | 本人の支払主体・Codespaces無料枠・2コアの選択・起動を確認。**OpenCode Zen無料モデルの利用可否・認証可否は確認済みとして再検証しない**。`qa-workflow-skills`とPython helperの実行、個人Secretの安全な取扱いを確認 |
| 教材同期 | 許可リストから学習用Templateを生成し、公開模範・採点資料・完成spec・Secret・正式workflowを除外。同期元SHAを記録。この配布除外は秘密保持ではない |
| 学習者ロード | 本人が`course:load Mxx`で指定した1モジュールだけをロード。未知ID拒否・既存成果物の上書き防止・他モジュールの非変更 |
| 開始・終了基準状態 | **M00〜M10の正しい開始・終了の実データと検証条件**を作り、前後の成果物ID・revisionの矛盾、入力欠落、別解の扱い、公開完成状態と学習者配布の分離を確認 |
| Phase 1 | **学習用Templateからの個人リポジトリ・GitHubログインは必要**だが、Git/PR/Playwright/CI操作なしでM00〜M04を一つずつロードし、分析→設計→独立修了できる |
| Phase 2 | **学習用リポジトリ単体**の2コアCodespacesでBuild/Serve/Seed/Reset→Node/pnpm/Playwright→専用spec実行→診断・改善→独立修了がGit/PR/CIなしで行える。8081/8082/6080・結果保存先が正しく、旧training specや正式回帰を混ぜない |
| M02→M03の固定Skill受入 | 実在するCartのAuthority/Risk/ScopeとTR相当の検証責務1件から、condition_structure(direct)→選択技法→materialize_coverage(artifact)→case_structure→最終evidence gateを実行。参照欠落、Disposition誤用、mode不一致、未解決、終了コード0のinvalid_inputを成功にしない |
| 実行証拠 | 新課程専用のログ・report・Artifact。未実行と成功を区別 |
| 旧Trainer | 旧`training:web:baseline`、旧validator・修了確認の契約は維持 |
| Phase 3専用CI | **選択受講者だけ**個人の学習用リポジトリで新workflowを作成・有効化し、旧コピーのallowlistや正式workflowを変更しない |
| Phase 3のCI | 本人の非公開リポジトリと標準Runnerの無料枠・課金防止・安全性を確認し、新課程の対象SHAとRun/Check/Artifactを対応させる。権限・Secret・デプロイを制限し、Phase 1・2の合否とは独立 |
| 仕様とSeed | 必須課題の期待結果が正式BR/ACで根拠付けられ、既存データが破壊されない |
| フェーズ別総合演習 | M04で設計、M07でCodespaces内E2E、M10でCI実行を**それぞれ別の修了条件で確認**。各段階で成果物のダウンロード・保全ができ、後続フェーズ未受講を不合格にしない |

変更に応じて`pnpm run validate:curriculum`、`pnpm run test:contracts`、新課程専用のvalidatorとPlaywright実行、Training Copy検証を実行する。**旧の成功結果を新課程のPASSとして報告しない**。実行できない場合は対象・原因・状態を明記する。
