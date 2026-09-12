# Codex Hook契約・compact再注入・文章品質ゲート 実装計画

## 0. 依頼概要

- 対象Issue: #134 `test: Codex Hook契約テストとcompact後の指示再注入・文章品質ゲートを整備する`
- 実装branch: `issue-134-codex-hook-quality-gates`
- Plan作成時base: `main` / `3c5e35ed42712574eb9d89051820c9e27f137a16`
- 依存Issue: #135 `refactor: AGENTS.mdをスリム化し常駐指示と詳細運用仕様を分離する`
- #135 Plan branch: `issue-135-agents-context-slimming`
- このPlanでは実装しない。実装、PR作成・更新は別タスクで行う。

Issue #134では既存Codex Harnessを拡張し、次を実現する。

1. Hookの契約をprocess境界で検証する。
2. compact後に、#135でスリム化されたroot `AGENTS.md` を再注入する。
3. Markdown文章へ決定論的な品質ルールを適用し、HookとCIの両方で検証する。
4. 作業開始前から存在する違反と、今回のCodex作業で増えた違反を分離する。

新しいAgent Runtime、独自Workflow Engine、AIによる文章評価基盤は作らない。既存の `.codex/**`、Node.js、Vitest、`scripts/verify`、`scripts/verify.ps1`、`pnpm run verify`、GitHub Actionsを再利用する。

## 1. ゴール / 完了条件

### ゴール

既存Hookの挙動を壊さず、compact後の指示再注入と文章品質ゲートを、軽量・決定論的・クロスプラットフォームなHookとして追加する。

### 完了条件

- 既存 `pre_tool_use_policy.mjs` と `log_event.mjs` の主要契約を子process経由で固定する。
- `.codex/config.toml` のHookイベント、matcher、command、Windows / Unix経路を構造として検証する。
- #135完了後のroot `AGENTS.md` だけをcompact再注入の正本とする。
- `SessionStart(source=compact)` だけでroot `AGENTS.md` 全文を `hookSpecificOutput.additionalContext` として返す。
- compact以外の `SessionStart` では再注入しない。
- root `AGENTS.md` の内容をHook専用ファイルへ複製しない。
- `SessionStart` で再注入を保証できないエラーは、使用Codex versionで実際に停止できる契約を使ってfail-closeする。
- `additionalContextLimit` は使用Codex versionの仕様とroot `AGENTS.md` の実サイズに基づいて設定する。
- 文章品質lintは決定論的な明示ルールだけを扱い、markdownlintの責務を重複実装しない。
- productionでblockする文章品質ruleは、実装前に具体値を表で確定し、実装者が独自に推測しない。
- PostToolUseではRepository全体を毎回scanせず、作業開始baselineとの差分で今回増えた違反だけをフィードバック対象にする。
- Stopでは `stop_hook_active=false` のときだけ新規違反または品質確認不能を1回blockし、`true` では再blockしない。
- baseline取得不能とHook内部エラーをlint違反と区別し、後から現在worktreeをbaselineとして再作成しない。
- baselineへ本文断片や正規化済みmatchを平文保存しない。
- 開始時clean tracked Markdownは保存済み開始時 `HEAD` SHAのblobから必要時にbaseline違反を算出する。
- 開始時HEADに存在するかどうかを基準にbaseline取得元を決め、dirty / staged add / untrackedを正しく区別する。
- renameは `Git rename mapping -> exact content SHA-256の一意一致 -> quality check不能` の順で解決し、対応付け不能時にbaseline空へ落とさない。
- local `lint:text` / `pnpm run verify` は `HEAD -> current worktree` を比較し、staged / unstaged / untracked Markdownを対象にする。
- commit比較では比較開始commitを1つ確定し、変更path、baseline本文、rename mappingのすべてに同じtreeを使う。
- CIではイベントごとの比較元を明示する。`schedule` / `workflow_dispatch` は既存CI patternに合わせて `HEAD^` を使う。
- `scripts/verify` / `scripts/verify.ps1` の既存strict責務を変えず、Hook contract用の明示opt-inを追加する。
- GitHub ActionsではUbuntuの既存 `Vitest (contracts)` とWindowsのfocused Hook contractを実行する。
- Product code、Skill routing、Agent orchestrationへ変更を広げない。

## 2. 現状理解と前提

### 2.1 Issue作成後に進んでいる内容

Issue本文の「Hook process契約テストが不足している」という前提は、現在の `main` では一部解消済みである。

現在の `tests/contracts/codex-hook-contract.test.ts` は少なくとも次をprocess境界で確認している。

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

PR #144もmerge済みで、Windows上の既存Hook contract timeout対策が `main` に入っている。

Issue本文の想定どおり `tests/codex-hooks/` を新設して既存契約を作り直さない。`tests/contracts/codex-hook-contract.test.ts` を正本として不足分だけを追加する。

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

GitHub Actions `Web CI` のVitest matrixにも `contracts` が含まれるため、`tests/contracts/**` に追加するHook契約テストはUbuntuの既存CI経路へ入る。

一方、現行 `Vitest (contracts)` はUbuntuであり、Windows Hook launcherを実行するCI経路はない。#134ではSessionStart、文章品質Hook、temp state、UTF-8、cwd解決等も増えるため、WindowsではHook contractに限定したfocused実行を追加する。

### 2.3 `scripts/verify` / `scripts/verify.ps1`

通常モードはconsumer-facing template contractを持つ。

既存の `--strict-harness` / `-StrictHarness` はHook contract用の重い検証モードではない。qa-training-storeの親directoryをsource repositoryとして扱い、親側の `README.md`、`CHANGELOG.md`、`tools/validate-spec.*`、integration test、`validate-template.yml` 等を確認するsource repository maintainer向け契約である。

この意味を#134で変更しない。

Hook contractは別の明示opt-inから既存Vitestを呼ぶ。

想定:

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

実装開始時に同等の既存optionが追加済みなら再利用し、重複optionを作らない。

### 2.4 現在のHook設定

`.codex/config.toml` には少なくとも次がある。

- `PreToolUse`
- `UserPromptSubmit`
- `PostToolUse`
- `SubagentStart`
- `SubagentStop`
- `Stop`

`SessionStart` は未登録である。

Windowsは `command_windows` を使う別command経路を持つ。新規HookでもWindows / Unix commandを契約テストする。

既存 `PreToolUse` はBash matcherで、`apply_patch` は現行policy対象外である。Issue本文の例だけを理由に既存matcherへ追加しない。

### 2.5 #135との依存関係

Plan更新時点でIssue #135はopenである。

compact再注入は #135完了後まで実装しない。#134 branchを #135 branchへ直接依存させず、#135が `main` へ入った後に、このbranchへ最新 `main` をRepositoryのGit安全規約に従って取り込んでからTask 5へ進む。

#135後のroot `AGENTS.md` を唯一の正本とする。compact専用コピー、marker領域、二重管理を追加しない。

Hook契約の不足分確認、文章lint scanner、baseline方式のテスト設計は #135前でも進められる。

### 2.6 Codex Hook正式仕様

2026-09-12にOpenAI Codex sourceを確認した時点では少なくとも次が存在する。

- `SessionStart` inputの `source` に `compact`
- `SessionStart` outputの `hookSpecificOutput.additionalContext`
- universal outputの `continue` / `stopReason`
- `Stop` inputの `stop_hook_active`
- command Hook設定の `additionalContextLimit`

参照:

- `https://github.com/openai/codex/blob/main/codex-rs/hooks/src/schema.rs`
- `https://github.com/openai/codex/blob/main/codex-rs/hooks/src/events/session_start.rs`
- `https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json`

現行OpenAI sourceの `SessionStart` では、exit code 0のstructured outputで `continue:false` を返した場合に `should_stop=true` となる。一方、非0終了やinvalid JSON-like stdoutはHookを `Failed` にするだけで、停止とはならない。

非0終了をcompact停止手段として前提にしない。実装時に使用Codex CLI versionを確認し、そのversionでも同じ契約なら、再注入を保証できないエラーはexit code 0で `continue:false` と `stopReason` を返して停止させる。

Codex Hook仕様はversion依存である。OpenAI repositoryの最新 `main` を使用versionへ無条件に適用しない。

`additionalContextLimit` は現在確認したsourceでは `additionalContext` のspill閾値として扱われる。単純なstdout文字数上限として扱わない。

### 2.7 既存の差分取得パターン

Repositoryには `scripts/spec/summarize-impact.ts` があり、差分取得で次を既に行っている。

- ローカルworking treeではbase refとworktreeを比較し、`git ls-files --others --exclude-standard` でuntrackedを追加する。
- PRでは `origin/<base branch>` を比較元にする。
- pushでは有効な `github.event.before` を比較元にする。
- 比較元を確定できないイベントでは `HEAD^` へフォールバックする。
- Git commandは `execFileSync` と引数配列で実行し、shell quotingへ依存しない。

`.github/workflows/ci.yml` にも、PR以外で `github.event.before` が空またはzero SHAなら `HEAD^` を使う既存patternがある。

文章品質gateはこのpatternを再利用し、新しいGit差分frameworkを作らない。

### 2.8 前提

- Node.js標準機能で実装できるHook処理へ新しいruntime依存を追加しない。
- fingerprint digestにはNode.js標準 `crypto` を使う。
- TOMLを意味的にparseする既存direct dependencyが無い場合は、小さなtest-only parser dependencyと既存helper継続を比較する。手書きTOML parserは作らない。
- 文章品質lintの対象は初期実装ではMarkdown (`*.md`) に限定する。
- 意味評価、自然さ、論理構成、未知の造語検出はblock条件にしない。
- `scripts/verify` / `scripts/verify.ps1` の通常モードへproject-wide Vitestやbuildを追加しない。
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

具体値は次の順で決める。

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

- 使用versionの `SessionStart` 停止契約。現在確認したsourceと同じなら `continue:false` + `stopReason` を使用する。
- `additionalContextLimit` の具体値。
- TOML parserの具体package。手書きparserは作らない。
- PostToolUseで利用できる実際のtool name / matcher alias。
- `scripts/verify` / `scripts/verify.ps1` に同等のHook contract用optionが追加済みか。
- Windows focused contractの実測timeout。

## 4. 影響範囲

### 4.1 変更候補

```text
.codex/config.toml
.codex/hooks/session_start_context.mjs
.codex/hooks/text_quality_gate.mjs
.codex/text-quality-rules.json
scripts/lint-text-quality.mjs
scripts/check-text-quality-changes.mjs
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts       # 分離した方が読みやすい場合のみ
package.json
.github/workflows/ci.yml
docs/reference/codex-safety-harness.md
docs/reference/codex-implementation-harness.md  # 関連箇所がある場合のみ
```

候補ファイルをすべて作ることを目的にしない。既存ファイルへ自然に追加できる場合は新規ファイルを増やさない。

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
- 独自diff framework
- rename similarity engine
- patch parser
- `--strict-harness` / `-StrictHarness` の既存責務

## 5. 変更方針

### Task 1: 実装開始時の状態を固定する

- [ ] `main`、branch HEAD、merge base、working treeを確認する。
- [ ] #135のstateとmerge有無を確認する。
- [ ] `tests/contracts/codex-hook-contract.test.ts`、`.codex/config.toml`、Hook scripts、`package.json`、`scripts/verify`、`scripts/verify.ps1`、`.github/workflows/ci.yml` の最新状態を確認する。
- [ ] 使用Codex CLI versionを記録し、そのversionに対応するHook schemaを確認する。
- [ ] #144以降にHook contractへ追加変更がないか確認する。

判断:

- Issue本文より現在実装を優先する。
- 既に成立しているcontractを別test directoryへ複製しない。

### Task 2: 既存Hook契約テストの不足分だけを埋める

- [ ] 現行 `codex-hook-contract.test.ts` とIssue #134のチェック項目を対応付ける。
- [ ] 既存のstdin / stdout / stderr / exit / cwd / side effect / Windows・Unix launcher caseは重複追加しない。
- [ ] 未確認の入力サイズ境界をprocess経由で追加する。
- [ ] `pre_tool_use_policy.mjs` は現行matcher契約どおり、`apply_patch` が `PreToolUse/Bash` policy対象外であることを固定する。
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
- [ ] #135後のroot `AGENTS.md` が全文再注入する正本として適切か確認する。
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
- [ ] nested cwdでもroot `AGENTS.md` を解決できるようにする。
- [ ] `AGENTS.md` を別ファイルへコピーしない。
- [ ] root解決、UTF-8読込、JSON serializeだけで閉じる。独自compact state managerは作らない。
- [ ] `additionalContextLimit` は実Codex versionの契約を確認したうえで明示する。
- [ ] 通常サイズと境界値で `additionalContext` のruntime挙動を確認する。

#### 成功契約

- `source=compact`: 正常終了し、root `AGENTS.md` 全文をstructured `additionalContext` として返す。
- `source != compact`: 正常終了し、追加contextなし。

#### 再注入を保証できないエラー

次は同じfail-close方針で扱う。

- malformed Hook input
- repository root解決失敗
- root `AGENTS.md` 欠落
- root `AGENTS.md` read失敗
- structured output生成失敗

これらを単に非0終了させて「停止した」とみなさない。

実装時のCodex versionで停止契約を確認する。現在確認したsourceと同じならexit code 0で次のstructured outputを返す。

```json
{
  "continue": false,
  "stopReason": "compact後の必須指示を再注入できなかった理由"
}
```

- 誤った `additionalContext` は返さない。
- `stopReason` へraw input、秘密情報、不要に長いpathを含めない。
- 非0終了を停止手段として採用するのは、使用versionの実runtimeで停止を確認できた場合だけとする。
- process単体testだけでなく、使用versionのfocused runtime確認でcompact継続が止まることを確認する。

### Task 6: 決定論的な文章品質scannerを成立させる

Task 6へ入る前に「3.2 production文章品質rule表」を確定する。具体値がないrule categoryを実装者判断でproduction block ruleへ追加しない。

- [ ] `scripts/lint-text-quality.mjs` にscanner/CLIを実装する。
- [ ] production ruleは `.codex/text-quality-rules.json` 等の1か所を正本にする。
- [ ] scannerは指定Markdown fileまたは明示された本文を決定論的にscanする責務に限定する。
- [ ] scannerへGit、session baseline、GitHub Actions eventの知識を持たせない。
- [ ] Markdown parserは追加せず、採用ruleに必要な最小限の判定から始める。
- [ ] fenced code、inline code、URL、identifier等の除外はrule表に明記された場合だけ実装する。
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

秘密情報や行全体を診断へ不要に出さない。raw matchは原則診断へ出さない。

### Task 7: 作業開始baselineを最小状態で保持する

同じファイルにユーザー既存変更とCodex変更が共存する要件を満たすため、文章lint専用の最小baseline manifestを使う。

#### 7.1 開始時に保存する情報

最初の通常 `UserPromptSubmit` で次を保存する。

- 開始時 `HEAD` SHA
- repository rootを識別するhash
- sessionを安全に識別する値
- 開始時点で `HEAD` と内容が一致しない対象Markdown path
  - dirty tracked
  - staged add等、開始時HEADに存在しないがindex/worktreeに存在するfile
  - untracked
- 上記pathの開始時content SHA-256
- 上記pathの開始時文章lint violation fingerprint digestと件数

開始時clean tracked Markdownは全件scan・保存しない。必要になったfileだけ、保存済み開始時 `HEAD` SHAのblobからbaselineを算出する。

保存しないもの:

- Markdown本文
- prompt全文
- raw tool input
- raw Hook payload
- raw normalized match
- token / secret / credential / password
- environment variables
- Agent実行履歴

baselineはtracked fileにせず、OS temp directory等、同じsessionのHook processから再参照できる場所へ保存する。

#### 7.2 baselineの取得元

現在のMarkdown pathを評価するとき、開始時状態は次で取得する。

| 開始時状態 | baseline取得元 |
| --- | --- |
| 開始時HEADに存在し、clean | 保存済み開始時 `HEAD` SHAの開始時path blobを必要時にscanする |
| 開始時HEADに存在し、dirty | manifestへ保存した開始時worktreeの違反multiset |
| 開始時HEADに存在しないがtask開始時には存在 | manifestへ保存した開始時worktreeの違反multiset |
| task開始後に初めて作成 | baseline空 |

重要:

- clean trackedの基準に現在の `HEAD` を使わない。session途中でcommitされても保存済み開始時 `HEAD` SHAを使う。
- blob本文はmanifestへ保存しない。Git objectから取得した本文をそのままscannerへ渡し、digest multisetだけを比較に使う。
- 保存済み開始時 `HEAD` SHAのblobを取得できない場合はbaseline空と推測せずquality check不能へ流す。
- Repository全MarkdownをUserPromptSubmit時にscanしない。

#### 7.3 違反identityと保存形式

論理上のidentity:

```text
rule_id + rule定義に従って正規化したmatch
```

baselineへ正規化済みmatchを平文保存しない。

保存形式:

```text
rule_id + SHA-256(normalized_match) + count
```

- SHA-256はNode.js標準 `crypto` で計算する。
- 行番号、`message`、`replacement` はidentityへ含めない。
- 大文字小文字、whitespace、Unicode等の正規化はrule表で明示された場合だけ行う。
- 同一fingerprintが同一fileに複数存在できるためmultisetとして件数を保持する。

新規違反数:

```text
max(current_count - baseline_count, 0)
```

同じfingerprintの位置移動だけでは新規違反扱いしない。位置単位の由来追跡や独自diff engineは作らない。

#### 7.4 file identity / rename解決

file identityは次の順で解決する。

##### 1. Git rename mappingが得られる場合

Gitのrename情報が成立している場合はそのmappingを使う。

開始時pathのbaseline取得元は「7.2 baselineの取得元」に従う。

- 開始時clean tracked -> 保存済み開始時HEAD blob
- 開始時dirty tracked -> manifestの開始時worktree baseline
- 開始時HEADに存在しない開始時file -> manifestの開始時worktree baseline

##### 2. Git rename mappingが得られない場合

開始時pathが現在worktreeから消えているfileについて、exact content SHA-256の一意一致だけをfallbackとして使う。

開始時content SHA-256の取得元:

- 開始時HEADに存在しclean -> 保存済み開始時HEAD blobから算出
- 開始時dirty -> manifest保存値
- 開始時HEADに存在しないがtask開始時に存在 -> manifest保存値

現在候補:

- 現在worktreeに存在するMarkdown
- まだ開始時file identityへ対応付けられていないpath
- untrackedだけに限定しない
- staged addも含む

判定:

1. 開始時pathが現在worktreeから消えていることを確認する。
2. 未解決の現在Markdown候補のcontent SHA-256を比較する。
3. 同一SHA-256候補が一意に1件だけならpure moveとして対応付ける。
4. 同一SHA候補が複数ある、または内容変更を伴ってexact matchできない場合は推測しない。

対象例:

```text
clean tracked -> unstaged filesystem move
clean tracked -> staged rename
start dirty tracked -> unstaged filesystem move
start dirty tracked -> staged rename
start staged add -> filesystem move
start untracked -> untracked move
start untracked -> staged add move
```

##### 3. 対応付け不能

Git rename mappingもexact SHA一意一致も成立しないfileは、baseline空へ落とさない。

そのfileは `quality check不能` として扱う。

例:

- moveと同時に内容変更されexact SHAが一致しない
- 同一SHA候補が複数あり一意に決められない
- 開始時path / 現在pathの取得に失敗する

対応:

- PostToolUse: fail-open + stderr診断
- Stop + `stop_hook_active=false`: 品質確認不能として1回block
- Stop + `stop_hook_active=true`: 再blockせずallow

similarity、filename推測、edit distance、独自rename engineは追加しない。

#### 7.5 baseline lifecycle

- baselineが無ければ最初の通常 `UserPromptSubmit` で1回作る。
- Stopがblockして自動継続している間は上書きしない。
- Stopをallowする時点でbaselineを削除する。
- `stop_hook_active=true` でallowする場合も削除する。
- block時はbaselineを保持する。
- 次の通常 `UserPromptSubmit` ではbaselineが無ければ新しく作る。
- retry count、workflow state machineをbaselineへ持たせない。

#### 7.6 baseline取得不能

baseline作成に失敗した後、PostToolUseやStop時点のworktreeを新しいbaselineとして作り直さない。

baseline本体を作れない場合でも、同じsessionで `baseline unavailable` を判別できる最小状態だけを保持する。そこへ本文やraw matchは保存しない。

### Task 8: PostToolUseへ即時フィードバックを接続する

既存logging用 `PostToolUse` Hookは維持し、文章品質用handlerを別責務として追加する。

#### 対象tool

- [ ] 実装時のCodex CLI versionで、Markdownを書き換え得るtool name / matcher aliasを確認する。
- [ ] Bash経由の変更と `apply_patch` 相当の変更toolを検討対象とする。
- [ ] 存在しないtool名を推測してconfigへ固定しない。
- [ ] matcherだけで限定できない場合はHook内で `tool_name` を確認し、読み取り専用toolでは即returnする。
- [ ] Markdown変更が0件ならscannerを実行しない。

#### 対象path

- [ ] tool payloadから変更pathを安全に取得できる場合はそのMarkdownだけをscanする。
- [ ] pathを安全に確定できない場合だけGit差分から変更Markdownを列挙する。
- [ ] Repository全体をPostToolUseごとにscanしない。

#### 判定

- [ ] baselineから増えた違反だけをblock理由に含める。
- [ ] tool実行済みの副作用をrollbackできるとは扱わない。
- [ ] lint違反時は使用Codex versionのstructured block contractで短い修正情報を返す。
- [ ] baseline unavailable、rename mapping不能、Git差分取得失敗、rule読込失敗、scanner失敗、temp state読込失敗ではfail-open + stderr診断とする。
- [ ] Hook failureとlint violationを別messageにする。

PostToolUseは早期フィードバックであり、完了判定ではない。

### Task 9: Stopへ完了前品質ゲートを接続する

| 状態 | `stop_hook_active` | 動作 |
| --- | --- | --- |
| valid baseline + 新規違反あり | `false` | blockして修正を促す |
| valid baseline + 新規違反あり | `true` | 再blockせずallowし診断を残す |
| valid baseline + 新規違反なし | 任意 | allow |
| quality check不能 | `false` | 品質確認不能として1回block |
| quality check不能 | `true` | 再blockせずallowし診断を残す |
| 対象Markdown変更なし | 任意 | allow |

`quality check不能` には少なくとも次を含む。

- baseline file欠落 / 破損
- baseline作成失敗
- 保存済み開始時 `HEAD` SHAのblob取得失敗
- rename mapping不能
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

純粋scannerとRepository-levelのGit比較を分ける。

#### 10.1 scanner

`scripts/lint-text-quality.mjs` は指定Markdown fileまたは明示された本文をscanして違反一覧を返す。

持たせない責務:

- Git command
- baseline ref選択
- GitHub Actions event判定
- working tree差分取得

#### 10.2 Git比較用の薄い入口

`scripts/check-text-quality-changes.mjs` を候補とし、次だけを担当させる。

1. 明示されたbase refと比較modeから比較開始commitを確定する。
2. 同じ比較開始commitを使って対象Markdown pathとrename mappingを列挙する。
3. baseline側とcurrent側の本文を取得する。
4. scannerを両側へ適用する。
5. fingerprint digestのmultiset差分を計算する。
6. 新規違反がある場合だけ非0終了する。

新しいlint frameworkやGit diff frameworkは作らない。既存 `summarize-impact.ts` と同様に、Git commandは `execFile` / `execFileSync` の引数配列で呼び、shell quotingへ依存しない。

想定interface:

```text
node scripts/check-text-quality-changes.mjs --base-ref <ref>
node scripts/check-text-quality-changes.mjs --base-ref <ref> --working-tree
```

#### 10.3 working tree比較mode

`--working-tree` あり:

```text
<base-ref> -> current worktree
```

- staged
- unstaged
- untracked Markdown

を対象にする。

local既定:

```text
base-ref = HEAD
comparison = HEAD -> current worktree
```

#### 10.4 commit比較mode

`--working-tree` なしでは比較開始commitを1回確定し、そのtreeをすべてに使う。

原則:

```text
comparison_base = git merge-base <base-ref> HEAD
```

以降は次を同じ `comparison_base` で行う。

```text
changed paths:
comparison_base -> HEAD

baseline content:
comparison_base:<start path>

current content:
HEAD:<current path>

rename mapping:
comparison_base -> HEAD
```

重要:

- `git diff <base-ref>...HEAD` のchanged pathsと、`git show <base-ref>:<path>` の本文を混在させない。
- changed path判定、baseline本文、rename mappingで同じ比較開始treeを使う。
- PRのbase branchがfork後に進んでも、base tipの本文をbaselineへ混ぜない。
- 実装手段は `git merge-base` でcommitを先に解決する方法を基本とする。同じtreeを保証できる別の既存Git情報を使う場合も、契約は変えない。

pushで `github.event.before` が通常のancestorならmerge baseはそのbefore SHAになる。`schedule` / `workflow_dispatch` の `HEAD^` も同様である。

#### 10.5 PR CI

workflowでcheckoutされた `HEAD` を基準にし、raw PR headを独自に仮定しない。

```text
base-ref = origin/${{ github.base_ref }}
comparison_base = git merge-base base-ref HEAD
comparison = comparison_base -> HEAD
```

`Style Quality` は `fetch-depth: 0` を維持し、merge base解決に必要な履歴を取得する。

#### 10.6 push CI

```text
base-ref = github.event.before
```

空、zero SHA、利用不能の場合は既存CI patternどおり `HEAD^` へfallbackする。

commit比較modeで `comparison_base` を確定し、変更pathとbaseline本文の両方に使う。

#### 10.7 `schedule` / `workflow_dispatch`

```text
base-ref = HEAD^
comparison_base = git merge-base HEAD^ HEAD
```

直前commitから増えた違反を確認する。暗黙skipしない。

現在のRepositoryはroot commitではないため、root commit専用の履歴探索frameworkは作らない。`HEAD^` を解決できない場合はgate failureとして扱う。

#### 10.8 CIから渡す値

GitHub eventの解釈はworkflow側で行い、gate scriptへbase refを明示的に渡す。

```text
pull_request      -> origin/${{ github.base_ref }}
push              -> ${{ github.event.before }}（空/zero SHAならHEAD^）
schedule          -> HEAD^
workflow_dispatch -> HEAD^
```

clean checkoutのCIでローカル `HEAD -> worktree` modeを誤実行し、差分0件でPASSする構造にしない。

### Task 11: local verify / Harness / CIへ接続する

#### `pnpm run verify`

- [ ] `lint:text` をmarkdownlint近傍で実行する。
- [ ] `lint:text` はローカル既定として `HEAD -> current worktree` のgate modeを実行する。
- [ ] Hook contractは既存 `test:contracts` に残す。
- [ ] 重複した `test:codex-hooks` suiteを原則追加しない。

#### `scripts/verify` / `scripts/verify.ps1`

通常モード:

```bash
bash scripts/verify
```

```powershell
./scripts/verify.ps1
```

既存strict:

```bash
bash scripts/verify --strict-harness
```

```powershell
./scripts/verify.ps1 -StrictHarness
```

Hook contract用opt-in:

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

- [ ] opt-in指定時だけ `tests/contracts/codex-hook-contract.test.ts` のfocused Vitestを実行する。
- [ ] 文章品質contractを別fileへ分離した場合は同じopt-inへ接続する。
- [ ] opt-inなしの通常モードをpnpm/Vitest必須へ変えない。
- [ ] strict HarnessとHook contract optionの意味を混在させない。
- [ ] Bash / PowerShellで同じ責務を持たせる。
- [ ] 新しいverify frameworkを作らない。

#### GitHub Actions

Ubuntu:

- [ ] 既存 `Vitest (contracts)` を維持する。
- [ ] `Style Quality` へ文章品質gateを追加する。
- [ ] `Style Quality` の文章品質stepでeventごとのbase refを明示し、commit比較modeを実行する。
- [ ] `pull_request` では `fetch-depth: 0` を維持し、merge baseを解決する。
- [ ] `schedule` / `workflow_dispatch` は `HEAD^` をbase refにする。

Windows:

- [ ] Hook contract専用のfocused CIを追加する。
- [ ] 少なくとも `tests/contracts/codex-hook-contract.test.ts` をWindows runnerで実行する。
- [ ] 文章品質HookのWindows契約を別test fileへ分離した場合はそれも対象に含める。
- [ ] checkout、Node.js、pnpm、dependency install、focused Vitestに限定する。
- [ ] Product test、build、E2E、Style Quality全体をWindowsへ複製しない。

Windows focused contractで確認する対象:

- `command_windows`
- PowerShell / `cmd.exe` quoting
- path separator
- 空白を含むpath
- 日本語を含むpath
- stdin / stdout / stderr
- UTF-8
- temp path
- nested cwd / repository root解決
- text quality state / path処理のWindows互換性

### Task 12: 文書を更新する

- [ ] `docs/reference/codex-safety-harness.md` にSessionStart / text quality gateの責務、fail-open / fail-close、軽量性を反映する。
- [ ] `docs/reference/codex-implementation-harness.md` は関連箇所がある場合だけ更新する。
- [ ] `AGENTS.md` へHook詳細を再掲しない。
- [ ] production ruleの正本pathとmarkdownlintとの責務分離を文書化する。
- [ ] Hook contract用opt-inの実行方法を適切な既存文書へ反映する。
- [ ] strict Harnessの既存説明をHook contract用へ書き換えない。
- [ ] local / PR / push / schedule / workflow_dispatchの文章品質比較基準を実装と同じ内容で記載する。
- [ ] rename mapping不能をbaseline空へ落とさずquality check不能とする契約を記載する。

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
- 現行sourceと同じ契約なら `continue:false` で停止し、非0終了だけでは停止扱いにしない

### 6.3 文章品質 / baseline contract

- 明示ruleのpositive / negative
- rule表で要求された除外条件
- replacement付きrule
- 同一違反複数件のmultiset差分
- 既存違反の行移動
- 既存1件削除 + 同一fingerprint別位置1件追加で件数同一
- persisted baselineにraw normalized matchが含まれずSHA-256 digestだけが保存される
- 開始時clean tracked fileに既存違反がある -> 保存済み開始時HEAD blobから算出し新規違反扱いしない
- session途中でcommitされてもclean tracked baselineが開始時HEADから変わらない
- 開始時dirty tracked file
- 開始時staged add file
- staged + unstaged混在
- 開始時untracked
- task中に新規作成したfile
- tracked rename
- clean tracked -> unstaged pure move
- dirty tracked -> unstaged pure move
- 開始時staged add -> pure move
- 開始時untracked -> untracked pure move
- 開始時untracked -> staged add pure move
- move + 内容変更でmapping不能 -> baseline空にせずquality check不能
- exact SHA候補複数 -> baseline空にせずquality check不能
- delete
- baseline file欠落 / 破損
- 保存済み開始時HEAD blob取得失敗
- baseline作成失敗後に現在状態をbaseline化しない
- repository root外cwd
- pathに空白・日本語を含むcase

### 6.4 Git比較contract

#### working tree

```text
HEAD -> current worktree
```

- staged変更を検出する
- unstaged変更を検出する
- untracked Markdownを検出する
- HEAD側だけに存在する既存違反を新規扱いしない

#### PR

base branchがfork後に進んだ履歴をfixtureで作る。

```text
M = merge base
B = 現在のbase tip
H = checkoutされたHEAD
```

確認:

- `comparison_base` はM
- changed pathsはM -> H
- baseline本文はMのblob
- Bだけの変更をbaselineへ混ぜない
- rename mappingもM -> Hで解決する

#### push

- valid `before` -> comparison baseとして使用
- empty / zero SHA -> `HEAD^` fallback

#### schedule / workflow_dispatch

- `HEAD^ -> HEAD`
- `HEAD^` 取得不能時は明示failure

### 6.5 PostToolUse contract

- 新規違反なし -> allow
- 今回増えた違反あり -> block reason
- 既存違反のみ -> allow
- 同一fileに既存違反 + 新規違反 -> 新規分だけ返す
- 読み取り専用tool -> early return
- 書き換えtoolだがMarkdown変更なし -> lintしない
- target pathを安全に特定できる -> そのMarkdownだけ評価
- target pathを特定できない変更tool -> Git差分でMarkdownだけ評価
- rename mapping不能 -> fail-open + stderr
- baseline unavailable -> fail-open + stderr
- scanner / rule / Git failure -> fail-open + stderr
- 既存ファイルを勝手に修正しない

### 6.6 Stop contract

- `stop_hook_active=false` + 新規違反なし -> allow
- `stop_hook_active=false` + 新規違反あり -> 1回block
- `stop_hook_active=true` + 同一違反あり -> 再blockしない
- quality check不能 + `false` -> 1回block
- quality check不能 + `true` -> allow
- rename mapping不能をlint違反と区別する
- scanner / rule / Git failureをlint違反と区別する
- allow時にbaseline cleanup
- block時にbaseline維持

### 6.7 Harness検証

通常:

```bash
bash scripts/verify
```

```powershell
./scripts/verify.ps1
```

Hook contract opt-in:

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

strictはsource repository layoutがある環境で既存回帰確認としてのみ使う。

```bash
bash scripts/verify --strict-harness
```

```powershell
./scripts/verify.ps1 -StrictHarness
```

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

### 6.9 CI確認

Ubuntu:

- `Vitest (contracts)` が既存contract suiteを実行する。
- `Style Quality` が文章品質gateを実行する。
- PRでは同一merge base treeからchanged pathsとbaseline本文を取得する。
- push / schedule / workflow_dispatchのbase refがPlanどおり解決される。

Windows:

- focused Hook contract jobが `codex-hook-contract.test.ts` を実行する。
- `command_windows`、PowerShell / `cmd.exe`、UTF-8、空白・日本語path、temp path、nested cwd等のWindows固有契約を検出できる。

## 7. リスクと未解決論点

### 7.1 #135未完了

compact再注入だけは実装を開始できない。#135を待たずに仮の `AGENTS.md` 抽出方式を作らない。

### 7.2 Issue本文と現在実装の差

Hook process契約の多くは既に実装済みである。Issue本文の想定file構成へ合わせるためだけのtest移動・分割はしない。

### 7.3 Codex version差

OpenAI CodexのHook schemaは変更され得る。config field名、matcher、`additionalContextLimit`、block output、SessionStart停止契約は使用versionの正式仕様を確認してから実装する。

### 7.4 baseline状態管理

開始時のfile identityは次の順で判定する。

1. 保存済み開始時HEADに存在するか
2. task開始時worktreeでの状態
3. Git rename mapping
4. exact SHA一意一致fallback

mapping不能をbaseline空として扱わない。

baselineへretry回数、workflow state machine、本文copy、raw Hook payload、raw normalized match、secret類を持たせない。

### 7.5 rename

Gitがrenameを報告できる状態だけを前提にしない。worktree-only moveでもexact SHA一意一致でpure moveを対応付ける。

ただし、move + 内容変更や曖昧な候補まで推測しない。対応付け不能はquality check不能として既存障害契約へ流す。

### 7.6 commit比較

`base-ref...HEAD` のchanged pathsと `base-ref:path` の本文を混在させない。

commit比較modeでは `comparison_base` を1回解決し、changed paths、baseline本文、rename mappingのすべてで同じtreeを使う。

### 7.7 `scripts/verify` / `scripts/verify.ps1`

通常モードはconsumer-facing contractを維持する。既存strictは親source repository契約のままとする。Hook contractは別opt-inから既存focused Vitestを呼ぶ。

### 7.8 production文章ruleの具体値

具体値が確定していない場合はscannerの設計は進めてもproduction gateを完成扱いにしない。

### 7.9 `lint:text` の比較基準

- Hook: session baseline -> current worktree
- local: HEAD -> current worktree
- PR: merge base -> checkoutされたHEAD
- push: beforeのmerge base -> HEAD。before無効時は `HEAD^`
- schedule / workflow_dispatch: `HEAD^ -> HEAD`

scanner本体と比較snapshot選択は分離する。

## 8. 成果物

実装完了時の想定成果物:

- 既存Hook contractの不足分テスト
- compact限定 `SessionStart` Hook
- 使用Codex versionに合ったSessionStart fail-close契約
- 決定論的文章品質scanner / CLI
- Repository-level Git比較用の薄いCLI
- 明文化されたproduction文章品質rule
- raw matchを保存しない最小baseline管理
- worktree-only moveを含むrename fallback
- mapping不能時のquality check不能契約
- Hook config契約テスト
- `pnpm run verify` 接続
- Bash / PowerShellのHook contract用明示opt-in
- 既存strict Harness責務の維持
- Ubuntu既存contract CIとWindows focused Hook contract CI
- 必要なHarness reference更新

このPlanの保存先:

`docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`

## 9. 実装前自己レビュー

実装へ進む前に次を確認する。

- [ ] #135依存を維持している。
- [ ] Issue #134の範囲を越えていない。
- [ ] `tests/contracts/codex-hook-contract.test.ts` を正本としている。
- [ ] 新しいHook test frameworkを作っていない。
- [ ] 新しいsession managerやdiff frameworkを作っていない。
- [ ] Windows CIはfocused Hook contractに限定している。
- [ ] `scripts/verify` / `scripts/verify.ps1` の通常モードを重くしていない。
- [ ] strict Harnessの既存用途を変更していない。
- [ ] Hook contract用opt-inは既存Vitestを呼ぶ薄い入口に限定している。
- [ ] SessionStartの非0終了を停止手段として無条件に扱っていない。
- [ ] fingerprintとmultiset差分の意味が固定されている。
- [ ] baselineへraw normalized matchを保存していない。
- [ ] clean tracked baselineは保存済み開始時HEAD blobからlazy評価する。
- [ ] 開始時HEADに存在しないtask開始時fileもmanifestへ保存する。
- [ ] renameはGit mapping -> exact SHA一意一致 -> quality check不能の順で処理する。
- [ ] mapping不能をbaseline空へ落とさない。
- [ ] clean tracked -> unstaged move、dirty tracked -> unstaged move、開始時staged add -> moveをcontractへ含める。
- [ ] PostToolUseの対象tool / early return / path限定方針が決まっている。
- [ ] production文章品質ruleを実装者が推測しない。
- [ ] local `lint:text` が `HEAD -> current worktree` でstaged / unstaged / untrackedを検証する。
- [ ] commit比較ではcomparison baseを1回確定し、changed paths / baseline本文 / rename mappingで同じtreeを使う。
- [ ] PRでbase branchが進んだfixtureを検証する。
- [ ] push / schedule / workflow_dispatchのbase refが固定されている。
- [ ] Hook failureとlint violationを区別している。
- [ ] raw prompt / tool input / Markdown本文をbaselineへ保存しない。

## 10. 備考

- Plan作成時の `main` HEADは `3c5e35ed42712574eb9d89051820c9e27f137a16`。
- PR #144 (`test: Windows Codex Hook contract timeoutを解消`) はmerge済みで、その修正を前提とする。
- Issue #135はPlan更新時点でopen。compact再注入は #135 merge確認後に開始する。
- Windows focused Hook contractで、Ubuntu CIでは通らないWindows固有経路を検証する。
- `--strict-harness` / `-StrictHarness` は親source repository検証用途のまま維持する。
- Hook contractは別の明示opt-inへ分離する。
- SessionStartの停止契約は実使用Codex versionで再確認する。
- baseline fingerprintは論理上のmatch identityを維持しつつ、persist時はSHA-256 digestだけを保存する。
- renameはGit mappingが得られないworktree状態もexact SHAで限定的に扱い、判定不能時はbaseline空へ落とさない。
- commit比較では比較開始treeを統一し、PR base tipとmerge baseを混在させない。
- local `lint:text` / `pnpm run verify` は `HEAD -> current worktree` を比較し、staged / unstaged / untrackedを対象にする。
- 新しい事実が見つかった場合はIssue本文へ機械的に合わせず、現在のsource / test / CIを正としてPlanを更新する。
