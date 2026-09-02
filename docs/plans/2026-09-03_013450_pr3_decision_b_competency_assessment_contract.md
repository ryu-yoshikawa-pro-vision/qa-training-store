# PR 3 — Decision B / Competency / Assessment Contract

## Goal

PR #78 merge後の最新 `main` を基準に、Master Planで固定済みのDecision Bを、能力・修了・評価・Learner Required / Native specialization境界のCanonical Contractとして一意化する。

このPRの実装対象は、Curriculum本文の全面改善ではなく、以下の最小契約同期に限定する。

- コース開始時の対象受講者像とCommon Coreが前提にできる既習知識
- Part 1 / Part 2のCommon completion能力集合
- C08 Native Automation specializationの位置づけ
- Native specializationのbranch / skip / rejoin / prerequisite navigation contract
- Repository-required assetとLearner Required pathの区別
- learner-facing RubricとC01〜C12 Minimum Evidence
- Baseline PASSとLearner-authored competency evidenceの区別
- Instructor Referenceのtransitional boundary
- 上記Canonical Contractを守る最小限のcontract test

Product behavior、Product Native CI Gate、Training runner / workflow / Artifact実装は変更しない。

## Current understanding

- Audit baseline: `main` at `b36c4d3e0f631801a9c9e4aae38990dac9e8d436`
  - `docs: Formal Test Strategy / Traceability を Current contract に整合する (#78)`
- Planning branch: `docs/decision-b-competency-assessment-contract`
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- PR #78でFormal Test Strategy / TraceabilityのCurrent contractは整備済み。PR 3はC05等からそのSSOTを参照し、Test Level / Perspective / Execution・Platform Gateを再定義しない。
- Current ADRは`0019`まで存在し、Decision Bと競合するCurrent ADR / normative requirementは監査範囲では確認されなかった。PR 3の次ADR候補は `docs/adr/0020-test-automation-curriculum-native-specialization.md`。
- Current validatorのrequired-file listはrepository asset existence contractであり、Learner Required pathやCommon graduationを意味していない。C08をCommon completionへ要求するexecutable assertionも確認されなかった。
- Current contract testはCurriculum / Trainingの構造・境界を一部固定しているが、Decision Bの正確なCommon能力集合、C08 specialization、branch / skip / rejoin、Baseline vs learner-authored evidence等を固定していない。
- Current TrainingにはWeb / Native baseline commandとlearner exercise assetsが存在するが、Native learner-authored exercise専用runner / Artifact生成の完成契約はまだない。PR 3は既存実態に接続するMinimum Evidenceを定義し、実行入口・workflow・Artifact実装はPR 5へ残す。
- このplanning runはGitHub上のCurrent sourceを監査した。実行環境にrepository cloneがなく、GitHubへの直接cloneもDNS制約で失敗したため、ローカルworking tree preflightと`pnpm` baseline commandsは実行できていない。PR 3実装開始前に、実装者環境で必ず再実行する。

## Assumptions

- Master PlanのFixed decisionsは再議論対象ではなく、Current sourceと明確に競合しない限りそのままPR 3へ落とす。
- PR 1 / PR 2でCurrent化されたProduct / Formal contractは変更せず、PR 3はCurriculum contract側を整合する。
- Repository-required assetは「repositoryに存在すべきファイル」であり、Learner Required material / Common completion requirementとは別概念。
- Minimum EvidenceはCurrent Curriculum / workbook / exercise / Training entryの実在要素に接続して定義する。ただし、canonical command / runner / workflow / Artifact生成の不足はPR 5で解消する。
- Lesson本文のdepth / practice / self-check / recovery改善はPR 4Aで扱い、PR 3ではCanonical boundaryに直接矛盾する文面だけを最小修正する。
- `tests/contracts/training-curriculum.test.ts` は既存のfile-content contract styleを維持し、新しいCurriculum parser / schema / frameworkは導入しない。

## Fixed decisions

### Learner entry profile

コース開始時の対象受講者像をREADME / Learning Designで一意にする。

- テスト自動化の基本理解がある
- ノーコード / ローコード経験または理解は可
- Playwright等のコードベース自動化は未経験
- プログラミング経験は必須にしない

後続Common Coreが前提にできる既習知識は、次に限定する。

1. 上記コース開始時profile
2. Learner Required path上で、その時点より前に明示的に学んだCommon Core内容

Native specialization、Extension、Reference、教材外のPlaywright / TypeScript / Git / CI実務経験をCommon Coreの隠れ前提にしない。

### Common completion / specialization

- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2
- Part 2 completion / final Common graduation: `C01〜C07 + C09〜C12` bounded Level 2
- `C08`: Native Automation specialization
- C08 / Physical Android / Native CIをPart 1 / Part 2 Common completionに要求しない。

### Native specialization navigation

Top-level Lesson番号・配置は変更しない。learner-facing contractは次で固定する。

- Part 1 Common: `P1-6 → P1-8 → P1-9`
- Part 1 Native specialization: `P1-6 → P1-7 → P1-8 → P1-9`
  - specialization開始前Common prerequisite: P1-6まで
  - specialization内部の前提: P1-7自身に必要なNative実行環境
  - Common Core rejoin: P1-8
- Part 2 Common: `P2-5 → P2-7 → P2-8`
- Part 2 Native specialization: Common prerequisiteを満たした後 `P2-6 → P2-7 → P2-8`
  - P2-6のNative内部prerequisiteはP1 Native specializationで得るMaestro実行能力
  - Common Core rejoin: P2-7
- P2-8のfull Native / multi-platform deliveryはspecialization / Advancedであり、Common Level 2はbounded Web CIに限定する。

### Competency / Minimum Evidence

C01〜C12をlearner-facing Rubricで自己確認できる共通契約にする。外部評価でも同一Rubric / Minimum Evidence / Artifactを用い、Instructor-onlyの非公開Required評価基準は作らない。

- C04: technique数quotaではなく、Spec / Riskに適したtechniqueを選び、理由を説明できることを中心とする。
- C05: PR 2のFormal Test Level / Perspective / Execution・Platform Gate contractを参照し、PR 3側で再定義しない。
- C08: `learner-authored native exercise diff + successful Maestro execution artifact`。stock Native exercise / baselineを未変更でPASSしただけではcompletionにしない。Common graduationには要求しない。
- C09: Assertion typoだけでなく、Locator / Timing / Assertion等のmeaningful diagnostic evidenceを要求する。
- C10: 実在する保守問題の診断 + 理由付きの最小改善をCommon Core Level 2とする。
- C12: Common Level 2はbounded Web CIのTrigger / Gate / Artifact / Failure Evidence。full multi-platform / deliveryはAdvanced / specialization側。
- Baseline PASS / stock flow PASSはenvironment / harness evidenceでありLearner competency completionそのものではない。
- Level定義は「例・ヒント・詳細手順を使った状態」と「自力で実施できる状態」を区別し、Instructor支援を能力レベルの必須前提にしない。

## Non-goals

### PR 4Aへ残す

- Lesson全文の学習体験改善
- Lesson depthの全面修正
- Practice量の調整
- 学習単位の統合・分割
- 日本語 / 英語用語の全面統一
- Core / Extension / Referenceの全文監査
- 各Lessonのself-check改善
- 各LessonのRecovery改善
- Instructor Reference本文の情報仕分け・移行
- 継続的な受講者視点レビュー用チェックリスト
- `docs/spec/**` text audit

### PR 5へ残す

- Training command追加
- learner exercise runner実装
- workflow実装
- Artifact生成実装
- Native learner exercise実行入口
- expected-failure flow実装
- Training CI変更

### 今回行わない

- Product behavior変更
- Product Native CI Gate変更
- Formal regression再設計
- top-level Curriculum file renumber / move
- scoring engine
- AI grader
- 新しいDB
- 新しいCurriculum管理レイヤー
- 新しいCompetency JSON / YAML schema
- Curriculum全体のリライト
- 全Markdownを走査する新規恒久checker

## Impacted areas

### Must change in PR 3 implementation

| File | Reason |
| --- | --- |
| `docs/adr/0020-test-automation-curriculum-native-specialization.md` | Decision B、Common / Native completion、navigation、evidence境界をADR化する |
| `docs/curriculum/test-automation/README.md` | entry profile、Required / specialization / support asset、Common能力集合、learner navigationのCanonical入口を整合する |
| `docs/curriculum/test-automation/00_learning-design.md` | Common Core prior-knowledge boundary、Part completion、Native branch / skip / rejoinを整合する |
| `docs/curriculum/test-automation/02_competency-rubric.md` | C01〜C12 bounded Level 2 / Minimum Evidence / path classificationをlearner-facing contractとして正本化する |
| `docs/curriculum/test-automation/03_instructor-reference.md` | 冒頭のtransition noticeだけ追加し、learner-facing SSOTではないことを明示する |
| `docs/curriculum/test-automation/part1/07_maestro-native-automation.md` | Part 1 Native specialization / prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part1/09_part1-capstone.md` | Common completionからC08 / Physical Androidを外し、Native evidenceを分離する |
| `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` | Part 2 Native specialization / internal prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` | Common C12をbounded Web CIへ限定し、full Native / deliveryをspecialization / Advancedへ分離する |
| `tests/contracts/training-curriculum.test.ts` | Fixed Decision Bを守る最小限のexecutable assertionsを追加する |

### Conditional

- `scripts/validate-curriculum.ts`
  - Current auditでは変更不要。
  - 既存required-file listはrepository asset existence contractとして正しい。
  - 実装時にCanonical wording変更だけで既存checkの意味が破綻すると判明した場合のみ再評価する。Learner Required pathの意味へrequired-file listを変更することはしない。
  - 変更が必要になる場合はscope拡大を自動採用せず、Plan / ownerと再確認する。

### Read-only verification

- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `package.json`
- `training/**`
- `.github/workflows/**`
- `docs/adr/0014-curriculum-pr-required-dod-scope.md`
- `docs/adr/0015-official-black-box-scored-e2e-artifact-boundary.md`
- `docs/adr/0019-chromium-required-ci-cross-browser-smoke.md`
- その他Decision Bと競合し得るCurrent ADR / normative source

## Files to inspect

Pre-change auditでは最低限以下を確認済み。PR 3実装開始時にも最新branch上で再確認する。

```text
docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md
docs/plans/TEMPLATE.md

docs/curriculum/test-automation/README.md
docs/curriculum/test-automation/00_learning-design.md
docs/curriculum/test-automation/01_spreadsheet-test-design.md
docs/curriculum/test-automation/02_competency-rubric.md
docs/curriculum/test-automation/03_instructor-reference.md
docs/curriculum/test-automation/part1/07_maestro-native-automation.md
docs/curriculum/test-automation/part1/09_part1-capstone.md
docs/curriculum/test-automation/part2/06_native-ci-maestro.md
docs/curriculum/test-automation/part2/08_integration-design-capstone.md

scripts/validate-curriculum.ts
tests/contracts/training-curriculum.test.ts

docs/08_testing/test_strategy.md
docs/12_quality/requirements_traceability.md

package.json
training/**
.github/workflows/**

docs/adr/**
.codex/**
```

## Pre-change audit

### Canonical Curriculum

| Source | Current state | PR 3 implication |
| --- | --- | --- |
| `README.md` | Part 1 goal / minimum artifactsにMaestro Nativeが直列で含まれ、P1-7 / P2-6もlinear navigation。`03_instructor-reference.md`もlearner materialとsupport assetの区別が弱い。entry profileも固定Decisionまで一意でない | Must change。入口でCommon / specialization / support assetを分離し、能力集合・navigation・entry profileを正本化する |
| `00_learning-design.md` | 対象者像は複数personaを含み、Common Core prior-knowledge boundaryが明示されていない。Part 1 prerequisites / sequenceにNative環境が混ざる | Must change。開始profileとCommon前提知識、Part completion、branch / skip / rejoinを固定する |
| `02_competency-rubric.md` | Part 1がC01〜C10 Level 2 + Android Training Maestroを要求しC08がCommonに残る。Part 2はC01〜C12。C04は技法列挙寄り、C09/C10 evidenceが弱く、C12が広すぎる。Level 1は講師支援を能力条件へ埋め込む | Must change。Decision BとC01〜C12 Minimum Evidence / path classificationを一意化する |
| `03_instructor-reference.md` | learner standard navigationから外す意図やhidden tests禁止はあるが、最終completion / learner-facing SSOTではないこととPR 4A移行境界が明示不足 | Must changeは冒頭transition noticeのみ。本文移行・削除は禁止 |

### Four Lesson / Capstone boundary checks

| File | Current drift | Disposition |
| --- | --- | --- |
| `part1/07_maestro-native-automation.md` | Physical Android / MaestroがPart 1標準実行環境・修了条件として読める | Must change: Native specialization、開始prerequisite、skip / rejoinを最小明記 |
| `part1/09_part1-capstone.md` | Core only可という記述と、C01〜C10 / Physical Android / Maestroを修了要件にする記述が矛盾 | Must change: Part 1 Common=`C01〜C07+C09〜C10`、Native evidenceを別枠化 |
| `part2/06_native-ci-maestro.md` | Native specialization表示が弱く、P1 Maestroを前提に直列completionへ見える | Must change: specialization、Common skip / rejoin、Native内部prerequisiteを明示 |
| `part2/08_integration-design-capstone.md` | Common目標がPlaywright + Maestro + full CI/CD / Android+iOSまで広がる | Must change: Common C12をbounded Web CIへ限定し、Native / full deliveryをAdvanced / specializationへ分離 |

### Executable contract

- `scripts/validate-curriculum.ts`
  - `REQUIRED_CURRICULUM_FILES`はrepository asset existenceを検証している。
  - `03_instructor-reference.md`やNative Lessonがrepositoryに必要であることと、Learner Required / Common graduation必須であることを結び付けるassertionは確認されない。
  - C01〜C12のtoken存在、Curriculum heading / lesson requirements等を検証するが、C08をCommon completionへ固定していない。
  - **Current audit結論: PR 3での変更は不要。**
- `tests/contracts/training-curriculum.test.ts`
  - CurrentはCurriculum / Training / Formal boundaryの構造的contractを固定する。
  - exact Part 1 / Part 2 Common能力集合、C08 specialization、Native branch / skip / rejoin、Repository-required vs Learner Required、C08 Minimum Evidence、Baseline PASS != competency completionは固定していない。
  - **Current audit結論: PR 3でtargeted assertionsが必要。** 新規parser / all-Markdown checkerは不要。

### PR 2 Formal contract

- `docs/08_testing/test_strategy.md` と `docs/12_quality/requirements_traceability.md` は、Test Level / Type、Perspective、Execution / Platform / CI Gate、Formal vs Trainingの境界をCurrent contractとして保持する。
- Android Product GateはBuild + Runtime、iOS Product GateはBuild-only。PR 3はこれを変更しない。
- C05はこのFormal SSOTを参照して判断根拠を要求し、独自のTest Level / Perspective / Gate taxonomyを作らない。

### Current Training evidence

- `package.json`には少なくともWeb / Native baselineとWeb mobile learner exercise系entryが存在する。
- `training/playwright/exercises/**` と `training/maestro/exercises/**` にlearner exercise asset / solutionが存在する。
- workbookはTarget & Risk / Test Case / Automation Mapping / Execution & ImprovementのEvidence構造を持ち、C01〜C06 / C09等のMinimum Evidenceに接続できる。
- Native learner-authored exercise専用runner / canonical Artifact生成までをPR 3で実装しない。不足はPR 5で解消する。
- `.github/workflows/**`のTraining / Native jobやArtifactはCurrent実態の参照に留め、PR 3では編集しない。

### ADR

- Current最大ADR番号: `0019`
- 次の空き番号: `0020`
- Candidate: `docs/adr/0020-test-automation-curriculum-native-specialization.md`
- Existing style: Status / Date / Context / Decision / Consequences / Guardrailsを中心とする簡潔なDecision record。
- `0014` / `0015` / `0019`および検索対象のCurrent ADR / normative sourceにDecision Bと明確に競合する契約は確認されなかった。

### Baseline validation status

Planning環境にはrepository cloneがなく、`git clone`もGitHub DNS解決不可のため、以下は**実行できていない**。pass扱いにしない。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
```

分類: **environment-dependent / not run**。PR 3 implementation開始前にclean working tree上で再実行し、Current main failure / implementation failure / environment failureを切り分ける。

## Finding ownership / disposition

| Finding | PR 3 role | Current state | Evidence | Planned disposition | Planned change / verify |
| --- | --- | --- | --- | --- | --- |
| RA-G2 Lesson→Competency→Minimum Evidence direct mapping不足 | Primary owner | Rubricはcompetency level中心で、Lesson / exercise / workbookからMinimum Evidenceへの直接mappingが不足 | `02_competency-rubric.md`, workbook / exercise assets | close in PR 3 | RubricにC01〜C12 Minimum Evidence + path classificationを置き、README / Learning Designから同じcontractへ接続 |
| CUR-H1 universal path vs Audience / Level不整合 | Primary owner | README / Learning DesignがNative lessonをlinear pathとして見せ、対象者profileとの境界が曖昧 | README, `00_learning-design.md`, four boundary lessons | close in PR 3 | Entry profile + Common prior knowledge + Native branch / skip / rejoinをcanonical化 |
| CUR-H2 Lesson→Competency Minimum Evidence trace不足 | Primary owner | C01〜C12の修了Evidenceがlesson / learner artifact単位で一意でない | Rubric, workbook, exercises | close in PR 3 | RubricのMinimum Evidence表とtargeted navigation referencesでtraceを成立 |
| CUR-H3 C08 / Physical AndroidがCommon graduationに残る | Primary owner | Part 1 RubricがC01〜C10 L2 + Android Maestro、P1 capstoneもPhysical Androidを要求 | Rubric, P1-07, P1-09 | close in PR 3 | P1 Common exact setからC08除外。P2/finalもC08除外。Native evidenceをspecializationへ分離 |
| CUR-H6 Repository-required asset / Learner Required path混同 | Primary owner | READMEのmaterial一覧とvalidator required filesの意味がlearner-facingに区別されていない | README, Learning Design, validator, Instructor Reference | close in PR 3 | learner Required / specialization / support asset分類をdocsで明示。validator required-file listは維持 |
| CUR-M2 C04 L2とpractice volume非対称 | Primary owner | Rubricがtechnique列挙 / 数量へ寄り、適合性と理由が弱い | Rubric C04 | close in PR 3 | Spec / Riskへのfit + rationaleをMinimum Evidenceの中心にする |
| CUR-M3 C09 Failure Evidenceが弱い | Primary owner | Genericなfailure diagnosis中心でmeaningful category evidenceが薄い | Rubric C09, workbook execution fields | close in PR 3 | Locator / Timing / Assertion等を含む診断 + cause/action/re-run evidenceを要求 |
| CUR-M5 Native baseline vs meaningful learner flow assessment gap | Primary owner | baseline / stock flowの成功とlearner-authored Native competencyの境界が明確でない | package scripts, Maestro exercises, P1 lesson/capstone | close contract in PR 3; execution in PR 5 | C08=`learner-authored diff + successful Maestro artifact`; baselineはenvironment evidenceのみ |
| CUR-M7 learner exerciseの継続評価境界が弱い | Primary owner | exercise assetはあるが、何がcompletion evidenceかRubricで一意でない | Playwright / Maestro exercises, Rubric | close contract in PR 3; runner work in PR 5 | same learner-facing rubric / artifact contractを定義し、runner / workflowは作らない |
| CUR-M8 C12 scopeが広い | Primary owner | Rubric / P2 capstoneがfull multi-platform / deliveryまでCommonに見える | Rubric C12, P2-08 | close in PR 3 | Common L2をbounded Web CI Trigger / Gate / Artifact / Failure Evidenceへ限定 |
| CUR-M12 learner self-checkとexternal evaluationの同一Evidence不足 | Primary owner | learner-facingとInstructor referenceの評価責務が分散 | Rubric, Instructor Reference | close in PR 3 | learner-facing Rubricを唯一のRequired評価契約にし、外部評価も同じEvidenceを使用 |
| CUR-M13 target learner profile未定義 / expert tacit knowledge依存 | Primary owner | personaはあるが固定entry profile / hidden prerequisite prohibitionが一意でない | README, Learning Design | close in PR 3 | fixed entry profile + Common prior-knowledge ruleをcanonical化 |
| RA-M5 Native future / Phase1-out doc drift | Verification | PR 1でCurrent Native positionへ同期済み。PR 3で再変更不要 | Current Curriculum / Formal source | verify / no additional change | PR 3文面がNativeをfuture / Phase1-outへ戻していないことだけ確認 |
| RA-M6 Curriculum iOS manual-only vs build-only gate drift | Verification | PR 1 / PR 2 Current contractはiOS Build-only | Formal docs / Current Curriculum references | verify / no additional change | PR 3がiOS Gateを再定義・manual-only化しないことをdiff review |
| RA-M7 canonical filename vs validator required-file mismatch | Verification | Current validator required pathsはCurrent canonical filesと一致 | validator + Curriculum file tree | verify / no additional change | `validate:curriculum`でrepository asset existenceを維持 |
| RA-G3 Technique→Formal mapping metadata不足 | Verification | PR 2のFormal Test Strategy / TraceabilityでFormal mappingがCurrent化 | `test_strategy.md`, `requirements_traceability.md` | verify / no additional change | C05がFormal SSOTを参照し、別taxonomyを導入しないことを確認 |
| RA-G6 Test Strategy Native / Training / parity / operational contract不足 | Verification | PR 2でFormal / Training / Native / platform gate境界がCurrent化 | PR 2 Formal docs | verify / no additional change | PR 3はread-onlyで参照し、Training contractやProduct Gateを再定義しない |
| CUR-M9 iOS Current Gate docs drift | Verification | Current Formal contractはiOS Build-only | `test_strategy.md`, traceability | verify / no additional change | PR 3がCurrent Gateを変更しないことを確認 |

## Change strategy

1. **Decisionを先に固定する**
   - ADR `0020`でCommon graduation / Native specialization / navigation / evidence boundaryと既存Formal・Product Gateの非変更を記録する。
2. **learner-facing入口を同期する**
   - README / Learning Designでentry profile、Common prior knowledge、Required / specialization / support asset、Part completion、branch / skip / rejoinを一意にする。
3. **Rubricを評価SSOTへする**
   - C01〜C12をbounded Level 2 + Minimum Evidence + path classificationで統一し、same rubricをself-check / external evaluationで使う。
4. **transitional support boundaryだけ追加する**
   - Instructor Reference冒頭にtransition noticeを追加し、本文はPR 4Aまで保持する。
5. **4 Lesson / Capstoneは境界文言だけ同期する**
   - 全文改善・Practice改訂はせず、Common completionとNative specializationに直接矛盾する部分だけ直す。
6. **既存contract testへ必要最小限のguardを追加する**
   - stable canonical section / phraseを対象にexact competency sets、C08 specialization、navigation、asset/evidence boundaryを固定する。
   - 新しいJSON/YAML schema、parser、scoring framework、all-Markdown checkerは作らない。
7. **validatorは原則無変更**
   - repository-required assetsの存在checkとLearner Required pathを混同しない。

## Detailed implementation plan

### 1. `docs/adr/0020-test-automation-curriculum-native-specialization.md`

- Current issue:
  - Master PlanのDecision Bは固定済みだが、PR 3後のCurrent decisionとして独立ADRがまだない。
- Change:
  - Existing ADR styleに合わせ、Status / Date / Context / Decision / Consequences / Guardrailsで記述。
  - exact Part 1 / Part 2 Common competency sets、C08 specialization、branch / skip / rejoin、Repository-required vs Learner Required、Baseline vs learner-authored evidenceをDecisionとして固定。
  - PR 2 Formal contractとProduct Native Gateは参照するだけで非変更と明記。
- Why:
  - README / Learning Design / Rubric / lessonsが同じ判断を複製して再解釈しないため。
- Findings:
  - CUR-H1, CUR-H3, CUR-H6, CUR-M5, CUR-M8, CUR-M12。
- Validation:
  - `lint:markdown`; contract testからcanonical wordingを必要最小限参照。
- Keep unchanged:
  - Product gate、Formal taxonomy、Curriculum file numbering、Training implementation。

### 2. `docs/curriculum/test-automation/README.md`

- Current issue:
  - NativeがPart goals / artifacts / lesson sequenceへlinearに含まれ、learner material / support assetの分類も曖昧。
  - Fixed entry profileが一意でない。
- Change:
  - コース開始profileを固定。
  - learner-facing `Required Common`, `Native specialization`, `Instructor / operation support`を明示的に分類。
  - Part 1 / Part 2 exact Common competency setsとC08 specializationを示す。
  - P1 / P2 branch / skip / rejoinをlearnerがトップから辿れるnavigationとして記載。
  - Minimum Evidence詳細はRubricへリンクし、READMEに重複仕様を増やさない。
- Why:
  - course entryとnavigationのCanonical入口にするため。
- Findings:
  - CUR-H1, CUR-H3, CUR-H6, CUR-M13。
- Validation:
  - `validate:curriculum`, contract test, markdown lint。
- Keep unchanged:
  - top-level numbering / filenames、Lesson本文、Instructor Reference本文。

### 3. `docs/curriculum/test-automation/00_learning_design.md`

- Current issue:
  - target audienceとprerequisiteが広く、Native環境 / 実務知識がCommon Coreの暗黙前提に見える。
- Change:
  - entry profileとCommon prior-knowledge boundaryをREADMEと同じcontractへ同期。
  - Part completion / final graduationのexact setsを明示。
  - P1 / P2 Native branch / skip / rejoin、specialization開始前Common prerequisiteとNative内部prerequisiteを明示。
  - learner Required pathにInstructor Reference / specializationを混ぜない。
- Why:
  - instructional design上のhidden prerequisiteを禁止し、後続Lessonの設計制約を一意にするため。
- Findings:
  - CUR-H1, CUR-H3, CUR-H6, CUR-M13。
- Validation:
  - contract testのnavigation / competency set assertions; markdown lint。
- Keep unchanged:
  - Lesson depth / practice / recovery designの全面改訂。

### 4. `docs/curriculum/test-automation/02_competency-rubric.md`

- Current issue:
  - Part 1 CommonにC08 / Androidが残る。
  - C01〜C12のMinimum Evidenceとpath classificationが一意でない。
  - C04 / C09 / C10 / C12のbounded Level 2がMaster Planとずれる。
  - Instructor支援がlevel定義へ入り、self-checkとexternal評価の責務が分散する。
- Change:
  - level定義を「例・ヒント・詳細手順を使える状態」と「自力で実施できる状態」で区別し、Instructor支援をRequired能力条件から外す。
  - C01〜C12に `bounded Level 2 / Minimum Evidence / Required path classification` を一意に付与。
  - Planned Minimum Evidence anchors:
    - C01: workbook Target & Riskのtarget / spec ref / rationale
    - C02: Spec参照 + test condition / expected result
    - C03: impact / likelihood / priority / rationale
    - C04: selected technique + Spec / Risk fit + reason
    - C05: Formal SSOTに基づくtest level / perspective / gate mapping + reason
    - C06: automation decision / tool / entry or spec reference + reason
    - C07: learner-authored Playwright exercise change + successful Web execution evidence
    - C08: learner-authored Native exercise diff + successful Maestro execution artifact
    - C09: Locator / Timing / Assertion等のmeaningful diagnosis + cause / action / re-run evidence
    - C10: real maintainability issue diagnosis + reasoned minimal learner-authored improvement + re-run evidence
    - C11: learner-authored Git / PR change + reviewable diff + change rationale / review evidence
    - C12: bounded Web CI Trigger / Gate / Artifact / Failure Evidence
  - Baseline / stock PASSはenvironment / harness evidenceでありcompletionではないと明記。
  - Same Rubric / Minimum Evidence / Artifactをlearner self-checkとexternal evaluationで共有。
- Why:
  - PR 3の中心Canonical assessment contract。
- Findings:
  - RA-G2, CUR-H2, CUR-H3, CUR-M2, CUR-M3, CUR-M5, CUR-M7, CUR-M8, CUR-M12。
- Validation:
  - targeted contract assertions + `validate:curriculum`; manual consistency review against workbook/exercises/Formal docs。
- Keep unchanged:
  - runner / command / Artifact generator、Instructor-only hidden criteria、新scoring framework。

### 5. `docs/curriculum/test-automation/03_instructor-reference.md`

- Current issue:
  - Support assetである意図は一部あるが、learner-facing learning / completion SSOTではないこととPR 4A移行状態が不足。
- Change:
  - 冒頭にtransition noticeを追加。
  - 明示する内容:
    - learner-facing learning SSOTではない
    - Common / specialization completionの正本ではない
    - Facilitation / 判断 / Recovery / 評価情報はPR 4Aで仕分け・移行するtransitional content
    - PR 4Aで必要情報を移す前に既存情報を削除しない
- Why:
  - learner-facing RubricとInstructor supportの責務を分離しつつ、情報損失を避けるため。
- Findings:
  - CUR-H6, CUR-M12。
- Validation:
  - markdown lint + diff review。
- Keep unchanged:
  - 本文の情報移動・削除・全面rewrite。

### 6. `part1/07_maestro-native-automation.md`

- Current issue:
  - Physical Android / MaestroがPart 1 standard / completion requirementへ読める。
- Change:
  - Native specializationとしてlabel。
  - Common prerequisite=P1-6まで、非選択時skip=P1-8、完了後rejoin=P1-8を明示。
  - C08 evidenceはRubricへ参照し、baselineだけをcompletionにしない。
- Findings:
  - CUR-H1, CUR-H3, CUR-M5。
- Validation:
  - navigation / C08 contract assertions; markdown lint。
- Keep unchanged:
  - lesson body depth / exercise designの全面改訂。

### 7. `part1/09_part1-capstone.md`

- Current issue:
  - Core only completion可の記述とC01〜C10 + Physical Android / Maestro必須が衝突。
- Change:
  - Common completionを`C01〜C07+C09〜C10` bounded L2へ固定。
  - C08 / Physical Android / Native artifactはspecialization completion evidenceとして分離。
  - Native未選択learnerがblocked / not_completedにならないことを明示。
- Findings:
  - CUR-H3, CUR-M5。
- Validation:
  - exact Part 1 set + no-C08-common assertions。
- Keep unchanged:
  - capstone全体のPractice / Recovery rewrite。

### 8. `part2/06_native-ci-maestro.md`

- Current issue:
  - Native CIがlinear Common pathに見え、P1 Native capabilityがhidden prerequisiteになり得る。
- Change:
  - Native specializationとしてlabel。
  - Common非選択時skip=P2-7、完了後rejoin=P2-7。
  - specialization開始前Common prerequisiteとP1 Native specialization由来のNative内部prerequisiteを分けて明示。
- Findings:
  - CUR-H1, CUR-H3, CUR-M13。
- Validation:
  - navigation assertions; markdown lint。
- Keep unchanged:
  - Training workflow / Product Native Gate / lesson depth。

### 9. `part2/08_integration-design-capstone.md`

- Current issue:
  - Playwright + Maestro + full CI/CD / Android+iOSがCommon completionに見え、C12 scopeが広い。
- Change:
  - final Common=`C01〜C07+C09〜C12` bounded L2。
  - C12 CommonをWeb CIのTrigger / Gate / Artifact / Failure Evidenceへ限定。
  - Native / multi-platform / preview-prod deliveryをspecialization / Advanced evidenceとして分離。
- Findings:
  - CUR-H3, CUR-M8。
- Validation:
  - exact final set + bounded C12 assertions; markdown lint。
- Keep unchanged:
  - Product release workflow / Native CI implementation。

### 10. `tests/contracts/training-curriculum.test.ts`

- Current issue:
  - Fixed Decision Bの重要boundaryがexecutable contractで未固定。
- Change:
  - 既存file-read / text contract styleの範囲で、stable canonical sections / phrasesを対象にtargeted assertionsを追加。
  - 最低限守るもの:
    1. Part 1 Common exact set=`C01〜C07+C09〜C10`
    2. Part 2 / final Common exact set=`C01〜C07+C09〜C12`
    3. C08=Native specialization / Common graduation non-required
    4. P1 / P2 branch / skip / rejoin
    5. Instructor Reference=repository support assetでlearner Required completion SSOTではない
    6. C08 Minimum Evidence=`learner-authored diff + successful Maestro execution artifact`
    7. Baseline / stock PASS != learner competency completion
    8. C12 Common=bounded Web CI
  - wording assertionはCanonical sectionに限定し、全Markdown構造をparser化しない。
- Why:
  - PR 3で正本化したDecisionが将来のdocs driftで崩れない最小guard。
- Findings:
  - RA-G2, CUR-H1, CUR-H2, CUR-H3, CUR-H6, CUR-M5, CUR-M8, CUR-M12。
- Validation:
  - `pnpm run test:contracts`, `pnpm run typecheck`, format checks。
- Keep unchanged:
  - scoring engine / machine-readable rubric / new framework。

### 11. `scripts/validate-curriculum.ts` — verify only

- Current issue:
  - なし。repository asset existenceとLearner Required pathを混同しないことが重要。
- Change:
  - **Current auditではno change。**
- Validation:
  - `pnpm run validate:curriculum`でPR 3 docsがexisting structural contractを維持することを確認。
- Stop / re-evaluate:
  - docs wording変更だけでcurrent validator semanticsが成立しなくなる場合は、required-file listをlearner pathへ転用せずscope reviewする。

## Validation

### Implementation開始前 baseline

clean working tree / latest branchで必ず実行する。

```bash
git status
git branch --show-current
git fetch origin
git rev-parse origin/main
git log -1 --oneline origin/main

pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
```

Planning runではローカルrepositoryが利用できず未実行。implementation開始時に失敗した場合は、Current main failure / PR 3 change / environment-dependentを切り分ける。

### PR 3 implementation validation

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run typecheck
git diff --check
```

追加で以下をmanual reviewする。

- `git diff --name-only origin/main...HEAD` がPR 3 planned filesだけである
- Product / Training / workflow / Formal docsに差分がない
- exact Common setsがREADME / Learning Design / Rubric / Capstone間で一致
- C08がCommon completionに再流入していない
- Repository-required / Learner Requiredが混同されていない
- Baseline PASSがcompetency completionへ昇格していない
- Instructor Reference本文の移動・削除がない
- C05がPR 2 Formal contractを再定義していない
- C12 Commonがbounded Web CIを超えていない

### Planning artifact validation

本child Plan / Run Artifact作成後に本来実行すべき以下のrepository commandは、planning環境にcloneがないため未実行。

```bash
pnpm run format:check
pnpm run lint:markdown
git diff --check
```

代替としてGitHub compareでplanning branch差分を確認し、allowlist外のrepository contentが変更されていないことを確認する。repository scriptsの実行結果とは扱わない。

## Risks

- README / Learning Design / Rubric / ADRへ同じ契約を書き過ぎ、複数SSOT化する。
  - Mitigation: ADR=decision、README=entry/navigation、Learning Design=instructional prerequisite、Rubric=assessment/evidenceと責務分離する。
- contract testが具体文言へ過剰結合し、PR 4Aの文章改善を妨げる。
  - Mitigation: stable heading / canonical contract phrase / exact setだけをassertし、全文snapshot / parser化を避ける。
- C08 optional化をNative重要度の低下やProduct Gate変更と誤解する。
  - Mitigation: specialization completionとProduct Android/iOS gateを明示的に別契約として保持する。
- Current Trainingに未実装のrunner / ArtifactをPlanが暗黙に要求し、PR 5 scopeを前倒しする。
  - Mitigation: PR 3はEvidenceの意味と必要形を定義するだけ。実行入口・生成実装はPR 5へ残す。
- Instructor Referenceから評価情報を先に削除するとPR 4A移行前に情報が失われる。
  - Mitigation: transition noticeのみ。本文移行・削除禁止。
- hidden prerequisiteがLesson本文に残る。
  - Mitigation: PR 3では4 boundary filesの矛盾文言だけ最小修正し、その他Lesson全文監査はPR 4Aへ残す。
- Planning環境でlocal baseline commandsを実行できていない。
  - Mitigation: implementation開始前のhard preflightとしてDoD / stop conditionへ残す。

## Stop conditions

以下が判明した場合、scopeを広げず停止してownerへ戻す。

1. Decision Bと矛盾するCurrent ADR / normative requirementが見つかる。
2. Master Planの固定Part 1 / Part 2 / C08能力契約ではCurrent repositoryを整合できない。
3. 4 Lesson / Capstoneのboundary修正が最小wording変更を超え、Curriculum構造変更を必要とする。
4. Instructor Referenceから情報を先に移動・削除しないとPR 3 contractを成立させられない。
5. Training implementation変更をPR 3へ入れないとMinimum Evidenceを定義できない。
6. Product behavior / Product CI Gate変更が必要になる。
7. 新しい仕様判断が必要でMaster Planから一意に決められない。
8. implementation開始時のlocal working treeに未commit user変更がある。
9. `docs/decision-b-competency-assessment-contract` がowner review前に別用途 / unexpected HEADへ変更されている。
10. Current auditでno-changeとしたvalidatorを大きく改造しないとcontractを表現できない。この場合は新checkerを追加せずscope reviewする。

## Open questions

Blocking open questionはCurrent auditではなし。

Implementation detailとして、`training-curriculum.test.ts` のassertion文字列は、canonical sectionsの最終文面を作成した後にstable wordingへ合わせる。これはDecision Bの再判断ではなくtest brittlenessを避けるための実装詳細である。

Planning環境ではlocal working tree / `pnpm` baselineを確認できていないため、implementation開始前preflightの結果だけは未確定。dirty treeまたはbaseline failureがあれば、その時点でstop / classificationする。

## Follow-up

1. Ownerが本child Planをreview / approveする。
2. approval後にのみPR 3本体を実装する。
3. PR 3実装では本PlanのMust change filesに限定し、Conditional validatorは必要性がCurrent sourceで発生した場合のみ再評価する。
4. PR 3完了後、Lesson全文 / Instructor Reference移行等はPR 4A、Training runner / command / workflow / ArtifactはPR 5で対応する。
5. PR 3のPR作成は本Plan承認後に別工程で行う。

## Definition of Done

### This planning phase

- latest `main` SHAとbranch baselineが記録されている。
- Current source auditに基づき、Decision B conflict有無、次ADR番号、validator / contract test必要性、4 boundary filesの変更要否が明確。
- Master PlanのPrimary owner=PR 3 / Verification=PR 3 findingを漏れなくDispositionしている。
- Must change / Conditional / Read-only verificationを分離している。
- C01〜C12 Minimum EvidenceがCurrent workbook / exercises / Training実態から浮かない計画になっている。
- PR 4A / PR 5 scopeを前倒ししていない。
- planning phaseではchild Plan +新規Run Artifact以外のrepository contentを変更しない。
- PRを作成しない。
- local validation未実行というenvironment limitationをpass扱いせず記録する。

### Future PR 3 implementation

- Part 1 Common=`C01〜C07+C09〜C10` bounded Level 2。
- Part 2 / final Common=`C01〜C07+C09〜C12` bounded Level 2。
- C08=Native specializationでCommon completion non-required。
- entry profile / Common prior knowledge / Native branch-skip-rejoin / Repository-required vs Learner Requiredがlearner-facingに一意。
- C01〜C12のMinimum Evidenceとpath classificationがlearner-facing Rubricで自己確認可能。
- C04 / C05 / C08 / C09 / C10 / C12がFixed Decision通り。
- Baseline PASS / stock flow PASSとlearner-authored competency evidenceが分離。
- Instructor Referenceはtransition noticeのみ追加され、本文情報はPR 4Aまで保持。
- 4 Lesson / Capstoneはboundary wordingの最小変更に留まる。
- `training-curriculum.test.ts` に必要最小限のDecision B guardが追加される。
- Current audit通りなら`validate-curriculum.ts`は無変更。
- Product / Formal / Training / workflow / runtime behaviorに変更なし。
- validationが成功し、allowlist外diffがない。
