# Phase 6 Refactoring Necessity Review Execution Plan

## 0. 依頼概要

- 依頼内容: Master PlanのPhase 6 — Refactoring Necessity Reviewを実施するための実行Planを作成する。
- 背景: PR #124でPR 5が完了し、Curriculum / Test Strategy Remediationの残作業はPhase 6となった。
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- Initial Evidence inventory: `docs/reports/2026-08-24_074656_curriculum-test-strategy-refactor-repository-audit.md`
- Tracking Issue: #72 `track: curriculum / test strategy remediation progress`
- Planning baseline `main`: `856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`（PR #124 merge commit）
- Working branch: `docs/phase6-refactoring-necessity-review`

このPlanは、ユーザーの明示的なPlan作成依頼に応じてPhase 6の**実行順序と停止点だけを具体化するExecution Plan**である。

Phase 6のcandidate inventory、Evidence criteria、classification、completion、global stop condition、output scopeのnormative contractはMaster Plan §19〜§21を正本とする。このPlanではそれらを再定義しない。記載が競合した場合はMaster Planを優先する。

Phase 6は**decision-only**である。`refactor_now`と判定した候補が存在しても、このPhase 6 branch / PRではProduct、Harness、Workflow、Test sourceのRefactorを実装しない。実装はPhase 6 merge後に別Plan / 別PRへ切り出す。

## 1. ゴール / 完了条件

### ゴール

Repository Audit §4.1〜§4.16の16 candidateをCurrent RepositoryのEvidenceで再評価し、Master Planで定義済みの4分類へ判定する。

目的は「大きなfileを分割すること」ではなく、**今Refactorする合理性があるcandidateだけを後続実装へ送ること**である。

調査自体を大規模化しない。全16件へminimum Evidence passを行い、Pass 1時点で最終classificationを確定できないcandidateだけ追加調査する。

### このExecution Planの完了条件

Phase 6実施者が追加の設計判断なしで、次を順番に実行できること。

1. latest `main`へbranchを同期する。
2. 16 candidateすべてへminimum Evidence passを行う。
3. Pass 1で判断できないcandidateだけtargeted deep diveする。
4. Master Planの4分類へ最終判定する。
5. durable reportを作成する。
6. PR作成前にdiff-first freshness checkを行う。
7. decision-only scopeと必要なMarkdown validationを確認する。
8. Plan / report / Run Artifactをcommit・pushし、decision-only PRをOPENで作成して停止する。
9. ユーザーの明示承認後だけmerge finalizationへ進む。

Phase 6そのもののDoDはMaster Plan §19 / §21を正本とする。

## 2. 現状理解 / 前提 / 非目標

### Current understanding

- Repository Auditのcandidate inventoryは2026-08-23〜24時点のbaseline `4ed5374dcd5e98bf96c05f0fdecef56b42064a0c`で作成された。
- PR 1〜5までの変更が入っているため、Audit当時のline count、caller、test、workflow情報をCurrent factとして無条件に使わない。
- Planning時点のlatest `main`は`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`。
- Phase 6の最終decisionはlatest `main`相当のbranch状態で行う。
- Master Planで定義済みの4 classificationのみを使用する。
- Outputは`docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`とする。

### Assumptions

- Git history、Current source、既存test / workflow、関連PR / Issueでminimum Evidenceを取得できる。
- Run Artifactは、path history / PR / Issueから関連性が特定できた場合のみ参照すればよい。
- permanent call graph、graph DB、generic dependency scannerなどの新規基盤は不要である。
- 同じEvidenceが複数candidateを説明する場合は再利用してよい。ただしclassificationはcandidate単位で行う。
- Evidence categoryがcandidateに意味を持たない場合は、無理に調査せず`N/A — <理由>`を記録してよい。

### Non-goals

- Phase 6内でRefactorを実装する。
- Refactor後のfile split / API / migration designを確定する。
- architectureを理想形へ作り直す。
- size / line count / file countだけでRefactor要否を決める。
- 全ADR、全Run Artifact、全PR、全Issueを網羅的に読み直す。
- permanent analysis toolingを追加する。
- Product behavior、Normative Specification、Curriculum、Formal Regression Gateを変更する。
- intentional platform duplicationをDRY目的だけで統合する。
- Issue #72をEvidenceの第三SSOTにする。
- Phase 6中に新規runtime failure / production incidentを能動監視する仕組みを追加する。

## 3. Candidate inventory

candidateの意味と初期EvidenceはRepository Audit §4.1〜§4.16を正本とする。

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
| §4.13 | Maestro cleanup helpers | `scripts/native/android-maestro-run.sh`, `scripts/training/**` Maestro runner / invocation |
| §4.14 | Web E2E fixture | `e2e/web/fixtures.ts` |
| §4.15 | Dexie / SQLite adapters | `src/infrastructure/database/dexie/**`, `src/infrastructure/database/sqlite/**` |
| §4.16 | Domain → Application type dependency | `src/domain/repositories/contracts.ts`, `src/domain/policies/permissions.ts` |

## 4. 実行ルール

### 4.1 Evidence探索はboundedにする

各candidateの探索は原則次の順序に限定する。

1. candidate current path / current area
2. Audit baseline以降のtargeted path history
3. current direct consumer / import / composition root
4. protecting test / workflow
5. path historyから直接特定できたrelevant PR / Issue
6. 上記だけでは判断材料が不足するときだけrelevant Run Artifact

この範囲で該当defect / repair / failure Evidenceが見つからない場合は、`確認した範囲では該当Evidenceなし`と記録して終了する。

Evidenceがないことを証明するためにRepository全体へ探索を広げない。

### 4.2 Area candidateは完全call graphを作らない

`§4.12 Agentic QA Harness`、`§4.15 Dexie / SQLite adapters`等のarea candidateでは、minimum passとして次だけ確認する。

- public / composition entry point
- factory / runner / 主要state owner
- major capability group
- materialに変更された主要file
- protecting tests / workflow
- transaction / state / platform boundary

全function / 全transitive caller / 全dependencyの完全一覧は作らない。

### 4.3 Evidenceを再利用する

次のように重なるcandidateは同じEvidenceを再利用してよい。

- Native SQLite: §4.1 / §4.2 / §4.15
- Native presentation: §4.3 / §4.4
- Admin Product: §4.5 / §4.8
- Checkout / Review application: §4.6 / §4.7
- Native CI / Maestro: §4.9 / §4.13
- Seed / Web E2E fixture: §4.11 / §4.14
- Domain dependency / Adapter boundary: §4.16 / §4.15

同じGit history、test、workflow、composition rootをcandidateごとに再調査しない。

### 4.4 Repository material change

freshnessでcandidate再評価を必要とするRepository上の`material change`は次のいずれかとする。

- responsibilityが変わった
- public / composition surfaceが変わった
- consumer / dependency / referenceが増減した
- transaction / state / platform boundaryが変わった
- protecting test / workflowが変わった
- path / areaがsplit / merge / renameされた

次は原則non-materialとする。

- formatting
- comment-only
- unrelated documentation
- Run Artifactだけの追加
- candidate contract / boundaryに影響しないmechanical change

review中に新しいdefect / repair / runtime failure Evidenceが**明示的に判明した場合**は、そのcandidateのclassification Evidenceとして扱う。ただしPhase 6が能動的に新規障害を監視・探索することはしない。

### 4.5 Evidence categoryの`N/A`

Master Planで求めるEvidence categoryは各candidateで確認するが、candidateの性質上該当しないものは、無理に対応物を探さない。

例:

- CSS candidateにtransaction boundaryが存在しない → `N/A — UI styling candidateでtransaction ownershipなし`
- CI workflow candidateにapplication state ownershipが存在しない → `N/A — workflow orchestration boundaryを評価`

`N/A`は「未確認」の代替ではない。該当しない理由を1行で示す。

## 5. 実行タスク

### Task 1 — latest main同期 / investigation baseline固定

実調査開始時にbranchをlatest `main`相当へする。

1. `git fetch origin main`でlatest `origin/main`を取得する。
2. `git merge-base --is-ancestor origin/main HEAD`相当でPhase 6 branchがlatest `main`を含むか確認する。
3. 含まない場合は`origin/main`を通常mergeで取り込む。
4. rebase / force push / history rewriteは行わない。
5. 取り込んだ`main` SHAをinvestigation baselineとしてRun / reportへ記録する。

ここではcandidate historyを全面調査しない。rename / split / mergeの確認は各candidateのPass 1で行う。

### Task 2 — Pass 1: 16 candidate minimum Evidence pass

全16件へ次のEvidence Cardを1つずつ作る。

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
Pass 1 status: classified | deep-dive-needed
```

`Evidence references`には必要に応じて次を記載する。

- source path
- test path
- workflow path
- commit SHA
- PR / Issue番号
- relevant Run ID

Evidence categoryが非該当なら`N/A — <理由>`を記載する。

Pass 1では「最終classificationを判断できるだけの最低限」を集める。詳細設計や完全dependency mappingへ進まない。

### Task 3 — Pass 1: targeted history確認

各candidateでAudit baseline以降のtargeted historyを確認する。

確認するのは次だけ。

- materialな主要commit
- change reason
- repeated fix / revert / repairの有無
- 同じboundaryの反復修正有無
- historyから直接辿れるrelevant PR / Issue
- candidate起因と確認できるCI / runtime failure有無

単純commit countはrisk scoreにしない。

feature growth、defect repair、operational repair、mechanical changeを区別する。

### Task 4 — Pass 1: consumer / protection / boundary確認

classificationに必要な粒度で次を確認する。

- direct consumer
- principal composition root
- shared contract
- platform-specific ownership
- transaction / state ownership
- protecting test / workflow
- protectionがbehavior / interface / indirect E2Eのどれか

該当しないcategoryは`N/A — <理由>`としてよい。

actual blast radiusを説明できれば終了する。完全call graphは作らない。

### Task 5 — Pass 1終了時の状態判定

Pass 1終了時は、各candidateを次のどちらかにする。

```text
A. Master Planの4分類のいずれかを、十分なEvidenceとrationaleで確定できる
   → final classificationを記録し、Pass 2へ進まない

B. classificationまたはrationaleを十分なEvidenceで確定できない
   → deep-dive-needed とし、Pass 2へ進む
```

この時点でEvidence不足を理由に直ちに`needs_more_evidence`へ確定しない。boundedな追加確認で解消可能かをTask 6で一度だけ確認する。

Pass 1でclassificationできるcandidateは、次の判断順序を使用する。

```text
1. Currentな具体的risk / costがあり、
   今対応するbenefitが延期より明確に大きいか？
   Yes → refactor_now

2. maintainability costはあるが、
   関連変更と同時に直す方が合理的か？
   Yes → refactor_when_touched

3. Current構造を維持する合理的理由があるか、
   またはCurrent Evidenceで改善benefitを説明できないか？
   Yes → keep_as_is

4. 上記を十分なEvidenceで確定できない
   → deep-dive-needed
```

補足:

- 過去defect / repeated repairは強いEvidenceだが`refactor_now`の必須条件ではない。
- 「大きい」「複雑」「きれいになる」は`refactor_now`の理由にならない。
- `keep_as_is`は単に「問題なし」ではなく、cohesion / transaction / platform / abstraction cost等の維持理由を記載する。
- `refactor_when_touched`は具体的な再評価triggerを記載する。

### Task 6 — Pass 2: `deep-dive-needed`だけtargeted deep dive

Pass 2へ進む条件は1つだけとする。

- Pass 1終了時点でclassificationまたはrationaleを十分なEvidenceで確定できず、`deep-dive-needed`になった。

material changeがある、defectがある、fileが大きい、という事実だけではPass 2へ進まない。

Deep diveは不足論点だけを確認する。

例:

- transaction risk → transaction runner / rollback / direct protecting test
- platform duplication → platform ownership / shared contract / abstraction cost
- workflow risk → job dependency / fail-closed verify / workflow contract
- CSS risk → cascade / breakpoint ownership / repeated repair
- harness risk → public command / schema / artifact / trust boundary

必要なEvidenceが揃ったら停止する。

Refactor source design、file split、API migration案はPhase 6では作り込まない。

### Task 7 — Pass 2後の最終classification

Pass 2対象candidateをMaster Planの4分類へ最終判定する。

判定順序は次に固定する。

```text
1. boundedなPass 2後も判断に必要なEvidenceが不足しているか？
   Yes → needs_more_evidence

2. Currentな具体的risk / costがあり、
   今対応するbenefitが延期より明確に大きいか？
   Yes → refactor_now

3. maintainability costはあるが、
   関連変更と同時に直す方が合理的か？
   Yes → refactor_when_touched

4. それ以外
   → keep_as_is
```

`needs_more_evidence`には、不足EvidenceとEvidence取得条件 / 再判断triggerを必ず記載する。

### Task 8 — Cross-candidate sanity check

16 candidateのclassificationを横断し、次だけ確認する。

- 同じEvidenceに対して不整合な判定になっていないか
- 同一platform / transaction / capabilityのintentional boundaryをcandidateごとに矛盾して扱っていないか
- 同じroot causeに見えるという理由だけで一括Refactorにしていないか

classificationを統一するために再調査を全面実施しない。

### Task 9 — RA-C1 / RA-Q1をreportへ集約

RA-C1は16 candidateの集約結果として記載する。追加調査は行わない。

RA-Q1は§4.16と同一Evidenceを使用する。§4.16のEvidence Cardに`Related finding: RA-Q1`を記載し、reportのRA-Q1 sectionでは§4.16 classification / rationaleを参照する。

RA-Q1用にimport / history / test protectionを二重調査しない。

### Task 10 — Durable report作成

保存先:

```text
docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md
```

Report構造:

```text
# Refactoring Necessity Review

## Baseline / scope
## Method / bounded evidence rule
## Executive summary
## Classification summary
## Candidate matrix
## 4.1 ...
...
## 4.16 ...
## RA-C1 conclusion
## RA-Q1 conclusion
## Follow-up
## Freshness check
## Scope / non-goals confirmation
```

#### Candidate matrixの役割

Matrixはindexとして使い、Evidence詳細を重複させない。

| Candidate | Current path | Classification | One-line rationale |
| --- | --- | --- | --- |

#### Candidate詳細sectionの役割

各§4.x詳細sectionには次を記載する。

```text
Current boundary
Churn / repair / failure summary
Protection
Primary evidence references
Classification
Why now / why not now
Follow-up trigger or missing evidence
```

raw log dumpは貼らない。

`refactor_now`がある場合、後続候補名と対象boundaryまで記載してよいが、file split / API / migration designまでは決めない。

### Task 11 — Pre-PR freshness check: diff-first

PR作成直前に、investigation baseline `main` SHAとlatest `main` SHAを比較する。

1. changed filenames / diffを確認する。
2. candidate自身またはPass 1 / Pass 2で確認済みのconsumer / test / workflowへ接触していない場合はfreshness確認終了。
3. 接触しているpathだけ内容を確認する。
4. Repository material changeでなければclassification維持。
5. Repository material changeならlatest `main`を通常mergeで取り込み、影響candidateだけ再評価する。

全16件のconsumer / dependencyを最初から再確認しない。

review中に新しいdefect / repair / runtime failure Evidenceが明示的に判明している場合だけ、そのcandidateへ反映する。freshness check自体で新規障害を探索しない。

### Task 12 — Decision-only scope / validation確認

PR差分に次が含まれていないことを確認する。

- Product source behavior change
- Test behavior change
- Workflow behavior change
- dependency / lockfile change
- Specification semantic change
- Curriculum semantic change

Required validation:

```bash
pnpm run format:check
pnpm run lint:markdown
git diff --check origin/main...HEAD
```

commit前にもworking tree差分へ`git diff --check`を実行してよい。最終的なPR差分確認は`origin/main...HEAD`相当で行う。

Repository標準Run Artifactを作成した場合は、Repository標準のsanitization / collector contractに従う。

Dependency運用:

- dependency updateは禁止する。
- Validationに必要で`node_modules`がない場合だけ、既存lockfile準拠のinstallを許可する。
- `package.json` / lockfileを変更しない。

原則実行しない:

- `pnpm run validate:curriculum`
- `pnpm run test:contracts`
- Product E2E
- Native runtime
- build
- dependency update

Phase 6はdecision-only document changeなので、これらはreportの正しさを直接証明しない。

### Task 13 — Commit / push / decision-only PR作成

Task 11〜12完了後、Phase 6のdecision-only成果物をGitHubへ提出する。

1. Plan、durable report、Repository標準Run Artifactだけが意図した差分であることを最終確認する。
2. 必要なRun Artifact sanitizationを完了する。
3. 意図した差分をcommitする。
4. current branch `docs/phase6-refactoring-necessity-review`へnon-force pushする。
5. base `main`、head `docs/phase6-refactoring-necessity-review`でdecision-only PRをOPENで作成する。
6. PR本文に最低限、調査baseline、16/16 classification完了、classification summary、RA-C1 / RA-Q1、`refactor_now` follow-up有無、validation、decision-only scopeを記載する。
7. PR作成後はユーザーへ結果を報告して停止する。

このTaskではPRをmergeしない。

### Task 14 — ユーザー承認後のmerge finalization / freshness check

ユーザーからPhase 6 PRのmergeを明示承認された場合だけ実行する。

1. latest `main`との差分をdiff-firstで再確認する。
2. relevant path変更なし → latest `main` SHAをreportへ記録する。
3. relevant path変更あり / non-material → 内容確認結果とlatest `main` SHAをreportへ記録しclassification維持する。
4. relevant path変更あり / Repository material change → latest `main`を通常mergeで取り込み、影響candidateだけ再評価する。
5. reportを必要最小限更新し、Task 12のRequired validationを再実行する。
6. 必要なcommit / non-force pushを行う。
7. PRがmerge-readyであることを確認し、ユーザーの明示承認範囲内でmergeする。

全16件の全面再Auditは行わない。

## 6. Stop conditions

Phase 6固有の停止条件だけこのExecution Planへ記載する。Master Planのglobal stop conditionはMaster Planを参照する。

対象candidateで次が発生したら推測でclassificationを進めない。

1. boundedなPass 2後も判断できない。
   - `needs_more_evidence`として不足Evidenceと再判断条件を記載する。
2. 判断にProduct behavior / Normative Specification変更の是非を先に決める必要がある。
   - Phase 6外として報告する。
3. 判断に新しいpermanent analysis toolingが必要になる。
   - toolingを作らず、必要Evidenceを記録して停止する。
4. candidate identityをCurrent codeへ安全に対応付けできない。
   - 対象candidateだけ停止し、lineage gapを記録する。

1 candidateの停止を理由に、他candidateのbounded reviewまで全面停止しない。

## 7. リスクと防止策

### Size bias

大きいfileを自動的にdebt扱いしない。sizeはcandidate発見Evidenceに留める。

### Unbounded investigation

全Run / 全PR / 全Issue / 全ADRへ広げない。bounded Evidence順序とPass 1 / Pass 2停止点を守る。

### Equal-depth review

16件すべてを同じ深さで調べない。Pass 1で判断できたcandidateはそこで終了する。

### Premature `needs_more_evidence`

Pass 1でEvidence不足でも直ちに`needs_more_evidence`へ確定しない。`deep-dive-needed`としてboundedなPass 2を一度だけ実施する。

### Defect-history bias

過去defectがないことを安全性の証明にしない。Current risk / costも評価する。

### Over-abstraction

Native / Web、Dexie / SQLite、Formal / Training等のintentional boundaryをDRY目的だけで壊さない。

### Scope creep

`refactor_now`を見つけてもPhase 6内で実装しない。

### Stale decision

diff-first freshness checkでRepository上のrelevant changeだけを再評価する。新規runtime failure等は明示的に判明した場合だけ反映し、能動監視しない。

### Git history rewrite

latest `main`同期やfinalizationでrebase / force pushを使わない。通常merge + non-force pushで履歴を保つ。

## 8. 成果物

### Plan-only時点

- `docs/plans/2026-09-06_140451_phase6_refactoring_necessity_review.md`

### Phase 6実施時

- `docs/reports/{yyyy-mm-dd}_{HHMMSS}_refactoring_necessity_review.md`
- Repository標準Run Artifact
- Phase 6 decision-only PR

### 変更しないもの

- Product code
- Product / Formal test behavior
- Training behavior
- Workflow behavior
- dependency / lockfile
- Normative Specification
- Curriculum semantic contract
- Master Planのcandidate inventory / Evidence criteria / classification / completion contract / output scope

## 9. Follow-up

Phase 6 decision-only PR merge後:

- `refactor_now`
  - Current `main`で改めてrepo mappingする。
  - candidate単位、またはEvidenceで明確に同一boundaryと確認できた最小単位で別Plan / 別PRを作成する。
- `refactor_when_touched`
  - 即時PRを作らない。
  - durable reportのtrigger成立時だけ再評価する。
- `keep_as_is`
  - 追加actionなし。
- `needs_more_evidence`
  - reportに記録したEvidence取得条件が成立した場合だけ再評価する。

Phase 6完了後はIssue #72へ進捗のみ同期する。Master Planをlive progress trackerへ変更しない。