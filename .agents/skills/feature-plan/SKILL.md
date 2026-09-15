---
name: feature-plan
description: Use when a task needs planning, an explicit plan, or Plan Mode in this repository.
---

# 機能計画Skill

## 目的と適用範囲

このSkillは、複雑または複数段階の作業、明示的な計画依頼、移行や副作用の境界、公開契約、Plan Modeに使います。1ファイルの明確なtypoや文章だけの軽微な変更には使いません。実装を始める前に計画を完了させます。

## 入力

- ユーザーの依頼と、既存のリポジトリのコード、テスト、設定、文書。
- リポジトリ調査と曖昧性の扱いを含む、このSkillの[計画Workflow](references/planning-workflow.md)。
- 再利用可能な出力のひな形としての、このSkillの[計画テンプレート](assets/plan-template.md)。
- Repositoryから提供される計画保存規約、ファイル名規約、active Runへの接続、ライフサイクル。

## 実行の概要

1. 設計を固める前に、このSkillの計画Workflowを読む。
2. 既存リポジトリから、エントリポイント、主な流れ、抽象化、テスト、安全に変更できる範囲、未知点を整理する。
3. 確認済みの事実、仮定、対象外、未解決の質問、純粋なロジック、副作用の境界、利用者向けの影響を分ける。
4. 目的、対象範囲、安全性、移行、完了、検証が変わる可能性のある曖昧さは明示的に解消し、推測で埋めない。
5. 変更を実装する前に、リポジトリの計画保存規約と、このSkillのテンプレートを使って完了した計画を保存する。
6. 具体的な検証計画と曖昧さのない完了条件が計画に含まれてから、実装へ引き継ぐ。

## 出力

- `Goal`、`Current understanding`、`Assumptions`、`Non-goals`、`Impacted areas`、`Files to inspect`、`Change strategy`、`Validation plan`、`Risks`、`Open questions`、`Follow-up notes`を含む計画。
- Repositoryから提供された情報に基づく保存先と命名で、Repositoryに保存する計画成果物。

## ガードレール

- 一般的な計画workflowとtemplateの内容はこのpackageに保持する。
- リポジトリの保存先、filename規則、active Runのライフサイクル、保持ルールはRepository mappingに保持する。
- 未回答のblocking questionがある間は実装を開始しない。
