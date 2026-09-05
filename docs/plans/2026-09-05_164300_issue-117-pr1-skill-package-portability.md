# Issue #117 PR1 — Portable Skill Packaging and Routing Cleanup

## 0. 依頼概要

- 依頼内容: Issue #117 の PR1 として、6つの Agent Skill を自己完結性・Portability の高い package へ整理し、Repository root の Agent 文書・reference との責務重複を解消する。
- 背景: 現在は Skill 固有 workflow の一部が `SKILL.md`、root Agent 文書、`docs/reference/`、Native runbook 等に分散し、いくつかの Skill は Repository 固定 path の文書を workflow の必須読込先としている。
- PR1 の役割: 後続の Trigger Eval / description optimization / Output Eval / Workflow E2E Eval の前提として、Skill package の構造・依存方向・routing・最低限の機械検証を整える。
- 期待成果: 既存 Skill の実行意味論を変えず、Skill 固有 workflow は package 単体から理解できる。Repository 固有 policy / Product Contract / command / path は logical external input として root 側から対応づけ、Skill package 自身は root 固定 path を workflow の正本として要求しない。

## 1. ゴール / 完了条件

### ゴール

以下の6 Skillを、既存の実行意味論を維持したまま portable な package へ整理する。

- `.agents/skills/android-native-local-validation`
- `.agents/skills/code-review`
- `.agents/skills/exploratory-qa`
- `.agents/skills/feature-plan`
- `.agents/skills/harness-improvement`
- `.agents/skills/repair-loop`

PR1で完成させる Portability は **workflow / package content / package内部依存構造の Portability** とする。

frontmatter `description` には現状 `in this repository` や `Scenario Shop` 等の Repository 固有 wording が含まれる Skill があるが、PR2 Trigger Eval baseline を汚さないため PR1 では変更しない。frontmatter description の Portability / routing optimization は PR3 で扱う。

PR1完了時点では次を満たす。

- package 内だけで Skill 固有 workflow / decision / stop / output contract を理解できる。
- package 内から Repository root 固定 path を core workflow の正本として要求しない。
- Repository 固有の具体値は logical external input として分離されている。
- frontmatter `name` / `description` は baseline 保護のため意図的に現状維持されている。

### `SKILL.md` の完成形

各 `SKILL.md` は主に以下へ集中する。

- Purpose / When to use
- Do not use / Boundary（必要な場合）
- Inputs
- Outputs
- Required / Conditional package-local reference / asset の選択条件
- Execution outline
- 最上位 guardrail / stop boundary

詳細 workflow、長い checklist、command sequence、詳細 stop condition、Output meaning contract は、必要な場合だけ package-local `references/` へ置く。

再利用する静的 Output Template が既に存在し、その Template 自体が Skill 固有である場合だけ package-local `assets/` を正本にする。PR1で新しい Template を発明したり、全 Skill に形式的な `assets/` / `scripts/` / `evals/` を作ったりしない。

### 完了条件（DoD）

- [ ] 6 Skill の Skill 固有 workflow を package 内だけで理解できる。
- [ ] 各 `SKILL.md` から必要な package-local reference / asset を追加判断なしで選べる。
- [ ] package 内 Markdown の machine-checked local file link は、resolve 後も必ず同一 Skill package 内である。
- [ ] Portable Skill workflow が `AGENTS.md` / `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` / `docs/reference/**` / `docs/native/**` 等の Repository 固定 path を必須正本として要求しない。
- [ ] Repository 固有 policy / Product Contract / command / path は logical external input として root 側から対応づけられている。
- [ ] `AGENTS.md` が repository-level task -> Skill routing / Repository Input mapping の SSOT である。
- [ ] `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` には Repository 固有 contract / policy / lifecycle が残り、portable Skill workflow の二重正本になっていない。
- [ ] `docs/reference/repair-loop.md` / `docs/reference/harness-improvement-loop.md` / `docs/reference/agentic-qa-workflow.md` 等を残す場合、package と同じ Skill 固有 workflow を二重保持していない。
- [ ] `docs/native/windows-android-local-validation.md` 等を残す場合、人間が実行する Repository runbook としての具体 command / version / setup / troubleshooting を維持しつつ、generic retry / stop / failure decision の正本にはなっていない。
- [ ] `feature-plan` の汎用 Plan Output Template は package-local asset が canonical である。
- [ ] `exploratory-qa` の Mode selection / Mode boundary は package-local workflow が canonical である。
- [ ] package structure / frontmatter / identity / local file link integrity を確認する最小 validator がある。
- [ ] Skill package 内の machine-checked local file link が package 外へ escape した場合、validator が FAIL する。
- [ ] Skill directory 名と frontmatter `name` が一致しない場合、validator が FAIL する。
- [ ] validator が local quality gate と既存 CI quality job から実行される。
- [ ] 6 Skill の frontmatter `name` / `description` が PR1 baseline と一致する。
- [ ] MUST / MUST NOT / stop condition / required output / evidence requirement / approval boundary に意図しない semantic change がない。
- [ ] PR2 以降の Trigger Eval / description optimization / Output Eval / Workflow E2E Eval を実装していない。

## 2. 現状理解と前提

### Current understanding

PR1 は **move / deduplication / responsibility separation / package integrity validation** が中心であり、Skill workflow の意味改善は行わない。

現在の Skill package は次の構成である。

```text
.agents/skills/code-review/
├── SKILL.md
└── references/review-workflow.md

.agents/skills/feature-plan/
├── SKILL.md
└── references/planning-workflow.md

.agents/skills/repair-loop/
├── SKILL.md
└── references/repair-workflow.md

.agents/skills/harness-improvement/
├── SKILL.md
└── references/improvement-workflow.md

.agents/skills/exploratory-qa/
└── SKILL.md

.agents/skills/android-native-local-validation/
└── SKILL.md
```

重要な Repository 側 entrypoint / reference は少なくとも以下。

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- `docs/plans/TEMPLATE.md`
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`
- `scripts/native/windows/android-local.ps1`
- `scripts/agentic-qa/**`

### `feature-plan`

`docs/plans/TEMPLATE.md` は Repository 固有の保存 path ではなく、Goal / Current understanding / Assumptions / Non-goals / Change strategy / Validation plan / Risks / Open questions 等からなる汎用 Plan Output Template である。

PR1では Template 本文を package-local `assets/plan-template.md` へ意味変更なしで移し、Skill 固有静的成果物の正本とする。

Repository 側に残すもの:

- Plan 保存先 `docs/plans/`
- filename convention
- active run / plan lifecycle
- Repository 固有の保存・履歴契約

Planning の mandatory question / blocking question / assumptions allowed 等の ambiguity handling は汎用 planning decision なので package-local `planning-workflow.md` を正本にする。

### `harness-improvement`

現行 package-local reference は `references/improvement-workflow.md`。

Candidate model / classification / strictness / evidence requirement / implementationとの分離 / review requirement 等の Skill 固有 workflow は package-local reference を正本にする。

`evaluation.md` / `failure-taxonomy.md` が複数 workflow 共通 contract なら Repository-side shared input として残す。

### `exploratory-qa`

現行 package は `SKILL.md` 1ファイルだけで、Normal / Gray-box / Black-box Scored の選択・実行境界、exploration workflow、evidence / finding、finalization 等を抱えている。

さらに `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` にも Mode selection、bootstrap、runtime exploration、evidence / findings、Scored boundary 等の Skill 固有 workflow が重複している。

PR1後は次へ固定する。

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md
```

- `workflow.md`: Normal / Gray-box の共通 workflow、bounded execution、risk / exploration、evidence / finding の高レベル契約、finalization / stop conditions
- `scored-mode.md`: Black-box Scored の selection、isolation、Fresh Session、trusted capability、forbidden boundary、stop conditions

`QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` に残すのは Scenario Shop 固有 integration / machine contract とする。

例:

- Normative BR / AC の Repository mapping
- `qa-charter.json` / challenge / finding の Repository-specific schema 関係
- artifact identity / benchmark identity
- `scripts/agentic-qa/**` の具体的 mapping
- Repository-specific scoring implementation / metric connection
- Scenario Shop 固有の artifact path / preparation harness integration

Mode selection / Normal-Gray-box exploration workflow / Scored isolation decision は Repository-side document の正本に残さない。

### `android-native-local-validation`

現行 Skill は **Windows + PowerShell + physical Android** を対象とする。主要実行入口は `scripts/native/windows/android-local.ps1`。

`docs/native/windows-android-local-validation.md` は人間がそのまま実行できる Repository runbook でもあるため、PR1で「重複排除」を理由に具体的な運用手順まで削りすぎない。

責務は次のように分ける。

Package側の正本:

- 各 validation phase の目的
- phase 間の entry / exit condition
- preflight の判断意味
- retry 可否の判断
- no-progress / stop condition
- failure classification の意味
- evidence / cleanup の要求
- physical device 前提
- unsafe / blocked 判断

Repository-side runbook / command側に残してよいもの:

- Doctor -> Prepare -> Build -> Install -> Smoke -> Test 等の具体的な実行例・command sequence
- Node / pnpm / Java / SDK / Maestro の具体 version
- `C:\Android\Sdk` / `C:\q` 等の Repository / environment 固有 path
- Android package ID / deep link scheme
- 具体的 `pnpm` / PowerShell invocation
- device serial / environment variable の具体例
- Scenario Shop 固有 setup / troubleshooting
- `scripts/native/windows/android-local.ps1` の具体 action / option

重要なのは、**同じ phase 名や具体 command 順が runbook と Skill reference の双方に現れること自体を禁止しないこと**。二重正本として禁止するのは retry / stop / failure / completion 等の判断ロジックである。

PR1で macOS / Homebrew / Emulator対応へ一般化しない。

### Root 文書の責務

`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` は単なる routing duplicate ではないため、短文化自体を目的にしない。

PR1後の代表的な Repository-side責務:

- `QA_AGENT.md`: Scenario Shop 固有 Machine Contract / artifact schema / Repository script mapping / scoring implementation
- `CODE_REVIEW.md`: Repository 固有 Coding Standards / 外部レビュー起動承認 / report file policy
- `PLANS.md`: Repository 固有 plan lifecycle / 保存 path / filename / active run connection

Root / repository reference に残さない Skill 固有責務:

- 汎用 review workflow / findings contract
- 汎用 planning ambiguity handling
- 汎用 QA Mode selection / exploration workflow / Scored isolation decision
- repair-loop 固有 stop / iteration workflow
- harness-improvement 固有 Candidate workflow
- Android local validation の generic retry / stop / failure decision semantics

### Existing quality gate

`pnpm run verify` は format / Markdown lint / spec validation / curriculum validation / lint / typecheck / image validation / security / test / build 等を含む重い総合 gate である。

Skill単位 migration ごとに full `verify` を回さない。migration中は targeted validator / validator test / Markdown lintを使い、最終総合判定は `pnpm run verify` 1回とする。

### Assumptions

- Issue #117 PR1 は6 Skill全件を対象とする。
- `name` / `description` の routing 性能改善は PR3 の責務であり、PR1では freeze する。
- Repository 固有 input / policy を package 外に残すこと自体は Portability 違反ではない。
- Package内で必要なのは external input の意味的な名前と必要条件であり、その Repository 固有 path を packageへ埋め込む必要はない。
- Repository側の具体 path / command mapping は既存 Markdown entrypoint で表現すれば十分である。
- package 構造は全 Skill を同一形状へ揃えない。
- validator は新規 dependency を追加せず、既存 TypeScript / `tsx` / `yaml` stack で小さく実装する。

### Adapter の定義

このPlanでいう `Repository adapter` / `input mapping` は、**既存または整理後の Repository Markdown 上で「この Skill input はこの Repository の文書 / command / contract」と対応づけること**を意味する。

PR1で以下を新設しない。

- `adapter.yaml`
- `skill-inputs.json`
- input resolver
- runtime injection mechanism
- adapter schema
- adapter interface / framework
- 独自 Agent Runtime

### Non-goals

- Issue #117 PR2以降
- Trigger Eval baseline
- `description` optimization
- Deterministic Output Eval
- Semantic Output Eval
- Workflow E2E Eval
- QA / code review / planning / repair / harness policy の意味改善
- `exploratory-qa` の対象選定・evidence semantics・Scored Mode の再設計
- Android の対象 OS / device policy / command behavior変更
- macOS / Homebrew / Emulator対応
- `scripts/native/windows/android-local.ps1` の置換・再実装
- 新しい PowerShell wrapper
- 新しい Agent framework / runner / workflow engine / adapter framework
- Repository 全 Markdown を対象にした汎用 link checker
- Git diff / merge-base / CI event を解析する Skill validator
- CI jobの再設計・統廃合
- dependency更新
- product code / Web / Native UI / Typesense / search / release smoke変更
- Skill品質を行数で判定するlint
- 全Skillに形式だけの `assets/` / `scripts/` / `evals/` を作ること
- PR1で新規 Output Template を発明すること

## 3. 質問 / 曖昧性

### 実装開始を止める未決定事項

現時点ではなし。

実装中に以下が発生した場合は勝手に意味を決めず停止する。

- 旧文書同士で MUST / MUST NOT / stop condition が矛盾している。
- どちらを canonical にするかで runtime behavior が変わる。
- Repository 固有 policy か portable Skill workflow かを分類すると behavior が変わる。
- root 固定 path 依存を除くために既存 workflow の意味変更が必要になる。
- `description` を変えないと package 化できない。
- Android の既存 Windows contract を変更しないと整理できない。
- `docs/plans/TEMPLATE.md` を pointer 化すると既知 consumer が壊れ、単純な compatibility 維持ができない。
- `docs/reference/agentic-qa-workflow.md` / native runbook の内容に、packageへ移すと Repository 固有 contract を失う境界不明点がある。

### 仮定してよい細部

- validator script / test の具体ファイル名
- compatibility pointer の具体文言
- Markdown link 表記の軽微な formatting
- root docs の見出し順の整理

### 仮定してはいけない事項

- `feature-plan` Template の正本位置: package-local asset
- `exploratory-qa` reference数: `workflow.md` / `scored-mode.md` の2つ
- planning ambiguity handling の正本: package-local `planning-workflow.md`
- portable Skill から root 固定 path を必須正本にしないこと
- package 内 machine-checked local file link を package 外へ escape させないこと
- `name` / `description` を PR1で変更しないこと
- Android runbook の具体的な実行手順を、単なる重複を理由に削除しないこと

## 4. 影響範囲

### Skill packages

- `.agents/skills/android-native-local-validation/**`
- `.agents/skills/code-review/**`
- `.agents/skills/exploratory-qa/**`
- `.agents/skills/feature-plan/**`
- `.agents/skills/harness-improvement/**`
- `.agents/skills/repair-loop/**`

### Root routing / Repository adapters

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`

### Existing repository references / compatibility entrypoints

- `docs/plans/TEMPLATE.md`
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`

### Repository commands / harness mapping

- `scripts/native/windows/android-local.ps1`
- `scripts/agentic-qa/**`

上記 scripts は基本的に確認対象であり、Portabilityだけを理由に移動・複製・再実装しない。

### Validation / CI

- `package.json`
- Skill validator script
- validator test
- `.github/workflows/ci.yml`

## 5. 変更方針

### 設計原則

#### 1. Dependency direction を一方向にする

```text
Repository routing / adapter
  ├─ task -> Skill route
  ├─ Repository policy mapping
  ├─ Product Contract mapping
  └─ Repository command / capability mapping
          ↓
Skill package
  ├─ SKILL.md
  ├─ package-local references
  └─ package-local assets / scripts（必要な場合のみ）
```

禁止する detailed source-of-truth cycle:

```text
AGENTS.md
  -> SKILL.md
  -> CODE_REVIEW.md / PLANS.md / QA_AGENT.md / docs/reference/**
  -> package-local reference
```

Skill側は次のような logical external input を要求してよい。

- repository coding policy
- product normative specification
- QA machine contract
- runtime command / capability
- plan storage convention
- shared evaluation / taxonomy contract

具体 path / command は Repository-side mapping が担当する。

#### 2. Package-local link boundary を固定する

`.agents/skills/<skill>/**` 内で machine-check 対象として記述する local file link は、resolve 後も **必ず** 同じ `.agents/skills/<skill>/` 配下でなければならない。例外を設けない。

PASS例:

```md
- [Workflow](references/workflow.md)
- [Plan Template](assets/plan-template.md)
```

FAIL例:

```md
- [Repository Policy](../../../CODE_REVIEW.md)
- [Repository QA Contract](../../../QA_AGENT.md)
```

Repository固有情報は package外linkではなく logical external input として表現する。

#### 3. Machine-check する Markdown syntax を限定する

validator が machine-check する file link は、**通常の inline Markdown link + plain relative path** に限定する。

対象:

```md
[Workflow](references/workflow.md)
[Plan Template](assets/plan-template.md)
```

対象外:

- external URL (`https://...` 等)
- anchor-only link (`#section`)
- query / fragment を含む target (`foo.md#section`, `foo.md?raw=1`)
- reference-style link
- image syntax
- prose / backtick / fenced code 内の path

Machine-check が必要な package内 reference / asset / route / compatibility pointer は、この inline relative link 形式へ寄せる。

Target file の拡張子は問わない。`.md` / `.json` / `.yaml` / `.ts` / `.sh` / `.ps1` 等を同じ存在確認で扱う。

Markdown AST framework は導入しない。必要な syntax が限定されているため、最小の抽出処理で十分とする。

#### 4. Package内の埋め込みRepository bindingも inventoryする

確認対象は Markdown link だけではない。

- `AGENTS.md` / `PLANS.md` / `QA_AGENT.md` 等の固定 path
- `docs/**` / `.codex/**` / `scripts/**` の Repository 固有 path
- Repository 固有 artifact directory
- Repository 固有 command
- Scenario Shop 固有 package / route / identifier
- Repository 固有 enum / output destination

これらを機械lintする新ツールは作らない。migration matrix で分類する。

#### 5. `SKILL.md` は薄くするが短文化を目的にしない

追加判断なしで以下が分かればよい。

- trigger / exclusion
- required inputs
- expected outputs
- package-local reading order
- top-level guardrail / stop boundary

小さいSkillは無理にreferenceを増やさない。

#### 6. Directory shape を揃えない

```text
.agents/skills/<skill>/
├── SKILL.md
├── references/   # 必要時のみ
├── assets/       # 既存 reusable static asset がある場合のみ
└── scripts/      # Skill専用 deterministic processing が本当に必要な場合のみ
```

shared utility を Portability のためだけに複製しない。

#### 7. PR1では frontmatter routing behaviorを変えない

6 Skill の `name` / `description` を freeze する。

`description`に Repository固有 wording が残っても、PR2 baseline / PR3 optimization のため意図的に維持する。

#### 8. `AGENTS.md` は routing / input mapping に集中する

置くもの:

- task type
- Skill name / entrypoint link
- high-level selection / exclusion
- Repository固有 input / policy / command mapping

置かないもの:

- Skill detailed workflow
- package layout specification
- long checklist
- Skill stop condition詳細

#### 9. Root文書は短くするのではなく重複をなくす

Repository固有 contract / policy / lifecycle は残す。

portable Skill workflow は package-local canonical にする。

### Skill別 migration 方針

#### `code-review`

対象:

```text
.agents/skills/code-review/SKILL.md
.agents/skills/code-review/references/review-workflow.md
CODE_REVIEW.md
AGENTS.md
```

方針:

1. generic review workflow / findings contract / review ordering は `review-workflow.md` を canonical にする。
2. `CODE_REVIEW.md` の Repository固有 Coding Standards / external review approval / report policy は残す。
3. `SKILL.md` は logical external input として repository coding policy を要求できるが、`CODE_REVIEW.md` 固定pathを必須読込しない。
4. packageに新規 reference / asset / script を追加しない。
5. code-review migration内で `CODE_REVIEW.md` の重複削除と `AGENTS.md` mapping更新まで完了する。

#### `feature-plan`

PR1後:

```text
.agents/skills/feature-plan/
├── SKILL.md
├── references/
│   └── planning-workflow.md
└── assets/
    └── plan-template.md
```

方針:

1. generic planning workflow / ambiguity handling は `planning-workflow.md` を canonical にする。
2. `docs/plans/TEMPLATE.md` の既存本文を `assets/plan-template.md` へ意味変更なしで移す。
3. `docs/plans/TEMPLATE.md` を残す必要がある場合は package asset への compatibility pointer とし、本文を二重保持しない。
4. `PLANS.md` には Repository固有 plan lifecycle / save path / filename / active run contractだけ残す。
5. `SKILL.md` は plan-save-before-implementation boundary を維持する。
6. package自体は `docs/plans/` 固定pathを workflow正本にしない。
7. feature-plan migration内で `PLANS.md` / `docs/plans/TEMPLATE.md` / `AGENTS.md` まで整理する。

#### `repair-loop`

方針:

1. bounded loop / finding triage / iteration contract / repeated failure / max iteration / stop / unsafe / scope 等の repair-loop固有 detail は package-local referenceへ集約する。
2. `docs/reference/repair-loop.md` に残すのは複数workflowで共有する Repository-side artifact / scope / evaluation integration 等だけとする。
3. 同じ detailed procedure を二重保持しない。
4. package側は Repository-specific `evaluation.json` path / report path / sanitizer command 等を固定pathとして workflow正本にせず、必要なら logical external input とする。
5. 新しい repair runner / automatic loop / script を追加しない。
6. repair-loop migration内で repository reference / `AGENTS.md` mappingまで整理する。

#### `harness-improvement`

方針:

1. Candidate model / classification / strictness / evidence / separation / review requirement は package-local reference を canonical にする。
2. `evaluation.md` / `failure-taxonomy.md` が shared contractなら Repository-side inputとして残す。
3. `improvement-workflow.md` 内に埋め込まれた `.codex/**` / root docs / scripts 等のRepository-specific target値を inventory し、Skill workflow本体と分離する。
4. `SKILL.md` から repository-side docs を core workflow正本として必須読込しない。
5. 新規 policy / script / schema を追加しない。
6. harness-improvement migration内で repository reference / `AGENTS.md` mappingまで整理する。

#### `exploratory-qa`

PR1後:

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md
```

方針:

1. `workflow.md` に Normal / Gray-box 共通workflow、risk analysis、bounded exploration、evidence / finding high-level contract、finalization / stop を移す。
2. `scored-mode.md` に Black-box Scored selection / isolation / Fresh Session / trusted capability / forbidden boundary / stop を移す。
3. Mode selection / Mode boundary を `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` の独立正本として残さない。
4. `docs/reference/agentic-qa-workflow.md` は必要なら Scenario Shop integration guide として残してよいが、portable exploration workflow を二重定義しない。
5. `QA_AGENT.md` に Scenario Shop固有 Machine Contract / schema / artifact identity / script mapping / scoring implementationを残す。
6. `scripts/agentic-qa/**` を移動・複製・再実装しない。
7. Product Specification / QA Machine Contract / runtime capability / artifact storage 等は logical external input として扱う。
8. referenceは2つより細分化しない。新しいassetを作らない。
9. exploratory-qa migration内で `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` / `AGENTS.md` まで整理する。

#### `android-native-local-validation`

PR1後:

```text
.agents/skills/android-native-local-validation/
├── SKILL.md
└── references/
    └── windows-android-workflow.md
```

方針:

1. Windows + PowerShell + physical Android contract を維持する。
2. package reference に phase の目的 / entry-exit condition / retry decision / no-progress / stop / failure classification / completion / evidence / cleanup semantics を置く。
3. native runbook の具体的な command sequence、step-by-step 実行例、version / path / package ID / device serial / environment variable / Scenario Shop-specific setup・troubleshooting は維持してよい。
4. native runbook から削除・pointer化する対象は、packageと競合する **generic decision rule の二重正本** に限定する。具体的な運用手順まで短文化することを目的にしない。
5. `android-local.ps1` は Repository-specific command input の正本として維持し、packageへ複製しない。
6. package側は `scripts/native/windows/android-local.ps1` 等の固定pathを core workflow の必須linkとして持たない。
7. macOS / Homebrew / Emulator対応、新wrapper、新validatorを追加しない。
8. android migration内で native docs / `AGENTS.md` mappingまで整理する。

### Validator 方針

#### 目的

PR1で必要なのは、Skill package の identity と machine-checked local file link が壊れておらず、package内部参照が package外へ逃げていないことの機械検証である。

汎用 Markdown checker / semantic linter / routing parser / Git diff analyzer は作らない。

#### 固定対象

validator対象は Git diff で動的に決めず、次の固定集合とする。

常に対象:

- `.agents/skills/**/*.md`
- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`

存在する場合だけ対象:

- `docs/plans/TEMPLATE.md`
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`

この固定allowlist以外の Repository Markdown を汎用的に探索しない。Git diff / merge-base / event type / changed-files 判定を validator に持ち込まない。

#### 最小責務

validatorは次だけを行う。

1. `.agents/skills/*/` に `SKILL.md` が存在する。
2. `SKILL.md` frontmatter が parse できる。
3. `name` / `description` が存在し空でない。
4. Skill `name` が重複しない。
5. Skill directory 名と frontmatter `name` が一致する。
6. 対象 Markdown の machine-check 対象 inline relative file link の target が存在する。
7. Skill package内の machine-check 対象 link は resolve後も同一 Skill directory配下である。

これ以上の semantic validation を PR1 validator に追加しない。

#### Validator tests

最低限:

- valid package / internal link -> PASS
- missing `SKILL.md` -> FAIL
- invalid / missing frontmatter -> FAIL
- duplicate Skill name -> FAIL
- directory name / frontmatter name mismatch -> FAIL
- missing local file target -> FAIL
- package内linkのpackage外escape -> FAIL

さらに、external URL / anchor-only / backtick path / reference-style link 等の対象外syntaxを1ケース程度で確認してよい。大量fixtureは作らない。

### Quality gate

- `package.json` に `validate:skills` 相当の dedicated script を追加する。
- `pnpm run verify` から `validate:skills` が到達可能になるようにする。
- `.github/workflows/ci.yml` の既存 `style-quality` job に dedicated validator step を追加する。
- CIでfull `verify`を別途追加して既存lint/test/buildを二重実行しない。
- migration中は targeted validator / validator test / Markdown lint中心。
- 最終総合判定は `pnpm run verify` 1回とする。
- 最終 `verify` が失敗した場合だけ、`validate:skills` / `lint:markdown` 等を個別に再実行して切り分ける。

## 6. 実行タスク

### Phase 0 — Baseline migration matrix / dependency inventory

- [ ] 6 Skill の current `name` / `description` をbaselineとして記録する。
- [ ] `SKILL.md` / package references / root docs / repository references の重複を section単位で一覧化する。
- [ ] packageからroot固定pathへの必須依存を一覧化する。
- [ ] package内に埋め込まれた Repository-specific path / command / artifact destination / identifier を一覧化する。
- [ ] 各項目を `package-local canonical` / `logical external input` / `Repository-side shared contract` / `Repository-specific mapping or concrete value` に分類する。
- [ ] 各Skillの semantic invariant を記録する。
  - MUST / MUST NOT
  - trigger / exclusion
  - required inputs
  - required outputs
  - evidence requirement
  - approval boundary
  - stop condition
- [ ] 旧正本 -> 新正本の移設先を migration matrix で決める。

Migration matrixだけのために新しい `docs/**` を作らない。Implementation時の active `.codex/runs/<run_id>/PLAN.md` / `TASKS.md` 内 working checklist で管理する。

### Phase 1 — Minimal validator

- [ ] 既存 script / test conventionに合わせて validator配置を決める。
- [ ] package discovery / `SKILL.md` existence / frontmatter / duplicate name / directory-name一致を実装する。
- [ ] 固定allowlist対象の inline relative file target existence を実装する。
- [ ] package内 local link の same-skill-directory boundary を実装する。
- [ ] 最小 failure cases の test を追加する。
- [ ] routing parser / adapter schema / generic Markdown checker / Git diff analyzerへ拡張しない。

### Phase 2 — Skill-by-Skill migration

**1 Skillごとに package移設 -> 対応root/reference cleanup -> `AGENTS.md` mapping -> targeted validation -> semantic確認まで完了してから次Skillへ進む。**

#### 2.1 `code-review`

- [ ] package workflowを整理する。
- [ ] `CODE_REVIEW.md` から generic workflow重複を除く。
- [ ] Repository coding policy を external input として `AGENTS.md` でmappingする。
- [ ] package外必須linkを残さない。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

#### 2.2 `feature-plan`

- [ ] `planning-workflow.md` を generic workflow / ambiguity handling の canonical にする。
- [ ] `assets/plan-template.md` を作り、既存Template本文を意味変更なく移す。
- [ ] `docs/plans/TEMPLATE.md` の二重本文を除去する。
- [ ] `PLANS.md` を Repository lifecycle / storage contractへ限定する。
- [ ] `AGENTS.md` で plan storage convention をmappingする。
- [ ] plan-save-before-implementation boundaryを保持する。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

#### 2.3 `repair-loop`

- [ ] repair-loop固有 workflowを package-localへ集約する。
- [ ] `docs/reference/repair-loop.md` の重複を除く。
- [ ] shared artifact / evaluation / scope contractだけ Repository-side input として残す。
- [ ] `AGENTS.md` mappingを整理する。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

#### 2.4 `harness-improvement`

- [ ] Skill固有 Candidate / strictness / evidence workflowを package-local canonicalにする。
- [ ] `docs/reference/harness-improvement-loop.md` の重複を除く。
- [ ] shared evaluation / taxonomyだけ Repository-side inputとして残す。
- [ ] package内Repository-specific bindingをinventory結果に従って分離する。
- [ ] `AGENTS.md` mappingを整理する。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

#### 2.5 `exploratory-qa`

- [ ] `references/workflow.md` を作る。
- [ ] `references/scored-mode.md` を作る。
- [ ] Mode selection / boundaryをpackage-local canonicalにする。
- [ ] `QA_AGENT.md` から portable QA workflow重複を除く。
- [ ] `docs/reference/agentic-qa-workflow.md` から portable Mode / exploration workflow重複を除く。
- [ ] Scenario Shop-specific Machine Contract / schema / scripts / scoring mappingは Repository-sideに残す。
- [ ] `scripts/agentic-qa/**` を変更・複製しない。
- [ ] `AGENTS.md` input mappingを整理する。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

#### 2.6 `android-native-local-validation`

- [ ] `references/windows-android-workflow.md` を作る。
- [ ] generic retry / stop / failure / completion / evidence semanticsをpackage-local canonicalにする。
- [ ] native runbook の具体的 command sequence / step-by-step example / version / path / setup / troubleshooting は維持する。
- [ ] native runbookから削除するのは、packageと競合するgeneric decision ruleに限定する。
- [ ] `docs/native/windows-android-troubleshooting.md` も同じ責務境界で確認する。
- [ ] `scripts/native/windows/android-local.ps1` を Repository-specific command inputとして維持する。
- [ ] `AGENTS.md` input mappingを整理する。
- [ ] Windows + PowerShell + physical Android contractが変わっていないことを確認する。
- [ ] targeted validator / Markdown lint / semantic invariant確認を行う。

### 各Skillの完了条件

各Skillを次へ進める前に全部満たす。

- [ ] package内からSkill固有workflowを理解できる。
- [ ] package-local reference / asset選択が一意である。
- [ ] machine-checked package内local linkがpackage外へescapeしていない。
- [ ] package内に不必要なRepository固定path bindingが残っていない。
- [ ] 対応root/referenceに同じdetailed decision workflowの二重正本が残っていない。
- [ ] Repository-specific contract / concrete commandをpackageへ複製していない。
- [ ] `AGENTS.md` の当該Skill mappingが更新されている。
- [ ] `name` / `description` がbaselineと一致する。
- [ ] semantic invariantに意図しない変更がない。

### Phase 3 — Global routing / link normalization

Skill単位migration後、Repository全体の整合だけ確認する。

- [ ] `AGENTS.md` の6 Skill routingが一意である。
- [ ] machine-checkが必要なSkill entrypoint / compatibility pointerが inline relative Markdown link になっている。
- [ ] `AGENTS.md` にdetailed workflowが流入していない。
- [ ] root -> Skill -> root の detailed canonical cycleがない。
- [ ] validator固定allowlistのlocal linksがPASSする。
- [ ] package boundary validationが6 SkillすべてPASSする。

### Phase 4 — Gate integration / final verification

- [ ] `package.json` に dedicated Skill validation script を追加する。
- [ ] `pnpm run verify` から Skill validatorが到達可能になるようにする。
- [ ] `.github/workflows/ci.yml` の既存 `style-quality` job に dedicated validator stepを追加する。
- [ ] CIで既存 lint / test / buildを二重実行していないことを確認する。
- [ ] full `pnpm run verify` を最終総合gateとして1回実行する。
- [ ] `verify` 失敗時だけ必要な個別commandを再実行して原因を切り分ける。
- [ ] changed-files reviewで PR2以降 / product変更 / dependency変更が混ざっていないことを確認する。

## 7. 検証方法

### Migration中の Targeted checks

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

validator testは既存test conventionに合わせた最小commandで実行する。

### Validator tests

- valid package / internal link -> PASS
- missing `SKILL.md` -> FAIL
- invalid / missing frontmatter -> FAIL
- duplicate `name` -> FAIL
- directory name / frontmatter name mismatch -> FAIL
- missing local file target -> FAIL
- package内linkのpackage外escape -> FAIL

対象外syntaxのテストは必要最小限1ケース程度とする。

### Dependency-direction checks

6 Skillすべてで確認する。

- package単体で Skill workflow / decision / stop / output contract を理解できる。
- package内からroot固定pathをcore workflow正本として必須読込していない。
- external inputが意味的な名前で明示されている。
- `AGENTS.md` / Repository docsに現在Repositoryでの具体mappingがある。
- package内 machine-checked local file linkが同一Skill directory内へ解決される。
- root -> Skill -> root detailed source-of-truth cycleがない。

### Semantic preservation checks

migration matrixを使いbefore / afterを比較する。

- trigger / exclusion
- MUST / MUST NOT
- inputs
- outputs
- evidence requirements
- approval boundary
- stop conditions

重点確認:

- `feature-plan`: ambiguity handling / plan-save-before-implementation / Template項目
- `exploratory-qa`: Normal / Gray-box / Black-box Scored selection / boundary
- `repair-loop`: bounded iteration / repeated failure / unsafe / scope stop
- `harness-improvement`: auto-apply禁止 / strictness / evidence / review
- `android-native-local-validation`: Windows / PowerShell / physical Android / retry / stop / Git禁止条件

### Root responsibility checks

- `AGENTS.md` 以外に競合する task -> Skill routing hierarchyがない。
- `QA_AGENT.md` は Scenario Shop specific contractを保持するが Mode workflowの正本ではない。
- `docs/reference/agentic-qa-workflow.md` は Scenario Shop integrationを保持してよいが generic exploratory workflowの正本ではない。
- `CODE_REVIEW.md` は Repository-specific review policyを保持する。
- `PLANS.md` は Repository-specific lifecycle / storage contractを保持するが ambiguity handlingの正本ではない。
- `docs/plans/TEMPLATE.md` を残す場合はTemplate本文の二重正本ではない。
- `docs/reference/repair-loop.md` / `harness-improvement-loop.md` は packageと同じSkill workflowを二重保持しない。
- Native runbookは具体的な人間向け実行手順を保持しつつ、generic retry / stop / failure decisionの正本ではない。

### Final repository gate

最終総合判定は次の1コマンドだけとする。

```bash
pnpm run verify
```

PR1で `verify` に `validate:skills` を組み込むため、最終段階で `validate:skills` / `lint:markdown` を先に重複実行しない。`verify` が失敗したときだけ個別commandを再実行して原因を切り分ける。

product E2E / native runtime smoke をPR1の新規必須gateへ追加しない。

### 成功判定

- `pnpm run verify` PASS
- dedicated Skill validator / validator tests PASS
- 6 Skill semantic invariantに意図しない差分なし
- Skill directory名とfrontmatter `name` が一致
- package内部workflow / dependency structureがportable
- package内 machine-checked local linksにpackage escapeなし
- Repository-specific inputsはrootから一方向mapping
- detailed source-of-truth cycleなし
- `feature-plan` Templateはpackage-local canonical
- planning ambiguity handlingはpackage-local canonical
- `exploratory-qa` Mode selection / boundaryはpackage-local canonical
- `docs/reference/agentic-qa-workflow.md` はportable QA workflowの二重正本ではない
- Android runbookの具体的な実行性を維持しつつ、packageとgeneric decision ruleが二重正本になっていない
- AndroidはWindows contractのまま
- `name` / `description`はbaseline維持
- description portability / optimizationは意図的にPR3へ残る
- PR1外変更なし

## 8. リスクと対策

### 1. Semantic drift during relocation

**Risk:** 短文化の過程で stop / MUST / evidence requirement を落とす。

**Mitigation:** migration matrixでbefore / afterを確認し、短文化ではなく正本移設として扱う。

### 2. Skill migrationとroot cleanupを分離しすぎる

**Risk:** packageを移した後もrootに旧workflowが残り、実装途中で二重正本になる。

**Mitigation:** 1 Skillごとに package -> root/reference cleanup -> AGENTS mapping -> validationまで閉じてから次Skillへ進む。

### 3. Reverse root dependency

**Risk:** root重複を削ってもSkillからroot固定path必須読込が残る。

**Mitigation:** logical external input化し、package内 machine-checked linkのpackage boundaryをvalidatorで強制する。

### 4. Hidden Repository binding

**Risk:** Markdown link以外の prose / command / artifact pathにRepository-specific bindingが残る。

**Mitigation:** Phase 0でpackage内部bindingをinventoryする。これ専用の新lintは作らない。

### 5. Root document over-pruning

**Risk:** Repository固有contractまでpackageへ移してしまう。

**Mitigation:** packageへ移すのは別Repositoryでも必要なSkill判断。具体path / product contract / command / environment valueはRepository-sideに残す。

### 6. Android runbook over-pruning

**Risk:** 二重正本除去を理由に、既存runbookの具体的な実行順・command・troubleshootingまで削り、人間向け運用性を落とす。

**Mitigation:** packageへ移すのは generic retry / stop / failure / completion decision。runbookの具体 command sequence / step-by-step exampleは維持してよい。

### 7. `agentic-qa-workflow.md` が二重正本として残る

**Risk:** `exploratory-qa` referencesを新設しても既存referenceにMode / exploration workflowが残る。

**Mitigation:** exploratory-qa migrationの同一単位で `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` を整理する。

### 8. Over-packaging

**Risk:** 全Skillへ多数のreferences/assets/scriptsを追加する。

**Mitigation:** 新規package要素は原則 `feature-plan` asset、`exploratory-qa` 2 references、Android 1 referenceだけ。その他は既存構造を優先する。

### 9. Validator over-engineering

**Risk:** generic Markdown checker / AST framework / routing parser / Git diff parser / adapter frameworkへ膨張する。

**Mitigation:** fixed allowlist + frontmatter identity + inline relative file existence + package escape checkだけに限定する。

### 10. Routing baseline contamination

**Risk:** PR1でdescriptionを改善してPR2 baselineを壊す。

**Mitigation:** `name` / `description` freeze。workflow portabilityとmetadata portabilityを明確に分ける。

### 11. Template two sources of truth

**Risk:** package assetと`docs/plans/TEMPLATE.md`に同じ本文を残す。

**Mitigation:** package asset canonical。rootは削除可能なら削除、必要ならpointerだけ。

### 12. Adapter abstraction creep

**Risk:** logical external inputを口実に新しいschema / resolver / injection mechanismを作る。

**Mitigation:** adapterはMarkdown上のmappingに限定し、新実行機構をNon-goalにする。

## 9. 成果物 / 実装時判断ルール

### 変更ファイル候補

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- 6 Skill の `SKILL.md`
- 既存 package-local references
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`
- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`
- `docs/plans/TEMPLATE.md`（compatibility維持が必要な場合）
- `docs/reference/repair-loop.md`（shared contract / compatibilityが残る場合）
- `docs/reference/harness-improvement-loop.md`（shared contract / compatibilityが残る場合）
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`（責務重複がある場合）
- Skill validator script / test
- `package.json`
- `.github/workflows/ci.yml`

すべてを変更することが目的ではない。責務重複がないfileは不要に触らない。

### 付随ドキュメント

- migration matrix専用の新規durable documentは作らない。
- このPlan以外の新規reportは原則不要。
- README / curriculum / product specは本変更の理解に不可欠な場合だけ更新する。

### 実装順

1. current repository factを再確認する。
2. baseline / migration matrix / hidden Repository binding inventoryをactive run内に作る。
3. minimal validatorを完成させる。
4. `code-review` を package + root cleanup + AGENTS + validationまで完了する。
5. `feature-plan` を同様に完了する。
6. `repair-loop` を同様に完了する。
7. `harness-improvement` を同様に完了する。
8. `exploratory-qa` を `QA_AGENT.md` / `agentic-qa-workflow.md` cleanup込みで完了する。
9. Androidを native docs責務分離込みで完了する。ただし人間向けrunbookの具体手順は維持する。
10. global routing / fixed-allowlist link整合を確認する。
11. validatorを `package.json` / CIへ接続する。
12. full `pnpm run verify`を最終総合gateとして1回実行する。
13. changed-files / dependency direction / semantic preservationを最終レビューする。

### 配置判断ルール

迷った場合は次の順で判断する。

1. 別RepositoryへSkill packageだけ移しても必要な実行判断か？
   - Yes -> package-local。
2. このRepository固有のpath / Product Contract / command / environment valueか？
   - Yes -> Repository-side external input / mapping。
3. 複数Skillが共有するRepository-wide safety / artifact / taxonomy contractか？
   - Yes -> Repository-side shared input。
4. 再利用静的Output Templateそのものか？
   - Skill固有なら package `assets/`。
5. package内からpackage外fileへ直接linkしたくなったか？
   - 行わず logical external inputへ変換する。
6. Android runbookの具体command / step-by-step exampleか？
   - Repository-side runbookへ残してよい。generic decision ruleだけpackage canonicalにする。
7. 分類するとsemantic behaviorが変わるか？
   - 作業を止めて判断を分離する。

### 実装を広げないための最終ルール

実装中に次へ気づいてもPR1へ入れない。

- もっと汎用化できる
- policyを改善できる
- descriptionを良くできる
- 別OSにも対応できる
- Evalも追加できる
- adapter schemaを作ると綺麗になる
- runtime resolverを作ると自動化できる
- Markdown parserを一般化できる
- Git diff連動validatorにできる

これらは Issue #117 の後続PRまたは別Issueへ送る。

Rollbackはdocs / tooling構造変更としてPR単位でrevert可能とする。package移設途中の不完全な状態をmainへ入れない。
