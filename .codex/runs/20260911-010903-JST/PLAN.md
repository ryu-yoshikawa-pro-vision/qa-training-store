# PR #127 Negative Qualification blocker 調査・次回実装Plan

> Status: raw evidence調査完了、次回実装用Plan（このRunではsource/test/ADR変更、Qualification、Positive、canonicalを行わない）

対象Issue: #117 / 対象PR: #127 / 対象branch: `refactor/117-pr2-trigger-eval-baseline`

調査Run: `.codex/runs/20260911-010903-JST/`

## 0. 目的と今回の結論

### 0.1 目的

直近のNegative QualificationがFAILになった原因を、REPORTの要約ではなく保存済みraw Hook、stdout、meta、analysisから確定する。特に最初の`unreliable`、command全文、実際のread対象、canonical Skill treeとの非交差、安全な`safe_no_read`境界、`artifact_contract_gap`の妥当性を判断する。

### 0.2 結論

- Negative queryは固定queryを1回だけ実行し、process自体は正常終了した。
- 相関済み`PostToolUse`は1件だけで、そのordinal 0が最初の`unreliable`である。candidateも`safe_no_read`もその前には存在しない。
- commandは固定の`package.json`を1回だけ読むpackage-name取得式であり、canonical Skill treeへ拡張する変数、glob、recursive search、追加readerはない。
- 現行selectorは、既存の許可compoundと一致せず、`(`、`|`、`)`を拒否するbounded tokenizerのため`unreliable`となる。既存grammar内での認識漏れではない。
- 一般PowerShell／pipeline parserは不要であり、観測した固定token・固定path・固定operator・固定propertyだけをanchoredに検証する小さなbounded ruleは安全に計画できる。
- よって追加の実装Planを作成する。今回のRunではそのruleを実装せず、Qualificationも再実行しない。

## 1. ゴール / 完了条件

### 1.1 調査ゴール

- Negative raw evidenceのquery回数、lifecycle、Hook相関、parse状態を確定する。
- 相関済み`PostToolUse`を全件時系列化し、最初の`unreliable`を確定する。
- `tool_input_preview.command`をJSON decodeした完全なcommand shapeを記録する。
- commandの固定read対象と、canonical Skill／Trigger dataset／answer keyへの非交差を根拠付きで説明する。
- 既存negative exact compoundとの差分を、目的ではなくsyntaxと安全境界で説明する。
- `safe_no_read`化の可否、一般parserの要否、selector変更の要否、taxonomyを確定する。

### 1.2 次回実装PlanのDoD

- 実測shapeだけを受理するbounded ruleの全許可・拒否境界がdecision tableで固定されている。
- 既存exact compound、relative／absolute canonical recognition、candidate prefix、trusted absence、Result schema 2、timeoutを変更しない。
- nearby negative test、static validation、Qualification停止条件が実装者の追加判断なしに実行できる。

## 2. 現状理解と開始状態

### 2.1 開始確認

| 項目 | 結果 |
| --- | --- |
| branch | `refactor/117-pr2-trigger-eval-baseline` |
| working tree | clean |
| local HEAD / PR head | `75a30fb40a82dda92510f6bc712dbd0da609eeee` |
| `origin/main`（今回fetch後） | `13cc542fa31f372bd4bc932cf7a82b92bcf81a23` |
| PR #127 | OPEN、base `main`、head branch一致 |
| 直近実装Run | `.codex/runs/20260910-213441-JST/`（変更しない） |
| 今回Run | `.codex/runs/20260911-010903-JST/` |

### 2.2 既存契約

- `classifyCommand`は、最初に既存の固定compound `$pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name`だけを許可する。
- その後の`tokenizeBoundedCommand`は、一般shell構文を解釈せず、`(`、`)`、`|`、`;`、`$`等を含む入力を拒否する。
- 単一direct `Get-Content`は、相対pathの正規化またはTarget-aware absolute canonical path recognitionへ進む。
- 最初のtrusted canonical candidateより前に`unreliable`が出た場合、`selectInitialSkill`は全体をunobservableとして停止する。candidate後の不確実性を無視して後続を再評価する契約には変更しない。

## 3. Negative raw evidence

### 3.1 保存物とquery

直接確認したraw保存先は`.artifacts/trigger-eval-qualification-20260910-r3/negative/`である。確認できたファイルは次のとおりである。

| Evidence | 結果 |
| --- | --- |
| `hook-delta.jsonl` | 3 records（UserPromptSubmit、PostToolUse、Stop）、913 bytes |
| `analysis.json` | `hook_correlation_ok=true`、`hook_parse_ok=true`、`selector_reliable=false`、`initial_skill=null`、`observed_skills=null` |
| `meta.json` | exit 0、timeout/spawn/signaledなし、26.226秒、stdout 1,133 bytes、stderr 0 bytes |
| `stdout.jsonl` | `turn.completed`を含む正常なJSONL、command実行結果`scenario-shop` |
| `stderr.log` | 空 |
| `after-snapshot.json` | Hook pathとsizeを記録 |
| `before-snapshot.json` | このraw directoryには存在しない。command全文はHook deltaとTarget raw Hookに存在するためshape判定は可能 |

`meta.json`のqueryは次の固定queryと一致する。

```text
package.json に記載されている package name だけを確認して答えてください。
```

実行回数は1回であり、retry、query変更、Target交換、Qualification途中のselector変更はない。Targetは直近Runで作成したfresh Targetを継続使用し、Routing SHAは`55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、Evaluator SHAは`437221542d9b8140e2a80936935e70c13fc5b09d`、Codexは`codex-cli 0.153.4`である。

### 3.2 process lifecycle / Hook相関

- `trusted_terminal`: `turn.completed`
- `exit_code`: `0`
- `timed_out`: `false`
- `spawn_failed`: `false`
- `signaled`: `false`
- `hook_correlation_ok`: `true`
- `hook_parse_ok`: `true`
- `selector_reliable`: `false`
- `initial_skill`: `null`
- `observed_skills`: `null`

したがって、process failureやHook欠落がNegative FAILの原因ではない。正常なprocessが、現在のbounded observation contract外のcommand representationを出したことが原因である。

## 4. PostToolUse時系列

`PostToolUse` ordinalはPostToolUse内の0始まりである。HookにはUserPromptSubmit、次のPostToolUse、Stopの順で記録されている。

| ordinal | tool | truncated | command概要 | 現行分類 | 判定理由 |
| ---: | --- | ---: | --- | --- | --- |
| 0 | Bash | false | `((Get-Content -Raw -LiteralPath 'package.json') \| ConvertFrom-Json).name` | `unreliable` | 既存fixed compoundに一致せず、bounded tokenizerが`(`、`|`、`)`を拒否 |

必須位置の判定:

- 最初のPostToolUse: ordinal 0
- 最初の`safe_no_read`: なし
- 最初のcanonical Skill候補: なし
- 最初の`unreliable`: ordinal 0
- selector停止event: ordinal 0
- terminal: `turn.completed`（Stop eventではなくstdout lifecycle）

### 4.1 最初のUnreliable Eventの完全shape

raw `tool_input_preview`は次のJSONであり、`command`をdecodeした完全な文字列は次のとおりである。

```json
{"command":"((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name"}
```

```text
((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name
```

要素分解:

| 要素 | 実測 |
| --- | --- |
| command | `Get-Content`を内側に1回含むparenthesized expression |
| options | `-Raw`、`-LiteralPath` |
| path | single-quoted固定相対path `package.json` |
| quote / slash | single quote、slashなしのWindows相対literal |
| assignment / variable | なし |
| grouping | `(( ... ) | ConvertFrom-Json).name` |
| pipe | `Get-Content`から`ConvertFrom-Json`への1本 |
| semicolon / if / foreach / redirection / subexpression | なし |
| extra reader | なし |
| truncated | `false` |

現行selectorでは、既存の`APPROVED_PACKAGE_NAME_COMPOUND`が要求する先頭`$pkg =`、末尾`; $pkg.name`、path表記`.\package.json`を持たないため一致しない。一致判定後に進む`tokenizeBoundedCommand`も、先頭の`(`、途中の`|`、末尾の`)`を許可しないためparse不能となる。

## 5. commandの実際の意味と非交差

### 5.1 実行内容

commandは、Routing Targetの作業rootにある`package.json`を`Get-Content -Raw -LiteralPath`で1回読み、`ConvertFrom-Json`へ渡し、JSONの`.name`だけを出力するread expressionである。list、git、search、recursive traversal、複数file readではない。stdoutの`scenario-shop`はこの処理結果と整合するが、意味の一致だけを安全性の根拠にはしない。

### 5.2 canonical Skill treeとの非交差

この具体的なshapeについては、次の理由でcanonical Skill direct readを含まないことを証明できる。

- readerは固定された`Get-Content` 1回だけである。
- pathは固定literal `'package.json'`で、`.agents/skills/<skill>/SKILL.md`ではない。
- variable、glob、`..`、absolute path、path interpolationがない。
- `ConvertFrom-Json`はreaderではなく、直前の一つのJSON値を変換する固定commandである。
- recursive search、directory listing、追加pipeline、追加readerがない。
- Trigger Eval datasetの`.agents/skills/<skill>/evals/trigger/**`、answer key、canonical Skill treeをpathとして参照しない。

従って、固定shapeを全体一致で受理する場合に限り、`safe_no_read`（canonical Skill direct readの不在を証明できた状態）へ昇格できる。ただし「package nameを得る目的が同じ」だけでは昇格しない。

## 6. 既存Negative exact compoundとの差分

| 観点 | 既存許可shape | 今回の実測shape |
| --- | --- | --- |
| variable / expression | `$pkg = ...; $pkg.name` | variableなし、expression末尾`.name` |
| grouping | なし | `(( ... ) | ConvertFrom-Json).name` |
| path | `.\package.json`の固定literal | `'package.json'`の固定literal |
| reader / option | `Get-Content -Raw -LiteralPath` | 同じ |
| converter | `ConvertFrom-Json` | 同じ |
| extra reader | なし | なし |
| operator | 1本のpipeと固定semicolon | 1本のpipe、semicolonなし |
| current result | `safe_no_read` / reliable | `unreliable` / selector停止 |

両者は同じpackage-name dataflowを持つが、今回のshapeは既存exact compoundの「option順だけ」「quoteだけ」の変形ではない。固定pathと固定readerを維持した別のparenthesized pipeline representationであるため、既存契約が自動的に受理するとは扱わない。

## 7. 設計判断

### 7.1 選択肢比較

| 案 | 判断 | 理由 |
| --- | --- | --- |
| 既存bounded grammar内でそのまま受理 | 不採用 | tokenizerがmetacharacterを意図的に拒否し、現行contract内の漏れではない |
| 一般PowerShell／shell／pipeline parser | 不採用 | 任意command、variable、path、operatorの解釈へ広がり、canonical readのfail-close境界を弱める |
| 固定shape用の小さなbounded rule | 採用Plan | reader 1回、固定path、固定converter、固定property、canonical非交差を全体一致で証明できる |
| safe_no_readへ無条件昇格／unreliable eventを無視 | 不採用 | trusted absenceとcandidate prefixを壊し、false passを作る |

### 7.2 `safe_no_read`許可／拒否decision table

次回実装では、generic tokenizerへmetacharacterを追加せず、`classifyCommand`の前段に固定tokenのanchored recognizerを置く。空白の許可はspace/tabだけとし、改行、先頭・末尾の任意文字、tokenの綴り変更は受理しない。

| command shape | classification | 理由 |
| --- | --- | --- |
| `((Get-Content -Raw -LiteralPath 'package.json') \| ConvertFrom-Json).name` | `safe_no_read` | 今回の完全実測shape。固定path、reader、converter、property、1本のpipeのみ |
| 上記の固定token間に限定されたspace/tabだけを置く形 | `safe_no_read` | 同一bounded grammarの空白変形として明示許可 |
| 既存の`$pkg = Get-Content ...; $pkg.name` | `safe_no_read` | 既存契約を維持 |
| reader pathをcanonical `SKILL.md`、別file、absolute、variable、glob、`..`へ変更 | `unreliable` | pathの実体または範囲を固定証明できない |
| `-Raw`、`-LiteralPath`、`ConvertFrom-Json`、`.name`の変更・省略 | `unreliable` | 固定read expressionの証明が崩れる |
| reader追加、追加pipe、semicolon、`&&`、redirection、subexpression、if/foreach | `unreliable` | 単一の固定read expressionを超える |
| extra grouping、別quote、別case、suffix/prefix追加 | `unreliable` | 観測していないsyntaxを推測受理しない |
| truncatedまたはmalformed `tool_input_preview` | `unreliable` | 完全shapeが不明またはdecode不能 |

このruleは「全filesystem readがない」を意味せず、canonical Skill direct readの不在だけを証明する。Target-aware absolute canonical recognition、relative recognition、candidate prefix、trusted absenceの外側の契約は変更しない。

## 8. 次回実装の変更範囲

### 8.1 変更対象

- `scripts/evals/run-skill-trigger-evals.ts`
  - 固定package-name parenthesized expressionのbounded recognizerを追加する。
  - `classifyCommand`の既存exact compound判定とgeneric tokenizerの間で全体一致させる。
  - Target context threading、absolute canonical path recognition、`realpathOrFail`の用途は変更しない。
- `tests/repository-contract/skill-trigger-evals.test.ts`
  - 実測shapeの`safe_no_read`受理を追加する。
  - bounded whitespaceの受理を追加する場合はspace/tabのみを確認する。
  - canonical path差替え、任意／variable path、extra reader、extra pipe／semicolon、別converter/property、grouping、truncated、malformedを`unreliable`として確認する。
  - trusted absence、candidate前のunreliable、既存exact compound、absolute canonical、relative、schema／lifecycle回帰を維持する。
- `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`
  - 実装とvalidationが完了した後、今回の固定expressionと拒否境界を追補する。

### 8.2 変更しないもの

`scripts/evals/skill-trigger-evals.ts`、dataset、query、`expected_skill`、`boundary`、Skill source／description、Hook、timeout、dependency、Product code、AGENTS、PROJECT_CONTEXT、history、Result evaluator、canonical allの実行条件は変更しない。今回の調査Runでもsource、test、ADR、living documentationは変更しない。

## 9. 次回Runtime Qualificationの順序と停止条件

次回実装Runでは、次の順序を崩さない。

```text
実装
↓
focused contract test
↓
dataset / Skill / Markdown / Prettier / diff / verify
↓
Evaluator SHA固定
↓
fresh independent Routing Target
↓
Target preflight
↓
Negative Qualification 1回
↓（Negative PASS時のみ）
Positive Qualification 1回
↓（両方PASS時のみ）
Environment Qualification PASS
↓
same Targetでcanonical all 1回
```

- Negativeが今回と異なる未承認shapeを返した場合は、そのraw evidenceを保存してFAIL停止する。
- Negative FAIL後にselectorを追加変更、retry、query tuning、Target交換、Positive、canonicalを行わない。
- Negative PASS時だけPositiveへ進み、Positive FAILならcanonicalへ進まない。
- canonicalはNegative／Positive両方PASS後だけ実行し、24/24、8/8、Result schema 2、provenance、valid baselineを独立に確認する。

## 10. Taxonomy判断

今回のruntime blockerは、exit 0・`turn.completed`・Hook correlation/parse PASSにもかかわらず、Hostが出力した固定read representationをselectorが観測できずtrusted absenceを判定できなかったことである。既存分類の`flaky_or_env_issue`へ根拠なく戻さず、Host representationとbounded observation contractの不一致として`artifact_contract_gap`を維持する。

補足として、raw directoryには`before-snapshot.json`がない。しかしcommand全文はTarget raw Hook、`hook-delta.jsonl`、`stdout.jsonl`、`meta.json`に存在し、今回のFAIL原因を特定する証拠は揃っている。この補足欠落をruntime failureやQualification PASSの根拠に混同しない。次回Runではbefore/after snapshotの存在をRun preflightの成果物確認に含める。

## 11. Plan-only検証計画

今回のRunで実行するのは、作成したPlanとRun Artifactの静的整合性確認だけである。

- `pnpm run lint:markdown`
- Plan／Run ArtifactのPrettier check
- `git diff --check`
- `.codex/templates/evaluation.schema.json`による`evaluation.json`検証
- `scripts/sanitize-codex-artifacts.ps1`のWrite／Check
- strict collector
- source／test／ADR／dataset／query／Skill／Hook／timeoutの差分確認

今回実行しないものはfocused test、`pnpm run verify`、Qualification、Positive、canonical、retry、selector trialである。

## 12. Risks / Unknowns

- Hostが次回別のshapeを出す可能性があるため、このPlanは未観測syntaxを先回りして許可せず、1回のNegativeで停止する。
- 固定recognizerをgeneric tokenizerへ混ぜると、将来の任意pipelineを誤って受理する可能性があるため、前段のanchored全体一致に閉じる。
- `package.json`が非canonicalであることはpath literalから証明できるが、`safe_no_read`は全filesystem read不存在の証明ではない。意味を拡張しない。
- before snapshotの欠落は補足的なartifact品質リスクである。今回のshape判定に必要なraw commandは存在するため、追加runtimeや推測で補完しない。

## 13. Thinking Log

- 2026-09-11 01:09 JST: `git fetch origin`後のPR/branch/HEADを確認し、直近RunとPRの実行状態を変更せず新しいinvestigation Runを初期化した。
- 2026-09-11 01:10 JST: Target raw Hookを直接確認し、PostToolUseが1件だけであること、固定query、正常lifecycle、完全commandを確認した。
- 2026-09-11 01:11 JST: 現行sourceのexact compound判定とmetacharacter拒否tokenizerを照合し、ordinal 0でselectorが停止する因果を確定した。
- 2026-09-11 01:12 JST: 一般parserを不採用とし、固定path・固定reader・固定converter・固定propertyを全体一致するbounded ruleだけを次回実装Planへ落とす判断をした。
