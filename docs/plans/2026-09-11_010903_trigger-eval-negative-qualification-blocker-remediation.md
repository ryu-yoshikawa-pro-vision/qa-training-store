# PR #127 Negative Qualification blocker 次回実装Plan

> Status: raw evidence調査完了、実装前Plan。今回のRunではsource、test、ADR、Qualification、Positive、canonicalを変更・実行しない。

対象Issue: #117 / 対象PR: #127 / 対象branch: `refactor/117-pr2-trigger-eval-baseline`

調査Run: `.codex/runs/20260911-010903-JST/`

## 1. 目的と結論

直近Negative QualificationがFAILになった原因を、保存済みraw Hook、stdout、meta、analysisから確定し、必要な場合だけ次回実装のbounded selector境界を定義する。

結論は次のとおりである。

- 固定Negative queryは1回だけ実行され、exit 0、`turn.completed`、Hook correlation/parse PASSだった。process failureではない。
- 相関済み`PostToolUse`は1件だけで、ordinal 0が最初の`unreliable`である。`safe_no_read`もcanonical candidateもその前にはない。
- 完全commandは`((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name`である。固定`package.json`を1回読み、JSONの`.name`を返すexpressionであり、canonical Skill treeへ拡張する変数、glob、recursive search、追加readerはない。
- 現行selectorの既存exact compoundには一致せず、bounded tokenizerが`(`、`|`、`)`を拒否するため`unreliable`となった。既存grammar内の単純な認識漏れではない。
- 一般PowerShell／shell／pipeline parserは採用しない。固定token・固定path・固定reader・固定converter・固定propertyだけを全体一致する小さなbounded ruleを次回実装へ計画する。
- 今回のblocker分類は、正常なprocessでHost representationとbounded observation contractが不一致になった`artifact_contract_gap`を維持する。

## 2. 現状理解と前提

開始時の状態は、branch `refactor/117-pr2-trigger-eval-baseline`、working tree clean、local HEAD／PR head `75a30fb40a82dda92510f6bc712dbd0da609eeee`、PR OPEN、base `main`、head branch一致であった。今回の`git fetch origin`後の`origin/main`は`13cc542fa31f372bd4bc932cf7a82b92bcf81a23`であり、PR headの履歴記録とは分けて扱う。

直近のEvaluator SHAは`437221542d9b8140e2a80936935e70c13fc5b09d`、Routing Target SHAは`55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、Codexは`codex-cli 0.153.4`である。直近Run `.codex/runs/20260910-213441-JST/`は変更しない。

既存契約は次のとおりである。

- `$pkg = Get-Content -Raw -LiteralPath .\package.json | ConvertFrom-Json; $pkg.name`だけを既存の固定negative compoundとして`safe_no_read`へ受理する。
- generic `tokenizeBoundedCommand`は一般shell構文を解釈せず、`(`、`)`、`|`、`;`、`$`等を含む入力を拒否する。
- 最初のcandidateより前の`unreliable`でselectorは停止し、`selector_reliable=false`、`initial_skill=null`、`observed_skills=null`となる。後続eventを見て復元しない。

## 3. Raw evidenceとlifecycle

直接確認した保存先は`.artifacts/trigger-eval-qualification-20260910-r3/negative/`である。

| Evidence | 観測 |
| --- | --- |
| `hook-delta.jsonl` | UserPromptSubmit、PostToolUse、Stopの3 records、913 bytes |
| Target raw Hook | `<TARGET_ROOT>/.codex/logs/hooks-01a08b69-1a7f-7de0-b3ad-d37358f9eb5f.jsonl`に同じ3 records |
| `analysis.json` | correlation/parse `true`、selector reliable `false`、initial/observed `null` |
| `meta.json` | query一致、1回、exit 0、26.226秒、timeout/spawn/signaledなし |
| `stdout.jsonl` | `turn.completed`、command exit 0、出力`scenario-shop` |
| `stderr.log` | 空 |
| `after-snapshot.json` | Hook pathとsizeあり |
| `before-snapshot.json` | raw directoryには存在しない。command全文はraw Hookとdeltaに存在するため今回のshape判定は可能 |

固定queryは次のとおりである。

```text
package.json に記載されている package name だけを確認して答えてください。
```

query変更、retry、Target交換、Qualification途中のselector変更はなく、Negativeは1回だけである。

## 4. PostToolUse時系列と最初のunreliable

`PostToolUse` ordinalはPostToolUse内の0始まりである。

| ordinal | tool | truncated | command概要 | 現行分類 | 判定理由 |
| ---: | --- | ---: | --- | --- | --- |
| 0 | Bash | false | `((Get-Content -Raw -LiteralPath 'package.json') \| ConvertFrom-Json).name` | `unreliable` | 既存exact compound不一致。tokenizerが`(`、`|`、`)`を拒否 |

位置関係は以下で確定する。

- 最初のPostToolUse: ordinal 0
- 最初の`safe_no_read`: なし
- 最初のcanonical Skill candidate: なし
- 最初の`unreliable`: ordinal 0
- selector停止event: ordinal 0
- terminal: `turn.completed`（Stop eventではなくstdout lifecycle）

raw `tool_input_preview`のJSONと、JSON decode後の完全commandは次のとおりである。

```json
{"command":"((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name"}
```

```text
((Get-Content -Raw -LiteralPath 'package.json') | ConvertFrom-Json).name
```

shape分解:

| 要素 | 実測 |
| --- | --- |
| reader | `Get-Content` 1回 |
| options | `-Raw`、`-LiteralPath` |
| path | single-quoted固定相対literal `package.json` |
| grouping | `(( ... ) | ConvertFrom-Json).name` |
| pipe | 1本 |
| assignment / variable | なし |
| semicolon / if / foreach / redirection / subexpression | なし |
| extra reader | なし |
| truncated | `false` |

## 5. 実行意味とcanonical Skill tree非交差

commandはRouting Targetの`package.json`を固定literalで1回読み、`ConvertFrom-Json`で変換し、`.name`だけを返す。list、git、search、recursive traversal、複数file readではない。`ConvertFrom-Json`はfilesystem readerではない。

この具体的shapeでは、reader pathが`.agents/skills/<skill>/SKILL.md`ではなく固定`package.json`であり、variable、glob、`..`、absolute path、interpolation、recursive search、directory listing、追加readerがない。そのため、固定shapeを全体一致する場合だけcanonical Skill direct readの不在を証明できる。これは全filesystem read不存在の意味ではない。

Trigger Eval dataset、answer key、canonical Skill treeをcommand pathとして参照しないことも確認できる。なお、stdoutのpackage nameとquery目的が一致することだけを理由に受理してはいけない。

## 6. 既存exact compoundとの差分

| 観点 | 既存許可shape | 今回の実測shape |
| --- | --- | --- |
| variable / expression | `$pkg = ...; $pkg.name` | variableなし、末尾`.name` |
| grouping | なし | `(( ... ) | ConvertFrom-Json).name` |
| path | `.\package.json`の固定literal | `'package.json'`の固定literal |
| reader / option | `Get-Content -Raw -LiteralPath` | 同じ |
| converter | `ConvertFrom-Json` | 同じ |
| operator | pipe + fixed semicolon | pipeのみ |

同じdataflowでも、今回shapeはoption順やquoteだけの変形ではなく、別のparenthesized pipeline representationである。既存exact compoundの自動許可範囲には含めない。

## 7. 次回実装の設計

### 7.1 選択肢

| 案 | 判断 | 根拠 |
| --- | --- | --- |
| 既存bounded grammarでそのまま受理 | 不採用 | tokenizerがmetacharacterを意図的に拒否する |
| 一般PowerShell／shell／pipeline parser | 不採用 | 任意path、variable、operatorの解釈へ広がり、fail-closeを弱める |
| 固定shape用の小さなbounded rule | 採用 | 固定reader 1回、固定path、固定converter、固定property、canonical非交差を証明できる |
| unreliableを無視して後続eventを見る | 不採用 | candidate prefixとtrusted absenceを壊す |

### 7.2 許可shape

次回実装ではgeneric tokenizerへmetacharacterの一般対応を追加せず、`classifyCommand`で既存exact compound判定の後、generic tokenizerの前にanchored recognizerを置く。空白は固定token間のspace/tabだけを許可し、改行や任意prefix/suffixは許可しない。

| command shape | classification | 理由 |
| --- | --- | --- |
| `((Get-Content -Raw -LiteralPath 'package.json') \| ConvertFrom-Json).name` | `safe_no_read` | 今回の完全実測shape |
| 上記の固定token間に限定されたspace/tabだけを置く形 | `safe_no_read` | 同一bounded grammarの明示した空白差 |
| 既存`$pkg = ...; $pkg.name` | `safe_no_read` | 既存契約の維持 |

### 7.3 必ず拒否するshape

- canonical `SKILL.md`、別file、absolute、variable、glob、`..`へのpath変更。
- `-Raw`、`-LiteralPath`、`ConvertFrom-Json`、`.name`の変更・省略。
- reader追加、追加pipe、semicolon、`&&`、redirection、if、foreach、subexpression。
- extra grouping、別quote、別case、未観測suffix/prefix。
- truncatedまたはmalformed `tool_input_preview`。

### 7.4 変更対象と回帰

次回の変更対象は原則として次の3ファイルに限定する。

- `scripts/evals/run-skill-trigger-evals.ts`: 固定expressionの全体一致を追加する。absolute Target-aware recognition、`realpathOrFail`、candidate prefix、generic tokenizerの一般性は変更しない。
- `tests/repository-contract/skill-trigger-evals.test.ts`: 実測shape、space/tab境界、trusted absence、nearby negative、既存relative／absolute／compound／schema／lifecycleを検証する。
- `docs/adr/0023-trigger-eval-selector-and-query-execution-contract.md`: 実装・validation後に固定expressionと拒否境界を追補する。

変更しないものは`skill-trigger-evals.ts`、dataset、query、`expected_skill`、`boundary`、Skill、Hook、timeout、dependency、Product code、AGENTS、PROJECT_CONTEXT、history、Result evaluatorである。

必須nearby negative testは、canonical path差替え、任意／variable path、glob、追加reader、追加pipe／semicolon、別converter/property、extra grouping、truncated、malformedである。unreliableがcandidate前にある場合の停止も回帰させない。

## 8. 次回Runtime手順と停止条件

```text
実装
↓
focused contract test
↓
dataset / Skill / Markdown / Prettier / diff / verify
↓
Evaluator SHA固定
↓
fresh independent Target
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

- Negativeが今回と異なる未承認shapeを返した場合、raw evidenceを保存してFAIL停止する。
- Negative FAIL後のselector追加変更、retry、query tuning、Target交換、Positive、canonicalは禁止する。
- Positive FAIL時はcanonicalへ進まず、両方PASSした場合だけ24/24、8/8、schema 2、provenance、valid baselineを判定する。
- canonical後のaccuracyと8/8 observabilityを混同しない。

## 9. 今回のPlan-only境界と検証

このRunではPlanとRun Artifactだけを作成する。以下を実行する。

- `pnpm run lint:markdown`
- Plan／Run ArtifactのPrettier check
- `git diff --check`
- evaluation schema validation
- sanitizer Write／Check
- strict collector
- source／test／ADR／dataset／query／Skill／Hook／timeout差分確認

以下は実行しない。

- focused test、`pnpm run verify`
- Qualification、Positive、canonical、retry、selector trial

## 10. リスクとtaxonomy

固定ruleを広げすぎると、任意pipelineやpathを誤って`safe_no_read`へ昇格させる。anchored全体一致とnearby negativeで境界を固定する。

`artifact_contract_gap`は、正常なprocess lifecycleとHook相関が成立している一方、Hostのcommand representationを現在のobservation contractが信頼可能に分類できない今回の主因に適合する。`flaky_or_env_issue`へ戻す根拠はない。

raw directoryに`before-snapshot.json`がない点は補足的なartifact品質リスクとして記録する。ただし、Target raw Hook、delta、stdout、metaに完全commandが存在するため、今回のshape判断は可能であり、推測やruntime再実行で補完しない。

## 11. 完了条件

- raw evidence、最初のunreliable、完全command、read意味、canonical非交差、既存exactとの差分が記録されている。
- `safe_no_read`許可shapeと拒否shape、変更対象関数・test・ADR、回帰契約が確定している。
- source、test、ADR、dataset、query、Skill、Hook、timeout、dependencyが今回変更されていない。
- 次回のQualification順序と1回限りの停止条件が維持されている。
