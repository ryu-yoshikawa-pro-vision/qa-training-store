# Issue #117 PR1 — Portable Skill Packaging and Routing Cleanup

## 0. 依頼概要

- 依頼内容: Issue #117 の PR1 として、6つの Agent Skill を自己完結性・Portability の高い package へ整理し、Repository root の Agent 文書・reference との責務重複を解消する。
- 背景: 現在は Skill 固有 workflow の一部が `SKILL.md`、root Agent 文書、`docs/reference/`、Native runbook 等に分散し、いくつかの Skill は Repository 固定 path の文書を workflow の必須読込先としている。
- PR1 の役割: 後続の Trigger Eval / description optimization / Output Eval / Workflow E2E Eval の前提として、Skill package の構造・依存方向・routing・最低限の機械検証を整える。
- 期待成果: 既存 Skill の実行意味論を変えず、Skill 固有 workflow は package 単体から理解できる。Repository 固有 policy / Product Contract / command / path は logical external input として root 側から対応づけ、Skill package 自身は root 固定 path を workflow の正本として要求しない。

---

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
- [ ] `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` には task -> Skill の適用条件・Entry Point・routing hierarchy を残さず、Repository 固有 contract / policy / lifecycle / concrete mapping だけを残す。
- [ ] `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` が portable Skill workflow の二重正本になっていない。
- [ ] `docs/reference/repair-loop.md` / `docs/reference/harness-improvement-loop.md` / `docs/reference/agentic-qa-workflow.md` 等を残す場合、package と同じ Skill 固有 workflow を二重保持していない。
- [ ] `docs/native/windows-android-local-validation.md` 等を残す場合、人間が実行する Repository runbook としての具体 command / version / setup / troubleshooting を維持しつつ、generic retry / stop / failure decision の正本にはなっていない。
- [ ] `feature-plan` の汎用 Plan Output Template は package-local asset が canonical である。
- [ ] `exploratory-qa` の Mode selection / Mode boundary は package-local workflow が canonical である。
- [ ] `exploratory-qa` の Charter / Required Coverage / Budget / Stop / Evidence / Finding / finalization の portable semantic contract が package-local `workflow.md` だけで理解できる。
- [ ] Repository-side QA Machine Contract に残るのは concrete schema / field name / schema version / artifact path / validator command / scoring implementation 等の Repository 固有機械契約であり、portable semantic contract の正本ではない。
- [ ] 既存のOutput記述を確認し、コピー・展開して使う静的 skeleton だけを必要に応じて `assets/` へ移し、fieldの意味・必須条件・制約だけの記述から新Templateを発明していない。
- [ ] package structure / frontmatter / identity / local file link integrity を確認する最小 validator がある。
- [ ] Skill package 内の machine-checked local file link が package 外へ escape した場合、validator が FAIL する。
- [ ] Skill directory 名と frontmatter `name` が一致しない場合、validator が FAIL する。
- [ ] validator が local quality gate と既存 CI quality job から実行される。
- [ ] validator test が既存 `pnpm run test` から到達する test suite に含まれ、最終 `pnpm run verify` で必ず実行される。
- [ ] 6 Skill の frontmatter `name` / `description` が PR1 baseline と一致する。
- [ ] MUST / MUST NOT / stop condition / required output / evidence requirement / approval boundary に意図しない semantic change がない。
- [ ] PR2 以降の Trigger Eval / description optimization / Output Eval / Workflow E2E Eval を実装していない。

---

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

現行の Candidate field 一覧や Output format が単なる意味契約なのか、実際にコピー・展開して使う静的 skeleton なのかは Phase 0 で分類する。前者なら `references/` に残し、後者だけを `assets/` へ移す。field一覧だけを根拠に新Templateを作らない。

### `exploratory-qa`

現行 package は `SKILL.md` 1ファイルだけで、Normal / Gray-box / Black-box Scored の選択・実行境界、exploration workflow、Charter、Required Coverage、Budget / Stop、Evidence / Finding、finalization 等を抱えている。

さらに `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` にも Mode selection、bootstrap、runtime exploration、evidence / findings、Scored boundary 等の Skill 固有 workflow が重複している。

PR1後は次へ固定する。

```text
.agents/skills/exploratory-qa/
├── SKILL.md
└── references/
    ├── workflow.md
    └── scored-mode.md
```

`workflow.md` に残す portable semantic contract:

- Normal / Gray-box の共通 workflow
- Charter の役割と、Charter が最低限表現すべき意味
- Required Coverage の意味と bounded mission の考え方
- exploration budget / stop condition の意味
- risk analysis / bounded exploration
- Evidence として満たすべき性質と、単なる screenshot / notes だけでは不足するという既存意味
- Finding の atomicity (`1 Finding = 1 distinct product deviation`)
- Expected / Actual / Reproduction / Oracle / Role・Seed / Evidence / Severity / Confidence 等が表す意味
- finalization / source-diff zero / stop conditions の意味

`scored-mode.md` に置くもの:

- Black-box Scored selection
- isolation / Fresh Session
- trusted capability / trusted receipts
- forbidden boundary
- Official Scored Run の blocker / stop semantics

Repository-side `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` / `scripts/agentic-qa/**` に残してよい concrete machine contract:

- concrete JSON field name / schema version
- Zod schema / allowed values の実装
- `qa-charter.json` / challenge / finding の Repository-specific schema binding
- artifact identity / benchmark identity / concrete artifact path
- concrete validator / preparation / evaluation command
- Repository-specific scoring implementation / metric connection
- Scenario Shop 固有の preparation harness integration

つまり、別RepositoryへSkill packageだけ移しても「Charter / Coverage / Budget / Evidence / Findingとは何か」は理解できる状態にする。一方、具体的なJSON schemaやRepository artifact pathまでpackageへ複製しない。

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

ただし、PR1後の task -> Skill routing の正本は `AGENTS.md` だけにする。したがって、以下のような routing 的記述は root文書から除く。

- 「この依頼ではこのSkillを使う」という適用条件
- Skill Entry Point / 入口ファイルの案内
- Skill選択・切替のhierarchy
- `AGENTS.md` と同じ task -> Skill routing

root文書に残してよいのは、その文書固有の Repository contract / policy / lifecycle / concrete mapping である。

PR1後の代表的な Repository-side責務:

- `QA_AGENT.md`: Scenario Shop 固有 Machine Contract / concrete artifact schema / Repository script mapping / scoring implementation
- `CODE_REVIEW.md`: Repository 固有 Coding Standards / 外部レビュー起動承認 / report file policy
- `PLANS.md`: Repository 固有 plan lifecycle / 保存 path / filename / active run connection

Root / repository reference に残さない Skill 固有責務:

- 汎用 review workflow / findings contract
- 汎用 planning ambiguity handling
- 汎用 QA Mode selection / exploration workflow / Charter・Evidence・Finding の portable semantic contract / Scored isolation decision
- repair-loop 固有 stop / iteration workflow
- harness-improvement 固有 Candidate workflow
- Android local validation の generic retry / stop / failure decision semantics

### Existing quality gate

`pnpm run verify` は format / Markdown lint / spec validation / curriculum validation / lint / typecheck / image validation / security / test / build 等を含む重い総合 gate である。

Skill単位 migration ごとに full `verify` を回さない。

- validator実装直後: `test:repository` と `validate:skills` で validator 自身を確認する。
- Skill migration中: `validate:skills` と `lint:markdown` だけを基本とする。
- 最終総合判定: `pnpm run verify` を1回実行する。

既存 `pnpm run test` は `test:repository` を含む。Skill validator test は原則 `tests/repository-contract/` に配置して既存 `test:repository` から到達させ、新しいvalidator専用test aggregate commandを増やさない。

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

### Template / Output Contract の分類ルール

Issue #117 の `assets/` 整理は、形式的にTemplateファイルを増やすことを意味しない。

既存内容を次の基準で分類する。

- 実行時にそのままコピー・展開して値を埋める静的 skeleton -> Skill固有なら `assets/`
- fieldの意味、必須条件、allowed value、順序、制約、出力品質を定義する契約 -> `references/` の Output Contract / workflow
- 単なるfield一覧・Required format・candidate modelから、新しいcopyable TemplateをPR1で考案しない
- 既存に静的 skeleton がある場合は、意味を変えずに移設する

このため、`feature-plan` は実在する `docs/plans/TEMPLATE.md` を asset 化する。一方 `code-review` / `harness-improvement` / `exploratory-qa` は Phase 0 で現行内容を上記基準で確認し、実在するcopyable skeletonがなければ新しいassetを作らない。

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
- PR1で既存に存在しない Output Template を発明すること
- 変更しない文書sectionまで網羅的にmigration matrixへ転記すること

---

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
- Charter / Evidence / Finding の portable semantic contract と concrete QA Machine Contract の分類によって既存QA behaviorが変わる。

### 仮定してよい細部

- validator script の具体ファイル名
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
- `exploratory-qa` の Charter / Coverage / Budget / Evidence / Finding の portable semantic contract を Repository-side schemaへ追い出さないこと
- copyable skeleton が存在しないSkillに、新しいTemplate assetを発明しないこと
- validator test を `pnpm run verify` から到達しない独立経路に置かないこと
- `PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` に task -> Skill routing を残すこと

---

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
- `tests/repository-contract/**` の validator test
- `.github/workflows/ci.yml`

---

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

これらを機械lintする新ツールは作らない。

ただし Phase 0 で一覧化するのは、**今回実際に移設・削除・責務変更・external input化する必要がある候補だけ**とする。変更しない Repository-specific section を網羅的に転記しない。

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

#### 7. Output Contract と Template を意味で分ける

- field意味 / required condition / allowed value / ordering / quality rule -> `references/`
- そのままコピー・展開して値を埋める既存 static skeleton -> `assets/`
- Output ContractをTemplateに見立てて形式だけのassetを追加しない

PR1では既存意味の移設だけを行い、新しいTemplate designをしない。

#### 8. PR1では frontmatter routing behaviorを変えない

6 Skill の `name` / `description` を freeze する。

`description`に Repository固有 wording が残っても、PR2 baseline / PR3 optimization のため意図的に維持する。

#### 9. `AGENTS.md` は routing / input mapping に集中する

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

#### 10. Root文書は routing ではなく固有責務だけを持つ

`PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` から次を削除する。

- task type から Skill を選ぶ適用条件
- Skill Entry Point / 「使い方」形式のrouting案内
- Skill切替hierarchy
- `AGENTS.md` と重複する task -> Skill routing

残すもの:

- Repository 固有 contract
- Repository 固有 policy
- lifecycle / storage contract
- concrete machine schema / script mapping
- external review approval 等、当該root文書固有のルール

Root文書を短くすること自体は目的ではない。routing重複とportable workflow重複をなくすことが目的である。

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
3. `CODE_REVIEW.md` の `適用条件` / `Entry Point` / `使い方` 等、task -> code-review Skill routing を担う記述は削除する。
4. `SKILL.md` は logical external input として repository coding policy を要求できるが、`CODE_REVIEW.md` 固定pathを必須読込しない。
5. 現行 `Required review format` 等を Template分類ルールで確認する。field / order / meaning の契約だけなら `review-workflow.md` に残し、既存にcopyable static skeletonがある場合だけ `assets/` へ移す。
6. field一覧から新しいReview Templateを発明しない。明確な既存skeletonがなければ新規assetは追加しない。
7. code-review migration内で `CODE_REVIEW.md` の重複削除と `AGENTS.md` mapping更新まで完了する。

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
5. `PLANS.md` から task -> feature-plan Skill の適用条件 / Entry Point / routing を削除する。
6. `SKILL.md` は plan-save-before-implementation boundary を維持する。
7. package自体は `docs/plans/` 固定pathを workflow正本にしない。
8. feature-plan migration内で `PLANS.md` / `docs/plans/TEMPLATE.md` / `AGENTS.md` まで整理する。

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
3. `improvement-workflow.md` 内に埋め込まれた `.codex/**` / root docs / scripts 等のRepository-specific target値を、**今回変更が必要なものだけ** inventory し、Skill workflow本体と分離する。
4. Candidate field一覧 / Output formatをTemplate分類ルールで確認する。意味契約ならreferenceに残し、既存copyable skeletonが実在する場合だけasset化する。
5. `SKILL.md` から repository-side docs を core workflow正本として必須読込しない。
6. 新規 policy / script / schema / invented Template を追加しない。
7. harness-improvement migration内で repository reference / `AGENTS.md` mappingまで整理する。

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

1. `workflow.md` に Normal / Gray-box 共通workflowと portable semantic contractを集約する。
2. `workflow.md` には最低限、Charter role / minimum semantics、Required Coverage、Budget / Stop、risk / exploration、Evidence sufficiency、Finding atomicity / field meaning、finalization / source-diff zero / stop semanticsを残す。
3. `scored-mode.md` に Black-box Scored selection / isolation / Fresh Session / trusted capability / forbidden boundary / blocker / stopを移す。
4. Mode selection / Mode boundaryを `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` の独立正本として残さない。
5. `QA_AGENT.md` / Repository-side docsには concrete JSON field name / Zod schema / schema version / artifact path / validator commands / scoring implementation等を残す。
6. `QA_AGENT.md` から task -> exploratory-qa Skill の適用条件 / Entry Point / routing を削除する。QA固有 Machine Contract は維持する。
7. `docs/reference/agentic-qa-workflow.md` は必要なら Scenario Shop integration guide として残してよいが、portable Charter / Evidence / Finding semanticsを二重定義しない。
8. `scripts/agentic-qa/**` を移動・複製・再実装しない。
9. Product Specification / concrete QA Machine Contract / runtime capability / artifact storage 等は logical external input として扱う。
10. Charter / Finding等の既存出力記述をTemplate分類ルールで確認し、copyable skeletonが実在しない限り新しいassetを作らない。
11. referenceは `workflow.md` / `scored-mode.md` の2つより細分化しない。
12. exploratory-qa migration内で `QA_AGENT.md` / `docs/reference/agentic-qa-workflow.md` / `AGENTS.md` まで整理する。

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

PR1で必要なのは、Skill package の identity / package-local link integrity と、Repository-level routing / compatibility pointer の最小link integrityである。

Repository policy文書やNative runbook全体のlink checkerにはしない。汎用 Markdown checker / semantic linter / routing parser / Git diff analyzer は作らない。

#### 固定対象

常に対象:

- `.agents/skills/**/*.md`
- `AGENTS.md`

追加対象:

- PR1で**薄い compatibility pointer として実際に残したファイルだけ**

compatibility pointerを残す場合、そのpathをvalidator source内の小さい静的arrayへ明示的に追加する。例として `docs/plans/TEMPLATE.md` がpointerとして残るなら対象にする。

次の文書は「今回変更した」「Skillに関係する」という理由だけでは恒久validator対象にしない。

- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- 通常の `docs/reference/**`
- 通常の `docs/native/**`

これらは通常のRepository policy / integration / runbook文書としてMarkdown lintとmigration reviewで確認する。

Git diff / merge-base / event type / changed-files 判定を validator に持ち込まない。Repository全Markdownを探索しない。

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

validator testは `tests/repository-contract/` 配下へ追加し、既存 `pnpm run test:repository` -> `pnpm run test` -> `pnpm run verify` の経路で実行する。validator専用の新しいaggregate test commandは作らない。

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
- validator testは既存 `test:repository` から到達させ、`verify` でvalidator本体とvalidator testの両方が実行される状態にする。
- `.github/workflows/ci.yml` の既存 `style-quality` job に dedicated validator step を追加する。
- CIでfull `verify`を別途追加して既存lint/test/buildを二重実行しない。
- validator実装直後に `pnpm run test:repository` と `pnpm run validate:skills` を実行する。
- その後のSkill migration単位では `pnpm run validate:skills` と `pnpm run lint:markdown` を基本とし、validator実装を変更していない限り `test:repository` を毎回実行しない。
- 最終総合判定は `pnpm run verify` 1回とする。
- 最終 `verify` が失敗した場合だけ、`validate:skills` / `test:repository` / `lint:markdown` 等を個別に再実行して切り分ける。

---

## 6. 実行タスク

### Phase 0 — Minimal baseline / migration inventory

目的は「全関連文書の棚卸し」ではなく、**PR1で実際に責務変更する箇所を安全に特定すること**である。

記録対象は次に限定する。

- packageへ移設する箇所
- root / repository referenceから削除する重複箇所
- Repository-side shared contractへ残すか判断が必要な箇所
- logical external inputへ変換する Repository 固定依存
- package内に埋め込まれ、今回分離が必要な Repository-specific binding
- asset化判断が必要な既存Output記述
- semantic preservation確認が必要な変更対象の MUST / MUST NOT / stop / output / evidence 等

記録しないもの:

- 今回変更しない Repository 固有 policy section
- 今回変更しない coding standard / concrete command / environment value
- 「関連している」という理由だけの全section一覧
- 変更不要と明らかな文書内容の転記

タスク:

- [ ] 6 Skill の current `name` / `description` を baseline として記録する。
- [ ] 上記「記録対象」だけを migration matrix / working checklist に追加する。
- [ ] 変更対象について `package-local canonical` / `logical external input` / `Repository-side shared contract` / `Repository-specific mapping or concrete value` に分類する。
- [ ] asset化判断が必要な既存Output記述だけ、`copyable static skeleton` / `Output Contract` / `単なるfield一覧` に分類する。
- [ ] semantic invariant は、今回移設・削除・責務変更する箇所に関係するものだけ記録する。
- [ ] 変更対象の旧正本 -> 新正本を決める。

Migration matrixだけのために新しい `docs/**` を作らない。Implementation時の active `.codex/runs/<run_id>/PLAN.md` / `TASKS.md` 内 working checklist で管理する。

### Phase 1 — Minimal validator

- [ ] 既存 script conventionに合わせて validator配置を決める。
- [ ] validator testは `tests/repository-contract/` に配置する。
- [ ] package discovery / `SKILL.md` existence / frontmatter / duplicate name / directory-name一致を実装する。
- [ ] `.agents/skills/**/*.md` / `AGENTS.md` / 実在compatibility pointerの inline relative file target existence を実装する。
- [ ] package内 local link の same-skill-directory boundary を実装する。
- [ ] 最小 failure cases の test を追加する。
- [ ] routing parser / adapter schema / generic Markdown checker / Git diff analyzerへ拡張しない。
- [ ] 新しいvalidator test aggregate commandを追加しない。
- [ ] validator実装直後に `pnpm run test:repository` と `pnpm run validate:skills` を実行する。

### Phase 2 — Skill-by-Skill migration

**1 Skillごとに package移設 -> 対応root/reference cleanup -> `AGENTS.md` mapping -> targeted validation -> semantic確認まで完了してから次Skillへ進む。**

各Skill完了時の基本チェックは次だけとする。

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

validator code / validator test を変更していない限り、Skillごとに `test:repository` を再実行しない。

#### 2.1 `code-review`

- [ ] package workflowを整理する。
- [ ] `CODE_REVIEW.md` から generic workflow重複を除く。
- [ ] `CODE_REVIEW.md` の task -> Skill 適用条件 / Entry Point / 使い方を除き、Repository-specific policyだけ残す。
- [ ] Repository coding policy を external input として `AGENTS.md` でmappingする。
- [ ] `Required review format` 等をTemplate分類ルールで確認し、copyable skeletonがなければassetを増やさない。
- [ ] package外必須linkを残さない。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

#### 2.2 `feature-plan`

- [ ] `planning-workflow.md` を generic workflow / ambiguity handling の canonical にする。
- [ ] `assets/plan-template.md` を作り、既存Template本文を意味変更なく移す。
- [ ] `docs/plans/TEMPLATE.md` の二重本文を除去する。
- [ ] `PLANS.md` を Repository lifecycle / storage contractへ限定する。
- [ ] `PLANS.md` の task -> Skill 適用条件 / Entry Point / routingを除く。
- [ ] `AGENTS.md` で plan storage convention をmappingする。
- [ ] plan-save-before-implementation boundaryを保持する。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

#### 2.3 `repair-loop`

- [ ] repair-loop固有 workflowを package-localへ集約する。
- [ ] `docs/reference/repair-loop.md` の重複を除く。
- [ ] shared artifact / evaluation / scope contractだけ Repository-side input として残す。
- [ ] `AGENTS.md` mappingを整理する。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

#### 2.4 `harness-improvement`

- [ ] Skill固有 Candidate / strictness / evidence workflowを package-local canonicalにする。
- [ ] `docs/reference/harness-improvement-loop.md` の重複を除く。
- [ ] shared evaluation / taxonomyだけ Repository-side inputとして残す。
- [ ] Candidate model / Output formatをTemplate分類ルールで確認し、copyable skeletonがなければassetを増やさない。
- [ ] package内Repository-specific bindingは、Phase 0で**変更必要と判定したものだけ**分離する。
- [ ] `AGENTS.md` mappingを整理する。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

#### 2.5 `exploratory-qa`

- [ ] `references/workflow.md` を作る。
- [ ] `references/scored-mode.md` を作る。
- [ ] Mode selection / boundaryをpackage-local canonicalにする。
- [ ] Charter / Required Coverage / Budget / Stop / Evidence / Finding / finalization の portable semantic contractを `workflow.md` へ残す。
- [ ] concrete JSON schema / field name / schema version / artifact path / validator / scoringはRepository-side Machine Contractへ残す。
- [ ] `QA_AGENT.md` から portable QA workflow / semantic contract重複を除く。
- [ ] `QA_AGENT.md` の task -> exploratory-qa Skill 適用条件 / Entry Point / routingを除く。
- [ ] `docs/reference/agentic-qa-workflow.md` から portable Mode / exploration / semantic contract重複を除く。
- [ ] Scenario Shop-specific Machine Contract / schema / scripts / scoring mappingは Repository-sideに残す。
- [ ] Charter / Finding等のOutput記述をTemplate分類ルールで確認し、copyable skeletonがなければassetを増やさない。
- [ ] `scripts/agentic-qa/**` を変更・複製しない。
- [ ] `AGENTS.md` input mappingを整理する。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

#### 2.6 `android-native-local-validation`

- [ ] `references/windows-android-workflow.md` を作る。
- [ ] generic retry / stop / failure / completion / evidence semanticsをpackage-local canonicalにする。
- [ ] native runbook の具体的 command sequence / step-by-step example / version / path / setup / troubleshooting は維持する。
- [ ] native runbookから削除するのは、packageと競合するgeneric decision ruleに限定する。
- [ ] `docs/native/windows-android-troubleshooting.md` も同じ責務境界で確認する。
- [ ] `scripts/native/windows/android-local.ps1` を Repository-specific command inputとして維持する。
- [ ] `AGENTS.md` input mappingを整理する。
- [ ] Windows + PowerShell + physical Android contractが変わっていないことを確認する。
- [ ] `validate:skills` / Markdown lint / semantic invariant確認を行う。

### 各Skillの完了条件

各Skillを次へ進める前に全部満たす。

- [ ] package内からSkill固有workflow / output meaning contractを理解できる。
- [ ] package-local reference / asset選択が一意である。
- [ ] machine-checked package内local linkがpackage外へescapeしていない。
- [ ] package内に不必要なRepository固定path bindingが残っていない。
- [ ] 対応root/referenceに同じdetailed decision workflow / portable output meaning contractの二重正本が残っていない。
- [ ] Repository-specific contract / concrete commandをpackageへ複製していない。
- [ ] copyable skeletonがないのに形式だけのassetを追加していない。
- [ ] root文書に当該Skillの task -> Skill routingが残っていない。
- [ ] `AGENTS.md` の当該Skill mappingが更新されている。
- [ ] `name` / `description` がbaselineと一致する。
- [ ] semantic invariantに意図しない変更がない。

### Phase 3 — Global routing / link normalization

Skill単位migration後、Repository全体の整合だけ確認する。

- [ ] `AGENTS.md` の6 Skill routingが一意である。
- [ ] `PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` に task -> Skill routing / Entry Point / 適用条件が残っていない。
- [ ] machine-checkが必要なSkill entrypoint / compatibility pointerが inline relative Markdown link になっている。
- [ ] `AGENTS.md` にdetailed workflowが流入していない。
- [ ] root -> Skill -> root の detailed canonical cycleがない。
- [ ] Skill package / `AGENTS.md` / 実在compatibility pointerのlocal linksがvalidatorでPASSする。
- [ ] Repository policy / integration / native runbookをSkill validatorの恒久責務へ広げていない。
- [ ] package boundary validationが6 SkillすべてPASSする。

### Phase 4 — Gate integration / final verification

- [ ] `package.json` に dedicated Skill validation script を追加する。
- [ ] `pnpm run verify` から Skill validatorが到達可能になるようにする。
- [ ] validator testが既存 `test:repository` から到達することを確認する。
- [ ] `.github/workflows/ci.yml` の既存 `style-quality` job に dedicated validator stepを追加する。
- [ ] CIで既存 lint / test / buildを二重実行していないことを確認する。
- [ ] full `pnpm run verify` を最終総合gateとして1回実行する。
- [ ] `verify` 失敗時だけ必要な個別commandを再実行して原因を切り分ける。
- [ ] changed-files reviewで PR2以降 / product変更 / dependency変更が混ざっていないことを確認する。

---

## 7. 検証方法

### Validator実装直後

validator本体・testを作った直後にだけ、最低限次を実行する。

```bash
pnpm run test:repository
pnpm run validate:skills
```

### Skill migration中の Targeted checks

各Skill migration単位の完了時に実行する。

```bash
pnpm run validate:skills
pnpm run lint:markdown
```

validator code / validator testを変更していない限り、Skillごとに `test:repository` を繰り返さない。

### Validator tests

`tests/repository-contract/` で最低限以下を確認する。

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

- package単体で Skill workflow / decision / stop / output meaning contract を理解できる。
- package内からroot固定pathをcore workflow正本として必須読込していない。
- external inputが意味的な名前で明示されている。
- `AGENTS.md` / Repository docsに現在Repositoryでの具体mappingがある。
- package内 machine-checked local file linkが同一Skill directory内へ解決される。
- root -> Skill -> root detailed source-of-truth cycleがない。

`exploratory-qa` は追加で確認する。

- packageだけで Charter / Required Coverage / Budget / Stop / Evidence / Finding / finalization の意味が理解できる。
- concrete schema / JSON field naming / artifact path / validator commandをpackageへ二重実装していない。

### Semantic preservation checks

Phase 0で記録した**変更対象だけ**をbefore / after比較する。

確認項目:

- trigger / exclusion
- MUST / MUST NOT
- inputs
- outputs
- evidence requirements
- approval boundary
- stop conditions

重点確認:

- `feature-plan`: ambiguity handling / plan-save-before-implementation / Template項目
- `code-review`: finding output meaning / required formatの意味
- `exploratory-qa`: Normal / Gray-box / Black-box Scored selection / boundary / Charter / Evidence / Finding semantics
- `repair-loop`: bounded iteration / repeated failure / unsafe / scope stop
- `harness-improvement`: Candidate model / auto-apply禁止 / strictness / evidence / review
- `android-native-local-validation`: Windows / PowerShell / physical Android / retry / stop / Git禁止条件

変更していないsectionのsemantic invariantを改めて棚卸ししない。

### Root responsibility checks

- `AGENTS.md` 以外に競合する task -> Skill routing hierarchyがない。
- `PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` に task -> Skill 適用条件 / Entry Point / 「使い方」形式のroutingが残っていない。
- `QA_AGENT.md` は Scenario Shop specific concrete machine contractを保持するが Mode workflow / Charter・Evidence・Finding portable semantic contractの正本ではない。
- `docs/reference/agentic-qa-workflow.md` は Scenario Shop integrationを保持してよいが generic exploratory workflow / portable semantic contractの正本ではない。
- `CODE_REVIEW.md` は Repository-specific review policyを保持する。
- `PLANS.md` は Repository-specific lifecycle / storage contractを保持するが ambiguity handlingの正本ではない。
- `docs/plans/TEMPLATE.md` を残す場合はTemplate本文の二重正本ではない。
- `docs/reference/repair-loop.md` / `harness-improvement-loop.md` は packageと同じSkill workflowを二重保持しない。
- Native runbookは具体的な人間向け実行手順を保持しつつ、generic retry / stop / failure decisionの正本ではない。

### Template classification checks

- `feature-plan`: 既存copyable Plan Templateをpackage assetへ移している。
- `code-review`: Required review formatが契約だけならreferenceに残し、Templateを新発明していない。
- `harness-improvement`: Candidate field一覧 / Output formatが契約だけならreferenceに残し、Templateを新発明していない。
- `exploratory-qa`: Charter / Findingの意味契約とconcrete machine schemaを分離し、既存copyable skeletonがない限りassetを新発明していない。

### Final repository gate

最終総合判定は次の1コマンドだけとする。

```bash
pnpm run verify
```

PR1で `verify` に `validate:skills` を組み込み、validator testは既存 `test:repository` -> `test` 経路で既に `verify` に含まれるため、最終段階で `validate:skills` / `test:repository` / `lint:markdown` を先に重複実行しない。`verify` が失敗したときだけ個別commandを再実行して原因を切り分ける。

product E2E / native runtime smoke をPR1の新規必須gateへ追加しない。

### 成功判定

- `pnpm run verify` PASS
- dedicated Skill validator / validator tests PASS
- validator testsが `test:repository` 経由で `verify` に含まれている
- 6 Skill semantic invariantに意図しない差分なし
- Skill directory名とfrontmatter `name` が一致
- package内部workflow / dependency structureがportable
- package内 machine-checked local linksにpackage escapeなし
- Repository-specific inputsはrootから一方向mapping
- detailed source-of-truth cycleなし
- `AGENTS.md` 以外に task -> Skill routing の正本なし
- `PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` はRepository固有責務だけを保持
- `feature-plan` Templateはpackage-local canonical
- planning ambiguity handlingはpackage-local canonical
- `exploratory-qa` Mode selection / boundary / Charter・Coverage・Budget・Evidence・Finding semantic contractはpackage-local canonical
- Repository-side QA Machine Contractは concrete schema / path / command / scoringに限定され、portable semantic contractの二重正本ではない
- copyable skeletonが存在しないSkillに形式だけのTemplate assetを追加していない
- `docs/reference/agentic-qa-workflow.md` はportable QA workflowの二重正本ではない
- Android runbookの具体的な実行性を維持しつつ、packageとgeneric decision ruleが二重正本になっていない
- AndroidはWindows contractのまま
- `name` / `description`はbaseline維持
- description portability / optimizationは意図的にPR3へ残る
- PR1外変更なし

---

## 8. リスクと対策

### 1. Semantic drift during relocation

**Risk:** 短文化の過程で stop / MUST / evidence requirement を落とす。

**Mitigation:** Phase 0で変更対象のsemantic invariantだけbefore / after確認し、短文化ではなく正本移設として扱う。

### 2. Migration inventory overwork

**Risk:** 関連文書をsection単位で網羅的に棚卸しし、実装よりinventory作成の方が重くなる。

**Mitigation:** migration matrixは移設 / 削除 / 責務変更 / external input化 / asset判断が必要な箇所だけを対象にする。変更しないsectionは記録しない。

### 3. Skill migrationとroot cleanupを分離しすぎる

**Risk:** packageを移した後もrootに旧workflowが残り、実装途中で二重正本になる。

**Mitigation:** 1 Skillごとに package -> root/reference cleanup -> AGENTS mapping -> validationまで閉じてから次Skillへ進む。

### 4. Root routing residue

**Risk:** `AGENTS.md` をrouting SSOTにしても、`PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` に `適用条件` / `Entry Point` / `使い方` が残り、task -> Skill routingが二重化する。

**Mitigation:** root文書からtask -> Skill選択だけを明示的に削除し、Repository固有policy / lifecycle / concrete contractは維持する。

### 5. Reverse root dependency

**Risk:** root重複を削ってもSkillからroot固定path必須読込が残る。

**Mitigation:** logical external input化し、package内 machine-checked linkのpackage boundaryをvalidatorで強制する。

### 6. Hidden Repository binding

**Risk:** Markdown link以外の prose / command / artifact pathにRepository-specific bindingが残る。

**Mitigation:** Phase 0で今回分離が必要なpackage内部bindingだけinventoryする。これ専用の新lintは作らない。

### 7. Root document over-pruning

**Risk:** routing削除・重複削除のついでにRepository固有contractまでpackageへ移してしまう。

**Mitigation:** packageへ移すのは別Repositoryでも必要なSkill判断・output meaning。具体path / product contract / machine schema / command / environment valueはRepository-sideに残す。

### 8. Android runbook over-pruning

**Risk:** 二重正本除去を理由に、既存runbookの具体的な実行順・command・troubleshootingまで削り、人間向け運用性を落とす。

**Mitigation:** packageへ移すのは generic retry / stop / failure / completion decision。runbookの具体 command sequence / step-by-step exampleは維持してよい。

### 9. `agentic-qa-workflow.md` が二重正本として残る

**Risk:** `exploratory-qa` referencesを新設しても既存referenceにMode / exploration / Charter・Evidence・Finding semantic contractが残る。

**Mitigation:** exploratory-qa migrationの同一単位で `QA_AGENT.md` と `docs/reference/agentic-qa-workflow.md` を整理する。

### 10. Exploratory QA becomes non-portable by exporting semantics with schema

**Risk:** concrete schemaをRepository-sideへ残す際、Charter / Evidence / Findingの意味契約まで一緒に外へ追い出し、Skill package単体では成果物の意味が分からなくなる。

**Mitigation:** portable semantic contractは `workflow.md`、concrete schema / field name / path / validator / scoringはRepository-sideと明示的に分離する。

### 11. Template proliferation

**Risk:** Issue本文の「Templateをassetsへ」を機械的に解釈し、field一覧しかないSkillにも新しいTemplateを作る。

**Mitigation:** copyable static skeletonだけasset化する。Output Contractやfield一覧からTemplateを発明しない。

### 12. Validator over-engineering

**Risk:** generic Markdown checker / AST framework / routing parser / Git diff parser / Repository docs checkerへ膨張する。

**Mitigation:** Skill package + `AGENTS.md` + 実在compatibility pointerだけを対象にし、frontmatter identity + inline relative file existence + package escape checkに限定する。

### 13. Validator test over-execution

**Risk:** 文書migrationのたびに `test:repository` を再実行し、実装変更のないvalidator testへ不要な実行コストを掛ける。

**Mitigation:** `test:repository` はvalidator実装直後に実行し、その後はvalidator code/testを変更した場合だけ再実行する。最終的には `verify` で再度通る。

### 14. Validator tests bypass the final gate

**Risk:** validator専用test commandを作って手動実行だけにし、`pnpm run verify`ではvalidator自身の回帰を検知できない。

**Mitigation:** testを `tests/repository-contract/` に置き、既存 `test:repository` -> `test` -> `verify` の経路を使う。

### 15. Routing baseline contamination

**Risk:** PR1でdescriptionを改善してPR2 baselineを壊す。

**Mitigation:** `name` / `description` freeze。workflow portabilityとmetadata portabilityを明確に分ける。

### 16. Template two sources of truth

**Risk:** package assetと`docs/plans/TEMPLATE.md`に同じ本文を残す。

**Mitigation:** package asset canonical。rootは削除可能なら削除、必要ならpointerだけ。

### 17. Adapter abstraction creep

**Risk:** logical external inputを口実に新しいschema / resolver / injection mechanismを作る。

**Mitigation:** adapterはMarkdown上のmappingに限定し、新実行機構をNon-goalにする。

---

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
- code-review / harness-improvement / exploratory-qa の `assets/**`（Phase 0で既存copyable skeletonが確認できた場合のみ）
- `docs/plans/TEMPLATE.md`（compatibility維持が必要な場合）
- `docs/reference/repair-loop.md`（shared contract / compatibilityが残る場合）
- `docs/reference/harness-improvement-loop.md`（shared contract / compatibilityが残る場合）
- `docs/reference/agentic-qa-workflow.md`
- `docs/native/windows-android-local-validation.md`
- `docs/native/windows-android-troubleshooting.md`（責務重複がある場合）
- Skill validator script
- `tests/repository-contract/**` の validator test
- `package.json`
- `.github/workflows/ci.yml`

すべてを変更することが目的ではない。責務重複がないfileは不要に触らない。

### 付随ドキュメント

- migration matrix専用の新規durable documentは作らない。
- このPlan以外の新規reportは原則不要。
- README / curriculum / product specは本変更の理解に不可欠な場合だけ更新する。

### 実装順

1. current repository factを再確認する。
2. active run内に、**変更対象だけ**の baseline / migration matrix / hidden Repository binding / Template classification inventory を作る。
3. minimal validatorと `tests/repository-contract/` のvalidator testを完成させ、`test:repository` / `validate:skills` を実行する。
4. `code-review` を package + root routing/workflow cleanup + AGENTS + validationまで完了する。
5. `feature-plan` を同様に完了する。
6. `repair-loop` を同様に完了する。
7. `harness-improvement` を同様に完了する。
8. `exploratory-qa` を portable semantic contract / `QA_AGENT.md` routing・workflow cleanup / `agentic-qa-workflow.md` cleanup込みで完了する。
9. Androidを native docs責務分離込みで完了する。ただし人間向けrunbookの具体手順は維持する。
10. global routing / Skill package / compatibility-pointer link整合を確認する。
11. validatorを `package.json` / CIへ接続し、testは既存 `test:repository` 経路を維持する。
12. full `pnpm run verify`を最終総合gateとして1回実行する。
13. changed-files / dependency direction / semantic preservation / Template classificationを最終レビューする。

### 配置判断ルール

迷った場合は次の順で判断する。

1. 別RepositoryへSkill packageだけ移しても必要な実行判断・成果物の意味か？
   - Yes -> package-local。
2. concrete schema / JSON field name / path / Product Contract / command / environment valueか？
   - Yes -> Repository-side external input / mapping。
3. 複数Skillが共有するRepository-wide safety / artifact / taxonomy contractか？
   - Yes -> Repository-side shared input。
4. 実行時にそのままコピー・展開して使う既存 static skeletonか？
   - Skill固有なら package `assets/`。
5. field意味 / required condition / output quality ruleだけか？
   - package `references/`。Templateを新発明しない。
6. task -> Skill routingか？
   - `AGENTS.md`。`PLANS.md` / `CODE_REVIEW.md` / `QA_AGENT.md` に重複させない。
7. package内からpackage外fileへ直接linkしたくなったか？
   - 行わず logical external inputへ変換する。
8. Android runbookの具体command / step-by-step exampleか？
   - Repository-side runbookへ残してよい。generic decision ruleだけpackage canonicalにする。
9. 分類するとsemantic behaviorが変わるか？
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
- Repository policy / native runbook全体をSkill validatorで検査できる
- field一覧から新しいTemplateを設計できる
- 変更しない文書sectionまでmigration matrixへ整理できる

これらは Issue #117 の後続PRまたは別Issueへ送る。

Rollbackはdocs / tooling構造変更としてPR単位でrevert可能とする。package移設途中の不完全な状態をmainへ入れない。
