# Codex Hook契約・compact再注入・文章品質ゲート 実装計画

## 0. 依頼概要

- 対象Issue: #134 `test: Codex Hook契約テストとcompact後の指示再注入・文章品質ゲートを整備する`
- 実装branch: `issue-134-codex-hook-quality-gates`
- Plan作成時base: `main` / `3c5e35ed42712574eb9d89051820c9e27f137a16`
- 依存Issue: #135 `refactor: AGENTS.mdをスリム化し常駐指示と詳細運用仕様を分離する`
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
- session baselineのrenameは `Git rename mapping -> exact content SHA-256の一意一致 -> quality check不能` の順で解決し、対応付け不能時にbaseline空へ落とさない。
- local `lint:text` / `pnpm run verify` は `HEAD -> current worktree` を比較し、staged / unstaged / untracked Markdownを対象にする。
- local working-tree比較でも、HEAD側の既存fileがworktree-only moveされた場合は `Git rename mapping -> HEAD blobと現在候補のexact SHA-256一意一致 -> 比較不能` の順でfile identityを解決する。
- commit比較では比較開始commitを1つ確定し、変更path、baseline本文、rename mappingのすべてに同じtreeを使う。
- PR CIでは現行 `pull_request` workflowがcheckoutした `HEAD` をcurrentとして扱い、raw PR headを前提にしない。
- PR CIの比較開始commitは `git merge-base origin/<base branch> HEAD` とし、現行のmerge commit checkoutでは通常current base tipになる。
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

\#135後のroot `AGENTS.md` を唯一の正本とする。compact専用コピー、marker領域、二重管理を追加しない。

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

### 2.8 PR workflowのcheckout前提

現行 `Style Quality` は `pull_request` で起動し、`actions/checkout` にPR headを明示する `ref` を設定していない。`fetch-depth: 0` は設定済みである。

そのため文章品質gateは、workflowで実際にcheckoutされた `HEAD` をcurrentとして扱う。raw PR headだけを評価するための追加checkoutへ変更しない。

現行GitHub Actionsの `pull_request` workflowでは、merge可能なPRは通常 `refs/pull/<number>/merge` に対応するmerge commitがcheckoutされる。したがって、base branch tipを `B`、raw PR headを `P`、workflowでcheckoutされたmerge commitを `H` とすると、通常は次の形になる。

```text
M --- B
 \     \
  \ P---H
```

この場合、`git merge-base B H` は `B` である。

文章品質gateは「PR作成時のfork地点Mからの差分」を独自に再構築しない。現在のbase branchに既に存在する違反をPR由来と誤認しないため、現行workflowのmerge resultを評価する。

### 2.9 前提

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
3. 実際に使用するCodex CLI versionとHook schema。
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
| match正規化 | fingerprint比較で必要な場合のみ |

具体値は次の順で確定する。

1. Repository内で既に明文化されている表記規約。
2. Issue #134または関連Issueで明示されたrule。
3. それでも具体値が無いcategoryはproduction block ruleへ追加しない。

実装者が独自判断で禁止語、置換、allowlist、英語検出条件を作らない。

次はblock条件に含めない。

- 文脈依存の自然さ
- 読みやすさや論理性の主観評価
- 冗長さの意味評価
- AI生成文らしさ
- 未知の造語の完全検出
- AI Judge
- broad dictionary
- 形態素解析

### 3.3 実装時に確認すればよい事項

- 使用Codex versionの `SessionStart` 停止契約。
- `additionalContextLimit` の具体値。
- TOML parser dependencyの要否。
- PostToolUseで利用できる実際のtool matcher alias。
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
- similarity rename engine
- filename類似度判定
- patch parser
- Git履歴探索framework
- `--strict-harness` / `-StrictHarness` の既存責務

## 5. 変更方針

### Task 1: 実装開始時の状態を固定する

- [ ] `main`、branch HEAD、merge base、working treeを確認する。
- [ ] #135のstateとmerge有無を確認する。
- [ ] `tests/contracts/codex-hook-contract.test.ts`、`.codex/config.toml`、Hook scripts、`package.json`、`scripts/verify`、`scripts/verify.ps1`、`.github/workflows/ci.yml` の最新状態を確認する。
- [ ] 使用Codex CLI versionを記録し、そのversionに対応するHook schemaを確認する。
- [ ] #144以降にHook contractへ追加変更がないか確認する。

Issue本文より現在実装を優先し、既に成立しているcontractを別test directoryへ複製しない。

### Task 2: 既存Hook契約テストの不足分だけを埋める

- [ ] 現行 `codex-hook-contract.test.ts` とIssue #134のチェック項目を対応付ける。
- [ ] 既存のstdin / stdout / stderr / exit / cwd / side effect / Windows・Unix launcher caseは重複追加しない。
- [ ] 未確認の入力サイズ境界をprocess経由で追加する。
- [ ] `pre_tool_use_policy.mjs` は現行matcher契約どおり、`apply_patch` を `PreToolUse/Bash` policy対象へ勝手に追加しない。
- [ ] `log_event.mjs` は大きなpayloadでも保存fieldの上限、redaction、JSONL parseabilityを維持する。

### Task 3: `.codex/config.toml` を構造として検証する

少なくとも次を検証する。

- event名
- matcher
- command
- `command_windows`
- timeout
- `SessionStart` のcompact限定条件
- `additionalContextLimit` を使う場合の値

方針:

- TOML全仕様を自作しない。
- direct parserが無ければ、小さなtest-only parser dependencyと既存helper継続を比較する。
- parser追加の方が安全な場合だけdevDependencyを追加する。
- commandが指すscript pathはparse後に実在確認する。
- Windows / Unix commandはconfigured launcher contractで実行可能性も確認する。

### Task 4: #135完了ゲート

- [ ] #135がmerge済みであることを確認する。
- [ ] #135後のroot `AGENTS.md` が常駐指示として全文再注入する設計になっていることを確認する。
- [ ] このbranchへ最新 `main` を安全に取り込む。
- [ ] root `AGENTS.md` の実サイズを測る。
- [ ] #134側でmarker分類やコピーを追加しない。

\#135未完了ならTask 5へ進まない。

### Task 5: compact時のroot `AGENTS.md` 再注入を実装する

想定経路:

```text
Codex compact
  -> SessionStart(source=compact)
  -> .codex/hooks/session_start_context.mjs
  -> repository root解決
  -> root AGENTS.mdをUTF-8で読む
  -> structured JSON
     hookSpecificOutput.hookEventName = "SessionStart"
     hookSpecificOutput.additionalContext = <AGENTS.md全文>
```

成功契約:

- `source=compact`: root `AGENTS.md` 全文をstructured outputで返す。
- `source != compact`: 正常終了し、追加contextなし。

再注入を保証できないエラー:

- malformed Hook input
- repository root解決失敗
- root `AGENTS.md` 欠落
- root `AGENTS.md` read失敗
- structured output生成失敗

現在確認したCodex sourceと使用versionが同じ契約なら、次をexit code 0で返す。

```json
{
  "continue": false,
  "stopReason": "compact後の必須指示を再注入できなかった理由"
}
```

- 誤った `additionalContext` は返さない。
- `stopReason` へraw input、秘密情報、長いpath情報を含めない。
- 非0終了を停止手段として無条件に採用しない。
- process単体testだけでなく、使用versionのfocused runtime確認でcompact継続が実際に止まることを確認する。
- `additionalContextLimit` は使用versionの契約を確認したうえで設定する。

### Task 6: 決定論的な文章品質scannerを成立させる

Task 6へ入る前に「3.2 production文章品質rule表」を確定する。

`scripts/lint-text-quality.mjs` 等のscannerは次に限定する。

- 指定されたMarkdown fileまたは明示された本文をscanする。
- production ruleは `.codex/text-quality-rules.json` 等の1か所を正本にする。
- session baseline、Git、GitHub Actions eventを知らない。
- Markdown構造は既存markdownlintへ任せる。
- fenced code、inline code、URL、identifier等の除外はrule表で明示された場合だけ実装する。
- broad dictionary、AI Judge、形態素解析を追加しない。

出力は少なくとも次を持つ。

```text
path
line
rule_id
message
replacement   # 明示置換があるruleのみ
```

raw matchや行全体を不要に出力しない。

### Task 7: session開始baselineを最小状態で保持する

#### 7.1 保存する状態

`UserPromptSubmit` でtask開始時に次だけを保存する。

- 開始時 `HEAD` SHA
- repository root識別hash
- session識別値
- 開始時にHEADと異なるtracked Markdown path
- 開始時にHEADへ存在しないがworktree / indexに存在するMarkdown path
- 必要なpathのcontent SHA-256
- 必要なpathの違反fingerprint digestと件数

保存しないもの:

- Markdown本文
- raw normalized match
- raw Hook payload
- prompt全文
- token / secret / credential
- Agent実行履歴

開始時clean tracked Markdownは全件scanしない。変更対象になった時点で保存済み開始時 `HEAD` SHAのblobからbaselineを算出する。

#### 7.2 baselineの取得元

| 開始時状態 | baseline取得元 |
| --- | --- |
| HEADに存在しclean | 保存済み開始時 `HEAD` SHAのblob |
| HEADに存在しdirty | UserPromptSubmit時worktreeのmanifest |
| HEADに存在しないがtask開始時に存在 | UserPromptSubmit時worktreeのmanifest |
| task開始後に初めて作成 | baseline空 |

重要:

- session途中でcommitされても「現在のHEAD」へ基準を切り替えない。
- clean trackedのblob取得には保存済み開始時 `HEAD` SHAを使う。
- blob本文をmanifestへ永続化しない。
- blob取得不能時はbaseline空へ落とさずquality check不能とする。

#### 7.3 違反identityと保存形式

論理identity:

```text
rule_id + rule定義に従って正規化したmatch
```

persist:

```text
rule_id + SHA-256(normalized_match) + count
```

- SHA-256はNode.js標準 `crypto` を使う。
- 行番号、`message`、`replacement` はidentityへ含めない。
- 正規化はrule表で明示された場合だけ行う。
- 同一fingerprintはmultisetとして件数を保持する。

新規違反数:

```text
max(current_count - baseline_count, 0)
```

位置単位の由来追跡や独自diff engineは作らない。

#### 7.4 session内のfile identity / rename解決

次の順で解決する。

##### 1. Git rename mapping

Gitのrename情報が成立している場合はそのmappingを使う。

開始時pathのbaseline取得元は7.2に従う。

##### 2. exact content SHA-256の一意一致

Git rename mappingが得られず、開始時pathが現在worktreeから消えている場合だけfallbackする。

開始時content SHA-256:

- HEADに存在しclean: 保存済み開始時HEAD blobから算出
- HEADに存在しdirty: manifest保存値
- HEADに存在しないがtask開始時に存在: manifest保存値

現在候補:

- 現在worktreeに存在するMarkdown
- まだ別file identityへ対応付けられていないpath
- untrackedだけに限定しない
- staged addも含む

同一SHA-256候補が一意に1件だけならpure moveとして対応付ける。

##### 3. 対応付け不能

次では推測しない。

- move + 内容変更でexact SHAが一致しない
- 同一SHA候補が複数
- path / blob取得失敗

対応付け不能fileはbaseline空へ落とさず `quality check不能` とする。

- PostToolUse: fail-open + stderr診断
- Stop + `stop_hook_active=false`: 1回block
- Stop + `stop_hook_active=true`: allow

similarity、filename推測、edit distance、独自rename engineは追加しない。

#### 7.5 baseline lifecycle

- baselineが無ければ最初の通常 `UserPromptSubmit` で1回作る。
- Stopがblockしている間は上書きしない。
- Stop allow時に削除する。
- `stop_hook_active=true` でallowする場合も削除する。
- block時は保持する。
- 後から現在worktreeをbaselineとして作り直さない。
- retry count、workflow state machineを持たせない。

### Task 8: PostToolUseへ即時フィードバックを接続する

既存logging用 `PostToolUse` Hookは維持し、文章品質用handlerを別責務として追加する。

対象tool:

- 実装時のCodex CLI versionでMarkdownを書き換え得るtool name / matcher aliasを確認する。
- Bashと `apply_patch` 相当を検討対象にする。
- 存在しないtool名を推測してconfigへ固定しない。
- matcherで限定できない場合は `tool_name` でread-only toolをearly returnする。
- Markdown変更0件ならscannerを実行しない。

対象path:

- tool payloadから安全に変更pathを取得できる場合はそのMarkdownだけをscanする。
- pathを安全に確定できない場合だけGit差分へfallbackする。
- Repository全体を毎回scanしない。

障害時:

- baseline unavailable
- session rename mapping不能
- Git差分取得失敗
- rule読込失敗
- scanner失敗
- temp state読込失敗

ではfail-open + stderr診断とする。

PostToolUseは早期フィードバックであり完了判定ではない。

### Task 9: Stopへ完了前品質ゲートを接続する

| 状態 | `stop_hook_active` | 動作 |
| --- | --- | --- |
| valid baseline + 新規違反あり | `false` | block |
| valid baseline + 新規違反あり | `true` | allow + 診断 |
| valid baseline + 新規違反なし | 任意 | allow |
| quality check不能 | `false` | 1回block |
| quality check不能 | `true` | allow + 診断 |
| 対象Markdown変更なし | 任意 | allow |

`quality check不能` には少なくとも次を含む。

- baseline file欠落 / 破損
- baseline作成失敗
- 開始時HEAD blob取得失敗
- session rename mapping不能
- Git差分取得失敗
- rule file読込失敗
- scanner失敗
- temp state読込失敗

独自retry counterを追加しない。

### Task 10: Repository-level文章品質gateを実装する

#### 10.1 scannerとGit比較を分離する

純粋scanner:

```text
scripts/lint-text-quality.mjs
```

Repository-level gate候補:

```text
scripts/check-text-quality-changes.mjs
```

Git比較用scriptは次だけを担当する。

1. base ref / modeから比較snapshotを確定する。
2. 変更Markdown pathとfile identityを解決する。
3. baseline側 / current側本文を取得する。
4. scannerを両側へ適用する。
5. fingerprint multiset差分を計算する。
6. 新規違反があれば非0終了する。
7. 比較自体を安全に成立させられなければ、違反0件として扱わず非0終了する。

Git commandは既存 `summarize-impact.ts` と同様、`execFile` / `execFileSync` と引数配列を使う。

想定interface:

```text
node scripts/check-text-quality-changes.mjs --base-ref <ref>
node scripts/check-text-quality-changes.mjs --base-ref <ref> --working-tree
```

#### 10.2 local working-tree比較mode

`--working-tree` あり:

```text
HEAD -> current worktree
```

対象:

- staged Markdown
- unstaged Markdown
- untracked Markdown

local既定:

```text
base-ref = HEAD
```

`git diff`だけではuntrackedを拾えないため、既存patternどおり `git ls-files --others --exclude-standard` 等で現在候補へ含める。

##### working-tree file identity

Repository-level local gateでもworktree-only moveを新規fileと誤認しない。

次の順で解決する。

1. Git rename mappingが成立している場合は使う。
2. HEAD側Markdown pathが現在worktreeから消えており、Git mappingが無い場合は、HEAD blobのcontent SHA-256と現在の未解決Markdown候補を比較する。
3. 同一SHA-256候補が一意に1件だけならpure moveとして対応付ける。
4. exact matchできない、または候補が複数なら比較不能とする。

現在候補には、少なくともstaged addとuntracked Markdownを含める。

例:

```text
HEAD:
docs/a.md  # 既存違反あり

worktree:
D  docs/a.md
?? docs/b.md
```

`docs/a.md` のHEAD blobと `docs/b.md` の現在contentがexact matchする場合だけpure moveとして対応付け、既存違反を新規扱いしない。

##### working-tree比較不能

次ではbaseline空の新規fileとして処理しない。

- deleted HEAD pathと現在候補のexact SHAが一致しないため、安全にmoveかdelete+newかを判別できない
- 同一SHA候補が複数ある
- baseline blob / current content取得に失敗する

local `lint:text` / `pnpm run verify` では比較不能を非0終了として明示する。

HookのようなPostToolUse fail-openは使わない。Repository-level gateは検証commandなので、比較不能をPASSにしない。

similarity、filename推測、edit distanceは追加しない。

#### 10.3 commit比較mode

`--working-tree` なしでは、比較開始commitを1回確定する。

```text
comparison_base = git merge-base <base-ref> HEAD
```

以降は同じtreeを使用する。

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

- changed pathsだけ `base-ref...HEAD`、baseline本文だけ `base-ref:<path>` という混在をしない。
- changed path、baseline本文、rename mappingは同一の `comparison_base` を使う。
- commit比較はGitが確定できるrename mappingを使い、独自similarity engineを追加しない。

#### 10.4 PR CI

現行workflowのcheckout方式を変更しない。

```text
base_ref = origin/${{ github.base_ref }}
current = workflowでcheckoutされたHEAD
comparison_base = git merge-base base_ref current
comparison = comparison_base -> current
```

現行 `pull_request` workflowではcurrentは通常PR merge commitである。

例:

```text
M = PR branchがbaseから分岐した地点
B = workflow実行時のbase branch tip
P = raw PR head
H = GitHubが生成しworkflowでcheckoutしたmerge commit

M --- B
 \     \
  \ P---H
```

この場合:

```text
git merge-base B H = B
comparison_base = B
comparison = B -> H
```

したがって、次を評価する。

- current base branchだけに存在する違反をPR由来の新規違反として数えない。
- PR側の変更がmerge resultへ追加した違反は検出する。
- changed paths、baseline本文、rename mappingのすべてで `B -> H` を使う。

raw PR headを評価するために `actions/checkout` の `ref` を変更しない。

`Style Quality` は `fetch-depth: 0` を維持し、`origin/<base branch>` とmerge baseを解決できる履歴を取得する。

#### 10.5 push CI

```text
base_ref = github.event.before
```

空、zero SHA、利用不能の場合は既存CI patternどおり `HEAD^` へfallbackする。

commit比較modeで `comparison_base` を確定し、変更path、baseline本文、rename mappingへ同じtreeを使う。

#### 10.6 `schedule` / `workflow_dispatch`

```text
base_ref = HEAD^
comparison_base = git merge-base HEAD^ HEAD
comparison = comparison_base -> HEAD
```

直前commitから増えた違反を確認する。暗黙skipしない。

現在のRepositoryはroot commitではないためroot commit専用の履歴探索frameworkは作らない。`HEAD^` を解決できない場合はgate failureとする。

#### 10.7 CIから渡す値

GitHub eventの解釈はworkflow側で行い、gate scriptへbase refを明示する。

```text
pull_request      -> origin/${{ github.base_ref }}
push              -> ${{ github.event.before }}（空/zero SHAならHEAD^）
schedule          -> HEAD^
workflow_dispatch -> HEAD^
```

clean checkoutのCIでlocal `HEAD -> worktree` modeを誤実行し、差分0件でPASSする構造にしない。

### Task 11: local verify / Harness / CIへ接続する

#### `pnpm run verify`

- [ ] `lint:text` をmarkdownlint近傍で実行する。
- [ ] local `lint:text` は `HEAD -> current worktree` を使用する。
- [ ] working-tree pure moveのexact SHA fallbackも `lint:text` から通る。
- [ ] comparison不能は非0終了する。
- [ ] Hook contractは既存 `test:contracts` に残す。
- [ ] 重複した `test:codex-hooks` suiteを原則追加しない。

#### `scripts/verify` / `scripts/verify.ps1`

通常:

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

- opt-in指定時だけfocused Hook contractを追加実行する。
- 文章品質contractを別fileへ分離した場合は同じopt-inへ接続する。
- 通常モードをpnpm/Vitest必須へ変えない。
- strict HarnessとHook contract optionの意味を混在させない。
- Bash / PowerShellで同じ責務を持たせる。

#### GitHub Actions

Ubuntu:

- 既存 `Vitest (contracts)` を維持する。
- `Style Quality` へ文章品質gateを追加する。
- `Style Quality` の文章品質stepでeventごとのbase refを明示する。
- PRでは現行checkoutされたmerge `HEAD` をcurrentとしてcommit比較modeを実行する。
- `fetch-depth: 0` を維持する。

Windows:

- Hook contract専用のfocused CIを追加する。
- 少なくとも `tests/contracts/codex-hook-contract.test.ts` をWindows runnerで実行する。
- 文章品質HookのWindows契約を別test fileへ分離した場合はそれも対象にする。
- Product test、build、E2E、Style Quality全体をWindowsへ複製しない。

Windows contractで確認する対象:

- `command_windows`
- PowerShell / `cmd.exe` quoting
- path separator
- 空白・日本語path
- stdin / stdout / stderr
- UTF-8
- temp path
- nested cwd / repository root解決

### Task 12: 文書を更新する

- `docs/reference/codex-safety-harness.md` にSessionStart / text quality gateの責務、fail-open / fail-closeを反映する。
- `docs/reference/codex-implementation-harness.md` は必要箇所だけ更新する。
- `AGENTS.md` へHook詳細を再掲しない。
- production ruleの正本pathとmarkdownlintとの責務分離を記載する。
- Hook contract用verify opt-inを追加した場合は実行方法を記載する。
- strict Harnessの既存説明をHook contract用へ書き換えない。
- local / PR / push / schedule / workflow_dispatchの文章品質比較基準を実装と同じ内容で記載する。

## 6. 検証方法

### 6.1 focused Hook contract

```bash
pnpm exec vitest run tests/contracts/codex-hook-contract.test.ts --no-file-parallelism --maxWorkers=1
```

文章品質testを分離した場合:

```bash
pnpm exec vitest run tests/contracts/codex-text-quality.test.ts --no-file-parallelism --maxWorkers=1
```

### 6.2 SessionStart contract

確認case:

- `source=compact` + root `AGENTS.md` 読込成功
- compact以外では追加contextなし
- nested cwd
- malformed JSON input
- repository root解決失敗
- `AGENTS.md` 欠落
- read failure
- UTF-8本文
- JSON escaping
- `AGENTS.md` 実サイズ
- `additionalContextLimit` 境界
- Unix configured command
- Windows configured command
- 使用Codex versionのfail-close structured output
- 現行sourceと同じ契約なら `continue:false` で停止し、非0終了だけでは停止扱いにしない

### 6.3 session baseline / rename contract

- persisted baselineにraw normalized matchが含まれない
- 開始時clean trackedに既存違反がある
- session途中でcommitしてもstart HEAD baselineが変わらない
- 開始時dirty tracked
- 開始時staged add
- 開始時untracked
- task中の新規file
- tracked rename
- clean tracked -> unstaged filesystem pure move
- dirty tracked -> unstaged filesystem pure move
- start staged add -> filesystem move
- start untracked -> staged add move
- exact SHA候補複数 -> quality check不能
- move + 内容変更でmapping不能 -> quality check不能
- baseline file欠落 / 破損
- start HEAD blob取得失敗
- baseline作成失敗後に現在状態をbaseline化しない

### 6.4 Repository-level working-tree gate contract

次をfixtureで確認する。

#### 通常変更

- staged変更を検出する
- unstaged変更を検出する
- untracked Markdownを検出する
- HEAD側にしかない既存違反を新規扱いしない

#### worktree-only pure move

```text
HEAD:
docs/a.md  # 既存違反あり

worktree:
D  docs/a.md
?? docs/b.md
```

- Git rename mappingが無いことを前提にする。
- HEAD blobと `docs/b.md` のcontent SHA-256一意一致でpure moveへ対応付ける。
- `docs/a.md` に元からある違反を新規扱いしない。

#### staged rename

- Git rename mappingが成立する場合はそれを優先する。

#### 比較不能

- deleted HEAD pathと現在候補が内容変更されexact matchしない -> 非0終了
- 同一SHA候補複数 -> 非0終了
- HEAD blob / current content取得失敗 -> 非0終了

baseline空へ落としてPASSまたは新規違反扱いしない。

### 6.5 commit比較 / PR contract

#### 同一tree契約

- changed paths
- baseline content
- rename mapping

が同じ `comparison_base` を使う。

#### PR merge checkout fixture

```text
M = PR fork地点
B = current base tip
P = raw PR head
H = BとPを親に持つworkflow checkout merge commit

M --- B
 \     \
  \ P---H
```

確認:

```text
git merge-base B H = B
comparison_base = B
comparison = B -> H
```

contract:

- B側だけに追加された既存違反をPR新規違反として数えない。
- P側の変更によりHへ追加された違反は検出する。
- changed paths / baseline本文 / rename mappingはすべてBを開始treeにする。
- raw PR headへcheckout方式を変更しなくても成立する。

### 6.6 PostToolUse contract

- 新規違反なし -> allow
- 今回増えた違反あり -> block reason
- 既存違反のみ -> allow
- 既存 + 新規混在 -> 新規分だけ返す
- read-only tool -> early return
- Markdown変更0件 -> lintしない
- target path特定可能 -> 対象pathだけ評価
- path不明 -> Git差分へfallback
- baseline unavailable -> fail-open + stderr
- session rename mapping不能 -> fail-open + stderr
- scanner / rule / Git failure -> fail-open + stderr

### 6.7 Stop contract

- `stop_hook_active=false` + 新規違反なし -> allow
- `false` + 新規違反あり -> block
- `true` + 同一違反あり -> allow
- quality check不能 + `false` -> 1回block
- quality check不能 + `true` -> allow
- allow時baseline cleanup
- block時baseline維持

### 6.8 `lint:text` 比較基準

Hook:

```text
session baseline -> current worktree
```

local:

```text
HEAD -> current worktree
```

PR:

```text
base_ref = origin/<base branch>
current = workflow checkout HEAD
comparison_base = git merge-base base_ref current
comparison_base -> current
```

push:

```text
github.event.before -> HEAD
```

無効before:

```text
HEAD^ -> HEAD
```

schedule / workflow_dispatch:

```text
HEAD^ -> HEAD
```

### 6.9 Harness検証

```bash
bash scripts/verify
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1
./scripts/verify.ps1 -HookContracts
```

source repository layoutが存在し、strict Harnessへの変更影響がある場合だけ既存strict回帰も確認する。

### 6.10 Repository検証

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

Windows:

```powershell
./scripts/verify.ps1
./scripts/verify.ps1 -HookContracts
```

## 7. リスクと未解決事項

### 7.1 #135未完了

compact再注入だけは#135完了前に実装しない。仮の抽出方式を作らない。

### 7.2 Codex version差

Hook schema、matcher、`additionalContextLimit`、block output、SessionStart停止契約は使用versionを確認する。

### 7.3 production文章ruleの具体値

具体値が未確定ならscanner構造やHook契約は進めても、production文章品質gateを完成扱いにしない。

実装者が禁止語、置換表、allowlistを勝手に作らない。

### 7.4 session file identity

Sessionではstart HEADだけでなく開始時worktree状態を保持する必要がある。最小manifest以外のsession managerへ広げない。

### 7.5 local working-tree move

`git diff`だけではuntracked destinationをrenameとして扱えない。

local gateではGit mappingが無いdeleted HEAD pathについて、HEAD blobと現在未解決候補のexact SHA一意一致だけをfallbackとする。

判定不能をbaseline空へ落とさず、Repository-level gate failureとする。

### 7.6 PR merge checkout

現行 `pull_request` workflowではraw PR headではなくmerge resultをcheckoutする前提で設計する。

base tip `B` とmerge `HEAD=H` のmerge baseは通常 `B` である。PR fork地点 `M` を比較開始treeだと決め打ちしない。

raw PR headを評価するためだけにcheckout方式を変更しない。

### 7.7 `scripts/verify` の既存責務

通常モードとstrict Harnessの意味を変えない。Hook contractは別opt-inに限定する。

## 8. 成果物

実装完了時の想定成果物:

- 既存Hook contract不足分テスト
- compact限定 `SessionStart` Hook
- 使用Codex versionに合ったSessionStart fail-close契約
- 決定論的文章品質scanner
- Repository-level Git比較CLI
- 明文化されたproduction文章品質rule
- raw matchを保存しない最小session baseline
- session rename mapping / exact SHA fallback / quality check不能処理
- local working-tree rename mapping / exact SHA fallback / 比較不能処理
- commit比較で統一されたcomparison tree
- PR merge checkoutに整合した文章品質gate
- `pnpm run verify` 接続
- Bash / PowerShell Hook contract opt-in
- 既存strict Harness責務の維持
- Ubuntu文章品質gate
- Windows focused Hook contract CI
- 必要なHarness reference更新

## 9. 実装前自己レビュー

実装へ進む前に次を確認する。

- [ ] #135依存を維持している。
- [ ] Issue #134の範囲を越えていない。
- [ ] `tests/contracts/codex-hook-contract.test.ts` を正本としている。
- [ ] 新しいHook test frameworkを作っていない。
- [ ] session managerやdiff frameworkを作っていない。
- [ ] similarity rename、filename推測、edit distanceを追加していない。
- [ ] Windows CIはfocused contractに限定している。
- [ ] 通常verifyを重くしていない。
- [ ] strict Harnessの意味を変更していない。
- [ ] Hook contract opt-inは既存Vitestを呼ぶ薄い入口である。
- [ ] SessionStartの非0終了を停止手段として無条件に扱っていない。
- [ ] fingerprintとmultiset差分の意味が固定されている。
- [ ] baselineへraw normalized matchを保存していない。
- [ ] clean tracked baselineはstart HEAD blobからlazy評価する。
- [ ] session renameはGit mapping -> exact SHA -> quality check不能の順である。
- [ ] local working-tree gateもGit mapping -> HEAD blob exact SHA -> comparison failureの順である。
- [ ] local comparison不能をbaseline空へ落としていない。
- [ ] commit比較でchanged path / baseline本文 / rename mappingが同じcomparison treeを使う。
- [ ] PR currentはworkflow checkout `HEAD` であり、raw PR headを仮定していない。
- [ ] 現行PR merge checkoutではbase tip -> merge resultを評価する。
- [ ] production文章品質ruleを実装者が推測しない。
- [ ] Hook failureとlint violationを区別している。
- [ ] raw prompt / tool input / Markdown本文をbaselineへ保存しない。

## 10. 備考

- Plan作成時の `main` HEADは `3c5e35ed42712574eb9d89051820c9e27f137a16`。
- PR #144はmerge済みで、そのWindows timeout修正を前提とする。
- Issue #135はPlan更新時点でopen。compact再注入は#135 merge後に開始する。
- 既存 `scripts/spec/summarize-impact.ts` とCIの差分取得patternを再利用する。
- session file identityとRepository-level working-tree file identityは目的が異なるため、failure処理を混同しない。
- HookではPostToolUseをfail-openにできるが、`pnpm run lint:text` は検証commandなのでcomparison不能をPASSにしない。
- PR CIはworkflowでcheckoutされたmerge resultをcurrentとして扱い、現在のbase branchに既にある違反をPR由来と誤認しない。
- 新しい事実が見つかった場合はIssue本文へ機械的に合わせず、現在のsource / test / CIを正としてPlanを更新する。
