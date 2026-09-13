# Issue #117 PR2 Qualification blocker remediation 実装計画

> Status: 実装前の新規Plan（今回の作業では実装・Probe・Environment Qualification・canonical `all`を行わない）
>
> 対象: PR #127 / branch `refactor/117-pr2-trigger-eval-baseline`
>
> 目的: `negative trusted absence`を観測契約を弱めずに成立させるため、実測された単一のcompound PowerShell shapeだけをboundedに認識し、detached Targetとpreflightの保証責務を明確にする。

## 0. 依頼概要

### 0.1 背景

PR #127ではResult schema 2、initial routing、bounded selector、process lifecycle、comparison契約の実装と静的品質ゲートまで完了している。しかしEnvironment Qualificationのnegative controlで、実Hostが現在のselectorの対象外であるcompound PowerShell commandを生成したため、trusted absenceを証明できずQualificationがFAILした。

今回のFAILは、現時点でflaky、PC固有、Windows固有、別実行で解消することを証明したものではない。raw Hook evidenceと現行observation contractのshape不一致として扱う。既存`evaluation.json`の`flaky_or_env_issue`は過去Runの記録として保持し、原因を確定した記録へ書き換えない。

### 0.2 今回の成果物

- 本実装Plan
- 新規Plan専用strict Run Artifact
- Plan-only validationの結果
- PR #127本文へのPlan pathと「実装未着手」の最小追記

### 0.3 今回の対象外

今回のPlan作成Runでは、次を行わない。

- `scripts/evals/skill-trigger-evals.ts`、`scripts/evals/run-skill-trigger-evals.ts`、tests、ADRの実装変更
- selector、preflight、dataset、query、Skill、Hook、timeout、dependencyの変更
- Observation Probe、Environment Qualificationの再実行
- canonical `all`、case retry、query tuning、別Target交換
- PR merge、protected branchへの変更

## 1. ゴール / 完了条件

### 1.1 ゴール

次の実装Runが、現Hostで実測されたnegative commandを`safe_no_read`として扱える。ただし、対象は固定されたcompound shapeだけであり、PowerShell一般、pipe一般、semicolon一般、variable一般のparserには拡張しない。

同時に、Qualificationで使うRouting Targetのdetached状態、期待routing source SHA、answer key相当のdataset、Evaluator artifact、他Codex processの扱いを、runner自動検査とRun手順へ分離して再現可能にする。

### 1.2 実装RunのDoD

- 実測commandの完全一致に近いbounded recognizerが、`safe_no_read`、`selector_reliable=true`、`skill=null`を返す。
- compound内へcanonical Skill read、arbitrary suffix、variable path、追加reader、別operatorを入れた近接caseは`safe_no_read`へ昇格しない。
- `truncated=true`、malformed input、対象commandを一意に取得できない入力は`unreliable`のままになる。
- trusted absenceは、既存の`turn.completed`、Hook correlation / parse、全対象`PostToolUse`のreliable判定、canonical read 0件を満たした場合だけ`observed_skills=[]`として確定する。
- detached HEADをrunner preflightで強制し、attached branchをPASSへ通さない。
- routing source SHAの期待値は、新しいCLI optionや設定frameworkを増やさず、Qualification開始前のRun preflightで明示比較し、実Result provenanceでも再確認する。
- 既存の6 canonical Skill readable、Trigger dataset不存在、Evaluator / Target分離、common-dir、alternates、cleanの契約を維持する。
- dataset schema 1、Result schema 2、process lifecycle 6値、`CASE_TIMEOUT_MS = 327_000`、PR2/PR6境界を変更しない。
- focused contract test、dataset validation、Skill/Markdown validation、full verifyがPASSする。
- Qualificationは、実装後に作成した一つのfresh independent Target上でpositive / negative両方をPASSした場合のみcanonical `all`へ進む。

## 2. 現状理解と前提

### 2.1 Repository / PR状態

開始時のread-only確認結果:

| 項目 | 確認結果 |
| --- | --- |
| branch | `refactor/117-pr2-trigger-eval-baseline` |
| working tree | clean |
| HEAD / PR head | `a56472e01baab3584123a01c78416b4550db3d81` |
| `origin/main` | `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5` |
| PR #127 | OPEN、base `main`、head branch一致 |
| Codex | `codex-cli 0.153.4`（直近Qualification） |
| 既存実装Run | `.codex/runs/20260909-225950-JST/`（履歴として保持し再利用しない） |

PR本文と既存Runは、Environment Qualification FAIL、canonical `all`未実行、8/8 side validity未判定、valid baseline未取得を記録している。

### 2.2 raw negative evidence

採用する根拠は`.artifacts/trigger-eval-qualification-20260910/negative-trusted/`のraw evidenceである。`hook-delta.jsonl`の唯一の対象`PostToolUse` eventは次のとおり。

```text
tool_name: Bash
truncated: false
tool_input_preview.command: $pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name
```

構造を分解すると次のとおりである。

| 要素 | 実測値 | 判定上の意味 |
| --- | --- | --- |
| reader | `Get-Content` | content readはあるがcanonical Skill pathではない |
| option | `-Raw -LiteralPath` | literal path指定である |
| path | `.\package.json` | 6 canonical Skill treeと非交差 |
| pipeline | `ConvertFrom-Json`（pipe右辺） | pipe一般を許可する根拠にはしない |
| assignment | `$pkg =` | variable一般を許可する根拠にはしない |
| suffix | `; $pkg.name` | property accessまで含む固定shape |
| canonical Skill path | なし | Skill direct readの根拠なし |
| 追加reader | なし | この完全shape内にはない |
| terminal | `turn.completed`、exit 0 | absence候補のterminal条件は満たす |
| Hook | correlation / parse PASS | event収集境界は成立 |

rawの`analysis.json`は`selector_reliable=false`、`initial_skill=null`、`observed_skills=null`を記録している。これは現行selectorがpipe、semicolon、`$`を含むcommandをbounded grammar外として拒否した結果であり、canonical Skill readがあったという意味ではない。

### 2.3 現行コードの確認

- `scripts/evals/run-skill-trigger-evals.ts`の`classifyCommand`は、simple `Get-Content`、限定されたsearch、既知のsafe commandだけを分類する。
- tokenizerは`|`、`;`、`$`、command substitution等を含むunboundedなshapeを`unreliable`へ倒す。
- `selectInitialSkill`はcandidate前の`unreliable`を即時にabsence不成立へし、candidate後の不確実性は既存contractに従って扱う。
- `assertTargetPreflight`はEvaluator / Targetのrealpath分離、相互containment、Git working tree、clean、6 Skill readable、Trigger dataset不存在、common-dir分離、alternates、Evaluator側Run artifact以外の変更を検査する。
- `assertTargetPreflight`はTargetのHEAD SHAを`routing_source_git_sha`として記録するが、期待値との一致とdetached HEADを現状は強制していない。
- `skill-trigger-evals.ts`のdataset schema 1、Result schema 2、initial-only observation、process lifecycle、comparison契約は今回のblocker修正で変更しない。

### 2.4 前提

- negative query `package.json に記載されている package name だけを確認して答えてください。`は変更しない。
- positive queryも変更せず、existing candidate prefix契約でcanonical Skill readを確認する。
- Qualificationとcanonical `all`は、実装後に作成した同一のfresh independent Targetを再利用する。
- Codex versionは`codex-cli 0.153.4`を固定する。version変更でblockerを隠さない。
- 240秒terminal Gateは導入しない。`CASE_TIMEOUT_MS = 327_000`はprocess safety capのまま維持する。

## 3. selector設計の比較と決定

### 3.1 案A: 実測shape限定

実測した一つのcommand構造だけを認識する。

```text
^\$pkg\s*=\s*Get-Content\s+-Raw\s+-LiteralPath\s+\.\\package\.json\s+\|\s+ConvertFrom-Json\s*;\s*\$pkg\.name$
```

実装時は上記の固定token、固定path、固定operator、固定property accessの範囲だけを許可し、前後の任意command、別variable、別path、別operator、追加readerを許可しない。空白のbounded variationだけを許可するかは、既存tokenizerの責務に合わせ、許可範囲をtestで固定する。

- 長所: 変更が小さく、package.jsonがcanonical Skill treeと非交差であることをcommand全体から説明できる。
- 長所: general PowerShell parser、pipeline parser、variable evaluatorを導入しない。
- 短所: Hostが別のcompound shapeを生成した場合は`unreliable`となる。

### 3.2 案B: 小さなbounded compound recognizer

複数の実測evidenceに共通する構造を抽象化し、限定されたpipelineやassignmentを認識する。

- 長所: 将来の近接shapeを一部受け入れられる。
- 短所: 現時点では同一Host・同一目的の複数shape evidenceがない。
- 短所: variable、property、operatorの許可境界が急速に広がり、negative absenceのfalse passを作りやすい。

### 3.3 決定

案Aを採用する。今回のraw evidenceは一つだけであり、案Bを選ぶ根拠がない。新しいshapeを追加する場合は、新しいraw evidence、canonical treeとの非交差証明、近接negative regression testを先に確定する。将来可能性だけを理由に認識範囲を広げない。

## 4. 実装する観測契約

### 4.1 3状態

各caseと相関した`PostToolUse` eventを次のいずれかへ分類する。

| 分類 | 意味 | `selector_reliable` |
| --- | --- | --- |
| `canonical_skill` | bounded direct readerが6 canonical `SKILL.md`の一つを読むと一意に判定できる | `true` |
| `safe_no_read` | canonical Skill direct readではないとcommand全体から安全に判定できる | `true` |
| `unreliable` | preview欠落、truncated、malformed、compoundの未承認shape、path/scope曖昧性がある | `false` |

`safe_no_read`は「filesystem readが存在しない」という意味ではない。今回のcompoundは`package.json`を読むが、canonical Skill direct readではないことが固定shapeから証明できる、という意味である。

### 4.2 実測compoundの許可境界

次だけを`safe_no_read`へ追加する。

- previewが完全で`truncated=false`
- `tool_name=Bash`、inputが`command: string`
- readerが一つだけで`Get-Content`
- `-Raw -LiteralPath`の順序と、実測した固定相対path`.\package.json`
- pipeline右辺が固定の`ConvertFrom-Json`
- semicolon後が固定の`$pkg.name`
- canonical Skill path、別path、追加reader、追加operator、command substitution、variable pathがない
- command全体をanchoredなbounded shapeとして認識できる

一つでも満たせない場合は`unreliable`とする。一般のPowerShell token evaluator、pipe/semicolon parser、variable interpolation、property evaluationは作らない。

### 4.3 Observation / lifecycle / comparison

- first trusted canonical readの`initial_skill`、`observed_skills=[initial_skill]`、candidate prefix契約は維持する。
- trusted absenceは、`turn.completed`、Hook correlation / parse、全対象eventのreliable判定、canonical read 0件だけで成立する。
- candidate後のlater Skill setはPR2 Resultへ保存しない。PR6の責務とする。
- process lifecycle `completed`、`turn_failed`、`timed_out`、`spawn_failed`、`signaled`、`unknown`の6値、固定優先順位、`summary.by_process_lifecycle`を変更しない。
- trusted positive後のtimeout / `turn.failed` / `signaled`でrouting outcomeを上書きしない。
- dataset schema 1、Result schema 2、dataset fingerprint、case ID set、`split=all`、Codex version exact matchを比較前提として維持する。

## 5. Routing Target preflightの責務分離

次の表を、実装RunとQualification Runの正本preflightとして使う。「現在保証できているか」は今回の開始状態と現行code・既存手順の確認結果であり、実装後のPASSを先取りしない。

| Target条件 | 現在の保証場所 | 自動/手動 | 現在保証できているか | 今回変更が必要か |
| --- | --- | --- | --- | --- |
| Evaluator rootとTarget rootが別 | `assertTargetPreflight`のrealpath比較 | 自動 | できている | 変更不要 |
| realpath上の相互containmentなし | `assertTargetPreflight`の`isSameOrDescendant` | 自動 | できている | 変更不要 |
| Git common-dir非共有 | `assertTargetPreflight`の`rev-parse --git-common-dir`比較 | 自動 | できている | 変更不要 |
| Git objects alternatesなし/空 | `assertTargetPreflight`の`rev-parse --git-path objects/info/alternates` | 自動 | できている | 変更不要 |
| detached HEAD | 既存Target作成後の`git symbolic-ref -q HEAD`確認のみ。runner強制なし | 手動のみ | 実測Targetでは確認済みだが自動保証なし | `assertTargetPreflight`へ`git rev-parse --abbrev-ref HEAD === HEAD`の強制とtestを追加 |
| Target clean | `assertTargetPreflight`の`git status --porcelain --untracked-files=all` | 自動 | できている | 変更不要。ただしRun-only変更を除外するEvaluator側status testを維持 |
| 期待routing source SHA | runnerはTarget HEADを記録するだけ。RunではTarget作成時SHAを記録 | Run手順＋Result再確認 | 実値記録はできているが一致の自動保証なし | 新CLI optionは追加せず、Qualification開始前に`git -C <TARGET_ROOT> rev-parse HEAD`とRun記載の期待SHAを明示比較し、Result provenanceで再確認 |
| Trigger dataset不存在 | `assertTargetHasNoTriggerDataset`が`.agents/skills/<skill>/evals/trigger`を6 Skill分検査 | 自動 | できている | 変更不要 |
| answer key不存在 | 独立answer key fileはない。answer key相当は6 Skill配下の`.agents/skills/<skill>/evals/trigger/{train,validation}.yaml`と各`expected_skill` | Target作成後の具体path確認＋runner | 直近Targetでは不存在を確認 | 6 trigger directoryの既存検査を維持し、Run手順で12 YAML pathがないことを記録 |
| Evaluator Run Artifact不存在 | Targetは`git clone --no-local --single-branch`で作成。Evaluatorの`.codex/runs/**`や`.artifacts/trigger-eval-*`はTarget外 | Target作成時手動 | 直近Targetでは漏洩なし | generic `.codex/runs` / `.artifacts`禁止は追加しない。Target内の`.codex/runs/**/trigger-eval*.json`と`.artifacts/trigger-eval-*`だけを具体pathで確認 |
| 6 canonical `SKILL.md` readable | `assertKnownSkillsReadable`と`.agents/skills/<skill>/SKILL.md` | 自動 | できている | 変更不要 |
| 他Codex processが同じTargetを使用していない | 既存の専用監視helperはない | Qualification開始前の手動 | 直近Runでは開始前に確認した | `Get-CimInstance Win32_Process`でTarget pathをcommand lineに含むCodex processが0件であることを開始前・case群切替前に確認。monitoring serviceは追加しない |
| Evaluator source clean（Run artifact除外） | `sourceStatusOutsideRunArtifacts` | 自動 | できているがporcelain先頭空白の回帰を要確認 | Run-only変更を許可し、source変更を拒否する既存契約をtestで固定。必要な場合の修正は同runner内の最小範囲 |
| outputがTarget外 | `assertOutputOutsideTarget` | 自動 | できている | 変更不要 |

### 5.1 Target作成手順

実装Runでは、Evaluatorと異なる親directoryに次の順でfresh Targetを作る。実際の絶対pathはRun Artifactへ書かず、`<TARGET_ROOT>` tokenで記録する。

1. `git clone --no-local --single-branch <repository-url> <TARGET_ROOT>`
2. `git -C <TARGET_ROOT> checkout --detach <ROUTING_SHA>`
3. `git -C <TARGET_ROOT> status --porcelain --untracked-files=all`が空であることを確認する。
4. `git -C <TARGET_ROOT> symbolic-ref -q HEAD`が空であることを確認する。
5. `git -C <TARGET_ROOT> rev-parse HEAD`がRunに記載した期待`<ROUTING_SHA>`と一致することを確認する。
6. realpath、common-dir、alternates、6 Skill readable、12 trigger YAML、Target内のnamed evaluator artifactを確認する。
7. `Get-CimInstance Win32_Process`でTarget pathを含むCodex processがないことを確認してからQualificationを開始する。

TargetをQualification後にre-clone、checkout変更、reset、交換した場合は、同じRunのcanonicalへ進まずQualificationを無効化する。

### 5.2 期待routing SHAの責任箇所

期待SHAは新しいCLI optionや設定frameworkではなく、RunのTarget準備checkpointが責任を持つ。runnerの`routing_source_git_sha`は実測provenanceとして保存し、Qualification positive/negativeの前、canonical `all`の前、Result検査時の3回でRun記載の期待SHAと一致確認する。不一致は即座にRun invalidとし、retryやTarget交換で埋めない。

## 6. 影響範囲

### 6.1 実装対象

- `scripts/evals/run-skill-trigger-evals.ts`
  - 実測compoundのexact-shape bounded recognizer
  - detached HEAD preflight
  - 必要な場合のみEvaluator status parserのRun-only変更回帰を保つ最小修正
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - selector decision table、absence、preflight contractの回帰
  - `docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md`
  - 実装完了時に、今回のexact-shape選択、detached / SHA責務、raw evidence境界を追補

### 6.2 変更しない対象

- `scripts/evals/skill-trigger-evals.ts`（Result schema 2、lifecycle、comparisonは既存実装を維持）
- 12 dataset YAML、schema 1、query、`expected_skill`、boundary、case ID、fingerprint
- `.agents/skills/**/SKILL.md`、Skill description、`AGENTS.md`
- `.codex/hooks/**`、Hook launcher、Hook timeout
- `CASE_TIMEOUT_MS = 327_000`
- generic PowerShell parser、structured evidence adapter、provider / strategy / factory
- retry、parallel runner、adaptive timeout、quiet-window、別Target交換
- 過去Plan、過去Run、old invalid artifactの書換え・削除・migration

## 7. 実行タスク

### Phase A: 実装前の固定

1. 実装Run開始時にbranch、PR head、Evaluator SHA、Codex version、dataset fingerprint、raw evidence pathを記録する。
2. exact command fixtureと近接拒否caseを、今回のraw evidenceから固定する。
3. preflight tableの自動/手動責務と期待routing SHAをRunのチェックリストへ落とす。

### Phase B: bounded selector / preflight実装

1. 現行selectorのcanonical direct-readとsafe commandの契約を壊さず、実測compoundだけを追加する。
2. detached HEADを`assertTargetPreflight`で強制する。
3. Run-only status変更を許可しつつsource変更を拒否する既存preflight契約を回帰テストで固定する。
4. `skill-trigger-evals.ts`、dataset、query、Skill、Hook、timeoutへ差分がないことを確認する。

### Phase C: 静的検証

1. selector focused testを先に実行する。FAIL時はfirst anomalyを分類し、同一仮説なしの再試行をしない。
2. `pnpm run eval:skills:trigger:validate`、`pnpm run validate:skills`、`pnpm run lint:markdown`、selected Prettier、`git diff --check`を順に実行する。
3. `pnpm run verify`を実行し、全gate PASSまで安全な最小修正と関連gate再実行を行う。

### Phase D: Runtime Qualification / canonical

1. Phase Cが全PASSしてからfresh Targetを一つ作り、preflight table全行を埋める。
2. 同一Target・同一Codex version・同一Evaluator SHA・同一routing SHA・同一dataset fingerprintのまま、negative queryを1回実行する。
3. negativeが`turn.completed`、Hook correlation / parse、exact compound `safe_no_read`、`selector_reliable=true`、`initial_skill=null`、`observed_skills=[]`となった場合のみ、positive queryを1回実行する。
4. positiveはcanonical direct readのcandidate prefixを観測できればrouting evidenceをPASSとする。process lifecycleは別集計し、terminal durationをrouting PASS条件にしない。
5. positive / negativeのどちらかがFAIL、unreliable、Target状態不一致、SHA不一致の場合はcanonical `all`を開始せず、Runをblockedとして保存する。
6. 両方PASSした場合だけ、同じTargetでcanonical `all`を24 cases sequential、retryなし、途中case再実行なしで最初から一度実行する。
7. canonical結果はResult schema 2、24 cases、4 boundary × 2 sideの8/8 observable、provenance一致、`summary.by_outcome` / `by_process_lifecycle`、完全なoutputを確認する。

## 8. 必須tests

### 8.1 Selector decision table

| Fixture | 期待分類 |
| --- | --- |
| 実測そのもの: `$pkg = Get-Content -Raw -LiteralPath .\package.json` と `ConvertFrom-Json; $pkg.name` の固定compound | `safe_no_read` / reliable / `skill=null` |
| `Get-Content -Raw -LiteralPath .\package.json` の後へ `ConvertFrom-Json; Get-Content .agents/skills/feature-plan/SKILL.md` を追加 | `unreliable`。compound内canonical readをsafeへしない |
| 実測shape + arbitrary suffix | `unreliable` |
| variable pathを使う`Get-Content` compound | `unreliable` |
| pathを`.\other.json`またはcanonical Skill pathへ差し替え | `unreliable`。未承認compoundのpath差替えをsafeへしない |
| pipe、semicolon、variableを含む別shape | `unreliable` |
| `truncated=true` | `unreliable` |
| malformed `tool_input_preview` | `unreliable` |
| 既存の4 direct canonical read shape | canonical Skillとして既存contractどおり |
| 非Bashの既知safe shape / unknown shape | 既存contractどおり。tool名だけでsafeにしない |

### 8.2 Observation / regression

- exact compoundのみのtrusted negative: `initial_skill=null`、`observed_skills=[]`、absence成立。
- exact compoundの前にunreliable event: absence不成立、`observed_skills=null`。
- canonical candidate前のunreliable: positive不成立。
- canonical candidate後のmalformed / truncated: initial positiveを上書きしない。
- process lifecycleがtimeout / `turn.failed` / `signaled`でもtrusted positive routing outcomeを消さない。
- existing canonical / safe no-read / search scope regressionを再実行する。

### 8.3 Preflight regression

- attached branchのTargetをpreflightへ渡すとfailする。
- detached HEADはpassする。
- Evaluator / Targetのrealpath containment、common-dir共有、non-empty alternates、dirty Target、missing Skill、Trigger dataset存在をそれぞれfailする既存contractを維持する。
- Run-only変更はEvaluator status guardで許可し、source変更は拒否する。
- Target内のnamed Trigger dataset / evaluator result pathだけを禁止し、generic `.codex/runs` / `.artifacts`全体は禁止しない。
- 期待routing SHAの不一致はRun preflightで拒否し、Result provenanceのactual SHAだけを記録してPASSへしない。

## 9. Validation plan / 成功判定

### 9.1 Static gate

実装後は次の順で検証する。

```text
pnpm exec vitest run tests/repository-contract/skill-trigger-evals.test.ts --no-file-parallelism --maxWorkers=1
pnpm run eval:skills:trigger:validate
pnpm run validate:skills
pnpm run lint:markdown
pnpm exec prettier --check <changed-files>
git diff --check
pnpm run verify
```

上流FAIL時は後続runtimeを開始しない。FAILのfirst anomaly、今回diff、baseline、shared dependency、実行環境を分離して記録し、安全な最小修正だけを行う。

### 9.2 Runtime gate

Environment Qualification PASSの必要条件:

- preflight table全行がPASS、または指定責務で明示確認済み
- negative / positiveが同一Target、同一Codex、同一SHA条件で実行される
- negative exact compoundが`safe_no_read`、absence成立
- positive first canonical readがtrusted candidateとして成立
- Hook correlation / parse、Target clean、expected routing SHAが一致

canonical valid baselineの必要条件:

- Qualification PASS後に24 casesを一度だけ完走
- Result schema 2、dataset fingerprint、case ID set、split、Codex versionが比較前提と一致
- 8/8 sideに最低1件のobservable caseがある
- output全体をparseでき、provenanceがQualificationから変化していない
- retry、query tuning、unobservable-only補完、Target交換がない

## 10. リスク / rollback / 停止条件

### 10.1 リスク

- exact-shapeを広げすぎると、canonical Skill readを含むcompoundをfalse absenceへ分類する。
- exact-shapeが狭すぎると、Hostの同じ目的の空白差だけでもunreliableとなる。
- manual SHA確認を省略すると、別Target revisionを同一baselineと誤認する。
- positive candidate後の長時間processをterminal Gateで失敗扱いすると、routingとtask completionを再び混同する。
- Target内のevaluator artifactを一般的に禁止しすぎると、既存Hook snapshotやruntimeログとの責務が混ざる。

### 10.2 rollback / invalidation

- 実装差分はselector/preflight/test/ADRの同一commit範囲に限定し、問題があればそのcommitをrevert可能にする。
- 過去Run、old invalid artifact、既存Planは変更・削除しない。
- selectorが一つでも安全性を証明できない場合は`unreliable`へ戻し、Qualification FAILとしてcanonicalを停止する。
- detached、expected SHA、Target clean、Hook correlation、provenanceのいずれかが不一致ならResultをvalid baselineへ昇格しない。
- 同じ工程の無目的な再試行、同一error 2回連続、同工程3回失敗、新情報なしの再実行は停止し、仮説を更新する。

## 11. PR2 / PR6境界と非目標

- PR2: single-intent queryのinitial Skill routing evidence proxyだけを測定する。
- PR2: first trusted canonical read、trusted absence、routing outcome、process lifecycleを分離して保存する。
- PR6: later Skill、Skill chain、multi-Skill workflow、workflow全体のtask completionを扱う。今回のResultへ追加しない。
- `safe_no_read`はcanonical Skill direct read不存在の証明であり、OS全read不存在の証明ではない。
- queryを実行方法へ誘導する文言へ変更しない。
- Codex version、timeout、Hook、Skill description、datasetをblocker解消のために変更しない。

## 12. 成果物 / 完了後のRun記録

### 12.1 今回作成する成果物

- `docs/plans/2026-09-10_073717_issue-117-pr2-qualification-blocker-remediation.md`
- `.codex/runs/20260910-073717-JST/PLAN.md`
- `.codex/runs/20260910-073717-JST/TASKS.md`
- `.codex/runs/20260910-073717-JST/REPORT.md`
- machine-managed `.codex/runs/20260910-073717-JST/run.json`

### 12.2 実装後に別Runで更新する成果物

- `scripts/evals/run-skill-trigger-evals.ts`
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - `docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md`
- 実装RunのResult / `evaluation.json` / sanitizer / collector

raw stdout、stderr、Hook JSONL、process logは`.artifacts/`へ保存し、Run Artifactには相対pathと意味要約だけを残す。Run Artifactはsanitizer Write/Check後にstrict collectorで更新する。

## 13. Open questions / assumptions

- 必ず質問する不透明点: なし。案A、preflight責務、Qualification停止条件、実装対象、validation順は本Planで固定した。
- 仮定してよい細部: exact-shape内の空白許可範囲は既存tokenizerの最小表現に合わせ、test fixtureで固定する。新たなshapeはEvidenceなしでは許可しない。
- 未回答の重要質問: なし。future Host shapeが必要になった場合は、追加raw evidenceを取得した別Planで扱う。

## 14. 実装者セルフレビュー

- [ ] raw command全文を省略形へ置換していない
- [ ] pipe / semicolon / variable一般を許可していない
- [ ] canonical Skill pathを含むcompoundをsafeへしていない
- [ ] arbitrary suffix、追加reader、path差替えを拒否している
- [ ] truncated / malformedをreliableへしていない
- [ ] safe_no_readの意味をcanonical Skill direct read不存在へ限定している
- [ ] trusted absenceのterminal / correlation / parse / all-event reliabilityを維持している
- [ ] candidate後のlater SkillをPR2へ保存していない
- [ ] process lifecycleとrouting outcomeを混同していない
- [ ] Result schema 2とdataset schema 1を混同していない
- [ ] detached HEADを自動preflightで強制している
- [ ] 期待routing SHAを実値記録だけでPASSへしていない
- [ ] answer key相当の12 YAML pathを具体化している
- [ ] generic `.codex/runs` / `.artifacts`禁止を追加していない
- [ ] 他Codex processはmanual preflightで確認し、monitoring serviceを追加していない
- [ ] 同一TargetをQualificationからcanonicalまで再利用している
- [ ] 8/8 side未達をvalid baselineへ昇格していない
- [ ] no retry / no query tuning / no timeout変更を守っている
- [ ] old Plan / old Run / old artifactを上書きしていない
- [ ] Plan-onlyの今回Runで実装・Probe・Qualification・canonicalを実行していない
