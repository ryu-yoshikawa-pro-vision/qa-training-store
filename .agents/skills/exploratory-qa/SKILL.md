---
name: exploratory-qa
description: Execute specification-driven Normal, Gray-box, and isolated Black-box Agentic QA for Scenario Shop.
---

# 探索的QA Skill

## 目的と適用範囲

このSkillは、仕様に基づく探索的QAの主な入口です。Normal、Gray-box、隔離されたBlack-box Scoredの選択と実行境界を扱います。QA中のProduct Code変更は許可しません。Findingsを確定した後だけ、Repair workflowへ明示的に切り替えます。

探索的QA、仕様ベースQA、runtime、Web、Android、ユーザージャーニー、異常系、境界値、Agentic QAを実施する依頼に使います。

典型的なトリガーは、QA、探索的テスト、仕様に基づくruntime確認、画面操作、Agentic QA、Web QA、Android QA、ユーザージャーニー確認、異常系や境界値の調査です。

## 実行責任

Coding Agentは、環境から提供されたruntime capabilityを使ってQA workflowを実行します。Supporting harness toolは準備、検証、隔離、artifact保存、評価、採点を行えますが、Coding Agent Sessionのlaunch、wrap、retry、管理は行いません。リポジトリ固有の責任分担とmachine contractはexternal inputとして提供されます。

## 入力

- ユーザーの対象範囲、Normative Specification、Repository QA契約。
- package-localの[Normal and Gray-box workflow](references/workflow.md)。
- 採点評価が明示的に依頼された場合のpackage-localの[Black-box Scored workflow](references/scored-mode.md)。
- active workflowが提供するCharterまたはchallenge inputと、利用可能なBrowserまたはNative Runtime capability。
- リポジトリが提供するschema、artifact、validator、準備、evaluation、scoringの対応。package側でpathやfield nameを前提にしません。

## 実行の概要

1. Runtimeと対話する前にportable workflowとRepository QA input mappingを読む。
2. 探索前にNormal、Gray-box、または明示されたBlack-box Scored modeを選び、選択したModeのpackage-local境界を適用する。
3. Charterまたは採点Coverage、riskの優先順位、対象範囲を限定したBudget、Stop Conditionを確認する。
4. Normative Specificationに照らしてRuntimeを探索し、意味のあるEvidenceとAtomic Findingを集める。
5. 必須Coverage、snapshotまたはisolation Evidence、source diff条件、Repository output contractを満たしてから確定する。

## ガードレール

- Required Coverageを限定されたまま保ち、missionを機械的に拡大・並べ替えしない。
- workflowがより強いEvidenceを要求する場合、screenshotや自由記述のメモだけでは意味的なproofとして不十分と扱う。
- `1 Finding = 1 distinct product deviation`を保ち、無関係なdeviationをまとめない。
- Repositoryのread-only境界をBlack-box isolationとみなさず、blockedな採点Runを回避するcustom Runner / LLM wrapperを作らない。
- 必要なtrusted capabilityを利用できない場合は、提供されたRepository契約に従って採点Runをblockedまたはnot executedとして記録する。
