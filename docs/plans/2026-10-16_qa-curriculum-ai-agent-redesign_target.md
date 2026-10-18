# 新課程のScenario Shop演習・実行・CI分離設計

## 結論

**Phase 1は別の学習用リポジトリのCodespacesでAIによるテスト分析・設計、Phase 2は同じCodespaceでPlaywright実装・実行、Phase 3は同じ個人リポジトリでGitHub・CI（選択）**とする。各フェーズに独立した実技・修了判定を用意する。新旧の教材・評価・受講者コード・CIの実行経路を分離し、テスト対象としてのScenario Shopと正式仕様・Seedは共用する。**新課程のために製品本体へバグや新機能を作ることはしない。** 既存のデータと演習で不足することが具体的に確認できた場合のみ、まず新課程側の教材・専用Seed経路から最小の変更を検討する。

## 新課程で使う学習対象

| モジュール | Scenario Shop・既存資料の候補 | 必要な実践 |
| --- | --- | --- |
| Phase 1 / M00〜M02 | Codespaces内で開く`docs/spec/features/cart.md`等の仕様資料、商品一覧・Cartの条件表 | Codespace・OpenCode CLIの初回操作→AIへの自分の依頼、BR/AC・Role/State・Riskの区別 |
| Phase 1 / M03 | `BR-CART-001`、`default`、`low-stock`、`out-of-stock`の**仕様・条件資料** | 境界値・期待結果を配布資料で設計。実際のSeed/Playwright実行は不要 |
| Phase 1 / M04 | `cart-with-invalid-items`、`BR-CART-003`、**未演習の条件** | AIの設計案をレビューし、初見条件の自動化候補とCaseを確定（Phase 1独立総合演習） |
| Phase 2 / M05〜M06 | Phase 1のCase、Cart、`training/playwright/support/reset-scenario.ts` | Codespacesに導入済みのNode.js/Playwrightの設定理解、コード作成・Reset・Codespace内実行 |
| Phase 2 / M07 | 既存`diagnostic-cart.spec.ts`、`c10-locator-maintenance.spec.ts`、未演習条件 | 誤ったAssertionの原因特定・最小修正・前後別Run（Phase 2独立総合演習） |
| Phase 3（選択）/ M08〜M09 | Phase 2のspec、Training用の隔離コピー | Git差分・PR・対象SHAのCIと証拠 |
| Phase 3（選択）/ M10 | Phase 2で作ったspecとテスト実行環境 | **再実装せずCIへ組み込み**、対象SHA・Run/Artifact・失敗時対応を評価（Phase 3総合演習） |

これらは**演習候補**であって、実際にすべて動作検証済みという意味ではない。Phase 1の初見条件は仕様資料上で解ける内容に限定する。Phase 2で使う未演習条件には実行可能なSeed/Resetと既知の期待動作が必要。Phase 3はPhase 2のspecをそのまま使う。

## 新旧と製品の物理的な境界

| 役割 | パス・扱い |
| --- | --- |
| 旧教材 | `docs/curriculum/test-automation/`：**不変更** |
| 新教材の正本 | `docs/curriculum/ai-assisted-qa/`：README・modules・学習用quizzes/answers・assessments。**修了課題の模範解答は公開しない** |
| 旧Trainer | `training/playwright/`、`training/workbook/`：既存の提出形式・コードは不変更 |
| 既存探索QA | `training/agentic-qa/`：Scored Challenge等。新課程として上書きしない |
| 新Trainerの正本 | `training/ai-assisted-qa-course/`：配布可能な未完成spec・課題素材と実行手順だけ |
| 教材の同期定義 | `training/course-sync/manifest.json`（配布許可リスト）、`scripts/training/sync-ai-assisted-qa.ts`（管理者用・実装予定） |
| 学習用リポジトリ | **別の公開Template**を生成・管理し、学習者のCodespacesで`pnpm course:load Mxx`を本人が実行。教材・作業領域を分離 |
| 非公開評価資料 | 実技・修了課題の模範解答や必要な評価用テストはアクセス制限された別の保存先。公開Git履歴にも入れない |
| 製品仕様・Seed | `docs/spec/`、`src/seeds/`：新旧が共通参照する正本 |
| 旧validator・旧修了確認 | `scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts`：変更しない |
| 新validator | 必要なら `scripts/ai-assisted-qa/` に置く。新課程の構造・問題/解答・実行結果のみ対象 |
| 正式テスト・デプロイ | `e2e/web/`、`maestro/`、既存の正式workflow：Training課題を混入しない |

レッスン用ファイルは旧課程へ追記しない。学習用リポジトリに配布したREADMEから、学習者が**モジュール単位でロードし**、学習の順序、確認クイズ、実技、復習と修了まで進められることを目指す。同期元の許可リスト・ロード・解答の扱いは[同期・ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)を参照する。

## Codespacesの共通環境・無料枠管理（Phase 1〜3）

- **標準は学習用Templateから作成した個人リポジトリのGitHub Codespaces、2コア**。受講者はGitHubにログインし、**Templateから自分のリポジトリを作って**Codespaceを作成する。**現行`.devcontainer/devcontainer.json`には`hostRequirements`の設定がなく、2コアは固定されていない**。作成時にMachine typeを確認し2コアを選ぶ。2コア利用での安定動作は新規実機確認が必要。
- 同期元の既存`.devcontainer/devcontainer.json`のNode.js 24、pnpm、Chromium、OpenCode CLI、Codex CLI、GitHub CLI、desktop-liteを**学習用リポジトリの実行環境へ必要に応じて再利用する**。**全環境を新規実装・再導入しない**。初回起動ログ、必要コマンド、認証状況を確認してから演習する。既存手順は[Codespaces利用ガイド](../guides/codespaces.md)を参照する。
- **GitHub Free個人無料枠は120コア時間/月、15 GB-month/月**（2コアなら計算上約60起動時間/月）。組織アカウントにはCodespaces無料枠がないため、受講者本人がCodespaceの所有者・支払主体であることと、残量・支出上限を事前に確認する。単純に「リポジトリが公開だから無償」と判定しない。ストレージは停止中も消費する。費用・認証・利用権限が満たせない場合はBLOCKEDにし、無断で有料環境へ変更しない。
- OpenCodeは既存の**CLI**を標準とする。既存ガイドではOpenCode VS Code拡張の起動に制約が記録されているため、未検証の拡張機能を受講の前提にしない。Zenの`OPENCODE_API_KEY`は**個人のCodespaces Secret**とし、認証キャッシュ・Secret値を配布物・公開PR・ログへ出さない。**無料モデルのみ**を利用し、セッション補助モデル、モデルの自動選択、Zenのauto-reload・月間上限・支払条件は実際の利用前に確認する。固定CLI＋個人Secretの認証動作・全受講者の無料利用は未実証。
- GitHub Codespacesの**8081（通常Web）と6080（noVNC）はPrivate**のままにし、5901を外部公開しない。Training用Playwrightの8082は専用テストサーバーで、8081をTraining実行先として使わない。コード生成`codegen`と実際のE2E実行対象の違いを教材で示す。
- 学習終了時はCodespaceを停止し、不要なCodespace・Artifactの保存量を確認する。**Phase 1で設計Markdown、Phase 2でspec・設定・結果・ログ**をGit操作なしでダウンロード・保全できることを確認する。削除・利用枠超過・再構築に伴うデータ消失に備え、段階的にバックアップする。所要時間・ストレージ消費は実測して無料枠内での完走可否を判断する。

## 管理者による同期と学習者によるモジュール単位ロード

- 教材管理者が確定した配布元commitと許可リストから**別の公開学習用Template**を更新する。`qa-training-store`全体のcloneや旧`prepare-training-copy.ts`の出力をそのまま配布しない。受講者による同期スクリプトの実行は想定しない。
- **学習者本人**が`pnpm course:load M03`のように**1モジュールIDを指定**し、必要な課題ファイルを`workspace/M03/`へロードする。過去の成果物・編集済みファイルを上書きせず、他モジュールを自動ロードしない。ロードのためにGitコマンド・ネットワークアクセス・CIは要求しない。
- 配布済みの他モジュールは、ロード前でもAIから参照可能である。**秘密にするべき修了課題の正答・模範コード・評価用テストを公開Git履歴や配布対象へ入れない**。通常の学習用クイズの公開解説と非公開評価資料を区別する。
- 学習者の作業フォルダと課題素材・実行環境を分ける。学習者の成果物はモジュール間で参照可能にし、同期・再ロードで消さない。新しい受講者リポジトリへの作成・push自体は**本PRで行わない**。

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
4. **公開の学習用リポジトリ＋標準GitHub-hosted Runner**を無料利用の第一候補とする。個人情報やSecret、不要な学習者成果物を公開commitしない。private/larger runnerの利用を無料と決めつけない。
5. 実際のGitHub権限・Runner・workflow実行が利用不能ならPhase 3の実技をBLOCKEDにする。すでに完了したPhase 1・2の評価は維持する。

## 知識グラフからテスト対象とSkillを見直す

[基準グラフ](../curriculum/ai-assisted-qa/README.md)は、学習目標の必要知識と**Scenario Shopの正式な仕様ファイル**、別リポジトリ**`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**の使用候補を参照する。`qa-training-store/.agents/skills/`は今回のQA workflow Skillの正本として扱わない。

- 製品のBR/AC・Seed/Reset・テスト用画面が変わったとき、`impact`は**影響候補**を列挙する。元の仕様に照らして教材の例・実技・修了条件を再確認する。**学習対象の機能を自動で増減させない**。
- Skillが改訂されたとき、現在参照するcommitと変更後のSkill本体・補助Pythonスクリプト・入出力契約を比較して、関連モジュールの演習を再実行するか判断する。**参照関係だけでは起動成功・Skillの正しさを保証しない**。
- 初期版では仕様4ファイル・Skill 11件を**候補として登録**しているだけで、教材/実技での最終採用・動作検証は未完了。

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

## Codex実装時の受入試験

| 検証 | 合格条件 |
| --- | --- |
| 教材分離 | 旧`docs/curriculum/test-automation/**`に差分0。新教材だけで一連の導線が成立 |
| 学習項目とクイズ | [学習順序・習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)に基づき、**M00前の開始ガイドと51項目すべての説明・演習・Level 2判定・復習先**がある。公開クイズの解説と非公開の修了解答を区別 |
| 共通開始 | 本人の支払主体・無料枠・2コアの選択、Codespaces起動、OpenCode Freeモデルと個人Secret、Skill/Python helperが実際に利用できる（未確認ならBLOCKED） |
| 教材同期 | 許可リストから学習用Templateを生成し、非公開解答・完成spec・Secret・正式workflowを除外。同期元SHAを記録 |
| 学習者ロード | 本人が`course:load Mxx`で指定した1モジュールだけをロード。未知ID拒否・既存成果物の上書き防止・他モジュールの非変更 |
| Phase 1 | **学習用Templateからの個人リポジトリ・GitHubログインは必要**だが、Git/PR/Playwright/CI操作なしでM00〜M04を一つずつロードし、分析→設計→独立修了できる |
| Phase 2 | **学習用リポジトリ単体**の2コアCodespacesでBuild/Serve/Seed/Reset→Node/pnpm/Playwright→専用spec実行→診断・改善→独立修了がGit/PR/CIなしで行える。8081/8082/6080・結果保存先が正しく、旧training specや正式回帰を混ぜない |
| 実行証拠 | 新課程専用のログ・report・Artifact。未実行と成功を区別 |
| 旧Trainer | 旧`training:web:baseline`、旧validator・修了確認の契約は維持 |
| Phase 3専用CI | **選択受講者だけ**個人の学習用リポジトリで新workflowを作成・有効化し、旧コピーのallowlistや正式workflowを変更しない |
| Phase 3のCI | 公開学習用リポジトリと標準Runnerの無料条件・安全性を確認し、新課程の対象SHAとRun/Check/Artifactを対応させる。権限・Secret・デプロイを制限し、Phase 1・2の合否とは独立 |
| 仕様とSeed | 必須課題の期待結果が正式BR/ACで根拠付けられ、既存データが破壊されない |
| フェーズ別総合演習 | M04で設計、M07でCodespaces内E2E、M10でCI実行を**それぞれ別の修了条件で確認**。各段階で成果物のダウンロード・保全ができ、後続フェーズ未受講を不合格にしない |

変更に応じて`pnpm run validate:curriculum`、`pnpm run test:contracts`、新課程専用のvalidatorとPlaywright実行、Training Copy検証を実行する。**旧の成功結果を新課程のPASSとして報告しない**。実行できない場合は対象・原因・状態を明記する。
