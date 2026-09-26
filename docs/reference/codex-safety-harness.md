# Codex安全ハーネス運用ガイド

## 目的

- リポジトリ内で Codex を使う際に、危険な実行オプションやコマンドを減らすための実務的なガードレールを提供する。
- `AGENTS.md` のルールに加え、`execpolicy` ルールと wrapper で技術的制御を追加する。

## 構成

- `scripts/codex-safe.ps1`
  - Codex 起動 wrapper
  - 危険 CLI 引数（`--dangerously-bypass-approvals-and-sandbox`, `-c/--config`, `--add-dir` など）を拒否
  - 安全デフォルト（`--sandbox`, `--ask-for-approval`）を固定注入
  - 起動前に `codex execpolicy check` でルールのスモークテストを実施（preflight）
  - JSONL ログ（既定: `.codex/logs/codex-safe-YYYYMMDD.jsonl`、`--run-id` 指定時: `.codex/runs/<run_id>/logs/codex-safe-YYYYMMDD.jsonl`）に開始/ブロック/preflight/起動イベントを追記
- `scripts/codex-safe.sh`
  - bash 向け Codex 起動 wrapper（PowerShell 版と同方針）
  - 危険 CLI 引数の拒否、`--sandbox` / `--ask-for-approval` 固定注入、preflight を実施
  - `--print-command` / `--preflight-only` / `--allow-search` / `--run-id` / `--log-path` をサポート
- `.codex/agents/*.toml`
  - project-scoped custom agents の定義
  - `code_researcher` / `implementation_researcher` / `test_investigator` は read-only 調査 agent
  - `implementation_worker` は親 agent が承認した小さく限定された実装だけを扱う workspace-write agent
  - writable subagent は原則 1 タスクにつき 1 つだけ使い、削除、rename、git mutation、スコープ外編集をしない
- `.codex/rules/*.rules`
  - `execpolicy` ルール
  - 読み取り系の allow、広い prompt、破壊系の forbidden を定義
- `.codex/rules-auto-net/*.rules`
  - `--preset auto-net` 指定時だけ追加で読み込む execpolicy ルール
  - network / package manager / build / test 系を allow に寄せ、shell wrapper 系は hook 検証後まで forbidden にする
- `.codex/config.toml`
  - project-scoped default: `sandbox_mode = "workspace-write"`, `approval_policy = "never"`, `web_search = "cached"`
  - `sandbox_workspace_write.network_access = true`, `writable_roots = []`
  - 通常のinteractive入口はdirect `codex`。Codexのapproval promptは表示せず自動拒否する。
  - `codex-safe safe` は `--ask-for-approval on-request` と `sandbox_workspace_write.network_access=false` を明示し、local例外操作・recoveryの承認経路として使える。network例外操作にはapprovalとnetwork sandbox昇格のruntime検証が必要。
  - `readonly` はread-only sandbox / on-request、`auto-net` はworkspace-write / never / network trueを明示する。
  - login shell は `allow_login_shell = false`
  - Codex 0.147.0で有効なproject profileに依存せず、wrapperがpresetごとのsandbox／approvalを明示注入する
  - `safe` の network false と `auto-net` の network true はwrapperが明示overrideする
  - PreToolUse/Bash hook: `.codex/hooks/pre_tool_use_policy.mjs`
  - Windows native launcher: `.codex/hooks/pre_tool_use_policy_windows.ps1`
  - 文章品質Hook: `.codex/hooks/text_quality_gate.mjs`
- `.codex/text-quality-rules.json`
  - Repository固有のliteral／regex ruleの正本。現在は4個の明示的な置換ruleをconfiguredで管理し、一般日本語ruleはここへ複製しない。
- `.textlintrc.json`
  - 一般日本語production ruleの正本。評価用presetから個別に採用した2 ruleを既存5 ruleへ加えた7個の個別ruleだけを有効化し、preset、AI Judge、broad dictionary、独自の自然さ判定は追加しない。`no-unmatched-pair`は技術文書のinline code等を誤検知するため採用しない。
- `scripts/lint-text-quality.mjs` / `scripts/check-text-quality-changes.mjs`
  - 前者はcustom literal／regexとtextlintの個別ruleをMarkdown本文へ適用し、後者はbaselineとcurrentのfingerprint multisetをGit tree単位で比較するほか、同じMarkdown列挙処理を使う全件scan modeを提供する。
- `.codex/requirements.toml`
  - 管理配布/機能有効化時に使う補助的な最小要件定義
- `scripts/verify`
  - 品質ゲート実行の統一エントリポイント
  - execpolicy 判定、bash wrapper preflight、bash/PowerShell テスト（可能環境のみ）を実行
  - source repo maintainer は配布前に `--strict-harness` / `-StrictHarness` を追加実行し、spec / version / CI / update-planning contract も確認する
- `scripts/cleanup-runs.sh` / `scripts/cleanup-runs.ps1`
  - generated run artifact cleanup の preview / confirm entry point
  - デフォルトで削除せず、明示 confirm がある場合だけ既知 artifact を削除する

関連する上位ガイド:

- `docs/reference/codex-implementation-harness.md`
  - `codex-safe` / `codex-task` / `codex-sandbox` の使い分け

## 推奨起動方法

PowerShell から実行:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1
```

非対話実行の例:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 exec "作業内容..."
```

read-only preset:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -Preset readonly
```

auto-net preset:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -Preset auto-net
```

preflight のみ:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1 -PreflightOnly
```

bash から実行:

```bash
bash scripts/codex-safe.sh
```

auto-net preset:

```bash
bash scripts/codex-safe.sh --preset auto-net
```

通常のinteractive作業ではrepository rootからdirect `codex`を起動します。`approval_policy = "never"`ではsandbox approvalやexecpolicy `prompt`などの承認promptは自動拒否されるため、高影響操作は実行しません。`git switch`は通常のbranch切替としてprompt対象から除外し、destructive switchは既存Hookがdenyします。

`git checkout`、merge／rebase recovery、local branch deleteはpromptのままです。明示依頼されたlocal例外操作だけは、network昇格なしの`codex-safe safe`（on-request）で実行できます。`gh api`とmerge／close／release／repo deleteなど高影響GitHub CLI操作もpromptを維持します。これらのnetwork例外操作では、safe wrapperのexecpolicy approvalとnetwork sandbox昇格がread-only runtime validationで確認できた場合だけ承認経路として使います。通常の直接実行をwrapperへ自動fallbackしません。

`auto-net` は明示指定時だけ有効な既存presetです。wrapper default は `safe` のままです。direct project default networkとは独立し、wrapperがnetwork設定を明示します。

## 何をブロックするか（例）

- `--dangerously-bypass-approvals-and-sandbox`
- `-c` / `--config`
- `--add-dir`
- `-C` / `--cd`
- `-s` / `--sandbox`
- `-a` / `--ask-for-approval`
- `-p` / `--profile`
- `--enable` / `--disable`
- raw `--full-auto`

## 削除禁止

- プロジェクト配下の読み取りとファイル作成・編集は、通常の作業では承認なしで行ってよい。
- shell / PowerShell / git command による削除は禁止する。対象例は `rm`, `del`, `erase`, `Remove-Item`, `rmdir`, `unlink`, 通常の `git rm`。
- `cleanup-runs` は generated run artifact の限定 cleanup 用例外 command だが、preview-only default、confirm 必須、repo root 外 / symlink candidate 拒否を満たす前提でのみ使う。
- `auto-net` は common Full Access policyとは別の非対話presetであり、`git add`, `git commit`, `git push`, `git rm`, `git reset`, `git clean` など既存の禁止を維持する。
- `auto-net` では delete / rename を含む patch operation も禁止する。不要に見えるファイルは削除候補として `REPORT.md` に記録する。
- `implementation_worker` も削除、rename、移動、git mutation、delete / rename を含む patch operation を行わない。
- 追跡済み runtime artifact を配布対象から外す migration では、明示された対象に限って `git rm --cached -- <path>` を使ってよい。物理ファイルは削除しない。

## apply_patch operationの方針

`apply_patch` は通常のファイル編集には使ってよい。ただし delete / rename / move は、意図が見えづらく影響が大きいため、通常編集とは分けて扱う。

| 操作 | readonly | direct `codex` | safe | auto-net |
| --- | --- | --- | --- | --- |
| 既存ファイルの内容変更 | 不可 | 可 | 可 | 可 |
| 新規ファイル作成 | 不可 | 可 | 可 | 可 |
| ファイル削除 | 不可 | 原則不可。明示された対象とレビュー可能な理由がある場合のみ候補化 | 原則不可。明示された対象とレビュー可能な理由がある場合のみ候補化 | 不可 |
| rename / move | 不可 | 要レビュー。必要性、影響、migration を説明する | 要レビュー。必要性、影響、migration を説明する | 不可 |
| 削除候補の `REPORT.md` 記録 | 可 | 可 | 可 | 可 |

判断に迷う場合は、delete / rename / move を実行せず、`REPORT.md` に削除候補または移動候補として記録する。

## Hook guard

- Full Access common policyの正本は `.codex/hooks/pre_tool_use_policy.mjs` だけである。`PreToolUse` の `Bash` matcher（`^Bash$`）から `tool_input.command` だけを受け取り、Section 3 Matrix相当のG1-G10／N1-N4を判定する。
- Windows nativeでは `command_windows` から `.codex/hooks/pre_tool_use_policy_windows.ps1` を経由してNodeへstdinを転送する。repository rootはroot／nested cwdのどちらからも解決する。
- malformed／schema-invalid inputはstdout空、stderr非空、exit 2でfail-closeする。denyは `hookSpecificOutput.permissionDecision = "deny"` のstructured output、safeはexit 0かつ無出力とする。
- Git operationは既存のshell boundary内にある各Git invocationを独立して共通解析し、`git -C <path> <subcommand> ...` でも通常形式と同じG1-G10／N1-N4のpolicyを適用する。1つでもDENY対象のinvocationがあればcommand全体をDENYする。
- 複数の`-C <path>`は出現順に累積し、後続pathを直前のeffective cwdから解決する。context未指定時のprotected branch判定は、各invocationが選択したeffective repositoryを対象にする。同じsubcommandが複数あるcommandでも全invocationを評価する。
- `--git-dir`／`--git-dir=<path>`／`--work-tree`／`--work-tree=<path>`はrepository-changing global optionとして区別する。完全なGit CLI parserは実装せず、commit／merge／cherry-pick／revert／pull／am／pushなどcontext-sensitive mutationではfail-closeし、read-only operationはblanket denyしない。解析不能なGit invocationは曖昧なcontextでALLOWしない。
- Bash系の`git`とWindows／PowerShellの`git.exe`は同一Git executableとして扱う。subcommand後はquote-awareなargument tokenで評価し、quote付きの`--force`、`--amend`、`-fd`、`-D`、`HEAD:main`も通常の危険optionと同じ判定になる。
- pushは明示的に一意な単一refspecだけをALLOW候補とし、protected destination、force／delete、`--all`／`--branches`、matching、wildcard、複数refspec、remote／URL／pathだけのimplicit push、runtime config／environmentでdestinationが変わるpushはfail-closeする。通常の`git fetch`は維持しつつ、protected local ref destination、`update-ref`、`worktree add -B`によるprotected branch変更はDENYする。
- `-c`／`--config`／`--config-env`、inline `GIT_DIR`／`GIT_WORK_TREE`／`GIT_CONFIG_*`によるruntime semantics変更を完全に解決せず、context-sensitive mutationではfail-closeする。完全なshell／Git parser、alias expansion、PowerShell state tracking、wrapper、`.git`直接書換えは対象外である。
- shell command前半の`git switch`／branch switching formの`git checkout`、`cd`／`chdir`／`pushd`／`Set-Location`／`sl`、persistent Git environment変更の後にcontext-sensitive Git mutationが続く場合は、実行時contextをsimulationせずcommand全体をfail-closeする。単独のbranch switch、cwd変更後のread-only Git、`git config --get`／`--list`等のread-only configは維持する。
- operation単体でdeny理由が確定するG1〜G9等はrepository branch context未解決でもその既存decisionを返す。通常の`git fetch origin`などlocal protected ref destinationを持たないsafe fetchはALLOWし、branch contextが必要なmutationはcontext未解決時にG10でfail-closeする。
- context未解決のG10は保留して後続Git invocationも評価し、後続の具体的denyを優先する。全invocationに具体的denyがない場合だけ保留したG10を返す。
- `update-ref -m <reason>`のoption値、`fetch`／`pull`の`--refmap`／`--stdin`、protected local ref destination、state-changing `git config`、protected branchの`branch -d`／`--delete`／`-m`／`--move` targetをtoken単位で検査し、target不明・unsupported syntaxは曖昧なcontextでALLOWしない。Bashのline continuationと限定的なunquoted option escapeを正規化するが、完全なshell／Git parserは実装しない。
- `.codex/config.toml` は `features.hooks = true` を使い、deprecatedな `codex_hooks` や旧PowerShell／Python policyは参照しない。`apply_patch` はmatcher外であり、common HookはそのAdd／Update／Delete／Moveを検査しない。
- `.codex/rules/**` はstatic prefixだけのdefense-in-depthであり、common policyの正本ではない。`auto-net` のshell wrapper禁止などpreset固有のrulesは別契約として維持する。
- Phase 1 では shell wrapper 系の `bash -lc`, `sh -c`, `pwsh -Command`, `cmd /c` は auto-net rules 側で forbidden 寄りに扱う。

## Hook trust運用

### project trustとHook definition trust

RepositoryをCodexで信頼済みにすることと、Repositoryの `.codex/config.toml` に定義された個々のproject-local Hookを信頼することは別条件です。project-local Hookを実行可能にするには、少なくとも次の両方を満たしてください。

- projectの `.codex/` レイヤーが信頼されている。
- 実行する非managed Hookの現在の定義がレビュー済みで、信頼されている。

Repositoryを一度信頼しただけで、その後に追加されたHookや変更されたHookが自動的に実行される、とは扱いません。Codexは非managed Hookの現在の定義に紐づくhashでtrustを管理し、新規または変更された定義を再レビュー対象にします。未信頼のHookは実行前にskipされます。

`.codex/config.toml` のHookについて、追加、削除、`command`変更、`command_windows`変更、matcher変更、timeoutなどの定義変更があった場合は、以前のtrust状態を前提にしないでください。`git pull`やbranch切替の結果として定義が変わった場合も同じです。現在のHook一覧と定義を `/hooks` で確認し、必要なHookだけを内容確認後に再度trustします。

### `/hooks`での確認手順

Repository rootで、通常使用しているinteractive CLIを起動します。Repository標準wrapperを使う場合は次を実行します。

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-safe.ps1
```

bash:

```bash
bash scripts/codex-safe.sh
```

Codex interactive CLIが起動したら、そのCodexセッション内で次を実行します。

```text
/hooks
```

`/hooks` はinteractive CLI内のslash commandです。shell commandとして `codex /hooks` のように実行するものではありません。

`/hooks` では、少なくとも次を確認してください。

- Hookの定義元が対象Repositoryの `.codex/config.toml` である。
- 追加・変更されたHookがレビュー待ちになっていない。
- 実行予定のHookの `command`、`command_windows`、matcher、timeoutなどがRepositoryの意図した定義と一致している。
- 実行予定のHookが信頼済みになっている。
- Hookが意図せず無効化されていない。

表示されたHook定義をRepository内の期待値と照合してから、対象Hookを個別にtrustします。安全Hookであっても、表示内容を確認せず機械的にすべてtrustする運用にはしません。

### `CODEX_HOME`の一致

Hookのtrust情報はRepositoryではなくCodexユーザー側の状態です。Hookをレビュー・trustしたinteractive CLIと、実際にRepositoryでCodexを使用するinteractive／non-interactive環境は、同じ `CODEX_HOME` を使用してください。異なる `CODEX_HOME` では同じtrust状態を参照しない可能性があります。

確認例:

PowerShell:

```powershell
$env:CODEX_HOME
```

bash:

```bash
echo "$CODEX_HOME"
```

現在の公式environment variables仕様では、`CODEX_HOME` 未設定時の既定値は `~/.codex` とされています。ユーザー固有の絶対pathをRepository文書へ固定せず、trust確認と実行で同じ環境値を使うことを優先します。

### Git更新後の運用

毎回の `git pull` やbranch切替だけを理由に、無条件で `/hooks` を要求する必要はありません。Hook定義に変更がある場合だけ、次の順で再確認します。

```text
git pull / branch切替
↓
.codex/config.tomlのHook定義に追加・変更がある
↓
Codex interactive CLIを起動
↓
/hooks
↓
変更されたHook定義の定義元・内容・状態を確認
↓
確認したHookだけをtrust
↓
通常作業
```

Hook定義に変更がない場合は、毎回のpullごとに同じレビューを繰り返す運用にはしません。ただし、使用する `CODEX_HOME` を変えた場合やHookを無効化した場合は、実行前に状態を再確認してください。

### contract testと実runtime確認の境界

次の確認は別の証拠です。

- Hook contract PASS: config構造、launcher、stdin／stdout、exit、failure処理などのRepository側契約を確認します。
- `/hooks`でtrust済み: Codexが対象の非managed Hookを実行可能な状態であることを確認します。
- 実runtime確認: Codex本体から実際に対象eventがHookへ配送され、Hookが実行されたことを確認します。

Hook contract PASSだけでは、Hookが実Codex上で確実に発火した証拠にはなりません。反対に、`/hooks`でtrust済みであることだけで、launcherやHook scriptのstdin／stdout／exit契約を検証したことにもなりません。両方を別々に確認してください。

### Codex未起動のHook検証と診断

Repository側のHookをCodex Hostから切り離して確認するときは、次の2つを実行します。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

- `test:hooks` は既存のHook contractを正本として、temp fixture上でHook構成、launcher、stdin／stdout／stderr／exit、text quality stateの外部failureをprocess境界で確認します。Codex Hostは起動せず、doctorのHook inventory期待値を別実装しません。
- `diagnose:hooks` はroot `.codex/config.toml`、`[features] hooks = true`、root `.codex/hooks.json`の診断範囲、filesystemのsymlink境界、既存`.artifacts/codex-text-quality` stateを読み取り専用で確認します。Hook、launcher、payload、baseline生成、Hook内部failureのdiagnostic log追記は実行しません。
- doctorの`baseline_state_missing`、`baseline_state_read`、`baseline_state_json`、`baseline_state_schema`、`baseline_state_identity`、`baseline_state_manifest`は、stateが現在sessionの障害だと断定するためのものではありません。stateが存在しない場合や既存stateが壊れている場合も、runtime stateのWARNとしてexit 0になる範囲があります。
- `baseline_unavailable; cause=<code>` は、stateへ保存された出力許可済みのsafe codeだけを表示します。prompt、Hook payload、state本文、raw session ID、absolute path、secret、raw exceptionは表示しません。regexに一致する未知codeはstateとして検証できても外部causeへ出しません。
- inactive `Stop` のblock `reason`は従来文言のprefixを維持し、`Diagnostic: <code>`（`baseline_unavailable`のsafe causeを含む場合は`; cause=<code>`）と `Run pnpm run diagnose:hooks before completion.`を続けて表示します。同じblockの`systemMessage`には `Codex text quality hook: quality check unavailable (<code>)` またはallowlist済みcause付きの分類が表示されます。これはHook本体が起動して内部で失敗した経路で、AI agentはまずreasonの`Diagnostic:`を確認します。
- `systemMessage` またはreasonの `Stop launcher unavailable` は、Hook本体を起動する前のStop launcher fallback経路です。inactive `Stop` はdiagnose command付きgeneric block、active `Stop` は既存どおり`continue=true`のfail-openで、両方ともlauncher診断を表示します。通常のtext-quality violation blockには診断用`systemMessage`や`Diagnostic` reasonを追加しません。
- inactive `Stop`で`Text quality check unavailable`を受けたAI agentは、原因未確認のまま完了へ進まず、まずreasonの`Diagnostic:`を確認し、続けて`pnpm run diagnose:hooks`を実行します。Hook内部failureなら必要に応じて最新のsafe logを確認します。

PowerShell:

```powershell
Get-Content .artifacts/codex-hooks/text-quality-diagnostics.jsonl -Tail 1
```

Bash:

```bash
tail -n 1 .artifacts/codex-hooks/text-quality-diagnostics.jsonl
```

このlogはHook内部failureだけを記録するfailure-only / ephemeral JSONLです。`schema_version`、timestamp、event、safe code、`stop_hook_active`、許可済みcauseだけを含み、log write failureはHookのfail-open / fail-closeを変更しません。logが無いこと自体はfailureではなく、Stop launcher failure、正常成功、通常violation、repeated active Stopでは作成されないことがあります。

原因codeの意味は次のとおりです。

- `baseline_state_missing`: expected state fileが存在しない。
- `baseline_state_read`: state pathは存在するが読み取れない。
- `baseline_state_json`: state本文をJSONとしてparseできない。
- `baseline_state_schema`: JSONだがstate schemaに適合しない。
- `baseline_state_identity`: repository root / session identityが一致しない。
- `baseline_state_manifest`: state内manifestの安全性・整合性validationに失敗した。
- `baseline_unavailable`: baseline作成時点で品質確認が利用不能だった。safe causeがある場合だけ`cause=<code>`を表示する。
- `baseline_cleanup`: active Stop等のstate cleanupに失敗した。active Stopはfail-openで継続する。
- `Stop launcher unavailable`: Hook本体の正常終了までlauncherが到達できなかった。Hook内部logが無いことがある。
- active `Stop` の `baseline_state_missing` は、正常Stopでstateをcleanupした後のrepeated Stopと区別できないため、従来どおり `{ "continue": true }` の無診断allowです。原因観測は最初のinactive `Stop`で行います。
- `.artifacts/codex-text-quality`が無い、またはstate 0件は正常です。`N/A`で表示されるproject trust、Hook trust、managed override、実Codexのproject root / cwd / config layering、Host / session bindingはWARNへ数えません。
- `diagnose:hooks` が `WARN=0 ERROR=0` でも、過去のruntime failureが無かったことは証明しません。再発時はreasonの`Diagnostic:`、blockと同時に出る`systemMessage`、必要ならsafe diagnostic logを一次情報として原因を切り分け、offline確認後にHost / trust / config layeringを調査します。

このoffline経路でRepository側がPASSした後もHookが実Codexで動かない場合は、`/hooks`の定義・trust、project trust、Hook trust、実行環境の`CODEX_HOME`一致、Codex Host側のproject root / cwd / config layeringを別に確認します。`/hooks`と`CODEX_HOME`の運用はこの文書の既存trust手順が正本であり、offline doctorはそれらを自動判定しません。

### Hookが動かない場合の確認順序

Hookが期待どおり動かない場合は、すぐにHook実装の不具合と判断せず、次の順序で確認します。

1. `[features].hooks = true` になっているか。
2. projectの `.codex/` レイヤーが信頼されているか。
3. `/hooks` で対象Hookが検出されているか。
4. 対象Hookの現在の定義がtrust済みか。
5. Hookをtrustした環境と実行環境の `CODEX_HOME` が一致しているか。
6. `.codex/config.toml` の変更後に再レビューが必要になっていないか。
7. ここまで確認した後に、launcher、Node、path解決、Hook script、Codex runtime固有の問題を調査する。

この順序は運用上の確認手順であり、新しい自動診断frameworkやtrust管理scriptを追加するものではありません。

### `--dangerously-bypass-hook-trust`の扱い

`--dangerously-bypass-hook-trust` は通常のinteractive作業やRepository標準wrapperのtrust設定を置き換えるために使いません。使う場合も、Codex外でHookの定義元を検証済みの単発自動化に限ります。このoptionを `scripts/codex-safe.ps1`、`scripts/codex-safe.sh`、`scripts/codex-task.ps1`、`scripts/codex-task.sh`へ自動追加していません。

Hookが動かなければ、まず `/hooks` とproject／Hookのtrust状態、`CODEX_HOME` の一致を確認します。`--dangerously-bypass-hook-trust` を付けることを通常のトラブルシュート手順にはしません。

### 公式仕様の参照

この節は2026-09-14に確認した公式仕様を根拠とします。

- [Codex Hooks](https://developers.openai.com/codex/hooks/): project `.codex/` レイヤー、Hook定義のcurrent hash、`/hooks`、未trust Hookのskip、`--dangerously-bypass-hook-trust`。
- [Codex environment variables](https://developers.openai.com/codex/config-file/environment-variables): `CODEX_HOME` の用途と既定値。

## レポートファイルの作成方針

- `docs/reports/` は durable な調査・監査・検証結果の置き場であり、通常のレビュー返答、進捗報告、軽い確認結果、run 内ログの既定保存先ではない。
- Report file を生成してよいのは、ユーザーが保存を明示した場合、計画 DoD に report file がある場合、複数ソース調査・監査・検証結果を後で参照する必要がある場合のみ。
- review-only、plan-only、status update、軽い確認、通常の evidence command 結果、run progress 記録、チャットで完結する評価では `docs/reports/` にファイルを作らない。
- 判断に迷う場合は report file を作らず、チャット返答と `.codex/runs/<run_id>/REPORT.md` に留める。

## 文章品質HookとRepository gate

- `UserPromptSubmit` はsessionごとに開始時の `HEAD`、repository root識別hash、開始時にHEADと異なるMarkdownのworktree manifestだけを保存する。cleanなtracked Markdownは、変更時に開始時HEADのblobからbaselineを取得する。
- baselineにはMarkdown本文、prompt全文、raw match、Hook payload、token、secret、credentialを保存しない。違反は `rule_id` と正規化済みmatchのSHA-256および件数だけをidentityとして保持する。
- file identityは、Git rename mapping、exact content SHA-256の一意一致、対応付け不能の順で解決する。similarity、filename推測、edit distanceは使わない。
- `PostToolUse` はMarkdown変更時の早期フィードバックであり、障害時はfail-openしてtop-level `systemMessage`を持つstructured stdoutで診断する。exit 0のraw stderrはCodexのHook result診断経路として扱わない。既存のlogging Hookとは別責務である。
- `Stop` は `stop_hook_active=false` のとき、新規違反またはquality check不能ならstructured `decision=block`を返す。`true` のときは診断付きでallowし、baseline stateを削除する。Hook failure契約とRepository gateのfailure契約は分離する。
- Issue #135がmainへ取り込まれた現在のbranchでは、`SessionStart` の `matcher = "^compact$"` に限ってroot `AGENTS.md`全文を `hookSpecificOutput.additionalContext` へ再注入する。`startup`／`resume`／`clear`では出力せず、root解決、`AGENTS.md`読込、structured output生成に失敗した場合は、入力本文やpathを含めない `continue=false`／`stopReason` でfail-closeする。設定値の `additionalContextLimit = 4096` はCLIのapproximate token spill thresholdとして扱い、stdout文字数制限とは扱わない。
- 一般日本語production ruleは`.textlintrc.json`の7個の個別textlint ruleでconfiguredであり、既存markdownlintの構造検査を重複実装しない。`no-unmatched-pair`は技術文書のinline code等を誤検知するため採用しない。`.codex/text-quality-rules.json`は4個のRepository固有custom literal ruleをconfiguredで保持する。

Repository-level gateの比較基準は次のとおりです。

- local `pnpm run lint:text`: `HEAD -> current worktree`。staged、unstaged、untracked Markdownを含む。
- pull request: `origin/${{ github.base_ref }}` とcheckout済みworkflow `HEAD`のmerge-baseから `HEAD`までを比較する。raw PR headへcheckout方式は変更しない。
- push: `github.event.before`を使い、空またはzero SHAなら `HEAD^`へfallbackする。
- schedule / `workflow_dispatch`: `HEAD^`を使う。

すべてのcommit比較で、変更path、baseline本文、current本文、rename mappingに同じmerge-base treeを使う。比較不能は違反0件のPASSへ落とさず、非0終了にする。

focused Hook contractは既存 `tests/contracts/**` を正本として次でopt-in実行します。

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

## 運用メモ

- ルール変更後は `-PreflightOnly` と `codex execpolicy check` で確認する。
- 破壊系ルールの追加時は検証を行い、保存依頼または DoD がある場合だけ `docs/reports/` に durable report を残す。
- consumer repo では `bash scripts/verify` を最初の確認コマンドとして使う。
- 非対話実行では `codex-safe` ではなく `codex-task` を使い、`--run-id` で run-local artifact に集約する。
