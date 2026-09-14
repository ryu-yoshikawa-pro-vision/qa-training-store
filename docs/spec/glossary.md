# Glossary

この用語集は、Scenario Shopの機能・QA・テスト自動化を読むときに必要な語から確認します。Agentic QAや採点用の語は後段の参考用で、標準カリキュラムの最初の前提にはしません。

## 機能とテストを読むための用語

| Term | Meaning |
|---|---|
| BR | Business Rule。安定IDを持つ業務ルール |
| AC | Acceptance Criteria。BRへの参照を持つ受入条件 |
| Executable Canonical Source | ID、型、Route、Tokenなど低レベル値のCode/Config正本 |
| Normative | 現在の期待挙動を定義し、期待動作の判断基準に使える文書領域 |
| Supporting | 読み方・運用・差異・未確定事項を補助する文書領域 |
| Known Deviation | 現在の仕様との差異として現在もActiveな実装状態。期待動作を変更しない |
| Unresolved Specification | 製品の意図が確定しておらず、不具合判定の判断基準にできない項目 |

## Agentic QA / 運用の参考用語

次の語はAgentic QA、Challenge、または採点担当向けの資料で使います。通常の機能仕様を読む前提にはしません。

| Term | Meaning |
|---|---|
| Atomic Finding | 1つのExpectedと1つのActual Deviationに対応するQA Finding |
| Learner-safe | ChallengeのLearnerへ公開してよい情報だけを含む入力 |
| Instructor-only | Answer Key、Patch、Ground Truthなど採点担当だけが扱う情報 |

Machine Contractの詳細は `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` を参照してください。
