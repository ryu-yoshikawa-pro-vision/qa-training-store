---
name: harness-improvement
description: Use when converting run results, evaluation findings, repair-loop outcomes, or repeated failures into harness improvement candidates.
---

# Harness改善Skill

## 目的と適用範囲

このSkillは、Run、評価、修復ループ、レビュー、繰り返し発生する失敗のEvidenceを、レビュー可能なHarness改善候補へ変換するときに使います。候補は提案であり自動変更ではありません。無関係なProduct実装とは分離します。

## 入力

- evaluation result、Run manifest、検証結果、Hook観測、Subagent record、レビューコメント、繰り返しの失敗。
- 候補モデル、Evidence、分類、レビュー境界を定義する、このSkillの[改善Workflow](references/improvement-workflow.md)。
- リポジトリから提供されるtarget catalog、strictness mapping、Failure Taxonomy、artifact / evaluation契約。

## 実行の概要

1. 具体的なEvidenceを集め、それが裏付ける失敗または再発を特定する。
2. `target`、`failure_category`、`evidence`、`expected_impact`、`risk`、`recommended_change`、`strictness`を持つ候補を作成する。
3. Product実装の修正とHarness改善の提案を分ける。
4. 具体的なpathとRepository layerへの適用可否には、リポジトリのtarget catalogとstrictness mappingを使う。
5. 候補をレビュー可能な状態にし、自動適用しない。

## 候補と出力の境界

候補モデルと`target`項目の意味は、このSkillの改善Workflowが定義します。Repository mappingは、リポジトリのpath、pathベースのstrictness、taxonomy category、artifact保存先を提供します。出力には候補の概要、Evidence、影響、リスク、推奨案、strictness、担当者の判断、後続作業の対象範囲を含めます。

## ガードレール

- Evidenceのない提案は却下し、失敗分類を創作しない。
- `normal`、`strict`、`blocked`の判断を明示する。
- 安全性、runner、schema、policy、破壊的操作、credential、permission、bypassへの影響は、提供されたRepository mappingに従って扱う。
- 候補を自動適用せず、無関係な実装作業へまとめない。
