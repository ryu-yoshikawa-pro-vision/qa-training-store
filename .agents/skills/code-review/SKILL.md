---
name: code-review
description: Use when reviewing changes, handling /review, or doing self-review in this repository.
---

# コードレビューSkill

## 目的と適用範囲

このSkillは、レビュー依頼、`/review`、実装完了前の自己レビューに使います。通常の出力はレビューの指摘です。このworkflowは修正を実装しません。指摘や検証失敗の修復が必要になった場合は、対象範囲を限定したrepair workflowへ明示的に切り替えます。

## 入力

- 依頼されたレビューの対象範囲と現在の変更内容。
- このSkillの[レビューWorkflow](references/review-workflow.md)。
- Repository mappingから提供されるリポジトリのコーディング方針。
- Repository mappingから提供されるリポジトリのレビュー結果保存方針。
- ユーザーがレビューサービスを明示的に許可した場合の、承認済み外部レビュー結果。

## 実行の概要

1. このSkillのレビューWorkflowが定めるdiffの仕分けと深掘りの順序に従う。
2. 正しさ、セキュリティ、動作回帰、テスト不足、保守性を優先する。
3. 必須のseverity、Evidence、場所、影響、対応の方向性を添えて指摘を報告する。指摘がない場合も、残るリスクと未検証領域を記載する。
4. ユーザーが明示的に依頼した場合、または提供されたリポジトリのレビュー結果保存方針が要求する場合だけ、永続的なレビュー報告を作成する。具体的な保存先、命名、保持ルールはその外部入力に従う。

## ガードレール

- 指摘を消すために既存契約を弱めない。
- 明示的な承認なしに外部サービスのfull reviewや再レビューを開始しない。
- レビューのみの作業は指摘を返し、実装や修復へ暗黙に切り替えない。
