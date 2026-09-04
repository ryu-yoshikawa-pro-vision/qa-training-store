# PR 3 — Decision B / Competency / Assessment Contract

## Goal

Master Planで固定済みのDecision Bを、能力・修了・評価・Learner Required / Native specialization境界のCanonical Contractとして一意化する。

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
- 上記のstable invariantだけを守る最小限のcontract test

Curriculum本文の全面改善、Product behavior、Product Native CI Gate、Training runner / workflow / Artifact実装は変更しない。

## Current understanding

### Planning audit baseline

- Original audit baseline: `main` at `b36c4d3e0f631801a9c9e4aae38990dac9e8d436`
  - `docs: Formal Test Strategy / Traceability を Current contract に整合する (#78)`
- Planning branch: `docs/decision-b-competency-assessment-contract`
- Master Plan: `docs/plans/2026-08-24_201800_curriculum_test_strategy_remediation_master.md`
- PR #78でFormal Test Strategy / TraceabilityのCurrent contractは整備済み。PR 3はC05等からそのSSOTを参照し、Test Level / Perspective / Execution・Platform Gateを再定義しない。
- Planning run時点ではCurrent ADRは`0019`までで、Decision Bと競合するCurrent ADR / normative requirementは監査範囲では確認されなかった。
- Current validatorのrequired-file listはrepository asset existence contractであり、Learner Required pathやCommon graduationを意味していない。
- Current TrainingにはWeb / Native baseline commandとlearner exercise assetsが存在するが、Native learner-authored exercise専用runner / canonical Artifact生成の完成契約はまだない。PR 3はEvidence contractを定義し、実行入口・workflow・Artifact実装はPR 5へ残す。
- Planning環境ではrepository cloneが利用できず、ローカルworking tree preflightと`pnpm` baseline commandsは実行できていない。実装開始前に実装者環境で必ず実行する。

### Current main drift after planning

2026-09-03の再レビュー時点で`main`は `8760ab5529be7a37e9195dafbd6b7bcb240dab0c` まで進んでいる。

`b36c4d3... → 8760ab5...` の差分を確認した結果、PR #100はCodex hook / Run Artifact / reference / ADR等が中心で、PR 3対象のCurriculum / Rubric / 4 boundary Lesson / `training-curriculum.test.ts` は変更されていない。

ただし、`docs/adr/0020-codex-windows-logging-hook-launcher.md` が追加済みのため、再レビュー時点のnext ADR candidateは`0021`である。

このmain driftだけを理由に全Repositoryを再Auditしない。実装開始前にownerがlatest mainへ同期し、implementation agentはplanning audit baselineからlatest mainまでのchanged fileをread-only確認して、PR 3対象ファイル / normative sourceへ影響する差分だけdelta auditする。

### Planning Run Artifactの位置づけ

`.codex/runs/20260903-013450-JST/**` はplanning実行時点のhistorical evidenceである。

- 当時のbaseline SHAや`Next ADR: 0020`は履歴として保持し、現在値へ書き換えない。
- PR 3 implementation instructionのSSOTは本child Planとimplementation開始時のlatest mainである。
- Run ArtifactをCurrent implementation instructionとして再解釈しない。

## Fixed decisions

### Common graduation profile

Common graduation profileは **entry-levelの汎用 Test Automation Engineer** とする。

具体的な卒業能力の正本は、Part 2 / final Common competency setとRubricのbounded Level 2 / Minimum Evidenceである。卒業像を別の長い能力列挙へ展開して二重管理しない。

README / Learning Designでこの卒業像を一意に示し、Rubricや各Lessonへ説明文を複製しない。

### Learner entry profile

コース開始時の対象受講者像をREADME / Learning Designで一意にする。

- テスト自動化の目的・基本概念を理解している
- ノーコード / ローコード経験または概要理解は可
- Playwright等のコードベース自動化は未経験
- プログラミング経験は必須にしない

後続Common Coreが前提にできる既習知識は次に限定する。

1. 上記コース開始時profile
2. Learner Required path上で、その時点より前に明示的に学んだCommon Core内容

Native specialization、Extension、Reference、教材外のPlaywright / TypeScript / Git / CI実務経験をCommon Coreの隠れ前提にしない。

### Common completion / specialization

- Part 1 Common completion: `C01〜C07 + C09〜C10` bounded Level 2
- Part 2 completion / final Common graduation: `C01〜C07 + C09〜C12` bounded Level 2
- `C08`: Native Automation specialization
- C08 / Physical Android / Native CIをPart 1 / Part 2 Common completionに要求しない。

### Native specialization navigation

Top-level Lesson番号・配置は変更しない。learner-facing routeは次で固定する。

- Part 1 Common: `P1-6 → P1-8 → P1-9`
- Part 1 Native specialization: `P1-6 → P1-7 → P1-8 → P1-9`
  - specialization開始前Common prerequisite: P1-6まで
  - specialization内部の前提: P1-7自身に必要なNative実行環境
  - Common Core rejoin: P1-8
- Part 2 Common: `P2-5 → P2-7 → P2-8`
- Part 2 Native specialization: `P2-5 → P2-6 → P2-7 → P2-8`
  - specialization開始前Common prerequisite: P2-5まで
  - P2-6のNative内部prerequisite: P1 Native specializationで得るMaestro実行能力
  - P1 Native specialization未修了でP2 Nativeを選ぶ場合は、そのNative内部prerequisiteを先に満たしてからP2-6へ進む
  - Common Core rejoin: P2-7
- P2-8のfull Native / multi-platform deliveryはCommon Level 2ではない。Common C12はbounded Web CIに限定する。

責務は次のように分ける。

- README: learner route / branch / skip / rejoin
- Learning Design: Common prior-knowledge / specialization prerequisiteの設計ルール
- P1-7 / P2-6: specializationの具体的開始条件

### Self-study / Instructor support boundary

PR 3ではself-study品質の**責務契約**だけを正本化し、各Lessonのself-check / Recovery改善はPR 4Aへ残す。

Instructor / 運営は次の受講内容外支援を担当してよい。

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
- C11で第三者による実ReviewをRequiredにしない。

C11はCurrent learner-facing materialだけで成立させる。

- learner-authored Git / PR change
- reviewable diff
- change rationale
- learner-facing review criteriaに基づくreview record

review対象は自分のDiffまたは教材用Diffでよい。PR 4Aで公開Review checklistが整備されても、PR 3のcompletion contractはその将来assetへ依存させない。

### Competency / Minimum Evidence

C01〜C12をlearner-facing Rubricで自己確認できる共通契約にする。外部評価でも同じRubric / Minimum Evidence / Artifactを使い、Instructor-onlyの非公開Required評価基準は作らない。

Rubricは一つの表で次を確認できる形にする。

- Competency ID
- path classification
- bounded Level 2
- Primary learner-facing source(s)
- Minimum Evidence

#### Path classificationは増やさない

PR 3でC01〜C12のclassificationは次の2種類だけ使う。

- `Common`: C01〜C07、C09〜C12。Master Plan上のLearner Required Commonを意味する。
- `Native specialization`: C08

`Advanced`、`Optional`、`Extension`等を新しいCompetency classificationとして増やさない。Master Plan上の`Advanced`は、C01〜C12の新しいpath値ではなくbounded Level 2を超えるscopeを示す境界表現として扱う。C12のfull multi-platform / delivery等はCommon L2の対象外であることをMinimum Evidence / boundary wordingで示すだけにし、別行・別competency・別schemaを作らない。

#### Primary learner-facing source(s)は必要最小数

- 1 sourceで学習内容からEvidence生成まで一意に辿れる場合は1つだけ記載する。
- 教えるLessonとEvidenceを作るWorkbook / Exerciseが別の場合だけ2つまで記載してよい。
- 3つ以上の関連文書一覧や、全関連Lessonの網羅表にはしない。

これにより `Lesson / Exercise → Competency → Minimum Evidence` のdirect traceをRubric一表で成立させる。新しいTraceability file、JSON / YAML schema、DBは作らない。

固定する重要境界は次のとおり。

- C04: technique数quotaではなく、Spec / Riskに適したtechniqueを選び、理由を説明できることを中心とする。
- C05: PR 2のFormal Test Level / Perspective / Execution・Platform Gate contractを参照し、PR 3側で再定義しない。
- C08: `learner-authored native exercise diff + successful Maestro execution artifact`。stock Native exercise / baselineを未変更でPASSしただけではcompletionにしない。Common graduationには要求しない。
- C09: Assertion typoだけでなく、Locator / Timing / Assertion等のmeaningful diagnostic evidenceを要求する。
- C10: 実在する保守問題の診断 + 理由付きの最小改善をCommon Core Level 2とする。
- C11: learner-authored Git / PR change + reviewable diff + change rationale + learner-facing review criteriaに基づくreview record。自分のDiffまたは教材用Diffで成立し、第三者ReviewはRequiredではない。
- C12: Common Level 2=`bounded Web CI`。Minimum EvidenceはTrigger / Gate / Artifact / Failure Evidence。full multi-platform / deliveryはCommon L2へ要求しない。
- Baseline PASS / stock flow PASSはenvironment / harness evidenceでありLearner competency completionそのものではない。
- Level定義は「例・ヒント・詳細手順を使った状態」と「自力で実施できる状態」を区別し、Instructor支援を能力レベルの必須前提にしない。

## Canonical responsibility split

同じ契約を複数文書へ全文複製しない。README / Learning Designへ同期するCommon sets等は値だけを最小記載し、評価詳細・Minimum EvidenceはRubricを正本とする。

| Source | Canonical responsibility | Avoid |
| --- | --- | --- |
| next ADR（再レビュー時点candidate `0021`） | Decision B、理由、変更禁止境界 | Lesson / Evidence詳細の複製 |
| Curriculum `README.md` | course entry、Common / specialization / support分類、learner navigation、Common sets | Minimum Evidence詳細、specialization内部手順 |
| `00_learning_design.md` | entry / graduation profile、Common sets、既習知識ルール、Repository-required vs Learner Required、self-study / Instructor境界、instructional rule | Minimum Evidence詳細、各Lessonの具体手順 |
| `02_competency-rubric.md` | Competency、Common / Native specialization、Primary source(s)、bounded L2、Minimum Evidence | Navigation全文、新classification体系、Training runner実装 |
| P1-7 / P2-6 | specializationの具体的開始条件、skip / rejoin、Rubric参照 | Common全体の定義 |
| P1-9 / P2-8 | Common completionとspecialization / Common外scopeの局所分離 | 全Rubricの再掲 |
| `03_instructor-reference.md` | PR 4Aまでのtransition notice | learner-facing Required criteriaの新規追加 |
| contract test | Rubric / README上のstable invariantだけ | 一時的transition文言・各文書への重複assertion・全文snapshot |
| validator | repository asset existence | Learner Required path / completion判定 |
| planning Run Artifact | planning時点のhistorical evidence | implementation instructionとしてのCurrent state再定義 |

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
- planning Run Artifactの過去記録の書き換え
- rebase / force-pushによるplanning historyの書き換え

## Impacted areas

### Must change in PR 3 implementation

| File | Reason |
| --- | --- |
| `docs/adr/<next-unused>-test-automation-curriculum-native-specialization.md` | Decision B、Common / Native completion、navigation、evidence境界をADR化する |
| `docs/curriculum/test-automation/README.md` | graduation / entry、Required / specialization / support asset、Common能力集合、learner navigationのCanonical入口を整合する |
| `docs/curriculum/test-automation/00_learning_design.md` | graduation / entry、Common prior-knowledge、self-study / Instructor boundaryを正本化する |
| `docs/curriculum/test-automation/02_competency-rubric.md` | C01〜C12 bounded Level 2 / Primary source(s) / Minimum Evidence / Common・Native specialization分類を正本化する |
| `docs/curriculum/test-automation/03_instructor-reference.md` | 冒頭のtransition noticeだけ追加する |
| `docs/curriculum/test-automation/part1/07_maestro-native-automation.md` | Part 1 Native specialization / prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part1/09_part1-capstone.md` | Common completionからC08 / Physical Androidを外す |
| `docs/curriculum/test-automation/part2/06_native-ci-maestro.md` | Part 2 Native specialization / internal prerequisite / rejoin境界へ最小同期する |
| `docs/curriculum/test-automation/part2/08_integration-design-capstone.md` | Common C12をbounded Web CIへ限定し、Native / full deliveryをCommon外へ分離する |
| `tests/contracts/training-curriculum.test.ts` | Fixed Decision Bのstable invariantだけを守る2つのtargeted test blockを追加する |

### Read-only verification

- `scripts/validate-curriculum.ts` — **変更しない**
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- `package.json`
- `training/**`
- `.github/workflows/**`
- relevant Current ADR
- `.codex/runs/20260903-013450-JST/**` — historical evidenceとしてのみ参照

## Finding ownership / disposition

| Finding | PR 3 role | Planned disposition |
| --- | --- | --- |
| RA-G2 / CUR-H2 Lesson→Competency→Minimum Evidence direct mapping不足 | Primary owner | Rubric一表へPrimary source(s) + path + bounded L2 + Minimum Evidenceを追加。新trace fileは作らない |
| CUR-H1 universal path vs Audience / Level不整合 | Primary owner | entry / graduation + Common prior knowledge + Native branch / skip / rejoinをcanonical化 |
| CUR-H3 C08 / Physical AndroidがCommon graduationに残る | Primary owner | exact Common setsからC08除外。Native evidenceはspecializationのみ |
| CUR-H6 Repository-required asset / Learner Required path混同 | Primary owner | README / Learning Designで分離。validatorはread-only |
| CUR-M2 C04 Level 2とpractice volume非対称 | Primary owner | Spec / Risk fit + rationale中心へ修正 |
| CUR-M3 C09 Failure Evidenceが弱い | Primary owner | Locator / Timing / Assertion等のmeaningful diagnosis + cause / action / rerunへ修正 |
| CUR-M5 / M7 Native baseline vs learner evidence | Primary owner | C08=learner-authored diff + Maestro artifact。runnerはPR 5 |
| CUR-M8 C12 scopeが広い | Primary owner | Common L2=bounded Web CIへ限定 |
| CUR-M12 learner self-check / external evaluation境界 | Primary owner | 同じ公開Rubric / Evidenceを使用。外部提出・第三者reviewを暗黙必須にしない |
| CUR-M13 target learner / hidden prerequisite | Primary owner | fixed entry profile + Common prior-knowledge + self-study rule |
| RA-M5 / M6 / M7 / G3 / G6 / CUR-M9 | Verification | Current Formal / Product contractを変更・再定義していないことだけ確認 |

## Change strategy

1. **Owner preconditionでlatest mainへ同期する**
   - implementation agentを開始する前に、owner側で`git fetch origin`を実行してremote-tracking refを更新し、その後planning branchへlatest `origin/main`を取り込み、clean working treeにしておく。
   - planning historyを保持するためrebase / force-pushは行わない。
   - implementation agent自身はmerge / rebase / commit / push等のGit変更操作を担当しない。branchがlatest mainを含んでいなければstopしてownerへ戻す。
2. **targeted delta audit**
   - まずplanning baselineからlatest mainまでのchanged file名だけ確認する。
   - その中にPR 3対象 / normative source / validator / Training evidence sourceがある場合だけ中身を確認する。
   - 非関連変更だけなら全面再Auditしない。
3. **ADR番号を実装時に確定する**
   - 再レビュー時点のcandidateは`0021`。
   - owner同期済みlatest mainを基準にnext unusedを採用する。
   - 番号だけの競合ではstopしない。
4. **ADRでDecision Bを固定する**
5. **READMEを対象section限定でsurgical editする**
6. **Learning Designを対象section限定でsurgical editする**
7. **Rubricは既存Competency一覧テーブル拡張 + 必要sectionの局所修正だけ行う**
8. **Instructor Referenceへtransition noticeだけ追加する**
9. **4 Lesson / Capstoneはboundary wordingだけ直す**
10. **existing contract testへ新規`it`を2つだけ追加する**
11. **validatorはread-only**

## Detailed implementation plan

### 1. `docs/adr/<next-unused>-test-automation-curriculum-native-specialization.md`

- Existing ADR styleのStatus / Date / Context / Decision / Consequences / Guardrailsで簡潔に記述する。
- 固定するのは次だけ。
  - Common graduation profile
  - Part 1 / Part 2 exact Common competency sets
  - C08 Native specialization
  - branch / skip / rejoin
  - Repository-required vs Learner Required
  - Baseline vs learner-authored evidence
  - Product / Formal gateは非変更
- C01〜C12 Minimum Evidence詳細やLesson手順を複製しない。
- contract testはADR本文をassert元にしない。

### 2. `docs/curriculum/test-automation/README.md`

新しいsectionを足すだけではなく、既存のCommon / Native混同箇所を**以下の対象section内で**surgical editする。対象section内またはその契約を直接説明する近接文にFixed Decisionとの明確な矛盾があれば、その矛盾文だけ同時に修正してよい。関連するeditorial cleanupや全文監査へは広げない。

#### Edit scope

1. **目的 / Part 1**
   - Maestro Nativeを全員必須のCommon目標として読める表現を外す。
   - Common Web能力とNative specializationを分離する。
2. **目的 / Part 2**
   - Playwright + Maestro + full deliveryを一括Common目標として読める表現を外す。
   - Commonはbounded Web CI、Native / full multi-platformはCommon外と明示する。
3. **全体構成 / navigation**
   - P1-7とP2-6をNative specializationとして表示する。
   - Common route / Native route / skip / rejoinを一箇所のstable navigation sectionで示す。
4. **教材分類**
   - Learner Required Common / Native specialization / Instructor・operation supportを分ける。
   - Repository-required assetとLearner Required pathは別概念であることを明示する。
   - `03_instructor-reference.md`をRepository-required support assetとして残しつつLearner Requiredから外す。
5. **学習成果物**
   - Maestro Flow / Native artifactをCommon必須成果物として読める一覧から分離する。
6. **entry / graduation**
   - fixed entry profileと`entry-levelの汎用 Test Automation Engineer`を短く示す。
7. **Common completion contract**
   - Part 1 Common=`C01〜C07+C09〜C10` bounded Level 2。
   - Part 2/final Common=`C01〜C07+C09〜C12` bounded Level 2。
   - C08=`Native specialization` / Common non-required。
8. **self-study boundary**
   - Instructor / 運営は受講内容外支援、学習・self-check・completion・evaluationはlearner-facing SSOTと短く案内する。

#### Do not edit

- Current Product guaranteeの再定義
- Training入口・workflow説明の全面整理
- 用語統一
- Lesson本文に相当する説明追加
- Minimum Evidence詳細
- 対象section外の無関係なeditorial cleanup

#### Contract responsibility

Native branch / skip / rejoinの自動assert元はREADMEのstable navigation sectionだけにする。contract testが`toContain`できるstable canonical bulletを、少なくとも次の表記で置く。

- `Part 1 Common: P1-6 → P1-8 → P1-9`
- `Part 1 Native: P1-6 → P1-7 → P1-8 → P1-9`
- `Part 2 Common: P2-5 → P2-7 → P2-8`
- `Part 2 Native: P2-5 → P2-6 → P2-7 → P2-8`

これらはmachine-readable schemaではなくlearner-facingな短いnavigation bulletとし、parser / helperを追加しない。

### 3. `docs/curriculum/test-automation/00_learning_design.md`

既存のCommon / Native直列前提を解消するため、**以下の対象section内で**surgical editする。対象section内またはその契約を直接説明する近接文にFixed Decisionとの明確な矛盾があれば、その矛盾文だけ同時に修正してよい。対象外の全文整理・editorial cleanupには広げない。

#### Edit scope

1. **対象者**
   - fixed entry profileへ整合する。
   - broader personaは説明として残してよいが、Common prerequisiteへ昇格させない。
2. **Part 1の前提**
   - Common開始条件とNative specialization開始Gateを明確に分離する。
   - Physical Android / Maestro GateをPart 1 Common completion prerequisiteとして読ませない。
3. **Part 2の前提**
   - Common prerequisiteとNative specialization内部prerequisiteを分ける。
   - P2 NativeのCommon prerequisite=P2-5まで、Native内部prerequisite=P1 Native specialization由来のMaestro実行能力とする。
4. **学習順序 Part 1**
   - Maestroを直列Common stepからbranchへ変更し、P1-8へrejoinする形を示す。
5. **学習順序 Part 2**
   - Native CIを直列Common stepからbranchへ変更し、P2-7へrejoinする形を示す。
6. **entry / graduation / Common prior knowledge**
   - fixed entry / graduation profileとhidden prerequisite禁止を明示する。
7. **Common completion contract**
   - Part 1 Common=`C01〜C07+C09〜C10` bounded Level 2。
   - Part 2/final Common=`C01〜C07+C09〜C12` bounded Level 2。
   - C08=`Native specialization` / Common non-required。
8. **Repository-required vs Learner Required**
   - repositoryに存在すべきassetとLearner Required material / completion requirementを分離する。
   - `03_instructor-reference.md`はRepository-required support assetだがLearner Required pathではない。
9. **self-study / Instructor boundary**
   - learner-facing materialと環境支援の責務を明示する。

#### Do not edit

- 各Lessonのdepth / practice / self-check / Recovery本文
- 用語表全体
- Training Copy / workflowの実装契約
- Native環境手順の詳細
- 対象section外の無関係なeditorial cleanup

#### Contract test

README / Rubricと同じ内容を重複assertしない。整合はmanual cross-checkする。

### 4. `docs/curriculum/test-automation/02_competency-rubric.md`

PR 3の中心SSOT。ただしRubric全体を再構成しない。変更は次の既存sectionへ限定する。

1. **`Competency一覧`テーブルを拡張する**
   - 既存C01〜C12の行と既存`Competency`名を維持し、次を一表で確認できる列構成へする。
     - Competency ID
     - Competency
     - path classification
     - bounded Level 2
     - Primary learner-facing source(s)
     - Minimum Evidence
   - 別のRubric schema / machine-readable tableを追加しない。
2. **`Level定義`のLevel 1 / Level 2だけ必要最小限修正する**
   - Level 1: 例・ヒント・詳細手順を使って実施できる。
   - Level 2: 自力で実施し、判断理由とEvidenceを説明できる。
   - Instructor支援の有無を能力レベル定義へ埋め込まない。
3. **`Part 1修了基準`は詳細Evidence一覧を修繕せず、集合と境界だけへ短縮する**
   - `Part 1 Common: C01〜C07 + C09〜C10` bounded Level 2 と明示する。
   - 各Competencyの評価詳細 / Minimum Evidenceは上記`Competency一覧`を参照させ、修了基準側へ再列挙しない。
   - C08 / Physical Android / Native evidenceはCommon completionに要求しない。
   - Baseline / stock PASSだけではlearner-authored competency evidenceの代替にならないことだけ境界として残す。
4. **`Part 2修了基準`も詳細Evidence一覧を修繕せず、集合と境界だけへ短縮する**
   - `Part 2 / Final Common: C01〜C07 + C09〜C12` bounded Level 2 と明示する。
   - 各Competencyの評価詳細 / Minimum Evidenceは上記`Competency一覧`を参照させ、Training Copy / Android baseline / API version / Delivery SHA等をCommon修了基準として再列挙しない。
   - C08はCommon completionに要求しない。
   - C12 Commonはbounded Web CIに限定し、Native / multi-platform / deliveryはCommon completionから外す。
   - 既存のLevel 3相当の比較・提案はCommon Requiredから外し、bounded Level 2外のchallenge / Advanced scopeとして扱う。新しいclassificationは追加しない。
5. **`採点表`は原則維持し、`Delivery / Level 2`セルだけC12へ同期する**
   - `Delivery / Level 2`はRepository固有のAllowlist中心表現から、bounded Web CIの`Trigger / Gate / Artifact / Failure Evidence`を説明・確認できる内容へ局所修正する。
   - それ以外はFixed Decisionと直接矛盾するセルがある場合だけ局所修正する。
   - 表の削除・全面再設計・新しい採点体系の導入はしない。

#### Path classification

- C01〜C07: `Common`
- C08: `Native specialization`
- C09〜C12: `Common`

`Common`はMaster Plan上のLearner Required Commonを意味する。`Advanced`はbounded Level 2外scopeを説明する語としてのみ使用し、C01〜C12の新しいclassificationにはしない。これ以外のclassificationを追加しない。

#### Primary source(s)

- 1 sourceで学習 + Evidence生成まで辿れる → 1つ
- LessonとWorkbook / Exerciseが分かれる → 最大2つ
- 3つ以上列挙しない

#### Minimum Evidence anchors

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
- C11: learner-authored Git / PR change + reviewable diff + change rationale + learner-facing review criteriaに基づくreview record
- C12: Common Level 2=`bounded Web CI`; Trigger / Gate / Artifact / Failure Evidence

#### Completion boundaries

- Part 1 Common=`C01〜C07+C09〜C10`
- Part 2/final Common=`C01〜C07+C09〜C12`
- C08はCommon non-required
- Baseline / stock PASSだけではC08 completionにならない
- C11はself-review / 教材用Diff reviewで成立。第三者Review不要
- external submissionはRequiredではない

#### Contract responsibility

Rubricを次の自動assert元とする。contract testが`toContain`できるstable canonical bulletを、少なくとも次の表記で置く。

- `Part 1 Common: C01〜C07 + C09〜C10`
- `Part 2 / Final Common: C01〜C07 + C09〜C12`
- `C08: Native specialization / Common non-required`
- `C12 Common Level 2: bounded Web CI`

C08 learner-authored evidence / baseline separationも同じRubric内に短いstable wordingで明示し、Test 1から直接assertする。自然文の言い換え候補を実装時に再設計しない。

### 5. `docs/curriculum/test-automation/03_instructor-reference.md`

冒頭にtransition noticeだけ追加する。

- learner-facing learning SSOTではない
- Common / specialization completionの正本ではない
- 現在残るFacilitation / 判断 / Recovery / 評価情報はPR 4Aで仕分け・移行するtransitional content
- PR 4Aで必要情報を移す前に既存本文を削除しない

本文の移動・削除・rewriteは行わない。transition noticeは自動assertしない。

### 6. `part1/07_maestro-native-automation.md`

変更は次だけに限定する。

- Native specialization label
- Common prerequisite=P1-6まで
- 必要なNative環境条件はこのLessonの具体的開始条件として扱う
- 非選択時skip=P1-8
- 完了後rejoin=P1-8
- C08 Minimum EvidenceはRubric参照
- baselineだけをcompletionにしない

#### Existing contractは壊さない

Current `training-curriculum.test.ts` が既に固定しているphysical-device / baseline / Evidence / serial / artifact contractは変更しない。少なくとも既存testが参照する次のtoken /意味を不用意に削除・改名しない。

- `Android physical device`
- `adb devices -l`
- `-RequirePhysicalDevice`
- `-DeviceSerial`
- `$runId`
- `TARGET_SERIAL`
- `TRAINING_MAESTRO_OUTPUT_DIR`
- `.artifacts/native-local`
- `Training Maestro baseline`
- `Evidence`

これらを変える必要が出た場合はPR 3のboundary wording変更を超えているためstop / scope reviewする。

Lesson body depth / exercise designの全面改訂はしない。

### 7. `part1/09_part1-capstone.md`

- Common completion=`C01〜C07+C09〜C10` bounded L2
- C08 / Physical Android / Native artifactはspecialization evidenceとして分離
- Native未選択learnerをblocked / not_completedにしない
- Minimum Evidence詳細はRubric参照

Practice / Recovery rewriteはしない。exact setはRubricでのみ自動assertし、Capstoneはmanual cross-checkする。

### 8. `part2/06_native-ci-maestro.md`

- Native specialization label
- specialization開始前Common prerequisite=`P2-5`までと明示
- P1 Native specialization由来のMaestro実行能力をNative内部prerequisiteとして明示
- P1 Native specialization未修了でP2 Nativeを選ぶ場合は、そのNative内部prerequisiteを先に満たす必要があることを明示
- Common非選択時skip=P2-7
- 完了後rejoin=P2-7

Training workflow / Product Native Gate / lesson depthは変更しない。Lesson固有文言は新規assertしない。

### 9. `part2/08_integration-design-capstone.md`

- final Common=`C01〜C07+C09〜C12` bounded L2
- C12 Common=`bounded Web CI`
- Trigger / Gate / Artifact / Failure EvidenceまでをCommonにする
- Native / multi-platform / preview-prod deliveryをCommon completionから分離する
- Minimum Evidence詳細はRubric参照

Product release workflow / Native CI implementationは変更しない。exact set / C12はRubricでのみ自動assertする。

### 10. `tests/contracts/training-curriculum.test.ts`

新規helper / parser / matcherを作らない。既存の`readFileSync` + `toContain` styleを使う。

**新規`it` blockは2つだけ追加する。**

#### Test 1: Common competency / Native specialization contract

例: `keeps the Common competency and Native specialization contract`

Rubricを1回だけ読み、同じblock内でPlan固定のstable canonical bullet / wordingを`toContain`する。

- `Part 1 Common: C01〜C07 + C09〜C10`
- `Part 2 / Final Common: C01〜C07 + C09〜C12`
- `C08: Native specialization / Common non-required`
- C08 learner-authored change + successful Maestro artifactのstable wording
- baseline / stock PASSだけではC08 completionにならないstable wording
- `C12 Common Level 2: bounded Web CI`

#### Test 2: Native branch / rejoin route

例: `keeps the Native specialization branch and rejoin routes`

READMEを1回だけ読み、同じblock内でPlan固定のstable canonical navigation bulletを`toContain`する。

- `Part 1 Common: P1-6 → P1-8 → P1-9`
- `Part 1 Native: P1-6 → P1-7 → P1-8 → P1-9`
- `Part 2 Common: P2-5 → P2-7 → P2-8`
- `Part 2 Native: P2-5 → P2-6 → P2-7 → P2-8`

#### Do not add

- 1 invariant = 1 `it` の分割
- Learning Design / Capstone / Lesson / Instructor Referenceの同義文言assert
- ADR本文assert
- Instructor transition文言assert
- all-Markdown parser
- machine-readable Rubric

Cross-document consistencyはmanual validationする。

### 11. `scripts/validate-curriculum.ts` — read-only

**No change.**

Current required-file listはrepository asset existence contractとして維持する。Learner Required path判定へ転用しない。

Docs wording変更だけでvalidator変更が必要に見えた場合は、validatorを拡張せずstop / scope reviewする。

## Validation

### Implementation開始前 preflight

#### Owner precondition: latest main sync

implementation agent開始前にowner側で次を完了しておく。

- `git fetch origin`でremote-tracking refを更新済み
- planning branchへlatest `origin/main`をmerge済み
- rebase / force-pushは行わずplanning historyを保持
- working treeはclean

implementation agentはmerge / rebase / commit / push等のGit変更操作を行わない。

#### Step 1: implementation agentのread-only state check

```bash
git status
git branch --show-current
git log -1 --oneline origin/main
git merge-base --is-ancestor origin/main HEAD
```

- working treeがdirtyならstopする。
- branchが`docs/decision-b-competency-assessment-contract`であることを確認する。
- `origin/main`がHEADのancestorでなければlatest main未同期としてstopし、ownerへ同期を依頼する。

#### Step 2: targeted delta audit

まずchanged file名だけ確認する。

```bash
git diff --name-only b36c4d3e0f631801a9c9e4aae38990dac9e8d436..origin/main
```

出力の中に次がある場合だけ内容を確認する。

- PR 3 Must change files
- `scripts/validate-curriculum.ts`
- `docs/08_testing/test_strategy.md`
- `docs/12_quality/requirements_traceability.md`
- relevant ADR
- `package.json` / Training entry / relevant workflow

判断:

- 該当差分なし → existing auditを利用してdelta audit終了。全面再Auditしない。
- 該当差分あり → その変更箇所だけ再Auditする。
- Decision Bと競合 → stop。

#### Step 3: ADR allocation

```bash
ls docs/adr
```

- 再レビュー時点candidate=`0021`。
- owner同期済みlatest main上のnext unusedを採用する。
- 番号だけが消費済みなら次番号で継続する。
- 内容競合だけstopする。

#### Step 4: baseline validation

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
```

Planning runでは未実行。失敗時はPR 3実装前から存在するbaseline failure / environment-dependent failureとして切り分け、必要な場合だけlatest mainとの差を確認する。実装前failureをPR 3実装由来として扱わない。

### PR 3 implementation validation

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run validate:curriculum
pnpm run test:contracts
pnpm run typecheck
git diff --check
```

### Manual cross-check

実装差分はcommit済み`HEAD`ではなくworking tree / untracked fileを基準に確認する。

```bash
git status --short
git diff --name-only
git ls-files --others --exclude-standard
```

- `git status --short`、`git diff --name-only`、`git ls-files --others --exclude-standard`でtracked / untrackedの実装差分を確認し、planned filesだけである
- `scripts/validate-curriculum.ts`、Product / Training / workflow / Formal docsに差分なし
- next ADR番号がlatest main上で未使用
- READMEの指定edit scope内と、その契約を直接説明する近接文だけでCommon / Native矛盾が解消されている
- Learning Designの指定edit scope内と、その契約を直接説明する近接文だけでCommon / Native直列前提が解消されている
- common graduation profileがREADME / Learning Designで一致
- entry profile / Common prior-knowledge ruleがREADME / Learning Designで一致
- exact Common setsがREADME / Learning Design / Rubric / Capstone間で一致
- P2 NativeのCommon prerequisite=P2-5まで、Native内部prerequisite=P1 Native specialization由来のMaestro実行能力で一致
- C08がCommon completionへ再流入していない
- Repository-required / Learner Requiredが混同されていない
- Rubric classificationが`Common` / `Native specialization`の2種類だけで、`Common`がLearner Required Commonを意味し、`Advanced`はbounded L2外scope表現に留まる
- Rubricは既存Competency一覧テーブルの`Competency`名を保持した列拡張 + Level 1/2・Part 1/2修了基準の局所修正に留まり、Rubric全体を再構成していない
- Part 2 Common completionにLevel 3相当の比較・提案をRequiredとして残していない
- Primary source(s)が1〜2個で、3つ以上の関連文書一覧になっていない
- C11がCurrent learner-facing materialだけで成立し、第三者Review / 将来Review checklistを必須にしていない
- Baseline PASSがcompetency completionへ昇格していない
- C12 Commonが`bounded Web CI`を超えていない
- P1-7のexisting physical-device / baseline / Evidence / serial / artifact contractを壊していない
- Instructor Reference本文の移動・削除なし
- contract testの新規`it`が2つだけ
- contract testがRubric / README以外の同義文言へ重複assertしていない
- historical planning Run Artifactを書き換えていない

## Risks

- README / Learning Designの新sectionだけ追加して既存のNative必須表現が残る。
  - Mitigation: edit scope内と、その契約を直接説明する近接文の明確な矛盾だけ同時修正する。
- README / Learning Designを全面整理し始める。
  - Mitigation: edit scope外の無関係なeditorial cleanupをPR 4Aへ残す。行数ではなく対象section / contractで境界を切る。
- Rubric全体を一つの巨大表へ再構成する。
  - Mitigation: 既存Competency一覧テーブルの`Competency`名を保持した列拡張 + Level 1/2・Part 1/2修了基準の局所修正だけ。採点表は直接矛盾時のみ局所修正。
- RubricにAdvanced / Optional等の新classification体系を作る。
  - Mitigation: C01〜C12は`Common` / `Native specialization`の2種類だけ。Advancedはbounded L2外scope表現のみ。
- Primary source(s)が巨大なtrace一覧になる。
  - Mitigation: 1 sourceを原則、必要時のみ2 source、3以上禁止。
- contract testを4〜6個の`it`へ細分化する。
  - Mitigation: 新規`it`はRubric用1つ + README用1つの計2つだけ。
- contract testが各文書の同義phraseへ過剰結合する。
  - Mitigation: Rubric / READMEだけassert。cross-documentはmanual review。
- P1-7の文章整理で既存contract tokenを壊す。
  - Mitigation: existing token / semanticsを明示して変更禁止。必要ならstop。
- implementation agentがlatest main同期やGit履歴操作まで担当する。
  - Mitigation: latest main同期はowner precondition。agentはread-only state checkだけ行い、merge / rebase / commit / pushをしない。
- Current Trainingに未実装のrunner / Artifactを前倒しする。
  - Mitigation: PR 3はEvidence contractのみ。runner / workflowはPR 5。
- self-study contractを理由にLesson Recovery / self-checkまで直す。
  - Mitigation: PR 3は責務原則のみ。content remediationはPR 4A。
- validatorをLearner Required判定へ拡張する。
  - Mitigation: validatorはread-only。必要ならstop。

## Stop conditions

以下が判明した場合、scopeを広げず停止する。

1. latest mainのdelta auditでDecision Bと矛盾するCurrent ADR / normative requirementが見つかる。
2. fixed Part 1 / Part 2 / C08 contractではCurrent repositoryを整合できない。
3. README / Learning Designの指定edit scope + 直接関係する近接矛盾文の局所修正を超え、別sectionの構造変更・広範囲rewriteが必要になる。
4. 4 Lesson / Capstoneのboundary修正が局所wording変更を超え、Curriculum構造変更を必要とする。
5. P1-7のspecialization境界修正にexisting physical-device / baseline / serial / artifact contract変更が必要になる。
6. Instructor Referenceから情報を移動・削除しないとPR 3 contractを成立させられない。
7. Training implementation変更を入れないとMinimum Evidenceを定義できない。
8. Product behavior / Product CI Gate変更が必要になる。
9. 新しい仕様判断が必要でMaster Planから一意に決められない。
10. 既存Competency一覧テーブルの拡張ではtraceを表現できず、新しいschema / trace file / 管理レイヤーが必要に見える。
11. validatorを変更しないとcontractを表現できない。
12. implementation開始時のlocal working treeに未commit user変更がある。

次はStop conditionではない。

- ADR candidate番号が別PRで消費された → next unusedを使う。
- latest mainにPR 3非関連変更だけが入った → owner同期済みbranchでtargeted delta確認して継続する。
- planning Run Artifactにold baseline / old ADR candidateが残る → historical evidenceとして保持する。

## Open questions

Blocking open questionはなし。

Contract testのassertion文字列は本Planで固定したRubric / READMEのstable canonical bullet / wordingを使用する。実装者はassert対象・表記・test block構成を再設計しない。

## Follow-up

1. Ownerが本child Planをreview / approveする。
2. approval後、ownerがplanning branchへlatest `origin/main`をmergeし、clean working treeにする。
3. implementation agentはGit変更操作をせず、latest main包含 / clean stateをread-only確認する。未同期ならstopする。
4. targeted delta audit後、next unused ADR番号を確定する。
5. Must change filesだけ実装し、validator / Product / Formal / Training / workflowは変更しない。
6. PR 3完了後、Lesson全文 / Instructor Reference移行はPR 4A、Training runner / command / workflow / ArtifactはPR 5で対応する。
7. 本Plan承認後、PR 3を実装する前提のOPEN PRを先に作成し、そのPR上で実装・検証を進める。PR本文ではplanning-onlyの現状と未実装であることを明示する。

## Definition of Done

### This planning phase

- planning baselineとlatest main driftが区別されている。
- latest main同期はowner preconditionであり、ownerが先に`git fetch origin`でremote-tracking refを更新し、implementation agentはGit変更操作を行わないことが明確。
- ADR番号はimplementation時のnext unusedで決める。
- Run Artifactはhistorical evidenceでimplementation SSOTではない。
- README / Learning Designのedit scopeがsection / contract単位で固定され、直接関係する近接矛盾文だけ局所修正できる。
- README / Learning Designの両方にexact Common setsとRepository-required / Learner Required境界が実装対象として明示されている。
- Rubric classificationは`Common` / `Native specialization`だけで、Master Plan上のAdvancedはbounded L2外scope表現として扱う。
- Rubricは既存Competency一覧テーブルの`Competency`名を保持した列拡張 + 既存section局所修正で実装することが固定されている。
- Part 1 / Part 2修了基準は集合・境界だけへ短縮し、評価詳細 / Minimum EvidenceをCompetency一覧へ一元化することが固定されている。
- `Delivery / Level 2`セルはC12 bounded Web CIへ局所同期し、Part 2 Common completionはbounded Level 2、Level 3相当はCommon Requiredではないことが固定されている。
- Primary source(s)は最大2つ。
- C11はCurrent learner-facing materialだけで成立する。
- contract testはRubric用1 block + README用1 blockの計2つで、assert対象のstable canonical bullet / wordingもPlan上で固定されている。
- P1-7 existing contractを壊さない境界が明示されている。
- validatorはread-only。
- PR 4A / PR 5 scopeを前倒ししていない。
- local validation未実行をpass扱いしていない。
- 実装前提のOPEN PRをplanning-only状態で作成してよく、PR本文で未実装・実装予定scope・validation予定を明示する。

### Future PR 3 implementation

- ownerが`git fetch origin`後にlatest mainをmerge済みで、implementation agentがread-only state checkとtargeted delta auditを完了している。
- next unused ADRを使用。
- Common graduation profile=`entry-levelの汎用 Test Automation Engineer`。
- Part 1 Common=`C01〜C07+C09〜C10` bounded Level 2。
- Part 2/final Common=`C01〜C07+C09〜C12` bounded Level 2。
- C08=`Native specialization`、Common non-required。
- README / Learning Designの既存Native必須表現が指定edit scope + 直接関係する近接矛盾文の局所修正で解消されている。
- entry / prior knowledge / branch-skip-rejoin / Repository-required vs Learner Requiredが一意。
- self-study / Instructor boundaryが一意。
- `提出`が外部提出Requiredになっていない。
- C11がself-review / 教材用Diff reviewで成立し、第三者Review Requiredではない。
- Rubricの既存Competency一覧テーブルが既存`Competency`名を保持し、`Common` / `Native specialization`だけを使い、C01〜C12のPrimary source(s) / bounded L2 / Minimum Evidenceを示す。Rubric全体は再構成していない。
- Part 1 / Part 2修了基準はexact Common set + boundary + Competency一覧参照だけに短縮され、Evidence詳細を重複管理していない。
- `Delivery / Level 2`はC12 bounded Web CIへ同期し、Part 2 Common completionはbounded Level 2で、Level 3相当の比較・提案をCommon Requiredにしていない。
- Primary source(s)は最大2つ。
- C04 / C05 / C08 / C09 / C10 / C11 / C12がFixed Decision通り。
- Baseline PASS / stock PASSとlearner-authored evidenceが分離。
- Instructor Referenceはtransition noticeのみ。
- 4 Lesson / Capstoneはboundary wordingの最小変更だけ。
- P1-7 existing physical-device / baseline / serial / artifact contractを維持。
- `training-curriculum.test.ts` の新規`it`は2つだけで、本Plan固定のRubric / README canonical bullet / wordingのみguard。
- `validate-curriculum.ts`無変更。
- Product / Formal / Training / workflow / runtime behavior無変更。
- historical Run Artifact無変更。
- validation成功。`git status --short`、`git diff --name-only`、`git ls-files --others --exclude-standard`でtracked / untrackedを含むallowlist外diffがない。
