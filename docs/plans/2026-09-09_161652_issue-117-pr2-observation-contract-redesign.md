# Issue #117 PR2 Trigger Eval observation / evaluation contract 再設計計画

> Status: レビュー指示反映済みの実装前Plan（今回の作業では実装・Probe・canonical `all`を行わない）
>
> 対象: PR #127 / branch `refactor/117-pr2-trigger-eval-baseline`
>
> 本Planを、実装時のobservation / evaluation contractの正本とする。過去Planへ最新仕様を逆流させない。

## 0. 依頼概要

### 0.1 目的

Issue #117 PR2「Trigger Eval baseline」について、Skill description変更前後のrouting性能を比較できる観測・評価契約を再設計する。PR2が測定する対象をsingle-intent queryの**initial Skill routing**に限定し、Skill read evidence、routing outcome、process lifecycle、task completionを混同しない。

今回の作業は、既存Planの契約上の曖昧さをなくすことだけを目的とする。実装はこのPlanの承認後の別Runで行う。

### 0.2 背景

最新のEnvironment Qualificationでは、negative controlは`turn.completed`に到達しcanonical Skill readなしを確認できた。一方、positive controlでは`feature-plan/SKILL.md`の実readがterminalより前に発生したが、現行runnerはtimeout / process状態を先に判定し、selectorも実際のcommand shapeを受理しなかった。

保存済みProbeの実際のpositive commandは次の形である。

```text
Get-Content -Raw .agents/skills/feature-plan/SKILL.md
```

直近Qualificationで確認された別の形は次のとおりである。

```text
Get-Content -LiteralPath '.agents\skills\feature-plan\SKILL.md' -Raw
```

保存済みTrigger Eval Probeには、canonical read commandに`;` suffixが付いた実測はない。Repository内の他の`;`は文書調査・一般commandの記録であり、Trigger Eval selectorの根拠にはしない。

### 0.3 今回の成果物

- 本Planの修正版
- 修正理由・調査事実・検証結果を記録するactive Run Artifact
- PR #127本文のEnvironment Qualification FAIL、canonical未実行、valid baseline未取得を維持したPlan状況

以下は今回実施しない。

- `scripts/evals/skill-trigger-evals.ts`、`scripts/evals/run-skill-trigger-evals.ts`、selector、scoringの実装変更
- tests、dataset YAML、query、`expected_skill`、boundary、case ID、Skill descriptionの変更
- `.codex/hooks/**`、`AGENTS.md`、`CASE_TIMEOUT_MS`、Product code / testsの変更
- Observation Probe、canonical `all`、case retry、dataset変更、PR merge

## 1. ゴール / 完了条件

### 1.1 PR2 / PR6の責務

PR2はsingle-intent queryに対するinitial Skill routingだけを測定する。first trusted canonical readは、Hostにrouting decision eventがない現状での**initial routing evidence proxy**であり、model internal selectionの直接証明とは呼ばない。

PR6はmulti-Skill workflow、Skill chain、後続Skill invocation、workflow全体の成功・失敗を扱う。これらをPR2 Resultへ追加しない。

### 1.2 設計Planの完了条件

- Candidate C（Hybrid observation contract）を維持し、positive presenceとabsenceの終了条件を分離する。
- 各対象Hook eventを`canonical Skill read`、`safe no-read`、`unreliable`の3状態へ分類する契約を定義する。
- `selector_reliable=true`を「canonical Skill direct readか、そうでないと安全に判定できた」の意味へ固定する。
- `initial_skill`と`observed_skills`をinitial routingだけの情報へ簡素化し、後続Skillを保存・評価しない。
- dataset schema 1とResult schema 2を分離し、旧Result schema 1をcomparisonで拒否する。
- `summary.by_process_lifecycle`を確定し、routing outcomeとprocess lifecycleを別集計する。
- 旧terminal Gateを新contractから削除し、`CASE_TIMEOUT_MS = 327_000`をprocess safety capとして維持する。
- Qualificationとcanonical `all`で同一のfresh independent Routing Targetを再利用する条件を固定する。
- selector grammar、comparison、tests、実装対象file、canonical preconditions、rollback、scope guard、16項目の自己レビューを確定する。

### 1.3 将来実装後のDoD

これは今回達成しない別実装Runの完了条件である。

- Resultの`schema_version`が2であり、datasetの`schema_version`は1のまま維持される。
- trusted initial Skill readは`initial_skill=<first Skill>`、`observed_skills=[<first Skill>]`として保存される。
- trusted absenceは`initial_skill=null`、`observed_skills=[]`として保存される。
- routing observation不成立は`initial_skill=null`、`observed_skills=null`、`outcome=unobservable`となる。
- trusted positive後のtimeout / process failureでrouting outcomeを消さない。
- absenceはtrusted `turn.completed`、Hook correlation / parse、全対象eventのreliable判定、canonical read 0件がそろった場合だけ確定する。
- `summary.by_outcome`と`summary.by_process_lifecycle`が別々に存在する。
- `split=all`、dataset fingerprint一致、case ID set一致、Result schema 2、Codex version一致のcomparisonだけを受理する。
- canonical `all`は4 boundary × 2 expected side = 8 sideを各1 observable case以上で満たす。

## 2. 現状理解と証拠

### 2.1 Repository / PR状態

作業開始時に次を実行した。

```text
git status --short
git branch --show-current
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

確認結果:

- branch: `refactor/117-pr2-trigger-eval-baseline`
- working tree: clean
- HEAD: `c458cc6610344d580676a0813f178e9c6993dad2`
- `origin/main`: `f7cc237d8ca719646d9654fba2129732b6eab457`
- PR #127: `OPEN`、base `main`、head branch一致、head SHAはHEADと一致
- PR本文: Environment Qualification `FAIL`、canonical `all`未実行、valid baseline未取得、Plan pathを保持

今回の修正Runは`.codex/runs/20260909-192202-JST/`で管理する。

### 2.2 実測Environment Qualification

既存Run `.codex/runs/20260908-004640-JST/`の事実を履歴として保持する。

| Control | terminal | Skill read | 現行selector | 旧Qualification判定 |
|---|---|---|---|---|
| negative | `turn.completed`、59.1266秒 | なし | `[]` | PASS |
| positive | `turn.completed`、367.7009秒 | `feature-plan/SKILL.md`をterminal前にread | `[]` | FAIL |

positiveのactual commandは`Get-Content -LiteralPath '.agents\\\\skills\\\\feature-plan\\\\SKILL.md' -Raw`であり、現行selectorのaccepted shape外だった。Hook correlation / parseはPASSしたが、旧Qualificationのpositive terminal GateはFAILし、canonical `all`は実行されていない。

旧Qualificationのterminal duration gateは過去RunがFAILした事実としてのみ保持し、新contractのthreshold、comparison条件、Qualification PASS条件へ継承しない。

### 2.3 現行evaluatorの主経路

現行コードを確認した結果、主経路は次のとおりである。

```text
Codex childを1 caseずつsequential実行
  -> before / afterでTargetのHook fileをsnapshot
  -> exactly one append deltaをcollect
  -> JSONLをparse
  -> canonicalSkillForCommandでSkill readを判定
  -> observed_skillsのdistinct setを作る
  -> deriveRoutingObservation
  -> set-based scoreRouting
  -> resultを書き出す
```

現行の具体的な利用箇所:

- `scripts/evals/skill-trigger-evals.ts`
  - `DATASET_SCHEMA_VERSION = 1`
  - `TriggerDatasetBundle`、`ObservationSignals`、`CaseResult`、`RunSummary`
  - `deriveRoutingObservation`、`scoreRouting`、`evaluateCase`、`summarizeCaseResults`、`evaluateRunCoverage`
  - `ComparableRun`、`compareRuns`
- `scripts/evals/run-skill-trigger-evals.ts`
  - `CASE_TIMEOUT_MS = 327_000`
  - `assertTargetPreflight`
  - `snapshotHookFiles`、`collectHookDelta`、`parseHookEvents`
  - `canonicalSkillForCommand`、`canonicalSkillForHookEvent`、`selectObservedSkills`
  - `parseComparableRun`、`EvaluationResult`、live result生成
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - selector、dataset、observation、coverage、comparisonの現行contract test

現行`deriveRoutingObservation`はtimeout、process failure、terminal欠落、Hook failure、selector failureを先に処理する。現行`selectObservedSkills`は、対象のpreviewが正常でも「canonical Skillでないcommand」を明示的なsafe no-readとして返さず、全canonical readのsetを収集する。これが今回修正する直接の原因である。

### 2.4 Hook envelopeとcorrelation

`.codex/hooks/log_event.mjs`と`.codex/config.toml`を確認した。現行PostToolUse recordは、`event`、`timestamp`、`session_id`、optional `turn_id`、`tool_name`、`tool_use_id`、`tool_input_preview`（JSON文字列）、`truncated`を持つ。canonical pathをtyped fieldで持つrecordはない。

現行runnerは、次の既存経路でcaseのHook deltaを一意にする。

- 1 case = 1 Codex child process
- case間はsequential
- dedicated Targetを使用
- 実行前後に`.codex/logs`と`.artifacts/codex-hooks`をsnapshot
- exactly one append delta、before-size以降のみをparse
- 0 / 複数 / size縮小 / non-appendはcorrelation failure

この既存経路で現在の1 case単位の一意性を確保できるため、新しい`correlation framework`、session manager、turn manager、generic event busは追加しない。既存のappend delta / process境界を再利用する。

### 2.5 schema / validator / fixtureの調査結果

Repository内を`schema_version`、`DATASET_SCHEMA_VERSION`、`ComparableRun`、`compareRuns`、result validator、fixture、Run Artifact validatorで検索した結果は次のとおりである。

| 対象 | 現在の実体 | 今回の扱い |
|---|---|---|
| Trigger Eval dataset | `scripts/evals/skill-trigger-evals.ts`の`DATASET_SCHEMA_VERSION=1`、12 YAMLの`schema_version: 1` | 1を維持。YAMLは変更しない |
| Trigger Eval Result | `scripts/evals/run-skill-trigger-evals.ts`の`EvaluationResult`が現在dataset定数を使用 | `RESULT_SCHEMA_VERSION=2`へ分離 |
| comparison input | `scripts/evals/run-skill-trigger-evals.ts`の`parseComparableRun` | Result schema 2だけを受理し、schema 1 / unknownを拒否 |
| comparison core | `scripts/evals/skill-trigger-evals.ts`の`ComparableRun` / `compareRuns` | schema 2、split、fingerprint、case ID、Codex versionをfail-close検証 |
| Trigger Result専用JSON schema | 独立したschema fileは存在しない | 新規schema fileは作らず、既存TypeScript result/parserとcontract testを更新 |
| Generic Run evaluation | `.codex/templates/evaluation.schema.json`（schema 1）、`scripts/validate-output-schema.py` | Codex `evaluation.json`用。Trigger Result schemaとは分離し、変更しない |
| Run manifest | `.codex/templates/RUN_MANIFEST.json`（schema 2）、`scripts/collect-run-artifacts.py` / `.ps1` | Run manifest用。変更しない |
| Run manifest tests | `tests/contracts/codex-run-manifest-contract.test.ts`、`tests/contracts/codex-safe-run-manifest-sync.test.ts` | 変更しない |
| Trigger Result fixture | 専用fixture fileは存在せず、既存testの`comparableRun` helperがinline生成 | 既存`tests/repository-contract/skill-trigger-evals.test.ts`のinline fixtureをschema 2へ更新。旧artifactは変更しない |

過去のTrigger Result artifact（`.codex/runs/20260906-191724-JST/trigger-eval-baseline*.json`等）は履歴証拠であり、generic `evaluation.json`とは別物である。変換、移行、後付けmarkerは行わない。

### 2.6 過去canonical evidence

`.codex/runs/20260906-191724-JST/`には旧contractおよびfresh remediationのinvalid evidenceがある。旧artifactは`pass=1`、`false_negative=1`、`unobservable=22`、fresh remediationは24/24完了、`pass=2`、`false_negative=2`、`unobservable=20`、observable `4/24`、8 side `3/8`だった。これらは履歴として保持し、新Result schema 2のbaselineへ昇格させない。

保存済みTarget Hook evidenceでは、canonical readなし2 case、1回20 case、同一Skillの重複2 case、異なるSkill chain 0 caseだった。これはfirst read proxyの設計根拠にはなるが、internal selectionの証明ではない。

## 3. Current contractの問題

### 3.1 selector non-matchと判定不能を区別していない

`git status`、`Get-Content package.json`、`pnpm run test`のようにcanonical Skill direct readではないことを安全に判定できるcommandは、selector failureではない。現行実装はcanonical positive grammarに一致しないものを一括で処理し、absenceの信頼性を曖昧にする。

一方、truncated preview、malformed JSON、ambiguous multiple command、unbalanced quote、対象commandを一意に取得できない複雑なPowerShellは安全に分類できない。これだけを`unreliable`としてabsence判定を禁止する。

### 3.2 positive evidenceとabsence evidenceを混同している

trusted canonical readは、そのreadとprefixが信頼できればterminal完了を待たずにinitial routing proxyを確定できる。「まだreadがない」は実行途中ではabsenceではないため、trusted `turn.completed`と全対象eventのreliable分類まで待たなければならない。

### 3.3 final Skill setをPR2へ持ち込んでいる

現行の`observed_skills`は全canonical readのdistinct setだが、PR2の対象はinitial routingである。後続Hookが壊れた場合に全setを得たとは言えず、first candidate後のrouting保持と両立しない。PR2ではinitial Skill一件だけをResultへ残す。

### 3.4 dataset schemaとResult schemaを同じversionで表している

現行のdataset定数がlive Resultと`ComparableRun` comparisonにも使われている。`initial_skill`、`process_lifecycle`、`observed_skills`の意味、routing outcome判定が変わるため、dataset schema 1を維持したままResult schema 2を導入する必要がある。

### 3.5 lifecycleとrouting outcomeを混ぜている

timeout、`turn.failed`、spawn failureはprocessの状態であり、trusted initial Skill readのrouting classificationではない。`outcome=pass`かつ`process_lifecycle=timed_out`は矛盾ではなく、「initial routing proxyはexpectedだったがprocessはtimeoutした」を表す。

## 4. 評価候補の比較

### Candidate A: terminal-bound contract

- 概要: terminalまたはtimeoutまで待って最後のSkill setをscoreする。
- 長所: terminal後のabsenceを扱いやすく、現行schemaとの差分が小さい。
- 短所: task execution latencyをrouting validityへ混ぜ、trusted positive read後のtimeoutを失敗させる。
- 判定: PR2の主目的には不採用。process lifecycleの事実だけを別fieldへ残す。

### Candidate B: first canonical read contract

- 概要: first trusted canonical `SKILL.md` readをinitial routing resultとしてscoreする。
- 長所: positive presenceをterminalから分離でき、first expected / sibling / otherを区別できる。
- 短所: readなしのabsenceを途中で判定できず、単独ではfalse pass / false negativeを作る。
- 判定: presence側の原理として採用するが、単独案にはしない。

### Candidate C: Hybrid observation contract（維持・採用）

- trusted canonical Skill readあり: first trusted readをinitial routing evidence proxyとして採用し、task completion / timeoutとは独立してrouting outcomeを確定する。
- canonical Skill readなし: trusted `turn.completed`、Hook correlation / parse、全対象eventのreliable判定が成立した場合だけabsenceを確定する。
- timeout / process failure: process lifecycleへ保存し、既に確定したrouting outcomeを上書きしない。
- 判定: Issue #117 PR2の目的、現行Hookの限界、false evidence回避、最小変更のバランスが最もよい。今回もこの方針を維持する。

### Candidate D: routing phase / window contract

- 概要: routing phaseの開始・終了eventを追加し、そのphase内のreadをscoreする。
- 長所: first readより豊かなphase semanticsを表せる可能性がある。
- 短所: current Hookにphase boundaryがなく、quiet-window、state machine、event busを要求する。
- 判定: 不採用。native phase eventが将来提供されても、PR2 Resultへ導入するかは別設計とする。今回の実装scopeへ含めない。

## 5. Chosen Design: Candidate C

### 5.1 最小契約

```text
Input:
  Hook evidence + process lifecycle

Routing observation:
  first trusted canonical Skill direct read -> initial Skill
  trusted terminal completion + reliable no-read -> absence
  それ以外 -> unobservable

Routing score:
  initial Skillだけで判定

Process:
  routing scoreとは別にlifecycleを保存

Later Skill reads:
  PR2では評価・保存しない
```

`first trusted canonical SKILL.md direct read`は`initial routing evidence proxy`とだけ呼ぶ。`model internal selection`、`final Skill set`、`workflow phase`という意味をPR2 Resultへ与えない。

### 5.2 selectorの3状態

相関したHook deltaは全JSONL行を保持し、`event` / `tool_name`の境界を明示する。selectorの対象列は`PostToolUse` recordであり、そのうち`tool_name === "Bash"`をcurrent bounded command inputとして扱う。`UserPromptSubmit`、`SubagentStart`、`SubagentStop`、`Stop`はSkill read evidenceへ数えない。`PostToolUse`の`tool_name`がBash以外、欠落、または対象command fieldsが壊れている場合は、現在のbounded selectorではno-readを証明できないため`unreliable`とし、absenceを許可しない。

対象となる`PostToolUse / Bash` eventごとに、最低限次のいずれかへ分類する。

| 分類 | `selector_reliable` | Skill値 | 意味 |
|---|---:|---|---|
| `canonical_skill` | `true` | 一意なcanonical Skill | canonical Skill direct readと安全に確定 |
| `safe_no_read` | `true` | `null` | canonical Skill direct readではないと安全に確定。selector failureではない |
| `unreliable` | `false` | 判定しない | canonical Skill readの有無を安全に判定できない |

例:

- `Get-Content -Raw .agents/skills/feature-plan/SKILL.md` → `canonical_skill / true / feature-plan`
- `Get-Content package.json`、`git status`、`pnpm run test`、`Get-ChildItem src` → `safe_no_read / true / null`
- truncated `tool_input_preview`、malformed preview JSON、ambiguous multiple command、unbalanced quote、対象commandを一意に取れない複雑なPowerShell → `unreliable / false`

`selector_reliable=true`とは、対象Hook eventについて、canonical Skill direct readであるか、そうでないかを安全に判定できたことを意味する。recognizerのpositive grammarへ一致しなかっただけで`unobservable`にはしない。`safe_no_read`は正常な観測結果である。

### 5.3 initial Skillの決定

相関したeventを時系列順に見る。

1. 現行Hookの`tool_input_preview`をJSON parseし、commandを取得する。
2. 各対象eventを3状態へ分類する。非対象Hook eventはSkill read evidenceへ数えず、対象列に入れない。未知の不完全な対象eventは`unreliable`とする。
3. 最初の`canonical_skill`を見つけた場合、そのeventとprefixの全eventがreliableなら`initial_skill`を固定する。
4. first candidate後のeventはPR2のlater Skill setへ収集しない。後続eventのmalformed / truncatedで、既にtrustedなinitial routing outcomeを消さない。
5. candidateがない場合は、5.4のtrusted absence条件へ進む。

positive candidateより前のeventが`unreliable`ならpresenceは確定しない。candidate自体が`unreliable`ならSkill値を補完しない。

### 5.4 Absenceの確定

次の全条件を満たす場合だけtrusted absenceとする。

- canonical Skill readが0件
- trusted terminalが`turn.completed`
- 既存`collectHookDelta`によるHook correlationが成立
- Hook JSONLの対象eventがparseできる
- 全対象eventが`canonical_skill`または`safe_no_read`のいずれかで、`unreliable`が0件
- `observed_skills=[]`を構成できる

一件でも`unreliable`があればabsenceを確定しない。`turn.failed`、timeout、spawn failure、signal、terminal欠落はabsenceの証明にならない。したがってreadなしでもこれらは`false_negative`やexpected nullの`pass`ではなく`unobservable`となる。

### 5.5 Result fields

trusted initial Skillあり:

```json
{
  "initial_skill": "feature-plan",
  "observed_skills": ["feature-plan"]
}
```

trusted absence:

```json
{
  "initial_skill": null,
  "observed_skills": []
}
```

routing observation不成立:

```json
{
  "initial_skill": null,
  "observed_skills": null
}
```

`observed_skills`はPR2のfirst Skillまたはabsenceを表す。全canonical readのdistinct set、later Skill diagnostic set、Skill chainは保存しない。

### 5.6 Process lifecycle

`process_lifecycle`は次のenumだけを使用する。

```text
completed | turn_failed | timed_out | spawn_failed | signaled | unknown
```

現行child処理で複数の事象が同時に見える場合も、一意にするため判定優先順位を固定する。

1. timer発火 → `timed_out`
2. child spawn error → `spawn_failed`
3. childがsignal終了 → `signaled`
4. trusted terminalが`turn.failed` → `turn_failed`
5. trusted `turn.completed`かつ正常close → `completed`
6. 根拠が不足、terminal複数、または他の終了状態 → `unknown`

現行`executeCodex`が返す`timed_out`、`spawn_failed`、`signaled`、`exit_code`と、stdoutから一意に抽出した`trusted_terminal`をこの順序へ写像する。`timed_out=true`なら`timed_out`、`spawn_failed=true`なら`spawn_failed`、`signaled=true`なら`signaled`、`trusted_terminal=turn.failed`なら`turn_failed`とする。`trusted_terminal=turn.completed`、`exit_code=0`、かつ先行flagが全てfalseなら`completed`とする。terminal欠落、非zero exitだけ、`exit_code=null`、terminal複数、またはterminalとclose状態の不一致は`unknown`とする。`unknown`を将来状態の予約として増やさない。

`process_lifecycle`はscoreへ渡さない。trusted positive後にtimeout、process failure、または`unknown`が発生してもrouting outcomeを保持し、lifecycleだけを保存する。absence確定前のtimeoutは`unobservable`のままである。

### 5.7 Result schema 2

datasetとResultのversionを分離する。

- dataset: `scripts/evals/skill-trigger-evals.ts`の`DATASET_SCHEMA_VERSION = 1`を維持。12 YAMLも`schema_version: 1`のまま。
- Result: 同ファイルへ`RESULT_SCHEMA_VERSION = 2`を追加し、live `EvaluationResult`、`CaseResult`、comparison inputのResult versionとして使用する。
- 独自の`observation_contract_version`文字列は追加しない。Result schema 2が意味世代の区別を担う。

Resultの概念形:

```json
{
  "schema_version": 2,
  "provenance": {
    "evaluator_git_sha": "<EVALUATOR_SHA>",
    "routing_source_git_sha": "<ROUTING_SHA>",
    "dataset_sha256": "<DATASET_SHA256>",
    "codex_version": "codex-cli <VERSION>",
    "model": "unreported",
    "split": "all"
  },
  "cases": [
    {
      "id": "case-id",
      "initial_skill": "feature-plan",
      "observed_skills": ["feature-plan"],
      "outcome": "pass",
      "unobservable_reason": null,
      "process_lifecycle": "timed_out"
    }
  ],
  "summary": {
    "total": 1,
    "by_outcome": {
      "pass": 1,
      "false_negative": 0,
      "sibling_misroute": 0,
      "unexpected_trigger": 0,
      "unobservable": 0
    },
    "by_process_lifecycle": {
      "completed": 0,
      "turn_failed": 0,
      "timed_out": 1,
      "spawn_failed": 0,
      "signaled": 0,
      "unknown": 0
    }
  }
}
```

既存summaryの`by_owner_skill`、`by_split`、`by_boundary`は維持し、同じsummaryへ`by_process_lifecycle`を最小追加する。各caseをrouting outcomeとprocess lifecycleへ独立して一度ずつ集計し、別のnested schemaやlifecycle専用resultは作らない。`outcome=pass`かつ`process_lifecycle=timed_out`を許可する。

### 5.8 Routing score

score入力は`initial_skill`だけとする。

- expected Skillを最初にtrusted read → `pass`
- boundary siblingを最初にtrusted read → `sibling_misroute`
- boundary外Skillを最初にtrusted read → `unexpected_trigger`
- expected Skillあり、trusted absence → `false_negative`
- expected Skillがnull、trusted absence → `pass`
- expected Skillがnull、trusted Skill readあり → `unexpected_trigger`
- absence未確定またはinitial evidence未信頼 → `unobservable`

後続Skill readの有無、順序、chain、workflow successはPR2 scoreを変更しない。`feature-plan → repair-loop`のようなcaseでもPR2 Resultは`initial_skill=feature-plan`、`observed_skills=[feature-plan]`までとする。

## 6. Observation decision table

### 6.1 Routing decision

| 条件 | `initial_skill` | `observed_skills` | `outcome` |
|---|---|---|---|
| expected Skillを最初にtrusted read | expected | `[expected]` | `pass` |
| siblingを最初にtrusted read | sibling | `[sibling]` | `sibling_misroute` |
| boundary外Skillを最初にtrusted read | other | `[other]` | `unexpected_trigger` |
| expected nullでSkill read | Skill | `[Skill]` | `unexpected_trigger` |
| trusted absence + expected Skillあり | `null` | `[]` | `false_negative` |
| trusted absence + expected null | `null` | `[]` | `pass` |
| absence未確定 | `null` | `null` | `unobservable` |

後続Skillの有無はこの表へ入れない。

### 6.2 Lifecycle overlay

| routing evidence | process lifecycle | routing outcome | Resultの扱い |
|---|---|---|---|
| trusted initial Skillあり | `completed` | initial Skillに応じる | observable |
| trusted initial Skillあり | `timed_out` / `turn_failed` / `spawn_failed` / `signaled` / `unknown` | initial Skillに応じる | outcomeを保持しlifecycleだけ保存 |
| trusted absence成立前 | `timed_out` / `turn_failed` / `spawn_failed` / `signaled` / `unknown` | `unobservable` | `observed_skills=null` |
| trusted absence成立 | `completed` | expectedに応じて`false_negative`または`pass` | `observed_skills=[]` |

### 6.3 Hook evidence boundary

- candidate前のouter JSONL parse failure → `unobservable` / `hook_parse`
- candidate前のpreview JSON malformed、truncated、ambiguous command → `unobservable` / `skill_read_observation`
- candidate後のmalformed / truncated later Hook → initial routing outcome保持。later Skill情報はResultへ保存しない
- Hook correlation failure → `unobservable` / `hook_correlation`

## 7. Selector contract

### 7.1 現行実装対象

現在のHook recordにtyped path/file fieldはない。今回の実装対象は次の経路だけである。

```text
tool_input_preview
  -> JSON parse
  -> command取得
  -> bounded Get-Content direct-read判定
```

structured path/file fieldのadapter interface、provider abstraction、strategy、factoryは今回作らない。Hostが将来typed path/file fieldを提供した場合、その時点でfallbackより優先する設計を再検討するが、これは今回のscope外の注記である。

### 7.2 bounded direct-read grammar

canonical Skill direct readとして認識するのは、simpleな単一`Get-Content` invocationだけである。次の差異を許可する。

- `/`と`\`
- single quote、double quote、quoteなしの単一path token
- `-Path` / `-LiteralPath`
- `-Raw`がpathの前後にあるparameter order
- 上記の許可parameterの順序差
- 現行実測shape `Get-Content -Raw .agents/skills/<skill>/SKILL.md`
- 現行実測shape `Get-Content -LiteralPath '.agents\skills\<skill>\SKILL.md' -Raw`

pathはcanonical relative pathへ正規化し、6つのcanonical Skillと`SKILL.md`へ一意に解決できる場合だけ`canonical_skill`とする。単純な相対`Get-Content`が既知の非canonical file（`package.json`、docs、non-`SKILL.md`、directory）または6つに含まれない明示的なunknown Skillを指す場合は`safe_no_read`とする。外部absolute path、別repository path、canonical pathとの対応を安全に解決できないpathは`unreliable`とする。

`;` suffixを含むcompound commandは実測根拠がないため許可しない。pipe、redirection、variable interpolation、command substitution、loop、script block、複数command、複数path、任意のPowerShell scriptはbounded grammar外であり、read有無が安全に除外できない場合は`unreliable`とする。

### 7.3 safe no-read

次はcanonical Skill direct readではないことを安全に確定できるため、`safe_no_read / reliable`とする。

- `Get-Content package.json`
- `Get-Content docs/PROJECT_CONTEXT.md`
- `git status`
- `pnpm run test`
- `Get-ChildItem`
- `Select-String ...`
- `rg ...`
- `grep ...`
- `echo ...`
- `Write-Output ...`
- unknown Skill path
- non-`SKILL.md`
- directory read

これらをselector failure、`unobservable`、absence禁止の理由にしない。

### 7.4 unreliable

次は`unreliable / selector_reliable=false`とし、canonical read 0件をabsenceの根拠にしない。

- truncated `tool_input_preview`
- outer Hook JSONLのmalformed line（`hook_parse`）
- `tool_input_preview`のmalformed JSON
- command field欠落または非文字列
- ambiguous multiple command / multiple path
- unbalanced quote
- canonical pathを含むが意味解析できないcomplex PowerShell
- command自体を一意に取得できない入力

`safe no-read`と`unreliable`を、単なるpositive grammarのmatch / non-matchで決めない。commandの意味境界を安全に確認できるかで決める。

## 8. Comparison contract

### 8.1 必須条件

PR3のbaseline/current比較は次の全条件を満たす場合だけ実行する。

```text
current.schema_version === RESULT_SCHEMA_VERSION (2)
baseline.schema_version === RESULT_SCHEMA_VERSION (2)
current.provenance.split === "all"
baseline.provenance.split === "all"
dataset fingerprint一致
case ID set一致
Codex version完全一致
```

Result schema 1の旧artifact、unknown future schema、schema field欠落はcomparison境界でfail closedする。schema 1をResult schema 2へ変換したり、後付けmarkerを付けたり、old artifactを移行して比較可能にしたりしない。

dataset fingerprintはdataset schema 1の現在YAMLから計算する。dataset YAML、query、`expected_skill`、boundary、case IDの変更は今回も行わない。

### 8.2 Codex version

Codex versionは表示だけではなく、PR3 baseline/current comparisonのpreconditionとする。description変更とHost / model runtime変更を分離するため、comparison対象Runの`provenance.codex_version`は完全一致しなければ拒否する。不一致時は`ComparisonResult`を生成せず、comparison parser / runnerがエラー終了する。既存の`codex_version_match`を残す場合も、受理されたcomparisonでは`true`だけを返し、不一致を結果として返さない。

現行Resultの`model`は既存どおり`unreported`であり、信頼できるmodel identityとして比較キーに追加しない。これは現在Hostが提供するprovenanceの限界として記録する。Codex version一致を必須にする判断は実装時へ残さない。

### 8.3 Provenance

Resultには次を保存する。

- evaluator source SHA
- routing source SHA
- dataset fingerprint
- Codex version
- executed timestamp
- split

独自の`observation_contract_version`は保存しない。Result schema 2と上記comparison条件が旧Resultとの意味差を表す。

## 9. 8-side validity / PR2とPR6

### 9.1 8-side validity

8 boundary-side validityは維持する。

- `exploratory-qa-vs-android-native-local-validation`: 2 side
- `code-review-vs-repair-loop`: 2 side
- `repair-loop-vs-harness-improvement`: 2 side
- `feature-plan-vs-direct-implementation`: `feature-plan` sideとnull side

`pass`だけでなく、`false_negative`、`sibling_misroute`、`unexpected_trigger`もrouting observationが成立していればobservableとして数える。trusted positive + `process_lifecycle=timed_out`もobservableである。absence確定前のtimeout、unreliable selector、Hook failureはobservableではない。

現行`evaluateRunCoverage`の`all`で8 sideすべてに最低1 observable caseを要求する契約を維持する。routing精度を良く見せるためside条件を減らさない。

### 9.2 PR2で保存する情報

保存・判定するSkill情報は次だけである。

- `initial_skill`

保存・判定しないもの:

- later Skill chain
- Skill transition
- multi-Skill workflow
- 後続Skill順序
- workflow success / failure
- final distinct Skill set

### 9.3 PR6へ渡す情報

multi-Skill workflow、later invocation、chain、phase、workflow outcomeの正式な保存・評価はPR6のscopeで行う。PR2はこれらを診断setとしても保存しない。

## 10. Environment Qualification / timeout

### 10.1 timeout

`CASE_TIMEOUT_MS = 327_000`はprocess safety capとして維持する。routing性能の合否閾値には使用しない。

- positive evidence前にtimeout → `outcome=unobservable`、`process_lifecycle=timed_out`
- trusted positive evidence後にtimeout → routing outcome保持、`process_lifecycle=timed_out`
- absence確定前にtimeout → `false_negative` / expected nullの`pass`へ変換しない
- timeout後にlate Hookを偶然取得しても、candidate prefix trustまたはfull absence条件がなければ採用しない

新しいrouting observation timeout、quiet-window、adaptive timeoutは導入しない。

### 10.2 新contractのQualification PASS条件

旧terminal thresholdは使用しない。terminal durationは測定Evidenceとして保存するが、固定数値によるrouting判定は行わない。

Positive:

- actual canonical Skill direct readがある
- bounded selectorで一意に`canonical_skill`と分類できる
- first trusted readがexpected Skillである
- Hook correlationとcandidate prefix trustが成立する
- terminalが後から`turn.failed`またはtimeoutになってもrouting observationはPASS可能である
- lifecycleは別途`turn_failed`または`timed_out`として保存する

Negative:

- trusted `turn.completed`
- Hook correlation / parseが成立
- 全対象Hook eventがreliable
- canonical Skill readが0件
- `initial_skill=null`、`observed_skills=[]`

negativeはabsenceなので、terminal completion前のread 0件だけではPASSにしない。

## 11. Routing Target / correlationの再利用

### 11.1 Target lifecycle

新しい実装Runでは、Qualificationとcanonical `all`に同じfresh independent Routing Target cloneを1つだけ使用する。

```text
fresh independent Routing Target
  -> preflight
  -> Qualification
  -> 同じTarget状態を維持
  -> canonical all
```

Qualification PASS後にre-clone、checkout変更、reset、別Targetへの交換を行わない。Target状態が変化した場合はQualificationを無効とし、新しいRunとしてpreflightからやり直す。

### 11.2 Target条件

少なくとも次をpreflightで確認する。

- Evaluator rootとは別directory
- realpath上の相互containmentなし
- Git common-dirを共有しない
- Git objects alternatesがない、または空
- detached HEAD
- clean working tree
- 指定されたlatest routing source SHA
- Trigger dataset YAMLなし
- answer keyなし
- Evaluator Run Artifactなし
- 6 canonical `SKILL.md`がreadable
- 他のCodex processが同じTargetを使用していない

既存`assertTargetPreflight`のEvaluator / Target分離、clean、6 Skill readability、Trigger dataset不存在、common-dir、alternates、source変更検査を再利用する。Targetの準備・cleanupをrunnerへ一般化しない。

### 11.3 Case correlation

既存の`1 case = 1 process`、sequential実行、dedicated Target、before / after append delta、session別Hook JSONLを正本とする。既存の`collectHookDelta`がexactly one append deltaを要求する。新しいsession manager、turn manager、correlation frameworkは作らない。

## 12. 実装対象file / change strategy

### 12.1 実装phaseの変更対象

実装phaseの変更対象は、現在のコードで確認できた次のfileに限定する。

1. `scripts/evals/skill-trigger-evals.ts`
   - `RESULT_SCHEMA_VERSION = 2`の追加
   - dataset `DATASET_SCHEMA_VERSION = 1`との型分離
   - `initial_skill`、`observed_skills` 3状態、`process_lifecycle`の型
   - trusted positive / absence / unobservableを扱うpure function
   - `scoreInitialRouting`または同等のinitial-only scoring
   - `RunSummary.by_process_lifecycle`
   - Result schema 2、split、fingerprint、case ID、Codex versionを検査するcomparison
2. `scripts/evals/run-skill-trigger-evals.ts`
   - `EvaluationResult.schema_version`をResult schema 2へ変更
   - `parseComparableRun`をschema 2専用へ変更し、schema 1 / unknownを拒否
   - current `tool_input_preview` JSONからcommandを取得するbounded selector
   - selectorの`canonical_skill` / `safe_no_read` / `unreliable`分類
   - candidate prefixとabsence全eventのreliabilityを分けたHook処理
   - process状態の一意なlifecycle mapping
   - later Skillを収集しないResult生成
   - summaryへlifecycle countを追加
3. `tests/repository-contract/skill-trigger-evals.test.ts`
   - selector 3状態、observation、lifecycle、summary、coverage、comparisonのregression contract
   - inline `comparableRun` fixtureをResult schema 2へ更新
4. `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`
   - 実装完了時に、今回確定したselector / observation / Result schema / comparison判断を恒久記録へ反映する。今回のPlan修正ではADRを変更しない。

### 12.2 明示的に変更しないschema / fixture / docs

- 12 dataset YAMLとdataset schema 1
- `.codex/templates/evaluation.schema.json`、`scripts/validate-output-schema.py`（generic `evaluation.json`用）
- `.codex/templates/RUN_MANIFEST.json`、`scripts/collect-run-artifacts.py` / `.ps1`、manifest contract tests
- 過去の`trigger-eval-baseline*.json`、`evaluation.json`、Run Artifact
- `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`のdecision table / timeout contract / 当時の判断
- `AGENTS.md`、`.codex/hooks/**`、Skill description、Product code / tests

旧Planへ短いsuperseded noteを冒頭へ加える必要が生じた場合だけ、別途明示した最小差分として扱う。旧Planの本文を新contractへ書き換えない。今回の実装対象fileには含めない。

### 12.3 実装順

1. `skill-trigger-evals.ts`でResult schema 2、3状態、initial-only scoring、lifecycle、summaryを定義する。
2. `tests/repository-contract/skill-trigger-evals.test.ts`でdecision tableとschema/comparison拒否条件を先に固定する。
3. `run-skill-trigger-evals.ts`へ現在のHook previewだけを対象とするbounded selector、candidate prefix / absence処理、lifecycle mappingを実装する。
4. outputとcomparison parserをschema 2へ接続し、Codex version不一致を拒否する。
5. focused validation、dataset validation、Skill validation、full repository validationを指定順で実行する。
6. fresh Targetをpreflightし、Qualificationとcanonical `all`へ同じTargetを渡す。

## 13. Tests

### 13.1 Selector: canonical Skill read

同じSkillを`canonical_skill / reliable`として認識する。

- forward slash
- backslash
- single quote
- double quote
- quoteなし
- `-Path`
- `-LiteralPath`
- `-Raw` before / after
- 許可parameterの順序差
- 実測`Get-Content -Raw .agents/skills/feature-plan/SKILL.md`
- 実測`Get-Content -LiteralPath '.agents\skills\feature-plan\SKILL.md' -Raw`

### 13.2 Selector: reliable no-read

次を`safe_no_read / selector_reliable=true / Skill=null`として検証する。

- `Get-Content package.json`
- `Get-Content docs/PROJECT_CONTEXT.md`
- `git status`
- `pnpm run test`
- `Get-ChildItem`
- `Select-String`
- `rg`
- `grep`
- `echo` / `Write-Output`
- unknown Skill path
- non-`SKILL.md`
- directory
- canonical pathのpath mention、search結果、response text

### 13.3 Selector: unreliable

次を`unreliable`として検証し、absenceを禁止する。

- truncated preview
- outer JSONL malformed
- `tool_input_preview` malformed JSON
- command field欠落 / 非文字列
- ambiguous multiple path
- ambiguous multiple command
- unbalanced quote
- canonical pathを含むcomplex PowerShell
- command自体を一意に取得できない入力

### 13.4 Observation / lifecycle

最低限次を検証する。

- expected first + completed → expected / `[expected]` / `pass` / `completed`
- expected first + timeout → expected / `[expected]` / `pass` / `timed_out`
- expected first + `turn.failed` → expected / `[expected]` / routing outcome保持 / `turn_failed`
- sibling first → sibling / `[sibling]` / `sibling_misroute`
- non-sibling first → other / `[other]` / `unexpected_trigger`
- expected null + Skill read → Skill / `[Skill]` / `unexpected_trigger`
- reliable no-read + `turn.completed` + expected → null / `[]` / `false_negative`
- reliable no-read + `turn.completed` + expected null → null / `[]` / `pass`
- no-read + timeout → null / `null` / `unobservable` / `timed_out`
- no-read + `turn.failed` → null / `null` / `unobservable` / `turn_failed`
- no-read + process failure → null / `null` / `unobservable` / `spawn_failed`等
- unreliable selector + `turn.completed` → null / `null` / `unobservable`
- unreliable selector + timeout → null / `null` / `unobservable`
- positive candidate後のmalformed later Hook → initial routing outcome保持、`observed_skills`はfirst Skill一件だけ
- later Skill chain → PR2 Resultへlater Skillを保存しない

### 13.5 Result schema / comparison

- dataset `schema_version=1`を受理し、dataset fingerprintを従来どおり計算する
- Result `schema_version=2`を受理する
- Result `schema_version=1`のold artifactをnew comparisonで拒否する
- unknown future Result schemaを拒否する
- Result schema欠落を拒否する
- `split != all`を拒否する
- dataset fingerprint不一致を拒否する
- case ID set不一致を拒否する
- Codex version不一致を拒否する
- old artifactの変換・後付けmarker・migrationを行わない

### 13.6 Summary / coverage

- `by_outcome`の各routing outcome countを検証する
- `by_process_lifecycle`の各lifecycle countを検証する
- `outcome=pass` + `process_lifecycle=timed_out`で両方のcountが1増えることを検証する
- routing failureでもobservableなら8-side coverageへ数える
- absence未確定timeoutはcoverageへ数えない
- 8/8 sideは成功、7/8 sideはmissing sideを返して失敗する

## 14. Validation plan

### 14.1 実装後の順序

上流失敗時は後続gateを開始しない。

1. focused repository contract test

```bash
pnpm exec vitest run tests/repository-contract/skill-trigger-evals.test.ts --no-file-parallelism --maxWorkers=1
```

1. dataset schema 1 / fingerprint

```bash
pnpm run eval:skills:trigger:validate
```

1. Skill / Markdown validation

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

1. full existing gate

```bash
pnpm run verify
```

1. Result schema / comparison fixture validation

Trigger Result専用のJSON schema file / validatorは現状存在しない。Trigger Result schema 2は`parseComparableRun`、`compareRuns`、repository contract testで検証し、`scripts/validate-output-schema.py`は`.codex/runs/<id>/evaluation.json`向けgeneric validatorとして別責務のまま変更しない。Result schema 2の実artifactが得られた場合も、このgeneric validatorへTrigger Resultを渡さず、必要なgeneric evaluation artifactだけを検証する。

### 14.2 今回のPlan-only validation

- `git diff --check`
- `pnpm run lint:markdown`
- 対象PlanのPrettier check
- `scripts/sanitize-codex-artifacts.ps1`のWrite / Check（Planとactive Run）
- `git diff --name-only <開始時HEAD>...HEAD`またはcommit前後のscope確認
- source implementation diffがないこと
- canonical `all`、Probe、dataset変更がないこと

Plan専用validatorはcurrent branchに存在しないため、`origin/main`の未マージvalidatorを持ち込まない。使用可能な既存Markdown検証とartifact sanitizerを使う。

## 15. Canonical rerun preconditions

以下をすべて満たすまでcanonical `all`を実行しない。

1. この修正版Planが再レビュー・承認済みである。
2. Result schema 2が実装済みである。
3. dataset schema 1、dataset fingerprint、query、`expected_skill`、boundary、case IDが不変である。
4. bounded selectorのcanonical read testsがPASSしている。
5. reliable no-read / unreliable testsがPASSしている。
6. positive timeout後のrouting保持testがPASSしている。
7. comparisonでschema 1 old artifact拒否testがPASSしている。
8. full repository validationがPASSしている。
9. fresh independent Routing Targetを作成し、Target条件を全て満たす。
10. Qualificationとcanonicalで同じTargetを使用する。
11. Qualification、canonical、baselineでCodex versionを固定する。
12. positive controlでinitial Skill direct readを観測し、expected Skillと一致する。
13. negative controlでtrusted absenceを成立させる。
14. canonical `all`を最初から一回だけ実行する。

canonical `all`の実行条件:

- Qualification PASS後のみ
- 24 cases、`split=all`
- sequential
- retryなし、途中caseだけの再実行なし
- 同じTarget、同じEvaluator SHA、同じRouting source SHA、同じdataset fingerprint
- 同じCodex version
- 8/8 sideで最低1 observable case

Qualification後にTargetをre-clone、checkout変更、reset、交換した場合は、同一Runのcanonicalへ進まずQualificationを無効化する。

次の場合はrunをvalid baselineへ昇格しない。

- positive candidate prefix trustが成立しない
- negativeの全対象eventがreliableでない
- absenceをterminal completionなしで確定する必要がある
- 8 sideのいずれかが全件unobservable
- Result schema、dataset fingerprint、case ID、Codex version、source provenanceが不一致
- canonical processが全case完了前に失われ、Result完全性を確認できない

case retry、unobservable-only retry、query tuning、timeout変更、Skill description変更、別Target交換で穴埋めしない。

## 16. Rollback / invalidation

### 16.1 実装rollback

- Result schema 2導入前のsource commitをrollback基点として保持する。
- dataset、Skill description、AGENTS、Product codeはrollback対象へ含めない。
- bounded recognizerがfalse positiveを作った場合、grammarを無制限に広げず、そのimplementation Runをinvalidとする。
- Result schemaを変更した場合、異なるschemaのbaselineと比較せず、新schemaでbaselineを作り直す。

### 16.2 Evidence invalidation

次の場合はrouting resultを`unobservable`またはRun invalidとして扱う。

- candidate prefixより前のHook correlation / parseが不確実
- candidateがpath mention、search result、truncated preview、arbitrary shell由来
- safe no-readとunreliableを区別できない
- no-readをterminal completionなしで`pass` / `false_negative`へ分類
- Result schema 1 old artifactへmarkerを後付けしてcomparison
- Codex version不一致のRunをPR3 comparison
- 8-side未達、partial canonical、外部session中断、Target状態変化

既存invalid artifact、旧Plan、過去Runは削除・上書きしない。

## 17. Scope guard

### 17.1 今回のPlan修正で変更可能

- `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`
- `.codex/runs/20260909-192202-JST/**`
- PR #127本文のPlan状況記載

### 17.2 実装phaseで変更可能

- `scripts/evals/skill-trigger-evals.ts`
- `scripts/evals/run-skill-trigger-evals.ts`
- `tests/repository-contract/skill-trigger-evals.test.ts`
- `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`の恒久記録追補
- 実装Run Artifact

### 17.3 今回および実装phaseで変更禁止

- dataset YAML、dataset schema 1、query、`expected_skill`、boundary、case ID、fingerprint
- `.agents/skills/**/SKILL.md`、Skill description、`AGENTS.md` routing
- `.codex/hooks/**`
- `.codex/templates/evaluation.schema.json`、Run manifest schema、generic artifact validator
- Product code、Product tests、training content
- `CASE_TIMEOUT_MS = 327_000`
- general PowerShell / shell parser、shell AST parser、LLM judge、keyword classifier
- routing state machine、generic event bus、generic lifecycle framework
- structured evidence adapter / provider / strategy / factory abstraction
- retry framework、parallel runner、adaptive timeout、quiet-window、Host runtime wrapper
- old artifactの変換、migration、後付けmarker、partial merge
- Probe、canonical `all`、PR merge

## 18. Plan自己レビュー（16項目）

| # | 確認事項 | 回答 | 根拠 |
|---:|---|---|---|
| 1 | Selector non-matchとunreliableを区別できているか | YES | canonical / safe no-read / unreliableの3状態とabsence条件を定義した |
| 2 | normal non-Skill commandがunobservableにならないか | YES | `git status`等をsafe no-read / reliableと明記した |
| 3 | `observed_skills`の定義に矛盾がないか | YES | initial Skillは一件、absenceは`[]`、不成立は`null`に固定した |
| 4 | later Skill readをPR2から除外したか | YES | Resultへ保存・score・diagnostic setを持ち込まないと明記した |
| 5 | dataset schemaとResult schemaを分離したか | YES | dataset 1、Result 2を別定数・別責務にした |
| 6 | old artifactを自然にcomparison拒否できるか | YES | schema 1、unknown、version不一致をfail closedしmigrationを禁止した |
| 7 | 将来用structured adapterを追加していないか | YES | current preview経路だけを実装対象とし、将来Host機能はscope外注記にした |
| 8 | 過去Planの履歴を破壊しないか | YES | 旧Planのdecision table / timeout / 判断を書き換えないと固定した |
| 9 | process lifecycle summaryを確定したか | YES | `by_process_lifecycle`と6 enum、判定優先順位を固定した |
| 10 | 旧terminal Gateを削除したか | YES | 新contractのthreshold / PASS条件に使用せず、歴史的事実だけ保持した |
| 11 | Qualification / canonicalで同じTargetを使うか | YES | fresh independent Target一つをPASS後も交換せず再利用すると固定した |
| 12 | expected nullのabsence条件が安全か | YES | `turn.completed`、correlation / parse、全event reliable、read 0件を要求した |
| 13 | false_negativeのabsence条件が安全か | YES | trusted absenceでexpected Skillありの場合だけ許可した |
| 14 | 実装時の主要判断が残っていないか | YES | schema、selector、summary、Codex version、Target、tests、preconditionsを確定した |
| 15 | PR2 / PR6責務が混ざっていないか | YES | PR2はinitialのみ、later chain / workflowはPR6と固定した |
| 16 | 過剰設計が増えていないか | YES | small pure functions、bounded recognizer、既存runner拡張、Result schema、testsに限定した |

## 19. 成果物

### 19.1 今回の修正Runで保存するもの

- `docs/plans/2026-09-09_161652_issue-117-pr2-observation-contract-redesign.md`
- `.codex/runs/20260909-192202-JST/PLAN.md`
- `.codex/runs/20260909-192202-JST/TASKS.md`
- `.codex/runs/20260909-192202-JST/REPORT.md`
- machine-managed `.codex/runs/20260909-192202-JST/run.json`
- PR #127本文のPlan状況記載（既存FAIL / 未実行 / 未取得を維持）

### 19.2 将来の実装Runで保存するもの

- Result schema 2のimplementation evidence
- repository contract test結果
- Qualification evidence
- 8/8 side成立を確認した最初のvalid canonical result
- PR3 comparisonへ使えるCodex version一致のbaseline/current provenance

## 20. リスク / 未解決論点

### 20.1 リスク

- first canonical readはinternal routing decisionの直接eventではない。Result、Plan、PR本文ではproxyの範囲を越えて主張しない。
- safe no-readをunreliableへ寄せるとabsence coverageが減り、unreliableをsafe no-readへ寄せるとfalse pass / false negativeを作る。意味境界のtestを先に固定する。
- candidate後のlater HookをResultへ保持しないため、PR2だけではSkill chainを説明できない。これは意図したPR6境界である。
- Result schema 2を導入しても、Codex versionが違えばdescription差分とruntime差分を分離できないためcomparisonを拒否する。
- TargetをQualification後に交換すると8-side validityとprovenanceが壊れるため、状態変化をRun invalidとして扱う。

### 20.2 未解決ではなくscope外とする事項

- Hostが将来typed path/file fieldやnative routing eventを提供する時期とfield形状
- PR6のSkill chain / phase / workflow result schema
- model identityを確実に返すHost provenance

これらは今回の実装判断を保留する問いではなく、現行contractの範囲外である。現行実装は既存`tool_input_preview`だけを対象とする。

## 21. 備考

- 現行Qualificationのold terminal Gate FAIL、positive selector drift、過去invalid canonical resultは履歴として保持する。新contractの成立、blocker解消、valid baseline取得を先取りして記録しない。
- `CASE_TIMEOUT_MS = 327_000`はprocess safety capであり、routing性能の合否閾値ではない。
- raw Target Hook logは長期Repository Artifactへコピーしない。Runにはsanitizedな要約とrepo-relative referenceだけを残す。
- implementation、Probe、canonical `all`は、修正版Planの再レビュー後に別Runで順序どおり実施する。
