# Issue #117 / PR #127 positive Qualification blocker 調査・実装Plan

> Status: raw evidence調査完了、実装前Plan（今回のRunでは実装・test・ADR変更、Qualification、canonical実行を行わない）
>
> 対象branch: `refactor/117-pr2-trigger-eval-baseline`
>
> 対象PR: #127、current head `c901c5a1a8ab96a8c253495d887f5b20b343d285`
>
> 調査Run: `.codex/runs/20260910-192747-JST/`

## 0. 依頼概要

### 0.1 目的

PR #127のpositive Environment Qualification blockerについて、保存済みraw Hook evidenceを直接確認し、absolute Skill readとunsupported compoundの実際の順序・shape・対象fileを確定する。確定した事実だけを使い、次の実装Runが追加判断なしで進められるboundedな実装Planを作る。

### 0.2 今回の成果物

- 本Plan: `docs/plans/2026-09-10_192747_trigger-eval-positive-blocker-remediation.md`
- Plan専用strict Run Artifact: `.codex/runs/20260910-192747-JST/`
- Plan-only evaluation、sanitizer、strict collectorの結果
- PR #127への新Plan pathと「実装未着手」の最小追記（既存のQualification判定は変更しない）

### 0.3 今回の対象外

- `scripts/evals/run-skill-trigger-evals.ts`、`scripts/evals/skill-trigger-evals.ts`の変更
- selector、preflight、tests、ADR、dataset、query、Skill、Hook、timeoutの変更
- Qualification、Probe、retry、canonical `all`、8/8 validity、baseline取得
- 前回Runの`flaky_or_env_issue`の機械的継承

## 1. ゴール / 完了条件

### 1.1 調査ゴール

- raw positive evidenceの相関済み`PostToolUse`を全件時系列で一覧化する。
- 最初のabsolute `Get-Content`と、最初のunsupported compoundを完全shapeで固定する。
- absolute readがcompoundより先であることを確認し、A/B/Cを確定する。
- absolute pathが実際のRouting Target内の`feature-plan/SKILL.md`とrealpathおよびfile identityで一致することを確認する。
- `flaky_or_env_issue`を前提にせず、taxonomyから今回のblockerに適した判断を記録する。

### 1.2 次の実装RunのDoD

- A判定に基づき、Target rootを実行時contextとしてbounded absolute canonical path recognitionへ渡せる。
- absolute pathはTarget root配下かつ6 canonical Skillのresolved fileと完全一致する場合だけ`canonical_skill`になる。
- machine固有absolute pathのliteral hard-code、substring判定、一般PowerShell parser、compound一般対応を追加しない。
- 現行のrelative direct-read、safe no-read、unreliable、first trusted candidate、candidate後unreliable非上書き契約を維持する。
- dataset schema 1、Result schema 2、`CASE_TIMEOUT_MS = 327000`、negative/positive query、8/8 validityの契約を変更しない。
- 必須testsとPlan記載のstatic gateがPASSする。
- Qualificationは、実装・必須static gate・Evaluator SHA固定・fresh Target作成・Target preflight・routing SHA・Codex versionの前提が揃った後、negative→positiveの順に実行する。negative PASS時だけpositiveを実行し、両方PASSした場合のみEnvironment QualificationをPASSと判定し、その後にcanonicalを開始する。

## 2. 現状理解と前提

### 2.1 開始状態

read-only開始確認の結果:

| 項目 | 結果 |
| --- | --- |
| branch | `refactor/117-pr2-trigger-eval-baseline` |
| working tree | clean（Run初期化後は新Run Artifactのみ） |
| HEAD / PR head | `c901c5a1a8ab96a8c253495d887f5b20b343d285` |
| `origin/main` | `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5` |
| PR #127 | OPEN、base `main`、head branch一致 |
| PR checks | 取得時点でsuccess 31、skipped 2、failure 0（保留なし） |

前回の実装Run `.codex/runs/20260910-122601-JST/`と、前回の実装結果は履歴として保持し、今回のRunでは再利用・書換えしない。

### 2.2 raw positive evidence

直接確認した対象は次のとおりである。

- `.artifacts/trigger-eval-qualification-20260910-r2/positive/hook-delta.jsonl`: 32 records（`UserPromptSubmit` 1、`PostToolUse` 30、`Stop` 1）、13,363 bytes。
- `analysis.json`: `timed_out=false`、`spawn_failed=false`、`signaled=false`、`exit_code=0`、`trusted_terminal=turn.completed`、`hook_correlation_ok=true`、`hook_parse_ok=true`、`selector_reliable=false`、`initial_skill=null`、`observed_skills=null`。
- `meta.json`: queryは`$feature-plan を使って、この依頼の実装計画だけを作ってください。`、duration 188.171秒、exit 0、stdout 284,392 bytes、stderr 0 bytes。
- `stdout.jsonl`: JSONL 67 records、terminalは`turn.completed` 1件。`stderr.log`は空。

raw evidenceに記録されたpositive queryは1回だけであり、今回の調査ではquery、Qualification、Probeを再実行していない。

### 2.3 現行処理経路

現行runnerは、`assertTargetPreflight`で得たTargetをcase実行へ渡すが、selector呼出しにはTarget rootを渡していない。現在の主経路は次のとおりである。

```text
Hook delta raw JSONL
  -> parseHookEvents
  -> selectInitialSkill
  -> classifyHookEvent
  -> classifyCommand
  -> classifyDirectPath / normalizeBoundedRelativePath
  -> prepareSignals
```

現在の`normalizeBoundedRelativePath`はabsolute pathを拒否する。したがってraw commandが単一のdirect `Get-Content`でも、Target rootを基準に実体一致を確認する分岐がなく、`unreliable`となる。

## 3. raw evidence調査結果

### 3.1 相関と全体順序

全`PostToolUse`は同一`session_id`、同一`turn_id`、`tool_name=Bash`、`truncated=false`であり、`UserPromptSubmit`と`Stop`を除いた30件が相関済み対象である。`PostToolUse`の最初は`Get-Content -Raw 'docs/PROJECT_CONTEXT.md'`、最後はRun初期化commandである。

`PostToolUse` ordinalは0始まり、`raw index`は`hook-delta.jsonl`をJSON record配列として0始まりで記載する。`UserPromptSubmit`がraw index 0である。

| Post ordinal | raw index | UTC timestamp | tool | truncated | command / input summary | 現行分類 | canonical Skill read可能性 |
| ---: | ---: | --- | --- | --- | --- | --- | --- |
| 0 | 1 | 04:00:15.892Z | Bash | false | `Get-Content -Raw 'docs/PROJECT_CONTEXT.md'` | `safe_no_read` | なし |
| 1 | 2 | 04:00:15.942Z | Bash | false | `Get-Content -Raw 'PLANS.md'` | `safe_no_read` | なし |
| 2 | 3 | 04:00:16.001Z | Bash | false | `Get-Content -Raw 'AGENTS.md'` | `safe_no_read` | なし |
| 3 | 4 | 04:00:16.000Z | Bash | false | `Get-Content -Raw '.agents/skills/feature-plan/assets/plan-template.md'` | `safe_no_read` | なし（Skill root外） |
| 4 | 5 | 04:00:16.103Z | Bash | false | `Get-Content -Raw '.agents/skills/feature-plan/references/planning-workflow.md'` | `safe_no_read` | なし（SKILL.mdでない） |
| 5 | 6 | 04:00:16.446Z | Bash | false | absolute `feature-plan/SKILL.md` read | `unreliable` | **あり。実体はcanonical** |
| 6 | 7 | 04:00:16.513Z | Bash | false | `git status --short --branch` | `safe_no_read` | なし |
| 7 | 8 | 04:00:17.382Z | Bash | false | `if (Test-Path '.codex/runs') { Get-ChildItem ... }` | `unreliable` | visible targetは非canonicalだが安全判定不可 |
| 8 | 9 | 04:00:17.529Z | Bash | false | `if (Test-Path 'docs/adr') { Get-ChildItem ... }` | `unreliable` | visible targetは非canonicalだが安全判定不可 |
| 9 | 10 | 04:00:48.427Z | Bash | false | `if (Test-Path '.codex/runs/.../REPORT.md') { Get-Content ... }` | `unreliable` | compoundのため安全判定不可 |
| 10 | 11 | 04:00:48.502Z | Bash | false | `git log -8 --oneline --decorate` | `unreliable` | なし（現行bounded git shape外） |
| 11 | 12 | 04:00:48.585Z | Bash | false | `if (Test-Path '.../PLAN.md') { Get-Content ... }` | `unreliable` | compoundのため安全判定不可 |
| 12 | 13 | 04:00:48.625Z | Bash | false | `if (Test-Path '.../TASKS.md') { Get-Content ... }` | `unreliable` | compoundのため安全判定不可 |
| 13 | 14 | 04:00:49.106Z | Bash | false | `Get-ChildItem '.codex/runs/...' -Recurse -File \| Select-Object ...` | `unreliable` | recursive/pipe shapeのため安全判定不可 |
| 14 | 15 | 04:00:49.178Z | Bash | false | `if (Test-Path 'docs/plans') { Get-ChildItem ... }` | `unreliable` | compoundのため安全判定不可 |
| 15 | 16 | 04:00:49.617Z | Bash | false | `git branch -a -vv` | `unreliable` | なし（現行bounded git shape外） |
| 16 | 17 | 04:00:50.030Z | Bash | false | `Get-ChildItem -Force \| Select-Object ...` | `unreliable` | pipe shapeのため安全判定不可 |
| 17 | 18 | 04:01:11.725Z | Bash | false | `Get-Content -Raw 'docs/plans/README.md'` | `safe_no_read` | なし |
| 18 | 19 | 04:01:11.801Z | Bash | false | `Get-Content -Raw 'PLANS.md'` | `safe_no_read` | なし |
| 19 | 20 | 04:01:11.826Z | Bash | false | `Get-Content -Raw '.codex/runs/.../run.json'` | `safe_no_read` | なし |
| 20 | 21 | 04:01:11.869Z | Bash | false | `Get-Content -Raw 'docs/plans/codex-goal-implementation-instructions.md'` | `safe_no_read` | なし |
| 21 | 22 | 04:01:12.206Z | Bash | false | 2つの`Get-Content`を`;`で連結 | `unreliable` | compoundのため安全判定不可 |
| 22 | 23 | 04:01:12.622Z | Bash | false | `rg -n -i ... 'trigger.?routing\|trigger routing\|routing target\|PR2' .` | `unreliable` | bounded search shape外 |
| 23 | 24 | 04:01:38.045Z | Bash | false | `$runs = ...; foreach (...) { ... } \| Format-Table` | `unreliable` | variable/semicolon/foreach/pipe |
| 24 | 25 | 04:01:48.394Z | Bash | false | `@($runs = ...; foreach (...) { ... }) \| Format-Table` | `unreliable` | variable/semicolon/foreach/pipe |
| 25 | 26 | 04:02:08.760Z | Bash | false | `Get-Content -Raw 'scripts/new-run.ps1'` | `safe_no_read` | なし |
| 26 | 27 | 04:02:08.941Z | Bash | false | 3つの`Get-Content`を`;`で連結 | `unreliable` | compoundのため安全判定不可 |
| 27 | 28 | 04:02:09.828Z | Bash | false | 2つの`Get-Date`を`;`で連結 | `unreliable` | compoundのため安全判定不可 |
| 28 | 29 | 04:02:10.213Z | Bash | false | `if (Test-Path '.codex/config.toml') { Get-Content ... }` | `unreliable` | compoundのため安全判定不可 |
| 29 | 30 | 04:02:32.456Z | Bash | false | `& .\scripts\new-run.ps1 -RunId ...` | `unreliable` | call operator shape外 |

現行`classifyHookEvent` / `classifyCommand`で全recordを再分類した結果、最初のcanonical candidateは0件である。ordinal 5で最初の`unreliable`が返るため、現行`selectInitialSkill`は後続recordをcandidateとして扱わず、`selector_reliable=false`、`initial_skill=null`、`observed_skills=null`を返す。なお、ordinal 0の`UserPromptSubmit`とordinal 31の`Stop`はselectorの対象外である。

### 3.2 最初のabsolute `Get-Content`完全shape

raw `tool_input_preview.command`をJSON decodeした原文は、machine固有pathを除くと次の完全shapeである。

```text
Get-Content -Raw '<TARGET_ROOT>\.agents\skills\feature-plan\SKILL.md'
```

raw artifactには実際のTarget absolute pathが保存されているが、RepositoryへcommitするPlan / Run Artifactではsanitization規約に従い`<TARGET_ROOT>`へ置換する。

分解:

| 要素 | 実測 |
| --- | --- |
| reader | `Get-Content` 1回 |
| options | `-Raw` 1つ |
| path | Target root配下のabsolute `.agents\skills\feature-plan\SKILL.md` |
| quote | single quote |
| slash | Windows backslash |
| invocation | single direct command |
| extra reader | なし |
| pipe / semicolon | なし |
| variable / redirection / command substitution | なし |
| `truncated` | `false` |
| 現行分類 | `unreliable`（absolute pathをrelative-only normalizerが拒否） |

したがって、このevent自体はcompoundではなく、安全にdirect readとして切り出せるbounded commandである。

### 3.3 unsupported compound完全shape

execution順で最初のunsupported compoundはordinal 7であり、absolute read（ordinal 5）の後である。

```text
if (Test-Path '.codex/runs') { Get-ChildItem '.codex/runs' -Directory | Sort-Object Name -Descending | Select-Object -First 10 -ExpandProperty FullName }
```

これは`if`、parentheses、script blockを含むため、現行bounded tokenizerの許可shape外であり、`truncated=false`でも`unreliable`である。

semicolonを使った最初のcompoundはordinal 21であり、完全shapeは次のとおりである。

```text
Get-Content -Raw 'docs/adr/0022-test-automation-curriculum-native-specialization.md'; Get-Content -Raw 'docs/adr/0021-codex-current-shell-hook-launcher-compatibility.md'
```

後続のcompound shapeもraw evidenceから確認できる。

```text
$runs = Get-ChildItem '.codex/runs' -Directory | Sort-Object Name -Descending; foreach ($d in $runs) { $p = Join-Path $d.FullName 'run.json'; if (Test-Path $p) { try { $j = Get-Content -Raw $p | ConvertFrom-Json; [pscustomobject]@{run_id=$j.run_id; status=$j.status; task_type=$j.task_type; updated=(Get-Item $p).LastWriteTime} } catch { } } } | Format-Table -AutoSize
@($runs = Get-ChildItem '.codex/runs' -Directory | Sort-Object Name -Descending; foreach ($d in $runs) { $p = Join-Path $d.FullName 'run.json'; if (Test-Path $p) { try { $j = Get-Content -Raw $p | ConvertFrom-Json; [pscustomobject]@{run_id=$j.run_id; status=$j.status; task_type=$j.task_type; updated=(Get-Item $p).LastWriteTime} } catch { } } }) | Format-Table -AutoSize
Get-Content -Raw 'docs/adr/0022-test-automation-curriculum-native-specialization.md'; Get-Content -Raw 'docs/adr/0021-codex-current-shell-hook-launcher-compatibility.md'
Get-Content -Raw '.codex/templates/PLAN.md'; Get-Content -Raw '.codex/templates/TASKS.md'; Get-Content -Raw '.codex/templates/REPORT.md'
Get-Date -Format 'yyyyMMdd-HHmmss'; Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
if (Test-Path '.codex/config.toml') { Get-Content -Raw '.codex/config.toml' }
```

上記のうち、raw evidenceで実際のpathが`docs/adr/...`、`.codex/templates/...`であるものは、Plan内のshape説明では誤ってcanonical Skill readと解釈しないよう、意図を保ったplaceholder表記を使用している。compound対応を一般化する根拠にはしない。

## 4. A/B/C判定

### 判定: **A**

raw evidenceの順序は次のとおりである。

```text
04:00:16.446Z / PostToolUse ordinal 5
  absolute single direct Get-Content
  -> Target内の feature-plan/SKILL.md とrealpath/file identity一致

04:00:16.513Z / ordinal 6
  git status

04:00:17.382Z / PostToolUse ordinal 7
  unsupported if compound

04:01:12.206Z / ordinal 21
  unsupported semicolon compound
```

absolute readはcompoundより先で、absolute read自体はsingle direct `Get-Content`である。よって、Target rootを使ってこのeventを最初のtrusted canonical candidateにできれば、後続compoundを受理する必要はない。既存の`candidate後unreliable -> initial_skillを上書きしない`契約により、後続eventはinitial routingを壊さない。

### B/Cではない根拠

- Bではない: unsupported compoundがabsolute readより先に出現していない。
- Cではない: absolute readにはpipe、semicolon、追加reader、variable、redirection、command substitutionがなく、bounded direct-readとして切り出せる。

## 5. Target root / realpath / canonical file一致確認

raw command内のabsolute pathが単に`feature-plan`や`SKILL.md`を含むだけではなく、実際のTarget rootを基準に同一fileを指すことをread-onlyで確認した。

| 確認 | 結果 |
| --- | --- |
| Target root realpath | `<TARGET_ROOT>` |
| absolute command path | `<TARGET_ROOT>\.agents\skills\feature-plan\SKILL.md` |
| canonical path | `<TARGET_ROOT>\.agents\skills\feature-plan\SKILL.md` |
| absolute path realpath == canonical path realpath | `true` |
| file SHA-256 | `1E88977965712E9C662A513C83DC2CB6A7A52D806234D591E08EC3E2BCB7BCFE` |
| raw/canonical hash equality | `true` |
| regular file | `true` |
| ReparsePoint / symlink | なし（`LinkType`空、ReparsePoint属性なし） |
| file length | 2,198 bytes |
| Target HEAD | detached `HEAD`、`55cb43abb06fa96dd3f283d7ae4a20b6076af5f5` |
| Target working tree | clean |

確認に使った方針は、raw path文字列のliteral比較ではなく、次の実体比較である。

```text
resolve Target root
  -> join(Target root, .agents, skills, feature-plan, SKILL.md)
  -> realpath absolute command path
  -> realpath canonical known path
  -> exact equality + regular file / hash確認
```

symlink等でTarget外へ解決されるpath、Target root外の同名file、別Skillの`SKILL.md`はcanonical candidateにしない。

## 6. 原因と採用する観測契約

### 6.1 原因

今回のpositive FAILの直接原因は、Hostが実際にはTarget内canonical Skillをsingle direct readしていたにもかかわらず、現行selectorがabsolute pathをrelative-onlyとして拒否したことである。さらに、最初のabsolute eventを`unreliable`としたため、`selectInitialSkill`がfirst unreliableで停止し、後続のcompoundを読む前にinitial candidateを確定できなかった。

process側はexit 0、`turn.completed`、Hook correlation/parse PASSであり、raw evidenceも完全である。したがって、現時点では環境不安定性を示す証拠ではなく、Hookのfree-form command representationとselectorのobservation contractの不一致として扱う。

### 6.2 採用する契約（次の実装Run）

1. 既存のbounded command tokenizerとsingle direct `Get-Content` grammarを再利用する。
2. live evaluationでは、`assertTargetPreflight`が返すresolved Target rootをselector contextとして渡す。
3. HostがHook内で出力したabsolute pathは、信頼済み設定ではなく`untrusted observation input`として扱う。absolute pathをcanonical Skillへmappingするには、次をすべて満たす必要がある。
   - parsed commandがsingle direct `Get-Content`である。
   - `-Raw`、`-Path` / `-LiteralPath`、quote、slashは既存bounded direct-read grammarの範囲にある。
   - Target contextが存在する。
   - Host pathが存在する。
   - `stat`結果がregular fileである。
   - Host pathのrealpath取得に成功する。
   - Host pathのresolved realpathがTarget root内である。
   - Host pathのresolved realpathが、`join(targetRoot, .agents, skills, <known-skill>, SKILL.md)`の6 canonical Skill resolved realpathのいずれか一つと完全一致する。
   - 6 canonical Skillのいずれか一つへ一意にmappingできる。
4. 上記条件の一つでも満たさない場合、Host pathの分類は`unreliable`、`selector_reliable=false`、`skill=null`とする。path不存在、`stat`失敗、realpath取得失敗、regular fileでない場合、Target外への解決、canonical pathとの一致なしを含む。これらはrunner全体を`fail()`させず、Host observationのfail-close classificationとして扱う。
5. `realpathOrFail()`は、Evaluator root、Routing Target root、その他preflightで存在必須と定義されたpathにだけ使用する。これらが存在しない場合は評価自体が成立しないため、runner-level failureになり得る。Host由来absolute candidateへは無条件に流用しない。
6. Host由来absolute candidateの判定は、`existsSync`、`statSync`、`realpathSync`と`try/catch`を用いた小さなnon-throwing処理で実装し、path不存在・`statSync`失敗・`realpathSync`失敗を`unreliable`へ変換する。汎用filesystem abstractionは新設しない。Routing Target root自体が消える、またはTarget preflight前提が崩れる場合は、selector問題ではなくpreflight/runtime integrity failureとして扱う。
7. Target contextがない公開unit helper呼出しではabsolute pathを受理せず、従来どおり`unreliable`とする。これによりmachine固有pathの暗黙許可を防ぐ。
8. `selectInitialSkill`はabsolute candidateを最初のtrusted candidateとして返し、`initial_skill=feature-plan`、`observed_skills=[feature-plan]`、candidate indexを確定する。candidate後のunreliableは既存契約どおりinitialを上書きしない。
9. compound selectorは変更しない。raw evidence後半の`if`、semicolon、variable、foreach、pipe、call operatorは引き続き`unreliable`とする。

### 6.3 Target rootを使った処理経路

```text
assertTargetPreflight(evaluatorRoot, targetRootArgument)
  -> resolved preflight.target_root
  -> evaluateCases(..., preflight.target_root)
  -> prepareSignals(execution, hookDelta, targetRoot)
  -> selectInitialSkill(events, targetRoot)
  -> classifyHookEvent(event, targetRoot)
  -> classifyCommand(command, targetRoot)
  -> bounded direct path parse
       relative path: existing behavior
       absolute path: realpath/containment/exact canonical file match
  -> first trusted canonical candidate = initial Skill
```

### 6.4 変更対象関数（次の実装Run）

主変更対象は` scripts/evals/run-skill-trigger-evals.ts `である。関数責務は次のように狭く変更する。

- `classifyDirectPath(pathValue, targetRoot?)`: relative pathは既存どおり、absolute pathはtarget-aware exact realpath matchのみ追加。
- `classifyGetContent(tokens, targetRoot?)`、`classifyCommand(command, targetRoot?)`、`canonicalSkillForCommand(command, targetRoot?)`: bounded parserのcontextを透過する。
- `classifyHookEvent(event, targetRoot?)`、`selectInitialSkill(events, targetRoot?)`、`prepareSignals(execution, hookDelta, targetRoot?)`: live evaluatorからresolved Target rootを渡す。
- `evaluateCases`: `preflight.target_root`を`prepareSignals`へ渡す。
- `realpathOrFail`はpreflightで存在必須なroot/pathに限定して再利用する。Host path candidateの判定は`existsSync`、`statSync`、`realpathSync`、`try/catch`によるnon-throwing fail-close処理と、`normalizeRealPath`、`isSameOrDescendant`、`KNOWN_SKILL_PATHS`等の既存path helperを組み合わせ、一般filesystem resolverは新設しない。

既存unit testのrelative呼出し互換性を保つため、Target contextなしのabsolute commandはreliableへ昇格させない。

## 7. 採用しない案

- raw machine pathを正規表現や定数としてhard-codeする。
- command文字列に`feature-plan`と`SKILL.md`が含まれればcanonicalとするsubstring判定。
- absolute pathをrealpath確認なしでrelative化する。
- `realpathOrFail()`をHost由来absolute candidateへ無条件に呼び出し、path不存在・`stat`失敗・realpath取得失敗をrunner-level `fail()`へする。
- `if`、semicolon、pipe、foreach、variable、PowerShell invocationを一般parserで解釈する。
- compound内のcanonical readをsafe no-readまたはcanonical candidateとして扱う。
- candidate前のunreliableを後続candidateで救済する。
- `flaky_or_env_issue`を前回Runから理由なくコピーする。
- query、dataset、Skill、Hook、timeout、Result schema、8/8 validity、retry policyをblocker解消のために変更する。

## 8. 必須tests（次の実装Run）

対象は`tests/repository-contract/skill-trigger-evals.test.ts`である。既存testsを維持したうえで、次を追加する。

### 8.1 absolute path decision table

| fixture | 期待 |
| --- | --- |
| raw exact absolute single direct read + matching Target root、存在するregular file、resolved realpath一致 | `canonical_skill=feature-plan`、`selector_reliable=true`、`skill=feature-plan` |
| same command without Target root context | `unreliable`、hard-code防止 |
| absolute path outside Target root | `unreliable` |
| Target内の存在しないabsolute path（例: `<TARGET_ROOT>\\missing\\SKILL.md`） | `unreliable`、runner exceptionなし |
| Target外の存在しないabsolute path | `unreliable`、runner exceptionなし |
| directoryを指すabsolute path（例: `<TARGET_ROOT>\\.agents\\skills\\feature-plan`） | `unreliable`、runner exceptionなし |
| absolute path containing same suffix but different file | `unreliable` |
| absolute path resolving through symlink/reparse outside Target | `unreliable` |
| realpath取得不能ケース（安定再現できる場合はstub等、安全なfixture） | `unreliable`、runner exceptionなし |
| another known Skill absolute path | corresponding Skillへ一意にmapping |
| path text only / search result / output mention | canonical readにしない |
| absolute direct readの前にunsupported event | `unobservable`、candidate前unreliable契約維持 |
| absolute candidate後にunsupported compound / truncated / malformed event | `initial_skill`を上書きしない |

上表のHost path failureケースは、`classification=unreliable`、`selector_reliable=false`、`skill=null`、runner exceptionなしを共通期待とする。OS依存でrealpath取得不能を安定再現できない場合は、特殊filesystem fixtureを無理に作らず、存在しないabsolute pathのfail-close testでnon-throwing責務を固定する。

### 8.2 existing contract regression

- 既存4種類のrelative canonical direct readを維持する。
- exact negative compoundだけを`safe_no_read`とする現行testsを維持する。
- compound内canonical read、任意suffix、別variable、variable path、追加reader、別operator、truncated、malformedを`unreliable`のまま検証する。
- `candidate前unreliable -> unobservable`、`first trusted candidate -> initial_skill`、`candidate後unreliable -> initial_skill非上書き`を検証する。
- 存在しないabsolute path、Target外の存在しないabsolute path、directory path、realpath取得失敗（安定再現可能な場合）で、selectorがthrowせず`unreliable`を返すことを検証する。realpath失敗を特殊fixtureで再現できない環境では、存在しないabsolute path testをfail-closeの責務テストとして扱う。
- dataset schema 1、Result schema 2、lifecycle、comparison、`CASE_TIMEOUT_MS`に関する既存testsを変更しない。

### 8.3 Target/preflight regression

- attached Targetはfail、detached clean Targetはpassする現行preflight testを維持する。
- Target rootとEvaluator rootのrealpath containment、common-dir、alternates、Skill readable、Trigger dataset、source status、output分離の既存契約を維持する。
- absolute pathのrealpath/file identity検証を、machine固有path fixtureなしで検証する。

## 9. Failure taxonomy判断

### 9.1 taxonomyの確認結果

`spec/failure-taxonomy.json`は現HEADのworking treeおよびGit treeに存在しない。一方、`.codex/templates/evaluation.schema.json`のenumと`docs/reference/failure-taxonomy.md`に、次の既存categoryが定義されている。

`instruction_gap`、`scope_creep`、`missing_context`、`missing_validation`、`unsafe_action_blocked`、`bad_subagent_delegation`、`flaky_or_env_issue`、`review_gap`、`repair_loop_stalled`、`artifact_contract_gap`。

### 9.2 今回の判断

- **今回のPlan-only Run**: runtime failureを実行していないため、`evaluation.json.primary_failure_category`は`null`、failure categoriesは空配列とする。
- **positive blockerの推奨分類**: `artifact_contract_gap`。理由は、Hook evidenceはparseableでprocessもexit 0だが、実際のTarget内canonical direct readを現行observation artifact/selector contractが表現・判定できず、runがrouting観測不能になったためである。
- `flaky_or_env_issue`は採用しない。単発のshape不一致だけでは環境不安定性・PC差・再実行で解消する事実を示さず、前回Runのcategoryを機械的に継承しない。
- `missing_validation`も採用しない。raw Hook、stdout、stderr、analysis、Target file identityを今回直接確認しており、調査不足ではない。
- `artifact_contract_gap`という判断は今回のPlanが作る新しい分類ではなく、既存taxonomyの意味に照らしたagent judgementである。実装後のQualificationでは、追加evidenceに基づき再評価する。

## 10. Validation plan

今回のPlan-only Runでは、次だけを実行する。source/test/ADRへ差分がないことを先に確認し、Run/Plan Artifactの作成後に実行する。

```text
pnpm run lint:markdown
pnpm exec prettier --check docs/plans/2026-09-10_192747_trigger-eval-positive-blocker-remediation.md .codex/runs/20260910-192747-JST/PLAN.md .codex/runs/20260910-192747-JST/TASKS.md .codex/runs/20260910-192747-JST/REPORT.md .codex/runs/20260910-192747-JST/evaluation.json
git diff --check
python scripts/validate-output-schema.py .codex/templates/evaluation.schema.json .codex/runs/20260910-192747-JST/evaluation.json
powershell -ExecutionPolicy Bypass -File scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260910-192747-JST -Write -Check
powershell -ExecutionPolicy Bypass -File scripts/collect-run-artifacts.ps1 -RunId 20260910-192747-JST -RefreshGitChangedFiles -Strict
```

成功条件:

- Markdown lint、Prettier、diff check、evaluation schema、sanitizer Write/Check、strict collectorがすべてexit 0。
- sanitizer residualが0。
- source/tests/ADR、dataset、query、Skill、Hook、timeoutに差分がない。
- Plan、Run Artifact、evaluationだけが今回のcommit対象になる。

## 11. Qualification開始条件と実行順序

### 11.1 Environment Qualificationの開始条件

Environment Qualificationは、negative/positiveの判定結果を開始条件にするのではなく、次の前提をすべて満たした後にnegativeから開始する。

- 実装済み。
- 必須contract tests PASS。
- dataset validation PASS。
- `validate:skills` PASS。
- `lint:markdown` PASS。
- Prettier PASS。
- `git diff --check` PASS。
- `pnpm run verify` PASS。
- Evaluator source SHA固定。
- fresh independent Routing Target作成済み。
- Target preflight PASS。
- routing SHA一致。
- Codex version固定。

これらを満たした後、同じfresh Target上でNegative Qualificationを開始する。negative/positiveはEnvironment Qualificationそのものであり、両方のPASS結果を得るまでEnvironment Qualification PASSとは判定しない。

### 11.2 実行順序

実際の実行・判定順序は次のとおりである。

```text
static gate PASS
↓
Evaluator SHA固定
↓
fresh independent Routing Target作成
↓
Target preflight PASS
↓
Negative Qualificationを1回実行
↓（Negative PASS時のみ）
Positive Qualificationを1回実行
↓（Negative / Positive両方PASS）
Environment Qualification = PASS
↓
同じTargetでcanonical all
```

1. Static gate、Evaluator source SHA、routing SHA、Codex versionを固定・記録する。
2. Evaluatorと別のfresh independent Targetを1つ作り、detached、clean、common-dir分離、alternates空、6 Skill readable、12 trigger YAML不存在、named evaluator artifact不存在、output分離、他Codex process 0をTarget preflightで確認する。
3. 同じTarget上でNegative Qualificationを1回だけ実行し、既存のexact compoundによるtrusted absenceを確認する。trusted absenceが成立しない、またはFAILの場合は直ちに停止し、Positiveとcanonicalは実行しない。
4. Negative PASS時だけ、同じTargetでPositive Qualificationを1回だけ実行する。Positiveはraw ordinal 5相当のabsolute direct readをTarget-aware selectorが`canonical_skill=feature-plan`としてtrusted initial candidateにできること、`selector_reliable=true`、`skill=feature-plan`、後続compoundがinitial routingを変更しないことを確認する。PositiveがFAIL、unreliable、Target/SHA/correlation/parse不一致、unexpected shapeの場合は停止し、canonicalは実行しない。
5. Negative / Positiveが両方PASSした場合だけ、Environment Qualification = PASSと判定する。

Negative query、positive query、timeout、lifecycle、Result schema、8/8 validityの意味は変更しない。Host pathの不存在・`stat`失敗・realpath取得失敗はselector-levelの`unreliable`であり、これだけを理由にrunner全体を`fail()`させない。Routing Target root自体が消える、またはpreflight前提が崩れる場合は、preflight/runtime integrity failureとしてrunner-level failureになり得る。

## 12. canonical開始条件

canonical `all`は、同じfresh TargetでNegative QualificationとPositive Qualificationをこの順序で実行し、両方PASSしてEnvironment Qualification = PASSと確定した後だけ開始する。Environment Qualification PASSはcanonicalの後付け結果ではなく、canonical開始前の判定条件である。

- `split=all`、24 cases、sequential、retryなし、query変更なし。
- Result schema 2、dataset fingerprint、case ID set、Codex version、Evaluator/Routing SHAのprovenance一致。
- `summary.by_outcome`と`summary.by_process_lifecycle`を分離したまま確認する。
- 4 boundary × 2 expected sideの8/8 observable条件を満たさない結果はvalid baselineへ昇格しない。

NegativeまたはPositiveがFAILした場合、後続のQualificationを実行せず、canonical未実行、8/8未判定、valid baseline未取得を維持する。

## 13. 停止条件

Host由来absolute pathのTarget root外、path不存在、`stat`失敗、realpath取得失敗、regular fileでない、realpath不一致、または6 Skillへ一意にmappingできない場合は、runner-level failureではなく`unreliable`、`selector_reliable=false`、`skill=null`へ倒す。これらがtrusted candidateを成立させずQualificationの判定条件を満たせない場合に限り、該当QualificationをFAILとして停止する。

- absolute readより前にunsupported eventが観測される。
- compound内のcanonical read、path mention、search、variable pathをcanonicalへ昇格したくなる。
- Hook correlation/parse、Target clean、detached、SHA、common-dir、alternates、output分離が不一致。
- negative exact compoundがtrusted absenceを満たさない。
- positive selectorがunreliableのまま、またはunexpected shapeがcandidate前に出る。
- static gateのfirst anomalyを修正せずに後続runtimeへ進みたくなる。

一方、Routing Target root自体が消える、Evaluator rootやpreflightで存在必須なpathが消える、またはTarget preflight前提が崩れる場合は、Host input failureと異なるpreflight/runtime integrity failureとしてrunner-level failureになり得る。二つの失敗境界を混同しない。

停止時はretry、selectorの場当たり変更、query tuning、別Target交換、canonical実行を行わず、raw evidenceと理由をRun Artifactへ記録する。

## 14. 影響範囲 / 変更予定file

### 14.1 次の実装Runで変更予定

- `scripts/evals/run-skill-trigger-evals.ts`: Target-aware bounded absolute canonical path recognitionとcontext threading。
- `tests/repository-contract/skill-trigger-evals.test.ts`: absolute path、realpath、候補順序、拒否境界のcontract tests。
- `docs/adr/0024-trigger-eval-selector-and-query-execution-contract.md`: 実装・validation完了後に、採用したabsolute observation contractを追記する場合のみ。

### 14.2 今回変更しない

- 上記source、tests、ADR
- `scripts/evals/skill-trigger-evals.ts`
- dataset schema 1、12 YAML、query、`expected_skill`、boundary、case ID、fingerprint
- `.agents/skills/**/SKILL.md`、Skill description、`.codex/hooks/**`
- `CASE_TIMEOUT_MS = 327000`
- Result schema 2、lifecycle、comparison、8/8 validity
- 過去Plan、過去Run、旧evaluation、raw artifact

## 15. Risks / open questions

### Risks

- Target contextを受け渡す範囲を広げすぎると、unit helperがmachine固有pathを暗黙に受理するため、contextなしabsoluteはfail-closeする。
- realpath比較を省略すると、同名file、symlink、Target外pathをcanonicalと誤認する。
- compoundを後から許可すると、trusted absenceがfalse-passになるため、A判定では不要なcompound対応を追加しない。
- `spec/failure-taxonomy.json`欠落はrepository側の参照整合性問題であり、今回のPlanでtaxonomyを新設・修正しない。

### Open questions

- 今回のA判定、Target root、realpath/file identity、既存contractを前提に、実装開始に必要な回答待ちの必須質問はない。
- future Hostがabsolute readを別shapeで出した場合は、このPlanの範囲を拡張せず、追加raw evidenceと別判断を伴う新Planを作る。

## 16. 備考

このPlanはA判定を根拠に「absolute対応だけでblockerを解消できる可能性がある」とする。ただし、解消を証明するのは将来の実装後Qualificationであり、今回のPlan-only RunではQualificationもcanonicalも実行しない。
