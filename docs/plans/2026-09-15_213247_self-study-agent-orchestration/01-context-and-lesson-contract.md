# 詳細1：前提・Lesson共通契約・監査対象

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、インデックスから参照するPlan詳細です。収録した既存節の本文は、分割前Planの内容を維持しています。

## 0. 依頼概要

### 依頼内容

- 講師がいなくても、受講者がカリキュラムを開始し、必要なInputを確認し、実施し、結果を解釈し、失敗から復帰し、完了を自己判定し、次Lessonへ成果物を引き渡せる状態にする。
- Test Caseが前Lessonで作られる場合は、その成果物を次LessonのInputとして明示する。ただし、全LessonでTest Caseを事前配布する設計にはしない。
- Playwright / Maestro / Workbook / CIのTraining資材が、受講者の実装成果を評価できるようにする。
- ユーザーが明示しなくても、複数Agentをタスクの性質に応じて自律的に活用できるよう、役割・起動条件・結果統合・終了手順を整備する。

### 背景

- 現在のカリキュラムは17 canonical Lesson、Workbook、Rubric、Training入口を持ち、概念の順序とRecoveryの骨格はある。
- 一方、Lesson単位のInput / Output / Handoffが標準化されておらず、P1-2の分析結果をP1-3、P1-4、P1-5へ渡す際に、学習者が複数資料から前提を推測する必要がある。
- 現行TrainingのPASSは、starter / baselineが動いたことと、学習者が有意なAssertionや差分を作ったことを分離して判定できない。
- Part 2はTraining Copy、GitHub Actions、権限、Artifactを前提にするが、講師なしで準備・復旧する一連の入口が不足している。
- Repositoryには5種類のcustom Agentがあるが、タスク規模・リスクに応じた標準routingは明文化されていない。

### 期待成果

- 受講者が「何を準備し、何を作り、何を見て、何ができれば完了か」をLessonごとに判断できる。
- Test Case、実装、実行結果、失敗回復、Evidenceを同じIDで追跡できる。
- `stock PASS`を学習成果と誤認しない。
- Parent Agentが必要なときに複数の読み取り専用Agentを並列起動し、実装・検証・最終判断を安全に分担できる。

## 1. ゴール / 完了条件

### 1.1 ゴール

次の学習ループを、講師の判断なしで完結できる状態にする。

```text
開始条件(Input)
  → なぜ学ぶか
  → 完成例
  → 実施(Activity)
  → 期待する観測
  → 失敗時Feedback / Recovery
  → 修正・再実行
  → Output / Evidence
  → DoD
  → 次LessonへのHandoff
```

### 1.2 実装完了時のDoD

- 17 canonical Lessonすべてが、共通のInput / Activity / Output / DoD / Feedback / Recovery / Handoff形式で読め、17行のLesson監査表と各本文の対応が取れている。
- P1-2 → P1-3 → P1-4 → P1-5 → P1-6を、学習者所有の1件 `TC-CART-101` を使った縦断例で実行できる。既存の `TC-CART-001/002` は提供される参照例であり、学習者の完了成果には数えない。
- P1-3が学習者作成CaseのLesson、P1-4が導入用の提供Case `TC-PRODUCT-001`、P1-5がP1-3の `TC-CART-101` を実装するLessonであることを入口に表示する。
- 各LessonのOutputに、ファイル名または既存の構造化記録、形式、保存先または参照方法、後続Lessonでの使用方法がある。コード・CIが直接読むものを除き、学習者の物理的な保存場所は一律固定しない。
- Trainingのbaseline / stock PASSとlearner-ownedの差分・Assertion・Evidenceを別々に判定できる。
- Failure演習で、初回Failure、原因、修正、再実行成功、Evidenceの組を確認できる。
- Part 2を、提供された安全なWorkflowと準備手順を使い、GitHub Account、Fork / Training Copy、Permission、Actions実行、Artifact確認まで学習者自身で開始・完了できる。Common課程の完了にはGitHub Actionsを要求しない。
- Cartの`RANK_REQUIRED`、Reviewの`NOT_OWNER`など、仕様上重要な未検証条件を追加テストまたは明示的な対象外判断で扱う。
- Agent利用の標準routing、出力契約、並列化条件、close lifecycle、Run記録方法がRepositoryの正本にある。
- 既存のCommon / Native specialization、Product / Formal Regression、Run / Safety契約を不用意に変更していない。
- 修了確認がPASS / INCOMPLETE / BLOCKED / FAIL / NOT_RUNを区別し、環境ブロックや静的validatorのPASSを学習完了へ誤変換しない。

### 1.3 Plan自体の完了条件

- 本Planが`docs/plans/`へ保存されている。
- 既存Planとの重複・依存・保護対象が整理されている。
- 実装Wave、対象ファイル、検証、停止条件、Owner判断が明記されている。
- 未回答の重要質問が、実装開始前に判断できる形で列挙されている。
- 17 Lessonの監査表、Wave間のentry / exit gate、exact write set、rollback境界、検証の期待結果が相互に矛盾しない。

## 2. 現状理解と前提

### 2.1 確認済みの事実

- canonical LessonはP1-01〜P1-09、P2-01〜P2-08の17件である。任意参考資料と過去参照用別名は必須経路と分離されている。
- `corepack pnpm run validate:curriculum`は、22 required documents、4 workbook files、Training projectを検証するが、受講者の理解・差分・Evidence・Handoffの達成は判定しない。
- `corepack pnpm run typecheck:training`は成功している。
- `training/playwright/exercises/training-exercise-starter.spec.ts`は現状、Resetと画面遷移中心で、学習者必須の有意なAssertionを機械的に要求しない。
- `training/maestro/exercises/native-training-exercise.yaml`はbaseline到達を含むstarterであり、学習者の追加差分と成功Artifactの対応を単独では判定しない。
- `training/workbook/README.md`にはTraceability、Case例、空欄条件があるが、Lesson本文から直接たどるInput / Output契約ではない。
- `scripts/verify` / `scripts/verify.ps1`は、Agentファイル、権限、Run / Hookの一部を静的検証するが、タスクごとのAgent選択条件や結果統合手順は検証しない。
- `.codex/config.toml`は`max_threads = 4`、`max_depth = 1`、`default_subagent_model = "gpt-5.6-luna"`、`default_subagent_reasoning_effort = "max"`を持つ。
- `.codex/agents/`には`code_researcher`、`implementation_researcher`、`test_investigator`、`implementation_worker`、`quality_gate_runner`がある。
- Parentが要件解釈、Plan、scope、validation、failure interpretation、completion decisionを担い、childは追加Agentを起動しないという安全契約は既にある。

#### 用語の整理

| 用語 | このPlanでの意味 |
| --- | --- |
| 受講者向け修了確認 | 学習者がLesson / Trainingの完了条件を満たしたかを、成果物・実行結果・Evidenceから確認する仕組み。ローカルで実行でき、同じ確認をGitHub Actionsでも実行する。 |
| GitHub Actions | テストや受講者向け修了確認をGitHub上で実行するCIの実行基盤。修了確認そのものではない。 |
| `validate:curriculum` | Lesson、Workbook、Training資材などRepository側の静的な整合性を確認する既存validator。学習者の理解や成果物の修了判定は行わない。 |
| 非コード成果物 | Test Case、Target / Risk、Automation Mapping、Execution / Improvementなどを記録する既存WorkbookのCSV、および必要に応じた分析メモや図。 |

このPlanでは、原則「受講者向け修了確認」と記載し、GitHub Actionsとは別の仕組みとして扱う。

### 2.2 Repository mappingとBaseline evidence

- Baseline refは、Plan作成時点の`main`上の`22f73a98e5e11c9ee622512345b17e85694537e9`とする。対象PlanとRun Artifactは未追跡の今回作業であり、既存の`coverage/`および他のRun Directoryを今回の変更対象へ取り込まない。
- Entry pointsは、`docs/curriculum/test-automation/README.md`、`docs/curriculum/test-automation/00_learning-design.md`、`package.json`、`training/README.md`である。実行入口は`training:web:baseline` / `training:web:exercise` / `training:web:check-expected-failure`、`training:copy:prepare` / `training:copy:validate`、`training:native:baseline` / `training:native:exercise`である。
- Main learning flowは、P1-1〜P1-9のCommon route、P1-7のNative opt-in、P2-1〜P2-8のGitHub Actions routeである。既存READMEのroute記載を変更する場合は、Canonical LessonのID・skip / rejoinを同時に更新する。
- Key abstractionsは、`test_case_id`によるWorkbook Trace、`resetScenario` / Test Controlによる再現可能な状態、Training baselineとlearner exerciseの分離、Training Copyのactive workflow allowlist、Run ContextとEvidenceである。
- Existing testsは、`tests/contracts/training-curriculum.test.ts`、`tests/contracts/ci-workflow.test.ts`、`tests/contracts/native-ci-workflow.test.ts`、`tests/integration/cart-use-cases.test.ts`、`tests/integration/review-user-use-cases.test.ts`である。追加対象は既存ACとTest Caseの対応が確認できたものに限定する。
- Safe change surfaceは、Lesson本文・Workbook案内・Training専用資材・既存のtraining contract testである。`src/`、`docs/spec/`、Formal E2E、Production Workflow、`.codex/config.toml`、既存のRun / coverage成果物は、別途必要性と承認を確認するまで保護する。
- Plan作成時の証跡はactive Run `.codex/runs/20260915-212821-JST/`に残す。Baselineの再確認、変更後のdiff、validator、lint、collector、sanitizerは同じRunへ追記し、machine-managedな`run.json`を手編集しない。

### 2.3 既存正本との関係

- カリキュラムのCommon / Native route、C01〜C12、C07 / C08 Minimum Evidenceは、既存のPR 4A / Master Plan / Rubricを正本として再設計しない。
- TrainingのWeb / Native direct entry、Artifact、Native opt-in、baseline / exercise境界は、既存PR 5 Planを実装の詳細入力として再利用する。
- Agentのpermission / sandbox / wrapper / config変更は、文書routingの改善と分離する。L3相当の変更は、別途明示承認とrollback planを必要とする。
- 既存の`docs/reports/`へ新しいレビュー報告を作成しない。調査判断は本Planとactive Run Artifactへ記録する。

### 2.4 前提

- P1-3は学習者が正式なTest Caseをちょうど1件作成し、縦断対象IDを`TC-CART-101`とする。`TC-CART-101`が既存Workbookへ存在しないことをWave 0で確認し、衝突していた場合は自動的に別IDへ置換せず、Planを停止してOwner判断を求める。
- P1-4は、構文とPlaywrightの最初の成功体験のために提供Case `TC-PRODUCT-001`を使う。これは導入演習の識別子であり、既存Workbookの4 CSVへ新しい行を追加する根拠にはしない。
- P1-5は、P1-3で作った`TC-CART-101`を実装する。Workbookの`TC-CART-001/002`は提供参照例、`TC-PRODUCT-001`はTraining-onlyの提供Caseであり、学習者の差分・完了確認の対象とは分離する。
- Common課程はWeb中心で成立し、C08 / Physical Android / Native CIは選択課程として扱う既存契約を維持する。
- 受講者の構造化成果物は既存Workbook、学習用コードは`training/`、実行時Evidenceは既存の`output/` / `.artifacts/`を基本とする。編集場所は自由にするが、評価時のExport / Handoff intakeは一つの契約へ集約し、新しいDBやLMSは作らない。
- Agent数を増やすことではなく、独立した作業を並列化してParentの判断材料を増やすことを「フル活用」と定義する。

### 2.5 対象外

- Product behavior、Normative Specification、Formal Regressionの広範な再設計。
- learner-state DB、scoring engine、AI grader、LMS、Evidence DBの追加。
- 全Lessonの全面rewriteや、説明文を増やすだけの変更。
- GitHub metadata、commit、push、PR作成。
- Agentのmodel、permission、sandbox、wrapper挙動を、実測なしに変更すること。
- すべての作業で最大数のAgentを起動すること。

### 2.6 Lesson共通契約と監査単位

各Canonical Lessonは、本文のどこかに次の意味項目を持つ。見出し名は既存の`## 完了条件`、`## Part 1完了条件`、`## Part 2完了条件`、`## 自己確認`などを尊重し、機械的な見出し統一ではなく、監査表で意味項目へ対応付ける。

| 必須項目 | 実装時に明示する内容 |
| --- | --- |
| 目的 / Why | このLessonで判断・理解すること、前後のLessonとつながる理由 |
| Input | 名前、入手元、所有者、状態、形式、開始前Preflight。`[provided]` / `[previous lesson]` / `[learner-created]` / `[environment]`を付け、準備済みか作成するものかを区別する |
| Activity | 学習者が行う観察・設計・実装・実行を、入力から成果物まで順序付きで示す |
| 期待する観測 | 画面、Log、Diff、Test Result、Artifactなど、途中で確認する事実と判断ポイント |
| Output | 成果物名、最低内容、形式、working location、評価時のintake、後続Lessonのconsumerを分けて示す |
| Self-check | 質問、最低限含める回答要素、回答を裏付ける成果物またはEvidence。理解の自己確認であり、機械checkerが理解を保証するとは書かない |
| DoD | 観測可能な必須条件、任意の発展条件、PASSできない状態。量的Practiceと品質条件を分離する |
| Feedback / Recovery | 失敗シグナル、学習上の原因／環境原因の切り分け、戻り先、再実行Command、有限回数の復帰手順 |
| Handoff | 次Lessonへ渡すID / File / Link / Export、受け手、次の開始Gate、Optional routeのskip / rejoin |

Inputに「前Lessonで作成」とだけ書くことを禁止し、作成元Lesson・ファイル・行／ID・完成状態を示す。Outputに「保存する」とだけ書くことを禁止し、working locationの自由度と評価intakeの固定点を分ける。

#### 17 Lesson監査表（実装前の対象固定）

| ID | Canonical file | Route | 主なInput | 主なOutput / Evidence | Handoff |
| --- | --- | --- | --- | --- | --- |
| P1-01 | `part1/01_test-automation-foundations.md` | Common | `[provided]` 学習目的、Scenario Shop観察 | 自動化する／しない判断メモと自己説明 | P1-02へ観察観点 |
| P1-02 | `part1/02_scenario-shop-analysis.md` | Common | `[previous lesson]` 観察、`[provided]` Spec / Role / State / Seed参照 | `01_target-risk.csv`のTarget / Risk、Role / State / Seed / Reset / Account参照 | P1-03へRiskと仕様条件 |
| P1-03 | `part1/03_test-design-and-automation-selection.md` | Common | `[previous lesson]` Target / Risk、`[provided]` BR / AC | `02_test-cases.csv`の学習者行`TC-CART-101`、`03_automation-mapping.csv`の対応行 | P1-04 / P1-05へCaseカード |
| P1-04 | `part1/04_playwright-foundations.md` | Common | `[provided]` `TC-PRODUCT-001`、JS / TS / Playwrightの導入資材 | `training/playwright/exercises/training-exercise-starter.spec.ts`の有意なAction / Locator / Assertionを含む導入spec | P1-05へ実装パターン |
| P1-05 | `part1/05_playwright-e2e-practice.md` | Common | `[previous lesson]` `TC-CART-101`とWorkbook行、`[provided]` Reset / Seed support | `training/playwright/exercises/learner-cart.spec.ts`の`TC-CART-101`対応spec、local receipt、Evidence | P1-06へ実行対象 |
| P1-06 | `part1/06_execution-and-failure-analysis.md` | Common | `[previous lesson]` learner spec、`[provided]` failure / diagnostic harness | 同一Caseのinitial Failとrepaired Pass、`04_execution-improvement.csv`の2 Context、Evidence | P1-07 opt-inまたはP1-08 |
| P1-07 | `part1/07_maestro-native-automation.md` | Native opt-in | `[previous lesson]` Nativeを選ぶ場合のP1成果、`[environment]` Android | learner-authored Maestro exercise diff、JUnit / Screenshot / log evidence | P1-08へskip / rejoin |
| P1-08 | `part1/08_test-management-and-maintainability.md` | Common / Native rejoin | `[previous lesson]` spec / failure記録、`[provided]`既存資産 | Trace更新、原因に対応する最小改善、`04` improvement行 | P1-09へ改善理由 |
| P1-09 | `part1/09_part1-capstone.md` | Common capstone | `[previous lesson]` P1成果一式、`[provided]` Rubric | Part 1 Common capstoneのTrace / receipt / self-check | P2-01へ移行Gate |
| P2-01 | `part2/01_software-development-process.md` | Part 2 | `[previous lesson]` P1成果、`[provided]` README / process資料 | 変更から検証までのプロセス記録 | P2-02へ変更対象 |
| P2-02 | `part2/02_git-version-control.md` | Part 2 | `[previous lesson]` P1成果、`[environment]` self-service Training Copy | Branch / Diff / CommitとCopy manifestの確認 | P2-03へPush可能なBranch |
| P2-03 | `part2/03_github-pull-request-review.md` | Part 2 | `[previous lesson]` Branch / Remote、`[environment]` GitHub Account / Permission | Training Copy上のPR、Review記録、Checks参照 | P2-04へCI対象PR |
| P2-04 | `part2/04_ci-github-actions.md` | Part 2 | `[previous lesson]` PR、`[provided]`安全なTraining Workflow | Event / Job / Step / Permissionの診断記録 | P2-05へWorkflow実行 |
| P2-05 | `part2/05_playwright-ci.md` | Part 2 | `[previous lesson]` `TC-CART-101` learner spec、`[provided]` Workflow / Copy runbook | PR、Workflow run、Check、Playwright Artifact、CI receipt | P2-07へWeb CI evidence |
| P2-06 | `part2/06_native-ci-maestro.md` | Native opt-in | `[previous lesson]` Native exercise、`[environment]` Android runner | Android Build / Emulator / Maestro Artifact | P2-07へskip / rejoin |
| P2-07 | `part2/07_ci-cd-quality-gates.md` | Part 2 | `[previous lesson]` Web CI evidence、`[provided]` gate contract | Web CIの必須Check / fail-closed / Artifact設計 | P2-08へGate design |
| P2-08 | `part2/08_integration-design-capstone.md` | Part 2 capstone | `[previous lesson]` P2 evidence一式 | Web CI → Gate → Artifact → Failure reasoningの統合設計 | 完了 |

この表は「本文を短くするための新しい正本」ではなく、17本文へ不足項目がないことを確認する監査indexである。実装時は各行の主なInput / Output / Handoffを本文の該当箇所へリンクし、表だけ読んでも実施手順が完了したと扱わない。

### 2.7 Workbookのスキーマ境界と評価intake

既存Workbookを正本として利用し、Caseカードの概念項目を新しい列へ暗黙に追加しない。実装時の対応は次のとおり固定する。

| Caseカードの項目 | 正本となる既存ファイル / 列 | 扱い |
| --- | --- | --- |
| `test_case_id`、`risk_id`、`spec_ref`、`br_ids`、`ac_ids`、`test_condition`、`precondition`、`expected_result`、`design_technique` | `training/workbook/02_test-cases.csv`の同名列 | `TC-CART-101`の学習者行を作る。ID形式は既存validatorに従う |
| Target / Risk、Impact、Likelihood、Priority | `training/workbook/01_target-risk.csv`の同名列 | P1-2の分析結果を参照する |
| `automation_decision`、`test_layer`、`tool`、`implementation_path`、`execution_timing`、`reason` | `training/workbook/03_automation-mapping.csv`の同名列 | P1-3でCase IDと対応付ける |
| `execution result`、`run_context`、`evidence`、`failure_category`、`cause`、`action`、`improvement` | `training/workbook/04_execution-improvement.csv`の同名列 | P1-6のinitial Failとrepaired Passを異なるContextで記録する |
| Role、Account、Seed、Reset、対象SKU | 現行schemaでは独立列を追加せず、`02_test-cases.csv`の`precondition` / `test_condition`と、リンク先のSpec / Seed Catalog / Test Controlで表す | 機械判定で独立値が必要と判明した場合は、schema変更を別L2判断として止める |

編集場所はGoogle Sheets、ローカル作業領域、Training Copyなどから選べる。ただし評価時のintakeは自由形式にせず、次のどちらかを実装前に選ぶ。

- 推奨案A: `--root <handoff-root> --mode common|part2|native`で、`handoff-root/workbook/`に既存4 CSVをExportし、`handoff-root/handoff.json`から`workbook_dir`、`code_paths`、`evidence_dir`、`receipt_paths`を相対Pathで参照する。編集場所は自由だが、評価時にこのbundleへExportする。
今回は推奨案Aを採用する。`--root <handoff-root> --mode common|part2|native`で、`handoff-root/workbook/`に既存4 CSVをExportし、`handoff-root/handoff.json`から`workbook_dir`、`code_paths`、`evidence_dir`、`receipt_paths`を相対Pathで参照する。編集場所は自由だが、評価時にこのbundleへExportする。複数Path引数方式は今回の主経路にしない。

`handoff.json`最低schemaは、`version`、`workbook_dir`、非空の`code_paths`、`evidence_dir`、非空の`receipt_paths`とし、すべてbundle rootからの相対Path、`.`または`..`を含まないPathとする。`workbook_dir`には既存4 CSVを各1件だけ置き、Handoffの生成時点とsource SHAをreceiptへ残す。これは保存場所を縛るためではなく、受け手が同じ入力を再現できる境界である。

入力Pathが存在しない、絶対Pathやbundle外参照がある、CSVの列／ID／Traceが不正、参照先が読めない場合は`INCOMPLETE`または`BLOCKED`とし、保存場所が自由であることを理由にPASSへ補正しない。

## 3. 質問 / 曖昧性

### 3.1 今回確定した方針

1. **Part 2の位置付け（今回確認済み）**: Common課程はローカルで完了可能にする。Part 2はGitHub Actionsを使う必須課程とし、Repository側が安全なWorkflow templateとrunbookを提供し、学習者が自分のGitHub Account上でTraining Copyを準備し、Permission、Actions実行、Artifact確認まで自力で行う。主経路は`training:copy:prepare`であり、ForkはそのSourceをGitHubへ置くための搬送手段として説明する。講師が各人のCopyを手作業で準備することは前提にしない。GitHubが使えない場合はPart 2を完了扱いにせず、`BLOCKED`としてCommonへ戻れる境界を表示する。代替課程は今回の実装対象に含めない。
2. **Native / iOSの扱い（今回確認済み）**: 既存契約どおり選択課程とし、Commonの完了に実機やmacOSを要求しない。Nativeを選択しない場合はP1-7 / P2-6をskipしてP1-8 / P2-7へrejoinする。iOS Build-onlyの成功はC08のAndroid exercise成功の代替にしない。
3. **受講者向け修了確認（今回確定）**: 新規予定Commandを`corepack pnpm run training:completion:check -- --mode <common|part2|native> --root <handoff-root>`とする。判定対象は差分、必須Assertion、Case対応、実行Receipt、Evidence参照とし、答案の完全一致比較やAI採点は行わない。ローカルとCIのReceiptは同じJSON形式とし、PR / Run ID / Artifact URLなどのCI固有情報は`environment_evidence`へ分離する。
4. **非コード成果物の保存方針（今回確定）**: 既存Workbookの4 CSVを正本とし、Test Case CSVなどをそこへ整える。保存先はLessonごとに一律固定せず、学習者がGoogle Sheetsや自身の作業領域で編集できるようにする。一方で、評価intakeとしてのExport形式、列、ID、Handoff方法は2.7のHandoff bundleへ固定する。図・メモは必須成果物にせず、必要な場合だけ参照先と最低内容を定める。
5. **Agent協働の扱い（今回確定）**: ここでいうAgentは学習者がカリキュラム上で設定するものではなく、このリポジトリを開発・改善するときのCodex側の作業Agentである。既存の`AGENTS.md`、`.codex/agents/*.toml`、`.codex/config.toml`、Harnessを引き継いで利用し、学習者へAgent設定を要求しない。Agentの権限・sandbox・wrapper・model・thread設定は変更しない。必要な補足は運用文書の説明に限定する。

### 3.2 実装時に解消する技術的な不透明点

- 現行Codex CLIで、child側のrecursive delegation禁止を`max_depth`に依存せず実証できるか。
- `max_threads = 4`がParentを除くchild枠として扱われるか。実測前に上限を変更しない。
- read-only Agentの変更ファイルを、Run / working treeで安定して`[]`と確認できるか。
- quality gate runnerで、Parent指定外のwriteをtool levelで止められるか。できない場合は、既存のbehavioral prohibitionとnet diff検査を使う。
- GitHub-hosted Android runner、KVM、quota、Local Physical Androidが実行環境で利用可能か。
- GitHub Training Copyを、学習者が`training:copy:prepare`からPush可能なCopyへ変換するrunbookを講師なしで完遂できるか。
- test / build / lint等の各コマンドで設定すべき具体的timeout値と、timeout時のprocess tree停止方法を既存runnerごとに確定できるか。
- watchdogの実装主体、発火条件、結果なしを`partial` / `BLOCKED` / `NOT_RUN`へ分類する証跡保存先を確定できるか。
- 同時実行枠が満杯のとき、追加Agentを待機させるか、既存Agentの完了後に派遣するかを、重複なしで確定できるか。

`TC-CART-101`、`TARGET-CART-101`、`RISK-CART-101`の衝突は現Baselineで確認済みである。残る技術的な不透明点はWave 0で実測し、recursive delegation、read-only変更検知、Training Copy runbookの安全性、コマンドtimeout、watchdog、追加派遣枠の扱いを証明できない場合は該当Waveを止める。Part 2のGitHub Actions必須方針、Commonのローカル完了、Native / iOSの選択課程、Handoff bundle、共通Receipt、既存Agent設定の継承は今回の確認済み方針として扱う。
