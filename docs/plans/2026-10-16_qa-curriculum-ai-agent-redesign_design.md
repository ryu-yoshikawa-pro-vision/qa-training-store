# 新規AI協働テスト自動化カリキュラム：3フェーズ設計

## 対象者・目標

手動テスト経験はあるが、**AIエージェント・プログラミング・Gitの操作は未経験でも参加できる**ことを前提とする。標準学習環境はGitHub Codespacesのため、全員にGitHubログインとCodespace作成権限が必要となる。ただしGit/PR/CIを学ぶのは選択Phase 3である。AIエージェントにQA業務を丸投げするのではなく、学習者本人が作業目的、正本、完了条件とAI成果物の妥当性を判断できるようにする。

対象は**テスト自動化**。仕様理解・テスト分析・設計は、適切な自動化対象・正しい期待結果・維持可能なコードを作るために学ぶ。QA管理全般や全Skillの習熟は要求しない。

### 独立して修了できる3フェーズ

| フェーズ | モジュール | 到達目標 | 独立した総合演習 | 次への引継ぎ |
| --- | --- | --- | --- | --- |
| **Phase 1：AIエージェントとテスト分析・設計** | M00〜M04 | 安全にAIエージェントとSkillを利用し、仕様からリスク・条件・ケース・自動化候補を作り、正当性を検証できる | 未演習の仕様条件でAI支援による設計とレビューを行う。Playwright/CIなし | 承認したテストケース・期待結果・仕様ID・前提データ・判断の理由 |
| **Phase 2：Playwright構築・実装・実行・改善** | M05〜M07 | Node.js/Playwright環境を構築し、Phase 1のケースをコード化し、ローカルで実行・診断・改善できる | 別の仕様条件に対してE2E実装・Reset・実行・最小修正を行う。GitHub/CIなし | 検証済みspec、実行コマンド・前提データ、依存関係、実行証拠 |
| **Phase 3：GitHub・CIによる継続実行** | M08〜M10 | Phase 2のテストをGitHubで変更管理し、PR・GitHub Actionsから実行して対象SHAと結果を検証できる | 既存specをTraining CIに組み込み、PR/CIの保証範囲を示す | 対象SHA・PR・Run/Check/Artifact、必要な運用手順 |

受講パターンは**Phase 1のみ、Phase 1〜2、Phase 1〜3**の3種類。Phase 3は選択課程であり、Phase 2修了者をCI未経験という理由で不合格にしない。Phase 1の修了はAIを使った設計能力の認定であり、**テスト自動化コードを実装できるという認定ではない**。

## 全フェーズ共通の学習環境と開始手順

**別の公開学習用Templateリポジトリから受講者本人が作成したリポジトリのGitHub Codespaces（2コア選択）**を標準とし、Phase 1・2は同じCodespace内でVS Code・ターミナル・OpenCode CLIを利用する。2コアは**設定済み・固定済みではない**ため受講者が作成時に確認する。既存の`.devcontainer/devcontainer.json`はNode.js 24、pnpm、Playwright/Chromium、OpenCode CLI、Codex CLI、GUI用desktop-liteを準備する**配布元の参考実装**である。学習用リポジトリで成立するよう必要部分を同期して実機検証する。変更する前に[既存ガイド](../guides/codespaces.md)と実機結果を確認する。

開始前に、(1) **学習用Templateからの個人リポジトリ作成**、GitHubアカウント・Codespaceの作成権限と**費用の支払主体**、(2) 2コア選択・残り無料利用枠／保存容量・課金停止条件、(3) Codespace作成のログ・基本コマンドの起動、(4) 個人Secret経由のOpenCode認証と**無料モデル限定**の設定、(5) `qa-workflow-skills`のSkillとPython helperの実行可否、(6) 学習者本人による`course:load M00`での課題ロードを確認する。**これらは初期セットアップの健全性確認**であり、それだけでPhase 1の学習目標を達成したとは評価しない。

GitHub Freeの個人利用枠は120コア時間/月・15 GB-month/月（2コアで理論上最大約60稼働時間/月）だが、使用残量や組織側の支払設定で変わる。所要時間は未実測。Codespaceを使い終えたら停止し、保存容量・残り無料枠を確認して必要な成果物をエクスポートする。**無料を保証した教材として案内しない**。登録・モデル・料金条件が合わなければBLOCKEDとして停止し、本人の承認なく有料手段で続行しない。

受講者は`pnpm course:load M00`等で**その時点の1モジュールだけ**を`workspace/Mxx/`に用意し、別モジュールの成果物は維持する。モジュールをまとめて自動ロードしない。詳細は[同期・ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)に従う。Phase 1の成果物はGitコマンド不要でダウンロード・バックアップ可能なMarkdown等、Phase 2はその成果物に加えてspec・設定・ログを保存できる形とする。Phase 3で初めてGitとPRを使い、Phase 2の成果物をGitHubへ持ち込む。Codespaceの削除や無料枠到達に備えて、**フェーズ終了ごとの作業成果の取り出し**を教材に含める。

## 知識グラフと改訂時の確認

[基準グラフ](../curriculum/ai-assisted-qa/README.md)を、学習目標→必要な理解事項→前提知識、演習対象の正式仕様、使用候補のAgent Skillsの追跡に用いる。**Skillの正本は別リポジトリ`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`**であり、当リポジトリの`.agents/skills/`とは分ける。

- 学習目標51件を起点に、理解事項58件の分解を**初期案**として保持する。学習教材を増やすために際限なく細分化しない。知識分解の妥当性は実際の説明・問題・実技の作成時に確認する。
- 仕様・Skill・テスト対象を改訂する場合は、正本の変更範囲を確認してグラフの影響候補を抽出し、**必要な場合だけ**教材・クイズ・実技・評価基準を更新する。グラフ参照だけでソース・Skillを自動変更しない。
- 教材の存在・評価方法の存在・問題/実技の妥当性・本人の習熟を別に判定し、学習の評価履歴や非公開模範解答は公開グラフに含めない。

## フェーズごとの学習順序

**モジュール内の説明順序・理解すべき知識・演習・Level 2の具体的判定・先行モジュールとの前提関係**は[学習順序・習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)に定義する。M00前の受講開始ガイドはモジュールとして数えない。

### Phase 1：AI初心者からテスト設計まで（M00〜M04）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M00 | **受講開始ガイドで最初のロードを済ませ**、CodespacesでのVS Code・ターミナル・保存・パス・コマンド結果、OpenCode CLI、権限・Skill発見と安全な依頼 | **環境の起動確認と技能評価を分離**。用意した指示から開始し自分で目的・制約・出力を指定 |
| M01 | 自動化の目的・限界・テスト層、人間とAIの責任、自動化対象の選び方 | 知識と判断のクイズ |
| M02 | Scenario ShopのBR/AC、観測・推測の区別、Seed・Role/State・リスク分析 | AIに仕様の分析を依頼し、仕様との照合で誤りを検出 |
| M03 | 同値分割・境界値・デシジョンテーブル・状態遷移、Risk→Condition→Case→仕様ID | AIとのテスト設計と期待結果の根拠 |
| M04 | AI生成ケースの欠落・重複・誤った期待結果・テスト層の選択、Automation候補の採否 | **Phase 1総合演習**：初見の状態条件を分析・設計し、採否理由を記録 |

AI操作は「実例を真似る→依頼を自作する→初見課題で成果物を検証する」の順に進める。Codespacesの利用にはGitHubアカウントが必要だが、**Phase 1にGitコマンド・PR・Playwright・CIの操作は要求しない**。OpenCodeのCLIを確実な入口とし、未確認のVS Code拡張を必修としない。Skillの発見だけでなく補助ファイル・Python実行を確認する。使えない場合はBLOCKEDとし「使ったことにする」ことを認めない。

### Phase 2：Playwrightをローカルで動かす（M05〜M07）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M05 | **Node.jsの役割→pnpmとpackage.json→TypeScriptの最小構文→Playwright**の順に、学習用Codespaces・Config・testDir・ポート・出力・Locator・Assertion・待機を学ぶ | **既存環境の意味を説明し、新課程用の最小テストを実行**。devcontainer全体の再構築は不要 |
| M06 | Phase 1のケースとコードの対応、AIによる実装、Seed/Reset・独立性・Web画面と仕様の確認、ローカル実行 | 期待結果に合ったE2E、実行ログ・差分、再現性 |
| M07 | Trace・Screenshot・Error、Test/Product/Environment/Flakyの切り分け、最小修正、Helper/POM/Fixtureの要否 | **Phase 2総合演習**：未演習の条件でテストを作り、実行・失敗分析・修正・再実行 |

学習者本人がモジュールIDを指定して順次ロードし、**Phase 1で作成したケースを再利用**する。M05では短いTypeScriptコードを自力で読解・部分修正・実行できる状態を確認し、M06の新規Case実装、M07の失敗分析へ段階的に進む。Phase 2ではCodespacesに導入済みのPlaywright Configや実行環境を理解して新課程のspecを実行できることを必須とし、既存ConfigやAI出力を単にコピーしただけでは達成としない。一方、TypeScript全文法やPOM導入、devcontainer全体の再構築を全員に要求しない。**Git/PR/CIの操作を行わず、Codespace内のPlaywright実行証拠だけで修了**する。

### Phase 3：GitHubとCIで継続実行（M08〜M10、選択）

| ID | 学習内容 | 評価 |
| --- | --- | --- |
| M08 | Gitの状態、branch、commit、GitHubへのpush、PR作成と差分・AIレビューの検証 | **学習者個人の同じリポジトリ**でのPRと理由付きレビュー |
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
    quizzes/                         # 学習用問題・公開解説。修了課題の模範解答は置かない
    assessments/                     # Phase 1/2/3 の独立した総合演習
    optional/native/                 # 本件の3フェーズとは別の選択教材
training/
  ai-assisted-qa-course/             # 課題用の未完成コード
  course-sync/manifest.json          # 学習者へ配布する範囲の許可リスト
scripts/training/
  sync-ai-assisted-qa.ts              # 管理者用の同期処理（実装予定）

# 別の公開学習用Templateリポジトリへ同期
course/modules/M00/ ... M10/          # 配布済み教材
scripts/load-module.ts                # 学習者用モジュール単位ロード
workspace/M00/                        # 受講者作業領域
runtime/ など                         # Scenario Shop実行に必要な最小配布物
```

初心者がたどる導線は**学習者が選んだフェーズの終了時点で完結**すること。元の公開リポジトリと受講者の作業リポジトリを分け、配布物から実技・修了課題の模範解答を除外する。公開済み解説は秘密扱いできないため、修了評価は初見条件と本人の説明で確認する。Phase 1・2の作業はCodespaces上で完結し、受講者にgit clone・branch・PR操作を要求しない。Codespaceの初回作成は共通前提、学習成果はGit操作なしで持ち出せるようにする。実務の題材としてScenario Shopの製品・仕様・Seedは共通参照してよいが、新課程の教材・判定は旧課程と独立する。

## 未実証事項とCodex実装の責務

- OpenCodeの利用環境と`qa-workflow-skills`の実際のSkill発見・Python helperは実演して確認する。使用済みと自己報告されたSkillを無条件に信頼しない。
- Phase 1は学習用Templateから作成した個人リポジトリのCodespaceを前提に、Gitコマンド・PR・CIの操作なしで進められる教材配布・保存・評価の導線を検証する。
- Phase 2は**同期された学習用リポジトリ単体**でNode/Playwright・Scenario ShopのBuild/Serve/Seed/Resetが成立し、**M05の基本構文読解と部分修正がM06の前提として評価され**、新課程専用の実行・結果保存先が旧Trainingと衝突しないことを、**2コアの新規Codespace**で検証する。
- Phase 3は学習者個人の同じリポジトリ上で専用CIを利用し、旧Training Copy／正式workflowの隔離とGitHub権限・標準Runnerの無料条件を検証する。Phase 3未受講をPhase 2の不合格条件にしない。
- **本PRではPlanと知識グラフJSON・運用ガイド・読取り専用の検証CLIまで**を作成する。教材本文、確認問題・解答、実行可能な実技、学習用同期・ロード機能は後続の実装・検証で作成する。
