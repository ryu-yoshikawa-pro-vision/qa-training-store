# ADR-0012: Specification と Agentic QA の基盤契約

- Status: Accepted
- Date: 2026-08-10

## Context

Scenario ShopのBusiness Rule、Acceptance Criteria、UI/Behavior、Executable Sourceが複数の既存資料へ分散していた。Agentic QAを追加する場合、Learnerへ見せるSpecification、Instructor-only Ground Truth、Readonly探索、Black-box Isolation、Runner評価を同じ入力として扱うと、仕様ドリフトと採点情報の漏洩が起きる。

## Decision

1. Normative Product Specificationは`docs/spec/`の固定Allowlistとし、Feature文書は5節のExact Grammar、BR/AC、AC→BR、BR Acceptance coverageを持つ。
2. Machine ContractはJSON + 既存Zodだけを使う。`scripts/spec/validate-all.ts`をCI／`verify`入口、`scripts/spec/build-spec.ts`を静的HTML生成入口とする。
3. Normal／Gray-boxはSource Working Tree Readonly、Black-box Scoredは`learner-spec/`、`runbook/`、`challenge/`だけのisolated rootとする。RunnerへSource、Test、Patch、Answer Key、Artifact、Search、Generic Shell、Browser arbitrary evaluate、Network Response Bodyを渡さず、Positive Tool AllowlistとForbidden Probeを必須にする。
4. Black-box Required CoverageのSSOTは`challenge.required_coverage`、Learner-safe Bundleは`challenge.spec_refs[]`のNormative owner fileだけとする。Answer Key／PatchはInstructor-onlyで、Patch適用はdisposable copy上の`git apply --check`→`git apply`順序に限定する。
5. Benchmark Identityは`challenge_id + benchmark_revision + runtime_variant_id`、同条件Runner比較はRunner Profile完全一致とする。未Commit／mixed inputはCanonical Manifest SHA-256でRevision化する。
6. EvaluatorはFrozen Findingsを書き換えず、Atomic Finding、Duplicate、`invalid_non_atomic`、TN／`FP_non_defect`／NE、Environment Blocker、Unexpected Valid Findingを明示的に分類する。正式Metricはvalid Scored Runだけに適用する。
7. Spec変更のAffected Challenge Summaryは`scripts/spec/summarize-impact.ts`で導出し、既存Style Quality Jobの`GITHUB_STEP_SUMMARY`へ出力する。CI Jobを増やさず、ローカルWorking Tree modeでは未追跡`docs/spec`も対象にする。

8. Agentic QA adopts a Skill-first, Harness-backed architecture. Coding Agent + Exploratory QA SkillがPrimary QA execution ownerであり、`scripts/agentic-qa/**`はDeterministic supporting harnessとしてPreparation、Validation、Isolation Verification、Artifact Integrity、Evaluation、Scoringだけを担当する。HarnessはCoding Agentをlaunch、wrap、orchestrate、retry、manageしない。
9. Normal／Gray-boxはSkill-firstの日常QA workflowとし、Black-box Scoredはdeterministic PreparationとEvaluationを前段／後段に持つ。評価対象のRunnerはAgent Runtime／Hostが提供するFresh Coding Agent Sessionであり、Repository内Scriptが起動するNode.js runnerではない。
10. Official model-backed Scored E2Eは、Coding Agent RuntimeがFresh Session、trusted session identity、Tool isolation／positive allowlist、trusted Actual Tool Scope inventoryを提供できる場合だけ実行する。提供できない場合は`BLOCKED`とし、独自LLM API wrapper、Codex CLI wrapper、custom agent runtime、custom session manager、custom MCP orchestrationをこのBlocker解消のために実装しない。

### Prohibited custom orchestration

The repository does not implement a custom model runner only to execute
Agentic QA. Do not add an LLM API wrapper, Codex CLI wrapper, custom agent
runtime, custom session manager, or custom MCP orchestration unless a separate
future architectural decision explicitly requires it.

## Consequences

- Specification変更はBR/ACと影響Challengeを確認する必要があるが、参照の内容変更だけで自動Failureにはしない。
- Normal／Gray-boxの実行結果をBlack-box比較へ混ぜられない。
- iOS物理Runtimeを新しいAgentic QAの必須条件にはせず、現行ADR-0011のBuild-onlyを維持する。Android物理端末が利用できる場合もMaestro Regression PASSをAgentic Capability PASSへ昇格しない。
- Instructor-only情報をRunnerへ渡す設計は成立しないため、評価不能時はFail-closeする。
