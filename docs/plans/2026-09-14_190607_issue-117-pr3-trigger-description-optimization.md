# Issue #117 PR3 Trigger description最適化 実装計画

## 1. 目的

- 対象Issue: [#117](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117)
- 対象フェーズ: PR3「Trigger description最適化」
- 実装ブランチ: `refactor/117-pr3-trigger-description-optimization`
- branch作成元: `main` `2afae5cb6562aa94b46ecc4f31a245d85ae48eda`
- Plan修正時点で取り込み済みの`main`: `22f73a98e5e11c9ee622512345b17e85694537e9`

PR2で保存したTrigger Eval baselineのobservableなfailureを確認し、Skill frontmatter `description`に一般化可能なrouting上の欠落がある場合だけ必要最小限修正する。

PR3の目的は、baseline failureを必ずdescription変更で消すことではない。failure query、対応するvalidation case、現行Skill boundary、`AGENTS.md`のroutingを照合し、descriptionとの因果を説明できる場合だけ変更する。descriptionに不足が確認できなければ、source変更なしを有効な結論として扱う。

PR2 baseline:

- `.codex/runs/20260912-231826-JST/trigger-eval-baseline.json`
- Result schema: `2`
- `evaluator_git_sha`: `d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`
- `routing_source_git_sha`: `3c5e35ed42712574eb9d89051820c9e27f137a16`
- `dataset_sha256`: `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`
- Codex: `codex-cli 0.153.4`
- model: `gpt-5.6-luna`
- 24 cases: `pass=15`、`false_negative=2`、`sibling_misroute=0`、`unexpected_trigger=0`、`unobservable=7`

PR2 baselineはPR3で調査するfailureの根拠と履歴として使用する。ただし、baseline取得後に公開`main`へTrigger Eval datasetとbaseline Resultが入っており、Routing Targetのproject configは`web_search = "cached"`である。PR3ではRouting Targetからcase固有answer keyを除外し、評価用Target内だけ`web_search = "disabled"`へ変更する。

PR2保存baselineとPR3 candidateではWeb検索条件が異なるため、description変更の直接比較にはbaseline source `3c5e35e...`から同じWeb無効条件のcontrolを新しく取得し、そのcontrolとcandidateを比較する。Repository本体の`.codex/config.toml`、Trigger Eval runner、dataset、観測方式、scoring、comparison、timeout、routing engineは変更しない。

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
- Repository本体の`.codex/config.toml`変更
- Trigger Eval runner、OTel observer、scoring、comparison、timeout、Result schemaの変更
- `unobservable` 7件の解消
- Hook fallback、retry framework、統計評価frameworkの追加
- PR4 / PR5の再実装
- PR6 Workflow E2E Evalの先取り
- Product code、Product test、Training、dependency、workflow、`.codex/agents/**`の変更
- 新しいSkill、Subagent、Agent Runtime、Workflow Engineの追加
- PR3専用のsandbox、外部tool監視、Target管理frameworkの追加

既存のTrigger Eval契約は `docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md`、`docs/adr/0025-trigger-eval-otel-observation-contract.md`、現行runner / evaluatorを正本として参照し、このPlanへ再定義しない。

---

## 4. 実装前に確認する内容

最低限、次を確認する。

```text
Issue #117
PR #127
AGENTS.md
.codex/config.toml
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

Plan再修正時点のlatest `main`は`22f73a98e5e11c9ee622512345b17e85694537e9`で、実装ブランチへ取り込み済みである。`7a80e059...`以降のPR #151では6 Skillの`SKILL.md`、references、`AGENTS.md`等が更新されたが、PR本文と実際のfrontmatterを確認した範囲ではTrigger `description`は維持され、対象2 Skillのrouting意味契約も維持されている。

ただし、実装開始時にはlatest `main`を再確認する。source変更またはcandidate作成へ進む前にbranchが`main`よりbehindしている場合はincoming diffを確認し、latest `main`を実装branchへ取り込んでから次へ進む。取り込み後の`SKILL.md`、`AGENTS.md`、Evaluator契約を基準にdescription gapを再判定する。

特に次が変わっている場合は、baseline取得時と現在のrouting contextが同じではないことを明示して扱う。

```text
AGENTS.md
.codex/config.toml
.agents/skills/*/SKILL.md
scripts/evals/**
tests/repository-contract/*trigger*
docs/adr/0024-*
docs/adr/0025-*
```

Issue #117のrouting方針自体が変わっている場合は、このPlanの前提が成立しないため再計画する。

### 4.1 latest `main`の再確認

latest `main`は実装開始時だけでなく、current-main側Targetを作成する直前にも再確認する。

- `main`が進んでいなければ、そのSHAをcurrent-main側Targetのsource revisionとして記録する。
- `main`が進んでいる場合はincoming diffを確認する。
- `AGENTS.md`、`.codex/config.toml`、対象Skill、Evaluator、ADR等に関係する変更がある場合は、latest `main`を実装branchへ取り込み、description gap、candidate、Evaluator差分の前提を再確認する。必要な評価は新しい前提でやり直す。
- routing / Evaluatorに無関係な変更だけでも、最終PRを古い`main`前提のまま完了扱いにしない。branch同期の要否をGit safety契約に従って判断し、使用した`main` SHAをRun Artifactへ残す。

source変更へ進む直前に、実装branchへ取り込んだlatest `main` SHAを`implementation_base_sha`として記録する。最終scope確認ではこのSHAを基準にする。current-main側Target作成直前の再確認で`main`を追加取り込みした場合は、その取り込み後のlatest `main` SHAへ`implementation_base_sha`を更新し、以後のscope確認も同じSHAを使用する。

latest `main`確認を自動化する専用frameworkは追加しない。

### 4.2 Evaluator差分の確認

baselineの`evaluator_git_sha`は`d15d1d10189e9b97a7a1ae43ec70e478f78ce7e5`である。実装時のEvaluator HEADが異なる場合は、少なくとも次の差分を確認する。

```text
.codex/config.toml
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
- Project trust後に読み込まれるproject config / hook契約が変わっていない。

baseline取得後、`run-skill-trigger-evals.ts`からOTel primary live path上の不要なHook snapshot filesystem I/Oが削除されているが、既存記録上はOTel observer、scoring、model、timeout、Result schema、datasetを変更していない。実装時にもこの前提を差分で再確認する。

上記の意味契約にmaterialな変更がある場合は、旧baselineとの結果をdescription変更の因果根拠として扱わず停止する。comparison実装が`evaluator_git_sha`一致を要求しないことだけを根拠に続行しない。

---

## 5. description変更要否の判定

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
6. 変更後も一文の入口契約として簡潔に保ち、Skill本文の責務やquery固有条件を列挙して過度に長文化しない。

candidateを複数回作り直す場合も、train結果だけに合わせて語句を増やさない。意味上の仮説がなくなった時点で調整を止める。

candidateをRepository branchへcommitした後で不採用と判断したSkillは、対象Skillのfrontmatter `description`を`implementation_base_sha`時点の内容へ戻す通常commitを追加する。`reset`、`rebase`、force pushで履歴を書き換えない。2 Skillのうち片方だけ不採用の場合は不採用側だけ戻し、最終diffでそのSkillのsource差分が0であることを確認してno-opとして扱う。

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

PR3で必要なのは、routing対象Agentへcase固有answer keyを直接与えないことである。Routing Targetからdataset、baseline Result、case固有の評価資料を除外し、評価用TargetだけWeb検索を無効化する。

ホストfilesystem全体やCodex Runtimeの全外部機能をPR3独自に隔離・監査する仕組みは追加しない。既存runnerのsandbox、Project trust、Hook、OTel契約はそのまま使用する。

### 7.1 baseline source側Target

PR2 baselineはfailure選定の履歴として維持する。description変更の因果比較には、baseline `routing_source_git_sha` `3c5e35ed42712574eb9d89051820c9e27f137a16`を起点に、Web検索条件をcandidateと揃えた新しいcontrolを使用する。

1. Repository外にEvaluatorとは別のGit repositoryを作る。
2. baseline `routing_source_git_sha` `3c5e35e...`だけを取得する。`git fetch --depth=1 <source> 3c5e35e...`相当の方法を使用してよい。
3. `3c5e35e...`をdetached HEADでcheckoutし、treeがbaseline sourceと一致していることを確認する。
4. 後続の`main`、PR2 dataset commit、現在のbranch等へのrefをTargetへ残さない。取得後はremoteを削除する。
5. `3c5e35e...`にTrigger Eval dataset、現在のcase ID、dataset fingerprint、PR2 baseline Result等のanswer keyが存在しないことを確認する。
6. baseline sourceに元から存在する非answer-key fileは削除しない。
7. `.codex/config.toml`の`web_search = "cached"`だけを`web_search = "disabled"`へ変更してcommitし、このcommitを`control_target_sha`として記録する。親は正確に`3c5e35e...`とし、他のfileを変更しない。
8. control Targetをdetached HEADにし、clean、EvaluatorとのGit common-dir非共有、`objects/info/alternates`なし、Trigger Eval dataset不存在、remoteなしを確認する。
9. description変更を採用候補とする場合だけ、`control_target_sha`を親としてcandidate descriptionだけを変更したcommitを作る。candidate commitは`control_target_sha`の直接の子とし、`.codex/config.toml`を含む他fileはcontrolから変更しない。
10. candidateを作り直す場合も、各candidate Target commitは直前candidateの子にせず、同じ`control_target_sha`を親として作る。
11. candidate Targetをdetached HEADで評価し、preflight条件を再確認する。
12. Resultの`routing_source_git_sha`にはcontrol / candidateそれぞれの実Target HEADを記録し、PR2 baseline SHAへ偽装しない。

直接比較対象は次となる。

```text
3c5e35e... baseline source
  └─ control_target_sha: .codex/config.toml の web_search だけ disabled
       └─ candidate_target_sha: candidate descriptionだけ変更
```

controlとcandidateのTarget file差分はcandidate descriptionだけに限定する。

### 7.2 current-main側Target

current-main側は因果比較ではなく、現在のrouting contextでの統合確認に使う。現在の`main`にはTrigger Eval dataset、過去の結果、case固有の評価設計を記載した文書が存在するため、これらを持たないfresh repositoryを作る。

1. Target作成直前にlatest `main`を再確認し、使用するsource SHAを確定する。
2. 確定したlatest `main`のworking filesをRepository外へexportする。
3. export時点で少なくとも次を除外する。
   - `.agents/skills/*/evals/trigger/**`
   - `.codex/runs/**`
   - Trigger Evalの個別case ID、raw query、`expected_skill`、boundary、baseline outcome等のcase固有answer keyを記載した文書・評価artifact
4. 現時点でcase固有answer keyを含む既知文書として、少なくとも次を除外対象として確認する。
   - `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
   - `docs/plans/2026-09-12_183342_trigger-eval-routing-observability-remediation.md`
5. `docs/plans/**`や`docs/history/**`をディレクトリ単位で無条件削除しない。case固有answer keyを含むファイルだけを除外し、routingに必要なcurrent repository contextを不必要に減らさない。
6. export後、Target内に次が残っていないことを一時的な検索で確認する。
   - current 24 case ID
   - current raw query
   - dataset fingerprint `89e15bc1a36ea6b7e769f8f84d1f56c99f331acbf2ccd1d2cbf3d5405ee7b267`
   - `.codex/runs/20260912-231826-JST/trigger-eval-baseline.json`等のbaseline artifact参照
   - case IDと`expected_skill` / boundary / outcomeを対応付ける記述
7. ADR-0024 / ADR-0025やEvaluatorの一般契約など、個別caseの正解を含まない評価方式の文書は、answer key隔離だけを理由に削除しない。
8. 元repositoryの`.git`、remote ref、object database、alternatesをコピーしない。
9. exportした`.codex/config.toml`の`web_search`だけを`disabled`へ変更する。その他のproject config / hooks設定はlatest `main`の値を維持する。
10. 最終採用candidate descriptionだけを適用する。
11. export先で新しく`git init`し、filesをcommitする。
12. remoteを設定せず、`HEAD`をdetachする。
13. working treeがclean、EvaluatorとGit common-dirを共有しない、`objects/info/alternates`が空であることを確認する。
14. Resultの`routing_source_git_sha`にはfresh repositoryの実Target HEADを記録する。

### 7.3 Web検索とProject trust

live evalするTargetでは、Target内の`.codex/config.toml`が`web_search = "disabled"`であることを確認する。Repository本体の`.codex/config.toml`は変更しない。

baseline source側・current-main側のTargetは新しいrepository pathで作成するため、live eval前にそのexact Target pathをcurrent Codexの通常のuser-consented project trust手順でtrustedにする。Repository-owned hookに追加trustが必要な場合も通常手順で承認する。

確認内容:

- Targetのproject-scoped Codex configが通常のtrust契約に従って読み込まれる状態である。
- Repository-owned hooksが存在する場合、通常のhook trust契約に従って実行可能な状態である。
- runnerや補助scriptから`~/.codex/config.toml`、trust state file、hook trust keyを変更しない。
- trustを回避するためのunsafe flag、一時`CODEX_HOME`、trust state偽装を使用しない。

Project trustまたは必要なhook trustを確立できない場合はenvironment preparation failureとして停止する。description failure、routing regression、`unobservable`改善対象へ読み替えない。

answer key確認のための検索は実行時の一時確認に限定し、PR3専用のTarget generator、scanner、repository helperは追加しない。具体的なpreflight、selector、OTel観測条件はADR-0024 / ADR-0025と現行runnerへ従う。

---

## 8. Trigger Evalの評価方針

PR3では、PR2 baselineをfailure選定の履歴として扱い、Web検索条件を揃えたbaseline source controlとcandidateの比較をdescription変更の因果評価に使う。current-main側runは現在のrouting contextでの統合確認として分離する。

### 8.1 Web無効controlとの因果比較

#### control `all`

意味上のdescription gapが確認され、candidate評価へ進む可能性がある場合は、source descriptionを変更する前にcontrol Targetで`all`を1回実行する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <baseline-control-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-control-baseline-context.json
```

controlは次を満たすこと。

- Target HEADは`control_target_sha`である。
- `control_target_sha`の親は`3c5e35e...`である。
- `3c5e35e...`からのTarget file差分は`.codex/config.toml`の`web_search: cached -> disabled`だけである。
- Codex version、model、dataset fingerprint、Result schema、case ID setはcandidate評価と同一条件である。

PR2保存baselineとのoutcome差はWeb検索条件等の差を含む診断情報として記録できるが、description変更の因果判定には使用しない。

PR2 baselineで`false_negative`だった対象caseについて、control結果を次のように扱う。

- controlでもobservable failureであれば、そのSkillはcandidateによる改善評価へ進める。
- controlで既に`pass`なら、PR2の過去failureだけを理由にそのSkillのdescriptionを変更しない。意味上のgap候補は記録するが、そのfailureに対するPR3 source変更はno-opとする。
- controlで`unobservable`なら、candidateによる改善を判定できないため、そのSkillのsource変更評価を停止する。都合のよい結果が出るまでcontrolをretryしない。

control `all`がcoverage不足で`exit 1`でも、全selected casesがResultへ保存され、Result schema、provenance、case ID set、dataset fingerprint、Codex version、model等のcomparison contractを満たす場合はpartial controlとして利用できる。対象case自体がobservableであることはcandidate評価の前提とする。

#### trainでのcandidate確認

controlでobservable failureが確認できたSkillだけcandidateを作る。candidate wordingの調整にはcandidate Targetの`train` splitだけを使い、control `all`内の対応train caseを変更前結果として参照する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <baseline-candidate-target> \
  --split train \
  --output <active-run>/trigger-eval-pr3-train.json
```

確認内容:

- 変更したSkillに対応するcontrol train failureが改善しているか。
- controlでobservableだったtrain pass caseをobservable failureへ変えていないか。
- `sibling_misroute` / `unexpected_trigger`を新規に発生させていないか。

train runの結果だけを理由に、意味上の根拠がない追加語句をcandidateへ足さない。candidateを作り直す場合は新しい意味上の仮説を先に説明し、Target側では同じ`control_target_sha`を親として新candidate commitを作る。

意味上妥当で採用可能なcandidateがなくなったSkillは、Repository branch側descriptionを`implementation_base_sha`時点へ通常commitで戻してno-opとする。別Skillのcandidateを採用する場合は、そのSkillだけ評価を継続する。

#### 最終`all` comparison

candidateを確定した後に`all`を実行し、PR2保存baselineではなく同一条件のcontrol artifactと比較する。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <baseline-candidate-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final-baseline-context.json \
  --compare <active-run>/trigger-eval-pr3-control-baseline-context.json
```

比較時は現行runnerが要求するResult schema、`split=all`、`dataset_sha256`、case ID set、Codex version、modelの一致を維持する。comparison contractをPR3都合で弱めない。

controlまたはcandidateのfinal `all`が8/8 coverage未達で`exit 1`になった場合も、`exit 1`だけをdescription failureやrouting regressionとは扱わない。全selected casesがResultへ保存され、comparison contractを満たしてcomparisonを評価できる場合はpartial resultとして判定を継続する。

coverage改善だけを目的としたcase retry、Target交換、timeout変更、dataset変更、description追加変更は行わない。Result artifact自体が生成されない、comparison contractを満たさない、またはcomparisonを評価できない場合は停止する。

変更したdescriptionについては、対応するcontrol failureが`fixed`になり、comparison全体で`regressed=0`であることを採用条件とする。変更しなかったfailureは`fixed`を完了条件にしない。

controlでobservableだったcaseがcandidateで`newly_unobservable`になった場合、それ自体をrouting regressionとは扱わない。ただし今回のrunでは非回帰を判定できないため完了扱いにせず停止する。case単位で都合のよい結果が出るまでretryしない。`recovered_observable`はcurrent outcomeを確認する。

##### final `all`後にcandidateを不採用とする場合

最終`all`で初めてcandidateの不採用が確定した場合、最終sourceと評価artifactを不一致のままcurrent-main側確認へ進めない。

- 対応するcontrol failureが`fixed`にならなかったSkillは不採用とし、Repository branch側descriptionを`implementation_base_sha`時点へ通常commitで戻す。
- 一部Skillだけ不採用とし、他のcandidateを残す場合は、`control_target_sha`を親として最終採用candidateだけを含む新しいTarget commitを作り、final `all` comparisonを再実行する。
- 再実行はwordingの追加調整ではなく、最終sourceと評価対象を一致させるために限る。同じ最終candidate setで都合のよい結果を得るためのretryはしない。
- `regressed>0`が発生した場合はcandidate setを採用しない。原因切り分けのために組合せを総当たりする評価は追加せず、対象candidateを戻してno-opとする。
- 最終採用candidateが0件になった場合はPR3 source変更をno-opとし、current-main側candidate live evalは行わない。
- current-main側Targetには、最後にcontrol comparisonを通過したcandidate setだけを適用する。

### 8.2 現在の`main`相当での統合確認

目的:

- controlとの因果比較とは別に、最終採用candidate descriptionを現在のrepository routing contextへ置いたとき、期待するroutingが成立するかを確認する。

current-main側Target:

- Target作成直前に確認したlatest `main`のworking filesを基にする。
- Trigger Eval dataset、`.codex/runs/**`、case固有answer keyを含む文書・評価artifactをexport時点で除外する。
- `.codex/config.toml`はlatest `main`の内容を基にし、評価用Target内だけ`web_search = "disabled"`へ変更する。
- 個別caseの正解を含まないcurrent routing context、特に現在の`AGENTS.md`とSkill packageを維持する。
- latest `main`側の対象Skillにmaterial driftがないことを確認してから、最終採用candidate descriptionだけを適用する。
- baseline source側Targetとは別Target・別artifactとして扱う。
- Target作成後にcase ID / raw query / expected Skill等のanswer keyが残っていないことを確認してからlive evalへ進む。

```bash
pnpm run eval:skills:trigger -- \
  --target-root <current-main-context-target> \
  --split all \
  --output <active-run>/trigger-eval-pr3-final-current-context.json
```

このrunにはcandidateなしのcurrent-main control runがないため、「candidateによる新規回帰」を因果判定しない。baseline source側controlとのcomparisonにも使わない。

確認内容:

- 変更したdescriptionに対応する対象case / boundaryがobservableな場合、expected Skillへroutingできていることを確認する。対象caseがobservableな`false_negative`、`sibling_misroute`、`unexpected_trigger`になった場合は統合確認をPASSとしない。
- 変更していないSkillの既知failureまで修正することは完了条件にしない。
- 対象外caseでobservable failureが出た場合は、その事実を統合確認のfailureとして記録するが、candidateが原因だとcontrol runなしに断定しない。
- runtime由来の`unobservable`をdescription failureへ読み替えない。

current-main側でもcoverage不足による`exit 1`だけをdescription failureとは扱わない。全selected casesのResultが保存されている場合は内容を確認し、runtime由来のcoverage不足を直すためのretry、timeout変更、Target交換、評価framework追加へ進まない。ただし変更対象case自体が`unobservable`で期待routingを確認できない場合は、統合確認を完了扱いにせず停止する。

current-main側でcandidateによる回帰まで因果判定するためだけに、追加のcontrol runや新しい評価frameworkを導入しない。PR3のdescription変更に対する非回帰判定はbaseline source側control comparisonを正本とする。

### 8.3 no-opの場合

source descriptionを変更しない場合はcandidate tuningを行わない。

意味上のgap自体が確認できない場合はcontrol runをdescription健全性の証明として追加実行する必要はない。意味上のgapがあるもののcontrolでPR2の対象failureが既に`pass`だった場合も、そのfailureに対するsource変更はno-opとし、過去baselineと現在controlの差を記録する。

candidateを一度以上commitした後で全candidateを不採用としたSkillも、`implementation_base_sha`時点のdescriptionへ戻す通常commitを追加し、最終source差分が0であることを確認したうえでno-opとして扱う。

必要に応じてfailureの再現性を補助的に確認するrunは実行できるが、その1回の結果だけでdescription defectまたはdescription健全性を確定しない。新しい統計評価frameworkや無制限retryは追加しない。

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
- Repository本体の`.codex/config.toml`は変更していない。

### 9.2 Repository標準検証

```bash
pnpm run verify
git diff --check <implementation_base_sha>...HEAD
git diff <implementation_base_sha>...HEAD -- .agents/skills .codex/config.toml
```

`implementation_base_sha`は、source変更へ進む直前に実装branchへ取り込んだlatest `main` SHAとする。current-main側Target作成直前の再確認で`main`を追加取り込みした場合は、その取り込み後のlatest `main` SHAへ更新する。

source変更がある場合は、最終diffでSkill source変更が根拠を確認したfrontmatter `description`だけであり、Repository本体の`.codex/config.toml`に差分がないことを確認する。評価用Targetで作成した`web_search = "disabled"`の一時変更は実装branchへ持ち込まない。不採用Skillは最終diffでsource差分が0であることを確認する。

Plan、active Run Artifact、PR本文など、実装結果を記録する既存文書の更新はsource scopeとは分けて確認する。

### 9.3 Git / PR / CI完了契約

repository fileを変更した実装では、`docs/reference/codex-implementation-harness.md`のRepository file-changing task完了契約を正本として適用する。

- tracked Run Artifactをfinal commit前の状態へ確定する。
- 最終差分をcommitし、対象branchへ通常pushする。
- local HEAD、remote HEAD、PRの最新headが一致していることを確認する。
- 既存PRがあれば使用し、必要な場合だけPRを作成する。
- 最新PR headの`Web CI`と`Mobile App CI`が`success`であることを確認する。
- CI failureではbounded repair workflowに従い、修正後の新しいcommitと最新PR headで再確認する。
- push後のCI結果だけを記録する目的でtracked Run Artifactを再commitしない。

no-opでSkill sourceを変更しない場合でも、active Run Artifact等のrepository fileを変更した場合はこの完了契約を適用する。

---

## 10. 完了条件

- [x] 実装開始時のlatest `main`を確認し、source変更前に実装branchへ必要な`main`変更を取り込んでいる。
- [x] source変更へ進む直前のlatest `main` SHAを`implementation_base_sha`として記録し、後で`main`を追加取り込みした場合は基準SHAも更新している。
- [x] current-main側Target作成直前にもlatest `main`を再確認し、使用した`main` SHAを記録している（採用candidateなしのためTarget作成はN/A）。
- [x] PR2 baseline、dataset fingerprint、Codex version、model、2件の`false_negative`を再確認し、PR2 baselineはfailure選定の履歴であってcandidateの直接controlではないことを明示している。
- [x] baseline `evaluator_git_sha`と実行時Evaluatorの差分を確認し、observation / scoring / outcome mapping / comparison / model / timeout / dataset読込 / project configの意味が変わっていないことを確認している。
- [x] 2件それぞれについて、train query、対応validation case、expected Skill、sibling Skill、`AGENTS.md` routingを比較している。
- [x] description変更の有無を各Skillごとに独立して判断し、理由をRun Artifactへ記録している。
- [x] descriptionに一般化可能な欠落がないSkillを、failureを消す目的だけで変更していない。
- [x] baseline source側control Targetはno-opのためN/Aであり、PR2 baselineを直接controlにしていない。
- [x] candidate Targetはno-opのためN/Aである。
- [x] candidateを作り直した場合もno-opのためN/Aである。
- [x] live evalする各Targetの`.codex/config.toml`確認はcandidateなしのためN/Aである。
- [x] 変更した場合はRepository sourceのfrontmatter `description`だけに限定する条件を確認し、実際のsource差分は0である。
- [x] candidate wordingをtrain query固有の語彙へ過度に寄せていない。
- [x] 変更後descriptionの簡潔性条件はsource変更なしのためN/Aである。
- [x] candidate live eval前のcommit条件はcandidateなしのためN/Aである。
- [x] 不採用candidateの復帰条件はcandidateなしのためN/Aである。
- [x] baseline source側Targetのanswer-key隔離条件はlive EvalなしのためN/Aである。
- [x] current-main側TargetのGit isolation条件はlive EvalなしのためN/Aである。
- [x] current-main側Targetのdataset除外条件はlive EvalなしのためN/Aである。
- [x] current-main側Targetのanswer-key除外条件はlive EvalなしのためN/Aである。
- [x] current-main側Targetの一時検索条件はlive EvalなしのためN/Aである。
- [x] ADR等の一般評価契約は変更・削除していない。
- [x] Targetのdetached / trust条件はlive EvalなしのためN/Aである。
- [x] live Eval対象のProject trust / hook trust条件はlive EvalなしのためN/Aである。
- [x] trust確立のためのuser-level config、trust state、hook trust key変更は行っていない。
- [x] description変更を評価するSkillについて、control `all`で対象caseがobservable failureであることを確認してからcandidate評価へ進む条件はno-opのためN/Aである。
- [x] controlで対象caseが既に`pass`の場合、PR2の過去failureだけを理由にそのSkillのdescriptionを変更していない。
- [x] controlで対象caseが`unobservable`の場合のcandidate停止条件はlive EvalなしのためN/Aである。
- [x] candidate final `all`のcomparisonはcandidateなしのためN/Aである。
- [x] control / candidateのcoverage不足結果の比較はlive EvalなしのためN/Aである。
- [x] 最終採用candidateのfixed / regressed判定はcandidateなしのためN/Aである。
- [x] final `all`後のcandidate不採用・再comparisonはcandidateなしのためN/Aである。
- [x] `regressed>0`のcandidate set採用はcandidateなしのため行っていない。
- [x] `newly_unobservable`のcandidate判定はcandidateなしのためN/Aである。
- [x] 変更しなかったPR2 baseline failureを`fixed`へ読み替えていない。
- [x] current-main側runをcandidate回帰比較に使用していない。
- [x] current-main側の変更description統合確認はsource変更なしのためN/Aである。
- [x] current-main側のunobservable統合確認はsource変更なしのためN/Aである。
- [x] `recovered_observable`のcurrent outcome確認はcandidateなしのためN/Aである。
- [x] `pnpm run eval:skills:trigger:validate`、対象repository-contract test、`pnpm run validate:skills`、`pnpm run test:repository`、`pnpm run verify`、`git diff --check`が成功している。
- [x] `implementation_base_sha`基準の最終diffでSkill source差分0、Repository本体の`.codex/config.toml`差分0を確認している。
- [x] repository file変更に対するfinal commit、通常push、PR最新head、`Web CI` / `Mobile App CI`確認までの完了契約を今回の最終処理対象としている。
- [x] Product code、Product test、Training、dependency、workflow、`.codex/agents/**`を変更していない。
- [x] Repository独自Agent Runtime、routing classifier、retry framework、統計評価framework、Target generator、answer-key scanner、sandbox / 外部tool監視frameworkを追加していない。

2件ともdescription変更不要と判断した場合は、description変更時専用条件をN/Aとし、根拠付きno-opをPR3の結論としてよい。意味上のgapがない場合はcontrol run自体を必須にしない。active Run Artifact等のrepository fileを変更した場合のGit / PR / CI完了契約はN/Aにしない。

---

## 11. 実行手順

- [x] 1. Issue #117、PR #155、最終PR2 baseline、現行routing契約、`.codex/config.toml`を再確認する。
- [x] 2. latest `main`を確認し、branchがbehindでないこととincoming diffを確認した。
- [x] 3. source変更へ進む直前のlatest `main` SHAを`implementation_base_sha`として記録する。
- [x] 4. 取り込み後の`SKILL.md`、`AGENTS.md`、`.codex/config.toml`、Evaluator契約でbaseline時とcurrentのrouting contextを分けて扱う前提を確定する。
- [x] 5. baseline `evaluator_git_sha`と実行時Evaluatorの意味契約差分を確認する。
- [x] 6. `code-review-train-002`についてdescription gapがないと判定する。
- [x] 7. `exploratory-qa-train-002`についてdescription gapがないと判定する。
- [x] 8. 2件ともgapがないためsource変更no-opとして通常検証へ進む。
- [x] 9. baseline source側controlの作成は2件ともno-opのためN/Aである。
- [x] 10. control Targetの確認はno-opのためN/Aである。
- [x] 11. control Targetのtrust / `web_search`確認はno-opのためN/Aである。
- [x] 12. control Targetの`all`実行はno-opのためN/Aである。
- [x] 13. control結果によるcandidate判定はno-opのためN/Aである。
- [x] 14. candidate description作成はgapなしのためN/Aである。
- [x] 15. source変更・candidate commitはgapなしのためN/Aである。
- [x] 16. candidate評価前のEvaluator clean確認はcandidateなしのためN/Aである。
- [x] 17. candidate Target作成はgapなしのためN/Aである。
- [x] 18. candidate Targetのtrust / `web_search`確認はcandidateなしのためN/Aである。
- [x] 19. candidate `train`はcandidateなしのためN/Aである。
- [x] 20. candidate調整・復帰はcandidateなしのためN/Aである。
- [x] 21. candidate `all` / comparisonはcandidateなしのためN/Aである。
- [x] 22. final `all`後のcandidate再comparisonはcandidateなしのためN/Aである。
- [x] 23. 最終採用candidateが0件のためcurrent-main側candidate live evalをN/Aとし、通常検証へ進んだ。
- [x] 24. 採用candidateなしのためcurrent-main側Target作成前のcandidate前提再評価はN/Aであり、latest `main` `bd31452d...`を最終確認した。
- [x] 25. current-main側answer-key-free Target作成はcandidateなしのためN/Aである。
- [x] 26. current-main側Targetのanswer-key検索はcandidateなしのためN/Aである。
- [x] 27. current-main側Targetのtrust / `web_search`確認はcandidateなしのためN/Aである。
- [x] 28. current-main側Targetの統合`all`はcandidateなしのためN/Aである。
- [x] 29. deterministic validationとRepository標準検証を実行した。
- [x] 30. `implementation_base_sha`基準でscope、Run Artifact、comparisonのN/A理由を確認し、tracked Run Artifactをfinal commit前の状態へ確定する。
- [x] 31. 最終差分をcommitし、対象branchへ通常pushする。
- [x] 32. local HEAD、remote HEAD、PRの最新headを確認し、既存PR #155を使用する。
- [x] 33. 最新PR headの`Web CI`と`Mobile App CI`が`success`であることを確認する。
- [x] 34. PR本文とIssue #117の進捗情報を実装結果とCI結果に合わせて整理する。

no-opの場合は理由に応じて不要なcontrol / candidate / current-main live eval手順をN/Aとし、変更不要の根拠と通常検証を残す。candidateを一度commitした後でno-opへ戻したSkillは通常commitによる復帰と最終source差分0を記録する。active Run Artifact等のrepository fileを変更した場合は30〜34を通常どおり実行する。

---

## 12. 停止条件

次の場合はPR3 scopeを広げず停止し、必要なら再計画する。

- Issue #117のrouting方針自体がbaseline取得後に変更され、PR3の前提が成立しない。
- latest `main`のrouting / Evaluator / `.codex/config.toml`関連変更を実装branchへ安全に取り込めず、current前提でcandidateを評価できない。
- baseline Evaluatorから実行時Evaluatorへの差分がobservation、scoring、outcome mapping、comparison、model、timeout、dataset読込、project configの意味を変えている。
- `codex-cli 0.153.4`を使用できず、control / candidateのCodex version一致条件を維持できない。
- baseline `routing_source_git_sha`そのものを起点として隔離Targetを再現できない。
- baseline source側TargetにTrigger Eval dataset、現在のbaseline artifact等のanswer keyが含まれる。
- control Targetで`.codex/config.toml`のWeb検索設定以外にも`3c5e35e...`からTarget file差分が入る。
- candidate Targetを`control_target_sha`の直接の子としてdescription変更だけに限定できない。
- current-main側のanswer-key-free Targetを元repositoryのGit history / remote ref / object databaseを持ち込まず準備できない。
- current-main側Targetからcurrent case ID、raw query、dataset fingerprint、baseline artifact参照、caseとexpected Skill / boundary / outcomeの対応を除去できない。
- answer keyを除くためにroutingへ必要なcurrent repository contextまで大きく削る必要が生じる。
- live eval対象TargetのProject trust、または必要なRepository-owned hook trustを通常手順で確立できない。
- 評価用Targetで`web_search = "disabled"`を維持できない。
- controlで変更対象caseが`unobservable`となり、candidateによる改善を判定できない。
- candidate descriptionを正当化する意味上の根拠がなく、評価結果だけを見て語句を追加する状態になる。
- description変更では解決できないHarness / OTel / runtime問題が主因と確認される。
- 修正にSkill本文、dataset、runner、scoring、timeout等の変更が必要になる。
- controlからcandidateへのfinal comparisonで`newly_unobservable`が発生し、非回帰を判定できない。
- controlまたはcandidateでResult artifactが生成されない、comparison contractを満たさない、またはcomparison結果を評価できない。
- current-main側で変更対象caseが`unobservable`となり、expected routingを確認できない。

`unobservable`やcoverage不足による`exit 1`だけを理由にdescriptionを変更しない。case retryやcontrol retryで都合のよい結果だけを採用しない。

---

## 13. 成果物

実装結果に応じてactive Runへ最低限次を残す。

```text
description変更要否の判断根拠
変更した場合のdescription差分とRepository branch側candidate commit SHA
candidate不採用時の復帰commitと最終source差分確認
PR2 baselineをfailure選定の履歴として扱い、直接controlにしなかった理由
baseline evaluator / current evaluatorの差分確認
実装開始時とcurrent-main Target作成直前のlatest main SHA / drift確認
implementation_base_sha
control Targetのprovenance / control_target_sha / parent SHA
control Targetのanswer-key / web_search確認
control TargetのProject trust / hook trust確認
control Trigger Eval結果
candidate Targetのprovenance / candidate_target_sha / parent SHA
candidate TargetのProject trust / hook trust確認
candidate Trigger Eval結果とcontrol comparison
final all後にcandidate setを変更した場合の再comparison結果
current-main側Targetのsource main SHAとprovenance
current-main側Targetのanswer key除外・検索結果
current-main側TargetのProject trust / hook trust確認
current-main側Trigger Eval結果
validation結果
scope確認
```

既存Run Artifact schemaを利用し、PR3専用schemaは作らない。

PR3のPR本文には、実際に変更したdescriptionだけを記載する。変更しなかったSkillを変更済みとして扱わない。no-opの場合は、baseline failureをdescription defectと確定できなかった根拠、controlで既にpassした場合はその事実、candidateを試した後で不採用にした場合は復帰した事実、検証結果を明記する。

Issue #117はPR3完了後もPR6が残るため、PR3完了だけを理由にcloseしない。

---

## 14. PR3最終状態（2026-09-18）

- PR3の最終判定はno-op。`repair-loop`と`android-native-local-validation`のfrontmatter `description`は変更不要で、Skill source差分は0。
- Issue #159で修正されたWindows launcher contract timeoutを含む`main`（`bd31452d5b69169bee0016afcec6bc8b5d83318a`）をPR branchへ取り込み済み。#159および最新`main`の差分確認により、PR3のSkill / routing / Trigger Eval契約へのmaterialな変更はない。
- Trigger Eval datasetは12 files / 24 cases、fingerprintはbaselineから不変。PR2 baselineを直接controlとして扱わず、candidate source変更がないためcontrol / candidate / current-mainのlive Trigger Evalはno-op条件によりN/A。
- `eval:skills:trigger:validate`、`validate:skills`、指定repository-contract、`test:repository`、`verify`、`git diff --check`、Run Artifact sanitizerはすべてPASS。`verify`はexit code 0で完走し、contractは36 files / 584 passed / 4 skipped。
- PR固有差分はPlan 1 fileと既存Run Artifact 4 filesのみ。Skill source、`AGENTS.md`、`.codex/config.toml`、Trigger Eval関連、Product code / test、workflow、dependencyにPR3固有の変更はない。
- tracked Run Artifactは最終commit前に確定し、push後のcommit SHA・PR head・Web CI / Mobile App CI結果はPR #155本文、Issue #117進捗、最終報告へ反映する。残件は外部GitHub反映の確認のみで、PR3のPlan完了条件上の機能残件はない。
