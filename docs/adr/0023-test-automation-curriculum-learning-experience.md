# ADR-0023: Test Automation Curriculumの学習順序・演習 / CI契約

- Status: Accepted
- Date: 2026-09-09

## Context

Test Automation Curriculumは、仕様分析、Workbook、Playwright / Maestro、Failure分析、保守、GitHub Actionsを同じScenario Shopへ接続する。既存の教材には、初学者がCLIや実装上のIDを先に読む経路、基準確認と受講者成果物の混同、診断Failureと恒久Failureの混在、Workbookの実行状態の曖昧さ、演習用CIで受講者Testが継続実行されない経路があった。

Product Behavior、Formal Regression、Production / Preview CIの意味を変更せず、既存の4 CSVとTraining実行経路を使ったまま、受講者が仕様から実行証跡までを一巡できる契約を定める必要がある。

## Decision

1. 受講者の基本読書順を、製品範囲 → Role / 権限 → FeatureのPurpose / BR / AC → State / Scenario → 必要な`seed_catalog.md`の節 → `/guide` / 現在UIでの観察 → 実装時だけExecutable Source、とする。`/guide`や現在UIを期待動作の正本へ昇格させない。
2. Common routeはWebを中心に完了できるようにし、Native UI自動化はNative specializationとして分離する。P1-7 / P2-6は選択時だけ追加し、baselineやstock PASSをlearner-authored competency evidenceの代替にしない。
3. Playwrightの受講者向け初期演習は、TypeScriptとして有効な未完成のstarterを配布する。Scenario Resetの共有入口は受講者が利用できるようにするが、BrowserContext分離とは別責務として説明する。恒久的なArtifact確認用Failureと、原因確認・修正・再実行を行う診断Failureは別の実行経路にする。
4. Workbookは既存4 CSVと既存列を維持する。実行行では前後空白を除いて空でない`run_context`、`Pass` / `Fail` / `Not run`の3値、状態に応じたEvidence / 診断情報を要求する。Evidenceは実行時Artifactへの人間可読な参照であり、静的ValidatorはArtifactファイルの実在を要求しない。
5. Training Workflow Templateの`pull_request`経路は、Web baselineの後に`training:web:exercise`を実行する。Templateの生成時検証と、受講者Test変更後のGitHub Actions runtime成功を別のEvidenceとして扱う。Production / Preview Workflowは教材都合で変更しない。

## Consequences

- 初学者はP1-4以前にCLIや低レベル実装値を必須前提とせず、仕様とWorkbookからPlaywright実装へ移れる。
- C07 / C09 / C12の証跡は、受講者の変更、診断の状態遷移、Pull Request上の継続実行をそれぞれ説明できる。
- 実行時ArtifactはRunやGitHub Actionsへ残るため、fresh checkoutにArtifactファイルがないことはWorkbook静的検証のFailureにならない。
- Native実機やGitHub Actions runtimeを利用できない場合、その状態は未実行 / 未確認として記録し、Common completionやTraining Copy validationの成功へ読み替えない。

## Guardrails

- `src/**`、BR / AC、Seed Scenarioの意味、Formal Regression、本番 / Preview CI、既存の汎用Training runnerは変更しない。
- Workbookの列追加、独自Evidence URI / Manifest、新しい実行基盤、受講者専用の自動採点は追加しない。
- `training:copy:validate`のPASSを、受講者がTestを変更した後のGitHub Actions runtime PASSとして扱わない。
