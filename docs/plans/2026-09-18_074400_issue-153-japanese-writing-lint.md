# Issue #153 日本語文章lint・表記ルール導入 Plan

## 0. 依頼概要

- 依頼内容: Issue #153「chore: 日本語文章lintと表記ルールを一括導入する」を実装するためのPlanを作成する。
- 対象Issue: https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/153
- 実装branch: `issue-153-japanese-writing-lint`
- 基準branch: `main`
- Plan作成時の`main` HEAD: `0af177828a058e118285a2ee3a01262aa7da6b2e`
- 背景:
  - PR #146でtextlint、文章品質Hook、差分比較、contract、`pnpm run lint:text`、CI連携がmainへ導入済み。
  - PR #151で`docs/WRITING_STANDARDS.md`と人間向け文章の表現統一がmainへ導入済み。
  - 現在の`.textlintrc.json`は既存5 ruleのみ。
  - 現在の`.codex/text-quality-rules.json`は`status: "not-configured"`かつ`rules: []`。
  - 現在の`Style Quality`は変更差分の文章品質gateを実行するが、対象Markdown全体を0違反で確認するgateはない。
- 期待成果:
  - 誤検知を抑えた日本語ruleをblocking gateへ追加する。
  - `docs/WRITING_STANDARDS.md`のうち機械的に一意判定できる表記だけをRepository固有ruleとして追加する。
  - 現行の対象Markdownを同じ実装PR内で修正し、正式採用ruleの全件違反を0件にする。
  - PR #146の差分比較、Hook、fail-open / fail-close、fingerprint、rename対応を弱めない。

## 1. ゴール / 完了条件

### ゴール

既存の文章品質基盤を再利用し、一般日本語の明確な誤りとRepository固有の明確な表記違反を機械検出できる状態にする。主観的な文章評価や将来用の拡張は追加しない。

### 完了条件

- `textlint-rule-preset-japanese`を導入し、採用ruleを`.textlintrc.json`で明示する。
- PR #146の既存5 ruleを直接設定として維持する。
- preset内で既存ruleと重複するruleは無効化し、同一違反を二重報告しない。
- `.codex/text-quality-rules.json`を`configured`へ変更し、機械的に一意判定できる表記ルールだけを追加する。
- `scripts/lint-text-quality.mjs`をscannerの正本として維持する。
- Hookは従来どおりsession差分だけを検査し、全Repository scanを行わない。
- Repository-level gateに対象Markdown全体を検査するmodeを追加し、CIと`pnpm run verify`で0違反を必須にする。
- 現行対象Markdownの違反を同じ実装PRで0件にする。
- 文章修正で仕様、要件、条件、数値、順序、権限、要件の強さ、固定契約を変更しない。
- 過去Run、過去Plan、履歴文書、過去調査レポート、既存ADR、fixture、snapshot、ログ、生成済みartifactを文章統一だけの理由で書き換えない。
- `tests/contracts/codex-text-quality.test.ts`を中心に必要なcontractを更新する。
- `Style Quality`、`test:contracts`、Bash / PowerShell Hook contract、`pnpm run verify`が成功する。

## 2. 現状理解と前提

### 2.1 現在のtextlint構成

`.textlintrc.json`には次の5 ruleが直接設定されている。

```text
@textlint-rule/no-invalid-control-character
no-zero-width-spaces
no-nfd
no-kangxi-radicals
no-hankaku-kana
```

`scripts/lint-text-quality.mjs`は`loadTextlintrc()`で設定を読み込み、現在は`TEXTLINT_RULE_IDS`との完全一致でrule集合を検証している。runtime messageも同じID集合で検証し、custom ruleとtextlint ruleのfingerprintを統合している。

### 2.2 現在のRepository固有rule

`.codex/text-quality-rules.json`は次の状態で、Repository固有ruleは未設定。

```json
{
  "version": 1,
  "status": "not-configured",
  "rules": []
}
```

custom rule scanner自体は既に実装済みで、literal / regex、replacement、normalization、case sensitivity、fenced code / inline code / URL / identifier除外を扱える。このIssueでは新しい辞書frameworkや`textlint-rule-prh`を追加しない。

### 2.3 現在の差分gate

- local `pnpm run lint:text`: `HEAD -> current worktree`
- PR CI: base branchとcheckout済みmerge `HEAD`
- push: `github.event.before -> HEAD`
- schedule / workflow_dispatch: `HEAD^ -> HEAD`
- Hook: session開始時baseline -> current worktree

`scripts/check-text-quality-changes.mjs`がRepository-level差分比較を担当する。renameはGit mappingを優先し、working-tree pure moveではexact content SHA-256による一意対応を使う。比較不能はRepository gateで非0終了、Hookでは既存契約に従う。

### 2.4 現在のCI

`.github/workflows/ci.yml`の`Style Quality`は`fetch-depth: 0`でcheckoutし、Markdown lint後に`scripts/check-text-quality-changes.mjs --base-ref ...`を実行している。

このIssueではcheckout方式、merge commit比較、event別base ref解決を変更しない。

### 2.5 既存ADRとの関係

`docs/adr/0026-codex-text-quality-gate.md`はIssue #134時点の判断として「presetを追加しない」「5個のtextlint個別ruleをproduction ruleとする」と記録している。

Issue #153はこのrule選定を意図的に更新するため、ADR-0026を履歴として書き換えない。新しいADRを追加し、ADR-0026のうちrule選定部分を後続判断で更新したことを明示する。

### 2.6 外部package

2026-09-18時点の`textlint-rule-preset-japanese`安定版は`10.0.4`。一般文書向けで誤検知を抑える目的のpresetで、既存4 ruleと重複するruleを内包する。

導入時は既存の依存関係指定方針に合わせて`^10.0.4`をdevDependencyへ追加し、`pnpm-lock.yaml`を更新する。

公式:
- https://github.com/textlint-ja/textlint-rule-preset-japanese
- https://github.com/textlint-ja/textlint-rule-preset-japanese/blob/master/README.md

### 対象外

- `@textlint-ja/textlint-rule-preset-ai-writing`
- `textlint-rule-preset-ja-technical-writing`の全面導入
- `textlint-rule-preset-ja-spacing`
- `textlint-rule-preset-jtf-style`
- `textlint-rule-prh`
- AIによる意味評価
- 未知語の造語判定
- 正式名称・技術用語の自動推測
- Markdown構造lintの再実装
- source code / Product behaviorの変更
- Hook frameworkや文章lint frameworkの新設

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

現時点で実装を止める未回答事項はない。

Issue #153、PR #146、PR #151、現在のmain実装から、次の方針をPlan上の決定として扱う。

### Plan上の決定

1. presetの全ruleを無条件に有効化しない。
2. 数値閾値や文体統一のように、`docs/WRITING_STANDARDS.md`で明示されていないstyle制約はblockingに追加しない。
3. 既存5 ruleは直接設定として維持し、preset側の重複ruleを無効化する。
4. Repository固有ruleは一意な置換先を持つ表現を中心に採用する。
5. `Minimum Evidence`は`docs/WRITING_STANDARDS.md`上で「最低限必要な成果物」「最低限必要な確認材料」の2候補があり、置換先が文脈依存なので今回のcustom blocking ruleにはしない。
6. 一般語の`Summary`、`Evidence`、`Scope`、`Build`、`Test`、`device`等は固定禁止しない。

## 4. 影響範囲

### 主な変更対象

- `package.json`
- `pnpm-lock.yaml`
- `.textlintrc.json`
- `.codex/text-quality-rules.json`
- `scripts/lint-text-quality.mjs`
- `scripts/check-text-quality-changes.mjs`
- `tests/contracts/codex-text-quality.test.ts`
- `.github/workflows/ci.yml`
- `docs/adr/0027-japanese-text-quality-rules.md`（新規）
- 正式採用ruleに違反する現行対象Markdown

### 条件付き変更対象

- `.codex/hooks/text_quality_gate.mjs`
  - preset導入によるrule ID処理またはscope処理に実変更が必要な場合だけ変更する。
  - session baseline、PostToolUse、Stop、state schema、fail-open / fail-close semanticsは変更しない。
- `scripts/verify` / `scripts/verify.ps1`
  - 新しいcontract suiteを追加せず、既存`-HookContracts` / `--hook-contracts`から現在の`codex-text-quality.test.ts`を実行できるなら変更しない。
- `docs/reference/codex-safety-harness.md`等
  - 「5 ruleのみ」「custom rule未設定」など、現在仕様として矛盾する記述がある場合だけ更新する。

### 全件scanの対象

Gitで追跡中のMarkdownから、現在利用中の人間向け文書を対象にする。

対象例:

- rootの人間向けMarkdown
- `.agents/skills/**/*.md`
- `.codex/rules/**/*.md`
- `.codex/templates/**/*.md`
- `docs/**/*.md`の現行仕様・設計・カリキュラム・guide・reference・native文書
- `examples/**/*.md`
- `training/**/*.md`
- GitHub上のMarkdown template

全件scanからは次を除外する。

- `.codex/runs/**`
- `docs/plans/**`
- `docs/reports/**`
- `docs/history/**`
- `docs/adr/**`
- fixture / snapshot / eval dataset
- 生成済みartifact

理由は、Issue #153と`docs/WRITING_STANDARDS.md`が過去記録を文章統一だけで書き換えないと定めているため。

一方、差分gateは既存の「変更されたMarkdownを比較する」契約を維持する。新規Planなど今回以降に変更する文章は差分gateの対象にできるため、過去文書を全件修正しないことと、今後の新規違反を防ぐことを分離する。

## 5. 変更方針

### Task 1: preset dependencyを追加する

- [ ] `textlint-rule-preset-japanese@^10.0.4`をdevDependencyへ追加する。
- [ ] `pnpm-lock.yaml`を更新する。
- [ ] 既存の直接rule packageを削除しない。
- [ ] presetが内包する重複dependencyを理由に既存ruleの設定契約を変更しない。

### Task 2: 採用する日本語ruleを明示する

`.textlintrc.json`は既存5 ruleを維持したまま、`preset-japanese`を追加する。

#### 維持する既存5 rule

```json
{
  "@textlint-rule/no-invalid-control-character": {
    "checkCode": false
  },
  "no-zero-width-spaces": true,
  "no-nfd": true,
  "no-kangxi-radicals": true,
  "no-hankaku-kana": true
}
```

#### presetで新規採用するrule

次をblocking対象として採用する。

- `no-doubled-conjunctive-particle-ga: true`
- `no-doubled-conjunction: true`
- `no-double-negative-ja: true`
- `no-doubled-joshi: { "min_interval": 1 }`
- `no-dropping-the-ra: true`

これらはpresetの中でも文法上の明確な誤りを中心に検出し、数値style制約よりIssue #153の「誤検知を抑える」方針に合う。

#### presetで無効化するrule

- `max-ten: false`
  - `docs/WRITING_STANDARDS.md`に読点数の上限がなく、数値閾値を新しい文体契約として追加しないため。
- `sentence-length: false`
  - 一文の最大文字数がRepository仕様として定義されておらず、既存仕様文の大規模分割を強制しないため。
- `no-mix-dearu-desumasu: false`
  - 技術文書では説明文、手順、引用、固定文言が混在し、文書単位の文体統一を機械的なblocking条件にしないため。
- `no-invalid-control-character: false`
- `no-zero-width-spaces: false`
- `no-nfd: false`
- `no-kangxi-radicals: false`
  - 上記4つは既存の直接ruleと重複するため。

`no-hankaku-kana`はpresetに含まれないため、既存直接ruleのみで維持する。

### Task 3: textlint rule集合検証をpreset対応にする

現在の`scripts/lint-text-quality.mjs`は単一の`TEXTLINT_RULE_IDS`を、設定load時のrule集合確認とruntime message validationの両方に使っている。

- [ ] `loadTextlintrc().toJSON()`がpreset導入後に返すrule IDを実測する。
- [ ] runtime violationの`message.ruleId`を実測する。
- [ ] 両者が同じ集合で表現できる場合は単一定数を維持する。
- [ ] preset展開により異なる場合だけ、設定検証用allowlistとruntime message用allowlistを分離する。
- [ ] unknown rule、missing rule、重複設定、load failureを従来どおりfail-close扱いにする。
- [ ] preset名だけを許可して内部ruleを無検証にする実装にはしない。
- [ ] fingerprintは引き続きruntime rule ID + normalized matchのSHA-256を使う。

### Task 4: Repository固有の表記ルールを追加する

`.codex/text-quality-rules.json`を`status: "configured"`へ変更する。

今回blockingへ追加するのは、`docs/WRITING_STANDARDS.md`で置換先が一意な次の表現。

| 検出する表現 | replacement |
|---|---|
| `Competency Rubric` | `習熟度評価基準` |
| `Native specialization` | `モバイルアプリ自動化の選択課程` |
| `Common Core` | `共通課程` |
| `learner-facing` | `受講者向け` |
| `Common route` | `共通経路` |
| `Completion contract` | `修了条件` |
| `Common completion` | `共通課程の修了` |
| `bounded Level 2` | `対象範囲を限定したレベル2` |

各ruleは原則として次の条件にする。

- literal match
- case sensitive
- normalization: `none`
- fenced code: ignore
- inline code: ignore
- URL: ignore
- identifier: ignore

`Minimum Evidence`は置換候補が複数あるためblocking ruleにしない。

実装前に各表現をRepository全体で検索し、次に該当する箇所は機械置換しない。

- identifier
- schema / enum / config
- validator / contract testが参照する固定文字列
- UI正式名称
- 外部仕様
- 過去記録

### Task 5: 全件scan modeを既存Repository-level checkerへ追加する

新しいscannerやlint frameworkは作らない。

`scripts/check-text-quality-changes.mjs`へ、差分比較とは別に現在の対象Markdownを全件検査するmodeを追加する。

想定CLI:

```bash
node scripts/check-text-quality-changes.mjs --all
```

要件:

- `--all`と`--base-ref`は排他的にする。
- Gitで追跡中のMarkdownだけを列挙する。
- Section 4の全件scan除外を1箇所で定義する。
- 各本文は既存`loadRules()` + `scanTextQuality()`へ渡す。
- rule定義を全件scan用に複製しない。
- 1件でも違反があればexit 1。
- config / rule / Git / read failureはexit 2。
- JSON出力が必要なら既存の公開violation形式を再利用する。
- raw matchや全文を新しく出力しない。
- Hookから`--all`を呼ばない。

package scriptは役割を分ける。

```text
lint:text      = 既存のHEAD -> worktree差分gate
lint:text:all  = 現行対象Markdown全件gate
```

### Task 6: 現行対象Markdownを0違反へ修正する

- [ ] preset新規5 ruleとRepository固有8 ruleを全件scanへ適用する。
- [ ] 違反をrule別・file別に確認する。
- [ ] 自動fixを一括適用せず、文脈を確認して修正する。
- [ ] 固定契約、数値、要件の強さ、条件、順序を維持する。
- [ ] code / command / identifier / API / UI正式名称を変更しない。
- [ ] 仕様変更に見える修正は実施せず、ruleの誤検知か固定文字列かを先に確認する。
- [ ] 全件scan除外対象は、文章統一だけの理由で修正しない。

正式採用ruleが明確な正常文を誤検知する場合は、次の順で扱う。

1. 固定文字列・code等で既存ignoreが適用できるか確認する。
2. rule自体がRepositoryの文章契約と合わないなら、そのruleをblocking採用しない。
3. 数値閾値を都合よく緩めて通す対応は行わない。
4. 個別disable commentを大量追加しない。

Task 2で採用すると決めた5 ruleを外す場合は、再現可能な誤検知根拠をRun Artifactへ残し、PR本文で理由を説明する。

### Task 7: contract testを更新する

主対象は`tests/contracts/codex-text-quality.test.ts`。

追加・更新する確認:

- [ ] production configに既存5 direct ruleが残る。
- [ ] `textlint-rule-preset-japanese`が依存関係に存在する。
- [ ] presetの採用5 ruleが有効。
- [ ] presetのstyle 3 ruleが無効。
- [ ] preset内の既存重複4 ruleが無効。
- [ ] 既存4 direct ruleとの二重報告が発生しない。
- [ ] `no-hankaku-kana`が従来どおり動く。
- [ ] 新規5 ruleそれぞれの代表的違反を検出する。
- [ ] 無効化したruleの代表例がblockingされない。
- [ ] production custom ruleが`configured`で、想定8 rule以外を含まない。
- [ ] custom ruleのinline code / fenced code / URL / identifier除外が維持される。
- [ ] full scan対象に違反があれば失敗する。
- [ ] full scan除外pathの既存違反は全件migrationの対象にしない。
- [ ] 差分gateは既存fingerprint countとrename semanticsを維持する。
- [ ] missing / invalid / unloadable presetはquality unavailableとして従来契約へ収束する。
- [ ] UserPromptSubmit / PostToolUse / Stopのfail-open / fail-close契約を変更しない。
- [ ] Issue #161で確定した`stop_hook_active=true`かつstateなしの重複Stop allow契約を維持する。

fixtureのNode依存解決では、preset packageだけのlinkで通常解決できる場合はtransitive dependencyを個別列挙しない。現在のfixture方式で不足するpackageだけを追加する。

### Task 8: `pnpm run verify`とCIへ全件gateを接続する

`package.json`:

- `lint:text`は変更差分gateとして維持する。
- `lint:text:all`を追加する。
- `verify`で`lint:text`の直後に`lint:text:all`を実行する。

`.github/workflows/ci.yml`:

- 現行`Text quality change gate`を維持する。
- その後に全件gateを追加する。
- PR / push / schedule / workflow_dispatchで同じrule集合を使用する。
- checkout、`fetch-depth: 0`、base ref解決は変更しない。
- 全件gateのためだけに別jobや別workflowを追加しない。

Hook:

- 全件gateを接続しない。
- PostToolUse / Stopはsession差分のみを確認する。

### Task 9: ADRと現在仕様の文書を更新する

- [ ] `docs/adr/0027-japanese-text-quality-rules.md`を新規追加する。
- [ ] ADR-0026を過去判断として維持する。
- [ ] 新ADRからADR-0026とIssue #153を参照する。
- [ ] 次をDecisionとして記録する。
  - 既存5 direct rule維持
  - preset採用5 rule
  - preset重複4 rule無効
  - style 3 rule非採用
  - Repository固有8 rule
  - full scanと差分scanの責務分離
  - 過去記録を全件migration対象にしない
- [ ] 現在仕様を説明するreferenceに「5 ruleのみ」「custom rule未設定」が残る場合だけ更新する。
- [ ] 過去Plan、過去Run、ADR-0026本文を文章統一のために修正しない。

## 6. 検証方法

### 6.1 dependency / config

```bash
pnpm install --frozen-lockfile
pnpm run lint:text
pnpm run lint:text:all
```

確認:

- preset packageが解決できる。
- direct 5 rule + preset採用rule + custom ruleが同じscanner経路で動く。
- missing / invalid configがPASSにならない。

### 6.2 focused contract

```bash
pnpm exec vitest run tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000
```

必要に応じて既存Hook contractも実行する。

```bash
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000
```

### 6.3 Hook contract入口

```bash
bash scripts/verify --hook-contracts
```

Windows:

```powershell
./scripts/verify.ps1 -HookContracts
```

確認:

- UserPromptSubmit baseline生成
- PostToolUse fail-open境界
- Stop block / active Stop allow
- 重複Stop allow
- launcher failure時のbounded diagnostic
- raw prompt / token / path等を出力しない

### 6.4 文章品質gate

local差分:

```bash
pnpm run lint:text
```

全件:

```bash
pnpm run lint:text:all
```

成功条件:

- 正式採用ruleの全件違反0件。
- excluded historical corpusを文章統一だけの理由で変更していない。
- 差分gateは新規違反を検出する。

### 6.5 Repository標準検証

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text
pnpm run lint:text:all
pnpm run test:contracts
pnpm run lint
pnpm run typecheck
pnpm run verify
git diff --check
```

WindowsでHook変更またはdependency resolutionへの影響がある場合:

```powershell
./scripts/verify.ps1
./scripts/verify.ps1 -HookContracts
```

### 6.6 CI

実装PRのlatest headで少なくとも次を確認する。

- Web CI / Style Quality: success
- Vitest contracts: success
- Codex Hook contract (Windows): success
- Mobile App CI: 変更影響がないことを確認し、required checkがある場合はsuccess

## 7. リスクと未解決論点

### 7.1 presetのruntime rule ID

preset導入後の`loadTextlintrc().toJSON()`のIDと、lint violationの`message.ruleId`が現在の個別ruleと同じ形とは限らない。

対策:

- 実装直後に実測する。
- config集合検証とruntime message検証を必要な場合だけ分離する。
- unknown IDを黙って許可しない。

### 7.2 false positiveによる大規模修正

数値style ruleと文体混在ruleは最初からblocking対象外にし、修正量を増やすこと自体を目的にしない。

採用5 ruleでも正常な技術文を誤検知する場合、文章を無理に変えるよりrule適合性を再確認する。

### 7.3 custom ruleと固定文字列

英語表現がschema、UI、外部仕様、validator契約に使われている可能性がある。

対策:

- Repository検索で用途を分類してから修正する。
- custom ruleの既存ignoreを使う。
- 一般英単語をbroad禁止しない。

### 7.4 全件scanと履歴文書

全Markdownを無差別にscanすると、Issueが明示的に除外した過去記録まで大量修正が必要になる。

対策:

- 全件migration用scopeを明示する。
- 差分gateと全件migration scopeを同一概念として扱わない。
- 過去文書を通すための大量disable commentを追加しない。

### 7.5 CI時間

全件scan追加で`Style Quality`と`verify`の時間が増える。

対策:

- scannerを新設せず既存`scanTextQuality()`を再利用する。
- Hookには全件scanを追加しない。
- 同一CI job内で実行し、別jobやmatrixを追加しない。
- 実測で問題がなければcacheや並列frameworkを追加しない。

### 7.6 ADRの履歴

ADR-0026を直接修正すると、Issue #134時点の判断履歴が消える。

対策:

- 新ADRで変更理由を記録する。
- ADR-0026は変更しない。

## 8. 成果物

想定変更ファイル:

```text
package.json
pnpm-lock.yaml
.textlintrc.json
.codex/text-quality-rules.json
scripts/lint-text-quality.mjs
scripts/check-text-quality-changes.mjs
tests/contracts/codex-text-quality.test.ts
.github/workflows/ci.yml
docs/adr/0027-japanese-text-quality-rules.md
<正式採用ruleに違反する現行対象Markdown>
```

条件付き:

```text
.codex/hooks/text_quality_gate.mjs
scripts/verify
scripts/verify.ps1
docs/reference/codex-safety-harness.md
docs/reference/codex-implementation-harness.md
```

## 9. 実装前自己レビュー

- [ ] Issue #153の範囲を越えていない。
- [ ] PR #146の既存5 ruleを削除していない。
- [ ] preset内の重複4 ruleを無効化している。
- [ ] style制約を新しいRepository契約として勝手に追加していない。
- [ ] custom ruleは一意判定できる表現だけに限定している。
- [ ] `Minimum Evidence`を一意replacement扱いしていない。
- [ ] `Summary`、`Evidence`、`Build`、`Test`等をbroad禁止していない。
- [ ] scanner / rule definitionを二重管理していない。
- [ ] 全件gateをHookへ追加していない。
- [ ] 差分比較、fingerprint、rename、comparison failureの既存契約を弱めていない。
- [ ] active Stop / duplicate Stopの既存契約を維持している。
- [ ] 過去Run / Plan / history / report / ADRを文章統一だけで修正しない。
- [ ] Markdown構造lintをtextlintへ重複実装していない。
- [ ] new lint framework、dictionary framework、AI Judgeを追加していない。
- [ ] current rule selectionの変更は新ADRに記録し、ADR-0026を履歴として維持する。

## 10. 備考

- branchは最新`main`の`0af177828a058e118285a2ee3a01262aa7da6b2e`から作成する。
- Plan作成時点でIssue #153はopen。
- PR #146とPR #151はmainへmerge済み。
- current `main`にはIssue #161の重複Stop修正とIssue #164のHusky導入も入っているため、それらを基準に実装する。
- このPlan作成では実装、既存ファイル修正、PR作成は行わない。
