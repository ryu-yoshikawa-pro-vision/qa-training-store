# Codex Hook契約・compact再注入・文章品質ゲート 実装計画

## 0. 依頼概要

- 対象Issue: #134 `test: Codex Hook契約テストとcompact後の指示再注入・文章品質ゲートを整備する`
- 実装branch: `issue-134-codex-hook-quality-gates`
- Plan作成時base: `main` / `3c5e35ed42712574eb9d89051820c9e27f137a16`
- 依存Issue: #135 `refactor: AGENTS.mdをスリム化し常駐指示と詳細運用仕様を分離する`
- #135 Plan branch: `issue-135-agents-context-slimming`
- このPlanでは実装しない。実装、PR作成・更新は別タスクで行う。

Issue #134の目的は、既存Codex Harnessを拡張し、次を満たすことである。

1. Hookの契約をprocess境界で検証する。
2. compact後に、#135でスリム化されたroot `AGENTS.md` を再注入する。
3. Markdown文章へ決定論的な品質ルールを適用し、HookとCIの両方で検証する。
4. 作業開始前から存在する違反と、今回のCodex作業で増えた違反を分離する。

新しいAgent Runtime、独自Workflow Engine、AIによる文章評価基盤は作らない。既存の `.codex/**`、Node.js、Vitest、`scripts/verify`、`scripts/verify.ps1`、`pnpm run verify`、GitHub Actionsを再利用する。

## 1. ゴール / 完了条件

### ゴール

既存Hookの挙動を壊さず、compact後の指示再注入と文章品質ゲートを、軽量・決定論的・クロスプラットフォームなHookとして追加する。

### 完了条件

- 既存 `pre_tool_use_policy.mjs` と `log_event.mjs` の主要契約が、子processを通すテストで固定されている。
- `.codex/config.toml` のHookイベント、matcher、command、Windows / Unix経路を構造として検証できる。
- #135が完了し、スリム化済みroot `AGENTS.md` が正本として確定してからcompact再注入を実装している。
- `SessionStart` の `source=compact` だけでroot `AGENTS.md` 全文を `hookSpecificOutput.additionalContext` として返す。
- compact以外の `SessionStart` では再注入しない。
- root `AGENTS.md` の内容をHook専用ファイルへ複製しない。
- `SessionStart` で再注入を保証できないエラーは、使用Codex versionで実際に停止できる契約を使ってfail-closeする。
- `additionalContextLimit` を使用する場合、対象Codex versionの正式仕様と実測に基づく明示値を設定し、root `AGENTS.md` の扱いを契約テストで確認する。
- 文章品質lintは決定論的な明示ルールだけを扱い、markdownlintの責務を重複実装しない。
- productionでblockする文章品質ruleは、実装前に具体値を表で確定し、実装者が独自に推測追加しない。
- PostToolUseではRepository全体を毎回scanせず、作業開始baselineとの差分で今回増えた違反だけを即時フィードバック対象にする。
- Stopでは同じ新規違反を完了前に確認し、`stop_hook_active=false` のときだけ1回blockできる。
- `stop_hook_active=true` では同一違反を繰り返しblockしない。
- baseline取得不能とHook内部エラーをlint違反と区別し、後から現在worktreeをbaselineとして再作成しない。
- baselineへ保存する違反fingerprintに、本文断片や正規化済みmatchを平文保存しない。
- 開始時cleanだったtracked Markdownは、保存済み開始時 `HEAD` SHAのblobから必要時にbaseline違反を算出する。
- 開始時untrackedだったMarkdownのpure moveは、移動先がuntrackedでもstaged addでも、開始時 `HEAD` に存在しない現在pathを候補としてcontent SHA-256の一意一致で対応付ける。
- `pnpm run lint:text` / `pnpm run verify` は `HEAD -> current worktree` を比較し、staged / unstaged / untracked Markdownを対象にする。
- CIではイベントごとの比較元を明示し、`schedule` / `workflow_dispatch` は既存CI patternに合わせて `HEAD^` を比較元にする。
- `pnpm run verify`、`scripts/verify` / `scripts/verify.ps1` のHook contract用明示opt-in経路、GitHub Actionsのいずれでも必要な検証が抜けない。
- 既存 `--strict-harness` / `-StrictHarness` のsource repository検証用途を変更しない。
- GitHub ActionsでUbuntuの既存 `Vitest (contracts)` とWindowsのfocused Hook contractを実行する。
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

PR #144もmerge済みであり、Windows上の既存Hook contract timeout対策が `main` に入っている。

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

GitHub Actions `Web CI` のVitest matrixにも `contracts` が含まれているため、`tests/contracts/**` に追加するHook契約テストはUbuntuの既存CI経路へ入る。

一方、現行 `Vitest (contracts)` はUbuntuであり、Windows Hook launcherを実行するCI経路はない。#134では新しいWindows command、temp path、UTF-8、cwd解決まで扱うため、WindowsではHook contractに限定したfocused実行を追加する。

`scripts/verify` と `scripts/verify.ps1` はconsumer-facing template contractを持つ。通常モードへ全Vitestやbuildを追加しない。

既存の `--strict-harness` / `-StrictHarness` はHook contract用の「重い検証モード」ではない。qa-training-storeの親directoryをsource repositoryとして扱い、親側の `README.md`、`CHANGELOG.md`、`tools/validate-spec.*`、integration test、`validate-template.yml` 等を確認するsource repository maintainer向け契約である。この意味を#134で変更しない。

Issue #134で `scripts/verify` 経由のfocused Hook contract実行を成立させるため、通常モードを重くする代わりに、Bash / PowerShell双方へHook contract専用の薄いopt-inを追加する方針とする。

想定する入口:

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

実装開始時に同等の既存optionが追加済みならそれを再利用し、重複optionを作らない。

### 2.3 現在のHook設定

`.codex/config.toml` には現在、少なくとも次がある。

- `PreToolUse`
- `UserPromptSubmit`
- `PostToolUse`
- `SubagentStart`
- `SubagentStop`
- `Stop`

`SessionStart` は未登録である。

Windowsは `command_windows` を使う別command経路があり、Unix側と同一文字列ではない。新規Hookでも必要なWindows / Unix commandを契約テストする。

既存 `PreToolUse` はBash matcherであり、`apply_patch` は現行policy対象外である。Issue本文の例だけを理由に既存 `PreToolUse` matcherへ追加しない。

### 2.4 #135との依存関係

Plan更新時点でIssue #135はopenである。

compact再注入は #135完了後まで実装しない。#134 branchを #135 branchへ直接依存させず、#135が `main` へ入った後に、このbranchへ最新 `main` をRepositoryのGit安全規約に従って取り込んでから再注入実装へ進む。

#135後のroot `AGENTS.md` を唯一の正本とする。#134側でcompact専用コピー、`COMPACTION_CRITICAL_START/END` のようなmarker領域、二重管理を追加しない。

Hook契約の不足分確認、文章lint scanner、baseline方式のテスト設計は #135前でも進められる。

### 2.5 Codex Hook正式仕様

2026-09-12にOpenAIのCodex sourceを確認した時点では、少なくとも次が存在する。

- `SessionStart` inputの `source` に `compact`
- `SessionStart` outputの `hookSpecificOutput.additionalContext`
- universal outputの `continue` / `stopReason`
- `Stop` inputの `stop_hook_active`
- command Hook設定の `additionalContextLimit`

参照:

- https://github.com/openai/codex/blob/main/codex-rs/hooks/src/schema.rs
- https://github.com/openai/codex/blob/main/codex-rs/hooks/src/events/session_start.rs
- https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json

現行OpenAI sourceの `SessionStart` では、exit code 0のstructured outputで `continue:false` を返した場合に `should_stop=true` となる。一方、非0終了はHook statusが `Failed` になるだけで `should_stop` はfalseのままである。

そのため、非0終了を「compactを止める手段」として前提にしない。実装時に使用Codex CLI versionを確認し、そのversionでも同じ契約なら、再注入を保証できないエラーはexit code 0のstructured outputで `continue:false` と `stopReason` を返して停止させる。

Codex Hook仕様はversion依存である。OpenAI repositoryの最新 `main` を使用versionへ無条件に適用しない。

`additionalContextLimit` は現在確認した正式sourceでは `additionalContext` のspill閾値として扱われる。単純なstdout文字数上限として扱わない。実装時のversionで同じ契約か確認し、#135後のroot `AGENTS.md` の実サイズを使って境界を確認する。

### 2.6 既存の差分取得パターン

Repositoryには `scripts/spec/summarize-impact.ts` があり、差分取得で次を既に行っている。

- ローカルworking treeではbase refとworktreeを比較し、`git ls-files --others --exclude-standard` でuntrackedを追加する。
- PRでは `origin/<base branch>` を比較元にする。
- pushでは有効な `github.event.before` を比較元にする。
- 比較元を確定できないイベントでは `HEAD^` へフォールバックする。

`.github/workflows/ci.yml` の既存処理にも、PR以外で `github.event.before` が空またはzero SHAなら `HEAD^` を使うpatternがある。

文章品質gateはこの既存patternを再利用し、新しいGit差分frameworkを作らない。

### 2.7 前提

- Node.js標準機能で実装できるHook処理へ、新しいruntime依存を追加しない。
- baseline fingerprintのdigestにはNode.js標準 `crypto` を使用し、新しい依存を追加しない。
- TOMLを意味的にparseするための既存direct dependencyが実装時点でも無い場合、手書きTOML parserを増やすより、test専用の小さなmaintained parser導入を比較する。依存を追加する場合はlicense、保守状況、lockfile影響を確認する。
- 文章品質lintの対象は初期実装ではMarkdown (`*.md`) に限定する。Issueの目的だけを理由に `.txt`、CSV、source comment等へ対象を広げない。
- 意味評価、自然さ、論理構成、未知の造語検出はblock条件にしない。
- `scripts/verify` / `scripts/verify.ps1` の通常モードへ、project-wide Vitestやbuildを追加しない。
- `--strict-harness` / `-StrictHarness` の既存source repository契約を変更しない。

## 3. 実装前に確定する事項

### 3.1 必須確認

1. #135が `main` へmerge済みか。
2. #135後のroot `AGENTS.md` のbyte数・概算token数。
3. 実際に使用するCodex CLI versionと、Hook config field名・matcher・output schema。
4. productionでblockする文章品質rule表。

### 3.2 production文章品質rule表

Issue #134は「禁止語」「表記揺れ」「定義済み置換」「全角/半角」「allowlist付き英語混在」を候補として示しているが、具体的な禁止語や置換表までは定義していない。

Task 6へ入る前に、採用するproduction ruleごとに次を確定する。

| 項目 | 内容 |
| --- | --- |
| `rule_id` | 安定した識別子 |
| 対象 | 対象Markdown |
| 検出条件 | literalまたはregex |
| 除外条件 | 必要な場合のみ |
| `replacement` | 明示置換がある場合のみ |
| allowlist | 必要な場合のみ |
| 大文字小文字 | 区別するか |
| fenced code block | 対象か |
| inline code | 対象か |
| URL | 対象か |
| identifier | 対象か |
| match正規化 | fingerprint比較で必要な場合のみ明示 |

次の順で具体値を確定する。

1. Repository内で既に明文化されている表記規約を確認する。
2. Issue #134または関連Issueで明示されたruleを採用する。
3. それでも具体値が無いrule categoryはproduction block ruleへ追加しない。

実装者が独自判断で禁止語、置換、allowlist、英語検出条件を作らない。

次はblock条件へ含めない。

- 文脈依存の自然さ
- 読みやすさや論理性の主観評価
- 冗長さの意味評価
- AI生成文らしさ
- 未知の造語の完全検出
- AI Judge
- broad dictionaryや形態素解析

### 3.3 実装時に確認すればよい事項

次はPlanで具体値を固定せず、実装時のRepository状態とCodex versionに基づいて決める。

- 使用versionの `SessionStart` 停止契約。現在確認したsourceと同じなら `continue:false` + `stopReason` を使用する。
- `additionalContextLimit` の具体値。
- TOML parserの具体package。手書きparserは作らない。
- PostToolUseで利用できる実際のtool matcher alias。
- `scripts/verify` / `scripts/verify.ps1` に同等のHook contract用optionが追加済みか。

## 4. 影響範囲

### 4.1 変更候補

```text
.codex/config.toml
.codex/hooks/session_start_context.mjs           # 新規候補
.codex/hooks/text_quality_gate.mjs               # 新規候補: UserPromptSubmit/PostToolUse/Stop adapter
.codex/text-quality-rules.json                   # 新規候補: 明示済み決定論ruleだけ
scripts/lint-text-quality.mjs                    # 新規候補: Gitを知らない共通scanner/CLI
scripts/check-text-quality-changes.mjs            # 新規候補: Git比較とscanner呼出しだけを担う薄いgate
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts       # 分離した方が読みやすい場合のみ新規
package.json
.github/workflows/ci.yml
docs/reference/codex-safety-harness.md
docs/reference/codex-implementation-harness.md  # 関連箇所がある場合だけ
```

候補ファイルをすべて作ることを目的にしない。既存ファイルへ自然に追加できる場合は新規ファイルを増やさない。

`check-text-quality-changes.mjs` は新しいframeworkではなく、既存Git commandで比較対象を列挙し `lint-text-quality.mjs` のscannerを再利用する薄い入口に限定する。

### 4.2 原則変更しない範囲

- Product code
- Playwright / application test
- Agent Skill本体
- subagent orchestration
- `pre_tool_use_policy.mjs` のpolicy意味
- `log_event.mjs` のlogging意味
- #135が所有するAGENTS分割方針
- 既存Markdown全件の一括修正
- 新しいHook test framework
- 独自session manager
- 独自diff engine
- rename類似度engine
- patch parser
- `--strict-harness` / `-StrictHarness` の既存責務

## 5. 変更方針

### Task 1: 実装開始時の状態を固定する

- [ ] `main`、branch HEAD、merge base、working treeを確認する。
- [ ] #135のstateとmerge有無を確認する。
- [ ] `tests/contracts/codex-hook-contract.test.ts`、`.codex/config.toml`、Hook scripts、`package.json`、`scripts/verify`、`scripts/verify.ps1`、`.github/workflows/ci.yml` の最新状態を確認する。
- [ ] `scripts/spec/summarize-impact.ts` 等の既存差分取得patternに変更がないか確認する。
- [ ] 使用Codex CLI versionを記録し、そのversionに対応するHook schemaを確認する。
- [ ] #144以降にHook contractへ追加変更がないか確認する。

判断:

- Issue本文より現在実装を優先する。
- 既に成立しているcontractを別test directoryへ複製しない。

### Task 2: 既存Hook契約テストの不足分だけを埋める

- [ ] 現行 `codex-hook-contract.test.ts` とIssue #134のチェック項目を対応付ける。
- [ ] 既存のstdin / stdout / stderr / exit / cwd / side effect / Windows・Unix launcher caseは重複追加しない。
- [ ] 未確認の入力サイズ境界をprocess経由で追加する。
- [ ] `pre_tool_use_policy.mjs` は現行matcher契約どおり、`apply_patch` が `PreToolUse/Bash` policy対象外であることを固定する。Issue本文の例だけを理由にmatcherへ追加しない。
- [ ] `log_event.mjs` は大きなpayloadでも保存fieldの上限・redaction・JSONL parseabilityが維持されることを確認する。
- [ ] 既存Hook sourceの挙動変更が必要だと判明した場合は、contract追加とproduction挙動変更を分けて判断する。

### Task 3: `.codex/config.toml` を構造として検証する

少なくとも次を構造として検証する。

- [ ] event名
- [ ] matcher
- [ ] command
- [ ] `command_windows`
- [ ] timeout
- [ ] `SessionStart` のcompact限定条件
- [ ] `additionalContextLimit` を使う場合の値

方針:

- TOML全仕様を自作しない。
- 実装時点で利用可能なdirect parserが無ければ、小さなtest-only parser dependencyと限定的な既存helper継続を比較する。
- parser追加の方が安全な場合だけdevDependencyを追加する。
- command文字列が指すscript pathはparse後に実在確認する。
- Windows / Unix commandは文字列存在だけでなくconfigured launcher contractで実行可能性も確認する。

### Task 4: #135完了ゲート

- [ ] #135がmerge済みであることを確認する。
- [ ] #135後のroot `AGENTS.md` が常駐指示として全文再注入する設計になっていることを確認する。
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
- [ ] 通常サイズと境界値で `additionalContext` のruntime挙動を確認する。

#### SessionStartの成功契約

- `source=compact`: 正常終了し、structured JSONでroot `AGENTS.md` 全文を `hookSpecificOutput.additionalContext` に返す。
- `source != compact`: 正常終了し、追加contextなし。

#### 再注入を保証できないエラー

次は同じfail-close方針で扱う。

- malformed Hook input
- repository root解決失敗
- root `AGENTS.md` 欠落
- root `AGENTS.md` read失敗
- structured output生成失敗

これらを単に非0終了させて「停止した」とみなさない。

実装時のCodex versionで `SessionStart` の停止契約を確認する。現在確認したOpenAI sourceと同じ契約なら、exit code 0のstructured outputとして次を返す。

```json
{
  "continue": false,
  "stopReason": "compact後の必須指示を再注入できなかった理由"
}
```

- 誤った `additionalContext` は返さない。
- `stopReason` へraw input、秘密情報、長いpath情報を含めない。
- 非0終了を停止手段として採用するのは、使用versionの実runtimeで `should_stop=true` 相当になることを確認できた場合だけとする。
- process単体testだけでなく、使用versionのfocused runtime確認で「Hook failed」ではなくcompact継続が止まることを確認する。

### Task 6: 決定論的な文章品質scannerを先に成立させる

Task 6へ入る前に「3.2 production文章品質rule表」を確定する。具体値がないrule categoryを実装者判断でproduction block ruleへ追加しない。

- [ ] `scripts/lint-text-quality.mjs` 等へscanner/CLIを実装する。
- [ ] production ruleは `.codex/text-quality-rules.json` 等の1か所を正本にする。
- [ ] scannerは指定されたMarkdown fileまたは明示された本文を決定論的にscanする責務に限定する。
- [ ] session baseline、Git、GitHub Actions固有の比較基準をscanner本体へ埋め込まない。
- [ ] Markdown parserは追加せず、採用ruleで必要な最小限の判定から始める。
- [ ] fenced code block、inline code、URL、identifier等の除外はrule表に明記された場合だけ実装する。
- [ ] markdownlintが見る見出し、空行、list、code fence構造を再実装しない。
- [ ] broad dictionary、AI Judge、形態素解析を追加しない。

rule出力は少なくとも次を持つ。

```text
path
line
rule_id
message
replacement   # 明示置換があるruleのみ
```

秘密情報や行全体を診断へ不要に出さない。raw matchは原則として診断へ出さない。既存の `path`、`line`、`rule_id`、`message`、`replacement` で修正可能な情報を返す。

### Task 7: 作業開始baselineを最小状態で保持する

同じファイルにユーザー既存変更とCodex変更が共存する要件を満たすには、`HEAD` との差分だけでは不十分である。文章lint専用の最小baseline manifestだけを使う。

#### baseline作成

`UserPromptSubmit` に文章品質Hookを追加し、task開始時に次だけを保存する。

- 開始時 `HEAD` SHA
- repository rootを識別するhash
- sessionを安全に識別する値
- 開始時点でdirty / untrackedだった対象Markdown path
- そのpathのcontent SHA-256
- そのpathに存在した文章lint violationのfingerprint digestと件数

開始時cleanなtracked Markdownは全件scan・保存しない。必要になったfileだけ、保存済み開始時 `HEAD` SHAのblobからbaselineを算出する。

source本文、token、secret、Hook raw payload、正規化済みmatchそのものは保存しない。

baselineはtracked fileにせず、OS temp directory等、Repositoryを汚さず同じsessionのHook processから再参照できる場所を使用する。

#### baselineの取得元

現在のMarkdown pathを評価するとき、開始時状態は次で取得する。

| 開始時状態 | baselineの取得元 |
| --- | --- |
| clean tracked | 保存済み開始時 `HEAD` SHAのblobを必要時に読み、scannerで違反multisetを算出する |
| dirty tracked | UserPromptSubmit時にmanifestへ保存した開始時worktreeの違反multisetを使う |
| untracked | UserPromptSubmit時にmanifestへ保存した違反multisetを使う |
| task開始後の新規file | baseline空 |

重要:

- clean trackedの基準に「現在の `HEAD`」を使わない。session途中でcommitされても比較基準を変えないため、必ずmanifestへ保存した開始時 `HEAD` SHAを使う。
- tracked renameでは開始時pathを解決し、保存済み開始時 `HEAD` SHAのそのpathのblobを読む。
- blob本文はbaseline manifestへ保存しない。必要時にscanしてdigest multisetだけを比較に使う。
- 保存済み開始時 `HEAD` SHAのblobを取得できない場合は、baselineを空と推測せずquality check不能として既存の障害時契約へ流す。
- Repository全MarkdownをUserPromptSubmit時にscanしない。

#### 違反identityと保存形式

論理上のidentityは次とする。

```text
rule_id + rule定義に従って正規化したmatch
```

ただし、baselineへ正規化済みmatchを平文保存しない。

保存形式は次とする。

```text
rule_id + SHA-256(normalized_match) + count
```

- SHA-256はNode.js標準 `crypto` で計算する。
- 行番号はidentityへ含めない。
- `message`、`replacement` はidentityへ含めない。
- 大文字小文字、whitespace、Unicode等の正規化はrule表で明示された場合だけ行う。
- 実装者が独自の正規化を追加しない。
- 同一fingerprintが同一fileに複数存在できるため、setではなくmultisetとして件数を保持する。
- digestは秘密情報を平文保存しないための保存形式であり、raw matchを復元する用途には使わない。

新規違反数は同一file / fingerprint digestについて次で定義する。

```text
max(current_count - baseline_count, 0)
```

例:

```text
baseline: rule-X / digest-A = 2
current : rule-X / digest-A = 3
-> 新規違反 1件
```

既存違反を1件削除し、同じfingerprintを別位置へ1件追加して件数が同じ場合は新規違反扱いしない。位置単位の由来追跡や独自diff engineは作らない。

#### staged / unstaged / untracked / rename

- 開始時 `HEAD` SHAを固定する。
- stagedとunstagedを別の品質基準に分けず、開始時状態から現在worktreeまでの合成差分として扱う。
- 開始時にdirtyだったtracked fileはbaseline manifestの違反multisetを比較基準にする。
- 開始時に存在したuntracked Markdownもbaseline manifestへ記録する。
- task開始後に作られたfileはbaseline空として扱う。
- deleteはlint対象外とする。
- tracked renameはGitのrename情報から開始時pathへ対応付ける。

開始時からuntrackedだったMarkdownはGitのtracked rename情報を持たないため、pure moveだけ次の方法で対応付ける。

1. baseline時に記録したuntracked pathが現在worktreeから消えていることを確認する。
2. 「開始時 `HEAD` に存在せず、現在worktreeに存在するMarkdown path」を移動先候補として列挙する。
3. 候補には少なくとも現在untrackedのMarkdownとstaged addされたMarkdownを含める。
4. baselineで保存したcontent SHA-256と現在候補のcontent SHA-256を比較する。
5. 同一content SHA-256の候補が一意に1件だけならpure moveとして同じfileに対応付ける。
6. 同一hash候補が複数ある、または内容変更を伴って一意に判断できない場合は推測してrename扱いしない。

移動先候補を「現在untracked」に限定しない。開始時untrackedだったfileを移動して `git add` した場合も、開始時 `HEAD` に存在しない現在pathとして候補へ含める。

独自rename推定engineや類似度比較は追加しない。

#### baseline lifecycle

- baselineが無ければ、最初の通常 `UserPromptSubmit` で1回作る。
- Stopがblockして自動継続している間は上書きしない。
- Stopを通常allowする時点でbaselineを削除する。
- `stop_hook_active=true` でallowする場合もbaselineを削除する。
- block時はbaselineを保持する。
- 次の通常 `UserPromptSubmit` ではbaselineが無ければ新しく作る。
- retry count、workflow state machineをbaselineへ持たせない。

#### baseline取得不能

baseline作成に失敗した後、PostToolUseやStop時点のworktreeを新しいbaselineとして作り直さない。Codexが既に追加した違反を開始時違反へ吸収するためである。

baseline本体を作れない場合でも、同じsessionで「baseline unavailable」を判別できる最小状態だけを保持できる設計を採用する。そこへsource本文、raw Hook payload、違反本文、raw matchは保存しない。

### Task 8: PostToolUseへ即時フィードバックを接続する

既存のlogging用 `PostToolUse` Hookは維持し、文章品質用handlerを別責務として追加する。

#### 対象tool

- [ ] 実装時のCodex CLI versionで、Markdownを書き換え得る実際のtool name / matcher aliasを確認する。
- [ ] Bash経由の変更と `apply_patch` 相当の変更toolを検討対象とする。
- [ ] 存在しないtool名をPlanから推測してconfigへ固定しない。
- [ ] matcherだけで限定できない場合はHook内で `tool_name` を確認し、読み取り専用toolでは即returnする。
- [ ] 対象toolでもMarkdown変更が0件ならlintを実行しない。

#### 対象path

- [ ] tool payloadから変更pathを安全に取得できる場合は、そのMarkdown pathだけをscanする。
- [ ] pathを安全に確定できない変更toolの場合だけGit差分から変更Markdownを列挙する。
- [ ] Repository全体をPostToolUseごとにscanしない。

#### 判定

- [ ] baselineから増えた違反だけをblock理由に含める。
- [ ] tool実行済みの副作用をrollbackできるとは扱わない。
- [ ] lint違反時は、使用Codex versionのstructured block contractで短い修正情報を返す。
- [ ] baseline unavailable、Git差分取得失敗、rule読込失敗、scanner失敗、temp state読込失敗ではfail-open + stderr診断とする。
- [ ] Hook failureとlint violationを別messageにする。

PostToolUseは早期フィードバックであり、完了判定ではない。

### Task 9: Stopへ完了前品質ゲートを接続する

Stopでは次の状態表に従う。

| 状態 | `stop_hook_active` | 動作 |
| --- | --- | --- |
| valid baseline + 新規違反あり | `false` | blockして修正を促す |
| valid baseline + 新規違反あり | `true` | 再blockせずallowし、短い診断を残す |
| valid baseline + 新規違反なし | 任意 | allow |
| baseline unavailable / quality check不能 | `false` | 品質確認不能として1回block |
| baseline unavailable / quality check不能 | `true` | 再blockせずallowし、短い診断を残す |
| 対象Markdown変更なし | 任意 | allow |

`quality check不能` には少なくとも次を含む。

- baseline file欠落 / 破損
- 保存済み開始時 `HEAD` SHAのblob取得失敗
- Git差分取得失敗
- rule file読込失敗
- scanner process失敗
- temp state読込失敗

- [ ] retry counter、独自loop stateを追加しない。
- [ ] lint違反とHook内部エラーでmessageを分ける。
- [ ] block時はbaselineを保持する。
- [ ] allow時はbaselineを削除する。
- [ ] quality check不能でも現在worktreeをbaselineとして再作成しない。
- [ ] CI側のdeterministic lintを独立した検証経路として残す。

### Task 10: 文章品質gateの比較処理を固定する

純粋scannerとGit比較を分ける。

#### scanner

`scripts/lint-text-quality.mjs` は指定Markdownまたは明示された本文をscanして違反一覧を返す。baseline、Git、GitHub eventの知識を持たせない。

#### Git比較用の薄い入口

`scripts/check-text-quality-changes.mjs` を候補とし、次だけを担当させる。

1. 明示されたbase refと比較modeから対象Markdown pathを列挙する。
2. baseline側とcurrent側の本文を取得する。
3. `lint-text-quality.mjs` のscannerを両側へ適用する。
4. fingerprint digestのmultiset差分を計算する。
5. 新規違反がある場合だけ非0終了する。

新しいlint frameworkやGit diff frameworkは作らない。既存の `summarize-impact.ts` と同様に、Git commandを `execFile` / `execFileSync` の引数配列で呼び、shell quotingへ依存しない構造を優先する。

想定interface:

```text
node scripts/check-text-quality-changes.mjs --base-ref <ref>
node scripts/check-text-quality-changes.mjs --base-ref <ref> --working-tree
```

- `--working-tree` あり: `<base-ref> -> current worktree` を比較し、staged / unstaged / untracked Markdownを対象にする。
- `--working-tree` なし: `<base-ref>...HEAD` を比較し、commit間で増えた違反を対象にする。
- base refの自動推測をこのscriptへ過剰に埋め込まない。CI eventからのbase選択はworkflow側で明示する。

#### Hook

Hookは `check-text-quality-changes.mjs` のRepository-level比較をそのまま使わず、session baselineと現在worktreeを比較する。

```text
session baseline -> current worktree
```

開始前dirty状態を除外する責務はHook側だけに持たせる。

#### ローカル `pnpm run lint:text` / `pnpm run verify`

ローカル検証はcommit前に実行されるため、比較基準を次で固定する。

```text
HEAD -> current worktree
```

package scriptは概念上、次と同じmodeを使う。

```text
check-text-quality-changes --base-ref HEAD --working-tree
```

対象:

- staged
- unstaged
- untracked Markdown

既存 `HEAD` に存在する違反は、差分として増えていなければ失敗理由にしない。

ローカル検証はsession baselineを知らないRepository-level検証であるため、Codex task開始前からworktreeに存在していた未commit変更も対象になる。開始前dirty状態を除外するのはHookの責務とする。

#### PR CI

workflow側で比較元を明示する。

```text
base-ref = origin/<github.base_ref>
comparison = base-ref...HEAD
```

PRのmerge baseから増えた違反だけを判定する。

#### push CI

workflow側で比較元を明示する。

```text
base-ref = github.event.before
comparison = base-ref...HEAD
```

`github.event.before` が空またはzero SHAなら、既存CI patternに合わせて `HEAD^` へフォールバックする。

#### `schedule` / `workflow_dispatch`

現行 `Web CI` は `schedule` / `workflow_dispatch` でも `Style Quality` を実行する。これらにはPR baseや有効な `github.event.before` がないため、既存Repository patternに合わせて次へ固定する。

```text
base-ref = HEAD^
comparison = HEAD^...HEAD
```

この2イベントで文章品質gateを暗黙skipしない。直前commitから増えた違反を確認する。

#### CI stepから渡す情報

CIではgate scriptにGitHub eventを解釈させず、workflow stepでbase refを決めて明示的に渡す。

例:

```text
pull_request      -> origin/${{ github.base_ref }}
push              -> ${{ github.event.before }}（空/zero SHAならHEAD^）
schedule          -> HEAD^
workflow_dispatch -> HEAD^
```

これにより、clean checkoutのCIで誤ってlocal `HEAD -> worktree` modeを実行して差分0件になることを防ぐ。

### Task 11: local verify / Harness / CIへ接続する

#### `pnpm run verify`

- [ ] `lint:text` をmarkdownlint近傍で実行する。
- [ ] `lint:text` はローカル既定として `HEAD -> current worktree` のgate modeを実行する。
- [ ] Hook contractは既存 `test:contracts` に残す。
- [ ] 重複した `test:codex-hooks` suiteを原則追加しない。

#### `scripts/verify` / `scripts/verify.ps1`

通常モードはconsumer-facing contractを維持する。

```bash
bash scripts/verify
```

```powershell
./scripts/verify.ps1
```

通常モードへ全Vitest、build、project-wide testを追加しない。

既存strictモードも用途を変更しない。

```bash
bash scripts/verify --strict-harness
```

```powershell
./scripts/verify.ps1 -StrictHarness
```

strictモードは親directoryのsource repository構成を検証する既存のmaintainer向け契約であり、focused Hook contractの入口にはしない。

Issue #134のfocused Hook process contractは、Bash / PowerShell双方へ明示opt-inを追加する。

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

期待する責務:

- [ ] opt-in指定時だけ `tests/contracts/codex-hook-contract.test.ts` のfocused Vitestを実行する。
- [ ] 文章品質contractを別fileへ分離した場合、そのfocused testも同じopt-inへ接続する。
- [ ] opt-inなしの通常モードをpnpm/Vitest必須へ変えない。
- [ ] `--strict-harness` / `-StrictHarness` とHook contract optionを独立させ、意味を混在させない。
- [ ] `.codex/config.toml`、新規Hook file、Harness文書の存在・基本契約はBash / PowerShellで可能な範囲を対称にする。
- [ ] 新しいverify frameworkを作らず、既存Vitest commandを呼ぶ薄い入口だけを追加する。

#### GitHub Actions

Ubuntu:

- [ ] 既存 `Vitest (contracts)` を維持し、`tests/contracts/**` を実行する。
- [ ] `Style Quality` へ文章品質gateを追加する。
- [ ] `Style Quality` の文章品質stepでeventごとのbase refを明示し、`check-text-quality-changes.mjs` をcommit比較modeで実行する。
- [ ] `schedule` / `workflow_dispatch` は `HEAD^` をbase refにする。

Windows:

- [ ] Hook contract専用のfocused CIを追加する。
- [ ] 少なくとも `tests/contracts/codex-hook-contract.test.ts` をWindows runnerで実行する。
- [ ] 文章品質HookのWindows契約を別test fileへ分離した場合は、それも対象に含める。
- [ ] checkout、Node.js、pnpm、dependency install、focused Vitestに限定する。
- [ ] Product test、build、E2EをWindowsへ複製しない。

Windows CIで検出する対象:

- `command_windows`
- PowerShell / `cmd.exe` quoting
- path separator
- 空白を含むpath
- 日本語を含むpath
- stdin / stdout / stderr
- UTF-8
- temp path
- nested cwd / repository root解決

### Task 12: 文書を更新する

- [ ] `docs/reference/codex-safety-harness.md` にSessionStart / text quality gateの責務、fail-open / fail-close、軽量性を反映する。
- [ ] `docs/reference/codex-implementation-harness.md` に重複説明が必要か確認し、必要箇所だけ更新する。
- [ ] `AGENTS.md` へHook詳細を再掲しない。#135後のroot文書を再び肥大化させない。
- [ ] production ruleの正本pathとmarkdownlintとの責務分離を文書化する。
- [ ] `scripts/verify` / `scripts/verify.ps1` にHook contract用opt-inを追加した場合、その実行方法を既存文書の適切な箇所へ反映する。
- [ ] strict Harnessの既存説明をHook contract用へ書き換えない。
- [ ] local / PR / push / schedule / workflow_dispatchの文章品質比較基準を、実装と同じ内容で必要なreferenceへ記載する。

## 6. 検証方法

### 6.1 focused contract

```bash
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

文章品質testを分離した場合だけ次も実行する。

```bash
pnpm exec vitest run tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1
```

### 6.2 SessionStart contract

確認するcase:

- `source=compact` + root `AGENTS.md` 読込成功
- compact以外のsourceでは追加contextなし
- nested cwd
- malformed JSON input
- repository root解決失敗
- `AGENTS.md` 欠落
- read failure
- UTF-8本文
- JSON escaping
- `AGENTS.md` 実サイズ
- `additionalContextLimit` 境界
- configured commandのUnix経路
- configured commandのWindows経路
- 使用Codex versionのfail-close structured output
- 現行sourceと同じ契約なら `continue:false` で停止し、非0終了だけでは停止扱いにしないこと

### 6.3 文章品質contract

確認するcase:

- 明示ruleのpositive / negative
- rule表で要求された除外条件
- replacement付きrule
- 同一違反複数件のmultiset差分
- 既存違反の行移動
- 既存1件削除 + 同一fingerprint別位置1件追加で件数同一
- persisted baselineにraw normalized matchが含まれず、SHA-256 digestだけが保存される
- 開始時clean tracked fileに既存違反がある -> 保存済み開始時 `HEAD` SHAのblobから算出し、新規違反扱いしない
- session途中でcommitされても開始時clean tracked fileのbaselineが保存済み開始時 `HEAD` SHAから変わらない
- 開始時dirty tracked file
- staged + unstaged混在
- 開始時untracked
- task中に新規作成したuntracked
- tracked rename
- 開始時untrackedのpure rename -> 現在untrackedへ移動 + content SHA-256一意一致
- 開始時untrackedのpure rename -> staged addへ移動 + content SHA-256一意一致
- 開始時untracked rename候補が複数で曖昧な場合は推測しない
- delete
- baseline file欠落 / 破損
- 保存済み開始時 `HEAD` SHAのblob取得失敗
- baseline作成失敗後に現在状態をbaseline化しない
- repository root外cwd
- pathに空白・日本語を含むcase

### 6.4 PostToolUse contract

- 新規違反なし -> allow
- 今回増えた違反あり -> block reason
- 既存違反のみ -> allow
- 同一fileに既存違反 + 新規違反 -> 新規分だけ返す
- 読み取り専用tool -> early return
- 書き換えtoolだがMarkdown変更なし -> lintしない
- target pathを安全に特定できる -> そのMarkdownだけ評価
- target pathを特定できない変更tool -> Git差分でMarkdownだけ評価
- baseline unavailable -> fail-open + stderr
- scanner / rule / Git failure -> fail-open + stderr
- 既存ファイルを勝手に修正しない

### 6.5 Stop contract

- `stop_hook_active=false` + 新規違反なし -> allow
- `stop_hook_active=false` + 新規違反あり -> 1回block
- `stop_hook_active=true` + 同一違反あり -> 再blockしない
- baseline unavailable + `false` -> 品質確認不能として1回block
- baseline unavailable + `true` -> allow
- scanner / rule / Git failureをlint違反と区別する
- allow時にbaseline cleanup
- block時にbaseline維持

### 6.6 Harness検証

通常モード:

```bash
bash scripts/verify
```

```powershell
./scripts/verify.ps1
```

Hook contract用opt-in:

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

確認内容:

- 通常モードは既存consumer-facing contractを維持する。
- Hook contract用opt-inはfocused Vitestだけを追加実行する。
- Bash / PowerShellで同じ責務を持つ。
- opt-inなしの通常verifyはpnpm/Vitestの新規必須化をしない。

既存strictモード:

```bash
bash scripts/verify --strict-harness
```

```powershell
./scripts/verify.ps1 -StrictHarness
```

strictモードは親directoryにsource repository layoutがある環境向けの既存回帰確認であり、#134のHook contract実行条件にはしない。単独のqa-training-store checkoutで親source repositoryがない場合は、#134検証のためにstrictモードを要求しない。

### 6.7 `lint:text` 比較基準の検証

ローカル:

```text
HEAD -> current worktree
```

- staged変更を検出する。
- unstaged変更を検出する。
- untracked Markdownを検出する。
- `HEAD` にしか存在しない既存違反を新規違反扱いしない。

PR CI:

```text
origin/<base branch>...HEAD
```

push CI:

```text
github.event.before...HEAD
```

- `github.event.before` が空またはzero SHAなら `HEAD^...HEAD` へフォールバックする。

schedule / workflow_dispatch:

```text
HEAD^...HEAD
```

CIのclean checkoutではlocal working-tree modeを使わず、workflowから明示されたbase refによるcommit比較modeを使う。

### 6.8 Repository検証

変更内容に応じて少なくとも次を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint:text
pnpm run lint
pnpm run typecheck
pnpm run test:contracts
bash scripts/verify
bash scripts/verify --hook-contracts
pnpm run verify
git diff --check
```

Windowsでは次も実行する。

```powershell
./scripts/verify.ps1
./scripts/verify.ps1 -HookContracts
```

source repository layoutが実際に存在するmaintainer環境でstrict Harnessへ変更影響がある場合だけ、既存strict回帰も追加確認する。

### 6.9 CI確認

Ubuntu:

- `Vitest (contracts)` が既存contract suiteを実行する。
- `Style Quality` が文章品質gateを実行する。
- PR / push / schedule / workflow_dispatchで比較元がPlanどおり選択される。
- Web CIの既存必須jobを壊さない。

Windows:

- focused Hook contract jobが `codex-hook-contract.test.ts` を実行する。
- `command_windows`、PowerShell / `cmd.exe`、UTF-8、空白・日本語path、temp path、nested cwdを含むWindows固有契約を検出できる。

## 7. リスクと未解決論点

### 7.1 #135未完了

compact再注入だけは実装を開始できない。#135を待たずに仮の `AGENTS.md` 抽出方式を作らない。

### 7.2 Issue本文と現在実装の差

Hook process契約の多くは既に実装済みである。Issue本文の想定file構成へ合わせるためだけのtest移動・分割はしない。

### 7.3 Codex version差

OpenAI CodexのHook schemaは変更され得る。config field名、matcher、`additionalContextLimit`、block output、SessionStartの停止契約は使用versionの正式仕様を確認してから実装する。

特に、現行OpenAI sourceではSessionStartの非0終了は `Failed` になるだけで停止しない。使用versionでも同じ場合は `continue:false` を明示的停止に使う。

### 7.4 baseline状態管理と秘密情報

「ユーザー既存変更とCodex変更を同一file内で分離する」要件のため、開始時の最小baseline manifestだけを許容する。

baselineへ次を持たせない。

- retry回数
- workflow state machine
- file本文copy
- raw Hook payload
- raw normalized match
- secret / credential
- Agent実行履歴

違反identityのmatch部分はSHA-256 digestだけを保存する。baseline取得不能時に後から現在worktreeをbaseline化しない。

### 7.5 clean tracked baseline

開始時clean tracked MarkdownをUserPromptSubmit時に全件scanしない。保存済み開始時 `HEAD` SHAのblobから、変更対象になったfileだけ必要時にbaseline違反を算出する。

session途中でcommitが作られても、現在の `HEAD` を基準へ切り替えない。

### 7.6 untracked rename

開始時からuntrackedだったfileはGit rename情報を持たない。pure renameは保存済みcontent SHA-256の一意一致だけで対応付ける。

移動先候補は現在untrackedに限定せず、開始時 `HEAD` に存在しない現在Markdown pathを使う。これにより移動後に `git add` されたpathも候補になる。

曖昧な場合や内容変更を伴うrenameを推測しない。

### 7.7 `scripts/verify` / `scripts/verify.ps1` の既存責務

通常モードはconsumer-facing contractを維持する。Issue要件を理由に全Vitest / buildを重複実行しない。

既存 `--strict-harness` / `-StrictHarness` は親directoryのsource repository契約を検証するためのoptionであり、#134のfocused Hook contractへ流用しない。

Hook contractは明示opt-inから既存focused Vitestを呼ぶ薄い入口として追加する。

### 7.8 production文章ruleの具体値

rule categoryだけから具体的禁止語を推測すると、誤検知と不要な既存文書修正を招く。production block ruleは明文化された値だけに限定する。

具体値が確定していない場合は、scannerの設計は進めてもproduction gateを完成扱いにしない。

### 7.9 `lint:text` の比較処理

scanner本体とGit比較用の薄い入口を分離する。

- scanner: Gitを知らない。
- Hook: session baseline -> current worktree。
- local `lint:text` / `verify`: HEAD -> current worktree。
- PR CI: origin/<base branch>...HEAD。
- push CI: `github.event.before...HEAD`。無効なら `HEAD^...HEAD`。
- schedule / workflow_dispatch: `HEAD^...HEAD`。

CIではworkflow側がbase refを決めてgate scriptへ明示的に渡す。clean checkoutでlocal modeを実行して差分0件になる構造を作らない。

## 8. 成果物

実装完了時の想定成果物:

- 既存Hook contractの不足分テスト
- compact限定 `SessionStart` Hook
- 使用Codex versionに合ったSessionStart fail-close契約
- 決定論的文章品質scanner / CLI
- Git比較を担う薄い文章品質gate CLI
- 明文化されたproduction文章品質rule
- raw matchを保存しない最小baseline管理
- clean tracked fileを開始時 `HEAD` blobから必要時評価するbaseline処理
- tracked / untracked / staged-add後のpure move境界を含むPostToolUse / Stop adapter
- Hook config契約テスト
- `pnpm run verify` 接続
- Bash / PowerShellのHook contract用明示opt-in
- 既存strict Harness責務の維持
- Ubuntu既存contract CIとWindows focused Hook contract CI
- PR / push / schedule / workflow_dispatchごとの文章品質比較元
- 必要なHarness reference更新

このPlanの保存先:

`docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`

## 9. 実装前自己レビュー

実装へ進む前に次を確認する。

- [ ] #135依存を維持している。
- [ ] Issue #134の範囲を越えていない。
- [ ] `tests/contracts/codex-hook-contract.test.ts` を正本としている。
- [ ] 新しいHook test frameworkを作っていない。
- [ ] 新しいsession managerやdiff engineを作っていない。
- [ ] Windows CIはfocused Hook contractに限定している。
- [ ] `scripts/verify` / `scripts/verify.ps1` の通常モードを重くしていない。
- [ ] `--strict-harness` / `-StrictHarness` の既存source repository用途を変更していない。
- [ ] Hook contract用opt-inは既存Vitestを呼ぶ薄い入口に限定している。
- [ ] SessionStartの非0終了を停止手段として無条件に扱っていない。
- [ ] 再注入不能時は使用versionで実際に停止できるcontractを使う。
- [ ] fingerprintとmultiset差分の意味が固定されている。
- [ ] baselineへraw normalized matchを保存せずdigest化している。
- [ ] 開始時clean tracked fileのbaselineは保存済み開始時 `HEAD` SHAのblobから必要時算出する。
- [ ] clean tracked fileのためにRepository全Markdownを開始時scanしない。
- [ ] 開始時untrackedのpure move候補にuntrackedとstaged addの両方を含める。
- [ ] baseline取得不能時に後からbaselineを再作成しない。
- [ ] PostToolUseの対象tool / early return / path限定方針が決まっている。
- [ ] production文章品質ruleを実装者が推測しない。
- [ ] pure scannerとGit比較用gateの責務が分かれている。
- [ ] local `lint:text` が `HEAD -> current worktree` でstaged / unstaged / untrackedを検証する。
- [ ] PR / push / schedule / workflow_dispatchの比較元が固定されている。
- [ ] CIではlocal working-tree modeを誤実行しない。
- [ ] Hook failureとlint violationを区別している。
- [ ] raw prompt / tool input / Markdown本文をbaselineへ保存しない。

## 10. 備考

- Plan作成時の `main` HEADは `3c5e35ed42712574eb9d89051820c9e27f137a16`。
- PR #144 (`test: Windows Codex Hook contract timeoutを解消`) は既に `main` へ入っているため、その修正を前提とする。
- Issue #135はPlan更新時点でopen。compact再注入は #135 merge確認後に開始する。
- Planレビューで確認されたWindows CIの検出穴を、Windows focused Hook contractで埋める。
- 再レビューで `--strict-harness` / `-StrictHarness` の用途が親source repository検証であることを確認したため、Hook contractは別の明示opt-inへ分離する。
- 再レビューで確認した現行Codex `SessionStart` の停止契約をPlanへ反映した。実装では使用versionを再確認する。
- baseline fingerprintは論理上のmatch identityを維持しつつ、persist時はSHA-256 digestだけを保存する。
- 開始時clean tracked Markdownは保存済み開始時 `HEAD` SHAのblobから必要時にbaselineを算出する。
- 開始時untracked Markdownのpure moveは、開始時 `HEAD` に存在しない現在pathを候補とし、untracked / staged addの両方を扱う。
- local `lint:text` / `pnpm run verify` は `HEAD -> current worktree` を比較し、staged / unstaged / untrackedを対象にする。
- CIの文章品質gateはPR / push / schedule / workflow_dispatchで比較元をworkflow側から明示する。
- 新しい事実が見つかった場合はIssue本文へ機械的に合わせず、現在のsource / test / CIを正としてPlanを更新する。