---
name: repair-loop
description: Use when applying review findings, fixing validation failures, or running a bounded Review -> Repair -> Validate loop.
---

# 修復ループSkill

## 目的と適用範囲

このSkillは、対応可能なレビュー指摘や検証失敗を仕分けし、対象範囲を限定したReview → Repair → Validate loopを実行するときに使います。無期限にretryを続ける指示ではなく、安全でない操作、破壊的操作、対象範囲違反を許可するものでもありません。`needs_human`の指摘は直ちにエスカレーションして停止する条件であり、loopを続ける理由ではありません。

## 入力

- レビュー指摘、evaluation result、検証失敗、対象範囲の報告、観測Evidence。
- 仕分け、反復、検証、停止の意味を定義する、このSkillの[修復Workflow](references/repair-workflow.md)。
- artifact保存、evaluation統合、Failure Taxonomy、対象範囲ポリシー、sanitizationに関するRepository提供の入力。
- Evidenceとして利用できる場合のSubagent生成recordと観測。このSkillはSubagentのrole、tool、permission、sandbox、delegation契約を取り込みません。

## 実行の概要

1. Repository mappingとこのSkillの修復Workflowを読む。
2. 対応可能な修復シグナルと、明示的に限定された許可範囲の両方があることを確認する。対象範囲が明確なだけではloopを開始しない。
3. Findingを`must_fix`、`should_fix`、`defer`、`reject`、`needs_human`のいずれかに分類する。
4. 許可ファイル、修復計画、最小検証を含む1回分の限定された反復を定義する。
5. 修復を適用し、変更ファイルと検証結果を記録して残差を比較する。
6. 成功または定義済みの停止条件で停止し、runnerレベルの自動loopを開始しない。
7. 結果をRepository提供のevaluationとrun-artifact契約へ接続する。

## 出力

- 反復ごとの入力Finding、修復計画、許可範囲、変更ファイル、検証、残差、decision。
- 提供されたevaluationとreport artifactで表現できる最終停止理由と後続状態。

## 直ちに人へエスカレーションする場合

要件、破壊的変更、権限、credential、policy境界の判断、またはユーザー・レビュアーの判断が必要なFindingは`needs_human`に分類します。そのFindingを検出したら、直ちに`decision = stop_needs_human`を設定します。

`needs_human`を検出したらloopを停止し、人の判断を待ちます。修復の継続、対象範囲の拡大、安全でない操作や破壊的操作、policy判断の推測による補完を行いません。

## ガードレール

- このSkillのWorkflowが定める限定された反復、繰り返し失敗、安全でない操作、対象範囲、人へのエスカレーションの意味を保持する。
- Repositoryのpath、artifact保存先、taxonomy file、sanitization commandはRepository mappingに保持する。
- Subagent契約を変更せず、Subagent生成Evidenceの既存利用を削除しない。
- ユーザーの明示的な指示または承認なしに外部サービスのfull reviewや再レビューを開始しない。
