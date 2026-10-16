# テスト自動化・AIエージェント活用カリキュラム再設計Plan

## 目的

Scenario Shopを一貫したテスト対象とし、テスト分析・設計・自動化・結果分析・改善・継続実行を、AIエージェントと協働して進められる初級エンジニアの育成課程へ見直す。

AIエージェントの実習には、無料で利用できるモデルがあるOpenCodeを採用し、QA工程の支援に別リポジトリの[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)を使用する。OpenCode固有のモデル名・細かな設定・Skill内部実装の暗記は学習目標にしない。重視するのは「何をAIへ任せ、どの成果物を自分で確認し、どう作業を進めるか」を実際に経験すること。

このPlanは学習目的、到達基準、教材構成、評価方法、テスト対象・実行環境の変更方針を決めるための設計計画である。**このコミットではカリキュラム本文、採点基準、Seed、アプリ、テスト、CIを変更しない。** Planの承認を実装開始の条件とする。

## 今回の前提と作業境界

- 対象リポジトリは \`ryu-yoshikawa-pro-vision/qa-training-store\`。教材・演習・正式仕様は、このリポジトリのScenario Shopへ統一する。
- 本Planの作業ブランチは \`docs/plan-ai-agent-qa-curriculum-redesign\`。作成時の親コミットはPR #198 \`docs/refine-spec-curriculum-ja\` の \`36803c29efd1df8f09ef7b7d533759f79dc9893f\`。
- PR #198は**文章表現のリライトのみ**を対象とする。今回の学習目的・評価基準・製品変更をPR #198へ混在させない。PR #198が進んだ場合、実装着手時に最新の差分を再確認する。
- 以前の \`feat/ai-assisted-qa-curriculum\` で作成した内容は取り消し済み。再利用する場合も、その内容を正解や設計上の前提とせず、目的から検証する。
- 本Plan段階で新たな製品仕様・意図的な不具合・Skill実装を追加しない。必要性が確認された変更だけを後続の実装段階に含める。
- マージ、force push、既存ブランチ削除、既存PRの変更は作業範囲に含めない。

## 現状確認と根拠

以下は2026-10-16時点の実装・文書に基づく確認事項。実動作を証明した項目と、ファイルから読み取れる設計上の契約は区別する。

### カリキュラムと評価

| 対象 | 現状 | 見直す理由 |
| --- | --- | --- |
| \`docs/curriculum/test-automation/README.md\` | Part 1が9レッスン、Part 2が8レッスン。共通課程はWeb中心、Maestroは選択課程 | 現在の順序と分割を固定せず、AI活用が自然に入るか比較する |
| \`00_learning-design.md\` | 初学者・プログラミング未経験者を想定。Part 1でGitHubアカウントを必須にしない | AIがファイル変更する際の差分確認など、必要最小限の安全操作をどの段階で教えるか決める |
| \`02_competency-rubric.md\` | C01〜C12。Part 1共通はC01〜C07とC09〜C10、最終共通はC01〜C07とC09〜C12のレベル2 | AIへ任せる判断と受講者自身の理解・評価能力が、現行項目から十分判定できるか未確定 |
| \`04_learning-effort-reference.md\` | 共通課程の標準工数は67.5〜98時間、通常の目安は約80〜85時間。受講実績ではなく試算 | AI活用を追加するとともに、置き換えられる学習時間も考慮して再試算する |
| \`part1/09_specification-agentic-qa.md\` | Agentic QAは参考資料で、共通の修了要件には含まれない | 基礎的なAI活用に使う部分と、高度なBlack-box Scoredなどの選択・参考部分を区別する |
| \`part1/09_part1-capstone.md\` / \`part2/08_integration-design-capstone.md\` | カートのWebテストとWeb CI導入をまとめる総合演習がある | 卒業時に「AIへの依頼→成果物の検証→実行→改善」を実証できるか見直す |

### 利用できる教材・実装

- \`training/workbook/\` に対象・リスク、テストケース、自動化対象、実行・改善の4 CSVがある。仕様・リスク・ケース・コード・証拠の追跡に使用している。
- \`training/playwright/\` には \`baseline/\`、\`exercises/\`、\`diagnostic-exercises/\`、\`failure-exercises/\`、\`maintenance-exercises/\` が分離されている。完成答案を先に見せない設計で、正式な \`e2e/web/\` と区別されている。
- \`training/agentic-qa/\` には受講者向けChallenge、講師用情報、Skill snapshot、Tool Profileがある。\`docs/reference/agentic-qa-workflow.md\` と \`.agents/skills/exploratory-qa/\` は、探索QAのNormal / Gray-box / Black-box Scoredと検証境界を扱う。一般の分析・設計演習と同一の仕組みだとは扱わない。
- \`docs/guides/codespaces.md\` と開発コンテナにはOpenCode CLIの導入経路が存在する。ただし、ガイドは個人のSecretを使う運用の認証成功を未検証と記載しており、今回の受講環境でのSkill連携も未実証である。
- \`scripts/validate-curriculum.ts\`、\`tests/contracts/training-curriculum.test.ts\` では現行のレッスン数・ファイル・表示文言・Training入口等を検査する。\`scripts/training/check-completion.ts\` は既存Lesson IDのself-check等を扱う。\`tests/contracts/training-completion.test.ts\`、\`training-copy-handoff.test.ts\` 等も関連する。教材構成を変更する場合は機械契約への影響を必ず確認する。
- \`training:copy:prepare\` / \`training:copy:validate\` は学習用CIの実行範囲を限定する。元リポジトリのデプロイ・正式回帰テストへ演習コードを混ぜない。

### qa-workflow-skills

2026-10-16確認時の \`main\`: \`dcabbb218cf79f6920f5c8303e60140ab9c15f23\`。

\`skills/\` 配下には22 Skillがあり、\`qa-workflow\`が必要工程の開始・再利用・停止・再開を管理する。個別の \`spec-analysis\`、\`test-analysis\`、\`test-condition-design\`、\`test-case-design\`、\`coverage-analysis\`、\`e2e-test-inspection\`、\`e2e-test-implementation\`、\`e2e-test-execution\`、\`e2e-test-result-analysis\` 等が工程を担当する。Playwright E2E実装・実行は別Skillへ分かれ、QAの全工程を常に通すわけではない。

注意点:
- 意味上の判断はLLMが担当し、ID・トレーサビリティや一部のテスト技法はSkill付属の決定論的スクリプトが担当する。Skillの説明文を読ませただけで実行・検証が完了したと見なさない。
- Skill本来の成果物形式・IDと、\`training/workbook/\`のCSV・IDの互換性は未検証。初めから変換器や新しい共通データベースを作らない。
- \`e2e-test-implementation\` と \`e2e-test-execution\` はPlaywright向けである。Maestro向けに同等の専用Skillがあるという前提は置かない。
- PR #16は未マージの実装作業、PR #17は未実装の評価ランナーPlanであり、今回の必須教材の前提にはしない。
- \`qa-training-store\` 内の \`exploratory-qa\` と \`qa-workflow-skills\` 内の \`exploratory-testing\` は責務・実行契約が異なる。併用が必要な場合だけ境界を決める。

参考: [qa-workflow-skills README](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/blob/main/README.md)、[OpenCode Agent Skills公式仕様](https://opencode.ai/docs/skills/)、[Playwright Best Practices](https://playwright.dev/docs/best-practices)。

## 再設計する学習目的（検討案）

現行の「汎用テスト自動化エンジニア」を出発点とするが、到達目標は次の作業を**実際に説明・実行・検証できること**で定義する。番号やレベル体系の維持は後述の比較で決める。

| 目標 | 卒業時にできること | 判断できる証拠 |
| --- | --- | --- |
| G1 テスト対象の理解 | 正本仕様、観測事実、未確定事項を区別し、リスクとテスト条件を整理する | BR / ACなどの根拠を持つ分析・テスト条件、欠落や矛盾の指摘 |
| G2 AIエージェントの活用 | 仕事の目的と入力・制約・出力を与え、OpenCodeと必要なSkillを使って分析・設計を進める | 実際の依頼内容、使用したSkill、生成結果、未完了・不明点を区別した記録 |
| G3 AI成果物の検証 | AIが出したテストケースや期待結果を仕様・技法・リスクと照合して採否を判断する | 採用／修正／不採用とその理由、重複・不足・根拠不明の指摘 |
| G4 自動化と実行 | PlaywrightテストをAIと協働して作成・実行し、再現性・アサーション・データ初期化を確認する | 受講者が説明可能なコード差分、対象テストの実行結果と証拠 |
| G5 原因分析と変更管理 | テスト失敗と製品不具合を区別し、AIの修正案をレビューして必要な再実行・PR・CI確認を行う | 原因と証拠の対応、修正前後の検証、差分・レビュー・CI結果 |
| G6 安全な利用 | AIが参照・変更できる範囲、認証情報・テストデータの扱い、予期しない変更の防止を説明・実践する | 許可範囲内の操作、秘密情報を含まない成果物、意図した変更のみの差分 |

**評価の原則**: AIを使って作成した成果物も、受講者が理解し、検証して採用したなら成果物と認める。コードの暗記、長いプロンプトを書く能力、特定モデルの利用、全22 Skillの把握は修了条件にしない。一方、AIが答えた・テストが通ったという理由だけで、仕様や期待結果の妥当性まで認定しない。

プログラミング未経験者を想定するため、JavaScript / TypeScriptやGitは「生成されたテストと差分を読み、原因の切り分け・安全な修正ができる」ために必要な深さを見極める。すべてを手書きする習得量を、従来どおり要求するかは再評価する。

## 検討・実装の進め方

### 1. 卒業像と到達基準の確定

対象: \`README.md\`、\`00_learning-design.md\`、\`02_competency-rubric.md\`、Part 1・Part 2総合演習。

1. 想定受講者（手動テスト経験、プログラミング未経験、AIエージェント経験の有無）と、修了後に任せたい実務タスクを明記する。
2. 現行C01〜C12とG1〜G6を対応付け、既存項目の説明変更で足りるもの、追加・統合・削除が必要なものを分ける。**C01〜C12の維持も拡張も先に決めない。**
3. 初級として必要な手作業の理解度を決める。最低限、仕様に反する期待結果や無意味なAssertionを見抜けること、AIが編集した差分と実行結果を説明できることを求める。
4. Part 1とPart 2の境界、Web必須・Maestro選択課程の妥当性を検討する。モバイル必修化やiOSランタイム必須化は、必要性と環境の根拠がない限り行わない。
5. 受講者がAIを実際に利用できることを目的に含め、実行環境が使えない場合は**修了認定ではなく演習環境の未準備**として扱う。特定の有料モデルや無制限の無料利用枠を保証しない。

成果物: 卒業像、測定可能な到達基準、評価方法、既存C項目との変更対照表。

### 2. カリキュラム全体の再構成

対象: \`docs/curriculum/test-automation/part1/*.md\`、\`part2/*.md\`、\`01_spreadsheet-test-design.md\`、\`03_instructor-reference.md\`、\`04_learning-effort-reference.md\`。

現行17レッスンへAIの説明を追加するだけでは不十分。以下を比較してから採用する。

- **案A: 既存17レッスンを保ち、工程内の活動を置き換える。** 既存の教材・採点契約を再利用できる。ただしAI活用が付け足しになり、同じ内容の二重演習が生じるおそれがある。
- **案B: 学習順序・レッスン数・総合演習を組み替える。** 実務の流れに合う可能性があるが、既存のLesson ID、成果物受渡し、修了判定スクリプト、契約テストへの変更が増える。

比較基準は、目標G1〜G6の達成、初学者の前提知識、必須演習の重複、学習時間、実行・採点の再現性、既存契約への影響とする。A/Bの折衷は可能だが、選んだ構成の理由を記録する。

仮の学習順序は次のとおり。**これは確定したレッスン番号ではない**。

| 学習の流れ | 扱う能力 | 対応する既存教材と候補Skill |
| --- | --- | --- |
| ① 対象理解とAI利用の準備 | 仕様の読み方、AIの作業範囲、必要最小限のファイル・差分確認 | P1-1〜P1-2、\`spec-analysis\`、\`question-analysis\` |
| ② テスト分析・設計 | リスク、テスト技法、条件・ケース、期待結果の照合 | P1-2〜P1-3、\`test-analysis\`、\`test-condition-design\`、\`test-case-design\`、\`coverage-analysis\` |
| ③ Playwright実装・実行・改善 | 基礎構文の読解、AI生成テスト、Seed/Reset、失敗分析、保守 | P1-4〜P1-6・P1-8、\`e2e-test-inspection\`、\`e2e-test-implementation\`、\`e2e-test-execution\`、\`e2e-test-result-analysis\` |
| ④ 変更管理・継続実行 | Git・PRレビュー、CI、実行結果とリグレッション影響、総合演習 | P2-1〜P2-8、必要時の\`adversarial-review\`、\`regression-testing\` |
| 選択課程 | MaestroによるNative自動化、探索的QA、高度なAgentic QA | P1-7・P2-6、既存のAgentic QA Challenge。環境と前提に応じて選択 |

GitHubアカウントをPart 1必須にしない現行方針は、合理性を確認して維持候補とする。一方、AIがコードを変更する前に、\`git diff\`などの**最低限の差分確認と作業範囲の指定**を先に教える必要があるか検討する。Git・PR・CIの体系的な学習は適切な段階に配置する。

各レッスンは「何をAIに依頼するか」「どこを人間が判断するか」「成果物」「失敗した場合の対応」「次のレッスンへの引継ぎ」まで決める。元の説明を残したまま同内容を追加するだけの変更は避ける。

成果物: 採用した全体構成、レッスン対照表（維持・統合・変更・追加・削除）、前提関係、共通・選択・参考の分類、再試算した工数。

### 3. OpenCode・qa-workflow-skillsの実習設計と検証

対象: \`docs/guides/codespaces.md\`、\`.devcontainer/\`、\`docs/curriculum/test-automation/\`、\`training/\`。qa-workflow-skills本体の改修は本計画の直接対象外。

1. 開発用の隔離したTraining CopyでOpenCode CLIを起動し、Agent Skillsが認識されることを確かめる。公式に認識対象となる \`.agents/skills/<name>/SKILL.md\` などの既存経路を使用する。
2. \`qa-workflow-skills\`の利用commitを記録し、必要なSkillの \`SKILL.md\` と、呼び出される \`references/\`・\`scripts/\` も利用可能にする。22個のSkillをすべて授業で使うことは要求しない。
3. **最小の実演を先に確認する**: Scenario Shopの小さなCart条件で、仕様の分析→テスト条件→ケース→Playwright実装→限定実行→結果評価までを、実際のOpenCodeとSkillで1回通す。使用Skill、途中の停止、生成物、編集差分、コマンド、実行結果を記録する。
4. \`qa-workflow-skills\`の成果物がTraining Workbookの \`TARGET/RISK/TC\` 系ID・CSV列と直接接続できるかを比較する。差があれば、まず受講者が関連を記録できる最小の運用を検討し、繰り返し利用で必要と判明した場合だけ自動変換を実装する。
5. 既存 \`.agents/skills/exploratory-qa\` は探索・採点の別経路として扱い、同名の責務や完了条件を無理に共通化しない。
6. 無料モデルの利用可否、認証の経路、Codespaces等の別料金、AIへの入力データ、端末・権限・Skillの実行可能性だけを学習開始条件として確認する。モデル別性能比較や有料Claude Codeとの比較は必須課題にしない。

**重要**: この実演の成否は未確認。Skillが説明どおりに自律実行しなかった場合は、教材側で「実行できた」と見なさない。失敗箇所を切り分けて、(a) 教材手順の不足、(b) 対象repoとの接続不足、(c) Skill側の不具合、(d) 環境・無料利用枠の制約、のどれかを記録し、対応範囲を決める。

成果物: 再現可能な最小のAI実習、対象Skill一覧、利用revision、成功・制限事項、必要な教材上の手順。

### 4. Scenario Shopのテスト対象を評価する

対象の正本は \`docs/spec/README.md\`、\`docs/spec/features/*.md\`、\`docs/spec/state-and-scenarios.md\`。Seedの実装参照は \`src/seeds/metadata.ts\`、\`docs/07_testability/seed_catalog.md\`。既存のE2E・Training・テスト制御も照合する。

| 学習課題候補 | 既存仕様・Seed候補 | 不足を確認する点 |
| --- | --- | --- |
| 入力・境界値と正確な期待結果 | \`BR-CART-001\`、\`default\`、\`out-of-stock\`、\`low-stock\` | 指定数量、拒否後の保持、Resetを受講者が再現できるか |
| 複数条件、ロール・状態、除外理由 | \`BR-CART-002/003\`、\`guest-cart-merge-overflow\`、\`cart-with-invalid-items\` | 仕様根拠、テスト条件と観測結果、必要データが対応するか |
| 状態遷移と再開・不一致 | \`BR-CHECKOUT-001/002\`、\`checkout-resume\`、\`cart-version-invalidates-checkout\` | 開始・途中状態・終了・リセット、前後の差異を再現できるか |
| 決済失敗・処理中と結果の切り分け | \`BR-CHECKOUT-003\`、\`payment-declined\`、\`payment-processing\` | 外部決済を使わずに状態、二重操作防止、証拠を再現できるか |
| 失敗原因の調査・修正 | \`training/playwright/diagnostic-exercises/\`、\`failure-exercises/\`、\`maintenance-exercises/\` | AIの誤診と根拠のある原因切り分け、修正前後の比較を練習できるか |
| エージェントによる探索（選択・発展） | \`training/agentic-qa/challenges/\`、\`.agents/skills/exploratory-qa/\` | 既存Challengeの受講者・講師情報分離と実環境の隔離条件を満たせるか |

順序は「既存仕様・Seed・Training演習で実現できるか」→「小さなテストデータまたは教材の追加で足りるか」→「製品実装の変更が必要か」で判断する。

**製品を修正する条件**: 卒業要件に必須の学習課題があり、既存の画面・仕様・Seed・診断演習で再現できないことが、具体的な再現手順と必要な受入条件により確認された場合だけ。変更理由と対象のBR / AC、想定リスク、最小の修正位置、回帰検証を対応付ける。

- 新しいSeedだけで足りるなら、仕様・seed catalog・Seed実装・該当検証を整える。
- 既存のテストコントロール・Resetで足りるなら、教材の操作説明のみを修正する。
- 意図的な不具合や不安定テストを用意するなら、本体の正式な製品動作へ混ぜず、既存の診断演習または隔離Challenge側で扱う。
- 正式仕様と現在の実装が食い違った場合は、教材の都合で仕様を実装へ合わせず、既存の仕様変更手順に従って不整合を確認する。
- Web / Native・権限・価格・在庫・決済状態などへの影響を確認し、正式な回帰テストとTrainingテストの境界を維持する。
- \`docs/spec/unresolved-specifications.md\` の未確定項目は不具合や期待値の正解として使わない。

成果物: 学習目標→テスト条件→画面/機能→仕様ID→Seed→Training入口→期待される証拠の対応表、および実装変更の要否（不要の場合は理由）と修正対象の一覧。

### 5. 成果物・修了判定・CIとの整合

対象: \`training/workbook/*\`、\`scripts/training/check-completion.ts\`、\`scripts/training/materialize-training-handoff.ts\`、\`scripts/training/prepare-training-copy.ts\`、\`scripts/training/validate-training-copy.ts\`、\`scripts/validate-curriculum.ts\`、\`tests/contracts/training-*.test.ts\`、\`training/github-actions/*\`、関連 \`.github/workflows/*\`。

1. AIによる成果物を受講者自身の成果物と認めるために必要な証拠を定義する。最低限、目的・入力根拠、AIへの依頼または作業記録、生成結果、受講者の判断、実行・再実行の証拠を対応付ける。秘密情報や大量の会話ログの保存を要求しない。
2. 既存の4 CSV、\`handoff-root/{workbook,code,evidence,receipts,self-check}\`、Completion Receiptで表現できるか確認する。不足が明白なものに限って列・文書・チェック処理を追加する。
3. 現行のC01〜C12・Lesson IDを変更する場合は、参照・契約テスト・過去教材の互換性を確認する。既存テストが旧ルーブリックの文字列を固定しているからという理由だけで、学習目的の変更を断念しない。一方、必要のないID変更は行わない。
4. 機械判定可能なのはID・参照・ファイル・実行記録の整合といった事実であり、AIが提案したテスト条件の妥当性や受講者の理解度まで自動合格させない。自己確認・講師レビューで判定する意味上の基準を公開する。
5. \`training:copy:prepare\` / \`validate\` によるTraining CI隔離を維持し、受講者に本番Secret・元リポジトリへのPush権限・有料CI契約を要求しない。CIでのRun / Check / Artifactの証拠と、AIの自己申告を区別する。

成果物: 提出・評価形式、機械検証と人間の判断の境界、必要な契約テスト変更一覧、CIとコピー環境の移行方針。

### 6. 実装順序と検証

Plan承認後、上記の判断結果に沿って次の順序で実装する。後続の工程が前の工程の評価基準を勝手に変更しない。

1. **学習目的・習熟度評価基準**: 受講者に必要な能力、共通/選択課程、終了条件を確定する。
2. **レッスン全体の再配置・改訂**: 学習順序と各課題の入力、AIの担当、受講者の判断、成果物を整合させる。既存の説明は必要に応じて置き換え、重複追加しない。
3. **AI演習の実動作確認と教材化**: 隔離したTraining CopyでOpenCode・Skill・Playwrightを通し、確認済みの手順だけを教材へ反映する。
4. **テスト対象の必要最小限の修正**: 不足が確認されたSeed、テスト制御、Training演習、アプリ機能だけを更新する。必要がなければアプリの変更は0件でよい。
5. **評価契約・教材・CIの整合**: レッスンID、提出形式、修了チェック、契約テスト、Training Copyの実行条件を更新する。
6. **受講者視点の通し確認**: 初学者が講師の追加説明なしで、対象理解→AIを使った設計→Webテスト実装・実行→分析・レビュー→Training CI確認まで進められるか検証する。Nativeは選択課程として別に確認する。

検証候補（変更範囲に応じて実行し、結果を記録）:

\`\`\`bash
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run typecheck:training
pnpm run training:web:baseline
pnpm run training:web:exercise
pnpm run training:completion:check -- --mode common --root <handoff-root>
pnpm run training:copy:validate
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text:all
\`\`\`

\`training:completion:check\` は事前に作成した受講者用 \`handoff-root\` が必要。実行可能な環境・入力がない場合はスキップ理由を記録し、PASSと扱わない。変更がアプリやCIに及ぶなら、該当するunit/integration/contract/E2Eを追加して実行し、必要ならリポジトリ標準の \`pnpm run verify\` で回帰を確認する。Maestroは選択課程と端末条件に従って検証し、iOS Build-onlyをRuntime検証と誤認しない。

## 想定リスクと対応

| リスク | 対応方針 |
| --- | --- |
| AIを使う説明だけが増え、既存内容と二重学習になる | 同じ工程をAIへ委譲する学習活動として**置き換える**。手作業は成果物を評価するための必要量に絞る |
| AIのコードを理解せずに成功扱いにする | 期待結果の根拠、差分、実行結果、採否判断を必須の評価証拠にする |
| Skill出力と既存CSV / IDがつながらない | 最小実演で差分を特定してから運用または変換を選ぶ。先に共通基盤を新設しない |
| OpenCodeの無料枠・モデル・認証の変更 | 無料モデルの提供を恒久保証せず、利用時点で動作確認する。ツール固有操作を採点しない |
| 受講者のGit経験がなくAIの編集を制御できない | AIによるコード変更の前に作業範囲と差分確認を教える。GitHubの総合学習を必ずしも前倒ししない |
| 既存Challengeの解答・隔離条件を損なう | 受講者用入力と講師用資料を分け、正式採点モードの要件が満たせないなら共通必須にしない |
| Seedや製品仕様を教材に合わせて不必要に変更する | 不足を再現条件で証明し、変更理由・仕様・回帰検証を対応させる |
| カリキュラムの変更が修了判定を壊す | Lesson ID・C項目・CSV・handoff・validator・契約テストを変更対照表で管理する |
| PR #198の継続リライトとの差分衝突 | 本Planの親コミットを明示し、実装前にPR #198の最新内容・マージ状況を確認する |

## 未確定事項と確定方法

Plan作成時点では、次は**決定済みとして扱わない**。

1. 17レッスンを維持するか再編するか：G1〜G6との対応、重複、前提、工数、移行コストから案A/Bを比較して決める。
2. 既存C01〜C12を維持するか：AI活用の実証を評価できるかで判断する。名称や番号の変更を目的にしない。
3. 共通課程へ含めるSkillの範囲：最小実演の結果から必要な工程だけを採用する。\`qa-workflow-skills\`自体の開発学習は求めない。
4. Scenario Shop本体の変更量：仕様・既存Seed・Training演習とのギャップを確認するまで、追加機能・不具合を決めない。
5. 工数と実施形態：新しい演習の所要時間を、既存から置き換える作業とセットで見積もる。現行80〜85時間は参考値として扱う。
6. 無料モデルの制約下で通し演習が成立するか：OpenCode＋Skillの小さな実動作で確認する。未検証の成功を保証しない。

これらは実装着手前のレビューで明示的に判断し、Plan内の採用案とファイル変更範囲を確定する。

## 完了定義

### Planの完了

- [ ] 卒業像と学習目的が、実務で任せる作業・受講者の判断・成果物に結び付いている。
- [ ] 現行の全17レッスン・C01〜C12・共通/選択経路を漏れなく棚卸しし、維持・変更・統合・削除の理由がある。
- [ ] AI活用を単なる追加セクションにせず、必要な学習活動と評価へ具体的に組み込む方針が決まっている。
- [ ] OpenCode＋qa-workflow-skillsの担当範囲と、動作確認が必要な点が区別されている。
- [ ] Scenario Shopの対象機能・仕様・Seed・Training入口・実行証拠の対応を確認し、修正の要否と対象を明示している。
- [ ] \`training/workbook/\`、\`training:completion:check\`、契約テスト、Training Copy、CIへの影響と必要な検証が追える。
- [ ] 無理な独自基盤・全Skill必修・新規製品機能・モデル固定など、根拠のない追加要求を含めていない。
- [ ] 未確認・未決定を事実や完了として扱わず、実装前に何を確認すれば決められるか記載している。
- [ ] **Planをレビューし、実装開始の判断が得られている。**

### 実装完了（後続作業）

- [ ] 受講者が新しい卒業要件に沿ってAIを利用し、仕様・テスト条件・コード・実行結果を説明できる。
- [ ] 一連の必須演習が再現可能で、未実行・失敗・不明点を適切に扱える。
- [ ] 修了判定と教材・Training実行経路・契約テストが整合し、必要なテストが通過している。
- [ ] Scenario Shopの製品仕様・既存正式回帰・データ保護・CI隔離に不要な影響がない。
- [ ] Maestroなどの選択課程と共通課程が混ざらず、課題の所要時間・前提・評価方法が更新されている。

**次の工程**: このPlanについて目的達成、学習順序、実施可能性、過剰設計、必要なアプリ変更、既存契約への影響をレビューする。Planが確定するまではコード・教材・製品・CIの実装に進まない。
