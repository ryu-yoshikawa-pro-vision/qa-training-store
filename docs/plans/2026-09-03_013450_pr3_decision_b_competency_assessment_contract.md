# PR 3 — Decision B / Competency / Assessment Contract

## Goal

PR #78 merge後の最新 `main` を基準に、Master Planで固定済みのDecision Bを、能力・修了・評価・Learner Required / Native specialization境界のCanonical Contractとして一意化する。

PR 3で正本化する対象は次に限定する。

- 共通卒業像 = entry-levelの汎用 Test Automation Engineer
- コース開始時の対象受講者像とCommon Coreが前提にできる既習知識
- Part 1 / Part 2のCommon completion能力集合
- C08 Native Automation specializationの位置づけ
- Native specializationのbranch / skip / rejoin / prerequisite navigation contract
- Repository-required assetとLearner Required pathの区別
- learner-facing RubricとC01〜C12 Minimum Evidence
- Lesson / Exercise → Competency → Minimum Evidenceの直接trace
- Baseline PASSとLearner-authored competency evidenceの区別
- learner-facing self-study contractとInstructor / 運営支援境界
- `提出`と外部提出必須を同一視しないcompletion contract
- Instructor Referenceのtransitional boundary
- 上記のうち将来も維持すべきstable invariantだけを守る最小限のcontract test

Curriculum本文の全面改善、Product behavior、Product Native CI Gate、Training runner / workflow / Artifact実装は変更しない。

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
- Current auditでsemantic issueがない`validate-curriculum.ts`はPR 3では変更しない。変更が必要に見えた場合は実装を広げずStop conditionとして扱う。

## Fixed decisions

### Common graduation profile

Common graduation profileは **entry-levelの汎用 Test Automation Engineer** とする。

この卒業像は、特定Repository固有の運用やNative specialization完了を前提にせず、Common Coreで定義した分析・設計・自動化・診断・保守・Git/PR・bounded Web CIの能力集合で成立する。

README / Learning Designでこの卒業像を一意に示す。Rubricや各Lessonへ同じ説明文を複製しない。

### Learner entry profile

コース開始時の対象受講者像をREADME / Learning Designで一意にする。

- テスト自動化の目的・基本概念を理解している
- ノーコード / ローコード経験または概要理解は可
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

具体的な開始条件は対象specialization Lessonを正本とし、README / Learning Designへ詳細を重複コピーしない。READMEは経路、Learning Designは前提知識ルール、対象Lessonは具体的開始条件を担当する。

### Self-study / Instructor support boundary

PR 3ではself-study品質の**責務契約**だけを正本化し、各Lessonの実際のself-check / Recovery改善はPR 4Aへ残す。

Instructor / 運営は、次の受講内容外支援を担当してよい。

- 環境準備
- アカウント / 権限
- 端末準備
- 演習Repository / Training Copy準備
- Infrastructure / Toolchain障害対応

次はlearner-facing materialを正本とし、Instructorの口頭説明・個別判断・非公開情報をRequired completionの前提にしない。

- 学習内容
- 演習で何を判断するか
- 自己確認 / 答え合わせに必要な公開条件
- 学習上のRecovery
- 完了条件
- 評価観点 / Minimum Evidence

選択したNative specializationにも同じlearner-facing原則を適用する。ただしNative環境・Runtime EvidenceをCommon completionへ昇格させない。

### Submission / external review boundary

- `提出`を外部提出必須の意味としてRequired completionへ埋め込まない。
- Repository内へ成果物 / Evidenceを保存・記録すれば成立する箇所は、そのように表現する。
- 外部評価運用がある場合もlearner-facing Rubric / Minimum Evidence / Artifactをそのまま使い、Instructor-onlyの追加Required基準を作らない。
- C11で第三者による実ReviewをRequiredにしない。learner-authored Git / PR changeとreviewable diffに対し、self-reviewまたは公開Review checklistに基づくreview evidenceで成立させる。

### Competency / Minimum Evidence

C01〜C12をlearner-facing Rubricで自己確認できる共通契約にする。外部評価でも同一Rubric / Minimum Evidence / Artifactを用い、Instructor-onlyの非公開Required評価基準は作らない。

Rubricは少なくとも次の列または同等情報を一つの表で確認できる形にする。

- Competency ID
- path classification（Common / Native specialization / Advanced等）
- bounded Level 2
- Primary learner-facing source（Lesson / Exercise / workbook等）
- Minimum Evidence

これにより `Lesson / Exercise → Competency → Minimum Evidence` のdirect traceをRubricだけで辿れるようにする。新しいTraceability file、JSON / YAML schema、DBは作らない。

固定する重要境界は次のとおり。

- C04: technique数quotaではなく、Spec / Riskに適したtechniqueを選び、理由を説明できることを中心とする。
- C05: PR 2のFormal Test Level / Perspective / Execution・Platform Gate contractを参照し、PR 3側で再定義しない。
- C08: `learner-authored native exercise diff + successful Maestro execution artifact`。stock Native exercise / baselineを未変更でPASSしただけではcompletionにしない。Common graduationには要求しない。
- C09: Assertion typoだけでなく、Locator / Timing / Assertion等のmeaningful diagnostic evidenceを要求する。
- C10: 実在する保守問題の診断 + 理由付きの最小改善をCommon Core Level 2とする。
- C11: learner-authored Git / PR change + reviewable diff + change rationale + self-reviewまたは公開Review checklistに基づくreview evidence。第三者ReviewはRequiredではない。
- C12: Common Level 2はbounded Web CIのTrigger / Gate / Artifact / Failure Evidence。full multi-platform / deliveryはAdvanced / specialization側。
- Baseline PASS / stock flow PASSはenvironment / harness evidenceでありLearner competency completionそのものではない。
- Level定義は「例・ヒント・詳細手順を使った状態」と「自力で実施できる状態」を区別し、Instructor支援を能力レベルの必須前提にしない。

## Canonical responsibility split

同じ契約を複数文書へ全文複製しない。PR 3実装では次の責務に固定する。

| Source | Canonical responsibility | Avoid |
| --- | --- | --- |
| ADR `0020` | Decision B、変更理由、変更禁止境界 | Lesson/Evidence詳細の複製 |
| Curriculum `README.md` | course entry、Common / specialization / support分類、learner navigation、Common sets | Minimum Evidence詳細、specialization内部手順 |
| `00_learning_design.md` | entry / graduation profile、既習知識ルール、self-study / Instructor境界、instructional rule | 各Lessonの具体手順 |
| `02_competency-rubric.md` | Competency、path、Primary source、bounded L2、Minimum Evidence | Navigation全文、Training runner実装 |
| P1-7 / P2-6 | specializationの具体的開始条件、skip / rejoin、Rubric参照 | Common全体の定義 |
| P1-9 / P2-8 | Common completionとspecialization / Advanced completionの局所分離 | 全Rubricの再掲 |
| `03_instructor-reference.md` | PR 4Aまでのtransition notice | learner-facing Required criteriaの新規追加 |
| contract test | stable invariantだけ | 一時的transition文言・全文snapshot |
| validator | repository asset existence | Learner Required path / completion判定 |

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
- 新しいTraceability file
- Curriculum全体のリライト
- 全Markdownを走査する新規恒久checker

## Impacted areas

### Must change in PR 3 implementation

| File | Reason |
| --- | --- |
| `docs/adr/0020-test-automation-curriculum-native-specialization.md` | Decision B、Common / Native completion、navigation、evidence境界をADR化する |
| `docs/curriculum/test-automation/README.md` | graduation / entry、Required / specialization / support asset、Common能力集合、learner navigationのCanonical入口を整合する |
| `docs/curriculum/test-automation/00_learning_design.md` | graduation / entry、Common Core prior-knowledge、self-study / Instructor boundaryを正本化する |
| `docs/curriculum/test-automation/02_competency-rubric.md` | C01〜C12 bounded Level 2 / Primary source / Minimum Evidence / path classificationをlearner-facing contractとして正本化する |
| `docs/curriculum/test-automation/03_instructor-reference.md` | 冒頭のtransition noticeだけ追加し、learner-facing SSOTではないことを明示する |
| `docs/curriculum/test-automation/part1/07_maestro-native-automation.md` | Part 1 Native specialization / prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part1/09_part1-capstone.md` | Common completionからC08 / Physical Androidを外し、Native evidenceを分離する |
| `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` | Part 2 Native specialization / internal prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` | Common C12をbounded Web CIへ限定し、full Native / deliveryをspecialization / Advancedへ分離する |
| `tests/contracts/training-curriculum.test.ts` | Fixed Decision Bのstable invariantだけを守る最小限のexecutable assertionsを追加する |

### Read-only verification

- `scripts/validate-curriculum.ts`
  - **PR 3では変更しない。**
  - Current `REQUIRED_CURRICULUM_FILES`はrepository asset existence contractとして正しい。
  - Learner Required path / Common graduationの意味へ転用しない。
  - docs変更によりvalidator変更が必要に見えた場合は、その場で変更せずStop conditionとしてscope reviewする。
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
docs/curriculum/test-automation/00_learning_design.md
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
| `README.md` | Part 1 goal / minimum artifactsにMaestro Nativeが直列で含まれ、P1-7 / P2-6もlinear navigation。`03_instructor-reference.md`もlearner materialとsupport assetの区別が弱い。entry / graduation profileも固定Decisionまで一意でない | Must change。入口でCommon / specialization / support assetを分離し、能力集合・navigation・entry / graduation profileを正本化する |
| `00_learning_design.md` | 対象者像は複数personaを含み、Common Core prior-knowledge boundaryが明示されていない。Part 1 prerequisites / sequenceにNative環境が混ざる。self-studyとInstructor支援境界も固定Decisionほど明確でない | Must change。開始 / 卒業profile、Common前提知識、self-study / Instructor境界を固定する |
| `02_competency-rubric.md` | Part 1がC01〜C10 Level 2 + Android Training Maestroを要求しC08がCommonに残る。Part 2はC01〜C12。C04は技法列挙寄り、C09/C10 evidenceが弱く、C12が広すぎる。Level 1は講師支援を能力条件へ埋め込む。Lesson / Exercise → Competency → Evidenceの直接traceも不足 | Must change。Decision BとC01〜C12 Primary source / Minimum Evidence / path classificationを一意化する |
| `03_instructor-reference.md` | learner standard navigationから外す意図やhidden tests禁止はあるが、最終completion / learner-facing SSOTではないこととPR 4A移行境界が明示不足 | Must changeは冒頭transition noticeのみ。本文移行・削除は禁止 |

### Four Lesson / Capstone boundary checks

| File | Current drift | Disposition |
| --- | --- | --- |
| `part1/07_maestro-native-automation.md` | Physical Android / MaestroがPart 1標準実行環境・修了条件として読める | Must change: Native specialization、具体的開始prerequisite、skip / rejoinを最小明記 |
| `part1/09_part1-capstone.md` | Core only可という記述と、C01〜C10 / Physical Android / Maestroを修了要件にする記述が矛盾 | Must change: Part 1 Common=`C01〜C07+C09〜C10`、Native evidenceを別枠化 |
| `part2/06_native-ci-maestro.md` | Native specialization表示が弱く、P1 Maestroを前提に直列completionへ見える | Must change: specialization、具体的開始条件、Common skip / rejoin、Native内部prerequisiteを明示 |
| `part2/08_integration-design-capstone.md` | Common目標がPlaywright + Maestro + full CI/CD / Android+iOSまで広がる | Must change: Common C12をbounded Web CIへ限定し、Native / full deliveryをAdvanced / specializationへ分離 |

### Executable contract

- `scripts/validate-curriculum.ts`
  - `REQUIRED_CURRICULUM_FILES`はrepository asset existenceを検証している。
  - `03_instructor-reference.md`やNative Lessonがrepositoryに必要であることと、Learner Required / Common graduation必須であることを結び付けるassertionは確認されない。
  - C01〜C12のtoken存在、Curriculum heading / lesson requirements等を検証するが、C08をCommon completionへ固定していない。
  - **Current audit結論: PR 3ではread-only。変更しない。**
- `tests/contracts/training-curriculum.test.ts`
  - CurrentはCurriculum / Training / Formal boundaryの構造的contractを固定する。
  - exact Part 1 / Part 2 Common能力集合、C08 specialization、Native branch / skip / rejoin、C08 Minimum Evidence、Baseline PASS != competency completion等は固定していない。
  - Current styleは`readFileSync` + `toContain`等のtext contractが中心で、文言を増やし過ぎるとPR 4Aのeditorial改善へ過剰結合しやすい。
  - **Current audit結論: PR 3ではstable invariantだけをtargeted assertionにする。** 新規parser / all-Markdown checkerは不要。

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

| Finding | PR 3 role | Current state | Planned disposition | Planned change / verify |
| --- | --- | --- | --- | --- |
| RA-G2 Lesson→Competency→Minimum Evidence direct mapping不足 | Primary owner | Rubricはcompetency level中心で、Lesson / exercise / workbookからMinimum Evidenceへの直接mappingが不足 | close in PR 3 | Rubricに`Primary learner-facing source + path + bounded L2 + Minimum Evidence`を一表で置き、直接traceを成立させる |
| CUR-H1 universal path vs Audience / Level不整合 | Primary owner | README / Learning DesignがNative lessonをlinear pathとして見せ、対象者profileとの境界が曖昧 | close in PR 3 | entry / graduation profile + Common prior knowledge + Native branch / skip / rejoinをcanonical化 |
| CUR-H2 Lesson→Competency Minimum Evidence trace不足 | Primary owner | C01〜C12の修了Evidenceがlesson / learner artifact単位で一意でない | close in PR 3 | RA-G2と同じRubric表でPrimary sourceからEvidenceまで一意にする。別trace fileは作らない |
| CUR-H3 C08 / Physical AndroidがCommon graduationに残る | Primary owner | Part 1 RubricがC01〜C10 L2 + Android Maestro、P1 capstoneもPhysical Androidを要求 | close in PR 3 | P1 Common exact setからC08除外。P2/finalもC08除外。Native evidenceをspecializationへ分離 |
| CUR-H6 Repository-required asset / Learner Required path混同 | Primary owner | READMEのmaterial一覧とvalidator required filesの意味がlearner-facingに区別されていない | close in PR 3 | learner Required / specialization / support asset分類をdocsで明示。validatorはread-only維持 |
| CUR-M2 C04 L2とpractice volume非対称 | Primary owner | Rubricがtechnique列挙 / 数量へ寄り、適合性と理由が弱い | close in PR 3 | Spec / Riskへのfit + rationaleをMinimum Evidenceの中心にする |
| CUR-M3 C09 Failure Evidenceが弱い | Primary owner | Genericなfailure diagnosis中心でmeaningful category evidenceが薄い | close in PR 3 | Locator / Timing / Assertion等を含む診断 + cause/action/re-run evidenceを要求 |
| CUR-M5 Native baseline vs meaningful learner flow assessment gap | Primary owner | baseline / stock flowの成功とlearner-authored Native competencyの境界が明確でない | close contract in PR 3; execution in PR 5 | C08=`learner-authored diff + successful Maestro artifact`; baselineはenvironment evidenceのみ |
| CUR-M7 learner exerciseの継続評価境界が弱い | Primary owner | exercise assetはあるが、何がcompletion evidenceかRubricで一意でない | close contract in PR 3; runner work in PR 5 | same learner-facing rubric / artifact contractを定義し、runner / workflowは作らない |
| CUR-M8 C12 scopeが広い | Primary owner | Rubric / P2 capstoneがfull multi-platform / deliveryまでCommonに見える | close in PR 3 | Common L2をbounded Web CI Trigger / Gate / Artifact / Failure Evidenceへ限定 |
| CUR-M12 learner self-checkとexternal evaluationの同一Evidence不足 | Primary owner | learner-facingとInstructor referenceの評価責務が分散 | close in PR 3 | learner-facing Rubricを唯一のRequired評価契約にし、外部評価も同じEvidenceを使用。外部提出・第三者reviewを暗黙必須にしない |
| CUR-M13 target learner profile未定義 / expert tacit knowledge依存 | Primary owner | personaはあるが固定entry profile / hidden prerequisite prohibitionが一意でない | close in PR 3 | fixed entry profile + graduation profile + Common prior-knowledge + self-study ruleをcanonical化 |
| RA-M5 Native future / Phase1-out doc drift | Verification | PR 1でCurrent Native positionへ同期済み | verify / no additional change | PR 3文面がNativeをfuture / Phase1-outへ戻していないことだけ確認 |
| RA-M6 Curriculum iOS manual-only vs build-only gate drift | Verification | PR 1 / PR 2 Current contractはiOS Build-only | verify / no additional change | PR 3がiOS Gateを再定義・manual-only化しないことをdiff review |
| RA-M7 canonical filename vs validator required-file mismatch | Verification | Current validator required pathsはCurrent canonical filesと一致 | verify / no additional change | `validate:curriculum`でrepository asset existenceを維持。validator sourceは変更しない |
| RA-G3 Technique→Formal mapping metadata不足 | Verification | PR 2のFormal Test Strategy / TraceabilityでFormal mappingがCurrent化 | verify / no additional change | C05がFormal SSOTを参照し、別taxonomyを導入しないことを確認 |
| RA-G6 Test Strategy Native / Training / parity / operational contract不足 | Verification | PR 2でFormal / Training / Native / platform gate境界がCurrent化 | verify / no additional change | PR 3はread-onlyで参照し、Training contractやProduct Gateを再定義しない |
| CUR-M9 iOS Current Gate docs drift | Verification | Current Formal contractはiOS Build-only | verify / no additional change | PR 3がCurrent Gateを変更しないことを確認 |

## Change strategy

1. **Decisionを先に固定する**
   - ADR `0020`でCommon graduation / Native specialization / navigation / evidence boundaryと既存Formal・Product Gateの非変更を記録する。
2. **learner-facing入口を同期する**
   - READMEでgraduation / entry、Required / specialization / support asset、Part completion、branch / skip / rejoinを一意にする。
3. **instructional ruleをLearning Designへ固定する**
   - entry / graduation profile、Common prior knowledge、self-study / Instructor support boundaryを正本化する。
4. **Rubricを評価 / trace SSOTへする**
   - C01〜C12を`path + Primary learner-facing source + bounded Level 2 + Minimum Evidence`で統一し、same rubricをself-check / external evaluationで使う。
5. **transitional support boundaryだけ追加する**
   - Instructor Reference冒頭にtransition noticeを追加し、本文はPR 4Aまで保持する。
6. **4 Lesson / Capstoneは局所境界だけ同期する**
   - specialization Lessonは具体的開始条件 / skip / rejoin、CapstoneはCommon vs specialization completionだけ直す。全文改善・Practice改訂はしない。
7. **既存contract testへstable invariantだけ追加する**
   - exact Common sets、C08 specialization、C08 learner-authored evidence / baseline separation、必要ならcanonical Native navigationまたはbounded C12のうちstable phraseに限定する。
   - Instructor Referenceの一時的transition文言や説明文の全文はassertしない。
   - 新しいJSON/YAML schema、parser、scoring framework、all-Markdown checkerは作らない。
8. **validatorはread-only**
   - repository-required assetsの存在checkとLearner Required pathを混同しない。validator変更が必要に見えたら実装を広げずstopする。

## Detailed implementation plan

### 1. `docs/adr/0020-test-automation-curriculum-native-specialization.md`

- Current issue:
  - Master PlanのDecision Bは固定済みだが、PR 3後のCurrent decisionとして独立ADRがまだない。
- Change:
  - Existing ADR styleに合わせ、Status / Date / Context / Decision / Consequences / Guardrailsで記述。
  - Common graduation profile、exact Part 1 / Part 2 Common competency sets、C08 specialization、branch / skip / rejoin、Repository-required vs Learner Required、Baseline vs learner-authored evidenceをDecisionとして固定。
  - PR 2 Formal contractとProduct Native Gateは参照するだけで非変更と明記。
- Do not duplicate:
  - C01〜C12のPrimary source / Minimum Evidence詳細はRubricへ置く。
  - specialization Lessonの具体手順はADRへ書かない。
- Validation:
  - `lint:markdown`; contract testは必要なstable decision phraseだけ参照する。

### 2. `docs/curriculum/test-automation/README.md`

- Current issue:
  - NativeがPart goals / artifacts / lesson sequenceへlinearに含まれ、learner material / support assetの分類も曖昧。
  - Fixed entry / graduation profileが一意でない。
- Change:
  - graduation profile=`entry-levelの汎用 Test Automation Engineer`を示す。
  - コース開始profileを固定。
  - learner-facing `Required Common`, `Native specialization`, `Instructor / operation support`を明示的に分類。
  - Part 1 / Part 2 exact Common competency setsとC08 specializationを示す。
  - P1 / P2 branch / skip / rejoinをlearnerがトップから辿れるnavigationとして記載。
  - Instructor / 運営は受講内容外支援を担当し、学習内容・自己確認・完了条件はlearner-facingを正本とする旨を短く案内する。
  - Minimum Evidence詳細、各specializationの具体的開始条件はそれぞれRubric / 対象Lessonへリンクし、READMEに複製しない。
- Validation:
  - `validate:curriculum`, stable navigation contract test, markdown lint。

### 3. `docs/curriculum/test-automation/00_learning_design.md`

- Current issue:
  - target audienceとprerequisiteが広く、Native環境 / 実務知識がCommon Coreの暗黙前提に見える。
  - graduation profileとself-study / Instructor support boundaryが固定Decisionほど一意でない。
- Change:
  - entry profileとgraduation profileを正本化。
  - Common prior-knowledge boundaryを明示。
  - Part completion / final graduationのexact setsを明示。
  - P1 / P2 Native branch / skip / rejoinのinstructional ruleをREADMEと整合させる。
  - specializationの具体的開始条件は対象Lessonを正本とし、Learning Designは「Common prerequisite + specialization内部prerequisiteを明示する」ルールを定義する。
  - Instructor / 運営の受講内容外支援と、learner-facing materialが担う学習内容 / 演習判断 / self-check / Recovery / completion / evaluationの境界を明示する。
- Keep unchanged:
  - 各Lessonのdepth / practice / self-check / recovery本文の全面改訂。

### 4. `docs/curriculum/test-automation/02_competency-rubric.md`

- Current issue:
  - Part 1 CommonにC08 / Androidが残る。
  - C01〜C12のMinimum Evidenceとpath classificationが一意でない。
  - Lesson / Exercise → Competency → Evidenceを直接辿れない。
  - C04 / C09 / C10 / C12のbounded Level 2がMaster Planとずれる。
  - Instructor支援や外部提出 / external reviewがRequired能力条件へ誤読され得る。
- Change:
  - level定義を「例・ヒント・詳細手順を使える状態」と「自力で実施できる状態」で区別し、Instructor支援をRequired能力条件から外す。
  - C01〜C12を、少なくとも`path classification / Primary learner-facing source / bounded Level 2 / Minimum Evidence`が一表で確認できる形へする。
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
    - C11: learner-authored Git / PR change + reviewable diff + change rationale + self-reviewまたは公開Review checklistに基づくreview evidence
    - C12: bounded Web CI Trigger / Gate / Artifact / Failure Evidence
  - C11は第三者ReviewをRequiredにしない。
  - Repository内へEvidenceを保存・記録すれば成立するものについて、外部提出をRequiredにしない。
  - Baseline / stock PASSはenvironment / harness evidenceでありcompletionではないと明記。
  - Same Rubric / Minimum Evidence / Artifactをlearner self-checkとexternal evaluationで共有。
- Why:
  - PR 3の中心Canonical assessment contractかつRA-G2 / CUR-H2の最小trace解決面。
- Keep unchanged:
  - runner / command / Artifact generator、Instructor-only hidden criteria、新scoring framework、新trace file。

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
- Contract test:
  - このtransition文言は一時的状態なので、原則としてexact wording assertionを追加しない。manual diff reviewで確認する。
- Keep unchanged:
  - 本文の情報移動・削除・全面rewrite。

### 6. `part1/07_maestro-native-automation.md`

- Current issue:
  - Physical Android / MaestroがPart 1 standard / completion requirementへ読める。
- Change:
  - Native specializationとしてlabel。
  - このLesson自身を具体的開始条件の正本とし、Common prerequisite=P1-6まで、必要なNative環境条件を明示。
  - 非選択時skip=P1-8、完了後rejoin=P1-8を明示。
  - C08 evidenceはRubricへ参照し、baselineだけをcompletionにしない。
- Keep unchanged:
  - lesson body depth / exercise designの全面改訂。

### 7. `part1/09_part1-capstone.md`

- Current issue:
  - Core only completion可の記述とC01〜C10 + Physical Android / Maestro必須が衝突。
- Change:
  - Common completionを`C01〜C07+C09〜C10` bounded L2へ固定。
  - C08 / Physical Android / Native artifactはspecialization completion evidenceとして分離。
  - Native未選択learnerがblocked / not_completedにならないことを明示。
  - RubricのMinimum Evidenceを再掲せず参照する。
- Keep unchanged:
  - capstone全体のPractice / Recovery rewrite。

### 8. `part2/06_native-ci-maestro.md`

- Current issue:
  - Native CIがlinear Common pathに見え、P1 Native capabilityがhidden prerequisiteになり得る。
- Change:
  - Native specializationとしてlabel。
  - このLesson自身を具体的開始条件の正本とする。
  - specialization開始前Common prerequisiteとP1 Native specialization由来のNative内部prerequisiteを分けて明示。
  - Common非選択時skip=P2-7、完了後rejoin=P2-7。
- Keep unchanged:
  - Training workflow / Product Native Gate / lesson depth。

### 9. `part2/08_integration-design-capstone.md`

- Current issue:
  - Playwright + Maestro + full CI/CD / Android+iOSがCommon completionに見え、C12 scopeが広い。
- Change:
  - final Common=`C01〜C07+C09〜C12` bounded L2。
  - C12 CommonをWeb CIのTrigger / Gate / Artifact / Failure Evidenceへ限定。
  - Native / multi-platform / preview-prod deliveryをspecialization / Advanced evidenceとして分離。
  - RubricのMinimum Evidenceを再掲せず参照する。
- Keep unchanged:
  - Product release workflow / Native CI implementation。

### 10. `tests/contracts/training-curriculum.test.ts`

- Current issue:
  - Fixed Decision Bの重要boundaryがexecutable contractで未固定。
  - Current text-based styleで一時的・editorialな文言まで固定するとPR 4Aを不要に拘束する。
- Change:
  - 既存file-read / text contract styleを維持し、stable canonical section / phraseだけをtargetにする。
  - 原則として次の3〜4 invariantへ限定する。
    1. Part 1 Common exact set=`C01〜C07+C09〜C10`、Part 2 / final Common exact set=`C01〜C07+C09〜C12`、C08がCommon graduation non-requiredであること。
    2. C08 Minimum Evidenceがlearner-authored change + successful Maestro runtime artifactの両方を要求し、baseline / stock PASSだけではcompletionにならないこと。
    3. Native branch / skip / rejoinのcanonical routeがREADMEまたはLearning Designのstable sectionで維持されること。
    4. C12 Commonがbounded Web CIでありfull multi-platform deliveryをCommonへ要求しないこと。stable wordingが作れない場合はmanual validationへ残す。
  - Repository-required asset existenceは既存validatorに任せ、同じassertionを重複させない。
  - Instructor Reference transition notice、self-study説明文、各Lessonのeditorial wordingはexact assertionへしない。
  - 全Markdown構造をparser化しない。
- Why:
  - 将来も守るべきDecision Bだけをguardし、PR 4Aの文章改善を阻害しないため。
- Keep unchanged:
  - scoring engine / machine-readable rubric / new framework。

### 11. `scripts/validate-curriculum.ts` — read-only

- Current issue:
  - なし。repository asset existenceとLearner Required pathを混同しないことが重要。
- Change:
  - **No change.**
- Validation:
  - `pnpm run validate:curriculum`でPR 3 docsがexisting structural contractを維持することを確認。
- Stop:
  - docs wording変更だけでcurrent validator semanticsが成立しなくなる場合は、required-file listをlearner pathへ転用したりvalidatorを拡張したりせずscope reviewする。

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
- `scripts/validate-curriculum.ts`、Product / Training / workflow / Formal docsに差分がない
- common graduation profileがREADME / Learning Designで`entry-levelの汎用 Test Automation Engineer`として一致
- entry profileとCommon prior-knowledge ruleがREADME / Learning Designで一致
- exact Common setsがREADME / Learning Design / Rubric / Capstone間で一致
- C08がCommon completionに再流入していない
- Repository-required / Learner Requiredが混同されていない
- README / Learning Design / Lessonの責務分離が守られ、具体的specialization prerequisiteを複数箇所へ不必要に複製していない
- Rubricから各C01〜C12のPrimary learner-facing sourceとMinimum Evidenceを辿れる
- Baseline PASSがcompetency completionへ昇格していない
- C11が第三者Review必須になっていない
- Repository内Evidenceで成立する箇所へ外部提出必須を導入していない
- self-study / Instructor support boundaryがREADME / Learning Designで一致
- Instructor Reference本文の移動・削除がない
- C05がPR 2 Formal contractを再定義していない
- C12 Commonがbounded Web CIを超えていない
- contract testがInstructor Referenceのtransition文言や広範なeditorial wordingへ過剰結合していない

### Planning artifact validation

本child Plan / Run Artifact作成時に本来実行すべきrepository commandは、planning環境にcloneがないため未実行だった。

```bash
pnpm run format:check
pnpm run lint:markdown
git diff --check
```

今回のPlan修正もGitHub上で行うため、repository scriptsの実行結果とは扱わない。実装開始前baselineをhard preflightとして維持する。

## Risks

- README / Learning Design / Rubric / ADRへ同じ契約を書き過ぎ、複数SSOT化する。
  - Mitigation: Canonical responsibility splitに従い、詳細の複製ではなく参照を使う。
- Lesson / Exercise → Competency → Evidence traceを別ファイルやschemaで管理しようとして仕組みが増える。
  - Mitigation: Rubric一表へPrimary sourceを追加するだけにする。
- contract testが具体文言へ過剰結合し、PR 4Aの文章改善を妨げる。
  - Mitigation: stable invariant 3〜4本に絞り、transition / editorial文言はmanual validationへ残す。
- C08 optional化をNative重要度の低下やProduct Gate変更と誤解する。
  - Mitigation: specialization completionとProduct Android/iOS gateを明示的に別契約として保持する。
- Current Trainingに未実装のrunner / ArtifactをPlanが暗黙に要求し、PR 5 scopeを前倒しする。
  - Mitigation: PR 3はEvidenceの意味と必要形を定義するだけ。実行入口・生成実装はPR 5へ残す。
- Instructor Referenceから評価情報を先に削除するとPR 4A移行前に情報が失われる。
  - Mitigation: transition noticeのみ。本文移行・削除禁止。
- self-study contractを理由に各LessonのRecovery / self-checkまでPR 3で直し始める。
  - Mitigation: PR 3は責務原則だけ。実content remediationはPR 4A。
- C11を外部Review必須、Evidenceを外部提出必須と誤解する。
  - Mitigation: Rubricでself-review / public checklistとRepository内保存を明記する。
- hidden prerequisiteがLesson本文に残る。
  - Mitigation: PR 3では4 boundary filesの矛盾文言だけ最小修正し、その他Lesson全文監査はPR 4Aへ残す。
- validatorをLearner Required path判定へ拡張して責務が混ざる。
  - Mitigation: validatorはread-only。変更必要ならstop。
- Planning環境でlocal baseline commandsを実行できていない。
  - Mitigation: implementation開始前のhard preflightとしてDoD / stop conditionへ残す。

## Stop conditions

以下が判明した場合、scopeを広げず停止してownerへ戻す。

1. Decision Bと矛盾するCurrent ADR / normative requirementが見つかる。
2. Master Planの固定graduation profile / Part 1 / Part 2 / C08能力契約ではCurrent repositoryを整合できない。
3. 4 Lesson / Capstoneのboundary修正が最小wording変更を超え、Curriculum構造変更を必要とする。
4. Instructor Referenceから情報を先に移動・削除しないとPR 3 contractを成立させられない。
5. Training implementation変更をPR 3へ入れないとMinimum Evidenceを定義できない。
6. Product behavior / Product CI Gate変更が必要になる。
7. 新しい仕様判断が必要でMaster Planから一意に決められない。
8. `Lesson / Exercise → Competency → Minimum Evidence`をRubric一表で表現できず、新しいschema / trace file /管理レイヤーが必要に見える。
9. Current auditでno-changeとしたvalidatorを変更しないとcontractを表現できない。
10. implementation開始時のlocal working treeに未commit user変更がある。
11. `docs/decision-b-competency-assessment-contract` がowner review後に別用途 / unexpected HEADへ変更されている。

## Open questions

Blocking open questionはCurrent auditではなし。

Implementation detailとして、`training-curriculum.test.ts` の最終assertion文字列はCanonical sectionの実装文面を作成した後にstable wordingへ合わせる。これはDecision Bの再判断ではなくtest brittlenessを避けるための実装詳細である。

stable wordingが作れない一時的contractは無理に自動testへ入れずmanual validationへ残す。特にInstructor Reference transition noticeはPR 4Aで状態が変わるため恒久assertion対象にしない。

Planning環境ではlocal working tree / `pnpm` baselineを確認できていないため、implementation開始前preflightの結果だけは未確定。dirty treeまたはbaseline failureがあれば、その時点でstop / classificationする。

## Follow-up

1. Ownerが本child Planをreview / approveする。
2. approval後にのみPR 3本体を実装する。
3. PR 3実装ではMust change filesに限定し、`scripts/validate-curriculum.ts`はread-onlyとする。
4. PR 3完了後、Lesson全文 / Instructor Reference移行等はPR 4A、Training runner / command / workflow / ArtifactはPR 5で対応する。
5. PR 3のPR作成は本Plan承認後に別工程で行う。

## Definition of Done

### This planning phase

- latest `main` SHAとbranch baselineが記録されている。
- Current source auditに基づき、Decision B conflict有無、次ADR番号、validator read-only / contract test必要性、4 boundary filesの変更要否が明確。
- Master PlanのPrimary owner=PR 3 / Verification=PR 3 findingを漏れなくDispositionしている。
- Must change / Read-only verificationを分離している。
- common graduation profile、submission / external review boundary、self-study / Instructor boundaryがPlanへ明示されている。
- C01〜C12 Minimum EvidenceがCurrent workbook / exercises / Training実態から浮かず、Primary learner-facing sourceまで一表で追跡する計画になっている。
- PR 4A / PR 5 scopeを前倒ししていない。
- planning phaseではPlan以外のProduct / Curriculum implementationを変更しない。
- PRを作成しない。
- local validation未実行というenvironment limitationをpass扱いせず記録する。

### Future PR 3 implementation

- Common graduation profile=`entry-levelの汎用 Test Automation Engineer`。
- Part 1 Common=`C01〜C07+C09〜C10` bounded Level 2。
- Part 2 / final Common=`C01〜C07+C09〜C12` bounded Level 2。
- C08=Native specializationでCommon completion non-required。
- entry profile / Common prior knowledge / Native branch-skip-rejoin / Repository-required vs Learner Requiredがlearner-facingに一意。
- self-study / Instructor support boundaryがREADME / Learning Designで一意。
- `提出`が暗黙の外部提出Requiredになっていない。
- C11が第三者Review Requiredになっていない。
- C01〜C12の`Primary learner-facing source / Minimum Evidence / path classification / bounded Level 2`をRubricで自己確認でき、Lesson / Exercise → Competency → Evidenceを直接辿れる。
- C04 / C05 / C08 / C09 / C10 / C11 / C12がFixed Decision通り。
- Baseline PASS / stock flow PASSとlearner-authored competency evidenceが分離。
- Instructor Referenceはtransition noticeのみ追加され、本文情報はPR 4Aまで保持。
- 4 Lesson / Capstoneはboundary wordingの最小変更に留まる。
- `training-curriculum.test.ts` はstable Decision B invariantだけを必要最小限guardし、一時的transition / editorial wordingを過剰固定していない。
- `validate-curriculum.ts`は無変更。
- Product / Formal / Training / workflow / runtime behaviorに変更なし。
- validationが成功し、allowlist外diffがない。
