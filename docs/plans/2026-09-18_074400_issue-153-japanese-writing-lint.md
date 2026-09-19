# Issue #153 日本語文章lint・表記ルール導入 Plan

## 0. 依頼概要

- 依頼内容: Issue #153「chore: 日本語文章lintと表記ルールを一括導入する」を実装するためのPlanを作成する。
- 対象Issue: [Issue #153](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/153)
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
  - `textlint-rule-preset-japanese@10.0.4`の8候補を評価し、既存5 rule以外に誤検知を抑えた一般日本語ruleを少なくとも1件blocking gateへ追加する。8候補すべてが採用基準を満たさない場合は、Issue #153で安全に追加できる一般日本語ruleを確認できなかったと実測結果を示し、完了扱いにせず対応方針を再確認する。このIssue内で別preset・別rule packageの探索は開始しない。
  - `docs/WRITING_STANDARDS.md`のうち機械的に一意判定できる表記を少なくとも1件Repository固有ruleとして追加する。8候補すべてを安全にblockingできない場合は、その理由を明示してIssueの目的を満たせるか再確認し、`not-configured`のまま完了扱いにしない。
  - 現行の対象Markdownを同じ実装PR内で修正し、正式採用ruleの全件違反を0件にする。
  - PR #146の差分比較、Hook、fail-open / fail-close、fingerprint、rename対応を弱めない。

## 1. ゴール / 完了条件

### ゴール

既存の文章品質基盤を再利用し、一般日本語の明確な誤りとRepository固有の明確な表記違反を機械検出できる状態にする。主観的な文章評価や将来用の拡張は追加しない。

### 完了条件

- `textlint-rule-preset-japanese@10.0.4`を実装PR内で一時評価し、採用基準を満たしたruleだけを個別packageでproduction構成へ明示する。8候補すべてが不採用の場合は、Issue #153で安全に追加できる一般日本語ruleを確認できなかったと実測結果を示し、対応方針を再確認してIssue #153を完了扱いにしない。
- PR #146の既存5 ruleを直接設定として維持する。
- productionではpresetを使用せず、実効rule集合を既存5 direct ruleと正式採用した一般日本語ruleだけにする。正式採用ruleは個別packageとして追加し、preset対応だけを目的としたscanner変更を残さない。
- `.codex/text-quality-rules.json`へ、評価で安全性を確認した機械的に一意判定できる表記ruleを少なくとも1件追加する。8候補すべてが安全にblockingできない場合は、理由を明示して対応方針を再確認し、`not-configured`のまま完了扱いにしない。
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

Issue #153では、実装PR内の実測結果に基づいてrule選定を更新する。ただし、ADR-0026のDecision本文は原則維持し、一般日本語ruleとRepository固有ruleの選定が後続更新されたことだけを最小限追記する。ADR-0026全体をsupersedeしない。

ADR-0027は新規作成しない。ADR lifecycleやsupersede管理をこのIssueで新設しない。

### 2.6 外部package

評価対象は`textlint-rule-preset-japanese@10.0.4`に固定する。一般文書向けで誤検知を抑える目的のpresetで、既存4 ruleと重複するruleを内包する。これは実装PR内の一時評価にだけ使用し、production dependencyとしては残さない。正式採用ruleは対応する個別packageだけをproductionへ追加し、`package.json`と`pnpm-lock.yaml`の最終状態からpresetを除外する。

評価用packageはRepository外または既存のGit ignore対象に置く一時評価環境へ、`textlint-rule-preset-japanese@10.0.4`として導入する。`^10.0.4`は使用せず、productionの`package.json`へ評価用presetを残さない。評価用の一時config、評価処理、依存関係をGit管理対象へ恒久的に追加しない。

公式:

- [repository](https://github.com/textlint-ja/textlint-rule-preset-japanese)
- [README](https://github.com/textlint-ja/textlint-rule-preset-japanese/blob/master/README.md)

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

Issue #153、PR #146、PR #151、実装開始時に確認したlatest mainの実装から、次の方針をPlan上の決定として扱う。

### Plan上の決定

1. `textlint-rule-preset-japanese`は第一候補として実装PR内で評価する。preset内の日本語ruleは実測結果を得る前に正式採用しない。
2. PR #146の既存5 ruleは維持する。productionは個別package方式に固定し、preset内部ruleの実効化や二重実行をproductionへ持ち込まない。
3. preset内の8候補は、production scannerへ組み込む前に、一時configとtextlint APIを使う一時評価処理で実測し、実リポジトリの結果と誤検知を確認してから採否を決める。CLIへ切り替える判断は実装時に残さない。
4. `docs/WRITING_STANDARDS.md`に存在しない新しいstyle制約を、このIssueだけでblocking契約として追加しない。
5. Repository固有ruleは、`docs/WRITING_STANDARDS.md`の「リポジトリ内で使われているだけの用語」にある一意置換候補を評価対象とする。
6. `Minimum Evidence`は置換先が2通りあるためcustom blocking ruleにしない。
7. `Summary`、`Evidence`、`Scope`、`Build`、`Test`、`device`等の一般語は、文脈依存なので単純な禁止語にしない。
8. custom ruleで`ignore.identifiers: true`を一律に設定しない。現在のscannerは英字列をidentifierとしてmaskするため、今回の英語表現そのものを検出できなくなる。
9. 全件scanは実装PRで対象範囲の既存違反を0件にするためのgateとし、Hookは従来どおり差分検出だけを行う。
10. ruleの安全性、現在の違反件数、contract上の動作を別々に確認する。現在の違反が0件でも、将来の禁止ruleとして安全なら採用候補から外さない。
11. Issue #153本文は変更しない。Issueで未確定としている実装詳細だけをこのPlanで具体化する。

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
- 正式採用ruleに違反する現行対象Markdown

### 条件付き変更対象

- `.codex/hooks/text_quality_gate.mjs`
  - 正式採用した個別ruleのrule ID処理またはscope処理に実変更が必要な場合だけ変更する。
  - session baseline、PostToolUse、Stop、state schema、fail-open / fail-close semanticsは変更しない。
- `scripts/verify` / `scripts/verify.ps1`
  - 新しいcontract suiteを追加せず、既存`-HookContracts` / `--hook-contracts`から現在の`codex-text-quality.test.ts`を実行できるなら変更しない。
- `docs/adr/0026-codex-text-quality-gate.md`
  - Issue #153によるrule選定の後続更新を最小限追記する。Decision本文全体の書き換えやsupersede管理は行わない。
- `docs/reference/codex-safety-harness.md`
  - 正常完了時に実効rule集合とcustom rule設定へ最小更新する。
- `docs/reference/codex-implementation-harness.md`
  - 正常完了時に実効rule集合とcustom rule設定へ最小更新する。

### 全件scanの対象

全件scanでは、現在のworktreeに存在する非ignore Markdownを候補集合とする。

localでは次と同等の集合を使う。

```text
git ls-files --cached --others --exclude-standard -- '*.md'
```

CIのclean checkoutではtracked Markdownだけになる。

全件scanからは、文章表現の統一対象ではない履歴をpath prefixで除外する。加えて、rootの`CHANGELOG.md`は既存履歴全体を文章統一だけの理由でmigrationしないため、`lint:text:all`の対象外とする。

```text
.codex/runs/
docs/plans/
docs/reports/
docs/history/
docs/adr/
CHANGELOG.md
```

この除外は「既存文書を全件migrationしない」ためのscopeであり、差分gateの除外ではない。`CHANGELOG.md`も、今後変更した差分は既存の`lint:text`で新規違反を検出する。今回新規作成・更新するPlan、ADR、Run Artifact等は、既存の差分gateで新規違反を検出する。

生成物や依存関係は`git ls-files --others --exclude-standard`によりGit ignoreを尊重する。現在の`.markdownlint-cli2.jsonc`でignoreされている`node_modules/`、`.artifacts/`、`dist/`、`android/`、`.expo/`、`output/`等を文章品質gate向けに別一覧として重複管理しない。

fixture / snapshot / eval datasetについては、Plan作成時のGitHub code searchでは対象となるtracked Markdownを確認できなかった。実装時の列挙結果で該当Markdownが存在した場合だけ、その具体pathを確認して除外へ追加する。将来用の広いglobは先に作らない。

対象となる主なMarkdown:

- rootの人間向けMarkdown
- `.agents/skills/**/*.md`
- `.codex/rules/**/*.md`
- `.codex/templates/**/*.md`
- `.github/**/*.md`
- `docs/**/*.md`のうち上記履歴prefixを除く現行文書
- `examples/**/*.md`
- `training/**/*.md`

## 5. 変更方針

### Task 1: latest main確認・評価用presetを一時導入する

- [ ] 実装開始直前に`origin/main`をfetchする。
- [ ] Plan保存時から`main`へ入ったincoming diffを確認し、Issue #153のscanner、Hook、contract、CI、`package.json`、`pnpm-lock.yaml`、`docs/WRITING_STANDARDS.md`へ影響する変更の有無を確認する。
- [ ] materialな変更が見つかった場合だけPlanの前提を再確認する。関係のないdependency更新は最新状態を基準に実装する。
- [ ] latest `main`を対象branchへ安全な通常手順で取り込む。force pushを前提にしない。
- [ ] `package.json` / `pnpm-lock.yaml`がlatest `main`と一致した状態を確認してから、Issue #153のdependency変更を開始する。
- [ ] 評価用の一時workspaceをRepository外または既存のGit ignore対象へ作成し、`textlint-rule-preset-japanese@10.0.4`をexact versionで導入する。`^10.0.4`は使用しない。
- [ ] 評価用preset、評価用config、評価処理、評価workspaceのlockfileをRepositoryのproduction dependencyやGit管理対象へ恒久的に残さない。
- [ ] 既存の直接rule packageと既存の設定契約は、評価用presetの一時導入を理由に変更しない。

### Task 2: preset候補を実測し、正式採用ruleを決める

`textlint-rule-preset-japanese` 10.0.4には、既存ruleを除くと次の8候補がある。

```text
max-ten
no-doubled-conjunctive-particle-ga
no-doubled-conjunction
no-double-negative-ja
no-doubled-joshi
sentence-length
no-dropping-the-ra
no-mix-dearu-desumasu
```

この評価は段階導入ではなく、同一実装PR内で最終設定を決めるために行う。評価結果を得る前にproduction採用を確定しない。productionではpreset自体を使用せず、正式採用したruleの個別packageだけを使用する。

評価はproduction scannerへ組み込む前に、評価用の一時configとtextlint APIを使用する一時処理で行う。実装担当がCLIへ切り替える判断は残さない。評価結果を得るまでproductionの`.textlintrc.json`と`scripts/lint-text-quality.mjs`を変更しない。評価用の恒久script、framework、toolはRepositoryへ残さない。

評価対象MarkdownはSection 4で定義した`lint:text:all`対象Markdownと同一に固定する。`getWorkingTreeMarkdownPaths()`相当の既存列挙と同じ候補集合から、`.codex/runs/`、`docs/plans/`、`docs/reports/`、`docs/history/`、`docs/adr/`、`CHANGELOG.md`を除外する。過去Run、過去Plan、履歴文書、ADR、CHANGELOG履歴の検出件数を、現在利用中の文書に適したruleの採否評価へ混ぜない。

一時configの実効rule集合は次の8候補だけとする。既存5 direct rule、preset内の重複rule、採用しないpreset内部ruleを評価結果へ混在させない。

#### 評価手順

- [ ] 一時configとtextlint APIで、Section 4の`lint:text:all`対象Markdownだけを評価し、8候補それぞれのpath・line・検出件数を取得する。raw本文全体や不要な機密情報を成果物へ保存しない。
- [ ] 検出結果を実際のMarkdown文脈で確認し、ruleごとに実違反 / 誤検知 / 固定契約 / 対象外履歴を分類する。
- [ ] 設定値を持たないruleは次の設定で評価する。
  - `no-doubled-conjunctive-particle-ga: true`
  - `no-doubled-conjunction: true`
  - `no-double-negative-ja: true`
  - `no-dropping-the-ra: true`
- [ ] `max-ten`はdefault候補を`max: 3`、誤検知確認用の緩和比較を`max: 4`として評価する。これより厳しい値は比較しない。
- [ ] `sentence-length`はdefault候補を`max: 100`、誤検知確認用の緩和比較を`max: 120`として評価する。これより厳しい値は比較しない。
- [ ] `no-doubled-joshi`は`min_interval: 1`だけを評価する。`min_interval: 2`以上へ厳しくする比較は行わない。
- [ ] `no-mix-dearu-desumasu`は`strict: false`、`preferInHeader: ""`、`preferInBody: ""`、`preferInList: ""`で評価する。`strict: true`や`preferIn*`への文体指定は採用候補にしない。
- [ ] default設定で誤検知がなく、既存規約に根拠があるruleはdefault設定を候補とする。
- [ ] default設定では誤検知するが、上記で定義した緩和値で安全なruleは、その緩和値を候補とする。
- [ ] 緩和値でも正常文をblockingするruleは、設定値を増やして採用を延命せず、rule自体を非採用とする。
- [ ] 実測結果、ruleごとのpath・line・件数、誤検知確認、採否、migration対象件数をactive Runの`REPORT.md`へ記録する。同一taskのactive Runがあれば再利用し、なければRepositoryの既存Run運用に従って作成する。
- [ ] 8候補から正式採用ruleと設定値を確定する。production方式は正式採用ruleの個別package方式に固定する。
- [ ] 8候補すべてが採用基準を満たさない場合は、「`textlint-rule-preset-japanese` 10.0.4の8候補を評価したが、Issue #153で安全に追加できる一般日本語ruleを確認できなかった」と実測結果へ明記する。一般日本語rule追加の目的を達成できないためIssue #153を完了扱いにせず、対応方針を再確認する。このIssue内で別preset・別rule packageの探索は開始しない。

#### 採用基準

次をすべて満たすruleだけをblockingへ採用する。

- 既存の`docs/WRITING_STANDARDS.md`と矛盾しない。
- 既存5 ruleまたはmarkdownlintと同じ問題を二重報告しない。
- 正常な技術文、固定文字列、正式名称を継続的に誤検知しない。
- 違反修正が仕様、条件、数値、要件の強さを変更しない。
- ruleを採用するためだけの大量のdisable commentやpath allowlistを必要としない。
- 設定値の理由を実測結果から説明できる。

次に該当するruleは、検出件数が多くても採用しない。

- `docs/WRITING_STANDARDS.md`にない新しいstyle制約を強制するもの。
- 文脈依存の正常文を一定数誤検知し、機械判定へ寄せすぎるもの。
- lintを通すために文章の意味を変える必要があるもの。

特に`max-ten`、`sentence-length`、`no-mix-dearu-desumasu`はstyle制約を含むため、上記の具体的設定で実測し、既存文章規約で根拠を説明できなければ非採用とする。

### Task 3: 正式採用した一般日本語ruleの個別packageをproductionへ追加する

- [ ] Task 2で正式採用したruleに対応する個別packageだけを`devDependency`へ追加する。
- [ ] `textlint-rule-preset-japanese`は評価完了後にproductionの`package.json`から削除し、`pnpm-lock.yaml`も最終状態に合わせる。評価用presetをproduction dependencyへ残さない。
- [ ] 正式採用packageを追加する前に、公式repository / publisher、license、現在のtextlintとの互換性、保守状況、既知の重大な脆弱性を、既存package managerと公式metadataで確認する。独自のdependency監査scriptやframeworkは追加しない。
- [ ] preset 10.0.4内で評価したrule packageのversionと、productionで個別packageとしてresolveされたversionを比較する。
- [ ] versionが異なる場合は、productionでresolveされたversionを使い、Section 4の`lint:text:all`対象Markdown、同じ一時config相当の設定、textlint APIでそのruleの正式採用評価を再実行する。評価していないversionをblocking gateへ入れない。
- [ ] 既存5 direct ruleを削除せず、評価用presetのためだけの依存関係や設定を最終成果物へ残さない。

### Task 4: 正式採用した一般日本語ruleを既存textlint rule集合検証へ追加する

正式採用ruleが決まった後にのみ、既存scannerのrule集合検証へ追加する。preset対応だけを目的とする実装は行わない。

- [ ] `TEXTLINT_RULE_IDS`相当の実効rule集合を、既存5 ruleと正式採用した個別packageのrule ID込みへ更新する。
- [ ] `.textlintrc.json`のtop-level rule集合をfail-closeで検証する。
- [ ] `loadTextlintrc().toJSON()`のrule集合を正式採用rule込みで検証する。
- [ ] runtime `message.ruleId`を正式採用rule込みで検証する。
- [ ] custom ruleとのrule_id collision検証を維持する。
- [ ] unknown / missing / duplicate / load failureを従来どおりfail-closeにする。
- [ ] 設定値を持つ正式採用ruleについて、production configが意図したobject形式・設定値であることを明示的に検証する。今回正式採用したruleの設定だけを既存方式に合わせて検証し、将来の任意rule向け汎用schemaは作らない。例えば`sentence-length`を`max: 120`で採用した場合は、ruleの存在、object形式、`max: 120`、意図しない余計な設定がないことを確認する。
- [ ] fingerprintは引き続きruntime rule ID + normalized matchのSHA-256を使う。
- [ ] `tests/contracts/codex-text-quality.test.ts`の`linkTextlintDependencies()`は既存5 packageと、正式採用した個別rule packageだけをlinkする。preset package、非採用rule package、評価用packageは追加しない。

### Task 5: Repository固有の表記rule候補を評価する

`docs/WRITING_STANDARDS.md`の「リポジトリ内で使われているだけの用語」から、一意置換できる次の8候補を評価する。

| rule_id候補 | 検出する表現 | replacement |
|---|---|---|
| `wording-competency-rubric` | `Competency Rubric` | `習熟度評価基準` |
| `wording-native-specialization` | `Native specialization` | `モバイルアプリ自動化の選択課程` |
| `wording-common-core` | `Common Core` | `共通課程` |
| `wording-learner-facing` | `learner-facing` | `受講者向け` |
| `wording-common-route` | `Common route` | `共通経路` |
| `wording-completion-contract` | `Completion contract` | `修了条件` |
| `wording-common-completion` | `Common completion` | `共通課程の修了` |
| `wording-bounded-level-2` | `bounded Level 2` | `対象範囲を限定したレベル2` |

`Minimum Evidence`は置換先が2通りあるため対象外とする。

#### scanner設定

候補ruleは次を基本とする。

- `match_type: "literal"`
- `case_sensitive: true`
- `normalization: "none"`
- `ignore.fenced_code: true`
- `ignore.inline_code: true`
- `ignore.urls: true`
- `ignore.identifiers: false`

`ignore.identifiers: false`とする理由は、現在のscannerが`ignore.identifiers: true`の場合に英字列をmaskし、今回の検出語自体を消してしまうため。

messageは、各採用ruleのreplacementを使用するよう明示する短い固定文にする。rule_idは上表の候補から採用したものに付与し、fingerprintの安定性を保つ。

Repository固有ruleの安全性確認と、今回修正するmigration対象件数を分離する。Repository全体検索はruleをblockingにして安全かを確認するためにだけ使用し、その検索件数をmigration件数として扱わない。migration対象件数、0 violation判定、実際に修正するfileは、Section 4で定義した`lint:text:all`対象Markdownだけで集計する。

Repository全体の安全性確認では、通常のMarkdown本文だけでなく、コード上のidentifier、schema、enum、config値、validator / contract testの固定文字列、UI正式名称、外部仕様、ファイル名、path、relative link destination、過去記録を検索する。

#### Step 1: ruleとして安全かを判断する

各候補について、現在の出現件数とは別に次を確認する。

- [ ] `docs/WRITING_STANDARDS.md`で置換先が一意に決まっている。
- [ ] コード上のidentifier、schema / enum / config値、validator / contract testの固定文字列ではない。
- [ ] UI正式名称、外部仕様の正式名称、ファイル名、pathとして維持すべき表現ではない。
- [ ] 通常本文では常に置換してよく、仕様や要件の意味を変更しない。
- [ ] relative pathやMarkdown link destinationを誤検知しないことを、小さいscanner変更とfixtureで安全に確認できる。大きなMarkdown parserやscope frameworkが必要なら、その候補はblocking採用しない。

特に`learner-facing`については、少なくとも次をcontract testで確認する。

```text
通常本文の `learner-facing`                          -> violation
inline code の `` `learner-facing` ``                 -> violationにならない
HTTP URL の `https://example.test/learner-facing`      -> violationにならない
Markdown relative link `[説明](docs/learner-facing.md)` -> link destinationを違反にしない
relative path の `docs/learner-facing.md`              -> file pathとして使用される場合は違反にしない
```

この区別を既存scannerへの小さい変更で安全に実現できない場合は、`learner-facing`をcustom blocking ruleとして採用しない。同じ問題が他候補にある場合も同様に扱う。

#### Step 2: lint:text:all範囲の現在の違反件数を確認する

- [ ] Step 1でruleとして安全と判断した候補だけを、Section 4の`lint:text:all`対象Markdownで検査する。
- [ ] `lint:text:all`対象Markdownにおける現在の違反件数と修正対象fileをruleごとに記録する。Repository全体検索の件数はここへ合算しない。
- [ ] 現在の違反件数が0件でも、将来その表現を禁止するruleとして安全なら、rule採用を否定する理由にしない。

#### Step 3: contract testでrule自体を検証する

- [ ] 通常本文の候補表現がviolationになることをfixtureで確認する。
- [ ] identifier / schema / enum / config / validator固定文字列 / UI正式名称 / 外部仕様 / file path / relative link destinationなどの除外対象がviolationにならないことをfixtureで確認する。
- [ ] inline code / fenced code / HTTP URLの出現がscannerで除外されることを確認する。
- [ ] Step 1からStep 3までを満たした候補だけをblockingへ正式採用する。
- [ ] Step 1のRepository全体検索結果、Step 2の`lint:text:all`対象件数、Step 3のfixture結果を区別してactive Runの`REPORT.md`へ記録する。

安全にblocking採用できる候補が1件以上ある場合だけ`.codex/text-quality-rules.json`を`status: "configured"`へ変更する。8候補すべてを安全にblockingできない場合は、理由をactive Runの`REPORT.md`へ残し、`not-configured`のままIssueを完了扱いにせず、Repository固有rule導入で目的を満たせるか対応方針を再確認する。

### Task 6: 全件scan modeを既存Repository-level checkerへ追加する

新しいscannerやlint frameworkは作らない。

`scripts/check-text-quality-changes.mjs`へ、差分比較とは別に現在の対象Markdownを全件検査するmodeを追加する。

`--all`の候補Markdown列挙は、同じscriptに既にある`getWorkingTreeMarkdownPaths()`を再利用する。`git ls-files --cached --others --exclude-standard -- "*.md"`相当のMarkdown列挙処理やGit commandを`--all`用に別実装として二重管理しない。

想定CLI:

```bash
node scripts/check-text-quality-changes.mjs --all
```

要件:

- `--all`と`--base-ref`は排他的にする。
- localの`--all`は`getWorkingTreeMarkdownPaths()`が返すtracked + untrackedかつGit ignoreされていないMarkdownを候補にする。
- CIのclean checkoutでは同じ候補集合が実質tracked Markdownになる。
- その候補集合へ、Section 4の履歴prefixだけを全件migration scopeから追加filterする。
- rootの`CHANGELOG.md`は既存履歴のmigration対象から除外する。これは`--all`だけの除外であり、`lint:text`の差分gateでは除外しない。
- 各本文は既存`loadRules()` + `scanTextQuality()`へ渡す。
- textlint / custom rule定義を全件scan用に複製しない。
- 1件でも違反があればexit 1。
- config / rule / Git / read failureはexit 2。
- JSON出力は既存`publicViolation()`相当の公開形式を再利用する。
- raw matchや全文を新しく出力しない。
- Hookから`--all`を呼ばない。

package script:

```text
lint:text      = HEAD -> current worktreeの既存差分gate
lint:text:all  = 現行対象Markdownの全件gate
```

未commitの新規Markdownもlocal全件gateで検査できることをcontract testへ追加する。

### Task 7: 正式採用後に現行対象Markdownを0違反へ修正する

Task 2 / Task 5の評価を完了し、正式採用ruleを固定してから文章修正へ進む。

- [ ] 正式採用ruleだけで`lint:text:all`を実行する。
- [ ] 違反をrule別・file別に確認する。
- [ ] 自動fixを一括適用せず、文脈を確認して修正する。
- [ ] 固定契約、数値、要件の強さ、条件、順序を維持する。
- [ ] code / command / identifier / API / UI正式名称を変更しない。
- [ ] 仕様変更に見える修正は実施せず、ruleの誤検知か固定文字列かを先に確認する。
- [ ] 全件scan除外対象は、文章統一だけの理由で修正しない。
- [ ] 既存`CHANGELOG.md`の履歴は`lint:text:all`でmigrationせず、`CHANGELOG.md`の今回以降の変更だけを`lint:text`で検査する。
- [ ] 修正後に`lint:text:all`が0 violationになることを確認する。

正式採用候補が正常文を誤検知する場合は、文章を無理に直さずTask 2 / Task 5へ戻り、そのruleの採否を再判断する。

個別disable commentを増やして0件に見せる対応は行わない。

### Task 8: contract testを更新する

主対象は`tests/contracts/codex-text-quality.test.ts`。

追加・更新する確認:

- [ ] production configに既存5 direct ruleが残る。
- [ ] `textlint-rule-preset-japanese`がproductionの`package.json` / `pnpm-lock.yaml`に残っていない。
- [ ] 評価で正式採用した一般日本語ruleに対応する個別packageだけがproduction dependencyとblocking ruleになる。
- [ ] `no-hankaku-kana`が従来どおり動く。
- [ ] 正式採用した個別ruleごとにpositive / non-violationの代表caseを確認する。
- [ ] 評価対象だったが非採用のpreset内部ruleや個別packageをproduction blockingへ誤って含めていない。
- [ ] `linkTextlintDependencies()`は既存5 packageと正式採用した個別rule packageだけをlinkし、preset packageや非採用packageをlinkしていない。
- [ ] custom ruleごとに通常本文のpositive caseを確認する。
- [ ] custom ruleのinline code / fenced code / URL除外を確認する。
- [ ] `learner-facing`の通常本文、inline code、HTTP URL、Markdown relative link destination、relative pathの扱いを確認し、安全に区別できない場合は採用しない。
- [ ] `ignore.identifiers: true`によって検出語が消える設定を入れていない。
- [ ] custom ruleのproduction集合が評価結果と一致する。
- [ ] full scan対象に違反があれば失敗する。
- [ ] local full scanがuntracked Markdownも検出する。
- [ ] historical prefixの既存違反は全件migration対象にしない。
- [ ] historical prefix内の今回変更分は既存差分gateで検出される。
- [ ] 既存`CHANGELOG.md`の履歴は全件migrationせず、`CHANGELOG.md`の今回以降の変更は既存差分gateで検出される。
- [ ] 差分gateは既存fingerprint countとrename semanticsを維持する。
- [ ] productionの個別rule packageのmissing / invalid / unloadable状態はquality unavailableとして従来契約へ収束する。評価用presetのproduction依存やpreset専用contractは追加しない。
- [ ] UserPromptSubmit / PostToolUse / Stopのfail-open / fail-close契約を変更しない。
- [ ] Issue #161で確定した`stop_hook_active=true`かつstateなしの重複Stop allow契約を維持する。

fixtureのNode依存解決では、既存5 packageと正式採用した個別rule packageだけをlinkする。現在のfixture方式で実際に不足する正式採用packageだけを追加し、preset packageや非採用packageを個別列挙しない。

### Task 9: `pnpm run verify`とCIへ全件gateを接続する

`package.json`:

- `lint:text`は変更差分gateとして維持する。
- `lint:text:all`を追加する。
- `verify`で`lint:text`の直後に`lint:text:all`を実行する。
- rule定義の正本は`.textlintrc.json`と`.codex/text-quality-rules.json`に限定し、CI専用・verify専用・Hook専用のrule集合を作らない。

`.github/workflows/ci.yml`:

- 現行`Text quality change gate`を維持する。
- その後に全件gateを追加する。
- PR / push / schedule / workflow_dispatchで同じrule集合を使用する。
- checkout、`fetch-depth: 0`、base ref解決は変更しない。
- 全件gateのためだけに別jobや別workflowを追加しない。

Husky:

- 現在の`.husky/pre-commit`は`format:check`、`lint`、`security:check`だけを実行している。
- Issue #153はCIまたは同等の必須検証で全件0違反を求めており、pre-commitへの全件scan追加は要求していない。
- このIssueではHuskyを変更しない。

Hook:

- 全件gateを接続しない。
- PostToolUse / Stopはsession差分のみを確認する。

### Task 10: referenceとADR-0026を最終実装状態へ合わせて更新する

現在のADR-0026は`Accepted`であり、「presetを追加しない」「5個のtextlint個別ruleを正本とする」と記録している。Issue #153の実装PRではpresetをproductionへ残さず、正式採用した一般日本語ruleとRepository固有ruleの選定だけを後続更新する。Decision本文は原則維持する。

- [ ] Issue #153が正常完了した場合、`docs/reference/codex-safety-harness.md`と`docs/reference/codex-implementation-harness.md`を必ず確認し、5 ruleのみ・custom rule未設定などの記述を実装後の実効rule集合へ合わせて最小更新する。
- [ ] ADR-0026のrule選定部分と現在仕様が矛盾する場合は、Issue #153により一般日本語ruleとRepository固有ruleの選定が後続更新されたことだけを最小限追記する。矛盾しないDecision本文、過去判断、履歴部分は書き換えない。
- [ ] ADR-0026のDecision本文、過去判断、履歴部分を全面的に書き換えない。
- [ ] ADR-0027を新規作成しない。ADR lifecycleやsupersede管理をこのIssueで新設しない。
- [ ] 過去Plan、過去Run、ADR-0026のDecision本文を文章統一のために修正しない。

## 6. 検証方法

### 6.1 dependency / config

```bash
pnpm install --frozen-lockfile
pnpm run lint:text
pnpm run lint:text:all
```

確認:

- 評価時はRepository外またはGit ignore対象の一時環境で、`textlint-rule-preset-japanese@10.0.4`をexact versionとして解決する。評価はSection 4の`lint:text:all`対象Markdownに対して一時config + textlint APIで行い、ruleごとのpath・line・件数・誤検知・採否をactive Runの`REPORT.md`へ記録する。
- 最終状態では`textlint-rule-preset-japanese`をproduction dependencyへ残さず、正式採用した個別rule packageだけを`package.json` / `pnpm-lock.yaml`へ反映する。
- direct 5 rule + 採用した一般日本語rule + 1件以上のcustom ruleが同じscanner経路で動く。
- 8候補すべてが不採用の場合は、別preset・別rule packageの探索へ進まず、一般日本語rule追加の目的未達としてIssueを完了扱いにせず対応方針を再確認する。
- `lint:text:all`は既存`CHANGELOG.md`履歴を対象外とし、`lint:text`は変更された`CHANGELOG.md`を通常どおり検査する。
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

- 既存5 rule以外の一般日本語ruleと、1件以上のRepository固有ruleをblockingへ正式採用し、正式採用ruleの全件違反0件。
- 8候補すべてが不採用の場合は、実測結果を示してIssue #153を完了扱いにせず、別preset・別rule packageの探索を開始しない。
- excluded historical corpusを文章統一だけの理由で変更していない。
- 既存`CHANGELOG.md`履歴を全件migrationしていない。
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

### 7.1 評価versionとproduction packageのrule ID

`textlint-rule-preset-japanese@10.0.4`の一時評価で得た内部rule packageと、productionへ個別追加したpackageではresolve versionや、`loadTextlintrc().toJSON()`のID、lint violationの`message.ruleId`が一致しない可能性がある。

対策:

- preset 10.0.4の評価結果とproductionのresolve versionを比較する。
- versionが異なる場合はproduction versionで同じ対象範囲・設定・textlint API評価を再実行する。
- productionのconfig集合検証とruntime message検証を、正式採用した個別rule ID込みで行う。
- unknown IDを黙って許可しない。

### 7.2 preset採否を先に固定するリスク

Issue #153は実測後の採否決定を要求している。Planで候補を先にblocking確定すると、誤検知を文章修正で押し切る構造になる。

対策:

- 8候補を同じ手順で実測する。
- 採用基準を先に固定し、採用rule自体は実測後に決める。
- 個別ruleの非採用自体は許容するが、8候補をすべて非採用にして既存5 rule以外の一般日本語ruleが0件になる場合は、成功条件にせず実測結果を示して対応方針を再確認する。このIssue内で別preset・別rule packageの探索は開始しない。

### 7.3 custom ruleの検出不能と固定文字列

現在の`ignore.identifiers`は英字列をmaskするため、今回の英語表現ruleで`true`にすると検出語そのものが消える。

対策:

- custom wording ruleでは`ignore.identifiers: false`を基本とする。
- inline code / fenced code / URLを除外する。
- 固定文字列や外部契約として通常本文に残る候補はblocking採用しない。
- relative pathやMarkdown relative link destinationを安全に区別できない候補はblocking採用しない。
- path例外のためにcustom rule schemaを拡張しない。

### 7.4 custom ruleを1件も導入できない場合

8候補すべてがidentifier、schema / enum / config、validator固定文字列、UI正式名称、外部仕様、file path、relative link destinationなどとの衝突で安全にblockingできない可能性がある。

対策:

- 現在の違反件数とは分離して、rule自体の安全性を先に評価する。
- 1件も安全に採用できない場合は、`not-configured`を正常完了条件にせず、理由を明示してIssue #153の目的を満たせるか対応方針を再確認する。
- 無理な置換、広いpath除外、恒久的なdisable comment、大きなparser / framework追加で採用件数を作らない。

### 7.5 全件scanと履歴文書

全Markdownを無差別にscanすると、Issueが明示的に除外した過去記録までmigration対象になる。

対策:

- local候補集合はtracked + untracked nonignored Markdownとする。
- full scanだけ履歴prefixを除外する。
- 既存`CHANGELOG.md`はfull scanのmigration対象から除外する。
- `CHANGELOG.md`の今後の変更は差分gateで検査する。
- 新規・更新した履歴文書は既存差分gateで検査する。
- 既存履歴を通すための大量disable commentを追加しない。

### 7.6 CI時間

全件scan追加で`Style Quality`と`verify`の時間が増える。

対策:

- scannerを新設せず既存`scanTextQuality()`を再利用する。
- Hookには全件scanを追加しない。
- 同一CI job内で実行し、別jobやmatrixを追加しない。
- 実測で問題がなければcacheや並列frameworkを追加しない。

### 7.7 ADR-0026の整合

Issue #153でrule選定が更新された場合、ADR-0026の過去Decision本文と現在仕様の関係が曖昧に見える可能性がある。

対策:

- ADR-0026のDecision本文は原則維持する。
- Issue #153が正常完了した場合は、一般日本語ruleとRepository固有ruleの選定が後続更新されたことを、ADR-0026のrule選定部分へ必要最小限追記する。Decision本文全体は書き換えない。
- ADR-0026全体をsupersedeせず、ADR-0027の新規作成やADR lifecycle / supersede管理の新設を行わない。
- `docs/reference/codex-safety-harness.md`と`docs/reference/codex-implementation-harness.md`は、正常完了時の実効rule集合とcustom rule設定へ合わせて必ず確認・最小更新する。

## 8. 成果物

想定変更ファイル:

```text
package.json（正式採用した一般日本語ruleの個別packageだけを含み、`textlint-rule-preset-japanese`を含まない最終dependency状態）
pnpm-lock.yaml（個別packageのresolve versionと評価versionの照合後の最終状態）
.textlintrc.json
.codex/text-quality-rules.json
scripts/lint-text-quality.mjs
scripts/check-text-quality-changes.mjs
tests/contracts/codex-text-quality.test.ts
.github/workflows/ci.yml
<正式採用ruleに違反する現行対象Markdown>
docs/reference/codex-safety-harness.md（正常完了時に実効rule集合へ最小更新）
docs/reference/codex-implementation-harness.md（正常完了時に実効rule集合へ最小更新）
```

条件付き:

```text
docs/adr/0026-codex-text-quality-gate.md（Issue #153によるrule選定更新の最小限追記のみ）
.codex/hooks/text_quality_gate.mjs
scripts/verify
scripts/verify.ps1
docs/reference/codex-safety-harness.md
docs/reference/codex-implementation-harness.md
```

## 9. 実装前自己レビュー

- [ ] Issue #153本文を実装仕様で膨らませず、Planで必要な詳細だけを決めている。
- [ ] `textlint-rule-preset-japanese@10.0.4`を一時環境で評価し、評価後にproductionへ残さない。
- [ ] preset ruleの採否を実測前に固定していない。
- [ ] preset評価をproduction scanner変更前に一時config + textlint APIで行っている。
- [ ] 評価対象がSection 4の`lint:text:all`対象Markdownへ固定され、path・line・件数・誤検知・採否をactive Runの`REPORT.md`へ記録している。
- [ ] `max-ten`、`sentence-length`、`no-doubled-joshi`、`no-mix-dearu-desumasu`の評価設定値がPlanどおり固定されている。
- [ ] production方式を正式採用ruleの個別packageへ固定し、presetをproductionへ残さない。
- [ ] 個別package方式でもscanner変更が必要なことをTask 4へ反映している。
- [ ] productionの実効rule集合が既存5 direct rule + 正式採用ruleだけになっている。
- [ ] 8候補すべて不採用の場合に、目的未達として停止・対応方針再確認し、別preset・別rule package探索へ進まない。
- [ ] custom rule 0件を自動的な成功条件にせず、8候補を評価して目的未達時の再確認を定義している。
- [ ] PR #146の既存5 ruleを削除していない。
- [ ] 評価用preset内の重複ruleを含む非採用内部ruleをproduction config / fixtureへ持ち込まない。
- [ ] `docs/WRITING_STANDARDS.md`にないstyle制約を勝手に追加していない。
- [ ] custom rule候補は一意置換できるRepository固有表現に限定している。
- [ ] `Minimum Evidence`を一意replacement扱いしていない。
- [ ] `Summary`、`Evidence`、`Build`、`Test`等をbroad禁止していない。
- [ ] custom ruleに`ignore.identifiers: true`を一律設定していない。
- [ ] ruleの安全性、現在違反件数、contract testを分離して確認している。
- [ ] custom ruleの通常本文positive testを用意する。
- [ ] Repository全体検索による安全性確認と、`lint:text:all`範囲のmigration件数・0 violation判定を分離している。
- [ ] dependencyのrepository / publisher、license、textlint互換性、保守状況、既知の重大な脆弱性、lockfile resolve versionを確認している。
- [ ] 評価versionとproduction resolve versionが異なる場合にproduction versionで再評価している。
- [ ] `learner-facing`のinline code / HTTP URL / Markdown relative link / relative pathを誤検知せず、区別できない場合は採用しない。
- [ ] scanner / rule definitionを二重管理していない。
- [ ] local full scanがuntracked Markdownを取りこぼさない。
- [ ] full scanの履歴除外と差分gateを混同していない。
- [ ] 既存`CHANGELOG.md`履歴を全件migrationせず、変更差分は`lint:text`で検査する。
- [ ] 全件gateをHookへ追加していない。
- [ ] Husky pre-commitへ要求外の全件scanを追加していない。
- [ ] 差分比較、fingerprint、rename、comparison failureの既存契約を弱めていない。
- [ ] active Stop / duplicate Stopの既存契約を維持している。
- [ ] Markdown構造lintをtextlintへ重複実装していない。
- [ ] 新しいlint framework、dictionary framework、AI Judgeを追加していない。
- [ ] 正常完了時にreference 2文書を実効rule集合へ合わせて確認・最小更新する。
- [ ] latest mainをfetchし、incoming diffと文章品質基盤への影響を確認してから安全に取り込む。
- [ ] package.json / pnpm-lock.yamlをlatest mainと一致させてからdependency変更を開始する。
- [ ] ADR-0026のDecision本文を原則維持し、必要なrule選定更新だけを最小限追記する。ADR-0027を新規作成せず、ADR lifecycle / supersede管理を新設しない。

## 10. 備考

- Plan作成時の`main` HEAD（`0af177828a058e118285a2ee3a01262aa7da6b2e`）は履歴情報として保持するが、実装基準のcurrent mainとは扱わない。
- 実装開始直前に`origin/main`をfetchし、Plan保存時からmainへ入ったincoming diffと、Issue #153のscanner、Hook、contract、CI、`package.json`、`pnpm-lock.yaml`、`docs/WRITING_STANDARDS.md`への影響を確認する。
- latest `main`を対象branchへ安全な通常手順で取り込み、`package.json` / `pnpm-lock.yaml`がlatest `main`と一致した状態からIssue #153のdependency変更を開始する。force pushを前提にしない。
- Plan作成時点でIssue #153はopen。
- PR #146とPR #151はmainへmerge済み。
- このPlan作成では実装、既存ファイル修正、PR作成は行わない。
