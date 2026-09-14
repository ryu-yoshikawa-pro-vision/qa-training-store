# Issue #117 PR3 Trigger description最適化 実装計画

## 0. 依頼概要

- 対象Issue: [#117](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117)
- 対象フェーズ: PR3「Trigger description最適化」
- 実装ブランチ: `refactor/117-pr3-trigger-description-optimization`
- branch作成元: `main` `2afae5cb6562aa94b46ecc4f31a245d85ae48eda`
- 目的: PR2で保存したTrigger Eval baselineのobservableなfailureを根拠に、Skill frontmatterの`description`だけを必要最小限調整し、同一dataset・同一Codex version・同一model条件で改善と非回帰を確認する。
- baseline:
  - `.codex/runs/20260912-231826-JST/trigger-eval-baseline.json`
  - Result schema: `2`
  - `routing_source_git_sha`: `3c5e35ed42712574eb9d89051820c9e27f137a16`
  - `dataset_sha256`: `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`
  - Codex: `codex-cli 0.153.4`
  - model: `gpt-5.6-luna`
  - 24 cases: `pass=15`、`false_negative=2`、`sibling_misroute=0`、`unexpected_trigger=0`、`unobservable=7`

PR3ではTrigger Evalの観測方式、dataset、scoring、timeout、routing engineを変更しない。description改善と、その比較検証だけを扱う。

---

## 1. ゴール / 完了条件

### 1.1 ゴール

baselineで確認された次の2件の`false_negative`を、expected Skillの`description`を狭く具体化することで解消する。

| Case ID | Expected Skill | Baseline | 対象 |
| --- | --- | --- | --- |
| `code-review-train-002` | `repair-loop` | `false_negative` | `.agents/skills/repair-loop/SKILL.md` のfrontmatter `description` |
| `exploratory-qa-train-002` | `android-native-local-validation` | `false_negative` | `.agents/skills/android-native-local-validation/SKILL.md` のfrontmatter `description` |

caseのownerはそれぞれ`code-review`、`exploratory-qa`だが、negative caseで期待されているSkillは`repair-loop`と`android-native-local-validation`である。owner側Skillのdescriptionを調整対象にしない。

### 1.2 完了条件（DoD）

- [ ] 実装開始時のlatest `main`とこのPlanの前提差分を確認している。
- [ ] baseline artifact、dataset fingerprint、Codex version、model、2件の`false_negative`を再確認している。
- [ ] baseline `routing_source_git_sha`と実装開始時`main`の間で、対象boundaryのrouting意味が変わっていないことを確認している。
- [ ] `repair-loop`のfrontmatter `description`だけを、validation/test/lint/CI failureのtriage、最小修正、同じvalidationの再実行が対象だと分かる表現へ調整している。
- [ ] `android-native-local-validation`のfrontmatter `description`だけを、build/install前のDoctor/preflight、SDK/toolchain、physical-device readiness確認も対象だと分かる表現へ調整している。
- [ ] `code-review`、`exploratory-qa`、`feature-plan`、`harness-improvement`のdescriptionを変更していない。
- [ ] 6 Skillの本文、references、assets、scripts、Trigger Eval datasetを変更していない。
- [ ] `AGENTS.md`のrouting意味契約を変更していない。
- [ ] Trigger Eval runner、OTel observer、scoring、comparison、timeout、Result schemaを変更していない。
- [ ] `dataset_sha256`がbaselineと同じである。
- [ ] PR3 tuningでは`train` splitだけを使い、candidate wordingを決めるために`validation`結果を利用していない。
- [ ] 最終candidate確定後に`all`を1回実行し、baselineとの`--compare`が成立している。
- [ ] `code-review-train-002`と`exploratory-qa-train-002`が最終comparisonで`fixed`になっている。
- [ ] 最終comparisonで`regressed=0`である。
- [ ] baselineでobservableだったcaseが`newly_unobservable`になっていない。発生した場合はdescription非回帰を証明できないため完了扱いにしない。
- [ ] `recovered_observable`が発生した場合、current outcomeを確認し、observable failureを見落としていない。
- [ ] `pnpm run eval:skills:trigger:validate`、対象repository-contract test、`pnpm run validate:skills`、`pnpm run test:repository`、`pnpm run verify`、`git diff --check`が成功している。
- [ ] Product code、Product test、Training、dependency、workflow、`.codex/agents/**`を変更していない。
- [ ] Repository独自Agent Runtime、routing classifier、retry framework、統計評価frameworkを追加していない。

---

## 2. 現状理解と前提

### 2.1 Current understanding

baselineでは24件中2件だけがobservableなrouting failureで、どちらも`false_negative`である。`sibling_misroute`と`unexpected_trigger`は0件である。

`code-review-train-002`は、`pnpm run lint:markdown`のfailureについて最初の異常を特定し、許可範囲の最小修正と同じgateの再実行まで求めるqueryで、expected Skillは`repair-loop`である。現行`repair-loop` descriptionはvalidation failureの修正を含むが、triage、lint/test/CI failure、同一validation再実行までをfrontmatterでは明示していない。

`exploratory-qa-train-002`は、Windowsの接続済みphysical Android deviceについてDoctor結果と端末認識を確認し、Maestroを実行せず最初の不足を記録するqueryで、expected Skillは`android-native-local-validation`である。現行descriptionはWindows Android tooling、Release APK、physical device、Maestroを含むが、build/install前のDoctor/preflightやdevice readinessだけを確認する依頼をfrontmatterでは明示していない。

一方で、baselineでは同じexpected Skillを持つ他caseにpassがある。したがってSkill全体のrouting定義を広く書き換えず、2件のmissing intentを補う範囲に限定する。

Trigger Evalの現行comparisonは次を必須とする。

- Result `schema_version=2`
- `split=all`
- 同一`dataset_sha256`
- 同一case ID set
- 同一`codex_version`
- 同一model

modelはrunnerで`gpt-5.6-luna`に固定されている。baselineのCodex versionは`codex-cli 0.153.4`であり、異なるversionではbaseline comparisonを成立させない。

PR2 merge後の`main`には`.agents/skills/*/evals/trigger/**`が存在する。一方、current runnerのRouting Target preflightはTrigger Eval datasetが存在するTargetを拒否する。そのため、PR3 live evalで通常のlatest `main` cloneをそのままRouting Targetにできない。

### 2.2 Assumptions

- baselineの`routing_source_git_sha` `3c5e35ed42712574eb9d89051820c9e27f137a16`はPR2 datasetを含まないrouting subjectである。実装時にtreeを確認し、Trigger Eval datasetが存在する場合はこの前提を破棄する。
- baseline sourceと実装開始時`main`の間で、対象2 boundaryのrouting意味にmaterialな変更がないことを実装前に確認する。materialな変更があれば、description-only comparisonとして旧routing sourceを使う前提を見直し、このPlanのまま実装へ進まない。
- `codex-cli 0.153.4`を実行できる環境をPR3 comparisonの前提とする。利用できない場合、runnerのversion比較を弱めたりbaselineを偽装したりしない。
- live eval用Routing TargetはRepository外の一時directoryに作成し、Git管理対象へ追加しない。

### 2.3 Non-goals

- Trigger Eval datasetのquery、expected Skill、boundary、case ID変更
- unobservable 7件の解消
- OTel observationの改善
- Hook fallbackの追加
- timeout変更
- comparison/scoring contract変更
- `AGENTS.md` routingの再設計
- Skill本文やworkflow semanticsの変更
- PR4 / PR5の再実装
- PR6 Workflow E2E Evalの先取り
- 新しいSkill、Subagent、Agent Runtime、Workflow Engineの追加

---

## 3. 質問 / 曖昧性

### 3.1 必ず質問する不透明点

現時点でユーザー判断が必要な不透明点はない。

### 3.2 仮定してよい細部

- 一時Routing Targetのdirectory名や配置先は、Evaluator rootの内外関係を満たすRepository外pathであれば実装環境に合わせて決めてよい。
- live evalのoutput pathはactive Run配下のGit管理対象artifactとし、RepositoryのRun Artifact契約に従う。

### 3.3 未回答の重要質問

なし。

実装時に`codex-cli 0.153.4`が利用できない、baseline sourceにdatasetが存在する、対象routing意味にmaterial driftがある、のいずれかが確認された場合は質問ではなくStop条件として扱う。

---

## 4. 影響範囲

### 4.1 Impacted areas

実装変更候補は次の2ファイルに限定する。

```text
.agents/skills/repair-loop/SKILL.md
.agents/skills/android-native-local-validation/SKILL.md
```

各ファイルともfrontmatter `description`だけを変更する。

live evalの結果と通常のRun ArtifactはRepository既存契約に従ってactive Runへ保存するが、PR3固有の新しいartifact schemaは作らない。

### 4.2 Files to inspect

実装開始時に最低限次を再確認する。

```text
AGENTS.md
.agents/skills/repair-loop/SKILL.md
.agents/skills/android-native-local-validation/SKILL.md
.agents/skills/code-review/SKILL.md
.agents/skills/exploratory-qa/SKILL.md
.agents/skills/code-review/evals/trigger/train.yaml
.agents/skills/code-review/evals/trigger/validation.yaml
.agents/skills/exploratory-qa/evals/trigger/train.yaml
.agents/skills/exploratory-qa/evals/trigger/validation.yaml
.agents/skills/android-native-local-validation/evals/trigger/train.yaml
.agents/skills/android-native-local-validation/evals/trigger/validation.yaml
.agents/skills/repair-loop/evals/trigger/train.yaml
.agents/skills/repair-loop/evals/trigger/validation.yaml
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
scripts/evals/otel-skill-observer.ts
tests/repository-contract/skill-trigger-evals.test.ts
tests/repository-contract/otel-skill-observer.test.ts
tests/repository-contract/windows-codex-argv.test.ts
docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md
docs/adr/0025-trigger-eval-otel-observation-contract.md
.codex/runs/20260912-231826-JST/trigger-eval-baseline.json
```

---

## 5. 変更方針

### 5.1 Candidate description

train failureと現行Skill boundaryから、最初のcandidateは次の方向とする。最終的な変更はfrontmatterの1行だけとし、Skill本文へ同じ説明を重複追加しない。

`repair-loop`:

```yaml
description: Use when triaging and minimally fixing review findings or validation, test, lint, or CI failures, then rerunning the same validation in a bounded Review -> Repair -> Validate loop.
```

意図:

- `code-review`との境界を「指摘を返すreview」対「failureをtriageし、実際に最小修正して再検証するrepair」で明確にする。
- `lint`を含むvalidation failureをrouting対象としてfrontmatterから判断できるようにする。
- 単なる分析やreview全般へ広げない。

`android-native-local-validation`:

```yaml
description: Use when checking Windows Android Doctor/preflight, SDK/toolchain or physical-device readiness, building or installing a local Release APK, running Maestro flows, or investigating a Native physical-device failure.
```

意図:

- build/install/Maestroを実行しないDoctor/preflightやdevice recognitionだけの依頼もrouting対象だと明確にする。
- Scenario Shop上の通常Android user journeyや探索的QA全般へ広げず、Windows local tooling / physical-device validationに限定する。

### 5.2 実装開始前のrebaseline

1. latest `main`をfetchし、branch baseとの差分を確認する。
2. 次にmaterial changeがある場合は取り込み前に内容を確認する。

```text
AGENTS.md
.agents/skills/*/SKILL.md
scripts/evals/**
tests/repository-contract/*trigger*
docs/adr/0024-*
docs/adr/0025-*
```

3. baseline artifactのprovenanceとsummaryを再確認する。
4. `codex --version`が`codex-cli 0.153.4`であることを確認する。
5. baseline sourceとlatest `main`の対象routing差分を確認する。

```bash
git diff 3c5e35ed42712574eb9d89051820c9e27f137a16..<branch-base> -- \
  AGENTS.md \
  .agents/skills/repair-loop/SKILL.md \
  .agents/skills/android-native-local-validation/SKILL.md
```

`AGENTS.md`に構造整理があっても、対象2 boundaryのrouting意味が維持されていればbaseline sourceをdescription-only比較のrouting subjectとして利用できる。意味が変わっている場合はStopする。

### 5.3 description変更

1. `repair-loop/SKILL.md`のfrontmatter `description`だけを変更する。
2. `android-native-local-validation/SKILL.md`のfrontmatter `description`だけを変更する。
3. Skill本文、reference、datasetは変更しない。
4. `git diff`で2ファイル・2 frontmatter行以外のsource差分がないことを確認する。
5. live eval前にcandidate sourceをcommitし、Evaluator rootをcleanにする。runnerの`sourceStatusOutsideRunArtifacts()`を回避するために検証契約を弱めない。

### 5.4 answer-key-free Routing Targetの準備

PR2 merge後のlatest `main`を直接cloneするとTrigger Eval datasetを含むため、PR3ではbaseline routing sourceを元に一時Targetを作る。

新しいcommitted helperやrepository generatorは追加せず、実装Run内の明示手順として行う。

1. Repository外に一時source directoryとRouting Target directoryを用意する。
2. remoteからbaseline `routing_source_git_sha` `3c5e35ed42712574eb9d89051820c9e27f137a16`を取得する。
3. baseline treeに`.agents/skills/*/evals/trigger/**`が存在しないことを確認する。
4. `git archive`等でbaseline treeのworking filesだけをRouting Target directoryへ展開する。source cloneの`.git`は持ち込まない。
5. PR3 branchのbranch-baseからcandidate commitまでの**2つの`SKILL.md` frontmatter差分だけ**をpatchとして生成し、Routing Targetへ適用する。
6. patch適用後、変更が2 descriptionだけであることを確認する。
7. Routing Target directoryで新しく`git init`し、展開済みfilesだけをadd/commitする。
8. `HEAD`をdetachする。
9. working treeがcleanで、EvaluatorとGit common-dirを共有せず、`objects/info/alternates`が空で、Trigger Eval datasetが存在しないことを確認する。
10. current Codexの通常のuser-consented project / Hook trust手順が必要なら、人間が通常手順で確認する。runnerやscriptからtrust stateを変更しない。

この方式では、Routing TargetのGit object databaseをbaseline tree + candidate descriptionから新規生成し、PR2 merge後のTrigger Eval answer keyをTarget historyへ持ち込まない。

Targetのsynthetic commit SHAはbaseline `routing_source_git_sha`とは異なる。Resultの`routing_source_git_sha`には実Target HEADをそのまま記録し、Run Artifactには「base routing source SHA」と「candidate Target SHA」を両方残す。comparisonはrouting source SHA一致を要求しないため、値を偽装しない。

### 5.5 train splitでcandidateを確認

candidate wordingの調整には`train`だけを使用する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <routing-target> \
  --split train \
  --output <active-run>/trigger-eval-pr3-train.json
```

確認条件:

- `code-review-train-002`が`pass`。
- `exploratory-qa-train-002`が`pass`。
- baselineでobservableだったtrain pass caseをobservable failureへ変えていない。
- `sibling_misroute` / `unexpected_trigger`を新規に発生させていない。

`train`でcandidateを再調整する必要がある場合も、根拠はtrain結果とSkill boundaryに限定する。変更範囲を他4 Skillやdatasetへ広げない。環境・観測failureで`unobservable`になったcaseをdescriptionの語句追加だけで追いかけない。無制限にcandidateを作り直さない。

candidateをfreezeした後は、最終`all`結果を見てvalidation wordingへ追加tuningしない。

### 5.6 最終all runとbaseline comparison

candidate確定後、同じcandidate Targetを使って`all`を1回実行する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <routing-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final.json \
  --compare .codex/runs/20260912-231826-JST/trigger-eval-baseline.json
```

比較時に次が同じであることをrunnerへ強制させる。

```text
Result schema_version
split=all
dataset_sha256
case ID set
codex_version
model
```

最終判定:

```text
code-review-train-002 = fixed
exploratory-qa-train-002 = fixed
counts.regressed = 0
counts.newly_unobservable = 0
```

`recovered_observable`がある場合はcurrent outcomeを個別確認する。baselineでunobservableだったcaseがobservable failureとして復帰した場合は、単にcoverageが増えたとは扱わない。対象descriptionとの因果を確認し、今回scopeで安全に解決できなければ未解決としてStopする。

canonical `all`が8 boundary side未達でexit 1になっても、coverage不足だけをrouting regressionへ変換しない。ただしcomparison artifactが保存され、上記完了条件を満たすことは必要とする。runnerのexit codeを無視してPASSと記録せず、coverageとcomparisonを別々に記録する。

### 5.7 実行タスク

- [ ] 1. latest `main`、Issue #117、PR2 baseline、ADR-0024 / ADR-0025を再確認する。
- [ ] 2. baseline sourceとlatest `main`の対象routing意味にmaterial driftがないことを確認する。
- [ ] 3. `codex-cli 0.153.4`が利用可能であることを確認する。
- [ ] 4. `repair-loop` descriptionをfrontmatter 1行だけ調整する。
- [ ] 5. `android-native-local-validation` descriptionをfrontmatter 1行だけ調整する。
- [ ] 6. candidateをcommitし、Evaluator rootをcleanにする。
- [ ] 7. baseline sourceからanswer-key-freeな一時Routing Targetを作成し、candidate description差分だけを適用する。
- [ ] 8. Target preflightとtrust条件を確認する。
- [ ] 9. `train` splitを実行し、2件のbaseline false negativeとtrain非回帰を確認する。
- [ ] 10. candidateをfreezeし、必要なdeterministic validationを実行する。
- [ ] 11. `all`を1回実行してbaseline comparisonを保存する。
- [ ] 12. targeted 2件が`fixed`、`regressed=0`、`newly_unobservable=0`であることを確認する。
- [ ] 13. `recovered_observable`があればcurrent outcomeを個別確認する。
- [ ] 14. Repository標準検証とscope auditを完了する。
- [ ] 15. Run Artifact、PR本文、Issue #117の進捗情報を実装結果に合わせて整理する。

---

## 6. 検証方法

### 6.1 Deterministic validation

```bash
pnpm run eval:skills:trigger:validate
pnpm run validate:skills
pnpm exec vitest run \
  tests/repository-contract/skill-trigger-evals.test.ts \
  tests/repository-contract/otel-skill-observer.test.ts \
  tests/repository-contract/windows-codex-argv.test.ts \
  --no-file-parallelism \
  --maxWorkers=1
pnpm run test:repository
```

期待:

- dataset fingerprintがbaseline `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`から変わらない。
- evaluator / OTel / Windows argv contractが既存どおりPASSする。
- Skill package validationがPASSする。

### 6.2 Live Trigger Eval

Tuning:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <routing-target> \
  --split train \
  --output <active-run>/trigger-eval-pr3-train.json
```

Final:

```bash
pnpm run eval:skills:trigger -- \
  --target-root <routing-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final.json \
  --compare .codex/runs/20260912-231826-JST/trigger-eval-baseline.json
```

live evalは`pnpm run verify`のhard gateへ追加しない。

### 6.3 Repository標準検証

```bash
pnpm run verify
git diff --check <implementation-base>...HEAD
```

必要に応じて変更ファイルのformat / Markdown lintを個別確認するが、description変更のために新しいlint ruleやtestを追加しない。

### 6.4 Scope audit

最終diffでsource変更が次の2 frontmatter descriptionに限定されていることを確認する。

```text
.agents/skills/repair-loop/SKILL.md
.agents/skills/android-native-local-validation/SKILL.md
```

Plan、active Run Artifact、実装結果を説明する既存Repository文書の必要な更新は別に確認し、Product code / test / dependency / workflow / dataset / evaluatorへ意図しない差分がないことを確認する。

---

## 7. リスクと未解決論点

### 7.1 リスク

#### Codex version drift

baseline comparisonはCodex version完全一致が必須である。`codex-cli 0.153.4`を用意できない場合、PR3の「baselineと比較したdescription改善」を証明できない。

対応:

- comparison contractを弱めない。
- model/version metadataを偽装しない。
- 利用可能になるまでStopする。

#### descriptionの過剰拡張

`repair-loop`を「failure全般」、`android-native-local-validation`を「Android QA全般」と広げると、`code-review`、`harness-improvement`、`exploratory-qa`との境界が崩れる。

対応:

- 実際のrepair実行とsame-validation rerunを`repair-loop`の中心にする。
- Windows local tooling / Doctor / physical-device validationをAndroid Skillの中心にする。
- sibling Skillのdescriptionを同時に広げない。

#### baseline sourceとcurrent mainのdrift

PR2 baseline後に`main`は進んでいる。旧routing sourceだけで評価するとcurrent repositoryと乖離する可能性がある。

対応:

- 実装前に関連routing semanticsの差分を確認する。
- material driftがあれば旧sourceでのdescription-only比較を続けずStopする。
- material driftがない場合だけ、baseline source + candidate descriptionを因果分離用Targetとして使う。

#### answer-key leakage

PR2 merge後のmain cloneにはTrigger Eval datasetが存在し、current runnerもそのTargetを拒否する。

対応:

- baseline treeのworking filesだけを新しいGit repositoryへ展開する。
- dataset不存在を確認してからcandidate description patchを適用する。
- `.git` historyをbaseline source cloneからTargetへコピーしない。
- generic sanitizerやtarget generatorをRepositoryへ追加しない。

#### runtimeのunobservable

baseline自体に7件の`unobservable`があり、process timeoutはdescription qualityと同一ではない。

対応:

- unobservableをfalse negativeへ読み替えない。
- baseline passが`newly_unobservable`になったrunでは非回帰を証明できないため完了扱いにしない。
- case retryで都合のよい結果だけを採用しない。

### 7.2 Open questions

実装前に追加の設計判断を必要とするOpen questionはない。

実測でStop条件に該当した場合は、その事実をRun Artifactへ残してから再計画する。

---

## 8. 成果物

### 8.1 実装変更

想定source変更:

```text
.agents/skills/repair-loop/SKILL.md
.agents/skills/android-native-local-validation/SKILL.md
```

### 8.2 評価Evidence

active Runに最低限次を残す。

```text
train Trigger Eval result
final all Trigger Eval result + baseline comparison
baseline source / candidate Target provenance
validation結果
scope audit
```

既存Run Artifact schemaを利用し、PR3専用schemaは作らない。

### 8.3 PR / Issue

実装完了時はPR3のPR本文に次を記載する。

- 変更した2 description
- baseline 2 false negativeとの対応
- dataset不変
- answer-key-free Target preparation
- train tuning結果
- final comparison counts
- `regressed` / `newly_unobservable` / `recovered_observable`の扱い
- standard validation / CI結果

Issue #117はPR3完了後もPR6が残るため、PR3完了だけを理由にcloseしない。

---

## 9. 備考

- descriptionの改善量ではなく、baseline failureが解消し既存routingを悪化させていないことを完了基準とする。
- unobservableの削減はPR3の目的に含めない。
- 2件のfalse negativeを理由に6 Skill全体のdescriptionを書き換えない。
- Trigger Evalの比較契約や観測基盤を変更しないと進められない状況になった場合は、PR3 scopeを拡張せずStopして再計画する。
