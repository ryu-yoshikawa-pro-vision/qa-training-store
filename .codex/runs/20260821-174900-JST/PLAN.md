# Plan

## Objective

- Repository Audit Remediation Planを、実装者が迷わない詳細さは維持しつつ、PR過剰分割・重複Test・不要なFramework・検証マトリクスを削った実装可能な状態にする。

## Scope

- In:
  - R2a / R3の技術的なEnd-to-End修正範囲は維持する。
  - 同じ変更面と依存関係を持つR2a + R3をPreferred implementation groupへ統合する。
  - 小さいdocs-onlyのR12a + R12bを同一Groupへまとめる。
  - Root Cause数に比例してPRを増やす旧ルールを撤廃する。
  - R2aで既存`ProductViewer` / visibility / pricing semanticsを再利用し、Native専用model/ruleを作らないことを明示する。
  - R2a / R3の重複Testを避け、既存coverageをrebaselineして不足する最小Regressionだけ追加する。
  - Native Suggestionのstale protectionは実際にasync overlapがある場合だけ最小guardを入れ、新Cancellation frameworkを禁止する。
  - MCP / Runtime確認をFindingの再現と修正確認に必要な操作だけへ限定する。
  - R8は既存validator / Existing Harnessを可能な限り再利用し、新Bundle Inspection Frameworkを作らない。
  - Plan branchのsanitize / format / markdown lintを完了条件として維持する。
- Out:
  - Product / Test / CI / Curriculum本体の実装修正。
  - Audit Report本文の修正。
  - Deferred Findingの実装。
  - Planの短文化自体を目的とした情報削除。

## Assumptions

- Current Plan branchは`plan/repository-audit-remediation`。
- Repositoryをローカル取得できる環境でsanitize / format / markdown lintを実行できる。
- 実装時は各Preferred implementation groupを最新`main`へrebaseする。

## Questions / Ambiguity

- 全体Planを止めるBlocking Questionはなし。
- REP-013 / REP-017は各confirmation taskで確認する。
- MNT-003の最小Hermes検証方式はR8実装時に決めるが、Actual Production Artifact由来Evidenceは必須とする。

## Hypotheses

- H1: R2aはviewer contextをSQLiteまで保持し、既存`ProductViewer` / `canViewerSeeProduct()` / pricing serviceを再利用すれば、Native専用ruleを増やさずCurrent Storefront Contractへ戻せる。
- H2: R2a + R3は同じRuntime / UseCase / Gateway / Repository / SQLiteを変更し、R3がR2aへ依存するため、同一PRの方が変更とValidationを単純化できる。
- H3: Native SuggestionはUI→Service→UseCase→Gateway→Repository→SQLiteを完成させる必要があるが、async raceが実在しない限り専用Cancellation機構は不要である。
- H4: R8は既存validatorをWorkflowから再利用できれば、Hermes false-negativeを直しつつinspection実装の重複を減らせる。
- H5: Runtime/MCP確認をFindingのBefore/Afterへ限定すれば、必要なEvidenceを保ちながら探索scope creepを避けられる。

## Research Plan

- Repository Planning / Review Contractを確認する。
- Current Native Runtime、CatalogUseCases、CustomerCatalogGateway、Native Customer Repository / SQLite、Native Search UIを確認する。
- Web側のviewer-aware Storefront query / permission / pricing semanticsを確認する。
- Current Native bundle validator / Native CI / Contract Testを確認する。
- Main PlanのPR grouping、Validation、MCP、Framework制約を簡素化する。
- branch差分を確認する。
- ローカル環境でsanitize / format / markdown lintを実行して完了判定する。

## Approach

1. 技術的に必要なEnd-to-End修正範囲は維持する。
2. 同一変更面を持つSliceをPreferred implementation groupへまとめる。
3. 重複Test / 不要な検証matrix / speculative frameworkを削る。
4. Main PlanとPlanning Run Artifactを同期する。
5. Repositoryをローカル取得できる環境で最終Validationを実行する。
6. PASS後にPlanning Runを100%完了へ更新する。

## Definition of Done

- R2a + R3がG2として同一実装Groupになっている。
- R12a + R12bが小さいdocs-only G12としてまとめられている。
- DoD / Deliverablesから「Root Causeごとに必ず別PR」が削除されている。
- R2aが既存`ProductViewer` / Domain visibility / pricing semanticsを再利用し、Native専用rule/modelを作らない。
- R2aのrank coverageが全Test layerへの重複追加ではなく、既存coverage + 最小Regressionになっている。
- R3がNative SuggestionのUI / Service / UseCase / Gateway / Repository / SQLite全経路を維持する。
- R3のstale protectionが実際のasync overlap時だけの最小guardに限定されている。
- MCP / Runtime validationがFindingに必要な操作だけへ限定されている。
- R8が新しい汎用Frameworkや重複Harnessを作らない方針になっている。
- Planning Runがsanitize未実行のまま100%完了扱いされていない。
- `sanitize-codex-artifacts` Write + CheckがPASSする。
- `pnpm run format:check`がPASSする。
- `pnpm run lint:markdown`がPASSする。
- Plan + Run Artifact以外の変更がない。

## Risks / Unknowns

- GitHub connector環境ではRepository scriptを直接実行できないため、最終Validationはローカル実行が必要。
- Cross Browser CI splitはmain未反映のため、R13はdependency blockedのまま保持する。

## Thinking Log

- 2026-08-21 17:49 JST: 初回Plan修正を実施。
- 2026-08-21 20:24 JST: R3全dimension、R7 Oracle、R8 merge gate、Plan branch validation不足を確認して反映。
- 2026-08-21 20:40 JST: R8の重複Hermes scan、R3 Suggestion gateway欠落、repo mapping必須項目、R8 gate過剰性を確認。
- 2026-08-21 20:53 JST: R2a / R3をEnd-to-End pathへ修正し、Run Artifactを同期。
- 2026-08-21 21:20 JST: Planの長さ自体は維持し、PR過剰分割・重複Test・MCP matrix・speculative frameworkだけを簡素化する方針へ変更。
