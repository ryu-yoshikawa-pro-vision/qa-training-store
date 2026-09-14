# Issue #117 PR3 Trigger description最適化 実装計画

## 1. 目的

- 対象Issue: [#117](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117)
- 対象フェーズ: PR3「Trigger description最適化」
- 実装ブランチ: `refactor/117-pr3-trigger-description-optimization`
- branch作成元: `main` `2afae5cb6562aa94b46ecc4f31a245d85ae48eda`

PR2で保存したTrigger Eval baselineのobservableなfailureを確認し、Skill frontmatter `description`に一般化可能なrouting上の欠落がある場合だけ必要最小限修正する。

PR3の目的は、baseline failureを必ずdescription変更で消すことではない。failure query、対応するvalidation case、現行Skill boundary、`AGENTS.md`のroutingを照合し、descriptionとの因果を説明できる場合だけ変更する。descriptionに不足が確認できなければ、source変更なしを有効な結論として扱う。

baseline:

- `.codex/runs/20260912-231826-JST/trigger-eval-baseline.json`
- Result schema: `2`
- `evaluator_git_sha`: `d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`
- `routing_source_git_sha`: `3c5e35ed42712574eb9d89051820c9e27f137a16`
- `dataset_sha256`: `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`
- Codex: `codex-cli 0.153.4`
- model: `gpt-5.6-luna`
- 24 cases: `pass=15`、`false_negative=2`、`sibling_misroute=0`、`unexpected_trigger=0`、`unobservable=7`

PR3ではTrigger Evalのdataset、観測方式、scoring、comparison、timeout、routing engineを変更しない。

---

## 2. 対象となるbaseline failure

PR2 baselineでdescriptionとの関係を確認する対象は次の2件である。

| Case ID | Expected Skill | Baseline | 対応するvalidation case |
| --- | --- | --- | --- |
| `code-review-train-002` | `repair-loop` | `false_negative` | `code-review-validation-002` は `pass` |
| `exploratory-qa-train-002` | `android-native-local-validation` | `false_negative` | `exploratory-qa-validation-002` は `pass` |

同じexpected Skillを持つvalidation caseがbaselineでpassしているため、2件のtrain failureだけからdescription defectとは断定しない。

現行契約も次の内容を既に持っている。

- `repair-loop` frontmatterは`fixing validation failures`を対象に含む。
- `repair-loop`本文はactionableなvalidation failureのtriage、repair、validationを定義している。
- `android-native-local-validation` frontmatterはWindows Android tooling、local Release APK、physical device、Maestro、Native physical-device failureを対象に含む。
- `android-native-local-validation`本文はDoctor/preflightをBuild / Install / Test / Maestroより前に実行する手順を持つ。
- `AGENTS.md`はreview findingまたはvalidation failureの修正を`repair-loop`へ、Windows Android tooling / Release APK / physical device / Maestro / Native failureを`android-native-local-validation`へroutingしている。

このため、実装開始時に「現行descriptionへ何を追加すれば一般的なrouting境界が改善するのか」を説明できなければ変更しない。

---

## 3. 対象範囲

### 3.1 変更候補

意味上の欠落が確認できた場合だけ、次のfrontmatter `description`を変更候補とする。

```text
.agents/skills/repair-loop/SKILL.md
.agents/skills/android-native-local-validation/SKILL.md
```

2ファイルを必ず両方変更する必要はない。各failureを独立して判定し、根拠があるSkillだけ変更する。

### 3.2 対象外

- `code-review`、`exploratory-qa`、`feature-plan`、`harness-improvement`のdescription変更
- 6 Skillの本文、references、assetsの変更
- Trigger Eval datasetのquery、expected Skill、boundary、case ID変更
- `AGENTS.md` routingの変更
- Trigger Eval runner、OTel observer、scoring、comparison、timeout、Result schemaの変更
- `unobservable` 7件の解消
- Hook fallback、retry framework、統計評価frameworkの追加
- PR4 / PR5の再実装
- PR6 Workflow E2E Evalの先取り
- Product code、Product test、Training、dependency、workflow、`.codex/agents/**`の変更
- 新しいSkill、Subagent、Agent Runtime、Workflow Engineの追加

既存のTrigger Eval契約は `docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md`、`docs/adr/0025-trigger-eval-otel-observation-contract.md`、現行runner / evaluatorを正本として参照し、このPlanへ再定義しない。

---

## 4. 実装前に確認する内容

最低限、次を確認する。

```text
Issue #117
PR #127
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
docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md
docs/adr/0025-trigger-eval-otel-observation-contract.md
.codex/runs/20260912-231826-JST/trigger-eval-baseline.json
```

実装開始時のlatest `main`とbranch baseとの差分も確認する。Plan再レビュー時点のlatest `main`は`7a80e0598180cdc2f8f8538fbfbc903cd55e82ac`で、branch baseからの追加変更は`docs/curriculum/test-automation/04_learning-effort-reference.md`だけであり、routing前提には影響しない。実装開始時には改めて最新状態を確認する。

特に次が変わっている場合は、baseline取得時と現在のrouting contextが同じではないことを明示して扱う。

```text
AGENTS.md
.agents/skills/*/SKILL.md
scripts/evals/**
tests/repository-contract/*trigger*
docs/adr/0024-*
docs/adr/0025-*
```

Issue #117のrouting方針自体が変わっている場合は、このPlanの前提が成立しないため再計画する。

### 4.1 Evaluator差分の確認

baselineの`evaluator_git_sha`は`d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`である。実装時のEvaluator HEADが異なる場合は、少なくとも次の差分を確認する。

```text
scripts/evals/skill-trigger-evals.ts
scripts/evals/run-skill-trigger-evals.ts
scripts/evals/otel-skill-observer.ts
tests/repository-contract/skill-trigger-evals.test.ts
tests/repository-contract/otel-skill-observer.test.ts
tests/repository-contract/windows-codex-argv.test.ts
docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md
docs/adr/0025-trigger-eval-otel-observation-contract.md
```

確認条件:

- observationの意味が変わっていない。
- scoring / outcome mappingが変わっていない。
- comparison contractが変わっていない。
- model、timeout、dataset読込契約が変わっていない。

baseline取得後、`run-skill-trigger-evals.ts`からOTel primary live path上の不要なHook snapshot filesystem I/Oが削除されているが、既存記録上はOTel observer、scoring、model、timeout、Result schema、datasetを変更していない。実装時にもこの前提を差分で再確認する。

上記の意味契約にmaterialな変更がある場合は、旧baselineとの結果を「description変更だけの比較」と扱わず停止する。comparison実装が`evaluator_git_sha`一致を要求しないことだけを根拠に続行しない。

---

## 5. description変更要否の判定

各failureについて、次の順序で判断する。

### 5.1 `code-review-train-002`

確認対象:

- failure queryは、既に発生したvalidation failureの原因を特定し、許可範囲の最小修正を行い、同じvalidationを再実行する依頼である。
- `code-review`本文はreview findingを出力とし、repairが必要ならbounded repair workflowへ切り替える契約を持つ。
- `repair-loop` frontmatterは既に`fixing validation failures`を含む。
- `repair-loop`本文はtriage、repair、validationを既に定義する。
- 対応する`code-review-validation-002`はbaselineで`repair-loop`へroutingできている。

変更条件:

- frontmatterだけを見たときに、既に観測されたfailureに対して「実際に修正して再検証する」依頼が`repair-loop`対象だと判断しにくい、という一般化可能な欠落を具体的に説明できる場合だけ変更する。

変更する場合の方針:

- `lint`、`test`、`CI`などtrain query由来のfailure種別を列挙することを目的にしない。
- 「review / validationの結果を受けて、許可範囲のrepairと再validationを行う」という既存workflow境界をfrontmatterで必要な範囲だけ明確にする。
- `code-review`との境界を広げない。

### 5.2 `exploratory-qa-train-002`

確認対象:

- failure queryはWindowsの接続済みphysical Android deviceについて、Release APK install前提のDoctor結果と端末認識だけを確認する依頼である。
- `android-native-local-validation` frontmatterは既にWindows Android toolingとphysical deviceを含む。
- 本文はDoctor/preflightを明示している。
- `exploratory-qa`はAndroid QAやruntime探索も対象に含むため、Androidという語だけではSkill境界にならない。
- 対応する`exploratory-qa-validation-002`はbaselineで`android-native-local-validation`へroutingできている。

変更条件:

- build / install / Maestroの実行を伴わない「Windows local Android環境またはphysical-deviceのreadiness確認」もこのSkillの入口であることがfrontmatterから十分に読み取れない、と一般化して説明できる場合だけ変更する。

変更する場合の方針:

- `Doctor`というtrain query固有の語を通すことを目的にしない。
- Windows local tooling / physical-device readinessという責務境界を必要な範囲だけ明確にする。
- Scenario Shop上の通常Android user journeyや探索的QAを吸収しない。

### 5.3 変更しない場合

意味上の欠落を説明できないSkillは変更しない。

2件とも変更不要と判断した場合は、PR3を無理にsource変更へ変換しない。baseline failureがdescription defectと確定できなかった根拠をRun Artifactへ残し、PR3のdescription変更はno-opとして扱う。

---

## 6. candidateの作り方

変更が必要と判断したSkillだけcandidate descriptionを作る。

candidateは次を満たすこと。

1. 現行Skill本文と`AGENTS.md`の意味を変えず、frontmatterへ既存責務を必要な範囲だけ表す。
2. train queryの具体的な単語を追加すること自体を目的にしない。
3. sibling Skillとの境界を広げない。
4. 将来の可能性を理由に新しい責務を追加しない。
5. candidate採用理由を評価結果より先に説明できる。

candidateを複数回作り直す場合も、train結果だけに合わせて語句を増やさない。意味上の仮説がなくなった時点で調整を止める。

### 6.1 live eval前のEvaluator clean条件

現行runnerはEvaluatorの`.codex/runs/**`以外に未commit source差分がある場合、live evalを拒否する。

そのためsource変更がある場合は、各candidateをlive evalする前に次を行う。

1. 対象frontmatterだけを変更する。
2. diffが意図したdescriptionだけであることを確認する。
3. candidateをcommitする。
4. `.codex/runs/**`を除きEvaluator working treeがcleanであることを確認する。
5. そのcommitを評価対象candidateとして記録する。

train結果を受けて別candidateへ変更する場合も、新しい意味上の仮説を説明したうえで同じ手順を繰り返す。未commitのsource差分を残したままrunnerのpreflightを回避しない。

---

## 7. answer-key-free Routing Targetの作成

EvaluatorとRouting Targetは別Git repositoryとし、Targetへ元repositoryの`.git`、remote ref、object database、alternatesを持ち込まない。

単に最新repositoryをcloneしてdatasetをworking treeから消す方式は使わない。working treeにanswer keyがなくても、Git historyやremote refから取得できる状態を残さない。

Target作成の共通条件:

1. Repository外に一時directoryを作る。
2. 元treeのworking filesだけをexportする。元repositoryの`.git`はコピーしない。
3. Trigger Eval datasetをTargetへ含めない。
4. 評価結果を含む`.codex/runs/**`もTargetへ含めない。Run Artifactはrouting入力ではなく、過去のTrigger Eval結果をTargetへ渡す必要がない。
5. 必要なcandidate description差分だけを適用する。
6. export後のdirectoryで新しく`git init`する。
7. filesをadd / commitし、`HEAD`をdetachする。
8. remoteを設定しない。
9. working treeがclean、EvaluatorとGit common-dirを共有しない、`objects/info/alternates`が空、Trigger Eval datasetが存在しないことを確認する。
10. Resultの`routing_source_git_sha`には、このfresh repositoryの実Target HEADを記録する。baseline SHAへ偽装しない。

exportは`git archive`等を使ってよいが、current `main`から作るTargetではTrigger Eval datasetと`.codex/runs/**`をexport時点で除外し、後から元cloneのGit履歴を残したまま削除する方式にしない。

PR3用のTarget generatorやrepository helperは追加しない。具体的なpreflight、selector、OTel観測条件はADR-0024 / ADR-0025と現行runnerへ従う。

---

## 8. Trigger Evalの評価方針

PR3では、次の2つを別の目的として評価する。

### 8.1 PR2 baselineとの因果比較

目的:

- baseline取得時のrouting contextを固定し、candidate description以外のrouting入力を変えず、description変更の影響をbaselineと比較する。

baseline側Target:

1. baseline `routing_source_git_sha` `3c5e35ed42712574eb9d89051820c9e27f137a16`のworking filesだけをexportする。
2. Trigger Eval datasetと過去のTrigger Eval結果が含まれていないことを確認する。
3. 変更対象と判断したdescription差分だけを適用する。
4. fresh Git repositoryとしてcommitし、detached HEADにする。
5. 対象外のSkill、`AGENTS.md`、scripts、references等をcurrent `main`から混ぜない。

#### trainでのcandidate確認

candidate wordingの調整には`train` splitだけを使う。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <baseline-context-target> \
  --split train \
  --output <active-run>/trigger-eval-pr3-train.json
```

確認内容:

- 変更したSkillに対応するtrain failureが改善しているか。
- baselineでobservableだったtrain pass caseをobservable failureへ変えていないか。
- `sibling_misroute` / `unexpected_trigger`を新規に発生させていないか。

train runの結果だけを理由に、意味上の根拠がない追加語句をcandidateへ足さない。

#### 最終all comparison

candidateを確定した後に`all`を実行する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <baseline-context-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final-baseline-context.json \
  --compare .codex/runs/20260912-231826-JST/trigger-eval-baseline.json
```

比較時は現行runnerが要求するResult schema、`split=all`、`dataset_sha256`、case ID set、Codex version、modelの一致を維持する。comparison contractをPR3都合で弱めない。

変更したdescriptionについては、対応するbaseline failureが`fixed`になり、`regressed=0`であることを採用条件とする。変更しなかったfailureは`fixed`を完了条件にしない。

baselineでobservableだったcaseが`newly_unobservable`になった場合、それ自体をrouting regressionとは扱わない。ただし今回のrunでは非回帰を判定できないため完了扱いにせず停止する。case単位で都合のよい結果が出るまでretryしない。`recovered_observable`はcurrent outcomeを確認する。

### 8.2 現在の`main`相当での統合確認

目的:

- PR2 baselineとの因果比較とは別に、candidate descriptionを現在のrepository routing contextへ置いたとき、期待するroutingが成立するかを確認する。

current-main側Target:

1. 実装開始時のlatest `main`のworking filesを基にする。
2. Trigger Eval datasetと`.codex/runs/**`はexport時点で除外する。
3. dataset以外のcurrent routing context、特に現在の`AGENTS.md`とSkill packageを維持する。
4. latest `main`側の対象Skillにmaterial driftがないことを確認してから、同じcandidate descriptionを適用する。
5. fresh Git repositoryとしてcommitし、detached HEADにする。
6. baseline側Targetとは別Target・別artifactとして扱う。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <current-main-context-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final-current-context.json
```

このrunにはcandidateなしのcurrent-main control runがないため、「candidateによる新規回帰」を因果判定しない。PR2 baselineとのcomparisonにも使わない。

確認内容:

- 変更対象case / boundaryがexpected Skillへroutingできるか。
- observableな`sibling_misroute` / `unexpected_trigger`が発生していないか。
- observable failureが出た場合、その事実を統合確認のfailureとして扱い、candidateが原因だと推測で断定しない。
- runtime由来の`unobservable`をdescription failureへ読み替えない。

current-main側でcandidateによる回帰まで因果判定するためだけに、追加のcontrol runや新しい評価frameworkを導入しない。PR3のdescription変更に対する非回帰判定はbaseline側comparisonを正本とする。

### 8.3 no-opの場合

source descriptionを変更しない場合はcandidate tuningを行わない。

必要に応じてbaseline failureの再現性を補助的に確認するtrain runは実行できるが、その1回の結果だけでdescription defectまたはdescription健全性を確定しない。新しい統計評価frameworkや無制限retryは追加しない。

no-opの場合もdataset、現行routing contract、関連validatorが維持されていることを通常の検証で確認し、変更不要と判断した根拠を記録する。

---

## 9. 検証

### 9.1 既存契約の確認

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

### 9.2 Repository標準検証

```bash
pnpm run verify
git diff --check <implementation-base>...HEAD
```

source変更がある場合は、最終diffでSkill source変更が根拠を確認したfrontmatter `description`だけであることを確認する。

Plan、active Run Artifact、PR本文など、実装結果を記録する既存文書の更新はsource scopeとは分けて確認する。

---

## 10. 完了条件

- [ ] 実装開始時のlatest `main`とPlan作成時branch baseの差分を確認している。
- [ ] PR2 baseline、dataset fingerprint、Codex version、model、2件の`false_negative`を再確認している。
- [ ] baseline `evaluator_git_sha`と実行時Evaluatorの差分を確認し、observation / scoring / outcome mapping / comparison / model / timeout / dataset読込の意味が変わっていないことを確認している。
- [ ] 2件それぞれについて、train query、対応validation case、expected Skill、sibling Skill、`AGENTS.md` routingを比較している。
- [ ] description変更の有無を各Skillごとに独立して判断し、理由をRun Artifactへ記録している。
- [ ] descriptionに一般化可能な欠落がないSkillを、failureを消す目的だけで変更していない。
- [ ] 変更した場合はfrontmatter `description`だけに限定し、Skill本文・references・dataset・runner・`AGENTS.md`を変更していない。
- [ ] candidate wordingをtrain query固有の語彙へ過度に寄せていない。
- [ ] live eval前にcandidateをcommitし、Evaluatorの`.codex/runs/**`以外がcleanである。
- [ ] baseline側Targetとcurrent-main側Targetは元repositoryの`.git`、remote ref、object database、alternatesを共有していない。
- [ ] 両TargetにTrigger Eval datasetと`.codex/runs/**`が存在しない。
- [ ] PR2 baselineとの因果比較と、現在の`main`相当での統合確認を別のTarget・別の結果として扱っている。
- [ ] baseline側comparisonでは、変更したdescriptionに対応するfailureが`fixed`、`regressed=0`である。
- [ ] baseline側comparisonで`newly_unobservable`が発生した場合、routing regressionと断定せず、非回帰判定不能として完了扱いにしていない。
- [ ] 変更しなかったbaseline failureを、無理に`fixed`へすることを完了条件にしていない。
- [ ] current-main側runをcandidateによる回帰の因果比較として扱っていない。
- [ ] current-main側runでobservableな`sibling_misroute` / `unexpected_trigger`がない。
- [ ] `recovered_observable`がある場合はcurrent outcomeを確認している。
- [ ] `pnpm run eval:skills:trigger:validate`、対象repository-contract test、`pnpm run validate:skills`、`pnpm run test:repository`、`pnpm run verify`、`git diff --check`が成功している。
- [ ] Product code、Product test、Training、dependency、workflow、`.codex/agents/**`を変更していない。
- [ ] Repository独自Agent Runtime、routing classifier、retry framework、統計評価frameworkを追加していない。

2件ともdescription変更不要と判断した場合は、変更時専用条件をN/Aとし、根拠付きno-opをPR3の結論としてよい。

---

## 11. 実行手順

- [ ] 1. Issue #117、PR #127、最終baseline、現行routing契約を再確認する。
- [ ] 2. latest `main`との差分を確認し、baseline時とcurrentのrouting contextを分けて扱う前提を確定する。
- [ ] 3. baseline `evaluator_git_sha`と実行時Evaluatorの意味契約差分を確認する。
- [ ] 4. `code-review-train-002`についてdescription gapの有無を判定する。
- [ ] 5. `exploratory-qa-train-002`についてdescription gapの有無を判定する。
- [ ] 6. gapが確認できたSkillだけcandidate descriptionを作成する。
- [ ] 7. source変更がある場合は対象frontmatterだけ変更し、diffを確認してcandidateをcommitする。
- [ ] 8. Evaluatorの`.codex/runs/**`以外がcleanであることを確認する。
- [ ] 9. baseline sourceのworking filesからfresh Git repositoryとしてbaseline側Targetを準備し、candidate差分だけを適用する。
- [ ] 10. source変更がある場合は`train`でcandidateを確認し、意味上の根拠と結果の両方を満たすcandidateだけ採用する。
- [ ] 11. candidateを変更する場合は新しい仮説を明示し、commitとclean確認を行ってから再評価する。
- [ ] 12. candidate確定後、baseline側Targetで`all` + baseline comparisonを実行する。
- [ ] 13. latest `main`のworking filesからanswer keyを除外したfresh Git repositoryとしてcurrent-main側Targetを準備する。
- [ ] 14. current-main側Targetで`all`を実行し、current routing contextでの統合結果を確認する。
- [ ] 15. deterministic validationとRepository標準検証を実行する。
- [ ] 16. scope、Run Artifact、comparison結果を確認する。
- [ ] 17. PR本文とIssue #117の進捗情報を実装結果に合わせて整理する。

no-opの場合は6〜14のうちdescription変更とcandidate評価に不要な手順をN/Aとし、変更不要の根拠と通常検証を残す。

---

## 12. 停止条件

次の場合はPR3 scopeを広げず停止し、必要なら再計画する。

- Issue #117のrouting方針自体がbaseline取得後に変更され、PR3の前提が成立しない。
- baseline Evaluatorから実行時Evaluatorへの差分がobservation、scoring、outcome mapping、comparison、model、timeout、dataset読込の意味を変えている。
- `codex-cli 0.153.4`が必要なbaseline comparisonを実行できず、comparison contractを維持できない。
- answer-key-free Routing Targetを、元repositoryのGit history / remote ref / object databaseを持ち込まず準備できない。
- candidate descriptionを正当化する意味上の根拠がなく、評価結果だけを見て語句を追加する状態になる。
- description変更では解決できないHarness / OTel / runtime問題が主因と確認される。
- 修正にSkill本文、dataset、runner、scoring、timeout等の変更が必要になる。
- baseline側final comparisonで`newly_unobservable`が発生し、非回帰を判定できない。

`unobservable`だけを理由にdescriptionを変更しない。case retryで都合のよい結果だけを採用しない。

---

## 13. 成果物

実装結果に応じてactive Runへ最低限次を残す。

```text
description変更要否の判断根拠
変更した場合のdescription差分とcandidate commit SHA
baseline evaluator / current evaluatorの差分確認
baseline側Targetのprovenance
baseline側Trigger Eval結果とcomparison
current-main側Targetのprovenance
current-main側Trigger Eval結果
validation結果
scope確認
```

既存Run Artifact schemaを利用し、PR3専用schemaは作らない。

PR3のPR本文には、実際に変更したdescriptionだけを記載する。変更しなかったSkillを変更済みとして扱わない。no-opの場合は、baseline failureをdescription defectと確定できなかった根拠と検証結果を明記する。

Issue #117はPR3完了後もPR6が残るため、PR3完了だけを理由にcloseしない。