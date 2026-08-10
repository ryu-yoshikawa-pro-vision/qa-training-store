# Glossary

| Term | Meaning |
|---|---|
| Normative | 現在の期待挙動を定義し、Expected Oracleに使える文書領域 |
| Supporting | 読み方・運用・差異・未確定事項を補助する文書領域 |
| BR | Business Rule。安定IDを持つ業務ルール |
| AC | Acceptance Criteria。BRへの参照を持つ受入条件 |
| Executable Canonical Source | ID、型、Route、Tokenなど低レベル値のCode/Config正本 |
| Known Deviation | Current Specとの差異として現在もActiveな実装状態。Expectedを変更しない |
| Unresolved Specification | Product意図が確定しておらず、Defect Oracleにできない項目 |
| Atomic Finding | 1つのExpectedと1つのActual Deviationに対応するQA Finding |
| Learner-safe | ChallengeのLearnerへ公開してよい情報だけを含む入力 |
| Instructor-only | Answer Key、Patch、Ground Truthなど採点担当だけが扱う情報 |

Machine Contractの詳細は `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` を参照してください。
