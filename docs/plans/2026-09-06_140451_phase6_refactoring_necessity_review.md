# Phase 6 Refactoring Necessity Review Plan

## 0. 依頼概要

- 依頼内容: Master PlanのPhase 6 — Refactoring Necessity Reviewを実施するためのPlanを作成する。
- 背景: PR #124でPR 5が完了し、Curriculum / Test Strategy Remediationの残作業はPhase 6のRefactoring Necessity Reviewとなった。
- 期待成果: Repository Audit §4.1〜§4.16の16 candidateをCurrent `main`のEvidenceで再評価し、`refactor_now` / `refactor_when_touched` / `keep_as_is` / `needs_more_evidence`のいずれかへ分類するdecision-only Phase 6を、追加判断なしで実施できる状態にする。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Initial Evidence inventory: `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- Tracking Issue: #72 `track: curriculum / test strategy remediation progress`
- Planning baseline `main`: `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`（PR #124 merge commit）

このPlanはMaster Plan §19のcandidate inventory、Evidence criteria、classification、output scopeを変更しない。Phase 6実行手順を具体化するchild Planとして扱い、Phase 6の判断上の正本は引き続きMaster Planとする。本Planを第三のRefactoring SSOTにはしない。

Phase 6は**decision-only**である。`refactor_now`と判定した候補が存在しても、このPhase 6 branch / PRではProduct、Harness、Workflow、Test sourceのRefactorを実装しない。実装はPhase 6 merge後に別Plan / 別PRへ切り出す。

## 1. ゴール / 完了条件

### ゴール

Repository Audit §4.1〜§4.16の16 candidateについて、古い行数、印象、architecture purity、一般論ではなくCurrent Repositoryの具体的Evidenceを確認し、**今Refactorする合理性があるか**を判定する。

調査そのものを大規模化しない。全16件を同じ深さで全面再Auditするのではなく、まず全件へminimum Evidence passを行い、追加確認が必要なcandidateだけdeep diveする。

### 完了条件（DoD）

1. Phase 6実調査開始時にlatest `main`をこのbranchへ取り込み、その取り込んだ`main` SHAをinvestigation baselineとして記録している。
2. Repository Audit §4.1〜§4.16の16 candidateを全件Current `main`相当のbranch状態で再確認している。
3. 全16件へminimum Evidence passを実施している。
4. 各candidateに最低限次のEvidenceがある。
   - recent Git churn / change frequency
   - defect / repair history または CI / runtime failure history
   - actual blast radius / consumer / dependency / reference boundary
   - protecting test / workflow
   - transaction / state / platform boundary
5. 必要なcandidateだけ補助Evidenceとしてmaintainer cognitive costとsplitによるabstraction / duplication costを確認している。
6. directory / area candidateで全function・全callerの完全call graphを作成していない。
7. 16 candidateすべてに次のいずれか1つのclassificationがある。
   - `refactor_now`
   - `refactor_when_touched`
   - `keep_as_is`
   - `needs_more_evidence`
8. size / line count / file countだけを理由に`refactor_now`を付けていない。
9. 過去defectやrepeated repairを`refactor_now`の必須条件にしていない。Currentな具体的risk / costと、延期より今対応する方が合理的であるEvidenceがあれば判定対象にしている。
10. `refactor_now`には、Currentなrisk / cost Evidence、影響、今Refactorする理由、期待するrisk / cost低減、後続実装boundaryが説明されている。
11. `refactor_when_touched`には、今すぐ別PRを起こさない理由と、再検討する具体的change triggerがある。
12. `keep_as_is`には、意図的cohesion / transaction / platform boundary / abstraction cost等、維持する具体的理由がある。
13. `needs_more_evidence`には、不足Evidenceと再判断条件が明記されている。
14. 各candidateの主要Evidenceをsource path / test path / workflow path / commit / PR / Issue / relevant Run等へ追跡できる。
15. RA-C1のNecessity Review結果をdurable reportへ明示している。
16. RA-Q1（Domain → Application type dependency）はEvidenceで判断可能なら最終classification、判断不能なら`needs_more_evidence` + 不足Evidence + 再判断条件を記録している。
17. Durable reportを`docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`へ保存している。
18. Durable reportに16 candidateのEvidence / classification / rationale、investigation baseline SHA、merge直前の最終確認`main` SHAがある。
19. Phase 6 decision-only差分にProduct code / test behavior / workflow behavior / dependency変更がない。
20. `refactor_now`以外を即時実装タスクへ変換していない。
21. `refactor_now`がある場合もPhase 6 PR内では実装せず、Phase 6 merge後の別Plan / 別PR候補として列挙するだけに留めている。
22. PR作成前とmerge直前のfreshness checkでmaterial changeを定義済み基準で判定している。
23. mainにmaterial changeがある場合はlatest `main`をbranchへ取り込んだ後、影響candidateだけ再確認している。
24. Phase 6のためにpermanent call graph、graph DB、新しい常設解析基盤、generic dependency scannerを追加していない。
25. Issue #72を第三のEvidence SSOTにせず、Phase 6完了時は進捗だけを同期できる状態になっている。
26. `pnpm run format:check`、`pnpm run lint:markdown`、`git diff --check`がPASSしている。

## 2. 現状理解と前提

### Current understanding

- Master Plan §19はPhase 6を「Repository Audit §4.1〜§4.16の全candidateをEvidenceで分類し、必要なRefactorだけを後続実装へ送る」decision-only reviewとして定義している。
- Phase 6はPR 2 merge後から並行調査可能だったが、最終decision-only PRはlatest `main`へ追従して確定する必要がある。
- PR #124はmerge済みで、Planning時点のlatest `main`は`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`。
- Repository Auditは2026-08-23〜24時点、baseline `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`でcandidate inventoryを作成した。
- 過去Auditのline count / caller / test情報は初期Evidenceであり、Current factとして無条件に再利用しない。
- Master Planが要求する最低Evidenceは、churn、defect/failure history、blast radius / consumer / dependency / reference、test protection、transaction/state/platform boundaryである。
- Classificationは`refactor_now` / `refactor_when_touched` / `keep_as_is` / `needs_more_evidence`の4値固定である。
- OutputはPhase 6 durable reportであり、decision-only PRにProduct refactorを含めない。
- `refactor_now`と判定したものだけPhase 6 merge後に別Plan / 別PRへ切り出す。

### Operational classification interpretation

以下はMaster Planの4分類を実行時に一貫して適用するための運用解釈であり、新しいclassification contractではない。

#### `refactor_now`

- Current Repositoryで具体的なrisk / costが確認できる。
- Evidence例は、変更失敗、defect、repeated repair、unsafe blast radius、testability不足、transaction / state / platform boundaryの危険、次の変更前に解消しないとmigration costが増える構造等。
- 過去defect / repeated repairは強いEvidenceだが必須条件ではない。
- 改善によってどのrisk / costを下げるか説明できる。
- 今対応する方が延期より合理的である理由がある。
- 「大きい」「複雑そう」「きれいになる」「一般的には分けるべき」だけでは不可。

#### `refactor_when_touched`

- 構造上のmaintainability costはEvidenceで確認できるが、現在独立Refactorを起こすほどのrisk / urgencyはない。
- 関連capability変更時に同じ変更面を触ることで、追加migration costを抑えて改善できる。
- 再検討triggerを具体的path / capability / change typeで残す。

#### `keep_as_is`

- Current構造がcohesive capability、transaction boundary、platform差、intentional duplication等で説明できる。
- 分割によるnew abstraction、cross-file coordination、platform leakage、duplicated orchestration等のcostが利益を上回る、またはCurrent Evidenceで改善効果を説明できない。

#### `needs_more_evidence`

- 現在得られるEvidenceだけではbenefit / risk / boundaryのどれかを判定できない。
- 不足Evidenceと再評価triggerを具体化し、推測で他分類へ押し込まない。

### Assumptions

- Git history、既存PR / Issue、既存test / workflow / code searchでminimum Evidenceを取得できる。
- relevant Run Artifactは、path history / PR / Issueから必要性が特定できた場合だけ参照する。
- permanent analysis toolingを追加しなくても16件のconsumer / dependency / protection boundaryを確認できる。
- 過去Auditのsize情報はcandidateを見つけるための参考値であり、Necessity判定の主Evidenceではない。
- candidate間で共通原因が見つかっても、無理に1つのgeneric refactorへ統合しない。
- 同一Evidenceが複数candidateのboundaryを説明する場合は再利用してよい。ただしclassificationはcandidate単位で行う。

### Non-goals

- Phase 6内でProduct refactorを実装すること。
- `refactor_now`候補の具体的source修正を開始すること。
- architectureを「理想形」へ作り直すこと。
- line count thresholdやCyclomatic Complexity thresholdを新しいRepository Gateとして導入すること。
- permanent call graph / graph DB / dependency visualizer / generic static analysis frameworkを追加すること。
- Stable Risk ID、第三のTraceability SSOT、新LMS、learner DB、scoring frameworkを追加すること。
- Product behavior、Normative Specification、Curriculum completion contract、Formal Regression Gateを変更すること。
- Native platform duplicationをWeb共通化で機械的に解消すること。
- intentional Dexie / SQLite duplicationを「重複」という理由だけで統合すること。
- global CSSや大規模fileをsizeだけで分割すること。
- 全ADR、全Run Artifact、全PR、全Issueを網羅的に再読すること。
- Phase 6報告をIssue #72へ全文転記すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点でPlan作成を阻害する必須質問はない。Master Planがcandidate inventory、Evidence criteria、classification、output、stop conditionを固定している。

実調査時に次が発生した場合だけ停止条件として扱う。

- Current codeからcandidate identity自体が消失・大幅再編され、Audit §4.xとの対応を安全に追跡できない。
- `refactor_now`判断に必要なoperational impactがRepository外の非公開情報に依存し、Repository Evidenceだけでは判定不能。
- Refactor必要性を判定するために新しい常設解析基盤が必要になる。
- candidateの判断がProduct behavior / Specification変更の是非を先に決めないと成立しない。

### 仮定してよい細部

- Git churnの主範囲はAudit baselineからinvestigation baselineまでとする。
- 直近の変更傾向が必要な場合だけ補助windowを追加してよい。
- commit数はrisk scoreにせず、変更理由・同一boundaryの反復修正・revert / fixの有無を見る補助Evidenceに使う。
- report内のcandidate詳細順はAudit §4.1〜§4.16を維持する。

### 未回答の重要質問

- なし。実調査でEvidence不足が出たcandidateは`needs_more_evidence`へ分類し、Phase 6 scopeを拡張しない。

## 4. 影響範囲

### Candidate inventory

| Audit | Candidate | Primary current path / area |
| --- | --- | --- |
| §4.1 | Native customer application repositories | `src/infrastructure/database/sqlite/native-customer-application-repositories.ts` |
| §4.2 | Native customer catalog / compatibility repository | `src/infrastructure/database/sqlite/native-customer-repositories.ts` |
| §4.3 | Native purchase screens | `src/presentation/native/native-purchase-screens.tsx` |
| §4.4 | Native storefront screens | `src/presentation/native/native-screens.tsx` |
| §4.5 | Admin product pages | `src/presentation/pages/admin-product-pages.tsx` |
| §4.6 | Checkout / Order use case | `src/application/use-cases/checkout-order-use-cases.ts` |
| §4.7 | Review / User use cases | `src/application/use-cases/review-user-use-cases.ts` |
| §4.8 | Admin product use case | `src/application/use-cases/admin-product-use-cases.ts` |
| §4.9 | Native CI workflow | `.github/workflows/native-ci.yml` |
| §4.10 | Global Web CSS | `src/presentation/styles/global.css` |
| §4.11 | Seed SSOT | `src/seeds/default-dataset.ts`, `src/seeds/scenarios.ts`, `src/seeds/metadata.ts` |
| §4.12 | Agentic QA Harness | `scripts/agentic-qa/**` |
| §4.13 | Maestro cleanup helpers | `scripts/native/android-maestro-run.sh`, `scripts/training/**`のMaestro runner / invocation |
| §4.14 | Web E2E fixture | `e2e/web/fixtures.ts` |
| §4.15 | Dexie / SQLite adapters | `src/infrastructure/database/dexie/**`, `src/infrastructure/database/sqlite/**` |
| §4.16 | Domain → Application type dependency | `src/domain/repositories/contracts.ts`, `src/domain/policies/permissions.ts` |

### Impacted areas

Phase 6ではcandidate pathと、そのconsumer / dependency / reference / protecting test / workflowをread-onlyで調査する。

主な関連領域:

- `src/bootstrap/**`
- `src/application/**`
- `src/domain/**`
- `src/infrastructure/database/**`
- `src/presentation/**`
- `src/seeds/**`
- `src/test-controls/**`
- `scripts/agentic-qa/**`
- `scripts/native/**`
- `scripts/training/**`
- `e2e/web/**`
- `tests/**`
- `.github/workflows/**`
- relevant `docs/adr/**`
- `docs/spec/**`（boundary確認のみ。変更しない）
- targeted prior Plan / Run Artifact / PR / Issue history

### Files to inspect first

1. `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` §19 / §20 / stop conditions / completion criteria
2. `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md` §4.1〜§4.16
3. 各candidate pathとAuditに記載されたconsumer / protecting test / workflow
4. candidate boundaryを直接説明するADRだけ
5. Audit baseline `4ed5374...` からinvestigation baselineまでのtargeted Git history
6. path history / PR / Issueから必要性が特定できた場合だけrelevant Run Artifact
7. `docs/reports/2026-08-24_074011_curriculum-validity-review.md`はRefactoring判断へ直接関係するcross-referenceがある場合だけ参照する

全`docs/adr/**`、全`.codex/runs/**`、全PR、全Issueを順番に読む必要はない。

### Area candidateのminimum mapping boundary

§4.12 `scripts/agentic-qa/**`、§4.15 adapter全体等のdirectory / area candidateでは、minimum passで全function・全callerを列挙しない。

最低限次だけを確認する。

- public / composition entry point
- factory / runner / major state owner
- major capability group
- materialに変更された主要file
- protecting tests / workflow
- transaction / state / platform boundary

これでclassificationが不明な場合だけdeep diveする。

### Safe change surface

Phase 6 decision-only PRでRepositoryへ新規追加・更新してよいdurable business artifactは原則次だけ。

- このPlan
- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`
- Repository標準Run Artifact

必要に応じてIssue #72の進捗情報をGitHub上で同期してよいが、Evidence本文はdurable reportを正本とする。

Product source、test source、workflow source、dependency、Specification、Curriculum本文はPhase 6 decision-only差分では変更しない。

## 5. 変更方針

### Change strategy

Phase 6は次の2-passで実施する。

```text
Pass 1: 全16件 minimum Evidence pass
→ Pass 2: 必要candidateだけdeep dive
→ classification確定
→ cross-candidate sanity check
→ durable report
→ freshness check
```

classificationを先に決めてEvidenceを後付けしない。

### Evidence探索のbounded rule

各candidateのEvidence探索は原則次の順序に限定する。

1. candidate current path / current area
2. Audit baseline以降のpath history
3. current direct consumer / import / composition root
4. protecting test / workflow
5. path historyから特定できたrelevant PR / Issue
6. 上記だけでは必要Evidenceが不足するときに限りrelevant Run Artifact

このbounded sourceを確認して該当defect / repair / failure Evidenceがなければ、`確認した範囲では該当Evidenceなし`と記録して終了する。Evidenceがないことを証明するためにRepository全体へ探索を拡張しない。

同じsource / test / workflow / historyが複数candidateを説明する場合はEvidenceを再利用してよい。candidateごとに同じ調査を繰り返さない。ただしclassificationとrationaleはcandidate単位で記録する。

### Material change定義

Freshness checkで再評価を必要とする`material change`は次のいずれかとする。

- candidate responsibilityが変わった
- public surfaceが変わった
- consumer / dependency / reference setが増減した
- transaction / state / platform boundaryが変わった
- protecting test / workflowが変わった
- candidate path / areaがsplit / merge / renameされた
- defect / repair / runtime failure Evidenceが新たに発生した

次は原則`non-material`とする。

- formatting
- comment-only
- unrelated documentation
- Run Artifactだけの追加
- candidate contract / boundaryに影響しないmechanical change

### Task 1 — latest main同期とPhase 6 baseline固定

実調査開始前に、単にlatest `main` SHAを記録するだけではなくbranchの実体をlatest `main`へ同期する。

1. latest `main` SHAを取得する。
2. current Phase 6 branchがlatest `main`を含むか確認する。
3. 含まない場合はlatest `main`をPhase 6 branchへ取り込む。履歴を書き換えるforce updateは行わない。
4. branchがlatest `main`を含む状態になった後、その`main` SHAをinvestigation baselineとして記録する。
5. Planning baseline `856a14...`から進んでいる場合、candidate relevant changeだけを確認する。
6. Audit baseline `4ed5374...`からinvestigation baselineまでcandidate identityが維持されているか確認する。
7. pathがrename / split / mergeされている場合はGit historyでlineageを追い、旧pathのまま評価しない。

以降のread-only調査は、この同期済みbranch状態をCurrent Repositoryとして行う。

### Task 2 — Pass 1: 16 candidate minimum Evidence mapping

全16件に対し、次のEvidence cardを1つずつ作る。

```text
Candidate
Current path(s)
Current responsibility
Current public / composition surface
Current consumers / dependencies
Protecting tests / workflows
Transaction / state / platform boundary
Audit baselineからのmaterial change
Recent churn / repair / failure summary
Evidence references
Provisional classification or deep-dive-needed
```

`Evidence references`には必要に応じて次を記録する。

- source path
- test path
- workflow path
- commit SHA
- PR / Issue番号
- relevant Run ID

Audit reportのcaller / size / line情報はCurrent codeで確認してから使用する。

### Task 3 — Pass 1: bounded Git churn / repair / failure history確認

候補ごとにAudit baseline以降のtargeted historyを確認する。

最低限:

- path / areaの主要commits
- change reason
- fix / revert / repairの反復有無
- 同じboundaryを何度も修正しているか
- historyから直接特定できるrelevant PR / Issue
- candidateが原因面として登場したCI / runtime failureの有無

単純commit countはscoreにしない。

次を区別する。

- feature growthによる正常な変更
- broad fileゆえのunrelated churn集中
- defect修正
- flaky / operational repair
- mechanical / format / unrelated change

Run Artifactを網羅検索しない。関連性がPR / Issue / path historyから特定できたものだけ読む。

### Task 4 — Pass 1: Blast radius / consumer boundary確認

既存code search、imports、factory / composition root、testsを使ってactual boundaryを確認する。

確認内容:

- direct consumer
- principal composition root
- shared contract
- platform-specific consumer
- training / formal / runtime consumerがある場合の主要接点
- transaction boundary
- state ownership

全transitive callerの完全一覧は作らない。classificationに必要なactual blast radiusが説明できればminimum passは完了とする。

### Task 5 — Pass 1: Test protection評価

candidateごとに「テストが存在するか」だけでなく、変更riskをどこまで検知できるか確認する。

Protection例:

- repository contract
- application unit / integration test
- component test
- architecture / static contract
- Web E2E
- Native Maestro
- CI workflow contract
- artifact / fail-closed verify

次を区別する。

- direct behavior protection
- interface / structure protection
- indirect end-to-end protection
- unprotected branch / state / platform boundary

Coverage percentageの新規計測基盤は作らない。

### Task 6 — Pass 1: Boundary / split cost確認

Refactor案を詳細設計する前に、現行groupingが意図的か確認する。

確認観点:

- 同一transactionでまとめる必要性
- shared state lifecycle
- capability cohesion
- platform-specific orchestration
- compatibility surface
- fail-closed CI orchestration
- abstractionすると逆にcross-file coordinationが増えるか
- duplicationを削ることでplatform差を隠してしまわないか

「分けられる」と「分けるべき」を分離する。

### Task 7 — Pass 2対象の選定

Pass 1完了後、次のいずれかに当てはまるcandidateだけdeep diveする。

- material changeあり
- defect / repeated repair / operational failure Evidenceあり
- Current risk / testability / transaction / platform boundaryに具体的懸念あり
- `refactor_now`候補
- classificationを4値のどれかへ合理的に固定できない
- `needs_more_evidence`とする前に、既存Repository Evidenceでもう1段だけtargeted確認すれば判断できる

Pass 1だけで十分なEvidenceがあり`keep_as_is`または`refactor_when_touched`を説明できるcandidateは、追加のdeep diveを行わない。

### Task 8 — Pass 2: targeted deep dive

対象candidateだけ追加確認する。

候補ごとに必要な論点だけ深掘りし、全candidate共通の追加調査セットは作らない。

例:

- transaction riskが論点 → transaction runner / rollback / protecting tests
- platform duplicationが論点 → platform ownership / shared contract / cross-platform cost
- workflow blast radiusが論点 → job dependency / fail-closed verify / workflow contract
- CSSが論点 → cascade / breakpoint ownership / actual repeated repair
- harnessが論点 → public command / schema / artifact / trust boundary

Refactor source design、file split、API migration案はPhase 6では詳細化しない。classificationに必要な粒度で止める。

### Task 9 — Candidate classification

16 candidateをAudit順にclassificationする。

各classificationには最低限次を記載する。

```text
Classification
Primary evidence
Evidence references
Risk / cost observed now
Why now / why not now
Refactor benefit or keep rationale
Follow-up trigger
Confidence / missing evidence
```

#### `refactor_now`

- Currentな具体的risk / costと今対応する合理性をEvidenceで示す。
- 過去defectがなくても、Currentなtestability / transaction / blast radius / near-term migration risk等が十分なら候補になり得る。
- 後続実装候補名を付けてよい。
- source design / file split / API migrationをPhase 6内で確定しすぎない。
- Phase 6 merge後、別Planでrepo mappingし直す。

#### `refactor_when_touched`

- 「いつか」ではなく、再評価triggerを具体化する。
- 例: capability追加、transaction contract変更、同一boundaryの次回feature、platform parity変更等。

#### `keep_as_is`

- intentional complexity / duplication / boundaryを説明する。
- 「問題が見つからなかった」だけで終わらせない。

#### `needs_more_evidence`

- 必要Evidenceと取得可能になる条件を明記する。
- Repository外Evidenceが必要ならその事実を明示する。
- Evidence不足を埋めるためにPhase 6の調査scopeを無制限に広げない。

### Task 10 — Cross-candidate sanity check / Evidence再利用確認

全16件を一度横断し、classificationの一貫性を確認する。

特に次を比較する。

- Native SQLite §4.1 / §4.2 / §4.15
- Native presentation §4.3 / §4.4
- Admin Product §4.5 / §4.8
- Checkout / Review application §4.6 / §4.7
- Native CI §4.9 / Maestro cleanup §4.13
- Seed §4.11 / Web E2E fixture §4.14
- Domain dependency §4.16 / Adapter boundary §4.15

共通Evidenceは重複記録せず参照再利用してよい。ただし複数candidateが同じroot causeに見えても、Evidenceなく一括Refactorへまとめない。

### Task 11 — RA-C1 / RA-Q1 disposition

- RA-C1: 16 candidateの総合Necessity Review結果をdurable reportのSummaryへ記載する。
- RA-Q1: Domain → Application type dependencyについて、Current import direction、runtime dependency、DTO / viewer type ownership、変更履歴、test / architecture protectionを確認する。
- RA-Q1をarchitecture purityだけで`refactor_now`にしない。
- Evidence不足なら`needs_more_evidence`にし、再判断条件を残す。

### Task 12 — Durable report作成

保存先:

```text
docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md
```

推奨構造:

```text
# Refactoring Necessity Review

## Baseline / scope
## Method / bounded evidence rule
## Executive summary
## Classification summary
## Candidate matrix (16/16)
## 4.1 ...
...
## 4.16 ...
## RA-C1 conclusion
## RA-Q1 conclusion
## refactor_now follow-up candidates
## refactor_when_touched triggers
## needs_more_evidence triggers
## Freshness check
## Scope / non-goals confirmation
```

Candidate matrixには少なくとも次を含める。

| Candidate | Current path | Churn / failure evidence | Blast radius | Protection | Boundary | Classification | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |

詳細sectionではEvidence referencesを記載し、raw log dumpをreportへ貼らない。

### Task 13 — Pre-PR freshness check

PR作成直前にlatest `main`を取得し、current Phase 6 branchとの差分を確認する。

#### material changeなし

- branchへの追加syncは不要。
- reportへ確認したlatest `main` SHAを記録する。
- classificationを維持する。

#### material changeあり

1. latest `main`をPhase 6 branchへ取り込む。force updateは行わない。
2. material changeの影響candidateだけ再確認する。
3. candidate自身、consumer / dependency / reference、protecting test / workflow、boundaryを再確認する。
4. 必要ならclassification / rationale / Evidence referenceを更新する。

Repository全体の全面再Auditや全16件deep diveをやり直さない。

### Task 14 — Decision-only PR scope確認

PR差分に次が含まれていないことを確認する。

- `src/**` behavior change
- `tests/**` behavior change
- `.github/workflows/**` behavior change
- `scripts/**` behavior change
- dependency / lockfile change
- Specification semantic change
- Curriculum semantic change

Phase 6で実変更候補を見つけてもreportにfollow-upとして記録して停止する。

### Task 15 — Merge直前freshness check

Phase 6 PRがreviewを通過しmerge可能になった時点でlatest `main`を再確認する。

#### material changeなし

- reportへ最終確認`main` SHAを記録する。
- decisionを維持する。

#### material changeあり

1. latest `main`をbranchへ取り込む。
2. 影響candidateだけ再確認する。
3. classification / rationale / Evidence referenceを必要最小限更新する。
4. validationを再実行する。

freshnessのために全16件を最初から全面再調査しない。

## 6. 検証方法

### Validation plan

Phase 6はdecision-only document changeなので、無関係なProduct full suiteは機械的に実行しない。

必須:

1. Candidate coverage check
   - §4.1〜§4.16が16/16存在する。
   - 4値以外のclassificationがない。
2. Evidence completeness check
   - 各candidateにmandatory Evidenceカテゴリがある。
   - Evidence referencesがある。
   - `needs_more_evidence`には不足Evidence / triggerがある。
3. Bounded investigation check
   - 全候補がPass 1を完了している。
   - Pass 2対象が選定条件に一致している。
   - 全Run / 全Issue / 全PR / 全ADRの網羅調査へ拡張していない。
4. Follow-up scope check
   - `refactor_now`だけが即時follow-up候補。
   - 他classificationを実装タスク化していない。
5. Baseline / freshness check
   - investigation baseline SHAがある。
   - branchがinvestigation baselineのmainを含む。
   - merge直前latest `main` SHAを記録する欄がある。
   - material change時はmain取り込み後に対象candidateだけ再評価している。
6. Diff scope check
   - decision-only差分のみ。
7. Markdown validation
   - `pnpm run format:check`
   - `pnpm run lint:markdown`
   - `git diff --check`
8. Repository standard artifact sanitization
   - Run Artifactを作成した場合はRepository標準sanitizer / collector contractに従う。

原則実行しない:

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Product E2E全件
- Native runtime
- build
- dependency install / update

Phase 6ではCurriculum / Product / Test / Workflow sourceを変更しないため、これらはdecision-only reportの正しさを直接証明しない。review findingや予期しないsource差分が発生した場合だけ、影響範囲に応じてtargeted validationを追加する。

### 成功判定

次をすべて満たしたらPhase 6 decisionは完了とする。

- 16/16 classified
- 全16件minimum Evidence pass完了
- 必要candidateだけtargeted deep dive済み
- Evidence-based rationale / Evidence referencesあり
- RA-C1 / RA-Q1 dispositionあり
- no size-only `refactor_now`
- 過去defectの有無だけでclassificationを決めていない
- decision-only scope維持
- durable report保存
- pre-PR / pre-merge freshness確認
- material change時はlatest mainをbranchへ取り込み済み
- `format:check` / `lint:markdown` / `git diff --check` PASS
- `refactor_now`は別Plan / 別PRへhandoff可能な粒度で列挙されているが、実装していない

## 7. リスクと未解決論点

### Risks

1. **Size bias**
   - Auditはhotspot sizeを含むため、大きいfileを自動的にdebt扱いしやすい。
   - 対策: sizeはcandidate発見Evidenceに限定し、classificationはrisk / churn / boundary / protection / split costで判断する。

2. **Historical evidence bias**
   - 2026-08-24以降PR 1〜5でRepositoryが変化している。
   - 対策: Audit factをCurrent factとしてコピーせず、latest `main`をbranchへ取り込んだ状態で再確認する。

3. **Unbounded investigation**
   - 全Run / 全PR / 全Issue / 全ADRへ探索を広げるとPhase 6自体が大規模調査になる。
   - 対策: bounded Evidence順序と2-pass方式を守り、該当EvidenceなしならRepository全体へ探索を拡張しない。

4. **Equal-depth review bias**
   - 全candidateを同じ深さで調べると、明確な`keep_as_is`候補にも過剰な時間を使う。
   - 対策: 全16件minimum pass後、選定条件に該当するcandidateだけdeep diveする。

5. **Churn misclassification**
   - feature追加が多いpathを「保守性が悪い」と誤認する可能性がある。
   - 対策: commit countではなくchange reasonと反復repairを見る。

6. **Defect-history bias**
   - 過去defectがないことを理由に、Currentなtestability / transaction / blast radius riskを過小評価する可能性がある。
   - 対策: 過去defectは強いEvidenceの一つとしつつ必須条件にはしない。

7. **Test count bias**
   - test数が多くてもcritical state / transaction / platform branchが守られていない場合がある。
   - 対策: protection typeと対象boundaryを確認する。

8. **Over-abstraction**
   - Native / Web、Dexie / SQLite、Formal / Training等のintentional differenceをDRY目的で統合する危険がある。
   - 対策: platform / execution ownershipとsplit costを先に評価する。

9. **Follow-up scope creep**
   - `refactor_now`を見つけた勢いでPhase 6内にsource修正を混ぜる危険がある。
   - 対策: decision-onlyをhard boundaryとし、実装はPhase 6 merge後の別Plan / PRのみ。

10. **Stale branch risk**
    - latest `main` SHAだけ記録し、branchへ取り込まないと古いsourceを評価する可能性がある。
    - 対策: investigation開始時とmaterial freshness change時はlatest `main`をbranchへ取り込んでから評価する。

11. **Needs-more-evidence avoidance**
    - すべてをきれいに分類したくなり、Evidence不足でも無理に結論を出す危険がある。
    - 対策: `needs_more_evidence`を正式classificationとして使用する。

### Open questions

実調査前に解決が必要なopen questionはない。

候補ごとに不透明点が出た場合はdurable report内のEvidence gapとして処理し、Phase 6 scope自体を広げない。

## 8. 成果物

### Plan-only時点の変更ファイル

- `docs/plans/2026-09-06_140451_phase6_refactoring_necessity_review.md`

### Phase 6実施時に予定するRepository成果物

- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`
- Repository標準Run Artifact

### 変更しないもの

- Product code
- Product tests / Formal Regression behavior
- Training behavior
- Workflow behavior
- dependency / lockfile
- Normative Specification
- Curriculum semantic contract
- Master Planのcandidate inventory / classification contract / output scope

## 9. Stop conditions

以下に該当したら、対象candidateのclassificationを推測で確定せず停止する。

- Phase 6 Evidenceが不足し、推測で`refactor_now`を付ける必要がある。
- Refactor必要性をsize / 主観だけでしか説明できない。
- bounded sourceを確認した後も追加Evidenceが必要だが、その取得にRepository全体の無制限探索が必要になる。
- freshness確認に新しい常設call graph / graph DB / analysis platformが必要になる。
- Stable Risk IDの必要性を新たに前提にしないと判断できない。
- Native learner exerciseのためにProduct Formal Gate変更が必要になる。
- Native specialization opt-inのためにCommon Core workflowを複雑に分岐させる必要がある。
- C08 Evidence判定に新DB / scoring frameworkが必要になる。
- `training:web:exercise`のために新runner / frameworkが必要になる。
- Native Environment failureとsource / learner failureを分離できない。
- candidate判断のためにProduct behavior / Normative Specificationを変更する必要がある。

停止したcandidateは、可能なら`needs_more_evidence`として不足Evidenceと再判断条件を記録する。Repository remediationの外側の設計変更が必要なら別Issue / Plan候補として報告し、Phase 6へ取り込まない。

## 10. Follow-up notes

Phase 6 decision-only PR merge後:

- `refactor_now`
  - candidateごと、または明確に同一boundaryを共有する最小単位で別Planを作成する。
  - Current `main`でrepo mappingをやり直す。
  - Refactor implementation / migration / validationを別PRで行う。
- `refactor_when_touched`
  - 即時PRを作らない。
  - reportに記録したtriggerが成立した関連変更時に再評価する。
- `keep_as_is`
  - 追加actionなし。boundaryがmaterialに変わった場合のみ再評価する。
- `needs_more_evidence`
  - reportに記録したEvidence取得条件が成立した場合のみ再評価する。

Phase 6完了後はIssue #72のPhase 6 statusを更新する。Master Planをlive progress trackerとして書き換えない。