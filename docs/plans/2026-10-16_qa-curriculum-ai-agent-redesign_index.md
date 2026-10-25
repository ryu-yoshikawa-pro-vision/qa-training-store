# AI協働テスト自動化カリキュラムPlan：文書インデックス

## 現行の判定条件

Planに追加したPhase別の実技、機能分母、AI教材レビュー、Template技術受入の詳細は領域別Planを参照する。今回のPlan変更によって全11モジュールの範囲を縮小しない。教材・コードは後続の実装工程で更新する。

## 入口

このファイルはPR #199の**設計文書への案内**を担当する。機能仕様、学習項目、判定条件の正本をここへ複製しない。

- [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)：目的、範囲、3フェーズ、実装順序、全体の完了条件
- [決定事項・残確認事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)：合意済みの方針、Plan採用事項、開発工程で必要な検証、実装完了後の実地検証、運用開始までの指定待ち
- [PR #199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)：変更履歴とレビュー
- [PR #198](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/198)：本PRのbaseに相当する既存仕様・教材の見直し

- [教材・演習・Web導線の改善Plan](./2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md)：確定70回答と新しい完了条件

**読む順序**：作業を始めるときは「全体Plan → 決定事項・残確認事項 → 対象領域の詳細Plan」。全部を毎回読む必要はない。変更前には関連Planと、実際の仕様・コード・テストを確認する。

## 詳細Planの一覧

| 順 | 文書 | 確認する内容 |
| --- | --- | --- |
| 1 | [調査・既存課程との境界](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) | 既存実装で確認した事実、新旧カリキュラムの分離、採用理由と未検証事項 |
| 2 | [3フェーズの構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md) | 対象者、M00〜M10、各フェーズの到達目標、共通環境 |
| 3 | [学習項目と理解水準](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md) | 51学習項目、理解・適用・判断、学習項目ID |
| 4 | [学習順序・習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md) | テスト経験者向け導入、開発・AIの前提知識、各モジュールの演習、Level 2で確認する行動 |
| 5 | [Web閲覧・受講者の学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md) | 公開ページの受講導線、モジュール閲覧、一問ずつのクイズと最終結果・復習・再開、既存静的公開基盤の利用 |
| 6 | [クイズと解説](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md) | 四択問題、正答・誤答説明、認知水準、復習先、問題の妥当性検証 |
| 7 | [評価と修了条件](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) | 提出物、自己確認、正式な評価、Level 0〜3、各フェーズの独立修了 |
| 8 | [教材同期・モジュールロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) | 配布許可リスト、管理者同期、学習者による1モジュールロード、教材更新、上書き防止 |
| 9 | [Scenario Shop・実行環境・Skill・CI](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md) | Build/Serve、Seed/Reset、Playwright、外部Skillの工程依存、選択Phase 3のCI |
| 10 | [モジュールの開始・終了基準状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) | 各11モジュールの開始・終了データ、公開開始入力、公開の模範/採点資料、フェーズ間の入力契約 |
| 11 | [知識グラフの完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) | 学習項目と知識・教材・評価・状態・仕様・Skillの関係、改訂時の影響追跡 |

## 作業別の参照先

| 作業 | 必ず参照する文書 | 必要に応じて追加する参照 |
| --- | --- | --- |
| 目的・対象範囲の変更 | [全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)、[決定事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md) | [3フェーズの構成](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| モジュールの教材・順序の改訂 | [教材の内容品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)、[学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md) | [演習対象](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)、[知識グラフ](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md) |
| Web教材・ナビゲーション・クイズUI | [Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)、[クイズ](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md) | [教材品質](./2026-10-16_qa-curriculum-ai-agent-redesign_design.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 問題・実技・合否判定 | [クイズ](./2026-10-16_qa-curriculum-ai-agent-redesign_quizzes.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)、[学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md) |
| 開始時の正しさ・成果物引継ぎ | [開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md)、[同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md) | [評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 同期・ロード・公開範囲 | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[調査](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) |
| Playwright・Scenario Shop・外部Skill・CI | [実行環境](./2026-10-16_qa-curriculum-ai-agent-redesign_target.md)、[調査](./2026-10-16_qa-curriculum-ai-agent-redesign_research.md) | [同期・ロード](./2026-10-16_qa-curriculum-ai-agent-redesign_distribution.md)、[評価](./2026-10-16_qa-curriculum-ai-agent-redesign_assessment.md) |
| 仕様・Skill・教材の変更影響 | [知識グラフの完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)、[運用README](../curriculum/ai-assisted-qa/README.md) | [学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)、[開始・終了状態](./2026-10-16_qa-curriculum-ai-agent-redesign_states.md) |
| 実装着手前の確認 | [決定事項・残確認事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)、[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md) | 担当する機能の詳細Plan、既存コード・テスト |

## 実装・改訂時の正本

- **製品の正式な期待動作**：`docs/spec/`。関連するSeed/Resetと製品コードの既存契約を確認する。
- **学習目標・Level 2**：[学習項目](./2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)と[習熟基準](./2026-10-16_qa-curriculum-ai-agent-redesign_progression.md)。
- **知識・参照関係**：[`knowledge-graph.json`](../curriculum/ai-assisted-qa/knowledge-graph.json)、[完成仕様](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)、[運用README](../curriculum/ai-assisted-qa/README.md)。
- **QA workflowのSkill本体**：別リポジトリ`ryu-yoshikawa-pro-vision/qa-workflow-skills/skills/`。このリポジトリの`.agents/skills/`の汎用Skillとは区別する。
- **公開Webとクイズ操作**：[Web閲覧・学習体験](./2026-10-16_qa-curriculum-ai-agent-redesign_web-learning.md)。既存静的公開基盤を拡張し、教材本文はMarkdown、クイズ・正答・公開解説はモジュール別JSONを正本とする。
- **正式な教材・問題・課題ファイル**：今後作成する`docs/curriculum/ai-assisted-qa/`と`training/ai-assisted-qa-course/`の実ファイル。存在しない成果物を完成済みと扱わない。

## 文書を変更するとき

1. 変更内容に対応する詳細Planと既存コード・仕様を確認する。**インデックスだけで実装の可否を決めない**。
2. 方針の決定・変更、運営側の指定、実装検証の結果が変わった場合は[決定事項・残確認事項](./2026-10-16_qa-curriculum-ai-agent-redesign_decisions.md)を更新する。確認者のいない事項を「合意済み」へ移さない。
3. モジュール・知識・教材・仕様・Skill・評価の対応が変わる場合は[知識グラフの改訂手順](./2026-10-16_qa-curriculum-ai-agent-redesign_knowledge-graph.md)に従って影響を確認する。
4. Planを分割・統合・移動した場合は、この一覧と[全体Plan](./2026-10-16_qa-curriculum-ai-agent-redesign.md)の入口を更新する。
5. 模範解答・採点用テスト・完成状態データは公開リポジトリ内の通常ファイルとして内容をレビューできるようにし、学習用Template/同期/ロード/Web Build/公開Artifactからは除外する。この除外は秘密保持ではない。評価条件は公開してよい。正式評価では追加質問・条件変更で本人の判断を確認する。学習者個人の評価記録は公開しない。
