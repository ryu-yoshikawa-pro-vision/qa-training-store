# Issue #117 PR1 — Portable Skill Packaging and Routing Cleanup

## 0. 依頼概要

- 依頼内容: Issue #117 の PR1 として、6つの Agent Skill を自己完結性・Portabilityの高い package へ整理し、Repository root の Agent 文書との責務重複を解消する。
- 背景: 現在は Skill 固有 workflow の一部が `SKILL.md`、root Agent 文書、`docs/reference/` に分散し、いくつかの Skill は Repository 固定 path の文書を workflow の必須読込先としている。Issue #117 全体では将来的に Trigger Eval / Output Eval / Workflow E2E Eval まで進めるが、PR1ではその前提となる package 構造・依存方向・routing・最低限の構造検証だけを整える。
- 期待成果: 既存 Skill の意味を変えず、Skill 固有 workflow は package 単体から理解できる。Repository 固有 policy / adapter / command / Product Contract は package の外部 Input として root 側から渡し、Skill package 自身は root 固定 path を workflow の正本として要求しない。参照切れと最低限の package 構造は deterministic validator で検出できる。

## 1. ゴール / 完了条件

### ゴール

Issue #117 の PR1 として、以下の 6 Skill を、**既存の実行意味論を維持したまま portable な package へ整理する**。

- `.agents/skills/exploratory-qa`
- `.agents/skills/code-review`
- `.agents/skills/feature-plan`
- `.agents/skills/repair-loop`
- `.agents/skills/harness-improvement`
- `.agents/skills/android-native-local-validation`

完了時には、各 `SKILL.md` が主に次へ集中していること。

- Purpose / When to use
- Do not use / Boundary（必要な Skill のみ）
- Inputs
- Outputs
- Required / Conditional package-local reference の選択条件
- 最上位 guardrail / stop boundary

詳細 workflow、長い checklist、command sequence、詳細 stop condition、Output meaning contract は、必要な場合だけ package-local `references/` へ移す。

再利用する静的 Output Template が既に存在し、その Template 自体が Skill 固有である場合は package-local `assets/` を正本にする。PR1で存在しない Template を新たに発明したり、全 Skill に形式的な `assets/` を作ったりしない。

Repository root 側では `AGENTS.md` を **task -> Skill routing と Repository Input mapping の Single Source of Truth** とする。`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` 等にある Repository 固有 policy / adapter / lifecycle は必要な範囲で残すが、portable Skill workflow は重複定義しない。

### 完了条件（DoD）

- [ ] 6 Skill の Skill 固有 workflow を package 内だけで理解できる。
- [ ] 各 `SKILL.md` から実行に必要な package-local reference / asset を一意に選べる。
- [ ] Portable Skill workflow が `AGENTS.md` / `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` 等の Repository 固定 path を必須正本として要求しない。
- [ ] Repository 固有 policy / Product Contract / command / path は、root routing / adapter 側から Skill の external input として対応づけられている。
- [ ] `AGENTS.md` が repository-level routing / input mapping の SSOT であり、他 root 文書が競合する routing hierarchy を持たない。
- [ ] `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` から Skill 固有 workflow の重複だけが除かれ、Repository 固有 contract / policy / adapter / lifecycle は必要な範囲で残っている。
- [ ] `repair-loop`、`harness-improvement` など package 外にも正本候補が存在する Skill は、Skill 固有部分と Repository 固有・共有部分の正本位置が一意になっている。
- [ ] `feature-plan` の汎用 Plan Output Template は package-local asset が canonical であり、Repository 側に同一本文の二重正本を残していない。
- [ ] `exploratory-qa` の Mode 選択・Mode 境界は package-local workflow にあり、Scenario Shop 固有 Machine Contract / artifact schema / script mapping は Repository adapter 側に残っている。
- [ ] 対象 Skill package と明示した routing / compatibility 文書の local Markdown link に dangling target がない。
- [ ] package structure / local-link integrity を確認する最小 validator がある。
- [ ] validator が local quality gate と既存 CI quality job から実行される。
- [ ] 6 Skill の frontmatter `name` / `description` を PR1 では原則変更していない。
- [ ] MUST / MUST NOT / stop condition / required output / evidence requirement / approval boundary に意図しない semantic change がない。
- [ ] PR2 以降の Trigger Eval / description optimization / Output Eval / Workflow E2E Eval を実装していない。

## 2. 現状理解と前提

### Current understanding

#### Issue #117 PR1 の責務

Issue #117 は最終的に以下まで扱う master issue だが、PR1 の主眼は package 構造整理である。

- Skill 自己完結化
- `SKILL.md` 薄型化
- `references/` / `assets/` / `scripts/` の責務整理
- routing / dependency direction 整理
- root Agent 文書の重複解消
- package structure / link validation

PR1 は **move / deduplication / responsibility separation** が中心であり、Skill workflow の意味改善は行わない。

#### 現在の各 Skill package

現時点で確認できている構成は以下。

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

重要な Repository 側 reference / entrypoint は少なくとも以下。

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

#### `feature-plan`

`docs/plans/TEMPLATE.md` は保存 path や Scenario Shop 固有値を埋め込んだ adapter ではなく、Goal / Current understanding / Assumptions / Non-goals / Change strategy / Validation plan / Risks / Open questions 等からなる汎用 Plan Output Template である。

このため PR1 では Template 本文を package-local `assets/plan-template.md` へ移し、Skill 固有静的成果物の正本とする。`docs/plans/TEMPLATE.md` を既存 entrypoint として残す必要がある場合は canonical asset への薄い compatibility pointer とし、同一 Template 本文を二重保持しない。

一方、次は Repository 固有 adapter として root 側へ残す。

- Plan 保存先 `docs/plans/`
- filename convention
- active run / plan lifecycle
- Repository 固有の保存・履歴契約

Planning の mandatory question / blocking question / assumptions allowed 等の ambiguity handling は汎用 planning decision であり、Repository adapter ではないため package-local `planning-workflow.md` を正本にする。

#### `harness-improvement`

現行 package-local reference は `references/improvement-workflow.md`。

現行 `SKILL.md` は package 外の以下も参照する。

- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`

PR1では「存在しない reference の復元」を行わない。package-local `improvement-workflow.md` と repository-side reference 群の責務重複を整理し、Candidate model / strictness / evidence / review behavior 等の Skill 固有 workflow は package-local を正本にする。

`evaluation.md` / `failure-taxonomy.md` が複数 workflow から使う共有 contract なら Repository-side shared input として残す。

#### `exploratory-qa`

現行 package は `SKILL.md` 1ファイルだけで、Normal / Gray-box / Black-box Scored の選択・実行境界、exploration workflow、evidence / finding、finalization 等を抱えている。

現在 package-local `references/` / `assets/` は存在しない。

PR1では次の2 referenceを新設する方針で固定する。

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md
```

- `workflow.md`: Normal / Gray-box の共通 workflow、bounded execution、evidence / finding の高レベル契約、finalization / stop conditions
- `scored-mode.md`: Black-box Scored の選択条件、isolation / trusted capability / Fresh Session / forbidden boundary / stop conditions

これ以上の reference / asset は、既存意味を移すために不可欠であることが確認できない限り増やさない。

`QA_AGENT.md` に残すのは Scenario Shop 固有 contract であり、Mode 選択ロジックそのものではない。例:

- Normative BR / AC の Repository mapping
- `qa-charter.json` / challenge / finding の Repository-specific schema関係
- artifact identity / benchmark identity
- Repository scripts の具体的 mapping
- Repository-specific scoring implementation / metric connection

#### `android-native-local-validation`

現行 Skill は **Windows + PowerShell + physical Android** を対象としている。

主要実行入口は Repository 側の以下。

```text
scripts/native/windows/android-local.ps1
```

現行の環境・実行前提は主に次。

- Windows
- PowerShell
- Node / pnpm
- Java 17
- Android SDK / ADB
- physical Android device
- Maestro

PR1で macOS / Homebrew 対応へ一般化しない。OS / command behavior の変更は Non-goal とする。

Portable Skill側は「host repositoryから supplied される Windows Android local validation command / native setup references」を external input として扱う。`scripts/native/windows/android-local.ps1` 等の具体 path の mapping は Repository側 routing / adapter に置き、Skill workflowの正本をその固定pathへ依存させない。

#### Root 文書の責務

`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` は単なる routing duplicate ではなく Repository 固有情報も持つ。ただし、現在重複している汎用 Skill workflow は package側へ寄せる。

PR1後に root 側へ残す責務の例:

- `QA_AGENT.md`: Scenario Shop 固有 Agentic QA Machine Contract / artifact / Repository script mapping / scoring implementation
- `CODE_REVIEW.md`: Repository 固有 Coding Standards / 外部レビュー起動承認 / report file policy
- `PLANS.md`: Repository 固有 plan lifecycle / 保存 path / filename / active run connection

次は root 側へ残さない。

- 汎用 review workflow / findings contract
- 汎用 planning ambiguity handling
- 汎用 QA Mode selection / Mode boundary
- repair-loop 固有 stop / iteration workflow
- harness-improvement 固有 Candidate workflow

#### Existing quality gate

`package.json` の `verify` は現在、format / Markdown lint / spec validation / curriculum validation / lint / typecheck / image validation / security / test / Web build / spec build まで含む重い総合 gate である。

PR1 の Skill 単位 migration ごとに full `pnpm run verify` を回す必要はない。targeted validator と Markdown lint を中心に進め、full `verify` は最終検証で実施する。

### Assumptions

- Issue #117 の PR1 は 6 Skill 全件を対象とする。
- `name` / `description` の routing 性能改善は PR3 の責務であり、PR1では原則 freeze する。
- Repository 固有 input / policy を package 外に残すこと自体は Portability 違反ではない。Skill 側で外部 Input の種類が明示され、Repository 固定 path の正本を必須にしなければよい。
- Repository側の具体 path / command mapping は `AGENTS.md` 等の routing / adapter が担当する。
- package 構造は全 Skill を同一ディレクトリ形状へ揃えることを目的にしない。必要な `references/` / `assets/` / `scripts/` だけを作る。
- 既存の汎用静的 Template は Skill package の `assets/` へ移してよいが、PR1で新しい Template を考案しない。
- validator は新規 dependency を追加せず、既存 TypeScript / `tsx` / `yaml` stack で小さく実装できる。

### Non-goals

- Issue #117 PR2 以降の変更
- Trigger Eval baseline
- `description` optimization
- Deterministic Output Eval
- Semantic Output Eval
- Workflow E2E Eval
- QA / code review / planning / repair / harness policy の意味改善
- `exploratory-qa` の対象選定・evidence semantics・Scored Mode の再設計
- Android の対象 OS / device policy / command behavior 変更
- macOS / Homebrew 対応の追加
- `scripts/native/windows/android-local.ps1` の置換・再実装
- 新しい PowerShell wrapper の追加
- 新しい agent framework / runner / workflow engine
- Repository 全 Markdown を対象にした汎用 link checker
- CI job の再設計・統廃合
- dependency 更新
- product code / Web / Native UI / Typesense / search / release smoke の変更
- Skill 品質を行数だけで判定する lint
- 全 Skill に `assets/` / `scripts/` / `evals/` directory を形式だけで作ること
- PR1で新規 Output Template を発明すること

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

実装開始を止める未決定事項は現時点ではない。

ただし、移設中に以下が発生した場合は勝手に意味を決めず停止する。

- 旧文書同士で MUST / MUST NOT / stop condition が矛盾している。
- どちらを canonical にするかで実行 behavior が変わる。
- Repository 固有 policy か portable Skill workflow か判断できず、配置によって利用可能範囲が変わる。
- root 固定 path への必須依存を外すために既存 workflow の意味変更が必要になる。
- `description` を変えないと package 化できないように見える。
- Android の既存 Windows contract を変更しないと整理できないように見える。
- `docs/plans/TEMPLATE.md` と package asset のどちらかを削除すると既知の consumer が壊れ、単純な compatibility pointer では維持できない。

### 仮定してよい細部

- validator の実装ファイル名
- validator test の配置
- root compatibility pointer の具体文言
- package-local Markdown link の表記揺れを統一する軽微な formatting

次は仮定対象にしない。

- `feature-plan` Template の正本位置: package-local asset を canonical とする。
- `exploratory-qa` reference数: `workflow.md` / `scored-mode.md` の2つに固定する。
- planning ambiguity handling の正本: package-local `planning-workflow.md` とする。
- Portable Skillからroot固定pathへ必須依存させないこと。

### 未回答の重要質問

なし。

## 4. 影響範囲

### Impacted areas

#### Skill packages

- `.agents/skills/exploratory-qa/**`
- `.agents/skills/code-review/**`
- `.agents/skills/feature-plan/**`
- `.agents/skills/repair-loop/**`
- `.agents/skills/harness-improvement/**`
- `.agents/skills/android-native-local-validation/**`

#### Root routing / repository adapters

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`

#### Existing repository references / compatibility entrypoints

- `docs/plans/TEMPLATE.md`
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`

上記は必ずしも全て変更するわけではない。Skill 固有 detail の正本位置確認、Repository Input mapping、compatibility維持に使用する。

#### Validation / CI

- `package.json`
- Skill validator の repository-local script
- validator test
- `.github/workflows/ci.yml`

### Files to inspect

実装時は最低限、以下を current branch 上で再確認する。

- Issue #117 body
- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- `docs/plans/TEMPLATE.md`
- 6 Skill の `SKILL.md`
- 既存 package-local references
- 上記 Repository-side references
- `package.json`
- `.github/workflows/ci.yml`
- 既存 script / test naming convention

## 5. 変更方針

### 設計原則

#### 1. Dependency direction を一方向にする

Portable workflowの依存方向は次を基本とする。

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

禁止する正本構造:

```text
AGENTS.md -> SKILL.md -> CODE_REVIEW.md / PLANS.md / QA_AGENT.md -> SKILL reference
```

つまり、Portable Skill の core workflow は package-local だけで理解可能にする。

Repository固有の情報が必要な場合、Skill側は logical external input として要求する。例:

- repository coding policy
- product normative specification
- QA machine contract
- runtime command / capability
- plan storage convention

具体的な Repository path や command は root routing / adapter がその input へ mapping する。

Package-local `SKILL.md` から root固定pathを「この文書を読まないと Skill workflow が成立しない」という形で必須参照させない。

#### 2. Portability は「Repository依存ゼロ」ではない

Skill package 内へ持つのは **Skill 固有 workflow / decision / stop / output contract / reusable static template**。

Repository 側に残してよいもの:

- Product Specification
- Repository-specific command
- Scenario Shop 固有 Machine Contract
- Coding Standards
- Plan 保存 path / filename convention
- Runtime / build / native utility
- shared artifact / safety policy

同じ Repository 固有 rule を Portability のためだけに Skill package へ複製しない。

#### 3. `SKILL.md` を薄くするが、短文化を目的にしない

`SKILL.md` は、追加判断なしで以下が分かればよい。

- いつ使うか
- いつ使わないか
- 必要 inputs
- expected outputs
- どの package-local reference / asset を読むか
- 主要 guardrail / stop boundary

詳細を移す必要がない小さい Skill は、無理に新規 reference を増やさない。

#### 4. Directory を揃えることを目的にしない

基本形は以下だが、必要なものだけ作る。

```text
.agents/skills/<skill>/
├── SKILL.md
├── references/   # detailed workflow / policy / output contract が必要な場合のみ
├── assets/       # reusable static template / static artifact が既に必要な場合のみ
└── scripts/      # Skill 専用 deterministic processing が本当に必要な場合のみ
```

責務:

- `references/`: workflow、rules、stop conditions、output meaning contract
- `assets/`: reusable static template / static artifact
- `scripts/`: Skill 固有 deterministic processing

既存 shared utility を Portability だけを理由に Skill へ複製しない。

#### 5. PR1では frontmatter routing behavior を変えない

6 Skill の frontmatterについて、以下を原則 freeze する。

```yaml
name:
description:
```

format修正等が必要でも、routing semantics を変える wording optimization は PR3 へ送る。

#### 6. `AGENTS.md` は routing / input mapping に集中する

`AGENTS.md` に置くのは主に以下。

- task type
- Skill name / package-local entrypointへの link
- high-level selection / exclusion
- Repository固有 input / policy / command の mapping

package layout の詳細仕様や Skill workflow を `AGENTS.md` に新たに集約しない。

Skill entrypointは可能な限り通常の Markdown link で記載し、validatorが特別な routing parserなしで target existence を検証できるようにする。

#### 7. Root文書は「短く」ではなく「重複をなくす」

`QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` は、Skill 固有 workflow を重複定義しない。

一方で Repository 固有 contract / policy / adapter / lifecycle は必要なら残す。

### Skillごとの migration 方針

#### `code-review`

現状:

```text
SKILL.md
references/review-workflow.md
CODE_REVIEW.md
```

方針:

1. `SKILL.md`、`references/review-workflow.md`、`CODE_REVIEW.md` の重複を inventory する。
2. 汎用 code-review workflow / findings contract / review ordering は package-local `review-workflow.md` を canonical にする。
3. `CODE_REVIEW.md` の Repository 固有 coding standards、外部レビュー起動承認、report generation policy 等は残す。
4. `SKILL.md` は trigger / logical external inputs / outputs / primary guardrail / package-local reading order を中心にする。
5. `SKILL.md` から `CODE_REVIEW.md` を必須 workflow reference として読ませない。Repositoryでは `AGENTS.md` / adapter側が repository coding policy として対応づける。
6. 新規 reference / asset / script は、既存 `review-workflow.md` で不足が明確でない限り作らない。

#### `feature-plan`

PR1後の基本構造:

```text
.agents/skills/feature-plan/
├── SKILL.md
├── references/
│   └── planning-workflow.md
└── assets/
    └── plan-template.md
```

方針:

1. 汎用 planning workflow は package-local `planning-workflow.md` を canonical にする。
2. mandatory-question / blocking question / assumptions allowed / ambiguity handling は planning Skill の判断ロジックとして `planning-workflow.md` へ集約する。
3. 現行 `docs/plans/TEMPLATE.md` の汎用 Template 本文を `assets/plan-template.md` へ移し、package-local asset を canonical にする。
4. `docs/plans/TEMPLATE.md` を残す場合は canonical assetへの薄い compatibility pointer とし、Template本文を二重保持しない。
5. `PLANS.md` に残すのは Repository 固有 plan lifecycle、保存 path / filename convention、active runとの関係等に限定する。
6. `SKILL.md` は trigger / inputs / outputs / package-local reading order / **plan-save-before-implementation boundary** を中心にする。
7. Repositoryでは plan保存先等を external input として `AGENTS.md` / `PLANS.md` から mapping する。Portable Skill自体は `docs/plans/` 固定pathを workflow 正本にしない。
8. PR1で新しいTemplate項目を追加・改善しない。既存Templateの意味をそのまま移す。

#### `repair-loop`

現状:

```text
SKILL.md
references/repair-workflow.md
docs/reference/repair-loop.md
```

方針:

1. package-local `repair-workflow.md` と `docs/reference/repair-loop.md` の重複を比較する。
2. bounded loop、failure triage、iteration contract、repeated failure、max iteration、stop conditions、scope / unsafe action 等の **repair-loop固有 detail** は package-local reference へ集約する。
3. 他 workflow も参照する Repository-wide policy（例: shared change-scope / artifact policy）がある場合だけ Repository-side shared input として残す。
4. 同じ詳細手順を package と root の二重正本にしない。
5. `SKILL.md` は Repository-side `docs/reference/repair-loop.md` を必須正本として要求せず、必要な shared policyは logical external input として扱う。
6. 新しい repair runner / automatic loop / script は追加しない。

#### `harness-improvement`

現状:

```text
SKILL.md
references/improvement-workflow.md
docs/reference/harness-improvement-loop.md
docs/reference/evaluation.md
docs/reference/failure-taxonomy.md
```

方針:

1. `references/improvement-workflow.md` と `docs/reference/harness-improvement-loop.md` の重複を比較する。
2. Candidate model、classification、strictness、evidence requirement、separation from implementation、review requirement 等の **Skill固有 workflow** は package-local reference を canonical にする。
3. `evaluation.md` / `failure-taxonomy.md` が複数 workflow 共通 contract なら Repository-side shared input として残す。
4. `SKILL.md` では shared evaluation / taxonomy contract を logical external input として要求し、特定Repository pathを core workflowの正本にしない。
5. 実在する reference を「欠落している」と仮定して新規 policy を作らない。
6. `SKILL.md` は trigger / inputs / outputs / read order / auto-apply禁止等の最上位 boundary を残す。

#### `exploratory-qa`

PR1後の構造を次で固定する。

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md
```

方針:

1. 現行 `SKILL.md` の内容を Portable Skill workflow と Scenario Shop 固有 contract に分類する。
2. `workflow.md` に Normal / Gray-box の共通 exploration workflow、bounded execution、high-level evidence / finding contract、finalization / stop conditions を移す。
3. `scored-mode.md` に Black-box Scored の selection / isolation / Fresh Session / trusted capability / forbidden boundary / stop conditions を移す。
4. Mode選択・Mode境界は Skill workflow なので `QA_AGENT.md` の正本に残さない。
5. `QA_AGENT.md` に残すのは Scenario Shop 固有 Machine Contract、artifact schema / identity、Repository-specific script mapping、benchmark / scoring connection 等とする。
6. Product Normative Specification / QA Machine Contract / runtime capability は logical external input としてSkill側に明示し、`QA_AGENT.md` 等の固定pathを portable workflow の必須正本にしない。
7. `scripts/agentic-qa/**` を Skill packageへコピーしない。
8. 2 referenceより細分化しない。新しいassetも作らない。

#### `android-native-local-validation`

PR1後の基本構造:

```text
.agents/skills/android-native-local-validation/
├── SKILL.md
└── references/
    └── windows-android-workflow.md
```

方針:

1. 現行 Windows contract を維持する。
2. 長い command / preflight / retry / failure classification / cleanup 手順を package-local `windows-android-workflow.md` へ移す。
3. `SKILL.md` には用途、Windows + physical Android applicability、logical external inputs、主要 stop boundary、package-local reference reading order を残す。
4. host repository が提供する Android local validation command / native setup / troubleshooting reference を external input として扱う。
5. 現Repositoryでは `AGENTS.md` / repository adapter が external input を `scripts/native/windows/android-local.ps1` / `docs/native/**` へ mapping する。
6. 実処理の正本 `scripts/native/windows/android-local.ps1` は Skill内に複製しない。
7. `docs/native/**` の Repository固有 setup / troubleshooting detail を丸ごと packageへコピーしない。Portable workflowに必要な判断・stop意味だけpackage側へ置く。
8. macOS / Homebrew 対応、新PowerShell wrapper、新validatorは追加しない。

### Validator 方針

#### 目的

PR1で必要なのは「Skill package と明示した local file link が壊れていないこと」の機械検証であり、汎用 Markdown parser / semantic linter / routing parser ではない。

#### 最小責務

validator は次だけを検証する。

1. `.agents/skills/*/` directory に `SKILL.md` が存在する。
2. `SKILL.md` frontmatter が parse できる。
3. `name` / `description` が存在し空でない。
4. Skill `name` が重複しない。
5. validator対象 Markdown 内の通常 local Markdown file link の target が存在する。

`AGENTS.md` の canonical Skill routeも通常Markdown linkで書くため、**routing専用 parser / routing専用 path rule は作らない**。

#### Link validation の対象

最低限、次を固定対象にする。

- `.agents/skills/**/*.md`
- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- `docs/plans/TEMPLATE.md`
- `docs/reference/repair-loop.md`（残す場合）
- `docs/reference/harness-improvement-loop.md`（残す場合）

存在しない optional compatibility file はskipできる構成にし、対象一覧のためだけに空fileを作らない。

対象は通常Markdown linkの **local file target existence** のみ。

対象外:

- external URL
- anchor-only link
- prose / backtick 内のpath
- code sample
- Markdown文章品質
- semantic equivalence
- Trigger accuracy
- Output quality
- Repository全Markdown

#### Path解析を単純化する

機械検証したい local reference / Skill route / compatibility pointer は通常の Markdown link として記載する。

例:

```md
- [Workflow](references/workflow.md)
- [Code Review Skill](.agents/skills/code-review/SKILL.md)
```

説明文中の backtick path を独自 parser で推測解析しない。

#### 実装規模

- 新規 dependency を追加しない。
- 既存 `tsx` / TypeScript / `yaml` を使用する。
- validator は小さい repository-local script 1本を基本とする。
- helper abstraction は複数箇所で実際に必要になるまで作らない。
- Markdown AST parser等の新規仕組みを導入せず、対象syntaxに必要な最小実装にする。

#### Validator test

最低限、以下を固定する。

- valid package / local links -> PASS
- missing `SKILL.md` -> FAIL
- invalid / missing required frontmatter -> FAIL
- duplicate Skill name -> FAIL
- broken local Markdown file link -> FAIL
- external URL / anchor-only / backtick path が対象外であることを必要最小限確認

`broken canonical routing Skill path` 専用testは作らない。通常local Markdown link failureで同じロジックを使う。

### Quality gate 方針

- `package.json` に dedicated script を追加する。例: `pnpm run validate:skills`
- local aggregate `pnpm run verify` から到達可能にする。
- `.github/workflows/ci.yml` の既存 quality job に dedicated validator step を追加する。
- CIで `pnpm run verify` 全体を追加実行して既存 test / lint / build を二重実行しない。
- Skill migration 中は targeted validator test / `validate:skills` / Markdown lint を中心にする。
- full `pnpm run verify` は最終検証で実施する。

### 実行タスク

#### Phase 0 — Baseline migration matrix / dependency mapping

- [ ] 6 Skillについて、`SKILL.md` / package-local reference / root reference / Repository-specific input を一覧化する。
- [ ] root文書との重複を section 単位で記録する。
- [ ] Portable Skillからroot固定pathへの必須依存を一覧化する。
- [ ] 各依存を `package-local canonical` / `logical external input` / `Repository adapter mapping` のどれにするか決める。
- [ ] 各 Skill で守る semantic invariant を簡潔に記録する。
  - MUST / MUST NOT
  - trigger / exclusion
  - required inputs
  - required outputs
  - evidence requirement
  - approval boundary
  - stop condition
- [ ] 旧正本 -> 新正本の移設先を migration matrix として決める。
- [ ] `name` / `description` の baseline を記録し、PR1で変更しないことを確認する。

Migration matrix / working checklist のためだけに新しい durable `docs/**` fileを作らない。Implementation時の active `.codex/runs/<run_id>/PLAN.md` / `TASKS.md` 内のworking checklistとして管理する。

#### Phase 1 — Validator skeleton

- [ ] 既存 script / test convention に合わせて validator の場所を決める。
- [ ] package discovery / frontmatter / duplicate name の最小 skeletonを実装する。
- [ ] 対応する最小 failure cases の test を追加する。
- [ ] routing専用 parser / 汎用Markdown checkerを作らない。

この時点で Markdown link validation を完成させる必要はない。Skill移設でlink表記を通常Markdown linkへ揃えた後、同じscriptへ小さく追加する。

#### Phase 2 — Small Skill migrations

以下の順に、1 Skill ずつ「移設 -> targeted validation -> semantic確認」を完了する。

1. [ ] `code-review`
2. [ ] `feature-plan`
   - [ ] `assets/plan-template.md` をcanonical Templateとして作る。
   - [ ] `docs/plans/TEMPLATE.md` のTemplate本文を二重保持しない。
   - [ ] ambiguity handlingを`planning-workflow.md`へ集約する。
3. [ ] `repair-loop`
4. [ ] `harness-improvement`

各 Skill 完了条件:

- [ ] `SKILL.md` から必要 package-local reference / asset を迷わず選べる。
- [ ] Skill固有詳細workflowは package-local canonical reference にある。
- [ ] root固定pathを portable workflow の必須正本として要求していない。
- [ ] Repository固有policyを誤って packageへ複製していない。
- [ ] old / new に同じ detailed procedure / Template の二重正本が残っていない。
- [ ] `name` / `description` が baseline と一致する。

#### Phase 3 — Large Skill migrations

5. [ ] `exploratory-qa`
   - [ ] `references/workflow.md` を作る。
   - [ ] `references/scored-mode.md` を作る。
   - [ ] Mode選択 / Mode境界をpackage-localへ移す。
   - [ ] Scenario Shop固有 Machine Contract / script mappingは `QA_AGENT.md` 等へ残す。
   - [ ] existing agentic-qa scriptsを複製しない。
   - [ ] 追加reference / assetを増やさない。

6. [ ] `android-native-local-validation`
   - [ ] Windows前提を保持する。
   - [ ] procedural detailを1つの `windows-android-workflow.md` へ移す。
   - [ ] existing PowerShell entrypoint / native docsはRepository input mappingとして利用する。
   - [ ] Skill workflowからroot固定path必須依存を外す。
   - [ ] macOS対応やwrapper新設をしない。

#### Phase 4 — Root routing / adapter cleanup and link normalization

- [ ] `AGENTS.md` の task -> Skill routing / Repository Input mapping を canonical にする。
- [ ] Skill entrypointを通常Markdown linkへ揃える。
- [ ] `AGENTS.md` に Skill workflow や package構造の詳細仕様を増やさない。
- [ ] `QA_AGENT.md` からportable QA workflow / Mode選択の重複を除去し、Scenario Shop固有contract / script mappingを残す。
- [ ] `CODE_REVIEW.md` からportable review workflowの重複を除去し、Repository固有review policyを残す。
- [ ] `PLANS.md` からportable planning workflow / ambiguity handlingの重複を除去し、Repository固有plan lifecycle / storage contractを残す。
- [ ] `docs/plans/TEMPLATE.md` を残す場合、canonical package assetへのcompatibility pointerにする。
- [ ] `docs/reference/repair-loop.md` / `harness-improvement-loop.md` を残す場合、packageと同じSkill固有workflowを二重保持しない。
- [ ] root -> Skill -> root の循環した「詳細正本」構造がないことを確認する。

#### Phase 5 — Complete local-link validation and gate integration

- [ ] validatorへ対象Markdownの通常local file link validationを追加する。
- [ ] broken local link testを追加する。
- [ ] `package.json` に dedicated Skill validation script を追加する。
- [ ] `pnpm run verify` から Skill validation が到達可能になるようにする。
- [ ] `.github/workflows/ci.yml` の既存 quality job に dedicated validator step を追加する。
- [ ] CIで既存 test / lint / buildを二重実行していないことを確認する。
- [ ] full repository quality gate を最終的に1回実行する。
- [ ] changed-files reviewで PR2 以降やproduct変更が混ざっていないことを確認する。

## 6. 検証方法

### Validation plan

#### Skill migration中の targeted checks

Skill移設中は、実装済み範囲に応じて次を使う。

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

validator skeleton段階では frontmatter / package validationだけでもよい。local-link validationを追加した後は同じ `validate:skills` で確認する。

#### Validator tests

少なくとも以下を検証する。

- valid package / local links -> PASS
- missing `SKILL.md` -> FAIL
- invalid / missing frontmatter -> FAIL
- duplicate `name` -> FAIL
- missing local Markdown file target -> FAIL
- external URL / anchor-only / backtick path は local-link existence check の対象外

#### Static dependency-direction checks

6 Skillそれぞれで次を確認する。

- package単体で Skill workflow / decision / stop / output contract を理解できる。
- `SKILL.md` / package-local referenceが `AGENTS.md` / `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` 等を core workflow正本として必須読込していない。
- Repository固有policy / contract / commandが必要な場合は logical external input として表現されている。
- `AGENTS.md` / repository adapter側に、その external input の現在Repositoryでの具体 mapping がある。
- root -> Skill -> root detailed canonical cycle がない。

#### Static semantic checks

6 Skillそれぞれについて migration matrix を使い、以下の意味が before / after で一致することを確認する。

- trigger / exclusion
- MUST / MUST NOT
- inputs
- outputs
- evidence requirements
- approval boundary
- stop conditions

特に以下を重点確認する。

- `feature-plan`: ambiguity handling / plan-save-before-implementation / Template項目
- `exploratory-qa`: Normal / Gray-box / Black-box Scored の選択・境界
- `repair-loop`: bounded iteration / repeated failure / unsafe stop
- `harness-improvement`: auto-apply禁止 / strictness / evidence
- `android-native-local-validation`: Windows / physical Android / retry停止条件 / Git禁止条件

#### Root responsibility checks

- `AGENTS.md` 以外に競合する task -> Skill routing table がない。
- `QA_AGENT.md` に Scenario Shop固有contract / script mappingが残っているが、portable Mode workflowの正本にはなっていない。
- `CODE_REVIEW.md` に Repository固有review policyが残っている。
- `PLANS.md` に Repository固有plan lifecycle / storage contractが残っているが、ambiguity handlingの正本にはなっていない。
- `docs/plans/TEMPLATE.md` を残す場合、Template本文の二重正本ではない。
- Skill固有 detailed workflow が root と package の両方に二重正本として残っていない。

#### Final repository gates

最終段階で既存の総合 gate を実行する。

```bash
pnpm run validate:skills
pnpm run lint:markdown
pnpm run verify
```

`verify` に `validate:skills` が含まれるため、最終的には `verify` が総合判定になる。上2つは失敗切り分けと dedicated gate 確認のため個別実行してよい。

このPRはdocs / tooling中心なので、product E2E や native runtime smoke を新規必須gateとして追加しない。

### 成功判定

- dedicated Skill validatorがPASSする。
- validator testがPASSする。
- Markdown lintがPASSする。
- `pnpm run verify` がPASSする。
- 6 Skillのsemantic invariantに意図しない差分がない。
- `name` / `description` にrouting semantic changeがない。
- package単体でportable workflowが理解できる。
- Repository固有入力がroot側から一方向にmappingされ、詳細正本の循環依存がない。
- `feature-plan` Templateがpackage-local canonical assetである。
- planning ambiguity handlingがpackage-local canonical workflowにある。
- `exploratory-qa` のMode選択 / 境界がpackage-localである。
- AndroidがWindows contractのままである。
- PR1外の変更がない。

## 7. リスクと未解決論点

### Risks

#### 1. Semantic drift during relocation

**Risk:** `SKILL.md` を短くする過程で、stop conditionやMUST条件を詳細扱いして消す。

**Mitigation:** 短文化ではなく正本移設として扱い、migration matrixでbefore / afterを確認する。

#### 2. Portability is weakened by reverse root dependency

**Risk:** root文書の重複を削っても、portable Skill側がroot固定pathを必須正本として読み続け、package単体ではworkflowを理解できない。

**Mitigation:** dependency directionを `Repository adapter -> logical external input -> Skill package` に固定し、Skill packageからroot詳細正本への逆依存を除去する。

#### 3. Root document over-pruning

**Risk:** `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` を単なるcompatibility pointerまで削り、Repository固有contractを失う。

**Mitigation:** 削除対象をportable Skill workflowの重複だけに限定する。

#### 4. Over-packaging

**Risk:** Portabilityを理由に全Skillへ`assets/` / `scripts/` / 多数のreferencesを作り、ファイル数と保守コストだけ増える。

**Mitigation:** 既存Skill固有workflow / Templateの移設に必要なものだけ作る。`feature-plan` asset、`exploratory-qa` 2 references、Android 1 reference以外は既存構造を基本にする。

#### 5. Validator over-engineering

**Risk:** prose path、code sample、全Markdown、routing syntaxを解析する汎用checkerへ膨張する。

**Mitigation:** package structure + frontmatter + duplicate name + 通常local Markdown file linkだけに責務を限定する。routingも通常Markdown linkで同じロジックを使う。

#### 6. Routing baseline contamination

**Risk:** PR1で`description`を改善し、PR2 baseline / PR3 optimizationの比較条件を壊す。

**Mitigation:** `name` / `description`をfreezeし、意味変更はPR3へ送る。

#### 7. Template becomes two sources of truth

**Risk:** `assets/plan-template.md` を追加しても `docs/plans/TEMPLATE.md` に同じ本文を残し、将来driftする。

**Mitigation:** package assetをcanonicalにし、root側は削除可能なら削除、残すならcompatibility pointerに限定する。

#### 8. QA mode ownership remains split

**Risk:** packageへMode referenceを作った後も `QA_AGENT.md` がMode選択・boundaryを独立定義し、二重正本になる。

**Mitigation:** Mode workflowはpackage-local、Scenario Shop specific Machine Contract / schema / script mappingはRepository-sideという境界で整理する。

#### 9. Android semantic change

**Risk:** Portability対応のついでにmacOS対応や新wrapperを追加し、Windows-only contractを変える。

**Mitigation:** Windows + PowerShell + physical Androidを明示的にfreezeし、既存Repository commandをexternal input mappingとして再利用する。

#### 10. Duplicate sources of truth

**Risk:** root文書とpackage reference双方に詳細workflowが残る。

**Mitigation:** migration後に旧詳細sectionを削除またはRepository固有adapter / shared policyへ縮小し、重複検索する。

#### 11. Broken links after moves

**Risk:** package-local reference、root->Skill link、compatibility pointerが壊れる。

**Mitigation:** normal Markdown linkへ寄せ、同じdedicated validatorロジックで対象範囲を検証する。

### Open questions

なし。Repository fact の確認で semantic decision が必要になった場合だけ実装を停止する。

## 8. 成果物

### 変更ファイル候補

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- 6 Skill の `SKILL.md`
- 既存 package-local `references/*.md`
- `.agents/skills/feature-plan/assets/plan-template.md`
- `.agents/skills/exploratory-qa/references/workflow.md`
- `.agents/skills/exploratory-qa/references/scored-mode.md`
- `.agents/skills/android-native-local-validation/references/windows-android-workflow.md`
- `docs/plans/TEMPLATE.md`（compatibility維持が必要な場合）
- `docs/reference/repair-loop.md`（共有policy / compatibilityが残る場合）
- `docs/reference/harness-improvement-loop.md`（共有policy / compatibilityが残る場合）
- Skill validator script
- validator test
- `package.json`
- `.github/workflows/ci.yml`

すべてが必須変更ではない。責務重複がない文書は不要に変更しない。

### 付随ドキュメント

- Phase 0 migration matrix用の新規durable documentは作らない。
- このPlan以外の新規reportは原則不要。
- README / curriculum / product spec は今回の構造整理の理解に本当に必要な場合だけ更新する。

## 9. Rollout / 実装時の判断ルール

1. current repository factを再確認し、active run内にmigration matrix / dependency mappingを作る。
2. `name` / `description` baselineをfreezeする。
3. validator skeletonとしてpackage / frontmatter / duplicate name validationだけ作る。
4. 小さい4 Skillを1つずつ整理する。`feature-plan`ではTemplate asset化とambiguity handling移管を同時に完了する。
5. `exploratory-qa` を `workflow.md` / `scored-mode.md` の2 referenceへ分割する。
6. AndroidをWindows contractのまま1 referenceへ分割する。
7. root文書からportable Skill workflow重複を除去し、Repository input mappingを一方向に整理する。
8. Skill route / package reference / compatibility pointerを通常Markdown linkへ揃える。
9. validatorへlocal Markdown file link validationを追加する。
10. validatorをlocal gate / CIへ接続する。
11. targeted checks後、full `pnpm run verify`を最終段階で実行する。
12. changed-files / dependency-direction / semantic-preservation reviewを行う。

実装中に「もっと一般化できる」「policyを改善できる」「別OSにも対応できる」「evalも一緒に作れる」と気づいても、PR1には入れない。Issue #117 の後続PRまたは別Issueへ送る。

実装中にroot側とpackage側のどちらへ置くか迷った場合は、次の順で判断する。

1. 別RepositoryへSkill packageだけ移しても必要な実行判断か？ -> package-local。
2. このRepository固有のpath / Product Contract / command / policyか？ -> Repository-side external input / adapter。
3. 複数Skillが共有するRepository-wide safety / artifact / taxonomy contractか？ -> Repository-side shared input。
4. 再利用静的Output Templateそのものか？ -> Skill固有ならpackage `assets/`。
5. 判断するとsemantic behaviorが変わるか？ -> 作業を止めて別判断へ送る。

Rollbackはdocs / tooling構造変更としてPR単位でrevert可能とする。package移設途中の不完全な状態をmainへ入れない。