# Issue #117 PR1 — Portable Skill Packaging and Routing Cleanup

## Target Outcome

Issue #117 の PR1 として、以下の 6 Skill をそれぞれ自己完結性の高い portable package に整理する。

- `.agents/skills/exploratory-qa`
- `.agents/skills/code-review`
- `.agents/skills/feature-plan`
- `.agents/skills/repair-loop`
- `.agents/skills/harness-improvement`
- `.agents/skills/android-native-local-validation`

完了時には、各 `SKILL.md` が「いつ使うか / 何を入力とするか / 何を出力するか / どの reference・asset を読むか / 主要 guardrail」に集中し、詳細な workflow、stop condition、checklist、command 手順は各 Skill package 内の `references/` / `assets/` に置かれていること。

同時に、root の agent 文書は重複した実行手順を持たず、`AGENTS.md` を routing の single source of truth として薄い入口に整理する。Skill package と root routing の参照整合性を機械検証できる validator を追加し、ローカル品質ゲートと CI の両方で参照切れ・package 構造崩れを検知できる状態にする。

この PR は **構造整理のみ** を対象とし、既存 Skill の判断基準・停止条件・成果物契約・実行意味論を意図的に変更しない。

## Scope

### Skill packages

- `.agents/skills/exploratory-qa/**`
- `.agents/skills/code-review/**`
- `.agents/skills/feature-plan/**`
- `.agents/skills/repair-loop/**`
- `.agents/skills/harness-improvement/**`
- `.agents/skills/android-native-local-validation/**`

### Root routing / compatibility documents

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- Skill package 外に残っている上記 6 Skill 専用 reference のうち、package 内へ移すべきもの
  - 例: `docs/reference/repair-loop.md`
  - その他は実装時に参照元を inventory して確定する

### Validation / quality gate

- Skill package と内部参照を検証する repository-local validator
- validator を呼び出す `package.json` script
- `.github/workflows/ci.yml` の既存 quality job への validator 接続
- validator 自身の最小限の repository test

## Non-Goals

- Issue #117 の PR2 以降に属する変更
- QA workflow、code review policy、planning policy、repair policy、harness policy の意味変更
- `exploratory-qa` の対象選定ロジックや証跡要件の再設計
- Android native validation の対象 OS / device policy / command behavior の変更
- product code、Web / Native UI、Typesense、検索、E2E、release smoke の変更
- 新しい agent framework、runner、automatic repair loop の導入
- CI 全体の再設計や既存 job の統廃合
- dependency 更新
- 既存 Markdown 全体を対象にした汎用 link checker の導入
- Skill の「良し悪し」を行数だけで判定する lint rule の導入

## Constraints

- **Semantic preservation:** 移設・要約によって、既存の MUST / MUST NOT / stop condition / required output / evidence requirement / approval boundary を欠落・緩和・強化しない。
- **No hidden behavior change:** 構造整理の途中で改善したくなった既存 policy は、この PR では変更しない。意味変更が必要なら別 Issue / 別 PR に切り出す。
- **Routing SSOT:** Skill 選択の正本は `AGENTS.md` とし、`QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` に独立した routing hierarchy を残さない。
- **Package locality:** Skill 固有の詳細手順は可能な限り当該 `.agents/skills/<skill>/` 配下から解決できるようにする。
- **Shared repository policy:** 複数 Skill に共通する repository-wide policy を無理に複製しない。共有 policy を root / `docs/reference/` に残す場合は、Skill 固有手順ではなく本当に横断ルールであることを確認する。
- **Stable entry points:** 既存 root 文書を直接読む利用者を考慮し、削除が不要な文書は薄い compatibility / overview 文書として残す。
- **Deterministic validation:** package validator は network や外部サービスに依存せず、checkout だけで再現可能にする。
- **Avoid circular references:** `AGENTS.md -> SKILL.md -> root detailed doc -> SKILL.md` のような循環した正本構造を作らない。
- **Migration order:** 正本の移設先を作成・検証してから root 側の重複記述を削る。一時的にも必要な指示を失わない。

## Acceptance Criteria

1. 6 Skill すべてについて、`SKILL.md` が routing / contract の役割に絞られ、詳細 workflow は package 内 `references/` / `assets/` に分離されている。
2. 各 `SKILL.md` から、実行に必要な package-local reference / asset へ辿れる。
3. `AGENTS.md` に task -> Skill の一意な routing があり、他の root 文書が別の routing 正本を持たない。
4. `QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` は、必要な repository-wide overview / compatibility 情報と canonical Skill への参照だけを持ち、Skill 固有の詳細手順を重複保持しない。
5. `docs/reference/repair-loop.md` のように Skill 固有で package 外に残っている詳細 reference は、内容を失わず package 内へ統合するか、明示的な共有理由がある場合のみ外部正本として残す。
6. 現時点で存在する Skill package 内外の dangling reference を解消する。特に `harness-improvement` が指す reference は実在確認を行い、存在しない参照を残さない。
7. repository-local validator が少なくとも次を検証する。
   - 対象 Skill directory に `SKILL.md` が存在する
   - `SKILL.md` の frontmatter が存在し、`name` / `description` が空でない
   - Skill 名の重複がない
   - Skill package 内から参照する明示的な `references/...` / `assets/...` の target が存在する
   - `AGENTS.md` 等の canonical routing が参照する対象 Skill path が存在する
8. validator は通常の説明文や code sample を誤って link と見なすような広すぎる解析を避ける。検証対象 syntax / path pattern が明示され、test で固定されている。
9. validator を実行する専用 script（例: `pnpm run validate:skills`）があり、ローカルの総合 gate から実行される。
10. `.github/workflows/ci.yml` の既存 quality job から validator が実行される。既存 CI の責務を重複させる新 job は原則追加しない。
11. 既存の `pnpm run verify` 相当の品質ゲートと validator test が成功する。
12. migration 前後の semantic preservation review を行い、MUST / MUST NOT / stop conditions / required outputs / evidence requirements / approval boundaries に意図しない差分がないことを確認する。
13. PR1 と無関係な product / test behavior / release workflow の変更が diff に含まれない。

## Design

### 1. Common Skill package contract

6 Skill に共通する最小構造を次の考え方で揃える。

```text
.agents/skills/<skill>/
├── SKILL.md
├── references/
│   └── ... detailed workflow / policy / checklist
└── assets/
    └── ... executable helper / reusable asset (必要な Skill のみ)
```

`SKILL.md` は長文の手順書ではなく、agent が最初に読む routing / contract とする。原則として以下だけを持つ。

- purpose / when to use
- when not to use（隣接 Skill と誤 routing しやすい場合）
- required inputs
- expected outputs
- reference / asset の reading order または選択条件
- 最上位 guardrail / stop boundary

詳細 workflow、step-by-step command、長い checklist、evidence schema の説明は `references/` に置く。

行数上限は設けない。目的は短文化そのものではなく、正本と責務を明確にすること。

### 2. Routing SSOT

`AGENTS.md` を repository の agent routing entrypoint とする。

- task type
- 使用 Skill
- Skill path
- 主要な選択条件 / exclusion

だけで route を決められるようにする。

`QA_AGENT.md`、`CODE_REVIEW.md`、`PLANS.md` は既存 entrypoint として必要なら残すが、詳細 workflow を再定義せず canonical Skill package へ誘導する。

repository-wide rule と Skill-specific procedure を分離する。

- repository-wide: branch / plan lifecycle / common safety / shared artifact policy など複数 Skill が必要とする規則
- Skill-specific: exploratory QA の実行手順、review workflow、repair stop condition、Android bootstrap 手順など

後者は package 側を正本にする。

### 3. Package-specific migration map

#### `exploratory-qa`

現行 `SKILL.md` が抱える以下の詳細を既存 / 新規 `references/` に移す。

- QA mode selection
- target selection hierarchy
- baseline / scenario execution
- browser / authentication setup
- evidence collection / normalization / validation
- issue filing / cleanup
- detailed stop conditions

既存の以下は再利用し、重複を増やさない。

- `references/agent-browser-reference.md`
- `references/reporting-templates.md`
- `references/target-selection.md`
- `references/validation-checklists.md`
- `assets/collect-evidence.sh`
- `assets/install-local-browser-deps.sh`
- `assets/normalize-evidence.sh`
- `assets/validate-evidence.sh`

`QA_AGENT.md` から Skill 固有 workflow を除き、overview / compatibility entrypoint にする。

#### `code-review`

既存の `references/review-workflow.md` を詳細 workflow の正本として活用する。

`CODE_REVIEW.md` に残る Skill 固有の review 手順・principle・quality checklist を inventory し、package reference 側へ統合する。`SKILL.md` には input requirement、findings-first output contract、主要 guardrail と reference reading order を残す。

#### `feature-plan`

既存の `references/planning-workflow.md` を詳細 planning workflow の正本として活用する。

`PLANS.md` と `SKILL.md` の重複を inventory し、実装準備の手順・risk mapping・test strategy などの Skill 固有 detail は package reference 側へ統合する。

`PLANS.md` に残すのは、repository-wide な plan lifecycle、保存場所 / filename convention、既存 Plan の継続利用など、repository entrypoint として必要な契約だけにする。

#### `repair-loop`

既存 `references/repair-workflow.md` と `docs/reference/repair-loop.md` の責務を比較する。

`docs/reference/repair-loop.md` にある以下の Skill 固有 detail は、semantic loss なしで package-local reference へ統合する。

- bounded loop contract
- failure triage
- evaluation / evidence relation
- iteration record
- max-iteration policy
- repeated-failure handling
- stop conditions
- scope / unsafe action handling

他 Skill も参照する純粋な shared policy があれば、その部分だけは既存共有文書への参照として残す。

#### `harness-improvement`

既存 `references/harness-workflow.md` を詳細 workflow の正本候補とする。

現行 `SKILL.md` が指す package 外 reference を実在確認する。現時点の main では `docs/reference/harness-improvement.md` は取得できていないため、単なる移動対象と仮定せず、以下を実装時に確認する。

1. 過去 rename / 既存別 path の有無
2. `references/harness-workflow.md` に必要情報が既に含まれるか
3. dangling reference だけを削除すれば意味が維持されるか

欠落した policy を推測で新規作成しない。意味情報が repo 内に存在しなければ、参照切れを解消しつつ「存在しない正本を復元した」ことにはしない。

#### `android-native-local-validation`

長い `SKILL.md` から machine-specific command sequence を package-local reference へ分離する。

最低限、以下の detail を reference 化する。

- host / device discovery
- macOS / Homebrew / Java / Android SDK bootstrap
- `adb` 起動・接続
- APK discovery / install
- launch / logcat / artifact collection
- cleanup / process hygiene
- detailed stop conditions

`SKILL.md` には用途、必要 input、macOS + physical Android という applicability、CI 向けではないこと、主要 stop boundary、読むべき reference を残す。

### 4. Validator design

既存 stack に合わせ、repository 内で直接実行できる小さな validator と test を追加する。新規 dependency は追加しない。

Validator の責務は「package と routing の機械的整合性」に限定する。

#### Validate

- `.agents/skills/*/SKILL.md` discovery
- frontmatter existence / required fields
- duplicate Skill name
- package-local explicit references / assets target existence
- canonical routing から参照される Skill path existence
- validator が対象とする path syntax の一貫性

#### Do not validate

- Skill の文章品質
- 行数による lean 判定
- Markdown 全体の一般リンク
- policy の semantic equivalence
- external URL availability

Semantic preservation は別途 review checklist で確認する。

Validator test には少なくとも以下の fixture / case を持たせる。

- valid package
- missing `SKILL.md`
- missing / empty required frontmatter
- duplicate name
- missing `references/...`
- missing `assets/...`
- broken routing path
- prose / code sample を誤検知しない case

### 5. Quality-gate integration

`package.json` に専用 validation script を追加する。

`pnpm run verify` が現在 `typecheck -> test -> lint -> format:check` の総合 gate なので、Skill validation もこのローカル gate から到達可能にする。

CI は `.github/workflows/ci.yml` の既存 `style-quality` job に specification / curriculum validation が集約されているため、Skill package validation も同 job に追加する。validator のためだけに別 job は作らない。

`verify` を CI で丸ごと追加実行して既存 lint / test を二重実行するのではなく、CI では専用 validator script を既存 quality job へ足す。

## Tasks

### Phase 0 — Baseline inventory and semantic snapshot

- [ ] 6 Skill の `SKILL.md`、`references/`、`assets/` を一覧化する。
- [ ] `AGENTS.md` / `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` から各 Skill への参照と重複 section を一覧化する。
- [ ] `docs/reference/` 等にある Skill 固有 detail を検索し、package 外 dependency を一覧化する。
- [ ] 既存の dangling reference を記録する。少なくとも `harness-improvement` の package 外 reference を再確認する。
- [ ] 各 Skill について semantic-preservation checklist を作る。
  - MUST / MUST NOT
  - trigger / exclusion
  - required inputs
  - required outputs
  - evidence requirement
  - approval boundary
  - stop conditions
  - validation / cleanup obligations

### Phase 1 — Establish package contract and validator skeleton

- [ ] `AGENTS.md` に package layout と routing SSOT の最小契約を定義する。
- [ ] Skill package discovery / frontmatter / local target validation の実装場所を既存 `scripts/` / test convention に合わせて決める。
- [ ] validator と validator test を追加する。
- [ ] 現状 repository に対して validator を実行し、既知の参照切れを「実装で直すべき baseline finding」として確認する。
- [ ] validator が一般 Markdown lint / semantic lint に膨張していないことを確認する。

### Phase 2 — Migrate Skill-owned detail package by package

依存を追いやすくするため、1 Skill ずつ「移設 -> local link validation -> semantic checklist」の単位で完了させる。

- [ ] `code-review`: `CODE_REVIEW.md` と `references/review-workflow.md` の重複を整理する。
- [ ] `feature-plan`: `PLANS.md` と `references/planning-workflow.md` の重複を整理する。
- [ ] `repair-loop`: `docs/reference/repair-loop.md` の Skill 固有 detail を package 内へ統合する。
- [ ] `harness-improvement`: existing package reference と dangling / external reference を整理する。
- [ ] `exploratory-qa`: oversized `SKILL.md` の detailed workflow を既存 / 新規 reference に移す。
- [ ] `android-native-local-validation`: machine-specific procedural detail を reference に移す。

各 Skill 完了時に以下を行う。

- [ ] `SKILL.md` が単体で「いつ使う / 何を読む / 何を出す / どこで止まる」を判断できる。
- [ ] 詳細は package 内から辿れる。
- [ ] 移設前 semantic checklist の項目がすべて新正本に残っている。
- [ ] old / new 両方に同じ detailed procedure が二重正本として残っていない。

### Phase 3 — Thin root documents and finalize routing

- [ ] `AGENTS.md` の routing matrix を canonical にする。
- [ ] `QA_AGENT.md` を exploratory QA の compatibility / overview entrypoint に薄くする。
- [ ] `CODE_REVIEW.md` を code review の compatibility / repository-wide overview に薄くする。
- [ ] `PLANS.md` を repository-wide plan lifecycle / naming / entrypoint に薄くする。
- [ ] root docs から Skill package への link を validator 対象の安定した表記へ揃える。
- [ ] root -> Skill -> root の循環した detailed instruction dependency がないことを確認する。

### Phase 4 — Wire validation gates

- [ ] `package.json` に Skill validation script を追加する。
- [ ] `pnpm run verify` から Skill validation が実行されるようにする。
- [ ] `.github/workflows/ci.yml` の既存 `style-quality` job に専用 Skill validation step を追加する。
- [ ] CI で既存 lint / test / format が重複実行されない構成にする。

### Phase 5 — Semantic preservation and scope review

- [ ] 6 Skill それぞれで migration 前後の semantic-preservation checklist を照合する。
- [ ] `git diff` / `rg` を使い、旧正本に残った詳細手順・古い参照 path・重複した stop condition を検索する。
- [ ] broken package-local link が 0 件であることを validator で確認する。
- [ ] PR1 以外の product / QA behavior / release behavior が変更されていないことを changed-files review で確認する。
- [ ] 「構造整理のついでの policy 改善」が混入していないことを review する。

## Tests

### Automated

実装時に repository の script 名を確定するが、少なくとも以下を満たす。

```bash
pnpm run validate:skills
pnpm run verify
```

`validate:skills` 名を別名にする場合でも、責務は package / routing validation のみに限定する。

Validator test では正常系と次の failure を明示的に検証する。

- missing `SKILL.md`
- invalid / missing frontmatter
- duplicate Skill name
- missing package-local reference
- missing package-local asset
- broken canonical routing path
- false-positive prevention

### Static / review checks

- 6 Skill の `SKILL.md` が canonical references へ到達できることを確認する。
- `QA_AGENT.md` / `CODE_REVIEW.md` / `PLANS.md` に、移設済み detailed workflow が二重に残っていないことを確認する。
- Skill 固有の stop condition / output contract / evidence rule が移設前後で意味的に一致することを確認する。
- `AGENTS.md` 以外に競合する task -> Skill routing table / hierarchy が残っていないことを確認する。
- package 外を参照する場合、その参照が実在し、shared repository policy として妥当であることを確認する。

### Existing repository gates

- typecheck
- Vitest suites
- lint
- format check
- Markdown lint / existing spec validation where CI already requires them

この PR は docs / tooling 中心なので、product E2E や native runtime smoke を新たな必須 gate にはしない。validator や root routing の変更が product runtime behavior を触っていないためである。

## Risks

### 1. Semantic drift during shortening

**Risk:** `SKILL.md` を短くする過程で、停止条件や MUST 条件を「詳細」と誤認して消す。

**Mitigation:** 移設前に semantic checklist を作り、各 Skill 単位で before / after を照合する。短文化を目的にせず正本移動として扱う。

### 2. Two sources of truth remain

**Risk:** root 文書と Skill reference の両方に同じ workflow が残り、将来再び drift する。

**Mitigation:** 移設後に旧詳細 section を compatibility pointer へ置換し、重複検索を行う。

### 3. Over-centralization

**Risk:** すべてを `AGENTS.md` に集約してしまい、root 文書が再び巨大化する。

**Mitigation:** `AGENTS.md` は routing + repository-wide invariant のみに限定し、Skill execution detail は package に置く。

### 4. Broken relative links after moves

**Risk:** Markdown の相対 path が移動後に壊れる。

**Mitigation:** package-local validator で explicit package targets と canonical routing target を検証する。移設直後に Skill 単位で実行する。

### 5. Validator becomes an over-engineered Markdown parser

**Risk:** あらゆる Markdown path を解析し始め、false positive と保守負債が増える。

**Mitigation:** package contract 上の明示的 path syntax だけを対象にし、汎用 Markdown link checker は Non-Goal とする。

### 6. Existing dangling reference is mistaken for missing semantics

**Risk:** `harness-improvement` のような既存参照切れを見て、存在しない policy を推測で再作成する。

**Mitigation:** git/repository 内の実在 content を確認し、見つからなければ package 内の現存正本だけを基準に参照を整理する。behavior を補完しない。

### 7. Root document compatibility regression

**Risk:** 人や agent が root 文書を直接参照しており、削除で navigation が壊れる。

**Mitigation:** 不要な delete を避け、薄い compatibility entrypoint と canonical Skill link を残す。

## Docs to Update

実装 PR で更新対象となる文書は以下。

- `AGENTS.md`
- `QA_AGENT.md`
- `CODE_REVIEW.md`
- `PLANS.md`
- 6 Skill の `SKILL.md`
- 各 Skill の `references/`（必要に応じて新規 / 統合）
- Skill 固有 detail を package へ移した後の旧 `docs/reference/*`（削除または共有 policy への縮小が必要な場合のみ）

README や curriculum 文書は、この構造変更を理解するために実際に必要でない限り更新しない。

## Rollout / Verification

1. PR1 の branch 上で package contract / validator と Skill migration を実装する。
2. 1 Skill ごとに local validation と semantic checklist を完了してから次へ進む。
3. 6 Skill の package 化が終わってから root 文書を薄くする。
4. validator を local `verify` と CI に接続する。
5. 全 validator / repository quality gate を実行する。
6. 最終 changed-files review で PR2 以降の変更が混ざっていないことを確認する。
7. semantic preservation review で意図しない policy 差分があれば merge せず、構造変更と意味変更を切り分ける。

Rollback は docs / tooling 構造変更のみなので、問題があれば PR1 全体を revert できる。package 移設の途中状態を main に入れない。

## Open Questions

実装開始を妨げる未決定事項は現時点ではない。以下は実装時に repository fact で確定し、推測しない。

- `harness-improvement` が現在参照している package 外 reference の過去 / 現在の実在 path と、package 内 reference だけで既存意味を保持できるか。
- validator の実装ファイル名と test 配置は、既存 `scripts/` / repository test convention を確認して最小差分となる場所を選ぶ。

上記確認で既存仕様そのものが不明になる場合のみ作業を止め、Issue #117 の PR1 に semantic decision を混ぜずに別途判断を求める。
