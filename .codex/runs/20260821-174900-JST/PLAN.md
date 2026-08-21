# Plan

## Objective

- Repository Audit Remediation Planを、実装者が迷わない詳細さは維持しつつ、PR過剰分割・重複Test・不要なFramework・検証マトリクス・confirmationからのscope creepを削った実装可能な状態にする。
- 既存Repository Policyを変更せず、Parent Codexがsafe / standard feature branch上で明示Pathの`git add` / `git commit` / 通常の`git push`まで実施できるGit Execution Contractを固定する。PR mergeやhistory rewriteは許可しない。

## Scope

- In:
  - Parent Codexのsafe / standard workflowにGit Execution Contractを追加する。
  - Parent Codexは確認済み明示Pathだけをstageし、normal commit、current feature branchへのnormal pushまで実施してよい。
  - `implementation_worker`はGit writeせず、Source編集だけを担当する責務分離を維持する。
  - `auto-net`のGit write禁止は変更しない。
  - protected branch direct update、force push、remote ref deletion、rebase、amend、destructive reset/clean/rm、PR mergeは禁止を維持する。
  - PR作成はユーザーの明示依頼時だけに限定する。
  - R2a / R3の技術的なEnd-to-End修正範囲は維持する。
  - 同じ変更面と依存関係を持つR2a + R3をPreferred implementation groupへ統合する。
  - 小さいdocs-onlyのR12a + R12bを同一Groupへまとめる。
  - Root Cause数に比例してPRを増やす旧ルールを撤廃する。
  - R2aで既存`ProductViewer` / visibility / pricing semanticsを再利用し、Native専用model/ruleを作らないことを明示する。
  - R2a / R3の重複Testを避け、既存coverageをrebaselineして不足する最小Regressionだけ追加する。
  - Native Suggestionのstale protectionは実際にasync overlapがある場合だけ最小guardを入れ、新Cancellation frameworkを禁止する。
  - MCP / Runtime確認をFindingの再現と修正確認に必要な操作だけへ限定する。
  - R8は既存validator / Existing Harnessを可能な限り再利用し、新Bundle Inspection Frameworkを作らない。
  - C1 / REP-013とC2 / REP-017はread-only confirmationに限定し、Documentation / Workflow / external settings / 追加CI実装へ自動移行しない。
  - Plan branchのsanitize / format / markdown lintを完了条件として維持する。
- Out:
  - Product / Test / CI / Curriculum本体の実装修正。
  - `AGENTS.md` / auto-net rules / Common Hook等のGit permission policy変更。
  - auto-netへのGit write許可。
  - Audit Report本文の修正。
  - Deferred Findingの実装。
  - REP-013確認結果だけを理由にしたCurriculum / Training Workflow / executable contract変更。
  - GitHub Ruleset / Branch Protectionの変更。
  - REP-017確認結果だけを理由にした追加CI実装。
  - PR merge。
  - force push / rebase / amend / destructive history rewriteの許可拡大。
  - Planの短文化自体を目的とした情報削除。

## Assumptions

- Current Plan branchは`plan/repository-audit-remediation`。
- Repositoryをローカル取得できる環境でsanitize / format / markdown lintを実行できる。
- 実装時は各Preferred implementation group開始前に`git fetch`等で最新`origin/main`を確認し、Findingと変更面をrebaselineする。
- state-changing rebaseは自動実行しない。
- Git writeはParent Codexがsafe / standard workflowで行う。
- `implementation_worker` / auto-netではGit writeしない。
- Parentは`git add .` / `git add -A` / `git add --all` / `git add -u`を使わず、確認済みの明示Pathだけをstageする。
- Parentは`git commit -a` / `git commit --all`を使わない。

## Questions / Ambiguity

- 全体Planを止めるBlocking Questionはなし。
- Safe Git writeの許可範囲は、Parent Codexのsafe / standard feature branch上のnormal add / commit / pushまでで確定している。
- Git permission policy / auto-net contract自体は変更しない。
- PR mergeは実施しない。PR作成はユーザー明示依頼時のみとする。
- REP-013 / REP-017は各confirmation taskでread-only確認する。
- REP-013で責務分離の意図が一意に確定しない場合は推測で変更せず、Evidence・判断事項・推奨alignment案を報告して止める。
- REP-017で保証不足が見つかっても、変更はユーザーの明示承認後の別対応とする。
- MNT-003の最小Hermes検証方式はR8実装時に決めるが、Actual Production Artifact由来Evidenceは必須とする。

## Hypotheses

- H1: R2aはviewer contextをSQLiteまで保持し、既存`ProductViewer` / `canViewerSeeProduct()` / pricing serviceを再利用すれば、Native専用ruleを増やさずCurrent Storefront Contractへ戻せる。
- H2: R2a + R3は同じRuntime / UseCase / Gateway / Repository / SQLiteを変更し、R3がR2aへ依存するため、同一PRの方が変更とValidationを単純化できる。
- H3: Native SuggestionはUI→Service→UseCase→Gateway→Repository→SQLiteを完成させる必要があるが、async raceが実在しない限り専用Cancellation機構は不要である。
- H4: R8は既存validatorをWorkflowから再利用できれば、Hermes false-negativeを直しつつinspection実装の重複を減らせる。
- H5: Runtime/MCP確認をFindingのBefore/Afterへ限定すれば、必要なEvidenceを保ちながら探索scope creepを避けられる。
- H6: C1 / C2をread-onlyに固定すれば、未確定のintent確認やRepository外設定確認から意図せず実装scopeが広がることを防げる。
- H7: Current Common HookとCommon RulesはParentのsafe feature-branch add / commit / pushを既に許可しているため、Git permission policyを変更せずExecution Contractだけでユーザー要望を満たせる。

## Research Plan

- Repository Planning / Review Contractを確認する。
- `AGENTS.md`、Common Hook、Common Rules、auto-net rulesを確認し、Parent safe/standardとworker/auto-netの責務境界を確認する。
- Current Native Runtime、CatalogUseCases、CustomerCatalogGateway、Native Customer Repository / SQLite、Native Search UIを確認する。
- Web側のviewer-aware Storefront query / permission / pricing semanticsを確認する。
- Current Native bundle validator / Native CI / Contract Testを確認する。
- Main PlanのPR grouping、Validation、MCP、Framework制約を簡素化する。
- C1 / REP-013とC2 / REP-017をread-only confirmationとして固定する。
- Git Execution ContractをMain Planへ固定し、Git permission policy変更をScopeから外す。
- branch差分を確認する。
- ローカル環境でsanitize / format / markdown lintを実行して完了判定する。

## Approach

1. Git permission policyを変更するG0を削除し、既存Policy上のGit Execution Contractへ置き換える。
2. Git writeはParentのsafe / standard workflowだけに限定し、worker / auto-net責務を広げない。
3. stage-all / commit-all shorthandを禁止し、明示Path staging + staged diff再確認を固定する。
4. rebaseではなく`git fetch` + latest `origin/main` rebaselineへ統一する。
5. 技術的に必要なEnd-to-End修正範囲は維持する。
6. 同一変更面を持つSliceをPreferred implementation groupへまとめる。
7. 重複Test / 不要な検証matrix / speculative frameworkを削る。
8. Confirmation-onlyはread-onlyに固定し、Documentation / Workflow / external settings / 追加実装へ自動移行させない。
9. Main PlanとPlanning Run Artifactを同期する。
10. Repositoryをローカル取得できる環境で最終Validationを実行する。
11. PASS後にPlanning Runを100%完了へ更新する。

## Definition of Done

- G0 Safe Git Write Policy Alignmentが削除され、Git Execution Contractへ置き換わっている。
- Git permission policy / auto-net rules / Hook変更が実装Scopeから外れている。
- Parentだけがsafe / standard workflowでexplicit-path add / normal commit / normal feature-branch pushを行い、worker / auto-netはGit writeしない責務境界が明記されている。
- `git add .` / `-A` / `--all` / `-u`、`git commit -a` / `--all`を使用しない契約になっている。
- protected branch direct update / force push / remote delete / rebase / amend / destructive reset/clean/rm / PR merge禁止が維持されている。
- PR作成はユーザー明示依頼時だけになっている。
- 各Group開始時の旧`rebase`表現が`git fetch` + latest-main rebaselineへ置き換わっている。
- Current Codex run内のwritable implementationはserial、read-only researchのみ必要時並列という実行モデルへ揃っている。
- R2a + R3がG2として同一実装Groupになっている。
- R12a + R12bが小さいdocs-only G12としてまとめられている。
- DoD / Deliverablesから「Root Causeごとに必ず別PR」が削除されている。
- R2aが既存`ProductViewer` / Domain visibility / pricing semanticsを再利用し、Native専用rule/modelを作らない。
- R2aのrank coverageが全Test layerへの重複追加ではなく、既存coverage + 最小Regressionになっている。
- R3がNative SuggestionのUI / Service / UseCase / Gateway / Repository / SQLite全経路を維持する。
- R3のstale protectionが実際のasync overlap時だけの最小guardに限定されている。
- MCP / Runtime validationがFindingに必要な操作だけへ限定されている。
- R8が新しい汎用Frameworkや重複Harnessを作らない方針になっている。
- C1 / REP-013がread-only確認に限定され、intent不明時は変更せずEvidence・判断事項・推奨alignment案の報告で止まる。
- C2 / REP-017がread-only確認に限定され、設定変更や追加CI実装は明示承認後の別対応になっている。
- Planning Runがsanitize未実行のまま100%完了扱いされていない。
- `sanitize-codex-artifacts` Write + CheckがPASSする。
- `pnpm run format:check`がPASSする。
- `pnpm run lint:markdown`がPASSする。
- Plan + Run Artifact以外の変更がない。

## Risks / Unknowns

- GitHub connector環境ではRepository scriptを直接実行できないため、最終Validationはローカル実行が必要。
- Parentのsafe / standard workflowとworker / auto-netのGit boundaryを混同しない。
- stage-all / commit-all shorthandを使うと意図しない差分を含めるため、明示Path stage + staged diff確認を必須にする。
- Common Hookを不要に変更すると既存G1-G10 safety matrixを壊すため、Git permission policyは変更しない。
- Cross Browser CI splitはmain未反映のため、R13はdependency blockedのまま保持する。
- REP-013のintentは確認時点までUnknownであり、一意に確定しない場合は変更せず結果報告で止める。
- REP-017の実設定は確認時点までUnknownだが、このPlanでは変更せず結果報告で止める。

## Thinking Log

- 2026-08-21 17:49 JST: 初回Plan修正を実施。
- 2026-08-21 20:24 JST: R3全dimension、R7 Oracle、R8 merge gate、Plan branch validation不足を確認して反映。
- 2026-08-21 20:40 JST: R8の重複Hermes scan、R3 Suggestion gateway欠落、repo mapping必須項目、R8 gate過剰性を確認。
- 2026-08-21 20:53 JST: R2a / R3をEnd-to-End pathへ修正し、Run Artifactを同期。
- 2026-08-21 21:20 JST: Planの長さ自体は維持し、PR過剰分割・重複Test・MCP matrix・speculative frameworkだけを簡素化する方針へ変更。
- 2026-08-21 22:23 JST: C2 / REP-017をread-only confirmationへ固定し、Ruleset / Branch Protection変更や追加CI実装は明示承認後の別対応へ分離。
- 2026-08-22 00:23 JST: C1 / REP-013もread-only confirmationへ固定し、intentが一意に確定しない限りCurriculum / Workflow / executable contractを変更しない方針へ統一。
- 2026-08-22 00:44 JST: Safe feature-branchの`git add` / `git commit` / normal `git push`をParent Codexへ許可し、PR mergeとhistory rewriteは禁止するG0を実装前提として追加。旧rebase/parallel writable表現もCurrent Repository execution modelへ修正。
- 2026-08-22 00:58 JST: Current Policyを再確認し、Parent safe/standardのGit writeは既存Contractで許可済みと判断。G0によるpermission / auto-net変更を撤回し、既存Policyを変えないGit Execution Contractへ簡素化。
