# Codex Hook契約・compact再注入・文章品質ゲート 実装計画

## 0. 依頼概要

- 対象Issue: #134 `test: Codex Hook契約テストとcompact後の指示再注入・文章品質ゲートを整備する`
- 実装branch: `issue-134-codex-hook-quality-gates`
- Plan作成時base: `main` / `3c5e35ed42712574eb9d89051820c9e27f137a16`
- 依存Issue: #135 `refactor: AGENTS.mdをスリム化し常駐指示と詳細運用仕様を分離する`
- #135 Plan branch: `issue-135-agents-context-slimming`
- このPlanでは実装しない。実装、commit、push、PR作成・更新は別タスクで行う。

Issue #134の目的は、既存Codex Harnessを拡張し、次を満たすことである。

1. Hookの契約をprocess境界で検証する。
2. compact後に、#135でスリム化されたroot `AGENTS.md` を再注入する。
3. Markdown文章へ決定論的な品質ルールを適用し、HookとCIの両方で検証する。
4. 作業開始前から存在する違反と、今回のCodex作業で増えた違反を分離する。

新しいAgent Runtime、独自Workflow Engine、AIによる文章評価基盤は作らない。既存の `.codex/**`、Node.js、Vitest、`scripts/verify`、`pnpm run verify`、GitHub Actionsを再利用する。

## 1. ゴール / 完了条件

### ゴール

既存Hookの挙動を壊さず、compact後の指示再注入と文章品質ゲートを、軽量・決定論的・クロスプラットフォームなHookとして追加する。

### 完了条件

- 既存 `pre_tool_use_policy.mjs` と `log_event.mjs` の主要契約が、子processを通すテストで固定されている。
- `.codex/config.toml` のHookイベント、matcher、command、Windows / Unix経路を構造として検証できる。
- #135が完了し、スリム化済みroot `AGENTS.md` が正本として確定してから、compact再注入を実装している。
- `SessionStart` の `source=compact` だけでroot `AGENTS.md` 全文を `hookSpecificOutput.additionalContext` として返す。
- compact以外の `SessionStart` では再注入しない。
- root `AGENTS.md` の内容をHook専用ファイルへ複製しない。
- `additionalContextLimit` を使用する場合、対象Codex versionの正式仕様と実測に基づく明示値を設定し、root `AGENTS.md` 全文が意図しないspill対象にならないことを契約テストで確認する。
- 文章品質lintは決定論的な明示ルールだけを扱い、markdownlintの責務を重複実装しない。
- PostToolUseではRepository全体を毎回scanせず、作業開始baselineとの差分で今回増えた違反だけを即時フィードバック対象にする。
- Stopでは同じ新規違反を完了前に確認し、`stop_hook_active=false` のときだけ1回blockできる。
- `stop_hook_active=true` では同一違反を繰り返しblockしない。
- Hook内部エラーとlint違反を別の結果として扱う。
- `pnpm run verify`、`bash scripts/verify`、GitHub Actionsのいずれでも必要な検証が抜けない。
- WindowsとUbuntu/Linuxの既存Harness経路を壊していない。
- Product code、Skill routing、Agent orchestrationへ変更を広げていない。

## 2. 現状理解と前提

### 2.1 Issue作成後に進んでいる内容

Issue本文の「Hook process契約テストが不足している」という前提は、現在の `main` では一部解消済みである。

現在は `tests/contracts/codex-hook-contract.test.ts` が存在し、少なくとも次を既にprocess境界で確認している。

- `pre_tool_use_policy.mjs` のstdin / stdout / stderr / exit code
- malformed / out-of-contract inputのfail-close
- safe / deny判定
- shell連結を含む代表的なGit policy
- `.codex/config.toml` の `PreToolUse` matcherとcommand
- `log_event.mjs` のJSONL副作用
- malformed JSON / event mismatch時のfailure-safe挙動
- credential redaction
- 2000文字preview上限
- Windows / Unixのconfigured logging command
- nested cwd
- logger欠落、repository root解決失敗、canonical log path書込失敗時のfallback
- concurrent appendが独立したJSON lineになること

また、PR #144が2026-09-12にmergeされ、Windows上の既存Hook contract timeout対策も `main` に入っている。

したがって、Issue本文の想定どおり `tests/codex-hooks/` を新設して既存契約を作り直さない。現在の `tests/contracts/codex-hook-contract.test.ts` を正本として不足分を追加する。

### 2.2 現在の検証経路

`package.json` では次の経路がある。

```text
pnpm run test:contracts
  -> vitest run tests/contracts --no-file-parallelism --maxWorkers=1

pnpm run test
  -> ... -> test:contracts

pnpm run verify
  -> ... -> pnpm run test -> test:contracts
```

GitHub Actions `Web CI` のVitest matrixにも `contracts` が含まれているため、`tests/contracts/**` に追加するHook契約テストは既存CI経路へ自動的に入る。

一方、`scripts/verify` は別のshell harnessであり、現在はHook script/configの存在・文字列契約を確認するが、Vitestの `codex-hook-contract.test.ts` 自体は実行していない。Issue #134の要件を満たすには、この経路を別途接続する必要がある。

### 2.3 現在のHook設定

`.codex/config.toml` には現在、少なくとも次がある。

- `PreToolUse`
- `UserPromptSubmit`
- `PostToolUse`
- `SubagentStart`
- `SubagentStop`
- `Stop`

`SessionStart` は未登録である。

Windowsは `command_windows` を使う別command経路があり、Unix側と同一文字列ではない。新規Hookでも、必要な場合は両方のconfigured commandを契約テストする。

### 2.4 #135との依存関係

Plan作成時点でIssue #135はopenである。

compact再注入は #135完了後まで実装しない。#134 branchを #135 branchへ直接依存させず、#135が `main` へ入った後に、このbranchへ最新 `main` をRepositoryのGit安全規約に従って取り込んでから再注入実装へ進む。

Hook契約の不足分確認、文章lintの独立したrule engine、baseline方式のテスト設計は #135前でも進められる。

### 2.5 Codex Hook正式仕様

2026-09-12にOpenAIのCodex sourceを確認した時点では、少なくとも次が存在する。

- `SessionStart` inputの `source` に `compact`
- `SessionStart` outputの `hookSpecificOutput.additionalContext`
- `Stop` inputの `stop_hook_active`
- command Hook設定の `additionalContextLimit`

参照:

- https://github.com/openai/codex/blob/main/codex-rs/hooks/src/schema.rs
- https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json

ただしCodex Hook仕様はversion依存である。実装開始時に、実際に使用するCodex CLI versionとそのversionに対応する正式仕様を再確認する。OpenAI repositoryの最新 `main` を、ローカルで使用しているversionへ無条件に適用しない。

`additionalContextLimit` は現在の正式sourceでは `additionalContext` のspill閾値として扱われる。単純な「stdout文字数上限」として扱わない。実装時のversionで同じ契約か確認し、root `AGENTS.md` の実サイズを使って境界テストする。

### 2.6 前提

- Node.js標準機能で実装できるHook処理へ、新しいruntime依存を追加しない。
- TOMLを意味的にparseするための既存direct dependencyが実装時点でも無い場合、手書きTOML parserを増やすより、test専用の小さなmaintained parser導入を比較する。依存を追加する場合はlicense、保守状況、lockfile影響を確認する。
- 文章品質lintの対象は、初期実装ではMarkdown (`*.md`) に限定する。Issueの目的だけを理由に `.txt`、CSV、source comment等へ対象を広げない。
- 意味評価、自然さ、論理構成、未知の造語検出はblock条件にしない。

## 3. 質問 / 曖昧性

### 必ず実装前に確定する項目

1. #135が `main` へmerge済みか。
2. #135後のroot `AGENTS.md` のbyte数・概算token数と、通常SessionStart/compactでの読込契約。
3. 実際に使用するCodex CLI versionと、Hook config field名・matcher・output schema。
4. 文章品質lintでblockする具体的なルール表。

### 文章ルールの扱い

Issue #134は「禁止語」「表記揺れ」「定義済み置換」「全角/半角」「allowlist付き英語混在」を候補として示しているが、具体的な禁止語や置換表までは定義していない。

そのため、実装時にモデル判断で禁止語・表記ルールを増やさない。次の順にルールを確定する。

1. Repository内で既に明文化されている表記規約を確認する。
2. Issue #134または関連Issueで明示されたruleを採用する。
3. それでも値が無いrule categoryは、仕組みだけ先に作ってproduction block ruleを推測追加しない。

広い「英単語検出」や辞書ベースの自然言語判定は初期実装に含めない。allowlistで完全に説明できる狭いruleだけを追加する。

### 未回答でも先に進められる項目

- #135完了前でも、既存Hook契約テストのgap確認と文章lint engineのunit/contract設計は進めてよい。
- TOML parserの具体packageは、実装時点のdependency状態とCodex config syntaxを確認して決める。

## 4. 影響範囲

### 変更候補

```text
.codex/config.toml
.codex/hooks/session_start_context.mjs           # 新規候補
.codex/hooks/text_quality_gate.mjs               # 新規候補: UserPromptSubmit/PostToolUse/Stop adapter
.codex/text-quality-rules.json                   # 新規候補: 明示済み決定論ruleだけ
scripts/lint-text-quality.mjs                    # 新規候補: 共通scanner/CLI
scripts/verify
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts       # 分離した方が読みやすい場合のみ新規
package.json
.github/workflows/ci.yml
docs/reference/codex-safety-harness.md
docs/reference/codex-implementation-harness.md  # 関連箇所がある場合だけ
```

ファイル名は実装時の既存命名へ合わせて調整してよい。候補ファイルをすべて作ることを目的にしない。

### 原則変更しない範囲

- Product code
- Playwright / application test
- Agent Skill本体
- subagent orchestration
- `pre_tool_use_policy.mjs` のpolicy意味
- `log_event.mjs` のlogging意味
- #135が所有するAGENTS分割方針
- 既存Markdown全件の一括修正

## 5. 変更方針

### Task 1: 実装開始時baselineを固定する

- [ ] `main`、branch HEAD、merge base、working treeを確認する。
- [ ] #135のstateとmerge有無を確認する。
- [ ] `tests/contracts/codex-hook-contract.test.ts`、`.codex/config.toml`、Hook scripts、`package.json`、`scripts/verify`、`.github/workflows/ci.yml` の最新状態を再確認する。
- [ ] 使用Codex CLI versionを記録し、そのversionに対応するHook schemaを確認する。
- [ ] #144以降にHook contractへ追加変更がないか確認する。

判断:

- Issue本文より現在実装を優先する。
- 既に成立しているcontractを別test directoryへ複製しない。

### Task 2: 既存Hook契約テストの不足分だけを埋める

- [ ] 現行 `codex-hook-contract.test.ts` とIssue #134のチェック項目を対応付ける。
- [ ] 既にあるstdin / stdout / stderr / exit / cwd / side effect / Windows・Unix launcher caseは重複追加しない。
- [ ] 未確認の入力サイズ境界をprocess経由で追加する。
- [ ] `pre_tool_use_policy.mjs` は現行matcher契約どおり、`apply_patch` が `PreToolUse/Bash` policy対象外であることを固定する。Issue本文の例だけを理由にmatcherへ追加しない。
- [ ] `log_event.mjs` は大きなpayloadでも保存fieldの上限・redaction・JSONL parseabilityが維持されることを確認する。
- [ ] 既存Hook sourceの挙動変更が必要だと判明した場合は、contract test追加と挙動変更を同一判断にせず、原因・影響を分けて扱う。

### Task 3: `.codex/config.toml` を構造として検証する

現在のtestはHook blockを文字列で抽出する箇所がある。Issue #134の設定契約では、少なくとも次を構造として検証する。

- [ ] event名
- [ ] matcher
- [ ] command
- [ ] Windows command
- [ ] timeout
- [ ] `SessionStart` のcompact限定matcher/条件
- [ ] `additionalContextLimit` を使う場合の値

方針:

- TOML全仕様を自作しない。
- 実装時点で利用可能なdirect parserが無ければ、小さなtest-only parser dependencyと、限定的な既存helper継続のどちらが安全か比較する。
- parser追加の方が明確に安全な場合だけdevDependencyを追加する。
- command文字列が指すscript pathは、parse後に実在確認する。
- Windows / Unix commandは、文字列存在確認だけでなく既存configured launcher contract testで実行可能性も維持する。

### Task 4: #135完了ゲート

- [ ] #135がmerge済みであることを確認する。
- [ ] #135後のroot `AGENTS.md` が、常駐指示として全文再注入する設計になっていることを確認する。
- [ ] このbranchへ最新 `main` を安全に取り込む。
- [ ] root `AGENTS.md` の実サイズを測る。
- [ ] #134側で `AGENTS.md` のmarker分類やコピーを追加しない。

#135未完了ならTask 5へ進まない。

### Task 5: compact時のroot `AGENTS.md` 再注入を実装する

想定経路:

```text
Codex compact
  -> SessionStart(source=compact)
  -> .codex/hooks/session_start_context.mjs
  -> repository rootを解決
  -> root AGENTS.mdをUTF-8で読む
  -> structured JSON
     hookSpecificOutput.hookEventName = "SessionStart"
     hookSpecificOutput.additionalContext = <AGENTS.md全文>
```

- [ ] compact以外のsourceではcontextを追加しない。
- [ ] cwdがrepository root直下でなくてもroot `AGENTS.md` を解決できるようにする。
- [ ] `AGENTS.md` を別ファイルへコピーしない。
- [ ] root解決、UTF-8読込、JSON serializeだけで閉じる。独自compact state managerは作らない。
- [ ] `additionalContextLimit` は実Codex versionの契約を確認したうえで明示する。
- [ ] 通常サイズでは全文が `additionalContext` として直接扱われることをtestする。
- [ ] 閾値超過時のCodex側挙動は、versionに対応する正式仕様とfocused runtime確認で固定する。

エラー契約:

- malformed Hook input: process contract違反として非0終了 + stderr。誤ったcontextは返さない。
- `source != compact`: 正常終了、追加contextなし。
- repository root / `AGENTS.md` 欠落 / read失敗: compact後の必須指示を欠落させるため、単なる成功として黙殺しない。実Codex versionで `continue=false` がSessionStartに有効か確認し、有効なら明示的停止を第一候補とする。利用中versionで安全に停止できない場合は非0終了 + stderrとし、そのruntime挙動を契約テスト・focused runで確認してから採用する。

このfail-close方法はCodex version依存なので、schema確認前に固定実装しない。

### Task 6: 決定論的な文章品質lintをCLIとして先に成立させる

Hookへ接続する前に、共通scannerを単体で動かせる状態にする。

- [ ] `scripts/lint-text-quality.mjs` 等へ、Node.js標準機能だけで実装する。
- [ ] production ruleは `.codex/text-quality-rules.json` 等の1か所を正本にする。
- [ ] Markdown parserは追加せず、ruleが必要とする最小限の行単位判定から始める。
- [ ] fenced code block、inline code、URL、技術識別子等を除外する必要があるruleは、誤検知しないことをfixtureで固定できる場合だけ追加する。
- [ ] markdownlintが見る見出し、空行、list、code fence構造を再実装しない。
- [ ] broad dictionary、AI judge、形態素解析を追加しない。

rule出力は少なくとも次を持つ。

```text
path
line
rule_id
message
replacement   # 明示置換があるruleのみ
```

秘密情報や行全体を診断へ不要に出さない。matched textを出す必要がある場合も短く制限する。

### Task 7: 作業開始baselineを最小状態で保持する

同じファイルにユーザー既存変更とCodex変更が共存する要件を満たすには、`HEAD` との差分だけでは不十分である。開始前から未commitの変更がある場合、その違反まで今回の変更として扱ってしまうためである。

過剰なsession managerは作らず、文章lint専用の最小baseline manifestだけを使う。

#### baseline作成

`UserPromptSubmit` に文章品質Hookを追加し、task開始時に次だけを保存する。

- 開始時 `HEAD` SHA
- repository rootを識別するhash
- session idを安全に識別する値
- 開始時点でdirty / untrackedだった対象Markdown path
- そのpathのcontent SHA-256
- そのpathに存在した文章lint violationのfingerprintと件数

source本文そのもの、token、secret、Hook raw payloadは保存しない。

baselineはrepository tracked fileにしない。OS temp directory等、Repositoryを汚さず同じsessionのHook processから再参照できる場所を使用する。

#### baseline lifecycle

- baselineが無ければ、最初の通常 `UserPromptSubmit` で1回作る。
- Stopがblockして自動継続している間は上書きしない。
- quality gateを通過してStopを許可する時点でbaselineを削除する。
- 次のユーザーtaskでは新しいbaselineを作る。
- retry count等をbaselineへ持たせない。Stop再入は `stop_hook_active` を使う。

#### staged / unstaged / untracked

- 開始時 `HEAD` SHAを固定し、tracked fileはそのcommitを比較基準にする。
- stagedとunstagedを別の品質基準に分けず、開始時状態から現在worktreeまでの合成差分として扱う。
- 開始時にdirtyだったtracked fileは、baseline manifestの違反集合を比較基準にする。
- 開始時に存在したuntracked fileもbaseline manifestへ記録し、元からあった違反を新規扱いしない。
- task開始後に作られたuntracked Markdownはbaseline空として扱う。
- deleteはlint対象外。renameは開始時pathとの対応をGit差分から解決し、同じ内容の移動だけで既存違反を新規扱いしない。

新規違反は、baseline側と現在側の `rule_id + normalized match fingerprint` のmultiset差分として判定する。行番号だけをidentityに使わず、既存違反の行移動だけで新規判定しない。

### Task 8: PostToolUseへ即時フィードバックを接続する

- [ ] `PostToolUse` で現在の変更対象Markdownだけを列挙する。
- [ ] Repository全体はscanしない。
- [ ] baselineから増えた違反だけをblock理由に含める。
- [ ] tool実行済みの副作用をrollbackできるとは扱わない。
- [ ] tool payloadから対象pathを安全に限定できる場合はそのpathを優先し、不明なBash等ではGit差分から対象Markdownを絞る。
- [ ] Hook内部エラーでは、実行済みtool結果を壊さないようfail-open + stderr診断とする。
- [ ] lint違反時はstructured `decision=block` / `reason` の現行Codex contractを使い、短い修正情報だけ返す。

PostToolUseの役割は早期フィードバックであり、完了判定ではない。

### Task 9: Stopへ完了前品質ゲートを接続する

- [ ] baselineから増えた文章lint違反を再評価する。
- [ ] `stop_hook_active=false` かつ修正可能な新規違反あり: `decision=block` で1回だけ修正を促す。
- [ ] `stop_hook_active=true`: 同じ違反が残っていても再blockしない。未解決内容を短い診断として返せる契約だけを使う。
- [ ] retry counter、独自loop stateを追加しない。
- [ ] lint違反とHook内部エラーでmessageを分ける。

Hook内部エラーの扱い:

- `stop_hook_active=false`: quality checkが実行不能だったことを1回だけblock理由として返す案を第一候補とし、正式Stop contractで成立するか確認する。
- `stop_hook_active=true`: Hook故障だけでloopを継続しない。stderr/診断を残して停止を許可する。
- CI側のdeterministic lintを別経路として必ず残す。

### Task 10: local verify / `scripts/verify` / CIへ接続する

#### `pnpm run verify`

- [ ] `lint:text` 等の専用scriptを追加する。
- [ ] `pnpm run verify` のmarkdownlint近傍で実行する。
- [ ] Hook contractは既存 `test:contracts` に残し、重複した `test:codex-hooks` suiteを原則追加しない。

#### `scripts/verify`

`scripts/verify` は現在、consumer-facing template contractも担うため、無条件に重いproject-wide testを追加すると既存用途を壊す可能性がある。

- [ ] 現在の呼出元とconsumer契約を実装時に確認する。
- [ ] Issue要件を満たすfocused Hook contract実行を追加する。
- [ ] `tests/contracts/codex-hook-contract.test.ts` だけを実行できる既存Vitest経路を優先し、全test/buildを `scripts/verify` へ重複追加しない。
- [ ] consumer環境でpnpm/Vitestを前提にできない既存契約が確認された場合は、その経路を壊さず、source-repo modeでfocused contractを実行する既存optionへ接続する。新しい独自verify frameworkは作らない。

#### GitHub Actions

- [ ] Hook contractは既存 `Vitest (contracts)` で継続実行する。
- [ ] 文章lintは `Style Quality` へ追加する。
- [ ] PRではmerge base / base branchとの差分から新規違反だけを判定する。
- [ ] pushでは `github.event.before` を使い、zero SHA等は既存CI patternに合わせてfallbackする。
- [ ] Windows固有runtime testを新jobへ増やすのは、static config contract + Windowsローカル契約では検出できない回帰が実際に残る場合だけとする。

### Task 11: 文書を更新する

- [ ] `docs/reference/codex-safety-harness.md` に、新しいSessionStart / text quality gateの責務、fail-open / fail-close、軽量性を反映する。
- [ ] `docs/reference/codex-implementation-harness.md` に重複説明が必要か確認し、必要箇所だけ更新する。
- [ ] `AGENTS.md` へHook詳細を再掲しない。#135後のroot文書を再び肥大化させない。
- [ ] rule tableの正本pathと、markdownlintとの責務分離を文書化する。

## 6. 検証方法

### 6.1 focused contract

最低限、次を個別に実行する。

```bash
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

文章lint testを分離した場合:

```bash
pnpm exec vitest run tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1
```

### 6.2 SessionStart contract

確認するcase:

- `source=compact` + root `AGENTS.md` 読込成功
- `startup` / `resume` / `clear` / `fork` では追加contextなし
- nested cwd
- malformed JSON
- repository root解決失敗
- `AGENTS.md` 欠落
- read failure
- UTF-8本文
- JSON escaping
- `AGENTS.md` 実サイズ
- `additionalContextLimit` 境界
- configured commandのUnix経路
- configured commandのWindows経路

### 6.3 文章lint contract

確認するcase:

- 明示ruleのpositive / negative
- code block / inline code / URL / identifierの除外をruleが要求する場合の誤検知防止
- replacement付きrule
- 同一違反複数件のmultiset差分
- 既存違反の行移動
- 開始時clean tracked file
- 開始時dirty tracked file
- staged + unstaged混在
- 開始時untracked
- task中に新規作成したuntracked
- rename
- delete
- baseline file欠落 / 破損
- repository root外cwd
- pathに空白・日本語を含むcase

### 6.4 PostToolUse contract

- 新規違反なし -> allow
- 今回増えた違反あり -> block reason
- 既存違反のみ -> allow
- 同一fileに既存違反 + 新規違反 -> 新規分だけ返す
- Bash等でtarget pathをpayloadから特定できない -> Git差分でMarkdownだけ評価
- scanner failure -> fail-open + stderr
- 既存ファイルを勝手に修正しない

### 6.5 Stop contract

- `stop_hook_active=false` + 新規違反なし -> allow
- `stop_hook_active=false` + 新規違反あり -> 1回block
- `stop_hook_active=true` + 同一違反あり -> 再blockしない
- Hook内部エラーとlint違反を区別する
- allow時にbaseline cleanup
- block時にbaseline維持

### 6.6 Repository検証

変更内容に応じて少なくとも次を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
bash scripts/verify
pnpm run verify
git diff --check
```

`pnpm run verify` が上記の一部を包含していても、focused failureの原因切り分け用に個別実行結果を先に持つ。

### 6.7 platform確認

Windows:

- current repositoryの `command_windows` を実際に通すfocused Hook contract
- nested cwd
- pathに空白・日本語
- baseline temp path

Ubuntu/Linux:

- GitHub Actions `Vitest (contracts)`
- `Style Quality`
- Web CIの既存必須job

新しいWindows CI jobは事前に必須化しない。既存の検出穴が残ると確認できた場合だけ追加する。

## 7. リスクと未解決論点

### 7.1 #135未完了

compact再注入だけは実装を開始できない。#135を待たずに仮の `AGENTS.md` 抽出方式を作ると、後で削除する二重管理になるため行わない。

### 7.2 Issue本文と現在実装の差

Hook process契約の多くは既に実装済みである。Issue本文の想定file構成へ合わせるためだけのtest移動・分割はしない。

### 7.3 Codex version差

OpenAI CodexのHook schemaは変更され得る。特にconfig field名、matcher、`additionalContextLimit`、block outputはローカルversionと正式sourceを一致させてから実装する。

### 7.4 baseline状態管理

「ユーザー既存変更とCodex変更を同一file内で分離する」要件は、完全なstateless処理では満たしにくい。開始時の最小baseline manifestはこの要件のために限定して許容する。

ただしbaselineへ次を持たせない。

- retry回数
- workflow state machine
- file本文copy
- raw Hook payload
- secret / credential
- Agent実行履歴

### 7.5 `scripts/verify` の既存責務

現在の `scripts/verify` は単なるapplication test runnerではない。Hook contractを入れる際、consumer-facing用途を壊さないことを優先する。Issue要件を理由に全Vitest / buildを重複実行しない。

### 7.6 文章ruleの未定義部分

rule categoryだけから具体的禁止語を推測すると、誤検知と大量修正を招く。production block ruleは明文化された値だけに限定する。

## 8. 成果物

実装完了時の想定成果物:

- 既存Hook contractの不足分テスト
- compact限定 `SessionStart` Hook
- 決定論的文章lint CLI / shared scanner
- 最小baseline管理とPostToolUse / Stop adapter
- Hook config契約テスト
- `pnpm run verify` / `scripts/verify` / GitHub Actions接続
- 必要なHarness reference更新

このPlan自体の保存先:

`docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`

## 9. 備考

- Plan作成時の `main` HEADは `3c5e35ed42712574eb9d89051820c9e27f137a16`。
- PR #144 (`test: Windows Codex Hook contract timeoutを解消`) は既に `main` へ入っているため、その修正を前提とする。
- Issue #135はPlan作成時点でopen。compact再注入は #135 merge確認後に開始する。
- Planレビューで新しい事実が見つかった場合は、Issue本文へ機械的に合わせるのではなく、現在のsource / test / CIを正としてPlanを更新する。
