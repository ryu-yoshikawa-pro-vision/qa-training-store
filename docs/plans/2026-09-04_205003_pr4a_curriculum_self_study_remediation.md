# PR 4A child Plan: Curriculum Core / Extension / Reference / Self-study remediation

## Status

- 状態: **Plan reviewed / Ready for Pre-change audit**
- 実装開始: **No**
- Pre-change audit: **未完了。Task 1のHard Gateを満たすまでCurriculum実装へ進まない**
- 作業branch: `docs/pr4a-curriculum-self-study-remediation`
- 本PlanはPR 4Aの実装判断SSOTとし、別の監査台帳・Glossary・Finding DBは作成しない

## Goal

Issue #98を単独の教材・報告・チェックリストへ複製せず、Master PlanのPR 4Aへ引き渡す。PR #103で固定されたDecision B / Competency / Assessment Contractを維持したまま、Learner Required pathとlearner-facing Native specializationの自己学習品質をboundedに改善する。

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

以下はTask 1で実不整合を確認しない限りPR 4Aで再設計しない。

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
- Issue #98 H98-1〜H98-4のboundedなCurriculum取り込み
- `docs/reference/curriculum-self-study-review.md`の再利用可能checklist
- `docs/spec/**`のGit-tracked Markdown / text contractに対するterminology / wording / internal consistency / semantic safety audit。PR 4Aでは実変更しない
- 監査結果から得られた将来も安定する最小のlanguage / terminology ruleを既存READMEまたは`00_learning-design.md`へ反映する

### Out of scope

- Product behavior、Seed Data、Test Clock、Test Control protocol、address lookupの変更
- `docs/spec/**`の実変更、PR 4B実装、Specification clarificationの推測解消
- Security Curriculum全般、XSS専門Lesson、脆弱性判定DB
- Formal Test Strategyの再設計
- Training runner / workflow / Artifact contract、PR 5の実行基盤
- Curriculum全面rewrite、P2/P3の無制限cleanup
- 新LMS、DB、Scoring基盤、Finding DB、監査台帳、第三SSOT、新Glossary
- ラベル改善で足りる場合のrename / directory migration

## Simplicity principles

実装量を増やさないため、次を固定する。

1. **1 file ≒ 1 remediation pass** とし、同じfileをnavigation / terminology / self-study等で何度も編集しない。
2. Root文書はconfirmed Finding、Instructor migration、またはstable terminology ruleがある場合だけ変更する。PR #103契約を「念のため」書き直さない。
3. 既存Lesson構造が成立している場合、統一テンプレートへ強制しない。
4. 見出しを残すためだけの説明追加、文章量を増やすだけの変更は禁止する。
5. Practice Volumeの件数・technique数は練習量の目安として残してよいが、Rubricが要求しない限り単独のRequired completion条件にしない。
6. Current Repository固有のSHA、Job名、API Level、allowlist、Workflow topology等は学習目的に必要な場合だけReferenceとして残し、暗記をCompletionにしない。
7. long-form Answer Keyを新設しない。確認問題はLesson単位の最低Self-checkポイントで自己採点可能にする。
8. prose品質をvalidator / contract testでfreezeしない。
9. file rename / directory migrationより、classification label / navigation修正を優先する。
10. Product / Spec / Training基盤を教材都合で変更しない。

## Task 0 — Baseline / freshness check

実装前にCurrent `main`とbranchの関係をread-onlyで確認する。

- Current `main` SHAを本Planへ記録する。
- PR #103 fixed contractがCurrent `main`で維持されていることを確認する。
- Current `main`がaudit準備後に進んでいる場合、Curriculum / Spec / validator / contract / Training入口に関係する差分だけ再確認する。
- 無関係なmain更新だけを理由にfull auditをやり直さない。
- 実装対象外の差分をPR 4Aへ取り込まない。

## Task 1 — Pre-change audit（実装禁止）

Task 1が完了するまでCurriculum / Referenceの実装変更を行わない。

### 1. Curriculum audit inventory

`validate:curriculum`が要求する**22件のrepository curriculum documents**を母集団として確認し、次へ分類する。

- Learner Required Common
- learner-facing Native specialization
- Repository-required support asset

`03_instructor-reference.md`をLearner Requiredとして扱わない。

加えてOptional Agentic QA / Legacy Capstoneは、Required navigationへ誤認されないかだけ確認する。

Learner Required path、selected specialization、Instructor Referenceは全文を確認する。各fileでは必要に応じて次を見る。

- start condition / prerequisite
- goal / explanation depth
- Exercise / Practice
- confirmation question / Self-check
- Recovery
- Completion
- Next action
- Common / specialization / Extension / Reference boundary
- terminology
- internal link / command / path / identifier

### 2. Specification audit inventory

- `git ls-files docs/spec`からGit-tracked fileを取得する。
- そのうちMarkdown / text contractだけをaudit母集団にする。
- image / binary / generated visual assetは母集団外とし、N/A件数へ含めない。
- Task 1完了時に本Planへ `audited X / total X` を記録する。
- 既存のcanonical indexへ対応付けられる場合は、そのindexをcoverageの根拠として利用する。
- 問題がないfileごとの`no_change` Findingを作らない。
- 全Product behaviorのCurrent implementation conformance auditへ広げない。

### 3. Finding finalization

Curriculum Findingは実装前に次を満たす粒度へ確定する。

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
- state

`fix_now`は必ず有限の`path + heading / section`へ落とす。実装者が再分析しないと変更箇所を決められないFindingはHard Gate未達とする。

### 4. Instructor migration map

`03_instructor-reference.md`の全sectionを次へ分類する。

- learner-facing learning content → 対象Lesson / Learning Design / README
- learner-facing Self-check / Recovery → 対象Lesson
- learner evaluation criteria → Rubric / 対象Lesson
- environment / account / permission / device support → Instructor Referenceに残してよい
- Repository / Training Copy / Infrastructure / Toolchain support → Instructor Referenceまたは既存public runbook

Learner-facing contentは移動先へ反映してからInstructor Reference側を削除 / 参照化する。恒久的な重複を残さない。

### 5. Terminology Decision Table

Task 1で実際に判断が必要な語だけを記録する。新Glossaryは作らない。

最低限の安定ルール:

| Category | Rule |
| --- | --- |
| 一般learner-facing説明 | 日本語中心 |
| Tool / Product / API / command / path / identifier | 公式literalを維持 |
| Locator / Fixture等の公式用語 | 必要に応じて初出で日本語説明 |
| Common Core / Native specialization / Extension / Reference | classification tokenを維持し、意味をlearner-facingに説明 |
| BR / AC / ID grammar / machine-consumed heading | canonical literalを維持 |
| UI copy | Product上のliteralが判断に必要な場合はそのまま使用 |

監査後、将来も安定する最小ルールだけを既存READMEまたは`00_learning-design.md`へ反映する。

## Preliminary audit candidates

以下はPlanレビュー時点でCurrent教材から確認した**候補**であり、Task 1でCurrent `main`へ再照合し、exact heading / severity / minimum fix / validationを確定する。新しいscopeを作るためではなく、監査漏れを防ぐ入力として扱う。

| ID | Candidate target | Problem | Intended minimum fix |
| --- | --- | --- | --- |
| `CUR-4A-001` | Learner Required / selected specializationの`確認問題`、Self-check、Recovery、Completion | 回答・成果物をLearner自身で判定できない箇所がある | 知識問題は回答に最低限含む要素、Trade-off問題は最低考慮事項と許容理由をLesson単位で示す。長いAnswer Keyは作らない |
| `CUR-4A-002` | `part1/08_test-management-and-maintainability.md` | CommonがMaestro / Native資産を暗黙前提にする可能性 | Commonをlearner-authored Playwrightの実在保守問題1件 + 最小改善1件へ閉じる |
| `CUR-4A-003` | `part1/05_playwright-e2e-practice.md` | Core / Extension境界が曖昧 | Core=`Cart / explicit reset / representative Boundary / representative Mobile`、Extension=`Payment / Cross-role / Internal Inspection / Accessibility execution` |
| `CUR-4A-004` | `01_spreadsheet-test-design.md > 完了条件`、`P1-3 > ハンズオン / 完了条件`、`P1-4 > 完了条件`、`P1-5 > 完了条件` | Test本数 / technique数がPractice VolumeなのにRequired completionとして残る箇所がある | 件数は練習目安へ下げ、Risk / Spec fit、learner-authored evidence、代表的なRisk coverageでCompletionを判定する |
| `CUR-4A-005` | `part1/02_scenario-shop-analysis.md`、`part2/01_software-development-process.md`のExercise / 確認問題 / Self-check / Next action順序 | Self-check / Next actionがExerciseや確認問題より前に置かれる箇所がある | 実際の順序異常だけを `explanation → exercise → confirmation/checkpoints → self-check/recovery → completion → next action` へ並べ直す。全fileへテンプレート強制しない |
| `CUR-4A-006` | `part1/06_execution-and-failure-analysis.md` | Bug / UX / Suggestion / 未確定、Security成立条件、Evidence整合が自己学習上不足 | 既存Failure分類を置換せずboundedな補足を追加。Security専門Lessonへ拡張しない |
| `CUR-4A-007` | `part1/07_maestro-native-automation.md` | volatileなTest Control値の複製、P1 Native completionへのCurrent platform guarantee混入の可能性 | 値は既存SSOTへ誘導。P1 Native RequiredはPhysical Androidでのlearner-authored Maestro / stable ID / Test Control / Evidenceへ閉じ、Current iOS / Workflow比較はReferenceまたはP2-6へ寄せる |
| `CUR-4A-008` | `part2/02_git-version-control.md` | Training Copy exact SHA / allowlist / copy mechanicsがCommonへ混入 | Branch / Diff / CommitをCore、provisioning / copy mechanicsをInstructor support / Reference |
| `CUR-4A-009` | `part2/03_github-pull-request-review.md` | 第三者Review、件数quota、environment provisioningがCompletionへ混入する可能性 | Fork / Remote / Push / PR + material diff self-reviewをCommonとし、第三者Reviewとlearner provisioningを必須にしない |
| `CUR-4A-010` | `part2/04_ci-github-actions.md` | allowlist / parser / Action pin等のRepository固有詳細がCoreと同じ深さ | Trigger / Job / Failure / least privilegeをCore、repo detailをReference |
| `CUR-4A-011` | `part2/05_playwright-ci.md` | Test配置やCurrent Repository CI設計がP2-5 Completionへ混入 | CommonをTraining Web CI / Artifact / Failure stage・Evidenceへ閉じ、Test配置はP2-7、Current CI構成はReference |
| `CUR-4A-012` | `part2/06_native-ci-maestro.md` | Current Job topology / API Level / Trigger / guard等がspecialization completionへ混入 | learner-authored Native CI実行、工程別Failure、Artifact、Cost判断をRequiredにし、repo detailをReference |
| `CUR-4A-013` | `part2/07_ci-cd-quality-gates.md` | Preview / Production / Native detailとLevel 3相当の改善提案がCommon completionへ混入 | Common=`Gate / Artifact / fail-closed`。改善提案、vendor / production detail、Native比較はAdvanced / Reference |
| `CUR-4A-014` | `part2/08_integration-design-capstone.md > 記録する成果物 / Completion` | final Commonはbounded WebなのにAndroid / iOS / full delivery成果物が無条件列挙される | 成果物をCommon Required / Native specialization / Advanced-Referenceへ分類し、CommonをWeb CI / Gate / Artifact / Failure reasoningへ閉じる |
| `CUR-4A-015` | `01_spreadsheet-test-design.md`のRisk ID例 | `RISK-<DOMAIN>-NNN` contractと不一致の例がある | `RISK-CART-001`へ局所修正。validator / Workbook contractは変更しない |
| `CUR-4A-016` | `03_instructor-reference.md` | learner-facing learning / evaluation / Recoveryがsupport assetへ残る可能性 | migration mapに従い、support-onlyへ整理。learner-facing正本を先に確保する |
| `CUR-4A-017` | `docs/reference/curriculum-self-study-review.md` | 継続的な受講者視点checklistが未整備 | reviewer / maintainer向け観点だけ追加。個別review result / PASS history / Evidence台帳は持たせない |

### Issue #98 handoff candidates

| Input | PR 4A owner | Boundary |
| --- | --- | --- |
| H98-1 Test Clock / Seed / address / Test Control | `00_learning-design.md`、P1-2、P1-7、review checklist | 値を複製せず既存SSOTへ到達させる。Product / Seed / protocol変更なし |
| H98-2 Bug / UX / Suggestion / 未確定 | P1-6、review checklist | 新Finding DB / taxonomyを作らず、断定前のlearner-facing判断として統合 |
| H98-3 Security成立条件 | P1-6 | 入力→保存→escape表示→HTML解釈→実行 / sink到達の差を最小説明。Security Curriculumへ拡張しない |
| H98-4 Evidenceと報告内容の一致 | P1-6、Self-check、review checklist | 専用Evidence台帳を作らず、対象・操作・事象・Evidenceの一致と断定回避を扱う |

## Specification Finding disposition

Specification Findingは実際に判断対象が見つかった場合だけ作成する。

- `Specification clarification`: Normative Specification自体が曖昧・不足・複数解釈可能、またはProduct Decisionが必要。
- `Product implementation deviation`: 必要な範囲の照合でNormative Specificationは明確だがCurrent implementationが異なる。Specを実装へ合わせない。
- `PR 4B`: canonical terminology / glossary / template不整合等で、semantics-preservingかつboundedに修正できる。
- `no_change`: 問題または判断対象として記録する価値はあるがPR 4A / 4Bで変更不要。問題のないfileを表す用途には使わない。

Specification FindingにはCurriculum用のP0〜P3 severityを付けない。

## Hard Gate — Task 2以降へ進む条件

次をすべて満たすまで実装を開始しない。

1. Task 0 baseline / freshness確認済み。
2. Learner Required Common、selected specialization、Instructor Referenceのaudit scopeを全文確認済み。
3. `docs/spec/**` text contractが `audited X / total X` でcoverage確認済み。
4. 全Curriculum FindingがP0〜P3 + `fix_now` / `defer`へ分類済み。
5. 全`fix_now`がexact path + heading / section + minimum fix + validationまで有限化済み。
6. 実際に発生した全Specification FindingへDispositionがある。
7. Instructor migration mapが確定済み。
8. Terminology Decision Tableが確定済み。
9. unresolved blockerと、それに依存するFinding / file / Taskの境界が明示済み。
10. 必要なP2がboundedに実装できない場合、単にsizeを理由にdeferせずscopeを再検討済み。

P0/P1が未解決のSpecification clarificationまたはcompletion-blocking Product implementation deviationへ依存する場合、**依存するFinding / file / Taskだけを停止**する。独立したPR 4A remediationは継続してよい。ただし関連P0/P1が残る限り、PR 4A全体をcompletion / merge-readyにしない。

## Task 2 — Root-level confirmed findings / migrations only

対象候補:

- `README.md`
- `00_learning-design.md`
- 必要な場合のみ`02_competency-rubric.md`

次のいずれかがある場合だけ変更する。

1. confirmed `fix_now` Findingがroot fileをtargetにする。
2. Instructor migration mapの移動先である。
3. Master Planで必要なstable language / terminology ruleを既存責務へ保存する必要がある。

PR #103のCommon / Native / route / prior-knowledge / competency contractを一般的に書き直さない。Lesson fileはTask 2で編集しない。

## Task 3 — Learner-facing curriculum remediation

各fileを原則1回のpassで処理し、classification / learning flow / Self-check / terminologyを同時に閉じる。

### Entry / shared material

- `01_spreadsheet-test-design.md`
  - Risk → Test Case → Layer / Tool → Evidenceのtraceabilityを維持する。
  - `RISK-<DOMAIN>-NNN` / `TC-<DOMAIN>-NNN`のcanonical grammarへ局所整合する。
  - Test件数 / technique数をPractice Volumeとして扱い、単独のRequired completion条件から外す。
  - 確認問題へ最低Self-checkポイントを追加する。

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

## Task 4 — Instructor Reference finalization

Task 2 / Task 3のlearner-facing移動先を先に完成させてから`03_instructor-reference.md`をsupport-onlyへ整理する。

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

Task 4で移動先Lessonを再編集しない。移行漏れを見つけた場合は元のFinding ownerへ戻す。

## Task 5 — Continuous learner review checklist

`docs/reference/curriculum-self-study-review.md`を追加する。

対象はreviewer / maintainer向けの再利用観点だけとする。

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

## Task 7 — Validation / learner-route walkthrough

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

停止単位は原則として**blockerへ依存するFinding / file / Task**とする。独立したremediationは継続してよい。Root canonical ambiguityが広範囲へ影響する場合だけ依存範囲全体を停止する。

未解決P0/P1 blockerが1件でも残る場合、PR 4Aをcompletion / merge-ready扱いにしない。

## Definition of Done

- Task 0 / Task 1とHard Gateが完了している。
- Curriculum Findingがfinite path / heading / minimum fix / validationを持つ。
- unresolved P0/P1 blocker = 0。
- DoDに必要なbounded P2が解消されている。
- `docs/spec/**` text auditが`audited X / total X`でcoverage確認されている。
- CommonがNative / Extension / Referenceなしで成立する。
- selected Native specializationがlearner-facing materialだけで開始・実行・自己確認・復帰できる。
- Practice Volume、Repository固有provisioning / copy mechanics / Current CI topologyがRequired completionへ逆流していない。
- 確認問題がSelf-study可能な最低判定基準を持つ。
- Instructor Referenceがsupport-onlyで、learner-facing情報の移行漏れがない。
- stable language / terminology ruleが既存READMEまたはLearning Designへ最小反映されている。
- reviewer checklistが追加され、Task 7 route walkthrough内で使用されている。
- `docs/spec/**`にPR 4A実変更がない。
- automated validationがPASSしている。
- unrelated cleanup / refactor / rename / directory migrationがない。
- proseをfreezeする不要なvalidator / contract testを追加していない。
- self-review後、base `main`向けOpen PRを作成する。mergeは行わない。

## Execution order

1. Task 0 — baseline / freshness
2. Task 1 — full Pre-change audit、Spec text inventory、finite Findings、Instructor migration、Terminology、blocker dependency boundary
3. **Hard Gate**
4. Task 2 — confirmed root Finding / migration / stable terminology only
5. Task 3 — learner-facing filesを1 file ≒ 1 passでremediation
6. Task 4 — Instructor Reference support-only finalization
7. Task 5 — reusable self-study review checklist
8. Task 6 — conditional validator / contract（通常N/A）
9. Task 7 — automated validation + shared entry / bridge + four route walkthroughs
10. Final freshness / scope review → PR作成 → Tracking Issue更新

## Follow-up boundary

- Pilot実測値は実測なしのまま別pilot / measurement計画へ送る。
- Native runner / workflow / Artifact contract、Training failure executable flowはPR 5または既存ownerへ戻す。
- Preview / Production / full multi-platform delivery、第三者Review、Security専門教育はCommon completionへ追加しない。
- Specification clarificationやProduct deviationが新たに確認された場合はPR 4Aへ混ぜず、対象ownerの別Issue / PRへhandoffする。
