# 用語集

この用語集では、Scenario Shopの機能仕様、QA、テスト自動化を理解するために必要な用語を整理しています。Agentic QAや採点に関する用語は後半の参考用として掲載しており、標準カリキュラム開始時点での前提知識とはしていません。

## 機能とテストを読むための用語

| 用語 | 意味 |
|---|---|
| BR | Business Rule。一意で恒久的なIDを持つ業務ルール |
| AC | Acceptance Criteria。BRへの参照を持つ受入条件 |
| Executable Canonical Source | ID、型、ルート、トークンなど低レベル値のコード／設定（Code/Config）の正本 |
| Normative | 現在の期待挙動を定義し、期待動作の判断基準として使用する文書領域（規定領域） |
| Supporting | 読み方・運用手順・差異・未確定事項などを補足する文書領域（参考領域） |
| Known Deviation | 仕様との差異として現在も有効（Active）な実装状態。期待動作の定義自体は変更しない |
| Unresolved Specification | プロダクトとしての意図が確定しておらず、不具合判定の基準にできない未確定項目 |

## Agentic QA / 運用の参考用語

以下の用語は、Agentic QA、Challenge、または採点担当者向けの資料で使用します。通常の機能仕様を読み進める上での前提知識とはしていません。

| 用語 | 意味 |
|---|---|
| Atomic Finding | 1つの期待動作（Expected）と1つの実際の実装差異（Actual Deviation）に対応するQA Finding |
| Learner-safe | Challengeの学習者（Learner）へ公開可能な情報のみを含む入力 |
| Instructor-only | Answer Key（模範解答）、Patch、Ground Truth（正解データ）など、採点担当者のみが扱う情報 |

Machine Contractの詳細は `QA_AGENT.md` および `docs/reference/agentic-qa-workflow.md` を参照してください。