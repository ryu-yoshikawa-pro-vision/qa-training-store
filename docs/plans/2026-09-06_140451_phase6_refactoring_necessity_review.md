# Phase 6 Refactoring Necessity Review Plan

## 0. 依頼概要

- 依頼内容: Master PlanのPhase 6 — Refactoring Necessity Reviewを実施するためのPlanを作成する。
- 背景: PR #124でPR 5が完了し、Curriculum / Test Strategy Remediationの残作業はPhase 6のRefactoring Necessity Reviewとなった。
- 期待成果: Repository Audit §4.1〜§4.16の16 candidateをCurrent `main`のEvidenceで再評価し、`refactor_now` / `refactor_when_touched` / `keep_as_is` / `needs_more_evidence`のいずれかへ分類するdecision-only Phase 6を、追加判断なしで実施できる状態にする。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Initial Evidence inventory: `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- Tracking Issue: #72 `track: curriculum / test strategy remediation progress`
- Planning baseline `main`: `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`（PR #124 merge commit）

このPlanはMaster Plan §19のcandidate inventory、Evidence criteria、classification、output scopeを変更しない。ユーザーの明示的なPlan作成依頼に応じ、Phase 6実行手順を具体化するためのchild Planとして扱う。Phase 6の判断上の正本は引き続きMaster Planとし、本Planを第三のRefactoring SSOTにはしない。

## 1. ゴール / 完了条件

### ゴール

Repository Audit §4.1〜§4.16の16 candidateについて、古い行数・印象・一般論ではなくCurrent Repositoryの具体的Evidenceを収集し、現時点でRefactorする合理性を判定する。

Phase 6はdecision-onlyとする。調査中に明確な改善案を発見しても、Product / Harness / Workflow / Test sourceのRefactor実装をこのPhase 6へ混在させない。

### 完了条件（DoD）

1. Investigation baselineとしてPhase 6開始時点のlatest `main` SHAを記録している。
2. Repository Audit §4.1〜§4.16の16 candidateを全件Current `main`で再確認している。
3. 各candidateに最低限次のEvidenceがある。
   - recent Git churn / change frequency
   - defect / repair history または CI / runtime failure history
   - actual blast radius / consumer / dependency / reference boundary
   - protecting test / workflow
   - transaction / state / platform boundary
4. 必要なcandidateでは補助Evidenceとしてmaintainer cognitive costとsplitによるabstraction / duplication costを確認している。
5. 16 candidateすべてに次のいずれか1つのclassificationがある。
   - `refactor_now`
   - `refactor_when_touched`
   - `keep_as_is`
   - `needs_more_evidence`
6. size / line count / file countだけを理由に`refactor_now`を付けていない。
7. `refactor_now`には、Currentな問題Evidence、影響、今Refactorする理由、期待するrisk/cost低減、後続実装boundaryが説明されている。
8. `refactor_when_touched`には、今すぐ別PRを起こさない理由と、再検討する具体的change triggerがある。
9. `keep_as_is`には、意図的cohesion / platform boundary / abstraction cost等、維持する具体的理由がある。
10. `needs_more_evidence`には、不足Evidenceと再判断条件が明記されている。
11. RA-C1のNecessity Review結果をdurable reportへ明示している。
12. RA-Q1（Domain → Application type dependency）はEvidenceで判断可能なら最終classification、判断不能なら`needs_more_evidence` + 不足Evidence + 再判断条件を記録している。
13. Durable reportを`docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`へ保存している。
14. Durable reportに16 candidateのEvidence / classification / rationale、investigation baseline SHA、merge直前の最終確認`main` SHAがある。
15. Phase 6 decision-only差分にProduct code / test behavior / workflow behavior / dependency変更がない。
16. `refactor_now`以外を即時実装タスクへ変換していない。
17. `refactor_now`がある場合も、Phase 6 PR内では実装せず、Phase 6 merge後の別Plan / 別PR候補として列挙するだけに留めている。
18. PR作成前とmerge直前のfreshness checkで、candidate自身、consumer / dependency / reference path、protecting test / workflow、関連pathのCurrent `main`変化を確認している。
19. Phase 6のためにpermanent call graph、graph DB、新しい常設解析基盤、generic dependency scannerを追加していない。
20. Issue #72を第三のEvidence SSOTにせず、Phase 6完了時は進捗だけを同期できる状態になっている。

## 2. 現状理解と前提

### Current understanding

- Master Plan §19はPhase 6を「Repository Audit §4.1〜§4.16の全candidateをEvidenceで分類し、必要なRefactorだけを後続実装へ送る」decision-only reviewとして定義している。
- Phase 6はPR 2 merge後から並行調査可能だったが、最終decision-only PRはlatest `main`へ追従して確定する必要がある。
- PR #124はmerge済みで、Planning時点のlatest `main`は`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`。
- Repository Auditは2026-08-23〜24時点、baseline `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`でcandidate inventoryを作成した。Phase 6では当時のline count / caller情報をそのままCurrent factとして扱わず、Current `main`でfreshnessを取り直す必要がある。
- Master Planが要求する最低Evidenceは、churn、defect/failure history、blast radius / consumer / dependency / reference、test protection、transaction/state/platform boundaryである。
- Classificationは`refactor_now` / `refactor_when_touched` / `keep_as_is` / `needs_more_evidence`の4値固定である。
- OutputはPhase 6 durable reportであり、decision-only PRにProduct refactorを含めない。
- `refactor_now`と判定したものだけPhase 6 merge後に別Plan / 別PRへ切り出す。

### Operational classification interpretation

以下はMaster Planの4分類を実行時に一貫して適用するための運用解釈であり、新しいclassification contractではない。

- `refactor_now`
  - Current Repositoryで具体的な変更失敗、defect、repeated repair、unsafe blast radius、testability/transaction/platform boundaryの明確な問題など、今対応する実害Evidenceがある。
  - 分割・整理によりそのrisk/costを具体的に下げられる。
  - 「大きい」「複雑そう」「きれいになる」だけでは不可。
- `refactor_when_touched`
  - 構造上のmaintainability costはEvidenceで確認できるが、現在独立Refactorを起こすほどのfailure / churn / riskはない。
  - 関連capability変更時に同じ変更面を触ることで、追加migration costを抑えて改善できる。
  - 再検討triggerを具体的path / capability / change typeで残す。
- `keep_as_is`
  - Current構造がcohesive capability、transaction boundary、platform差、intentional duplication等で説明できる。
  - 分割によるnew abstraction、cross-file coordination、platform leakage、duplicated orchestration等のcostが利益を上回る、またはCurrent evidenceで改善効果を説明できない。
- `needs_more_evidence`
  - 現在得られるEvidenceだけではbenefit / risk / boundaryのどちらかが判定できない。
  - 不足Evidenceと再評価triggerを具体化し、推測で他分類へ押し込まない。

### Assumptions

- Phase 6開始時はPlanning baseline `856a14...`から開始するが、実調査開始時にlatest `main`が進んでいれば新しいSHAをinvestigation baselineとして採用する。
- Git history、既存PR / Issue / Run Artifact、既存test / workflow / code searchで必要Evidenceを取得できる。
- permanent analysis toolingを追加しなくても16件のconsumer / dependency / protection boundaryを確認できる。
- 過去Auditのsize情報は候補を見つけるための参考値であり、Necessity判定の主Evidenceではない。
- candidate間で共通原因が見つかっても、無理に1つのgeneric refactorへ統合しない。

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
- Phase 6報告をIssue #72へ全文転記すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点でPlan作成を阻害する必須質問はない。Master Planがcandidate inventory、Evidence criteria、classification、output、stop conditionを固定している。

実調査時に次が発生した場合だけ停止条件として扱う。

- Current codeからcandidate identity自体が消失・大幅再編され、Audit §4.xとの対応を安全に追跡できない。
- `refactor_now`判断に必要なdefect / operational impactが非公開運用情報に依存し、Repository evidenceだけでは判定不能。
- Refactor必要性を判定するために新しい常設解析基盤が必要になる。
- candidateの判断がProduct behavior / Specification変更の是非を先に決めないと成立しない。

### 仮定してよい細部

- Git churnの期間はAudit baselineからinvestigation baselineまでを主範囲とし、必要に応じて直近90日等の補助windowを併記してよい。
- commit数はriskの直接scoreにせず、変更理由・同一箇所の反復修正・revert / fixの有無を見る補助Evidenceに使う。
- report内のcandidate詳細順はAudit §4.1〜§4.16を維持する。

### 未回答の重要質問

- なし。実調査でEvidence不足が出たcandidateは`needs_more_evidence`へ分類し、Plan自体を拡張しない。

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

Phase 6では上記pathと、そのconsumer / dependency / reference / protecting test / workflowをread-onlyで調査する。

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
- `docs/adr/**`
- `docs/spec/**`（boundary確認のみ。変更しない）
- relevant prior Plans / Run Artifacts / PR / Issue history

### Files to inspect first

1. `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md` §19 / §20 / stop conditions / completion criteria
2. `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md` §4.1〜§4.16
3. `docs/reports/2026-08-24_074011_curriculum-validity-review.md`（Refactoring判断へ直接関係するcross-referenceがある場合のみ）
4. Current `AGENTS.md`, `CODE_REVIEW.md`, ADRs
5. 各candidate pathとAuditに記載されたconsumer / protecting test / workflow
6. Audit baseline `4ed5374...` からinvestigation baselineまでのGit history

### Safe change surface

Phase 6 decision-only PRでRepositoryへ新規追加・更新してよいdurable business artifactは原則次だけ。

- このPlan
- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`
- Repository標準Run Artifact

必要に応じてIssue #72の進捗情報をGitHub上で同期してよいが、Evidence本文はdurable reportを正本とする。

Product source、test source、workflow source、dependency、Specification、Curriculum本文はPhase 6 decision-only差分では変更しない。

## 5. 変更方針

### Change strategy

Phase 6は「candidateを読む → 大きいから分割」の流れにしない。

各candidateで次の順にEvidenceを固定してからclassificationを行う。

```text
Audit candidate identity
→ Current main freshness
→ recent change / repair evidence
→ consumer / dependency / blast radius
→ protecting test / workflow
→ transaction / state / platform boundary
→ maintainability / split cost
→ classification
→ rationale / follow-up trigger
```

classificationを先に決めてEvidenceを後付けしない。

### Task 1 — Phase 6 baseline固定

- 実作業開始時のlatest `main` SHAを取得し、investigation baselineとして記録する。
- Planning baseline `856a14...`との差分がある場合、Phase 6 relevant changeだけを確認する。
- Audit baseline `4ed5374...`からinvestigation baselineまでのRepository changeを俯瞰し、candidate identityが維持されているか確認する。
- candidate pathがrename / split / mergeされている場合、Git historyでlineageを追い、旧pathのまま評価しない。

### Task 2 — 16 candidate current-state mapping

各candidateについて次を1つのEvidence cardとして作成する。

```text
Candidate
Current path(s)
Current responsibility
Current public surface
Current consumers
Current dependencies / references
Protecting tests / workflows
Transaction / state / platform boundary
Audit baselineからのmaterial change
```

Audit reportのcaller / size / line情報はCurrent codeで確認してから使用する。

### Task 3 — Git churn / repair / failure history収集

候補ごとに、Audit baseline以降のhistoryを確認する。

最低限:

- path単位のcommits
- change reason
- fix / revert / repairの反復
- 同じboundaryを何度も修正しているか
- relevant PR / Issue
- CI failure / runtime failure / Run Artifactでcandidateが原因面として登場したか

単純commit countはscoreにしない。

次を区別する。

- feature growthによる正常な変更
- broad fileゆえのunrelated churn集中
- defect修正
- flaky / operational repair
- mechanical doc / format / generated変更

### Task 4 — Blast radius / consumer boundary確認

既存code search、imports、factory/composition root、testsを使って、各candidateのactual boundaryを確認する。

確認内容:

- direct consumer
- indirect composition root
- shared contract
- platform-specific consumer
- training / formal / runtime consumer
- cross-role / cross-capability consumer
- transaction boundary
- state ownership

新しいpermanent call graph toolは作らない。

### Task 5 — Test protection評価

candidateごとに「テストが存在するか」だけでなく、変更riskをどこまで検知できるか確認する。

例:

- repository contract
- application unit/integration test
- component test
- architecture/static contract
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

### Task 6 — Boundary / split cost評価

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

### Task 7 — Candidate classification

16 candidateをAudit順にclassificationする。

各classificationには最低限次を記載する。

```text
Classification
Primary evidence
Risk / cost observed now
Why now / why not now
Refactor benefit or keep rationale
Follow-up trigger
Confidence / missing evidence
```

#### `refactor_now`

- 後続実装候補名を付けてよい。
- ただしsource design / file split / API migrationをPhase 6内で確定しすぎない。
- Phase 6 merge後、別Planでrepo mappingし直す。

#### `refactor_when_touched`

- 「いつか」ではなく、再評価triggerを具体化する。
- 例: capability追加、transaction contract変更、同一boundaryの次回feature、platform parity変更等。

#### `keep_as_is`

- intentional complexity / duplication / boundaryを説明する。
- 「問題が見つからなかった」だけで終わらせない。

#### `needs_more_evidence`

- 必要Evidenceと取得可能になる条件を明記する。
- Pilot / production defect / repeated maintenance event等、Repository外Evidenceが必要ならその事実を明示する。

### Task 8 — Cross-candidate sanity check

全16件を一度横断し、classificationの一貫性を確認する。

特に次を比較する。

- Native SQLite §4.1 / §4.2 / §4.15
- Native presentation §4.3 / §4.4
- Admin Product §4.5 / §4.8
- Checkout/Review application §4.6 / §4.7
- Native CI §4.9 / Maestro cleanup §4.13
- Seed §4.11 / Web E2E fixture §4.14
- Domain dependency §4.16 / Adapter boundary §4.15

複数candidateが同じroot causeに見えても、証拠なく一括Refactorへまとめない。

### Task 9 — RA-C1 / RA-Q1 disposition

- RA-C1: 16 candidateの総合Necessity Review結果をdurable reportのSummaryへ記載する。
- RA-Q1: Domain → Application type dependencyについて、Current import direction、runtime dependency、DTO/viewer type ownership、変更履歴、test/architecture protectionを確認する。
- RA-Q1をarchitecture purityだけで`refactor_now`にしない。
- Evidence不足なら`needs_more_evidence`にし、再判断条件を残す。

### Task 10 — Durable report作成

保存先:

```text
docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md
```

推奨構造:

```text
# Refactoring Necessity Review

## Baseline / scope
## Method
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

詳細sectionではEvidenceを要約し、raw log dumpをreportへ貼らない。

### Task 11 — Pre-PR freshness check

PR作成直前にlatest `main`を再取得する。

各candidateについて次だけをtargetedに確認する。

- candidate自身
- 初回調査で確認したconsumer / dependency / reference path
- protecting test / workflow
- Current `main`で追加・削除された関連path

関連集合が変化したcandidateだけclassificationを再評価する。

Repository全体の全面再Auditは行わない。

### Task 12 — Decision-only PR scope確認

PR差分に次が含まれていないことを確認する。

- `src/**` behavior change
- `tests/**` behavior change
- `.github/workflows/**` behavior change
- `scripts/**` behavior change
- dependency / lockfile change
- Specification semantic change
- Curriculum semantic change

Phase 6で実変更候補を見つけても、reportにfollow-upとして記録して停止する。

### Task 13 — Merge直前freshness check

Phase 6 PRがreviewを通過しmerge可能になった時点で、最新`main` SHAを確認する。

- relevant candidate setにmaterial changeなし → reportへ最終確認`main` SHAを記録しdecision維持。
- material changeあり → 影響candidateだけ再確認し、必要ならclassification / rationaleを更新。

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
   - `needs_more_evidence`には不足Evidence / triggerがある。
3. Follow-up scope check
   - `refactor_now`だけが即時follow-up候補。
   - 他classificationを実装タスク化していない。
4. Baseline / freshness check
   - investigation baseline SHAがある。
   - merge直前latest `main` SHAを記録する欄がある。
5. Diff scope check
   - decision-only差分のみ。
6. Markdown validation
   - `pnpm run lint:markdown`
   - `git diff --check`
7. Repository standard artifact sanitization
   - Run Artifactを作成した場合はRepository標準sanitizer / collector contractに従う。

必要時のみ:

- `pnpm run format:check`
  - report / Planのformat contractで必要な場合。
- targeted contract test
  - Phase 6中にSourceを変更しないため原則不要。既存contractの意味確認にはread-onlyでtest sourceを参照する。

実行しないもの:

- Product E2E全件
- Native runtime
- build
- dependency install/update
- unrelated curriculum validator

これらはdecision-only reportの正しさを直接証明しない。

### 成功判定

次をすべて満たしたらPhase 6 decisionは完了とする。

- 16/16 classified
- Evidence-based rationaleあり
- RA-C1 / RA-Q1 dispositionあり
- no size-only `refactor_now`
- decision-only scope維持
- durable report保存
- pre-PR / pre-merge freshness確認
- Markdown / diff validation PASS
- `refactor_now`は別Plan / 別PRへhandoff可能な粒度で列挙されているが、実装していない

## 7. リスクと未解決論点

### Risks

1. **Size bias**
   - Auditはhotspot sizeを含むため、大きいfileを自動的にdebt扱いしやすい。
   - 対策: sizeはcandidate発見Evidenceに限定し、classificationはfailure / churn / boundary / protection / split costで判断する。

2. **Historical evidence bias**
   - 2026-08-24以降PR 1〜5でRepositoryが変化している。
   - 対策: Audit factをCurrent factとしてコピーせず、latest `main`でconsumer / test / boundaryを再確認する。

3. **Churn misclassification**
   - feature追加が多いだけのpathを「保守性が悪い」と誤認する可能性がある。
   - 対策: commit countではなくchange reasonと反復repairを見る。

4. **Test count bias**
   - test数が多くてもcritical state / transaction / platform branchが守られていない場合がある。
   - 対策: protection typeと対象boundaryを確認する。

5. **Over-abstraction**
   - Native / Web、Dexie / SQLite、Formal / Training等のintentional differenceをDRY目的で統合する危険がある。
   - 対策: platform / execution ownershipを先に評価する。

6. **Follow-up scope creep**
   - `refactor_now`を見つけた勢いでPhase 6内にsource修正を混ぜる危険がある。
   - 対策: decision-onlyをhard boundaryとし、実装はPhase 6 merge後の別Plan / PRのみ。

7. **Needs-more-evidence avoidance**
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
