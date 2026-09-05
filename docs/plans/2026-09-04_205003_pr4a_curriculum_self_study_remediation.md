# PR 4A child Plan: Curriculum Core / Extension / Reference / Self-study remediation

## Status

- 状態: **PR #115 review / bounded correction pending**
- Pre-change audit: **既存実装前に実施済み。全面再監査は行わず、既存Evidenceを本Planへ正規化して不足だけ補う**
- 実装: **既存branch / PR #115に初回実装あり。Task 0〜7を最初から再実行しない**
- 現在の作業: **既存実装を本Planの確定契約へ照合し、残存不整合だけをboundedに修正する**
- 作業branch: `docs/pr4a-curriculum-self-study-remediation`
- PR: #115
- 本PlanはPR 4Aの実装判断SSOTとし、別の監査台帳・Glossary・Finding DBは作成しない

### Current-phase rule

このbranchには既にCurriculum実装、Instructor Reference整理、review checklist追加、Validation履歴が存在する。Planの時系列を修正するためだけに既存実装をrevertしたり、Pre-change audit / 実装を全面的にやり直したりしない。

今後は次だけを行う。

1. 既存audit / implementation evidenceを本Planへ正規化する。
2. 確定Findingと現行PR差分を照合する。
3. 残存する契約不整合だけをbounded correctionする。
4. relevantな`main`更新または不足Evidenceがある範囲だけ再確認する。
5. 全Taskを再実行したという形式的な履歴を作らない。

## Goal

Master Plan §16のPR 4A remediationを完了し、PR #103で固定されたDecision B / Competency / Assessment Contractを維持したまま、Learner Required pathとlearner-facing Native specializationの自己学習品質をboundedに改善する。

Issue #98 H98-1〜H98-4は**完了済みの監査入力**として扱う。Issue #98専用の教材・報告・チェックリスト・SSOTは作らず、必要な観点だけを既存Curriculum Finding / self-study checklistへ統合する。

成果物は次を満たす。

- Common CoreがNative specialization / Extension / Referenceを暗黙前提にせず完了できる。
- Native specializationを選択するLearnerは、開始条件、branch、skip、rejoin、Evidence、Recoveryをlearner-facing materialだけで判断できる。
- Learnerが教材だけで、学習目標 → 説明 → Exercise → Evidence → Self-check → Recovery → Completion → Next actionを判断できる。
- Repository-required assetとLearner Required pathを混同しない。
- Instructor Referenceは環境・権限・端末・Training Copy・Infrastructure / Toolchainのsupport-only assetとする。
- 実装は必要最小限とし、教材全面rewrite、不要な構造変更、文章量を増やすだけの変更を行わない。

## Fixed decisions inherited from Master Plan / PR #103

### Competency / route

- target learnerはentry-levelの汎用Test Automation Engineer。Common CoreはWeb中心で成立する。
- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2。
- Part 2 / Final Common completion: `C01〜C07 + C09〜C12` bounded Level 2。
- `C08`、Physical Android、Native automation / Native CIはNative specialization。Common completionには要求しない。
- Part 1 Common route: `P1-6 → P1-8 → P1-9`。
- Part 1 Native route: `P1-6 → P1-7 → P1-8 → P1-9`。
- Part 2 Common route: `P2-5 → P2-7 → P2-8`。
- Part 2 Native route: `P2-5 → P2-6 → P2-7 → P2-8`。
- Commonで前提にしてよいのはentry profileと先行Common Requiredだけ。specialization / Extension / Reference / 教材外経験を隠れた前提にしない。

### Evidence / asset boundary

- C08 Minimum Evidenceはlearner-authored Native exercise diff + successful Maestro execution artifact。
- Training baseline / stock flow / Repository-required assetの存在だけでlearner competencyを満たしたことにしない。
- Learner-facing materialが学習内容、Exercise、Self-check、learning Recovery、Completion、evaluationの正本。
- Instructor / 運営は環境、権限、端末、演習Repository / Training Copy、Infrastructure / Toolchainを支援してよい。
- `03_instructor-reference.md`はRepository-required support assetであり、Learner Required completionの正本ではない。
- `docs/spec/**`がNormative Oracle。Product behavior、Formal Test Strategy、Training runner / workflow / Artifact contractはPR 4Aで変更しない。

### Protected surfaces / no-change invariants

以下は実不整合を確認しない限りPR 4Aで再設計しない。

- `02_competency-rubric.md`のPR #103 competency / Minimum Evidence contract
- `scripts/validate-curriculum.ts`の既存required-file contract
- `tests/contracts/training-curriculum.test.ts`のPR #103 invariant
- Native baseline / Product / `docs/spec/**` behavior contract
- Optional Agentic QA / Legacy Capstoneの既存non-required classification

「正しいので変更しない」ものをCurriculum Findingとして水増ししない。

## Scope

### In scope

- Learner Required Commonとlearner-facing Native specializationのfile / internal Lesson監査とbounded remediation
- Core / Extension / Reference / specializationの境界整理
- 学習フロー、前提知識、Self-check、Recovery、Completion、Next actionの自己完結性
- 確認問題をLearner自身で自己採点できる最低チェックポイント
- Instructor Reference内のlearner-facing情報の仕分け・移行
- `/guide`、Seed metadata、Test Control protocol、static address dictionary、Workbook / validator等の既存SSOTへの到達案内
- Issue #98 H98-1〜H98-4から採用済みのboundedなCurriculum観点
- `docs/reference/curriculum-self-study-review.md`の再利用可能checklist
- `docs/spec/**`のGit-tracked Markdown / text contractに対するterminology / wording / internal consistency / semantic safety audit。PR 4Aでは実変更しない
- 監査結果から得られた将来も安定する最小のlanguage / terminology ruleを既存READMEまたは`00_learning-design.md`へ反映する
- PR #115 reviewで見つかった、上記契約に直接関係する残存不整合のbounded correction

### Out of scope

- Product behavior、Seed Data、Test Clock、Test Control protocol、address lookupの変更
- `docs/spec/**`の実変更、PR 4B実装、Specification clarificationの推測解消
- Security Curriculum全般、XSS専門Lesson、脆弱性判定DB
- Formal Test Strategyの再設計
- Training runner / workflow / Artifact contract、PR 5の実行基盤
- Curriculum全面rewrite、P2/P3の無制限cleanup
- 新LMS、DB、Scoring基盤、Finding DB、監査台帳、第三SSOT、新Glossary
- ラベル改善で足りる場合のrename / directory migration
- Plan時系列を整えるためだけの既存実装revert / 再実装

## Simplicity principles

実装量を増やさないため、次を固定する。

1. **1 file ≒ 1 remediation pass** を基本とし、review correctionでも同一fileの目的外cleanupを増やさない。
2. Root文書はconfirmed Finding、Instructor migration、stable terminology rule、またはreviewで確認した契約不整合がある場合だけ変更する。PR #103契約を「念のため」書き直さない。
3. 既存Lesson構造が成立している場合、統一テンプレートへ強制しない。
4. 見出しを残すためだけの説明追加、文章量を増やすだけの変更は禁止する。
5. Practice Volumeの件数・technique数は練習量の目安として残してよいが、Rubricが要求しない限り単独のRequired completion条件にしない。
6. Current Repository固有のSHA、Job名、API Level、allowlist、Workflow topology等は学習目的に必要な場合だけReferenceとして残し、暗記をCompletionにしない。
7. long-form Answer Keyを新設しない。確認問題はLesson単位の最低Self-checkポイントで自己採点可能にする。
8. prose品質をvalidator / contract testでfreezeしない。
9. file rename / directory migrationより、classification label / navigation修正を優先する。
10. Product / Spec / Training基盤を教材都合で変更しない。
11. 既に満たしているFindingを再実装しない。review correctionは残存差分だけに限定する。

## Historical Task 0 — Baseline / freshness check

Task 0は既存実装前に実施済みとして扱い、全面再実行しない。

Current reviewでは次だけを再確認する。

- Current `main` SHAとPR #115 base / headの関係。
- PR #103 fixed contractがCurrent `main`で維持されていること。
- Current `main`が既存audit後に進んでいる場合、Curriculum / Spec / validator / contract / Training入口に関係する差分だけ。
- 無関係なmain更新だけを理由にfull auditをやり直さない。
- 実装対象外の差分をPR 4Aへ取り込まない。

## Historical Task 1 — Pre-change audit / evidence normalization

Pre-change audit自体は既存実装前に行われ、PR #115でも完了結果が記録されている。ここでは**再監査ではなくEvidence normalization**を行う。

### 1. Curriculum audit inventory

`validate:curriculum`が要求するrepository curriculum documentsを母集団として確認した既存auditを正規化し、次の分類を維持する。

- Learner Required Common
- learner-facing Native specialization
- Repository-required support asset

`03_instructor-reference.md`をLearner Requiredとして扱わない。

Optional Agentic QA / Legacy Capstoneは、Required navigationへ誤認されないかだけを対象とする。

### 2. Specification audit inventory

既存auditは`git ls-files docs/spec`からGit-tracked Markdown / text contractを母集団とし、image / binary / generated visual assetを母集団外として実施済みとして扱う。

merge-ready判定前に、既存audit evidenceから次だけを本Planへ正規化する。

- audit baseline
- text contractの `audited X / total X`
- 実際に発生したSpecification Finding数
- Specification Findingがある場合のDisposition

既存Evidenceで件数を確定できない場合だけ、inventoryの数え直しを行う。全Spec本文を最初から再監査しない。

問題がないfileごとの`no_change` Findingを作らない。全Product behaviorのCurrent implementation conformance auditへ広げない。

### 3. Finding normalization

Curriculum Findingは、実装済み / review correction対象を問わず、必要なものについて次を一意に確認できるようにする。

- ID
- exact `path`
- heading / section
- current state
- problem
- impact
- severity (`P0` / `P1` / `P2` / `P3`)
- disposition (`fix_now` / `defer`)
- minimum fix
- related contract
- validation
- state (`resolved` / `review_followup` / `defer` / `blocked`)

既に解消済みのFindingを再実装しない。`review_followup`だけをcurrent correction対象にする。

### 4. Instructor migration map

既存実装で行った`03_instructor-reference.md`の仕分け結果を、必要な範囲で次の分類へ対応付ける。

- learner-facing learning content → 対象Lesson / Learning Design / README
- learner-facing Self-check / Recovery → 対象Lesson
- learner evaluation criteria → Rubric / 対象Lesson
- environment / account / permission / device support → Instructor Referenceに残してよい
- Repository / Training Copy / Infrastructure / Toolchain support → Instructor Referenceまたは既存public runbook

Learner-facing正本を削除したままsupport側だけ残す状態を認めない。既に正しく移行済みなら再編集しない。

### 5. Terminology Decision Table

既存audit / implementationで実際に使った安定ルールだけを正規化する。新Glossaryは作らない。

| Category | Rule |
| --- | --- |
| 一般learner-facing説明 | 日本語中心 |
| Tool / Product / API / command / path / identifier | 公式literalを維持 |
| Locator / Fixture等の公式用語 | 必要に応じて初出で日本語説明 |
| Common Core / Native specialization / Extension / Reference | classification tokenを維持し、意味をlearner-facingに説明 |
| BR / AC / ID grammar / machine-consumed heading | canonical literalを維持 |
| UI copy | Product上のliteralが判断に必要な場合はそのまま使用 |

将来も安定する最小ルールだけを既存READMEまたは`00_learning-design.md`へ残し、今回だけの語一覧を恒久SSOTへ複製しない。

## Confirmed audit / review findings

以下はCurrent教材・既存PR実装・PR reviewで確認したPR 4AのFindingである。**候補ではなく、current PRを照合するためのreview oracle**として扱う。

| ID | Target / contract | Required outcome | Current state |
| --- | --- | --- | --- |
| `CUR-4A-001` | Learner Required / selected specializationの`確認問題`、Self-check、Recovery、Completion | 知識問題は最低回答要素、Trade-off問題は最低考慮事項と許容理由をLesson単位で示す。long-form Answer Keyは作らない | `review_followup` — self-check追加済み範囲を再利用し、未充足Lessonだけ補正 |
| `CUR-4A-002` | `part1/08_test-management-and-maintainability.md` | Commonをlearner-authored Playwrightの実在保守問題1件 + 最小改善1件へ閉じる | `resolved` — 再実装しない |
| `CUR-4A-003` | `part1/05_playwright-e2e-practice.md` | Core=`Cart / explicit reset / representative Boundary / representative Mobile`、Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution` | `resolved`。ただしCompletionの件数quotaは`CUR-4A-004`で別確認 |
| `CUR-4A-004` | `01_spreadsheet-test-design.md`、P1-3、P1-4、P1-5のPractice Volume / Completion | Test本数 / technique数は練習目安。単独のRequired completion条件にしない | `review_followup` — P1-3は解消済み。残存箇所だけ補正 |
| `CUR-4A-005` | P1-2 / P2-1のExercise / 確認問題 / Self-check / Next action順序 | 実際の順序異常だけを `explanation → exercise → confirmation/checkpoints → self-check/recovery → completion → next action` へ直す | `review_followup` — 全fileテンプレート化は禁止 |
| `CUR-4A-006` | P1-6 Failure Analysis / H98-2〜H98-4 | 既存Failure分類を置換せず、Bug / UX / Suggestion / 未確定、Security成立条件、Evidence整合をboundedに補足 | `resolved`。Security専門Curriculumへ拡張しない |
| `CUR-4A-007` | P1-7 Native specialization | volatile値はSSOTへ誘導。P1 Native RequiredはPhysical Androidのlearner-authored Maestro / stable ID / Test Control / Evidenceへ閉じる | `review_followup` — Current platform / Workflow比較がRequiredへ残っていないかだけ補正 |
| `CUR-4A-008` | P2-2 Git Core | Branch / Diff / CommitをCore、Training Copy provisioning / exact SHA / allowlist / copy mechanicsをInstructor support / Reference | `resolved` — 再実装しない |
| `CUR-4A-009` | P2-3 PR / review | Fork / Remote / Push / PR + material diff self-reviewをCommon。第三者Review / learner provisioning / 件数quotaはRequiredにしない | `resolved` — 再実装しない |
| `CUR-4A-010` | P2-4 CI basics | Trigger / Job / Failure / least privilegeをCore、allowlist / parser / Action pin等repo detailをReference | `resolved`またはno-op。reviewでRequired逆流が見つかった場合だけ補正 |
| `CUR-4A-011` | P2-5 Playwright CI | CommonをTraining Web CI / Artifact / Failure stage・Evidenceへ閉じ、配置設計はP2-7、Current CI topologyはReference | `review_followup` — Completionだけを最小補正 |
| `CUR-4A-012` | P2-6 Native CI specialization | learner-authored Native CI実行、工程別Failure、Artifact、Cost判断をRequiredにし、repo detailをReference | `resolved` — 再実装しない |
| `CUR-4A-013` | P2-7 Quality Gates | Common=`Gate / Artifact / fail-closed`。Level 3相当の改善提案、vendor / production detail、Native比較はAdvanced / Reference | `review_followup` — Completionだけを最小補正 |
| `CUR-4A-014` | P2-8 Capstone成果物 / Completion | Common Required / Native specialization / Advanced-Referenceへ成果物を分類し、CommonをWeb CI / Gate / Artifact / Failure reasoningへ閉じる | `review_followup` — 無条件成果物列挙だけを整理 |
| `CUR-4A-015` | `01_spreadsheet-test-design.md`のRisk ID例 | `RISK-<DOMAIN>-NNN`へ局所整合。validator / Workbook contractは変更しない | `resolved`または既存契約確認済み。再設計しない |
| `CUR-4A-016` | `03_instructor-reference.md` | migration mapに従いsupport-onlyへ整理し、learner-facing正本を先に確保する | `resolved` — reviewで移行漏れがあれば元Finding ownerへ戻す |
| `CUR-4A-017` | `docs/reference/curriculum-self-study-review.md` | reviewer / maintainer向け観点だけを持ち、個別review result / PASS history / Evidence台帳を持たせない | `resolved` — 新しいreview管理機能を追加しない |

### Issue #98 handoff — completed input

Issue #98はhandoff完了・Close済みであり、current progress trackerとして使用しない。

| Input | PR 4A owner | Boundary / disposition |
| --- | --- | --- |
| H98-1 Test Clock / Seed / address / Test Control | `00_learning-design.md`、P1-2、P1-7、review checklist | 既存Findingへ統合済み。値を複製せず既存SSOTへ到達させる |
| H98-2 Bug / UX / Suggestion / 未確定 | P1-6、review checklist | 既存Findingへ統合済み。新Finding DB / taxonomyを作らない |
| H98-3 Security成立条件 | P1-6 | bounded Findingとして統合済み。入力→保存→escape表示→HTML解釈→実行 / sink到達の差だけ扱う |
| H98-4 Evidenceと報告内容の一致 | P1-6、Self-check、review checklist | 既存Findingへ統合済み。専用Evidence台帳を作らない |

## Specification Finding disposition

既存Pre-change auditでは、PR #115の記録上、`docs/spec/**`に実変更を要するSpecification Findingは確認されておらず、PR 4Bは不要とされている。

merge-ready判定前に、本Planへaudit coverage (`audited X / total X`) とFinding数を既存Evidenceから正規化する。新しい判断対象が見つかった場合だけ次を使う。

- `Specification clarification`: Normative Specification自体が曖昧・不足・複数解釈可能、またはProduct Decisionが必要。
- `Product implementation deviation`: 必要な範囲の照合でNormative Specificationは明確だがCurrent implementationが異なる。Specを実装へ合わせない。
- `PR 4B`: canonical terminology / glossary / template不整合等で、semantics-preservingかつboundedに修正できる。
- `no_change`: 問題または判断対象として記録する価値はあるがPR 4A / 4Bで変更不要。問題のないfileを表す用途には使わない。

Specification FindingにはCurriculum用のP0〜P3 severityを付けない。

## Current review gate — merge-readyへ進む条件

Task 0〜7を再実行する代わりに、次を満たす。

1. Current `main` / PR #115 base / headのfreshness確認済み。
2. 既存Pre-change auditの母集団と結果が本Planへ正規化されている。
3. `docs/spec/**` text contractの `audited X / total X` とSpecification Finding数が確認済み。
4. Curriculum Findingが`resolved` / `review_followup` / `defer` / `blocked`へ整理されている。
5. `review_followup`がfinite path / heading / minimum fix / validationへ限定されている。
6. Instructor migrationとstable terminologyの既存実装が正本を重複させていない。
7. unresolved P0/P1 blocker = 0。
8. 必要なP2がboundedに解消されている。
9. current PR diffにProduct / `docs/spec/**` / PR 5 / Formal Test Strategyのscope leakがない。
10. Validationとlearner-route walkthroughがcurrent correction後headで成立している。

P0/P1が未解決のSpecification clarificationまたはcompletion-blocking Product implementation deviationへ依存する場合、**依存するFinding / file / Taskだけを停止**する。独立したreview correctionは継続してよい。ただし関連P0/P1が残る限り、PR 4A全体をmerge-readyにしない。

## Task 2 — Root-level implementation contract / review oracle

対象:

- `README.md`
- `00_learning-design.md`
- 必要な場合のみ`02_competency-rubric.md`

既存実装を維持し、次のいずれかがある場合だけ追加修正する。

1. unresolved `review_followup`がroot fileをtargetにする。
2. Instructor migrationの移行漏れが確認された。
3. stable language / terminology ruleの保存先が不足している。

PR #103のCommon / Native / route / prior-knowledge / competency contractを一般的に書き直さない。Lesson fileの修正は各Finding ownerへ戻す。

## Task 3 — Learner-facing curriculum implementation contract / review oracle

既存実装を再作成せず、以下の契約との差分だけを修正する。

### Entry / shared material

- `01_spreadsheet-test-design.md`
  - Risk → Test Case → Layer / Tool → Evidenceのtraceabilityを維持する。
  - `RISK-<DOMAIN>-NNN` / `TC-<DOMAIN>-NNN`のcanonical grammarへ局所整合する。
  - Test件数 / technique数をPractice Volumeとして扱い、単独のRequired completion条件から外す。
  - 確認問題へ最低Self-checkポイントを持たせる。

### Part 1

- P1-1: entry learner向けにautomationの目的 / 限界 / automationしない判断を自己確認可能にする。
- P1-2: Role / State / User Journey / Seed / Resetを分析し、既存SSOTへ到達できるようにする。実際に順序異常がある場合だけExercise → confirmation → Self-check / Recovery → Completion → Next actionへ整える。
- P1-3: technique数quotaではなくRisk / Specificationに適したtechnique選択と理由を中心にする。
- P1-4: JavaScript / TypeScript bridge、Playwrightの基本概念、`test` / `page` / Locator / Action / Assertionを、Playwright未経験・programming非必須のentry learnerが初見で理解できる深さにする。Test本数をCompletionの単独条件にしない。
- P1-5: Core=`Cart / explicit reset / representative Boundary / representative Mobile`。Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution`。件数ではなくCoreのlearner-authored exercise / EvidenceでCompletionを判断する。
- P1-6: meaningful failure diagnosisをCompletion Evidenceへ接続する。H98-2〜H98-4をboundedに統合し、既存technical failure classificationは置換しない。
- P1-7: Native specialization。Common prerequisite、start gate、Physical Android canonical path、learner-authored Maestro / Test Control / Evidence、skip / rejoinを明示する。volatile値はSSOTへ戻す。Current iOS / Workflow比較をP1 Native Requiredへ混ぜない。
- P1-8: Common=`real Playwright maintainability issue 1件の診断 + reasoned minimal improvement 1件`。Playwright-onlyで成立させる。POM / Helper / Fixture / Flow pattern catalogはReference。Lifecycle / Regression inventoryはPart 2 bridge。Native比較はoptional。
- P1-9: concise Web Common Capstone。Native specialization evidenceとBaseline / learner-authored evidenceを分離し、P1-8のmaintainability責務を再度追加しない。

### Part 2

- P2-1: development / change flowをCoreとし、実際に順序異常がある場合だけExercise → confirmation → Self-check / Recovery → Completion → Next actionへ整える。
- P2-2: Branch / Diff / CommitをCore。Training Copy provisioning / exact SHA / allowlist / copy mechanicsはInstructor support / Reference。
- P2-3: Fork / Remote / Push / PRをCommon。提供済みrepoまたは自分のForkを使用し、material diffをpublic criteriaでself-reviewする。第三者Review、learner自身によるprovisioning、件数quotaはRequiredにしない。
- P2-4: Trigger / Job / Failure / least privilegeをCore。allowlist / parser / Action pin / exact repository detailはReference。
- P2-5: Training Web CI、Artifact、Failure stage / EvidenceをCommon。PR / main / Nightly配置設計はP2-7へ、Current Scenario Shop CI topologyの説明はReferenceへ寄せる。
- P2-6: Native specialization。learner-authored Native CI実行、Build / Runtime / TestのFailure切り分け、Artifact / Evidence、Cost判断をRequiredにする。Current Job topology / API Level / Trigger / metadata / guard等はReference。skip / rejoinを明示する。
- P2-7: Gate / Artifact / fail-closedをCommon。vendor / Preview / Production / Deploy detail、Native platform差、CI改善提案はAdvanced / Referenceへ置き、Level 3相当の改善提案をCommon Requiredにしない。
- P2-8: Web CI / Gate / Artifact / Failure reasoningをbounded Common Capstoneとする。成果物をCommon Required / Native specialization / Advanced-Referenceへ明示分類し、Android / iOS / full CDをCommon成果物へ無条件列挙しない。

### Self-study implementation rule

Learner Required / selected specializationでは、必要な箇所だけ次を満たす。

- start condition
- goal / explanation
- Exercise / Practice
- Evidence
- confirmation / Self-check
- Recovery
- Completion
- Next action

確認問題は次で実装する。

- 知識・確認問題: 回答に最低限含むべき具体的要素、または短い回答例 + 理由。
- 設計・Trade-off問題: 一意の模範解答を作らず、最低考慮事項と許容できる判断理由の条件。
- Specification参照問題: BR / AC / sectionを特定。
- command / test / validator / artifact確認: success / learning failure / Environment blockをLearnerが区別できるようにする。

全fileへ同じheadingセットを強制しない。既存構造で成立している場合は必要な不足だけ補う。

## Task 4 — Instructor Reference implementation contract / review oracle

既存`03_instructor-reference.md`のsupport-only整理を維持し、移行漏れだけを修正する。

残してよい責務:

- environment
- account / permission
- device
- Training Copy / Repository provisioning
- Infrastructure / Toolchain troubleshooting

残してはいけないもの:

- non-public Answer Key
- learner completionの正本
- learner evaluationの独自基準
- learner-facing learning / Self-check / Recoveryの重複正本

移行漏れを見つけた場合は、Instructor Reference内へ説明を足すのではなく元のFinding ownerへ戻す。

## Task 5 — Continuous learner review checklist implementation contract

既存`docs/reference/curriculum-self-study-review.md`を維持し、個別review resultを管理する仕組みへ拡張しない。

最低限確認する:

- audience / prerequisite depth
- navigation / skip / branch / rejoin
- hidden prerequisite
- goal → explanation → Exercise → Evidence → Self-check → Completion
- answerability without Instructor private knowledge
- Recovery
- Common / Extension / Reference / specialization boundary
- command / Artifact / Environment block
- terminology
- spec reference safety
- 専門的なFindingを断定するための成立条件とEvidence

個別review result、reviewer、日付、PASS履歴、Finding、Evidence、progressを保存する欄は作らない。

## Task 6 — Validator / contract change（原則N/A）

次のどちらかの場合だけ変更する。

A. PR 4Aで既存machine contractそのものを変更する必要が生じた。

B. PR 4Aで解消するstableなP0/P1 regressionを、自然言語表現をfreezeせずにguardできる。

それ以外はN/Aとする。

禁止:

- 日本語文言のexact match test
- prose depth / readability test
- Self-check文章のexact heading / wording test
- Instructor Referenceのexact prose test
- 「念のため」のvalidator refactor

既存PRでvalidator / contract差分がないなら、review correctionを理由に新規追加しない。

## Task 7 — Current-head validation / learner-route walkthrough

全面実装後の検証を再現するのではなく、**current correction後head**で必要なValidationを行う。

### Automated

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
git diff --check
```

Conditional:

- `pnpm run validate:spec`: spec / spec contractを実際に変更した場合のみ。PR 4Aでは原則不要。
- `pnpm run typecheck`: TypeScript validator / contractを実際に変更した場合のみ。

既存CIでより広いcheckを実施済みでも、その事実だけでPlanのRequired validationを恒久的に増やさない。

### Manual walkthrough

`docs/reference/curriculum-self-study-review.md`の観点を**このwalkthroughの中で使用**し、別の重複review passを作らない。共通prefixは1回確認し、branch差分だけ追加確認する。

Shared entry:

`README → 00_learning-design → 01_spreadsheet-test-design → P1-1`

Part 1 Common:

`P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → [P1-7 skip] → P1-8 → P1-9`

Part 1 Native:

`P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 → P1-7 → P1-8 → P1-9`

Part 1 → Part 2 bridge:

`P1 completion → 00_learning-designの移行説明 → P2-1`

Part 2 Common:

`P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → [P2-6 skip] → P2-7 → P2-8`

Part 2 Native:

`P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7 → P2-8`

### Manual assertions

- CommonがNative / Extension / Reference未受講で完了できる。
- Native branch / skip / rejoinが一意。
- Part 1 Common=`C01〜C07 + C09〜C10`、Part 2 / Final Common=`C01〜C07 + C09〜C12`、C08=Native specializationがREADME / Learning Design / Rubric / Lesson Completionで一致する。
- Practice Volumeの件数 / technique数が単独の合否条件へ逆流していない。
- P1-5のCore / Extension境界がMaster Planどおり。
- P1-8がPlaywright-onlyの1問題 + 1最小改善でCommon completion可能。
- P2-2 / P2-4 / P2-5 / P2-6 / P2-7 / P2-8でRepository固有詳細がRequiredへ逆流していない。
- 確認問題をLearner自身で採点できる最低チェックポイントがある。
- learning-flowのNext actionがExercise / Self-check / Completionより前へ置かれていない。
- environment支援後、Learnerがpublic materialだけで再開位置を判断できる。
- command / artifact確認がlearning failureとEnvironment blockを区別する。
- Instructor Referenceがsupport-only。
- Optional / Legacy / Instructor assetをLearner Requiredと誤認しない。
- `docs/spec/**`のPR 4A実変更がない。
- 実際のSpecification Findingがある場合、Dispositionが正しい。
- PR 5 / Product / Formal Test Strategyの実装を前倒ししていない。

## Stop conditions

以下を推測で解消しない。

- Normative Specification自体が曖昧 / 不足 / 複数解釈可能。
- Product Decision / Product behavior変更が必要。
- 明確なSpecとCurrent implementationのdeviationがLearner completionを阻害する。
- PR #103 fixed contractと矛盾する変更が必要。
- PR 4A bounded scopeを超え、PR 5 / Security Curriculum / Product改修へ広がる。
- `docs/spec/**`の実変更が必要。

停止単位は原則として**blockerへ依存するFinding / file / Task**とする。独立したreview correctionは継続してよい。Root canonical ambiguityが広範囲へ影響する場合だけ依存範囲全体を停止する。

未解決P0/P1 blockerが1件でも残る場合、PR 4Aをmerge-ready扱いにしない。

## Definition of Done

- 既存Pre-change audit / implementation evidenceが本Planのcurrent stateと矛盾しない。
- Curriculum Findingがfinite path / heading / minimum fix / validationとcurrent stateを持つ。
- unresolved P0/P1 blocker = 0。
- DoDに必要なbounded P2が解消されている。
- `docs/spec/**` text auditが`audited X / total X`でcoverage確認されている。
- CommonがNative / Extension / Referenceなしで成立する。
- selected Native specializationがlearner-facing materialだけで開始・実行・自己確認・復帰できる。
- Practice Volume、Repository固有provisioning / copy mechanics / Current CI topologyがRequired completionへ逆流していない。
- 確認問題がSelf-study可能な最低判定基準を持つ。
- Instructor Referenceがsupport-onlyで、learner-facing情報の移行漏れがない。
- stable language / terminology ruleが既存READMEまたはLearning Designへ最小反映されている。
- reviewer checklistがTask 7 route walkthrough内で使用可能である。
- `docs/spec/**`にPR 4A実変更がない。
- current correction後headでRequired automated validationがPASSしている。
- unrelated cleanup / refactor / rename / directory migrationがない。
- proseをfreezeする不要なvalidator / contract testを追加していない。
- PR #115のdiffが本Planの`resolved` + `review_followup`のbounded outcomeに限定されている。
- self-review後、PR #115をmerge-readyと判断できる。merge自体はユーザー承認まで行わない。

## Current execution order

1. Current `main` / PR #115 base / headのfreshnessを確認する。
2. 既存Pre-change audit evidenceを本Planへ正規化する。**全面再監査はしない**。
3. `Confirmed audit / review findings`をcurrent PR差分へ照合する。
4. `review_followup`だけをfiniteなbounded correctionとして修正する。
5. `resolved` Findingを再実装しない。
6. Instructor Reference / checklist / root文書は残存不整合がある場合だけ触る。
7. current correction後headでRequired automated validationを実行する。
8. shared entry / bridge + Common / Native route walkthroughを1回行う。
9. Final freshness / scope review → PR #115 merge-ready判定 → Tracking Issue更新。

## Follow-up boundary

- Pilot実測値は実測なしのまま別pilot / measurement計画へ送る。
- Native runner / workflow / Artifact contract、Training failure executable flowはPR 5または既存ownerへ戻す。
- Preview / Production / full multi-platform delivery、第三者Review、Security専門教育はCommon completionへ追加しない。
- Specification clarificationやProduct deviationが新たに確認された場合はPR 4Aへ混ぜず、対象ownerの別Issue / PRへhandoffする。
