# Issue #117 PR2 Trigger Eval baseline 実装計画

## 0. 依頼概要

- 依頼内容: Issue #117 の PR2「Trigger Eval baseline」を実装するための計画を、PR2専用ブランチ上に保存する。
- 背景: PR1（#123）で Skill package 構造と routing SSOT の整理が `main` に取り込まれた。PR3 では Skill description を最適化する予定だが、その前に現状の routing 性能を再現可能な baseline として固定する必要がある。
- 期待成果: 6 Skill すべてについて positive / negative の Trigger Eval dataset を train / validation に分離し、全 Skill が同時に利用可能な実 Host Runtime 上で routing を評価・記録・比較できる基盤を作る。PR2 自体では Skill description を変更しない。
- 対象 Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/117
- 実装ブランチ: `refactor/117-pr2-trigger-eval-baseline`
- Plan 作成時の base: PR #123 merge 後の `main`

## 1. ゴール / 完了条件

### ゴール

Skill description を変更する前の状態で、6 Skill の routing 精度と near-miss failure を実 Host Runtime で再現可能に測定し、PR3 以降で同条件比較できる baseline を残す。

### 完了条件（DoD）

- [ ] 以下の 6 Skill すべてに `evals/trigger/` が存在する。
  - `android-native-local-validation`
  - `code-review`
  - `exploratory-qa`
  - `feature-plan`
  - `harness-improvement`
  - `repair-loop`
- [ ] 各 Skill に positive / negative query があり、`train` / `validation` が物理的に分離されている。
- [ ] 各 split で各 Skill に最低 1 件の positive と 1 件の negative があり、単純な happy path だけでなく Issue #117 の重点 near-miss を含む。
- [ ] 同一または正規化後に同一となる query が train / validation を跨がない。
- [ ] Canonical Eval は対象 Skill だけを隔離せず、Repository の 6 Skill が同時に利用可能な状態で実行される。
- [ ] query 本文以外に期待 Skill 名・正解ラベルを Host Runtime へ渡さず、評価用 instruction によって routing を誘導しない。
- [ ] 実 Host Runtime が実際に参照した Skill を Host が出す tool / hook evidence から観測し、Repository 独自の keyword classifier や routing engine を作らない。
- [ ] positive の false negative、negative の unexpected trigger、sibling misroute、余分な sibling trigger を case 単位で記録できる。
- [ ] train / validation、Skill 別、near-miss 別の集計を保存できる。
- [ ] baseline の machine-readable result に、dataset / Git commit / Host Runtime 条件を追跡できる provenance を含める。
- [ ] baseline result を後続 run と比較でき、PR3 で train 調整と validation 確認を分離できる。
- [ ] live routing eval は model / Host Runtime 依存のため `pnpm run verify` の deterministic hard gate にしない。dataset/schema/invariant の deterministic validation のみ CI gate に入れる。
- [ ] 6 Skill の `SKILL.md` frontmatter `description` を変更していない。
- [ ] `AGENTS.md` の routing 意味契約を変更していない。
- [ ] Product code、Product test、training content を変更していない。
- [ ] 独自 Agent Runtime / Workflow Engine を追加していない。
- [ ] Repository の通常 validation と追加した Trigger Eval dataset validation が PASS する。
- [ ] PR2 実装 run で canonical baseline を 1 回取得し、Repository の Run Artifact policy に沿って結果を保存する。

## 2. 現状理解と前提

### Current understanding

#### Entry points

- `AGENTS.md`
  - Repository-level Skill routing の SSOT。
  - 6 Skill の高レベルな使い分けを定義している。
- `.agents/skills/<skill>/SKILL.md`
  - 各 Skill の入口契約。
  - 現在の description が PR2 baseline の評価対象であり、PR2 では変更禁止。
- `.codex/config.toml`
  - Codex Host Runtime と hook 設定。
  - `UserPromptSubmit` / `PostToolUse` / `Stop` 等の hook が有効。
- `.codex/hooks/log_event.mjs`
  - Host が実際に行った tool use の入力を bounded JSONL evidence として記録する既存観測面。
- `package.json`
  - `validate:skills` と Repository 全体の `verify` が存在するが、Trigger Eval 用 command は現状ない。
- `scripts/validate-skills.ts`
  - Skill package/frontmatter/reference 等の deterministic validation を担当する既存 validator。
- `tests/repository-contract/validate-skills.test.ts`
  - Skill package validation の既存 repository contract test。
- `.codex/templates/evaluation.schema.json`
  - Run-level `evaluation.json` の既存 schema。Trigger Eval の case-level 結果を無理にこの schema へ詰め込まず、必要なら PR2 の supplemental result artifact を evidence として参照する。

#### Main flow

1. Repository の 6 Skill metadata が Host Runtime へ提示される。
2. eval dataset の自然な user query を 1 case ずつ fresh session で投入する。
3. Host Runtime 自身に routing を行わせる。
4. Host が Skill package を参照した事実を既存 tool / hook evidence から観測する。
5. dataset の `expected_skill` と observed Skill を evaluator が比較する。
6. case result を分類し、split / Skill / near-miss ごとに集計する。
7. PR2 ではその結果を baseline として保存する。
8. PR3 では同一 dataset / 同一評価手順を使い、description 変更前後を比較する。

#### Key abstractions

- **Dataset owner Skill**: query をどの Skill の positive / negative boundary として管理するか。
- **Expected Skill**: Canonical 6 Skill 条件で、その query が最初に route されるべき Skill。6 Skill のどれにも route すべきでない query は `null` を許可する。
- **Positive case**: `expected_skill` が dataset owner Skill と一致する case。
- **Negative case**: dataset owner Skill には route すべきでない case。`expected_skill` は sibling Skill または `null`。
- **Observed Skills**: Host Runtime の tool / hook evidence から観測できた canonical Skill package 参照を発生順に記録したもの。
- **Canonical Eval**: 全 6 Skill が同時に利用可能な通常 Repository 条件で実行する評価。1 Skill だけを読み込ませる one-vs-rest 疑似評価にはしない。
- **Train split**: PR3 の description 調整で failure を分析・改善対象にしてよい query 群。
- **Validation split**: description 調整中には正解合わせに使わず、変更後の回帰確認に使う query 群。秘密データではなく「最適化に使わない」運用上の holdout とする。

### Existing tests / validation

- `pnpm run validate:skills` で Skill package の deterministic validation ができる。
- `pnpm run test:repository` に Skill validator の contract test が含まれる。
- `pnpm run verify` は format / markdown / skill validation / lint / typecheck / tests / build 等の Repository-wide gate をまとめている。
- Trigger routing を実 Host Runtime で評価する既存 dataset / command は現時点では存在しない。

### Safe change surface

- `.agents/skills/<skill>/evals/trigger/**` の新規追加。
- Trigger Eval の dataset schema、loader、Host adapter、result aggregation を担う Repository-level shared script の新規追加。
- Trigger Eval dataset / pure classification logic の deterministic repository contract test の追加。
- `package.json` への Trigger Eval command と deterministic validate command の追加。
- PR2 実装 run の標準 Run Artifact、および DoD 上必要な canonical baseline result artifact。

### Assumptions

- Host Runtime は現在の Repository で使用している Codex を基準にする。
- routing の正解は query 単独ではなく、`AGENTS.md` と 6 Skill の現在の metadata/description が Host に通常どおり提示された条件で評価する。
- Skill trigger の一次 evidence は、Host が canonical `.agents/skills/<skill>/SKILL.md` を実際に参照したこととする。Host の event 形式が変わっても、Repository 独自の semantic classifier で代替しない。
- Host/version/model/config の差で score が変動し得るため、baseline result には少なくとも Git SHA、Host CLI version、実行日時、split、dataset fingerprint、明示した model/config 引数を記録する。Host が resolved model を公開しない場合は推測せず `unreported` とする。
- 1 case ごとに fresh / ephemeral session を使い、前 case の会話状態を引き継がない。
- live eval 中の Product / Repository 書き換えは不要であり、read-only sandbox を使う。

### Non-goals

- Skill description の tuning。
- `SKILL.md` の Workflow / Output Contract / stop condition の変更。
- `AGENTS.md` の routing 文言変更。
- Trigger failure を PR2 内で直すこと。
- Output quality Eval。Deterministic Output Eval は PR4、Semantic Output Eval は PR5 の責務。
- 複数 Skill を跨いだ実 Workflow E2E Eval。これは PR6 の責務。
- keyword / regex / embedding 等で query を Skill に分類する Repository 独自 routing engine の追加。
- Codex 自体の Agent Runtime / Skill loading mechanism の再実装。
- live model eval の結果を CI の必須 PASS 条件にすること。
- Product code、Playwright/Maestro training、native product behavior の変更。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で Issue #117 の PR2 scope / DoD に、実装開始を止める未回答の product question はない。

ただし、実装時に以下の技術的前提を最初に probe する。

- 現行 Codex Host が Skill 参照を `PostToolUse` 等の既存 evidence で安定して観測できるか。

観測できない場合は、期待 Skill を query 文字列から推測する classifier を追加して続行してはいけない。その時点で blocker として記録し、Host-native な観測面を使える方法へ計画を見直す。

### 仮定してよい細部

- dataset serialization は Repository に既に `yaml` dependency があるため YAML を第一候補とする。
- file 名は split を直接表す `train.yaml` / `validation.yaml` とする。
- case ID は `<skill>-<split>-<polarity>-NNN` のような globally unique な安定 ID とする。
- exact count を増やすこと自体を目的にせず、最低契約と boundary coverage を満たした後は重複ケースを増やさない。

### 未回答の重要質問

- なし。Host-native trigger evidence が取得できない場合のみ implementation blocker として再度判断する。

## 4. 影響範囲

### Impacted areas

#### Skill-local eval data

各 Skill に以下を新設する。

```text
.agents/skills/<skill>/evals/trigger/
├── train.yaml
└── validation.yaml
```

対象は 6 Skill すべて。

#### Shared Trigger Eval harness

第一候補:

```text
scripts/evals/run-skill-trigger-evals.ts
```

責務は以下に限定する。

- dataset discovery / parse / invariant validation
- natural query の Host Runtime への投入
- Host-native tool / hook evidence の収集
- canonical Skill reference の抽出
- expected vs observed の pure classification
- summary 集計
- result serialization / baseline comparison

query 内容から Skill を推論する責務は持たせない。

#### Deterministic contract tests

第一候補:

```text
tests/repository-contract/skill-trigger-evals.test.ts
```

Host Runtime を起動しない pure/deterministic test とする。

#### Commands

`package.json` に以下の責務を持つ command を追加する。

- dataset/schema/invariant のみを検査する command
- live Host Runtime で canonical Trigger Eval を実行する command

命名は既存 scripts convention に合わせ、実装時に最終確定する。例:

```text
pnpm run eval:skills:trigger:validate
pnpm run eval:skills:trigger
```

`verify` へ入れるのは `eval:skills:trigger:validate` のみとする。

#### Baseline artifact

PR2 実装 run では、case-level result を Run Directory 配下の supplemental machine-readable artifact として保存する。

例:

```text
.codex/runs/<run_id>/trigger-eval-baseline.json
```

既存 `evaluation.json` schema を Trigger Eval 専用 schema へ変形しない。Run-level `evaluation.json` / `REPORT.md` から baseline artifact を evidence として参照する。

### Files to inspect before editing

- `AGENTS.md`
- `PLANS.md`
- `.agents/skills/*/SKILL.md`
- `.agents/skills/*/references/**`
- `.codex/config.toml`
- `.codex/hooks/log_event.mjs`
- `.codex/templates/evaluation.schema.json`
- `scripts/validate-skills.ts`
- `scripts/codex-safe.ps1`
- `scripts/codex-safe.sh`
- `package.json`
- `tests/repository-contract/validate-skills.test.ts`
- PR1 #123 の final diff / merge state

## 5. 変更方針

### Change strategy

PR2 は「description tuning の前に測る」ことが目的なので、次の順序を固定する。

1. 先に評価 contract と dataset を固定する。
2. Host-native な trigger 観測方法を小さな probe で確認する。
3. deterministic validator を作る。
4. full canonical live eval を実行する。
5. baseline を保存する。
6. baseline failure は記録だけし、description を直さず PR2 を閉じる。

これにより、「失敗を見てから dataset や正解を都合よく変更する」ことを防ぐ。

### Dataset contract

各 YAML は最低限以下の情報を持つ。

```yaml
schema_version: 1
skill: code-review
split: train
cases:
  - id: code-review-train-positive-001
    polarity: positive
    query: "..."
    expected_skill: code-review
    tags:
      - direct
```

negative case では `expected_skill` は dataset owner と異なる sibling Skill、または canonical 6 Skill のどれも使うべきでない場合は `null` とする。

Expected label は evaluator の比較用であり、Host Runtime へ渡す prompt には含めない。

### Dataset coverage

各 Skill で train / validation の双方に positive / negative を置く。

最低ライン:

- 各 Skill / 各 split に positive 1 件以上。
- 各 Skill / 各 split に negative 1 件以上。
- 直接的な Skill 名を含む query だけで埋めない。
- 同じ意味の単純な言い換えだけで件数を増やさない。
- train / validation 間で normalized exact duplicate を禁止する。
- validation は PR3 の tuning 中に failure-driven で書き換えない。

Issue #117 の重点 near-miss は train と validation の双方でカバーする。

1. `exploratory-qa` vs `android-native-local-validation`
   - Product behavior の探索・仕様確認をしたい依頼。
   - Windows / Android tooling / Release APK / physical device / Maestro / native failure を確認したい依頼。
   - 「Android」という単語だけで native-local-validation に寄らない case を含める。
2. `code-review` vs `repair-loop`
   - finding を出してレビューしてほしい依頼。
   - 既に確定した finding / validation failure を修正してほしい依頼。
   - 「レビュー指摘がある」という文脈でも、依頼行為が review か repair かで分ける。
3. `repair-loop` vs `harness-improvement`
   - 現在の code/test failure を bounded に修正する依頼。
   - 実行結果から evaluator / harness 自体の改善候補を作る依頼。
   - failing test という語だけで repair-loop に寄らない case を含める。
4. `feature-plan` vs 通常実装
   - 実装前の計画だけを求める依頼。
   - 直接実装・修正を求めており plan artifact を主成果物にしてはいけない依頼。
   - 「計画を立ててから実装して」のような複合依頼は初期 baseline では避け、single-intent boundary を先に測る。

### Canonical scoring contract

1 case で観測した canonical Skill 参照を発生順に保持する。

判定優先順位は以下を基本とする。

1. Host evidence 自体が取れない: `unobservable`
2. `expected_skill = null` で canonical Skill が観測された: `unexpected_trigger`
3. `expected_skill != null` で canonical Skill が 1 つも観測されない: `false_negative`
4. 最初の canonical Skill が `expected_skill` と異なる: `sibling_misroute`
5. 最初は `expected_skill` だが不要な canonical sibling も追加で観測された: `unexpected_trigger`
6. 上記以外: `pass`

`unobservable` を pass 扱いしない。Host の観測不能と routing failure を混同せず、別 category として残す。

### Host execution contract

- 1 case = 1 fresh session。
- working directory は Repository root。
- 6 Skill を通常どおり同時に discover できる状態を維持する。
- query は dataset の文字列をそのまま user intent として渡す。
- `expected_skill`、polarity、case tag を prompt に混ぜない。
- read-only sandbox を使い、実装依頼 query でも Repository を変更させない。
- network は baseline routing に不要なため有効化しない。
- raw Host log は `.artifacts` 等の一時 evidence とし、credential / absolute path を含み得る生ログをそのまま commit しない。
- committed baseline には必要な normalized evidence のみ残す。
- Host-native evidence で Skill trigger を一意に判定できない case は `unobservable` とし、LLM/keyword による二次判定で補完しない。

### Baseline result contract

baseline JSON は少なくとも以下を持つ。

- schema version
- source Git SHA
- dataset fingerprint
- Host / CLI version
- model/config information（観測できる範囲。推測禁止）
- execution timestamp
- split
- case ID
- owner Skill
- expected Skill
- observed canonical Skills
- outcome
- evidence selector / session reference
- Skill 別 summary
- train / validation 別 summary
- near-miss tag 別 summary
- total / pass / false negative / sibling misroute / unexpected trigger / unobservable count

後続比較では raw percentage だけでなく case ID 単位で以下を出せるようにする。

- fixed
- regressed
- unchanged pass
- unchanged failure
- newly unobservable / recovered observable

### CI / deterministic enforcement

CI では以下のみ hard gate にする。

- 6 Skill に trigger eval files がある。
- schema が正しい。
- case ID が全体で unique。
- train / validation metadata と配置が一致する。
- positive / negative の期待値 contract が正しい。
- canonical skill 名以外を `expected_skill` に使っていない。
- 各 Skill / split に最低 coverage がある。
- normalized exact query duplicate が split を跨がない。
- Issue #117 の重点 near-miss tag が必要 split に存在する。
- runner の pure classification / aggregation / comparison logic が contract test を通る。

live model score 自体は非 deterministic・外部 Runtime 依存なので `verify` の PASS/FAIL gate にしない。

### 実行タスク

- [ ] 1. PR2 実装開始時に current `main` / PR1 #123 merge state と branch diff を再確認し、PR2 以前の description が固定されていることを確認する。
- [ ] 2. 6 Skill の current `SKILL.md` / `AGENTS.md` routing boundary を読み、positive / negative / near-miss coverage matrix を作る。
- [ ] 3. `.agents/skills/<skill>/evals/trigger/train.yaml` と `validation.yaml` を 6 Skill すべてに追加する。
- [ ] 4. dataset を full canonical 条件で読み込む shared Trigger Eval runner を `scripts/evals/` に追加する。
- [ ] 5. runner に deterministic `--validate-only` 相当を持たせ、Host を起動せず dataset contract を検証できるようにする。
- [ ] 6. Host 実行の前に 1〜2 case の probe を行い、既存 Codex tool/hook evidence から canonical `SKILL.md` 参照が観測できることを確認する。
- [ ] 7. probe が観測不能なら custom classifier を追加せず停止し、blocker を Run Artifact に記録する。
- [ ] 8. Host adapter を read-only / fresh session / no label leakage で実装する。
- [ ] 9. pure outcome classification、summary、baseline comparison を実装する。
- [ ] 10. `tests/repository-contract/skill-trigger-evals.test.ts` を追加し、dataset invariant と pure logic を fixture で検証する。
- [ ] 11. `package.json` に Trigger Eval の validate/live command を追加し、deterministic validate のみ `verify` に組み込む。
- [ ] 12. train + validation を含む canonical baseline を current description のまま実行する。
- [ ] 13. case-level baseline JSON を PR2 implementation Run 配下に保存し、`evaluation.json` / `REPORT.md` から evidence として参照する。
- [ ] 14. baseline failure を `false_negative` / `sibling_misroute` / `unexpected_trigger` / `unobservable` で整理する。PR2 では description を修正しない。
- [ ] 15. Skill description / AGENTS routing / Product code に意図しない差分がないことを diff で確認する。
- [ ] 16. required validation と最終 `pnpm run verify` を実行し、Run Artifact sanitization を行う。

## 6. 検証方法

### Validation plan

#### A. Static dataset validation

追加する validate command で以下を確認する。

- 全 6 Skill discovery
- train / validation file presence
- YAML parse
- schema version
- owner Skill / split consistency
- global case ID uniqueness
- canonical expected Skill constraint
- positive / negative consistency
- per Skill / split minimum coverage
- cross-split exact duplicate prevention
- required near-miss coverage

#### B. Repository contract tests

`tests/repository-contract/skill-trigger-evals.test.ts` で以下を固定する。

- valid fixture / repository dataset が PASS する。
- malformed schema が FAIL する。
- duplicate ID が FAIL する。
- train/validation duplicate query が FAIL する。
- positive なのに owner 以外を期待する case が FAIL する。
- negative なのに owner 自身を期待する case が FAIL する。
- sibling misroute / false negative / unexpected trigger / unobservable の分類が仕様どおりになる。
- baseline comparison が fixed / regressed / unchanged を case ID で正しく出す。

#### C. Host observation probe

full baseline 前に少数 case で以下を確認する。

- natural query が Host へそのまま渡る。
- fresh session になっている。
- read-only で Repository が変更されない。
- canonical 6 Skill が同時に discover 可能。
- Skill package 参照を Host-native evidence から抽出できる。
- evaluator が query 内容から Skill を推測していない。

#### D. Canonical baseline execution

- train / validation を同一 code revision で実行する。
- case-level result が全件保存される。
- failure category が query / expected / observed evidence から再確認できる。
- near-miss 4 boundary を個別集計できる。
- `unobservable` があれば score から隠さず明示する。

#### E. Regression / compatibility

最低限:

```bash
pnpm run eval:skills:trigger:validate
pnpm run test:repository
pnpm run validate:skills
pnpm run verify
```

live canonical eval command は別途明示実行し、CI hard gate とは分離する。

#### F. Scope guard

最終 diff で以下を確認する。

```text
変更可:
- .agents/skills/*/evals/trigger/**
- scripts/evals/**
- tests/repository-contract/**（Trigger Eval 関連）
- package.json
- pnpm-lock.yaml（依存追加が本当に必要な場合のみ。原則追加しない）
- PR2 implementation Run Artifact

変更禁止:
- .agents/skills/*/SKILL.md の description
- AGENTS.md の routing 意味契約
- Product code
- Product E2E / training scenario
- PR4/PR5/PR6 の評価ロジック
```

### 成功判定

- deterministic dataset validation が PASS。
- repository contract test が PASS。
- Repository-wide `pnpm run verify` が PASS。
- canonical live baseline が 6 Skill / train / validation 全件を処理し、case-level result を保存できる。
- baseline に failure が残っていても PR2 は失敗ではない。PR2 の成功条件は「failure を再現可能に測定・保存できること」であり、routing score を良くすることではない。
- description tuning が 0 件である。
- Repository 独自 Agent Runtime が 0 件である。

## 7. リスクと未解決論点

### Risks

1. **評価のための prompt が routing を変える**
   - 対策: query へ「どの Skill を使うか答えて」等を追加しない。Expected label は Host に渡さない。
2. **1 Skill だけの isolated eval で sibling misroute が見えなくなる**
   - 対策: scoring は常に canonical 6 Skill 同時条件で行う。Skill-local directory は dataset ownership のためだけに使う。
3. **Host event format への過剰依存**
   - 対策: observation adapter を小さく閉じ、Host-native evidence が取れない場合は `unobservable` にする。routing logic 自体を再実装しない。
4. **model / CLI update で score が変わる**
   - 対策: provenance を baseline に記録し、比較時は同条件を優先する。条件差がある比較は明示する。
5. **validation data を tuning に使ってしまう**
   - 対策: split を物理ファイルで分離し、PR3 の運用で train failure を調整根拠、validation を後段確認に限定する。
6. **dataset が Skill 名を露骨に含み、実 routing を測れない**
   - 対策: direct query だけでなく自然文・曖昧境界を入れ、Skill 名そのものを答えにする query を避ける。
7. **live eval を CI gate にして flaky / cost / quota 問題を持ち込む**
   - 対策: CI は deterministic dataset contract のみ。live eval は明示実行・保存・比較対象にする。
8. **baseline failure を見て PR2 内で description を直したくなる**
   - 対策: failure は PR3 input として保存するだけにし、PR2 diff guard で description 変更を禁止する。
9. **既存 `evaluation.json` schema を Trigger Eval 用に肥大化する**
   - 対策: case-level baseline は supplemental artifact に分離し、既存 run evaluation は evidence reference / summary に留める。

### Open questions

- Host-native evidence が現行 Codex で canonical Skill read を安定して表現できるかは実装時 probe で実測する。これは実装前に推測で固定しない。
- probe が失敗した場合、PR2 scope を守る限り custom classifier は代替案にならない。Host の公式/既存観測面を使える方法を再検討する。

## 8. 成果物

### 変更ファイル（予定）

```text
.agents/skills/android-native-local-validation/evals/trigger/train.yaml
.agents/skills/android-native-local-validation/evals/trigger/validation.yaml
.agents/skills/code-review/evals/trigger/train.yaml
.agents/skills/code-review/evals/trigger/validation.yaml
.agents/skills/exploratory-qa/evals/trigger/train.yaml
.agents/skills/exploratory-qa/evals/trigger/validation.yaml
.agents/skills/feature-plan/evals/trigger/train.yaml
.agents/skills/feature-plan/evals/trigger/validation.yaml
.agents/skills/harness-improvement/evals/trigger/train.yaml
.agents/skills/harness-improvement/evals/trigger/validation.yaml
.agents/skills/repair-loop/evals/trigger/train.yaml
.agents/skills/repair-loop/evals/trigger/validation.yaml
scripts/evals/run-skill-trigger-evals.ts
tests/repository-contract/skill-trigger-evals.test.ts
package.json
```

必要にならない限り dependency は追加しない。既存 `yaml` / Node / TypeScript / Vitest を再利用する。

### 付随ドキュメント / artifact

- 正本 Plan: `docs/plans/2026-09-06_125922_issue-117-pr2-trigger-eval-baseline.md`
- PR2 実装時の標準 `.codex/runs/<run_id>/` Artifact
- canonical case-level baseline: `.codex/runs/<run_id>/trigger-eval-baseline.json` を第一候補とする
- raw Host log は原則 `.artifacts` 側へ置き、sanitized / normalized summary のみ Repository artifact に残す

## 9. 備考

- PR2 の価値は score の高さではなく、PR3 の最適化前に current routing の事実を固定することにある。
- baseline で routing failure が多数見つかっても、それを PR2 内で修正すると比較基準が消えるため修正しない。
- `evals/` は Issue #117 で定義された Repository 独自の Skill 評価拡張であり、Agent Skills 仕様上の必須 directory として一般化しない。
- shared evaluator は Skill 固有 Workflow を持たず、dataset orchestration / Host observation / scoring / comparison のみに責務を限定する。
- PR1 で整理した Portability を壊さないため、Skill-local dataset から Repository 固有 absolute path や local machine 固有情報を参照しない。
