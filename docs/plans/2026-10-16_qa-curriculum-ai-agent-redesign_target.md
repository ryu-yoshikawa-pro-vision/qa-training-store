# 新課程のScenario Shop演習・実行・CI分離設計

## 結論

**Phase 1はローカルの仕様資料とAIによるテスト分析・設計、Phase 2はローカルのPlaywright実装・実行、Phase 3はGitHub・CI（選択）**とする。各フェーズに独立した実技・修了判定を用意する。新旧の教材・評価・受講者コード・CIの実行経路を分離し、テスト対象としてのScenario Shopと正式仕様・Seedは共用する。**新課程のために製品本体へバグや新機能を作ることはしない。** 既存のデータと演習で不足することが具体的に確認できた場合のみ、まず新課程側の教材・専用Seed経路から最小の変更を検討する。

## 新課程で使う学習対象

| モジュール | Scenario Shop・既存資料の候補 | 必要な実践 |
| --- | --- | --- |
| Phase 1 / M00〜M02 | ローカル配布する`docs/spec/features/cart.md`等の仕様資料、商品一覧・Cartの条件表 | AIの誘導付き操作→自分の依頼、BR/AC・Role/State・Riskの区別 |
| Phase 1 / M03 | `BR-CART-001`、`default`、`low-stock`、`out-of-stock`の**仕様・条件資料** | 境界値・期待結果を配布資料で設計。実際のSeed/Playwright実行は不要 |
| Phase 1 / M04 | `cart-with-invalid-items`、`BR-CART-003`、**未演習の条件** | AIの設計案をレビューし、初見条件の自動化候補とCaseを確定（Phase 1独立総合演習） |
| Phase 2 / M05〜M06 | Phase 1のCase、Cart、`training/playwright/support/reset-scenario.ts` | Node.js/Playwright構築、コード理解・作成・Reset・ローカル実行 |
| Phase 2 / M07 | 既存`diagnostic-cart.spec.ts`、`c10-locator-maintenance.spec.ts`、未演習条件 | 誤ったAssertionの原因特定・最小修正・前後別Run（Phase 2独立総合演習） |
| Phase 3（選択）/ M08〜M09 | Phase 2のspec、Training用の隔離コピー | Git差分・PR・対象SHAのCIと証拠 |
| Phase 3（選択）/ M10 | Phase 2で作ったspecとテスト実行環境 | **再実装せずCIへ組み込み**、対象SHA・Run/Artifact・失敗時対応を評価（Phase 3総合演習） |

これらは**演習候補**であって、実際にすべて動作検証済みという意味ではない。Phase 1の初見条件は仕様資料上で解ける内容に限定する。Phase 2で使う未演習条件には実行可能なSeed/Resetと既知の期待動作が必要。Phase 3はPhase 2のspecをそのまま使う。

## 新旧と製品の物理的な境界

| 役割 | パス・扱い |
| --- | --- |
| 旧教材 | `docs/curriculum/test-automation/`：**不変更** |
| 新教材 | `docs/curriculum/ai-assisted-qa/`：独立したREADME・modules・quizzes・answers・assessments |
| 旧Trainer | `training/playwright/`、`training/workbook/`：既存の提出形式・コードは不変更 |
| 既存探索QA | `training/agentic-qa/`：Scored Challenge等。新課程として上書きしない |
| 新Trainer | `training/ai-assisted-qa-course/`：新spec、演習用コード、必要な実行手順だけ |
| 製品仕様・Seed | `docs/spec/`、`src/seeds/`：新旧が共通参照する正本 |
| 旧validator・旧修了確認 | `scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts`：変更しない |
| 新validator | 必要なら `scripts/ai-assisted-qa/` に置く。新課程の構造・問題/解答・実行結果のみ対象 |
| 正式テスト・デプロイ | `e2e/web/`、`maestro/`、既存の正式workflow：Training課題を混入しない |

レッスン用ファイルは旧課程へ追記しない。新教材のREADMEだけで、学習の順序、確認クイズ、実技、復習と修了まで進められることを目指す。

## Phase 1：GitHub・Playwrightなしでの教材配布・実技

1. 受講者はGitHubアカウント・clone操作を必要としない。正式仕様の必要部分、演習に使う条件・状態・回答テンプレート、および利用するSkillと補助ファイルの**実行に必要な一式**を、信頼できる配布元から**ローカル配布可能な教材**（ZIP等）として準備する。仕様・Skillの基準revisionと利用上の前提を記録し、相対パスや依存の欠落でSkillが動かなくならないか実際に確認する。
2. M00ではOpenCodeの起動・作業範囲・Skill発見を段階的に習い、初回は読み取り中心の操作から始める。目的と許可範囲を理解した後に学習用ファイルへの編集を許可する。
3. M02〜M04では仕様に基づくRisk/Condition/Case、AI提案の採否と根拠をMarkdown等で保存する。画面実行・Playwright・CIを**Phase 1修了の必須条件にしない**。
4. [評価設計](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)のPhase 1総合演習を初見の仕様条件で行い、Phase 2への引継ぎ成果物を作る。AI認証や外部Skillが実行できない場合はBLOCKEDと記録し、成功を捏造しない。

## Phase 2：ローカルWeb実技の実行設計

現在の`playwright.training.config.ts`は`testDir`を`training/playwright`へ固定し、`PLAYWRIGHT_TEST_ROOT`でテストディレクトリを切替可能である。また結果出力先は`output/training/playwright/`に固定されている。

**Phase 2はGitHub不要のローカル環境で独立して完結する。** そのまま旧コマンドを呼ぶだけでは新課程の専用specを検証したことにならない。

1. Node.js/npm・Playwrightの導入・設定・実行手順から教え、Configの役割と実際のコマンドを受講者に確認させる。GitHubからのcloneやPR操作を前提にしない。
2. 新課程のspecを`training/ai-assisted-qa-course/playwright/`等に配置する。
3. 構成の再利用は可能だが、**テスト対象と結果出力先を旧課程とは別**にする。必要なら新しい`playwright.ai-assisted-qa.config.ts`を作り、旧`playwright.training.config.ts`の設定を安全に参照する。設定を丸ごと複製しないことを優先する。
4. 最初は既存の`reset-scenario.ts`を読み取り・importして使用できるか検証する。使えなければ理由を示したうえで、必要最小限の新課程専用helperを追加する。
5. Webの主対象は既存Cart。数量・在庫・Role/Stateの実際の仕様ID、画面、Seedと一致することを確認する。
6. 新課程のspecを実行するCLIコマンドを明示し、`training:web:exercise`を新課程のコマンドに読み替えない。
7. 新課程のTrace/Report/Receiptは専用出力先に作成し、旧課程の実行結果の流用や上書きを防ぐ。**成功したBaselineと本人のテスト成功は別**。

新規のpackage scriptが必要になったら`package.json`へキーを追加してもよいが、既存のscriptの引数・意味は変えない。旧課程の`check-completion`は新課程の合否判定に使用しない。

## Phase 3（選択）：GitHub ActionsとTraining Copy

### 既存制約（確認済み）

- `scripts/training/prepare-training-copy.ts`は、作業コピーのworkflowを隔離した後に`training/github-actions/training-ci.yml`と`training-native-ci.yml`の**2つだけ**を有効にする。
- `scripts/training/validate-training-copy.ts`は有効workflowのallowlistをこの2つに固定しており、**新しいworkflowを1つ追加しただけでは旧validatorに失敗する**。
- 既存`training-ci.yml`は`validate:curriculum`と`training:web:exercise`を使う。これは旧課程の対象であり、新課程の専用specや評価の成功を保証しない。
- `scripts/training/materialize-training-handoff.ts`は受講者コードを`training/playwright/`以下に限定している。新課程の提出物を旧handoffにそのまま載せない。

### 採用案：新課程専用のコピーとCI

1. **旧課程のTraining Copy経路はそのままにする**。旧`prepare`・`validate`・`materialize`の契約を変えない。
2. **Phase 3を選択した受講者だけ**、新課程がM09のCI実習を行う際は、旧コピーツールを安全に再利用できるか確認する。可能なら旧`prepare-training-copy.ts`で隔離コピーを用意してから、新課程専用の**別セットアップ手順**で旧有効workflowを退避して新課程workflowへ切り替える。再利用できない具体的な制約があれば、処理を重複させない範囲で独立したコピー生成手順を用意する。
3. 新課程コピーは`training/ai-assisted-qa-course/`のspecと検証だけを実行する**新課程専用のworkflow**を有効にする。Secret不要、権限最小化、明示された対象SHA/Artifact、デプロイ経路を含まない。
4. 新コピーは**新課程用のvalidator**で検査する。旧`training:copy:validate`が新コピーを拒否するのは旧契約どおりであり、この拒否を解消するために旧allowlistを拡張しない。旧コピーは引き続き旧validatorで検査する。
5. いずれのコピーも製品の正式workflowへ受講者specを混ぜない。新課程のCIが動作したことを**対象の正確なcommit SHA、Run/Check/Artifact**で示す。
6. 受講者のPR/CI利用にはGitHub権限・Runner時間など実行環境が必要。利用できなければ実行部分を`BLOCKED`にし、すでに完了したローカル成果物は維持する。CI未実行をPASSにしない。

この方式は「新旧を分離する」が、製品側のビルド・Playwright環境まで不必要に二重実装しない。最低限の共通依存は読み取り利用する。

## AIエージェントとqa-workflow-skills

- M00でOpenCodeのSkill発見と安全な利用を確認し、使用した`qa-workflow-skills` revisionを記録する。
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
| 学習項目とクイズ | 新課程の全必須項目に知識・実技の対応があり、解答・根拠・復習先が存在 |
| Phase 1 | GitHubアカウント・Playwrightなしで配布教材→AI操作→仕様分析→ケース設計→独立修了を行える |
| Phase 2 | GitHub・CIなしでNode/Playwrightの設定→新課程specの実行→診断・改善→独立修了を行える。旧training specや正式回帰を混ぜない |
| 実行証拠 | 新課程専用のログ・report・Artifact。未実行と成功を区別 |
| 旧Trainer | 旧`training:web:baseline`、旧validator・修了確認の契約は維持 |
| Phase 3専用コピー | **選択受講者だけ**新workflowを有効にし、新validatorが検査。旧コピーのallowlistを変更しない |
| Phase 3のCI | 新課程の対象SHAとRun/Check/Artifactが対応し、権限・Secret・デプロイを制限。Phase 1・2の合否と独立 |
| 仕様とSeed | 必須課題の期待結果が正式BR/ACで根拠付けられ、既存データが破壊されない |
| フェーズ別総合演習 | M04で設計、M07でローカルE2E、M10でCI実行を**それぞれ別の修了条件で確認**。後続フェーズ未受講を不合格にしない |

変更に応じて`pnpm run validate:curriculum`、`pnpm run test:contracts`、新課程専用のvalidatorとPlaywright実行、Training Copy検証を実行する。**旧の成功結果を新課程のPASSとして報告しない**。実行できない場合は対象・原因・状態を明記する。
