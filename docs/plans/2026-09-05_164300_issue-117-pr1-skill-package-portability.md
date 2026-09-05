# Issue #117 PR1 — Portable Skill Packaging and Routing Cleanup

## 0. 依頼概要

- 依頼内容: Issue #117 の PR1 として、6つの Agent Skill を自己完結性・Portabilityの高い package へ整理し、Repository root の Agent 文書との責務重複を解消する。
- 背景: 現在は Skill 固有 workflow の一部が `SKILL.md`、root Agent 文書、`docs/reference/` に分散している。Issue #117 全体では将来的に Trigger Eval / Output Eval / Workflow E2E Eval まで進めるが、PR1ではその前提となる package 構造と routing の整理だけを行う。
- 期待成果: 既存 Skill の意味を変えず、Skill 固有 workflow は package 内から理解でき、Repository 固有 policy / adapter は root 側に残り、参照切れと最低限の package 構造を deterministic validator で検出できる状態にする。

## 1. ゴール / 完了条件

### ゴール

Issue #117 の PR1 として、以下の 6 Skill を、**既存の実行意味論を維持したまま** portable な package へ整理する。

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
- Required / Conditional reference の選択条件
- 最上位 guardrail / stop boundary

詳細 workflow、長い checklist、command sequence、詳細 stop condition は、必要な場合だけ package-local `references/` へ移す。

Repository root 側では `AGENTS.md` を **task -> Skill routing の Single Source of Truth** とする。一方で、`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` にある Repository 固有 policy / adapter / lifecycle まで無理に Skill package へ移さない。

### 完了条件（DoD）

- [ ] 6 Skill の Skill 固有 workflow を package 内から理解できる。
- [ ] 各 `SKILL.md` から実行に必要な package-local reference を一意に選べる。
- [ ] `AGENTS.md` が repository-level routing の SSOT であり、他 root 文書が競合する routing hierarchy を持たない。
- [ ] `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` から、Skill 固有 workflow の重複だけが除かれ、Repository 固有 contract / policy / adapter は必要な範囲で残っている。
- [ ] `repair-loop`、`harness-improvement` など package 外にも正本候補が存在する Skill は、どの文書が Skill 固有でどの文書が Repository 固有か整理されている。
- [ ] 対象 6 Skill と今回変更する root 文書から到達する local reference に dangling link がない。
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
- routing SSOT 整理
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
- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`

#### `harness-improvement`

現行 package-local reference は `references/improvement-workflow.md`。

現行 `SKILL.md` は package 外の以下も参照する。

- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`

したがって、PR1では「存在しない reference の復元」を行うのではなく、**package-local `improvement-workflow.md` と repository-side reference 群の責務重複を整理する**。

#### `exploratory-qa`

現行 package は `SKILL.md` 1ファイルだけで、詳細 workflow を約1ファイルに抱えている。

現在 package-local の `references/` / `assets/` は存在しないため、PR1では「既存 reference を再利用する」のではなく、**現行 `SKILL.md` から必要最小限の reference を新設する**。

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

#### Root 文書の責務

`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` は単なる routing duplicate ではなく、Repository 固有情報も持つ。

例:

- `QA_AGENT.md`: Scenario Shop 固有 Agentic QA Machine Contract、Mode、Artifact、Scoring、Repository scripts との関係
- `CODE_REVIEW.md`: Repository 固有 Coding Standards、外部レビュー承認、report file policy
- `PLANS.md`: Repository 固有 plan lifecycle、保存 path / filename、template、ambiguity handling

したがって PR1 で「root 文書を短くする」こと自体を目的にしない。削除対象は **Skill 固有 workflow の重複** に限定する。

#### Existing quality gate

`package.json` の `verify` は現在、format / Markdown lint / spec validation / curriculum validation / lint / typecheck / image validation / security / test / Web build / spec build まで含む重い総合 gate である。

PR1 の Skill 単位 migration ごとに full `pnpm run verify` を回す必要はない。targeted validator と Markdown lint を中心に進め、full `verify` は最終検証で実施する。

### Assumptions

- Issue #117 の PR1 は 6 Skill 全件を対象とする。
- `name` / `description` の routing 性能改善は PR3 の責務であり、PR1では原則 freeze する。
- Repository 固有 input / policy を package 外に残すこと自体は Portability 違反ではない。Skill 側から必要外部 input として明示されていればよい。
- package 構造は全 Skill を同一ディレクトリ形状へ揃えることを目的にしない。必要な `references/` / `assets/` / `scripts/` だけを作る。
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
- 新しい PowerShell wrapper の追加（既存実行入口で不足が実証されない限り）
- 新しい agent framework / runner / workflow engine
- Repository 全 Markdown を対象にした汎用 link checker
- CI job の再設計・統廃合
- dependency 更新
- product code / Web / Native UI / Typesense / search / release smoke の変更
- Skill 品質を行数だけで判定する lint
- 全 Skill に `assets/` / `scripts/` / `evals/` directory を形式だけで作ること

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

実装開始を止める未決定事項は現時点ではない。

ただし、移設中に以下が発生した場合は勝手に意味を決めず停止する。

- 旧文書同士で MUST / MUST NOT / stop condition が矛盾している。
- どちらを canonical にするかで実行 behavior が変わる。
- Repository 固有 policy か portable Skill workflow か判断できず、配置によって利用可能範囲が変わる。
- `description` を変えないと package 化できないように見える。
- Android の既存 Windows contract を変更しないと整理できないように見える。

### 仮定してよい細部

- 新規 reference のファイル名
- validator の実装ファイル名
- validator test の配置
- root compatibility pointer の文言

いずれも既存 convention に合わせ、局所変更で済むものに限る。

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

#### Existing repository references

- `docs/reference/repair-loop.md`
- `docs/reference/harness-improvement-loop.md`
- `docs/reference/evaluation.md`
- `docs/reference/failure-taxonomy.md`
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/README.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`

上記は必ずしも全て変更するわけではない。Skill 固有 detail の正本位置確認に使用する。

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
- 6 Skill の `SKILL.md`
- 既存 package-local references
- 上記 Repository-side references
- `package.json`
- `.github/workflows/ci.yml`
- 既存 script / test naming convention

## 5. 変更方針

### 設計原則

#### 1. Portability は「Repository依存ゼロ」ではない

Portable Skill は、Repository 固有情報が必要な場合でも、何が external input / policy なのか明示されていればよい。

Skill package 内へコピーするのは **Skill 固有 workflow / decision / stop / output contract**。

Repository 側に残してよいものは例えば以下。

- Product Specification
- Repository-specific command
- Scenario Shop 固有 Machine Contract
- Coding Standards
- Plan 保存 path / filename convention
- Runtime / build / native utility
- shared artifact / safety policy

同じ Repository 固有 rule を Portability のためだけに Skill package へ複製しない。

#### 2. `SKILL.md` を薄くするが、短文化を目的にしない

`SKILL.md` は、追加判断なしで以下が分かればよい。

- いつ使うか
- いつ使わないか
- 必要 inputs
- expected outputs
- どの reference を読むか
- 主要 guardrail / stop boundary

詳細を移す必要がない小さい Skill は、無理に新規 reference を増やさない。

#### 3. Directory を揃えることを目的にしない

基本形は以下だが、必要なものだけ作る。

```text
.agents/skills/<skill>/
├── SKILL.md
├── references/   # detailed workflow / policy / output contract が必要な場合のみ
├── assets/       # reusable static template / static artifact が必要な場合のみ
└── scripts/      # Skill 専用 deterministic processing が本当に必要な場合のみ
```

責務:

- `references/`: workflow、rules、stop conditions、output meaning contract
- `assets/`: reusable static template / static artifact
- `scripts/`: Skill 固有 deterministic processing

既存 shared utility を Portability だけを理由に Skill へ複製しない。

#### 4. PR1では frontmatter routing behavior を変えない

6 Skill の frontmatterについて、以下を原則 freeze する。

```yaml
name:
description:
```

format修正等が必要でも、routing semantics を変える wording optimization は PR3 へ送る。

#### 5. `AGENTS.md` は routing に集中する

`AGENTS.md` に置くのは主に以下。

- task type
- Skill name / path
- high-level selection / exclusion
- 必要なら Repository 固有 input の入口

package layout の詳細仕様や Skill workflow を `AGENTS.md` に新たに集約しない。

#### 6. Root文書は「短く」ではなく「重複をなくす」

`QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` は、Skill 固有 workflow を重複定義しない。

一方で、Repository 固有 contract / policy / adapter / lifecycle は必要なら残す。

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
4. `SKILL.md` は trigger / inputs / outputs / primary guardrail / reading order を中心にする。
5. 新規 reference / asset / script は、既存 `review-workflow.md` で不足が明確でない限り作らない。

#### `feature-plan`

現状:

```text
SKILL.md
references/planning-workflow.md
PLANS.md
docs/plans/TEMPLATE.md
```

方針:

1. 汎用 planning workflow は package-local `planning-workflow.md` を canonical にする。
2. `PLANS.md` の Repository 固有 plan lifecycle、保存 path / filename、template利用、repository-specific ambiguity handling は必要な範囲で残す。
3. `docs/plans/TEMPLATE.md` は Repository-provided template として外部 input 扱いにし、Portabilityのために packageへコピーしない。
4. `SKILL.md` は trigger / inputs / outputs / reading order / implementation-before-save boundary を中心にする。
5. 新規 asset 化は、Issue #117 全体として将来必要でも、PR1で既存templateを複製してまで行わない。

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
3. 他 workflow も参照する Repository-wide policy がある場合だけ root / `docs/reference/` に残す。
4. 同じ詳細手順を package と root の二重正本にしない。
5. 新しい repair runner / automatic loop / script は追加しない。

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
4. 実在する reference を「欠落している」と仮定して新規 policy を作らない。
5. `SKILL.md` は trigger / inputs / outputs / read order / auto-apply禁止等の最上位 boundary を残す。

#### `exploratory-qa`

現状:

```text
SKILL.md  # package-local referenceなし
QA_AGENT.md
docs/reference/agentic-qa-workflow.md
scripts/agentic-qa/**
```

方針:

1. 現行 `SKILL.md` の内容を、Portable Skill workflow と Scenario Shop 固有 contract に分類する。
2. package-local reference は **必要最小限** 新設する。
3. 基本案は次程度とし、実装時に情報量が十分収まるならさらに1ファイルへ統合してよい。

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md   # Scored固有境界が通常workflowと分離した方が明確な場合のみ
```

4. Normal / Gray-box の共通 exploration workflow、bounded execution、high-level evidence/finding contract を package-local reference へ移す。
5. Black-box Scored は safety / isolation boundary が大きく異なるため、必要なら別 reference に分離する。
6. `QA_AGENT.md` にある Scenario Shop 固有 Machine Contract、artifact identity、Metric、Repository scripts の具体的関係は Repository adapter / contract として残す。
7. `scripts/agentic-qa/**` を Skill packageへコピーしない。
8. assets や additional reference を形式だけで増やさない。

#### `android-native-local-validation`

現状:

```text
SKILL.md
scripts/native/windows/android-local.ps1
docs/native/README.md
docs/native/windows-android-local-validation.md
docs/native/windows-android-troubleshooting.md
```

方針:

1. 現行 Windows contract を維持する。
2. 長い command / preflight / retry / failure classification / cleanup 手順を package-local reference へ移す。
3. 基本構造は以下で十分とする。

```text
.agents/skills/android-native-local-validation/
├── SKILL.md
└── references/
    └── windows-android-workflow.md
```

4. `SKILL.md` には用途、Windows + physical Android applicability、required input、existing PowerShell entrypoint、主要 stop boundary、reference reading order を残す。
5. 実処理の正本 `scripts/native/windows/android-local.ps1` は Repository-specific command input として利用し、Skill内に複製しない。
6. `docs/native/**` にある Repository固有 setup / troubleshooting detail を無理に丸ごと packageへコピーしない。Skill workflowに不可欠な意味だけを reference 側に持ち、具体的 command/source-of-truth は既存 docs/script へ明示的に接続する。
7. macOS / Homebrew 対応、新PowerShell wrapper、新validatorは追加しない。

### Validator 方針

#### 目的

PR1で必要なのは「Skill package と local reference が壊れていないこと」の機械検証であり、汎用 Markdown parser や semantic linter ではない。

#### 最小責務

validator は少なくとも以下を検証する。

- `.agents/skills/*/SKILL.md` が存在する。
- frontmatter が parse できる。
- `name` / `description` が存在し空でない。
- Skill `name` が重複しない。
- 対象 Skill package 内 Markdown から参照する local Markdown link の target が存在する。
- `AGENTS.md` で canonical routing として明示した Skill path が存在する。

#### Path解析を単純化する

機械検証したい package-local reference は、可能な限り通常の Markdown link として記載する。

例:

```md
Required reference:
- [Workflow](references/workflow.md)
```

説明文中の backtick path 全てを独自 parser で推測解析しない。

#### Do not validate

- Skill の文章品質
- 行数
- semantic equivalence
- external URL availability
- Repository 全 Markdown link
- prose中に書かれた全 path
- Trigger accuracy
- Output quality

#### 実装規模

- 新規 dependency を追加しない。
- 既存 `tsx` / TypeScript / `yaml` を使用する。
- validator は小さい repository-local script 1本を基本とする。
- helper abstraction は複数箇所で実際に必要になるまで作らない。

#### Validator test

最低限、以下を固定する。

- valid package
- missing `SKILL.md`
- invalid / missing required frontmatter
- duplicate Skill name
- broken package-local Markdown link
- broken canonical routing Skill path

通常の Markdown link だけを対象にする実装なら、説明文やcode sampleのfalse-positive専用fixtureを大量に追加しない。

### Quality gate 方針

- `package.json` に dedicated script を追加する。例: `pnpm run validate:skills`
- local aggregate `pnpm run verify` から到達可能にする。
- `.github/workflows/ci.yml` の既存 quality job に dedicated validator step を追加する。
- CIで `pnpm run verify` 全体を追加実行して既存 test / lint / build を二重実行しない。
- Skill migration 中は targeted `validate:skills` と Markdown lint を中心にする。
- full `pnpm run verify` は最終検証で実施する。

### 実行タスク

#### Phase 0 — Baseline migration matrix

- [ ] 6 Skillについて、`SKILL.md` / package-local reference / root reference / Repository-specific input を一覧化する。
- [ ] root文書との重複を section 単位で記録する。
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

Semantic preservation 用に Skillごとの新規文書を大量作成しない。1つの migration matrix / working checklist で十分ならそれを使う。

#### Phase 1 — Minimal validator

- [ ] 既存 script / test convention に合わせて validator の場所を決める。
- [ ] package discovery / frontmatter / duplicate name / local Markdown link / routing Skill path の最小 validation を実装する。
- [ ] 最小 failure cases の test を追加する。
- [ ] validator 自身が汎用 Markdown checker へ膨張していないことを確認する。

#### Phase 2 — Small Skill migrations

以下の順に、1 Skill ずつ「移設 -> targeted validation -> semantic確認」を完了する。

1. [ ] `code-review`
2. [ ] `feature-plan`
3. [ ] `repair-loop`
4. [ ] `harness-improvement`

各 Skill 完了条件:

- [ ] `SKILL.md` から必要 reference を迷わず選べる。
- [ ] Skill固有詳細workflowは package-local canonical reference にある。
- [ ] Repository固有policyを誤って packageへ複製していない。
- [ ] old / new に同じ detailed procedure の二重正本が残っていない。
- [ ] `name` / `description` が baseline と一致する。

#### Phase 3 — Large Skill migrations

5. [ ] `exploratory-qa`
   - 最小数の package-local reference を作る。
   - Scenario Shop固有 Machine Contractは `QA_AGENT.md` 等へ残す。
   - existing agentic-qa scriptsを複製しない。

6. [ ] `android-native-local-validation`
   - Windows前提を保持する。
   - procedural detail を原則1つの `windows-android-workflow.md` へ移す。
   - existing PowerShell entrypoint / native docsをRepository inputとして利用する。
   - macOS対応やwrapper新設をしない。

#### Phase 4 — Root routing / adapter cleanup

- [ ] `AGENTS.md` の task -> Skill routing を canonical にする。
- [ ] `AGENTS.md` に Skill workflow や package構造の詳細仕様を増やさない。
- [ ] `QA_AGENT.md` からportable Skill workflowの重複だけ除去し、Scenario Shop固有contractを残す。
- [ ] `CODE_REVIEW.md` からportable review workflowの重複だけ除去し、Repository固有review policyを残す。
- [ ] `PLANS.md` からportable planning workflowの重複だけ除去し、Repository固有plan lifecycle / template contractを残す。
- [ ] root -> Skill -> root の循環した「詳細正本」構造がないことを確認する。

#### Phase 5 — Gate integration and final verification

- [ ] `package.json` に dedicated Skill validation script を追加する。
- [ ] `pnpm run verify` から Skill validation が到達可能になるようにする。
- [ ] `.github/workflows/ci.yml` の既存 quality job に dedicated validator step を追加する。
- [ ] CIで既存 test / lint / buildを二重実行していないことを確認する。
- [ ] full repository quality gate を最終的に1回実行する。
- [ ] changed-files reviewで PR2 以降やproduct変更が混ざっていないことを確認する。

## 6. 検証方法

### Validation plan

#### Skill migration中の targeted checks

各 Skill 単位では以下を優先する。

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

script名が別名になった場合でも、責務は package / routing integrity に限定する。

#### Validator tests

少なくとも以下を検証する。

- valid package -> PASS
- missing `SKILL.md` -> FAIL
- invalid / missing frontmatter -> FAIL
- duplicate `name` -> FAIL
- missing package-local Markdown link target -> FAIL
- broken canonical Skill path -> FAIL

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

- `exploratory-qa`: Normal / Gray-box / Black-box Scored の境界
- `repair-loop`: bounded iteration / repeated failure / unsafe stop
- `harness-improvement`: auto-apply禁止 / strictness / evidence
- `android-native-local-validation`: Windows / physical Android / retry停止条件 / Git禁止条件

#### Root responsibility checks

- `AGENTS.md` 以外に競合する task -> Skill routing table がない。
- `QA_AGENT.md` に Scenario Shop固有contractが残っている。
- `CODE_REVIEW.md` に Repository固有review policyが残っている。
- `PLANS.md` に Repository固有plan lifecycle / template contractが残っている。
- Skill固有 detailed workflow が root と package の両方に二重正本として残っていない。

#### Final repository gates

最終段階で既存の総合 gate を実行する。

```bash
pnpm run verify
```

必要に応じて CI と同じ dedicated validation command も個別実行する。

このPRはdocs / tooling中心なので、product E2E や native runtime smoke を新規必須gateとして追加しない。

### 成功判定

- dedicated Skill validatorがPASSする。
- validator testがPASSする。
- Markdown lintがPASSする。
- `pnpm run verify` がPASSする。
- 6 Skillのsemantic invariantに意図しない差分がない。
- `name` / `description` にrouting semantic changeがない。
- rootとSkill packageの責務境界が一意である。
- AndroidがWindows contractのままである。
- PR1外の変更がない。

## 7. リスクと未解決論点

### Risks

#### 1. Semantic drift during relocation

**Risk:** `SKILL.md` を短くする過程で、stop conditionやMUST条件を詳細扱いして消す。

**Mitigation:** 短文化ではなく正本移設として扱い、migration matrixでbefore / afterを確認する。

#### 2. Root document over-pruning

**Risk:** `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` を単なるcompatibility pointerまで削り、Repository固有contractを失う。

**Mitigation:** 削除対象をportable Skill workflowの重複だけに限定する。

#### 3. Over-packaging

**Risk:** Portabilityを理由に全Skillへ`assets/` / `scripts/` / 多数のreferencesを作り、ファイル数と保守コストだけ増える。

**Mitigation:** 必要性が実在するものだけ作る。小さい既存referenceで足りるSkillは増やさない。

#### 4. Validator over-engineering

**Risk:** prose path、code sample、全Markdownを解析する汎用checkerへ膨張する。

**Mitigation:** 通常Markdown link + package structure + routing Skill pathのみに責務を限定する。

#### 5. Routing baseline contamination

**Risk:** PR1で`description`を改善し、PR2 baseline / PR3 optimizationの比較条件を壊す。

**Mitigation:** `name` / `description`をfreezeし、意味変更はPR3へ送る。

#### 6. Android semantic change

**Risk:** Portability対応のついでにmacOS対応や新wrapperを追加し、Windows-only contractを変える。

**Mitigation:** Windows + PowerShell + physical Androidを明示的にfreezeし、既存`android-local.ps1`をそのまま実行入口にする。

#### 7. Duplicate sources of truth

**Risk:** root文書とpackage reference双方に詳細workflowが残る。

**Mitigation:** migration後に旧詳細sectionを削除またはRepository固有adapterへ縮小し、重複検索する。

#### 8. Broken links after moves

**Risk:** package-local referenceやroot->Skill linkが壊れる。

**Mitigation:** normal Markdown linkへ寄せ、dedicated validatorで対象範囲を検証する。

### Open questions

なし。Repository fact の確認で semantic decision が必要になった場合だけ実装を停止する。

## 8. 成果物

### 変更ファイル候補

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- 6 Skill の `SKILL.md`
- 必要な package-local `references/*.md`
- 必要に応じて整理対象となる `docs/reference/repair-loop.md`
- 必要に応じて整理対象となる `docs/reference/harness-improvement-loop.md`
- Skill validator script
- validator test
- `package.json`
- `.github/workflows/ci.yml`

すべてが必須変更ではない。責務重複がない文書は不要に変更しない。

### 付随ドキュメント

- このPlan以外の新規reportは原則不要。
- README / curriculum / product spec は今回の構造整理の理解に本当に必要な場合だけ更新する。

## 9. Rollout / 実装時の判断ルール

1. 最初に current repository fact を再確認し、migration matrixを作る。
2. `name` / `description` baseline をfreezeする。
3. 最小 validator を作る。
4. 小さい4 Skillを1つずつ整理する。
5. `exploratory-qa` を必要最小数のreferenceへ分割する。
6. AndroidをWindows contractのまま原則1 referenceへ分割する。
7. 最後にroot文書からSkill workflow重複だけ除去する。
8. validatorをlocal gate / CIへ接続する。
9. full `pnpm run verify` を最終段階で実行する。
10. changed-files / semantic preservation reviewを行う。

実装中に「もっと一般化できる」「policyを改善できる」「別OSにも対応できる」「evalも一緒に作れる」と気づいても、PR1には入れない。Issue #117 の後続PRまたは別Issueへ送る。

Rollbackはdocs / tooling構造変更としてPR単位でrevert可能とする。package移設途中の不完全な状態をmainへ入れない。
