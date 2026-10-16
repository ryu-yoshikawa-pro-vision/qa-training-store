# 新規AI協働テスト自動化カリキュラム構築Plan

## 目的と採用方針

**目的は、AIエージェントと協働してテスト自動化を構築・検証・改善できる人材を育成すること。** QA活動全体やGitHubの一般的な運用を網羅することではない。受講者は手動テスト経験者を想定し、AIエージェント・プログラミング・GitHubの未経験者も対象にする。

学習期間・業務環境に応じて次の**3フェーズで受講を終了できる**構成とする。各フェーズに独立した学習目標・確認クイズ・実技・修了判定を用意する。

| フェーズ | 対象モジュール | 目的 | 修了したらできること | 受講上の位置 |
| --- | --- | --- | --- | --- |
| **Phase 1：AIエージェントとテスト分析・設計** | M00〜M04 | AI初心者が安全な操作・Skill利用を覚え、自動化に必要な仕様分析・テスト設計を行う | AIと協働して、根拠を示せるテスト条件・ケース・自動化候補を設計し、生成結果をレビューできる | 単独受講・修了可能。Phase 2の前提 |
| **Phase 2：Playwright構築・実装・実行・改善** | M05〜M07 | Phase 1の成果物から、ローカルで実行できる自動テストを構築する | 環境設定、実装、Seed/Reset、実行、失敗分析、保守改善ができる | Phase 1修了後に受講。ここまででPlaywright自動化の修了 |
| **Phase 3：GitHub・CIによる継続実行** | M08〜M10 | Phase 2のテスト資産をGitHubで管理し、CIへ組み込む | PRレビュー、対象SHAのCI実行・Artifact・失敗対応と品質ゲートを扱える | **選択**。Phase 1・2の修了要件には含めない |

- **標準学習環境は受講者個人の学習用リポジトリを開くGitHub Codespaces**とする。教材・製品仕様の正本は引き続き公開の`qa-training-store`で管理し、学習用リポジトリへ配布可能な範囲だけを同期する。Codespace作成にはGitHubアカウントが必要だが、**Phase 1・2でGit/branch/commit/PR/GitHub Actions/CIの操作は学ばせず、修了条件にも含めない**。成果物はGitなしで保全できる。
- Phase 1の学習対象はテスト自動化に必要なテスト分析・設計に限る。広範なQA管理・全テスト技法の習熟を目的にしない。
- Phase 3ではPhase 2で作成したテストを再利用し、分析・実装のやり直しを必須にしない。
- **各フェーズの最後に独立した修了課題**を置く。Phase 1は設計、Phase 2はローカルE2E、Phase 3はGitHub・CI。従来のM10はPhase 3の総合演習として扱い、Phase 1・2の必修に含めない。
- 11モジュール／51学習項目は現時点の設計案。目標と評価に照らして必要な追加・整理は認めるが、数合わせで増やさない。

## 学習用リポジトリへの同期とモジュール単位のロード

- **管理者による同期**：`training/course-sync/manifest.json`を配布許可リストとして、`scripts/training/sync-ai-assisted-qa.ts`（実装予定）が確定commitから必要な教材・課題・実行環境だけを**別の公開学習用Templateリポジトリ**へ用意する。模範実技解答・非公開評価資料・正式回帰spec・Secret・不要workflowを含めない。スクリプトによる自動commit/pushは行わない。
- **学習者によるロード**：Codespacesで学習者本人が`pnpm course:load M03`等を実行し、**指定した1モジュールの課題だけ**を`workspace/M03/`へ準備する。先行モジュールの成果物を使い回し、再ロード時も編集済みファイルを消さない。他モジュールの自動ロード・課題の自動回答は行わない。
- 配布済みの教材はロード前でもAIから参照可能である。**ロードは秘密化の仕組みではない。** 学習用クイズの公開解説と、修了課題の非公開模範解答を分ける。模範解答・評価用テストを公開リポジトリのbranchや履歴へ置かず、本人による根拠説明と初見課題で到達度を判定する。
- **学習用リポジトリだけでPhase 2のScenario ShopをBuild/Serve→Seed/Reset→Playwright実行できることが前提**。必要な製品ランタイムは正本から生成・同期し、製品全体の別正本や旧Training Copyの無差別な複製を作らない。具体的な依存ファイルは実装時に確認する。

詳細は[教材同期・モジュール単位ロード設計](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)を参照する。

## Codespacesと追加料金ゼロを目指す運用

- **受講者本人のGitHub個人アカウントで学習用リポジトリとCodespaceを所有**し、その無料枠を利用する方針とする。利用前にCodespaceの**所有者・支払主体**と残量を確認する。組織の公開`qa-training-store`に直接Codespaceを作成した場合と、個人所有リポジトリで作成した場合を混同しない。
- GitHub Free個人アカウントの目安は**120コア時間/月、15 GB-month/月**（2026-10-16時点）。**2コアなら計算上最大約60起動時間/月**だが、他Codespaceとの共用・保存容量・個人の設定・支払条件によって変わる。無料を保証する時間数ではない。
- **2コアを標準として作成時に選択・確認**する。現行`.devcontainer/devcontainer.json`に`hostRequirements`はなく、**2コアに明示固定されていない**。`hostRequirements.cpus: 2`は最小要件であり上限固定ではないので、費用対策だけを理由に追加しない。4コア以上への変更を標準手順に入れない。2コアでの初期セットアップ・OpenCode・Skill・Playwright実行は**実機未検証**。
- 作成前に利用者の**予算／利用上限・請求設定**を確認し、無料枠超過で課金が発生しない設定または運用を選ぶ。料金を発生させる必要がある場合は演習を停止し、無断で上位マシン・有料プラン・有料モデルへ移行しない。学習終了時はCodespaceを停止し、保存容量と不要環境の整理、成果物の持ち出し方法を案内する。
- OpenCode CLIは既存devcontainerが導入するが、**モデル推論の無料利用は保証されない**。利用時点で公式にFreeと確認できたモデルのみ使い、補助モデル・自動選択・有料モデルへの切替、Zenのauto-reloadや月間上限を確認する。個人`OPENCODE_API_KEY`のCodespaces Secret認証は既存ガイドに手順があるが、固定CLIでの実機認証は未検証。**APIキー値や認証キャッシュは教材・ログ・GitHubへ保存しない**。
- Phase 3は**標準GitHub-hosted runnerを用いる公開学習用リポジトリ**を第一候補とする。公開リポジトリの標準Runnerは無料だが、受講者用のコピー、書込権限、workflow有効化、Artifact保存の利用条件を確認する。private repository／larger runner／有料サービスを必須にしない。
- 各フェーズについて、受講者の実測**Codespace起動時間・ストレージ使用量・セットアップ成否**を記録し、無料枠内で成立するか判断する。現時点では学習時間・消費量・受講者全員の無料利用は**未確認**。無料条件が成立しない場合はBLOCKEDとして扱い、勝手な課金で解消しない。

参考：[GitHubのプラン別使用量](https://docs.github.com/ja/billing/reference/product-usage-included)、[Codespaces課金](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)、[Codespaces利用ガイド](../guides/codespaces.md)、[OpenCode Zen料金](https://opencode.ai/docs/zen/)、[GitHub Actionsの課金](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

## 既存カリキュラムとは独立して作る

- 旧教材：`docs/curriculum/test-automation/`の17レッスン、104問、C01〜C12、旧修了判定は**変更しない**。
- 新教材の**正本**：`docs/curriculum/ai-assisted-qa/`に入口、説明、学習クイズ・公開解説、実技・修了基準を作成する。**配布用の教材は別リポジトリで生成**する。実技の完成回答や非公開評価用テストは公開正本へcommitしない。
- 新実技の正本：必要な素材・未完成specを`training/ai-assisted-qa-course/`に配置し、同期許可リストで必要なものだけ配布する。既存`training/playwright/`、`training/agentic-qa/`、旧Training Copyの契約を壊さない。
- 仕様・テスト対象はScenario Shopの`docs/spec/`等を参照し、製品の正式な仕様・Seed・回帰テストを不用意に変更しない。
- **本PR #199ではPlanのMarkdownだけを変更**する。教材・コード・CI実装はCodexに引き継ぐ。PR #198に変更しない。

## 設計文書の読み順

1. [調査と既存課程の境界](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md)：旧契約と3フェーズ化にあたっての再利用範囲・未確認事項。
2. [学習目的・3フェーズの構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)：受講者像、モジュール、フェーズ間の引継ぎ、段階別の修了目標。
3. [学習項目と理解水準](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)：M00〜M10の学ぶ内容・評価手段、フェーズごとの必須範囲。
4. [確認クイズ・正答・解説](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)：初心者から段階的に確認する問題、正答・誤答説明・復習先。
5. [評価・各フェーズの修了条件](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md)：知識・実技・判断、未達・BLOCKED、フェーズ別の合否。
6. [教材同期・モジュール単位ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)：管理者の同期、受講者の1モジュールずつのロード、公開解説と非公開評価資料、Scenario Shopの配布契約。
7. [Scenario Shop・実行環境・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)：別リポジトリのCodespacesでのPlaywright実行、Phase別導線・成果物、選択Phase 3のCI、旧実装との分離。

## 実装作業の順序（Codex引継ぎ）

1. PR #199のHEADとPR #198、`.devcontainer/devcontainer.json`、`docs/guides/codespaces.md`、`docs/spec/`、既存教材・Training・validator・CIの最新状態を確認する。**2コアの新規Codespace**での動作・課金条件・OpenCode認証・Skill実行は過去の検証結果を流用せず、必要な範囲で再検証する。
2. 公開の教材正本と別の公開学習用Templateリポジトリの**同期・ロード経路**を先に実装・検証する。許可リスト方式の同期、確定SHAの記録、完成解答の除外、学習者による1モジュール単位のロード、上書き防止、別リポジトリ単体でのScenario Shop起動を確認する。**本Planの段階ではリポジトリを作成しない**。
3. 新教材ディレクトリを作り、トップREADMEで**Phase 1のみ／Phase 1〜2／全3フェーズ**の受講経路と修了の違いを示す。共通の開始手順は**学習用リポジトリ作成→本人の2コアCodespace作成・確認→CLI・AI認証・Skill確認→学習者がM00をロード**とする。Phase 1・2でGitコマンド・PR・CI操作を要求しない。
3. [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)から、各モジュールの必要な説明・最小例・確認クイズ・正答解説・復習先・実技評価を作る。前提を教えずに専門知識を使わせない。
4. Phase 1の**誘導付きのAI操作→自分で依頼→初見の仕様分析・設計**の流れを作る。実在するSkillの発見・使用条件・依存と、AIの誤った推論の見抜き方を教材にする。失敗を伴う環境制約はBLOCKEDと区別する。
5. Phase 1の成果物（仕様根拠・Risk/Condition/Case・採否理由）をCodespaceの作業フォルダに保存し、Gitを知らない受講者でもダウンロードして保全・引継ぎできる形式と手順を用意する。Phase 1修了時にPlaywrightやGit操作を要求しない。
6. Phase 2は**Codespacesに導入済みのNode.js/pnpm/Playwright/Chromium**を使い、設定・実行方法と最小構成の再現を教える。専用spec・結果パス・ポート境界を確認し、実装・Reset→実行→失敗分析・保守まで**CI不要で**成立する総合演習を作る。Devcontainer全体の再構築を修了要件にしない。
8. Phase 3では**Phase 1・2と同じ学習用リポジトリ**でGit/GitHub/PR、専用GitHub Actionsの構築・実行・Artifact、CI失敗時の切り分けを**選択課程**として実装する。既存の旧Training Copyは本件の配布に流用しない。Phase 1・2の合否には参照させない。
9. フェーズ単位で学習項目↔教材↔クイズと正解解説↔実技↔修了条件を照合する。旧課程の検証を回帰として実行し、別フェーズの証拠・実績を流用しない。

## 安全・互換性の境界

| 対象 | 変更方針 |
| --- | --- |
| `docs/curriculum/test-automation/**` | 参照のみ。編集・移動・削除しない |
| 旧`scripts/validate-curriculum.ts`、`scripts/training/check-completion.ts` | 旧課程の判定と出力の意味を維持。新課程と共用しない |
| `training/playwright/**`、`training/workbook/**` | 必要な読み取り・再利用は可。旧課程の提出物・実行入口は変更しない |
| `training/agentic-qa/**` | 別の探索QA Challenge。新カリキュラムに置換しない |
| 正式製品・仕様・Seed・`e2e/web/**` | テスト対象として使い、教材のために故意の不具合を入れない |
| 新課程の`docs/curriculum/ai-assisted-qa/**`・`training/ai-assisted-qa-course/**` | 学習目標・教材・演習・評価を独立して管理 |
| 共有`package.json`／workflow | 新課程の追加に必須なものだけ加え、既存コマンド・旧コピーの許可リストを壊さない |

## 完了の定義

**Planの完成**：3フェーズの目的・教材・クイズ/解説・実技と修了判定、Codespacesの無料条件に加え、**公開の教材正本→公開学習用リポジトリへの許可リスト同期→学習者によるモジュール単位ロード**と、完成解答の除外、上書き防止、Scenario Shopの実行方法を明文化する。

**教材実装の完成**：学習者個人のリポジトリに完成解答を含めず**モジュールを一つずつロードして**各フェーズをその到達点だけで修了でき、Phase 1・2ではCodespacesの初期利用に必要なGitHubログイン以外のGit/PR/CI操作を要求しない。Phase 1にPlaywright、Phase 2にCIを必須にしない。新規2コア環境でOpenCode/Skill・Playwrightが動くことを実行証拠で検証し、無料枠内での完走可否は受講時間・ストレージ・実行環境の実測で判定する。

**今回の変更範囲**：Planのみ。学習用リポジトリの作成、同期・ロードスクリプト実装、教材実装、merge、PR #198の変更、PR #199のcloseは行わない。
