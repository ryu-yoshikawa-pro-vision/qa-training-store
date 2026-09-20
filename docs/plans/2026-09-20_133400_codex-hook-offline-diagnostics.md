# Codex Hookオフライン診断・契約テスト拡張 実装計画

## 0. 依頼概要

- 依頼内容: Codexを起動せずにHookを検証し、`Hook · Codex text quality hook: quality check unavailable (baseline_state)` を含むRepository所有Hookの失敗を切り分けられるようにする。
- 実装branch: `feat/codex-hook-offline-diagnostics`
- Plan作成時base: `main` / `1213adc9513409cc176c090f9df4c1c408142b9c`
- このPlanでは実装しない。実装、commit、push、PR作成は別タスクで行う。

目的は、Repository側のHook本体、launcher、project設定、text quality stateの問題をCodex Host側の問題から切り離して検証・診断できるようにすることである。

新しいHook framework、独自runtime、state履歴、session tracking、診断用evidence fileは作らない。既存のHook実装、Vitest、`smol-toml`、Node.js標準機能、既存contract test、既存CIを再利用する。

## 1. ゴール / 完了条件

### ゴール

次の2経路を用意する。

1. `pnpm run test:hooks`
   - Codexを起動せず、Repository所有Hookの外部から観測可能な正常系・異常系契約をtemp fixture上で検証する。
2. `pnpm run diagnose:hooks`
   - 現在のRepositoryを変更せず、root project Hook設定と存在するtext quality stateを読み取り専用で診断する。

### 完了条件

- `pnpm run test:hooks` でHook contractをfocused実行できる。
- `pnpm run diagnose:hooks` で現在Repositoryのroot `.codex/config.toml` と既存stateを読み取り専用で診断できる。
- Hook構成の期待値、matcher、handler数、timeout、Unix / Windows launcher契約の正本は既存contract testとする。doctorへ同じ期待値を再実装しない。
- `.codex/config.toml` がparseでき、Repository契約として `[features] hooks = true` を確認できる。
- `<repo>/.codex/hooks.json` が存在した場合、Codex設定として不正とは扱わず、doctorだけではproject Hook全体を診断できないため `ERROR` として診断不完全を通知する。
- project trust、Hook trust、managed override、実Codexのproject root / cwd / config layering、Host / session bindingはRepositoryだけでは確定できないため `未確認` として扱う。
- `PreToolUse`、`SessionStart`、logging Hook、text quality Hookの外部failure契約を既存testと不足testで確認する。
- 「全Hookエラー」は、Repositoryが所有し外部から観測可能なfailure契約を意味する。内部の全`throw`、user / system / plugin Hook、Host内部失敗までは対象にしない。
- `baseline_state` の原因を安全な6種類のcodeへ分け、active Stopでstateがcleanupされた後でも再発時の原因分類がHook出力から分かる。
- `baseline_unavailable` はstateへ保存済みの安全な `code` をHook診断へ含め、active Stop後にstateがcleanupされてもbaseline作成失敗の原因分類を残す。
- `TextQualityConfigurationError.code` も既存 `baseline_unavailable.code` へ保存し、`baseline_creation` に不必要に潰さない。
- diagnosticへstate本文、prompt、Hook payload、token、secret、raw session ID、absolute user path、raw exceptionを含めない。
- state fileが存在しない場合のevent別挙動を維持する。
  - `UserPromptSubmit`: stateが無ければbaselineを作成する。
  - `PostToolUse`: state欠落はfail-open診断。
  - inactive `Stop`: state欠落はcompletion確認不能としてblock。
  - active `Stop`: state欠落は既存どおり診断なしでallow。
- active Stopのcleanupはbest-effortを維持し、cleanup失敗を理由にblockしない。
- `.artifacts/codex-text-quality` 自体が存在しない場合とstate 0件は正常とする。
- 既存runtime stateの異常は現在sessionとの関連を証明できないため `WARN` / exit 0とし、現在sessionの障害と断定しない。
- Hookとdoctorが同じpure state validatorを使い、schema / identity / manifest判定を二重実装しない。
- doctorは現在Repository上でHook / configured launcherを実行しない。
- doctorはworktree、Git index、`.codex/logs`、`.artifacts/codex-text-quality`を変更しない。
- doctorが読むconfig / state / Repository scriptはsymlinkを追跡せず、期待するfilesystem typeだけを扱う。
- doctor CLIの正常系・異常系をtemp fixtureのprocess contractで検証する。
- Ubuntu / Windowsの既存CI経路を利用し、新しいCI jobを追加しない。
- 新規runtime dependencyを追加しない。
- 文章品質rule、baseline schema v2、Git rename判定、fail-open / fail-close、inactive / active Stopのdecisionを今回の診断機能だけを理由に変更しない。

## 2. 現状理解

### 2.1 Repository所有Hook

現在の `.codex/config.toml` では次を設定している。

| event | Repository所有handler | matcher |
| --- | --- | --- |
| `PreToolUse` | `pre_tool_use_policy.mjs` | `^Bash$` |
| `UserPromptSubmit` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `PostToolUse` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `SubagentStart` | `log_event.mjs` | なし |
| `SubagentStop` | `log_event.mjs` | なし |
| `Stop` | `log_event.mjs`, `text_quality_gate.mjs` | なし |
| `SessionStart` | `session_start_context.mjs` | `^compact$` |

Windows `PreToolUse`だけはlauncher経路が異なる。

```text
Unix:
.codex/config.toml
  -> pre_tool_use_policy.mjs

Windows:
.codex/config.toml
  -> pre_tool_use_policy_windows.ps1
  -> pre_tool_use_policy.mjs
```

他の現在のWindows Hookは `command_windows` のPowerShell `EncodedCommand` から各handlerを起動する。

現在の `main` には `<repo>/.codex/hooks.json` は存在しない。

Codexは同じ有効レイヤーの `hooks.json` と `config.toml` inline Hookを両方読み込めるため、`hooks.json` 自体を不正設定とは扱わない。今回のdoctorはroot `config.toml`だけを対象にするため、root `hooks.json` が存在した場合は診断範囲外として検出する。

Codexはproject設定をproject rootからcwdまで読み込めるが、実Codexのproject root / cwd / trust / managed overrideはRepository外の状態に依存する。今回のdoctorはその解決を再実装せず `未確認` とする。

参照:

- https://developers.openai.com/ja-JP/docs/hooks
- https://developers.openai.com/ja-JP/docs/config-file/config-advanced
- https://developers.openai.com/ja-JP/docs/config-file/config-basic

### 2.2 既存contract test

`tests/contracts/codex-hook-contract.test.ts` は既に、`features.hooks`、Hook group / handler数、matcher、timeout、Unix / Windows launcher、`PreToolUse`、`SessionStart`、logging Hookのstdin / stdout / stderr / exit code、主要なfail-open / fail-closeをprocess境界で検証している。

`tests/contracts/codex-text-quality.test.ts` は既に、`UserPromptSubmit`、`PostToolUse`、`Stop`、state lifecycle、corrupt state、root / session identity mismatch、baseline unavailable、missing state、active Stop cleanup、Unix / Windows launcher、secret非漏えいを検証している。

既存testを別directoryへ複製しない。不足する外部failure契約だけを追加する。

### 2.3 text qualityのfailure契約

`QualityUnavailable` には少なくとも次がある。

```text
baseline_blob
baseline_cleanup
baseline_manifest
baseline_state
baseline_unavailable
baseline_write
current_content
event_mismatch
git_changed_path
git_rename_mapping
git_unavailable
input_json
input_shape
repository_root
session_id
session_rename_mapping
start_head
stop_hook_active
unsafe_path
```

`scripts/lint-text-quality.mjs` 由来の `TextQualityConfigurationError` には少なくとも次がある。

```text
rule_id_collision
textlint_config_invalid
textlint_config_load
textlint_config_unavailable
textlint_message_match
textlint_message_range
textlint_message_shape
textlint_result
textlint_rule_load
textlint_rule_set_invalid
textlint_scan
```

unexpected exception時にはdefensive fallbackとして `internal` がある。`internal` を再現するためのtest-only fault injectionは追加しない。production経路から安定して再現できる場合だけcontract testを追加する。

### 2.4 `baseline_state` の現状

現行 `readState()` はfile read、JSON parse、schema、identity、manifestの異常を最終的に `QualityUnavailable("baseline_state")` へ集約する。

少なくとも次が同じcodeになる。

- state file欠落 / read失敗
- JSON parse失敗
- schema / required field / status不正
- `root_id` / `session_id_hash` の形式不正
- repository root identity / session identity不一致
- `start_head` 不正
- status固有field不正
- `files` / path / source不正・重複
- `content_sha256` 不正
- violation fingerprint / count不正

active `Stop`でstate自体が無い場合は、現行実装が診断なしでallowする。

stateが存在するが破損している場合は、active `Stop`がdiagnosticを出した後、既存cleanup経路でstateを削除する。そのためdoctorで後から読むだけでは実際の原因を復元できない。

### 2.5 `baseline_state` 詳細化

新しいevidence fileは保存しない。既存stateを保持するためにcleanup semanticsも変えない。

原因codeは次の6種類に限定する。

```text
baseline_state_missing
baseline_state_read
baseline_state_json
baseline_state_schema
baseline_state_identity
baseline_state_manifest
```

- `baseline_state_missing`: state fileが存在しない。
- `baseline_state_read`: ENOENT以外のfile read失敗。
- `baseline_state_json`: JSON parse失敗。
- `baseline_state_schema`: schema version、required field、status、`start_head`形式、status固有field集合などtop-level構造不正。
- `baseline_state_identity`: root / session identityの形式または期待値不一致。
- `baseline_state_manifest`: `files`、path、source、SHA-256、violations、fingerprint、count等のmanifest不正。

active `Stop` のmissing-state特例は、generic `baseline_state` + `existsSync()` ではなく `baseline_state_missing` を基準に維持する。`PostToolUse`では同じcodeをfail-open diagnosticとして扱う。inactive `Stop`は引き続きgeneric blockを返す。

### 2.6 `baseline_unavailable` の原因保持

現行 `writeUnavailableState()` は `QualityUnavailable.code` は保存するが、`TextQualityConfigurationError.code` を `baseline_creation` に置き換える。このためtextlint設定・rule load等の原因がactive Stop後に失われる。

既存schema v2の `code` fieldをそのまま使い、次の2クラスだけ安全なcode保存対象にする。

- `QualityUnavailable`
- `TextQualityConfigurationError`

`code` は既存validatorと同じ `^[a-z0-9_]{1,64}$` を満たす場合だけ保存し、それ以外とunknown exceptionは `baseline_creation` とする。新しいstate fieldやschema versionは追加しない。

後続の `PostToolUse` / active `Stop` では、valid `baseline_unavailable` stateにsafe `code` がある場合だけ次の形式で出力する。

```text
Codex text quality hook: quality check unavailable (baseline_unavailable; cause=<code>)
```

`code` が無い場合は従来形式を維持する。

```text
Codex text quality hook: quality check unavailable (baseline_unavailable)
```

inactive `Stop` は原因codeを外へ出さず、現在のgeneric blockを維持する。

### 2.7 state validation共有

doctor側でstate schemaを別実装しない。

`readState()` を次の責務へ分ける。

1. state file I/OとI/O原因分類
2. JSON parseとparse原因分類
3. pure state validation
4. Hook用 `QualityUnavailable` 変換

pure validationは `.codex/hooks/text_quality_state.mjs` へ抽出し、Hookとdoctorから使う。

共有moduleはschema / identity / manifest検証、state status、safe `code` validation、必要なroot identity / state filename helperだけを担当する。baseline生成、Git差分取得、file write / delete、Hook stdout、cleanup、textlint、launcher処理は移動しない。

Hook本体と共有moduleがNode ESMの `.mjs` であるため、doctorも `scripts/diagnose-codex-hooks.mjs` とする。TypeScript wrapperや `.d.ts` は追加しない。

### 2.8 CIの現状

`.github/workflows/ci.yml` にはUbuntuの `Vitest (contracts)` とWindowsの `Codex Hook contract (Windows)` があり、aggregate `verify` は両jobの成功を要求している。

新しいCI jobは追加せず、既存required job名も変更しない。

## 3. 実装範囲

### 3.1 変更候補

```text
package.json
.github/workflows/ci.yml
.codex/hooks/text_quality_gate.mjs
.codex/hooks/text_quality_state.mjs
scripts/diagnose-codex-hooks.mjs
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-diagnostics.test.ts
tests/contracts/codex-hook-contract.test.ts
tests/contracts/codex-text-quality.test.ts
docs/reference/codex-safety-harness.md
```

必要なファイルだけ変更する。

`docs/adr/0026-codex-text-quality-gate.md` はfail-open / fail-close、state schema v2、active Stop cleanup境界を既に定義しており、今回それらは変更しないため更新対象にしない。

### 3.2 原則変更しない範囲

- Product code
- Playwright / application test
- Skill / Agent routing
- Hook event / matcher / timeoutの仕様変更
- `pre_tool_use_policy.mjs` のpolicy
- `log_event.mjs` のlogging semantics
- `session_start_context.mjs` のcompact契約
- text quality rule構成
- baseline schema v2
- baseline stateのfield追加
- Git rename判定
- CI比較基準
- Host / Codex本体
- user / system / plugin Hook
- project trust / Hook trustの自動判定
- 実Codexのproject root / cwd / config layering再現
- project config merge実装
- `.codex/hooks.json` の汎用対応
- 新しいHook framework / state manager
- 新しいdependency
- state自動修復 / corrupt state保持
- 診断用evidence file
- loggingからのsession逆引き
- session tracking

## 4. 変更方針

### Task 0: 実装開始時の状態を再確認する

実装開始時にlatest `origin/main`、branch HEAD / merge base / working tree、`package.json`、CI、root `.codex/config.toml`、root `.codex/hooks.json` の有無、Hook実装、contract test、`scripts/verify --hook-contracts`、`scripts/verify.ps1 -HookContracts`を再確認する。

Plan作成後にmainへHook / CI / package manager関連変更が入っていた場合は現行mainを優先して差分を確認する。ローカル変更を破棄するreset / restore / force pushは行わない。

### Task 1: Hook contractの責務を固定する

`pnpm run test:hooks` をRepository所有Hookの期待契約の正本にする。

既存 `codex-hook-contract.test.ts` で次を維持する。

- `features.hooks`
- event / group / handler数
- matcher / timeout
- Unix / Windows launcher構造
- `PreToolUse` Windows wrapper経路
- configured handlerの存在
- stdin / stdout / stderr / exit code
- fail-open / fail-close

doctorへ同じ期待一覧を再実装しない。

Windows configured commandの確認は既存contractの方式に合わせる。

- `PreToolUse`: `EncodedCommand` decode後に `pre_tool_use_policy_windows.ps1` を確認し、wrapperから `pre_tool_use_policy.mjs` へ到達する契約は既存process testで確認する。
- 他の現在のHook: `EncodedCommand` decode後に対応するhandler参照を確認する。

一般的なshell parser / PowerShell parserは作らない。

### Task 2: state validationを共有する

`text_quality_gate.mjs` の現在の `readState()` からpure validationを `.codex/hooks/text_quality_state.mjs` へ抽出する。

validatorは少なくとも次を検証する。

- schema version
- required field
- `root_id` / `session_id_hash`
- expected root / session identity
- status
- `start_head`
- status固有field
- `baseline_unavailable.code`
- `files`
- Markdown relative path / path重複
- source
- `content_sha256`
- violations / fingerprint / count

file I/OとJSON parseはpure validatorへ入れない。Hookとdoctorで同じvalidatorを使う。

### Task 3: `baseline_state` を詳細化する

2.5の6種類へ詳細化する。

必須回帰条件:

- missing -> `baseline_state_missing`
- ENOENT以外のread failure -> `baseline_state_read`
- corrupt JSON -> `baseline_state_json`
- schema / top-level structure不正 -> `baseline_state_schema`
- root / session identity mismatch -> `baseline_state_identity`
- manifest entry不正 -> `baseline_state_manifest`
- `UserPromptSubmit` / `PostToolUse` / inactive Stop / active Stopのmissing-state semanticsを維持
- active Stopでnon-missing state failureを診断した後はcleanupを試みる
- cleanup失敗を理由にactive Stopをblockしない
- diagnosticへstate本文、path、session ID、secretを含めない

### Task 4: `baseline_unavailable.code` を保持・表示する

`writeUnavailableState()` は `QualityUnavailable` と `TextQualityConfigurationError` のsafe `error.code` を既存 `code` fieldへ保存する。unknown exceptionは `baseline_creation` のままにする。

`PostToolUse` / active Stopでは2.6で固定した `baseline_unavailable; cause=<code>` 形式を使う。

必須回帰条件:

- missing `.textlintrc.json` -> state `code=textlint_config_unavailable`
- invalid textlint config ->対応するsafe configuration codeを保存
- `PostToolUse` -> safe cause付きfail-open diagnostic、stateは維持
- inactive Stop -> generic block、stateは維持
- active Stop -> safe cause付きallow diagnostic、cleanupはbest-effort
- unsafe / absent `code` -> causeなしの従来 `baseline_unavailable` diagnostic

### Task 5: `test:hooks` を共通入口にする

`package.json` にfocused scriptを追加する。

```json
{
  "test:hooks": "vitest run tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-text-quality.test.ts tests/contracts/codex-hook-diagnostics.test.ts --no-file-parallelism --maxWorkers=1 --testTimeout=30000"
}
```

次を `pnpm run test:hooks` の呼び出しへ統一する。

- `scripts/verify --hook-contracts`
- `scripts/verify.ps1 -HookContracts`
- Windows `Codex Hook contract (Windows)`

既存wrapperの実行環境fallbackは維持する。

- Bash: `pnpm` / `pnpm.cmd` / `corepack.cmd` / `corepack`
- PowerShell: `pnpm` / `corepack pnpm`

共通入口化を理由にfallback、case、timeoutを削らない。Issue #159のWindows launcher時間問題をskipやtimeout短縮で回避しない。

### Task 6: 外部failure contractの不足testを追加する

既存contractを優先し、不足分だけ追加する。

- `PreToolUse`: malformed / out-of-contract input、safe / deny、root / Node / Hook解決失敗、Hook non-zero、timeout。
- `SessionStart`: malformed input、repository root失敗、root `AGENTS.md` missing / read failure、structured fail-close、Unix / Windows launcher failure。
- logging Hook: malformed input / event mismatch、session ID不正、secret redaction、output contract、logger / root failure、configured launcher failure。
- text quality Hook: process上到達可能な `QualityUnavailable`、`TextQualityConfigurationError`、configured launcher fallback、inactive Stop generic block、active Stop詳細diagnostic + cleanup。

`internal` はdefensive fallbackとして存在を維持するが、安定したproduction経路が無ければtest-only fault injectionを追加しない。

source grepでcode数とtest数だけを機械的に一致させるcontractも追加しない。

### Task 7: 読み取り専用 `diagnose:hooks` を実装する

entry point:

```text
scripts/diagnose-codex-hooks.mjs
pnpm run diagnose:hooks
```

doctorの責務は次に限定する。

1. Git repository root解決
2. root `.codex/config.toml` を `lstat` し、regular fileかつ非symlinkであることを確認
3. root `.codex/config.toml` 読み取り・parse
4. `[features] hooks = true` をRepository契約として確認
5. root `.codex/hooks.json` の有無を `lstat` で確認。存在する場合はdoctorの診断範囲外として `ERROR`
6. 現在設定されているevent / handlerを要約表示。期待する完全なHook inventoryの判定は `test:hooks` に任せる
7. current environmentの主要runtimeだけ確認する。`git`、実行中のNode、Windowsで必要な `powershell.exe` など直接必要なlauncher shellまでに限定し、shell commandの推移的依存関係を解析しない
8. doctorが静的に確認するRepository scriptは、既存contractと同じ現在の経路だけを扱い、Repository内のregular fileかつ非symlinkであることを確認
9. `.artifacts/codex-text-quality` の存在確認。存在しなければstate 0件として正常
10. state directoryを `lstat` し、実directoryかつ非symlinkであることを確認。列挙不能なら `ERROR`
11. `*.json` state candidateを `lstat` し、directory直下のregular fileかつ非symlinkだけを読む
12. state filename形式確認
13. state file read / JSON parse
14. shared validatorによるstate構造検証
15. filename root hash / session hashとstateの整合確認
16. current repository root identityとの一致確認
17. `start_head` が存在する場合、read-only Git commandでcommit object存在確認
18. valid `baseline_unavailable` stateではsafe `code` があれば表示
19. project trust、Hook trust、managed override、実Codex project root / cwd / config layering、Host bindingを `未確認` と表示

state scanでは`.json`以外のentryをstateとして読まない。`.json` candidateがsymlink / 非regular fileなら内容を読まず `ERROR` とする。

Git確認には `git status` を使わず、`rev-parse`、`cat-file -e` 等のread-only commandだけを使う。必要に応じて `GIT_OPTIONAL_LOCKS=0` を付け、Git index refreshを起こさない。

現在RepositoryではHook process、configured launcher、Hook payload投入、baseline生成、state作成・更新・削除、log追記、raw session ID取得、logging recordとの照合、Host / user / system / plugin Hook探索を行わない。

### Task 8: doctorの出力・exit codeを固定する

結果区分:

- `OK`: root project設定と静的filesystem境界に異常なし。
- `WARN`: offlineでは確認できないHost状態、または現在sessionとの関連を証明できない既存runtime stateの異常。
- `N/A`: current OSでは対象外の確認項目。
- `ERROR`: doctorがroot project設定を完全に診断できない静的不整合、または安全に読み取れないfilesystem境界。

exit code:

- `0`: `ERROR`なし。`WARN` / `N/A` / state 0件を含んでよい。
- `1`: `ERROR`を1件以上検出。
- `2`: Git repository contextを確立できず診断を開始できない。

`ERROR` の例:

- root `.codex/config.toml` 欠落 / parse failure / symlink / 非regular file
- `[features] hooks = true` を満たさない
- root `.codex/hooks.json` が存在し、doctor単独ではproject Hook全体を診断できない
- doctorが確認対象とするRepository scriptの欠落 / Repository外 / symlink / 非regular file
- state directoryがsymlink / 非directory / 列挙不能
- `.json` state candidateがsymlink / 非regular file

既存runtime stateの次の異常は詳細を表示するが `WARN` / exit 0とする。

- state filename不正
- read failure
- JSON / schema / identity / manifest不正
- valid `baseline_unavailable`
- `start_head` commit object欠落

state file名そのもの、absolute path、raw session ID、state本文は表示しない。件数または連番で示す。

### Task 9: doctor CLIのprocess contractを追加する

`tests/contracts/codex-hook-diagnostics.test.ts` を追加し、temp Git Repository上でdoctorそのものをchild processとして実行する。

最低限次を固定する。

- clean fixture / state directoryなし -> exit 0
- clean fixture / state 0件 -> exit 0
- valid ready state -> exit 0
- valid `baseline_unavailable` -> safe `code` を表示してWARN / exit 0
- JSON破損 -> WARN / exit 0
- schema不一致 -> WARN / exit 0
- root identity不一致 -> WARN / exit 0
- filename session hashとstate不一致 -> WARN / exit 0
- invalid manifest -> WARN / exit 0
- invalid / missing `start_head` object -> WARN / exit 0
- unreadable state candidate -> WARN / exit 0
- config symlink / 非regular file -> exit 1、内容を読まない
- state directory symlink / 非directory -> exit 1、内容を読まない
- `.json` state candidate symlink / 非regular file -> exit 1、内容を読まない
- configured Repository script symlink / 非regular file -> exit 1
- `[features] hooks = false` -> exit 1
- root `.codex/hooks.json` 存在 -> 診断不完全としてexit 1
- Git repository外 -> exit 2
- outputへabsolute fixture path、raw session ID、state本文、secretを出さない

読み取り専用保証として実行前後のtracked file content、Git index、untracked file集合、state file content、Hook log contentを比較する。mtimeだけを成功条件にしない。

symlink作成権限に依存するfixtureはLinuxで必須検証する。Windows runnerでsymlink作成が許可されない場合は、そのfixtureだけをOS制約としてN/A扱いにし、productionのsymlink拒否契約自体は変えない。directory等の非regular file拒否は両OSで検証する。

### Task 10: 現在の問題を切り分ける

実装後、問題が発生する同一PC / RepositoryでCodexを起動せず次を実行する。

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

- `test:hooks`がFAILする場合は、Repository所有Hookの契約違反として対象testから原因を追う。
- doctorで既存state異常が出る場合はWARN詳細を確認するが、そのstateが現在session由来とは断定しない。
- state 0件かつ`test:hooks` PASSの場合、過去active Stopの原因は現在stateから断定しない。次回再発時はHookが出す `baseline_state_*` または `baseline_unavailable; cause=<code>` を使う。
- offline検証が全PASSしCodex実行時だけHookが動かない場合は、project trust、Hook trust、managed override、project root / cwd / config layering、Host binding側へ切り分ける。

### Task 11: CIへ組み込む

`.github/workflows/ci.yml` の既存jobを最小変更する。

Ubuntu:

- 既存 `Vitest (contracts)` は `pnpm run test:contracts` を実行し、新しいdiagnostic contractも通常のcontractsとして含む。
- Hook専用jobは追加しない。
- `matrix.suite == 'contracts'` の場合だけ、contracts完了後に `pnpm run diagnose:hooks` を実行する。

Windows:

- 既存 `Codex Hook contract (Windows)` job名を維持する。
- 現在の直接Vitest commandを `pnpm run test:hooks` へ置き換える。
- 続けて `pnpm run diagnose:hooks` を実行する。
- aggregate `verify` のneeds / result判定を維持する。

clean checkoutではstate directoryなし / state 0件を正常とする。Host側の `未確認` はCI failureにしない。

### Task 12: 運用ドキュメントを更新する

`docs/reference/codex-safety-harness.md` へ必要最小限を追記する。

- `pnpm run test:hooks`
- `pnpm run diagnose:hooks`
- `baseline_state_*` の意味
- `baseline_unavailable; cause=<code>` の意味
- state 0件 / state WARNの意味
- offline診断とHost側確認の境界
- `/hooks`、project trust、Hook trust、`CODEX_HOME` 等の既存運用との関係

ADR-0026のfail-open / fail-close、schema v2、cleanup境界は変更しない。

## 5. 検証方法

### focused

```bash
pnpm run test:hooks
pnpm run diagnose:hooks
```

### 既存verify wrapper

```bash
bash scripts/verify --hook-contracts
```

```powershell
./scripts/verify.ps1 -HookContracts
```

両wrapperが既存fallbackを使ったまま内部で `test:hooks` を実行することを確認する。

### Repository標準検証

```bash
pnpm run test:contracts
pnpm run lint:text
pnpm run lint:text:all
pnpm run lint:markdown
pnpm run typecheck
git diff --check
```

実装完了時はRepository標準の `pnpm run verify` も実行する。

### CI

PR最新headで次を確認する。

- `Vitest (contracts)`
- `Codex Hook contract (Windows)`
- aggregate `verify`

required job名は変更しない。

## 6. 成功判定

実装完了は次をすべて満たした場合とする。

- `pnpm run test:hooks` がRepository所有Hookの期待契約をCodex未起動で検証できる。
- `pnpm run diagnose:hooks` がroot project設定と既存stateを副作用なしで診断できる。
- Hook構成の期待値をdoctorへ重複実装していない。
- `baseline_state` のmissing / read / JSON / schema / identity / manifestを安全なcodeへ分類できる。
- active Stopのmissing-state allow契約が維持される。
- active Stopのnon-missing state failureは詳細codeを出した後にbest-effort cleanupされる。
- `TextQualityConfigurationError.code` が既存 `baseline_unavailable.code` へ安全に保存される。
- `PostToolUse` / active Stopが固定形式のsafe cause diagnosticを出せる。
- inactive Stopのgeneric blockを維持する。
- Hookとdoctorが同じpure state validatorを使う。
- doctorがconfig / state / scriptのsymlinkを追跡しない。
- doctorがHook / launcherを実Repository上で実行しない。
- doctorがworktree、index、log、stateを変更しない。
- state directoryなし / state 0件を正常扱いする。
- 既存runtime state異常を現在sessionの障害と断定しない。
- root `.codex/hooks.json` を黙って無視しない。
- project trust、Hook trust、managed override、実Codex project root / cwd / config layering、Host bindingを `未確認` と区別する。
- `test:hooks` がverify wrapperとWindows CIの共通入口になる。
- Ubuntu / Windowsの既存CI経路が成功する。
- 新規dependency、Hook framework、state repair、evidence file、session tracking、config mergeを追加していない。

## 7. リスクと対策

### state validation共有によるproduction影響

`readState()` のvalidationをshared moduleへ移す際に、受理 / 拒否条件を変える可能性がある。

対策:

- 現行validation条件を先にtestで固定する。
- schema v2、status、identity、manifestの受理条件を変更しない。
- 詳細code以外のdecision差分を許容しない。

### diagnostic詳細化による情報漏えい

原因codeを増やすことでraw errorを出力してしまう可能性がある。

対策:

- allowlistされた固定codeだけを出力する。
- `baseline_unavailable.code` は既存regexを通した値だけを使う。
- state本文、path、session ID、prompt、payload、secret、raw exceptionを出さない。

### doctorの副作用・外部file read

doctorがHook / launcher実行、Git index refresh、symlink追跡をすると診断自体が状態を変えたりRepository外を読んだりする。

対策:

- current RepositoryではHook / launcherを実行しない。
- Gitはread-only commandだけを使う。
- config / state /確認対象scriptは `lstat` しsymlinkを追跡しない。
- temp fixture contractで実行前後を比較する。

### Windows CI時間とfilesystem差異

既存Hook contractはWindowsでlauncher起動回数が多く、symlink fixtureにはOS権限制約もある。

対策:

- Issue #159で確立したtimeoutを維持する。
- test削減やtimeout短縮で回避しない。
- doctor testでconfigured launcherを重複実行しない。
- symlink作成不能だけをOS制約として扱い、production契約は緩めない。

## 8. 対象外

- Codex Hostの修正
- user / system / plugin Hookのoffline再現
- project trust / Hook trustの自動判定
- managed overrideの実効値解決
- 実Codexのproject root / cwd / config layering再現
- 複数project `.codex/config.toml` のmerge実装
- `.codex/hooks.json` の汎用parser / merge対応
- shell / PowerShellの汎用parser
- launcherの推移的runtime依存解析
- Hook UI変更
- Hook retry
- state recovery / state履歴
- corrupt stateの自動削除・保持
- diagnostic evidence file
- loggingからのsession逆引き
- session tracking
- 新しいHook event / policy
- text quality rule追加
- baseline schema変更
- CI job新設
- 新規dependency
- 新しいHook test framework
- `internal`再現専用fault injection

## 9. 想定成果物

```text
package.json
.github/workflows/ci.yml
.codex/hooks/text_quality_gate.mjs
.codex/hooks/text_quality_state.mjs
scripts/diagnose-codex-hooks.mjs
scripts/verify
scripts/verify.ps1
tests/contracts/codex-hook-diagnostics.test.ts
tests/contracts/codex-hook-contract.test.ts       # 既存契約更新・不足契約がある場合
tests/contracts/codex-text-quality.test.ts
docs/reference/codex-safety-harness.md
```

既存実装の確認結果により不要なファイルは変更しない。

## 10. 備考

- このPlanの目的はRepository所有Hookの検証・診断であり、Codex Host全体のHook解決を再実装することではない。
- `test:hooks` と `diagnose:hooks` を併用してRepository側を確認し、それでも実Codexだけで発生する問題はHost / trust / config layering側へ切り分ける。
- 現在の要件ではPlanを分割しない。Hook contractとdoctorの責務境界を同じPlanで確認できる方が実装時の正本が分散しない。
- 実装時に別の再現可能な不具合が確認された場合も、この目的に直接必要な原因箇所だけを修正する。
- merge、force push、branch削除、Issue / PR close、release、tag作成は明示依頼なしに行わない。
