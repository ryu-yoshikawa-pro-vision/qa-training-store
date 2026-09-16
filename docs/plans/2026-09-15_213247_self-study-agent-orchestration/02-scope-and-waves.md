# 詳細2：影響範囲・Wave共通契約・初期Wave

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルは、インデックスから参照するPlan詳細です。収録した既存節の本文は、分割前Planの内容を維持しています。

## 4. 影響範囲

### 4.0 確認対象ファイル

以下は「変更候補」と「inspect-only」を分けて確認する。実装者はWaveのexact write setにないファイルを、関連して見つけたという理由だけで変更しない。

### 4.1 学習・成果物

変更候補（各Waveでwrite setをさらに絞る）は次のとおりである。

- `docs/curriculum/test-automation/README.md`
- `docs/curriculum/test-automation/00_learning-design.md`
- `docs/curriculum/test-automation/01_spreadsheet-test-design.md`
- `docs/curriculum/test-automation/02_competency-rubric.md`
- `docs/curriculum/test-automation/03_instructor-reference.md`（受講者の必須経路へ内容を移す場合の支援資料同期のみ）
- `docs/curriculum/test-automation/part1/01_test-automation-foundations.md`
- `docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md`
- `docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md`
- `docs/curriculum/test-automation/part1/04_playwright-foundations.md`
- `docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md`
- `docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md`
- `docs/curriculum/test-automation/part1/07_maestro-native-automation.md`
- `docs/curriculum/test-automation/part1/08_test-management-and-maintainability.md`
- `docs/curriculum/test-automation/part1/09_part1-capstone.md`
- `docs/curriculum/test-automation/part2/01_software-development-process.md`
- `docs/curriculum/test-automation/part2/02_git-version-control.md`
- `docs/curriculum/test-automation/part2/03_github-pull-request-review.md`
- `docs/curriculum/test-automation/part2/04_ci-github-actions.md`
- `docs/curriculum/test-automation/part2/05_playwright-ci.md`
- `docs/curriculum/test-automation/part2/06_native-ci-maestro.md`
- `docs/curriculum/test-automation/part2/07_ci-cd-quality-gates.md`
- `docs/curriculum/test-automation/part2/08_integration-design-capstone.md`
- `training/workbook/README.md`および`training/workbook/01_target-risk.csv`〜`04_execution-improvement.csv`
- `docs/reference/curriculum-self-study-review.md`（監査基準を変更する場合のみ。既存checklistの無断複製はしない）

### 4.2 Training / Test / CI

- `package.json`
- `scripts/validate-curriculum.ts`
- `scripts/training/workflow-contract.ts`
- `scripts/training/run-expected-failure.ts`
- `scripts/training/prepare-training-copy.ts`
- `scripts/training/validate-training-copy.ts`
- `scripts/training/run-maestro-baseline.ts`
- `scripts/training/run-maestro-exercise.ts`
- `training/README.md`
- `training/playwright/baseline/training-baseline.spec.ts`
- `training/playwright/exercises/training-exercise-starter.spec.ts`
- `training/playwright/diagnostic-exercises/`
- `training/playwright/failure-exercises/`
- `training/maestro/exercises/native-training-exercise.yaml`
- `training/github-actions/README.md`
- `training/github-actions/training-ci.yml`
- `training/github-actions/training-native-ci.yml`
- `playwright.training.config.ts`
- `tests/contracts/training-curriculum.test.ts`
- `tests/contracts/ci-workflow.test.ts`
- `tests/contracts/native-ci-workflow.test.ts`
- `tests/integration/cart-use-cases.test.ts`
- `tests/integration/review-user-use-cases.test.ts`
- `.github/workflows/ci.yml`、`.github/workflows/native-ci.yml`、`.github/workflows/native-ios-ci.yml`（原則inspect-only。Training Copyへ直接変更を加えない）

### 4.3 Agent協働運用

- `AGENTS.md`（短い既定routingと詳細正本へのリンク）
- `docs/reference/codex-implementation-harness.md`（routing matrix、Work Package、lifecycle、結果統合）
- `.codex/templates/PLAN.md`（Delegation plan欄）
- `.codex/templates/REPORT.md`（Delegation / Result / Parent decisionの記録欄は既存形式を維持）
- `.codex/agents/*.toml`（必要な場合だけrole / output contractを必要な範囲で補足）
- `scripts/verify` / `scripts/verify.ps1`（既存Agent設定を継承し、運用文書の補足を静的検証する必要がある場合）
- `.codex/agents/code_researcher.toml`
- `.codex/agents/implementation_researcher.toml`
- `.codex/agents/test_investigator.toml`
- `.codex/agents/implementation_worker.toml`
- `.codex/agents/quality_gate_runner.toml`
- `.codex/config.toml`（inspect-only。permission / sandbox / wrapper / model / thread変更が必要なら本Planから分離し、L3承認と別rollback planを要求する）

#### 保護対象

Waveのwrite setに明記されない`src/**`、`docs/spec/**`、Formal Regression、`.github/workflows/**`、`.codex/config.toml`、既存Run Directory、`coverage/**`、Git metadata、Secret / Permissionは変更しない。生成物を更新する場合も、生成元とbyte equality・source SHA・既存allowlistを同じWaveで検証する。

## 5. 変更方針

### 5.0 Wave共通の実行契約と依存関係

各Waveは、開始前にParentが`Owner / dependency / entry gate / exact inspect set / exact write set / expected output / exit gate / stop condition / rollback boundary`をRunのTASKSまたはREPORTへ記録する。Workerを使う場合は、そのwrite setと禁止Pathをpromptへ明記し、worker完了後にParentがnet diffを確認する。`必要なら変更`、`関連ファイル一式`、`適宜更新`だけではworkerを起動しない。

```text
W0 Baseline / SSOT / Owner gate
  ├─ L1 Lesson contract + Workbook boundary
  ├─ G1/G2 Agent routing + Run connection
  └─ C1 AC / test gap inventory（W0のAC map後）
L1
  └─ L2 P1 vertical pilot
L2 + L3 + C1 + 確定した評価intake / Receipt + Training template inspection
  └─ T1 learner completion check
T1
  └─ T2 self-service GitHub Actions route
T2 + all implementation waves
  └─ G3 runtime validation → V1 final validation / handoff
```

L1、G1、G2、C1の調査は、read-onlyで独立する範囲だけ並列化できる。L2はL1の契約確定後、L3はL2のclean learner確認後、T1はL2 / L3 / C1の成果と確定済みの評価intake / Receipt方針を前提に、T2はT1のReceipt契約とTraining templateの安全確認後に開始する。未解決の重要事項、品質ゲートFAIL、scope違反、環境BLOCKEDをPASSへ変換して次Waveへ進めない。

RollbackはWaveごとに次を守る。文書・Workbookは変更対象ファイルだけをPR単位でrevertできるようにし、既存の参照例・列・IDを削除／renameしない。Training / checkerは既存validatorと既存Training commandを残し、誤検出時は新checkerの必須化を解除して原因を修正する。Workflowはtemplateとgenerated active copyの一方だけを変更せず、source SHA・allowlist・`permissions: contents: read`・Secretなしの境界を維持する。Agent docsは文書だけをrevertし、permission / sandbox / wrapper / configの変更はこのPlanのrollback対象に含めず別L3 Planへ分離する。

### 5.1 Wave 0 — 再Baselineと既存Planの統合確認

**Owner**: Parent。**Dependency**: なし。**Write set**: active Runの`PLAN.md` / `TASKS.md` / `REPORT.md`のみ。Product、curriculum、Training、Agent設定はinspect-only。

1. Current `main`、既存のPR 4A / PR 5 / Agent orchestration Plan、現在のTraining資材を再確認する。
2. 既存契約を「変更しない」「本Planで補完する」「別Planへ引き継ぐ」に分類する。
3. Findingsを、Lesson contract、Case handoff、受講者向け修了確認、Part 2準備、ACテスト、Agent routingへ分類する。
4. 各Findingにexact file / heading、owner、minimum fix、validation、stop conditionを付ける。

完了条件:

- PR 4AのCommon / Native / Evidence境界と、PR 5のTraining境界に矛盾がない。
- Product / Spec変更を教材改善へ持ち込む未確定事項がない。
- 実装対象が「文書」「Training / 受講者向け修了確認」「追加テスト」「Agent運用」に分離されている。
- Baseline SHA、既存未追跡ファイル、保護Path、今回確定した方針、技術的な停止条件がRunへ記録されている。

**停止条件**: Baseline SHAを固定できない、既存差分と今回差分を分離できない、またはProduct / Specの変更判断が必要になった場合。**Rollback**: Run-local記録だけを追記し、Source変更は行わない。

### 5.2 Wave G1 — Agentの標準routingを明文化する

まず権限・sandbox・wrapperを変更せず、今ある5役を使い分けるルールを整備する。

#### Routing matrix

| タスクの状態 | 起動するAgent | 並列化 | Parentの責務 |
| --- | --- | --- | --- |
| 1ファイルの明確な誤字・局所変更 | 原則起動しない | なし | 直接実施・局所検証 |
| 変更範囲や依存が不明、2ファイル以上 | `code_researcher` + `implementation_researcher` | 並列 | scope確定、重複排除 |
| Test / CI / coverage / failure調査 | `test_investigator` + `code_researcher` | 並列 | first failureと原因を統合 |
| Curriculum / docsの複数資料整合 | `code_researcher` + `implementation_researcher`、検証影響があれば`test_investigator` | 並列 | SSOTと文章の責務分離 |
| 実装前の複数領域設計 | `code_researcher` + `test_investigator` + `implementation_researcher` | 並列、最大3 childを基本 | requirement / Plan / write scope確定 |
| Plan確定後のスコープ限定実装 | `implementation_worker` 1体 | 原則直列 | exact write set、diff review |
| 実装後の指定検証 | `quality_gate_runner` | worker完了後 | Parent: command set・順序の指定、非ブロッキング管理、助言、必要時の追加派遣、結果統合、最終判断。child:指定commandの実行とコマンド単位timeout管理 |
| Review finding / validation failureの修正 | 調査Agentを並列、workerは原因確定後1体 | repair-loopの上限内 | causal relation、repair停止条件 |

ルール:

- 現行`max_threads = 4`の範囲で、Parentの判断を圧迫しないよう同時起動は通常2〜3 childまでとする。上限増加を目的に設定を変更しない。
- 同じ問いを複数Agentへ重複依頼しない。異なる軸（コード、テスト、文書、実装影響）へ分解する。
- 調査Agentはread-only、実装workerはParentが計画とexact write setを確定した後だけ使う。
- workerの並列writeはworkspace isolationと変更 attributionを実証できた場合だけ許可し、未実証なら直列fallbackを使う。
- childは追加Agentを起動しない。quality gate runnerは修正しない。
- ParentはAgentをspawnした後も、Agentのread set / write setと重ならない作業を継続する。`wait_agent`の待機時間は親のjoin呼び出しを制限するだけで、子Agentの作業時間や終了を意味しない。
- 調査・レビューAgentは、指定scopeの確認項目と出力契約を満たして自然終了するまで継続する。経過時間だけを理由にinterrupt / closeしない。
- テスト・ビルド・lint等のコマンドを実行するAgentは、子Agent自身がコマンド単位のtimeoutを設定・管理し、command、exit code、経過時間、timeout理由を報告する。親Agentは結果を分類・統合する。
- Parentは子Agentが困っている、または独立観点が不足していると判断した場合に助言し、必要なら異なるscopeの追加Agentを派遣する。同じ問いの再投入はしない。
- watchdogは検知・記録専用とし、経過時間、`wait_agent` timeout、未完了だけを理由にinterrupt / closeしない。closeは自然終了、Run終了、安全異常、または記録済みstop conditionによる明示中止に限る。
- 追加Agentは独立した新しいscopeに限り派遣する。同時実行枠が満杯なら、稼働中の調査Agentを打ち切らず、空きができた時点で派遣するか、Parentが優先順位を見直す。

#### Delegation decision procedure

- 1ファイルの明確な局所変更はdelegationなし。2つ以上の独立軸、2ファイル以上の依存、不確実な既存契約、Test / CI failure、またはreviewの複数観点がある場合は、Parentが2〜3個の非重複Work Packageへ分解する。
- quality gate failureの修正は、原因分類後にworkerを最大1体ずつ起動する。Review → Repair → Validateの反復上限は1論点につき3ラウンドとし、同じfirst failureが3回続く、L3承認が必要、または外部環境が変わらない場合は停止する。
- `max_threads = 4`の解釈に依存せず、Parentを残して同時childは最大3体とする。`wait_agent(timeout_ms)`は非ブロッキングjoinとして使い、待機呼び出しがtimeoutしても子Agentのtimeout、partial、closeとはみなさない。Parentは自身の非重複作業を継続し、後で完了通知または再joinを受ける。
- Parentはcompletion notificationまたは指定checkpoint時だけ再joinし、busy polling、無制限polling、独自監視scriptで調査Agentの自然終了を待たない。
- 調査・レビューAgentは、指定scopeの確認と結果返却まで自然終了を待つ。経過時間だけでinterrupt / closeしない。子Agentが困っている場合は助言し、必要なら異なるscopeの追加Agentを派遣する。
- テスト・ビルド・lint等のコマンド実行Agentは、自身のコマンド単位timeoutで終了し、`PASS`、`FAIL`、`TIMEOUT`、`BLOCKED`、`NOT_RUN`、command、exit code、timeout理由を返す。実際のtimeout、interrupted、errored、結果なしのwatchdog / Run終了は、Parentが`partial`または`BLOCKED`として記録し、PASSへ変換しない。
- join後に、返却内容のPath / line evidence、role遵守、unknown / stop condition、`changed_files`の扱いを確認する。正常終了または明示的に中止したAgentだけをcloseし、read-onlyの変更有無はAgentの自己申告ではなく、Run collectorと開始前後のdiffで判定する。

#### Work Packageの最低記載

| 項目 | 内容 |
| --- | --- |
| `id / purpose` | 何を判断するための作業か |
| `role / read set` | Agent roleと読んでよいexact Path / heading |
| `write set` | 調査Agentは`[]`、workerは変更可能なexact Path |
| `forbidden set` | Product / Spec / Formal / Git / Secretなどの禁止範囲 |
| `expected output` | Finding、line evidence、command、unknown、次の判断 |
| `join / command timeout / watchdog / close` | 非ブロッキングjoin、子Agentのコマンドtimeout、異常時watchdog、終了条件 |
| `parent management / escalation / final decision` | 非重複作業の継続、助言条件、追加派遣条件、最終採否と記録先 |
| `acceptance` | Parentが採用する最低限の根拠 |

`changed_files`は、read-only Agentには要求する自己申告欄ではなく、Run / Git diffのmachine evidenceとして記録する。REPORTへraw transcript、prompt全文、Agent IDを転記しない。

#### 標準ラウンド

```text
Parent: task classification / immediate local work
  → Work Packageとread set / write setを定義
  → researcherを並列spawn
  → Parentは非重複のrepo mappingを進める
  → completion notificationまたは非ブロッキングjoin（join timeoutは子Agentを止めない）
  → 必要に応じて子Agentへ助言、異なるscopeの追加Agentを派遣
  → join / result evidence確認（command実行なら子Agentのtimeout証跡も確認）
  → 正常終了または明示中止のAgentをclose
  → Parentが統合判断とPlanを確定
  → implementation_workerを直列spawn
  → Parentがdiff / scope / 仕様をreview
  → quality_gate_runnerでParent指定検証
  → REPORTへDelegation / Result / Parent decisionを記録
```

#### Agent出力契約

各Agentは、結果を次の順で返す。これは意味情報の出力順であり、Runのmachine-managed事実を手書きする指示ではない。

```text
Role / assigned scope
Read files and relevant lines
Confirmed facts
Finding or implementation impact
Recommended next action
Validation command
Unknown / stop condition
 Execution status（PASS / FAIL / TIMEOUT / BLOCKED / NOT_RUN）
 Command evidence（command / exit code / elapsed / timeout reason。コマンド実行時のみ）
 changed_files（補助的な自己申告。採否はcollector / diffで判定）
```

Agent ID、prompt全文、raw transcriptはREPORTへ転記しない。machine factは既存Hook / Run収集契約に任せる。

### 5.3 Wave G2 — Agent routingを計画・Runへ接続する

**Owner**: Parent。**Dependency**: G1のdecision procedure。**Write set**: 次の4ファイルだけを候補とし、実際の変更はL2承認後に絞る。

`AGENTS.md`、`docs/reference/codex-implementation-harness.md`、`.codex/templates/PLAN.md`、`scripts/verify` / `scripts/verify.ps1`。`.codex/templates/REPORT.md`と`.codex/agents/*.toml`は、既存形式・role boundaryの説明不足が確認された場合だけ候補にする。`.codex/config.toml`と`.codex/agents/*.toml`の設定値は継承し、permission / sandbox / wrapper / model / threadは変更しない。

1. `.codex/templates/PLAN.md`へ、必要な場合だけ埋める`Delegation plan`を追加する。
2. Delegation planには、起動理由、Agent role、非重複scope、期待出力、join条件、close条件を書く。
3. `AGENTS.md`には、複雑・複数ファイル・不確実・review・test / CI調査ではParentが上記matrixでdelegationを判断するという短い契約と、詳細Harnessへのリンクだけを残す。
4. `docs/reference/codex-implementation-harness.md`へrouting matrixと標準lifecycleを追加し、AGENTSへ詳細をコピーしない。
5. `scripts/verify` / `scripts/verify.ps1`には、routingの存在、custom Agent名、read-only / worker / quality roleの境界など、安定した静的契約だけを追加する。

G2でRunを扱う場合は、既存active Runを再利用し、なければRepository標準の`scripts/new-run.ps1`で初期化する。`PLAN.md` / `TASKS.md`はworkflow levelに従い、`REPORT.md`はappend-onlyでDelegation / Result / Parent decisionだけを追記する。Runの`run.json`、Hook JSONL、collector出力はmachine-managedとして手編集しない。

完了条件:

- 今後の複雑なtaskでは、ユーザーが「複数Agentを使って」と再指定しなくても、AGENTSの適用契約を根拠にParentがdelegationを判断できる。
- 軽微な変更に無駄なAgentを起動しない条件も同時に明記されている。
- 既存の`max_threads` / `max_depth` / Hook / wrapperの意味を、実測なしに変更していない。
- timeout / partial / errored childの扱い、collector由来のchanged files、L2 / L3承認境界、Runのappend-only接続が実行例またはcontract testで確認できる。

**停止条件**: L2承認が得られない、既存のAGENTS / Harness契約と矛盾する、またはpermission / sandbox / wrapper / configの挙動変更が必要になった場合。**Rollback**: G2で変更した文書だけをrevertし、既存のAgent設定とRun collectorを維持する。

### 5.4 Wave L1 — Lesson共通契約と成果物契約を確定する

**Owner**: Parent + curriculum writer。**Dependency**: W0のSSOT分類と採用したHandoff bundle方式。**Write set**: `docs/curriculum/test-automation/00_learning-design.md`、`docs/curriculum/test-automation/README.md`、`training/workbook/README.md`。17本文はこのWaveでは変更せず、監査表に対応する不足箇所をL2以降のexact write setへ分割する。

1. `00_learning-design.md`へLesson共通構造を追加する。
2. `README.md`へ、Common / Native route、P1-3 Case作成、P1-4提供Case、P1-5再利用、Part 2の環境選択を入口として表示する。
3. `training/workbook/README.md`へ、4 CSVの使用Lesson、サンプル行と学習者作成行の違い、Input / Output / Handoffを直接説明する。
4. Caseは次の最小カードで扱う。

```text
test_case_id
spec_ref / br_ids / ac_ids
risk_id
role / account
seed / reset
precondition
action
expected result
automation decision / layer / tool
implementation path
execution result
evidence
```

1. 非コード成果物（特にTest Case CSV）は既存Workbookの4 CSVを正本として整える。Google Sheetsなどの編集場所や学習者の作業領域は一律に縛らず、Canonical CSVへのExport方法と、後続Lessonが参照するHandoffを明示する。コード・CIが直接読むTraining codeや設定ファイル、実行時Artifactの取得場所は、実行契約上必要な範囲だけ固定する。
2. Outputは、形式（CSV / `.spec.ts` / `.yaml` / Markdown / runtime Artifact）、保存先または参照方法、後続での参照箇所を必ず持つ。保存先を自由にする場合も、学習者が次Lessonへ渡すためのリンク、Path、Export済みFileなどの受け渡し情報を残す。

完了条件:

- 学習者がLesson本文だけで、開始前に必要なファイル・データ・Account・Seed・Commandを列挙できる。
- 学習者が完了後に、どの成果物をどの形式で保存または参照可能にし、次Lessonで何に使うか説明できる。
- 新しい第三の仕様・Case・Glossaryを作らず、既存SSOTへリンクしている。
- Workbookの既存4 CSVのheader、ID pattern、空欄条件を変更せず、Caseカードの概念項目と列の対応がREADMEで説明されている。
- `TC-CART-001/002`と`TC-PRODUCT-001`が提供例、`TC-CART-101`が学習者の縦断Caseであることを、READMEと監査表で同じ表記にしている。

**停止条件**: 採用したHandoff bundle方式と矛盾する、既存Workbook schemaへ列追加が必要になる、またはLesson本文の変更がSpec / Rubricの判断変更を要求する場合。**Rollback**: 3つの文書だけを戻し、既存CSVと既存Lessonの意味を変えない。

### 5.5 Wave L2 — P1-2〜P1-6の縦断パイロット

#### P1-2: 分析結果をCase作成へ渡す

- P1-1の観察結果をInputとして表示する。
- `01_target-risk.csv`へ、提供例とは別に学習者が`TARGET-CART-101` / `RISK-CART-101`を最低1組記録する完成例を示す。
- Role、State、Seed、Journey、Reset、Accountのうち、次Lessonで必要な値をOutputとして明示する。
- P1-3の開始Gateを「Riskと仕様条件を1件説明でき、Workbookの該当行がある」とする。

#### P1-3: 正式Test Caseを作る

- P1-2の`RISK-CART-101`をInputとして、`02_test-cases.csv`へ学習者所有の`TC-CART-101`をちょうど1件作成する。既存の`TC-CART-001/002`を編集して完了扱いにしない。
- `AC`、境界、前提、操作、期待結果、Role、Seed、Layer、Automation decisionをCaseカード上の必須情報として示し、既存CSVの列へどう記録するかを表で対応付ける。
- `03_automation-mapping.csv`にも`TC-CART-101`の対応行を作り、`implementation_path`はP1-5の予定Path、`execution_timing`はTraining Web exerciseとする。
- 10件・3技法などの量はPractice Volumeに留め、品質条件と混同しない。
- P1-4の提供Caseと、P1-5へ渡す`TC-CART-101`を別のInputカードとして表示し、未実装のため`implementation_path`や実行結果を空欄にする時点を明示する。

#### P1-4: 提供Caseと学習者Caseを分ける

- 最初の構文演習は提供Case `TC-PRODUCT-001`で実施する。
- P1-3のCaseを実装する場合は、Workbookの`test_case_id`をコードのTest title / metadataへ写す方法を示す。
- baseline、starter、learner exercise、Formal Regressionの編集対象を4つの枠で分ける。
- Locator、Action、Assertion、Reset、実行結果を含む1件の完成例を提示する。

#### P1-5: P1-3のCaseをPlaywrightへ落とす

- P1-3の`TC-CART-101`、Role、Account、Password、Seed、Reset、対象SKU、期待結果をInputカードとして表示する。これらはWorkbookの`precondition` / `test_condition`とSpec / Seed Catalogへの参照であり、勝手なCSV列追加をしない。
- Web CartをCore、Payment / Cross-role / Internal Inspection / Accessibilityの追加範囲をExtensionとして分離する。
- Mobile Webの位置付けをRubricと一致させ、必須範囲と発展範囲を明示する。
- `training:web:baseline`と`training:web:exercise`の目的、実行順、合格結果を示す。

#### P1-6: Failureを経験して復旧する

- 初回Failureの期待結果、確認するTrace / Screenshot / Console / Log、原因分類、最小修正、再実行Commandを示す。
- `result=Fail`のEvidenceと、修正後`result=Pass`のEvidenceを同じCaseと別Run Contextで記録する。
- `training:web:expected-failure`のArtifactと、学習者の診断・復旧Evidenceを混同しない。
- P1-7選択またはP1-8への分岐条件を表示する。

#### 縦断完了条件

```text
BR / AC
  → Risk
  → TC-CART-101
  → Role / Seed / resetScenario
  → Action
  → Assertion
  → local Evidence
  → Failure / Recovery / Rerun
  → P1-8またはP1-7へのHandoff
```

同じCase IDで上記の各段階を追跡でき、どこかが欠けた場合に戻る先を学習者が判断できることを合格とする。

**L2のentry gate**: L1のCase／intake契約がPASSし、`TC-CART-101`、`TARGET-CART-101`、`RISK-CART-101`が参照例と衝突しないことを確認する。**L2のwrite set**: `part1/02_scenario-shop-analysis.md`と`training/workbook/01_target-risk.csv`（学習者Target / Risk行）、`part1/03_test-design-and-automation-selection.md`と`training/workbook/02_test-cases.csv` / `03_automation-mapping.csv`（`TC-CART-101`行）、`part1/04_playwright-foundations.md`と`training/playwright/exercises/training-exercise-starter.spec.ts`、`part1/05_playwright-e2e-practice.md`と新規`training/playwright/exercises/learner-cart.spec.ts`、`part1/06_execution-and-failure-analysis.md`と`training/playwright/failure-exercises/expected-failure.spec.ts` / `training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts`、`training/workbook/04_execution-improvement.csv`（initial / repaired行）へ分離して指定する。**Rollback**: 5本文と学習者用行だけを戻し、提供例とvalidatorのheaderを残す。

### 5.6 Wave L3 — 全17 Lessonへの展開

**Owner**: Parent + curriculum writer。**Dependency**: L1の共通契約、L2のP1縦断でのclean learner確認。**Write set**: 次の表に列挙した残り12本文と、必要な`README.md` / `00_learning-design.md`のリンクだけ。P1-2〜P1-6の5本文はL2のwrite setで扱い、L3では重複編集しない。

| Batch | Exact write set | 追加する契約 |
| --- | --- | --- |
| L3-A | `part1/01_test-automation-foundations.md`、`part1/07_maestro-native-automation.md`、`part1/08_test-management-and-maintainability.md`、`part1/09_part1-capstone.md` | P1-1の開始準備と判断、P1-7のNative opt-in / skip / rejoin、P1-8の改善Input、P1-9のCommon完了とP2-1へのHandoff |
| L3-B | `part2/01_software-development-process.md`、`part2/02_git-version-control.md`、`part2/03_github-pull-request-review.md`、`part2/04_ci-github-actions.md`、`part2/05_playwright-ci.md`、`part2/06_native-ci-maestro.md`、`part2/07_ci-cd-quality-gates.md`、`part2/08_integration-design-capstone.md` | Part 2のAccount / Copy / PR / Check / ArtifactのInput、GitHub Actions必須境界、Native opt-in、P2-8のWeb CI完了 |

各Batchで17行監査表の全項目を本文へリンクする。P1-10のLegacy AliasとP1-9のSpecification / Agentic QA参考資料はCanonical Lesson数に含めず、リンク切れと「現在の修了条件として使用しない」境界だけを確認する。本文には説明を追加するが、講師向け資料への誘導をRecoveryの唯一の手段にしない。

**L3のentry gate**: L2のP1-2〜P1-6がclean learner walkthroughでPASSし、17行のInput / Output / Handoffに未確認セルがない。**L3のexit gate**: Common route、Native opt-in、Part 2 routeを別々に通読し、各Lessonで開始前の準備、実施、観測、自己確認、DoD、Recovery、次の開始Gateを指示できる。**Rollback**: Batch単位で本文だけをrevertし、L1の共通契約と既存Spec / Rubricを残す。**停止条件**: 文章を増やしても既存Spec / Rubricと矛盾する、または講師向け資料なしで必要なInputを入手できない場合。
