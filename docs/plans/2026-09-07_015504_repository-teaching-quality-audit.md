# Scenario Shop 教材品質 Repository-wide Audit 計画

## 0. 依頼概要

- 依頼内容: 実務でTest Automationを設計・実装・改善できる人材を育成する教材として、Repository全体を監査する。
- 背景: 機能数や文書量ではなく、段階性、理由の理解、Test Design、Failureからの学習、保守、CI、AI出力の検証、学習成果の評価を重視する。
- 期待成果: 根拠付きFinding、強みと不足、具体的な演習改善、優先度・依存関係・受入条件付きRoadmap。

## 1. ゴール / 完了条件

- 依頼の16重点領域および18の最終質問を対応表で網羅する。
- Findingごとに現状、根拠となるfile / line、学習上の影響、提案、達成判定、確信度、未確認点を明記する。
- 実装の複雑性を一律に排除せず、学習価値と追加負荷を比較する。
- durable reportを `docs/reports/2026-09-07_015504_repository-teaching-quality-audit.md` に保存し、診断・未検証範囲・検証結果を明記する。

## 2. 現状理解と前提

- Current understanding: HEAD `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a` はremote mainと一致。開始時worktree clean、branch `report/2026-09-07`。PR #124のTraining Evidence整備まで含む。
- Entry points: Repository README、`docs/curriculum/test-automation/README.md`、`docs/spec/README.md`、Training scripts。
- Main flow: Product理解 → Workbookによる分析・設計 → Training Web → Failure / 保守 → 総合演習 → Git / PR / CI。Nativeは選択分岐、Agentic QAはOptional。
- Key abstractions: BR / AC、C01〜C12、Common / Native、Formal / Training、Baseline / Learner evidence、Domain / Application / Adapter。
- Existing tests: Vitest / Jest、Formal Playwright / Maestro、Training baseline / exercise / expected failure、Spec / Curriculum validators。
- Assumptions: 利用者の学習実験は行わず、学習効果の因果・所要時間は未実測として扱う。
- Non-goals: Product / 教材 / Harnessの改善実装、外部投稿・レビュー起動、Git mutation、Deploy、Native端末変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。依頼の範囲と評価基準は十分に具体的である。
- 仮定してよい細部: 指定Repositoryの現行main、独学者が辿る経路を基準にする。
- 未回答の重要質問: なし。現行entry-levelの卒業像と依頼の上位到達像の違いは監査結果で説明する。

## 4. 影響範囲

- Impacted areas: 読み取りはRepository全体。書き込みは今回のPlan、Report、標準Run Artifactのみを基本とする。
- Files to inspect: Curriculum全体、Workbook、Training code / workflow / scripts、Spec全体、Productの主要境界、Formal test / CI、関連ADR / recent runs。
- Safe change surface: 監査文書とRun Artifact。未知の実Runtime挙動を観測済みと記載しない。

## 5. 変更方針

- Change strategy: 既存資料の全体図を作り、教材から実装・検証へ追跡し、現行資料で反証してからFindingを確定する。
- 実行タスク:
  - [ ] Product / Spec、Curriculum / Evaluation、Native / AIをread-only調査へ分担する。
  - [ ] 親がPlaywright / Failure / CIを調査し、必要な診断を実行する。
  - [ ] 各Findingを学習効果へ接続し、改善Roadmapと監査Reportへ統合する。

## 6. 検証方法

- Validation plan: current sourceの静的追跡、Spec / Curriculum / Training型検証、事前条件を確認したTraining Web baseline / exercise / expected-failureの診断、既存CI結果の読み取り、Markdownlint、リンク存在、diff check、Run sanitizer。
- 成功判定: 実行済みと未実施を分離し、16領域 / 18問への対応、根拠の解決性、具体的提案の受入条件を確認する。
- Native Build / Install / Device / iOS runtimeは今回実施しない。実行履歴とsourceを根拠に、確認できた保証の上限を記す。

## 7. リスクと未解決論点

- Risks: 過去Findingの重複、教材内にある説明の見落とし、validatorと学習成果の混同、simulatorへの過剰な本番要件、実測なしの効果・工数の断定。
- Open questions: 学習者による到達率、滞留時間、誤答傾向、Native / AI利用環境は未実測。改善後のpilotで検証する。

## 8. 成果物

- 変更ファイル: このPlan、監査Report、`.codex/runs/20260907-015504-JST/`。
- 付随ドキュメント: 新たな設計決定は行わないためADRは作成しない。採用前の改善案はReportで提案として扱う。

## 9. 備考

- `feature-plan` のmapping / validation構造と `code-review` の根拠付きFinding形式を利用し、依頼どおりRepository全体の教材監査へ適用する。
- AGENTS.md §10.1に基づくread-only Native delegationを使用する。子はRun Artifactを変更せず追加delegationしない。

## 10. ユーザー指示による中間終了

- 「現時点での調査結果をレポートにまとめて終了」という指示により、全面監査を中断し、回収済み結果だけを中間Reportへまとめる。
- 追加調査・診断・改善実装は行わない。文書の検証とRun Artifactの保存をもって終了する。
- 当初計画の未完了部分は完了扱いにせず、Reportの監査状況と終了状態へ残す。
