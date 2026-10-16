# 新規AI協働テスト自動化カリキュラム：3フェーズ設計

## 対象者・目標

手動テスト経験はあるが、**AIエージェント・プログラミング・GitHub未経験でも参加できる**ことを前提とする。AIエージェントにQA業務を丸投げするのではなく、学習者本人が作業目的、正本、完了条件とAI成果物の妥当性を判断できるようにする。

対象は**テスト自動化**。仕様理解・テスト分析・設計は、適切な自動化対象・正しい期待結果・維持可能なコードを作るために学ぶ。QA管理全般や全Skillの習熟は要求しない。

### 独立して修了できる3フェーズ

| フェーズ | モジュール | 到達目標 | 独立した総合演習 | 次への引継ぎ |
| --- | --- | --- | --- | --- |
| **Phase 1：AIエージェントとテスト分析・設計** | M00〜M04 | 安全にAIエージェントとSkillを利用し、仕様からリスク・条件・ケース・自動化候補を作り、正当性を検証できる | 未演習の仕様条件でAI支援による設計とレビューを行う。Playwright/CIなし | 承認したテストケース・期待結果・仕様ID・前提データ・判断の理由 |
| **Phase 2：Playwright構築・実装・実行・改善** | M05〜M07 | Node.js/Playwright環境を構築し、Phase 1のケースをコード化し、ローカルで実行・診断・改善できる | 別の仕様条件に対してE2E実装・Reset・実行・最小修正を行う。GitHub/CIなし | 検証済みspec、実行コマンド・前提データ、依存関係、実行証拠 |
| **Phase 3：GitHub・CIによる継続実行** | M08〜M10 | Phase 2のテストをGitHubで変更管理し、PR・GitHub Actionsから実行して対象SHAと結果を検証できる | 既存specをTraining CIに組み込み、PR/CIの保証範囲を示す | 対象SHA・PR・Run/Check/Artifact、必要な運用手順 |

受講パターンは**Phase 1のみ、Phase 1〜2、Phase 1〜3**の3種類。Phase 3は選択課程であり、Phase 2修了者をCI未経験という理由で不合格にしない。Phase 1の修了はAIを使った設計能力の認定であり、**テスト自動化コードを実装できるという認定ではない**。

## フェーズごとの学習順序

### Phase 1：AI初心者からテスト設計まで（M00〜M04）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M00 | OpenCodeの準備・起動・作業ディレクトリ・ファイル読解、AIエージェントとチャットの違い、ツール権限、Skillの発見・利用、安全な作業範囲と検証 | **用意した指示を実行して結果を確認**。次に自分で目的・制約・出力形式を指定 |
| M01 | 自動化の目的・限界・テスト層、人間とAIの責任、自動化対象の選び方 | 知識と判断のクイズ |
| M02 | Scenario ShopのBR/AC、観測・推測の区別、Seed・Role/State・リスク分析 | AIに仕様の分析を依頼し、仕様との照合で誤りを検出 |
| M03 | 同値分割・境界値・デシジョンテーブル・状態遷移、Risk→Condition→Case→仕様ID | AIとのテスト設計と期待結果の根拠 |
| M04 | AI生成ケースの欠落・重複・誤った期待結果・テスト層の選択、Automation候補の採否 | **Phase 1総合演習**：初見の状態条件を分析・設計し、採否理由を記録 |

AI操作は「実例を真似る→依頼を自作する→初見課題で成果物を検証する」の順に進める。**Phase 1にGitHubアカウント・Git CLI・Playwright・CIを要求しない**。ローカルで参照できる仕様資料・課題・AIの成果物保存場所を配布する。必要なCLI導入やAIプロバイダー認証は別途準備・検証する。使えない場合はBLOCKEDと記録し、「使ったことにする」ことを認めない。

### Phase 2：Playwrightをローカルで動かす（M05〜M07）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M05 | Node.js/npm、最小TypeScript、Playwrightの導入、Config・testDir・コマンド・テスト結果、Locator・Assertion・待機 | **新しい学習用環境を準備し、最小テストを実行**。生成設定の意味を説明 |
| M06 | Phase 1のケースとコードの対応、AIによる実装、Seed/Reset・独立性・Web画面と仕様の確認、ローカル実行 | 期待結果に合ったE2E、実行ログ・差分、再現性 |
| M07 | Trace・Screenshot・Error、Test/Product/Environment/Flakyの切り分け、最小修正、Helper/POM/Fixtureの要否 | **Phase 2総合演習**：未演習の条件でテストを作り、実行・失敗分析・修正・再実行 |

Phase 1で作成したケースを**再利用**する。Phase 2ではPlaywright Configや実行環境を理解できることを必須とし、既存ConfigやAI出力を単にコピーしただけでは達成としない。一方、TypeScript全文法やPOM導入をすべての題材に要求しない。**GitHubやCIを使わないローカルの実行証拠だけで修了**する。

### Phase 3：GitHubとCIで継続実行（M08〜M10、選択）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M08 | Gitの状態、branch、commit、GitHubへのpush、PR作成と差分・AIレビューの検証 | 受講者コピーでのPRと理由付きレビュー |
| M09 | GitHub ActionsのWorkflow/Job/Runner、PlaywrightのBuild/Serve/Test、対象SHA、Report/Artifact、権限と品質ゲート | 新課程専用CIでテスト実行し、根拠を説明 |
| M10 | **Phase 3総合演習**：Phase 2のE2EをGitHub/CIで再現し、失敗があれば原因を切り分け、最終状態の保証範囲を説明 | 対象PR・SHA・Run・Artifactと修了判断 |

Phase 3の重点は「テスト自動化を別環境で継続実行できること」。複雑なMatrix、複数OS、デプロイ・リリース管理、Runner最適化を必修にしない。Phase 2のテストケースを再作成して課題を水増ししない。

## 教材・クイズ・実技の共通構成

各モジュールに以下を用意する：前提、観察可能な到達目標、学ぶべき知識と必要な理解水準、初心者向け説明と実例、正答と誤答解説があるクイズ、必要な実技、提出物と修了判定、誤答時の復習先。

[学習項目表](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)で各項目を説明・適用・判断に分類し、[クイズ仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)と[評価仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)を対応させる。問題数・学習時間・一律合格率は先に固定しない。

## 新旧の配置

```text
docs/curriculum/
  test-automation/                   # 旧課程。変更しない
  ai-assisted-qa/
    README.md                        # 3フェーズの選び方・前提・修了案内
    learning-objectives.md           # 各フェーズの能力と学習項目
    assessment-rubric.md             # フェーズ別の知識・実技評価
    modules/
      M00/README.md ... M04/README.md  # Phase 1
      M05/README.md ... M07/README.md  # Phase 2
      M08/README.md ... M10/README.md  # Phase 3（選択）
    quizzes/                         # 問題と公開解答をモジュールごとに分離
    assessments/                     # Phase 1/2/3 の独立した総合演習
    optional/native/                 # 本件の3フェーズとは別の選択教材
training/
  ai-assisted-qa-course/             # 必要な場合のPhase 2/3専用実技
```

初心者がたどる導線は**学習者が選んだフェーズの終了時点で完結**すること。Phase 1の課題資料、問題、成果物の書式をGitHub操作なしで入手・利用できるようにする。Phase 2も同じくローカルで完結。実務の題材としてScenario Shopの製品・仕様・Seedは共通参照してよいが、新課程の教材・判定は旧課程と独立する。

## 未実証事項とCodex実装の責務

- OpenCodeの利用環境と`qa-workflow-skills`の実際のSkill発見・Python helperは実演して確認する。使用済みと自己報告されたSkillを無条件に信頼しない。
- Phase 1をGitHubアカウントなしで進められる資料配布・保存・評価の実際の導線を検証する。
- Phase 2のNode/Playwrightの初期構築・新課程専用実行・結果保存先が旧Trainingと衝突しないことを検証する。
- Phase 3のTraining Copy／CI workflowの隔離とGitHub権限の必要性を検証する。Phase 3未受講をPhase 2の不合格条件にしない。
- **本PRはPlanのみ**。最終的な教材本文、全問題と答え、実行可能な課題はCodex実装時に作成・試行する。
