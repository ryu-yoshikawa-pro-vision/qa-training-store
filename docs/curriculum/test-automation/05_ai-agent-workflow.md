# AIエージェントを活用したQA演習

## 目的

OpenCodeと[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)を使い、Scenario Shopの仕様分析、テスト設計、Playwright実装、実行結果の分析を経験します。

目標は特定のAIツールの操作方法を暗記することではありません。AIへ作業を依頼し、成果物の根拠・正確性・不足を受講者自身で確認し、必要に応じてやり直せることです。AIが作成したコードも、受講者が検証して採用した場合は受講者の成果物として扱います。

- **Playwright**: Webテストの実装・実行・検証に使用します。
- **Maestro**: モバイルアプリ自動化の選択課程で使用します。
- **OpenCode**: 設計・実装・調査・レビューを支援するAIエージェントの実習環境です。モデル固有の操作や有料契約は学習目標に含めません。
- **qa-workflow-skills**: QA工程ごとの判断・成果物作成を支援するSkill群です。すべてのSkillを暗記・実行する必要はありません。

## 受講前の確認

1. [カリキュラムの学習方針](./00_learning-design.md)と[習熟度評価基準](./02_competency-rubric.md)を確認します。
2. [Codespaces利用ガイド](../../guides/codespaces.md)などを参照し、OpenCodeを起動できる環境を用意します。利用可能な無料モデルは変わるため、特定のモデル名や無料枠の量を修了条件にしません。
3. Skill群は上記の公式リポジトリから取得し、利用したcommit SHAを記録します。OpenCodeが`.agents/skills/<name>/SKILL.md`を読み込めることを確認します。既存の`.agents/skills/exploratory-qa`を上書きしません。
4. Pythonによる決定論的処理が必要なSkillでは、当該Skillが要求する実行環境を確認します。Skillの説明だけを読ませ、必要なスクリプトを実行していない場合は、機械検証が完了したとは扱いません。

CodespacesなどのLinuxターミナルを使う場合、Training Copyを開いた状態で、例えば次のように準備できます。Skill一式をコピーするのは、`qa-workflow`が必要な担当Skillへ処理をつなぐためです。

```bash
git clone https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills.git ../qa-workflow-skills
git -C ../qa-workflow-skills rev-parse HEAD
mkdir -p .agents/skills
cp -R ../qa-workflow-skills/skills/. .agents/skills/
```

取得したcommit SHAを演習記録へ書き、OpenCodeをTraining Copyのルートで再起動して`qa-workflow`の検出を確認します。すでに同名Skillを配置している場合は上書きせず、利用するrevisionを確認します。Windowsなどでコマンドが異なる場合は講師側で配置を支援します。

Skillを演習リポジトリに配置する場合、作業先は自分のTraining Copyとし、元の`qa-training-store`や本番用テストスイートへ変更を混入させません。取り込んだSkill本体を受講成果物としてPRへ追加する必要はありません。変更を保存する前に`git status`で意図しないファイルを確認します。

Skillの取得・配置が難しい場合は講師または運営担当に環境準備を依頼できます。Skillの配布や有料モデルの契約を受講者個人の評価対象にしません。

## 演習の進め方

[演習対象一覧](../../../training/ai-assisted-qa/README.md)のシナリオを使用します。新しいサンプルアプリは必要ありません。

### 1. 仕様とテスト条件を確認する（P1-2、P1-3）

- 受講者自身で対象機能のBR・AC・ロール・状態・リスクを整理します。
- OpenCodeに仕様の分析を依頼し、必要なら`qa-workflow`、`spec-analysis`、`question-analysis`、`test-analysis`、`test-condition-design`、`test-case-design`を活用します。
- AIが提案した条件を仕様書と照合し、採用・修正・不採用を判断します。根拠がない期待結果を加えません。
- 成果物は既存の4つのワークブックへ反映します。Skill固有のIDとワークブックのIDを無条件に同一視せず、対応関係を記録します。

### 2. テストを実装する（P1-5、モバイル選択課程P1-7）

- 採用したテスト条件をOpenCodeへ渡し、Playwrightによる実装・修正を依頼します。必要に応じて`e2e-test-inspection`、`e2e-test-implementation`を使用します。
- ロケーター、アサーション、テストデータ、リセット、既存テストとの重複を確認してから実行します。
- Webテストは`training/playwright/exercises/`内で扱い、`e2e/web/`へ混ぜません。
- Maestroは選択課程に限ります。現行の`qa-workflow-skills`にMaestro専用の実装Skillがあるとは前提にせず、OpenCodeによる一般的な実装支援を使用してかまいません。

### 3. 結果を分析・改善する（P1-6、P1-8）

- Playwrightの結果とTrace・Screenshot・ログを確認します。
- AIに失敗原因の候補と対策を挙げさせ、受講者が証拠に照らして原因を特定します。必要なら`e2e-test-result-analysis`などを使います。
- AIの推測で仕様や期待結果を書き換えません。原因が不明な場合は「未確定」と記録します。
- 変更した場合は再実行し、改善前後の記録を残します。

### 4. レビューと継続実行を考える（P2-3、P2-5、P2-8）

- OpenCodeにコード・テスト設計のレビューを依頼し、重要な指摘と不要な変更提案を区別します。
- AIが作成した差分を説明できること、PRの変更範囲を制御できること、CIと実行結果を自分で確認できることを重視します。
- `regression-testing`や`coverage-analysis`は、必要な範囲でカバレッジ・既存テストへの影響を検討するために使います。

## 共通の確認事項

演習記録には、少なくとも「対象仕様と選定理由」「AIへの依頼内容または要約」「AIが提案した内容」「受講者による採用・修正・不採用の判断理由」「実行結果・エビデンス」を残します。秘密情報・認証トークン・個人情報・不要な大量ログは保存しません。

**AIによる提案をすべて採用する必要はありません。** 誤った提案を根拠とともに却下できることも学習成果です。逆に、AIを利用しただけ、Skillの出力が完成しただけ、ベースラインがPASSしただけでは修了にしません。

## 評価と修了

既存の`C01〜C12`を維持しながら、[習熟度評価基準](./02_competency-rubric.md)の「AIエージェント活用の評価」に従います。Part 1では分析・設計からWebテストの実装・結果評価まで、Part 2ではレビュー・CIの理解までを一連の成果物で確認します。

`training:completion:check`は既存成果物の構造と実行記録を確認しますが、AIに任せた判断が適切だったかは自動判定できません。受講者の記録と仕様に基づく確認を別途実施します。

現行の独立した[Agentic QA参考資料](./part1/09_specification-agentic-qa.md)に記載されたBlack-box Scoredなどの高度な評価モードは、この共通演習の必須条件ではありません。
